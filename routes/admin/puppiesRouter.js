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
const cron = require('node-cron');

// Modules locaux (vos propres fichiers)
const db = require('../db');
// const db2 = require('./db2');

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

router.use('/uploads', express.static(path.join(__dirname, './uploads')));

const calculateAge = (birthDate) => {
    const birth = new Date(birthDate);
    const now = new Date();
    
    const diffTime = Math.abs(now - birth);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const ageInMonths = Math.floor(diffDays / 30);
    const ageInDays = diffDays % 30;

    return {
        ageInMonths,
        ageInDays
    };
};


// Fonction pour mettre à jour le statut du chiot en fonction de son âge
function updatePuppySaleStatus() {
    const query = `
        UPDATE puppies 
        SET sale_status = CASE
            WHEN sale_status = 'available_for_reservation'
                AND DATEDIFF(CURRENT_DATE, puppy_birth_date) >= 60 THEN 'for_sale'
            ELSE sale_status
        END
        WHERE puppy_is_online = 1
    `;
 
    db.query(query, (err, result) => {
        if (err) {
            console.error('Erreur lors de la mise à jour des statuts des chiots:', err);
        } else {
            console.log('Statuts des chiots mis à jour:', result.affectedRows);
        }
    });
 }

// Appeler cette fonction régulièrement, par exemple avec un cron job
cron.schedule('0 0 * * *', updatePuppySaleStatus);


// get static puppy page
router.get('/:id', isAuthenticated, (req, res) => {
    const marriageId = req.params.id;

    const queryMarriages = `
        SELECT id, male_id, female_id, expected_puppies, expected_birth_date, actual_birth_date, actual_male_puppies, actual_female_puppies, marriages_status, is_online, marriages_description, get_banner
        FROM marriages
        WHERE id = ?
    `;

    const queryPuppies = `
    SELECT p.id, p.puppy_name, p.in_breeding, p.puppy_gender, p.puppy_other_names, p.puppy_category, p.puppy_breed_type, p.puppy_slug, p.puppy_birth_date, p.available_date, p.puppy_color, p.puppy_coat_type, p.puppy_eye_color, p.puppy_is_online, p.puppy_health_tests, p.puppy_description_animals, p.register_id, p.father_id, p.mother_id, p.country_id, c.name as country_name, p.breed_id, b.name as breed_name, p.user_id, p.marriage_id, p.status_kept, p.to_redirect, p.price,
        MAX(pi.image_path_puppies_profil) AS image_path_puppies_profil
    FROM puppies p
    LEFT JOIN puppies_profil_images pi ON p.id = pi.puppies_id
    LEFT JOIN country_name c ON p.country_id = c.id
    LEFT JOIN breed_name b ON p.breed_id = b.id
    WHERE p.marriage_id = ?
    GROUP BY p.id, p.puppy_name, p.in_breeding, p.puppy_gender, p.puppy_other_names, p.puppy_category, p.puppy_breed_type, p.puppy_slug, p.puppy_birth_date, p.available_date, p.puppy_color, p.puppy_coat_type, p.puppy_eye_color, p.puppy_is_online, p.puppy_health_tests, p.puppy_description_animals, p.register_id, p.father_id, p.mother_id, p.country_id, c.name, p.breed_id, b.name, p.user_id, p.marriage_id, p.status_kept, p.to_redirect, p.price
`;


    const queryAnimals = `
        SELECT id, name, category, breed_id
        FROM animals
        WHERE id IN (?, ?)
    `;

    const queryBreeds = `SELECT id, name FROM breed_name`;
    const queryCountries = `SELECT id, name FROM country_name`;
    const queryRegisters = `SELECT id, name FROM register_name`;
    const queryPuppyImages = `
        SELECT id, puppies_id, image_path, balise_title, balise_alt, alt_modified
        FROM puppies_images
        WHERE puppies_id IN (?)
    `;

    db.query(queryMarriages, [marriageId], (err, marriageResult) => {
        if (err) {
            console.error('Erreur lors de la récupération des informations de mariage:', err);
            return res.status(500).send('Erreur lors de la récupération des informations de mariage');
        }

        if (marriageResult.length === 0) {
            return res.status(404).send('Mariage non trouvé');
        }

        const marriage = marriageResult[0];

        db.query(queryAnimals, [marriage.male_id, marriage.female_id], (err, animalsResult) => {
            if (err) {
                console.error('Erreur lors de la récupération des informations des animaux:', err);
                return res.status(500).send('Erreur lors de la récupération des informations des animaux');
            }

            const male = animalsResult.find(animal => animal.id === marriage.male_id);
            const female = animalsResult.find(animal => animal.id === marriage.female_id);

            db.query(queryPuppies, [marriageId], (err, puppiesResult) => {
                if (err) {
                    console.error('Erreur lors de la récupération des informations de chiots:', err);
                    return res.status(500).send('Erreur lors de la récupération des informations de chiots');
                }

                const puppyIds = puppiesResult.map(puppy => puppy.id);

                const queries = [
                    new Promise((resolve, reject) => {
                        db.query(queryBreeds, (err, breedsResult) => {
                            if (err) return reject(err);
                            resolve(breedsResult);
                        });
                    }),
                    new Promise((resolve, reject) => {
                        db.query(queryCountries, (err, countriesResult) => {
                            if (err) return reject(err);
                            resolve(countriesResult);
                        });
                    }),
                    new Promise((resolve, reject) => {
                        db.query(queryRegisters, (err, registersResult) => {
                            if (err) return reject(err);
                            resolve(registersResult);
                        });
                    }),
                    new Promise((resolve, reject) => {
                        if (puppyIds.length > 0) {
                            db.query(queryPuppyImages, [puppyIds], (err, imagesResult) => {
                                if (err) return reject(err);
                                resolve(imagesResult);
                            });
                        } else {
                            resolve([]);
                        }
                    })
                ];

                Promise.all(queries)
                    .then(([breedsResult, countriesResult, registersResult, imagesResult]) => {
                        const imagesByPuppyId = imagesResult.reduce((acc, image) => {
                            if (!acc[image.puppies_id]) {
                                acc[image.puppies_id] = [];
                            }
                            acc[image.puppies_id].push(image);
                            return acc;
                        }, {});

                        const formattedPuppies = puppiesResult.map(puppy => {
                            const age = calculateAge(puppy.puppy_birth_date);
                            return {
                                ...puppy,
                                ageInMonths: age.ageInMonths,
                                ageInDays: age.ageInDays,
                                father_name: male ? male.name : 'Inconnu',
                                mother_name: female ? female.name : 'Inconnue',
                                father_category: male ? male.category : 'Inconnu',
                                mother_category: female ? female.category : 'Inconnu',
                                country_name: puppy.country_name,
                                image_path_puppies_profil: puppy.image_path_puppies_profil,
                                puppy_health_tests: puppy.puppy_health_tests,
                                puppy_description_animals: puppy.puppy_description_animals,
                                breed_name: puppy.breed_name,
                                images: imagesByPuppyId[puppy.id] || []
                            };
                        });

                        const isAnyPuppyOnline = formattedPuppies.some(puppy => puppy.puppy_is_online === 1);
                        const malePuppies = formattedPuppies.filter(puppy => puppy.puppy_gender === 'Mâle');
                        const femalePuppies = formattedPuppies.filter(puppy => puppy.puppy_gender === 'Femelle');

                        // Vérification des nombres de chiots mâles et femelles
                        const actualMalePuppies = marriage.actual_male_puppies;
                        const actualFemalePuppies = marriage.actual_female_puppies;

                        const correctNumberOfMalePuppies = malePuppies.length === actualMalePuppies;
                        const correctNumberOfFemalePuppies = femalePuppies.length === actualFemalePuppies;

                        if (!correctNumberOfMalePuppies || !correctNumberOfFemalePuppies) {
                            return res.status(400).send('Le nombre de chiots ne correspond pas aux données de la base de données');
                        }

                        res.render('puppies', {
                            user: req.session.user,
                            marriage: marriage,
                            puppies: formattedPuppies,
                            puppy: formattedPuppies.length > 0 ? formattedPuppies[0] : null,
                            male: malePuppies,
                            female: femalePuppies,
                            breeds: breedsResult,
                            countries: countriesResult,
                            registers: registersResult,
                            images: imagesResult,
                            mother: female,
                            isAnyPuppyOnline: isAnyPuppyOnline,
                            correctNumberOfMalePuppies: correctNumberOfMalePuppies,
                            correctNumberOfFemalePuppies: correctNumberOfFemalePuppies,
                            currentPage: 'chiots'
                        });
                    })
                    .catch(err => {
                        console.error('Erreur lors de la récupération des informations:', err);
                        res.status(500).send('Erreur lors de la récupération des informations');
                    });
            });
        });
    });
});

