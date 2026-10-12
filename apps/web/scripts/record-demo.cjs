const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const destination = path.resolve(__dirname, '../../../.local/demo', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(destination, { recursive: true });
const result = spawnSync(process.execPath, [path.resolve(__dirname, '../node_modules/@playwright/test/cli.js'), 'test', 'blockchain.spec.ts', '--project=desktop', '--output', destination], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, RECORD_BLOCKCHAIN_DEMO: '1' }, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
function files(directory) { return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => item.isDirectory() ? files(path.join(directory, item.name)) : [path.join(directory, item.name)]); }
const all = files(destination), video = all.find(p => p.endsWith('.webm')), evidence = all.find(p => p.endsWith('evidence.json'));
if (!video || !evidence) throw new Error('Demo artifacts missing');
fs.copyFileSync(video, path.join(destination, 'trustchain-demo.webm'));
fs.copyFileSync(evidence, path.join(destination, 'evidence.json'));
fs.writeFileSync(path.join(destination, 'index.html'), '<!doctype html><html lang="vi"><meta charset="utf-8"><title>TrustChain — demo local</title><style>body{background:#090b12;color:#edf1ff;font:18px/1.6 system-ui;max-width:1100px;margin:40px auto;padding:20px}video{width:100%;border-radius:20px}a{color:#8b9aff}</style><h1>TrustChain — demo giao dịch local</h1><p>Ví test tự ký qua adapter EIP-1193. Không phải MetaMask extension hoặc deployment testnet.</p><video controls src="trustchain-demo.webm"></video><p><a href="evidence.json">Receipt, CID và thông tin deployment</a></p></html>');
console.log(`Demo saved: ${destination}`);
