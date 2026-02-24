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

// fonction pour l'authentification
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.redirect('/admin/connect');
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        // Créer le dossier 'uploads' s'il n'existe pas
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
const publicDirectory = path.join(__dirname, './public');
router.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// route pour la page d'ajout d'un animal
router.get('/', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const error = req.query.error;

    if (!req.session.user) {
        return res.redirect('/admin/connect');
    }

    const queryRegisters = 'SELECT * FROM register_name WHERE user_id = ?';
    const queryAnimals = 'SELECT * FROM animals WHERE user_id = ?';
    const queryCountries = 'SELECT * FROM country_name WHERE user_id = ?';
    const queryFathers = 'SELECT * FROM father_table WHERE user_id = ?';
    const queryMothers = 'SELECT * FROM mother_table WHERE user_id = ?';
    const queryBreeds = 'SELECT * FROM breed_name WHERE user_id = ?';

    db.query(queryRegisters, [userId], (err, registers) => {
        if (err) {
            console.error('Erreur lors de la récupération des registres:', err);
            return res.status(500).send('Erreur lors de la récupération des registres');
        }

        db.query(queryAnimals, [userId], (err, animals) => {
            if (err) {
                console.error('Erreur lors de la récupération des animaux:', err);
                return res.status(500).send('Erreur lors de la récupération des animaux');
            }

            db.query(queryCountries, [userId], (err, countries) => {
                if (err) {
                    console.error('Erreur lors de la récupération des pays:', err);
                    return res.status(500).send('Erreur lors de la récupération des pays');
                }

                db.query(queryFathers, [userId], (err, fathers) => {
                    if (err) {
                        console.error('Erreur lors de la récupération des pères:', err);
                        return res.status(500).send('Erreur lors de la récupération des pères');
                    }

                    db.query(queryMothers, [userId], (err, mothers) => {
                        if (err) {
                            console.error('Erreur lors de la récupération des mères:', err);
                            return res.status(500).send('Erreur lors de la récupération des mères');
                        }

                        db.query(queryBreeds, [userId], (err, breeds) => { 
                            if (err) {
                                console.error('Erreur lors de la récupération des races:', err);
                                return res.status(500).send('Erreur lors de la récupération des races');
                            }

                            res.render('addAnimal', {
                                user: req.session.user,
                                userId: userId,
                                registers: registers,
                                animals: animals,
                                countries: countries,
                                fathers: fathers,
                                mothers: mothers,
                                breeds: breeds,
                                error: error,
                                kennel_name: req.session.kennel_name,
                                currentPage: 'addAnimal'
                            });
                        });
                    });
                });
            });
        });
    });
});



function generateSlug(name) {
    return name
        .toLowerCase()
        .normalize('NFD') 
        .replace(/[\u0300-\u036f]/g, '') 
        .replace(/[^a-z0-9]+/g, '-') 
        .replace(/(^-|-$)/g, '');
}

