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

// const publicDirectory = path.join(__dirname, './public');
router.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route pour afficher les chiens en saillie
router.get('/saillies', (req, res) => {
    const userId = 8;
    const itemsPerPage = 8;
    const currentPage = parseInt(req.query.page) || 1;

    // Redirection explicite pour page 0 et 1
    if (req.query.page === '0' || req.query.page === '1') {
        return res.redirect('/chiens/saillies');
    }
    const queryAllRaces = `
        SELECT DISTINCT 
            breed_name.name AS breed_name,
            breed_name.slug AS breed_slug
        FROM animals
        LEFT JOIN breed_name ON animals.breed_id = breed_name.id
        WHERE 
            animals.user_id = ?
            AND animals.is_online = 1
            AND animals.in_breeding = 1
            AND animals.gender = 'Male'
            AND animals.open_for_stud = 1
        ORDER BY breed_name.name ASC
    `;

    db.query(queryAllRaces, [userId], (err, allRaces) => {
        if (err) {
            console.error('Erreur lors de la récupération des races:', err);
            return res.status(500).render('error', { message: 'Erreur lors du chargement des données' });
        }
        const countQuery = `
            SELECT COUNT(DISTINCT animals.id) AS total
            FROM animals
            LEFT JOIN breed_name ON animals.breed_id = breed_name.id
            LEFT JOIN images ON images.animal_id = animals.id
            WHERE 
                animals.user_id = ?
                AND animals.gender = 'Male'
                AND animals.open_for_stud = 1
                AND animals.is_online = 1
                AND animals.in_breeding = 1
                AND animals.retreat = 0
        `;

        db.query(countQuery, [userId], (err, countResult) => {
            if (err) {
                console.error('Erreur lors du comptage des animaux:', err);
                return res.status(500).render('error', { message: 'Erreur lors du chargement des données' });
            }

            const totalItems = countResult[0].total;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            if (currentPage > totalPages) {
                res.status(404);
                return res.redirect(`/chiens/saillies?page=${totalPages}`);
            }
            const offset = (currentPage - 1) * itemsPerPage;
            const queryAnimals = `
                SELECT 
                    animals.id,
                    animals.name,
                    animals.gender,
                    animals.breed_type,
                    animals.color,
                    animals.eye_color,
                    animals.slug,
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
                    AND animals.gender = 'Male'
                    AND animals.open_for_stud = 1
                    AND animals.is_online = 1
                    AND animals.in_breeding = 1
                    AND animals.retreat = 0
                    AND images.id = (
                        SELECT MIN(id)
                        FROM images
                        WHERE images.animal_id = animals.id
                    )
                ORDER BY animals.id DESC
                LIMIT ? OFFSET ?
            `;

            db.query(queryAnimals, [userId, itemsPerPage, offset], (err, animals) => {
                if (err) {
                    console.error('Erreur lors de la récupération des animaux:', err);
                    return res.status(500).render('error', { message: 'Erreur lors du chargement des données' });
                }

                res.render('chiens_by_stud', {
                    animals: animals,
                    races: allRaces,
                    currentPage: currentPage,
                    totalPages: totalPages,
                    totalItems: totalItems
                });
            });
        });
    });
});

