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

const upload = multer({
    storage: storage
});

router.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//  route principal pour la page chiens en retraites
router.get('/', (req, res) => {
    const userId = 10;
    const itemsPerPage = 8;
    const currentPage = parseInt(req.query.page) || 1;

    if (req.query.page === '0' || req.query.page === '1') {
        return res.redirect('/nos-retraites');
    }

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

    const countQuery = `
        SELECT COUNT(DISTINCT animals.id) AS total 
        FROM animals
        LEFT JOIN images ON images.animal_id = animals.id
        WHERE 
            animals.user_id = ? 
            AND animals.is_online = 1 
            AND animals.in_breeding = 1
            AND animals.retreat = 1
    `;

    const queryAnimals = `
        SELECT 
            animals.id,
            animals.name,
            animals.gender,
            animals.breed_type,
            animals.color,
            animals.eye_color,
            animals.slug,
            animals.retreat,
            breed_name.name AS breed_name,
            breed_name.slug AS breed_slug,
            register_name.name AS register_name,
            images.image_path,
            images.optimized_image_path,
            images.balise_alt
        FROM animals
        LEFT JOIN breed_name ON animals.breed_id = breed_name.id
        LEFT JOIN register_name ON animals.register_id = register_name.id
        LEFT JOIN images ON images.animal_id = animals.id
        WHERE 
            animals.user_id = ?
            AND animals.is_online = 1
            AND animals.in_breeding = 1
            AND animals.retreat = 1
            AND images.id = (
                SELECT MIN(id) 
                FROM images 
                WHERE images.animal_id = animals.id
            )
        ORDER BY animals.id DESC
        LIMIT ? OFFSET ?
    `;

    // Comptage d'abord
    db.query(countQuery, [userId], (err, countResult) => {
        if (err) {
            console.error('Erreur comptage:', err);
            return res.redirect('/erreur');
        }

        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (currentPage > totalPages && totalPages > 0) {
            return res.redirect(`/nos-retraites?page=${totalPages}`);
        }

        const offset = (currentPage - 1) * itemsPerPage;

        // Animaux + socialLinks en parallèle
        Promise.all([
            new Promise((resolve, reject) => {
                db.query(queryAnimals, [userId, itemsPerPage, offset], (err, result) => {
                    if (err) reject(err); else resolve(result);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(querySocialLinks, [userId], (err, result) => {
                    if (err) reject(err); else resolve(result);
                });
            })
        ]).then(([animals, socialLinks]) => {

            res.render('nos-retraites', {
                animals,
                currentPage,
                totalPages,
                totalItems,
                socialLinks
            });

        }).catch(err => {
            console.error('Erreur Promise.all:', err);
            res.redirect('/erreur');
        });
    });
});

module.exports = router;