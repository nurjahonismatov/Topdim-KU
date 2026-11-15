/**
 * Topdik-KU Data Layer
 * localStorage demo + ready for Supabase.
 * Guest posting is allowed (no account required).
 */

const STORAGE_KEYS = {
  items: 'topdik_items_v3',
  users: 'topdik_users',
  session: 'topdik_session',
  collects: 'topdik_collects',
  messages: 'topdik_messages',
  notifications: 'topdik_notifications',
  guestId: 'topdik_guest_id'
};

const CATEGORIES = [
  { id: 'electronics', icon: 'electronics' },
  { id: 'documents', icon: 'documents' },
  { id: 'keys', icon: 'keys' },
  { id: 'bags', icon: 'bags' },
  { id: 'clothes', icon: 'clothes' },
  { id: 'jewelry', icon: 'jewelry' },
  { id: 'pets', icon: 'pets' },
  { id: 'other', icon: 'other' }
];

const CITIES = [
  'Toshkent', 'Samarqand', 'Buxoro', 'Andijon', 'Namangan',
  'Farg\'ona', 'Nukus', 'Xorazm', 'Qashqadaryo', 'Surxondaryo',
  'Jizzax', 'Sirdaryo', 'Navoiy'
];

// No fake demo listings — platform starts empty
const DEMO_ITEMS = [];