// get dynamic puppy page
router.get('/:id/puppyProfile/:puppyId', isAuthenticated, (req, res) => {
    const puppyId = req.params.puppyId;
    const marriageId = req.params.id;

       const queryPuppy = `
        SELECT p.id, p.puppy_name, p.in_breeding, p.puppy_gender, p.puppy_other_names, p.puppy_category, p.puppy_breed_type, p.puppy_slug, p.puppy_birth_date, p.available_date ,p.sale_status, p.sale_purpose, p.puppy_color, p.puppy_coat_type, p.puppy_eye_color, p.puppy_is_online, p.puppy_health_tests, p.puppy_description_animals, p.register_id, p.father_id, p.mother_id, p.country_id, c.name as country_name, p.breed_id, b.name as breed_name, p.user_id, p.marriage_id, p.status_kept, p.to_redirect, p.price,
            m.id as marriage_id, m.male_id, m.female_id, m.expected_puppies, m.expected_birth_date, m.actual_birth_date, m.actual_male_puppies, m.actual_female_puppies, m.marriages_status, m.is_online as marriage_is_online, m.marriages_description, m.get_banner,
            MAX(pi.image_path_puppies_profil) AS image_path_puppies_profil
        FROM puppies p
        LEFT JOIN marriages m ON p.marriage_id = m.id
        LEFT JOIN puppies_profil_images pi ON p.id = pi.puppies_id
        LEFT JOIN country_name c ON p.country_id = c.id
        LEFT JOIN breed_name b ON p.breed_id = b.id
        WHERE p.id = ? AND p.marriage_id = ?
        GROUP BY p.id, p.puppy_name, p.in_breeding, p.puppy_gender, p.puppy_other_names, p.puppy_category, p.puppy_breed_type, p.puppy_slug, p.puppy_birth_date, p.available_date, p.puppy_color, p.puppy_coat_type, p.puppy_eye_color, p.puppy_is_online, p.puppy_health_tests, p.puppy_description_animals, p.register_id, p.father_id, p.mother_id, p.country_id, c.name, p.breed_id, b.name, p.user_id, p.marriage_id, p.status_kept, p.to_redirect, p.price,
                 m.id, m.male_id, m.female_id, m.expected_puppies, m.expected_birth_date, m.actual_birth_date, m.actual_male_puppies, m.actual_female_puppies, m.marriages_status, m.is_online, m.marriages_description, m.get_banner
    `;


    const queryAnimals = `
        SELECT id, name, category, breed_id
        FROM animals
        WHERE id IN (?, ?)
    `;

    const queryAllPuppies = `
        SELECT p.id, p.puppy_name, p.puppy_gender
        FROM puppies p
        WHERE p.marriage_id = ?
    `;

    const queryBreeds = `SELECT id, name FROM breed_name`;
    const queryCountries = `SELECT id, name FROM country_name`;
    const queryRegisters = `SELECT id, name FROM register_name`;
    const queryPuppyImages = `
        SELECT id, puppies_id, image_path, balise_title, balise_alt, alt_modified
        FROM puppies_images
        WHERE puppies_id = ?
    `;

    db.query(queryPuppy, [puppyId, marriageId], (err, puppyResult) => {
        if (err) {
            console.error('Erreur lors de la récupération des informations du chiot:', err);
            return res.status(500).send('Erreur lors de la récupération des informations du chiot');
        }

        if (puppyResult.length === 0) {
            return res.status(404).send('Chiot non trouvé');
        }

        const puppy = puppyResult[0];

        db.query(queryAnimals, [puppy.father_id, puppy.mother_id], (err, animalsResult) => {
            if (err) {
                console.error('Erreur lors de la récupération des informations des animaux:', err);
                return res.status(500).send('Erreur lors de la récupération des informations des animaux');
            }

            const male = animalsResult.find(animal => animal.id === puppy.father_id);
            const female = animalsResult.find(animal => animal.id === puppy.mother_id);

            db.query(queryAllPuppies, [marriageId], (err, allPuppiesResult) => {
                if (err) {
                    console.error('Erreur lors de la récupération de tous les chiots:', err);
                    return res.status(500).send('Erreur lors de la récupération de tous les chiots');
                }

                let malePuppies = allPuppiesResult.filter(p => p.puppy_gender === 'Mâle');
                let femalePuppies = allPuppiesResult.filter(p => p.puppy_gender === 'Femelle');

                const actualMalePuppies = puppy.actual_male_puppies;
                const actualFemalePuppies = puppy.actual_female_puppies;

                if (malePuppies.length !== actualMalePuppies || femalePuppies.length !== actualFemalePuppies) {
                    malePuppies = [];
                    femalePuppies = [];
                }

                const age = calculateAge(puppy.puppy_birth_date);

                db.query(queryBreeds, (err, breedsResult) => {
                    if (err) {
                        console.error('Erreur lors de la récupération des races:', err);
                        return res.status(500).send('Erreur lors de la récupération des races');
                    }

                    db.query(queryCountries, (err, countriesResult) => {
                        if (err) {
                            console.error('Erreur lors de la récupération des pays:', err);
                            return res.status(500).send('Erreur lors de la récupération des pays');
                        }

                        db.query(queryRegisters, (err, registersResult) => {
                            if (err) {
                                console.error('Erreur lors de la récupération des registres:', err);
                                return res.status(500).send('Erreur lors de la récupération des registres');
                            }

                            db.query(queryPuppyImages, [puppyId], (err, imagesResult) => {
                                if (err) {
                                    console.error('Erreur lors de la récupération des images des chiots:', err);
                                    return res.status(500).send('Erreur lors de la récupération des images des chiots');
                                }

                                const isPuppyOnline = puppy.puppy_is_online === 1;

                                res.render('./partials/puppyProfile', {
                                    puppy: {
                                        ...puppy,
                                        formatted_puppy_birth_date: moment(puppy.puppy_birth_date).format('YYYY-MM-DD'),
                                        formatted_available_date: moment(puppy.available_date).format('YYYY-MM-DD'),
                                        ageInMonths: age.ageInMonths,
                                        ageInDays: age.ageInDays,
                                        father_name: male ? male.name : 'Inconnu',
                                        mother_name: female ? female.name : 'Inconnue',
                                        father_category: male ? male.category : 'Inconnu',
                                        mother_category: female ? female.category : 'Inconnu',
                                        country_name: puppy.country_name,
                                        image_path_puppies_profil: puppy.image_path_puppies_profil,
                                        puppy_health_tests: puppy.puppy_health_tests,
                                        puppy_description_animals: puppy.puppy_description_animals,
                                        breed_name: puppy.breed_name,
                                        mother_breed_id: female.breed_id,
                                        sale_status: puppy.sale_status,
                                    },
                                    marriage: {
                                        id: puppy.marriage_id,
                                        male_id: puppy.male_id,
                                        female_id: puppy.female_id,
                                        expected_puppies: puppy.expected_puppies,
                                        expected_birth_date: puppy.expected_birth_date,
                                        actual_birth_date: puppy.actual_birth_date,
                                        actual_male_puppies: puppy.actual_male_puppies,
                                        actual_female_puppies: puppy.actual_female_puppies,
                                        marriages_status: puppy.marriages_status,
                                        is_online: puppy.marriage_is_online,
                                        marriages_description: puppy.marriages_description,
                                        get_banner: puppy.get_banner
                                    },
                                    breeds: breedsResult,
                                    countries: countriesResult,
                                    registers: registersResult,
                                    images: imagesResult,
                                    mother: female,
                                    isPuppyOnline: isPuppyOnline,
                                    male: malePuppies,
                                    female: femalePuppies
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// router poost pour la description des images des chiots 
router.post('/:marriageId/puppyDescription/:puppyId', isAuthenticated, (req, res) => {
    const marriageId = req.params.marriageId;
    const puppyId = req.params.puppyId;

    const { puppy_description_animals, puppy_health_tests } = req.body;

    const updatePuppyTextQuery = `
        UPDATE puppies
        SET puppy_description_animals = ?,
            puppy_health_tests = ?
        WHERE id = ?
    `;

    db.query(updatePuppyTextQuery, [puppy_description_animals, puppy_health_tests, puppyId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la mise à jour des textes du chiot:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des textes du chiot' });
        }

        const getPuppyQuery = 'SELECT * FROM puppies WHERE id = ?';
        db.query(getPuppyQuery, [puppyId], (err, puppies) => {
            if (err) {
                console.error('Erreur lors de la récupération des données du chiot:', err);
                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des données du chiot' });
            }

            const puppy = puppies[0];
            const motherId = puppy.mother_id;
            const fatherId = puppy.father_id;

            const getMarriageQuery = 'SELECT * FROM marriages WHERE id = ?';
            db.query(getMarriageQuery, [marriageId], (err, marriages) => {
                if (err) {
                    console.error('Erreur lors de la récupération des données du mariage:', err);
                    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des données du mariage' });
                }

                const marriage = marriages[0];

                const getParentQuery = `
                    SELECT p.id, p.name, p.category, p.breed_id
                    FROM animals p
                    WHERE p.id IN (?, ?)
                `;
                db.query(getParentQuery, [motherId, fatherId], (err, parents) => {
                    if (err) {
                        console.error('Erreur lors de la récupération des données des parents:', err);
                        return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des données des parents' });
                    }

                    const mother = parents.find(parent => parent.id === motherId);
                    const father = parents.find(parent => parent.id === fatherId);

                    const formattedPuppyBirthDate = moment(puppy.puppy_birth_date).format('DD/MM/YYYY');
                    const formattedAvailableDate = moment(puppy.available_date).format('DD/MM/YYYY');
                    const age = {
                        ageInMonths: moment().diff(puppy.puppy_birth_date, 'months'),
                        ageInDays: moment().diff(puppy.puppy_birth_date, 'days')
                    };

                    const getBreedsQuery = 'SELECT * FROM breed_name';
                    const getCountriesQuery = 'SELECT * FROM country_name';
                    const getRegistersQuery = 'SELECT * FROM register_name';
                    const getImagesQuery = 'SELECT id, puppies_id, image_path, balise_title, balise_alt, alt_modified FROM puppies_images WHERE puppies_id = ?';

                    db.query(getBreedsQuery, (err, breedsResult) => {
                        if (err) {
                            console.error('Erreur lors de la récupération des races:', err);
                            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des races' });
                        }

                        db.query(getCountriesQuery, (err, countriesResult) => {
                            if (err) {
                                console.error('Erreur lors de la récupération des pays:', err);
                                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des pays' });
                            }

                            db.query(getRegistersQuery, (err, registersResult) => {
                                if (err) {
                                    console.error('Erreur lors de la récupération des registres:', err);
                                    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des registres' });
                                }

                                db.query(getImagesQuery, [puppyId], (err, imagesResult) => {
                                    if (err) {
                                        console.error('Erreur lors de la récupération des images:', err);
                                        return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des images' });
                                    }

                                    const isPuppyOnline = puppy.puppy_is_online === 1;

                                    res.render('./partials/puppyProfile', {
                                        puppy: {
                                            ...puppy,
                                            formatted_puppy_birth_date: moment(puppy.puppy_birth_date).format('YYYY-MM-DD'),
                                            formatted_available_date: moment(puppy.available_date).format('YYYY-MM-DD'),
                                            ageInMonths: age.ageInMonths,
                                            ageInDays: age.ageInDays,
                                            father_name: father ? father.name : 'Inconnu',
                                            mother_name: mother ? mother.name : 'Inconnue',
                                            father_category: father ? father.category : 'Inconnu',
                                            mother_category: mother ? mother.category : 'Inconnu',
                                            image_path_puppies_profil: puppy.image_path_puppies_profil,
                                            puppy_health_tests: puppy.puppy_health_tests,
                                            puppy_description_animals: puppy.puppy_description_animals,
                                            mother_breed_id: mother ? mother.breed_id : 'Inconnu' // Ajoutez cette ligne pour passer l'ID de la race de la mère
                                        },
                                        marriage: {
                                            id: marriage.id,
                                            male_id: marriage.male_id,
                                            female_id: marriage.female_id,
                                            expected_puppies: marriage.expected_puppies,
                                            expected_birth_date: marriage.expected_birth_date,
                                            actual_birth_date: marriage.actual_birth_date,
                                            actual_male_puppies: marriage.actual_male_puppies,
                                            actual_female_puppies: marriage.actual_female_puppies,
                                            marriages_status: marriage.marriages_status,
                                            is_online: marriage.is_online,
                                            marriages_description: marriage.marriages_description,
                                            get_banner: marriage.get_banner
                                        },
                                        breeds: breedsResult,
                                        countries: countriesResult,
                                        registers: registersResult,
                                        images: imagesResult,
                                        mother: mother,
                                        isPuppyOnline: isPuppyOnline
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});


// post pour le formulaire de mise à jour des informations du chiot
router.post('/:marriageId/puppyProfile/:puppyId', isAuthenticated, (req, res) => {
    const marriageId = req.params.marriageId;
    const puppyId = req.params.puppyId;

    const { puppy_name, sale_status, puppy_other_names, sale_purpose, puppy_color, puppy_coat_type, breed_id, puppy_slug, puppy_breed_type, puppy_eye_color, country_id, register_id, puppy_price, in_breeding } = req.body;

    const updatePuppyQuery = `
        UPDATE puppies
        SET puppy_name = ?, sale_status = ?, puppy_other_names = ?, sale_purpose = ?, puppy_color = ?, puppy_coat_type = ?, breed_id = ?, puppy_slug = ?, puppy_breed_type = ?, puppy_eye_color = ?, country_id = ?, register_id = ?, price = ?, in_breeding = ?
        WHERE id = ?
    `;

    const queryPuppy = `
        SELECT p.*, 
               c.name as country_name, 
               b.name as breed_name, 
               m.male_id, m.female_id, m.expected_puppies, m.expected_birth_date, m.actual_birth_date, 
               m.actual_male_puppies, m.actual_female_puppies, m.marriages_status, m.is_online as marriage_is_online, 
               m.marriages_description, m.get_banner, 
               pi.image_path_puppies_profil
        FROM puppies p
        LEFT JOIN marriages m ON p.marriage_id = m.id
        LEFT JOIN puppies_profil_images pi ON p.id = pi.puppies_id
        LEFT JOIN country_name c ON p.country_id = c.id
        LEFT JOIN breed_name b ON p.breed_id = b.id
        WHERE p.id = ? AND p.marriage_id = ?
    `;

    const queryAnimals = `
        SELECT id, name, category, breed_id
        FROM animals
        WHERE id IN (?, ?)
    `;

    const queryBreeds = `SELECT id, name FROM breed_name`;
    const queryCountries = `SELECT id, name FROM country_name`;
    const queryRegisters = `SELECT id, name FROM register_name`;
    const queryPuppyImages = `SELECT id, puppies_id, image_path, balise_title, balise_alt, alt_modified FROM puppies_images WHERE puppies_id = ?`;

    db.query(updatePuppyQuery, [puppy_name, sale_status, puppy_other_names, sale_purpose, puppy_color, puppy_coat_type, breed_id, puppy_slug, puppy_breed_type, puppy_eye_color, country_id, register_id, puppy_price, in_breeding, puppyId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la mise à jour du chiot:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du chiot' });
        }

        db.query(queryPuppy, [puppyId, marriageId], (err, puppyResult) => {
            if (err) {
                console.error('Erreur lors de la récupération des informations du chiot:', err);
                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des informations du chiot' });
            }

            if (puppyResult.length === 0) {
                return res.status(404).send('Chiot non trouvé');
            }

            const puppy = puppyResult[0];
            const motherId = puppy.mother_id;
            const fatherId = puppy.father_id;

            db.query(queryAnimals, [fatherId, motherId], (err, animalsResult) => {
                if (err) {
                    console.error('Erreur lors de la récupération des informations des animaux:', err);
                    return res.status(500).send('Erreur lors de la récupération des informations des animaux');
                }

                const male = animalsResult.find(animal => animal.id === fatherId);
                const female = animalsResult.find(animal => animal.id === motherId);

                const age = calculateAge(puppy.puppy_birth_date);
                const adjustedBirthDate = moment(puppy.puppy_birth_date).format('YYYY-MM-DD');
                const adjustedAvailableDate = moment(puppy.available_date).format('YYYY-MM-DD');

                db.query(queryBreeds, (err, breedsResult) => {
                    if (err) {
                        console.error('Erreur lors de la récupération des races:', err);
                        return res.status(500).send('Erreur lors de la récupération des races');
                    }

                    db.query(queryCountries, (err, countriesResult) => {
                        if (err) {
                            console.error('Erreur lors de la récupération des pays:', err);
                            return res.status(500).send('Erreur lors de la récupération des pays');
                        }

                        db.query(queryRegisters, (err, registersResult) => {
                            if (err) {
                                console.error('Erreur lors de la récupération des registres:', err);
                                return res.status(500).send('Erreur lors de la récupération des registres');
                            }

                            const getImagesQuery = `SELECT id, puppies_id, image_path, balise_title, balise_alt, alt_modified FROM puppies_images WHERE puppies_id = ?`;
                            db.query(getImagesQuery, [puppyId], (err, imagesResult) => {
                                if (err) {
                                    console.error('Erreur lors de la récupération des images:', err);
                                    return res.status(500).send('Erreur lors de la récupération des images');
                                }

                                const isPuppyOnline = puppy.puppy_is_online === 1;

                                res.render('./partials/puppyProfile', {
                                    puppy: {
                                        ...puppy,
                                        formatted_puppy_birth_date: adjustedBirthDate,
                                        formatted_available_date: adjustedAvailableDate,
                                        ageInMonths: age.ageInMonths,
                                        ageInDays: age.ageInDays,
                                        father_name: male ? male.name : 'Inconnu',
                                        mother_name: female ? female.name : 'Inconnue',
                                        father_category: male ? male.category : 'Inconnu',
                                        mother_category: female ? female.category : 'Inconnue',
                                        country_name: puppy.country_name,
                                        image_path_puppies_profil: puppy.image_path_puppies_profil,
                                        puppy_health_tests: puppy.puppy_health_tests,
                                        puppy_description_animals: puppy.puppy_description_animals,
                                        breed_name: puppy.breed_name,
                                        mother_breed_id: female ? female.breed_id : 'Inconnu'
                                    },
                                    marriage: {
                                        id: puppy.marriage_id,
                                        male_id: puppy.male_id,
                                        female_id: puppy.female_id,
                                        expected_puppies: puppy.expected_puppies,
                                        expected_birth_date: puppy.expected_birth_date,
                                        actual_birth_date: puppy.actual_birth_date,
                                        actual_male_puppies: puppy.actual_male_puppies,
                                        actual_female_puppies: puppy.actual_female_puppies,
                                        marriages_status: puppy.marriages_status,
                                        is_online: puppy.marriage_is_online,
                                        marriages_description: puppy.marriages_description,
                                        get_banner: puppy.get_banner
                                    },
                                    breeds: breedsResult,
                                    countries: countriesResult,
                                    registers: registersResult,
                                    images: imagesResult,
                                    mother: female,
                                    isPuppyOnline: isPuppyOnline
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// router post pour l'ajout ou le remplacement de la photo de profil du chiot
router.post('/:marriageId/upload-profile-image/:puppyId', upload.single('profileImage'), async (req, res) => {
    try {
        const puppyId = req.params.puppyId;
        const imagePath = req.file.filename;
        const marriageId = req.params.marriageId;

        const querySelectImage = `
            SELECT image_path_puppies_profil
            FROM puppies_profil_images
            WHERE puppies_id = ?
        `;
        
        db.query(querySelectImage, [puppyId], async (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ error: 'Erreur lors de la vérification de l\'image existante.' });
            }

            if (results.length > 0) {
                const existingImagePath = results[0].image_path_puppies_profil;
                const existingImageFullPath = path.join(__dirname, '../uploads', existingImagePath);
                
                // Supprimez l'ancienne image de profil si elle existe
                if (fs.existsSync(existingImageFullPath)) {
                    fs.unlinkSync(existingImageFullPath);
                }

                // Mettre à jour l'image existante
                const queryUpdateImage = `
                    UPDATE puppies_profil_images
                    SET image_path_puppies_profil = ?
                    WHERE puppies_id = ?
                `;
                db.query(queryUpdateImage, [imagePath, puppyId], (error) => {
                    if (error) {
                        console.error(error);
                        return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'image.' });
                    }

                    res.json({ imagePath: `/uploads/${imagePath}` });
                });
            } else {
                // Insérez la nouvelle image dans la table puppies_profil_images
                const queryInsertImage = `
                    INSERT INTO puppies_profil_images (puppies_id, image_path_puppies_profil)
                    VALUES (?, ?)
                `;
                db.query(queryInsertImage, [puppyId, imagePath], (error) => {
                    if (error) {
                        console.error(error);
                        return res.status(500).json({ error: 'Erreur lors de l\'insertion de l\'image.' });
                    }

                    res.json({ imagePath: `/uploads/${imagePath}` });
                });
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors du téléchargement de l\'image.' });
    }
});


// Route pour supprimer la photo de profil d'un chiot
router.post('/:puppyId/delete-profile-image', async (req, res) => {
    const puppyId = req.params.puppyId;

    const querySelectImage = `
        SELECT image_path_puppies_profil
        FROM puppies_profil_images
        WHERE puppies_id = ?
    `;

    db.query(querySelectImage, [puppyId], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erreur lors de la récupération de l\'image de profil.' });
        }

        if (results.length > 0) {
            const imagePath = results[0].image_path_puppies_profil;
            const imageFullPath = path.join(__dirname, '../uploads', imagePath);

            if (fs.existsSync(imageFullPath)) {
                fs.unlinkSync(imageFullPath);
            }

            const queryDeleteImage = `
                DELETE FROM puppies_profil_images
                WHERE puppies_id = ?
            `;
            db.query(queryDeleteImage, [puppyId], (error) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ error: 'Erreur lors de la suppression de l\'image de profil de la base de données.' });
                }

                res.json({ message: 'La photo de profil a été supprimée avec succès.' });
            });
        } else {
            res.status(404).json({ error: 'Aucune image de profil trouvée pour ce chiot.' });
        }
    });
});


//  pouter post avec un tri effectué sur le renvoi des photos dans le select
router.post('/:marriageId/uploadPuppyPhotos/:puppyId', isAuthenticated, upload.array('photos', 10), (req, res) => {
    const marriageId = req.params.marriageId;
    const puppyId = req.params.puppyId;
    const photos = req.files;

    if (!photos || photos.length === 0) {
        return res.status(400).json({ success: false, message: 'Aucun fichier téléchargé.' });
    }
    const photoData = photos.map(file => [puppyId, file.filename]);
    const insertPhotosQuery = `
        INSERT INTO puppies_images (puppies_id, image_path)
        VALUES ?
    `;
    db.query(insertPhotosQuery, [photoData], (error, result) => {
        if (error) {
            console.error('Erreur lors de l\'insertion des photos:', error);
            return res.status(500).json({ success: false, message: 'Erreur lors de l\'insertion des photos.' });
        }

        const firstInsertedId = result.insertId;

        const selectNewPhotosQuery = `
            SELECT * FROM puppies_images 
            WHERE puppies_id = ? AND id >= ?
        `;

        db.query(selectNewPhotosQuery, [puppyId, firstInsertedId], (error, photos) => {
            if (error) {
                console.error('Erreur lors de la récupération des photos:', error);
                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des photos.' });
            }
            res.json({ photos });
        });
    });
});


// fonction pour la suppression des images des chiots
router.post('/:puppyId/delete-photo/:photoId', async (req, res) => {
    const puppyId = req.params.puppyId;
    const photoId = req.params.photoId;

    const querySelectImage = `
        SELECT image_path
        FROM puppies_images
        WHERE puppies_id = ? AND id = ?
    `;
    db.query(querySelectImage, [puppyId, photoId], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erreur lors de la récupération de l\'image.' });
        }

        if (results.length > 0) {
            const imagePath = results[0].image_path;
            const imageFullPath = path.join(__dirname, '../uploads', imagePath);

            if (fs.existsSync(imageFullPath)) {
                fs.unlinkSync(imageFullPath);
            }

            const queryDeleteImage = `
                DELETE FROM puppies_images
                WHERE puppies_id = ? AND id = ?
            `;
            db.query(queryDeleteImage, [puppyId, photoId], (error) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ error: 'Erreur lors de la suppression de l\'image de la base de données.' });
                }
                res.json({ message: 'La photo a été supprimée avec succès.' });
            });
        } else {
            res.status(404).json({ error: 'Aucune image trouvée pour ce chiot.' });
        }
    });
});


// Route POST pour activer/désactiver le chiot en ligne
router.post('/:id/toggleOnline', async (req, res) => {
    const puppyId = req.params.id;
    const { isOnline } = req.body;

    try {
        const updateQuery = `
            UPDATE puppies
            SET puppy_is_online = ?
            WHERE id = ?
        `;
        await db.query(updateQuery, [isOnline ? 1 : 0, puppyId]);
        res.status(200).send('Statut en ligne du chiot mis à jour avec succès');
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut en ligne du chiot:', error);
        res.status(500).send('Erreur lors de la mise à jour du statut en ligne du chiot');
    }
});


// route pour envoyer la balise alt et le titre de l'image
router.post('/:marriageId/imagesDescription/:puppyId', upload.none(), isAuthenticated, (req, res) => {
    const { marriageId, puppyId } = req.params;
    const { imageId, balise_alt, balise_title } = req.body;

    if (!imageId || !balise_alt || !balise_title) {
        return res.status(400).json({ success: false, message: 'Paramètres manquants' });
    }
    const updateQuery = `
        UPDATE puppies_images 
        SET balise_alt = ?, balise_title = ?, alt_modified = 1
        WHERE id = ?
    `;
    db.query(updateQuery, [balise_alt, balise_title, imageId], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la balise alt et du titre' });
        }
        const getPuppyQuery = 'SELECT * FROM puppies WHERE id = ?';
        db.query(getPuppyQuery, [puppyId], (err, puppies) => {
            if (err) {
                console.error('Erreur lors de la récupération des données du chiot:', err);
                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des données du chiot' });
            }

            const puppy = puppies[0];
            const motherId = puppy.mother_id;
            const fatherId = puppy.father_id;

            const getMarriageQuery = 'SELECT * FROM marriages WHERE id = ?';
            db.query(getMarriageQuery, [marriageId], (err, marriages) => {
                if (err) {
                    console.error('Erreur lors de la récupération des données du mariage:', err);
                    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des données du mariage' });
                }

                const marriage = marriages[0];

                const getParentQuery = `
                    SELECT p.id, p.name, p.category, p.breed_id
                    FROM animals p
                    WHERE p.id IN (?, ?)
                `;
                db.query(getParentQuery, [motherId, fatherId], (err, parents) => {
                    if (err) {
                        console.error('Erreur lors de la récupération des données des parents:', err);
                        return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des données des parents' });
                    }

                    const mother = parents.find(parent => parent.id === motherId);
                    const father = parents.find(parent => parent.id === fatherId);

                    const age = {
                        ageInMonths: moment().diff(puppy.puppy_birth_date, 'months'),
                        ageInDays: moment().diff(puppy.puppy_birth_date, 'days')
                    };

                    const getBreedsQuery = 'SELECT * FROM breed_name';
                    const getCountriesQuery = 'SELECT * FROM country_name';
                    const getRegistersQuery = 'SELECT * FROM register_name';
                    const getImagesQuery = `SELECT id, puppies_id, image_path, balise_title, balise_alt, alt_modified FROM puppies_images WHERE puppies_id = ?`;

                    db.query(getBreedsQuery, (err, breedsResult) => {
                        if (err) {
                            console.error('Erreur lors de la récupération des races:', err);
                            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des races' });
                        }

                        db.query(getCountriesQuery, (err, countriesResult) => {
                            if (err) {
                                console.error('Erreur lors de la récupération des pays:', err);
                                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des pays' });
                            }

                            db.query(getRegistersQuery, (err, registersResult) => {
                                if (err) {
                                    console.error('Erreur lors de la récupération des registres:', err);
                                    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des registres' });
                                }

                                db.query(getImagesQuery, [puppyId], (err, imagesResult) => {
                                    if (err) {
                                        console.error('Erreur lors de la récupération des images:', err);
                                        return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des images' });
                                    }

                                    const isPuppyOnline = puppy.puppy_is_online === 1;

                                    res.render('./partials/puppyProfile', {
                                        puppy: {
                                            ...puppy,
                                            formatted_puppy_birth_date: moment(puppy.puppy_birth_date).format('YYYY-MM-DD'),
                                            formatted_available_date: moment(puppy.available_date).format('YYYY-MM-DD'),
                                            ageInMonths: age.ageInMonths,
                                            ageInDays: age.ageInDays,
                                            father_name: father ? father.name : 'Inconnu',
                                            mother_name: mother ? mother.name : 'Inconnue',
                                            father_category: father ? father.category : 'Inconnu',
                                            mother_category: mother ? mother.category : 'Inconnu',
                                            country_name: puppy.country_name,
                                            image_path_puppies_profil: puppy.image_path_puppies_profil,
                                            puppy_health_tests: puppy.puppy_health_tests,
                                            puppy_description_animals: puppy.puppy_description_animals,
                                            breed_name: puppy.breed_name,
                                            mother_breed_id: mother ? mother.breed_id : 'Inconnu'
                                        },
                                        marriage: {
                                            id: marriage.id,
                                            male_id: marriage.male_id,
                                            female_id: marriage.female_id,
                                            expected_puppies: marriage.expected_puppies,
                                            expected_birth_date: marriage.expected_birth_date,
                                            actual_birth_date: marriage.actual_birth_date,
                                            actual_male_puppies: marriage.actual_male_puppies,
                                            actual_female_puppies: marriage.actual_female_puppies,
                                            marriages_status: marriage.marriages_status,
                                            is_online: marriage.is_online,
                                            marriages_description: marriage.marriages_description,
                                            get_banner: marriage.get_banner
                                        },
                                        breeds: breedsResult,
                                        countries: countriesResult,
                                        registers: registersResult,
                                        images: imagesResult,
                                        mother: mother,
                                        isPuppyOnline: isPuppyOnline
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});




//  nouveau router post pour la mise à jour des informations du chiot avec l'envoi d'infos vers la table animals
// pas terminé car il manque la partie de l'insertion des parents , grands parents et arrières grands parents + les images respectives de chaque dans les tables correspondantes
// router.post('/:marriageId/puppyProfile/:puppyId', isAuthenticated, (req, res) => {
//     const marriageId = req.params.marriageId;
//     const puppyId = req.params.puppyId;

//     const { puppy_name, sale_status, puppy_other_names, sale_purpose, puppy_color, puppy_coat_type, breed_id, puppy_slug, puppy_breed_type, puppy_eye_color, country_id, register_id, puppy_price, in_breeding } = req.body;

//     const updatePuppyQuery = `
//         UPDATE puppies
//         SET puppy_name = ?, sale_status = ?, puppy_other_names = ?, sale_purpose = ?, puppy_color = ?, puppy_coat_type = ?, breed_id = ?, puppy_slug = ?, puppy_breed_type = ?, puppy_eye_color = ?, country_id = ?, register_id = ?, price = ?, in_breeding = ?
//         WHERE id = ?
//     `;

//     const queryPuppy = `
//         SELECT p.*, 
//                c.name as country_name, 
//                b.name as breed_name, 
//                m.male_id, m.female_id, m.expected_puppies, m.expected_birth_date, m.actual_birth_date, 
//                m.actual_male_puppies, m.actual_female_puppies, m.marriages_status, m.is_online as marriage_is_online, 
//                m.marriages_description, m.get_banner, 
//                pi.image_path_puppies_profil
//         FROM puppies p
//         LEFT JOIN marriages m ON p.marriage_id = m.id
//         LEFT JOIN puppies_profil_images pi ON p.id = pi.puppies_id
//         LEFT JOIN country_name c ON p.country_id = c.id
//         LEFT JOIN breed_name b ON p.breed_id = b.id
//         WHERE p.id = ? AND p.marriage_id = ?
//     `;

//     const insertParentQuery = `
//         INSERT INTO animals (id, name, category, breed_id)
//         VALUES (?, ?, ?, ?)
//         ON DUPLICATE KEY UPDATE
//         id = VALUES(id)
//     `;

//     const queryBreeds = `SELECT id, name FROM breed_name`;
//     const queryCountries = `SELECT id, name FROM country_name`;
//     const queryRegisters = `SELECT id, name FROM register_name`;
//     const queryPuppyImages = `SELECT id, puppies_id, image_path, balise_title, balise_alt, alt_modified FROM puppies_images WHERE puppies_id = ?`;

//     db.query(updatePuppyQuery, [puppy_name, sale_status, puppy_other_names, sale_purpose, puppy_color, puppy_coat_type, breed_id, puppy_slug, puppy_breed_type, puppy_eye_color, country_id, register_id, puppy_price, in_breeding, puppyId], (err, result) => {
//         if (err) {
//             console.error('Erreur lors de la mise à jour du chiot:', err);
//             return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du chiot' });
//         }

//         db.query(queryPuppy, [puppyId, marriageId], (err, puppyResult) => {
//             if (err) {
//                 console.error('Erreur lors de la récupération des informations du chiot:', err);
//                 return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des informations du chiot' });
//             }

//             if (puppyResult.length === 0) {
//                 console.log('Chiot non trouvé');
//                 return res.status(404).send('Chiot non trouvé');
//             }

//             const puppy = puppyResult[0];
//             const motherId = puppy.mother_id;
//             const fatherId = puppy.father_id;

//             // Vérifiez l'existence des parents dans la table animals
//             const getParentQuery = `SELECT id, name, category, breed_id FROM animals WHERE id IN (?, ?)`;

//             db.query(getParentQuery, [fatherId, motherId], async (err, parentsResult) => {
//                 if (err) {
//                     console.error('Erreur lors de la récupération des informations des parents:', err);
//                     return res.status(500).send('Erreur lors de la récupération des informations des parents');
//                 }

//                 const father = parentsResult.find(parent => parent.id === fatherId);
//                 const mother = parentsResult.find(parent => parent.id === motherId);

//                 const insertParents = async () => {
//                     if (!father) {
//                         await new Promise((resolve, reject) => {
//                             db.query(insertParentQuery, [fatherId, 'Nom du père', 'catégorie du père', 'id_race_du_père'], (err, result) => {
//                                 if (err) {
//                                     return reject(err);
//                                 }
//                                 resolve();
//                             });
//                         });
//                     }
//                     if (!mother) {
//                         await new Promise((resolve, reject) => {
//                             db.query(insertParentQuery, [motherId, 'Nom de la mère', 'catégorie de la mère', 'id_race_de_la_mère'], (err, result) => {
//                                 if (err) {
//                                     return reject(err);
//                                 }
//                                 resolve();
//                             });
//                         });
//                     }
//                 };

//                 try {
//                     await insertParents();

//                     // Assurez-vous que les parents sont dans les tables référencées
//                     const insertFatherTableQuery = `
//                         INSERT INTO father_table (id, father_name)
//                         VALUES (?, ?)
//                         ON DUPLICATE KEY UPDATE id = VALUES(id)
//                     `;

//                     const insertMotherTableQuery = `
//                         INSERT INTO mother_table (id, mother_name)
//                         VALUES (?, ?)
//                         ON DUPLICATE KEY UPDATE id = VALUES(id)
//                     `;

//                     await new Promise((resolve, reject) => {
//                         db.query(insertFatherTableQuery, [fatherId, 'Nom du père'], (err, result) => {
//                             if (err) {
//                                 return reject(err);
//                             }
//                             resolve();
//                         });
//                     });

//                     await new Promise((resolve, reject) => {
//                         db.query(insertMotherTableQuery, [motherId, 'Nom de la mère'], (err, result) => {
//                             if (err) {
//                                 return reject(err);
//                             }
//                             resolve();
//                         });
//                     });

//                     db.query(queryBreeds, (err, breedsResult) => {
//                         if (err) {
//                             console.error('Erreur lors de la récupération des races:', err);
//                             return res.status(500).send('Erreur lors de la récupération des races');
//                         }

//                         db.query(queryCountries, (err, countriesResult) => {
//                             if (err) {
//                                 console.error('Erreur lors de la récupération des pays:', err);
//                                 return res.status(500).send('Erreur lors de la récupération des pays');
//                             }

//                             db.query(queryRegisters, (err, registersResult) => {
//                                 if (err) {
//                                     console.error('Erreur lors de la récupération des registres:', err);
//                                     return res.status(500).send('Erreur lors de la récupération des registres');
//                                 }

//                                 const getImagesQuery = `SELECT id, puppies_id, image_path, balise_title, balise_alt, alt_modified FROM puppies_images WHERE puppies_id = ?`;
//                                 db.query(getImagesQuery, [puppyId], (err, imagesResult) => {
//                                     if (err) {
//                                         console.error('Erreur lors de la récupération des images:', err);
//                                         return res.status(500).send('Erreur lors de la récupération des images');
//                                     }

//                                     const isPuppyOnline = puppy.puppy_is_online === 1;

//                                     res.render('./partials/puppyProfile', {
//                                         puppy: {
//                                             ...puppy,
//                                             formatted_puppy_birth_date: moment(puppy.puppy_birth_date).format('YYYY-MM-DD'),
//                                             formatted_available_date: moment(puppy.available_date).format('YYYY-MM-DD'),
//                                             ageInMonths: moment().diff(puppy.puppy_birth_date, 'months'),
//                                             ageInDays: moment().diff(puppy.puppy_birth_date, 'days'),
//                                             father_name: father ? father.name : 'Inconnu',
//                                             mother_name: mother ? mother.name : 'Inconnue',
//                                             father_category: father ? father.category : 'Inconnu',
//                                             mother_category: mother ? mother.category : 'Inconnu',
//                                             country_name: puppy.country_name,
//                                             image_path_puppies_profil: puppy.image_path_puppies_profil,
//                                             puppy_health_tests: puppy.puppy_health_tests,
//                                             puppy_description_animals: puppy.puppy_description_animals,
//                                             breed_name: puppy.breed_name,
//                                             mother_breed_id: mother ? mother.breed_id : 'Inconnu'
//                                         },
//                                         marriage: {
//                                             id: puppy.marriage_id,
//                                             male_id: puppy.male_id,
//                                             female_id: puppy.female_id,
//                                             expected_puppies: puppy.expected_puppies,
//                                             expected_birth_date: puppy.expected_birth_date,
//                                             actual_birth_date: puppy.actual_birth_date,
//                                             actual_male_puppies: puppy.actual_male_puppies,
//                                             actual_female_puppies: puppy.actual_female_puppies,
//                                             marriages_status: puppy.marriages_status,
//                                             is_online: puppy.marriage_is_online,
//                                             marriages_description: puppy.marriages_description,
//                                             get_banner: puppy.get_banner
//                                         },
//                                         breeds: breedsResult,
//                                         countries: countriesResult,
//                                         registers: registersResult,
//                                         images: imagesResult,
//                                         mother: mother,
//                                         isPuppyOnline: isPuppyOnline
//                                     });

//                                     // Vérifiez si le chiot fait partie de l'élevage et l'ajoutez à la table animals si c'est le cas
//                                     if (in_breeding === '1') {
//                                         const insertAnimalQuery = `
//                                             INSERT INTO animals (id, name, in_breeding, gender, other_names, category, breed_type, birth_date, color, coat_type, eye_color, is_online, health_tests, description_animals, register_id, father_id, mother_id, country_id, breed_id, user_id, slug)
//                                             SELECT id, puppy_name, in_breeding, puppy_gender, puppy_other_names, puppy_category, puppy_breed_type, puppy_birth_date, puppy_color, puppy_coat_type, puppy_eye_color, puppy_is_online, puppy_health_tests, puppy_description_animals, register_id, father_id, mother_id, country_id, breed_id, user_id, puppy_slug
//                                             FROM puppies
//                                             WHERE id = ?
//                                             ON DUPLICATE KEY UPDATE
//                                             name = VALUES(name), in_breeding = VALUES(in_breeding), gender = VALUES(gender), other_names = VALUES(other_names), category = VALUES(category), breed_type = VALUES(breed_type), birth_date = VALUES(birth_date), color = VALUES(color), coat_type = VALUES(coat_type), eye_color = VALUES(eye_color), is_online = VALUES(is_online), health_tests = VALUES(health_tests), description_animals = VALUES(description_animals), register_id = VALUES(register_id), father_id = VALUES(father_id), mother_id = VALUES(mother_id), country_id = VALUES(country_id), breed_id = VALUES(breed_id), user_id = VALUES(user_id), slug = VALUES(slug)
//                                         `;

//                                         db.query(insertAnimalQuery, [puppyId], (err, animalResult) => {
//                                             if (err) {
//                                                 console.error('Erreur lors de l\'insertion dans la table animals:', err);
//                                                 return res.status(500).json({ success: false, message: 'Erreur lors de l\'insertion dans la table animals' });
//                                             }
//                                             console.log('Chiot ajouté à la table animals avec succès:', animalResult.affectedRows);
//                                         });
//                                     }
//                                 });
//                                 console.log('Chiot mis à jour avec succès:', result.affectedRows);
//                             });
//                         });
//                     });
//                 } catch (err) {
//                     console.error('Erreur lors de l\'insertion des parents:', err);
//                     return res.status(500).json({ success: false, message: 'Erreur lors de l\'insertion des parents' });
//                 }
//             });
//         });
//     });
// });

module.exports = router;
