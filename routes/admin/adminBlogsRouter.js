
const path = require('path');
const fs = require('fs');
const express = require('express');
const router = express.Router();
const moment = require('moment');
require('moment/locale/fr');
const dotenv = require('dotenv');
const multer = require('multer');
const bodyParser = require('body-parser');
const slugify = require('slugify');

const db = require('../db');

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


//  router principal de la page des articles + filtre par utilisateur
router.get('/', isAuthenticated, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const offset = (page - 1) * limit;
    const userId = req.session.user.id; // Récupérer l'ID de l'utilisateur connecté

    // Requête pour récupérer les blogs avec leur catégorie
    const getBlogsQuery = `
        SELECT blog.*, 
               blog_categorie.content AS category_content,  -- Récupérer le contenu de la catégorie
               CASE WHEN blog.is_online = 1 THEN 'En Ligne' ELSE 'Brouillon' END AS status_text,
               CASE WHEN blog.is_online = 1 THEN 'bg-success' ELSE 'bg-secondary' END AS badge_class
        FROM blog
        LEFT JOIN blog_categorie ON blog.categorie_id = blog_categorie.id  -- Jointure avec blog_categorie
        WHERE blog.user_id = ?  -- Filtrer par l'utilisateur
        ORDER BY blog.date_creation DESC 
        LIMIT ? OFFSET ?
    `;

    // Requête pour compter le nombre total de blogs
    const countBlogsQuery = `
        SELECT COUNT(*) AS total 
        FROM blog
        WHERE user_id = ?  -- Filtrer par l'utilisateur
    `;

    db.query(countBlogsQuery, [userId], (err, countResult) => {
        if (err) {
            console.error('Erreur lors de la récupération du nombre total de blogs:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération du nombre total de blogs' });
        }

        const totalBlogs = countResult[0].total;
        const totalPages = Math.ceil(totalBlogs / limit);

        db.query(getBlogsQuery, [userId, limit, offset], (err, blogsResult) => {
            if (err) {
                console.error('Erreur lors de la récupération des blogs:', err);
                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des blogs' });
            }

            // Formatez les dates de création des blogs
            blogsResult.forEach(blog => {
                blog.formatted_date_creation = moment(blog.date_creation).format('DD/MM/YYYY HH:mm');
                blog.formatted_date_modification = moment(blog.date_modification).format('DD/MM/YYYY HH:mm');
            });

            // Requête pour récupérer toutes les catégories de blogs
            const getCategoriesQuery = `
                SELECT * FROM blog_categorie
            `;

            db.query(getCategoriesQuery, (err, categoriesResult) => {
                if (err) {
                    console.error('Erreur lors de la récupération des catégories de blog:', err);
                    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des catégories de blog' });
                }

                res.render('adminBlogs', {
                    user: req.session.user,
                    blogs: blogsResult,
                    totalPages,
                    totalBlogs, 
                    currentPage: page,
                    searchQuery: '', 
                    categories: categoriesResult,
                    currentPage: 'blogs'
                });
            });
        });
    });
});


//  router pour la recherche des blogs + filtre par utilisateur
router.get('/search', isAuthenticated, (req, res) => {
    const searchQuery = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const offset = (page - 1) * limit;
    const userId = req.session.user.id;

    const searchBlogsQuery = `
        SELECT * 
        FROM blog 
        WHERE user_id = ? AND titre LIKE ? 
        ORDER BY date_creation DESC 
        LIMIT ? OFFSET ?
    `;

    const countBlogsQuery = `
        SELECT COUNT(*) AS total 
        FROM blog 
        WHERE user_id = ? AND titre LIKE ?
    `;

    db.query(countBlogsQuery, [userId, `%${searchQuery}%`], (err, countResult) => {
        if (err) {
            console.error('Erreur lors de la récupération du nombre total de blogs:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération du nombre total de blogs' });
        }

        const totalBlogs = countResult[0].total;
        const totalPages = Math.ceil(totalBlogs / limit);

        db.query(searchBlogsQuery, [userId, `%${searchQuery}%`, limit, offset], (err, blogsResult) => {
            if (err) {
                console.error('Erreur lors de la récupération des blogs:', err);
                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des blogs' });
            }

            blogsResult.forEach(blog => {
                blog.formatted_date_creation = moment(blog.date_creation).format('DD/MM/YYYY HH:mm');
                blog.formatted_date_modification = moment(blog.date_modification).format('DD/MM/YYYY HH:mm');
            });

            res.json({
                success: true,
                blogs: blogsResult,
                totalPages,
                currentPage: page,
                searchQuery
            });
        });
    });
});


