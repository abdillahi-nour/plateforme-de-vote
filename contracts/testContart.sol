// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TestContrat {
    /* ════════════════════════════════════════
       1. Structures et types
    ════════════════════════════════════════ */
    enum PHASE { inscription, vote, termine }
     PHASE public state; // État actuel de l'élection
     

    struct Candidat {
        uint   id;
        string nom;
        uint   age;
        string description;
        string photo;
        uint   voteCount;
        
    }

    struct Electeur {
        bool aVote;
        uint vote;         // idCandidat
        bool estInscrit;
    }

    struct Election {
        string titre;
        PHASE  state;
        uint   candidatsCount;
        uint   electeursCount;
        mapping(uint => Candidat)  candidats;
        mapping(address => Electeur) electeurs;
        address[] allElecteurs;
    }

    /* ════════════════════════════════════════
       2. Variables globales
    ════════════════════════════════════════ */
    address public admin;
    uint   public electionsCount;
    uint[] public electionIds;                 // itérable
    mapping(uint => Election) public elections;
    uint public candidatsCount; // Compteur des candidats
    address[] public allElecteurs;
    mapping(uint => Candidat) public candidats; // Mapping des candidats
    mapping(address => Electeur) public electeurs; // Mapping des électeurs
    uint public electeursCount; // Compteur des électeurs
    
    //event EtatChange(PHASE nouvelEtat);

    /* ════════════════════════════════════════
       3. Événements
    ════════════════════════════════════════ */
    event ElectionCree(uint indexed id, string titre);
    event EtatChange  (uint indexed id, PHASE nouvelEtat);
    event CandidatAjoute(uint indexed idElection, uint idCandidat, string nom);
    event ElecteurInscrit(uint indexed idElection, address utilisateur);
    event VoteEffectue  (uint indexed idElection, address electeur, uint idCandidat);
   

    /* ════════════════════════════════════════
       4. Modificateurs
    ════════════════════════════════════════ */
    modifier seulementAdmin() {
        require(msg.sender == admin, "Admin uniquement");
        _;
    }
    modifier electionExistante(uint id) {
        require(id > 0 && id <= electionsCount, "Election inexistante");
        _;
    }
    modifier etatValide(uint id, PHASE p) {
        require(elections[id].state == p, "Phase invalide");
        _;
    }

    /* ════════════════════════════════════════
       5. Constructeur
    ════════════════════════════════════════ */
    constructor() { 
        admin = msg.sender;
         state = PHASE.inscription;
     }
function getAllElections()
    external
    view
    returns (uint[] memory ids, string[] memory titres, uint[] memory nbCandidats)
{
    uint total = electionsCount;
    ids         = new uint[](total);
    titres      = new string[](total);
    nbCandidats = new uint[](total);

    for (uint i = 1; i <= total; i++) {
        Election storage e = elections[i];
        ids[i-1]         = i;
        titres[i-1]      = e.titre;
        nbCandidats[i-1] = e.candidatsCount;
    }
}
 /// @notice Retourne les infos "simples" d’une élection
    function getElection(uint _id)
        external
        view
        returns (
            string memory titre,
            uint   candidateCount,
            uint8  phase
        )
    {
        Election storage e = elections[_id];
        return (e.titre, e.candidatsCount, uint8(e.state));
    }

    /// @notice Nombre total d’élections
    function totalElections() external view returns (uint) {
        return electionsCount;
    }

function getCandidat(uint idElection, uint idCandidat)
    public
    view
    returns (
        uint id,
        string memory nom,
        uint age,
        string memory description,
        string memory photo,
        uint voteCount
    )
{
    require(idElection > 0 && idElection <= electionsCount, "election invalide");
    require(idCandidat > 0 && idCandidat <= elections[idElection].candidatsCount, "Candidat invalide");

    Candidat storage c = elections[idElection].candidats[idCandidat];

    return (
        c.id,
        c.nom,
        c.age,
        c.description,
        c.photo,
        c.voteCount
    );
}

