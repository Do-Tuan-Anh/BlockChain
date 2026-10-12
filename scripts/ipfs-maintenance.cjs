const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const root = path.resolve(__dirname, '..');
const env = path.join(root, 'apps/web/.env');
if (fs.existsSync(env)) process.loadEnvFile(env);
const { PrismaClient } = require('../apps/web/node_modules/@prisma/client');
const { CID, endpoints, rpc, cidFromUri, readVerified } = require('../apps/web/src/lib/ipfs.cjs');
const directory = path.join(root, '.local/ipfs-backups');
const manifestFile = path.join(directory, 'manifest.json');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function main() {
  const mode = process.argv[2] || 'check';
  if (!['check', 'backup', 'restore'].includes(mode)) throw new Error('Use check, backup or restore');
  if (mode === 'restore') {
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    for (const item of manifest.items) {
      if (!CID.test(item.cid)) throw new Error('Invalid backup CID');
      const bytes = fs.readFileSync(path.join(directory, `${item.cid}.car`));
      if (hash(bytes) !== item.sha256) throw new Error('Backup checksum mismatch');
      for (const endpoint of endpoints()) {
        const form = new FormData(); form.append('file', new Blob([bytes]), `${item.cid}.car`);
        const imported = await (await rpc(endpoint, 'dag/import', 'pin-roots=true', form)).text();
        const roots = imported.trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
        if (!roots.some(entry => entry.Root?.Cid?.['/'] === item.cid && !entry.Root.PinErrorMsg) || roots.some(entry => entry.Root?.PinErrorMsg)) throw new Error('CAR import did not confirm the expected root');
      }
      await readVerified(`ipfs://${item.cid}`, 6 * 1024 * 1024);
    }
    console.log(`Restored and verified ${manifest.items.length} CIDs.`); return;
  }
  const prisma = new PrismaClient();
  try {
    const products = await prisma.product.findMany({ select: { metadataUri: true, imageUrl: true, metadataJson: true } });
    const uris = new Set();
    for (const product of products) {
      for (const uri of [product.metadataUri, product.imageUrl, product.metadataJson?.image]) if (typeof uri === 'string' && uri.startsWith('ipfs://')) uris.add(uri);
    }
    const items = []; fs.mkdirSync(directory, { recursive: true });
    for (const uri of uris) {
      const cid = cidFromUri(uri);
      await readVerified(uri, 6 * 1024 * 1024);
      for (const endpoint of endpoints()) await rpc(endpoint, 'pin/ls', `arg=${cid}&type=recursive`);
      if (mode === 'backup') {
        const response = await rpc(endpoints()[0], 'dag/export', `arg=${cid}`);
        const file = path.join(directory, `${cid}.car`);
        const temporary = `${file}.tmp`;
        await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(temporary));
        const sha256 = hash(fs.readFileSync(temporary));
        fs.renameSync(temporary, file);
        items.push({ cid, sha256 });
      }
    }
    if (mode === 'backup') {
      const next = `${manifestFile}.tmp`;
      fs.writeFileSync(next, JSON.stringify({ createdAt: new Date().toISOString(), items }, null, 2) + '\n');
      fs.renameSync(next, manifestFile);
    }
    console.log(`${mode}: verified ${uris.size} CIDs across ${endpoints().length} configured node(s).`);
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