// Route pour afficher les mâles ouverts à la saillie par race
router.get('/:breed_slug/saillies', (req, res) => {
    const userId = 8;
    const breedSlug = req.params.breed_slug;
    const itemsPerPage = 8;
    const currentPage = parseInt(req.query.page) || 1;

    if (req.query.page === '0' || req.query.page === '1') {
        return res.redirect(`/chiens/${req.params.breed_slug}/saillies`);
    }
    const queryAllRaces = `
        SELECT DISTINCT 
            breed_name.name AS breed_name,
            breed_name.slug AS breed_slug
        FROM animals
        LEFT JOIN breed_name ON animals.breed_id = breed_name.id
        WHERE 
            animals.user_id = ?
            AND animals.is_online = 1
            AND animals.in_breeding = 1
            AND animals.gender = 'Male'
            AND animals.open_for_stud = 1
        ORDER BY breed_name.name ASC
    `;
    db.query(queryAllRaces, [userId], (err, allRaces) => {
        if (err) {
            console.error('Erreur lors de la récupération des races:', err);
            return res.status(500).render('error', { message: 'Erreur lors du chargement des données' });
        }
        const queryBreedName = `
            SELECT name
            FROM breed_name
            WHERE slug = ?
        `;

        db.query(queryBreedName, [breedSlug], (err, breedNameResult) => {
            if (err) {
                console.error('Erreur lors de la récupération du nom de la race:', err);
                return res.status(500).render('error', { message: 'Erreur lors du chargement des données' });
            }
            const currentBreed = breedNameResult[0].name;
            const countQuery = `
                SELECT COUNT(DISTINCT animals.id) AS total
                FROM animals
                LEFT JOIN breed_name ON animals.breed_id = breed_name.id
                LEFT JOIN images ON images.animal_id = animals.id
                WHERE 
                    animals.user_id = ?
                    AND breed_name.slug = ?
                    AND animals.gender = 'Male'
                    AND animals.open_for_stud = 1
                    AND animals.is_online = 1
                    AND animals.in_breeding = 1
                    AND animals.retreat = 0
            `;
            db.query(countQuery, [userId, breedSlug], (err, countResult) => {
                if (err) {
                    console.error('Erreur lors du comptage des animaux:', err);
                    return res.status(500).render('error', { message: 'Erreur lors du chargement des données' });
                }

                const totalItems = countResult[0].total;
                const totalPages = Math.ceil(totalItems / itemsPerPage);

                if (currentPage > totalPages && totalPages > 0) {
                    res.status(404);
                    return res.redirect(`/chiens/${req.params.breed_slug}/saillies?page=${totalPages}`);
                }
                const offset = (currentPage - 1) * itemsPerPage;
                const queryAnimals = `
                    SELECT 
                        animals.id,
                        animals.name,
                        animals.gender,
                        animals.breed_type,
                        animals.color,
                        animals.eye_color,
                        animals.slug,
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
                        AND breed_name.slug = ?
                        AND animals.gender = 'Male'
                        AND animals.open_for_stud = 1
                        AND animals.is_online = 1
                        AND animals.in_breeding = 1
                        AND animals.retreat = 0
                        AND images.id = (
                            SELECT MIN(id)
                            FROM images
                            WHERE images.animal_id = animals.id
                        )
                    ORDER BY animals.id DESC
                    LIMIT ? OFFSET ?
                `;

                db.query(queryAnimals, [userId, breedSlug, itemsPerPage, offset], (err, animals) => {
                    if (err) {
                        console.error('Erreur lors de la récupération des animaux:', err);
                        return res.status(500).render('error', { message: 'Erreur lors du chargement des données' });
                    }

                    res.render('chiens_by_breed_and_stud', {
                        animals: animals,
                        races: allRaces,
                        currentBreed: currentBreed,
                        currentPage: currentPage,
                        totalPages: totalPages,
                        totalItems: totalItems,
                        breedSlug: breedSlug 
                    });
                });
            });
        });
    });
});