function getAllCandidats(uint idElection)
    external
    view
    electionExistante(idElection)
    returns (
        string[] memory noms,
        uint[]   memory ages,
        string[] memory descriptions,
        string[] memory photos,
        uint[]   memory votes
    )
{
    Election storage e = elections[idElection];
    uint total = e.candidatsCount;

    // 1) Allocation des tableaux
    noms         = new string[](total);
    ages         = new uint[](total);
    descriptions = new string[](total);
    photos       = new string[](total);
    votes        = new uint[](total);

    // 2) Remplissage
    for (uint i = 1; i <= total; i++) {
        Candidat storage c = e.candidats[i+1];
        noms[i-1]         = c.nom;
        ages[i-1]         = c.age;
        descriptions[i-1] = c.description;
        photos[i-1]       = c.photo;
        votes[i-1]        = c.voteCount;
    }

    // 3) Retour des tableaux remplis
    return (noms, ages, descriptions, photos, votes);
}
// Dans votre contrat Voting
function getCandidatsCount(uint idElection) 
    external 
    view 
    electionExistante(idElection)
    returns (uint) 
{
    return elections[idElection].candidatsCount;
}
 function creerElection(string memory _titre)
    external
    seulementAdmin
    returns (uint idElection)
{
    require(bytes(_titre).length != 0, "Titre vide");

    idElection = ++electionsCount;

    Election storage e = elections[idElection];
    e.titre = _titre;
    e.state = PHASE.inscription;

    electionIds.push(idElection);

    emit ElectionCree(idElection, _titre);
}




    /* ════════════════════════════════════════
       8. Phases
    ════════════════════════════════════════ */
    function changerEtat(uint id, PHASE nouvelEtat)
        external seulementAdmin
        electionExistante(id)
    {
        Election storage e = elections[id];
        require(
            (e.state == PHASE.inscription && nouvelEtat == PHASE.vote) ||
            (e.state == PHASE.vote         && nouvelEtat == PHASE.termine),
            "Transition interdite"
        );
        e.state = nouvelEtat;
        emit EtatChange(id, nouvelEtat);
    }
    function getEtat(uint id)
        external view electionExistante(id) returns (PHASE)
    { return elections[id].state; }

    /* ════════════════════════════════════════
       9. Candidats
    ════════════════════════════════════════ */

    /* ════════════════════════════════════════
       10. Électeurs
    ════════════════════════════════════════ */
    function inscrireElecteur(uint idElection, address user)
        external seulementAdmin
        electionExistante(idElection)
        etatValide(idElection, PHASE.inscription)
    {
        Election storage e = elections[idElection];
        require(!e.electeurs[user].estInscrit, "Deja inscrit");

        e.electeurs[user].estInscrit = true;
        e.allElecteurs.push(user);
        ++e.electeursCount;

        emit ElecteurInscrit(idElection, user);
    }

    /* ════════════════════════════════════════
       11. Vote
    ════════════════════════════════════════ */
    function voter(uint idElection, uint idCandidat)
        external
        electionExistante(idElection)
        etatValide(idElection, PHASE.vote)
    {
        Election storage e = elections[idElection];
        Electeur storage el = e.electeurs[msg.sender];

        require(el.estInscrit, "Pas inscrit");
        require(!el.aVote,     "Deja voter");
        require(idCandidat > 0 && idCandidat <= e.candidatsCount, "Cand. invalide");

        ++e.candidats[idCandidat].voteCount;
        el.aVote = true; el.vote = idCandidat;

        emit VoteEffectue(idElection, msg.sender, idCandidat);
    }

    /* ════════════════════════════════════════
       12. Résultats
    ════════════════════════════════════════ */
    function consulterResultats(uint idElection)
        external view
        electionExistante(idElection)
        etatValide(idElection, PHASE.termine)
        returns (uint[] memory votes)
    {
        Election storage e = elections[idElection];
        votes = new uint[](e.candidatsCount);
        for (uint i = 1; i <= e.candidatsCount; ++i)
            votes[i-1] = e.candidats[i].voteCount;
    }

    /* ════════════════════════════════════════
       13. Helpers lecture (candidats & électeurs)
    ════════════════════════════════════════ */
    function getAllElecteurs(uint idElection)
        external view
        electionExistante(idElection)
        returns (address[] memory inscrits)
    {
        Election storage e = elections[idElection];
        uint n = e.allElecteurs.length;
        inscrits = new address[](e.electeursCount);
        uint j = 0;
        for (uint i = 0; i < n; ++i) {
            address adr = e.allElecteurs[i];
            if (e.electeurs[adr].estInscrit) inscrits[j++] = adr;
        }
    }

    function ajouterCandidat(
    uint    idElection,
    string  memory _nom,
    uint    _age,
    string  memory _description,
    string  memory _photo
)
    external
    seulementAdmin
    electionExistante(idElection)
    etatValide(idElection, PHASE.inscription)
{
    require(bytes(_nom).length > 0, "Nom vide");

    Election storage e = elections[idElection];
    uint idCand = ++e.candidatsCount;

    // ← Initialisation NOMMÉE pour éviter tout décalage
    e.candidats[idCand] = Candidat({
        id:          idCand,
        nom:         _nom,          // ici, bien affecté
        age:         _age,
        description: _description,  // ici aussi
        photo:       _photo,
        voteCount:   0
    });
    
    emit CandidatAjoute(idElection, idCand, _nom);
}

 
    /* ════════════════════════════════════════
       14. Métadonnées rapides
    ════════════════════════════════════════ */
    function getElectionTitre(uint idElection)
        external view electionExistante(idElection)
        returns (string memory)
    { return elections[idElection].titre; }
}


