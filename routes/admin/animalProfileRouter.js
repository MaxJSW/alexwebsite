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
const sharp = require('sharp');

// Modules locaux (vos propres fichiers)
const db = require('../db');


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


// router get pour afficher le profil de l'animal
router.get('/:slug', isAuthenticated, (req, res) => {
  const animalSlug = req.params.slug;

  const queryAnimal = `
    SELECT 
    a.id,
    a.name,
    a.in_breeding,
    a.gender,
    a.other_names,
    a.category,
    a.breed_type,
    a.birth_date,
    a.color,
    a.coat_type,
    a.eye_color,
    a.is_online,
    a.health_tests,
    a.description_animals,
    a.register_id,
    a.father_id,
    a.mother_id,
    a.country_id,
    a.breed_id,
    a.user_id,
    a.slug,
    a.retreat,
    a.open_for_stud,
    b.name AS breed_name, 
    c.name AS country_name,
    f.id AS father_id, 
    f.father_name, 
    f.father_gender,
    f.father_color,
    r_f.name AS father_register_name,
    b_f.name AS father_breed_name,
    c_f.name AS father_country_name,
    f.father_breed_type AS father_breed_type,
    f.father_birth_date AS father_birth_date,
    f.father_coat_type AS father_coat_type,
    f.father_eye_color AS father_eye_color,
    f.father_is_online AS father_is_online,
    f.paternal_grandfather_id,
    f.paternal_grandmother_id,
    m.id AS mother_id, 
    m.mother_name, 
    m.mother_gender,
    m.mother_color,
    r_m.name AS mother_register_name,
    b_m.name AS mother_breed_name,
    c_m.name AS mother_country_name,
    m.mother_breed_type AS mother_breed_type,
    m.mother_birth_date AS mother_birth_date,
    m.mother_coat_type AS mother_coat_type,
    m.mother_eye_color AS mother_eye_color,
    m.mother_is_online AS mother_is_online,
    m.maternal_grandfather_id,
    m.maternal_grandmother_id,
    r.name AS register_name,
    gf1.grandfather_name AS paternal_grandfather_name, 
    gf1.grandfather_gender AS paternal_grandfather_gender,
    gf1.grandfather_color AS paternal_grandfather_color,
    b_gf1.name AS paternal_grandfather_breed,
    gf1.breed_id AS paternal_grandfather_breed_id,
    r_gf1.name AS paternal_grandfather_register,
    gf1.register_id AS paternal_grandfather_register_id,
    c_gf1.name AS paternal_grandfather_country,
    gf1.country_id AS paternal_grandfather_country_id,
    gf1.grandfather_coat_type AS paternal_grandfather_coat_type,
    gf1.grandfather_eye_color AS paternal_grandfather_eye_color,
    gf1.grandfather_is_online AS paternal_grandfather_is_online,
    gf1.grandfather_birth_date AS paternal_grandfather_birth_date,
    gf1.grandfather_breed_type AS paternal_grandfather_breed_type,
    gm1.grandmother_name AS paternal_grandmother_name,
    gm1.grandmother_gender AS paternal_grandmother_gender,
    gm1.grandmother_color AS paternal_grandmother_color,
    gm1.grandmother_birth_date AS paternal_grandmother_birth_date,
    gm1.grandmother_breed_type AS paternal_grandmother_breed_type,
    gm1.grandmother_coat_type AS paternal_grandmother_coat_type,
    gm1.grandmother_eye_color AS paternal_grandmother_eye_color,
    b_gm1.name AS paternal_grandmother_breed,
    gm1.breed_id AS paternal_grandmother_breed_id,
    r_gm1.name AS paternal_grandmother_register,
    gm1.register_id AS paternal_grandmother_register_id,
    c_gm1.name AS paternal_grandmother_country,
    gm1.country_id AS paternal_grandmother_country_id,
    gf2.grandfather_name AS maternal_grandfather_name,
    gf2.grandfather_gender AS maternal_grandfather_gender,
    gf2.grandfather_color AS maternal_grandfather_color,
    gf2.grandfather_birth_date AS maternal_grandfather_birth_date,
    gf2.grandfather_breed_type AS maternal_grandfather_breed_type,
    b_gf2.name AS maternal_grandfather_breed,
    gf2.breed_id AS maternal_grandfather_breed_id,
    r_gf2.name AS maternal_grandfather_register,
    gf2.register_id AS maternal_grandfather_register_id,
    c_gf2.name AS maternal_grandfather_country,
    gf2.country_id AS maternal_grandfather_country_id,
    gm2.grandmother_name AS maternal_grandmother_name,
    gm2.grandmother_gender AS maternal_grandmother_gender,
    gm2.grandmother_color AS maternal_grandmother_color,
    gm2.grandmother_birth_date AS maternal_grandmother_birth_date,
    gm2.grandmother_breed_type AS maternal_grandmother_breed_type,
    gm2.grandmother_coat_type AS maternal_grandmother_coat_type,
    gm2.grandmother_eye_color AS maternal_grandmother_eye_color,
    b_gm2.name AS maternal_grandmother_breed,
    gm2.breed_id AS maternal_grandmother_breed_id,
    r_gm2.name AS maternal_grandmother_register,
    gm2.register_id AS maternal_grandmother_register_id,
    c_gm2.name AS maternal_grandmother_country,
    gm2.country_id AS maternal_grandmother_country_id,
    (SELECT image_path_profile FROM profile_images WHERE animal_id = a.id LIMIT 1) AS image_path_profile,
    (SELECT image_path FROM images_father WHERE father_id = a.father_id LIMIT 1) AS father_image_path,
    (SELECT image_path FROM images_mother WHERE mother_id = a.mother_id LIMIT 1) AS mother_image_path,
    (SELECT image_path FROM images_grandfather WHERE grandfather_id = f.paternal_grandfather_id LIMIT 1) AS paternal_grandfather_image_path,
    (SELECT image_path FROM images_grandmother WHERE grandmother_id = f.paternal_grandmother_id LIMIT 1) AS paternal_grandmother_image_path,
    (SELECT image_path FROM images_grandfather WHERE grandfather_id = m.maternal_grandfather_id LIMIT 1) AS maternal_grandfather_image_path,
    (SELECT image_path FROM images_grandmother WHERE grandmother_id = m.maternal_grandmother_id LIMIT 1) AS maternal_grandmother_image_path,
    GROUP_CONCAT(k.keywords_content) AS keywords_content,
    aw.year AS award_year,
    aw.award_id,
    aw.award_name,
    aw.award_description
FROM animals a
LEFT JOIN breed_name b ON a.breed_id = b.id
LEFT JOIN country_name c ON a.country_id = c.id
LEFT JOIN father_table f ON a.father_id = f.id
LEFT JOIN mother_table m ON a.mother_id = m.id
LEFT JOIN grandfather_table gf1 ON f.paternal_grandfather_id = gf1.id
LEFT JOIN breed_name b_gf1 ON gf1.breed_id = b_gf1.id
LEFT JOIN register_name r_gf1 ON gf1.register_id = r_gf1.id
LEFT JOIN country_name c_gf1 ON gf1.country_id = c_gf1.id
LEFT JOIN grandmother_table gm1 ON f.paternal_grandmother_id = gm1.id
LEFT JOIN breed_name b_gm1 ON gm1.breed_id = b_gm1.id
LEFT JOIN register_name r_gm1 ON gm1.register_id = r_gm1.id
LEFT JOIN country_name c_gm1 ON gm1.country_id = c_gm1.id
LEFT JOIN grandfather_table gf2 ON m.maternal_grandfather_id = gf2.id
LEFT JOIN breed_name b_gf2 ON gf2.breed_id = b_gf2.id
LEFT JOIN register_name r_gf2 ON gf2.register_id = r_gf2.id
LEFT JOIN country_name c_gf2 ON gf2.country_id = c_gf2.id
LEFT JOIN grandmother_table gm2 ON m.maternal_grandmother_id = gm2.id
LEFT JOIN breed_name b_gm2 ON gm2.breed_id = b_gm2.id
LEFT JOIN register_name r_gm2 ON gm2.register_id = r_gm2.id
LEFT JOIN country_name c_gm2 ON gm2.country_id = c_gm2.id
LEFT JOIN breed_name b_f ON f.breed_id = b_f.id
LEFT JOIN country_name c_f ON f.country_id = c_f.id
LEFT JOIN register_name r_f ON f.register_id = r_f.id
LEFT JOIN breed_name b_m ON m.breed_id = b_m.id
LEFT JOIN country_name c_m ON m.country_id = c_m.id
LEFT JOIN register_name r_m ON m.register_id = r_m.id
LEFT JOIN register_name r ON a.register_id = r.id
LEFT JOIN keywords k ON a.id = k.animal_id
LEFT JOIN awards aw ON a.id = aw.animal_id
WHERE a.slug = ?
GROUP BY a.id, aw.award_id, aw.year
ORDER BY aw.year DESC, aw.award_name ASC;

`;




  const queryImages = `
      SELECT id, image_path
      FROM images
      WHERE animal_id = (SELECT id FROM animals WHERE slug = ?)
  `;

  const queryImagesFather = `
      SELECT id, image_path
      FROM images_father
      WHERE father_id = (SELECT father_id FROM animals WHERE slug = ?)
  `;

  const queryImagesMother = `
      SELECT id, image_path
      FROM images_mother
      WHERE mother_id = (SELECT mother_id FROM animals WHERE slug = ?)
  `;

  const queryImagesPaternalGrandfather = `
      SELECT id, image_path
      FROM images_grandfather
      WHERE grandfather_id = (SELECT paternal_grandfather_id FROM father_table WHERE id = (SELECT father_id FROM animals WHERE slug = ?))
  `;

  const queryImagesPaternalGrandmother = `
      SELECT id, image_path
      FROM images_grandmother
      WHERE grandmother_id = (SELECT paternal_grandmother_id FROM father_table WHERE id = (SELECT father_id FROM animals WHERE slug = ?))
  `;

  const queryImagesMaternalGrandfather = `
      SELECT id, image_path
      FROM images_grandfather
      WHERE grandfather_id = (SELECT maternal_grandfather_id FROM mother_table WHERE id = (SELECT mother_id FROM animals WHERE slug = ?))
  `;

  const queryImagesMaternalGrandmother = `
      SELECT id, image_path
      FROM images_grandmother
      WHERE grandmother_id = (SELECT maternal_grandmother_id FROM mother_table WHERE id = (SELECT mother_id FROM animals WHERE slug = ?))
  `;

  const queryBreeds = 'SELECT id, name FROM breed_name';
  const queryCountries = 'SELECT id, name FROM country_name';
  const queryRegisters = 'SELECT id, name FROM register_name';

  const queryGrandfathers = 'SELECT * FROM grandfather_table';
  const queryGrandmothers = 'SELECT * FROM grandmother_table';

  db.query(queryAnimal, [animalSlug], (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des informations de l\'animal:', err);
          return res.status(500).send('Erreur lors de la récupération des informations de l\'animal');
      }

      const animal = results.length ? results[0] : {};
      animal.keywords = animal.keywords_content ? animal.keywords_content.split(',') : [];



      // Séparer les récompenses par année
      const awardsByYear = results.reduce((acc, result) => {
        if (result.award_year) {
            if (!acc[result.award_year]) {
                acc[result.award_year] = [];
            }
            // Insérer au début de la liste pour inverser l'ordre
            acc[result.award_year].unshift({
                award_id: result.award_id,// Pass award id to the view
                award_name: result.award_name,
                award_description: result.award_description
            });
        }
        return acc;
    }, {});


      if (animal && animal.birth_date) {
        const birthDate = moment(animal.birth_date);
        animal.formatted_birth_date = birthDate.format('DD MMMM YYYY');
    
        const totalMonths = moment().diff(birthDate, 'months');
        const years = Math.floor(totalMonths / 12); // Nombre d'années
        const months = totalMonths % 12; // Mois restants
    
        if (totalMonths < 24) {
            // Si l'animal a moins de 24 mois, on affiche les mois
            animal.age = `${totalMonths} Mois`;
        } else {
            // Si l'animal a 24 mois ou plus, on affiche les années et les mois restants
            if (months === 0) {
                animal.age = `${years} ${years > 1 ? 'Ans' : 'An'}`;
            } else {
                animal.age = `${years} ${years > 1 ? 'Ans' : 'An'} et ${months} Mois`;
            }
        }
    }
    

      // Formate la date de naissance du père pour l'utiliser dans le formulaire
      if (animal && animal.father_birth_date) {
          const fatherBirthDate = moment(animal.father_birth_date);
          animal.formatted_father_birth_date = fatherBirthDate.format('YYYY-MM-DD');
      }

      // Formate la date de naissance de la mère pour l'utiliser dans le formulaire
      if (animal && animal.mother_birth_date) {
          const motherBirthDate = moment(animal.mother_birth_date);
          animal.formatted_mother_birth_date = motherBirthDate.format('YYYY-MM-DD');
      }

      // Formate les dates de naissance des grands-parents paternels et maternels
      if (animal && animal.paternal_grandfather_birth_date) {
          const paternalGrandfatherBirthDate = moment(animal.paternal_grandfather_birth_date);
          animal.formatted_paternal_grandfather_birth_date = paternalGrandfatherBirthDate.format('YYYY-MM-DD');
      }

      if (animal && animal.paternal_grandmother_birth_date) {
          const paternalGrandmotherBirthDate = moment(animal.paternal_grandmother_birth_date);
          animal.formatted_paternal_grandmother_birth_date = paternalGrandmotherBirthDate.format('YYYY-MM-DD');
      }

      if (animal && animal.maternal_grandfather_birth_date) {
          const maternalGrandfatherBirthDate = moment(animal.maternal_grandfather_birth_date);
          animal.formatted_maternal_grandfather_birth_date = maternalGrandfatherBirthDate.format('YYYY-MM-DD');
      }

      if (animal && animal.maternal_grandmother_birth_date) {
          const maternalGrandmotherBirthDate = moment(animal.maternal_grandmother_birth_date);
          animal.formatted_maternal_grandmother_birth_date = maternalGrandmotherBirthDate.format('YYYY-MM-DD');
      }

      db.query(queryImages, [animalSlug], (err, imageResults) => {
          if (err) {
              console.error('Erreur lors de la récupération des images:', err);
              return res.status(500).send('Erreur lors de la récupération des images');
          }

          const images = imageResults;

          db.query(queryImagesFather, [animalSlug], (err, imagesFatherResults) => {
              if (err) {
                  console.error('Erreur lors de la récupération des images du père:', err);
                  return res.status(500).send('Erreur lors de la récupération des images du père');
              }

              const imagesFather = imagesFatherResults;

              db.query(queryImagesMother, [animalSlug], (err, imagesMotherResults) => {
                  if (err) {
                      console.error('Erreur lors de la récupération des images de la mère:', err);
                      return res.status(500).send('Erreur lors de la récupération des images de la mère');
                  }

                  const imagesMother = imagesMotherResults;

                  db.query(queryImagesPaternalGrandfather, [animalSlug], (err, imagesPaternalGrandfatherResults) => {
                      if (err) {
                          console.error('Erreur lors de la récupération des images du grand-père paternel:', err);
                          return res.status(500).send('Erreur lors de la récupération des images du grand-père paternel');
                      }

                      const imagesPaternalGrandfather = imagesPaternalGrandfatherResults;

                      db.query(queryImagesPaternalGrandmother, [animalSlug], (err, imagesPaternalGrandmotherResults) => {
                          if (err) {
                              console.error('Erreur lors de la récupération des images de la grand-mère paternelle:', err);
                              return res.status(500).send('Erreur lors de la récupération des images de la grand-mère paternelle');
                          }

                          const imagesPaternalGrandmother = imagesPaternalGrandmotherResults;

                          db.query(queryImagesMaternalGrandfather, [animalSlug], (err, imagesMaternalGrandfatherResults) => {
                              if (err) {
                                  console.error('Erreur lors de la récupération des images du grand-père maternel:', err);
                                  return res.status(500).send('Erreur lors de la récupération des images du grand-père maternel');
                              }

                              const imagesMaternalGrandfather = imagesMaternalGrandfatherResults;

                              db.query(queryImagesMaternalGrandmother, [animalSlug], (err, imagesMaternalGrandmotherResults) => {
                                  if (err) {
                                      console.error('Erreur lors de la récupération des images de la grand-mère maternelle:', err);
                                      return res.status(500).send('Erreur lors de la récupération des images de la grand-mère maternelle');
                                  }

                                  const imagesMaternalGrandmother = imagesMaternalGrandmotherResults;

                                  db.query(queryBreeds, (err, breeds) => {
                                      if (err) {
                                          console.error('Erreur lors de la récupération des races:', err);
                                          return res.status(500).send('Erreur lors de la récupération des races');
                                      }

                                      db.query(queryCountries, (err, countries) => {
                                          if (err) {
                                              console.error('Erreur lors de la récupération des pays:', err);
                                              return res.status(500).send('Erreur lors de la récupération des pays');
                                          }

                                          db.query(queryRegisters, (err, registers) => {
                                              if (err) {
                                                  console.error('Erreur lors de la récupération des registres:', err);
                                                  return res.status(500).send('Erreur lors de la récupération des registres');
                                              }

                                              db.query(queryGrandfathers, (err, grandfathers) => {
                                                  if (err) {
                                                      console.error('Erreur lors de la récupération des grands-pères:', err);
                                                      return res.status(500).send('Erreur lors de la récupération des grands-pères');
                                                  }

                                                  db.query(queryGrandmothers, (err, grandmothers) => {
                                                      if (err) {
                                                          console.error('Erreur lors de la récupération des grands-mères:', err);
                                                          return res.status(500).send('Erreur lors de la récupération des grands-mères');
                                                      }
                                                 
                                                      res.render('animalProfile', {
                                                        
                                                          animal: animal,
                                                          images: images,
                                                          imagesFather: imagesFather,
                                                          imagesMother: imagesMother,
                                                          imagesPaternalGrandfather: imagesPaternalGrandfather,
                                                          imagesPaternalGrandmother: imagesPaternalGrandmother,
                                                          imagesMaternalGrandfather: imagesMaternalGrandfather,
                                                          imagesMaternalGrandmother: imagesMaternalGrandmother,
                                                          breeds: breeds,
                                                          countries: countries,
                                                          registers: registers,
                                                          grandfathers: grandfathers,
                                                          grandmothers: grandmothers,
                                                          user: req.session.user,
                                                          kennel_name: req.session.kennel_name,
                                                          awardsByYear: awardsByYear,
                                                          father_image_path: animal.father_image_path, 
                                                          mother_image_path: animal.mother_image_path, 
                                                          paternal_grandfather_image_path: animal.paternal_grandfather_image_path, 
                                                          paternal_grandmother_image_path: animal.paternal_grandmother_image_path, 
                                                          maternal_grandfather_image_path: animal.maternal_grandfather_image_path, 
                                                          maternal_grandmother_image_path: animal.maternal_grandmother_image_path,
                                                          currentPage: 'dogs'
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
          });
      });
  });
});


// query en fetch pour récupérer les informations du père dans la modale
router.get('/:slug/fatherInfo', isAuthenticated, (req, res) => {
  const animalSlug = req.params.slug;

  const queryFatherInfo = `
      SELECT 
          f.id AS father_id, 
          f.father_name, 
          f.breed_id, 
          b.name AS breed_name, 
          f.father_color, 
          f.father_gender,
          f.register_id,  
          r.name AS register_name,
          f.country_id, 
          c.name AS country_name, 
          f.father_breed_type, 
          f.father_birth_date, 
          f.father_coat_type, 
          f.father_eye_color, 
          f.father_is_online, 
          f.paternal_grandfather_id, 
          f.paternal_grandmother_id
      FROM animals a
      LEFT JOIN father_table f ON a.father_id = f.id
      LEFT JOIN breed_name b ON f.breed_id = b.id  -- Jointure pour récupérer le nom de la race
      LEFT JOIN register_name r ON f.register_id = r.id  -- Jointure pour récupérer le nom du registre
      LEFT JOIN country_name c ON f.country_id = c.id  -- Jointure pour récupérer le nom du pays
      WHERE a.slug = ? 
      LIMIT 1`;

  db.query(queryFatherInfo, [animalSlug], (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des informations du père:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des informations du père' });
      }

      if (results.length > 0) {
          return res.json({ success: true, father: results[0] });
      } else {
          return res.json({ success: false, message: 'Aucune information disponible pour le père' });
      }
  });
});


// query en fetch pour récupérer les informations de la mère dans la modale
router.get('/:slug/motherInfo', isAuthenticated, (req, res) => {
  const animalSlug = req.params.slug;

  const queryMotherInfo = `
      SELECT 
          m.id AS mother_id, 
          m.mother_name, 
          m.breed_id, 
          b.name AS breed_name, 
          m.mother_color, 
          m.mother_gender,
          m.register_id,  
          r.name AS register_name,
          m.country_id, 
          c.name AS country_name, 
          m.mother_breed_type, 
          m.mother_birth_date, 
          m.mother_coat_type, 
          m.mother_eye_color, 
          m.mother_is_online, 
          m.maternal_grandfather_id, 
          m.maternal_grandmother_id
      FROM animals a
      LEFT JOIN mother_table m ON a.mother_id = m.id
      LEFT JOIN breed_name b ON m.breed_id = b.id  -- Jointure pour récupérer le nom de la race
      LEFT JOIN register_name r ON m.register_id = r.id  -- Jointure pour récupérer le nom du registre
      LEFT JOIN country_name c ON m.country_id = c.id  -- Jointure pour récupérer le nom du pays
      WHERE a.slug = ? 
      LIMIT 1`;

  db.query(queryMotherInfo, [animalSlug], (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des informations de la mère:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des informations de la mère' });
      }

      if (results.length > 0) {
          return res.json({ success: true, mother: results[0] });
      } else {
          return res.json({ success: false, message: 'Aucune information disponible pour la mère' });
      }
  });
});


// query en fetch pour récupérer les informations du grand père paternel dans la modale
router.get('/:slug/paternalGrandfatherInfo', isAuthenticated, (req, res) => {
  const animalSlug = req.params.slug;

  const queryPaternalGrandfatherInfo = `
      SELECT 
          gf.id AS grandfather_id, 
          gf.grandfather_name, 
          gf.breed_id, 
          b.name AS breed_name, 
          gf.grandfather_color, 
          gf.grandfather_gender,
          gf.register_id,  
          r.name AS register_name,
          gf.country_id, 
          c.name AS country_name, 
          gf.grandfather_breed_type, 
          gf.grandfather_birth_date, 
          gf.grandfather_coat_type, 
          gf.grandfather_eye_color, 
          gf.grandfather_is_online
      FROM animals a
      LEFT JOIN father_table f ON a.father_id = f.id
      LEFT JOIN grandfather_table gf ON f.paternal_grandfather_id = gf.id
      LEFT JOIN breed_name b ON gf.breed_id = b.id  -- Jointure pour récupérer le nom de la race
      LEFT JOIN register_name r ON gf.register_id = r.id  -- Jointure pour récupérer le nom du registre
      LEFT JOIN country_name c ON gf.country_id = c.id  -- Jointure pour récupérer le nom du pays
      WHERE a.slug = ? 
      LIMIT 1`;

  db.query(queryPaternalGrandfatherInfo, [animalSlug], (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des informations du grand-père paternel:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des informations du grand-père paternel' });
      }

      if (results.length > 0) {
          return res.json({ success: true, paternalGrandfather: results[0] });
      } else {
          return res.json({ success: false, message: 'Aucune information disponible pour le grand-père paternel' });
      }
  });
});


// query en fetch pour récupérer les informations de la grand mère paternel dans la modale
router.get('/:slug/paternalGrandmotherInfo', isAuthenticated, (req, res) => {
  const animalSlug = req.params.slug;

  const queryPaternalGrandmotherInfo = `
      SELECT 
          gm.id AS grandmother_id, 
          gm.grandmother_name, 
          gm.breed_id, 
          b.name AS breed_name, 
          gm.grandmother_color, 
          gm.grandmother_gender,
          gm.register_id,  
          r.name AS register_name,
          gm.country_id, 
          c.name AS country_name, 
          gm.grandmother_breed_type, 
          gm.grandmother_birth_date, 
          gm.grandmother_coat_type, 
          gm.grandmother_eye_color, 
          gm.grandmother_is_online
      FROM animals a
      LEFT JOIN father_table f ON a.father_id = f.id
      LEFT JOIN grandmother_table gm ON f.paternal_grandmother_id = gm.id
      LEFT JOIN breed_name b ON gm.breed_id = b.id  -- Jointure pour récupérer le nom de la race
      LEFT JOIN register_name r ON gm.register_id = r.id  -- Jointure pour récupérer le nom du registre
      LEFT JOIN country_name c ON gm.country_id = c.id  -- Jointure pour récupérer le nom du pays
      WHERE a.slug = ? 
      LIMIT 1`;

  db.query(queryPaternalGrandmotherInfo, [animalSlug], (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des informations de la grand-mère paternelle:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des informations de la grand-mère paternelle' });
      }

      if (results.length > 0) {
          return res.json({ success: true, paternalGrandmother: results[0] });
      } else {
          return res.json({ success: false, message: 'Aucune information disponible pour la grand-mère paternelle' });
      }
  });
});


// query en fetch pour récupérer les informations du grand père maternel dans la modale
router.get('/:slug/maternalGrandfatherInfo', isAuthenticated, (req, res) => {
  const animalSlug = req.params.slug;

  const queryMaternalGrandfatherInfo = `
      SELECT 
          gf.id AS grandfather_id, 
          gf.grandfather_name, 
          gf.breed_id, 
          b.name AS breed_name, 
          gf.grandfather_color, 
          gf.grandfather_gender,
          gf.register_id,  
          r.name AS register_name,
          gf.country_id, 
          c.name AS country_name, 
          gf.grandfather_breed_type, 
          gf.grandfather_birth_date, 
          gf.grandfather_coat_type, 
          gf.grandfather_eye_color, 
          gf.grandfather_is_online
      FROM animals a
      LEFT JOIN mother_table m ON a.mother_id = m.id
      LEFT JOIN grandfather_table gf ON m.maternal_grandfather_id = gf.id
      LEFT JOIN breed_name b ON gf.breed_id = b.id  -- Jointure pour récupérer le nom de la race
      LEFT JOIN register_name r ON gf.register_id = r.id  -- Jointure pour récupérer le nom du registre
      LEFT JOIN country_name c ON gf.country_id = c.id  -- Jointure pour récupérer le nom du pays
      WHERE a.slug = ? 
      LIMIT 1`;

  db.query(queryMaternalGrandfatherInfo, [animalSlug], (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des informations du grand-père maternel:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des informations du grand-père maternel' });
      }

      if (results.length > 0) {
          return res.json({ success: true, maternalGrandfather: results[0] });
      } else {
          return res.json({ success: false, message: 'Aucune information disponible pour le grand-père maternel' });
      }
  });
});


// query en fetch pour récupérer les informations de la grand mère maternelle dans la modale
router.get('/:slug/maternalGrandmotherInfo', isAuthenticated, (req, res) => {
  const animalSlug = req.params.slug;

  const queryMaternalGrandmotherInfo = `
      SELECT 
          gm.id AS grandmother_id, 
          gm.grandmother_name, 
          gm.breed_id, 
          b.name AS breed_name, 
          gm.grandmother_color, 
          gm.grandmother_gender,
          gm.register_id,  
          r.name AS register_name,
          gm.country_id, 
          c.name AS country_name, 
          gm.grandmother_breed_type, 
          gm.grandmother_birth_date, 
          gm.grandmother_coat_type, 
          gm.grandmother_eye_color, 
          gm.grandmother_is_online
      FROM animals a
      LEFT JOIN mother_table m ON a.mother_id = m.id
      LEFT JOIN grandmother_table gm ON m.maternal_grandmother_id = gm.id
      LEFT JOIN breed_name b ON gm.breed_id = b.id  -- Jointure pour récupérer le nom de la race
      LEFT JOIN register_name r ON gm.register_id = r.id  -- Jointure pour récupérer le nom du registre
      LEFT JOIN country_name c ON gm.country_id = c.id  -- Jointure pour récupérer le nom du pays
      WHERE a.slug = ? 
      LIMIT 1`;

  db.query(queryMaternalGrandmotherInfo, [animalSlug], (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des informations de la grand-mère maternelle:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des informations de la grand-mère maternelle' });
      }

      if (results.length > 0) {
          return res.json({ success: true, maternalGrandmother: results[0] });
      } else {
          return res.json({ success: false, message: 'Aucune information disponible pour la grand-mère maternelle' });
      }
  });
});


// router pour l'ajout des résultats des expositions
router.post('/awards', (req, res) => {
  const { animal_id, year, award_name, award_description } = req.body;

  const sql = "INSERT INTO awards (animal_id, year, award_name, award_description) VALUES (?, ?, ?, ?)";
  
  db.query(sql, [animal_id, year, award_name, award_description], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement des résultats' });
    }
    res.json({ success: true, message: 'Résultats enregistrés avec succès' });
  });
});


// router pour l'ajout de la photo du père, remplace une photo existante si elle existe
router.post('/uploadPhotoFather', upload.single('photo'), (req, res) => {
  const { father_id } = req.body;
  const photoPath = req.file.filename;

  // Vérifier si une photo existe déjà pour le père
  const checkQuery = 'SELECT id, image_path FROM images_father WHERE father_id = ?';
  db.query(checkQuery, [father_id], (err, results) => {
    if (err) {
      console.error('Erreur lors de la vérification de l\'existence de la photo:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de l\'existence de la photo' });
    }

    if (results.length > 0) {
      // Une photo existe déjà, la mettre à jour
      const updateQuery = 'UPDATE images_father SET image_path = ? WHERE id = ?';
      db.query(updateQuery, [photoPath, results[0].id], (err) => {
        if (err) {
          console.error('Erreur lors de la mise à jour de la photo:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la photo' });
        }
        res.json({ success: true, photo: { id: results[0].id, image_path: photoPath } });
      });
    } else {
      // Aucune photo n'existe, insérer une nouvelle entrée
      const insertQuery = 'INSERT INTO images_father (father_id, image_path) VALUES (?, ?)';
      db.query(insertQuery, [father_id, photoPath], (err, result) => {
        if (err) {
          console.error('Erreur lors de l\'enregistrement de la photo:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement de la photo' });
        }
        res.json({ success: true, photo: { id: result.insertId, image_path: photoPath } });
      });
    }
  });
});


// Route pour ajouter le grand-père paternel
router.post('/addPaternalGrandfather', (req, res) => {
  const { father_id, grandfather_name } = req.body;
  const query = 'INSERT INTO grandfather_table (grandfather_name) VALUES (?)';
  db.query(query, [grandfather_name], (err, result) => {
    if (err) {
      console.error('Erreur lors de l\'ajout du grand-père paternel:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout du grand-père paternel' });
    }
    const newGrandfatherId = result.insertId;
    const updateFatherQuery = 'UPDATE father_table SET paternal_grandfather_id = ? WHERE id = ?';
    db.query(updateFatherQuery, [newGrandfatherId, father_id], (updateErr) => {
      if (updateErr) {
        console.error('Erreur lors de la mise à jour du père avec le grand-père paternel:', updateErr);
        return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du père avec le grand-père paternel' });
      }
      res.json({ success: true, grandfather: { id: newGrandfatherId, grandfather_name } });
    });
  });
});


//router teste pour l'ajout de la grand mère paternelle
router.post('/addPaternalGrandmother', (req, res) => {
  const { father_id, grandmother_name } = req.body;
  const insertGrandmotherQuery = 'INSERT INTO grandmother_table (grandmother_name) VALUES (?)';

  // Insertion dans la table grandmother_table
  db.query(insertGrandmotherQuery, [grandmother_name], (err, result) => {
      if (err) {
          console.error('Erreur lors de l\'ajout de la grand-mère paternelle:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout de la grand-mère paternelle' });
      }

      const newGrandmotherId = result.insertId;
      const updateFatherQuery = 'UPDATE father_table SET paternal_grandmother_id = ? WHERE id = ?';

      // Mise à jour de la table father_table avec la nouvelle grand-mère
      db.query(updateFatherQuery, [newGrandmotherId, father_id], (updateErr) => {
          if (updateErr) {
              console.error('Erreur lors de la mise à jour du père avec la grand-mère paternelle:', updateErr);
              return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du père avec la grand-mère paternelle' });
          }
          res.json({ success: true, grandmother: { id: newGrandmotherId, grandmother_name } });
      });
  });
});


// router post pour mettre à jour les informations du père
router.post('/:slug/updateFather', (req, res) => {
  const {
      fatherName, fatherBreed, fatherColor, fatherGender, fatherRegister,
      fatherCountry, fatherBreedType, fatherBirthDate, fatherCoatType,
      fatherEyeColor, fatherIsOnline, paternal_father_id, paternal_mother_id
  } = req.body;
  const animalSlug = req.params.slug;

  const queryUpdateFather = `
      UPDATE father_table
      SET father_name = ?, breed_id = ?, father_color = ?, father_gender = ?, register_id = ?, 
          country_id = ?, father_breed_type = ?, father_birth_date = ?, father_coat_type = ?, 
          father_eye_color = ?, father_is_online = ?, paternal_grandfather_id = ?, 
          paternal_grandmother_id = ?
      WHERE id = (SELECT father_id FROM animals WHERE slug = ?)
  `;

  db.query(queryUpdateFather, [
      fatherName, 
      fatherBreed || null, // Utiliser NULL si fatherBreed est vide
      fatherColor || null, 
      fatherGender || null, 
      fatherRegister || null, // Utiliser NULL si fatherRegister est vide
      fatherCountry || null,  // Utiliser NULL si fatherCountry est vide
      fatherBreedType || null, 
      fatherBirthDate || null, 
      fatherCoatType || null, 
      fatherEyeColor || null, 
      fatherIsOnline || null, 
      paternal_father_id || null, // Utiliser NULL si paternal_father_id est vide
      paternal_mother_id || null, // Utiliser NULL si paternal_mother_id est vide
      animalSlug
  ], (err, result) => {
      if (err) {
          console.error('Erreur lors de la mise à jour des informations du père:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des informations du père' });
      }
      res.json({ success: true, message: 'Enregistrement des informations réussi' });
  });
});



//  new router test pour l'ajout du nom du grand-père maternel
router.post('/addMaternalGrandfather', (req, res) => {
  const { grandfather_name } = req.body;

  // Vérifier si le grand-père existe déjà
  const checkQuery = 'SELECT id FROM grandfather_table WHERE grandfather_name = ?';
  db.query(checkQuery, [grandfather_name], (err, results) => {
    if (err) {
      console.error('Erreur lors de la vérification du grand-père maternel:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la vérification du grand-père maternel' });
    }

    if (results.length > 0) {
      // Le grand-père existe déjà
      const existingGrandfatherId = results[0].id;
      res.json({ success: true, grandfather: { id: existingGrandfatherId, grandfather_name } });
    } else {
      // Le grand-père n'existe pas, on l'ajoute
      const query = 'INSERT INTO grandfather_table (grandfather_name) VALUES (?)';
      db.query(query, [grandfather_name], (err, result) => {
        if (err) {
          console.error('Erreur lors de l\'ajout du grand-père maternel:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout du grand-père maternel' });
        }
        const newGrandfatherId = result.insertId;
        res.json({ success: true, grandfather: { id: newGrandfatherId, grandfather_name } });
      });
    }
  });
});


//  new router test pour l'ajout du nom du grand-père maternel
router.post('/addMaternalGrandmother', (req, res) => {
  const { grandmother_name } = req.body;

  // Vérifier si la grand-mère existe déjà
  const checkQuery = 'SELECT id FROM grandmother_table WHERE grandmother_name = ?';
  db.query(checkQuery, [grandmother_name], (err, results) => {
    if (err) {
      console.error('Erreur lors de la vérification de la grand-mère maternelle:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de la grand-mère maternelle' });
    }

    if (results.length > 0) {
      // La grand-mère existe déjà
      const existingGrandmotherId = results[0].id;
      res.json({ success: true, grandmother: { id: existingGrandmotherId, grandmother_name } });
    } else {
      // La grand-mère n'existe pas, on l'ajoute
      const query = 'INSERT INTO grandmother_table (grandmother_name) VALUES (?)';
      db.query(query, [grandmother_name], (err, result) => {
        if (err) {
          console.error('Erreur lors de l\'ajout de la grand-mère maternelle:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout de la grand-mère maternelle' });
        }
        const newGrandmotherId = result.insertId;
        res.json({ success: true, grandmother: { id: newGrandmotherId, grandmother_name } });
      });
    }
  });
});



// Route pour mettre à jour les informations de la mère
router.post('/:slug/updateMother', (req, res) => {
  const animalSlug = req.params.slug;
  const {
    motherName, motherBreed, motherColor, motherGender, motherRegister,
    motherCountry, motherBreedType, motherBirthDate, motherCoatType,
    motherEyeColor, motherIsOnline, maternal_father_id, maternal_mother_id
  } = req.body;

  const queryUpdateMother = `
    UPDATE mother_table
    SET
      mother_name = ?,
      breed_id = ?,
      mother_color = ?,
      mother_gender = ?,
      register_id = ?,
      country_id = ?,
      mother_breed_type = ?,
      mother_birth_date = ?,
      mother_coat_type = ?,
      mother_eye_color = ?,
      mother_is_online = ?,
      maternal_grandfather_id = ?,
      maternal_grandmother_id = ?
    WHERE id = (SELECT mother_id FROM animals WHERE slug = ?)
  `;

  db.query(queryUpdateMother, [
    motherName, 
    motherBreed || null,  
    motherColor || null, 
    motherGender || null, 
    motherRegister || null, 
    motherCountry || null,  
    motherBreedType || null, 
    motherBirthDate || null, 
    motherCoatType || null, 
    motherEyeColor || null, 
    motherIsOnline || null, 
    maternal_father_id || null, 
    maternal_mother_id || null,
    animalSlug
  ], (err, result) => {
    if (err) {
      console.error('Erreur lors de la mise à jour des informations de la mère:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des informations de la mère' });
    }

    res.json({ success: true, message: 'Enregistrement des informations réussi' });
  });
});



// mise à jour de la photo de la mère avant la fermeture de la modale
router.get('/:slug/motherImage', (req, res) => {
  const animalSlug = req.params.slug;
  const query = `
    SELECT im.image_path AS mother_image_path
    FROM animals a
    JOIN mother_table m ON a.mother_id = m.id
    LEFT JOIN images_mother im ON m.id = im.mother_id
    WHERE a.slug = ?
    LIMIT 1;
  `;
  db.query(query, [animalSlug], (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération de l\'image de la mère:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'image de la mère' });
    }
    if (results.length > 0) {
      res.json({ success: true, motherImagePath: results[0].mother_image_path });
    } else {
      res.json({ success: false, message: 'Image non trouvée' });
    }
  });
});



