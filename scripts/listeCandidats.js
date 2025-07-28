const Voting = artifacts.require("Voting");

module.exports = async function (callback) {
  try {
    const voting = await Voting.deployed();

    // Appel à la fonction getAllCandidats
    const result = await voting.getAllCandidats();

    // Déstructure les résultats
    const noms = result[0];
    const ages = result[1];
    const descriptions = result[2];
    const photos = result[3];
    const votes = result[4];

    console.log(`📋 Nombre de candidats : ${noms.length}`);

    for (let i = 0; i < noms.length; i++) {
      console.log(`\n🧑‍💼 Candidat ${i + 1}`);
      console.log(`Nom         : ${noms[i]}`);
      console.log(`Âge         : ${ages[i].toString()}`);
      console.log(`Description : ${descriptions[i]}`);
      console.log(`Photo       : ${photos[i]}`);
      console.log(`Votes       : ${votes[i].toString()}`);
    }

    callback();
  } catch (error) {
    console.error("❌ Erreur :", error.message);
    callback(error);
  }
};
