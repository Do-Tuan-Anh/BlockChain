const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/login-destination.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const moduleContext = { exports: {}, URL };
vm.runInNewContext(compiled, moduleContext);
const { loginDestination } = moduleContext.exports;
test('blocks external destinations, browser-stripped control characters and auth loops', () => {
  for (const value of [undefined, null, [], '//evil.example', 'https://evil.example', '/\t/evil.example', '/\\evil.example', '/en/../login', '/en/%2e%2e/welcome', '/vi/welcome?next=/vi', '/en/login', '/'.padEnd(2050, 'x')]) {
    assert.equal(loginDestination(value, 'vi'), '/vi', JSON.stringify(value));
  }
});
test('preserves valid internal continuations and query strings', () => {
  assert.equal(loginDestination('/en/profile/edit', 'en'), '/en/profile/edit');
  assert.equal(loginDestination('/vi/explore?q=abc&sort=newest', 'vi'), '/vi/explore?q=abc&sort=newest');
});
