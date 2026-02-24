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


// get principal de la page kennelInformations (admin)
router.get('/', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;

    const getKennelInformationsQuery = `
        SELECT * FROM kennel_informations 
        WHERE user_id = ?
        ORDER BY date_creation DESC
    `;

    db.query(getKennelInformationsQuery, [userId], (err, kennelInformationsResult) => {
        if (err) {
            console.error('Erreur lors de la récupération des informations de chenil:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des informations de chenil' });
        }

        // Formattage des dates
        kennelInformationsResult.forEach(info => {
            info.formatted_date_creation = moment(info.date_creation).format('DD/MM/YYYY HH:mm');
            info.formatted_date_modification = info.date_modification ? moment(info.date_modification).format('DD/MM/YYYY HH:mm') : 'Non modifié';
        });

        const kennelInfosIds = kennelInformationsResult.map(info => info.id);
        if (kennelInfosIds.length === 0) {
            res.render('kennelInformations', {
                user: req.session.user,
                kennelInformations: [],
                kennelParagraphs: [],
                kennelImages: [],
                currentPage: 'infos'
            });
            return;
        }

        const getKennelParagraphsQuery = `
            SELECT * FROM kennel_paragraphs WHERE kennel_infos_id IN (?)
        `;
        const getKennelImagesQuery = `
            SELECT * FROM kennel_images WHERE kennel_infos_id IN (?)
        `;

        db.query(getKennelParagraphsQuery, [kennelInfosIds], (err, kennelParagraphsResult) => {
            if (err) {
                console.error('Erreur lors de la récupération des paragraphes de chenil:', err);
                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des paragraphes de chenil' });
            }

            db.query(getKennelImagesQuery, [kennelInfosIds], (err, kennelImagesResult) => {
                if (err) {
                    console.error('Erreur lors de la récupération des images de chenil:', err);
                    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des images de chenil' });
                }

                res.render('kennelInformations', {
                    user: req.session.user,
                    kennelInformations: kennelInformationsResult,
                    kennelParagraphs: kennelParagraphsResult,
                    kennelImages: kennelImagesResult,
                    currentPage: 'infos'
                });
            });
        });
    });
});


//  get dynamic de la page kennelInformations
router.get('/:id', isAuthenticated, (req, res) => {
    const sectionId = req.params.id;

    const getSectionQuery = `
        SELECT * FROM kennel_informations WHERE id = ?
    `;

    const getParagraphsQuery = `
        SELECT * FROM kennel_paragraphs WHERE kennel_infos_id = ?
    `;

    db.query(getSectionQuery, [sectionId], (err, sectionResult) => {
        if (err) {
            console.error('Erreur lors de la récupération de la section:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération de la section' });
        }

        if (sectionResult.length === 0) {
            return res.status(404).json({ success: false, message: 'Section non trouvée' });
        }

        // Formattage des dates
        const section = sectionResult[0];
        section.formatted_date_creation = moment(section.date_creation).format('DD/MM/YYYY HH:mm');
        section.formatted_date_modification = section.date_modification ? moment(section.date_modification).format('DD/MM/YYYY HH:mm') : 'Non modifié';

        db.query(getParagraphsQuery, [sectionId], (err, paragraphsResult) => {
            if (err) {
                console.error('Erreur lors de la récupération des paragraphes de la section:', err);
                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des paragraphes de la section' });
            }

            section.paragraphs = paragraphsResult;

            res.json(section);
        });
    });
});

// router.get dynamic pour récupérer les photos
router.get('/:id/photos', isAuthenticated, (req, res) => {
    const sectionId = req.params.id;

    const getPhotosQuery = `
        SELECT * 
        FROM kennel_images 
        WHERE kennel_infos_id = ?
    `;

    db.query(getPhotosQuery, [sectionId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la récupération des photos:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des photos' });
        }

        res.json({ success: true, photos: result });
    });
});


// Route pour créer une nouvelle section
router.post('/create-section', isAuthenticated, (req, res) => {
    const { titre, description, date_creation, slug } = req.body;
    const user_id = req.session.user.id;

    // Convertir la date au format YYYY-MM-DD HH:mm:ss
    const formattedDate = moment(date_creation, 'DD/MM/YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss');

    const query = `
        INSERT INTO kennel_informations (titre, description, date_creation, slug, user_id, is_online)
        VALUES (?, ?, ?, ?, ?, 0)
    `;

    db.query(query, [titre, description, formattedDate, slug, user_id], (err, result) => {
        if (err) {
            console.error('Erreur lors de la création de la section:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la création de la section' });
        }

        res.json({ success: true, message: 'Section créée avec succès' });
    });
});

