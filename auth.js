'use strict';

const DEMO_KEYS = {
  'gca_demo_key': { plan: 'free', credits_total: 500 },
  'gca_dev_key':  { plan: 'developer', credits_total: 5000 }
};

// In-memory usage store: key -> { hits, misses, credits_used, period }
const usage = new Map();

function getOrInitUsage(apiKey) {
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  if (!usage.has(apiKey)) {
    usage.set(apiKey, { hits: 0, misses: 0, credits_used: 0, period });
  }
  return usage.get(apiKey);
}

function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key', code: 'auth_missing', docs: '/docs' });
  }
  if (!DEMO_KEYS[apiKey]) {
    return res.status(403).json({ error: 'Invalid API key', code: 'auth_invalid', docs: '/docs' });
  }
  req.apiKey = apiKey;
  req.keyMeta = DEMO_KEYS[apiKey];
  req.keyUsage = getOrInitUsage(apiKey);
  next();
}

function recordHit(apiKey) {
  const u = getOrInitUsage(apiKey);
  u.hits++;
}

function recordMiss(apiKey) {
  const u = getOrInitUsage(apiKey);
  u.misses++;
  u.credits_used++;
}

function getUsage(apiKey) {
  return getOrInitUsage(apiKey);
}

function getKeyMeta(apiKey) {
  return DEMO_KEYS[apiKey];
}

module.exports = { authMiddleware, recordHit, recordMiss, getUsage, getKeyMeta };
