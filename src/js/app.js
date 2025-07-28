
const App = {
  web3Provider       : null,
  contracts          : {},
  account            : "0x0",
  currentElectionId  : 0,          // élection active
  phaseEnum          : 0,          // phase de l’élection active

  /* ═════════════════════════════════════════════════════════════════
     1)  INITIALISATION
  ══════════════════════════════════════════════════════════════════ */
  init: async function () {
    await this.initWeb3();
    await this.initContract();
    await this.renderElections();  
    await App.afficherCandidats();
    await App.afficherElecteurs();

    //await App.renderCandidateCards();
    await this.renderElectionsEncours();   
   
    await App.populateElectionSelect();
    $("#electionSelect").on("change", () => App.afficherElecteurs());
    await App.populateElectionCandidat();
    $("#electionSelectParCandidat").on("change", () => App.afficherCandidats());
    await App.populateElectionSelect1();
   await App.populateElectionSelect3();
   await App.populateCandidatParElection();
   $("#electionSelectCand").on("change", () => App.renderCandidateCards());

   await App.renderCandidateCards();
   
  
   await App.electeurpourinscrire();
   // await App.getEtatElection();
   //await App.populateElectionsInscription();
   await App.populateElectionSelectEncours();
   //await App.SelectElectionPourInscrire();
 
  },
 
  initWeb3: async function () {
    if (window.ethereum) {
      this.web3Provider = window.ethereum;
      const [acc] = await ethereum.request({ method: "eth_requestAccounts" });
      this.account = acc;
    } else if (window.web3) {
      this.web3Provider = window.web3.currentProvider;
      this.account      = (await web3.eth.getAccounts())[0];
    } else {
      alert("Installez MetaMask pour utiliser l’application.");
      throw new Error("MetaMask manquant");
    }
    window.web3 = new Web3(this.web3Provider);
  },

  initContract: async function () {
    const artifact = await $.getJSON("Voting.json"); // ABI recompilé
    this.contracts.Voting = TruffleContract(artifact);
    this.contracts.Voting.setProvider(this.web3Provider);
     
  },
  render: async function () {
  
    await App.renderElections(); 
    await App.renderElectionsEncours(); 
    await App.renderCandidats(); 
    await App.selectElection(); 
    
    // rendu des élections
  },

  renderElections: async () => {
    $("#accountAddress").text("Compte Admin : " + App.account);
    const inst   = await App.contracts.Voting.deployed();
    const total  = (await inst.totalElections()).toNumber();
          
    const tbody  = $("#listeElections").empty();
  
    if (total === 0) {
      return tbody.append(`<tr><td colspan="5" class="text-center">Aucune élection trouvée.</td></tr>`);
    }
  
    const phaseStyles = {
      0: { 
        class: "bg-primary text-white", 
        text: "INSCRIPTION", 
        icon: "fa-user-pen" // 🖊️ Icône plus représentative pour une phase d’inscription
      },
      1: { 
        class: "bg-success text-white", 
        text: "VOTE EN COURS", 
        icon: "fa-check-double" // ✔️ Icône qui évoque l’action de voter
      },
      2: { 
        class: "bg-secondary text-white", 
        text: "TERMINÉ", 
        icon: "fa-flag-checkered" // 🏁 Fin de l’élection
      }
    };
    
  
    for (let id = 1; id <= total; id++) {
      const [titre, nbCand, phaseStr] = (await inst.getElection(id)).map(x => x.toString());
      const phase = parseInt(phaseStr);
      const style = phaseStyles[phase];
  
      tbody.append(`
        <tr>
          <td>E-${String(id).padStart(3, "0")}</td>
          <td class="text-uppercase">${titre}</td>
          <td>${nbCand}</td>
          <td>
            <span class="badge ${style.class}">
              <i class="fas ${style.icon} me-1"></i> ${style.text}
            </span>
          </td>
        </tr>
      `);
    }
  },
  renderElectionsEncours: async () => {
    $("#accountAddress").text("Compte Admin : " + App.account);
    const inst = await App.contracts.Voting.deployed();
    const total = (await inst.totalElections()).toNumber();
    const tbody = $("#listeElectionsEncours").empty();
  
    if (total === 0) {
      return tbody.append(`
        <tr>
          <td colspan="5" class="text-center text-muted">Aucune élection disponible.</td>
        </tr>
      `);
    }
  
    const phaseStyles = {
      0: { 
        class: "bg-primary text-white", 
        text: "INSCRIPTION", 
        icon: "fa-user-pen" // 🖊️ Icône plus représentative pour une phase d’inscription
      },
      1: { 
        class: "bg-success text-white", 
        text: "VOTE EN COURS", 
        icon: "fa-check-double" // ✔️ Icône qui évoque l’action de voter
      },
      2: { 
        class: "bg-secondary text-white", 
        text: "TERMINÉ", 
        icon: "fa-flag-checkered" // 🏁 Fin de l’élection
      }
    };
    
  
    let affichées = 0;
  
    for (let id = 1; id <= total; id++) {
      const [titre, nbCand, phaseStr] = (await inst.getElection(id)).map(x => x.toString());
      const phase = parseInt(phaseStr);
  
      // Afficher uniquement les élections non terminées (0 ou 1)
      if (phase === 0 || phase === 1) {
        affichées++;
  
        const style = phaseStyles[phase];
  
        tbody.append(`
          <tr>
            <td>E-${String(id).padStart(3, "0")}</td>
            <td class="text-uppercase">${titre}</td>
            <td>${nbCand}</td>
            <td>
              <span class="badge ${style.class}">
                <i class="fas ${style.icon} me-1"></i> ${style.text}
              </span>
            </td>
            <td>
             
            <button class="btn btn-sm btn-warning fw-bold shadow-sm" onclick="App.changerEtatElection(${id})">
              <i class="fas fa-forward me-1"></i> Suivant
            </button>
          </td>

          </tr>
        `);
      }
    }
  
    if (affichées === 0) {
      tbody.append(`
        <tr>
          <td colspan="5" class="text-center text-muted">Aucune élection en cours.</td>
        </tr>
      `);
    }
  },

  renderCandidats: async (idElection = 1) => {
    $("#accountAddress").text("Compte Admin : " + App.account);
    const inst = await App.contracts.Voting.deployed();
    const [noms, ages] = await inst.getAllCandidats.call(idElection);
    const $tbody = $("#listeCandidats").empty();
    const raw = await inst.getAllCandidats.call(idElection);
    console.log("🔍 getAllCandidats raw:", raw);
    // Inspecte raw[0] et raw.noms :
    console.log("▶ raw noms  :", raw[0]);
    console.log("▶ raw ages  :", raw[1]);
    
    if (noms.length === 0) {
      return $tbody.append(`
        <tr><td colspan="2">Aucun candidat</td></tr>
      `);
    }
  
    noms.forEach((nom, i) => {
      $tbody.append(`
        <tr>
          <td>${nom}</td>
          <td>${ages[i]}</td>
        </tr>
      `);
    });
  }

,

  selectElection: async function (id) {
    this.currentElectionId = id;
    $("#currentElection")
      .removeClass("d-none")
      .text(`Élection sélectionnée : ${id}`);
    await this.renderCandidats();
  },
  checkInscriptionEtVote: async function (idElection) {
    try {
      const instance = await App.contracts.Voting.deployed();
  
      const inscrit = await instance.estInscrit(idElection, App.account);
      if (!inscrit) {
        return { ok: false, reason: "notRegistered" };
      }
  
      const dejaVote = await instance.aDejaVote(idElection, App.account);
      if (dejaVote) {
        return { ok: false, reason: "alreadyVoted" };
      }
  
      return { ok: true }; // prêt à voter
  
    } catch (err) {
      console.error("Erreur de vérification avant vote :", err);
      return { ok: false, reason: "unknownError" };
    }
  }
,  
  /* ════════════════════════════════════════════════════════════════
     4)  ACTIONS  (ajout, vote, inscription, etc.)
  ═════════════════════════════════════════════════════════════════ */
  ajouterCandidat: async function () {
    const idElection = $("#electionSelect").val();
  
   
  
    // ✅ Récupération des champs du formulaire
    const nom  = $("#nom").val().trim();
    const age  = $("#age").val();
    const desc = $("#description").val().trim();
    const file = $("#photo")[0].files[0];
  
    // ✅ Vérification de la photo
    if (!file) {
      showMessage("warning", "Photo requise", "Veuillez sélectionner une photo.");
      return;
    }
  
    try {
      // 📤 Téléchargement du fichier
      const url = await this.uploadToServer(file);
      const inst = await this.contracts.Voting.deployed();
  
      // 📥 Appel du contrat
      await inst.ajouterCandidat(idElection, nom, age, desc, url, { from: this.account });
  
      // ✅ Succès
      showMessage(
        "success",
        `Le candidat <strong>${nom}</strong>`,
        "a été ajouté avec succès à l’élection sélectionnée."
      );
  
      // 🔄 Réinitialisation du formulaire
      $("#ajouterCandidatForm")[0].reset();
  
    } catch (e) {
       // Gestion de l’annulation via MetaMask
       if (e.code === 4001) {
        showMessage(
          "info",
          "Vous avez refusé de signer la transaction via ",
          "MetaMask."
        );
        return;
      }
      console.error(e);
      let message = "Une erreur est survenue.";
  
      // 🔍 Tentative d'extraction du message d'erreur Solidity
      try {
        const parsed = JSON.parse(e.message.slice(e.message.indexOf("{")));
        message = parsed.message || message;
  
        // Erreur utilisateur : refus MetaMask
        if (parsed.code === 4001) {
          showMessage("info", "Action annulée", "Vous avez refusé de signer la transaction via MetaMask.");
          return;
        }
  
      } catch (_) {
        // Fallback message générique
        message = "Impossible d’ajouter ce candidat : vérifiez que l’élection est encore ouverte à l’inscription.";
      }
  
      // ❌ Affichage de l’erreur
      showMessage("error", "Échec de l’ajout", message);
    }
  },
  voter: async function (idElection, candidatId) {
    try {
      const instance = await App.contracts.Voting.deployed();
  
      // 1️⃣ Vérification de la phase
      const phase = (await instance.getEtat(idElection)).toString();
      const phases = ["Inscription", "Vote", "Terminé"];
  
      if (phase !== "1") {
        let message = "";
        if (phase === "0") {
          message = "La période de vote n’a pas encore commencé (phase d’inscription).";
        } else if (phase === "2") {
          message = "La période de vote est terminée. Vous ne pouvez plus voter.";
        } else {
          message = "Phase inconnue. Impossible de voter.";
        }
        showMessage("info", `État : ${phases[phase] || "Inconnu"}`, message);
        return;
      }
  
      // 2️⃣ Vérifier inscription
      let inscrit = false;
      try {
        inscrit = await instance.estInscrit(idElection, App.account);
      } catch (err) {
        console.error("Erreur lors de la vérification d'inscription :", err);
        showMessage("error", "Erreur", "Impossible de vérifier si vous êtes inscrit.");
        return;
      }
  
      if (!inscrit) {
        showMessage("warning", "Non inscrit", "Vous n'êtes pas inscrit pour cette élection.");
        return;
      }
  
      // 3️⃣ Vérifier double vote
      let dejaVote = false;
      try {
        dejaVote = await instance.aDejaVote(idElection, App.account);
      } catch (err) {
        console.error("Erreur lors de la vérification du vote :", err);
        showMessage("error", "Erreur", "Impossible de vérifier si vous avez déjà voté.");
        return;
      }
  
      if (dejaVote) {
        showMessage("info", "Déjà voté", "Vous avez déjà voté pour cette élection.");
        return;
      }
  
      // 4️⃣ Appel au contrat : vote
      await instance.voter(idElection, candidatId, { from: App.account });
  
      showMessage("success", "Succès", "Vote effectué avec succès !");
      App.renderCandidateCards(idElection);
  
    } catch (e) {
      console.error("Erreur lors du vote :", e);
  
      if (e.code === 4001) {
        showMessage("info", "Action annulée", "Vous avez refusé de signer la transaction via MetaMask.");
        return;
      }
  
      // Gestion basique d'erreur
      showMessage("error", "Échec du vote", "Une erreur est survenue lors de la soumission du vote.");
    }
  }
  
,  
  afficherCandidats: async function () {
    // 1️⃣ Récupération de l'élection sélectionnée
    const idElectionStr = $("#electionSelectParCandidat").val();
    const idElection    = Number(idElectionStr);
  
  
  
    try {
      // 2️⃣ Instance du contrat
      const inst = await this.contracts.Voting.deployed();
  
      // 3️⃣ Récupérer le nombre de candidats pour cette élection
      const countBN = await inst.getCandidatsCount(idElection, { from: this.account });
      const count   = countBN.toNumber();
  
      // 4️⃣ Vider le <tbody>
      const $tbody = $("#candidatsTbody");
      $tbody.empty();
  
      // 5️⃣ Si aucun candidat, afficher une ligne dans le tableau
      if (count === 0) {
        $tbody.append(`
          <tr>
            <td colspan="6" class="text-center text-muted">
              Aucun candidat inscrit pour cette élection.
            </td>
          </tr>
        `);
        return;
      }
  
      // 6️⃣ Pour chaque candidat, appeler getCandidat et déstructurer
      for (let i = 1; i <= count; i++) {
        const raw = await inst.getCandidat(idElection, i, { from: this.account });
        const [id, nom, age, description, photo, voteCount] = raw.map(x => x.toString());
  
        // 7️⃣ Construire la ligne HTML
        const rowHtml = `
          <tr>
            <td>${id}</td>
            <td>${nom}</td>
            <td>${age}</td>
            <td>${description}</td>
            <td>
              <img
                src="${photo}"
                alt="Photo de ${nom}"
                style="width:50px; object-fit:cover;"
              />
            </td>
            <td>${voteCount}</td>
          </tr>
        `;
        $tbody.append(rowHtml);
      }
  
    } catch (e) {
      console.error(e);
      let message = "Impossible de récupérer les candidats.";
      try {
        const parsed = JSON.parse(e.message.slice(e.message.indexOf("{")));
        message = parsed.message || message;
      } catch (_) { /* silent */ }
      //showMessage("error", "Erreur", message);
    }
  },
  
  afficherElecteurs: async function () {
    const idStr = $("#electionSelect").val();
    const id    = Number(idStr);
  
  
    try {
      const inst    = await this.contracts.Voting.deployed();
  
      // Récupère la phase et le nombre de candidats
      const phaseBN = await inst.getEtat(id, { from: this.account });
      const phase   = phaseBN.toNumber();
      const countBN = await inst.getCandidatsCount(id, { from: this.account });
      const count   = countBN.toNumber();
  
      // Traduit la phase en texte
      const phaseLabels = ["Inscription", "Vote", "Terminé"];
      const phaseText   = phaseLabels[phase];
  
      // Remplit le bloc résumé UNE SEULE FOIS
      $("#voteState").text(phaseText);
      $("#candidateCount").text(count);
  
      // Récupère la liste des électeurs
      const raw       = await inst.getAllElecteurs(id, { from: this.account });
      const electeurs = raw.map(addr => addr.toString());
  
      // Vide le tableau
      const $tb = $("#electeursTbody");
      $tb.empty();
  
      // Si aucun électeur, affiche une ligne informative
      if (electeurs.length === 0) {
        $tb.append(`
          <tr>
            <td colspan="3" class="text-center text-muted">
              Aucun électeur inscrit pour cette élection.
            </td>
          </tr>
        `);
        return;
      }
  
      // Boucle sur les électeurs
      electeurs.forEach((address, idx) => {
        const rowHtml = `
          <tr>
            <td>DJI00${idx + 1}</td>
            <td>${address}</td>
            <td><span class="badge bg-success">Inscrit</span></td>
          </tr>
        `;
        $tb.append(rowHtml);
      });
  
    } catch (e) {
      console.error(e);
      let msg = "Impossible de récupérer les électeurs.";
      try {
        const p = JSON.parse(e.message.slice(e.message.indexOf("{")));
        msg = p.message || msg;
      } catch (_) {}
      //showMessage("error", "Erreur", msg);
    }
  },
  renderCandidateCardsTest:async function (idElection=2) {
    const inst = await App.contracts.Voting.deployed();
    // Récupère noms, ages, descriptions, photos, votes
    const [noms, , , photos] = await inst.getAllCandidats(idElection, { from: App.account });
    const container = $("#candidatesContainer");
    container.empty();
  
    for (let i = 0; i < noms.length; i++) {
      const name  = noms[i].toString();
      const photo = photos[i].toString();
      const card = $(`
        <div class="col-sm-6 col-md-4 col-lg-3">
          <div class="candidate-card">
            <div class="card-header"></div>
            <img src="${photo}" alt="${name}" class="avatar">
            <div class="card-body">
              <h5>${name}</h5>
              <button class="btn btn-vote px-4" data-id="${i+1}">
                <i class="fas fa-vote-yea me-1"></i> Voter
              </button>
            </div>
          </div>
        </div>
      `);
      container.append(card);
    }
  
    // evenement click vote
    container.find(".btn-vote").click(async function() {
      const idCand = $(this).data("id");
      try {
        await inst.voter(idElection, idCand, { from: App.account });
        alert(`Vous avez voté pour ${noms[idCand-1]}`);
      } catch (err) {
        console.error(err);
        alert("Erreur lors du vote");
      }
    });
  },
  renderCandidateCards2: async function() {
 
     // 1️⃣ Récupération de l'élection sélectionnée
     const idElectionStr = $("#electionSelectCand").val();
     const idElection    = Number(idElectionStr);
    const inst  = await this.contracts.Voting.deployed();
    const count = (await inst.getCandidatsCount(idElection, { from: this.account })).toNumber();
  
    // 0) On vide tous les containers
    $("#test, #candidatsResultsAdmin, #electionSelectCand, #electeurTable, #candidatesContainer").empty();
  
    let selected = null;
  
    try {
      // ── 1) ADMIN : cartes, modals, select & tableau ──
      for (let i = 1; i <= count; i++) {
        const raw = await inst.getCandidat(idElection, i, { from: this.account });
        // [ id, nom, age, desc, photo, voteCount ]
        const [id, name, age, desc, photo, voteCount] = raw.map(x => x.toString());
  
        // a) Carte admin
        const userCard = `
        <div class="candidate-card" style="width: 16rem; border-radius: 12px; overflow: hidden; 
             box-shadow: 0 5px 15px rgba(0,0,0,0.08); margin: 1rem; transition: transform 0.3s;">
          
          <!-- En-tête coloré avec photo intégrée -->
          <div style="height: 100px; background: linear-gradient(135deg, #6c9eff, #9b5de5); 
               position: relative; display: flex; justify-content: center;">
            <div style="position: absolute; bottom: -40px; width: 80px; height: 80px; 
                 border-radius: 50%; border: 3px solid white; background: white;
                 background-image: url('${photo}'); background-size: cover; 
                 background-position: center; box-shadow: 0 3px 10px rgba(0,0,0,0.15);">
            </div>
          </div>
          
          <!-- Corps de carte -->
          <div class="card-body" style="padding: 2.5rem 1rem 1.5rem; text-align: center;">
            <h4 style="margin: 0 0 1rem; color: #333; font-weight: 600; font-size: 1.1rem;">
              ${name}
            </h4>
            <button class="vote-btn" data-toggle="modal" data-target="#modal${id}"
                    style="background: linear-gradient(135deg, #6c9eff, #9b5de5); color: white; 
                           border: none; padding: 0.5rem 1.5rem; border-radius: 20px;
                           cursor: pointer; transition: all 0.3s; font-weight: 500;
                           box-shadow: 0 2px 5px rgba(155, 93, 229, 0.3);">
              <i class="fas fa-vote-yea" style="margin-right: 8px;"></i>Voter
            </button>
          </div>
        </div>
      
        <!-- Modal -->
        <div class="modal fade" id="modal${id}" tabindex="-1" role="dialog" aria-labelledby="modalLabel${id}" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content" style="border-radius: 10px;">
              <div class="modal-header" style="background: linear-gradient(135deg, #6c9eff, #9b5de5); color: white;">
                <h5 class="modal-title" id="modalLabel${id}">${name}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close" style="color: white;">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
            <div class="modal-body text-center">
            <img src="${photo}" alt="Photo de ${name}" class="rounded-circle mb-3" 
                style="width: 100px; height: 100px; object-fit: cover; border: 3px solid #6c9eff;">
            <p>
              <strong>${name}</strong>, âgé de <strong>${age} ans</strong>, est un <strong>candidat</strong>.<br>
              <span>${desc}</span>
            </p>
          </div>


              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Fermer</button>
                <button type="button" class="btn btn-primary" onclick="App.vote(${id})">Confirmer le vote</button>
              </div>
            </div>
          </div>
        </div>
      
        <style>
          .candidate-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.12);
          }
      
          .vote-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 12px rgba(155, 93, 229, 0.4);
          }
        </style>
      `;
        $("#test").append(userCard);
  
        // b) Select dropdown
        $("#candidatSelect").append(`<option value="${id}">${name}</option>`);
  
        // c) Tableau admin
        $("#candidatsResultsAdmin").append(`
          <tr>
            <th>mat_10${id}</th>
            <td>${name}</td>
            <td>${age}</td>
            <td>${desc}</td>
            <td><img src="${photo}" style="width:50px;object-fit:cover;"></td>
            <td>${voteCount}</td>
          </tr>
        `);
      }
  
      // Phase
      const etat = await inst.getEtat(idElection, { from: this.account });
      this.phaseEnum = etat.toNumber();
      const phaseText = ["Inscription","Vote en cours","Terminé"][this.phaseEnum] || "Inconnu";
      $("#phase").text("Phase actuelle : " + phaseText);
      if (this.phaseEnum === 2) App.showResults();
      else $("#resultSection").hide();
  
    } catch(err) {
      console.error("Erreur dans renderCandidateCards():", err);
    }
  
    // ── 2) ÉLECTEUR : vue minimaliste ──
    for (let i = 1; i <= count; i++) {
      const raw = await inst.getCandidat(idElection, i, { from: this.account });
      const [id, nom, age, description, photo] = raw.map(x => x.toString());
  
      const $col = $(`
        <div class="col-sm-6 col-md-4 col-lg-3">
          <div class="candidate-card">
            <div class="candidate-header" style="height:100px;background:linear-gradient(135deg,#6c9eff,#9b5de5)"></div>
            <img src="${photo}" alt="${nom}" class="avatar-img">
            <div class="candidate-body">
              <h5>${nom}</h5>
              <button class="btn-vote" data-id="${id}">
                <i class="fas fa-vote-yea me-1"></i>Voter
              </button>
            </div>
          </div>
        </div>
      `);
  
      $col.click(() => {
        selected = { idElection, id, nom, age, description, photo };
        $("#candidateModalLabel").text(nom);
        $("#modalCandidateImg").attr("src", photo);
        $("#modalCandidateName").text(nom);
        $("#modalCandidateDescription").text(description);
        $("#modalCandidateAge").text(age + " ans");
        $("#modalCandidateVotes").text(""); // à remplir si besoin
        new bootstrap.Modal(document.getElementById("candidateModal")).show();
      });
  
      $("#candidatesContainer").append($col);
    }
  
    // ── 3) Confirmation du vote ──
    $("#confirmVoteBtn").off("click").on("click", async () => {
      if (!selected) return;
      try {
        await inst.voter(selected.idElection, selected.id, { from: this.account });
        bootstrap.Modal.getInstance(document.getElementById("candidateModal")).hide();
        showMessage("success","Vote enregistré",`Vous avez voté pour ${selected.nom}.`);
        this.renderCandidateCards(selected.idElection);
      } catch(e) {
        console.error(e);
        showMessage("error","Erreur","Impossible d’enregistrer le vote.");
      }
    });
  },
  verifierEtVoter: async function (idElection, idCandidat) {
    try {
      const instance = await App.contracts.Voting.deployed();
  
      // 1️⃣ Vérifier la phase de l'élection
      const phase = (await instance.getEtat(idElection)).toString();
      const phases = ["Inscription", "Vote", "Terminé"];
  
      if (phase !== "1") { // 1 = VOTE
        let message = "";
  
        if (phase === "0") {
          message = "La période de vote n’a pas encore commencé. Actuellement : phase d’inscription.";
        } else if (phase === "2") {
          message = "La période de vote est terminée. Vous ne pouvez plus voter.";
        } else {
          message = "Phase inconnue. Impossible de voter.";
        }
  
        showMessage("info", `État : ${phases[phase] || "Inconnu"}`, message);
        return;
      }
  
      // 2️⃣ Vérifier l’inscription et le vote
      const inscrit = await instance.estInscrit(idElection, App.account);
      if (!inscrit) {
        showMessage("warning", "Non inscrit", "Vous n'êtes pas inscrit pour cette élection.");
        return;
      }
  
      const dejaVote = await instance.aDejaVote(idElection, App.account);
      if (dejaVote) {
        showMessage("info", "Déjà voté", "Vous avez déjà voté pour cette élection.");
        return;
      }
  
      // 3️⃣ Si tout est OK → voter
      await App.voter(idElection, idCandidat);
  
    } catch (e) {
      console.error("Erreur lors de la vérification préalable :", e);
      showMessage("error", "Erreur", "Une erreur s’est produite lors de la vérification.");
    }
  }
  
,  
  renderCandidateCards: async function () {
    const idElectionStr = $("#electionSelectCand").val();
    const idElection = Number(idElectionStr);
    const inst = await this.contracts.Voting.deployed();
    const count = (await inst.getCandidatsCount(idElection, { from: this.account })).toNumber();
    if (count === 0) {
      $("#test").html(`
        <div id="not" class="alert alert-warning w-100 text-center">
          <i class="fas fa-exclamation-circle me-2"></i>
          <strong>Aucun candidat n’a été ajouté pour cette élection.</strong>
          <p class="mb-0">Veuillez réessayer plus tard ou choisir une autre élection.</p>
        </div>
      `);
      // Arrêter ici le rendu si aucun candidat
      return;
    }
    
  
    // Vider les conteneurs
    $("#test, #candidatsResultsAdmin, #candidatSelect, #candidatesContainer").empty();
  
    let selected = null;
  
    try {
      // ── 1) ADMIN : cartes, modals, select & tableau ──
      for (let i = 1; i <= count; i++) {
        const raw = await inst.getCandidat(idElection, i, { from: this.account });
        // [ id, nom, age, desc, photo, voteCount ]
        const [id, name, age, desc, photo, voteCount] = raw.map(x => x.toString());
  
        // a) Carte admin
        const userCard = `
        <div class="candidate-card" style="width: 16rem; border-radius: 12px; overflow: hidden; 
             box-shadow: 0 5px 15px rgba(0,0,0,0.08); margin: 1rem; transition: transform 0.3s;">
          
          <!-- En-tête coloré avec photo intégrée -->
          <div style="height: 100px; background: linear-gradient(135deg, #6c9eff, #9b5de5); 
               position: relative; display: flex; justify-content: center;">
            <div style="position: absolute; bottom: -40px; width: 80px; height: 80px; 
                 border-radius: 50%; border: 3px solid white; background: white;
                 background-image: url('${photo}'); background-size: cover; 
                 background-position: center; box-shadow: 0 3px 10px rgba(0,0,0,0.15);">
            </div>
          </div>
          
          <!-- Corps de carte -->
          <div class="card-body" style="padding: 2.5rem 1rem 1.5rem; text-align: center;">
            <h4 style="margin: 0 0 1rem; color: #333; font-weight: 600; font-size: 1.1rem;">
              ${name}
            </h4>
            <button class="vote-btn" data-toggle="modal" data-target="#modal${id}"
                    style="background: linear-gradient(135deg, #6c9eff, #9b5de5); color: white; 
                           border: none; padding: 0.5rem 1.5rem; border-radius: 20px;
                           cursor: pointer; transition: all 0.3s; font-weight: 500;
                           box-shadow: 0 2px 5px rgba(155, 93, 229, 0.3);">
              <i class="fas fa-vote-yea" style="margin-right: 8px;"></i>Voter
            </button>
          </div>
        </div>
      
        <!-- Modal -->
        <div class="modal fade" id="modal${id}" tabindex="-1" role="dialog" aria-labelledby="modalLabel${id}" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content" style="border-radius: 10px;">
              <div class="modal-header" style="background: linear-gradient(135deg, #6c9eff, #9b5de5); color: white;">
                <h5 class="modal-title" id="modalLabel${id}">${name}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close" style="color: white;">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
            <div class="modal-body text-center">
            <img src="${photo}" alt="Photo de ${name}" class="rounded-circle mb-3" 
                style="width: 100px; height: 100px; object-fit: cover; border: 3px solid #6c9eff;">
            <p>
              <strong>${name}</strong>, âgé de <strong>${age} ans</strong>.<br>
              <span>${desc}</span>
            </p>
          </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Fermer</button>

              <button type="button" class="btn btn-primary" onclick="App.voter(${idElection}, ${id})">
                Confirmer le vote
              </button>
            </div>

            </div>
          </div>
        </div>
      
        <style>
          .candidate-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.12);
          }
      
          .vote-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 12px rgba(155, 93, 229, 0.4);
          }
        </style>
      `;
        $("#test").append(userCard);
  
        // b) Select dropdown
        $("#candidatSelect").append(`<option value="${id}">${name}</option>`);
  
        // c) Tableau admin
        $("#candidatsResultsAdmin").append(`
          <tr>
            <th>mat_10${id}</th>
            <td>${name}</td>
            <td>${age}</td>
            <td>${desc}</td>
            <td><img src="${photo}" style="width:50px;object-fit:cover;"></td>
            <td>${voteCount}</td>
          </tr>
        `);
      }
  
      // Phase
      const etat = await inst.getEtat(idElection, { from: this.account });
      this.phaseEnum = etat.toNumber();
      const phaseText = ["Inscription","Vote en cours","Terminé"][this.phaseEnum] || "Inconnu";
      $("#phase").text("Phase actuelle : " + phaseText);
      if (this.phaseEnum === 2) App.showResults();
      else $("#resultSection").hide();
  
    } catch(err) {
      console.error("Erreur dans renderCandidateCards():", err);
    }
  
    // ── 2) ÉLECTEUR : vue minimaliste ──
    for (let i = 1; i <= count; i++) {
      const raw = await inst.getCandidat(idElection, i, { from: this.account });
      const [id, nom, age, description, photo] = raw.map(x => x.toString());
  
      const $col = $(`
        <div class="col-sm-6 col-md-4 col-lg-3">
          <div class="candidate-card">
            <div class="candidate-header" style="height:100px;background:linear-gradient(135deg,#6c9eff,#9b5de5)"></div>
            <img src="${photo}" alt="${nom}" class="avatar-img">
            <div class="candidate-body">
              <h5>${nom}</h5>
              <button class="btn-vote" data-id="${id}">
                <i class="fas fa-vote-yea me-1"></i>Voter
              </button>
            </div>
          </div>
        </div>
      `);
  
      $col.click(() => {
        selected = { idElection, id, nom, age, description, photo };
        $("#candidateModalLabel").text(nom);
        $("#modalCandidateImg").attr("src", photo);
        $("#modalCandidateName").text(nom);
        $("#modalCandidateDescription").text(description);
        $("#modalCandidateAge").text(age + " ans");
        $("#modalCandidateVotes").text(""); // à remplir si besoin
        new bootstrap.Modal(document.getElementById("candidateModal")).show();
      });
  
      $("#candidatesContainer").append($col);
    }
  
    // ── 3) Confirmation du vote ──
    $("#confirmVoteBtn").off("click").on("click", async () => {
      if (!selected) return;
      try {
        await inst.voter(selected.idElection, selected.id, { from: this.account });
        bootstrap.Modal.getInstance(document.getElementById("candidateModal")).hide();
        showMessage("success","Vote enregistré",`Vous avez voté pour ${selected.nom}.`);
        this.renderCandidateCards(selected.idElection);
      } catch(e) {
        console.error(e);
        showMessage("error","Erreur","Impossible d’enregistrer le vote.");
      }
    });
  }
,  
sinscrireElection: async function () {
  const idElection = $("#electionId").val();
  const userAddress = $("#electeurAddresse").val().trim();



  // Validation de l'adresse Ethereum
  if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
    showMessage("warning", "Adresse invalide", "Veuillez entrer une adresse Ethereum valide.");
    return;
  }

  try {
    const inst = await this.contracts.Voting.deployed();

    // Vérifier la phase : 0 = INSCRIPTION
    const phase = (await inst.getEtat(idElection)).toString();
    if (phase !== "0") {
      const phases = ["INSCRIPTION", "VOTE", "TERMINÉ"];
      showMessage(
        "info",
        "Élection non-inscriptible",
        `Cette élection est en phase <strong>${phases[phase]}</strong>, l'inscription est fermée.`
      );
      return;
    }

    // Appel du smart contract
    await inst.inscrireElecteur(idElection, userAddress, { from: this.account });

    // Succès
    showMessage("success", "Succès", "vous etes  inscrit avec succès.");
    $("#formInscriptionElecteur")[0].reset();

    // (Optionnel) Mettre à jour la liste des élections
    this.SelectElectionPourInscrire();

  } catch (e) {
    console.error(e);

    // Cas où l'utilisateur annule dans MetaMask
    if (e.code === 4001) {
      showMessage("info", "Action annulée", "Signature de transaction refusée.");
      return;
    }

    // Extraction du message d'erreur du contrat
    let msg = "Une erreur est survenue.";
    try {
      const parsed = JSON.parse(e.message.slice(e.message.indexOf("{")));
      msg = parsed.message || msg;
    } catch (_) {
      if (e.message.includes("Deja inscrit")) {
        msg = "L’électeur est déjà inscrit à cette élection.";
      }
    }

    showMessage("error", "Échec de l’inscription", msg);
  }
},
  inscrireElecteur: async function () {
    const idElection = $("#electionSelect").val();
    const userAddress = $("#electeurAddress").val().trim();
  

  
    // Validation de l'adresse Ethereum
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      showMessage("warning", "Adresse invalide", "Veuillez entrer une adresse Ethereum valide.");
      return;
    }
  
    try {
      const inst = await this.contracts.Voting.deployed();
  
      // Vérifier la phase : 0 = INSCRIPTION
      const phase = (await inst.getEtat(idElection)).toString();
      if (phase !== "0") {
        const phases = ["INSCRIPTION", "VOTE", "TERMINÉ"];
        showMessage(
          "info",
          "Élection non-inscriptible",
          `Cette élection est en phase <strong>${phases[phase]}</strong>, l'inscription est fermée.`
        );
        return;
      }
  
      // Appel du smart contract
      await inst.inscrireElecteur(idElection, userAddress, { from: this.account });
  
      // Succès
      showMessage("success", "Succès", "Électeur inscrit avec succès.");
      $("#formInscriptionElecteur")[0].reset();
  
      // (Optionnel) Mettre à jour la liste des élections
      this.populateElectionSelect();
  
    } catch (e) {
      console.error(e);
  
      // Cas où l'utilisateur annule dans MetaMask
      if (e.code === 4001) {
        showMessage("info", "Action annulée", "Signature de transaction refusée.");
        return;
      }
  
      // Extraction du message d'erreur du contrat
      let msg1 = "Une erreur est survenue.";
      let msg = "L’électeur est déjà inscrit à cette élection.";
      try {
        const parsed = JSON.parse(e.message.slice(e.message.indexOf("{")));
        msg = parsed.message || msg;
      } catch (_) {
        if (e.message.includes("Deja inscrit")) {
          msg = "L’électeur est déjà inscrit à cette élection.";
          showMessage("error", "existe deja", msg);
        }
      }
  
      showMessage("error", "Échec de l’inscription", msg);
    }
  },
  minscrireElection: async function () {
    const idElection = $("#electionSelect").val();
    const userAddress = $("#electeurAddress").val().trim();
  

  
    // Validation de l'adresse Ethereum
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      showMessage("warning", "Adresse invalide", "Veuillez entrer une adresse Ethereum valide.");
      return;
    }
  
    try {
      const inst = await this.contracts.Voting.deployed();
  
      // Vérifier la phase : 0 = INSCRIPTION
      const phase = (await inst.getEtat(idElection)).toString();
      if (phase !== "0") {
        const phases = ["INSCRIPTION", "VOTE", "TERMINÉ"];
        showMessage(
          "info",
          "Élection non-inscriptible",
          `Cette élection est en phase <strong>${phases[phase]}</strong>, l'inscription est fermée.`
        );
        return;
      }
  
      // Appel du smart contract
      await inst.inscrireElecteur(idElection, userAddress, { from: this.account });
  
      // Succès
      showMessage("success", "Succès", "Électeur inscrit avec succès.");
      $("#formInscriptionElecteur")[0].reset();
  
      // (Optionnel) Mettre à jour la liste des élections
      this.populateElectionSelect();
  
    } catch (e) {
      console.error(e);
  
      // Cas où l'utilisateur annule dans MetaMask
      if (e.code === 4001) {
        showMessage("info", "Action annulée", "Signature de transaction refusée.");
        return;
      }
  
      // Extraction du message d'erreur du contrat
      let msg = "Une erreur est survenue.";
      try {
        const parsed = JSON.parse(e.message.slice(e.message.indexOf("{")));
        msg = parsed.message || msg;
      } catch (_) {
        if (e.message.includes("Deja inscrit")) {
          msg = "L’électeur est déjà inscrit à cette élection.";
        }
      }
  
      showMessage("error", "Échec de l’inscription", msg);
    }
  },
  changerEtat: async function () {
    if (!this.currentElectionId) return;
    try {
      const inst = await this.contracts.Voting.deployed();
      const cur  = await inst.getEtat(this.currentElectionId);
      await inst.changerEtat(this.currentElectionId, Number(cur)+1,
                             { from: this.account });
      await this.renderElections();
      await this.selectElection(this.currentElectionId);
    } catch (e) { console.error(e); }
  },
  changerEtatElection1: async function () {
    const id = document.getElementById("electionSelect").value;
  
    if (!id) {
      showMessage("warning", "Aucune élection sélectionnée", "Veuillez choisir une élection pour continuer.");
      return;
    }
  
    try {
      const instance = await this.contracts.Voting.deployed();
      const etatActuel = await instance.getEtat(id);
  
      let nouvelEtat;
      if (etatActuel.toString() === "0") { // inscription → vote
        nouvelEtat = 1;
      } else if (etatActuel.toString() === "1") { // vote → terminé
        nouvelEtat = 2;
      } else {
        showMessage("info", "État final atteint", "L’élection est déjà terminée.");
        return;
      }
  
      await instance.changerEtat(id, nouvelEtat, { from: this.account });
  
      const labelEtat = ["Inscription", "Vote", "Terminé"][nouvelEtat];
      showMessage("success", "Phase mise à jour", `L’élection est maintenant en phase <strong>${labelEtat}</strong>.`);
  
    } catch (e) {
      console.error("Erreur lors du changement d’état :", e);
      let message = "Une erreur est survenue.";
      try {
        const parsed = JSON.parse(e.message.slice(e.message.indexOf("{")));
        message = parsed.message || message;
      } catch (_) {
        message = e.message;
      }
      showMessage("error", "Erreur Solidity", message);
    }
  }
  ,
  changerEtatElection: async function (id) {
    if (!id) {
      showMessage("warning", "Aucune élection sélectionnée", "Veuillez choisir une élection pour continuer.");
      return;
    }
  
    try {
      const instance = await this.contracts.Voting.deployed();
      const etatActuel = await instance.getEtat(id);
  
      const phaseActuelle = parseInt(etatActuel.toString());
      let nouvelEtat;
  
      if (phaseActuelle === 0) {
        nouvelEtat = 1;
      } else if (phaseActuelle === 1) {
        nouvelEtat = 2;
      } else {
        showMessage("info", "État final atteint", "L’élection est déjà terminée.");
        return;
      }
  
      await instance.changerEtat(id, nouvelEtat, { from: this.account });
  
      const labelEtat = ["Inscription", "Vote", "Terminé"][nouvelEtat];
      showMessage("success", "Phase mise à jour", `L’élection est maintenant en phase <strong>${labelEtat}</strong>.`);
  
      await App.renderElectionsEncours?.();
  
    } catch (e) {
      console.error("Erreur lors du changement d’état :", e);
      let message = "Une erreur est survenue.";
  
      try {
        const parsed = JSON.parse(e.message.slice(e.message.indexOf("{")));
        message = parsed.message || message;
      } catch (_) {
        message = e.message;
      }
  
      showMessage("error", "Erreur Solidity", message);
    }
  },
