const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { saveCheckpoint } = require('./checkpoint-chain.cjs');
test('partial snapshots cannot overwrite the last complete checkpoint; valid snapshots rotate', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trustchain-checkpoint-'));
  const bytes = number => Buffer.from(JSON.stringify({ block: { number: '0x' + number.toString(16) }, best_block_number: number, accounts: {}, blocks: [], transactions: [] }));
  const first = bytes(1), second = bytes(2);
  saveCheckpoint(dir, first);
  assert.throws(() => saveCheckpoint(dir, Buffer.from('{"block":')), SyntaxError);
  assert.deepEqual(fs.readFileSync(path.join(dir, 'latest.json')), first);
  saveCheckpoint(dir, second);
  assert.deepEqual(fs.readFileSync(path.join(dir, 'latest.json')), second);
  assert.deepEqual(fs.readFileSync(path.join(dir, 'previous.json')), first);
  assert.equal(saveCheckpoint(dir, second), false);
});
