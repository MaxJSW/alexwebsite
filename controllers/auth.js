const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../routes/db');
const { name } = require('ejs');


// controller pour l'inscription
exports.register = async (req, res) => {
    console.log(req.body);
    const { name, surname, kennel_name, email, password, passwordConfirm } = req.body;

    db.query('SELECT email FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) {
            console.log('Erreur de connexion pour la requête 1');
            return res.render('register', { message: 'Erreur de connexion pour la requête 1' });
        }
        if (results.length > 0) {
            return res.render('register', { message: 'Cet email est déjà utilisé' });
        } else if (password !== passwordConfirm) {
            return res.render('register', { message: 'Les mots de passe ne correspondent pas' });
        }

        try {
            let hashedPassword = await bcrypt.hash(password, 8);
            console.log(hashedPassword);

            db.query('INSERT INTO users SET ?', { name: name, surname: surname, kennel_name: kennel_name, email: email, password: hashedPassword }, (error, results) => {
                if (error) {
                    console.log('Erreur lors de la requête à la base de données 2');
                    return res.render('register', { message: 'Erreur lors de la requête à la base de données 2' });
                } else {
                    console.log(results);
                    return res.render('register', { message: 'Utilisateur enregistré' });
                }
            });
        } catch (err) {
            return res.render('register', { message: 'Erreur de hachage de mot de passe' });
        }
    });
};

// controller pour la connexion + session de 30 jours ou session expire lorsque le navigateur est fermé
exports.connect = async (req, res) => {
    const { email, password, remember_me } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) {
            console.log('Erreur lors de la requête à la base de données');
            return res.render('connect', { message: 'Erreur lors de la requête à la base de données' });
        }
        if (results.length === 0) {
            return res.render('connect', { message: 'Email ou mot de passe incorrect' });
        }
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.render('connect', { message: 'Email ou mot de passe incorrect' });
        }
        req.session.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            surname: user.surname, 
            kennel_name: user.kennel_name
        };
        if (remember_me === 'remember-me') {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; 
        } else {
            req.session.cookie.expires = false;
        }
        return res.render('welcome', { 
            userName: user.surname 
        });
    });
};

// router pour le changement de mot de passe
exports.changePassword = async (req, res) => {
    try {
        const { email, currentPassword, newPassword, confirmNewPassword } = req.body;

        db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
            if (error) {
                console.log(error);
                return res.render('change-password', {
                    message: 'Une erreur est survenue',
                    isSuccess: false
                });
            }

            if (results.length === 0) {
                return res.render('change-password', {
                    message: 'Aucun compte trouvé avec cet email',
                    isSuccess: false
                });
            }
            const user = results[0];
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.render('change-password', {
                    message: 'Le mot de passe actuel est incorrect',
                    isSuccess: false
                });
            }
            if (newPassword !== confirmNewPassword) {
                return res.render('change-password', {
                    message: 'Les nouveaux mots de passe ne correspondent pas',
                    isSuccess: false
                });
            }
            const hashedNewPassword = await bcrypt.hash(newPassword, 8);
            db.query(
                'UPDATE users SET password = ? WHERE email = ?',
                [hashedNewPassword, email],
                (updateError, updateResults) => {
                    if (updateError) {
                        console.log(updateError);
                        return res.render('change-password', {
                            message: 'Erreur lors de la mise à jour du mot de passe',
                            isSuccess: false
                        });
                    }

                    return res.render('change-password', {
                        message: 'Mot de passe modifié avec succès',
                        isSuccess: true,
                        redirectUrl: '/admin/connect'
                    });
                }
            );
        });
    } catch (error) {
        console.log(error);
        return res.render('change-password', {
            message: 'Une erreur est survenue',
            isSuccess: false
        });
    }
};
