const dotenv = require('dotenv');
dotenv.config({
    path: './.env'
});
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const multer = require('multer');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const db = require('./routes/db');
const generateSitemap = require('./routes/front/siteMapRouter');

// Importer le module de compression
const compression = require('compression');


const app = express();

app.use(compression());

const cron = require('node-cron');
require('./public/admin/js/optimizeImage/cronJob');
app.use(cookieParser());

// mise en place des limite de téléchargement
app.use(bodyParser.urlencoded({
    extended: true,
    limit: '50mb'
}));
app.use(express.json({
    limit: '50mb'
}));

// Configuration de la session (en local)
// const sessionStore = new MySQLStore({
//     host: process.env.DATABASE_HOST,
//     user: process.env.DATABASE_USER,
//     password: process.env.DATABASE_PASSWORD,
//     database: process.env.DATABASE,
//     connectionLimit: 10,
//     waitForConnections: true,
//     queueLimit: 0,
//     acquireTimeout: 1000000
// }, (err) => {
//     if (err) {
//         console.error('Erreur de connexion à la base de données pour la session :', err);
//     } else {
//         console.log('Tu es connecté à la base de données mon potte !!');
//     }
// });


// // conf de la session (en local)
// app.use(session({
//     key: process.env.SESSION_COOKIE_NAME,
//     secret: process.env.SESSION_SECRET,
//     store: sessionStore,
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//         secure: false,
//     }
// }));


// conf de la session (https)
const sessionStore = new MySQLStore({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    acquireTimeout: 1000000
}, (err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données pour la session :', err);
    } else {
        console.log('Tu es connecté à la base de données mon potte !!');
    }
});

app.set('trust proxy', 1);

// conf de la session (https)
app.use(session({
    key: process.env.SESSION_COOKIE_NAME,
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,   
        httpOnly: true,   
        sameSite: 'lax', 
        maxAge: 1000 * 60 * 60 * 24 * 30 
    } 
}));

// Configuration test de Multer pour accepter des fichiers plus volumineux
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads');
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
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024
    }
});

const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'optimized')));
app.use('/img', express.static(path.join(__dirname, 'img')));


// Configuration du moteur de template
app.set('view engine', 'ejs');
app.set('views', [
    path.join(__dirname, 'views/pages/admin'),
    path.join(__dirname, 'views/pages/front')
]);

// Définition des routes admin
const pagesRouter = require('./routes/admin/pages');
const authRouter = require('./routes/admin/auth');
const logOutRouter = require('./routes/admin/logOutRouter');
const addBreedRouter = require('./routes/admin/addBreedRouter');
const myAnimalsRouter = require('./routes/admin/myAnimalsRouter');
const animalProfileRouter = require('./routes/admin/animalProfileRouter');
const addAnimalRouter = require('./routes/admin/addAnimalRouter');
const addCountryRouter = require('./routes/admin/addCountryRouter');
const addRegisterRouter = require('./routes/admin/addRegisterRouter');
const addPhotosRouter = require('./routes/admin/addPhotosRouter');
const imagesDescriptionRouter = require('./routes/admin/imagesDescriptionRouter');
const addMarriagesRouter = require('./routes/admin/addMarriagesRouter');
const addPuppysRouter = require('./routes/admin/addPuppysRouter');
const adminBlogsRouter = require('./routes/admin/adminBlogsRouter');
const breedInfosRouter = require('./routes/admin/BreedInfosRouter');
const kennelInformationsRouter = require('./routes/admin/kennelInformationsRouter');
const puppiesRouter = require('./routes/admin/puppiesRouter');
const breederInformationsRouter = require('./routes/admin/breederInformationsRouter');
const dashboardRouter = require('./routes/admin/dashboardRouter');
const messageRouter = require('./routes/admin/messageRouter');
const commentsRouter = require('./routes/admin/commentsRouter');


