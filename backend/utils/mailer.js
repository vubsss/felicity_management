const nodemailer = require('nodemailer');

const buildTransporter = () => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
    });
};

const sendTicketEmail = async ({ to, event, ticket, ticketUrl }) => {
    const transporter = buildTransporter();
    if (!transporter) {
        return { ok: false, reason: 'smtp_not_configured' };
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const start = event.startTime ? new Date(event.startTime).toLocaleString() : 'TBD';
    const end = event.endTime ? new Date(event.endTime).toLocaleString() : 'TBD';

    const subject = `Your ticket for ${event.name}`;
    const text = [
        `Hi,`,
        '',
        `You are registered for: ${event.name}`,
        `Ticket code: ${ticket.ticketCode}`,
        `Starts: ${start}`,
        `Ends: ${end}`,
        ticketUrl ? `View ticket: ${ticketUrl}` : null,
        '',
        `Thanks,`,
        `Felicity Team`
    ].filter(Boolean).join('\n');

    await transporter.sendMail({
        from,
        to,
        subject,
        text
    });

    return { ok: true };
};

module.exports = { sendTicketEmail };
