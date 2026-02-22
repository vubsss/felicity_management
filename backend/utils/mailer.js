const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

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
        auth: { user, pass },
        connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000),
        greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 10000),
        socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 15000)
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
    let qrCodeBuffer = null;

    if (ticket?.qrData) {
        try {
            qrCodeBuffer = await QRCode.toBuffer(ticket.qrData, {
                type: 'png',
                width: 320,
                margin: 1
            });
        } catch (error) {
            qrCodeBuffer = null;
        }
    }

    const text = [
        `Hi,`,
        '',
        `You are registered for: ${event.name}`,
        `Ticket code: ${ticket.ticketCode}`,
        `Starts: ${start}`,
        `Ends: ${end}`,
        ticketUrl ? `View ticket: ${ticketUrl}` : null,
        '',
        qrCodeBuffer ? 'QR code is attached in this email.' : null,
        '',
        `Thanks,`,
        `Felicity Team`
    ].filter(Boolean).join('\n');

    const html = [
        '<p>Hi,</p>',
        `<p>You are registered for: <strong>${event.name}</strong></p>`,
        `<p>Ticket code: <strong>${ticket.ticketCode}</strong></p>`,
        `<p>Starts: ${start}<br/>Ends: ${end}</p>`,
        ticketUrl ? `<p><a href="${ticketUrl}">View ticket</a></p>` : '',
        qrCodeBuffer ? '<p>QR code is attached to this email.</p>' : '',
        '<p>Thanks,<br/>Felicity Team</p>'
    ].filter(Boolean).join('');

    try {
        await transporter.sendMail({
            from,
            to,
            subject,
            text,
            html,
            attachments: qrCodeBuffer
                ? [
                    {
                        filename: `ticket-${ticket.ticketCode}.png`,
                        content: qrCodeBuffer,
                        contentType: 'image/png',
                        cid: 'ticket-qr'
                    }
                ]
                : []
        });

        return { ok: true };
    } catch (error) {
        return { ok: false, reason: 'smtp_failed', error: error?.message || 'unknown_error' };
    }
};

module.exports = { sendTicketEmail };
