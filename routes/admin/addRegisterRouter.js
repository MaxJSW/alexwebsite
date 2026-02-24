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


// get principal de la page addRegister + récupération des données de l'utilisateur connecté
router.get('/', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    
    const queryRegisters = 'SELECT * FROM register_name WHERE user_id = ?';
    const queryUsers = 'SELECT * FROM users WHERE id = ?';
    const queryAnimals = 'SELECT * FROM animals WHERE user_id = ?';

    db.query(queryRegisters, [userId], (err, registerResults) => {
        if (err) {
            return res.status(500).send('Erreur lors de la récupération des registres');
        }

        db.query(queryUsers, [userId], (err, userResults) => {
            if (err) {
                return res.status(500).send('Erreur lors de la récupération des utilisateurs');
            }

            db.query(queryAnimals, [userId], (err, animalResults) => {
                if (err) {
                    return res.status(500).send('Erreur lors de la récupération des animaux');
                }

                res.render('addRegister', {
                    registers: registerResults,
                    users: userResults,
                    animals: animalResults,
                    user: req.session.user,
                    currentPage: 'addRegister'
                });
            });
        });
    });
});






// post pour envoyer les données du formulaire addRegister
router.post('/', isAuthenticated, (req, res) => {
    const { name } = req.body;
    const userId = req.session.user.id;
    const query = 'INSERT INTO register_name (name, user_id) VALUES (?, ?)';
    db.query(query, [name, userId], (err, results) => {
        if (err) {
            return res.status(500).send('Erreur lors de l\'ajout du registre');
        }
        res.redirect('addRegister');
    });
});


// router pour supprimer un registre
router.post('/deleteRegister/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;

    const checkQuery = 'SELECT COUNT(*) AS count FROM animals WHERE register_id = ?';
    db.query(checkQuery, [id], (err, results) => {
        if (err) {
            console.error('Erreur lors de la vérification des références du registre:', err);
            return res.status(500).send('Erreur lors de la vérification des références du registre');
        }

        const count = results[0].count;
        if (count > 0) {
            return res.status(400).send('Impossible de supprimer ce registre car il est lié à des animaux.');
        }

        const query = 'DELETE FROM register_name WHERE id = ?';
        db.query(query, [id], (err, results) => {
            if (err) {
                console.error('Erreur lors de la suppression du registre:', err);
                return res.status(500).send('Erreur lors de la suppression du registre');
            }
            res.sendStatus(200);
        });
    });
});


// router pour modifier un registre
router.post('/editRegister/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const query = 'UPDATE register_name SET name = ? WHERE id = ?';
    db.query(query, [name, id], (err, results) => {
        if (err) {
            return res.status(500).send('Erreur lors de la mise à jour du registre');
        }
        res.sendStatus(200);
    });
});

module.exports = router;
