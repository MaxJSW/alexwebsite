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
// const db2 = require('../db2');

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

router.use('/uploads', express.static(path.join(__dirname, '../uploads')));


// Route pour afficher la page addMarriages + filtre par utilisateur
router.get('/', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;

    const malesQuery = `
        SELECT a.*, 
               (SELECT i.image_path 
                FROM images i 
                WHERE i.animal_id = a.id 
                LIMIT 1) AS image_path 
        FROM animals a 
        WHERE a.gender = 'Male' AND a.user_id = ?
    `;

    const femalesQuery = `
        SELECT a.*, 
               (SELECT i.image_path 
                FROM images i 
                WHERE i.animal_id = a.id 
                LIMIT 1) AS image_path 
        FROM animals a 
        WHERE a.gender = 'Femelle' AND a.user_id = ?
    `;

    const marriagesQuery = `
        SELECT 
            m.id,
            a1.name AS father_name,
            a2.name AS mother_name,
            m.expected_puppies,
            DATE_FORMAT(m.expected_birth_date, '%Y-%m-%d') AS expected_birth_date,
            DATE_FORMAT(m.actual_birth_date, '%Y-%m-%d') AS actual_birth_date,
            m.actual_male_puppies,
            m.actual_female_puppies,
            m.marriages_status,
            m.is_online,
            m.get_banner,
            m.marriages_description
        FROM marriages m
        LEFT JOIN animals a1 ON m.male_id = a1.id
        LEFT JOIN animals a2 ON m.female_id = a2.id
        WHERE m.user_id = ?
    `;

    const marriagesImagesQuery = `
        SELECT mi.marriage_id, mi.image_path
        FROM marriages_images mi
        JOIN marriages m ON mi.marriage_id = m.id
        WHERE m.user_id = ?
    `;

    Promise.all([
        new Promise((resolve, reject) => {
            db.query(malesQuery, [userId], (err, males) => {
                if (err) return reject(err);
                resolve(males);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(femalesQuery, [userId], (err, females) => {
                if (err) return reject(err);
                resolve(females);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(marriagesQuery, [userId], (err, marriages) => {
                if (err) return reject(err);
                resolve(marriages);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(marriagesImagesQuery, [userId], (err, marriagesImages) => {
                if (err) return reject(err);
                resolve(marriagesImages);
            });
        })
    ]).then(([males, females, marriages, marriagesImages]) => {
        // Transformer les images de mariage en un objet avec les IDs de mariage comme clés
        const marriageImagesMap = marriagesImages.reduce((acc, image) => {
            if (!acc[image.marriage_id]) {
                acc[image.marriage_id] = [];
            }
            acc[image.marriage_id].push(image.image_path);
            return acc;
        }, {});

        res.render('addMarriages', {
            user: req.session.user,
            males: males,
            females: females,
            marriages: marriages,
            marriagesImages: marriageImagesMap,
            currentPage: 'mariages'
        });
    }).catch(err => {
        console.error('Erreur lors de la récupération des animaux et des mariages:', err);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des animaux et des mariages' });
    });
});


// Route pour obtenir la liste des mariages + filtre par utilisateur
router.get('/getMarriages', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const query = `
        SELECT marriages.*,
            father.name as father_name,
            mother.name as mother_name
        FROM marriages
        JOIN animals AS father ON marriages.male_id = father.id
        JOIN animals AS mother ON marriages.female_id = mother.id
        WHERE marriages.user_id = ?
        ORDER BY marriages.id DESC
    `;
 
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des mariages:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Erreur lors de la récupération des mariages' 
            });
        }
        res.json({ success: true, marriages: results });
    });
 });


// router get pour récupérer les informations des mariages modifiés
router.get('/getEditMarriages/:marriageId', isAuthenticated, (req, res) => {
    const marriageId = req.params.marriageId;

    const marriageQuery = `
        SELECT marriages.*, 
               father.name as father_name, 
               mother.name as mother_name
        FROM marriages
        JOIN animals AS father ON marriages.male_id = father.id
        JOIN animals AS mother ON marriages.female_id = mother.id
        WHERE marriages.id = ?
    `;

    const imagesQuery = `
        SELECT id, marriage_id, image_path FROM marriages_images 
        WHERE marriage_id = ?
    `;

    db.query(marriageQuery, [marriageId], (err, marriageResults) => {
        if (err) {
            console.error('Erreur lors de la récupération du mariage:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération du mariage' });
        }

        db.query(imagesQuery, [marriageId], (err, imagesResults) => {
            if (err) {
                console.error('Erreur lors de la récupération des images du mariage:', err);
                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des images du mariage' });
            }

            res.json({ 
                success: true, 
                marriage: marriageResults[0], 
                images: imagesResults 
            });
        });
    });
});



