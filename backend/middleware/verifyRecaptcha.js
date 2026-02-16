const verifyRecaptcha = async (req, res, next) => {
    const token = req.body?.recaptchaToken;
    if (!token) {
        return res.status(400).json({ message: 'Missing reCAPTCHA token' });
    }

    const secret = process.env.RECAPTCHA_SECRET;
    if (!secret) {
        return res.status(500).json({ message: 'reCAPTCHA secret not configured' });
    }

    try {
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                secret,
                response: token
            })
        });

        const data = await response.json();
        const minScore = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);

        if (!data.success) {
            return res.status(400).json({ message: 'reCAPTCHA verification failed' });
        }

        if (typeof data.score === 'number' && data.score < minScore) {
            return res.status(400).json({ message: 'reCAPTCHA score too low' });
        }

        return next();
    } catch (error) {
        return next(error);
    }
};

module.exports = verifyRecaptcha;
