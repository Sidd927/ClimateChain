require("@nomicfoundation/hardhat-toolbox");

const { RPC_URL, DEPLOYER_PRIVATE_KEY } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    localhost: { url: "http://127.0.0.1:8545" },
    // Optional public testnet; requires a funded *test* key in your local .env (never committed).
    ...(RPC_URL && DEPLOYER_PRIVATE_KEY ? { testnet: { url: RPC_URL, accounts: [DEPLOYER_PRIVATE_KEY] } } : {}),
  },
  gasReporter: { enabled: !!process.env.REPORT_GAS },
};