// Route pour modifier une section existante
router.post('/edit-section', isAuthenticated, (req, res) => {
    const { titre, description, date_modification, id, slug, paragraphs } = req.body;

    // Convertir la date au format YYYY-MM-DD HH:mm:ss
    const formattedDate = moment(date_modification, 'DD/MM/YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss');

    const updateSectionQuery = `
        UPDATE kennel_informations
        SET titre = ?, description = ?, date_modification = ?, slug = ?
        WHERE id = ?
    `;

    db.query(updateSectionQuery, [titre, description, formattedDate, slug, id], (err, result) => {
        if (err) {
            console.error('Erreur lors de la mise à jour de la section:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la section' });
        }

        const deleteParagraphsQuery = `
            DELETE FROM kennel_paragraphs WHERE kennel_infos_id = ?
        `;

        db.query(deleteParagraphsQuery, [id], (err, result) => {
            if (err) {
                console.error('Erreur lors de la suppression des anciens paragraphes:', err);
                return res.status(500).json({ success: false, message: 'Erreur lors de la suppression des anciens paragraphes' });
            }

            if (paragraphs.length === 0) {
                // Si aucun paragraphe à insérer, retourner une réponse réussie
                return res.json({ success: true, message: 'Section mise à jour avec succès' });
            }

            const insertParagraphsQuery = `
                INSERT INTO kennel_paragraphs (kennel_infos_id, title, content)
                VALUES ?
            `;

            const paragraphsData = paragraphs.map(paragraph => [id, paragraph.title, paragraph.content]);

            db.query(insertParagraphsQuery, [paragraphsData], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'insertion des nouveaux paragraphes:', err);
                    return res.status(500).json({ success: false, message: 'Erreur lors de l\'insertion des nouveaux paragraphes' });
                }

                res.json({ success: true, message: 'Section mise à jour avec succès' });
            });
        });
    });
});



// router.post pour l'ajout de la photo de la section modifiée
router.post('/add-photo', isAuthenticated, upload.single('photo'), (req, res) => {
    const { balise_title, balise_alt, sectionId } = req.body;
    let imagePath;

    if (req.file) {
        imagePath = req.file.filename; 
    }

    const checkPhotoQuery = `
        SELECT image_path FROM kennel_images WHERE kennel_infos_id = ?
    `;

    db.query(checkPhotoQuery, [sectionId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la vérification de la photo existante:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de la photo existante' });
        }

        if (result.length > 0) {
            if (imagePath) {
                // Supprimer l'ancienne photo du système de fichiers
                const oldImagePath = path.join(__dirname, '..', 'uploads', result[0].image_path);
                fs.unlink(oldImagePath, (err) => {
                    if (err) {
                        console.error('Erreur lors de la suppression de l\'ancienne photo:', err);
                    }
                });

                // Supprimer l'entrée de la base de données
                const deletePhotoQuery = `
                    DELETE FROM kennel_images WHERE kennel_infos_id = ?
                `;
                db.query(deletePhotoQuery, [sectionId], (err, deleteResult) => {
                    if (err) {
                        console.error('Erreur lors de la suppression de l\'ancienne photo de la base de données:', err);
                        return res.status(500).json({ success: false, message: 'Erreur lors de la suppression de l\'ancienne photo de la base de données' });
                    }

                    // Insérer la nouvelle photo
                    insertPhoto(sectionId, imagePath, balise_title, balise_alt, res);
                });
            } else {
                // Mettre à jour seulement les balises title et alt
                const updatePhotoQuery = `
                    UPDATE kennel_images
                    SET balise_title = ?, balise_alt = ?, alt_modified = ?
                    WHERE kennel_infos_id = ?
                `;
                db.query(updatePhotoQuery, [balise_title, balise_alt, true, sectionId], (err, updateResult) => {
                    if (err) {
                        console.error('Erreur lors de la mise à jour des balises:', err);
                        return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des balises' });
                    }

                    res.json({ success: true, message: 'Balises mises à jour avec succès' });
                });
            }
        } else {
            if (imagePath) {
                // Insérer la nouvelle photo directement
                insertPhoto(sectionId, imagePath, balise_title, balise_alt, res);
            } else {
                res.status(400).json({ success: false, message: 'Aucune photo sélectionnée' });
            }
        }
    });
});

// Fonction pour insérer la nouvelle photo dans la base de données
function insertPhoto(sectionId, imagePath, balise_title, balise_alt, res) {
    const insertPhotoQuery = `
        INSERT INTO kennel_images (kennel_infos_id, image_path, balise_title, balise_alt, alt_modified)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(insertPhotoQuery, [sectionId, imagePath, balise_title, balise_alt, false], (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'ajout de la photo:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout de la photo' });
        }

        res.json({ success: true, imagePath, balise_title, balise_alt });
    });
}








router.post('/:sectionId/update-status', (req, res) => {
    const sectionId = req.params.sectionId;
    const { isOnline } = req.body;

    // Requête SQL pour mettre à jour le statut de la section
    const updateQuery = `
        UPDATE kennel_informations
        SET is_online = ?
        WHERE id = ?
    `;

    db.query(updateQuery, [isOnline, sectionId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la mise à jour du statut de la section:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du statut de la section' });
        }

        // Vérifier si la mise à jour a été effectuée avec succès
        if (result.affectedRows > 0) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Aucune section trouvée avec cet ID' });
        }
    });
});


module.exports = router;