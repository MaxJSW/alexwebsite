const path = require('path');
const fs = require('fs');
const express = require('express');
const router = express.Router();
const moment = require('moment');
require('moment/locale/fr');
const dotenv = require('dotenv');
const multer = require('multer');
const bodyParser = require('body-parser');

// Modules locaux
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

// get de la page addPuppys
const itemsPerPage = 6;


//  get principal de la page addPuppys
router.get('/', isAuthenticated, (req, res) => {
    const { page = 1, search = '' } = req.query;
    const userId = req.session.user.id;
 
    const queryAnimals = `
        SELECT a.id, a.name, a.in_breeding, a.gender, a.other_names, a.category, 
               a.breed_type, a.birth_date, a.color, a.coat_type, a.eye_color, 
               a.is_online, a.health_tests, a.description_animals, a.register_id, 
               a.father_id, a.mother_id, a.country_id, a.breed_id, a.user_id, 
               a.slug, pi.image_path_profile
        FROM animals a
        LEFT JOIN profile_images pi ON a.id = pi.animal_id
    `;
 
    let queryMarriages = `
        SELECT m.id, m.male_id, m.female_id, m.expected_puppies, 
               m.expected_birth_date, m.actual_birth_date, m.actual_male_puppies, 
               m.actual_female_puppies, m.marriages_status, m.is_online, 
               m.marriages_description, m.get_banner, mi.image_path
        FROM marriages m
        LEFT JOIN marriages_images mi ON m.id = mi.marriage_id
        WHERE m.user_id = ?
    `;
 
    let queryMarriagesCount = `
        SELECT COUNT(*) AS count
        FROM marriages m
        WHERE m.user_id = ?
    `;
 
    if (search) {
        queryMarriages += ` AND (m.male_id IN (SELECT id FROM animals WHERE name LIKE '%${search}%') 
                           OR m.female_id IN (SELECT id FROM animals WHERE name LIKE '%${search}%'))`;
        queryMarriagesCount += ` AND (m.male_id IN (SELECT id FROM animals WHERE name LIKE '%${search}%') 
                                OR m.female_id IN (SELECT id FROM animals WHERE name LIKE '%${search}%'))`;
    }
 
    queryMarriages += ' ORDER BY m.id DESC LIMIT ?, ?';
 
    db.query(queryAnimals, (err, animals) => {
        if (err) {
            console.error('Erreur lors de la récupération des animaux:', err);
            return res.status(500).send('Erreur lors de la récupération des animaux');
        }
 
        db.query(queryMarriagesCount, [userId], (err, countResult) => {
            if (err) {
                console.error('Erreur lors de la récupération du compte des mariages:', err);
                return res.status(500).send('Erreur lors de la récupération du compte des mariages');
            }
 
            const totalMarriages = countResult[0].count;
            const totalPages = Math.ceil(totalMarriages / itemsPerPage);
 
            db.query(queryMarriages, [userId, (page - 1) * itemsPerPage, itemsPerPage], (err, marriages) => {
                if (err) {
                    console.error('Erreur lors de la récupération des mariages:', err);
                    return res.status(500).send('Erreur lors de la récupération des mariages');
                }
 
                marriages.forEach(marriage => {
                    if (marriage.expected_birth_date) {
                        marriage.expected_birth_date = moment(marriage.expected_birth_date).format('DD MMMM YYYY');
                    }
                    if (marriage.actual_birth_date) {
                        marriage.actual_birth_date = moment(marriage.actual_birth_date).format('DD MMMM YYYY');
                    }
                });
 
                res.render('addPuppys', {
                    animals: animals,
                    marriages: marriages,
                    user: req.session.user,
                    kennel_name: req.session.kennel_name,
                    currentPage: parseInt(page),
                    totalPages: totalPages,
                    search: search,
                    currentPage: 'chiots'
                });
            });
        });
    });
 });


module.exports = router;