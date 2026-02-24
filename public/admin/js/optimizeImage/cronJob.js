// cronJob.js
const cron = require('node-cron');
const optimizeNewImages = require('./optimizeNewImages');

// cron.schedule('* * * * *', () => {
// Cron job qui s'exécute chaque jour à minuit
cron.schedule('0 0 * * *', () => {
    // console.log('Lancement de l\'optimisation des nouvelles images...');
    optimizeNewImages();
});
