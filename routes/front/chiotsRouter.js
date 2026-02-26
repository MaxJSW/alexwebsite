const express = require('express');
const session = require('express-session');
const router = express.Router();
const moment = require('moment');
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

// router pour afficher la page de chiots à vendre par race et par genre (fait)
router.get('/a-vendre/:breedSlug/:gender(males|femelles)', (req, res) => {
    const userId = 10;
    const itemsPerPage = 6;
    const currentPage = parseInt(req.query.page) || 1;
    const breedSlug = req.params.breedSlug;
    const genderParam = req.params.gender;
    const gender = genderParam === 'males' ? 'Mâle' : 'Femelle';
    const genderLabel = genderParam === 'males' ? 'Mâles' : 'Femelles';

    if (req.query.page === '0' || req.query.page === '1') {
        return res.redirect(`/chiots/a-vendre/${breedSlug}/${genderParam}`);
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

    const queryBreed = `
        SELECT name, slug
        FROM breed_name
        WHERE slug = ? AND user_id = ?
        LIMIT 1
    `;

    const countQuery = `
        SELECT COUNT(DISTINCT p.id) AS total
        FROM puppies p
        LEFT JOIN breed_name bn ON p.breed_id = bn.id
        WHERE p.user_id = ?
        AND bn.slug = ?
        AND p.puppy_is_online = 1
        AND p.puppy_gender = ?
        AND p.sale_status IN ('available_for_reservation', 'for_sale', 'in_reservation', 'reserved')
    `;

    const queryPuppies = `
        SELECT 
            p.id,
            p.puppy_name,
            p.puppy_gender,
            p.puppy_breed_type,
            p.puppy_color,
            p.puppy_eye_color,
            p.price,
            p.sale_status,
            p.puppy_slug,
            bn.name AS breed_name,
            bn.slug AS breed_slug,
            pi.image_path,
            pi.optimized_image_path,
            pi.balise_alt,
            CASE p.sale_status
                WHEN 'available_for_reservation' THEN 1
                WHEN 'for_sale' THEN 2
                WHEN 'in_reservation' THEN 3
                WHEN 'reserved' THEN 4
                ELSE 5
            END AS status_order
        FROM puppies p
        LEFT JOIN breed_name bn ON p.breed_id = bn.id
        LEFT JOIN puppies_images pi ON pi.puppies_id = p.id
        AND pi.id = (
            SELECT MAX(id)
            FROM puppies_images
            WHERE puppies_id = p.id
        )
        WHERE p.user_id = ?
        AND bn.slug = ?
        AND p.puppy_is_online = 1
        AND p.puppy_gender = ?
        AND p.sale_status IN ('available_for_reservation', 'for_sale', 'in_reservation', 'reserved')
        ORDER BY status_order ASC, p.id DESC
        LIMIT ? OFFSET ?
    `;

    const queryBreeds = `
        SELECT 
            bn.name,
            bn.slug,
            (SELECT COUNT(*) 
             FROM puppies p 
             WHERE p.breed_id = bn.id 
             AND p.user_id = ? 
             AND p.puppy_is_online = 1 
             AND p.sale_status IN ('available_for_reservation', 'for_sale', 'in_reservation', 'reserved')
            ) AS active_puppies_count
        FROM breed_name bn
        WHERE bn.user_id = ?
        AND bn.is_online = 1
        ORDER BY bn.position ASC
    `;

    db.query(queryBreed, [breedSlug, userId], (err, breedResult) => {
        if (err) {
            console.error('Erreur lors de la récupération de la race :', err);
            return res.redirect('/erreur');
        }

        if (breedResult.length === 0) {
            return res.redirect('/erreur');
        }

        const breedData = breedResult[0];

        db.query(countQuery, [userId, breedSlug, gender], (err, countResult) => {
            if (err) {
                console.error('Erreur lors du comptage des chiots :', err);
                return res.redirect('/erreur');
            }

            const totalItems = countResult[0].total;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            const offset = (currentPage - 1) * itemsPerPage;

            if (currentPage > totalPages && totalPages > 0) {
                res.status(404);
                return res.redirect(`/chiots/a-vendre/${breedSlug}/${genderParam}?page=${totalPages}`);
            }

            Promise.all([
                new Promise((resolve, reject) => {
                    db.query(queryBreeds, [userId, userId], (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(queryPuppies, [userId, breedSlug, gender, itemsPerPage, offset], (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(querySocialLinks, [userId], (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                })
            ])
            .then(([breeds, puppies, socialLinks]) => {
                res.render('puppy_for_sale_by_breed_and_gender', {
                    breed: {
                        name: breedData.name,
                        slug: breedData.slug
                    },
                    breeds: breeds.map(breed => ({
                        name: breed.name,
                        slug: breed.slug,
                        hasActivePuppies: breed.active_puppies_count > 0
                    })),
                    puppies: puppies.map(puppy => ({
                        name: puppy.puppy_name,
                        gender: puppy.puppy_gender,
                        breed: {
                            name: puppy.breed_name,
                            slug: puppy.breed_slug
                        },
                        type: puppy.puppy_breed_type,
                        color: puppy.puppy_color,
                        eyeColor: puppy.puppy_eye_color,
                        price: puppy.price,
                        status: (() => {
                            switch(puppy.sale_status) {
                                case 'for_sale': return 'À vendre';
                                case 'available_for_reservation': return 'Disponible à la réservation';
                                case 'in_reservation': return 'En cours de réservation';
                                case 'reserved': return 'Réservé';
                                default: return 'Statut inconnu';
                            }
                        })(),
                        slug: puppy.puppy_slug,
                        image: {
                            path: puppy.optimized_image_path
                                ? `/uploads/optimized/${puppy.optimized_image_path}`
                                : `/uploads/${puppy.image_path}`,
                            alt: puppy.balise_alt
                        }
                    })),
                    activeBreed: breedSlug,
                    activeGender: gender,
                    selectedGender: {
                        value: gender,
                        param: genderParam,
                        label: genderLabel
                    },
                    currentPage,
                    totalPages,
                    totalItems,
                    socialLinks: socialLinks
                });
            })
            .catch(err => {
                console.error('Erreur lors du chargement des données :', err);
                res.redirect('/erreur');
            });
        });
    });
});

 function getSaleStatus(saleStatus) {
    switch (saleStatus) {
        case 'for_sale':
            return 'À vendre';
        case 'available_for_reservation':
            return 'Disponible à la réservation';
        case 'in_reservation':
            return 'En cours de réservation';
        case 'reserved':
            return 'Réservé';
        default:
            return 'Statut inconnu';
    }
 }

//  route pour la page de tri des chiots produits (fait)
router.get('/produits/:breedSlug/:gender(males|femelles)', (req, res) => {
    const userId = 10;
    const itemsPerPage = 6;
    const currentPage = parseInt(req.query.page) || 1;
    const breedSlug = req.params.breedSlug;
    const genderParam = req.params.gender;
    const gender = genderParam === 'males' ? 'Mâle' : 'Femelle';
    const genderLabel = genderParam === 'males' ? 'Mâles' : 'Femelles';

    if (req.query.page === '0' || req.query.page === '1') {
        return res.redirect(`/chiots/produits/${breedSlug}/${genderParam}`);
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

    const queryBreed = `
        SELECT name, slug
        FROM breed_name
        WHERE slug = ? AND user_id = ?
        LIMIT 1
    `;

    const countQuery = `
        SELECT COUNT(DISTINCT p.id) AS total
        FROM puppies p
        LEFT JOIN breed_name bn ON p.breed_id = bn.id
        WHERE p.user_id = ?
        AND bn.slug = ?
        AND p.puppy_is_online = 1
        AND p.puppy_gender = ?
        AND p.sale_status = 'sold'
    `;

    const queryPuppies = `
        SELECT 
            p.id,
            p.puppy_name,
            p.puppy_gender,
            p.puppy_breed_type,
            p.puppy_color,
            p.puppy_eye_color,
            p.sale_status,
            p.puppy_slug,
            bn.name AS breed_name,
            bn.slug AS breed_slug,
            pi.image_path,
            pi.optimized_image_path,
            pi.balise_alt
        FROM puppies p
        LEFT JOIN breed_name bn ON p.breed_id = bn.id
        LEFT JOIN puppies_images pi ON pi.puppies_id = p.id
        AND pi.id = (
            SELECT MIN(id)
            FROM puppies_images
            WHERE puppies_id = p.id
        )
        WHERE p.user_id = ?
        AND bn.slug = ?
        AND p.puppy_is_online = 1
        AND p.puppy_gender = ?
        AND p.sale_status = 'sold'
        ORDER BY p.id DESC
        LIMIT ? OFFSET ?
    `;

    const queryBreeds = `
        SELECT 
            bn.name,
            bn.slug,
            (SELECT COUNT(*) 
             FROM puppies p 
             WHERE p.breed_id = bn.id 
             AND p.user_id = ? 
             AND p.puppy_is_online = 1 
             AND p.sale_status = 'sold'
            ) AS active_puppies_count
        FROM breed_name bn
        WHERE bn.user_id = ?
        AND bn.is_online = 1
        ORDER BY bn.position ASC
    `;

    db.query(queryBreed, [breedSlug, userId], (err, breedResult) => {
        if (err) {
            console.error('Erreur lors de la récupération de la race :', err);
            return res.redirect('/erreur');
        }

        if (breedResult.length === 0) {
            return res.redirect('/erreur');
        }

        const breedData = breedResult[0];

        db.query(countQuery, [userId, breedSlug, gender], (err, countResult) => {
            if (err) {
                console.error('Erreur lors du comptage des chiots :', err);
                return res.redirect('/erreur');
            }

            const totalItems = countResult[0].total;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            const offset = (currentPage - 1) * itemsPerPage;

            if (currentPage > totalPages && totalPages > 0) {
                res.status(404);
                return res.redirect(`/chiots/produits/${breedSlug}/${genderParam}?page=${totalPages}`);
            }

            Promise.all([
                new Promise((resolve, reject) => {
                    db.query(queryBreeds, [userId, userId], (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(queryPuppies, [userId, breedSlug, gender, itemsPerPage, offset], (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(querySocialLinks, [userId], (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                })
            ])
            .then(([breeds, puppies, socialLinks]) => {
                res.render('puppy_sold_by_breed_and_gender', {
                    breed: {
                        name: breedData.name,
                        slug: breedData.slug
                    },
                    breeds: breeds.map(breed => ({
                        name: breed.name,
                        slug: breed.slug,
                        hasActivePuppies: breed.active_puppies_count > 0
                    })),
                    puppies: puppies.map(puppy => ({
                        name: puppy.puppy_name,
                        gender: puppy.puppy_gender,
                        breed: {
                            name: puppy.breed_name,
                            slug: puppy.breed_slug
                        },
                        type: puppy.puppy_breed_type,
                        color: puppy.puppy_color,
                        eyeColor: puppy.puppy_eye_color,
                        status: 'Vendu',
                        slug: puppy.puppy_slug,
                        image: {
                            path: puppy.optimized_image_path
                                ? `/uploads/optimized/${puppy.optimized_image_path}`
                                : `/uploads/${puppy.image_path}`,
                            alt: puppy.balise_alt
                        }
                    })),
                    activeBreed: breedSlug,
                    activeGender: gender,
                    selectedGender: {
                        value: gender,
                        param: genderParam,
                        label: genderLabel
                    },
                    currentPage,
                    totalPages,
                    totalItems,
                    socialLinks: socialLinks
                });
            })
            .catch(err => {
                console.error('Erreur lors du chargement des données :', err);
                res.redirect('/erreur');
            });
        });
    });
});

// router pour afficher la page de chiots à vendre par genre (fait)
router.get('/a-vendre/:gender(males|femelles)', (req, res) => {
    const userId = 10;
    const itemsPerPage = 6;
    const currentPage = parseInt(req.query.page) || 1;
    const genderParam = req.params.gender;
    const gender = genderParam === 'males' ? 'Mâle' : 'Femelle';
    const genderLabel = genderParam === 'males' ? 'Mâles' : 'Femelles';

    if (req.query.page === '0' || req.query.page === '1') {
        return res.redirect(`/chiots/a-vendre/${genderParam}`);
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
        SELECT COUNT(DISTINCT p.id) AS total
        FROM puppies p
        WHERE p.user_id = ?
        AND p.puppy_is_online = 1
        AND p.puppy_gender = ?
        AND p.sale_status IN ('available_for_reservation', 'for_sale', 'in_reservation', 'reserved')
    `;

    const queryBreeds = `
        SELECT 
            bn.name,
            bn.slug,
            (SELECT COUNT(*) 
             FROM puppies p 
             WHERE p.breed_id = bn.id 
             AND p.user_id = ? 
             AND p.puppy_is_online = 1 
             AND p.sale_status IN ('available_for_reservation', 'for_sale', 'in_reservation', 'reserved')
            ) AS active_puppies_count
        FROM breed_name bn
        WHERE bn.user_id = ?
        AND bn.is_online = 1
        ORDER BY bn.position ASC
    `;

    const queryPuppies = `
        SELECT 
            p.id,
            p.puppy_name,
            p.puppy_gender,
            p.puppy_breed_type,
            p.puppy_color,
            p.puppy_eye_color,
            p.price,
            p.sale_status,
            p.puppy_slug,
            bn.name AS breed_name,
            bn.slug AS breed_slug,
            pi.image_path,
            pi.optimized_image_path,
            pi.balise_alt,
            CASE p.sale_status
                WHEN 'available_for_reservation' THEN 1
                WHEN 'for_sale' THEN 2
                WHEN 'in_reservation' THEN 3
                WHEN 'reserved' THEN 4
                ELSE 5
            END AS status_order
        FROM puppies p
        LEFT JOIN breed_name bn ON p.breed_id = bn.id
        LEFT JOIN puppies_images pi ON pi.puppies_id = p.id
        AND pi.id = (
            SELECT MAX(id)
            FROM puppies_images
            WHERE puppies_id = p.id
        )
        WHERE p.user_id = ?
        AND p.puppy_is_online = 1
        AND p.puppy_gender = ?
        AND p.sale_status IN ('available_for_reservation', 'for_sale', 'in_reservation', 'reserved')
        ORDER BY status_order ASC, p.id DESC
        LIMIT ? OFFSET ?
    `;

    db.query(countQuery, [userId, gender], (err, countResult) => {
        if (err) {
            console.error('Erreur comptage chiots:', err);
            return res.redirect('/erreur');
        }

        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (currentPage > totalPages && totalPages > 0) {
            res.status(404);
            return res.redirect(`/chiots/a-vendre/${genderParam}?page=${totalPages}`);
        }

        const offset = (currentPage - 1) * itemsPerPage;

        Promise.all([
            new Promise((resolve, reject) => {
                db.query(queryBreeds, [userId, userId], (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(queryPuppies, [userId, gender, itemsPerPage, offset], (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(querySocialLinks, [userId], (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            })
        ])
        .then(([breeds, puppies, socialLinks]) => {
            res.render('puppy_for_sale_by_gender', {
                breeds: breeds.map(breed => ({
                    name: breed.name,
                    slug: breed.slug,
                    hasActivePuppies: breed.active_puppies_count > 0
                })),
                puppies: puppies.map(puppy => ({
                    name: puppy.puppy_name,
                    gender: puppy.puppy_gender,
                    breed: {
                        name: puppy.breed_name,
                        slug: puppy.breed_slug
                    },
                    type: puppy.puppy_breed_type,
                    color: puppy.puppy_color,
                    eyeColor: puppy.puppy_eye_color,
                    price: puppy.price,
                    status: (() => {
                        switch(puppy.sale_status) {
                            case 'for_sale': return 'À vendre';
                            case 'available_for_reservation': return 'Disponible à la réservation';
                            case 'in_reservation': return 'En cours de réservation';
                            case 'reserved': return 'Réservé';
                            default: return 'Statut inconnu';
                        }
                    })(),
                    slug: puppy.puppy_slug,
                    image: {
                        path: puppy.optimized_image_path
                            ? `/uploads/optimized/${puppy.optimized_image_path}`
                            : `/uploads/${puppy.image_path}`,
                        alt: puppy.balise_alt
                    }
                })),
                activeBreed: '',
                activeGender: gender,
                selectedGender: {
                    value: gender,
                    param: genderParam,
                    label: genderLabel
                },
                currentPage,
                totalPages,
                totalItems,
                socialLinks: socialLinks
            });
        })
        .catch(err => {
            console.error('Erreur:', err);
            res.redirect('/erreur');
        });
    });
});

 function getSaleStatus(saleStatus) {
    switch (saleStatus) {
      case 'for_sale':
        return 'À vendre';
      case 'available_for_reservation':
        return 'Disponible à la réservation';
      case 'in_reservation':
        return 'En cours de réservation';
      case 'reserved':
        return 'Réservé';
      default:
        return 'Statut inconnu';
    }
 }

// router pour afficher la page de détail d'un chiot à vendre
router.get('/a-vendre/:breedSlug/:slug', (req, res) => {
    const userId = 10;
    const {
        breedSlug,
        slug
    } = req.params;

    const queryBreedCheck = `
        SELECT id FROM breed_name 
        WHERE slug = ? AND user_id = ? AND is_online = 1
        LIMIT 1
    `;

    db.query(queryBreedCheck, [breedSlug, userId], (err, breedResult) => {
        if (err || !breedResult.length) {
            console.error('Race non trouvée:', err);
            return res.redirect('/erreur');
        }

        const breedId = breedResult[0].id;

        const queryPuppy = `
    SELECT 
        -- Puppy information
        p.*, 
        bn.name AS breed_name,
        bn.slug AS breed_slug,
        cn.name AS country_name,
        rn.name AS register_name,

        -- Father information from animals
        father.id AS father_id,
        father.name AS father_name,
        father.gender AS father_gender,
        father.breed_type AS father_breed_type,
        father.coat_type AS father_coat_type,
        father.color AS father_color,
        father.eye_color AS father_eye_color,
        father.in_breeding AS father_in_breeding,
        father_bn.name AS father_breed_name,
        father_bn.slug AS father_breed_slug,
        father_rn.name AS father_register_name,
        father_img.image_path AS father_image_path,
        father_img.optimized_image_path AS father_optimized_image_path,
        father_img.balise_alt AS father_image_alt,

        -- Mother information from animals
        mother.id AS mother_id,
        mother.name AS mother_name,
        mother.gender AS mother_gender,
        mother.breed_type AS mother_breed_type,
        mother.coat_type AS mother_coat_type,
        mother.color AS mother_color,
        mother.eye_color AS mother_eye_color,
        mother.in_breeding AS mother_in_breeding,
        mother_bn.name AS mother_breed_name,
        mother_bn.slug AS mother_breed_slug,
        mother_rn.name AS mother_register_name,
        mother_img.image_path AS mother_image_path,
        mother_img.optimized_image_path AS mother_optimized_image_path,
        mother_img.balise_alt AS mother_image_alt,

        -- Father's father information from father_table
        gfather.father_name AS grandfather_name,
        gfather.father_gender AS grandfather_gender,
        gfather.father_breed_type AS grandfather_breed_type,
        gfather.father_coat_type AS grandfather_coat_type,
        gfather.father_color AS grandfather_color,
        gfather.father_eye_color AS grandfather_eye_color,
        gfather.father_is_online AS grandfather_is_online,
        gfather_bn.name AS grandfather_breed_name,
        gfather_rn.name AS grandfather_register_name,
        gfather_img.image_path AS grandfather_image_path,
        gfather_img.optimized_image_path AS grandfather_optimized_image_path,

        -- Father's mother information from mother_table
        gmother.mother_name AS grandmother_name,
        gmother.mother_gender AS grandmother_gender,
        gmother.mother_breed_type AS grandmother_breed_type,
        gmother.mother_coat_type AS grandmother_coat_type,
        gmother.mother_color AS grandmother_color,
        gmother.mother_eye_color AS grandmother_eye_color,
        gmother.mother_is_online AS grandmother_is_online,
        gmother_bn.name AS grandmother_breed_name,
        gmother_rn.name AS grandmother_register_name,
        gmother_img.image_path AS grandmother_image_path,
        gmother_img.optimized_image_path AS grandmother_optimized_image_path,

        -- Mother's father information (maternal grandfather)
        mgfather.father_name AS maternal_grandfather_name,
        mgfather.father_gender AS maternal_grandfather_gender,
        mgfather.father_breed_type AS maternal_grandfather_breed_type,
        mgfather.father_coat_type AS maternal_grandfather_coat_type,
        mgfather.father_color AS maternal_grandfather_color,
        mgfather.father_eye_color AS maternal_grandfather_eye_color,
        mgfather.father_is_online AS maternal_grandfather_is_online,
        mgfather_bn.name AS maternal_grandfather_breed_name,
        mgfather_rn.name AS maternal_grandfather_register_name,
        mgfather_img.image_path AS maternal_grandfather_image_path,
        mgfather_img.optimized_image_path AS maternal_grandfather_optimized_image_path,

        -- Mother's mother information (maternal grandmother)
        mgmother.mother_name AS maternal_grandmother_name,
        mgmother.mother_gender AS maternal_grandmother_gender,
        mgmother.mother_breed_type AS maternal_grandmother_breed_type,
        mgmother.mother_coat_type AS maternal_grandmother_coat_type,
        mgmother.mother_color AS maternal_grandmother_color,
        mgmother.mother_eye_color AS maternal_grandmother_eye_color,
        mgmother.mother_is_online AS maternal_grandmother_is_online,
        mgmother_bn.name AS maternal_grandmother_breed_name,
        mgmother_rn.name AS maternal_grandmother_register_name,
        mgmother_img.image_path AS maternal_grandmother_image_path,
        mgmother_img.optimized_image_path AS maternal_grandmother_optimized_image_path

    FROM puppies p
    LEFT JOIN breed_name bn ON p.breed_id = bn.id
    LEFT JOIN country_name cn ON p.country_id = cn.id
    LEFT JOIN register_name rn ON p.register_id = rn.id

    -- Father joins
    LEFT JOIN animals father ON p.father_id = father.id
    LEFT JOIN breed_name father_bn ON father.breed_id = father_bn.id
    LEFT JOIN register_name father_rn ON father.register_id = father_rn.id
    LEFT JOIN images father_img ON father_img.animal_id = father.id
        AND father_img.id = (SELECT MIN(id) FROM images WHERE animal_id = father.id)

    -- Mother joins
    LEFT JOIN animals mother ON p.mother_id = mother.id
    LEFT JOIN breed_name mother_bn ON mother.breed_id = mother_bn.id
    LEFT JOIN register_name mother_rn ON mother.register_id = mother_rn.id
    LEFT JOIN images mother_img ON mother_img.animal_id = mother.id
        AND mother_img.id = (SELECT MIN(id) FROM images WHERE animal_id = mother.id)

    -- Paternal Grandfather joins
    LEFT JOIN father_table gfather ON father.father_id = gfather.id
    LEFT JOIN breed_name gfather_bn ON gfather.breed_id = gfather_bn.id
    LEFT JOIN register_name gfather_rn ON gfather.register_id = gfather_rn.id
    LEFT JOIN images_father gfather_img ON gfather_img.father_id = gfather.id
        AND gfather_img.id = (SELECT MIN(id) FROM images_father WHERE father_id = gfather.id)

    -- Paternal Grandmother joins
    LEFT JOIN mother_table gmother ON father.mother_id = gmother.id
    LEFT JOIN breed_name gmother_bn ON gmother.breed_id = gmother_bn.id
    LEFT JOIN register_name gmother_rn ON gmother.register_id = gmother_rn.id
    LEFT JOIN images_mother gmother_img ON gmother_img.mother_id = gmother.id
        AND gmother_img.id = (SELECT MIN(id) FROM images_mother WHERE mother_id = gmother.id)

    -- Maternal Grandfather joins
    LEFT JOIN father_table mgfather ON mother.father_id = mgfather.id
    LEFT JOIN breed_name mgfather_bn ON mgfather.breed_id = mgfather_bn.id
    LEFT JOIN register_name mgfather_rn ON mgfather.register_id = mgfather_rn.id
    LEFT JOIN images_father mgfather_img ON mgfather_img.father_id = mgfather.id
        AND mgfather_img.id = (SELECT MIN(id) FROM images_father WHERE father_id = mgfather.id)

    -- Maternal Grandmother joins
    LEFT JOIN mother_table mgmother ON mother.mother_id = mgmother.id
    LEFT JOIN breed_name mgmother_bn ON mgmother.breed_id = mgmother_bn.id
    LEFT JOIN register_name mgmother_rn ON mgmother.register_id = mgmother_rn.id
    LEFT JOIN images_mother mgmother_img ON mgmother_img.mother_id = mgmother.id
        AND mgmother_img.id = (SELECT MIN(id) FROM images_mother WHERE mother_id = mgmother.id)

    WHERE p.user_id = ?
    AND p.puppy_slug = ?
    AND p.breed_id = ?
    AND p.puppy_is_online = 1
    AND p.sale_status IN ('available_for_reservation', 'for_sale', 'in_reservation', 'reserved', 'sold')
    LIMIT 1
`;

        const querySiblings = `
        SELECT 
            p.puppy_name,
            p.puppy_gender,
            p.puppy_breed_type,
            p.puppy_color,
            p.puppy_slug,
            p.sale_status,
            bn.name AS breed_name,
            bn.slug AS breed_slug,
            img.image_path,
            img.optimized_image_path,
            img.balise_alt
        FROM puppies p
        LEFT JOIN breed_name bn ON p.breed_id = bn.id
        LEFT JOIN puppies_images img ON img.puppies_id = p.id
            AND img.id = (SELECT MIN(id) FROM puppies_images WHERE puppies_id = p.id)
        WHERE p.marriage_id = ?
        AND p.id != ?
        AND p.puppy_is_online = 1
        ORDER BY p.puppy_name ASC
        `;

        db.query(queryPuppy, [userId, slug, breedId], (err, puppyResult) => {
            if (err) {
                console.error('Erreur lors de la récupération du chiot:', err);
                return res.redirect('/erreur');
            }

            if (!puppyResult.length) {
                console.error('Chiot non trouvé');
                return res.redirect('/erreur');
            }

            const puppy = puppyResult[0];

            if (puppy.sale_status === 'sold') {
                return res.redirect(301, `/chiots/produits/${breedSlug}/${slug}`);
              }

              const queryPuppyImages = `
              SELECT 
                  image_path,
                  optimized_image_path,
                  balise_alt
              FROM puppies_images
              WHERE puppies_id = ?
              ORDER BY id DESC
          `;

            db.query(queryPuppyImages, [puppy.id], (err, images) => {
                if (err) {
                    console.error('Erreur lors de la récupération des images:', err);
                    return res.redirect('/erreur');
                }

                db.query(querySiblings, [puppy.marriage_id, puppy.id], (err, siblings) => {
                    if (err) {
                        console.error('Erreur lors de la récupération des frères et sœurs:', err);
                        return res.redirect('/erreur');
                    }

                    const birthDate = new Date(puppy.puppy_birth_date);
                    const today = new Date();
                    const ageInMonths = Math.floor((today - birthDate) / (1000 * 60 * 60 * 24 * 30.44));

                    const availableDate = puppy.available_date ? new Date(puppy.available_date) : null;
                    const formattedAvailableDate = availableDate ? new Intl.DateTimeFormat('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    }).format(availableDate) : null;

                    const firstImage = images.length > 0 ? images[0] : null;

                    res.render('puppy_detail', {
                        puppy: {
                            name: puppy.puppy_name,
                            age: ageInMonths,
                            price: puppy.price,
                            gender: puppy.puppy_gender,
                            slug: puppy.puppy_slug,
                            availableDate: formattedAvailableDate,
                            breed: {
                                name: puppy.breed_name,
                                slug: puppy.breed_slug,
                                type: puppy.puppy_breed_type
                            },
                            eyeColor: puppy.puppy_eye_color,
                            color: puppy.puppy_color,
                            coatType: puppy.puppy_coat_type,
                            country: puppy.country_name,
                            likes: puppy.likes,
                            register: {
                                name: puppy.register_name,
                            },
                            description: puppy.puppy_description_animals,
                            status: (() => {
                                switch (puppy.sale_status) {
                                    case 'for_sale':
                                        return 'À vendre';
                                    case 'available_for_reservation':
                                        return 'Disponible à la réservation';
                                    case 'in_reservation':
                                        return 'En cours de réservation';
                                    case 'reserved':
                                        return 'Réservé';
                                    default:
                                        return 'Statut inconnu';
                                }
                            })()
                        },
                        father: puppy.father_name ? {
                            name: puppy.father_name,
                            gender: puppy.father_gender,
                            breed: {
                                name: puppy.father_breed_name,
                                type: puppy.father_breed_type,
                                slug: puppy.father_breed_slug
                            },
                            coatType: puppy.father_coat_type,
                            color: puppy.father_color,
                            eyeColor: puppy.father_eye_color,
                            register: puppy.father_register_name,
                            inBreeding: puppy.father_in_breeding === 1,
                            image: {
                                path: puppy.father_optimized_image_path ?
                                    `/uploads/optimized/${puppy.father_optimized_image_path}` : `/uploads/${puppy.father_image_path}`,
                                alt: puppy.father_image_alt
                            }
                        } : null,
                        mother: puppy.mother_name ? {
                            name: puppy.mother_name,
                            gender: puppy.mother_gender,
                            breed: {
                                name: puppy.mother_breed_name,
                                type: puppy.mother_breed_type,
                                slug: puppy.mother_breed_slug
                            },
                            coatType: puppy.mother_coat_type,
                            color: puppy.mother_color,
                            eyeColor: puppy.mother_eye_color,
                            register: puppy.mother_register_name,
                            inBreeding: puppy.mother_in_breeding === 1,
                            image: {
                                path: puppy.mother_optimized_image_path ?
                                    `/uploads/optimized/${puppy.mother_optimized_image_path}` : `/uploads/${puppy.mother_image_path}`,
                                alt: puppy.mother_image_alt
                            }
                        } : null,
                        grandparents: {
                            grandfather: puppy.grandfather_name ? {
                                name: puppy.grandfather_name,
                                gender: puppy.grandfather_gender,
                                breed: {
                                    name: puppy.grandfather_breed_name,
                                    type: puppy.grandfather_breed_type
                                },
                                coatType: puppy.grandfather_coat_type,
                                color: puppy.grandfather_color,
                                eyeColor: puppy.grandfather_eye_color,
                                register: puppy.grandfather_register_name,
                                inBreeding: puppy.grandfather_is_online === 1,
                                image: {
                                    path: puppy.grandfather_optimized_image_path ?
                                        `/uploads/optimized/${puppy.grandfather_optimized_image_path}` : `/uploads/${puppy.grandfather_image_path}`,
                                    alt: puppy.grandfather_image_alt
                                }
                            } : null,
                            grandmother: puppy.grandmother_name ? {
                                name: puppy.grandmother_name,
                                gender: puppy.grandmother_gender,
                                breed: {
                                    name: puppy.grandmother_breed_name,
                                    type: puppy.grandmother_breed_type
                                },
                                coatType: puppy.grandmother_coat_type,
                                color: puppy.grandmother_color,
                                eyeColor: puppy.grandmother_eye_color,
                                register: puppy.grandmother_register_name,
                                inBreeding: puppy.grandmother_is_online === 1,
                                image: {
                                    path: puppy.grandmother_optimized_image_path ?
                                        `/uploads/optimized/${puppy.grandmother_optimized_image_path}` : `/uploads/${puppy.grandmother_image_path}`,
                                    alt: puppy.grandmother_image_alt
                                }
                            } : null
                        },
                        maternal_grandparents: {
                            grandfather: puppy.maternal_grandfather_name ? {
                                name: puppy.maternal_grandfather_name,
                                gender: puppy.maternal_grandfather_gender,
                                breed: {
                                    name: puppy.maternal_grandfather_breed_name,
                                    type: puppy.maternal_grandfather_breed_type
                                },
                                coatType: puppy.maternal_grandfather_coat_type,
                                color: puppy.maternal_grandfather_color,
                                eyeColor: puppy.maternal_grandfather_eye_color,
                                register: puppy.maternal_grandfather_register_name,
                                inBreeding: puppy.maternal_grandfather_is_online === 1,
                                image: {
                                    path: puppy.maternal_grandfather_optimized_image_path ?
                                        `/uploads/optimized/${puppy.maternal_grandfather_optimized_image_path}` : `/uploads/${puppy.maternal_grandfather_image_path}`,
                                    alt: puppy.maternal_grandfather_image_alt
                                }
                            } : null,
                            grandmother: puppy.maternal_grandmother_name ? {
                                name: puppy.maternal_grandmother_name,
                                gender: puppy.maternal_grandmother_gender,
                                breed: {
                                    name: puppy.maternal_grandmother_breed_name,
                                    type: puppy.maternal_grandmother_breed_type
                                },
                                coatType: puppy.maternal_grandmother_coat_type,
                                color: puppy.maternal_grandmother_color,
                                eyeColor: puppy.maternal_grandmother_eye_color,
                                register: puppy.maternal_grandmother_register_name,
                                inBreeding: puppy.maternal_grandmother_is_online === 1,
                                image: {
                                    path: puppy.maternal_grandmother_optimized_image_path ?
                                        `/uploads/optimized/${puppy.maternal_grandmother_optimized_image_path}` : `/uploads/${puppy.maternal_grandmother_image_path}`,
                                    alt: puppy.maternal_grandmother_image_alt
                                }
                            } : null
                        },
                        images: images.map(img => ({
                            path: img.optimized_image_path ?
                                `/uploads/optimized/${img.optimized_image_path}` : `/uploads/${img.image_path}`,
                            alt: img.balise_alt
                        })),
                        siblings: siblings.map(sibling => ({
                            name: sibling.puppy_name,
                            gender: sibling.puppy_gender,
                            breed: {
                                name: sibling.breed_name,
                                slug: sibling.breed_slug,
                                type: sibling.puppy_breed_type
                            },
                            color: sibling.puppy_color,
                            slug: sibling.puppy_slug,
                            status: sibling.sale_status,
                            image: {
                                path: sibling.optimized_image_path 
                                    ? `/uploads/optimized/${sibling.optimized_image_path}`
                                    : `/uploads/${sibling.image_path}`,
                                alt: sibling.balise_alt
                            }
                         })),
                        ogImage: firstImage ? `/uploads/optimized/${firstImage.optimized_image_path || firstImage.image_path}` : null
                    });
                });
            });
        });
    });
});

// router pour afficher la page de détail d'un chiot vendu
router.get('/produits/:breedSlug/:slug', (req, res) => {
    const userId = 10;
    const {
        breedSlug,
        slug
    } = req.params;

    const queryBreedCheck = `
        SELECT id FROM breed_name 
        WHERE slug = ? AND user_id = ? AND is_online = 1
        LIMIT 1
    `;

    db.query(queryBreedCheck, [breedSlug, userId], (err, breedResult) => {
        if (err || !breedResult.length) {
            console.error('Race non trouvée:', err);
            return res.redirect('/erreur');
        }

        const breedId = breedResult[0].id;

        const queryPuppy = `
    SELECT 
        -- Puppy information
        p.*, 
        bn.name AS breed_name,
        bn.slug AS breed_slug,
        cn.name AS country_name,
        rn.name AS register_name,

        -- Father information from animals
        father.id AS father_id,
        father.name AS father_name,
        father.gender AS father_gender,
        father.breed_type AS father_breed_type,
        father.coat_type AS father_coat_type,
        father.color AS father_color,
        father.eye_color AS father_eye_color,
        father.in_breeding AS father_in_breeding,
        father_bn.name AS father_breed_name,
        father_rn.name AS father_register_name,
        father_img.image_path AS father_image_path,
        father_img.optimized_image_path AS father_optimized_image_path,
        father_img.balise_alt AS father_image_alt,

        -- Mother information from animals
        mother.id AS mother_id,
        mother.name AS mother_name,
        mother.gender AS mother_gender,
        mother.breed_type AS mother_breed_type,
        mother.coat_type AS mother_coat_type,
        mother.color AS mother_color,
        mother.eye_color AS mother_eye_color,
        mother.in_breeding AS mother_in_breeding,
        mother_bn.name AS mother_breed_name,
        mother_rn.name AS mother_register_name,
        mother_img.image_path AS mother_image_path,
        mother_img.optimized_image_path AS mother_optimized_image_path,
        mother_img.balise_alt AS mother_image_alt,

        -- Father's father information from father_table
        gfather.father_name AS grandfather_name,
        gfather.father_gender AS grandfather_gender,
        gfather.father_breed_type AS grandfather_breed_type,
        gfather.father_coat_type AS grandfather_coat_type,
        gfather.father_color AS grandfather_color,
        gfather.father_eye_color AS grandfather_eye_color,
        gfather.father_is_online AS grandfather_is_online,
        gfather_bn.name AS grandfather_breed_name,
        gfather_rn.name AS grandfather_register_name,
        gfather_img.image_path AS grandfather_image_path,
        gfather_img.optimized_image_path AS grandfather_optimized_image_path,

        -- Father's mother information from mother_table
        gmother.mother_name AS grandmother_name,
        gmother.mother_gender AS grandmother_gender,
        gmother.mother_breed_type AS grandmother_breed_type,
        gmother.mother_coat_type AS grandmother_coat_type,
        gmother.mother_color AS grandmother_color,
        gmother.mother_eye_color AS grandmother_eye_color,
        gmother.mother_is_online AS grandmother_is_online,
        gmother_bn.name AS grandmother_breed_name,
        gmother_rn.name AS grandmother_register_name,
        gmother_img.image_path AS grandmother_image_path,
        gmother_img.optimized_image_path AS grandmother_optimized_image_path,

        -- Mother's father information (maternal grandfather)
        mgfather.father_name AS maternal_grandfather_name,
        mgfather.father_gender AS maternal_grandfather_gender,
        mgfather.father_breed_type AS maternal_grandfather_breed_type,
        mgfather.father_coat_type AS maternal_grandfather_coat_type,
        mgfather.father_color AS maternal_grandfather_color,
        mgfather.father_eye_color AS maternal_grandfather_eye_color,
        mgfather.father_is_online AS maternal_grandfather_is_online,
        mgfather_bn.name AS maternal_grandfather_breed_name,
        mgfather_rn.name AS maternal_grandfather_register_name,
        mgfather_img.image_path AS maternal_grandfather_image_path,
        mgfather_img.optimized_image_path AS maternal_grandfather_optimized_image_path,

        -- Mother's mother information (maternal grandmother)
        mgmother.mother_name AS maternal_grandmother_name,
        mgmother.mother_gender AS maternal_grandmother_gender,
        mgmother.mother_breed_type AS maternal_grandmother_breed_type,
        mgmother.mother_coat_type AS maternal_grandmother_coat_type,
        mgmother.mother_color AS maternal_grandmother_color,
        mgmother.mother_eye_color AS maternal_grandmother_eye_color,
        mgmother.mother_is_online AS maternal_grandmother_is_online,
        mgmother_bn.name AS maternal_grandmother_breed_name,
        mgmother_rn.name AS maternal_grandmother_register_name,
        mgmother_img.image_path AS maternal_grandmother_image_path,
        mgmother_img.optimized_image_path AS maternal_grandmother_optimized_image_path

    FROM puppies p
    LEFT JOIN breed_name bn ON p.breed_id = bn.id
    LEFT JOIN country_name cn ON p.country_id = cn.id
    LEFT JOIN register_name rn ON p.register_id = rn.id

    -- Father joins
    LEFT JOIN animals father ON p.father_id = father.id
    LEFT JOIN breed_name father_bn ON father.breed_id = father_bn.id
    LEFT JOIN register_name father_rn ON father.register_id = father_rn.id
    LEFT JOIN images father_img ON father_img.animal_id = father.id
        AND father_img.id = (SELECT MIN(id) FROM images WHERE animal_id = father.id)

    -- Mother joins
    LEFT JOIN animals mother ON p.mother_id = mother.id
    LEFT JOIN breed_name mother_bn ON mother.breed_id = mother_bn.id
    LEFT JOIN register_name mother_rn ON mother.register_id = mother_rn.id
    LEFT JOIN images mother_img ON mother_img.animal_id = mother.id
        AND mother_img.id = (SELECT MIN(id) FROM images WHERE animal_id = mother.id)

    -- Paternal Grandfather joins
    LEFT JOIN father_table gfather ON father.father_id = gfather.id
    LEFT JOIN breed_name gfather_bn ON gfather.breed_id = gfather_bn.id
    LEFT JOIN register_name gfather_rn ON gfather.register_id = gfather_rn.id
    LEFT JOIN images_father gfather_img ON gfather_img.father_id = gfather.id
        AND gfather_img.id = (SELECT MIN(id) FROM images_father WHERE father_id = gfather.id)

    -- Paternal Grandmother joins
    LEFT JOIN mother_table gmother ON father.mother_id = gmother.id
    LEFT JOIN breed_name gmother_bn ON gmother.breed_id = gmother_bn.id
    LEFT JOIN register_name gmother_rn ON gmother.register_id = gmother_rn.id
    LEFT JOIN images_mother gmother_img ON gmother_img.mother_id = gmother.id
        AND gmother_img.id = (SELECT MIN(id) FROM images_mother WHERE mother_id = gmother.id)

    -- Maternal Grandfather joins
    LEFT JOIN father_table mgfather ON mother.father_id = mgfather.id
    LEFT JOIN breed_name mgfather_bn ON mgfather.breed_id = mgfather_bn.id
    LEFT JOIN register_name mgfather_rn ON mgfather.register_id = mgfather_rn.id
    LEFT JOIN images_father mgfather_img ON mgfather_img.father_id = mgfather.id
        AND mgfather_img.id = (SELECT MIN(id) FROM images_father WHERE father_id = mgfather.id)

    -- Maternal Grandmother joins
    LEFT JOIN mother_table mgmother ON mother.mother_id = mgmother.id
    LEFT JOIN breed_name mgmother_bn ON mgmother.breed_id = mgmother_bn.id
    LEFT JOIN register_name mgmother_rn ON mgmother.register_id = mgmother_rn.id
    LEFT JOIN images_mother mgmother_img ON mgmother_img.mother_id = mgmother.id
        AND mgmother_img.id = (SELECT MIN(id) FROM images_mother WHERE mother_id = mgmother.id)

    WHERE p.user_id = ?
    AND p.puppy_slug = ?
    AND p.breed_id = ?
    AND p.puppy_is_online = 1
    AND p.sale_status IN ('available_for_reservation', 'for_sale', 'in_reservation', 'reserved', 'sold')
    LIMIT 1
`;

        const querySiblings = `
        SELECT 
            p.puppy_name,
            p.puppy_gender,
            p.puppy_breed_type,
            p.puppy_color,
            p.puppy_slug,
            p.sale_status,
            bn.name AS breed_name,
            bn.slug AS breed_slug,
            img.image_path,
            img.optimized_image_path,
            img.balise_alt
        FROM puppies p
        LEFT JOIN breed_name bn ON p.breed_id = bn.id
        LEFT JOIN puppies_images img ON img.puppies_id = p.id
           AND img.id = (SELECT MAX(id) FROM puppies_images WHERE puppies_id = p.id)
        WHERE p.marriage_id = ?
        AND p.id != ?
        AND p.puppy_is_online = 1
        ORDER BY p.puppy_name ASC
        `;

        db.query(queryPuppy, [userId, slug, breedId], (err, puppyResult) => {
            if (err) {
                console.error('Erreur lors de la récupération du chiot:', err);
                return res.redirect('/erreur');
            }

            if (!puppyResult.length) {
                console.error('Chiot non trouvé');
                return res.redirect('/erreur');
            }

            const puppy = puppyResult[0];

            if (puppy.sale_status !== 'sold') {
                return res.redirect(301, `/chiots/a-vendre/${breedSlug}/${slug}`);
            }

            const queryPuppyImages = `
                SELECT 
                    image_path,
                    optimized_image_path,
                    balise_alt
                FROM puppies_images
                WHERE puppies_id = ?
                ORDER BY id ASC
            `;

            db.query(queryPuppyImages, [puppy.id], (err, images) => {
                if (err) {
                    console.error('Erreur lors de la récupération des images:', err);
                    return res.redirect('/erreur');
                }

                db.query(querySiblings, [puppy.marriage_id, puppy.id], (err, siblings) => {
                    if (err) {
                        console.error('Erreur lors de la récupération des frères et sœurs:', err);
                        return res.redirect('/erreur');
                    }

                    const birthDate = new Date(puppy.puppy_birth_date);
                    const today = new Date();
                    const ageInMonths = Math.floor((today - birthDate) / (1000 * 60 * 60 * 24 * 30.44));

                    const availableDate = puppy.available_date ? new Date(puppy.available_date) : null;
                    const formattedAvailableDate = availableDate ? new Intl.DateTimeFormat('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    }).format(availableDate) : null;

                    const firstImage = images.length > 0 ? images[0] : null;

                    res.render('puppy_sold_detail', {
                        puppy: {
                            name: puppy.puppy_name,
                            age: ageInMonths,
                            gender: puppy.puppy_gender,
                            slug: puppy.puppy_slug,
                            availableDate: formattedAvailableDate,
                            breed: {
                                name: puppy.breed_name,
                                slug: puppy.breed_slug,
                                type: puppy.puppy_breed_type
                            },
                            eyeColor: puppy.puppy_eye_color,
                            color: puppy.puppy_color,
                            coatType: puppy.puppy_coat_type,
                            country: puppy.country_name,
                            register: {
                                name: puppy.register_name,
                            },
                            description: puppy.puppy_description_animals,
                            status: (() => {
                                switch (puppy.sale_status) {
                                    case 'sold':
                                        return 'Vendu';
                                }
                            })()
                        },
                        father: puppy.father_name ? {
                            name: puppy.father_name,
                            gender: puppy.father_gender,
                            breed: {
                                name: puppy.father_breed_name,
                                type: puppy.father_breed_type
                            },
                            coatType: puppy.father_coat_type,
                            color: puppy.father_color,
                            eyeColor: puppy.father_eye_color,
                            register: puppy.father_register_name,
                            inBreeding: puppy.father_in_breeding === 1,
                            image: {
                                path: puppy.father_optimized_image_path ?
                                    `/uploads/optimized/${puppy.father_optimized_image_path}` : `/uploads/${puppy.father_image_path}`,
                                alt: puppy.father_image_alt
                            }
                        } : null,
                        mother: puppy.mother_name ? {
                            name: puppy.mother_name,
                            gender: puppy.mother_gender,
                            breed: {
                                name: puppy.mother_breed_name,
                                type: puppy.mother_breed_type
                            },
                            coatType: puppy.mother_coat_type,
                            color: puppy.mother_color,
                            eyeColor: puppy.mother_eye_color,
                            register: puppy.mother_register_name,
                            inBreeding: puppy.mother_in_breeding === 1,
                            image: {
                                path: puppy.mother_optimized_image_path ?
                                    `/uploads/optimized/${puppy.mother_optimized_image_path}` : `/uploads/${puppy.mother_image_path}`,
                                alt: puppy.mother_image_alt
                            }
                        } : null,
                        grandparents: {
                            grandfather: puppy.grandfather_name ? {
                                name: puppy.grandfather_name,
                                gender: puppy.grandfather_gender,
                                breed: {
                                    name: puppy.grandfather_breed_name,
                                    type: puppy.grandfather_breed_type
                                },
                                coatType: puppy.grandfather_coat_type,
                                color: puppy.grandfather_color,
                                eyeColor: puppy.grandfather_eye_color,
                                register: puppy.grandfather_register_name,
                                inBreeding: puppy.grandfather_is_online === 1,
                                image: {
                                    path: puppy.grandfather_optimized_image_path ?
                                        `/uploads/optimized/${puppy.grandfather_optimized_image_path}` : `/uploads/${puppy.grandfather_image_path}`,
                                    alt: puppy.grandfather_image_alt
                                }
                            } : null,
                            grandmother: puppy.grandmother_name ? {
                                name: puppy.grandmother_name,
                                gender: puppy.grandmother_gender,
                                breed: {
                                    name: puppy.grandmother_breed_name,
                                    type: puppy.grandmother_breed_type
                                },
                                coatType: puppy.grandmother_coat_type,
                                color: puppy.grandmother_color,
                                eyeColor: puppy.grandmother_eye_color,
                                register: puppy.grandmother_register_name,
                                inBreeding: puppy.grandmother_is_online === 1,
                                image: {
                                    path: puppy.grandmother_optimized_image_path ?
                                        `/uploads/optimized/${puppy.grandmother_optimized_image_path}` : `/uploads/${puppy.grandmother_image_path}`,
                                    alt: puppy.grandmother_image_alt
                                }
                            } : null
                        },
                        maternal_grandparents: {
                            grandfather: puppy.maternal_grandfather_name ? {
                                name: puppy.maternal_grandfather_name,
                                gender: puppy.maternal_grandfather_gender,
                                breed: {
                                    name: puppy.maternal_grandfather_breed_name,
                                    type: puppy.maternal_grandfather_breed_type
                                },
                                coatType: puppy.maternal_grandfather_coat_type,
                                color: puppy.maternal_grandfather_color,
                                eyeColor: puppy.maternal_grandfather_eye_color,
                                register: puppy.maternal_grandfather_register_name,
                                inBreeding: puppy.maternal_grandfather_is_online === 1,
                                image: {
                                    path: puppy.maternal_grandfather_optimized_image_path ?
                                        `/uploads/optimized/${puppy.maternal_grandfather_optimized_image_path}` : `/uploads/${puppy.maternal_grandfather_image_path}`,
                                    alt: puppy.maternal_grandfather_image_alt
                                }
                            } : null,
                            grandmother: puppy.maternal_grandmother_name ? {
                                name: puppy.maternal_grandmother_name,
                                gender: puppy.maternal_grandmother_gender,
                                breed: {
                                    name: puppy.maternal_grandmother_breed_name,
                                    type: puppy.maternal_grandmother_breed_type
                                },
                                coatType: puppy.maternal_grandmother_coat_type,
                                color: puppy.maternal_grandmother_color,
                                eyeColor: puppy.maternal_grandmother_eye_color,
                                register: puppy.maternal_grandmother_register_name,
                                inBreeding: puppy.maternal_grandmother_is_online === 1,
                                image: {
                                    path: puppy.maternal_grandmother_optimized_image_path ?
                                        `/uploads/optimized/${puppy.maternal_grandmother_optimized_image_path}` : `/uploads/${puppy.maternal_grandmother_image_path}`,
                                    alt: puppy.maternal_grandmother_image_alt
                                }
                            } : null
                        },
                        images: images.map(img => ({
                            path: img.optimized_image_path ?
                                `/uploads/optimized/${img.optimized_image_path}` : `/uploads/${img.image_path}`,
                            alt: img.balise_alt
                        })),
                        siblings: siblings.map(sibling => ({
                            name: sibling.puppy_name,
                            gender: sibling.puppy_gender,
                            breed: {
                                name: sibling.breed_name,
                                slug: sibling.breed_slug,
                                type: sibling.puppy_breed_type
                            },
                            color: sibling.puppy_color,
                            slug: sibling.puppy_slug,
                            status: sibling.sale_status,
                            image: {
                                path: sibling.optimized_image_path 
                                    ? `/uploads/optimized/${sibling.optimized_image_path}`
                                    : `/uploads/${sibling.image_path}`,
                                alt: sibling.balise_alt
                            }
                         })),
                        ogImage: firstImage ? `/uploads/optimized/${firstImage.optimized_image_path || firstImage.image_path}` : null
                    });
                });
            });
        });
    });
});

// router pour afficher la page de chiots produits par genre (fait)
router.get('/produits/:gender(males|femelles)', (req, res) => {
    const userId = 10;
    const itemsPerPage = 6;
    const currentPage = parseInt(req.query.page) || 1;
    const genderParam = req.params.gender;
    const gender = genderParam === 'males' ? 'Mâle' : 'Femelle';
    const genderLabel = genderParam === 'males' ? 'Mâles' : 'Femelles';

    if (req.query.page === '0' || req.query.page === '1') {
        return res.redirect(`/chiots/produits/${genderParam}`);
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
        SELECT COUNT(DISTINCT p.id) AS total
        FROM puppies p
        WHERE p.user_id = ?
        AND p.puppy_is_online = 1
        AND p.puppy_gender = ?
        AND p.sale_status = 'sold'
    `;

    const queryBreeds = `
        SELECT 
            bn.name,
            bn.slug,
            (SELECT COUNT(*) 
             FROM puppies p 
             WHERE p.breed_id = bn.id 
             AND p.user_id = ? 
             AND p.puppy_is_online = 1 
             AND p.sale_status = 'sold'
            ) AS active_puppies_count
        FROM breed_name bn
        WHERE bn.user_id = ?
        AND bn.is_online = 1
        ORDER BY bn.position ASC
    `;

    const queryPuppies = `
        SELECT 
            p.id,
            p.puppy_name,
            p.puppy_gender,
            p.puppy_breed_type,
            p.puppy_color,
            p.puppy_eye_color,
            p.sale_status,
            p.puppy_slug,
            bn.name AS breed_name,
            bn.slug AS breed_slug,
            pi.image_path,
            pi.optimized_image_path,
            pi.balise_alt
        FROM puppies p
        LEFT JOIN breed_name bn ON p.breed_id = bn.id
        LEFT JOIN puppies_images pi ON pi.puppies_id = p.id
        AND pi.id = (
            SELECT MIN(id)
            FROM puppies_images
            WHERE puppies_id = p.id
        )
        WHERE p.user_id = ?
        AND p.puppy_is_online = 1
        AND p.puppy_gender = ?
        AND p.sale_status = 'sold'
        ORDER BY p.id DESC
        LIMIT ? OFFSET ?
    `;

    db.query(countQuery, [userId, gender], (err, countResult) => {
        if (err) {
            console.error('Erreur lors du comptage des chiots produits :', err);
            return res.redirect('/erreur');
        }

        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (currentPage > totalPages && totalPages > 0) {
            res.status(404);
            return res.redirect(`/chiots/produits/${genderParam}?page=${totalPages}`);
        }

        const offset = (currentPage - 1) * itemsPerPage;

        Promise.all([
            new Promise((resolve, reject) => {
                db.query(queryBreeds, [userId, userId], (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(queryPuppies, [userId, gender, itemsPerPage, offset], (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(querySocialLinks, [userId], (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            })
        ])
        .then(([breeds, puppies, socialLinks]) => {
            res.render('puppy_sold_by_gender', {
                breeds: breeds.map(breed => ({
                    name: breed.name,
                    slug: breed.slug,
                    hasActivePuppies: breed.active_puppies_count > 0
                })),
                puppies: puppies.map(puppy => ({
                    name: puppy.puppy_name,
                    gender: puppy.puppy_gender,
                    breed: {
                        name: puppy.breed_name,
                        slug: puppy.breed_slug
                    },
                    type: puppy.puppy_breed_type,
                    color: puppy.puppy_color,
                    eyeColor: puppy.puppy_eye_color,
                    status: 'Vendu',
                    slug: puppy.puppy_slug,
                    image: {
                        path: puppy.optimized_image_path
                            ? `/uploads/optimized/${puppy.optimized_image_path}`
                            : `/uploads/${puppy.image_path}`,
                        alt: puppy.balise_alt
                    }
                })),
                activeBreed: '',
                activeGender: gender,
                selectedGender: {
                    value: gender,
                    param: genderParam,
                    label: genderLabel
                },
                currentPage,
                totalPages,
                totalItems,
                socialLinks: socialLinks
            });
        })
        .catch(err => {
            console.error('Erreur lors de la récupération des données :', err);
            res.redirect('/erreur');
        });
    });
});

// router pour afficher la page de chiots à vendre (fait)
router.get('/a-vendre', (req, res) => {
    const userId = 10;
    const itemsPerPage = 6;
    const currentPage = parseInt(req.query.page) || 1;
    const breedSlug = req.query.breed;
    const gender = req.query.gender;

    // Redirection si page 0 ou 1
    if (req.query.page === '0' || req.query.page === '1') {
        const baseUrl = '/chiots/a-vendre';
        const queryParams = [];
        if (breedSlug) queryParams.push(`breed=${breedSlug}`);
        if (gender) queryParams.push(`gender=${gender}`);
        return res.redirect(queryParams.length ? `${baseUrl}?${queryParams.join('&')}` : baseUrl);
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

    let countQuery = `
        SELECT COUNT(DISTINCT p.id) as total
        FROM puppies p
        LEFT JOIN breed_name bn ON p.breed_id = bn.id
        WHERE p.user_id = ?
        AND p.puppy_is_online = 1
        AND p.sale_status IN ('available_for_reservation', 'for_sale', 'in_reservation', 'reserved')
    `;

    const countParams = [userId];
    if (breedSlug) {
        countQuery += ` AND bn.slug = ?`;
        countParams.push(breedSlug);
    }
    if (gender) {
        countQuery += ` AND p.puppy_gender = ?`;
        countParams.push(gender);
    }

    const queryBreeds = `
        SELECT 
            bn.name,
            bn.slug,
            (SELECT COUNT(*) 
             FROM puppies p 
             WHERE p.breed_id = bn.id 
             AND p.user_id = ? 
             AND p.puppy_is_online = 1 
             AND p.sale_status IN ('available_for_reservation', 'for_sale', 'in_reservation', 'reserved')
            ) as active_puppies_count
        FROM breed_name bn
        WHERE bn.user_id = ?
        AND bn.is_online = 1
        ORDER BY bn.position ASC
    `;

    db.query(countQuery, countParams, (err, countResult) => {
        if (err) {
            console.error('Erreur lors du comptage des chiots:', err);
            return res.redirect('/erreur');
        }

        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (currentPage > totalPages && totalPages > 0) {
            const baseUrl = '/chiots/a-vendre';
            const queryParams = [`page=${totalPages}`];
            if (breedSlug) queryParams.push(`breed=${breedSlug}`);
            if (gender) queryParams.push(`gender=${gender}`);
            res.status(404);
            return res.redirect(`${baseUrl}?${queryParams.join('&')}`);
        }

        const offset = (currentPage - 1) * itemsPerPage;

        let queryPuppies = `
            SELECT 
                p.id,
                p.puppy_name,
                p.puppy_gender,
                p.puppy_breed_type,
                p.puppy_color,
                p.puppy_eye_color,
                p.price,
                p.sale_status,
                p.puppy_slug,
                bn.name AS breed_name,
                bn.slug AS breed_slug,
                pi.image_path,
                pi.optimized_image_path,
                pi.balise_alt,
                CASE p.sale_status
                    WHEN 'available_for_reservation' THEN 1
                    WHEN 'for_sale' THEN 2
                    WHEN 'in_reservation' THEN 3
                    WHEN 'reserved' THEN 4
                    ELSE 5
                END AS status_order
            FROM puppies p
            LEFT JOIN breed_name bn ON p.breed_id = bn.id
            LEFT JOIN puppies_images pi ON pi.puppies_id = p.id
            AND pi.id = (
                SELECT MAX(id)
                FROM puppies_images
                WHERE puppies_id = p.id
            )
            WHERE p.user_id = ?
            AND p.puppy_is_online = 1
            AND p.sale_status IN ('available_for_reservation', 'for_sale', 'in_reservation', 'reserved')
        `;

        const puppiesParams = [userId];
        if (breedSlug) {
            queryPuppies += ` AND bn.slug = ?`;
            puppiesParams.push(breedSlug);
        }
        if (gender) {
            queryPuppies += ` AND p.puppy_gender = ?`;
            puppiesParams.push(gender);
        }

        queryPuppies += ` ORDER BY status_order ASC, p.id DESC LIMIT ? OFFSET ?`;
        puppiesParams.push(itemsPerPage, offset);

        Promise.all([
            new Promise((resolve, reject) => {
                db.query(queryBreeds, [userId, userId], (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(queryPuppies, puppiesParams, (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(querySocialLinks, [userId], (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            })
        ])
        .then(([breeds, puppies, socialLinks]) => {
            res.render('puppy_for_sale', {
                breeds: breeds.map(breed => ({
                    name: breed.name,
                    slug: breed.slug,
                    hasActivePuppies: breed.active_puppies_count > 0
                })),
                puppies: puppies.map(puppy => ({
                    name: puppy.puppy_name,
                    gender: puppy.puppy_gender,
                    breed: {
                        name: puppy.breed_name,
                        slug: puppy.breed_slug
                    },
                    type: puppy.puppy_breed_type,
                    color: puppy.puppy_color,
                    eyeColor: puppy.puppy_eye_color,
                    price: puppy.price,
                    status: (() => {
                        switch(puppy.sale_status) {
                            case 'for_sale': return 'À vendre';
                            case 'available_for_reservation': return 'Disponible à la réservation';
                            case 'in_reservation': return 'En cours de réservation';
                            case 'reserved': return 'Réservé';
                            default: return 'Statut inconnu';
                        }
                    })(),
                    slug: puppy.puppy_slug,
                    image: {
                        path: puppy.optimized_image_path ?
                            `/uploads/optimized/${puppy.optimized_image_path}` :
                            `/uploads/${puppy.image_path}`,
                        alt: puppy.balise_alt
                    }
                })),
                activeBreed: breedSlug || '',
                activeGender: gender || '',
                currentPage,
                totalPages,
                totalItems,
                socialLinks: socialLinks
            });
        })
        .catch(err => {
            console.error('Erreur:', err);
            res.redirect('/erreur');
        });
    });
});

// router pour afficher la page de chiots produits (fait)
router.get('/produits', (req, res) => {
    const userId = 10;
    const itemsPerPage = 6;
    const currentPage = parseInt(req.query.page) || 1;
    const breedSlug = req.query.breed;
    const gender = req.query.gender;

    if (req.query.page === '0' || req.query.page === '1') {
        const baseUrl = '/chiots/produits';
        const queryParams = [];
        if (breedSlug) queryParams.push(`breed=${breedSlug}`);
        if (gender) queryParams.push(`gender=${gender}`);
        return res.redirect(queryParams.length ? `${baseUrl}?${queryParams.join('&')}` : baseUrl);
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

    let countQuery = `
        SELECT COUNT(DISTINCT p.id) as total
        FROM puppies p
        LEFT JOIN breed_name bn ON p.breed_id = bn.id
        WHERE p.user_id = ?
        AND p.puppy_is_online = 1
        AND p.sale_status = 'sold'
    `;

    const countParams = [userId];
    if (breedSlug) {
        countQuery += ` AND bn.slug = ?`;
        countParams.push(breedSlug);
    }
    if (gender) {
        countQuery += ` AND p.puppy_gender = ?`;
        countParams.push(gender);
    }

    const queryBreeds = `
        SELECT 
            bn.name,
            bn.slug,
            (SELECT COUNT(*) 
             FROM puppies p 
             WHERE p.breed_id = bn.id 
             AND p.user_id = ? 
             AND p.puppy_is_online = 1 
             AND p.sale_status = 'sold'
            ) as active_puppies_count
        FROM breed_name bn
        WHERE bn.user_id = ?
        AND bn.is_online = 1
        ORDER BY bn.position ASC
    `;

    db.query(countQuery, countParams, (err, countResult) => {
        if (err) {
            console.error('Erreur lors du comptage des chiots:', err);
            return res.redirect('/erreur');
        }

        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (currentPage > totalPages && totalPages > 0) {
            const baseUrl = '/chiots/produits';
            const queryParams = [`page=${totalPages}`];
            if (breedSlug) queryParams.push(`breed=${breedSlug}`);
            if (gender) queryParams.push(`gender=${gender}`);
            res.status(404);
            return res.redirect(`${baseUrl}?${queryParams.join('&')}`);
        }

        const offset = (currentPage - 1) * itemsPerPage;

        let queryPuppies = `
            SELECT 
                p.id,
                p.puppy_name,
                p.puppy_gender,
                p.puppy_breed_type,
                p.puppy_color,
                p.puppy_eye_color,
                p.sale_status,
                p.puppy_slug,
                bn.name AS breed_name,
                bn.slug AS breed_slug,
                pi.image_path,
                pi.optimized_image_path,
                pi.balise_alt
            FROM puppies p
            LEFT JOIN breed_name bn ON p.breed_id = bn.id
            LEFT JOIN puppies_images pi ON pi.puppies_id = p.id
            AND pi.id = (
                SELECT MIN(id)
                FROM puppies_images
                WHERE puppies_id = p.id
            )
            WHERE p.user_id = ?
            AND p.puppy_is_online = 1
            AND p.sale_status = 'sold'
        `;

        const puppiesParams = [userId];
        if (breedSlug) {
            queryPuppies += ` AND bn.slug = ?`;
            puppiesParams.push(breedSlug);
        }
        if (gender) {
            queryPuppies += ` AND p.puppy_gender = ?`;
            puppiesParams.push(gender);
        }

        queryPuppies += ` ORDER BY p.id DESC LIMIT ? OFFSET ?`;
        puppiesParams.push(itemsPerPage, offset);

        Promise.all([
            new Promise((resolve, reject) => {
                db.query(queryBreeds, [userId, userId], (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(queryPuppies, puppiesParams, (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(querySocialLinks, [userId], (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            })
        ])
        .then(([breeds, puppies, socialLinks]) => {
            res.render('puppy_sold', {
                breeds: breeds.map(breed => ({
                    name: breed.name,
                    slug: breed.slug,
                    hasActivePuppies: breed.active_puppies_count > 0
                })),
                puppies: puppies.map(puppy => ({
                    name: puppy.puppy_name,
                    gender: puppy.puppy_gender,
                    breed: {
                        name: puppy.breed_name,
                        slug: puppy.breed_slug
                    },
                    type: puppy.puppy_breed_type,
                    color: puppy.puppy_color,
                    eyeColor: puppy.puppy_eye_color,
                    status: 'Vendu',
                    slug: puppy.puppy_slug,
                    image: {
                        path: puppy.optimized_image_path ?
                            `/uploads/optimized/${puppy.optimized_image_path}` :
                            `/uploads/${puppy.image_path}`,
                        alt: puppy.balise_alt
                    }
                })),
                activeBreed: breedSlug || '',
                activeGender: gender || '',
                currentPage,
                totalPages,
                totalItems,
                socialLinks: socialLinks
            });
        })
        .catch(err => {
            console.error('Erreur:', err);
            res.redirect('/erreur');
        });
    });
});

// router pour afficher la page de chiots à vendre par race (fait)
router.get('/a-vendre/:breedSlug', (req, res) => {
    const userId = 10;
    const itemsPerPage = 6;
    const currentPage = parseInt(req.query.page) || 1;
    const breedSlug = req.params.breedSlug;
    const gender = req.query.gender;

    if (req.query.page === '0' || req.query.page === '1') {
        const baseUrl = `/chiots/a-vendre/${breedSlug}`;
        const queryParams = [];
        if (gender) queryParams.push(`gender=${gender}`);
        return res.redirect(queryParams.length ? `${baseUrl}?${queryParams.join('&')}` : baseUrl);
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

    const queryBreedCheck = `
        SELECT id, name, slug 
        FROM breed_name 
        WHERE slug = ? AND user_id = ?
        LIMIT 1
    `;

    db.query(queryBreedCheck, [breedSlug, userId], (err, breedResult) => {
        if (err || !breedResult.length) {
            return res.redirect('/erreur');
        }

        const breedId = breedResult[0].id;
        const breedName = breedResult[0].name;

        let countQuery = `
            SELECT COUNT(DISTINCT p.id) as total
            FROM puppies p
            WHERE p.user_id = ?
            AND p.breed_id = ?
            AND p.puppy_is_online = 1
            AND p.sale_status IN ('available_for_reservation', 'for_sale', 'in_reservation', 'reserved')
        `;

        const countParams = [userId, breedId];
        if (gender) {
            countQuery += ` AND p.puppy_gender = ?`;
            countParams.push(gender);
        }

        const queryBreeds = `
            SELECT 
                bn.name,
                bn.slug,
                (SELECT COUNT(*) 
                 FROM puppies p 
                 WHERE p.breed_id = bn.id 
                 AND p.user_id = ? 
                 AND p.puppy_is_online = 1 
                 AND p.sale_status IN ('available_for_reservation', 'for_sale', 'in_reservation', 'reserved')
                ) as active_puppies_count
            FROM breed_name bn
            WHERE bn.user_id = ?
            AND bn.is_online = 1
            ORDER BY bn.position ASC
        `;

        db.query(countQuery, countParams, (err, countResult) => {
            if (err) {
                console.error('Erreur lors du comptage des chiots:', err);
                return res.redirect('/erreur');
            }

            const totalItems = countResult[0].total;
            const totalPages = Math.ceil(totalItems / itemsPerPage);

            if (currentPage > totalPages && totalPages > 0) {
                const baseUrl = `/chiots/a-vendre/${breedSlug}`;
                const queryParams = [`page=${totalPages}`];
                if (gender) queryParams.push(`gender=${gender}`);
                res.status(404);
                return res.redirect(`${baseUrl}?${queryParams.join('&')}`);
            }

            const offset = (currentPage - 1) * itemsPerPage;

            let queryPuppies = `
                SELECT 
                    p.id,
                    p.puppy_name,
                    p.puppy_gender,
                    p.puppy_breed_type,
                    p.puppy_color,
                    p.puppy_eye_color,
                    p.price,
                    p.sale_status,
                    p.puppy_slug,
                    bn.name AS breed_name,
                    bn.slug AS breed_slug,
                    pi.image_path,
                    pi.optimized_image_path,
                    pi.balise_alt,
                    CASE p.sale_status
                        WHEN 'available_for_reservation' THEN 1
                        WHEN 'for_sale' THEN 2
                        WHEN 'in_reservation' THEN 3
                        WHEN 'reserved' THEN 4
                        ELSE 5
                    END AS status_order
                FROM puppies p
                LEFT JOIN breed_name bn ON p.breed_id = bn.id
                LEFT JOIN puppies_images pi ON pi.puppies_id = p.id
                AND pi.id = (
                    SELECT MAX(id)
                    FROM puppies_images
                    WHERE puppies_id = p.id
                )
                WHERE p.user_id = ?
                AND p.breed_id = ?
                AND p.puppy_is_online = 1
                AND p.sale_status IN ('available_for_reservation', 'for_sale', 'in_reservation', 'reserved')
            `;

            const puppiesParams = [userId, breedId];
            if (gender) {
                queryPuppies += ` AND p.puppy_gender = ?`;
                puppiesParams.push(gender);
            }

            queryPuppies += ` ORDER BY status_order ASC, p.id DESC LIMIT ? OFFSET ?`;
            puppiesParams.push(itemsPerPage, offset);

            Promise.all([
                new Promise((resolve, reject) => {
                    db.query(queryPuppies, puppiesParams, (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(queryBreeds, [userId, userId], (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(querySocialLinks, [userId], (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                })
            ])
            .then(([puppies, breeds, socialLinks]) => {
                res.render('puppy_for_sale_by_breed', {
                    breed: {
                        name: breedName,
                        slug: breedSlug
                    },
                    breeds: breeds.map(breed => ({
                        name: breed.name,
                        slug: breed.slug,
                        hasActivePuppies: breed.active_puppies_count > 0
                    })),
                    puppies: puppies.map(puppy => ({
                        name: puppy.puppy_name,
                        gender: puppy.puppy_gender,
                        breed: {
                            name: puppy.breed_name,
                            slug: puppy.breed_slug
                        },
                        type: puppy.puppy_breed_type,
                        color: puppy.puppy_color,
                        eyeColor: puppy.puppy_eye_color,
                        price: puppy.price,
                        status: (() => {
                            switch(puppy.sale_status) {
                                case 'for_sale': return 'À vendre';
                                case 'available_for_reservation': return 'Disponible à la réservation';
                                case 'in_reservation': return 'En cours de réservation';
                                case 'reserved': return 'Réservé';
                                default: return 'Statut inconnu';
                            }
                        })(),
                        slug: puppy.puppy_slug,
                        image: {
                            path: puppy.optimized_image_path ?
                                `/uploads/optimized/${puppy.optimized_image_path}` :
                                `/uploads/${puppy.image_path}`,
                            alt: puppy.balise_alt
                        }
                    })),
                    activeBreed: breedSlug,
                    activeGender: gender || '',
                    currentPage,
                    totalPages,
                    totalItems,
                    socialLinks: socialLinks
                });
            })
            .catch(err => {
                console.error('Erreur:', err);
                res.redirect('/erreur');
            });
        });
    });
});

// router pour afficher la page de chiots produits filtrés par races (fait)
router.get('/produits/:breedSlug', (req, res) => {
    const userId = 10;
    const itemsPerPage = 6;
    const currentPage = parseInt(req.query.page) || 1;
    const breedSlug = req.params.breedSlug;
    const gender = req.query.gender;

    if (req.query.page === '0' || req.query.page === '1') {
        const baseUrl = `/chiots/produits/${breedSlug}`;
        const queryParams = [];
        if (gender) queryParams.push(`gender=${gender}`);
        return res.redirect(queryParams.length ? `${baseUrl}?${queryParams.join('&')}` : baseUrl);
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

    const queryBreedCheck = `
        SELECT id, name, slug 
        FROM breed_name 
        WHERE slug = ? AND user_id = ?
        LIMIT 1
    `;

    db.query(queryBreedCheck, [breedSlug, userId], (err, breedResult) => {
        if (err || !breedResult.length) {
            return res.redirect('/erreur');
        }

        const breedId = breedResult[0].id;
        const breedName = breedResult[0].name;

        let countQuery = `
            SELECT COUNT(DISTINCT p.id) as total
            FROM puppies p
            WHERE p.user_id = ?
            AND p.breed_id = ?
            AND p.puppy_is_online = 1
            AND p.sale_status = 'sold'
        `;

        const countParams = [userId, breedId];
        if (gender) {
            countQuery += ` AND p.puppy_gender = ?`;
            countParams.push(gender);
        }

        const queryBreeds = `
            SELECT 
                bn.name,
                bn.slug,
                (SELECT COUNT(*) 
                 FROM puppies p 
                 WHERE p.breed_id = bn.id 
                 AND p.user_id = ? 
                 AND p.puppy_is_online = 1 
                 AND p.sale_status = 'sold'
                ) as active_puppies_count
            FROM breed_name bn
            WHERE bn.user_id = ?
            AND bn.is_online = 1
            ORDER BY bn.position ASC
        `;

        db.query(countQuery, countParams, (err, countResult) => {
            if (err) {
                console.error('Erreur lors du comptage des chiots produits:', err);
                return res.redirect('/erreur');
            }

            const totalItems = countResult[0].total;
            const totalPages = Math.ceil(totalItems / itemsPerPage);

            if (currentPage > totalPages && totalPages > 0) {
                const baseUrl = `/chiots/produits/${breedSlug}`;
                const queryParams = [`page=${totalPages}`];
                if (gender) queryParams.push(`gender=${gender}`);
                res.status(404);
                return res.redirect(`${baseUrl}?${queryParams.join('&')}`);
            }

            const offset = (currentPage - 1) * itemsPerPage;

            let queryPuppies = `
                SELECT 
                    p.id,
                    p.puppy_name,
                    p.puppy_gender,
                    p.puppy_breed_type,
                    p.puppy_color,
                    p.puppy_eye_color,
                    p.sale_status,
                    p.puppy_slug,
                    bn.name AS breed_name,
                    bn.slug AS breed_slug,
                    pi.image_path,
                    pi.optimized_image_path,
                    pi.balise_alt
                FROM puppies p
                LEFT JOIN breed_name bn ON p.breed_id = bn.id
                LEFT JOIN puppies_images pi ON pi.puppies_id = p.id
                AND pi.id = (
                    SELECT MIN(id)
                    FROM puppies_images
                    WHERE puppies_id = p.id
                )
                WHERE p.user_id = ?
                AND p.breed_id = ?
                AND p.puppy_is_online = 1
                AND p.sale_status = 'sold'
            `;

            const puppiesParams = [userId, breedId];
            if (gender) {
                queryPuppies += ` AND p.puppy_gender = ?`;
                puppiesParams.push(gender);
            }

            queryPuppies += ` ORDER BY p.id DESC LIMIT ? OFFSET ?`;
            puppiesParams.push(itemsPerPage, offset);

            Promise.all([
                new Promise((resolve, reject) => {
                    db.query(queryPuppies, puppiesParams, (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(queryBreeds, [userId, userId], (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(querySocialLinks, [userId], (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                })
            ])
            .then(([puppies, breeds, socialLinks]) => {
                res.render('puppy_sold_by_breed', {
                    breed: {
                        name: breedName,
                        slug: breedSlug
                    },
                    breeds: breeds.map(breed => ({
                        name: breed.name,
                        slug: breed.slug,
                        hasActivePuppies: breed.active_puppies_count > 0
                    })),
                    puppies: puppies.map(puppy => ({
                        name: puppy.puppy_name,
                        gender: puppy.puppy_gender,
                        status: 'Vendu',
                        breed: {
                            name: puppy.breed_name,
                            slug: puppy.breed_slug
                        },
                        type: puppy.puppy_breed_type,
                        color: puppy.puppy_color,
                        eyeColor: puppy.puppy_eye_color,
                        slug: puppy.puppy_slug,
                        image: {
                            path: puppy.optimized_image_path ?
                                `/uploads/optimized/${puppy.optimized_image_path}` :
                                `/uploads/${puppy.image_path}`,
                            alt: puppy.balise_alt
                        }
                    })),
                    activeBreed: breedSlug,
                    activeGender: gender || '',
                    currentPage,
                    totalPages,
                    totalItems,
                    socialLinks: socialLinks
                });
            })
            .catch(err => {
                console.error('Erreur:', err);
                res.redirect('/erreur');
            });
        });
    });
});

// router principal de la page chiots (fait)
router.get('/', (req, res) => {
    const userId = 10;

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

    const queryAvailablePuppies = `
        SELECT 
            puppies.puppy_name,
            puppies_images.image_path,
            puppies_images.optimized_image_path,
            puppies_images.balise_alt
        FROM puppies
        LEFT JOIN puppies_images ON puppies_images.puppies_id = puppies.id
        AND puppies_images.id = (
            SELECT MIN(id)
            FROM puppies_images
            WHERE puppies_images.puppies_id = puppies.id
        )
        WHERE puppies.user_id = ?
        AND puppies.puppy_is_online = 1
        AND puppies.sale_status IN ('for_sale', 'available_for_reservation')
        ORDER BY puppies.id DESC
        LIMIT 1;
    `;

    const querySoldPuppies = `
        SELECT 
            puppies.puppy_name,
            puppies_images.image_path,
            puppies_images.optimized_image_path,
            puppies_images.balise_alt
        FROM puppies
        LEFT JOIN puppies_images ON puppies_images.puppies_id = puppies.id
        AND puppies_images.id = (
            SELECT MIN(id)
            FROM puppies_images
            WHERE puppies_images.puppies_id = puppies.id
        )
        WHERE puppies.user_id = ?
        AND puppies.puppy_is_online = 1
        AND puppies.sale_status = 'sold'
        ORDER BY puppies.id DESC
        LIMIT 1;
    `;

    const queryCount = `
        SELECT 
            COUNT(*) as available_count,
            (SELECT COUNT(*) FROM puppies 
             WHERE user_id = ? 
             AND puppy_is_online = 1 
             AND sale_status = 'sold') as sold_count
        FROM puppies
        WHERE user_id = ?
        AND puppy_is_online = 1
        AND sale_status IN ('for_sale', 'available_for_reservation');
    `;

    Promise.all([
        new Promise((resolve, reject) => {
            db.query(queryAvailablePuppies, [userId], (err, results) => {
                if (err) return reject(err);
                resolve(results[0] || null);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(querySoldPuppies, [userId], (err, results) => {
                if (err) return reject(err);
                resolve(results[0] || null);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(queryCount, [userId, userId], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(querySocialLinks, [userId], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        })
    ])
    .then(([availablePuppy, soldPuppy, counts, socialLinks]) => {
        res.render('chiots', {
            availablePuppy: availablePuppy ? {
                image: {
                    path: availablePuppy.optimized_image_path ? 
                        `/uploads/optimized/${availablePuppy.optimized_image_path}` : 
                        `/uploads/${availablePuppy.image_path}`,
                    alt: availablePuppy.balise_alt
                }
            } : null,
            soldPuppy: soldPuppy ? {
                image: {
                    path: soldPuppy.optimized_image_path ? 
                        `/uploads/optimized/${soldPuppy.optimized_image_path}` : 
                        `/uploads/${soldPuppy.image_path}`,
                    alt: soldPuppy.balise_alt
                }
            } : null,
            counts: {
                available: counts.available_count,
                sold: counts.sold_count
            },
            socialLinks: socialLinks
        });
    })
    .catch(err => {
        console.error('Erreur:', err);
        res.redirect('/erreur');
    });
});

module.exports = router;