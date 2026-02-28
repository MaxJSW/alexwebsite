const express = require('express');
const session = require('express-session');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');
const dotenv = require('dotenv');
const db = require('../db');

const { sendNewMessageNotification, sendConfirmationToVisitor } = require('../../services/emailService');

dotenv.config();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

router.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Route pour afficher la page de contact
router.get('/', (req, res) => {
    const userId = 10;

    const querySocialLinks = `
        SELECT 
            usl.social_media_link,
            sn.name AS network_name
        FROM user_social_links usl
        LEFT JOIN social_network sn ON usl.social_network_id = sn.id
        WHERE usl.user_id = ?
        AND usl.social_media_link IS NOT NULL
        AND usl.social_media_link != ''
    `;

    db.query(querySocialLinks, [userId], (err, socialLinks) => {
        if (err) {
            console.error('Erreur récupération social links:', err);
            return res.redirect('/erreur');
        }

        res.render('contact', { socialLinks });
    });
});


// Router POST pour le formulaire de contact
router.post('/submit', async (req, res) => {
    const { name, email, phone, subject, content } = req.body;

    if (!name || !email || !subject || !content) {
        return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    const status = 'Non lu';
    const user_id = 10;
    const date_sent = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const query = `
        INSERT INTO messages 
        (name, email, phone, subject, content, status, user_id, date_sent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [name, email, phone, subject, content, status, user_id, date_sent],
    async (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'enregistrement du message:', err);
            return res.status(500).json({ error: 'Erreur lors de l\'enregistrement' });
        }

        const messageData = { name, email, phone, subject, content };

        const [notificationResult, confirmationResult] = await Promise.all([
            sendNewMessageNotification(messageData),
            sendConfirmationToVisitor(messageData)
        ]);

        if (!notificationResult.success) {
            console.error('⚠️ Erreur notification élevage:', notificationResult.error);
        }

        if (!confirmationResult.success) {
            console.error('⚠️ Erreur confirmation visiteur:', confirmationResult.error);
        }

        res.status(201).json({
            message: 'Message enregistré avec succès',
            notificationSent: notificationResult.success,
            confirmationSent: confirmationResult.success
        });
    });
});

module.exports = router;