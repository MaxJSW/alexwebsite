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

router.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// get de la page blog (fait)
router.get('/', (req, res) => {
    const userId = 10;
    const itemsPerPage = 5;
    const currentPage = parseInt(req.query.page) || 1;

    if (req.query.page === '0' || req.query.page === '1') {
        return res.redirect('/blog');
    }

    if (req.query.page && (isNaN(currentPage) || currentPage < 0)) {
        return res.redirect('/blog');
    }

    const countQuery = `
        SELECT COUNT(*) AS total 
        FROM blog 
        WHERE blog.user_id = ? AND blog.is_online = 1
    `;

    const queryBlogs = `
        SELECT 
            blog.id,
            blog.titre,
            blog.preview,
            blog.date_creation,
            blog.date_modification,
            blog.slug,
            blog.is_online,
            blog.likes,
            blog.categorie_id,
            blog_categorie.content AS category_content,
            (SELECT COUNT(DISTINCT bka.keywords_id) 
            FROM blog_keywords_associations bka 
            WHERE bka.blog_id = blog.id) AS total_tags,
            (SELECT GROUP_CONCAT(DISTINCT 
                CONCAT(bk.content, ':', bk.tag_slug, ':', (
                    SELECT COUNT(DISTINCT bka2.blog_id) 
                    FROM blog_keywords_associations bka2 
                    WHERE bka2.keywords_id = bk.id
                ))
            ) 
            FROM blog_keywords_associations bka 
            JOIN blog_keywords bk ON bka.keywords_id = bk.id 
            WHERE bka.blog_id = blog.id) AS keywords_with_count,
            (SELECT optimized_image_path FROM blog_images WHERE blog_images.blog_id = blog.id LIMIT 1) AS optimized_image_path,
            (SELECT image_path FROM blog_images WHERE blog_images.blog_id = blog.id LIMIT 1) AS image_path,
            (SELECT balise_alt FROM blog_images WHERE blog_images.blog_id = blog.id LIMIT 1) AS balise_alt
        FROM blog
        LEFT JOIN blog_categorie ON blog.categorie_id = blog_categorie.id
        WHERE blog.user_id = ? AND blog.is_online = 1
        GROUP BY blog.id
        ORDER BY blog.date_creation DESC
        LIMIT ? OFFSET ?
    `;

    const queryBlogCategories = `
        SELECT 
            bc.id, 
            bc.content, 
            bc.category_slug,
            (
                SELECT COUNT(*) 
                FROM blog 
                WHERE blog.categorie_id = bc.id 
                AND blog.is_online = 1
                AND blog.user_id = ?
            ) as count
        FROM blog_categorie bc
    `;

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

    Promise.all([
        new Promise((resolve, reject) => {
            db.query(countQuery, [userId], (err, result) => {
                if (err) reject(err); else resolve(result[0].total);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(queryBlogCategories, [userId], (err, result) => {
                if (err) reject(err); else resolve(result);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(querySocialLinks, [userId], (err, result) => {
                if (err) reject(err); else resolve(result);
            });
        })
    ]).then(([totalItems, categories, socialLinks]) => {

        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (currentPage > totalPages && totalPages > 0) {
            return res.redirect(`/blog?page=${totalPages}`);
        }

        const offset = (currentPage - 1) * itemsPerPage;

        db.query(queryBlogs, [userId, itemsPerPage, offset], (err, blogs) => {
            if (err) {
                console.error('Erreur lors de la récupération des blogs:', err);
                return res.redirect('/erreur');
            }

            res.render('blog', {
                blogs: blogs.map(blog => ({
                    ...blog,
                    keywords: blog.keywords_with_count ? blog.keywords_with_count.split(',').map(k => {
                        const parts = k.split(':');
                        return {
                            content: parts[0],
                            slug: parts[1],
                            count: parseInt(parts[2]) || 0
                        };
                    }) : []
                })),
                categories,
                currentPage,
                totalPages,
                totalItems,
                hasNextPage: currentPage < totalPages,
                currentCategory: req.query.category || null,
                socialLinks
            });
        });

    }).catch(err => {
        console.error('Erreur:', err);
        res.redirect('/erreur');
    });
});

// route de la page de la liste des tags (fait)
router.get('/tags', (req, res) => {
    const userId = 10;

    const queryAllTags = `
        SELECT 
            bk.tag_slug,
            bk.content,
            UPPER(LEFT(TRIM(REGEXP_REPLACE(bk.content, '^#', '')), 1)) as first_letter,
            (
                SELECT COUNT(DISTINCT bka2.blog_id)
                FROM blog_keywords_associations bka2
                JOIN blog b ON bka2.blog_id = b.id
                WHERE bka2.keywords_id = bk.id
                AND b.is_online = 1
                AND b.user_id = ?
            ) as count
        FROM blog_keywords bk
        WHERE bk.content IS NOT NULL AND bk.content != ''
        ORDER BY bk.content ASC
    `;

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

    Promise.all([
        new Promise((resolve, reject) => {
            db.query(queryAllTags, [userId], (err, result) => {
                if (err) reject(err); else resolve(result);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(querySocialLinks, [userId], (err, result) => {
                if (err) reject(err); else resolve(result);
            });
        })
    ]).then(([tags, socialLinks]) => {

        const tagsByLetter = {};
        tags.forEach(tag => {
            const letter = tag.first_letter;
            if (!tagsByLetter[letter]) {
                tagsByLetter[letter] = [];
            }
            tagsByLetter[letter].push({
                content: tag.content,
                tag_slug: tag.tag_slug,
                count: tag.count
            });
        });

        const sortedTagsByLetter = {};
        Object.keys(tagsByLetter)
            .sort()
            .forEach(letter => {
                sortedTagsByLetter[letter] = tagsByLetter[letter];
            });

        res.render('blog_tags_list', {
            tagsByLetter: sortedTagsByLetter,
            socialLinks
        });

    }).catch(err => {
        console.error('Erreur:', err);
        res.redirect('/erreur');
    });
});

// route de la page de la liste des catégories (fait)
router.get('/categories', (req, res) => {
    const userId = 10;

    const queryAllCategories = `
        SELECT 
            bc.id,
            bc.category_slug,
            bc.content,
            UPPER(LEFT(TRIM(bc.content), 1)) as first_letter,
            (
                SELECT COUNT(*)
                FROM blog b
                WHERE b.categorie_id = bc.id
                AND b.is_online = 1
                AND b.user_id = ?
            ) as count
        FROM blog_categorie bc
        WHERE bc.content IS NOT NULL AND bc.content != ''
        ORDER BY bc.content ASC
    `;

    const queryLatestBlogs = `
        SELECT 
            blog.id,
            blog.titre,
            blog.preview,
            blog.date_creation,
            blog.slug,
            blog.likes,
            blog.categorie_id,
            blog_categorie.content AS category_content,
            (SELECT optimized_image_path FROM blog_images WHERE blog_images.blog_id = blog.id LIMIT 1) AS optimized_image_path,
            (SELECT image_path FROM blog_images WHERE blog_images.blog_id = blog.id LIMIT 1) AS image_path,
            (SELECT balise_alt FROM blog_images WHERE blog_images.blog_id = blog.id LIMIT 1) AS balise_alt
        FROM blog
        LEFT JOIN blog_categorie ON blog.categorie_id = blog_categorie.id
        WHERE blog.categorie_id = ? 
        AND blog.is_online = 1 
        AND blog.user_id = ?
        ORDER BY blog.date_creation DESC
        LIMIT 3
    `;

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

    Promise.all([
        new Promise((resolve, reject) => {
            db.query(queryAllCategories, [userId], (err, result) => {
                if (err) reject(err); else resolve(result);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(querySocialLinks, [userId], (err, result) => {
                if (err) reject(err); else resolve(result);
            });
        })
    ]).then(async ([categories, socialLinks]) => {

        const categoriesByLetter = {};
        categories.forEach(category => {
            const letter = category.first_letter;
            if (!categoriesByLetter[letter]) {
                categoriesByLetter[letter] = [];
            }
            categoriesByLetter[letter].push({
                id: category.id,
                content: category.content,
                category_slug: category.category_slug,
                count: category.count,
                latestBlogs: []
            });
        });

        for (const letter in categoriesByLetter) {
            for (const category of categoriesByLetter[letter]) {
                try {
                    const latestBlogs = await new Promise((resolve, reject) => {
                        db.query(queryLatestBlogs, [category.id, userId], (err, results) => {
                            if (err) reject(err); else resolve(results);
                        });
                    });
                    category.latestBlogs = latestBlogs;
                } catch (error) {
                    console.error('Erreur lors de la récupération des derniers articles:', error);
                    category.latestBlogs = [];
                }
            }
        }

        const sortedCategoriesByLetter = {};
        Object.keys(categoriesByLetter)
            .sort()
            .forEach(letter => {
                sortedCategoriesByLetter[letter] = categoriesByLetter[letter];
            });

        res.render('blog_category_list', {
            categoriesByLetter: sortedCategoriesByLetter,
            socialLinks
        });

    }).catch(err => {
        console.error('Erreur:', err);
        res.redirect('/erreur');
    });
});

 // route pour afficher les articles de blog par catégories (fait)
router.get('/categorie/:category_slug', (req, res) => {
    const userId = 10;
    const itemsPerPage = 6;
    const currentPage = parseInt(req.query.page) || 1;
    const categorySlug = req.params.category_slug;

    if (req.query.page === '0' || req.query.page === '1') {
        return res.redirect(`/blog/categorie/${categorySlug}`);
    }

    const countQuery = `
        SELECT COUNT(DISTINCT b.id) AS total 
        FROM blog b
        JOIN blog_categorie bc ON b.categorie_id = bc.id
        WHERE b.user_id = ? 
        AND b.is_online = 1
        AND bc.category_slug = ?
    `;

    const queryBlogs = `
        SELECT DISTINCT
            b.id,
            b.titre,
            b.preview,
            b.date_creation,
            b.slug,
            b.is_online,
            b.likes,
            bc.content AS category_content,
            bc.category_slug,
            (SELECT COUNT(DISTINCT bka.keywords_id) 
            FROM blog_keywords_associations bka 
            WHERE bka.blog_id = b.id) AS total_tags,
            (SELECT GROUP_CONCAT(DISTINCT 
                CONCAT(bk.content, ':', bk.tag_slug, ':', (
                    SELECT COUNT(DISTINCT bka2.blog_id) 
                    FROM blog_keywords_associations bka2 
                    WHERE bka2.keywords_id = bk.id
                ))
            ) 
            FROM blog_keywords_associations bka 
            JOIN blog_keywords bk ON bka.keywords_id = bk.id 
            WHERE bka.blog_id = b.id) AS keywords_with_count,
            (SELECT optimized_image_path FROM blog_images WHERE blog_images.blog_id = b.id LIMIT 1) AS optimized_image_path,
            (SELECT image_path FROM blog_images WHERE blog_images.blog_id = b.id LIMIT 1) AS image_path,
            (SELECT balise_alt FROM blog_images WHERE blog_images.blog_id = b.id LIMIT 1) AS balise_alt
        FROM blog b
        JOIN blog_categorie bc ON b.categorie_id = bc.id
        WHERE b.user_id = ? 
        AND b.is_online = 1
        AND bc.category_slug = ?
        ORDER BY b.date_creation DESC
        LIMIT ? OFFSET ?
    `;

    const queryBlogCategories = `
        SELECT 
            bc.id, 
            bc.content, 
            bc.category_slug,
            (
                SELECT COUNT(*) 
                FROM blog 
                WHERE blog.categorie_id = bc.id 
                AND blog.is_online = 1
                AND blog.user_id = ?
            ) as count
        FROM blog_categorie bc
    `;

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

    // Comptage d'abord pour la pagination
    db.query(countQuery, [userId, categorySlug], (err, countResult) => {
        if (err) {
            console.error('Erreur lors du comptage des blogs:', err);
            return res.redirect('/erreur');
        }

        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (currentPage > totalPages && totalPages > 0) {
            return res.redirect(`/blog/categorie/${categorySlug}?page=${totalPages}`);
        }

        const offset = (currentPage - 1) * itemsPerPage;

        // Promise.all pour les requêtes suivantes
        Promise.all([
            new Promise((resolve, reject) => {
                db.query(queryBlogs, [userId, categorySlug, itemsPerPage, offset], (err, result) => {
                    if (err) reject(err); else resolve(result);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(queryBlogCategories, [userId], (err, result) => {
                    if (err) reject(err); else resolve(result);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(querySocialLinks, [userId], (err, result) => {
                    if (err) reject(err); else resolve(result);
                });
            })
        ]).then(([blogs, categories, socialLinks]) => {

            res.render('blog_by_category', {
                blogs,
                categories,
                currentCategory: blogs.length > 0 ? blogs[0].category_content : '',
                currentPage,
                totalPages,
                totalItems,
                hasNextPage: currentPage < totalPages,
                categorySlug,
                socialLinks
            });

        }).catch(err => {
            console.error('Erreur Promise.all:', err);
            res.redirect('/erreur');
        });
    });
});

// router pour afficher les articles de blog par tags (fait)
router.get('/tag/:tag_slug', (req, res) => {
    const userId = 10;
    const itemsPerPage = 6;
    const currentPage = parseInt(req.query.page) || 1;
    const tagSlug = req.params.tag_slug;

    if (req.query.page === '0' || req.query.page === '1') {
        return res.redirect(`/blog/tag/${tagSlug}`);
    }

    const countQuery = `
        SELECT COUNT(DISTINCT b.id) AS total 
        FROM blog b
        JOIN blog_keywords_associations bka ON b.id = bka.blog_id
        JOIN blog_keywords bk ON bka.keywords_id = bk.id
        WHERE b.user_id = ? 
        AND b.is_online = 1
        AND bk.tag_slug = ?
    `;

    const queryBlogs = `
        SELECT DISTINCT
            b.id,
            b.titre,
            b.preview,
            b.date_creation,
            b.slug,
            b.is_online,
            b.likes,
            b.categorie_id,
            bc.content AS category_content,
            bc.category_slug,
            (SELECT COUNT(DISTINCT bka2.keywords_id) 
            FROM blog_keywords_associations bka2 
            WHERE bka2.blog_id = b.id) AS total_tags,
            (SELECT GROUP_CONCAT(DISTINCT 
                CONCAT(bk2.content, ':', bk2.tag_slug, ':', (
                    SELECT COUNT(DISTINCT bka3.blog_id) 
                    FROM blog_keywords_associations bka3 
                    WHERE bka3.keywords_id = bk2.id
                ))
            ) 
            FROM blog_keywords_associations bka2 
            JOIN blog_keywords bk2 ON bka2.keywords_id = bk2.id 
            WHERE bka2.blog_id = b.id) AS keywords_with_count,
            (SELECT optimized_image_path FROM blog_images WHERE blog_images.blog_id = b.id LIMIT 1) AS optimized_image_path,
            (SELECT image_path FROM blog_images WHERE blog_images.blog_id = b.id LIMIT 1) AS image_path,
            (SELECT balise_alt FROM blog_images WHERE blog_images.blog_id = b.id LIMIT 1) AS balise_alt,
            bk.content AS current_tag
        FROM blog b
        JOIN blog_keywords_associations bka ON b.id = bka.blog_id
        JOIN blog_keywords bk ON bka.keywords_id = bk.id
        LEFT JOIN blog_categorie bc ON b.categorie_id = bc.id
        WHERE b.user_id = ? 
        AND b.is_online = 1
        AND bk.tag_slug = ?
        ORDER BY b.date_creation DESC
        LIMIT ? OFFSET ?
    `;

    const queryBlogCategories = `
        SELECT 
            bc.id,
            bc.content,
            bc.category_slug,
            (
                SELECT COUNT(*) 
                FROM blog 
                WHERE blog.categorie_id = bc.id 
                AND blog.is_online = 1
                AND blog.user_id = ?
            ) as count
        FROM blog_categorie bc
    `;

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

    db.query(countQuery, [userId, tagSlug], (err, countResult) => {
        if (err) {
            console.error('Erreur lors du comptage des blogs:', err);
            return res.redirect('/erreur');
        }

        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (currentPage > totalPages && totalPages > 0) {
            return res.redirect(`/blog/tag/${tagSlug}?page=${totalPages}`);
        }

        const offset = (currentPage - 1) * itemsPerPage;

        Promise.all([
            new Promise((resolve, reject) => {
                db.query(queryBlogs, [userId, tagSlug, itemsPerPage, offset], (err, result) => {
                    if (err) reject(err); else resolve(result);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(queryBlogCategories, [userId], (err, result) => {
                    if (err) reject(err); else resolve(result);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(querySocialLinks, [userId], (err, result) => {
                    if (err) reject(err); else resolve(result);
                });
            })
        ]).then(([blogs, categories, socialLinks]) => {

            res.render('blog_by_tags', {
                blogs,
                currentTag: blogs.length > 0 ? blogs[0].current_tag : '',
                categories,
                currentPage,
                totalPages,
                totalItems,
                hasNextPage: currentPage < totalPages,
                tagSlug,
                socialLinks
            });

        }).catch(err => {
            console.error('Erreur Promise.all:', err);
            res.redirect('/erreur');
        });
    });
});

// route pour afficher les détails d'un blog (fait)
router.get('/:slug', (req, res) => {
    const slug = req.params.slug;
    const userId = 10;

    const queryBlogDetails = `
        SELECT 
            blog.id,
            blog.titre,
            blog.preview,
            blog.date_creation,
            blog.date_modification,
            blog.slug,
            blog.is_online,
            blog.likes,
            blog_categorie.content AS category_content,
            blog_categorie.category_slug,
            bk.content AS tag_content,
            bk.tag_slug,
            (
                SELECT COUNT(DISTINCT bka2.blog_id)
                FROM blog_keywords_associations bka2
                WHERE bka2.keywords_id = bk.id
            ) as tag_count
        FROM blog
        LEFT JOIN blog_categorie ON blog.categorie_id = blog_categorie.id
        LEFT JOIN blog_keywords_associations bka ON blog.id = bka.blog_id
        LEFT JOIN blog_keywords bk ON bka.keywords_id = bk.id
        WHERE blog.user_id = ? 
        AND blog.is_online = 1 
        AND blog.slug = ?
    `;

    const queryBlogImages = `
        SELECT image_path, optimized_image_path, balise_alt
        FROM blog_images
        WHERE blog_id = ?
        ORDER BY id ASC LIMIT 1
    `;

    const queryBlogParagraphs = `
        SELECT title, content
        FROM blog_paragraphs
        WHERE blog_id = ?
        ORDER BY id ASC
    `;

    const queryBlogCategories = `
        SELECT 
            bc.id,
            bc.content,
            bc.category_slug,
            (
                SELECT COUNT(*)
                FROM blog
                WHERE blog.categorie_id = bc.id
                AND blog.is_online = 1
            ) as count
        FROM blog_categorie bc
        ORDER BY bc.content ASC
    `;

    const queryUserInfo = `
        SELECT 
            id, name, surname, kennel_name, email,
            siret_number, acaced_number, adresse, phone_number 
        FROM users 
        WHERE id = ?
    `;

    const queryRecentPosts = `
        SELECT 
            blog.titre, 
            blog.slug,
            blog.date_creation,
            bi.optimized_image_path,
            bi.image_path,
            bi.balise_alt
        FROM blog 
        LEFT JOIN blog_images bi ON bi.blog_id = blog.id
        WHERE blog.user_id = ? 
        AND blog.is_online = 1 
        AND blog.slug != ?
        ORDER BY blog.date_creation DESC 
        LIMIT 6
    `;

    const queryRandomTags = `
        SELECT 
            bk.content,
            bk.tag_slug,
            (
                SELECT COUNT(DISTINCT bka2.blog_id)
                FROM blog_keywords_associations bka2
                WHERE bka2.keywords_id = bk.id
            ) as count
        FROM blog_keywords bk
        LEFT JOIN blog_keywords_associations bka ON bk.id = bka.keywords_id
        GROUP BY bk.id
        ORDER BY RAND()
        LIMIT 10
    `;

    const querySuppPhotos = `
        SELECT image_path, optimized_image_path, balise_title, balise_alt
        FROM blog_supp_images
        WHERE blog_id = ?
        ORDER BY id ASC
    `;

    const queryFaqs = `
        SELECT id, question, reponse
        FROM faq
        WHERE blog_id = ?
        ORDER BY id ASC
    `;

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

    // Première requête : récupérer les détails du blog
    db.query(queryBlogDetails, [userId, slug], (err, blogDetails) => {
        if (err) {
            console.error('Erreur lors de la récupération des détails du blog:', err);
            return res.redirect('/erreur');
        }

        if (blogDetails.length === 0) {
            return res.status(404).redirect('/erreur');
        }

        const blogId = blogDetails[0].id;

        // Promise.all pour toutes les requêtes suivantes
        Promise.all([
            new Promise((resolve, reject) => {
                db.query(queryBlogImages, [blogId], (err, result) => {
                    if (err) reject(err); else resolve(result[0] || {});
                });
            }),
            new Promise((resolve, reject) => {
                db.query(queryBlogParagraphs, [blogId], (err, result) => {
                    if (err) reject(err); else resolve(result);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(queryBlogCategories, (err, result) => {
                    if (err) reject(err); else resolve(result);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(queryUserInfo, [userId], (err, result) => {
                    if (err) reject(err); else resolve(result[0] || {});
                });
            }),
            new Promise((resolve, reject) => {
                db.query(queryRecentPosts, [userId, slug], (err, result) => {
                    if (err) reject(err); else resolve(result);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(queryRandomTags, (err, result) => {
                    if (err) reject(err); else resolve(result);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(querySuppPhotos, [blogId], (err, result) => {
                    if (err) reject(err); else resolve(result);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(queryFaqs, [blogId], (err, result) => {
                    if (err) reject(err); else resolve(result);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(querySocialLinks, [userId], (err, result) => {
                    if (err) reject(err); else resolve(result);
                });
            })
        ]).then(([
            blogImage,
            blogParagraphs,
            categories,
            userInfo,
            recentPosts,
            randomTags,
            suppPhotos,
            faqs,
            socialLinks
        ]) => {

            const keywords = blogDetails
                .filter(tag => tag.tag_content)
                .map(tag => tag.tag_content)
                .join(', ');

            res.render('blog_detail', {
                blog: blogDetails[0],
                tags: blogDetails,
                blogImage,
                blogParagraphs,
                categories,
                userInfo,
                recentPosts,
                randomTags,
                suppPhotos,
                faqs,
                keywords,
                socialLinks
            });

        }).catch(err => {
            console.error('Erreur Promise.all:', err);
            res.redirect('/erreur');
        });
    });
});


module.exports = router;