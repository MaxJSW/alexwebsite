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


// get pricnipal de la page dashboard
router.get('/', isAuthenticated, (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        console.error('User ID is not available in session.');
        res.status(500).send('User ID is not available in session.');
        return;
    }

    const userId = req.session.user.id;

    const sqlAnimals = 'SELECT COUNT(*) AS animalCount FROM animals WHERE user_id = ?';
    const sqlMarriages = 'SELECT COUNT(*) AS marriagesCount FROM marriages WHERE user_id = ?';
    const sqlPuppies = 'SELECT COUNT(*) AS puppiesCount FROM puppies WHERE user_id = ?';
    const sqlBlogs = 'SELECT COUNT(*) AS blogsCount FROM blog WHERE user_id = ?';
    const sqlBreedNames = 'SELECT COUNT(*) AS breedNamesCount FROM breed_name WHERE user_id = ?';
    const sqlKennelInformations = 'SELECT COUNT(*) AS sectionsInfoCount FROM kennel_informations WHERE user_id = ?';

    // Effectuer les six requêtes en parallèle
    db.query(sqlAnimals, [userId], (err, resultAnimals) => {
        if (err) {
            console.error('Error fetching animal data from the database:', err);
            res.status(500).send('Error fetching animal data from the database');
            return;
        }

        db.query(sqlMarriages, [userId], (err, resultMarriages) => {
            if (err) {
                console.error('Error fetching marriages data from the database:', err);
                res.status(500).send('Error fetching marriages data from the database');
                return;
            }

            db.query(sqlPuppies, [userId], (err, resultPuppies) => {
                if (err) {
                    console.error('Error fetching puppies data from the database:', err);
                    res.status(500).send('Error fetching puppies data from the database');
                    return;
                }

                db.query(sqlBlogs, [userId], (err, resultBlogs) => {
                    if (err) {
                        console.error('Error fetching blogs data from the database:', err);
                        res.status(500).send('Error fetching blogs data from the database');
                        return;
                    }

                    db.query(sqlBreedNames, [userId], (err, resultBreedNames) => {
                        if (err) {
                            console.error('Error fetching breed names data from the database:', err);
                            res.status(500).send('Error fetching breed names data from the database');
                            return;
                        }

                        db.query(sqlKennelInformations, [userId], (err, resultKennelInformations) => {
                            if (err) {
                                console.error('Error fetching kennel informations data from the database:', err);
                                res.status(500).send('Error fetching kennel informations data from the database');
                                return;
                            }

                            const animalCount = resultAnimals[0].animalCount;

                            const marriagesCount = resultMarriages[0].marriagesCount;

                            const puppiesCount = resultPuppies[0].puppiesCount;

                            const blogsCount = resultBlogs[0].blogsCount;

                            const breedNamesCount = resultBreedNames[0].breedNamesCount;

                            const sectionsInfoCount = resultKennelInformations[0].sectionsInfoCount;

                            // Ajoutez les résultats à req.session.user pour les rendre disponibles dans la vue
                            req.session.user.animalCount = animalCount;
                            req.session.user.marriagesCount = marriagesCount;
                            req.session.user.puppiesCount = puppiesCount;
                            req.session.user.blogsCount = blogsCount;
                            req.session.user.breedNamesCount = breedNamesCount;
                            req.session.user.sectionsInfoCount = sectionsInfoCount;

                            res.render('dashboard', {
                                user: req.session.user,
                                currentPage: 'dashboard'
                            });
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;