// router pour récupérer les élements des articles
router.get('/:id', isAuthenticated, (req, res) => {
    const articleId = req.params.id;

    const getArticleQuery = `
        SELECT * 
        FROM blog 
        WHERE id = ?
    `;

    const getParagraphsQuery = `
        SELECT * 
        FROM blog_paragraphs 
        WHERE blog_id = ?
    `;

    db.query(getArticleQuery, [articleId], (err, articleResult) => {
        if (err) {
            console.error('Erreur lors de la récupération de l\'article:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'article' });
        }

        if (articleResult.length === 0) {
            return res.status(404).json({ success: false, message: 'Article non trouvé' });
        }

        db.query(getParagraphsQuery, [articleId], (err, paragraphsResult) => {
            if (err) {
                console.error('Erreur lors de la récupération des paragraphes:', err);
                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des paragraphes' });
            }

            const article = articleResult[0];
            article.paragraphs = paragraphsResult;

            res.json(article);
        });
    });
});


// router pour afficher la photo dans la modale
router.get('/:id/photos', isAuthenticated, (req, res) => {
    const blogId = req.params.id;

    const getPhotosQuery = `
        SELECT * 
        FROM blog_images 
        WHERE blog_id = ?
    `;

    db.query(getPhotosQuery, [blogId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la récupération des photos:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des photos' });
        }

        res.json({ success: true, photos: result });
    });
});


// Route pour récupérer les mots clefs d'un blog spécifique
router.get('/:blogId/keywords', isAuthenticated, (req, res) => {
    const blogId = req.params.blogId;

    // Requête pour récupérer les mots clés associés à l'article
    db.query(`
        SELECT bk.id, bk.content
        FROM blog_keywords_associations bka
        JOIN blog_keywords bk ON bka.keywords_id = bk.id
        WHERE bka.blog_id = ?
    `, [blogId], (err, keywords) => {
        if (err) {
            console.error('Erreur lors de la récupération des mots clefs:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Erreur lors de la récupération des mots clefs' 
            });
        }

        if (keywords.length > 0) {
            res.json({ success: true, keywords });
        } else {
            res.json({ 
                success: false, 
                message: 'Aucun mot clé trouvé pour cet article' 
            });
        }
    });
});


router.get('/:blogId/supp-photos', isAuthenticated, (req, res) => {
    const blogId = req.params.blogId;

    const query = `
        SELECT 
            id,
            blog_id,
            image_path,
            balise_title,
            balise_alt,
            optimized,
            optimized_image_path
        FROM 
            blog_supp_images
        WHERE 
            blog_id = ?
        ORDER BY 
            id ASC
    `;

    db.query(query, [blogId], (err, photos) => {
        if (err) {
            console.error('Erreur lors de la récupération des photos supplémentaires:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des photos'
            });
        }

        res.json({
            success: true,
            photos: photos
        });
    });
});


// Route pour récupérer les FAQs d'un article spécifique
router.get('/:blogId/get-faqs', isAuthenticated, (req, res) => {
    const blogId = req.params.blogId;
    const userId = req.session.user.id;

    const checkBlogOwnership = `
        SELECT id FROM blog 
        WHERE id = ? AND user_id = ?
    `;

    db.query(checkBlogOwnership, [blogId, userId], (err, blogResult) => {
        if (err) {
            console.error('Erreur lors de la vérification du propriétaire de l\'article:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Erreur lors de la récupération des FAQs' 
            });
        }

        if (blogResult.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Vous n\'êtes pas autorisé à accéder à cet article' 
            });
        }

        const getFaqsQuery = `
            SELECT id, question, reponse 
            FROM faq 
            WHERE blog_id = ? 
            ORDER BY id ASC
        `;

        db.query(getFaqsQuery, [blogId], (err, faqs) => {
            if (err) {
                console.error('Erreur lors de la récupération des FAQs:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Erreur lors de la récupération des FAQs' 
                });
            }

            res.json({
                success: true,
                faqs: faqs
            });
        });
    });
});