// Définition des routes front-end
const accueilRouter = require('./routes/front/accueilRouter');
const racesRouter = require('./routes/front/racesRouter');
const mariagesRouter = require('./routes/front/mariagesRouter');
const chiensRouter = require('./routes/front/chiensRouter');
const chiotsRouter = require('./routes/front/chiotsRouter');
const blogsRouter = require('./routes/front/blogsRouter');
const informationsRouter = require('./routes/front/informationsRouter');
const contactRouter = require('./routes/front/contactRouter');
const erreurRouter = require('./routes/front/erreurRouter');
const legalRouter = require('./routes/front/legalRouter');
const nosRetraitesRouter = require('./routes/front/nosRetraitesRouter');
const seoRouter = require('./routes/front/seoRouter');
const bookRouter = require('./routes/front/bookRouter');


// Préfixe /admin pour les routes d'administration
app.use('/admin', pagesRouter);
app.use('/admin/connect', pagesRouter);
app.use('/admin/register', pagesRouter);
app.use('/admin/dashboard', pagesRouter);
app.use('/admin/auth', authRouter);
app.use('/admin/addBreeds', addBreedRouter);
app.use('/admin/addPhotos', addPhotosRouter);
app.use('/admin/myAnimals', myAnimalsRouter);
app.use('/admin/animalProfile', animalProfileRouter);
app.use('/admin/addAnimal', addAnimalRouter);
app.use('/admin/addCountry', addCountryRouter);
app.use('/admin/addRegister', addRegisterRouter);
app.use('/admin/imagesDescription', imagesDescriptionRouter);
app.use('/admin/addMarriages', addMarriagesRouter);
app.use('/admin/addPuppys', addPuppysRouter);
app.use('/admin/adminBlogs', adminBlogsRouter);
app.use('/admin/breedInfos', breedInfosRouter);
app.use('/admin/kennelInformations', kennelInformationsRouter);
app.use('/admin/puppies', puppiesRouter);
app.use('/admin/breederInformations', breederInformationsRouter);
app.use('/admin/dashboard', dashboardRouter);
app.use('/admin/logout', logOutRouter);
app.use('/admin/message', messageRouter);
app.use('/admin/comments', commentsRouter);


// préfixe front-end
app.use('/', accueilRouter);
app.use('/races', racesRouter);
app.use('/mariages', mariagesRouter);
app.use('/chiens', chiensRouter);
app.use('/chiots', chiotsRouter);
app.use('/blog', blogsRouter);
app.use('/informations', informationsRouter);
app.use('/contact', contactRouter);
app.use('/erreur', erreurRouter);
app.use('/conditions-generales', legalRouter);
app.use('/nos-retraites', nosRetraitesRouter);
app.use('/', seoRouter);
app.use('/livre-d-or', bookRouter);


app.get('/admin/change-password', (req, res) => {
    res.render('change-password', { message: '' });
});

// Route catch-all pour les URL inconnues
app.get('*', (req, res) => {
    res.redirect('/');
});

// redirection d'images
// app.get('/img/races/:race/photos/:image', (req, res) => {
//     const imageName = req.params.image;
//     res.redirect(301, `/uploads/optimized/${imageName}`);
// });


// cron.schedule('* * * * *', () => {
// Planifier la génération du sitemap tous les jours à 1h du matin
cron.schedule('0 1 * * *', () => {
      console.log('Exécution de la tâche cron pour le sitemap...');
      generateSitemap();
    });

// Écouter sur un port
const port = process.env.PORT || 5042;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});


// Code cron pour vérifier les nouveaux messages toutes les 10 minutes
cron.schedule('*/10 * * * *', () => {
    const query = `
        SELECT * FROM messages
        WHERE status = 'Non lu' AND date_sent > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des nouveaux messages:', err);
        } else {
            if (results.length > 0) {
                console.log(`Vous avez ${results.length} nouveaux messages non lus.`);
            }
        }
    });
});