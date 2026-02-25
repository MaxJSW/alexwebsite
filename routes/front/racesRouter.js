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

router.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Router principal page races
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

    const queryBreeds = `
        SELECT 
        breed_name.id AS breed_id,
        breed_name.name AS breed_name,
        breed_name.description AS breed_description,
        breed_name.slug,
        breed_name.position,
        MAX(breed_paragraphs.content) AS paragraph_content,
        MAX(breed_images.image_path) as image_path,
        MAX(breed_images.optimized_image_path) as optimized_image_path,
        MAX(breed_images.balise_alt) as balise_alt
    FROM 
        breed_name
    LEFT JOIN 
        breed_paragraphs ON breed_name.id = breed_paragraphs.breed_id
    LEFT JOIN 
        breed_images ON breed_images.id = (
            SELECT id FROM breed_images 
            WHERE breed_images.breed_id = breed_name.id
            ORDER BY id ASC LIMIT 1
        )
    WHERE 
        breed_name.user_id = ? 
        AND breed_name.is_online = 1
    GROUP BY 
        breed_name.id,
        breed_name.name,
        breed_name.description,
        breed_name.slug,
        breed_name.position
    ORDER BY 
        breed_name.position ASC`;

    db.query(queryBreeds, [userId], (err, breeds) => {
        if (err) {
            console.error('Erreur lors de la récupération des races:', err);
            return res.redirect('/erreur');
        }
        const processedBreeds = breeds.map(breed => ({
                breed_id: breed.breed_id,
                breed_name: breed.breed_name,
                breed_description: breed.breed_description,
                slug: breed.slug,
                position: breed.position,
                preview: breed.paragraph_content ? breed.paragraph_content.substring(0, 300) + '...' : '',
                image: {
                    path: breed.optimized_image_path ? `/uploads/optimized/${breed.optimized_image_path}` : `/uploads/${breed.image_path}`,
                    alt: breed.balise_alt
                }
            }))
            .sort((a, b) => a.position - b.position);

            db.query(querySocialLinks, [userId], (err, socialLinks) => {
            if (err) {
                console.error('Erreur social links:', err);
                return res.redirect('/erreur');
            }

        res.render('races', {
            breeds: processedBreeds,
            socialLinks: socialLinks
        });
    });
  });
});


