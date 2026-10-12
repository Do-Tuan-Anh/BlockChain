require("@nomicfoundation/hardhat-toolbox");
if (require('fs').existsSync('.env')) process.loadEnvFile('.env');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          evmVersion: "cancun",
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    localhost: { url: 'http://127.0.0.1:8545', chainId: 31337 },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
      chainId: 11155111,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    hardhat: {
      chainId: 31337,
    },
  },
  paths: {
    sources: "./packages/contracts/contracts",
    tests: "./packages/contracts/test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