// Router pour mettre à jour les infos du grand-père paternel
router.post('/:slug/updatePaternalGrandfather', (req, res) => {
  const animalSlug = req.params.slug;
  const {
    grandfatherName, grandfatherBreed, grandfatherColor, grandfatherGender, grandfatherRegister,
    grandfatherCountry, grandfatherBreedType, grandfatherBirthDate, grandfatherCoatType,
    grandfatherEyeColor, grandfatherIsOnline
  } = req.body;

  const queryUpdatePaternalGrandfather = `
    UPDATE grandfather_table
    SET
      grandfather_name = ?,
      breed_id = ?,
      grandfather_color = ?,
      grandfather_gender = ?,
      register_id = ?,
      country_id = ?,
      grandfather_breed_type = ?,
      grandfather_birth_date = ?,
      grandfather_coat_type = ?,
      grandfather_eye_color = ?,
      grandfather_is_online = ?
    WHERE id = (SELECT paternal_grandfather_id FROM father_table WHERE id = (SELECT father_id FROM animals WHERE slug = ?))
  `;

  db.query(queryUpdatePaternalGrandfather, [
    grandfatherName, 
    grandfatherBreed || null,  
    grandfatherColor || null, 
    grandfatherGender || null, 
    grandfatherRegister || null,  
    grandfatherCountry || null, 
    grandfatherBreedType || null, 
    grandfatherBirthDate || null, 
    grandfatherCoatType || null, 
    grandfatherEyeColor || null, 
    grandfatherIsOnline || null, 
    animalSlug
  ], (err, result) => {
    if (err) {
      console.error('Erreur lors de la mise à jour des informations du grand-père paternel:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des informations du grand-père paternel' });
    }
    res.json({ success: true, message: 'Enregistrement des informations réussi' });
  });
});