// Route pour afficher les détails d'une race spécifique (finir les chiots en bas de page)
router.get('/:slug', (req, res) => {
    const slug = req.params.slug;
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

    const queryBreedDetail = `
        SELECT 
            breed_name.id AS breed_id, 
            breed_name.name AS breed_name, 
            breed_name.slug, 
            breed_name.description AS breed_description, 
            breed_name.date_creation, 
            breed_name.date_modification
        FROM breed_name
        WHERE breed_name.slug = ?;
    `;

    const queryBreedImages = `
        SELECT 
            breed_images.id AS image_id,
            breed_images.image_path,
            breed_images.optimized_image_path,
            breed_images.balise_alt,
            breed_images.balise_title
        FROM breed_images
        WHERE breed_images.breed_id = (
            SELECT id FROM breed_name WHERE slug = ?
        )
        ORDER BY breed_images.id ASC;
    `;

    const queryBreedParagraphs = `
    SELECT 
        breed_paragraphs.id,
        breed_paragraphs.title,
        breed_paragraphs.content
    FROM breed_paragraphs
    WHERE breed_paragraphs.breed_id = (
        SELECT id FROM breed_name WHERE slug = ?
    )
    ORDER BY breed_paragraphs.id ASC;
`;

const queryBreedAnimals = `
    SELECT 
        animals.id,
        animals.name,
        animals.gender,
        animals.breed_type,
        animals.slug,
        breed_name.name AS breed_name,
        images.image_path,
        images.optimized_image_path,
        images.balise_alt
    FROM animals
    LEFT JOIN breed_name ON animals.breed_id = breed_name.id
    LEFT JOIN images ON images.animal_id = animals.id
    AND images.id = (
        SELECT MIN(id)
        FROM images
        WHERE images.animal_id = animals.id
    )
    WHERE animals.breed_id = (
        SELECT id FROM breed_name WHERE slug = ?
    )
    AND animals.is_online = 1
    AND animals.in_breeding = 1
    AND animals.user_id = ?
    AND animals.retreat = 0
    ORDER BY animals.name ASC;
`;

const queryBreedPuppies = `
    SELECT 
        puppies.id,
        puppies.puppy_name,
        puppies.puppy_gender,
        puppies.puppy_breed_type,
        puppies.puppy_slug,
        breed_name.name AS breed_name,
        breed_name.slug AS breed_slug,
        puppies_images.image_path,
        puppies_images.optimized_image_path,
        puppies_images.balise_alt
    FROM puppies
    LEFT JOIN breed_name ON puppies.breed_id = breed_name.id
    LEFT JOIN puppies_images ON puppies_images.puppies_id = puppies.id
    AND puppies_images.id = (
        SELECT MIN(id)
        FROM puppies_images
        WHERE puppies_images.puppies_id = puppies.id
    )
    WHERE puppies.breed_id = (
        SELECT id FROM breed_name WHERE slug = ?
    )
    AND puppies.puppy_is_online = 1
    AND puppies.user_id = ?
    AND puppies.sale_status IN ('available_for_reservation', 'for_sale')
    ORDER BY puppies.puppy_name ASC
    LIMIT 4;
`;


Promise.all([
        new Promise((resolve, reject) => {
            db.query(queryBreedDetail, [slug], (err, results) => {
                if (err) return reject(err);
                if (results.length === 0) return reject(new Error('Race non trouvée'));
                resolve(results[0]);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(queryBreedImages, [slug], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(queryBreedParagraphs, [slug], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(queryBreedAnimals, [slug, userId], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(queryBreedPuppies, [slug, userId], (err, results) => {
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
    .then(([breedDetail, breedImages, breedParagraphs, breedAnimals, breedPuppies, socialLinks]) => {
        const firstImage = breedImages && breedImages.length > 0 ? {
            path: breedImages[0].optimized_image_path 
                ? `/uploads/optimized/${breedImages[0].optimized_image_path}`
                : `/uploads/${breedImages[0].image_path}`,
            alt: breedImages[0].balise_alt
        } : null;
        res.render('breed_detail', {
            breed: {
                name: breedDetail.breed_name,
                description: breedDetail.breed_description,
                slug: breedDetail.slug,
                firstImage: firstImage
            },
            breedImages: breedImages.map(img => ({
                id: img.image_id,
                path: img.optimized_image_path ? `/uploads/optimized/${img.optimized_image_path}` : `/uploads/${img.image_path}`,
                alt: img.balise_alt,
                title: img.balise_title
            })),
            breedParagraphs,
            breedAnimals: breedAnimals.map(animal => ({
                name: animal.name,
                gender: animal.gender,
                breed_type: animal.breed_type,
                breed_name: animal.breed_name,
                slug: animal.slug,
                image: {
                    path: animal.optimized_image_path ? `/uploads/optimized/${animal.optimized_image_path}` : `/uploads/${animal.image_path}`,
                    alt: animal.balise_alt
                }
            })),
            breedPuppies: breedPuppies.map(puppy => ({
                name: puppy.puppy_name,
                gender: puppy.puppy_gender,
                breed_type: puppy.puppy_breed_type,
                breed_name: puppy.breed_name,
                breed_slug: puppy.breed_slug,
                slug: puppy.puppy_slug,
                image: {
                    path: puppy.optimized_image_path ? `/uploads/optimized/${puppy.optimized_image_path}` : `/uploads/${puppy.image_path}`,
                    alt: puppy.balise_alt
                }
            })),
            socialLinks: socialLinks
        });
    })
    .catch(err => {
        console.error('Erreur lors du chargement des données :', err.message);
        res.redirect('/erreur');
    });
});


module.exports = router;