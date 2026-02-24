const db = require('../../../../routes/db');
const optimizeImage = require('./sharpOptimize');
const path = require('path');

async function optimizeNewImages() {
    const tables = [
        { name: 'images', column: 'image_path' },
        { name: 'blog_images', column: 'image_path' },
        { name: 'breed_images', column: 'image_path' },
        { name: 'images_father', column: 'image_path' },
        { name: 'images_grandfather', column: 'image_path' },
        { name: 'images_grandmother', column: 'image_path' },
        { name: 'images_mother', column: 'image_path' },
        { name: 'kennel_images', column: 'image_path' },
        { name: 'marriages_images', column: 'image_path' },
        { name: 'profile_images', column: 'image_path_profile' },
        { name: 'puppies_images', column: 'image_path' },
        { name: 'puppies_profil_images', column: 'image_path_puppies_profil' },
        { name: 'users_images', column: 'image_path' },
        { name: `animals_cover_images`, column: 'image_path' },
        { name: `blog_supp_images`, column: 'image_path' }

    ];

    for (const table of tables) {
        const query = `SELECT id, ${table.column} AS image_path FROM ${table.name} WHERE optimized = 0`;

        db.query(query, async (err, results) => {
            if (err) {
                // console.error(`Error fetching non-optimized images from ${table.name}:`, err);
                return;
            }

            if (results.length === 0) {
                // console.log(`Aucune image à optimiser dans la table ${table.name}.`);
                return;
            }

            for (const image of results) {
                try {
                    const optimizedFilePath = await optimizeImage(image.image_path);
                    if (optimizedFilePath) {
                        const updateQuery = `UPDATE ${table.name} SET optimized = 1, optimized_image_path = ? WHERE id = ?`;
                        db.query(updateQuery, [path.basename(optimizedFilePath), image.id], (err) => {
                            if (err) {
                                console.error(`Error updating optimized image in ${table.name}:`, err);
                            } else {
                                // console.log(`Image ID ${image.id} in ${table.name} optimized successfully.`);
                            }
                        });
                    } else {
                        // console.warn(`Image ID ${image.id} in ${table.name} could not be optimized.`);
                    }
                } catch (error) {
                    // console.error(`Error during optimization of image ID ${image.id} in ${table.name}:`, error.message);
                }
            }
        });
    }
}

optimizeNewImages();

module.exports = optimizeNewImages;
