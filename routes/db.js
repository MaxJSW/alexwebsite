const mysql = require('mysql');
const db = mysql.createPool({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE,
    charset: 'utf8mb4'
});

// Vérifiez la connexion
db.getConnection((err, connection) => {
    if (err) {
        console.error('Erreur de connexion à la base de données :', err);
        return;
    }
    if (connection) connection.release();
    console.log('Connecté à la base de données MySQL via pool');
});

module.exports = db;