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
    const userId = 10;

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

    const querySocialLinks = `
        SELECT 
            usl.social_media_link,
            sn.name AS network_name
        FROM user_social_links usl
        LEFT JOIN social_network sn ON usl.social_network_id = sn.id
        WHERE usl.user_id = ?
        AND usl.social_media_link IS NOT NULL
        AND usl.social_media_link != ''
    `;

    Promise.all([
        new Promise((resolve, reject) => {
            db.query(queryKennelInfo, [userId], (err, result) => {
                if (err) reject(err); else resolve(result);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(querySocialLinks, [userId], (err, result) => {
                if (err) reject(err); else resolve(result);
            });
        })
    ]).then(([kennelInfo, socialLinks]) => {

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
            })),
            socialLinks
        });

    }).catch(err => {
        console.error('Erreur:', err);
        res.redirect('/erreur');
    });
});

// Route pour afficher la page d'informations détaillées
router.get('/:slug', (req, res) => {
    const userId = 10;
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
            ki_img.optimized_image_path,
            ki_img.balise_alt
        FROM kennel_informations ki
        LEFT JOIN kennel_images ki_img ON ki_img.kennel_infos_id = ki.id
        WHERE ki.user_id = ? AND ki.slug = ? AND ki.is_online = 1
    `;

    const queryKennelParagraphs = `
        SELECT 
            kp.id, 
            kp.kennel_infos_id, 
            kp.title, 
            kp.content
        FROM kennel_paragraphs kp
        WHERE kp.kennel_infos_id = ?
    `;

    const querySocialLinks = `
        SELECT 
            usl.social_media_link,
            sn.name AS network_name
        FROM user_social_links usl
        LEFT JOIN social_network sn ON usl.social_network_id = sn.id
        WHERE usl.user_id = ?
        AND usl.social_media_link IS NOT NULL
        AND usl.social_media_link != ''
    `;

    // Première requête pour récupérer les infos de base
    db.query(queryKennelInfo, [userId, slug], (err, kennelInfo) => {
        if (err) {
            console.error('Erreur lors de la récupération des informations:', err);
            return res.redirect('/erreur');
        }

        if (kennelInfo.length === 0) {
            return res.status(404).redirect('/erreur');
        }

        const kennelInfoId = kennelInfo[0].kennel_info_id;

        // Promise.all pour les requêtes suivantes
        Promise.all([
            new Promise((resolve, reject) => {
                db.query(queryKennelParagraphs, [kennelInfoId], (err, result) => {
                    if (err) reject(err); else resolve(result);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(querySocialLinks, [userId], (err, result) => {
                    if (err) reject(err); else resolve(result);
                });
            })
        ]).then(([kennelParagraphs, socialLinks]) => {

            const imagePath = kennelInfo[0].optimized_image_path
                ? `/uploads/optimized/${kennelInfo[0].optimized_image_path}`
                : `/uploads/${kennelInfo[0].image_path}`;

            const isAdoptSection = slug === 'acquerir-un-chiot';

            res.render('informations_detail', {
                kennelInfo: kennelInfo[0],
                kennelParagraphs,
                ogImage: imagePath,
                isAdoptSection,
                socialLinks
            });

        }).catch(err => {
            console.error('Erreur Promise.all:', err);
            res.redirect('/erreur');
        });
    });
});

module.exports = router;