// mise à jour de la photo du grand père paternel avant la fermeture de la modale
router.get('/:slug/paternalGrandfatherImage', (req, res) => {
  const animalSlug = req.params.slug;
  const query = `
    SELECT ig.image_path AS paternal_grandfather_image_path
    FROM animals a
    JOIN father_table f ON a.father_id = f.id
    LEFT JOIN images_grandfather ig ON f.paternal_grandfather_id = ig.grandfather_id
    WHERE a.slug = ?
    LIMIT 1;
  `;
  db.query(query, [animalSlug], (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération de l\'image du grand-père paternel:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'image du grand-père paternel' });
    }
    if (results.length > 0) {
      res.json({ success: true, paternalGrandfatherImagePath: results[0].paternal_grandfather_image_path });
    } else {
      res.json({ success: false, message: 'Image non trouvée' });
    }
  });
});



// Router pour mettre à jour les infos de la grand-mère paternelle
router.post('/:slug/updatePaternalGrandmother', (req, res) => {
  const animalSlug = req.params.slug;
  const {
    grandmotherName, 
    grandmotherBreed, 
    grandmotherColor, 
    grandmotherGender, 
    grandmotherRegister,
    grandmotherCountry, 
    grandmotherBreedType, 
    grandmotherCoatType,
    grandmotherEyeColor, 
    grandmotherIsOnline
  } = req.body;

  const queryUpdatePaternalGrandmother = `
    UPDATE grandmother_table
    SET
      grandmother_name = ?,
      breed_id = ?,
      grandmother_color = ?,
      grandmother_gender = ?,
      register_id = ?,
      country_id = ?,
      grandmother_breed_type = ?,
      grandmother_coat_type = ?,
      grandmother_eye_color = ?,
      grandmother_is_online = ?
    WHERE id = (SELECT paternal_grandmother_id FROM father_table WHERE id = (SELECT father_id FROM animals WHERE slug = ?))
  `;

  db.query(queryUpdatePaternalGrandmother, [
    grandmotherName, 
    grandmotherBreed || null,  // Utiliser NULL si grandmotherBreed est vide
    grandmotherColor || null, 
    grandmotherGender || null, 
    grandmotherRegister || null,  // Utiliser NULL si grandmotherRegister est vide
    grandmotherCountry || null,  // Utiliser NULL si grandmotherCountry est vide
    grandmotherBreedType || null, 
    grandmotherCoatType || null, 
    grandmotherEyeColor || null, 
    grandmotherIsOnline || null, 
    animalSlug
  ], (err, result) => {
    if (err) {
      console.error('Erreur lors de la mise à jour des informations de la grand-mère paternelle:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des informations de la grand-mère paternelle' });
    }
    res.json({ success: true, message: 'Enregistrement des informations réussi' });
  });
});



