const Voting = artifacts.require("Voting");

module.exports = async function (callback) {
  try {
    const accounts = await web3.eth.getAccounts();
    const admin = accounts[0];
    const electeur1 = accounts[1];
    const electeur2 = accounts[2];

    const voting = await Voting.deployed();

    // Ajouter des candidats
    await voting.ajouterCandidat("Alice", 30, "Développeuse blockchain", "http://localhost:3000/uploads/2.jpeg", { from: admin });
    console.log("✅ Candidats ajoutés.");

    // Inscrire les électeurs
    await voting.inscrireElecteur(electeur1, { from: admin });
    await voting.inscrireElecteur(electeur2, { from: admin });
    console.log("✅ Électeurs inscrits.");

    // Passer à la phase de vote
    await voting.changerEtat(1, { from: admin }); // PHASE.vote
    console.log("✅ Phase de vote activée.");

    // Électeurs votent
    await voting.voter(1, { from: electeur1 }); // Alice
    await voting.voter(2, { from: electeur2 }); // Bob
    console.log("✅ Votes effectués.");

    // Fin du vote
    await voting.changerEtat(2, { from: admin }); // PHASE.termine
    console.log("✅ Phase terminée.");

    // Consulter résultats
    const resultats = await voting.consulterResultats();
    console.log("📊 Résultats finaux :");
    resultats.forEach((votes, i) => {
      console.log(`  Candidat ${i + 1} : ${votes.toString()} vote(s)`);
    });

    // Détails d’un candidat
    const candidat = await voting.getCandidat(1);
    console.log("\n📋 Détails de Alice :");
    console.log(`Nom: ${candidat[0]}, Âge: ${candidat[1]}, Description: ${candidat[2]}, Photo: ${candidat[3]}, Votes: ${candidat[4]}`);

    callback();
  } catch (error) {
    console.error(error);
    callback(error);
  }
};