// router pour afficher les chiens de l'éleveur selon sa race, son genre et sa page
router.get('/:breed_slug/:gender(males|femelles|saillies)', (req, res) => {
    const userId = 8;
    const breedSlug = req.params.breed_slug;
    const gender = req.params.gender;
    let genderFilter = '';
    if (gender === 'males') {
        genderFilter = 'Male';
    } else if (gender === 'femelles') {
        genderFilter = 'Femelle';
    } else {
        genderFilter = 'Male';
    }
    const itemsPerPage = 8;
    const currentPage = parseInt(req.query.page) || 1;
    if (req.query.page === '0' || req.query.page === '1') {
        res.status(404);
        return res.redirect(`/chiens/${req.params.breed_slug}/${req.params.gender}`);
    }
    const queryAllRaces = `
        SELECT DISTINCT 
            breed_name.name AS breed_name,
            breed_name.slug AS breed_slug
        FROM animals
        LEFT JOIN breed_name ON animals.breed_id = breed_name.id
        WHERE 
            animals.user_id = ?
            AND animals.is_online = 1
            AND animals.in_breeding = 1
        ORDER BY breed_name.name ASC
    `;
    db.query(queryAllRaces, [userId], (err, allRaces) => {
        if (err) {
            console.error('Erreur lors de la récupération des races:', err);
            return res.status(500).render('error', { message: 'Erreur lors du chargement des données' });
        }
        const queryBreedName = `
            SELECT name
            FROM breed_name
            WHERE slug = ?
        `;
        db.query(queryBreedName, [breedSlug], (err, breedNameResult) => {
            if (err) {
                console.error('Erreur lors de la récupération du nom de la race:', err);
                return res.status(500).render('error', { message: 'Erreur lors du chargement des données' });
            }
            const currentBreed = breedNameResult[0].name;
            const countQuery = `
                SELECT COUNT(DISTINCT animals.id) AS total
                FROM animals
                LEFT JOIN breed_name ON animals.breed_id = breed_name.id
                LEFT JOIN images ON images.animal_id = animals.id
                WHERE 
                    animals.user_id = ?
                    AND breed_name.slug = ?
                    AND animals.gender = ?
                    AND animals.is_online = 1
                    AND animals.in_breeding = 1
                    AND animals.retreat = 0
            `;
            db.query(countQuery, [userId, breedSlug, genderFilter], (err, countResult) => {
                if (err) {
                    console.error('Erreur lors du comptage des animaux:', err);
                    return res.status(500).render('error', { message: 'Erreur lors du chargement des données' });
                }

                const totalItems = countResult[0].total;
                const totalPages = Math.ceil(totalItems / itemsPerPage);

                if (currentPage > totalPages && totalPages > 0) {
                    return res.redirect(`/chiens/${req.params.breed_slug}/${req.params.gender}?page=${totalPages}`);
                }
                const offset = (currentPage - 1) * itemsPerPage;
                const queryAnimals = `
                    SELECT 
                        animals.id,
                        animals.name,
                        animals.gender,
                        animals.breed_type,
                        animals.color,
                        animals.eye_color,
                        animals.slug,
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
                        AND breed_name.slug = ?
                        AND animals.gender = ?
                        AND animals.is_online = 1
                        AND animals.in_breeding = 1
                        AND animals.retreat = 0
                        AND images.id = (
                            SELECT MIN(id)
                            FROM images
                            WHERE images.animal_id = animals.id
                        )
                    ORDER BY animals.id DESC
                    LIMIT ? OFFSET ?
                `;
                db.query(queryAnimals, [userId, breedSlug, genderFilter, itemsPerPage, offset], (err, animals) => {
                    if (err) {
                        console.error('Erreur lors de la récupération des animaux:', err);
                        return res.status(500).render('error', { message: 'Erreur lors du chargement des données' });
                    }
                    res.render('chiens_by_breed_and_gender', {
                        animals: animals,
                        races: allRaces,
                        currentGender: genderFilter,
                        currentBreed: currentBreed,
                        genderPath: req.params.gender,
                        currentBreedSlug: breedSlug,
                        currentPage: currentPage,
                        totalPages: totalPages,
                        totalItems: totalItems
                    });
                });
            });
        });
    });
});

