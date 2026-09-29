const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

function generateBatchMerkleTree(batchId, totalUnits = 100) {
  const units = [];
  const leaves = [];

  for (let i = 1; i <= totalUnits; i++) {
    const serialNumber = `SN-2026-${String(i).padStart(6, "0")}`;
    const salt = ethers.keccak256(ethers.toUtf8Bytes(`SECRET-SALT-${batchId}-${i}`));
    
    const encoded = ethers.solidityPacked(
      ["uint256", "string", "bytes32"],
      [batchId, serialNumber, salt]
    );
    const leaf = ethers.keccak256(encoded);

    units.push({
      index: i,
      serialNumber,
      salt,
      leaf
    });
    leaves.push(Buffer.from(leaf.slice(2), "hex"));
  }

  const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = merkleTree.getHexRoot();

  return {
    merkleTree,
    root,
    units
  };
}

function getProofForUnit(merkleTree, leaf) {
  const leafBuffer = Buffer.from(leaf.slice(2), "hex");
  return merkleTree.getHexProof(leafBuffer);
}

if (require.main === module) {
  console.log("=== AegisMed Cryptographic Merkle Tree Generator ===");
  const batchId = 1;
  const unitCount = 50;
  console.log(`Generating Merkle Tree for Batch #${batchId} with ${unitCount} serialized packages...`);

  const { merkleTree, root, units } = generateBatchMerkleTree(batchId, unitCount);

  console.log(`Merkle Root: ${root}`);
  console.log(`Sample Unit #1 Leaf: ${units[0].leaf}`);
  const proof0 = getProofForUnit(merkleTree, units[0].leaf);
  console.log(`Proof length for Unit #1: ${proof0.length} siblings`);

  const outDir = path.join(__dirname, "../data");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const exportData = {
    batchId,
    merkleRoot: root,
    totalUnits: unitCount,
    generatedAt: new Date().toISOString(),
    sampleUnits: units.slice(0, 5).map(u => ({
      ...u,
      proof: getProofForUnit(merkleTree, u.leaf)
    }))
  };

  fs.writeFileSync(path.join(outDir, `batch-${batchId}-merkle.json`), JSON.stringify(exportData, null, 2));
  console.log(`Exported sample batch verification tree to data/batch-${batchId}-merkle.json`);
}

module.exports = {
  generateBatchMerkleTree,
  getProofForUnit
};

