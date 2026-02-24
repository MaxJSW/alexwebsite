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

dotenv.config();

// Configuration de multer pour enregistrer les fichiers avec le bon nom
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, uniqueSuffix + extension);
    }
});

const upload = multer({ storage: storage }).array('photos');


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


// router principal breedInfos + filtre par utilisateur
router.get('/', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;

    const getBreedsQuery = `
        SELECT *,
               CASE WHEN is_online = 1 THEN 'En Ligne' ELSE 'Brouillon' END AS status_text,
               CASE WHEN is_online = 1 THEN 'bg-success' ELSE 'bg-secondary' END AS badge_class
        FROM breed_name 
        WHERE user_id = ?
        ORDER BY date_creation DESC
    `;

    db.query(getBreedsQuery, [userId], (err, breedsResult) => {
        if (err) {
            console.error('Erreur lors de la récupération des races:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des races' });
        }

        breedsResult.forEach(breed => {
            breed.formatted_date_creation = moment(breed.date_creation).format('DD/MM/YYYY HH:mm');
            breed.formatted_date_modification = breed.date_modification 
                ? moment(breed.date_modification).format('DD/MM/YYYY HH:mm') 
                : 'Race non modifiée';
        });

        const breedIds = breedsResult.map(breed => breed.id);

        if (breedIds.length === 0) {
            return res.render('breedInfos', {
                user: req.session.user,
                breeds: breedsResult,
                currentPage: 'breeds'
            });
        }

        const getParagraphsQuery = `
            SELECT * FROM breed_paragraphs WHERE breed_id IN (?)
        `;
        const getImagesQuery = `
            SELECT * FROM breed_images WHERE breed_id IN (?)
        `;

        db.query(getParagraphsQuery, [breedIds], (err, paragraphsResult) => {
            if (err) {
                console.error('Erreur lors de la récupération des paragraphes des races:', err);
                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des paragraphes des races' });
            }

            db.query(getImagesQuery, [breedIds], (err, imagesResult) => {
                if (err) {
                    console.error('Erreur lors de la récupération des images des races:', err);
                    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des images des races' });
                }
                breedsResult.forEach(breed => {
                    breed.paragraphs = paragraphsResult.filter(paragraph => paragraph.breed_id === breed.id);
                    breed.images = imagesResult.filter(image => image.breed_id === breed.id);
                });

                res.render('breedInfos', {
                    user: req.session.user,
                    breeds: breedsResult,
                    currentPage: 'breeds'
                });
            });
        });
    });
});

// router :id pour récupérer les élements dans la modale
router.get('/:id', isAuthenticated, (req, res) => {
    const breedId = req.params.id;

    const getBreedQuery = `
        SELECT * 
        FROM breed_name 
        WHERE id = ?
    `;

    const getParagraphsQuery = `
        SELECT * 
        FROM breed_paragraphs 
        WHERE breed_id = ?
    `;

    db.query(getBreedQuery, [breedId], (err, breedResult) => {
        if (err) {
            console.error('Erreur lors de la récupération de la race:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération de la race' });
        }

        if (breedResult.length === 0) {
            return res.status(404).json({ success: false, message: 'Race non trouvée' });
        }

        db.query(getParagraphsQuery, [breedId], (err, paragraphsResult) => {
            if (err) {
                console.error('Erreur lors de la récupération des paragraphes:', err);
                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des paragraphes' });
            }

            const breed = breedResult[0];
            breed.paragraphs = paragraphsResult;

            res.json(breed);
        });
    });
});

//  router pour récupérer les photos
router.get('/:id/photos', isAuthenticated, (req, res) => {
    const breedId = req.params.id;

    const getPhotosQuery = `
        SELECT id, image_path, balise_title, balise_alt
        FROM breed_images
        WHERE breed_id = ?
    `;

    db.query(getPhotosQuery, [breedId], (err, photosResult) => {
        if (err) {
            console.error('Erreur lors de la récupération des photos:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des photos' });
        }

        res.json({ success: true, photos: photosResult });
    });
});

// router pour l'envoi des données du formulaire
router.post('/edit', isAuthenticated, (req, res) => {
    const { id, name, description, date_modification, paragraphs } = req.body;

    const formattedDateModification = moment(date_modification, 'DD/MM/YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss');

    const updateBreedQuery = `
        UPDATE breed_name 
        SET name = ?, description = ?, date_modification = ? 
        WHERE id = ?
    `;

    db.query(updateBreedQuery, [name, description, formattedDateModification, id], (err, result) => {
        if (err) {
            console.error('Erreur lors de la mise à jour de la race:', err);
            return res.status(500).send('Erreur lors de la mise à jour de la race');
        }

        if (paragraphs && paragraphs.length > 0) {
            const paragraphsData = paragraphs.map(p => [id, p.title || '', p.content || '']);
            const deleteParagraphsQuery = `DELETE FROM breed_paragraphs WHERE breed_id = ?`;
            const insertParagraphsQuery = `
                INSERT INTO breed_paragraphs (breed_id, title, content)
                VALUES ?
            `;

            db.query(deleteParagraphsQuery, [id], (err, result) => {
                if (err) {
                    console.error('Erreur lors de la suppression des anciens paragraphes:', err);
                    return res.status(500).send('Erreur lors de la suppression des anciens paragraphes');
                }

                db.query(insertParagraphsQuery, [paragraphsData], (err, result) => {
                    if (err) {
                        console.error('Erreur lors de l\'insertion des nouveaux paragraphes:', err);
                        return res.status(500).send('Erreur lors de l\'insertion des nouveaux paragraphes');
                    }

                    res.sendStatus(200);
                });
            });
        } else {
            res.sendStatus(200);
        }
    });
});

