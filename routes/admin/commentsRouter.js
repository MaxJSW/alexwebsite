const path = require('path');
const fs = require('fs');
const express = require('express');
const router = express.Router();
const moment = require('moment');
require('moment/locale/fr');
const dotenv = require('dotenv');
const multer = require('multer');
const bodyParser = require('body-parser');
const db = require('../db');

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



// router test avec commentaires parents si existent
router.get('/', isAuthenticated, (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        console.error('User ID is not available in session.');
        res.status(500).send('User ID is not available in session.');
        return;
    }

    // Récupération du nom de l'utilisateur connecté
    db.query('SELECT name, kennel_name FROM users WHERE id = ?', [req.session.user.id], (err, userResults) => {
        if (err) {
            console.error('Erreur lors de la récupération de l\'utilisateur:', err);
            res.status(500).send('Erreur interne du serveur');
            return;
        }

        if (!userResults || userResults.length === 0) {
            console.error('User not found in the database.');
            return res.status(404).send('User not found');
        }

        const userName = userResults[0].name;

        // Récupération des commentaires non approuvés avec leurs commentaires parents s'ils existent
        db.query(`
            SELECT 
                c.id, 
                c.user_id, 
                c.user_name, 
                c.user_email, 
                c.comment_text, 
                c.created_at,
                c.reviews_star,
                c.name_of_dog,
                c.is_approved, 
                c.parent_id,
                p.comment_text AS parent_comment_text,
                p.user_name AS parent_user_name
            FROM 
                comments c
            LEFT JOIN 
                comments p ON c.parent_id = p.id
            WHERE 
                c.is_approved = FALSE
            ORDER BY 
                c.created_at DESC
        `, (err, comments) => {
            if (err) {
                console.error('Erreur lors de la récupération des commentaires:', err);
                res.status(500).send('Erreur interne du serveur');
                return;
            }
            res.render('comments', {
                user: {
                    id: req.session.user.id,
                    email: req.session.user.email,
                    name: userName,
                    kennel_name: userResults[0].kennel_name
                    
                },
                comments: comments,
                currentPage: 'comments'
            });
        });
    });
});


// router pour approuver un commentaire
router.post('/approve/:id', isAuthenticated, async (req, res) => {
    const commentId = req.params.id;
    try {
        await db.query('UPDATE comments SET is_approved = TRUE WHERE id = ?', [commentId]);
        res.redirect('/admin/comments');
    } catch (error) {
        console.error('Erreur lors de l\'approbation du commentaire:', error);
        res.status(500).send('Erreur lors de l\'approbation du commentaire');
    }
});


// router pour supprimer un commentaire
router.post('/delete/:id', isAuthenticated, async (req, res) => {
    const commentId = req.params.id;
    try {
        await db.query('DELETE FROM comments WHERE id = ?', [commentId]);
        res.redirect('/admin/comments');
    } catch (error) {
        console.error('Erreur lors de la suppression du commentaire:', error);
        res.status(500).send('Erreur lors de la suppression du commentaire');
    }
});



module.exports = router;