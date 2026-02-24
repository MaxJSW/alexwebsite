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


// Route pour afficher la page d'informations
router.get('/', (req, res) => {
    const userId = 8;
    const queryKennelInfo = `
        SELECT 
            ki.id AS kennel_info_id,
            ki.titre,
            ki.description,
            ki.date_modification,
            ki.slug,
            ki.is_online,
            ki_img.image_path,
            ki_img.optimized_image_path,
            ki_img.balise_alt
        FROM kennel_informations ki
        LEFT JOIN kennel_images ki_img ON ki_img.kennel_infos_id = ki.id
        WHERE ki.user_id = ? AND ki.is_online = 1
    `;
 
    db.query(queryKennelInfo, [userId], (err, kennelInfo) => {
        if (err) {
            console.error('Erreur lors de la récupération des informations:', err);
            return res.redirect('/erreur');
        }
 
        res.render('informations', {
            kennelInfo: kennelInfo.map(info => ({
                titre: info.titre,
                description: info.description.substring(0, 230) + (info.description.length > 230 ? '...' : ''),
                dateModification: new Date(info.date_modification).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                }),
                slug: info.slug,
                image: {
                    path: info.optimized_image_path ? 
                        `/uploads/optimized/${info.optimized_image_path}` : 
                        `/uploads/${info.image_path}`,
                    alt: info.balise_alt
                }
            }))
        });
    });
 });


// Route pour afficher la page d'informations détaillées
router.get('/:slug', (req, res) => {
    const userId = 8;
    const slug = req.params.slug;
    const queryKennelInfo = `
        SELECT 
            ki.id AS kennel_info_id, 
            ki.titre, 
            ki.description, 
            ki.date_creation, 
            ki.date_modification, 
            ki.slug, 
            ki.user_id, 
            ki.is_online, 
            ki_img.image_path, 
            ki_img.optimized_image_path,  -- Chemin de l'image optimisée
            ki_img.balise_alt
        FROM 
            kennel_informations ki
        LEFT JOIN 
            kennel_images ki_img ON ki_img.kennel_infos_id = ki.id
        WHERE 
            ki.user_id = ? AND ki.slug = ? AND ki.is_online = 1  -- Filtrer par l'ID de l'utilisateur, le slug et vérifier si c'est en ligne
    `;
    const queryKennelParagraphs = `
        SELECT 
            kp.id, 
            kp.kennel_infos_id, 
            kp.title, 
            kp.content
        FROM 
            kennel_paragraphs kp
        WHERE 
            kp.kennel_infos_id = ?
    `;
    db.query(queryKennelInfo, [userId, slug], (err, kennelInfo) => {
        if (err) {
            console.error('Erreur lors de la récupération des informations de l\'élevage:', err);
            return res.redirect('/erreur');
        }

        if (kennelInfo.length === 0) {
            return res.status(404).send('Information d\'élevage non trouvée');
        }

        const kennelInfoId = kennelInfo[0].kennel_info_id;

        db.query(queryKennelParagraphs, [kennelInfoId], (err, kennelParagraphs) => {
            if (err) {
                console.error('Erreur lors de la récupération des paragraphes de l\'élevage:', err);
                return res.redirect('/erreur');
            }
            const imagePath = kennelInfo[0].optimized_image_path
                ? `/uploads/optimized/${kennelInfo[0].optimized_image_path}`
                : `/uploads/${kennelInfo[0].image_path}`;

            const isAdoptSection = slug === 'acquerir-un-chiot';

            res.render('informations_detail', {
                kennelInfo: kennelInfo[0],
                kennelParagraphs: kennelParagraphs,
                ogImage: imagePath,
                isAdoptSection
            });
        });
    });
});

module.exports = router;