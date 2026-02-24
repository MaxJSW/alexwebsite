const express = require('express');
const session = require('express-session');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');
const dotenv = require('dotenv');
const db = require('../../routes/db');
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

const upload = multer({ storage: storage });
const publicDirectory = path.join(__dirname, './public');
router.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Route pour la page d'accueil
router.get('/', (req, res) => {
    const userId = 8;
    
    // Requête 1 : TOUS les reproducteurs pour la section RACES
    const queryAnimalsForRaces = `
    SELECT 
        animals.id,
        animals.name,
        animals.gender,
        animals.breed_type,
        animals.color,
        animals.slug,
        breed_name.name AS breed_name,
        breed_name.slug AS breed_slug,
        MIN(images.image_path) AS image_path,
        MIN(images.optimized_image_path) AS optimized_image_path,
        MIN(images.balise_alt) AS balise_alt
    FROM animals
    LEFT JOIN 
        breed_name ON animals.breed_id = breed_name.id
    LEFT JOIN 
        images ON images.animal_id = animals.id
    WHERE 
        animals.user_id = ?
        AND animals.is_online = 1
        AND animals.retreat = 0
        AND animals.in_breeding = 1
    GROUP BY
        animals.id,
        animals.name,
        animals.gender,
        animals.breed_type,
        animals.color,
        animals.slug,
        breed_name.name,
        breed_name.slug
    ORDER BY animals.id DESC
`;

    // Requête 2 : 4 reproducteurs pour les CARTES individuelles
    const queryAnimalsForCards = `
    SELECT 
        animals.id,
        animals.name,
        animals.gender,
        animals.breed_type,
        animals.color,
        animals.slug,
        breed_name.name AS breed_name,
        breed_name.slug AS breed_slug,
        MIN(images.image_path) AS image_path,
        MIN(images.optimized_image_path) AS optimized_image_path,
        MIN(images.balise_alt) AS balise_alt
    FROM animals
    LEFT JOIN 
        breed_name ON animals.breed_id = breed_name.id
    LEFT JOIN 
        images ON images.animal_id = animals.id
    WHERE 
        animals.user_id = ?
        AND animals.is_online = 1
        AND animals.retreat = 0
        AND animals.in_breeding = 1
    GROUP BY
        animals.id,
        animals.name,
        animals.gender,
        animals.breed_type,
        animals.color,
        animals.slug,
        breed_name.name,
        breed_name.slug
    ORDER BY animals.id DESC
    LIMIT 4
`;

    const queryMarriages = `
    SELECT 
        marriages.id,
        marriages.created_at,
        male_animal.name AS male_name,
        female_animal.name AS female_name,
        marriages.actual_male_puppies + marriages.actual_female_puppies AS total_puppies,
        (
            SELECT COUNT(*)
            FROM puppies
            WHERE puppies.marriage_id = marriages.id
            AND puppies.sale_status IN ('available_for_reservation', 'for_sale')
            AND puppies.puppy_is_online = 1
        ) AS available_puppies,
        marriages.actual_birth_date,
        marriages.marriages_status,
        marriages.marriages_slug,
        breed_name.name AS breed_name,
        breed_name.slug AS breed_slug,
        (SELECT optimized_image_path FROM marriages_images WHERE marriages_images.marriage_id = marriages.id LIMIT 1) AS optimized_image_path,
        (SELECT image_path FROM marriages_images WHERE marriages_images.marriage_id = marriages.id LIMIT 1) AS image_path
    FROM marriages
    LEFT JOIN animals AS male_animal ON marriages.male_id = male_animal.id
    LEFT JOIN animals AS female_animal ON marriages.female_id = female_animal.id
    LEFT JOIN breed_name ON male_animal.breed_id = breed_name.id
    WHERE 
        marriages.user_id = ?
        AND marriages.is_online = 1
    ORDER BY marriages.id DESC
    LIMIT 4
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
    AND p.sale_status IN ('available_for_reservation', 'for_sale')
    ORDER BY p.id DESC
    LIMIT 4
`;

    const queryBlogs = `
    SELECT 
        blog.id,
        blog.titre,
        blog.preview,
        blog.date_creation,
        blog.slug,
        blog.likes,
        blog_categorie.content AS category_content,
        blog_categorie.category_slug AS category_slug,
        (SELECT optimized_image_path FROM blog_images WHERE blog_images.blog_id = blog.id LIMIT 1) AS optimized_image_path,
        (SELECT image_path FROM blog_images WHERE blog_images.blog_id = blog.id LIMIT 1) AS image_path,
        (SELECT balise_alt FROM blog_images WHERE blog_images.blog_id = blog.id LIMIT 1) AS balise_alt,
        (
            SELECT GROUP_CONCAT(
                CONCAT(
                    bk.content, ':', 
                    (
                        SELECT COUNT(DISTINCT bka2.blog_id)
                        FROM blog_keywords_associations bka2
                        WHERE bka2.keywords_id = bk.id
                    )
                )
            )
            FROM blog_keywords_associations bka
            JOIN blog_keywords bk ON bka.keywords_id = bk.id
            WHERE bka.blog_id = blog.id
        ) AS keywords_with_count,
        (
            SELECT COUNT(DISTINCT bka.keywords_id)
            FROM blog_keywords_associations bka
            WHERE bka.blog_id = blog.id
        ) AS total_tags
    FROM blog
    LEFT JOIN blog_categorie ON blog.categorie_id = blog_categorie.id
    WHERE 
        blog.user_id = ?
        AND blog.is_online = 1
    ORDER BY blog.id DESC
    LIMIT 4
`;

    // Exécuter les requêtes
    db.query(queryAnimalsForRaces, [userId], (err, allAnimals) => {
        if (err) {
            console.error('Erreur lors de la récupération de tous les animaux:', err);
            return res.redirect('/error');
        }

        db.query(queryAnimalsForCards, [userId], (err, animals) => {
            if (err) {
                console.error('Erreur lors de la récupération des animaux pour les cartes:', err);
                return res.redirect('/error');
            }

            db.query(queryMarriages, [userId], (err, marriages) => {
                if (err) {
                    console.error('Erreur lors de la récupération des mariages:', err);
                    return res.redirect('/error');
                }
                
                const formattedMarriages = marriages.map(marriage => ({
                    ...marriage,
                    formatted_date: new Date(marriage.created_at).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                }));

                db.query(queryPuppies, [userId], (err, puppies) => {
                    if (err) {
                        console.error('Erreur lors de la récupération des chiots:', err);
                        return res.redirect('/error');
                    }

                    db.query(queryBlogs, [userId], (err, blogs) => {
                        if (err) {
                            console.error('Erreur lors de la récupération des blogs:', err);
                            return res.redirect('/error');
                        }

                        res.render('index', {
                            animals: animals,          
                            allAnimals: allAnimals,
                            marriages: formattedMarriages,
                            puppies: puppies,
                            blogs: blogs
                        });
                    });
                });
            });
        });
    });
});


module.exports = router;