router.post('/', isAuthenticated, upload.single('profile_image'), (req, res) => {
    const {
        name,
        in_breeding,
        gender,
        other_names,
        category,
        color,
        coat_type,
        breed_type,
        birth_date,
        eye_color,
        is_online,
        health_tests,
        description_animals,
        register_id,
        father_id,
        mother_id,
        country_id,
        breed_id,
        user_id
    } = req.body;

    const slug = generateSlug(name);

    const checkQuery = 'SELECT COUNT(*) AS count FROM animals WHERE name = ?';
    db.query(checkQuery, [name], (err, results) => {
        if (err) {
            console.error('Erreur lors de la vérification du nom de l\'animal:', err);
            return res.status(500).send('Erreur lors de la vérification du nom de l\'animal');
        }

        const count = results[0].count;
        if (count > 0) {
            return res.status(400).send('Un animal avec ce nom existe déjà.');
        }

        const fatherId = father_id === 'undefined' || !father_id ? null : father_id;
        const motherId = mother_id === 'undefined' || !mother_id ? null : mother_id;

        const insertAnimalQuery = `
            INSERT INTO animals (
                name, in_breeding, gender, other_names, category,
                color, coat_type, breed_type, birth_date, eye_color, is_online, health_tests, description_animals,
                register_id, father_id, mother_id, country_id, breed_id, user_id, slug
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            name, in_breeding, gender, other_names, category,
            color, coat_type, breed_type, birth_date, eye_color, is_online, health_tests, description_animals,
            register_id, fatherId, motherId, country_id, breed_id, user_id, slug
        ];

        db.query(insertAnimalQuery, values, (err, result) => {
            if (err) {
                console.error('Erreur lors de l\'ajout de l\'animal:', err);
                return res.status(500).send('Erreur lors de l\'ajout de l\'animal');
            }

            const animalId = result.insertId;

            if (req.file) {
                const profile_image = req.file.filename;
                const insertImageQuery = 'INSERT INTO images (animal_id, image_path) VALUES (?, ?)';

                db.query(insertImageQuery, [animalId, profile_image], (err, result) => {
                    if (err) {
                        console.error('Erreur lors de l\'ajout de l\'image:', err);
                        return res.status(500).send('Erreur lors de l\'ajout de l\'image');
                    }
                    res.redirect(`/admin/addPhotos?animal_id=${animalId}&success=${encodeURIComponent(name + ' a été ajouté avec succès.')}`);
                });
            } else {
                res.redirect(`/admin/addPhotos?animal_id=${animalId}&success=${encodeURIComponent(name + ' a été ajouté avec succès.')}`);
            }
        });
    });
});


// route pour la fonction addCountry add country in form
router.post('/addCountry', isAuthenticated, (req, res) => {
    const { name, user_id } = req.body;
    const checkCountryQuery = 'SELECT id FROM country_name WHERE name = ?';
    const insertCountryQuery = 'INSERT INTO country_name (name, user_id) VALUES (?, ?)';

    // Vérifier si le pays existe déjà
    db.query(checkCountryQuery, [name], (err, results) => {
        if (err) {
            console.error('Erreur lors de la vérification du pays:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la vérification du pays' });
        }

        if (results.length) {
            // Si le pays existe déjà, renvoyer l'ID existant
            return res.json({ success: true, country_id: results[0].id });
        } else {
            // Si le pays n'existe pas, l'ajouter
            db.query(insertCountryQuery, [name, user_id], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'ajout du pays:', err);
                    return res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout du pays' });
                }

                const newCountryId = result.insertId;
                res.json({ success: true, country_id: newCountryId });
            });
        }
    });
});

// route pour la fonction addRegister add Register in form
router.post('/addRegister', isAuthenticated, (req, res) => {
    const { name, user_id } = req.body;
    const checkRegisterQuery = 'SELECT id FROM register_name WHERE name = ?';
    const insertRegisterQuery = 'INSERT INTO register_name (name, user_id) VALUES (?, ?)';

    // Vérifier si l'utilisateur existe dans la table `users`
    const userQuery = 'SELECT * FROM users WHERE id = ?';
    db.query(userQuery, [user_id], (err, results) => {
        if (err) {
            console.error('Erreur lors de la vérification de l\'utilisateur:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de l\'utilisateur' });
        }

        if (results.length === 0) {
            console.error('Utilisateur non trouvé:', user_id);
            return res.status(400).json({ success: false, message: 'Utilisateur non trouvé' });
        }

        // Vérifier si le registre existe déjà
        db.query(checkRegisterQuery, [name], (err, results) => {
            if (err) {
                console.error('Erreur lors de la vérification du registre:', err);
                return res.status(500).json({ success: false, message: 'Erreur lors de la vérification du registre' });
            }

            if (results.length) {
                // Si le registre existe déjà, renvoyer l'ID existant
                return res.json({ success: true, register_id: results[0].id });
            } else {
                // Si le registre n'existe pas, l'ajouter
                db.query(insertRegisterQuery, [name, user_id], (err, result) => {
                    if (err) {
                        console.error('Erreur lors de l\'ajout du registre:', err);
                        return res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout du registre' });
                    }

                    const newRegisterId = result.insertId;
                    res.json({ success: true, register_id: newRegisterId });
                });
            }
        });
    });
});


// route pour la fonction addNewFather add father in form
router.post('/addNewFather', isAuthenticated, (req, res) => {
    const { name } = req.body;
    const userId = req.session.user.id;
    
    const checkFatherQuery = 'SELECT id FROM father_table WHERE father_name = ? AND user_id = ?';
    const insertFatherQuery = 'INSERT INTO father_table (father_name, user_id) VALUES (?, ?)';

    // Vérifier si le père existe déjà
    db.query(checkFatherQuery, [name, userId], (err, results) => {
        if (err) {
            console.error('Erreur lors de la vérification du père:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la vérification du père' });
        }

        if (results.length) {
            // Si le père existe déjà, renvoyer l'ID existant
            return res.json({ success: true, father_id: results[0].id });
        } else {
            // Si le père n'existe pas, l'ajouter
            db.query(insertFatherQuery, [name, userId], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'ajout du père:', err);
                    return res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout du père' });
                }

                const newFatherId = result.insertId;
                res.json({ success: true, father_id: newFatherId });
            });
        }
    });
});


// route pour la fonction addNewMother add mother in form
router.post('/addNewMother', isAuthenticated, (req, res) => {
    const { name } = req.body;
    const userId = req.session.user.id;
    
    const checkMotherQuery = 'SELECT id FROM mother_table WHERE mother_name = ? AND user_id = ?';
    const insertMotherQuery = 'INSERT INTO mother_table (mother_name, user_id) VALUES (?, ?)';

    // Vérifier si la mère existe déjà
    db.query(checkMotherQuery, [name, userId], (err, results) => {
        if (err) {
            console.error('Erreur lors de la vérification de la mère:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de la mère' });
        }

        if (results.length) {
            // Si la mère existe déjà, renvoyer l'ID existant
            return res.json({ success: true, mother_id: results[0].id });
        } else {
            // Si la mère n'existe pas, l'ajouter
            db.query(insertMotherQuery, [name, userId], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'ajout de la mère:', err);
                    return res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout de la mère' });
                }

                const newMotherId = result.insertId;
                res.json({ success: true, mother_id: newMotherId });
            });
        }
    });
});

//route pour ajouter une ajouter une nouvelle race 
router.post('/addBreed', isAuthenticated, (req, res) => {
    const { name } = req.body;
    const checkBreedQuery = 'SELECT id FROM breed_name WHERE name = ?';
    const insertBreedQuery = 'INSERT INTO breed_name (name) VALUES (?)';

    // Vérifier si la race existe déjà
    db.query(checkBreedQuery, [name], (err, results) => {
        if (err) {
            console.error('Erreur lors de la vérification de la race:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de la race' });
        }

        if (results.length) {
            return res.json({ success: true, breed_id: results[0].id });
        } else {
            db.query(insertBreedQuery, [name], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'ajout de la race:', err);
                    return res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout de la race' });
                }

                const newBreedId = result.insertId;
                res.json({ success: true, breed_id: newBreedId });
            });
        }
    });
});

// route pour la fonction checkAnimalName vérifier le nom de l'animal
router.get('/checkAnimalName', isAuthenticated, (req, res) => {
    const name = req.query.name;
    const query = 'SELECT COUNT(*) AS count FROM animals WHERE name = ?';

    db.query(query, [name], (err, results) => {
        if (err) {
            console.error('Erreur lors de la vérification du nom de l\'animal:', err);
            return res.status(500).send('Erreur lors de la vérification du nom de l\'animal');
        }

        const count = results[0].count;
        res.json({ exists: count > 0 });
    });
});


module.exports = router;
