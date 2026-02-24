const express = require('express');
const session = require('express-session');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');
const dotenv = require('dotenv');
const db = require('../db');

// ⭐ Import des DEUX fonctions d'envoi d'email
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
    const userId = 8;
    res.render('contact');
});


// Router POST pour le formulaire de contact
router.post('/submit', async (req, res) => {
    const { name, email, phone, subject, content } = req.body;
    const status = 'Non lu';
    const user_id = 8;
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
        
        const messageData = {
            name: name,
            email: email,
            phone: phone,
            subject: subject,
            content: content
        };
        
        const notificationResult = await sendNewMessageNotification(messageData);
        
        if (notificationResult.success) {
        } else {
            console.error('⚠️ Erreur notification cliente:', notificationResult.error);
        }
        
        const confirmationResult = await sendConfirmationToVisitor(messageData);
        
        if (confirmationResult.success) {
        } else {
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