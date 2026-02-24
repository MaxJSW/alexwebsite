// services/emailService.js
const SibApiV3Sdk = require('sib-api-v3-sdk');
require('dotenv').config();

// Configuration de l'API Brevo
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

/**
 * Fonction pour envoyer un email de notification de nouveau message à la cliente
 * @param {Object} messageData
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
            name: "Client"
        }];

        sendSmtpEmail.subject = `Nouveau message de ${messageData.name} - ${messageData.subject}`;

        sendSmtpEmail.htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f9f9f9;
                        border-radius: 10px;
                    }
                    .header {
                        background-color: #4CAF50;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background-color: white;
                        padding: 20px;
                        border-radius: 0 0 10px 10px;
                    }
                    .info-row {
                        margin: 10px 0;
                        padding: 10px;
                        background-color: #f5f5f5;
                        border-left: 4px solid #4CAF50;
                    }
                    .label {
                        font-weight: bold;
                        color: #4CAF50;
                    }
                    .message-content {
                        margin-top: 20px;
                        padding: 15px;
                        background-color: #f0f0f0;
                        border-radius: 5px;
                        white-space: pre-wrap;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>📬 Nouveau message reçu</h2>
                    </div>
                    <div class="content">
                        <p>Vous avez reçu un nouveau message via votre site web.</p>
                        
                        <div class="info-row">
                            <span class="label">👤 Nom :</span> ${messageData.name}
                        </div>
                        
                        <div class="info-row">
                            <span class="label">📧 Email :</span> <a href="mailto:${messageData.email}">${messageData.email}</a>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">📱 Téléphone :</span> ${messageData.phone || 'Non renseigné'}
                        </div>
                        
                        <div class="info-row">
                            <span class="label">📋 Sujet :</span> ${messageData.subject}
                        </div>
                        
                        <div class="message-content">
                            <p class="label">💬 Message :</p>
                            <p>${messageData.content}</p>
                        </div>
                        
                        <p style="margin-top: 20px; text-align: center; color: #666;">
                            <small>Ce message a été envoyé automatiquement depuis votre site web.</small>
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
        // console.log('✅ Email de notification envoyé à la cliente avec succès');
        return { success: true, messageId: result.messageId };

    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi de l\'email à la cliente:', error);
        return { success: false, error: error.message };
    }
}


/**
 * ⭐ NOUVELLE FONCTION : Envoyer un email de confirmation au visiteur
 * @param {Object} messageData - Les données du message
 */
async function sendConfirmationToVisitor(messageData) {
    try {
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

        sendSmtpEmail.sender = {
            email: process.env.BREVO_SENDER_EMAIL,
            name: process.env.BREVO_SENDER_NAME
        };

        // ⭐ Cette fois, on envoie au VISITEUR (pas à la cliente)
        sendSmtpEmail.to = [{
            email: messageData.email,
            name: messageData.name
        }];

        sendSmtpEmail.subject = `Confirmation de réception - ${messageData.subject}`;

        sendSmtpEmail.htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f9f9f9;
                        border-radius: 10px;
                    }
                    .header {
                        background-color: #2196F3;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background-color: white;
                        padding: 20px;
                        border-radius: 0 0 10px 10px;
                    }
                    .success-icon {
                        font-size: 50px;
                        text-align: center;
                        margin: 20px 0;
                    }
                    .message-summary {
                        background-color: #f0f8ff;
                        padding: 15px;
                        border-left: 4px solid #2196F3;
                        margin: 20px 0;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        color: #666;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>✅ Message bien reçu !</h2>
                    </div>
                    <div class="content">
                        <div class="success-icon">🎉</div>
                        
                        <p>Bonjour <strong>${messageData.name}</strong>,</p>
                        
                        <p>Nous avons bien reçu votre message et nous vous en remercions !</p>
                        
                        <p>Nous reviendrons vers vous dans les plus brefs délais pour répondre à votre demande.</p>
                        
                        <div class="message-summary">
                            <p><strong>Récapitulatif de votre message :</strong></p>
                            <p><strong>Sujet :</strong> ${messageData.subject}</p>
                            <p><strong>Message :</strong></p>
                            <p style="white-space: pre-wrap;">${messageData.content}</p>
                        </div>
                        
                        <p>Si vous avez des questions supplémentaires, n'hésitez pas à nous recontacter.</p>
                        
                        <div class="footer">
                            <p>Cordialement,<br><strong>${process.env.BREVO_SENDER_NAME}</strong></p>
                            <p><small>Ceci est un message automatique, merci de ne pas y répondre.</small></p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
        // console.log('✅ Email de confirmation envoyé au visiteur avec succès');
        return { success: true, messageId: result.messageId };

    // } catch (error) {
    //     console.error('❌ Erreur lors de l\'envoi de l\'email de confirmation au visiteur:', error);
    //     return { success: false, error: error.message };
    // }
    } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de confirmation au visiteur:', error);
    console.error('📋 Détails complets de l\'erreur:', JSON.stringify(error, null, 2));
    console.error('📧 Email destinataire:', messageData.email);
    console.error('📧 Email expéditeur:', process.env.BREVO_SENDER_EMAIL);
    return { success: false, error: error.message };
}
}


// ⭐ Exporter les DEUX fonctions
module.exports = {
    sendNewMessageNotification,
    sendConfirmationToVisitor
};