// Route pour récupérer une FAQ spécifique
router.get('/faq/:id', isAuthenticated, (req, res) => {
    const faqId = req.params.id;
    const userId = req.session.user.id;

    const query = `
        SELECT f.* 
        FROM faq f
        JOIN blog b ON f.blog_id = b.id
        WHERE f.id = ? AND b.user_id = ?
    `;

    db.query(query, [faqId, userId], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération de la FAQ:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération de la FAQ'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'FAQ non trouvée'
            });
        }

        res.json({
            success: true,
            faq: results[0]
        });
    });
});



router.post('/add-supp-photo', isAuthenticated, upload.single('photo'), async (req, res) => {
    try {
        const { blogId, balise_alt } = req.body;
        const photo = req.file;

        if (!photo) {
            return res.json({
                success: false,
                message: 'Aucune photo n\'a été envoyée'
            });
        }

        // Insérer dans la base de données
        const query = `
            INSERT INTO blog_supp_images 
            (blog_id, image_path, balise_alt, optimized) 
            VALUES (?, ?, ?, 0)
        `;

        db.query(query, [blogId, photo.filename, balise_alt], (err, result) => {
            if (err) {
                console.error('Erreur lors de l\'ajout de la photo:', err);
                return res.json({
                    success: false,
                    message: 'Erreur lors de l\'enregistrement de la photo'
                });
            }

            res.json({
                success: true,
                message: 'Photo ajoutée avec succès',
                photoId: result.insertId
            });
        });
    } catch (error) {
        console.error('Erreur:', error);
        res.json({
            success: false,
            message: 'Une erreur est survenue'
        });
    }
});


// router post pour modifier les articles + slug du titre de l'article
router.post('/edit-article', isAuthenticated, (req, res) => {
    const { titre, preview, date_modification, id, slug, paragraphs } = req.body;

    const formattedDateModification = moment(date_modification, 'DD/MM/YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss');

    const updateArticleQuery = `
        UPDATE blog 
        SET titre = ?, preview = ?, date_modification = ?, slug = ?
        WHERE id = ?
    `;

    db.query(updateArticleQuery, [titre, preview, formattedDateModification, slug, id], (err, result) => {
        if (err) {
            console.error('Erreur lors de la mise à jour de l\'article:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de l\'article' });
        }

        if (paragraphs && paragraphs.length > 0) {
            const paragraphsData = paragraphs.map(p => [id, p.title || '', p.content || '']);
            const deleteParagraphsQuery = `DELETE FROM blog_paragraphs WHERE blog_id = ?`;
            const insertParagraphsQuery = `
                INSERT INTO blog_paragraphs (blog_id, title, content)
                VALUES ?
            `;

            db.query(deleteParagraphsQuery, [id], (err, result) => {
                if (err) {
                    console.error('Erreur lors de la suppression des anciens paragraphes:', err);
                    return res.status(500).json({ success: false, message: 'Erreur lors de la suppression des anciens paragraphes' });
                }

                db.query(insertParagraphsQuery, [paragraphsData], (err, result) => {
                    if (err) {
                        console.error('Erreur lors de l\'insertion des nouveaux paragraphes:', err);
                        return res.status(500).json({ success: false, message: 'Erreur lors de l\'insertion des nouveaux paragraphes' });
                    }

                    res.json({ success: true, message: 'Article mis à jour avec succès' });
                });
            });
        } else {
            res.json({ success: true, message: 'Article mis à jour avec succès' });
        }
    });
});


