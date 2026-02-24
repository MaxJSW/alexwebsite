const express = require('express');
const router = express.Router(); 
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');


dotenv.config({ path: './.envdev' });

const db = require('../db');

const app = express();

const sessionStore = new MySQLStore({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE,
});



app.use(session({
    key: process.env.SESSION_COOKIE_NAME,
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

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

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.redirect('/connect');
    }
}


// constante pour stocker les fichiers dans le store
const upload = multer({ storage: storage });
const publicDirectory = path.join(__dirname, './public');
router.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// page d'accueil avec le nombre de vues



router.get('/connect', (req, res) => {
    res.render('connect',{ message: '' });
});

router.get('/register', (req, res) => {
    res.render('register', { message: '' });
});






module.exports = router;