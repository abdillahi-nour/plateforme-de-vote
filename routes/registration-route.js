const express = require('express');
const db = require('../database');
const router = express.Router();

// Affichage du formulaire d'inscription
router.get('/register', (req, res, next) => {
  const alertMsg = req.session.alertMsg || null;
  req.session.alertMsg = null; // Réinitialisation automatique
  res.render('registration-form', { alertMsg });
});

// POST : traiter l'inscription
router.post('/register', (req, res, next) => {
  const {
    first_name,
    email_address,
    gender,
    phone,
    city,
    password,
    confirm_password
  } = req.body;

  if (password !== confirm_password) {
    req.session.alertMsg = "Le mot de passe et sa confirmation ne correspondent pas.";
    return res.redirect('/register'); // redirection avec session
  }

  const checkEmailSql = 'SELECT * FROM registration WHERE email_address = ?';
  db.query(checkEmailSql, [email_address], (err, rows) => {
    if (err) return next(err);

    if (rows.length > 0) {
      req.session.alertMsg = `L'adresse ${email_address} est déjà utilisée.`;
      return res.redirect('/register'); // redirection avec session
    }

    const insertSql = 'INSERT INTO registration SET ?';
    const newUser = {
      first_name,
      email_address,
      gender,
      phone,
      city,
      password // à hasher en production
    };

    db.query(insertSql, newUser, (err2) => {
      if (err2) return next(err2);

      // Inscription OK
      res.redirect('/login');
    });
  });
});

module.exports = router; // Export du router