// Route pour récupérer les images des bannières d'un mariage spécifique
router.get('/getBannerMarriages/:marriageId', isAuthenticated, (req, res) => {
    const marriageId = req.params.marriageId;
    const query = `
        SELECT mi.marriage_id, mi.image_path, m.get_banner 
        FROM marriages_images mi
        JOIN marriages m ON mi.marriage_id = m.id
        WHERE mi.marriage_id = ?
    `;

    db.query(query, [marriageId], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des bannières:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des bannières' });
        }

        if (results.length > 0) {
            res.json({ success: true, images: results, get_banner: results[0].get_banner });
        } else {
            res.json({ success: true, images: [], get_banner: 0 });
        }
    });
});


// router post pour la création d'un mariage + création des chiots dans la table puppies
router.post('/', isAuthenticated, (req, res) => {
    const { male_id, female_id, expected_puppies, expected_birth_date, actual_birth_date, actual_male_puppies, actual_female_puppies, marriages_slug } = req.body;
    const user_id = req.session.user.id;
  
    const actualMalePuppies = actual_male_puppies !== '' ? actual_male_puppies : 0;
    const actualFemalePuppies = actual_female_puppies !== '' ? actual_female_puppies : 0;
  
    const query = `
      INSERT INTO marriages (male_id, female_id, expected_puppies, expected_birth_date, actual_birth_date, actual_male_puppies, actual_female_puppies, marriages_slug, user_id, marriages_description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '')
    `;
  
    db.query(query, [male_id, female_id, expected_puppies, expected_birth_date, actual_birth_date, actualMalePuppies, actualFemalePuppies, marriages_slug, user_id, ''], (err, result) => {
      if (err) {
        console.error('Erreur lors de l\'enregistrement du mariage:', err);
        return res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement du mariage' });
      }
  
      const marriageId = result.insertId;
  
      const insertPuppies = (count, gender) => {
        if (count > 0) {
          let values = [];
          for (let i = 0; i < count; i++) {
            const available_date = new Date(new Date(actual_birth_date).setDate(new Date(actual_birth_date).getDate() + 60));
            values.push([`Chiot-${i + 1}`, gender, marriageId, actual_birth_date, available_date, male_id, female_id, user_id]);
          }
          const queryPuppies = `INSERT INTO puppies (puppy_name, puppy_gender, marriage_id, puppy_birth_date, available_date, father_id, mother_id, user_id) VALUES ?`;
          db.query(queryPuppies, [values], (err, result) => {
            if (err) {
              console.error('Erreur lors de l\'enregistrement des chiots:', err);
              return res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement des chiots' });
            }
          });
        }
      };
  
      insertPuppies(actualMalePuppies, 'Mâle');
      insertPuppies(actualFemalePuppies, 'Femelle');
  
      res.json({ success: true, message: 'Mariage et chiots enregistrés avec succès' });
    });
  });



// Route post pour mettre à jour les informations du mariage + création des chiots dans la table puppies 
router.post('/editMarriage/:marriageId', isAuthenticated, (req, res) => {
    const marriageId = req.params.marriageId;
    const user_id = req.session.user.id;
    const { expected_puppies, expected_birth_date, actual_birth_date, actual_male_puppies, actual_female_puppies, marriages_status, is_online, get_banner, marriages_description, male_id, female_id, marriages_slug } = req.body;


    const updateQuery = `
        UPDATE marriages 
        SET 
            expected_puppies = ?, 
            expected_birth_date = ?, 
            actual_birth_date = ?, 
            actual_male_puppies = ?, 
            actual_female_puppies = ?, 
            marriages_status = ?, 
            is_online = ?, 
            get_banner = ?, 
            marriages_description = ?,
            male_id = ?, 
            female_id = ?,
            marriages_slug = ?
        WHERE id = ?
    `;

    db.query(updateQuery, [expected_puppies, expected_birth_date, actual_birth_date, actual_male_puppies, actual_female_puppies, marriages_status, is_online, get_banner, marriages_description, male_id, female_id, marriages_slug, marriageId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la mise à jour du mariage:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du mariage' });
        }

        const updatePuppiesBirthDateQuery = `
            UPDATE puppies 
            SET puppy_birth_date = ?, available_date = ?, father_id = ?, mother_id = ?
            WHERE marriage_id = ?
        `;
        
        const available_date = new Date(new Date(actual_birth_date).setDate(new Date(actual_birth_date).getDate() + 60));

        db.query(updatePuppiesBirthDateQuery, [actual_birth_date, available_date, male_id, female_id, marriageId], (err, result) => {
            if (err) {
                console.error('Erreur lors de la mise à jour des chiots:', err);
                return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des chiots' });
            }

            const checkAndUpdatePuppies = (count, gender) => {
                const queryCheck = `SELECT COUNT(*) AS count FROM puppies WHERE marriage_id = ? AND puppy_gender = ?`;

                db.query(queryCheck, [marriageId, gender], (err, result) => {
                    if (err) {
                        console.error('Erreur lors de la vérification des chiots:', err);
                        return res.status(500).json({ success: false, message: 'Erreur lors de la vérification des chiots' });
                    }

                    const existingCount = result[0].count;

                    if (existingCount < count) {
                        let values = [];
                        for (let i = existingCount; i < count; i++) {
                            values.push([`Chiot ${i + 1}`, gender, marriageId, actual_birth_date, available_date, male_id, female_id, user_id]);
                        }
                        const queryPuppies = `INSERT INTO puppies (puppy_name, puppy_gender, marriage_id, puppy_birth_date, available_date, father_id, mother_id, user_id) VALUES ?`;


                        db.query(queryPuppies, [values], (err, result) => {
                            if (err) {
                                console.error('Erreur lors de l\'enregistrement des chiots:', err);
                                return res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement des chiots' });
                            }
                        });
                    } else if (existingCount > count) {
                        const queryDelete = `DELETE FROM puppies WHERE marriage_id = ? AND puppy_gender = ? LIMIT ?`;


                        db.query(queryDelete, [marriageId, gender, existingCount - count], (err, result) => {
                            if (err) {
                                console.error('Erreur lors de la suppression des chiots:', err);
                                return res.status(500).json({ success: false, message: 'Erreur lors de la suppression des chiots' });
                            }
                        });
                    }
                });
            };

            checkAndUpdatePuppies(actual_male_puppies, 'Mâle');
            checkAndUpdatePuppies(actual_female_puppies, 'Femelle');

            res.json({ success: true, message: 'Mariage et chiots mis à jour avec succès' });
        });
    });
});