// route de la page des chiens triés par genre
router.get('/:gender(males|femelles)', (req, res) => {
    const userId = 8;
    const gender = req.params.gender === 'males' ? 'Male' : 'Femelle';
    const itemsPerPage = 8;
    const currentPage = parseInt(req.query.page) || 1;
    if (req.query.page === '0' || req.query.page === '1') {
        return res.redirect(`/chiens/${req.params.gender}`);
    }
    const countQuery = `
        SELECT COUNT(DISTINCT animals.id) AS total 
        FROM animals
        LEFT JOIN images ON images.animal_id = animals.id
        WHERE 
            animals.user_id = ? 
            AND animals.gender = ?
            AND animals.is_online = 1 
            AND animals.in_breeding = 1
            AND animals.retreat = 0
    `;
    db.query(countQuery, [userId, gender], (err, countResult) => {
        if (err) {
            console.error('Erreur lors du comptage des animaux:', err);
            return res.redirect('/erreur');
        }

        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (currentPage > totalPages && totalPages > 0) {
            res.status(404);
            return res.redirect(`/chiens/${req.params.gender}?page=${totalPages}`);
        }
        const offset = (currentPage - 1) * itemsPerPage;

        const queryAllRaces = `
            SELECT DISTINCT 
                breed_name.name AS breed_name,
                breed_name.slug AS breed_slug
            FROM animals
            LEFT JOIN breed_name ON animals.breed_id = breed_name.id
            WHERE 
                animals.user_id = ? 
                AND animals.is_online = 1 
                AND animals.in_breeding = 1
            ORDER BY breed_name.name ASC
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
                AND animals.gender = ?
                AND animals.is_online = 1
                AND animals.in_breeding = 1
                AND animals.retreat = 0
                AND images.id = (
                    SELECT MIN(id) 
                    FROM images 
                    WHERE images.animal_id = animals.id
                )
            ORDER BY animals.id DESC
            LIMIT ? OFFSET ?
        `;
        db.query(queryAllRaces, [userId], (err, allRaces) => {
            if (err) {
                console.error('Erreur lors de la récupération des races:', err);
                return res.redirect('/erreur');
            }
            db.query(queryAnimals, [userId, gender, itemsPerPage, offset], (err, animals) => {
                if (err) {
                    console.error('Erreur lors de la récupération des animaux:', err);
                    return res.redirect('/erreur');
                }
                res.render('chiens_by_gender', {
                    animals: animals,
                    races: allRaces,
                    currentGender: gender,
                    genderPath: req.params.gender,
                    currentPage: currentPage,
                    totalPages: totalPages,
                    totalItems: totalItems,
                    breedSlug: null,
                });
            });
        });
    });
});

// Route pour afficher les animaux par race
router.get('/:breed_slug', (req, res) => {
    const userId = 8;
    const breedSlug = req.params.breed_slug;
    const itemsPerPage = 8;
    const currentPage = parseInt(req.query.page) || 1;
    if (req.query.page === '0' || req.query.page === '1') {
        return res.redirect(`/chiens/${breedSlug}`);
    }
    const checkBreedQuery = `
        SELECT id, name 
        FROM breed_name 
        WHERE slug = ?
    `;
    db.query(checkBreedQuery, [breedSlug], (err, breedResult) => {
        if (err || breedResult.length === 0) {
            return res.redirect('/erreur');
        }
        const breedId = breedResult[0].id;
        const breedName = breedResult[0].name;
        const countQuery = `
            SELECT COUNT(DISTINCT animals.id) AS total 
            FROM animals
            LEFT JOIN images ON images.animal_id = animals.id
            WHERE 
                animals.user_id = ? 
                AND animals.breed_id = ?
                AND animals.is_online = 1 
                AND animals.in_breeding = 1
                AND animals.retreat = 0
        `;
        db.query(countQuery, [userId, breedId], (err, countResult) => {
            if (err) {
                console.error('Erreur lors du comptage des animaux:', err);
                return res.redirect('/erreur');
            }
            const totalItems = countResult[0].total;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            if (currentPage > totalPages && totalPages > 0) {
                res.status(404);
                return res.redirect(`/chiens/${breedSlug}?page=${totalPages}`);
            }
            const offset = (currentPage - 1) * itemsPerPage;
            const queryAllRaces = `
                SELECT DISTINCT 
                    breed_name.name AS breed_name,
                    breed_name.slug AS breed_slug
                FROM animals
                LEFT JOIN breed_name ON animals.breed_id = breed_name.id
                WHERE 
                    animals.user_id = ? 
                    AND animals.is_online = 1 
                    AND animals.in_breeding = 1
                ORDER BY breed_name.name ASC
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
                    AND animals.breed_id = ?
                    AND animals.is_online = 1
                    AND animals.in_breeding = 1
                    AND animals.retreat = 0
                    AND images.id = (
                        SELECT MIN(id) 
                        FROM images 
                        WHERE images.animal_id = animals.id
                    )
                ORDER BY animals.id DESC
                LIMIT ? OFFSET ?
            `;
            db.query(queryAllRaces, [userId], (err, allRaces) => {
                if (err) {
                    console.error('Erreur lors de la récupération des races:', err);
                    return res.redirect('/erreur');
                }
                db.query(queryAnimals, [userId, breedId, itemsPerPage, offset], (err, animals) => {
                    if (err) {
                        console.error('Erreur lors de la récupération des animaux:', err);
                        return res.redirect('/erreur');
                    }
                    res.render('chiens_by_breed', {
                        animals: animals,
                        races: allRaces,
                        currentBreed: breedName,
                        breed: {              
                            name: breedName,
                            slug: breedSlug
                        },
                        breedSlug: breedSlug,
                        currentPage: currentPage,
                        totalPages: totalPages,
                        totalItems: totalItems
                    });
                });
            });
        });
    });
});

