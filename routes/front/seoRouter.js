const express = require('express');
const router = express.Router();
const path = require('path');

// Route pour robots.txt
router.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.sendFile(path.join(__dirname, '../../robots.txt'));
});

router.get('/sitemap.xml', (req, res) => {
    const sitemapPath = path.join(__dirname, '../../public/front/sitemap.xml');
    res.type('application/xml');
    res.sendFile(sitemapPath, (err) => {
        if (err) {
            console.error('Erreur lors de l\'envoi du sitemap.xml :', err);
            res.status(404).send('Sitemap non trouvé');
        }
    });
});

module.exports = router;