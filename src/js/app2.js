const App = {
  web3Provider: null,
  contracts: {},
  account: "0x0",
  phaseEnum: 0,
  currentElectionId: 0, 

  init: async function () {
    return await App.initWeb3();
  },

  initWeb3: async function () {
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        App.account = accounts[0];
      } catch (error) {
        console.error("User denied account access");
      }
    } else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    } else {
      console.log("No Ethereum browser detected. You should consider trying MetaMask!");
      return;
    }

    web3 = new Web3(App.web3Provider);
    return App.initContract();
  },

  initContract: function () {
    $.getJSON("Voting.json", function (artifact) {
      App.contracts.Voting = TruffleContract(artifact);
      App.contracts.Voting.setProvider(App.web3Provider);
      App.render();
    });
  },

  render: async function () {
    const loader = $("#loader"),
          content = $("#content");

    loader.show();
    content.hide();
    $("#after").hide();

    $("#accountAddress").text("Compte Admin : " + App.account);

    try {
      const instance = await App.contracts.Voting.deployed();
      const count = await instance.candidatsCount();

      $("#test, #candidatsResultsAdmin, #candidatSelect, #electeurTable").empty();
  
      for (let i = 1; i <= count; i++) {
        const c = await instance.candidats(i);
        const [id, name, voteCount, age,desc, photo] = c.map(x => x.toString());

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
        $("#candidatSelect").append(`<option value="${id}">${name}</option>`);

        const adminRow = `
          <tr>
            <th>mat_10${id}</th>
            <td>${name}</td>
            <td>${age}</td>
            <td>${desc}</td>
            <td><img src="${photo}" alt="${name}" style="width:50px; object-fit:cover;"></td>
            <td>${voteCount}</td>
          </tr>`;
        $("#candidatsResultsAdmin").append(adminRow);
      }


      const etat = await instance.getState();
      App.phaseEnum = parseInt(etat, 10);
      const phaseText = ["Phase d'inscription", "Phase de vote", "Élection terminée"][App.phaseEnum] || "État inconnu";
      $("#phase").text("Phase actuelle : " + phaseText);

      loader.hide();
      content.show();

      if (App.phaseEnum === 2) {
        App.showResults();
      } else {
        $("#resultSection").hide();
      }
    } catch (err) {
      console.error("Erreur dans render() :", err);
    }
  },

  ajouterCandidat: async function () {
    const name = $("#nom").val();
    const age = $("#age").val();
    const desc = $("#description").val();
    const file = $("#photo")[0].files[0];

    if (!file) {
      showMessage('error', 'Erreur', "Veuillez uploader une photo.");
      return;
    }

    try {
      const url = await App.uploadToServer(file);
      const instance = await App.contracts.Voting.deployed();
      await instance.ajouterCandidat(name, age, desc, url, { from: App.account });
      App.render();
    } catch (err) {
      console.error("Erreur lors de l'ajout du candidat :", err);
      showMessage('error', 'Erreur', "Erreur lors de l'ajout du candidat : " + err.message);
    }
  },

  uploadToServer: async function (file) {
    const formData = new FormData();
    formData.append('photo', file);

    const res = await fetch('/uploadPhoto', { method: 'POST', body: formData });
    if (!res.ok) throw new Error("Erreur lors de l'upload de la photo");
    const data = await res.json();
    return data.url;
  },

  inscrireElecteur: async function () {
    const add = $('#accadd').val().trim();

    if (!/^0x[a-fA-F0-9]{40}$/.test(add)) {
      showMessage('error', 'Erreur', 'Veuillez entrer une adresse Ethereum valide.');
      return;
    }

    $("#loader").show();
    $("#content").hide();

    try {
      const instance = await App.contracts.Voting.deployed();
      await instance.inscrireElecteur(add, { from: App.account });

      showMessage('success', 'Succès', "Électeur inscrit avec succès !");
      $('#accadd').val('');

      const existing = $('#votersTable tbody tr').filter(function () {
        return $(this).find('td.account-address').text().toLowerCase() === add.toLowerCase();
      });

      if (existing.length > 0) {
        console.warn("L'adresse existe déjà dans le tableau.");
        return;
      }

      const now = new Date().toLocaleString();
      const rowCount = $('#votersTable tbody tr').length + 1;

      const newRow = `
        <tr>
          <td>${rowCount}</td>
          <td class="account-address">${add}</td>
          <td><span class="badge badge-success">Inscrit</span></td>
          <td>${now}</td>
          <td class="action-buttons">
            <button class="btn btn-info btn-sm" title="Modifier"><i class="fas fa-edit"></i></button>
            <button class="btn btn-danger btn-sm" title="Désinscrire"><i class="fas fa-user-minus"></i></button>
          </td>
        </tr>`;

      $('#votersTable tbody').append(newRow);
    } catch (err) {
      console.error("Erreur d'inscription :", err);
      showMessage('error', 'Erreur', err.message || err);
    } finally {
      $("#loader").hide();
      $("#content").show();
    }
  },

  vote: async function (candidatId) {
    try {
      const instance = await App.contracts.Voting.deployed();
  
      // Vérifier la phase actuelle
      const currentPhase = await instance.getState();
      const phaseStr = currentPhase.toString();
  
      if (phaseStr !== "1") { // 1 = phase de vote
        let message = "";
  
        if (phaseStr === "0") {
          message = "La période de vote n'a pas encore commencé. Nous sommes toujours en phase d'inscription.";
        } else if (phaseStr === "2") {
          message = "La période de vote est terminée. Les résultats sont disponibles.";
        } else {
          message = "Il n'est pas possible de voter actuellement.";
        }
  
        showMessage('warning', 'Période de vote', message);
        return;
      }
  
      // Si tout est OK, procéder au vote
      await instance.voter(candidatId, { from: App.account });
  
      showMessage('success', 'Succès', "Vote effectué avec succès !");
      App.render();
    } catch (err) {
      console.error("Erreur de vote :", err);
  
      // Gérer les erreurs spécifiques Ethereum (revert)
      //let errorMessage = "Erreur lors du vote.";
     // let errorMessage = "Vous avez déjà voté. Un électeur ne peut voter qu'une seule fois.";
     let  errorMessage = "Vous n'êtes pas inscrit en tant qu'électeur. L'inscription est obligatoire pour voter.";
      const errMsg = err.message || "";
  
      if (errMsg.includes("revert")) {
        if (errMsg.includes("Not in voting phase")) {
          errorMessage = "Vous ne pouvez pas voter en dehors de la période de vote.";
        } else if (errMsg.includes("Already voted")) {
          errorMessage = "Vous avez déjà voté. Un électeur ne peut voter qu'une seule fois.";
        } else if (errMsg.includes("Not registered")) {
          errorMessage = "Vous n'êtes pas inscrit en tant qu'électeur. L'inscription est obligatoire pour voter.";
        }
      }
  
      showMessage('error', 'Erreur', errorMessage);
    }
  },
  

  getPhase: async function () {
    try {
      const instance = await App.contracts.Voting.deployed();
      const state = await instance.getState();
      App.phaseEnum = parseInt(state, 10);
      return App.phaseEnum;
    } catch (err) {
      console.error(err);
    }
  },

  changerEtat: async function () {
    try {
      const next = App.phaseEnum + 1;
      const instance = await App.contracts.Voting.deployed();
      await instance.changerEtat(next, { from: App.account });
      App.render();
    } catch (err) {
      console.error(err);
    }
  },

  showResults: async function () {
    try {
      const instance = await App.contracts.Voting.deployed();
      const count = await instance.candidatsCount();
      $("#Results").empty();

      let maxVotes = -1;
      let winnerName = "";

      for (let i = 1; i <= count; i++) {
        const c = await instance.candidats(i);
        const [id, name, voteCount, age, description, photo] = c.map(x => x.toString());
        const url = (photo.startsWith("http") || photo.startsWith("/"))
          ? photo
          : `/uploads/${photo}`;

        if (parseInt(voteCount) > maxVotes) {
          maxVotes = parseInt(voteCount);
          winnerName = name;
        }

        const row = `
          <tr>
            <td>${id}</td>
            <td>${name}</td>
            <td>${age}</td>
            <td>${description}</td>
            <td>
              <img src="${url}" alt="Photo du candidat ${name}" 
                   style="width: 80px; height: 80px; 
                          object-fit: cover; 
                          border-radius: 50%; 
                          display: block; 
                          margin: auto; 
                          box-shadow: 0 0 8px rgba(0,0,0,0.2);
                          border: 2px solid #fff;">
            </td>
            <td>${voteCount}</td>
          </tr>
        `;
        $("#Results").append(row);
      }

      $("#not").hide();
      $("#renderTable").show();

      const winnerMsg = `
        <div class="alert alert-success text-center mt-3" role="alert">
          🏆 <strong>${winnerName}</strong> est le candidat gagnant avec <strong>${maxVotes}</strong> vote(s) !
        </div>
      `;
      $("#renderTable").append(winnerMsg);

    } catch (err) {
      console.error("Erreur dans showResults :", err);
    }
  },

  showElecteursInscrits: async function () {
    try {
      const instance = await App.contracts.Voting.deployed();
      const accounts = await instance.getAllElecteurs({ from: App.account });

      const tbody = document.getElementById("votersBodyWeb3");
      tbody.innerHTML = "";

      if (accounts.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center">
              <i class="fas fa-info-circle fa-2x mb-2"></i>
              <p>Aucun électeur inscrit pour le moment</p>
            </td>
          </tr>`;
        return;
      }

      for (let i = 0; i < accounts.length; i++) {
        const address = accounts[i];
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${i + 1}</td>
          <td class="account-address">${address}</td>
          <td><span class="badge badge-success">Inscrit</span></td>
          <td>${new Date().toLocaleString()}</td>
          <td class="action-buttons">
            <button class="btn btn-info btn-sm" title="Modifier">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger btn-sm" title="Désinscrire">
              <i class="fas fa-user-minus"></i>
            </button>
          </td>`;
        tbody.appendChild(row);
      }
    } catch (error) {
      console.error("Erreur lors de l'affichage des électeurs :", error);
    }
  }
};



;

$(window).on("load", function () {
  App.init();
});