// mise à jour de la photo du grand mère paternel avant la fermeture de la modale
router.get('/:slug/paternalGrandmotherImage', (req, res) => {
  const animalSlug = req.params.slug;
  const query = `
    SELECT ig.image_path AS paternal_grandmother_image_path
    FROM animals a
    JOIN father_table f ON a.father_id = f.id
    LEFT JOIN images_grandmother ig ON f.paternal_grandmother_id = ig.grandmother_id
    WHERE a.slug = ?
    LIMIT 1;
  `;
  db.query(query, [animalSlug], (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération de l\'image de la grand-mère paternelle:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'image de la grand-mère paternelle' });
    }
    if (results.length > 0) {
      res.json({ success: true, paternalGrandmotherImagePath: results[0].paternal_grandmother_image_path });
    } else {
      res.json({ success: false, message: 'Image non trouvée' });
    }
  });
});



//oplaods tests des photos générales
router.post('/:slug/uploadPhotos', upload.array('photos', 10), (req, res) => {
  const animalSlug = req.params.slug;

  // Récupérer l'ID de l'animal en utilisant le slug
  const getAnimalIdQuery = 'SELECT id FROM animals WHERE slug = ?';
  db.query(getAnimalIdQuery, [animalSlug], (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération de l\'ID de l\'animal:', err);
      return res.status(500).send('Erreur lors de la récupération de l\'ID de l\'animal');
    }

    if (results.length === 0) {
      return res.status(404).send('Animal non trouvé');
    }

    const animalId = results[0].id;

    // Insérer les photos dans la table images
    const photos = req.files.map(file => [file.filename, animalId]);
    const insertPhotosQuery = 'INSERT INTO images (image_path, animal_id) VALUES ?';
    db.query(insertPhotosQuery, [photos], (err, result) => {
      if (err) {
        console.error('Erreur lors de l\'insertion des photos:', err);
        return res.status(500).send('Erreur lors de l\'insertion des photos');
      }

      // Récupérer les nouvelles photos pour les envoyer au client
      const getPhotosQuery = 'SELECT id, image_path FROM images WHERE animal_id = ? ORDER BY id DESC LIMIT ?';
      db.query(getPhotosQuery, [animalId, photos.length], (err, photos) => {
        if (err) {
          console.error('Erreur lors de la récupération des photos:', err);
          return res.status(500).send('Erreur lors de la récupération des photos');
        }

        res.json({ success: true, photos });
      });
    });
  });
});


