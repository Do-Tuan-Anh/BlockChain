const path = require('path');
const fs = require('fs');
const env = path.resolve(__dirname, '../web/.env');
if (fs.existsSync(env)) process.loadEnvFile(env);
process.env.CHAIN_DEPLOYMENT_FILE ||= path.resolve(__dirname, '../../data/trustchain-deployments.json');
const { PrismaClient } = require('../web/node_modules/@prisma/client');
const { syncChain } = require('../web/src/lib/chain/indexer.cjs');
const prisma = new PrismaClient();
let stopping = false;
process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });
async function main() {
  let backoff = 1000;
  while (!stopping) {
    try {
      const result = await syncChain(prisma);
      console.log(JSON.stringify({ time: new Date().toISOString(), ...result }));
      backoff = result.caughtUp ? 5000 : 100;
    } catch (error) {
      console.error('Indexer retry:', error.message);
      if (process.argv.includes('--once')) throw error;
      backoff = Math.min(Math.max(backoff * 2, 1000), 30000);
    }
    if (process.argv.includes('--once')) break;
    await new Promise(resolve => setTimeout(resolve, backoff));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
