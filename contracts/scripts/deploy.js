// Deploys ClaimLedger and writes deployments/<network>.json (address + ABI) for the backend.
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const ledger = await hre.ethers.deployContract("ClaimLedger");
  await ledger.waitForDeployment();
  const address = await ledger.getAddress();
  const tx = ledger.deploymentTransaction();
  const receipt = await tx.wait();
  const artifact = await hre.artifacts.readArtifact("ClaimLedger");
  const net = await hre.ethers.provider.getNetwork();
  const out = {
    network: hre.network.name,
    chainId: Number(net.chainId),
    address,
    deployTx: tx.hash,
    deployBlock: receipt.blockNumber,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };
  const file = path.join(__dirname, "..", "deployments", `${hre.network.name}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`ClaimLedger deployed to ${address} on ${hre.network.name} (chainId ${out.chainId}) in block ${receipt.blockNumber}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