// post pour la mise en ligne de la fiche race
router.post('/:breedId/update-status', isAuthenticated, (req, res) => {
    const breedId = req.params.breedId;
    const { isOnline } = req.body;

    const updateQuery = `
        UPDATE breed_name
        SET is_online = ?
        WHERE id = ?
    `;

    db.query(updateQuery, [isOnline, breedId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la mise à jour du statut de la race:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du statut de la race' });
        }

        if (result.affectedRows > 0) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Aucune race trouvée avec cet ID' });
        }
    });
});

//  router test pour l'ajout des photos 
router.post('/add-photo', isAuthenticated, (req, res) => {
    upload(req, res, function (err) {
        if (err) {
            console.error('Erreur lors de l\'upload des photos:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de l\'upload des photos' });
        }
        const { breedId } = req.body;
        const photos = req.files;
        if (!photos || !photos.length) {
            return res.status(400).json({ success: false, message: 'Aucune photo téléchargée' });
        }

        const photo = photos[0];
        const sanitizedFileName = encodeURIComponent(normalizeFileName(photo.originalname));
        const imagePath = photo.filename;
        const altText = req.body[`balise_alt_${sanitizedFileName}`];

        if (!altText) {
            return res.status(400).json({ success: false, message: 'Balise alt non fournie.' });
        }

        const checkQuery = `
            SELECT id FROM breed_images WHERE breed_id = ? AND image_path = ?
        `;
        db.query(checkQuery, [breedId, imagePath], (err, results) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de l\'image' });
            }
            if (results.length > 0) {
                const updateQuery = `
                    UPDATE breed_images SET balise_alt = ? WHERE id = ?
                `;
                db.query(updateQuery, [altText, results[0].id], (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la balise alt' });
                    }
                    res.json({ success: true, message: 'Photo mise à jour avec succès' });
                });
            } else {
                const insertQuery = `
                    INSERT INTO breed_images (breed_id, image_path, balise_alt)
                    VALUES (?, ?, ?)
                `;
                db.query(insertQuery, [breedId, imagePath, altText], (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Erreur lors de l\'insertion de la photo' });
                    }
                    res.json({ success: true, message: 'Photo ajoutée avec succès' });
                });
            }
        });
    });
});

// Route pour supprimer une photo
router.delete('/delete-photo/:photoId', isAuthenticated, (req, res) => {
    const photoId = req.params.photoId;

    const getPhotoQuery = `SELECT image_path FROM breed_images WHERE id = ?`;
    
    db.query(getPhotoQuery, [photoId], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération de la photo:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération de la photo' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Photo non trouvée' });
        }

        const imagePath = results[0].image_path;
        const fullPath = path.join(process.cwd(), 'uploads', imagePath);
        
        const imageNameWithoutExt = path.parse(imagePath).name;
        const optimizedPath = path.join(process.cwd(), 'uploads', 'optimized', `${imageNameWithoutExt}.webp`);

        fs.unlink(fullPath, (err) => {
            if (err) {
                console.error('Erreur lors de la suppression du fichier original:', err);
            }

            fs.unlink(optimizedPath, (err) => {
                if (err && err.code !== 'ENOENT') {
                    console.error('Erreur lors de la suppression du fichier optimisé:', err);
                }
            });

            const deleteQuery = `DELETE FROM breed_images WHERE id = ?`;
            
            db.query(deleteQuery, [photoId], (err, result) => {
                if (err) {
                    console.error('Erreur lors de la suppression de la photo en base:', err);
                    return res.status(500).json({ success: false, message: 'Erreur lors de la suppression de la photo' });
                }

                if (result.affectedRows > 0) {
                    res.json({ success: true, message: 'Photo supprimée avec succès' });
                } else {
                    res.json({ success: false, message: 'Aucune photo trouvée avec cet ID' });
                }
            });
        });
    });
});


// Fonction de normalisation des noms de fichiers
function normalizeFileName(fileName) {
    return fileName
        .normalize('NFD') 
        .replace(/[\u0300-\u036f]/g, '') 
        .replace(/[\s\W]/g, '_');
}

module.exports = router;