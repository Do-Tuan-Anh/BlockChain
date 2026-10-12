const { ethers, artifacts, network } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main({ writeFiles = true } = {}) {
  const [deployer, localTreasury, localArbitrator] = await ethers.getSigners();
  if (!deployer) throw new Error('Configure DEPLOYER_PRIVATE_KEY before deploying to Sepolia.');
  const local = ['hardhat', 'localhost'].includes(network.name);
  const treasury = process.env.TREASURY_ADDRESS || (local ? localTreasury?.address : null);
  const arbitrator = process.env.ARBITRATOR_ADDRESS || (local ? localArbitrator?.address : null);
  if (!ethers.isAddress(treasury || '') || !ethers.isAddress(arbitrator || '')) throw new Error('Set valid TREASURY_ADDRESS and ARBITRATOR_ADDRESS.');
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contracts = {}, transactions = {}, abis = {}, instances = {};
  let deploymentBlock;
  async function deploy(name, args) {
    const instance = await (await ethers.getContractFactory(name)).deploy(...args);
    const receipt = await instance.deploymentTransaction().wait();
    contracts[name] = await instance.getAddress();
    transactions[name] = receipt.hash;
    deploymentBlock ??= receipt.blockNumber;
    abis[name] = (await artifacts.readArtifact(name)).abi;
    instances[name] = instance;
    console.log(`${name}: ${contracts[name]} (${receipt.hash})`);
    return instance;
  }
  await deploy('MarketplaceNFT', [deployer.address]);
  await deploy('FeeManager', [deployer.address, 250, treasury]);
  const escrow = await deploy('Escrow', [deployer.address, contracts.MarketplaceNFT, contracts.FeeManager]);
  await deploy('Marketplace', [deployer.address, contracts.MarketplaceNFT, contracts.Escrow]);
  const reputation = await deploy('Reputation', [deployer.address]);
  const disputes = await deploy('DisputeResolution', [deployer.address, contracts.Escrow, contracts.Reputation]);
  for (const tx of [
    () => escrow.setMarketplace(contracts.Marketplace),
    () => escrow.setDisputeResolution(contracts.DisputeResolution),
    () => escrow.setReputation(contracts.Reputation),
    () => reputation.setCallerAuthorization(contracts.Escrow, true),
    () => reputation.setCallerAuthorization(contracts.DisputeResolution, true),
    () => disputes.grantRole(ethers.id('ARBITRATOR_ROLE'), arbitrator),
  ]) await (await tx()).wait();
  const block = await ethers.provider.getBlock(deploymentBlock);
  const config = {
    network: network.name, chainId, deploymentBlock, deploymentBlockHash: block.hash,
    scope: `${chainId}:${contracts.Marketplace.toLowerCase()}:${block.hash}`,
    deployedAt: new Date().toISOString(), contracts, transactions, treasury, arbitrator,
    explorer: chainId === 11155111 ? 'https://sepolia.etherscan.io' : '',
    chainName: chainId === 31337 ? 'TrustChain Local' : 'Sepolia',
  };
  const root = path.resolve(__dirname, '../../..');
  if (writeFiles) {
  fs.mkdirSync(path.join(root, 'data'), { recursive: true });
  fs.mkdirSync(path.join(root, 'apps/web/src/lib/chain'), { recursive: true });
  fs.writeFileSync(path.join(root, 'data/trustchain-deployments.json'), JSON.stringify(config, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'apps/web/src/lib/chain/abis.json'), JSON.stringify(abis, null, 2) + '\n');
  }
  console.log(`Ready: chain ${chainId}, first block ${deploymentBlock}.`);
  if (network.name === 'hardhat') console.warn('This chain is ephemeral. Use --network localhost for the web app.');
  return instances;
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { main };