// router pour ajouter les mots-clés de l'animal
router.post('/addKeywords', (req, res) => {
    const { keyword, animal_id } = req.body;
    const query = 'INSERT INTO keywords (animal_id, keywords_content) VALUES (?, ?)';
    db.query(query, [animal_id, keyword], (err, result) => {
      if (err) {
        console.error('Error adding keyword to database:', err);
        res.sendStatus(500);
      } else {
        res.sendStatus(200);
      }
    });
  });


// router pour la mise à jour des textes de l'animal
router.post('/updateTexts', (req, res) => {
  const { animalId, health_tests, description_animals } = req.body;

  if (!animalId) {
      return res.status(400).json({ 
          success: false, 
          message: 'ID de l\'animal manquant' 
      });
  }

  const updateQuery = `
      UPDATE animals
      SET 
          health_tests = ?,
          description_animals = ?
      WHERE id = ?
  `;

  const healthTestsValue = health_tests || '';
  const descriptionValue = description_animals || '';

  db.query(updateQuery, [healthTestsValue, descriptionValue, animalId], (err, result) => {
      if (err) {
          console.error('Erreur lors de la mise à jour des textes:', err);
          return res.status(500).json({ 
              success: false, 
              message: 'Erreur lors de la mise à jour des textes' 
          });
      }
      
      if (result.affectedRows === 0) {
          return res.status(404).json({
              success: false,
              message: 'Animal non trouvé'
          });
      }

      res.json({ 
          success: true, 
          message: 'Mise à jour des textes réussie'
      });
  });
});



