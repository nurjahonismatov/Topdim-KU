/**
 * Topdik-KU Cloud Sync (crudcrud — no signup, works from browser)
 * All devices share the same listings/users/messages.
 */

var CLOUD_API = 'https://crudcrud.com/api/68f776fbd780473fbef0c82406d6bb4c/topdik';
var CLOUD_DOC = '6af9ea3d34f29c03e8901fb5';

function _byId(arr) {
  var m = new Map();
  (arr || []).forEach(function(x) { if (x && x.id) m.set(x.id, x); });
  return m;
}

function mergeById(a, b) {
  var map = _byId(a);
  (b || []).forEach(function(item) {
    if (!item || !item.id) return;
    var prev = map.get(item.id);
    if (!prev) { map.set(item.id, item); return; }
    var tNew = new Date(item.updatedAt || item.createdAt || 0).getTime();
    var tOld = new Date(prev.updatedAt || prev.createdAt || 0).getTime();
    if (tNew >= tOld) map.set(item.id, Object.assign({}, prev, item));
  });
  return Array.from(map.values());
}

function mergeCollects(a, b) {
  var out = Object.assign({}, a || {});
  Object.keys(b || {}).forEach(function(uid) {
    var set = {};
    (out[uid] || []).forEach(function(x) { set[x] = true; });
    ((b || {})[uid] || []).forEach(function(x) { set[x] = true; });
    out[uid] = Object.keys(set);
  });
  return out;
}

function mergeStates(local, cloud) {
  return {
    items: mergeById(local.items, cloud.items),
    users: mergeById(local.users, cloud.users),
    messages: mergeById(local.messages, cloud.messages),
    notifications: mergeById(local.notifications, cloud.notifications),
    collects: mergeCollects(local.collects, cloud.collects)
  };
}

function stateFingerprint(s) {
  try {
    return JSON.stringify({
      i: (s.items || []).map(function(x) { return x.id + ':' + (x.updatedAt || ''); }).sort(),
      u: (s.users || []).map(function(x) { return x.id; }).sort(),
      m: (s.messages || []).length
    });
  } catch (e) {
    return String(Date.now());
  }
}

function normalize(data) {
  if (!data || typeof data !== 'object') {
    return { items: [], users: [], messages: [], notifications: [], collects: {} };
  }
  return {
    items: Array.isArray(data.items) ? data.items : [],
    users: Array.isArray(data.users) ? data.users : [],
    messages: Array.isArray(data.messages) ? data.messages : [],
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    collects: data.collects && typeof data.collects === 'object' ? data.collects : {}
  };
}

