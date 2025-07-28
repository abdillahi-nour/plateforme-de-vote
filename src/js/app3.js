
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
    await this.renderElectionsEncours();   

    await App.populateElectionSelect();
    await App.populateElectionSelect1();
   await App.populateElectionSelect3();
  
   // await App.getEtatElection();
   //await App.populateElectionsInscription();
   await App.populateElectionSelectEncours();
   
   
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
  
  /* ════════════════════════════════════════════════════════════════
     4)  ACTIONS  (ajout, vote, inscription, etc.)
  ═════════════════════════════════════════════════════════════════ */
  ajouterCandidat: async function () {
    const idElection = $("#electionSelect").val();
  
    // ✅ Vérification de la sélection de l'élection
    if (!idElection || isNaN(idElection) || Number(idElection) <= 0) {
      showMessage("warning", "Élection manquante", "Veuillez sélectionner une élection valide.");
      return;
    }
  
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
  afficherCandidats: async function () {
    const idElection = $("#electionSelect1").val();
  
    // Vérification de la sélection de l'élection
    if (!idElection || isNaN(idElection) || Number(idElection) <= 0) {
      showMessage("warning", "Élection manquante", "Veuillez sélectionner une élection valide.");
      return;
    }
  
    try {
      const inst = await this.contracts.Voting.deployed();
      const candidats = await inst.getAllCandidats(idElection);
  
      // Structure HTML des candidats
      let candidatsHtml = "";
  
      candidats[0].forEach((nom, i) => {
        candidatsHtml += `
          <tr>
            <td>${i + 1}</td>
            <td>${nom}</td>
            <td>${candidats[1][i]}</td>
            <td>${candidats[2][i]}</td>
            <td><img src="${candidats[3][i]}" alt="${nom}" style="width: 50px; height: 50px;"></td>
            <td>${candidats[4][i]}</td>
          </tr>`;
      });
  
      // Affichage dans le tableau HTML dédié
      $("#candidatsTable tbody").html(candidatsHtml);
  
    } catch (e) {
      console.error(e);
      showMessage("error", "Erreur d'affichage", "Impossible de récupérer la liste des candidats.");
    }
  }
,  
  inscrireElecteur: async function () {
    const idElection = $("#electionSelect").val();
    const userAddress = $("#electeurAddress").val().trim();
  
    // Validation de la sélection
    if (!idElection || isNaN(idElection)) {
      showMessage("warning", "Sélection invalide", "Veuillez choisir une élection.");
      return;
    }
  
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
  }
  
,  
  


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
  }
  
,  
getEtatElection: async function () {
  const id = document.getElementById("electionSelect").value;

  if (!id) {
    showMessage("warning", "Sélection requise", "Veuillez d’abord choisir une élection.");
    return;
  }

  try {
    const inst = await this.contracts.Voting.deployed();
    const etat = await inst.getEtat(id);
    const phaseText = ["INSCRIPTION", "VOTE", "TERMINÉ"][parseInt(etat)];

    document.getElementById("etatResultat").textContent = `Phase actuelle : ${phaseText}`;
  } catch (e) {
    console.error("Erreur lors de la récupération de l’état :", e);
    showMessage("error", "Erreur", "Impossible de récupérer l’état de l’élection.");
  }
}
,

voter: async function () {
  //const idElection = $("#electionSelectVote").val();
  const idElection = 1;
  //const idCandidat = $("#candidatSelectVote").val();
  const idCandidat = 1;

  // ✅ Vérification des champs
  if (!idElection || isNaN(idElection) || Number(idElection) <= 0) {
    showMessage("warning", "Élection manquante", " sélectionne une élection valide.");
    return;
  }

  if (!idCandidat || isNaN(idCandidat) || Number(idCandidat) <= 0) {
    showMessage("warning", "Candidat manquant", "Veuillez sélectionner un candidat valide.");
    return;
  }

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
  }
  
,  
chargerCandidatsPourElection: async function () {
  //const idElection = $("#electionSelectVote").val();
  const idElection = 2;
  $("#candidatSelectVote").empty().append(`<option value="">-- Choisir un candidat --</option>`);

  if (!idElection) return;

  try {
    const instance = await App.contracts.Voting.deployed();
    const count = await instance.getNombreCandidats(idElection);

    for (let i = 1; i <= count; i++) {
      const c = await instance.getCandidat(idElection, i);
      const name = c[1]; // c.nom
      $("#candidatSelectVote").append(`<option value="${i}">${name}</option>`);
    }
  } catch (err) {
    console.error("Erreur lors du chargement des candidats :", err);
  }
}
,

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