// router pour ajouter la photo de la mère dans la motherModal
router.post('/uploadPhotoMother', upload.single('photo'), (req, res) => {
  const { mother_id } = req.body;
  const photoPath = req.file.filename;

  // Vérifier si une photo existe déjà pour le père
  const checkQuery = 'SELECT id, image_path FROM images_mother WHERE mother_id = ?';
  db.query(checkQuery, [mother_id], (err, results) => {
    if (err) {
      console.error('Erreur lors de la vérification de l\'existence de la photo:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de l\'existence de la photo' });
    }

    if (results.length > 0) {
      // Une photo existe déjà, la mettre à jour
      const updateQuery = 'UPDATE images_mother SET image_path = ? WHERE id = ?';
      db.query(updateQuery, [photoPath, results[0].id], (err) => {
        if (err) {
          console.error('Erreur lors de la mise à jour de la photo:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la photo' });
        }
        res.json({ success: true, photo: { id: results[0].id, image_path: photoPath } });
      });
    } else {
      // Aucune photo n'existe, insérer une nouvelle entrée
      const insertQuery = 'INSERT INTO images_mother (mother_id, image_path) VALUES (?, ?)';
      db.query(insertQuery, [mother_id, photoPath], (err, result) => {
        if (err) {
          console.error('Erreur lors de l\'enregistrement de la photo:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement de la photo' });
        }
        res.json({ success: true, photo: { id: result.insertId, image_path: photoPath } });
      });
    }
  });
});


// router pour récupérer l'image du père en live
router.get('/:slug/fatherImage', (req, res) => {
  const animalSlug = req.params.slug;

  const query = `
      SELECT image_path 
      FROM images_father
      WHERE father_id = (SELECT father_id FROM animals WHERE slug = ? LIMIT 1)
      ORDER BY id DESC LIMIT 1
  `;

  db.query(query, [animalSlug], (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération de l\'image du père:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'image du père' });
      }

      if (results.length > 0) {
          res.json({ success: true, fatherImagePath: results[0].image_path });
      } else {
          res.json({ success: false, message: 'Aucune image trouvée pour le père' });
      }
  });
});

// router post pour l'ajout de la photo du grand-père paternel dans la modale
router.post('/uploadPhotoPaternalGrandfather', upload.single('photo'), (req, res) => {
  const { grandfather_id } = req.body;
  const photoPath = req.file.filename;

  // Vérifier si une photo existe déjà pour le grand-père paternel
  const checkQuery = 'SELECT id, image_path FROM images_grandfather WHERE grandfather_id = ?';
  db.query(checkQuery, [grandfather_id], (err, results) => {
      if (err) {
          console.error('Erreur lors de la vérification de l\'existence de la photo:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de l\'existence de la photo' });
      }

      if (results.length > 0) {
          // Une photo existe déjà, la mettre à jour
          const updateQuery = 'UPDATE images_grandfather SET image_path = ? WHERE id = ?';
          db.query(updateQuery, [photoPath, results[0].id], (err) => {
              if (err) {
                  console.error('Erreur lors de la mise à jour de la photo:', err);
                  return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la photo' });
              }
              res.json({ success: true, photo: { id: results[0].id, image_path: photoPath } });
          });
      } else {
          // Aucune photo n'existe, insérer une nouvelle entrée
          const insertQuery = 'INSERT INTO images_grandfather (grandfather_id, image_path) VALUES (?, ?)';
          db.query(insertQuery, [grandfather_id, photoPath], (err, result) => {
              if (err) {
                  console.error('Erreur lors de l\'enregistrement de la photo:', err);
                  return res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement de la photo' });
              }
              res.json({ success: true, photo: { id: result.insertId, image_path: photoPath } });
          });
      }
  });
});



// router post pour l'ajout de la photo du grand-mère paternel dans la modale
router.post('/uploadPhotoPaternalGrandmother', upload.single('photo'), (req, res) => {
  const { grandmother_id } = req.body;
  const photoPath = req.file.filename;

  // Vérifier si une photo existe déjà pour la grand-mère paternelle
  const checkQuery = 'SELECT id, image_path FROM images_grandmother WHERE grandmother_id = ?';
  db.query(checkQuery, [grandmother_id], (err, results) => {
      if (err) {
          console.error('Erreur lors de la vérification de l\'existence de la photo:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de l\'existence de la photo' });
      }

      if (results.length > 0) {
          // Une photo existe déjà, la mettre à jour
          const updateQuery = 'UPDATE images_grandmother SET image_path = ? WHERE id = ?';
          db.query(updateQuery, [photoPath, results[0].id], (err) => {
              if (err) {
                  console.error('Erreur lors de la mise à jour de la photo:', err);
                  return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la photo' });
              }
              res.json({ success: true, photo: { id: results[0].id, image_path: photoPath } });
          });
      } else {
          // Aucune photo n'existe, insérer une nouvelle entrée
          const insertQuery = 'INSERT INTO images_grandmother (grandmother_id, image_path) VALUES (?, ?)';
          db.query(insertQuery, [grandmother_id, photoPath], (err, result) => {
              if (err) {
                  console.error('Erreur lors de l\'enregistrement de la photo:', err);
                  return res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement de la photo' });
              }
              res.json({ success: true, photo: { id: result.insertId, image_path: photoPath } });
          });
      }
  });
});