var Cloud = {
  _busy: false,
  _ready: false,
  _listeners: [],
  _lastFp: '',
  _pushQueue: null,
  _status: 'local',
  _docId: CLOUD_DOC,

  isConfigured: function() { return true; },
  getStatus: function() { return this._status; },

  onReady: function(fn) {
    if (this._ready) fn();
    else this._listeners.push(fn);
  },

  _emitReady: function() {
    this._ready = true;
    this._listeners.forEach(function(fn) { try { fn(); } catch (e) {} });
    this._listeners = [];
    document.dispatchEvent(new CustomEvent('cloudStatus', { detail: { status: this._status, enabled: true } }));
  },

  fromLocal: function() {
    var load = function(key, fb) {
      try {
        var r = localStorage.getItem(key);
        return r ? JSON.parse(r) : fb;
      } catch (e) { return fb; }
    };
    return {
      items: load('topdik_items_v3', []),
      users: load('topdik_users', []),
      messages: load('topdik_messages', []),
      notifications: load('topdik_notifications', []),
      collects: load('topdik_collects', {})
    };
  },

  applyToLocal: function(data) {
    if (!data) return;
    try {
      localStorage.setItem('topdik_items_v3', JSON.stringify(data.items || []));
      localStorage.setItem('topdik_users', JSON.stringify(data.users || []));
      localStorage.setItem('topdik_messages', JSON.stringify(data.messages || []));
      localStorage.setItem('topdik_notifications', JSON.stringify(data.notifications || []));
      localStorage.setItem('topdik_collects', JSON.stringify(data.collects || {}));
    } catch (e) {
      console.warn('[Cloud] apply failed', e);
    }
  },

  pull: async function() {
    try {
      var res = await fetch(CLOUD_API + '/' + this._docId + '?t=' + Date.now(), { cache: 'no-store' });
      if (res.status === 404) {
        // recreate document
        var created = await this._createDoc(this.fromLocal());
        return created;
      }
      if (!res.ok) throw new Error('pull ' + res.status);
      var data = await res.json();
      this._status = 'online';
      return normalize(data);
    } catch (e) {
      console.warn('[Cloud] pull error', e);
      this._status = 'error';
      return null;
    }
  },

  _createDoc: async function(state) {
    var body = {
      items: state.items || [],
      users: state.users || [],
      messages: state.messages || [],
      notifications: state.notifications || [],
      collects: state.collects || {},
      meta: { app: 'topdik-ku', v: 1 }
    };
    var res = await fetch(CLOUD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('create ' + res.status);
    var data = await res.json();
    if (data._id) {
      this._docId = data._id;
      try { localStorage.setItem('topdik_cloud_doc', data._id); } catch (e) {}
    }
    this._status = 'online';
    return normalize(data);
  },

  push: async function(state) {
    if (this._busy) {
      this._pushQueue = state;
      return false;
    }
    this._busy = true;
    try {
      var body = {
        items: state.items || [],
        users: state.users || [],
        messages: state.messages || [],
        notifications: state.notifications || [],
        collects: state.collects || {},
        meta: { app: 'topdik-ku', v: 1, updatedAt: new Date().toISOString() }
      };
      var res = await fetch(CLOUD_API + '/' + this._docId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.status === 404) {
        await this._createDoc(state);
        return true;
      }
      if (!res.ok) {
        console.warn('[Cloud] push failed', res.status);
        this._status = 'error';
        return false;
      }
      this._status = 'online';
      this._lastFp = stateFingerprint(state);
      return true;
    } catch (e) {
      console.warn('[Cloud] push error', e);
      this._status = 'error';
      return false;
    } finally {
      this._busy = false;
      if (this._pushQueue) {
        var q = this._pushQueue;
        this._pushQueue = null;
        await this.push(q);
      }
    }
  },

  syncMerge: async function(forcePush) {
    if (forcePush === undefined) forcePush = false;
    var local = this.fromLocal();
    var cloud = await this.pull();
    var merged = cloud ? mergeStates(local, cloud) : local;
    var fp = stateFingerprint(merged);
    this.applyToLocal(merged);

    var cloudFp = cloud ? stateFingerprint(cloud) : '';
    if (forcePush || fp !== cloudFp) {
      await this.push(merged);
    }

    if (fp !== this._lastFp) {
      document.dispatchEvent(new CustomEvent('cloudSynced', { detail: merged }));
      document.dispatchEvent(new CustomEvent('cloudDataUpdated', { detail: merged }));
    }
    this._lastFp = fp;
    document.dispatchEvent(new CustomEvent('cloudStatus', { detail: { status: this._status, enabled: true } }));
    return merged;
  },

  syncFromCloud: async function() { return this.syncMerge(false); },
  syncToCloud: async function() { return this.syncMerge(true); },

  init: async function() {
    var savedDoc = null;
    try { savedDoc = localStorage.getItem('topdik_cloud_doc'); } catch (e) {}
    if (savedDoc) this._docId = savedDoc;

    try {
      await this.syncMerge(true);
    } catch (e) {
      console.warn('[Cloud] init', e);
      this._status = 'error';
    }
    this._emitReady();
    this._showBanner();

    var self = this;
    setInterval(function() { self.syncMerge(false).catch(function(){}); }, 6000);
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') self.syncMerge(false).catch(function(){});
    });
  },

  _showBanner: function() {
    if (document.getElementById('cloudBanner')) return;
    var el = document.createElement('div');
    el.id = 'cloudBanner';
    el.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;z-index:3000;max-width:420px;margin:0 auto;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.4;backdrop-filter:blur(12px);border:1px solid rgba(148,163,184,0.3);box-shadow:0 8px 24px rgba(0,0,0,0.12);';
    if (this._status === 'online') {
      el.style.background = 'rgba(16,185,129,0.18)';
      el.textContent = 'Cloud ulangan — boshqa qurilmada ham e\'lonlar ko\'rinadi.';
      setTimeout(function() { el.remove(); }, 3500);
    } else if (this._status === 'error') {
      el.style.background = 'rgba(239,68,68,0.15)';
      el.textContent = 'Cloud vaqtincha ishlamayapti. Internetni tekshiring yoki sahifani yangilang.';
    } else {
      el.style.background = 'rgba(245,158,11,0.15)';
      el.textContent = 'Mahalliy rejim...';
      setTimeout(function() { el.remove(); }, 2000);
    }
    document.body.appendChild(el);
  }
};

window.Cloud = Cloud;
