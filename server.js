'use strict';

const express = require('express');
const path = require('path');
const https = require('https');
const cache = require('./cache');
const { normalize, getMockGeocode, getMockReverse } = require('./mockData');
const { authMiddleware, recordHit, recordMiss, getUsage, getKeyMeta } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;
const startTime = Date.now();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime_seconds: Math.round((Date.now() - startTime) / 1000) });
});

// ── Geocode ─────────────────────────────────────────────────────────────────
app.post('/v1/geocode', authMiddleware, async (req, res) => {
  const { address } = req.body;
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'address field required', code: 'invalid_request' });
  }

  const cacheKey = 'geo:' + normalize(address);

  if (cache.has(cacheKey)) {
    recordHit(req.apiKey);
    const hit = cache.get(cacheKey);
    return res.json({ ...hit, cache: 'hit', ttl_seconds: cache.ttlSeconds(cacheKey) });
  }

  // Cache MISS — resolve
  let result;
  if (process.env.OPENCAGE_API_KEY) {
    result = await fetchOpenCage(address);
  } else {
    result = getMockGeocode(address);
  }

  cache.set(cacheKey, result);
  recordMiss(req.apiKey);
  return res.json({ ...result, cache: 'miss', ttl_seconds: 86400 });
});

// ── Reverse geocode ──────────────────────────────────────────────────────────
app.post('/v1/reverse', authMiddleware, (req, res) => {
  const { lat, lng } = req.body;
  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'lat and lng fields required', code: 'invalid_request' });
  }

  const cacheKey = `rev:${parseFloat(lat).toFixed(6)}:${parseFloat(lng).toFixed(6)}`;

  if (cache.has(cacheKey)) {
    recordHit(req.apiKey);
    const hit = cache.get(cacheKey);
    return res.json({ ...hit, cache: 'hit', ttl_seconds: cache.ttlSeconds(cacheKey) });
  }

  const result = getMockReverse(parseFloat(lat), parseFloat(lng));
  cache.set(cacheKey, result);
  recordMiss(req.apiKey);
  return res.json({ ...result, cache: 'miss', ttl_seconds: 86400 });
});

// ── Usage ────────────────────────────────────────────────────────────────────
app.get('/v1/usage', authMiddleware, (req, res) => {
  const u = getUsage(req.apiKey);
  const meta = getKeyMeta(req.apiKey);
  const total = u.hits + u.misses;
  const hitRate = total > 0 ? parseFloat((u.hits / total).toFixed(3)) : 0;
  const creditSavingsUsd = parseFloat((u.hits * 0.005).toFixed(2)); // $5/1K = $0.005 each
  res.json({
    api_key: req.apiKey,
    period: u.period,
    calls_total: total,
    cache_hits: u.hits,
    cache_misses: u.misses,
    hit_rate: hitRate,
    credits_used: u.credits_used,
    credits_remaining: meta.credits_total - u.credits_used,
    plan: meta.plan,
    estimated_savings_usd: creditSavingsUsd
  });
});

// ── OpenAPI spec ─────────────────────────────────────────────────────────────
app.get('/openapi.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'openapi.json'));
});

// ── Docs page ────────────────────────────────────────────────────────────────
app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'docs.html'));
});

// ── OpenCage upstream (when key is set) ──────────────────────────────────────
function fetchOpenCage(address) {
  return new Promise((resolve, reject) => {
    const key = process.env.OPENCAGE_API_KEY;
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${key}&limit=1`;
    https.get(url, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.results && json.results.length > 0) {
            const r = json.results[0];
            resolve({
              lat: r.geometry.lat,
              lng: r.geometry.lng,
              formatted: r.formatted,
              confidence: r.confidence
            });
          } else {
            resolve(getMockGeocode(address));
          }
        } catch (e) {
          resolve(getMockGeocode(address));
        }
      });
    }).on('error', () => resolve(getMockGeocode(address)));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`GeoCache API running on port ${PORT}`);
});