// router post pour l'ajout de la photo du grand-père maternel dans la modale
router.post('/uploadPhotoMaternalGrandfather', upload.single('photo'), (req, res) => {
  const { grandfather_id } = req.body;
  const photoPath = req.file.filename;

  // Vérifier si une photo existe déjà pour le grand-père maternel
  const checkQuery = 'SELECT id, image_path FROM images_grandfather WHERE grandfather_id = ?';
  db.query(checkQuery, [grandfather_id], (err, results) => {
      if (err) {
          console.error('Erreur lors de la vérification de l\'existence de la photo:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de l\'existence de la photo' });
      }

      if (results.length > 0) {
          // Une photo existe déjà, la mettre à jour
          const updateQuery = 'UPDATE images_grandfather SET image_path = ? WHERE id = ?';
          db.query(updateQuery, [photoPath, results[0].id], (err) => {
              if (err) {
                  console.error('Erreur lors de la mise à jour de la photo:', err);
                  return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la photo' });
              }
              res.json({ success: true, photo: { id: results[0].id, image_path: photoPath } });
          });
      } else {
          // Aucune photo n'existe, insérer une nouvelle entrée
          const insertQuery = 'INSERT INTO images_grandfather (grandfather_id, image_path) VALUES (?, ?)';
          db.query(insertQuery, [grandfather_id, photoPath], (err, result) => {
              if (err) {
                  console.error('Erreur lors de l\'enregistrement de la photo:', err);
                  return res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement de la photo' });
              }
              res.json({ success: true, photo: { id: result.insertId, image_path: photoPath } });
          });
      }
  });
});



// Router pour mettre à jour les infos du grand-père maternel
router.post('/:slug/updateMaternalGrandfather', (req, res) => {
  const animalSlug = req.params.slug;
  const {
    grandfatherName, 
    grandfatherBreed, 
    grandfatherColor, 
    grandfatherGender, 
    grandfatherRegister,
    grandfatherCountry, 
    grandfatherBreedType, 
    grandfatherBirthDate,
    grandfatherCoatType, 
    grandfatherEyeColor, 
    grandfatherIsOnline
  } = req.body;

  const queryUpdateMaternalGrandfather = `
    UPDATE grandfather_table
    SET
      grandfather_name = ?,
      breed_id = ?,
      grandfather_color = ?,
      grandfather_gender = ?,
      register_id = ?,
      country_id = ?,
      grandfather_breed_type = ?,
      grandfather_birth_date = ?,
      grandfather_coat_type = ?,
      grandfather_eye_color = ?,
      grandfather_is_online = ?
    WHERE id = (SELECT maternal_grandfather_id FROM mother_table WHERE id = (SELECT mother_id FROM animals WHERE slug = ?))
  `;

  db.query(queryUpdateMaternalGrandfather, [
    grandfatherName, 
    grandfatherBreed || null,  // Utiliser NULL si grandfatherBreed est vide
    grandfatherColor || null, 
    grandfatherGender || null, 
    grandfatherRegister || null,  // Utiliser NULL si grandfatherRegister est vide
    grandfatherCountry || null,  // Utiliser NULL si grandfatherCountry est vide
    grandfatherBreedType || null, 
    grandfatherBirthDate || null, 
    grandfatherCoatType || null, 
    grandfatherEyeColor || null, 
    grandfatherIsOnline || null, 
    animalSlug
  ], (err, result) => {
    if (err) {
      console.error('Erreur lors de la mise à jour des informations du grand-père maternel:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des informations du grand-père maternel' });
    }
    res.json({ success: true, message: 'Enregistrement des informations réussi' });
  });
});



// Router pour mettre à jour les infos de la grand-mère maternelle 1
router.post('/:slug/updateMaternalGrandmother', (req, res) => {
  const animalSlug = req.params.slug;
  const {
    grandmotherName, 
    grandmotherBreed, 
    grandmotherColor, 
    grandmotherGender, 
    grandmotherRegister,
    grandmotherCountry, 
    grandmotherBreedType, 
    grandmotherCoatType,
    grandmotherEyeColor, 
    grandmotherIsOnline
  } = req.body;

  const queryUpdateMaternalGrandmother = `
    UPDATE grandmother_table
    SET
      grandmother_name = ?,
      breed_id = ?,
      grandmother_color = ?,
      grandmother_gender = ?,
      register_id = ?,
      country_id = ?,
      grandmother_breed_type = ?,
      grandmother_coat_type = ?,
      grandmother_eye_color = ?,
      grandmother_is_online = ?
    WHERE id = (SELECT maternal_grandmother_id FROM mother_table WHERE id = (SELECT mother_id FROM animals WHERE slug = ?))
  `;

  db.query(queryUpdateMaternalGrandmother, [
    grandmotherName, 
    grandmotherBreed || null,  // Utiliser NULL si grandmotherBreed est vide
    grandmotherColor || null, 
    grandmotherGender || null, 
    grandmotherRegister || null,  // Utiliser NULL si grandmotherRegister est vide
    grandmotherCountry || null,  // Utiliser NULL si grandmotherCountry est vide
    grandmotherBreedType || null, 
    grandmotherCoatType || null, 
    grandmotherEyeColor || null, 
    grandmotherIsOnline || null, 
    animalSlug
  ], (err, result) => {
    if (err) {
      console.error('Erreur lors de la mise à jour des informations de la grand-mère maternelle:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des informations de la grand-mère maternelle' });
    }
    res.json({ success: true, message: 'Enregistrement des informations réussi' });
  });
});



// mise à jour de la photo du grand père maternel avant la fermeture de la modale
router.get('/:slug/maternalGrandfatherImage', (req, res) => {
  const animalSlug = req.params.slug;
  const query = `
    SELECT ig.image_path AS maternal_grandfather_image_path
    FROM animals a
    JOIN mother_table m ON a.mother_id = m.id
    LEFT JOIN images_grandfather ig ON m.maternal_grandfather_id = ig.grandfather_id
    WHERE a.slug = ?
    LIMIT 1;
  `;
  db.query(query, [animalSlug], (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération de l\'image du grand-père maternel:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'image du grand-père maternel' });
    }
    if (results.length > 0) {
      res.json({ success: true, maternalGrandfatherImagePath: results[0].maternal_grandfather_image_path });
    } else {
      res.json({ success: false, message: 'Image non trouvée' });
    }
  });
});

// Route pour récupérer les informations de la photo de couverture
router.get('/get-cover-info/:id', (req, res) => {
  const animalId = req.params.id;
  
  const query = 'SELECT id, image_path, balise_title, balise_alt FROM animals_cover_images WHERE animal_id = ?';
  db.query(query, [animalId], (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des informations de couverture:', err);
          return res.status(500).json({ 
              success: false, 
              message: 'Erreur lors de la récupération des informations de couverture' 
          });
      }

      if (results.length > 0) {
          res.json({
              success: true,
              coverInfo: results[0]
          });
      } else {
          res.json({
              success: true,
              coverInfo: null
          });
      }
  });
});

// router post pour l'ajout de la photo de la grand-mère maternelle dans la modale
router.post('/uploadPhotoMaternalGrandmother', upload.single('photo'), (req, res) => {
  const { grandmother_id } = req.body;
  const photoPath = req.file.filename;

  // Vérifier si une photo existe déjà pour la grand-mère maternelle
  const checkQuery = 'SELECT id, image_path FROM images_grandmother WHERE grandmother_id = ?';
  db.query(checkQuery, [grandmother_id], (err, results) => {
      if (err) {
          console.error('Erreur lors de la vérification de l\'existence de la photo:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de l\'existence de la photo' });
      }

      if (results.length > 0) {
          // Une photo existe déjà, la mettre à jour
          const updateQuery = 'UPDATE images_grandmother SET image_path = ? WHERE id = ?';
          db.query(updateQuery, [photoPath, results[0].id], (err) => {
              if (err) {
                  console.error('Erreur lors de la mise à jour de la photo:', err);
                  return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la photo' });
              }
              res.json({ success: true, photo: { id: results[0].id, image_path: photoPath } });
          });
      } else {
          // Aucune photo n'existe, insérer une nouvelle entrée
          const insertQuery = 'INSERT INTO images_grandmother (grandmother_id, image_path) VALUES (?, ?)';
          db.query(insertQuery, [grandmother_id, photoPath], (err, result) => {
              if (err) {
                  console.error('Erreur lors de l\'enregistrement de la photo:', err);
                  return res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement de la photo' });
              }
              res.json({ success: true, photo: { id: result.insertId, image_path: photoPath } });
          });
      }
  });
});



// mise à jour de la photo de la grand mère maternelle avant la fermeture de la modale
router.get('/:slug/maternalGrandmotherImage', (req, res) => {
  const animalSlug = req.params.slug;
  const query = `
    SELECT ig.image_path AS maternal_grandmother_image_path
    FROM animals a
    JOIN mother_table m ON a.mother_id = m.id
    LEFT JOIN images_grandmother ig ON m.maternal_grandmother_id = ig.grandmother_id
    WHERE a.slug = ?
    LIMIT 1;
  `;
  db.query(query, [animalSlug], (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération de l\'image de la grand-mère maternelle:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'image de la grand-mère maternelle' });
    }
    if (results.length > 0) {
      res.json({ success: true, maternalGrandmotherImagePath: results[0].maternal_grandmother_image_path });
    } else {
      res.json({ success: false, message: 'Image non trouvée' });
    }
  });
});



