const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const db = require('../db');
dotenv.config(); 

// Configuration de Multer pour le stockage des fichiers
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
const upload = multer({ storage });

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.redirect('/admin/connect');
    }
}

// router principal de la page addPhotos
router.get('/', isAuthenticated, (req, res) => {
    const animalId = req.query.animal_id;
    const success = req.query.success;
    const error = req.query.error;

    db.query('SELECT * FROM images WHERE animal_id = ?', [animalId], (err, imagesResults) => {
        if (err) {
            console.error('Erreur lors de la récupération des photos:', err);
            return res.status(500).send('Erreur lors de la récupération des photos');
        }

        db.query('SELECT * FROM animals', (err, animalsResults) => {
            if (err) {
                console.error('Erreur lors de la récupération des animaux:', err);
                return res.status(500).send('Erreur lors de la récupération des animaux');
            }

            res.render('addPhotos', {
                success,
                error,
                photos: imagesResults,
                user: req.session.user,
                kennel_name: req.session.kennel_name,
                animals: animalsResults,
                animal_id: animalId,
                currentPage: 'addAnimal'
            });
        });
    });
});


// router for adding photos
router.post('/uploadPhotos', upload.array('photos', 12), async (req, res) => {
    try {
        const files = req.files;
        const animalId = req.body.animal_id;

        if (!animalId) {
            return res.status(400).send('ID de l\'animal est requis.');
        }

        if (files.length === 0) {
            return res.status(400).send('Aucun fichier téléchargé.');
        }
        
        const insertQuery = 'INSERT INTO images (animal_id, image_path) VALUES ?';
        const values = files.map(file => [animalId, file.filename]);

        await db.query(insertQuery, [values]);

        const photos = files.map(file => ({
            id: file.filename,
            image_path: file.filename
        }));

        res.json({ success: true, photos });
    } catch (err) {
        console.error('Erreur lors du traitement des photos:', err);
        res.status(500).send('Erreur lors du traitement des photos');
    }
});



router.post('/deletePhoto', isAuthenticated, (req, res) => {
    const { photoId, imagePath } = req.body;

    db.query('DELETE FROM images WHERE id = ?', [photoId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la suppression de la photo:', err);
            return res.status(500).send('Erreur lors de la suppression de la photo');
        }

        const filePath = path.join(__dirname, '../../uploads', imagePath);
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('Erreur lors de la suppression du fichier:', unlinkErr);
                    return res.status(500).send('Erreur lors de la suppression du fichier');
                }
                res.json({ success: true });
            });
        } else {
            res.json({ success: true });
        }
    });
});


// Route pour mettre à jour une photo recadrée
router.post('/updatePhoto', isAuthenticated, upload.single('photo'), async (req, res) => {
    try {
        const photoId = req.body.photoId;
        const oldPath = req.body.oldPath;
        const newFile = req.file;

        if (!photoId || !newFile) {
            return res.status(400).json({ error: 'Données manquantes' });
        }

        const oldFilePath = path.join(__dirname, '../../uploads', oldPath);
        if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
        }

        const updateQuery = 'UPDATE images SET image_path = ? WHERE id = ?';
        await db.query(updateQuery, [newFile.filename, photoId]);

        res.json({ 
            success: true, 
            newPath: newFile.filename 
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de la photo:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de la photo' });
    }
});


module.exports = router;






