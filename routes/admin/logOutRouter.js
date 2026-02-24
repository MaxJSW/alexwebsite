const express = require('express');
const session = require('express-session');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');
const dotenv = require('dotenv');
const db = require('../db');

dotenv.config();

const publicDirectory = path.join(__dirname, './public');
router.use('/uploads', express.static(path.join(__dirname, 'uploads')));


router.get('/', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log('Erreur lors de la déconnexion');
            return res.redirect('/admin/dashboard');
        }
        res.clearCookie('connect.sid');
        return res.redirect('/admin/connect');
    });
});

module.exports = router;