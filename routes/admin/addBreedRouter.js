const express = require('express');
const router = express.Router();
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');

const db = require('../db');
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

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.redirect('/admin/connect');
    }
}

const upload = multer({ storage: storage });
const publicDirectory = path.join(__dirname, '../public');
router.use('/uploads', express.static(path.join(__dirname, '../uploads')));


router.get('/', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;

    const queryBreeds = 'SELECT * FROM breed_name WHERE user_id = ?';
    const queryUsers = 'SELECT * FROM users';
    const queryAnimals = 'SELECT * FROM animals';

    db.query(queryBreeds, [userId], (err, breedResults) => {
        if (err) {
            return res.status(500).send('Erreur lors de la récupération des races');
        }

        db.query(queryUsers, (err, userResults) => {
            if (err) {
                return res.status(500).send('Erreur lors de la récupération des utilisateurs');
            }

            db.query(queryAnimals, (err, animalResults) => {
                if (err) {
                    return res.status(500).send('Erreur lors de la récupération des animaux');
                }

                res.render('addBreeds', {
                    breeds: breedResults,
                    users: userResults,
                    animals: animalResults,
                    user: req.session.user,
                    currentPage: 'addBreeds'
                });
            });
        });
    });
});





// post router pour l'ajout de la race + slug
router.post('/', isAuthenticated, (req, res) => {
    const { name } = req.body;
    const userId = req.session.user.id;

    // Vérifier que les données requises sont présentes
    if (!name || !userId) {
        console.error('Name ou User ID manquant');
        return res.status(400).send('Name ou User ID manquant');
    }

    // Fonction pour générer le slug
    function generateSlug(name) {
        const accentsMap = new Map([
            ['a', 'á|à|ã|â|ä'],
            ['e', 'é|è|ê|ë'],
            ['i', 'í|ì|î|ï'],
            ['o', 'ó|ò|ô|õ|ö'],
            ['u', 'ú|ù|û|ü'],
            ['c', 'ç'],
            ['n', 'ñ']
        ]);
    
        let slug = name.toLowerCase();
        accentsMap.forEach((pattern, replacement) => {
            slug = slug.replace(new RegExp(pattern, 'g'), replacement);
        });
    
        slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Supprimer les accents restants
        return slug.replace(/'/g, '-') // Remplace les apostrophes par des tirets
                   .replace(/[^a-z0-9\s-]/g, '') // Supprime les caractères spéciaux
                   .replace(/\s+/g, '-') // Remplace les espaces par des tirets
                   .replace(/-+/g, '-'); // Remplace les multiples tirets par un seul
    }

    const slug = generateSlug(name);
    const query = 'INSERT INTO breed_name (name, slug, user_id) VALUES (?, ?, ?)';

    // console.log('Executing query:', query);
    // console.log('With values:', [name, slug, userId]);

    db.query(query, [name, slug, userId], (err, results) => {
        if (err) {
            console.error('Erreur lors de l\'ajout de la race:', err);
            return res.status(500).send(`Erreur lors de l'ajout de la race: ${err.message}`);
        }
        res.redirect('/admin/addBreeds');
    });
});




// router pour supprimer une race
router.post('/deleteBreed/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;

    const checkQuery = 'SELECT COUNT(*) AS count FROM animals WHERE breed_id = ?';
    db.query(checkQuery, [id], (err, results) => {
        if (err) {
            console.error('Erreur lors de la vérification des références de la race:', err);
            return res.status(500).send('Erreur lors de la vérification des références de la race');
        }

        const count = results[0].count;
        if (count > 0) {
            return res.status(400).send('Impossible de supprimer cette race car elle est liée à des animaux.');
        }

        const query = 'DELETE FROM breed_name WHERE id = ?';
        db.query(query, [id], (err, results) => {
            if (err) {
                console.error('Erreur lors de la suppression de la race:', err);
                return res.status(500).send('Erreur lors de la suppression de la race');
            }
            if (results.affectedRows === 0) {
                return res.status(404).send('Race non trouvée.');
            }
            res.sendStatus(200);
        });
    });
});



//  new router for edit a breed + slug
router.post('/editBreed/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;
    const { name, slug } = req.body;

    const query = 'UPDATE breed_name SET name = ?, slug = ? WHERE id = ?';

    db.query(query, [name, slug, id], (err, results) => {
        if (err) {
            return res.status(500).send('Erreur lors de la mise à jour de la race');
        }
        res.sendStatus(200);
    });
});


module.exports = router;
