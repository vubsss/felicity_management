const { Resend } = require('resend');
const QRCode = require('qrcode');

const buildResend = () => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;

    if (!apiKey || !from) {
        return null;
    }

    return { resend: new Resend(apiKey), from };
};

const sendTicketEmail = async ({ to, event, ticket, ticketUrl }) => {
    const client = buildResend();
    if (!client) {
        return { ok: false, reason: 'resend_not_configured' };
    }

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
        await client.resend.emails.send({
            from: client.from,
            to,
            subject,
            text,
            html,
            attachments: qrCodeBuffer
                ? [
                    {
                        filename: `ticket-${ticket.ticketCode}.png`,
                        content: qrCodeBuffer.toString('base64'),
                        contentType: 'image/png'
                    }
                ]
                : []
        });

        return { ok: true };
    } catch (error) {
        return { ok: false, reason: 'resend_failed', error: error?.message || 'unknown_error' };
    }
};

module.exports = { sendTicketEmail };
