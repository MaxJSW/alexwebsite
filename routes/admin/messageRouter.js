// Modules natifs de Node.js
const path = require('path');
const fs = require('fs');

// Modules installés via npm
const express = require('express');
const router = express.Router();
const moment = require('moment');
require('moment/locale/fr');
const dotenv = require('dotenv');
const multer = require('multer');
const bodyParser = require('body-parser');
const cron = require('node-cron');

// Modules locaux (vos propres fichiers)
const db = require('../db');

// Configuration de l'application
dotenv.config();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.redirect('/admin/connect');
    }
}

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

router.use('/uploads', express.static(path.join(__dirname, '../uploads')));


// router principale de la page message
router.get('/', isAuthenticated, (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        console.error('User ID is not available in session.');
        res.status(500).send('User ID is not available in session.');
        return;
    }

    const userId = req.session.user.id;

    // Requête pour récupérer les messages pour l'utilisateur connecté
    const queryMessages = `
    SELECT 
        id, 
        name, 
        email, 
        phone, 
        subject, 
        content, 
        status, 
        user_id,
        date_sent  -- Inclure la colonne date_sent dans la requête
    FROM 
        messages 
    WHERE 
        user_id = ?
    ORDER BY 
        date_sent DESC  -- Trier les résultats par date_sent pour afficher les plus récents en premier
`;

    // Exécuter la requête pour récupérer les messages
    db.query(queryMessages, [userId], (err, messages) => {
        if (err) {
            console.error('Erreur lors de la récupération des messages:', err);
            res.status(500).send('Erreur lors de la récupération des messages.');
            return;
        }

        // Rendre la vue avec les messages et les informations utilisateur
        res.render('message', {
            user: req.session.user,
            messages: messages,
            currentPage: 'message'
        });
    });
});

//  router pour la mise à jour du message après suppression ou ajout
router.get('/updated-list', isAuthenticated, (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        console.error('User ID is not available in session.');
        res.status(500).send('User ID is not available in session.');
        return;
    }

    const userId = req.session.user.id;
    
    const queryMessages = `
        SELECT 
            id, 
            name, 
            email, 
            phone, 
            subject, 
            content, 
            status, 
            user_id, 
            date_sent 
        FROM 
            messages 
        WHERE 
            user_id = ? 
        ORDER BY 
            date_sent DESC
    `;

    db.query(queryMessages, [userId], (err, messages) => {
        if (err) {
            console.error('Erreur lors de la récupération des messages:', err);
            return res.status(500).send('Erreur lors de la récupération des messages.');
        }

        // Renvoyer le fragment HTML contenant les messages
        res.render('partials/messages', { messages: messages, layout: false });
    });
});

// Router pour récupérer le nombre de messages non lus
router.get('/unread-count', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;

    const query = `
        SELECT COUNT(*) AS unreadCount 
        FROM messages 
        WHERE user_id = ? AND status = 'Non lu'
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération du nombre de messages non lus : ', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération du nombre de messages non lus.' });
        }

        const unreadCount = results[0].unreadCount;
        res.json({ success: true, unreadCount });
    });
});

// post pour le status du message  lu ou non lu
router.post('/update-message-status/:id', isAuthenticated, (req, res) => {
    const messageId = req.params.id;
    const newStatus = req.body.status;

    const queryUpdateStatus = `
        UPDATE messages 
        SET status = ? 
        WHERE id = ?
    `;

    db.query(queryUpdateStatus, [newStatus, messageId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la mise à jour du statut : ', err);
            return res.json({ success: false, message: 'Erreur lors de la mise à jour du statut' });
        }

        res.json({ success: true });
    });
});


router.post('/delete', isAuthenticated, (req, res) => {
    const messageIds = req.body.messageIds;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Aucun message sélectionné.' });
    }

    const placeholders = messageIds.map(() => '?').join(',');
    const query = `DELETE FROM messages WHERE id IN (${placeholders}) AND user_id = ?`;

    db.query(query, [...messageIds, req.session.user.id], (err, results) => {
        if (err) {
            console.error('Erreur lors de la suppression des messages : ', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la suppression des messages.' });
        }

        return res.json({ success: true });
    });
});


module.exports = router;