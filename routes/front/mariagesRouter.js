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

router.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Route principal pour afficher la liste des mariages
router.get('/', (req, res) => {
  const userId = 8;
  const itemsPerPage = 6;
  const currentPage = parseInt(req.query.page) || 1;
  
    if (req.query.page === '0' || req.query.page === '1') {
      return res.redirect('/mariages');
    }

    if (req.query.page && (isNaN(currentPage) || currentPage < 0)) {
        return res.redirect('/mariages');
    }

  const queryBreeds = `
    SELECT name, slug 
    FROM breed_name
    WHERE user_id = ? AND is_online = 1
    ORDER BY name ASC
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM marriages 
    WHERE marriages.user_id = ? AND marriages.is_online = 1
  `;

  const queryMarriages = `
    SELECT
      marriages.id,
      male_animal.name AS male_name,
      female_animal.name AS female_name,
      breed_name.name AS breed_name,
      breed_name.slug AS breed_slug,
      marriages.expected_puppies,
      marriages.expected_birth_date,
      marriages.actual_birth_date,
      marriages.actual_male_puppies,
      marriages.actual_female_puppies,
      marriages.marriages_status,
      marriages.is_online,
      marriages.marriages_description,
      marriages.get_banner,
      marriages.marriages_slug,
      marriages.user_id,
      marriages.created_at,
      marriages_imgs.image_path,
      marriages_imgs.optimized_image_path,
      (SELECT COUNT(*)
       FROM puppies
       WHERE puppies.marriage_id = marriages.id
       AND puppies.sale_status IN ('available_for_reservation', 'for_sale')
       AND puppies.puppy_is_online = 1) AS availablePuppies,
      (SELECT COUNT(*)
       FROM puppies
       WHERE puppies.marriage_id = marriages.id
       AND puppies.puppy_is_online = 1) AS onlinePuppies
    FROM marriages
    LEFT JOIN animals AS male_animal ON marriages.male_id = male_animal.id
    LEFT JOIN animals AS female_animal ON marriages.female_id = female_animal.id
    LEFT JOIN breed_name ON female_animal.breed_id = breed_name.id
    LEFT JOIN marriages_images marriages_imgs ON marriages_imgs.marriage_id = marriages.id
    AND marriages_imgs.id = (SELECT MIN(id) FROM marriages_images WHERE marriage_id = marriages.id)
    WHERE marriages.user_id = ? AND marriages.is_online = 1
    ORDER BY marriages.id DESC
    LIMIT ? OFFSET ?
  `;

  Promise.all([
    new Promise((resolve, reject) => {
      db.query(queryBreeds, [userId], (err, breeds) => {
        if (err) reject(err);
        resolve(breeds);
      });
    }),
    new Promise((resolve, reject) => {
      db.query(countQuery, [userId], (err, countResult) => {
        if (err) reject(err);
        resolve(countResult[0].total);
      });
    })
  ]).then(([breeds, totalItems]) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Redirection si la page demandée dépasse le nombre total de pages
    if (currentPage > totalPages && totalPages > 0) {
      return res.redirect(`/mariages?page=${totalPages}`);
    }

    const offset = (currentPage - 1) * itemsPerPage;

    db.query(queryMarriages, [userId, itemsPerPage, offset], (err, marriages) => {
      if (err) {
        console.error('Erreur lors de la récupération des mariages:', err);
        return res.redirect('/erreur');
      }

      res.render('mariages', {
        breeds: breeds,
        marriages: marriages.map(marriage => ({
          ...marriage,
          formattedDate: new Date(marriage.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
          })
        })),
        totalPages: totalPages,
        currentPage: currentPage,
        totalItems: totalItems
      });
    });
  }).catch(err => {
    console.error('Erreur:', err);
    res.redirect('/erreur');
  });
});

