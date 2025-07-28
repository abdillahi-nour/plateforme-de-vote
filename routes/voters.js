var express = require('express');
var router = express.Router();
var db = require('../database');

// Ajout d'un électeur
router.post('/add_voter', (req, res) => {
    const { accadd } = req.body;

    // Vérifier que l'adresse est valide (format Ethereum)
    if (!/^0x[a-fA-F0-9]{40}$/.test(accadd)) {
      return res.status(400).json({ success: false, message: 'Adresse Ethereum invalide.' });
    }

    // Requête SQL pour insérer un nouvel électeur dans la base de données
    const sql = 'INSERT INTO registered_users (Account_address) VALUES (?)';
    db.query(sql, [Account_address], (err, result) => {
      if (err) {
        console.error("Erreur MySQL :", err);
        return res.status(500).json({ success: false, message: 'Erreur MySQL' });
      }
      res.json({ success: true, message: 'Électeur ajouté avec succès.' });
    });
});

module.exports = router;