getEtatElection: async function () {
  const id = document.getElementById("electionSelect").value;

 

  try {
    const inst = await this.contracts.Voting.deployed();
    const etat = await inst.getEtat(id);
    const phaseText = ["INSCRIPTION", "VOTE", "TERMINÉ"][parseInt(etat)];

    document.getElementById("etatResultat").textContent = `Phase actuelle : ${phaseText}`;
  } catch (e) {
    console.error("Erreur lors de la récupération de l’état :", e);
    showMessage("error", "Erreur", "Impossible de récupérer l’état de l’élection.");
  }
},
voters: async function () {
  //const idElection = $("#electionSelectVote").val();
  const idElection = 1;
  //const idCandidat = $("#candidatSelectVote").val();
  const idCandidat = 1;

 

  try {
    const inst = await this.contracts.Voting.deployed();

    // 📥 Appel de la fonction du smart contract
    await inst.voter(idElection, idCandidat, { from: this.account });

    // ✅ Message de confirmation
    showMessage(
      "success",
      "Vote enregistré",
      `Votre vote pour le candidat #${idCandidat} dans l’élection #${idElection} a été pris en compte.`
    );

    // 🔄 Optionnel : mise à jour de l’UI
    await this.mettreAJourResultats(idElection);

  } catch (e) {
    if (e.code === 4001) {
      showMessage("info", "Action annulée", "Vous avez refusé de signer la transaction via MetaMask.");
      return;
    }

    console.error("Erreur lors du vote :", e);
    let message = "Une erreur est survenue lors de la soumission du vote.";

    try {
      const parsed = JSON.parse(e.message.slice(e.message.indexOf("{")));
      message = parsed.message || message;
    } catch (_) {
      if (e.message.includes("Pas inscrit")) {
        message = "Vous n’êtes pas inscrit pour cette élection.";
      } else if (e.message.includes("Deja voter")) {
        message = "Vous avez déjà voté.";
      } else if (e.message.includes("Cand. invalide")) {
        message = "Le candidat sélectionné est invalide.";
      }
    }

    // ❌ Affichage de l’erreur
    showMessage("error", "Échec du vote", message);
  }
}
,
  uploadToServer: async function (file) {
    const formData = new FormData();
    formData.append('photo', file);

    const res = await fetch('/uploadPhoto', { method: 'POST', body: formData });
    if (!res.ok) throw new Error("Erreur lors de l'upload de la photo");
    const data = await res.json();
    return data.url;
  },
  creerElection: async function () {
    const titre = $("#titre").val().trim();
  
    // Vérification du champ vide
    if (!titre) {
      showMessage("warning", "Titre manquant", "Veuillez saisir un titre pour l’élection.");
      return;
    }
  
    try {
      const inst = await this.contracts.Voting.deployed();
      await inst.creerElection(titre, { from: this.account });
  
      showMessage(
        "success",
        "Élection créée avec succès",
        `L’élection <strong>${titre}</strong> a été enregistrée sur la blockchain.`
      );
  
      $("#titre").val(""); // Réinitialise le champ
      await this.renderElections();          // Rafraîchit la liste
      await this.populateElectionSelectEncours();   // Met à jour le menu déroulant
  
    } catch (e) {
      // Gestion de l’annulation via MetaMask
      if (e.code === 4001) {
        showMessage(
          "info",
          "Vous avez refusé de signer la transaction via ",
          "MetaMask."
        );
        return;
      }
  
      // Autres erreurs
      console.error(e);
      let message = "Une erreur est survenue lors de la création de l’élection.";
      
      try {
        const parsed = JSON.parse(e.message.slice(e.message.indexOf("{")));
        message = parsed.message || message;
      } catch (_) {
        message = e.message || message;
      }
  
      showMessage("error", "Erreur Solidity", message);
    }
  },
  showResults: async function () {
    try {
      const inst = await App.contracts.Voting.deployed();
      const idElection = Number($("#electionSelectCand").val());
      const count = (await inst.getCandidatsCount(idElection)).toNumber();
  
      const votes = await inst.consulterResultats(idElection, { from: App.account });
      $("#Results").empty();
      $("#winnerAlert").remove(); // Supprime tout ancien message
  
      let maxVotes = -1;
      let winnerName = "";
  
      for (let i = 1; i <= count; i++) {
        const raw = await inst.getCandidat(idElection, i, { from: App.account });
        const [id, name, , , photo] = raw.map(x => x.toString());
        const voteCount = parseInt(votes[i - 1]);
  
        if (voteCount > maxVotes) {
          maxVotes = voteCount;
          winnerName = name;
        }
  
        const url = (photo.startsWith("http") || photo.startsWith("/"))
          ? photo
          : `/uploads/${photo}`;
  
        const row = `
          <tr>
            <td>Cand01${id}</td>
            <td>${name}</td>
            <td>
              <img src="${url}" alt="Photo de ${name}" 
                   style="width: 60px; height: 60px; object-fit: cover; border-radius: 50%;">
            </td>
            <td>${voteCount}</td>
          </tr>
        `;
        $("#Results").append(row);
      }
  
      // Générer et insérer le message APRÈS la boucle
      const winnerMsg = `
        <div class="alert alert-success text-center mt-3" role="alert" id="winnerAlert">
          🏆 <strong>${winnerName}</strong> est le candidat gagnant avec <strong>${maxVotes}</strong> vote(s) !
        </div>
      `;
      $("#renderTable").prepend(winnerMsg);
  
      $("#not").hide();
      $("#renderTable").show();
  
    } catch (err) {
      console.error("Erreur dans showResults :", err);
      showMessage("error", "Erreur", "Impossible d’afficher les résultats.");
    }
  },
  
  showResultsGraph: async function (idElection=1) {
    try {
      const instance = await App.contracts.Voting.deployed();
  
      // Vérifie la phase de l’élection
      const phase = await instance.getEtat(idElection, { from: App.account });
      if (parseInt(phase) !== 2) {
        $("#voteChart").hide();
        $("#voteChart").after(`
          <div class="alert alert-warning text-center mt-3" id="notReady">
            <i class="fas fa-exclamation-circle me-2"></i>
            Le vote n'est pas encore terminé. Les résultats seront affichés une fois le vote clos.
          </div>
        `);
        return;
      }
  
      // Supprimer les messages précédents
      $("#notReady").remove();
      $("#voteChart").show();
  
      // Récupérer le nombre de candidats
      const count = (await instance.getCandidatsCount(idElection, { from: App.account })).toNumber();
  
      const noms = [];
      const votes = [];
  
      for (let i = 1; i <= count; i++) {
        const candidat = await instance.getCandidat(idElection, i, { from: App.account });
        const [id, nom, age, desc, photo, voteCount] = candidat.map(x => x.toString());
  
        noms.push(nom);
        votes.push(parseInt(voteCount));
      }
  
      // Supprimer un ancien graphique s’il existe
      if (window.voteChartInstance) {
        window.voteChartInstance.destroy();
      }
  
      const ctx = document.getElementById("voteChart").getContext("2d");
      window.voteChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: noms,
          datasets: [{
            label: "Nombre de votes",
            data: votes,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              stepSize: 1
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
  
    } catch (err) {
      console.error("Erreur dans showResultsGraph :", err);
      showMessage("error", "Erreur", "Impossible d’afficher les résultats.");
    }
  }
  
  
,  

  afficherCandidatsDepuisSelect: async function () {
    const id = $("#electionSelect").val();
    if (!id) {
      alert("Veuillez choisir une élection");
      return;
    }
  
    App.currentElectionId = id;
    await App.renderCandidats();
  },

populateCandidatParElection: async function () {
  try {
    const inst = await App.contracts.Voting.deployed();
    const total = (await inst.totalElections()).toNumber();

    const $select = $("#electionSelectCand").empty();
    $select.append(`<option disabled selected>── Sélectionnez une élection ──</option>`);

    for (let id = 1; id <= total; id++) {
      const [titre] = (await inst.getElection(id)).map(x => x.toString());

      $select.append(`
        <option value="${id}">${titre}</option>
      `);
    }

    if (total === 0) {
      $select.append(`<option disabled>Aucune élection disponible</option>`);
    }
  } catch (err) {
    console.error("Erreur lors du chargement des élections dans <select> :", err);
    $("#electionSelectCand").html(`<option disabled>Erreur de chargement</option>`);
  }
},
populateElectionSelect: async function () {
  try {
    const inst = await App.contracts.Voting.deployed();
    const total = (await inst.totalElections()).toNumber();

    const $select = $("#electionSelect").empty();
    $select.append(`<option disabled selected>── Sélectionnez une élection ──</option>`);

    for (let id = 1; id <= total; id++) {
      const [titre] = (await inst.getElection(id)).map(x => x.toString());

      $select.append(`
        <option value="${id}">${titre}</option>
      `);
    }

    if (total === 0) {
      $select.append(`<option disabled>Aucune élection disponible</option>`);
    }
  } catch (err) {
    console.error("Erreur lors du chargement des élections dans <select> :", err);
    $("#electionSelect").html(`<option disabled>Erreur de chargement</option>`);
  }
},
electeurpourinscrire: async function () {
  try {
    const inst = await App.contracts.Voting.deployed();
    const total = (await inst.totalElections()).toNumber();

    const $select = $("#choixElectionElecteur").empty();
    $select.append(`<option disabled selected>── Sélectionnez une élection ──</option>`);

    for (let id = 1; id <= total; id++) {
      const [titre] = (await inst.getElection(id)).map(x => x.toString());

      $select.append(`
        <option value="${id}">${titre}</option>
      `);
    }

    if (total === 0) {
      $select.append(`<option disabled>Aucune élection disponible</option>`);
    }
  } catch (err) {
    console.error("Erreur lors du chargement des élections dans <select> :", err);
    $("#choixElectionElecteur").html(`<option disabled>Erreur de chargement</option>`);
  }
},

populateElectionCandidat: async function () {
  try {
    const inst = await App.contracts.Voting.deployed();
    const total = (await inst.totalElections()).toNumber();

    const $select = $("#electionSelectParCandidat").empty();
    $select.append(`<option disabled selected>── Sélectionnez une élection ──</option>`);

    for (let id = 1; id <= total; id++) {
      const [titre] = (await inst.getElection(id)).map(x => x.toString());

      $select.append(`
        <option value="${id}">${titre}</option>
      `);
    }

    if (total === 0) {
      $select.append(`<option disabled>Aucune élection disponible</option>`);
    }
  } catch (err) {
    console.error("Erreur lors du chargement des élections dans <select> :", err);
    $("#electionSelectParCandidat").html(`<option disabled>Erreur de chargement</option>`);
  }
},

populateElectionSelect1: async function () {
  try {
    const inst = await App.contracts.Voting.deployed();
    const total = (await inst.totalElections()).toNumber();

    const $select = $("#electionSelect").empty();
    $select.append(`<option disabled selected value="">── Sélectionnez une élection ──</option>`);

    for (let id = 1; id <= total; id++) {
      const [titre, nbCand, phase] = (await inst.getElection(id)).map(x => x.toString());

      // ❌ Ne pas ajouter si l'élection est terminée (phase 2)
      if (phase === "2") continue;

      const phaseText = ["INSCRIPTION", "VOTE", "TERMINÉ"][phase] || "INCONNU";
      $select.append(`<option value="${id}">${titre.toUpperCase()}</option>`);
    }

    // ✅ Si aucune élection valide
    if ($select.children("option").length === 1) {
      $select.append(`<option disabled>(Aucune élection en cours)</option>`);
    }

  } catch (err) {
    if (err.code === 4001) {
      showMessage("info", "Action annulée", "Vous avez refusé de signer la transaction via MetaMask. Aucune modification n’a été effectuée.");
      return;
    }
    console.error("Erreur chargement élections :", err);
    showMessage("error", "Erreur", "Impossible de charger les élections.");
  }
}
,populateElectionSelectEncours: async function () {
  try {
    const inst = await this.contracts.Voting.deployed();
    const total = (await inst.totalElections()).toNumber();

    const $select = $("#electionSelect")
      .empty()
      .append(`<option disabled selected value="">Sélectionnez...</option>`);
      const phases = ["INSCRIPTION", "VOTE", "TERMINÉ"];
    for (let id = 1; id <= total; id++) {
      // Récupère titre, nombre de candidats et phase
      const [titre, /* nbCand */, phase] = await inst.getElection(id);
      const phaseStr = phase.toString();
      // On n’affiche que si phase === 0 (INSCRIPTION)
      if (phaseStr === "0"||phaseStr=="1") {
        $select.append(`
          <option value="${id}">
                 ${titre.toUpperCase()} — ${phases[phase]}
          </option>
        `);
      }
    }

    // Si aucune élection disponible
    if ($select.children("option").length === 1) {
      $select.append(`<option disabled value="">Aucune élection en inscription</option>`);
    }

  } catch (e) {
    console.error("Erreur lors du chargement des élections :", e);
    showMessage("error", "Erreur", "Impossible de récupérer la liste des élections.");
  }
},
SelectElectionPourInscrire: async function () {
  try {
    const inst = await this.contracts.Voting.deployed();
    const total = (await inst.totalElections()).toNumber();

    const $select = $("#electionId")
      .empty()
      .append(`<option disabled selected value="">Sélectionnez...</option>`);
      const phases = ["INSCRIPTION", "VOTE", "TERMINÉ"];
    for (let id = 1; id <= total; id++) {
      // Récupère titre, nombre de candidats et phase
      const [titre, /* nbCand */, phase] = await inst.getElection(id);
      const phaseStr = phase.toString();
      // On n’affiche que si phase === 0 (INSCRIPTION)
      if (phaseStr === "0"||phaseStr=="1") {
        $select.append(`
          <option value="${id}">
                 ${titre.toUpperCase()} — ${phases[phase]}
          </option>
        `);
      }
    }

    // Si aucune élection disponible
    if ($select.children("option").length === 1) {
      $select.append(`<option disabled value="">Aucune élection trouver</option>`);
    }

  } catch (e) {
    console.error("Erreur lors du chargement des élections :", e);
    showMessage("error", "Erreur", "Impossible de récupérer la liste des élections.");
  }
}
,
populateElectionSelect3: async function () {
  try {
    const inst = await App.contracts.Voting.deployed();
    const total = (await inst.totalElections()).toNumber();

    const $select = $("#electionSelect1").empty();
    $select.append(`<option disabled selected>── Sélectionnez une élection ──</option>`);

    for (let id = 1; id <= total; id++) {
      const [titre] = (await inst.getElection(id)).map(x => x.toString());

      $select.append(`
        <option value="${id}">${titre}</option>
      `);
    }

    if (total === 0) {
      $select.append(`<option disabled>Aucune élection disponible</option>`);
    }
  } catch (err) {
    console.error("Erreur lors du chargement des élections dans <select> :", err);
    $("#electionSelect").html(`<option disabled>Erreur de chargement</option>`);
  }
},

};
function showMessage(type, titre, message) {
  const bgColor = type === "success" ? "bg-success"
                : type === "error" ? "bg-danger"
                : "bg-info";

  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-white ${bgColor} border-0 show`;
  toast.role = "alert";
  toast.style.marginBottom = "10px";
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <strong>${titre}</strong><br>${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto"
              data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  document.getElementById("toastContainer").appendChild(toast);
  setTimeout(() => toast.remove(), 8000); // 4 secondes visibles
}

/* Lancement */
$(window).on("load", () => App.init());
