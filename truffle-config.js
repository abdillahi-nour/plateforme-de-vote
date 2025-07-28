const path = require("path");

module.exports = {
  // Configurations des réseaux
  networks: {
    development: {
      host: "127.0.0.1", // Adresse locale
      port: 7545,         // Port par défaut de Ganache
      network_id: "*",    // Accepte tous les identifiants de réseau
    }
  },

  // Configuration unique du compilateur Solidity
  compilers: {
    solc: {
      version: "0.8.0",   // Version exacte pour correspondre à votre pragma
      settings: {
        optimizer: {
          enabled: true,  // Active l'optimiseur
          runs: 200      // Nombre d'exécutions pour l'optimisation
        }
      }
    }
  }
};