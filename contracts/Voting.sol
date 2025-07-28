// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    /* ════════════════════════════════════════
       1. Structures et types
    ════════════════════════════════════════ */
    enum PHASE { inscription, vote, termine }

    struct Candidat {
        uint   id;
        string nom;
        uint   age;
        string description;
        string photo;
        uint   voteCount;
    }

    struct Electeur {
        bool   estInscrit;
        bool   aVote;
        uint   vote;         // idCandidat
    }

    struct Election {
        string                   titre;
        PHASE                    state;
        uint                     candidatsCount;
        uint                     electeursCount;
        mapping(uint => Candidat)     candidats;
        mapping(address => Electeur) electeurs;
        address[]                allElecteurs;
    }

    /* ════════════════════════════════════════
       2. Variables globales
    ════════════════════════════════════════ */
    address public admin;
    uint    public electionsCount;
    uint[]  public electionIds;
    mapping(uint => Election) public elections;
    

    /* ════════════════════════════════════════
       3. Événements
    ════════════════════════════════════════ */
    event ElectionCree(uint indexed idElection, string titre);
    event EtatChange(uint indexed idElection, PHASE nouvelEtat);
    event CandidatAjoute(uint indexed idElection, uint indexed idCandidat, string nom);
    event ElecteurInscrit(uint indexed idElection, address electeur);
    event VoteEffectue(uint indexed idElection, address electeur, uint idCandidat);

    /* ════════════════════════════════════════
       4. Modificateurs
    ════════════════════════════════════════ */
    modifier seulementAdmin() {
        require(msg.sender == admin, "Admin uniquement");
        _;
    }

    modifier electionExistante(uint idElection) {
        require(idElection > 0 && idElection <= electionsCount, "Election inexistante");
        _;
    }

    modifier etatValide(uint idElection, PHASE phaseAttendue) {
        require(elections[idElection].state == phaseAttendue, "Phase invalide");
        _;
    }

    /* ════════════════════════════════════════
       5. Constructeur
    ════════════════════════════════════════ */
    constructor() {
        admin = msg.sender;
    }

    /* ════════════════════════════════════════
       6. Création d'élection
    ════════════════════════════════════════ */
    function creerElection(string memory _titre)
        external
        seulementAdmin
        returns (uint idElection)
    {
        require(bytes(_titre).length > 0, "Titre vide");
        idElection = ++electionsCount;
        Election storage e = elections[idElection];
        e.titre = _titre;
        e.state = PHASE.inscription;
        electionIds.push(idElection);

        emit ElectionCree(idElection, _titre);
    }

    /* ════════════════════════════════════════
       7. Lecture des élections
    ════════════════════════════════════════ */
    function getAllElections()
        external
        view
        returns (
            uint[] memory ids,
            string[] memory titres,
            uint[] memory nbCandidats
        )
    {
        uint total = electionsCount;
        ids = new uint[](total);
        titres = new string[](total);
        nbCandidats = new uint[](total);
        for (uint i = 1; i <= total; i++) {
            Election storage e = elections[i];
            ids[i-1] = i;
            titres[i-1] = e.titre;
            nbCandidats[i-1] = e.candidatsCount;
        }
    }

    function getElection(uint idElection)
        external
        view
        electionExistante(idElection)
        returns (
            string memory titre,
            uint   candidateCount,
            uint8  phase
        )
    {
        Election storage e = elections[idElection];
        return (e.titre, e.candidatsCount, uint8(e.state));
    }

    function totalElections() external view returns (uint) {
        return electionsCount;
    }

    function getElectionTitre(uint idElection)
        external
        view
        electionExistante(idElection)
        returns (string memory)
    {
        return elections[idElection].titre;
    }

    /* ════════════════════════════════════════
       8. Gestion des phases
    ════════════════════════════════════════ */
    function changerEtat(uint idElection, PHASE nouvelEtat)
        external
        seulementAdmin
        electionExistante(idElection)
    {
        Election storage e = elections[idElection];
        require(
            (e.state == PHASE.inscription && nouvelEtat == PHASE.vote) ||
            (e.state == PHASE.vote && nouvelEtat == PHASE.termine),
            "Transition interdite"
        );
        e.state = nouvelEtat;
        emit EtatChange(idElection, nouvelEtat);
    }

    function getEtat(uint idElection)
        external
        view
        electionExistante(idElection)
        returns (PHASE)
    {
        return elections[idElection].state;
    }

    /* ════════════════════════════════════════
       9. Candidats
    ════════════════════════════════════════ */
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
        e.candidats[idCand] = Candidat({
            id: idCand,
            nom: _nom,
            age: _age,
            description: _description,
            photo: _photo,
            voteCount: 0
        });
        emit CandidatAjoute(idElection, idCand, _nom);
    }

    function getCandidat(
        uint idElection,
        uint idCandidat
    )
        public
        view
        electionExistante(idElection)
        returns (
            uint id,
            string memory nom,
            uint age,
            string memory description,
            string memory photo,
            uint voteCount
        )
    {
        Election storage e = elections[idElection];
        require(idCandidat > 0 && idCandidat <= e.candidatsCount, "Candidat invalide");
        Candidat storage c = e.candidats[idCandidat];
        return (c.id, c.nom, c.age, c.description, c.photo, c.voteCount);
    }

    function getAllCandidats(
        uint idElection
    )
        public
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
        noms = new string[](total);
        ages = new uint[](total);
        descriptions = new string[](total);
        photos = new string[](total);
        votes = new uint[](total);
        for (uint i = 1; i <= total; i++) {
            Candidat storage c = e.candidats[i];
            uint idx = i - 1;
            noms[idx] = c.nom;
            ages[idx] = c.age;
            descriptions[idx] = c.description;
            photos[idx] = c.photo;
            votes[idx] = c.voteCount;
        }
        return (noms, ages, descriptions, photos, votes);
    }

    function getCandidatsCount(uint idElection)
        external
        view
        electionExistante(idElection)
        returns (uint)
    {
        return elections[idElection].candidatsCount;
    }

    /* ════════════════════════════════════════
       10. Électeurs
    ════════════════════════════════════════ */
    function inscrireElecteur(uint idElection, address user)
        external
        seulementAdmin
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

    function getAllElecteurs(uint idElection)
        external
        view
        electionExistante(idElection)
        returns (address[] memory inscrits)
    {
        Election storage e = elections[idElection];
        uint total = e.allElecteurs.length;
        inscrits = new address[](e.electeursCount);
        uint j;
        for (uint i = 0; i < total; i++) {
            address usr = e.allElecteurs[i];
            if (e.electeurs[usr].estInscrit) {
                inscrits[j++] = usr;
            }
        }
        return inscrits;
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

    require(el.estInscrit, "ERR01: Electeur non inscrit"); // ✅ ERREUR D’INSCRIPTION
    require(!el.aVote, "ERR02: Electeur a deja vote");     // ✅ ERREUR DOUBLE VOTE
    require(
        idCandidat > 0 && idCandidat <= e.candidatsCount,
        "ERR03: Candidat invalide"
    ); // ✅ ERREUR CANDIDAT

    e.candidats[idCandidat].voteCount++;
    el.aVote = true;
    el.vote = idCandidat;

    emit VoteEffectue(idElection, msg.sender, idCandidat);
}

function estInscrit(uint idElection, address electeur) public view returns (bool) {
    return elections[idElection].electeurs[electeur].estInscrit;
}
function aDejaVote(uint idElection, address electeur) public view returns (bool) {
    require(idElection > 0 && idElection <= electionsCount, "Election invalide.");
    return elections[idElection].electeurs[electeur].aVote;
}


    /* ════════════════════════════════════════
       12. Résultats
    ════════════════════════════════════════ */
    function consulterResultats(uint idElection)
        external
        view
        electionExistante(idElection)
        etatValide(idElection, PHASE.termine)
        returns (uint[] memory)
    {
        Election storage e = elections[idElection];
        uint total = e.candidatsCount;
        uint[] memory votes = new uint[](total);
        for (uint i = 1; i <= total; i++) {
            votes[i-1] = e.candidats[i].voteCount;
        }
        return votes;
    }
}


