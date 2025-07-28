// routes/main.js

const express    = require('express');
const router     = express.Router();
const conn       = require('../database');
const nodemailer = require('nodemailer');
require('dotenv').config(); // <== charge les variables d'environnement

// ====== Fonctions Utilitaires ======
function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000); //  4 chiffres
}

// Configuration du transporteur d’email (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ====== Routes ======

// Formulaire d’inscription
router.get('/form', (req, res) => {
  if (req.session.loggedinUser) {
    res.render('voter-registration.ejs', { alertMsg: null });
  } else {
    res.redirect('/login');
  }
});

// Soumission du formulaire : envoi OTP

router.post('/registerdata', (req, res, next) => {
  const { aadharno, account_address, election_id } = req.body;
  req.session.account_address = account_address;
  req.session.election_id = election_id;
  req.session.cin = aadharno;
  req.session.otp = Math.floor(1000 + Math.random() * 9000);
  req.session.otpSent = false;

  const sql = `
    SELECT email, date_naissance, is_registered
    FROM citoyens
    WHERE numero_identite_nationale = ?
  `;

  conn.query(sql, [aadharno], (err, results) => {
    if (err) return next(err);
    if (!results.length) return res.send("CIN introuvable.");

    const { email, date_naissance, is_registered } = results[0];
    const age = Math.floor((Date.now() - new Date(date_naissance)) / (1000 * 60 * 60 * 24 * 365.25));

    if (age < 18) return res.send("Âge insuffisant.");
    if (is_registered === 'Oui') return res.send("Déjà inscrit.");
    if (!email) return res.send("Aucune adresse email.");

    if (req.session.otpSent) {
      return res.render('emailverify.ejs', { alertMsg: "Un code a déjà été envoyé." });
    }

    // Envoi de l'OTP
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Votre code de confirmation",
      text: `Votre code est : ${req.session.otp}`
    }, (error, info) => {
      if (error) return res.send("Échec de l’envoi de l’e-mail.");
      req.session.otpSent = true;
      res.render('emailverify.ejs', { alertMsg: null });
    });
  });
});


// Vérification du code OTP
router.post('/otpverify', async (req, res, next) => {
  const userOtp = parseInt(req.body.otp, 10);
  const sessionOtp = req.session.otp;
  const cin = req.session.cin;
  const walletAdr = req.session.account_address;
  const electionId = req.session.election_id;

  // 1. Vérification OTP
  if (userOtp !== sessionOtp) {
    return res.render('emailverify.ejs', {
      alertMsg: "Code OTP incorrect ou expiré."
    });
  }

  // 2. Initialiser Web3
  const Web3 = require('web3');
  const web3 = new Web3("http://127.0.0.1:7545"); // Ganache

  // 3. Charger ABI du smart contract Voting
  const contractJson = require('../abi/Voting.json'); // Assure-toi que ce chemin est correct
  const contractAddress = "0x1234567890abcdef1234567890abcdef12345678"; // remplace par l'adresse réelle

  const contract = new web3.eth.Contract(contractJson.abi, contractAddress);

  // 4. Compte administrateur Ganache
  let admin;
  try {
    const accounts = await web3.eth.getAccounts();
    admin = accounts[0];
  } catch (error) {
    console.error("Erreur Web3 : impossible de récupérer les comptes", error);
    return res.send("Erreur Web3.");
  }

  // 5. Appel du smart contract
  try {
    await contract.methods
      .inscrireElecteur(electionId, walletAdr)
      .send({ from: admin });

    // 6. Mise à jour MySQL : inscrire dans registered_users
    const insertUser = "INSERT INTO registered_users (Account_address, Is_registered) VALUES (?, ?)";
    const updateStatus = "UPDATE citoyens SET is_registered = ? WHERE numero_identite_nationale = ?";

    conn.query(insertUser, [walletAdr, "Oui"], (err1) => {
      if (err1) return next(err1);

      conn.query(updateStatus, ["Oui", cin], (err2) => {
        if (err2) return next(err2);

        // 7. Nettoyer la session
        req.session.otp = null;
        req.session.otpSent = false;

        // 8. Affichage succès
        res.render("voter-registration.ejs", {
          alertMsg: "✅ Inscription réussie. Votre compte est maintenant enregistré sur la blockchain."
        });
      });
    });

  } catch (err) {
    console.error("❌ Erreur d'inscription sur la blockchain :", err);
    return res.render('voter-registration.ejs', {
      alertMsg: "Une erreur est survenue lors de l'inscription sur la blockchain."
    });
  }
});



module.exports = router;
