const fs = require('fs');
const path = require('path');
const { SitemapStream, streamToPromise } = require('sitemap');
const db = require('../db');

function queryDatabase(sql) {
    return new Promise((resolve, reject) => {
        db.query(sql, (error, results) => {
            if (error) reject(error);
            else resolve(results);
        });
    });
}

async function generateSitemap() {
    try {
        const smStream = new SitemapStream({ hostname: 'https://elevagedebelair.com' });

        const staticUrls = [
            { url: '/', changefreq: 'daily', priority: 1.0 }, 
            { url: '/races', changefreq: 'weekly', priority: 0.8 },
            { url: '/chiens', changefreq: 'daily', priority: 0.9 }, 
            { url: '/chiens/saillies', changefreq: 'daily', priority: 0.9 }, 
            { url: '/chiots', changefreq: 'daily', priority: 0.9 },
            { url: '/chiots/a-vendre', changefreq: 'daily', priority: 0.9 },
            { url: '/chiots/a-vendre/males', changefreq: 'daily', priority: 0.9 },
            { url: '/chiots/a-vendre/femelles', changefreq: 'daily', priority: 0.9 },
            { url: '/chiots/produits', changefreq: 'daily', priority: 0.9 },
            { url: '/chiots/produits/males', changefreq: 'daily', priority: 0.9 },
            { url: '/chiots/produits/femelles', changefreq: 'daily', priority: 0.9 },
            { url: '/nos-retraites', changefreq: 'weekly', priority: 0.7 }, 
            { url: '/mariages', changefreq: 'daily', priority: 0.8 },
            { url: '/blog', changefreq: 'daily', priority: 0.7 }, 
            { url: '/blog/categories', changefreq: 'daily', priority: 0.7 },
            { url: '/blog/tags', changefreq: 'daily', priority: 0.7 },
            { url: '/informations', changefreq: 'daily', priority: 0.7 },
            { url: '/contact', changefreq: 'monthly', priority: 0.6 }, 
            { url: '/livre-d-or', changefreq: 'monthly', priority: 0.6 }
        ];

        staticUrls.forEach(url => smStream.write(url));

        const breedSlugs = await queryDatabase('SELECT slug FROM breed_name WHERE is_online = 1');

        const activeBreeds = await queryDatabase(`
            SELECT DISTINCT bn.slug AS breed_slug
            FROM breed_name bn
            INNER JOIN animals a ON a.breed_id = bn.id
            WHERE bn.is_online = 1
            AND a.is_online = 1
            AND a.in_breeding = 1
        `);

        const activeAnimals = await queryDatabase(`
            SELECT a.slug, a.in_breeding, a.retreat, bn.slug AS breed_slug 
            FROM animals a
            LEFT JOIN breed_name bn ON a.breed_id = bn.id
            WHERE a.is_online = 1 
            AND a.in_breeding = 1
        `);

        const activeMarriages = await queryDatabase(`
            SELECT m.marriages_slug, bn.slug AS breed_slug 
            FROM marriages m
            LEFT JOIN animals a ON m.female_id = a.id
            LEFT JOIN breed_name bn ON a.breed_id = bn.id
            WHERE m.is_online = 1
        `);

        const activePuppyBreeds = await queryDatabase(`
            SELECT slug AS breed_slug
            FROM breed_name
            WHERE is_online = 1
        `);

        const activePuppies = await queryDatabase(`
            SELECT p.puppy_slug, p.sale_status, bn.slug AS breed_slug
            FROM puppies p
            LEFT JOIN breed_name bn ON p.breed_id = bn.id
            WHERE p.puppy_is_online = 1
        `);

        const activeBlogCategories = await queryDatabase(`
            SELECT DISTINCT bc.category_slug
            FROM blog_categorie bc
            INNER JOIN blog b ON b.categorie_id = bc.id
            WHERE b.is_online = 1
        `);

        const activeBlogTags = await queryDatabase(`
            SELECT DISTINCT bk.tag_slug
            FROM blog_keywords bk
            INNER JOIN blog_keywords_associations bka ON bk.id = bka.keywords_id
            INNER JOIN blog b ON bka.blog_id = b.id
            WHERE b.is_online = 1
        `);

        const activeBlogs = await queryDatabase('SELECT slug FROM blog WHERE is_online = 1');


        const activeInfos = await queryDatabase('SELECT slug FROM kennel_informations WHERE is_online = 1');

        breedSlugs.forEach(row => {
            smStream.write({ url: `/races/${row.slug}`, changefreq: 'weekly', priority: 0.7 });
        });

        activeBreeds.forEach(breed => {
            smStream.write({ url: `/chiens/${breed.breed_slug}`, changefreq: 'weekly', priority: 0.8 });
            smStream.write({ url: `/chiens/${breed.breed_slug}/saillies`, changefreq: 'weekly', priority: 0.8 });
            smStream.write({ url: `/chiens/${breed.breed_slug}/males`, changefreq: 'weekly', priority: 0.8 });
            smStream.write({ url: `/chiens/${breed.breed_slug}/femelles`, changefreq: 'weekly', priority: 0.8 });
        });

        activeAnimals.forEach(animal => {
            smStream.write({ url: `/chiens/${animal.breed_slug}/${animal.slug}`, changefreq: 'weekly', priority: 0.8 });
        });

            activeMarriages.forEach(marriage => {
                smStream.write({ 
                    url: `/mariages/${marriage.breed_slug}/${marriage.marriages_slug}`, 
                    changefreq: 'daily', 
                    priority: 0.7 
                });
            });

        activePuppyBreeds.forEach(breed => {
            smStream.write({ url: `/chiots/a-vendre/${breed.breed_slug}`, changefreq: 'daily', priority: 0.9 });
            smStream.write({ url: `/chiots/a-vendre/${breed.breed_slug}/males`, changefreq: 'daily', priority: 0.9 });
            smStream.write({ url: `/chiots/a-vendre/${breed.breed_slug}/femelles`, changefreq: 'daily', priority: 0.9 });
            smStream.write({ url: `/chiots/produits/${breed.breed_slug}`, changefreq: 'daily', priority: 0.7 });
            smStream.write({ url: `/chiots/produits/${breed.breed_slug}/males`, changefreq: 'daily', priority: 0.7 });
            smStream.write({ url: `/chiots/produits/${breed.breed_slug}/femelles`, changefreq: 'daily', priority: 0.7 });
        });

        activePuppies.forEach(puppy => {
            if (puppy.sale_status === 'sold') {
                smStream.write({ url: `/chiots/produits/${puppy.breed_slug}/${puppy.puppy_slug}`, changefreq: 'weekly', priority: 0.7 });
            } else {
                smStream.write({ url: `/chiots/a-vendre/${puppy.breed_slug}/${puppy.puppy_slug}`, changefreq: 'daily', priority: 0.9 });
            }
        });
        activeBlogs.forEach(blog => {
            smStream.write({ url: `/blog/${blog.slug}`, changefreq: 'weekly', priority: 0.7 });
        });

        activeBlogCategories.forEach(category => {
            smStream.write({ url: `/blog/categorie/${category.category_slug}`, changefreq: 'weekly', priority: 0.8 });
        });

        activeBlogTags.forEach(tag => {
            smStream.write({ url: `/blog/tag/${tag.tag_slug}`, changefreq: 'weekly', priority: 0.7 });
        });

        activeInfos.forEach(info => {
            smStream.write({ url: `/informations/${info.slug}`, changefreq: 'weekly', priority: 0.7 });
        });

        smStream.end();

        const sitemap = await streamToPromise(smStream);

        const frontFolder = path.resolve(__dirname, './../../public/front');
        if (!fs.existsSync(frontFolder)) {
            fs.mkdirSync(frontFolder, { recursive: true });
        }

        const sitemapPath = path.join(frontFolder, 'sitemap.xml');
        fs.writeFileSync(sitemapPath, sitemap.toString());
        console.log('Sitemap mis à jour avec succès !');
    } catch (error) {
        console.error('Erreur lors de la génération du sitemap :', error);
    }
}

module.exports = generateSitemap;