// router.post pour l'ajout de la photo de l'article modifié
router.post('/add-photo', isAuthenticated, upload.single('photo'), (req, res) => {
    const { balise_title, balise_alt, blogId } = req.body;
    let imagePath;

    if (req.file) {
        imagePath = req.file.filename;
    }

    const checkPhotoQuery = `SELECT image_path FROM blog_images WHERE blog_id = ?`;

    db.query(checkPhotoQuery, [blogId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la vérification de la photo existante:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de la photo existante' });
        }

        if (result.length > 0 && imagePath) {
            const oldImagePath = path.join(__dirname, '..', '..', 'uploads', result[0].image_path);
            
            fs.access(oldImagePath, fs.constants.F_OK | fs.constants.W_OK, (accessErr) => {
                if (!accessErr) {
                    fs.unlink(oldImagePath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error('Erreur lors de la suppression de l\'ancienne photo:', unlinkErr);
                            return res.status(500).json({ success: false, message: 'Erreur lors de la suppression de l\'ancienne photo' });
                        }

                        // Supprimer l'entrée de la base de données et insérer la nouvelle photo
                        deleteAndInsertPhoto(blogId, imagePath, balise_title, balise_alt, res);
                    });
                } else {
                    console.error('Impossible d\'accéder au fichier pour suppression:', accessErr);
                    return res.status(500).json({ success: false, message: 'Erreur de permission pour supprimer l\'ancienne photo' });
                }
            });
        } else if (imagePath) {
            // Insérer la nouvelle photo directement
            insertPhoto(blogId, imagePath, balise_title, balise_alt, res);
        } else {
            // Mettre à jour seulement les balises title et alt
            updatePhotoTags(blogId, balise_title, balise_alt, res);
        }
    });
});

// Fonction pour supprimer et insérer la nouvelle photo
function deleteAndInsertPhoto(blogId, imagePath, balise_title, balise_alt, res) {
    const deletePhotoQuery = `DELETE FROM blog_images WHERE blog_id = ?`;
    
    db.query(deletePhotoQuery, [blogId], (deleteErr) => {
        if (deleteErr) {
            console.error('Erreur lors de la suppression de l\'ancienne photo de la base de données:', deleteErr);
            return res.status(500).json({ success: false, message: 'Erreur lors de la suppression de l\'ancienne photo de la base de données' });
        }

        insertPhoto(blogId, imagePath, balise_title, balise_alt, res);
    });
}

function insertPhoto(blogId, imagePath, balise_title, balise_alt, res) {
    const insertPhotoQuery = `INSERT INTO blog_images (blog_id, image_path, balise_title, balise_alt, alt_modified) VALUES (?, ?, ?, ?, ?)`;
    
    db.query(insertPhotoQuery, [blogId, imagePath, balise_title, balise_alt, false], (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'ajout de la photo:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout de la photo' });
        }

        res.json({ success: true, imagePath, balise_title, balise_alt });
    });
}

function updatePhotoTags(blogId, balise_title, balise_alt, res) {
    const updatePhotoQuery = `UPDATE blog_images SET balise_title = ?, balise_alt = ?, alt_modified = ? WHERE blog_id = ?`;

    db.query(updatePhotoQuery, [balise_title, balise_alt, true, blogId], (err, updateResult) => {
        if (err) {
            console.error('Erreur lors de la mise à jour des balises:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des balises' });
        }

        res.json({ success: true, message: 'Balises mises à jour avec succès' });
    });
}

// Exemple de route pour mettre à jour le statut de l'article
router.post('/:blogId/update-status', (req, res) => {
    const blogId = req.params.blogId;
    const { isOnline } = req.body;

    // Requête SQL pour mettre à jour le statut de l'article
    const updateQuery = `
        UPDATE blog
        SET is_online = ?
        WHERE id = ?
    `;

    db.query(updateQuery, [isOnline, blogId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la mise à jour du statut de l\'article:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du statut de l\'article' });
        }

        // Vérifier si la mise à jour a été effectuée avec succès
        if (result.affectedRows > 0) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Aucun article trouvé avec cet ID' });
        }
    });
});


