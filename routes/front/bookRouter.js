const express = require('express');
const session = require('express-session');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');
const dotenv = require('dotenv');
const db = require('../db');


dotenv.config();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Configuration multer
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/heic',
            'image/heif'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Type de fichier non supporté. Types acceptés : ${allowedTypes.join(', ')}`));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

// const publicDirectory = path.join(__dirname, './public');
router.use('/uploads', express.static(path.join(__dirname, '../uploads')));


// Route pour afficher la page d'informations
router.get('/', (req, res) => {
    const ownerId = 8;

    const queryCommentsInfo = `
    SELECT 
        c.id AS comment_id,
        c.user_id,
        c.user_name,
        c.user_email,
        c.comment_text,
        c.created_at,
        c.is_approved,
        c.parent_id,
        c.name_of_dog,
        c.reviews_star,
        u.surname AS user_surname,
        u.email AS user_email,
        ci.image_path AS photo_path,
        ci.optimized_image_path AS optimized_photo_path,
        ci.optimized AS is_photo_optimized
    FROM 
        comments c
    LEFT JOIN 
        users u ON c.user_id = u.id
    LEFT JOIN 
        comments_images ci ON ci.comments_id = c.id
    WHERE 
        c.is_approved = 1
    ORDER BY 
        c.created_at DESC  -- Trie par date de création, les plus récents en premier
`;


    db.query(queryCommentsInfo, (err, comments) => {
        if (err) {
            console.error('Erreur lors de la récupération des commentaires:', err);
            return res.redirect('/erreur');
        }
        res.render('livre-d-or', {
            comments: comments
        });
    });
});

// Router.post pour les témoignages
router.post('/add-comment', upload.single('photo'), (req, res) => {
    try {
        const { user_name, user_email, name_of_dog, reviews_star, comment_text } = req.body;
        if (!user_name || !user_email || !name_of_dog || !reviews_star || !comment_text) {
            return res.status(400).json({
                success: false,
                message: 'Tous les champs obligatoires doivent être remplis'
            });
        }
        const commentQuery = `
            INSERT INTO comments (
                user_name, 
                user_email, 
                name_of_dog, 
                reviews_star, 
                comment_text,
                is_approved
            ) VALUES (?, ?, ?, ?, ?, 0)
        `;

        db.query(commentQuery, [
            user_name,
            user_email,
            name_of_dog,
            reviews_star,
            comment_text
        ], (err, commentResult) => {
            if (err) {
                console.error('Erreur lors de l\'ajout du commentaire:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Une erreur est survenue lors de l\'envoi de votre témoignage'
                });
            }
            if (req.file) {
                const imageQuery = `
                    INSERT INTO comments_images (
                        comments_id,
                        image_path,
                        optimized
                    ) VALUES (?, ?, 0)
                `;
                const imagePath = req.file.filename;
                db.query(imageQuery, [
                    commentResult.insertId,
                    imagePath
                ], (imageErr) => {
                    if (imageErr) {
                        console.error('Erreur lors de l\'ajout de l\'image:', imageErr);
                    }
                });
            }
            res.status(200).json({
                success: true,
                message: 'Votre témoignage a été envoyé avec succès. Il sera visible après modération.'
            });
        });

    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({
            success: false,
            message: 'Une erreur est survenue'
        });
    }
});

module.exports = router;