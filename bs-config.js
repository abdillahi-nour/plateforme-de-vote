const express = require('express');
const path = require('path');
const session = require('express-session');
const ejs = require("ejs");
const fileUpload = require('express-fileupload');

const app = express();

// Middleware upload
app.use(fileUpload());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware parsing
app.use(express.urlencoded({ extended: true })); // pour les formulaires
app.use(express.json()); // pour le JSON
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));
app.use('/css', express.static(__dirname + '/public/css'));

// Session
app.use(session({
    secret: '123456cat',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 5 } // 5h
}));

// Injection du nom utilisateur dans les vues
app.use((req, res, next) => {
    res.locals.userName = req.session.userName || null;
    next();
});

// EJS configuration
app.set('views', path.join(__dirname, 'src', 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'src')));

// Upload de photo
app.post('/uploadPhoto', (req, res) => {
    if (!req.files || !req.files.photo) {
        return res.status(400).json({ error: 'Aucune photo envoyée.' });
    }

    const photo = req.files.photo;
    const uploadPath = path.join(__dirname, 'uploads', photo.name);

    photo.mv(uploadPath, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de l\'upload.' });
        }
        res.json({ url: `/uploads/${photo.name}` });
    });
});

// Importation des routes
const routes = [
    require('./routes/registration-route'),
    require('./routes/login-route'),
    require('./routes/dashboard-route'),
    require('./routes/logout-route'),
    require('./routes/main'),
    require('./routes/admin_login'),
    require('./routes/table_view'),
    require('./routes/voters')
];

// Activation des routes
routes.forEach(route => app.use('/', route));

// Pages HTML statiques
const staticPages = {
    '/vote_area': 'vote_area.html',
    '/candidateDetails': 'adminCandidateDetails.html',
    '/adminDetailVote': 'adminDetailVote.html',
    '/candidats': 'candidats.html',
    '/userInfo': 'userInfo.html',
    '/result': 'result.html',
    '/ajouterCandidat': 'adminAddCandidate.html',
    '/changePhase': 'adminChangePhase.html',
    '/voting': 'voting.html',
    '/createVote': 'createVote.html',
     '/adminCreateElection': 'adminCreateElection.html',
    '/adminVoteDetail': 'adminVoteDetail.html'
};

for (const [route, file] of Object.entries(staticPages)) {
    app.get(route, (req, res) => {
        res.sendFile(path.join(__dirname, 'src', file));
    });
}

// Route de test
app.get('/hello', (req, res) => {
    res.send('hello');
});

// Export pour BrowserSync
module.exports = {
    server: {
        baseDir: ["./src", "./build/contracts"],
        routes: {
            "/node_modules": "node_modules"
        },
        middleware: {
            1: app,
        }
    },
    port: 3000
};