router.post('/create-article', isAuthenticated, (req, res) => {
    const { titre, preview, date_creation, slug, categories } = req.body;
    const user_id = req.session.user.id; // Assurez-vous que l'utilisateur est authentifié et que son ID est dans la session

    // Formatez la date de création avant de l'insérer dans la base de données
    const formattedDateCreation = moment(date_creation, 'DD/MM/YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss');

    // Vérifier si "categories" est un tableau, sinon en faire un tableau et prendre la première catégorie si plusieurs
    const category_id = Array.isArray(categories) ? categories[0] : categories;

    // Requête pour insérer l'article dans la table "blog" avec l'ID de la catégorie
    const createArticleQuery = `
        INSERT INTO blog (titre, preview, date_creation, user_id, slug, categorie_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(createArticleQuery, [titre, preview, formattedDateCreation, user_id, slug, category_id], (err, result) => {
        if (err) {
            console.error('Erreur lors de la création de l\'article:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la création de l\'article' });
        }

        // Retourner une réponse de succès après l'insertion
        res.json({ success: true, message: 'Article créé avec succès avec sa catégorie' });
    });
});


// Route pour ajouter des mots clefs à un blog spécifique + message de succès
router.post('/add-keywords/:blogId', isAuthenticated, (req, res) => {
    const { blogId } = req.params;
    const { keywords } = req.body;

    // Fonction pour normaliser un mot-clé en slug
    function createTagSlug(keyword) {
        return keyword
            .replace(/[^a-zA-Z0-9 ]/g, '')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .split(' ')
            .map((word, index) => (index === 0 ? word.toLowerCase() : word.charAt(0).toLowerCase() + word.slice(1)))
            .join('-')
            .replace(/--+/g, '-');
    }

    // Supprimer d'abord les anciennes associations
    db.query(`DELETE FROM blog_keywords_associations WHERE blog_id = ?`, [blogId], (err) => {
        if (err) {
            console.error('Erreur lors de la suppression des anciennes associations:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des mots clefs' });
        }

        // Traiter chaque mot-clé séquentiellement
        let processedKeywords = 0;
        keywords.forEach(keyword => {
            // Vérifier si le mot-clé existe déjà
            db.query(`SELECT id FROM blog_keywords WHERE content = ?`, [keyword], (err, existingKeyword) => {
                if (err) {
                    console.error('Erreur lors de la vérification du mot clef:', err);
                    return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des mots clefs' });
                }

                if (existingKeyword.length > 0) {
                    // Le mot-clé existe, créer l'association
                    const keywordId = existingKeyword[0].id;
                    createAssociation(keywordId);
                } else {
                    // Créer le nouveau mot-clé
                    const tagSlug = createTagSlug(keyword);
                    db.query(
                        `INSERT INTO blog_keywords (content, tag_slug) VALUES (?, ?)`,
                        [keyword, tagSlug],
                        (err, result) => {
                            if (err) {
                                console.error('Erreur lors de l\'insertion du mot clef:', err);
                                return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des mots clefs' });
                            }
                            createAssociation(result.insertId);
                        }
                    );
                }
            });
        });

        // Fonction pour créer l'association et vérifier si tout est terminé
        function createAssociation(keywordId) {
            db.query(
                `INSERT INTO blog_keywords_associations (blog_id, keywords_id) VALUES (?, ?)`,
                [blogId, keywordId],
                (err) => {
                    if (err) {
                        console.error('Erreur lors de la création de l\'association:', err);
                        return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des mots clefs' });
                    }
                    
                    processedKeywords++;
                    if (processedKeywords === keywords.length) {
                        // Tous les mots-clés ont été traités
                        res.json({ success: true, message: 'Mots clefs ajoutés avec succès' });
                    }
                }
            );
        }
    });
});
  

// router get pour récupérer les mots clefs existants
router.get('/keywords/search', isAuthenticated, (req, res) => {
    const { q } = req.query;
    
    db.query(
        `SELECT id, content FROM blog_keywords WHERE content LIKE ? LIMIT 10`,
        [`%${q}%`],
        (err, keywords) => {
            if (err) {
                console.error('Erreur lors de la recherche des mots clefs:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Erreur lors de la recherche des mots clefs' 
                });
            }
            res.json({ success: true, keywords });
        }
    );
});

// Route pour ajouter une nouvelle catégorie de blog
router.post('/add-New-Category', (req, res) => {
    const { content } = req.body;

    // Créer le slug
    const category_slug = slugify(content, {
        replacement: '-',
        remove: /[*+~.()'"!:@]/g,
        lower: true,
        strict: true,
        locale: 'fr'
    });

    // Insérez la nouvelle catégorie avec son slug dans la base de données
    const query = 'INSERT INTO blog_categorie (content, category_slug) VALUES (?, ?)';
    
    db.query(query, [content, category_slug], (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'ajout de la nouvelle catégorie:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Erreur lors de l\'ajout de la nouvelle catégorie' 
            });
        }

        // Renvoie une réponse JSON avec les détails de la nouvelle catégorie ajoutée
        res.json({
            success: true,
            category: {
                id: result.insertId,
                content: content,
                category_slug: category_slug
            }
        });
    });
});

// Route pour sauvegarder une FAQ
router.post('/faqs/:blogId', isAuthenticated, (req, res) => {
    const blogId = req.params.blogId;
    const { faqs } = req.body;
    const userId = req.session.user.id;

    const checkBlogOwnership = `
        SELECT id FROM blog 
        WHERE id = ? AND user_id = ?
    `;

    db.query(checkBlogOwnership, [blogId, userId], (err, blogResult) => {
        if (err) {
            console.error('Erreur lors de la vérification du propriétaire de l\'article:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la sauvegarde des FAQs'
            });
        }

        if (blogResult.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Vous n\'êtes pas autorisé à modifier cet article'
            });
        }

        const values = faqs.map(faq => [blogId, faq.question, faq.reponse]);
        const insertFaqQuery = `
            INSERT INTO faq (blog_id, question, reponse)
            VALUES ?
        `;

        db.query(insertFaqQuery, [values], (err, result) => {
            if (err) {
                console.error('Erreur lors de l\'insertion des FAQs:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la sauvegarde des FAQs'
                });
            }

            res.json({
                success: true,
                message: 'FAQs ajoutées avec succès'
            });
        });
    });
});

// Route pour mettre à jour une FAQ existante
router.put('/faq/:id', isAuthenticated, (req, res) => {
    const faqId = req.params.id;
    const { question, reponse } = req.body;
    const userId = req.session.user.id;

    // Vérifie que la FAQ appartient à un article de l'utilisateur
    const checkFaqOwnership = `
        SELECT b.user_id 
        FROM faq f 
        JOIN blog b ON f.blog_id = b.id 
        WHERE f.id = ?
    `;

    db.query(checkFaqOwnership, [faqId], (err, ownerResult) => {
        if (err) {
            console.error('Erreur lors de la vérification de la propriété:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Erreur lors de la mise à jour de la FAQ' 
            });
        }

        if (ownerResult.length === 0 || ownerResult[0].user_id !== userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Vous n\'êtes pas autorisé à modifier cette FAQ' 
            });
        }

        // Met à jour la FAQ
        const updateFaqQuery = `
            UPDATE faq 
            SET question = ?, reponse = ? 
            WHERE id = ?
        `;

        db.query(updateFaqQuery, [question, reponse, faqId], (err, result) => {
            if (err) {
                console.error('Erreur lors de la mise à jour de la FAQ:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Erreur lors de la mise à jour de la FAQ' 
                });
            }

            res.json({
                success: true,
                message: 'FAQ mise à jour avec succès'
            });
        });
    });
});

// Route pour supprimer une FAQ
router.delete('/faq/:id', isAuthenticated, (req, res) => {
    const faqId = req.params.id;
    const userId = req.session.user.id;

    // Vérifie que la FAQ appartient à un article de l'utilisateur
    const checkFaqOwnership = `
        SELECT b.user_id 
        FROM faq f 
        JOIN blog b ON f.blog_id = b.id 
        WHERE f.id = ?
    `;

    db.query(checkFaqOwnership, [faqId], (err, ownerResult) => {
        if (err) {
            console.error('Erreur lors de la vérification de la propriété:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Erreur lors de la suppression de la FAQ' 
            });
        }

        if (ownerResult.length === 0 || ownerResult[0].user_id !== userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Vous n\'êtes pas autorisé à supprimer cette FAQ' 
            });
        }

        // Supprime la FAQ
        const deleteFaqQuery = `
            DELETE FROM faq 
            WHERE id = ?
        `;

        db.query(deleteFaqQuery, [faqId], (err, result) => {
            if (err) {
                console.error('Erreur lors de la suppression de la FAQ:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Erreur lors de la suppression de la FAQ' 
                });
            }

            res.json({
                success: true,
                message: 'FAQ supprimée avec succès'
            });
        });
    });
});


module.exports = router;