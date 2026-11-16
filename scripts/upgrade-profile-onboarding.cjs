const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const web = path.resolve(__dirname, '../apps/web');
if (fs.existsSync(path.join(web, '.env'))) process.loadEnvFile(path.join(web, '.env'));
const result = spawnSync(process.execPath, [path.join(web, 'node_modules/prisma/build/index.js'), 'db', 'execute', '--file', 'prisma/onboarding-upgrade.sql', '--schema', 'prisma/schema.prisma'], { cwd: web, stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
