const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

async function optimizeImage(imagePath) {
    // Assurez-vous que le chemin est absolu
    const absolutePath = path.join(__dirname, '..', '..', '..', '..', 'uploads', imagePath);

    // Vérifiez si le fichier existe
    if (!fs.existsSync(absolutePath)) {
        console.error('Fichier introuvable :', absolutePath);
        return null;
    }

    const outputDir = path.join(path.dirname(absolutePath), 'optimized');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    // Créer un nom de fichier WebP
    const webpFileName = path.basename(imagePath, path.extname(imagePath)) + '.webp';
    const outputFilePath = path.join(outputDir, webpFileName);

    try {
        await sharp(absolutePath)
            .resize(1024)
            .webp({ quality: 80 })
            .toFile(outputFilePath);

        // console.log(`Image optimisée en WebP : ${outputFilePath}`);
        return outputFilePath;
    } catch (error) {
        console.error('Erreur lors de l\'optimisation de l\'image :', error);
        return null;
    }
}

module.exports = optimizeImage;
