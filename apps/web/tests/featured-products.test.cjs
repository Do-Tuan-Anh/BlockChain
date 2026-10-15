const { test } = require('node:test');
const assert = require('node:assert/strict');
const { featuredSelection } = require('../src/lib/featured-products.cjs');
test('selects at most six distinct real candidates; stable within 30 minutes, rotates at the boundary', () => {
  const candidates = Array.from({ length: 24 }, (_, i) => ({ id: `product-${i}` }));
  const first = featuredSelection(candidates, 0);
  assert.equal(first.ids.length, 6);
  assert.equal(new Set(first.ids).size, 6);
  assert.ok(first.ids.every(id => candidates.some(p => p.id === id)));
  assert.deepEqual(featuredSelection([...candidates].reverse(), 1799999), first);
  const next = featuredSelection(candidates, 1800000);
  assert.notDeepEqual(next.ids, first.ids);
  assert.equal(next.rotation, 1);
  assert.equal(next.refreshAt, 3600000);
  assert.deepEqual(featuredSelection([], 0).ids, []);
  assert.equal(featuredSelection(candidates.slice(0, 2), 0).ids.length, 2);
});