function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function load(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getGuestId() {
  let id = localStorage.getItem(STORAGE_KEYS.guestId);
  if (!id) {
    id = uid('guest');
    localStorage.setItem(STORAGE_KEYS.guestId, id);
  }
  return id;
}

// Seed only if empty (new key version)
function ensureSeed() {
  if (!localStorage.getItem(STORAGE_KEYS.items)) {
    save(STORAGE_KEYS.items, DEMO_ITEMS);
  }
}
ensureSeed();

const DataStore = {
  categories: CATEGORIES,
  cities: CITIES,

  getItems(filters = {}) {
    let items = load(STORAGE_KEYS.items, []);

    if (filters.type && filters.type !== 'all') {
      items = items.filter(i => i.type === filters.type);
    }
    if (filters.category) {
      items = items.filter(i => i.category === filters.category);
    }
    if (filters.city) {
      items = items.filter(i => i.city === filters.city);
    }
    if (filters.status) {
      items = items.filter(i => i.status === filters.status);
    }
    if (filters.q) {
      const q = filters.q.toLowerCase();
      items = items.filter(i =>
        (i.title || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.location || '').toLowerCase().includes(q)
      );
    }
    if (filters.dateFrom) items = items.filter(i => i.date >= filters.dateFrom);
    if (filters.dateTo) items = items.filter(i => i.date <= filters.dateTo);

    const sort = filters.sort || 'newest';
    if (sort === 'newest') {
      items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === 'oldest') {
      items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sort === 'updated') {
      items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    return items;
  },

  getItem(id) {
    return load(STORAGE_KEYS.items, []).find(i => i.id === id) || null;
  },

  createItem(data) {
    const items = load(STORAGE_KEYS.items, []);
    const session = this.getSession();
    const isGuest = !session;

    const item = {
      id: uid('item'),
      status: 'active',
      images: data.images || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isGuest,
      userId: session ? session.id : getGuestId(),
      userName: session ? session.name : (data.contactName || 'Mehmon'),
      contactPhone: data.contactPhone || null,
      contactEmail: data.contactEmail || null,
      ...data
    };

    // Ensure required fields not overwritten incorrectly
    item.type = data.type;
    item.title = data.title;
    item.category = data.category;
    item.description = data.description;
    item.location = data.location;
    item.city = data.city;
    item.date = data.date;
    item.time = data.time || null;

    items.unshift(item);
    save(STORAGE_KEYS.items, items);
    this.checkMatches(item);
    if (window.Cloud) Cloud.syncToCloud();
    return item;
  },

  updateItem(id, updates) {
    const items = load(STORAGE_KEYS.items, []);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
    save(STORAGE_KEYS.items, items);
    if (window.Cloud) Cloud.syncToCloud();
    return items[idx];
  },

  deleteItem(id) {
    let items = load(STORAGE_KEYS.items, []);
    items = items.filter(i => i.id !== id);
    save(STORAGE_KEYS.items, items);
    if (window.Cloud) Cloud.syncToCloud();
  },

  checkMatches(newItem) {
    const opposite = newItem.type === 'lost' ? 'found' : 'lost';
    const candidates = this.getItems({ type: opposite, status: 'active' });

    const matches = candidates.filter(c => {
      let score = 0;
      if (c.category === newItem.category) score += 40;
      if (c.city === newItem.city) score += 25;
      const titleWords = (newItem.title || '').toLowerCase().split(/\s+/);
      const cTitle = (c.title || '').toLowerCase();
      titleWords.forEach(w => { if (w.length > 2 && cTitle.includes(w)) score += 10; });
      const d1 = new Date(newItem.date);
      const d2 = new Date(c.date);
      const diffDays = Math.abs((d1 - d2) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) score += 15;
      return score >= 50;
    });

    matches.forEach(m => {
      this.addNotification({
        userId: newItem.userId,
        type: 'match',
        title: 'Yangi moslik',
        body: `"${m.title}" e'loni o'xshash`,
        itemId: m.id,
        relatedItemId: newItem.id
      });
    });

    return matches;
  },

  getMatchesFor(itemId) {
    const item = this.getItem(itemId);
    if (!item) return [];
    const opposite = item.type === 'lost' ? 'found' : 'lost';
    return this.getItems({ type: opposite, status: 'active', category: item.category })
      .filter(c => c.id !== itemId)
      .slice(0, 4);
  },

  getSession() {
    return load(STORAGE_KEYS.session, null);
  },

  setSession(user) {
    save(STORAGE_KEYS.session, user);
  },

  logout() {
    localStorage.removeItem(STORAGE_KEYS.session);
  },

  register({ name, email, phone, password }) {
    const users = load(STORAGE_KEYS.users, []);
    if (email && users.some(u => u.email === email)) {
      throw new Error('Bu email allaqachon ro\'yxatdan o\'tgan');
    }
    const user = {
      id: uid('user'),
      name,
      email: email || null,
      phone: phone || null,
      passwordHash: btoa(password),
      verified: true,
      role: 'user',
      createdAt: new Date().toISOString(),
      avatar: null
    };
    users.push(user);
    save(STORAGE_KEYS.users, users);
    if (window.Cloud) Cloud.syncToCloud();
    return user;
  },

  login({ email, phone, password }) {
    const users = load(STORAGE_KEYS.users, []);
    const user = users.find(u =>
      (email && u.email === email) || (phone && u.phone === phone)
    );
    if (!user || user.passwordHash !== btoa(password)) {
      throw new Error('Email yoki parol noto\'g\'ri');
    }
    const session = { ...user };
    delete session.passwordHash;
    this.setSession(session);
    return session;
  },

  // Demo OTP — code is returned and shown in UI
  _otpStore: {},

  sendOTP(target) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = Date.now() + 2 * 60 * 1000;
    this._otpStore[target] = { code, expires, attempts: 0 };
    // Return code so UI can display it in demo mode
    return { success: true, expiresIn: 120, demoCode: code };
  },

  verifyOTP(target, code) {
    const entry = this._otpStore[target];
    if (!entry) throw new Error('Kod yuborilmagan');
    if (Date.now() > entry.expires) {
      delete this._otpStore[target];
      throw new Error('Kod muddati tugagan');
    }
    entry.attempts++;
    if (entry.attempts > 5) {
      delete this._otpStore[target];
      throw new Error('Juda ko\'p urinish');
    }
    if (entry.code !== code) throw new Error('Kod noto\'g\'ri');
    delete this._otpStore[target];
    return true;
  },

  getCollects(userId) {
    const all = load(STORAGE_KEYS.collects, {});
    return all[userId] || [];
  },

  toggleCollect(userId, itemId) {
    const all = load(STORAGE_KEYS.collects, {});
    if (!all[userId]) all[userId] = [];
    const idx = all[userId].indexOf(itemId);
    if (idx >= 0) all[userId].splice(idx, 1);
    else all[userId].push(itemId);
    save(STORAGE_KEYS.collects, all);
    if (window.Cloud) Cloud.syncToCloud();
    return all[userId].includes(itemId);
  },

  isCollected(userId, itemId) {
    return this.getCollects(userId).includes(itemId);
  },

  getConversations(userId) {
    const msgs = load(STORAGE_KEYS.messages, []);
    const map = {};
    msgs.forEach(m => {
      if (m.from === userId || m.to === userId) {
        const other = m.from === userId ? m.to : m.from;
        const key = [userId, other, m.itemId].sort().join('_');
        if (!map[key] || new Date(m.createdAt) > new Date(map[key].lastAt)) {
          map[key] = {
            key,
            otherId: other,
            otherName: m.from === userId ? m.toName : m.fromName,
            itemId: m.itemId,
            itemTitle: m.itemTitle,
            lastMessage: m.text,
            lastAt: m.createdAt,
            unread: 0
          };
        }
      }
    });
    return Object.values(map).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
  },

  getMessages(userId, otherId, itemId) {
    return load(STORAGE_KEYS.messages, [])
      .filter(m =>
        m.itemId === itemId &&
        ((m.from === userId && m.to === otherId) || (m.from === otherId && m.to === userId))
      )
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  },

  sendMessage({ from, fromName, to, toName, itemId, itemTitle, text }) {
    const msgs = load(STORAGE_KEYS.messages, []);
    const msg = {
      id: uid('msg'),
      from, fromName, to, toName,
      itemId, itemTitle, text,
      read: false,
      createdAt: new Date().toISOString()
    };
    msgs.push(msg);
    save(STORAGE_KEYS.messages, msgs);
    this.addNotification({
      userId: to,
      type: 'message',
      title: 'Yangi xabar',
      body: `${fromName}: ${text.slice(0, 50)}`,
      itemId
    });
    return msg;
  },

  getNotifications(userId) {
    return load(STORAGE_KEYS.notifications, [])
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  addNotification(data) {
    const list = load(STORAGE_KEYS.notifications, []);
    list.unshift({
      id: uid('notif'),
      read: false,
      createdAt: new Date().toISOString(),
      ...data
    });
    save(STORAGE_KEYS.notifications, list.slice(0, 100));
    if (window.Cloud) Cloud.syncToCloud();
  },

  markNotifRead(id) {
    const list = load(STORAGE_KEYS.notifications, []);
    const n = list.find(x => x.id === id);
    if (n) n.read = true;
    save(STORAGE_KEYS.notifications, list);
  },

  getStats() {
    const items = load(STORAGE_KEYS.items, []);
    const users = load(STORAGE_KEYS.users, []);
    const returned = items.filter(i => i.status === 'returned').length;
    return {
      found: items.filter(i => i.type === 'found').length,
      lost: items.filter(i => i.type === 'lost').length,
      returned,
      users: users.length,
      success: items.length ? Math.round((returned / items.length) * 100) : 0
    };
  }
};

window.DataStore = DataStore;
window.CATEGORIES = CATEGORIES;
window.CITIES = CITIES;
