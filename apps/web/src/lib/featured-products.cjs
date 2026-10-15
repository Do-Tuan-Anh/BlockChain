const { createHash } = require('node:crypto');
const rotationMs = 30 * 60 * 1000;
function featuredSelection(candidates, now = Date.now()) {
  const rotation = Math.floor(now / rotationMs);
  const ids = candidates.map(({ id }) => ({ id, rank: createHash('sha256').update(`${rotation}:${id}`).digest('hex') })).sort((a, b) => a.rank.localeCompare(b.rank)).slice(0, 6).map(p => p.id);
  return { ids, rotation, refreshAt: (rotation + 1) * rotationMs };
}
module.exports = { featuredSelection };
