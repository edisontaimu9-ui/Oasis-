/*!
 * cnr.js — Chakudya Nutrition Registry (CNR) client for Oasis
 *
 * Talks to CNR through the Oasis proxy Worker (/cnr/*), which adds the API
 * key server-side. No key ever lives in the browser.
 *
 *   await CNR.searchFoods('nsima', { maxResults: 10 })
 *   await CNR.autocomplete('chic')
 *   await CNR.substitutes('rice', { limit: 5 })
 *   await CNR.compare(['nsima', 'rice', 'sweet potato'])
 *   await CNR.convert({ q: 'nsima', amount: '1 1/2', unit: 'cup' })
 *   await CNR.dri({ age: 8, sex: 'female' })
 *
 * Every call resolves (never throws): an array/object on success, or an empty
 * fallback ([] / null) on failure, so one failing lookup can't break a screen.
 * Check CNR.lastError for the reason of the most recent failure.
 */
(function (global) {
  'use strict';

  var BASE = 'https://oasis-ai-proxy-worker.edisontaimu9.workers.dev/cnr';
  var TIMEOUT_MS = 8000;
  var CACHE_TTL_MS = 5 * 60 * 1000;
  var MAX_CACHE = 200;

  var cache = new Map();      // url -> { t, data }
  var inflight = new Map();   // url -> Promise (dedupes identical concurrent calls)
  var cooldownUntil = 0;      // set after a 429 so we stop hammering the proxy

  function clean(v) { return typeof v === 'string' ? v.trim() : v; }

  function buildUrl(path, params) {
    var u = new URL(BASE + path);
    Object.keys(params || {}).forEach(function (k) {
      var v = clean(params[k]);
      if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v);
    });
    return u.toString();
  }

  async function get(path, params, fallback) {
    var url = buildUrl(path, params);

    var hit = cache.get(url);
    if (hit && Date.now() - hit.t < CACHE_TTL_MS) return hit.data;
    if (inflight.has(url)) return inflight.get(url);
    if (Date.now() < cooldownUntil) { CNR.lastError = 'rate_limited'; return fallback; }

    var p = (async function () {
      try {
        var res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (res.status === 429) {
          cooldownUntil = Date.now() + 15000;
          CNR.lastError = 'rate_limited';
          return fallback;
        }
        if (!res.ok) { CNR.lastError = 'http_' + res.status; return fallback; }
        var json = await res.json();
        var data = json && json.data !== undefined ? json.data : fallback;
        if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
        cache.set(url, { t: Date.now(), data: data });
        CNR.lastError = null;
        return data;
      } catch (e) {
        CNR.lastError = e && e.name === 'TimeoutError' ? 'timeout' : 'network';
        return fallback;
      } finally {
        inflight.delete(url);
      }
    })();

    inflight.set(url, p);
    return p;
  }

  var CNR = {
    lastError: null,

    /** Typo-tolerant fuzzy search. Returns an array of food rows. */
    searchFoods: async function (q, opts) {
      opts = opts || {};
      if (!clean(q)) return [];
      var d = await get('/foods/search', {
        q: q, max_results: opts.maxResults || 10, min_similarity: opts.minSimilarity
      }, []);
      return Array.isArray(d) ? d : (d ? [d] : []);
    },

    /** Search-as-you-type suggestions. Returns an array of strings. */
    autocomplete: async function (q, opts) {
      opts = opts || {};
      if (!clean(q) || String(q).trim().length < 2) return [];
      var d = await get('/foods/autocomplete', { q: q, max_results: opts.maxResults || 8 }, []);
      return Array.isArray(d) ? d : [];
    },

    /** Nutritionally close substitutes for a food name. */
    substitutes: async function (foodName, opts) {
      opts = opts || {};
      if (!clean(foodName)) return [];
      var d = await get('/foods/substitutes', { food_name: foodName, limit: opts.limit || 5 }, []);
      return Array.isArray(d) ? d : (d ? [d] : []);
    },

    /** Side-by-side nutrient comparison of 2-6 food names. */
    compare: async function (names) {
      var list = (names || []).map(clean).filter(Boolean);
      if (list.length < 2 || list.length > 6) return null;
      return get('/foods/compare', { foods: list.join(',') }, null);
    },

    /** Household <-> standard measures. Give { q } or { id }, plus amount/unit. */
    convert: async function (opts) {
      opts = opts || {};
      if (!clean(opts.q) && !opts.id) return null;
      return get('/foods/convert', {
        q: opts.q, id: opts.id, amount: opts.amount, unit: opts.unit
      }, null);
    },

    /** Dietary reference intakes by life stage, or by age + sex. */
    dri: async function (opts) {
      opts = opts || {};
      return get('/dri', {
        life_stage: opts.lifeStage, age: opts.age, sex: opts.sex,
        life_stage_type: opts.lifeStageType, nutrient: opts.nutrient
      }, null);
    },

    /** Every unit CNR can convert, for building unit pickers. */
    measures: async function () {
      return get('/measures', {}, null);
    },

    /** Debounce helper for search-as-you-type inputs. */
    debounce: function (fn, ms) {
      var t;
      return function () {
        var args = arguments, self = this;
        clearTimeout(t);
        return new Promise(function (resolve) {
          t = setTimeout(function () { resolve(fn.apply(self, args)); }, ms || 250);
        });
      };
    },

    clearCache: function () { cache.clear(); }
  };

  global.CNR = CNR;
})(typeof window !== 'undefined' ? window : globalThis);
