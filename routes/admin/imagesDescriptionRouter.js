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


// version test du get (avec alt_modified)
router.get('/:slug', isAuthenticated, (req, res) => {
    const animalSlug = req.params.slug;

    const queryAnimal = `
        SELECT a.id, a.name, a.category, a.gender, b.name AS breed_name, a.breed_type, a.color, a.slug
        FROM animals a
        LEFT JOIN breed_name b ON a.breed_id = b.id
        WHERE a.slug = ?
    `;

    const queryImages = `
        SELECT id, image_path, balise_title, balise_alt, alt_modified
        FROM images
        WHERE animal_id = (SELECT id FROM animals WHERE slug = ?)
    `;

    db.query(queryAnimal, [animalSlug], (err, animalResults) => {
        if (err) {
            console.error('Erreur lors de la récupération des informations de l\'animal:', err);
            return res.status(500).send('Erreur lors de la récupération des informations de l\'animal');
        }

        const animal = animalResults.length ? animalResults[0] : {};

        db.query(queryImages, [animalSlug], (err, imageResults) => {
            if (err) {
                console.error('Erreur lors de la récupération des images:', err);
                return res.status(500).send('Erreur lors de la récupération des images');
            }

            const images = imageResults;

            res.render('imagesDescription', {
                animal: animal,
                images: images,
                user: req.session.user,
                currentPage: 'dogs'
            });
        });
    });
});



// test pour remplir également le champ balise_title (champ hidden balise_title mis dans le formulaire)
router.post('/updateImageAlt', upload.none(), isAuthenticated, (req, res) => {
    const { imageId, balise_alt, balise_title } = req.body;

    if (!imageId || !balise_alt || !balise_title) {
        return res.status(400).json({ success: false, message: 'Paramètres manquants' });
    }

    const updateQuery = `
        UPDATE images 
        SET balise_alt = ?, balise_title = ?, alt_modified = 1
        WHERE id = ?
    `;

    db.query(updateQuery, [balise_alt, balise_title, imageId], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la balise alt et du titre' });
        }

        // Vérifiez si la mise à jour a bien été effectuée
        const checkQuery = `SELECT alt_modified FROM images WHERE id = ?`;
        db.query(checkQuery, [imageId], (err, results) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de alt_modified' });
            }

            const altModified = results[0].alt_modified;
            res.json({ success: true, imageId: imageId, message: 'Balise alt et titre mis à jour avec succès', alt_modified: altModified });
        });
    });
});


// version router.post pour la modification de la balise alt (bonne version sans la balise title)

// router.post('/updateImageAlt', upload.none(), isAuthenticated, (req, res) => {
//     const { imageId, balise_alt } = req.body;

//     if (!imageId || !balise_alt) {
//         return res.status(400).json({ success: false, message: 'Paramètres manquants' });
//     }

//     const updateQuery = `
//         UPDATE images 
//         SET balise_alt = ?, alt_modified = 1
//         WHERE id = ?
//     `;

//     db.query(updateQuery, [balise_alt, imageId], (err, result) => {
//         if (err) {
//             return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la balise alt' });
//         }

//         // Vérifiez si la mise à jour a bien été effectuée
//         const checkQuery = `SELECT alt_modified FROM images WHERE id = ?`;
//         db.query(checkQuery, [imageId], (err, results) => {
//             if (err) {
//                 return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de alt_modified' });
//             }

//             const altModified = results[0].alt_modified;
//             res.json({ success: true, imageId: imageId, message: 'Balise alt mise à jour avec succès', alt_modified: altModified });
//         });
//     });
// });











module.exports = router;
