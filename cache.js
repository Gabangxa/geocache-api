'use strict';

class TTLCache {
  constructor() {
    this._store = new Map();
  }

  set(key, value, ttlSeconds = 86400) {
    this._store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return null;
    }
    return entry.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  ttlSeconds(key) {
    const entry = this._store.get(key);
    if (!entry) return 0;
    return Math.max(0, Math.round((entry.expiresAt - Date.now()) / 1000));
  }

  size() {
    return this._store.size;
  }
}

module.exports = new TTLCache();