// router pour l'ajout de la photo de profil (avec console.log pour vérifier)
router.post('/uploadProfileImage', upload.single('profileImage'), async (req, res) => {
    try {
        const file = req.file;
        const animalId = req.body.animal_id;

        if (!animalId) {
            return res.status(400).send('ID de l\'animal est requis.');
        }

        if (!file) {
            return res.status(400).send('Aucun fichier téléchargé.');
        }

        const insertQuery = `
            INSERT INTO profile_images (animal_id, image_path_profile) 
            VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE image_path_profile = VALUES(image_path_profile)
        `;
        const values = [animalId, file.filename];

        await db.query(insertQuery, values);

        res.json({ success: true, image_path_profile: file.filename });
    } catch (err) {
        res.status(500).send('Erreur lors du traitement de la photo de profil');
    }
});

// router pour l'ajout de la photo de profil
router.post('/deleteProfileImage', async (req, res) => {
  try {
      const animalId = req.body.animalId;
      
      if (!animalId) {
          return res.status(400).json({ 
              success: false, 
              message: 'ID de l\'animal est requis.' 
          });
      }
      
      const deleteQuery = 'DELETE FROM profile_images WHERE animal_id = ?';
      
      db.query(deleteQuery, [animalId], (err, result) => {
          if (err) {
              console.error('Erreur lors de la suppression:', err);
              return res.status(500).json({ 
                  success: false, 
                  message: 'Erreur lors de la suppression' 
              });
          }
          
          if (result.affectedRows === 0) {
              return res.status(404).json({ 
                  success: false, 
                  message: 'Image non trouvée.' 
              });
          }
          
          res.json({ 
              success: true, 
              message: 'Image supprimée.' 
          });
      });
  } catch (err) {
      console.error('Erreur:', err);
      res.status(500).json({ 
          success: false, 
          message: 'Erreur serveur' 
      });
  }
});



// router post pour la mise à jour du statut de l'animal (en ligne ou hors ligne)
router.post('/updateAnimalStatus', async (req, res) => {
  const { animalId, isOnline } = req.body;

  try {
      // Mise à jour du statut de l'animal dans la base de données
      const updateQuery = 'UPDATE animals SET is_online = ? WHERE id = ?';
      db.query(updateQuery, [isOnline, animalId], (error, result) => {
          if (error) {
              console.error('Erreur lors de la mise à jour du statut:', error);
              return res.status(500).json({ success: false, message: 'Erreur serveur' });
          }

          if (result.affectedRows === 0) {
              return res.status(404).json({ success: false, message: 'Animal non trouvé' });
          }

          res.json({ success: true, message: 'Statut mis à jour avec succès' });
      });
  } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});


router.post('/updateAward/:id', (req, res) => {
  const awardId = req.params.id;
  const { award_name, award_description } = req.body;

  // Assurez-vous que les données nécessaires sont présentes
  if (!awardId || !award_name || !award_description) {
      return res.status(400).json({ success: false, message: 'Données manquantes' });
  }

  const query = `
      UPDATE awards
      SET award_name = ?, award_description = ?
      WHERE award_id = ?
  `;

  db.query(query, [award_name, award_description, awardId], (err, result) => {
      if (err) {
          console.error('Erreur lors de la mise à jour de l\'award:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de l\'award' });
      }

      res.json({ success: true, message: 'Résultats mis à jour avec succès' });
  });
});


// router pour mettre à jour les informations de l'animal (route dynamique, utilise l'ID de l'animal, toujours le placé en dernier)
router.post('/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;
  const {
      name, in_breeding, gender, other_names, category, breed_id, breed_type,
      birth_date, country_id, coat_type, color, eye_color, register_id, retreat, open_for_stud
  } = req.body;

  // Construction dynamique de la requête pour inclure les colonnes retreat et open_for_stud si elles changent
  let updateQuery = `
      UPDATE animals 
      SET name = ?, in_breeding = ?, gender = ?, other_names = ?, category = ?, 
          breed_id = ?, breed_type = ?, birth_date = ?, country_id = ?, coat_type = ?, 
          color = ?, eye_color = ?, register_id = ?
  `;
  
  const values = [
      name, in_breeding === 'Oui' ? 1 : 0, gender, other_names, category, breed_id,
      breed_type, birth_date, country_id, coat_type, color, eye_color, register_id
  ];

  // Ajouter la colonne retreat si elle change
  if (retreat) {
      updateQuery += ', retreat = ?';
      values.push(retreat === '1' ? 1 : 0);
  }

  // Ajouter la colonne open_for_stud si elle change
  if (gender === 'Male' && open_for_stud !== undefined) {
      updateQuery += ', open_for_stud = ?';
      values.push(open_for_stud === '1' ? 1 : 0);
  }

  // Ajouter l'ID à la fin de la liste des valeurs
  updateQuery += ' WHERE id = ?';
  values.push(id);

  db.query(updateQuery, values, (err, results) => {
      if (err) {
          console.error('Erreur lors de la mise à jour des informations de l\'animal:', err);
          return res.status(500).send('Erreur lors de la mise à jour des informations de l\'animal');
      }

      // Requête pour récupérer le slug de l'animal mis à jour
      const slugQuery = 'SELECT slug FROM animals WHERE id = ?';
      db.query(slugQuery, [id], (err, slugResults) => {
          if (err) {
              console.error('Erreur lors de la récupération du slug de l\'animal:', err);
              return res.status(500).send('Erreur lors de la récupération du slug de l\'animal');
          }

          const animalSlug = slugResults.length ? slugResults[0].slug : null;
          if (animalSlug) {
              res.redirect(`/admin/animalProfile/${animalSlug}`);
          } else {
              res.status(500).send('Erreur: Slug de l\'animal introuvable');
          }
      });
  });
});


// Utilisation de la config multer existante
router.post('/cover-image/:id', upload.single('coverImage'), (req, res) => {
  const animalId = req.params.id;
  const photoPath = req.file ? req.file.filename : null; // Peut être null si pas de nouvelle image
  const { baliseTitle, baliseAlt } = req.body;

  // Vérifier si une photo de couverture existe déjà pour cet animal
  const checkQuery = 'SELECT id, image_path FROM animals_cover_images WHERE animal_id = ?';
  db.query(checkQuery, [animalId], (err, results) => {
      if (err) {
          console.error('Erreur lors de la vérification de l\'existence de la photo de couverture:', err);
          return res.status(500).json({ 
              success: false, 
              message: 'Erreur lors de la vérification de l\'existence de la photo de couverture' 
          });
      }

      if (results.length > 0) {
          // Une photo existe déjà, la mettre à jour
          let updateQuery = 'UPDATE animals_cover_images SET balise_title = ?, balise_alt = ?, alt_modified = true';
          let updateParams = [baliseTitle, baliseAlt];

          // Ajouter le chemin de l'image seulement si une nouvelle image est uploadée
          if (photoPath) {
              updateQuery += ', image_path = ?';
              updateParams.push(photoPath);
          }

          updateQuery += ' WHERE id = ?';
          updateParams.push(results[0].id);

          db.query(updateQuery, updateParams, (err) => {
              if (err) {
                  console.error('Erreur lors de la mise à jour de la photo de couverture:', err);
                  return res.status(500).json({ 
                      success: false, 
                      message: 'Erreur lors de la mise à jour de la photo de couverture' 
                  });
              }
              res.json({ 
                  success: true, 
                  photo: { 
                      id: results[0].id, 
                      image_path: photoPath || results[0].image_path,
                      balise_title: baliseTitle,
                      balise_alt: baliseAlt
                  } 
              });
          });
      } else {
          // Pour une nouvelle entrée, on exige une image
          if (!photoPath) {
              return res.status(400).json({
                  success: false,
                  message: 'Une image est requise pour créer une nouvelle entrée'
              });
          }

          const insertQuery = 'INSERT INTO animals_cover_images (animal_id, image_path, balise_title, balise_alt, alt_modified) VALUES (?, ?, ?, ?, true)';
          db.query(insertQuery, [animalId, photoPath, baliseTitle, baliseAlt], (err, result) => {
              if (err) {
                  console.error('Erreur lors de l\'enregistrement de la photo de couverture:', err);
                  return res.status(500).json({ 
                      success: false, 
                      message: 'Erreur lors de l\'enregistrement de la photo de couverture' 
                  });
              }
              res.json({ 
                  success: true, 
                  photo: { 
                      id: result.insertId, 
                      image_path: photoPath,
                      balise_title: baliseTitle,
                      balise_alt: baliseAlt
                  } 
              });
          });
      }
  });
});


module.exports = router;
