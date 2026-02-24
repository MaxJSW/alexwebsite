
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

// router get principal
router.get('/', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;

    const userQuery = `
        SELECT u.*, ui.image_path 
        FROM users u 
        LEFT JOIN users_images ui ON u.id = ui.users_id
        WHERE u.id = ?
    `;

    const socialNetworkQuery = `
        SELECT id, name 
        FROM social_network
    `;

    const userSocialLinksQuery = `
        SELECT usl.*, sn.name as social_network_name
        FROM user_social_links usl
        JOIN social_network sn ON usl.social_network_id = sn.id
        WHERE usl.user_id = ?
    `;

    db.query(userQuery, [userId], (err, userResults) => {
        if (err) {
            console.error('Erreur lors de la récupération des informations des utilisateurs:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des informations des utilisateurs' });
        }

        if (userResults.length === 0) {
            console.error('Utilisateur non trouvé');
            return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
        }

        const user = userResults[0];

        db.query(socialNetworkQuery, (err, socialNetworkResults) => {
            if (err) {
                console.error('Erreur lors de la récupération des réseaux sociaux:', err);
                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des réseaux sociaux' });
            }

            db.query(userSocialLinksQuery, [userId], (err, userSocialLinksResults) => {
                if (err) {
                    console.error('Erreur lors de la récupération des liens des réseaux sociaux:', err);
                    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des liens des réseaux sociaux' });
                }

                res.render('breederInformations', {
                    user: user,
                    socialNetworks: socialNetworkResults,
                    userSocialLinks: userSocialLinksResults,
                    currentPage: 'breeder'
                });
            });
        });
    });
});


// Route pour le téléchargement de la photo (avec base64)
router.post('/upload-photo', isAuthenticated, (req, res) => {
    const { userId, photo, fileName } = req.body;

    if (!photo || !userId || !fileName) {
        return res.status(400).json({ success: false, message: 'Données manquantes' });
    }

    const fileExtension = fileName.split('.').pop().toLowerCase();
    const allowedExtensions = ['png', 'svg'];
    
    if (!allowedExtensions.includes(fileExtension)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Format non autorisé ! Seuls les fichiers PNG et SVG sont acceptés.' 
        });
    }

    const mimeTypeMatch = photo.match(/^data:(image\/(?:png|svg\+xml));base64,/);
    
    if (!mimeTypeMatch) {
        return res.status(400).json({ 
            success: false, 
            message: 'Format d\'image invalide.' 
        });
    }

    const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const uniqueFileName = Date.now() + '.' + fileExtension;
    const filePath = path.join(process.cwd(), 'uploads', uniqueFileName);

    fs.writeFile(filePath, buffer, (err) => {
        if (err) {
            console.error('Erreur lors de l\'écriture du fichier:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de l\'écriture du fichier' });
        }

        const checkImageQuery = `SELECT image_path FROM users_images WHERE users_id = ?`;

        db.query(checkImageQuery, [userId], (err, result) => {
            if (err) {
                console.error('Erreur lors de la vérification de l\'image existante:', err);
                return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de l\'image existante' });
            }

            if (result.length > 0) {
                const oldImagePath = path.join(process.cwd(), 'uploads', result[0].image_path);
                fs.unlink(oldImagePath, (err) => {
                    if (err) {
                        console.error('Erreur lors de la suppression de l\'ancienne photo:', err);
                    }
                });

                const updateImageQuery = `UPDATE users_images SET image_path = ? WHERE users_id = ?`;

                db.query(updateImageQuery, [uniqueFileName, userId], (err, result) => {
                    if (err) {
                        console.error('Erreur lors de la mise à jour de l\'image:', err);
                        return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de l\'image' });
                    }

                    res.json({ success: true });
                });
            } else {
                const insertImageQuery = `INSERT INTO users_images (users_id, image_path) VALUES (?, ?)`;

                db.query(insertImageQuery, [userId, uniqueFileName], (err, result) => {
                    if (err) {
                        console.error('Erreur lors de l\'insertion de l\'image:', err);
                        return res.status(500).json({ success: false, message: 'Erreur lors de l\'insertion de l\'image' });
                    }

                    res.json({ success: true });
                });
            }
        });
    });
});


// mettre à jour les informations de l'éleveur
router.post('/update', isAuthenticated, upload.none(), (req, res) => {
    const { name, surname, kennel_name, email, siret_number, acaced_number, adresse, phone_number } = req.body;
    const userId = req.session.user.id;

    const updateBreederInfoQuery = `
        UPDATE users
        SET name = ?, surname = ?, kennel_name = ?, email = ?, siret_number = ?, acaced_number = ?, adresse = ?, phone_number = ?
        WHERE id = ?
    `;

    db.query(updateBreederInfoQuery, [name, surname, kennel_name, email, siret_number, acaced_number, adresse, phone_number, userId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la mise à jour des informations de l\'éleveur:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des informations de l\'éleveur' });
        }

        res.json({ success: true });
    });
});



// Route pour ajouter un lien de réseau social
router.post('/update-social-link', isAuthenticated, (req, res) => {
    const { social_network_id, social_media_link } = req.body;
    const userId = req.session.user.id;

    if (!social_network_id || !social_media_link || !userId) {
      console.error('Paramètres manquants');
      return res.status(400).send('Missing social media type, link, or user ID');
    }

    const checkQuery = 'SELECT * FROM user_social_links WHERE user_id = ? AND social_network_id = ?';
    db.query(checkQuery, [userId, social_network_id], (err, results) => {
        if (err) {
            console.error('Error checking social media link in the database:', err);
            return res.sendStatus(500);
        }

        if (results.length > 0) {
            const updateQuery = 'UPDATE user_social_links SET social_media_link = ? WHERE user_id = ? AND social_network_id = ?';
            db.query(updateQuery, [social_media_link, userId, social_network_id], (err, result) => {
                if (err) {
                    console.error('Error updating social media link in the database:', err);
                    return res.sendStatus(500);
                }
                return res.json({ success: true });
            });
        } else {
            const insertQuery = 'INSERT INTO user_social_links (user_id, social_network_id, social_media_link) VALUES (?, ?, ?)';
            db.query(insertQuery, [userId, social_network_id, social_media_link], (err, result) => {
                if (err) {
                    console.error('Error adding social media link to the database:', err);
                    return res.sendStatus(500);
                }
                return res.json({ success: true });
            });
        }
    });
});

module.exports = router;