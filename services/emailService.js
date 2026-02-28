// services/emailService.js
const SibApiV3Sdk = require('sib-api-v3-sdk');
require('dotenv').config();

// Configuration Brevo
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

/**
 * Email de notification à l'élevage pour un nouveau message
 */
async function sendNewMessageNotification(messageData) {
    try {
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.sender = {
            email: process.env.BREVO_SENDER_EMAIL,
            name: process.env.BREVO_SENDER_NAME
        };
        sendSmtpEmail.to = [{
            email: process.env.CLIENT_EMAIL,
            name: "Spirit of Freedom Kennel"
        }];
        sendSmtpEmail.subject = `📬 Nouveau message de ${messageData.name} - ${messageData.subject}`;
        sendSmtpEmail.htmlContent = `
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; background-color: #0d0d0d; color: #333; }
                    .wrapper { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header {
                        background: linear-gradient(135deg, #1a1a1a, #111111);
                        border-top: 4px solid #c9a84c;
                        padding: 30px 25px;
                        text-align: center;
                        border-radius: 12px 12px 0 0;
                    }
                    .header-logo {
                        font-size: 14px;
                        font-weight: 700;
                        color: #c9a84c;
                        text-transform: uppercase;
                        letter-spacing: 3px;
                        margin-bottom: 8px;
                    }
                    .header-title {
                        font-size: 22px;
                        font-weight: 700;
                        color: #ffffff;
                        margin-bottom: 6px;
                    }
                    .header-subtitle {
                        font-size: 13px;
                        color: rgba(255,255,255,0.4);
                    }
                    .body {
                        background: #ffffff;
                        padding: 30px 25px;
                        border-radius: 0 0 12px 12px;
                        border: 1px solid #e5e5e5;
                        border-top: none;
                    }
                    .intro {
                        font-size: 14px;
                        color: #555;
                        margin-bottom: 20px;
                        line-height: 1.6;
                    }
                    .info-row {
                        display: flex;
                        align-items: flex-start;
                        margin-bottom: 12px;
                        padding: 12px 15px;
                        background: #f9f9f9;
                        border-left: 3px solid #c9a84c;
                        border-radius: 0 6px 6px 0;
                    }
                    .info-label {
                        font-weight: 700;
                        color: #c9a84c;
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        min-width: 90px;
                    }
                    .info-value {
                        font-size: 14px;
                        color: #333;
                    }
                    .info-value a {
                        color: #c9a84c;
                        text-decoration: none;
                    }
                    .message-block {
                        margin-top: 20px;
                        padding: 15px;
                        background: #f5f5f5;
                        border-radius: 8px;
                        border: 1px solid #e0e0e0;
                    }
                    .message-label {
                        font-size: 12px;
                        font-weight: 700;
                        color: #c9a84c;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 10px;
                    }
                    .message-text {
                        font-size: 14px;
                        color: #444;
                        line-height: 1.75;
                        white-space: pre-wrap;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 25px;
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                        font-size: 12px;
                        color: #aaa;
                    }
                    .footer strong { color: #c9a84c; }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="header">
                        <div class="header-logo">Spirit of Freedom Kennel</div>
                        <div class="header-title">📬 Nouveau message reçu</div>
                        <div class="header-subtitle">Via le formulaire de contact de votre site</div>
                    </div>
                    <div class="body">
                        <p class="intro">
                            Vous avez reçu un nouveau message via votre site web. 
                            Voici les informations du contact :
                        </p>

                        <div class="info-row">
                            <span class="info-label">👤 Nom</span>
                            <span class="info-value">${messageData.name}</span>
                        </div>

                        <div class="info-row">
                            <span class="info-label">📧 Email</span>
                            <span class="info-value">
                                <a href="mailto:${messageData.email}">${messageData.email}</a>
                            </span>
                        </div>

                        <div class="info-row">
                            <span class="info-label">📱 Tél.</span>
                            <span class="info-value">${messageData.phone || 'Non renseigné'}</span>
                        </div>

                        <div class="info-row">
                            <span class="info-label">📋 Sujet</span>
                            <span class="info-value">${messageData.subject}</span>
                        </div>

                        <div class="message-block">
                            <div class="message-label">💬 Message</div>
                            <div class="message-text">${messageData.content}</div>
                        </div>

                        <div class="footer">
                            <p>Message envoyé automatiquement depuis <strong>spiritoffreedomkennel.com</strong></p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
        return { success: true, messageId: result.messageId };

    } catch (error) {
        console.error('❌ Erreur notification élevage:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Email de confirmation au visiteur
 */
async function sendConfirmationToVisitor(messageData) {
    try {
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.sender = {
            email: process.env.BREVO_SENDER_EMAIL,
            name: process.env.BREVO_SENDER_NAME
        };
        sendSmtpEmail.to = [{
            email: messageData.email,
            name: messageData.name
        }];
        sendSmtpEmail.subject = `✅ Votre message a bien été reçu - Spirit of Freedom Kennel`;
        sendSmtpEmail.htmlContent = `
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; background-color: #f5f5f5; color: #333; }
                    .wrapper { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header {
                        background: linear-gradient(135deg, #1a1a1a, #111111);
                        border-top: 4px solid #c9a84c;
                        padding: 35px 25px;
                        text-align: center;
                        border-radius: 12px 12px 0 0;
                    }
                    .header-icon {
                        width: 60px;
                        height: 60px;
                        background: rgba(201,168,76,0.15);
                        border: 2px solid rgba(201,168,76,0.4);
                        border-radius: 50%;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 26px;
                        margin-bottom: 15px;
                    }
                    .header-logo {
                        font-size: 12px;
                        font-weight: 700;
                        color: #c9a84c;
                        text-transform: uppercase;
                        letter-spacing: 3px;
                        margin-bottom: 8px;
                    }
                    .header-title {
                        font-size: 22px;
                        font-weight: 700;
                        color: #ffffff;
                        margin-bottom: 6px;
                    }
                    .header-subtitle {
                        font-size: 13px;
                        color: rgba(255,255,255,0.4);
                    }
                    .body {
                        background: #ffffff;
                        padding: 30px 25px;
                        border-radius: 0 0 12px 12px;
                        border: 1px solid #e5e5e5;
                        border-top: none;
                    }
                    .greeting {
                        font-size: 16px;
                        font-weight: 700;
                        color: #222;
                        margin-bottom: 12px;
                    }
                    .intro {
                        font-size: 14px;
                        color: #555;
                        line-height: 1.75;
                        margin-bottom: 20px;
                    }
                    .summary-block {
                        background: #fafafa;
                        border: 1px solid #ececec;
                        border-left: 3px solid #c9a84c;
                        border-radius: 0 8px 8px 0;
                        padding: 18px 20px;
                        margin-bottom: 20px;
                    }
                    .summary-title {
                        font-size: 12px;
                        font-weight: 700;
                        color: #c9a84c;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 12px;
                    }
                    .summary-row {
                        font-size: 13px;
                        color: #555;
                        margin-bottom: 6px;
                        line-height: 1.6;
                    }
                    .summary-row strong { color: #333; }
                    .summary-message {
                        margin-top: 10px;
                        padding-top: 10px;
                        border-top: 1px solid #e5e5e5;
                        font-size: 13px;
                        color: #555;
                        white-space: pre-wrap;
                        line-height: 1.7;
                    }
                    .contact-block {
                        background: #fff8ee;
                        border: 1px solid #f0dfa8;
                        border-radius: 8px;
                        padding: 15px 20px;
                        margin-bottom: 20px;
                        font-size: 13px;
                        color: #666;
                        line-height: 1.7;
                    }
                    .contact-block a {
                        color: #c9a84c;
                        text-decoration: none;
                        font-weight: 600;
                    }
                    .footer {
                        text-align: center;
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                        font-size: 12px;
                        color: #aaa;
                        line-height: 1.8;
                    }
                    .footer strong { color: #c9a84c; }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="header">
                        <div style="font-size: 36px; margin-bottom: 15px;">🐾</div>
                        <div class="header-logo">Spirit of Freedom Kennel</div>
                        <div class="header-title">Message bien reçu !</div>
                        <div class="header-subtitle">Nous vous répondrons dans les plus brefs délais</div>
                    </div>
                    <div class="body">
                        <p class="greeting">Bonjour ${messageData.name},</p>
                        <p class="intro">
                            Nous avons bien reçu votre message et nous vous en remercions chaleureusement. 
                            Nous prendrons connaissance de votre demande et nous vous répondrons
                            dans les plus brefs délais.
                        </p>

                        <div class="summary-block">
                            <div class="summary-title">📋 Récapitulatif de votre message</div>
                            <div class="summary-row"><strong>Sujet :</strong> ${messageData.subject}</div>
                            <div class="summary-message">${messageData.content}</div>
                        </div>

                        <div class="contact-block">
                            💬 Vous avez une question urgente ? Vous pouvez également nous retrouver 
                            directement par téléphone: 
                            <a href="https://spiritoffreedomkennel.com/contact">0680455419</a>
                        </div>

                        <div class="footer">
                            <p>Cordialement,<br><strong>Spirit of Freedom Kennel</strong></p>
                            <p style="margin-top: 12px; font-size: 11px;">
                                Ceci est un message automatique, merci de ne pas y répondre directement.
                            </p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('❌ Erreur confirmation visiteur:', error);
        console.error('📋 Détails:', JSON.stringify(error, null, 2));
        console.error('📧 Destinataire:', messageData.email);
        return { success: false, error: error.message };
    }
}
module.exports = {
    sendNewMessageNotification,
    sendConfirmationToVisitor
};