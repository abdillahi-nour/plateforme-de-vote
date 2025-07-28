var express = require('express');
var router = express.Router();
var db = require('../database');

/* GET admin login page */
router.get('/adlogin', function(req, res, next) {
  // Vérification de l'alerte dans la session
  const alertMsg = req.session.alertMsg || null;
  req.session.alertMsg = null; // Réinitialisation de l'alerte après l'affichage
  res.render('admin_login.ejs', { alertMsg });
});

/* POST : traitement du login admin */
router.post('/adlogin', function(req, res) {
    var emailAddress = req.body.email_address;
    var password = req.body.password;

    var sql = 'SELECT * FROM registration WHERE email_address =? AND password =?';
    db.query(sql, [emailAddress, password], function (err, data, fields) {
        if(err) throw err;
        
        if(data.length > 0){
            req.session.loggedinUser = true;
            req.session.emailAddress = emailAddress;
            // Stocker le nom de l'utilisateur dans la session
            req.session.userName = data[0].nom; 
            res.redirect('/candidateDetails');
        } else {
            // Enregistrer l'alerte dans la session pour redirection
            req.session.alertMsg = "E-mail ou  mot de passe est incorrect.";

            res.redirect('/adlogin'); // Redirection vers le formulaire avec l'alerte
        }
    });
});

module.exports = router;
