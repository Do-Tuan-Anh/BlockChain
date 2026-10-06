const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const file = path.join(__dirname, '../apps/web/.env');
let content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : fs.readFileSync(`${file}.example`, 'utf8');
const defaults = {
  NEXTAUTH_URL: 'http://localhost:3000', NEXTAUTH_SECRET: randomBytes(32).toString('hex'),
  SMTP_HOST: '127.0.0.1', SMTP_PORT: '1025', SMTP_SECURE: 'false',
  MAIL_FROM: 'TrustChain <noreply@trustchain.local>',
};
for (const [key, value] of Object.entries(defaults)) {
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (!pattern.test(content)) content += `\n${key}="${value}"\n`;
  else if (key === 'NEXTAUTH_SECRET' && /^NEXTAUTH_SECRET=["']?["']?\s*$/m.test(content)) content = content.replace(pattern, `${key}="${value}"`);
}
fs.writeFileSync(file, content);
console.log('Local authentication environment is ready. Existing values were preserved.');
