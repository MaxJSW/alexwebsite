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

// route pour le get de la page myAnimals dans le router

// get pour la page MyAnimals
router.get('/', isAuthenticated, (req, res) => {
    const success = req.query.success;
    const error = req.query.error;
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.toLowerCase() : '';
  
    const userId = req.session.user.id;
  
    let query = `
      SELECT a.*, i.image_path
      FROM animals a
      LEFT JOIN (
        SELECT animal_id, MIN(image_path) as image_path
        FROM images
        GROUP BY animal_id
      ) i ON a.id = i.animal_id
      WHERE a.user_id = ?
    `;
  
    const countQuery = 'SELECT COUNT(*) AS count FROM animals WHERE user_id = ?';
  
    if (search) {
      query += ` AND LOWER(a.name) LIKE ?`;
    }
  
    query += ` ORDER BY a.id DESC LIMIT ? OFFSET ?`;
  
    const queryParams = search ? [userId, `%${search}%`, limit, offset] : [userId, limit, offset];
    const countParams = search ? [userId, `%${search}%`] : [userId];
  
    db.query(countQuery, countParams, (err, countResults) => {
      if (err) {
        console.error('Erreur lors de la récupération du nombre total d\'animaux:', err);
        return res.status(500).send('Erreur lors de la récupération du nombre total d\'animaux');
      }
  
      const totalAnimals = countResults[0].count;
      const totalPages = Math.ceil(totalAnimals / limit);
  
      db.query(query, queryParams, (err, results) => {
        if (err) {
          console.error('Erreur lors de la récupération des animaux:', err);
          return res.status(500).send('Erreur lors de la récupération des animaux');
        }
  
        res.render('myanimals', {
          user: req.session.user,
          kennel_name: req.session.kennel_name,
          animals: results,
          currentPage: page,
          totalPages: totalPages,
          totalAnimals: totalAnimals,
          search: req.query.search || '',
          success: success,
          error: error,
          currentPage: 'myanimals'
        });
      });
    });
  });


// nouvelle route pour la recherche d'animax en Ajax sur la page myAnimals
router.get('/searchAnimals', isAuthenticated, (req, res) => {
    const query = `
        SELECT a.*, i.image_path
        FROM animals a
        LEFT JOIN (
            SELECT animal_id, MIN(image_path) as image_path
            FROM images
            GROUP BY animal_id
        ) i ON a.id = i.animal_id
        WHERE a.user_id = ? AND a.name LIKE ?
        LIMIT 6
    `;
    const userId = req.session.user.id;
    const searchQuery = `%${req.query.search}%`;

    db.query(query, [userId, searchQuery], (err, results) => {
        if (err) {
            console.error('Erreur lors de la recherche des animaux:', err);
            return res.status(500).send('Erreur lors de la recherche des animaux');
        }

        res.render('partials/animalList', { animals: results });
    });
});



module.exports = router;
