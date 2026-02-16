let recaptchaPromise = null

const loadRecaptcha = () => {
  if (recaptchaPromise) return recaptchaPromise

  recaptchaPromise = new Promise((resolve, reject) => {
    if (window.grecaptcha) {
      resolve(window.grecaptcha)
      return
    }

    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    if (!siteKey) {
      reject(new Error('Missing reCAPTCHA site key'))
      return
    }

    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.grecaptcha)
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA'))
    document.head.appendChild(script)
  })

  return recaptchaPromise
}

export const getRecaptchaToken = async (action) => {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
  const grecaptcha = await loadRecaptcha()

  return grecaptcha.execute(siteKey, { action })
}
