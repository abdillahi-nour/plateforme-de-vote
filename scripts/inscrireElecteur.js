const Voting = artifacts.require("Voting");

module.exports = async function (callback) {
  try {
    const voting = await Voting.deployed();
    const admin = (await web3.eth.getAccounts())[0];
    //const electeurToInscrire = "0xF3b14990243D20fd6d6D5a5E59117269C33E0b80";
    const electeurToInscrire2="0x4c66526cAF4d0F1Ad7F26a17474389eC4942B4b0";

    const phase = await voting.getState();
    console.log("Phase actuelle :", phase.toString());

    if (parseInt(phase) !== 0) {
      throw new Error("⛔ Impossible d'inscrire l'électeur : le contrat n’est plus en phase d’inscription.");
    }

    await voting.inscrireElecteur(electeurToInscrire2, { from: admin });
    console.log(`✅ Électeur ${electeurToInscrire2} inscrit avec succès.`);

    callback();
  } catch (error) {
    console.error("❌ Erreur :", error.message);
    callback(error);
  }
};