/*
pragma solidity ^0.8.0;
contract Voting {

    // Structures de données pour les candidats et les électeurs
    struct Candidat {
        uint id;
        string nom;
        uint voteCount;
        uint age;
        string description;
        string photo;
    }

    struct Electeur {
        bool aVote;
        uint vote;
        bool estInscrit;
    }

    address public admin; // Adresse de l'administrateur
    address[] public allElecteurs;
    mapping(uint => Candidat) public candidats; // Mapping des candidats
    mapping(address => Electeur) public electeurs; // Mapping des électeurs
    uint public candidatsCount; // Compteur des candidats
    uint public electeursCount; // Compteur des électeurs

    enum PHASE { inscription, vote, termine } // Enumération des phases
    PHASE public state; // État actuel de l'élection
    state = PHASE.inscription;
    //event EtatChange(PHASE nouvelEtat);

    // Modificateur pour vérifier que seul l'administrateur peut effectuer certaines actions
    modifier seulementAdmin() {
        require(msg.sender == admin, "Seul l'administrateur peut effectuer cette action");
        _;
    }

    // Modificateur pour vérifier que l'action est effectuée dans une phase valide
    modifier etatValide(PHASE phaseRequise) {
        require(state == phaseRequise, "L'etat actuel ne permet pas cette action");
        _;
    }

    // Événements
    event CandidatAjoute(uint id, string nom);
    event ElecteurInscrit(address utilisateur);
    event VoteEffectue(address electeur, uint candidatId);
    event EtatChange(PHASE nouvelEtat);

    // Constructeur qui initialise l'administrateur et l'état initial
    constructor() {
        admin = msg.sender;
        state = PHASE.inscription;
    }

    // Fonction pour changer l'état (phase) de l'élection
    function changerEtat(PHASE nouvelEtat) public seulementAdmin {
        // Vérification des transitions de phase autorisées
        require(validerTransitionPhase(nouvelEtat), "Transition de phase invalide");
        
        state = nouvelEtat;
        emit EtatChange(nouvelEtat);
    }

    // Fonction qui valide la transition de phase
    function validerTransitionPhase(PHASE nouvelEtat) internal view returns (bool) {
        if (state == PHASE.inscription) {
            return nouvelEtat == PHASE.vote; // La phase "inscription" ne peut que passer à "vote"
        } else if (state == PHASE.vote) {
            return nouvelEtat == PHASE.termine; // La phase "vote" ne peut que passer à "termine"
        } else if (state == PHASE.termine) {
            return false; // Une fois la phase "termine", il ne peut y avoir aucune autre transition
        }
        return false;
    }

    // Fonction pour obtenir l'état actuel de l'élection
    function getState() public view returns (PHASE) {
        return state;
    }

    // Fonction pour ajouter un candidat
    function ajouterCandidat(
        string memory _nom,
        uint _age,
        string memory _description,
        string memory _photo
    )
        public seulementAdmin etatValide(PHASE.inscription)
    {
        candidatsCount++;
        candidats[candidatsCount] = Candidat(candidatsCount, _nom, 0, _age, _description, _photo);
        emit CandidatAjoute(candidatsCount, _nom);
    }

    // Fonction pour inscrire un électeur
    function inscrireElecteur(address utilisateur)
    public seulementAdmin etatValide(PHASE.inscription)
    {
        require(!electeurs[utilisateur].estInscrit, "Electeur deja inscrit");
        electeurs[utilisateur].estInscrit = true;
        allElecteurs.push(utilisateur);
        electeursCount++;
        emit ElecteurInscrit(utilisateur);
    }

    // Fonction pour voter pour un candidat
    function voter(uint _candidatId)
        public etatValide(PHASE.vote)
    {
        require(electeurs[msg.sender].estInscrit, "ERR01: Electeur non inscrit");
        require(!electeurs[msg.sender].aVote, "ERR02: Deja vote");
        require(_candidatId > 0 && _candidatId <= candidatsCount, "ERR03: Candidat invalide");

        candidats[_candidatId].voteCount++;
        electeurs[msg.sender].aVote = true;
        electeurs[msg.sender].vote = _candidatId;

        emit VoteEffectue(msg.sender, _candidatId);
    }

    // Fonction pour consulter les résultats une fois l'élection terminée
    function consulterResultats()
        public view etatValide(PHASE.termine)
        returns (uint[] memory)
    {
        uint[] memory resultats = new uint[](candidatsCount);
        for (uint i = 1; i <= candidatsCount; i++) {
            resultats[i - 1] = candidats[i].voteCount;
        }
        return resultats;
    }

    // Fonction pour obtenir les détails d'un candidat
    function getCandidat(uint _id)
        public view
        returns (string memory nom, uint age, string memory description, string memory photo, uint voteCount)
    {
        require(_id > 0 && _id <= candidatsCount, "ID du candidat invalide");
        Candidat memory c = candidats[_id];
        return (c.nom, c.age, c.description, c.photo, c.voteCount);
    }

    // Fonction pour obtenir la liste de tous les candidats
    function getAllCandidats()
    public view
    returns (string[] memory noms, uint[] memory ages, string[] memory descriptions, string[] memory photos, uint[] memory votes)
    {
        noms = new string[](candidatsCount);
        ages = new uint[](candidatsCount);
        descriptions = new string[](candidatsCount);
        photos = new string[](candidatsCount);
        votes = new uint[](candidatsCount);

        for (uint i = 1; i <= candidatsCount; i++) {
            Candidat memory c = candidats[i];
            noms[i-1] = c.nom;
            ages[i-1] = c.age;
            descriptions[i-1] = c.description;
            photos[i-1] = c.photo;
            votes[i-1] = c.voteCount;
        }

        return (noms, ages, descriptions, photos, votes);
    }

    function getAllElecteurs() public view returns (address[] memory) {
    uint count = 0;

    // Première boucle pour compter
    for (uint i = 0; i < allElecteurs.length; i++) {
        if (electeurs[allElecteurs[i]].estInscrit) {
            count++;
        }
    }

    address[] memory inscrits = new address[](count);
    uint index = 0;

    // Deuxième boucle pour ajouter
    for (uint i = 0; i < allElecteurs.length; i++) {
        if (electeurs[allElecteurs[i]].estInscrit) {
            inscrits[index] = allElecteurs[i];
            index++;
        }
    }

    return inscrits;
}

}
*/