// Route pour afficher les détails d'un mariage spécifique
router.get('/:breedSlug/:slug', (req, res) => {
    const userId = 8;
    const {
      slug,
      breedSlug
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
      const queryMarriageDetail = `
        SELECT 
          marriages.*,
          male.name AS male_name,
          male.in_breeding AS male_in_breeding,
          male.gender AS male_gender,
          male.breed_type AS male_breed_type,
          male.color AS male_color,
          male.coat_type AS male_coat_type,
          male.eye_color AS male_eye_color,
          male.description_animals AS male_description_animals,
          male.slug AS male_slug,
          male_bn.name AS male_breed_name,
          male_img.optimized_image_path AS male_optimized_image_path,
          male_img.image_path AS male_image_path,
          male_img.balise_alt AS male_image_alt,
          male_cn.name AS male_country_name,
          male_rn.name AS male_register_name,
          
          female.name AS female_name,
          female.in_breeding AS female_in_breeding,
          female.gender AS female_gender,
          female.breed_type AS female_breed_type,
          female.color AS female_color,
          female.coat_type AS female_coat_type,
          female.eye_color AS female_eye_color,
          female.description_animals AS female_description_animals,
          female.slug AS female_slug,
          female_bn.name AS female_breed_name,
          female_img.optimized_image_path AS female_optimized_image_path,
          female_img.image_path AS female_image_path,
          female_img.balise_alt AS female_image_alt,
          female_cn.name AS female_country_name,
          female_rn.name AS female_register_name,
          
          marriage_img.optimized_image_path AS marriage_optimized_image_path,
          marriage_img.image_path AS marriage_image_path,
  
          (SELECT COUNT(*)
           FROM puppies
           WHERE puppies.marriage_id = marriages.id
           AND puppies.sale_status IN ('available_for_reservation', 'for_sale')
           AND puppies.puppy_is_online = 1) AS availablePuppies,
          (SELECT COUNT(*)
           FROM puppies
           WHERE puppies.marriage_id = marriages.id
           AND puppies.puppy_is_online = 1) AS onlinePuppies
        FROM marriages
        LEFT JOIN animals male ON marriages.male_id = male.id
        LEFT JOIN breed_name male_bn ON male.breed_id = male_bn.id
        LEFT JOIN country_name male_cn ON male.country_id = male_cn.id
        LEFT JOIN register_name male_rn ON male.register_id = male_rn.id
        LEFT JOIN images male_img ON male_img.animal_id = male.id 
            AND male_img.id = (SELECT MIN(id) FROM images WHERE animal_id = male.id)
        
        LEFT JOIN animals female ON marriages.female_id = female.id
        LEFT JOIN breed_name female_bn ON female.breed_id = female_bn.id
        LEFT JOIN country_name female_cn ON female.country_id = female_cn.id
        LEFT JOIN register_name female_rn ON female.register_id = female_rn.id
        LEFT JOIN images female_img ON female_img.animal_id = female.id 
            AND female_img.id = (SELECT MIN(id) FROM images WHERE animal_id = female.id)
        
        LEFT JOIN marriages_images marriage_img ON marriage_img.marriage_id = marriages.id
            AND marriage_img.id = (SELECT MIN(id) FROM marriages_images WHERE marriage_id = marriages.id)
        
        WHERE marriages.marriages_slug = ? 
        AND marriages.user_id = ? 
        AND marriages.is_online = 1
        LIMIT 1
      `;
  
    

      const queryPuppies = `
        SELECT 
          p.*,
          bn.name AS breed_name,
          bn.slug AS breed_slug,
          img.optimized_image_path,
          img.image_path,
          img.balise_alt,
          CASE p.sale_status
            WHEN 'available_for_reservation' THEN 1
            WHEN 'for_sale' THEN 2
            WHEN 'in_reservation' THEN 3
            WHEN 'reserved' THEN 4
            WHEN 'sold' THEN 5
            ELSE 6
          END AS status_order
        FROM puppies p
        LEFT JOIN breed_name bn ON p.breed_id = bn.id
        LEFT JOIN puppies_images img ON img.puppies_id = p.id
            AND img.id = (SELECT MAX(id) FROM puppies_images WHERE puppies_id = p.id)
        WHERE p.marriage_id = ?
        AND p.puppy_is_online = 1
        ORDER BY status_order ASC, p.id DESC
      `;
  
      db.query(queryMarriageDetail, [slug, userId], (err, result) => {
        if (err || !result.length) {
          console.error('Mariage non trouvé:', err);
          return res.redirect('/erreur');
        }
  
        const marriage = result[0];
  
        db.query(queryPuppies, [marriage.id], (err, puppiesResult) => {
          if (err) {
            console.error('Erreur lors de la récupération des chiots:', err);
            return res.redirect('/erreur');
          }
          const birthDate = marriage.actual_birth_date ? new Date(marriage.actual_birth_date) : null;
          const availableDate = birthDate ? new Date(birthDate.getTime() + (60 * 24 * 60 * 60 * 1000)) : null;
  
          res.render('mariage_detail', {
            marriage: {
              title: `${marriage.male_name} x ${marriage.female_name}${slug.endsWith('1') ? ' #1' : slug.endsWith('2') ? ' #2' : ''}`,
              description: marriage.marriages_description,
              slug: slug,
              status: marriage.marriages_status,
              created_at: new Date(marriage.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric'
              }),
              expectedPuppies: marriage.expected_puppies,
              totalPuppies: marriage.onlinePuppies,
              availablePuppies: marriage.availablePuppies,
              birthDate: birthDate ? birthDate.toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              }) : null,
              availableDate: availableDate ? availableDate.toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              }) : null,
              image: {
                path: marriage.marriage_optimized_image_path ?
                  `/uploads/optimized/${marriage.marriage_optimized_image_path}` : `/uploads/${marriage.marriage_image_path}`
              }
            },
            father: {
              name: marriage.male_name,
              inBreeding: marriage.male_in_breeding,
              gender: marriage.male_gender,
              breed: {
                name: marriage.male_breed_name,
                type: marriage.male_breed_type,
                slug: breedSlug
              },
              color: marriage.male_color,
              coatType: marriage.male_coat_type,
              eyeColor: marriage.male_eye_color,
              description: marriage.male_description_animals,
              country: marriage.male_country_name,
              register: marriage.male_register_name,
              slug: marriage.male_slug,
              image: {
                path: marriage.male_optimized_image_path ?
                  `/uploads/optimized/${marriage.male_optimized_image_path}` : `/uploads/${marriage.male_image_path}`,
                alt: marriage.male_image_alt
              }
            },
            mother: {
              name: marriage.female_name,
              inBreeding: marriage.female_in_breeding,
              gender: marriage.female_gender,
              breed: {
                name: marriage.female_breed_name,
                type: marriage.female_breed_type,
                slug: breedSlug
              },
              color: marriage.female_color,
              coatType: marriage.female_coat_type,
              eyeColor: marriage.female_eye_color,
              description: marriage.female_description_animals,
              country: marriage.female_country_name,
              register: marriage.female_register_name,
              slug: marriage.female_slug,
              image: {
                path: marriage.female_optimized_image_path ?
                  `/uploads/optimized/${marriage.female_optimized_image_path}` : `/uploads/${marriage.female_image_path}`,
                alt: marriage.female_image_alt
              }
            },
            puppies: puppiesResult.map(puppy => ({
              name: puppy.puppy_name,
              gender: puppy.puppy_gender,
              breed: {
                name: puppy.breed_name,
                slug: puppy.breed_slug,
                type: puppy.puppy_breed_type
              },
              eyeColor: puppy.puppy_eye_color,
              color: puppy.puppy_color,
              slug: puppy.puppy_slug,
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
                  case 'sold':
                    return 'Vendu';
                  default:
                    return 'Statut inconnu';
                }
              })(),
              image: {
                path: puppy.optimized_image_path ?
                  `/uploads/optimized/${puppy.optimized_image_path}` : `/uploads/${puppy.image_path}`,
                alt: puppy.balise_alt
              }
            }))
          });
        });
  
      });
    });
});