// Route pour afficher le profil d'un animal
router.get('/:breed_slug/:slug', (req, res) => {
    const userId = 8;
    const slug = req.params.slug;
    const queryAnimal = ` 
        SELECT
            animal.id,
            animal.name,
            animal.in_breeding,
            animal.gender,
            animal.other_names,
            animal.breed_type,
            animal.birth_date,
            animal.color,
            animal.coat_type,
            animal.eye_color,
            animal.is_online,
            animal.health_tests,
            animal.description_animals,
            animal.register_id,
            animal.father_id,
            animal.mother_id,
            animal.country_id,
            animal.breed_id,
            animal.user_id,
            animal.slug,
            animal.open_for_stud,
            animal.retreat,
            breed_name.name AS breed_name,
            breed_name.slug AS breed_slug,
            register_name.name AS register_name,
            country_name.name AS country_name,
            father_table.name AS father_name,
            mother_table.name AS mother_name,
            images.image_path,
            images.optimized_image_path,
            images.balise_alt,
            images.balise_title,
            profile_images.image_path_profile AS profile_image_path,
            profile_images.optimized_image_path AS profile_optimized_image_path 
        FROM
            animals AS animal 
            LEFT JOIN
                breed_name 
                ON animal.breed_id = breed_name.id 
            LEFT JOIN
                register_name 
                ON animal.register_id = register_name.id 
            LEFT JOIN
                country_name 
                ON animal.country_id = country_name.id 
            LEFT JOIN
                animals AS father_table 
                ON animal.father_id = father_table.id 
            LEFT JOIN
                animals AS mother_table 
                ON animal.mother_id = mother_table.id 
            LEFT JOIN
                images 
                ON images.animal_id = animal.id 
                AND images.id = 
                (
                    SELECT
                        MIN(id) 
                    FROM
                        images 
                    WHERE
                        images.animal_id = animal.id 
                )
            LEFT JOIN
                profile_images 
                ON profile_images.animal_id = animal.id 
        WHERE
            animal.user_id = ? 
            AND animal.slug = ? 
            AND animal.is_online = 1;
        `;
        const queryAnimalImages = ` 
        SELECT
            image_path,
            optimized_image_path,
            balise_alt,
            balise_title 
        FROM
            images 
        WHERE
            animal_id = 
            (
                SELECT
                    id 
                FROM
                    animals 
                WHERE
                    slug = ? 
                    AND user_id = ? 
            )
        ORDER BY
            id ASC;
        `;
        const queryCoverImage = `
        SELECT 
        image_path, 
        optimized_image_path, 
        balise_alt,
        balise_title
        FROM animals_cover_images 
        WHERE animal_id = (
            SELECT id 
            FROM animals 
            WHERE slug = ? 
            AND user_id = ?
        )
        LIMIT 1;
    `;
        const queryFather = ` 
        SELECT
            f.*,
            breed_name.name AS breed_name,
            register_name.name AS register_name,
            country_name.name AS country_name,
            images_father.image_path,
            images_father.optimized_image_path,
            gf.id AS grandfather_id,
            gm.id AS grandmother_id 
        FROM
            father_table f 
            LEFT JOIN
                breed_name 
                ON f.breed_id = breed_name.id 
            LEFT JOIN
                register_name 
                ON f.register_id = register_name.id 
            LEFT JOIN
                country_name 
                ON f.country_id = country_name.id 
            LEFT JOIN
                images_father 
                ON images_father.father_id = f.id 
            LEFT JOIN
                grandfather_table gf 
                ON f.paternal_grandfather_id = gf.id 
            LEFT JOIN
                grandmother_table gm 
                ON f.paternal_grandmother_id = gm.id 
        WHERE
            f.id = ? ;
        `;
        const queryGrandfather = ` 
        SELECT
            g.*,
            breed_name.name AS breed_name,
            register_name.name AS register_name,
            country_name.name AS country_name,
            images_grandfather.image_path,
            images_grandfather.optimized_image_path 
        FROM
            grandfather_table g 
            LEFT JOIN
                breed_name 
                ON g.breed_id = breed_name.id 
            LEFT JOIN
                register_name 
                ON g.register_id = register_name.id 
            LEFT JOIN
                country_name 
                ON g.country_id = country_name.id 
            LEFT JOIN
                images_grandfather 
                ON images_grandfather.grandfather_id = g.id 
        WHERE
            g.id = ? ;
        `;
        const queryGrandmother = ` 
        SELECT
            g.*,
            breed_name.name AS breed_name,
            register_name.name AS register_name,
            country_name.name AS country_name,
            images_grandmother.image_path,
            images_grandmother.optimized_image_path 
        FROM
            grandmother_table g 
            LEFT JOIN
                breed_name 
                ON g.breed_id = breed_name.id 
            LEFT JOIN
                register_name 
                ON g.register_id = register_name.id 
            LEFT JOIN
                country_name 
                ON g.country_id = country_name.id 
            LEFT JOIN
                images_grandmother 
                ON images_grandmother.grandmother_id = g.id 
        WHERE
            g.id = ? ;
        `;
        const queryMother = ` 
        SELECT
            m.*,
            breed_name.name AS breed_name,
            register_name.name AS register_name,
            country_name.name AS country_name,
            images_mother.image_path,
            images_mother.optimized_image_path 
        FROM
            mother_table m 
            LEFT JOIN
                breed_name 
                ON m.breed_id = breed_name.id 
            LEFT JOIN
                register_name 
                ON m.register_id = register_name.id 
            LEFT JOIN
                country_name 
                ON m.country_id = country_name.id 
            LEFT JOIN
                images_mother 
                ON images_mother.mother_id = m.id 
        WHERE
            m.id = ? ;
        `;
        const queryMaternalGrandfather = ` 
        SELECT
            g.*,
            breed_name.name AS breed_name,
            register_name.name AS register_name,
            country_name.name AS country_name,
            images_grandfather.image_path,
            images_grandfather.optimized_image_path 
        FROM
            grandfather_table g 
            LEFT JOIN
                breed_name 
                ON g.breed_id = breed_name.id 
            LEFT JOIN
                register_name 
                ON g.register_id = register_name.id 
            LEFT JOIN
                country_name 
                ON g.country_id = country_name.id 
            LEFT JOIN
                images_grandfather 
                ON images_grandfather.grandfather_id = g.id 
        WHERE
            g.id = ? ;
        `;
        const queryMaternalGrandmother = ` 
        SELECT
            g.*,
            breed_name.name AS breed_name,
            register_name.name AS register_name,
            country_name.name AS country_name,
            images_grandmother.image_path,
            images_grandmother.optimized_image_path 
        FROM
            grandmother_table g 
            LEFT JOIN
                breed_name 
                ON g.breed_id = breed_name.id 
            LEFT JOIN
                register_name 
                ON g.register_id = register_name.id 
            LEFT JOIN
                country_name 
                ON g.country_id = country_name.id 
            LEFT JOIN
                images_grandmother 
                ON images_grandmother.grandmother_id = g.id 
        WHERE
            g.id = ? ;
        `;

    db.query(queryAnimal, [userId, slug], (err, animal) => {
        if (err) {
            console.error('Erreur lors de la récupération de l\'animal:', err);
            return res.redirect('/erreur');
        }

        if (animal.length === 0) return res.status(404).send('Animal non trouvé');

        db.query(queryCoverImage, [slug, userId], (err, coverImage) => {
            if (err) {
                console.error('Erreur lors de la récupération de l\'image de couverture:', err);
            }

        db.query(queryAnimalImages, [slug, userId], (err, animalImages) => {
            if (err) {
                console.error('Erreur lors de la récupération des images:', err);
                return res.redirect('/erreur');
            }

            db.query(queryFather, [animal[0].father_id], (err, fatherInfo) => {
                if (err) {
                    console.error('Erreur lors de la récupération du père:', err);
                    return res.redirect('/erreur');
                }

                if (!fatherInfo[0]) {
                    return res.render('dog_detail', {
                        animal: animal[0],
                        animalImages: animalImages,
                        father: null,
                        grandfather: null,
                        grandmother: null
                    });
                }

                db.query(queryGrandfather, [fatherInfo[0].grandfather_id], (err, grandfatherInfo) => {
                    if (err) {
                        console.error('Erreur lors de la récupération du grand-père:', err);
                        return res.redirect('/erreur');
                    }

                    db.query(queryGrandmother, [fatherInfo[0].grandmother_id], (err, grandmotherInfo) => {
                        if (err) {
                            console.error('Erreur lors de la récupération de la grand-mère:', err);
                            return res.redirect('/erreur');
                        }

                        db.query(queryMother, [animal[0].mother_id], (err, motherInfo) => {
                            if (err) {
                                console.error('Erreur lors de la récupération de la mère:', err);
                                return res.redirect('/erreur');
                            }

                            db.query(queryMaternalGrandfather, [motherInfo[0].maternal_grandfather_id], (err, maternalGrandfatherInfo) => {
                                if (err) {
                                    console.error('Erreur lors de la récupération du grand-père maternel:', err);
                                    return res.redirect('/erreur');
                                }

                                db.query(queryMaternalGrandmother, [motherInfo[0].maternal_grandmother_id], (err, maternalGrandmotherInfo) => {
                                    if (err) {
                                        console.error('Erreur lors de la récupération de la grand-mère maternelle:', err);
                                        return res.redirect('/erreur');
                                    }

                                    res.render('dog_detail', {
                                        animal: animal[0],
                                        animalImages: animalImages,
                                        coverImage: coverImage[0] || null,
                                        father: fatherInfo[0] || null,
                                        grandfather: grandfatherInfo[0] || null,
                                        grandmother: grandmotherInfo[0] || null,
                                        mother: motherInfo[0] || null,
                                        maternalGrandfather: maternalGrandfatherInfo[0] || null,
                                        maternalGrandmother: maternalGrandmotherInfo[0] || null
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
});

//  route principal pour la page chiens
router.get('/', (req, res) => {
    const userId = 8;
    const itemsPerPage = 8;
    const currentPage = parseInt(req.query.page) || 1;
    if (req.query.page === '0' || req.query.page === '1') {
        return res.redirect('/chiens');
    }
    const countQuery = `
        SELECT COUNT(DISTINCT animals.id) AS total 
        FROM animals
        LEFT JOIN images ON images.animal_id = animals.id
        WHERE 
            animals.user_id = ? 
            AND animals.is_online = 1 
            AND animals.in_breeding = 1
            AND animals.retreat = 0
    `;
    db.query(countQuery, [userId], (err, countResult) => {
        if (err) {
            console.error('Erreur lors du comptage des animaux:', err);
            return res.redirect('/erreur');
        }
        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (currentPage > totalPages && totalPages > 0) {
            res.status(404);
            return res.redirect(`/chiens?page=${totalPages}`);
        }
        const offset = (currentPage - 1) * itemsPerPage;
        const queryAllRaces = `
            SELECT DISTINCT 
                breed_name.name AS breed_name,
                breed_name.slug AS breed_slug
            FROM animals
            LEFT JOIN breed_name ON animals.breed_id = breed_name.id
            WHERE 
                animals.user_id = ? 
                AND animals.is_online = 1 
                AND animals.in_breeding = 1
            ORDER BY breed_name.name ASC
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
                AND animals.retreat = 0
                AND images.id = (
                    SELECT MIN(id) 
                    FROM images 
                    WHERE images.animal_id = animals.id
                )
            ORDER BY animals.id DESC
            LIMIT ? OFFSET ?
        `;
        db.query(queryAllRaces, [userId], (err, allRaces) => {
            if (err) {
                console.error('Erreur lors de la récupération des races:', err);
                return res.redirect('/erreur');
            }
            db.query(queryAnimals, [userId, itemsPerPage, offset], (err, animals) => {
                if (err) {
                    console.error('Erreur lors de la récupération des animaux:', err);
                    return res.redirect('/erreur');
                }
                res.render('chiens', {
                    animals: animals,
                    races: allRaces,
                    currentPage: currentPage,
                    totalPages: totalPages,
                    totalItems: totalItems
                });
            });
        });
    });
});

module.exports = router;