////////////////////////////////////////////

// router pour checker une bannière existante
router.get('/checkBanner/:marriageId', isAuthenticated, (req, res) => {
    const marriageId = req.params.marriageId;
    const query = `
        SELECT * 
        FROM marriages_images 
        WHERE marriage_id = ?
    `;

    db.query(query, [marriageId], (err, results) => {
        if (err) {
            console.error('Erreur lors de la vérification de la bannière:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de la bannière' });
        }
        res.json({ success: true, hasBanner: results.length > 0, images: results });
    });
});


// Route pour télécharger la bannière
router.post('/uploadBanner/:marriageId', isAuthenticated, upload.single('bannerPhoto'), (req, res) => {
    const marriageId = req.params.marriageId;
    const imagePath = req.file.filename;  // Stocker uniquement le nom du fichier

    const checkBannerQuery = `
        SELECT image_path 
        FROM marriages_images 
        WHERE marriage_id = ?
    `;

    const updateBannerQuery = `
        UPDATE marriages_images 
        SET image_path = ? 
        WHERE marriage_id = ?
    `;

    const insertBannerQuery = `
        INSERT INTO marriages_images (marriage_id, image_path) 
        VALUES (?, ?)
    `;

    db.query(checkBannerQuery, [marriageId], (err, results) => {
        if (err) {
            console.error('Erreur lors de la vérification de la bannière:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de la bannière' });
        }

        if (results.length > 0) {
            // Une bannière existe déjà, mise à jour nécessaire
            db.query(updateBannerQuery, [imagePath, marriageId], (err, result) => {
                if (err) {
                    console.error('Erreur lors de la mise à jour de la bannière:', err);
                    return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la bannière' });
                }

                res.json({ success: true, message: 'Bannière mise à jour avec succès', imagePath: imagePath });
            });
        } else {
            // Pas de bannière existante, insertion nécessaire
            db.query(insertBannerQuery, [marriageId, imagePath], (err, result) => {
                if (err) {
                    console.error('Erreur lors du téléchargement de la bannière:', err);
                    return res.status(500).json({ success: false, message: 'Erreur lors du téléchargement de la bannière' });
                }

                res.json({ success: true, message: 'Bannière téléchargée avec succès', imagePath: imagePath });
            });
        }
    });
});


// router pour la mise à jour du statut get_banner
router.post('/updateMarriage/:id', isAuthenticated, (req, res) => {
    const marriageId = req.params.id;
    const { get_banner } = req.body;

    const query = `
        UPDATE marriages 
        SET get_banner = ? 
        WHERE id = ?
    `;

    db.query(query, [get_banner, marriageId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la mise à jour du mariage:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du mariage' });
        }
        res.json({ success: true, message: 'Mariage mis à jour avec succès' });
    });
});


// router pour mettre à jour les mariages dans le tableau
router.get('/api/marriages', isAuthenticated, (req, res) => {
    const marriagesQuery = `
    SELECT 
        m.id,
        a1.name AS father_name,
        a2.name AS mother_name,
        m.actual_male_puppies,
        m.actual_female_puppies,
        m.marriages_status,
        m.is_online
    FROM marriages m
    LEFT JOIN animals a1 ON m.male_id = a1.id
    LEFT JOIN animals a2 ON m.female_id = a2.id
`;

    db.query(marriagesQuery, (err, marriages) => {
        if (err) {
            console.error('Erreur lors de la récupération des mariages:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des mariages' });
        }
        res.json({ marriages: marriages });
    });
});

module.exports = router;