// Route principal pour afficher la liste des mariages par races
router.get('/:breedSlug', (req, res) => {
    const userId = 8;
    const { breedSlug } = req.params;
    const itemsPerPage = 8;
    const currentPage = parseInt(req.query.page) || 1;
 
    if (req.query.page === '0' || req.query.page === '1') {
        return res.redirect(`/mariages/${breedSlug}`);
    }

    if (req.query.page && (isNaN(currentPage) || currentPage < 0)) {
      return res.redirect(`/mariages/${breedSlug}`);
  }
    const queryBreeds = `
        SELECT name, slug 
        FROM breed_name 
        WHERE user_id = ? AND is_online = 1
        ORDER BY name ASC
    `;
    const queryBreedCheck = `
        SELECT id 
        FROM breed_name 
        WHERE slug = ? AND user_id = ? AND is_online = 1
        LIMIT 1
    `;
    const countQuery = `
        SELECT COUNT(*) AS total 
        FROM marriages m
        LEFT JOIN animals AS female_animal ON m.female_id = female_animal.id
        LEFT JOIN breed_name bn ON female_animal.breed_id = bn.id
        WHERE m.user_id = ? 
        AND m.is_online = 1
        AND bn.slug = ?
    `;
 
    const queryMarriages = `
        SELECT
            marriages.id,
            male_animal.name AS male_name,
            female_animal.name AS female_name,
            breed_name.name AS breed_name,
            breed_name.slug AS breed_slug,
            marriages.expected_puppies,
            marriages.expected_birth_date,
            marriages.actual_birth_date,
            marriages.actual_male_puppies,
            marriages.actual_female_puppies,
            marriages.marriages_status,
            marriages.is_online,
            marriages.marriages_description,
            marriages.get_banner,
            marriages.marriages_slug,
            marriages.user_id,
            marriages.created_at,
            marriages_imgs.image_path,
            marriages_imgs.optimized_image_path
        FROM marriages
        LEFT JOIN animals AS male_animal ON marriages.male_id = male_animal.id
        LEFT JOIN animals AS female_animal ON marriages.female_id = female_animal.id
        LEFT JOIN breed_name ON female_animal.breed_id = breed_name.id
        LEFT JOIN marriages_images marriages_imgs ON marriages_imgs.marriage_id = marriages.id
            AND marriages_imgs.id = (SELECT MIN(id) FROM marriages_images WHERE marriage_id = marriages.id)
        WHERE marriages.user_id = ? 
        AND marriages.is_online = 1
        AND breed_name.slug = ?
        ORDER BY marriages.id DESC
        LIMIT ? OFFSET ?
    `;
    db.query(queryBreedCheck, [breedSlug, userId], (err, breedResult) => {
        if (err || !breedResult.length) {
            console.error('Race non trouvée:', err);
            return res.redirect('/erreur');
        }
        Promise.all([
            new Promise((resolve, reject) => {
                db.query(queryBreeds, [userId], (err, breeds) => {
                    if (err) reject(err);
                    resolve(breeds);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(countQuery, [userId, breedSlug], (err, countResult) => {
                    if (err) reject(err);
                    resolve(countResult[0].total);
                });
            })
        ]).then(([breeds, totalItems]) => {
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            if (currentPage > totalPages && totalPages > 0) {
                return res.redirect(`/mariages/${breedSlug}?page=${totalPages}`);
            }
 
            const offset = (currentPage - 1) * itemsPerPage;
 
            db.query(queryMarriages, [userId, breedSlug, itemsPerPage, offset], (err, marriages) => {
                if (err) {
                    console.error('Erreur lors de la récupération des mariages:', err);
                    return res.redirect('/erreur');
                }
                const currentBreed = breeds.find(breed => breed.slug === breedSlug);
 
                res.render('mariages_by_breed', {
                    breeds: breeds,
                    currentBreed: currentBreed,
                    marriages: marriages.map(marriage => ({
                        ...marriage,
                        totalPuppies: marriage.actual_male_puppies + marriage.actual_female_puppies,
                        availablePuppies: marriage.expected_puppies,
                        formattedDate: new Date(marriage.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric'
                        })
                    })),
                    totalPages: totalPages,
                    currentPage: currentPage,
                    breedSlug: breedSlug
                });
            });
        }).catch(err => {
            console.error('Erreur:', err);
            res.redirect('/erreur');
        });
    });
 });


module.exports = router;