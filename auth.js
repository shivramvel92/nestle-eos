const crypto = require("crypto");
const os     = require("os");
// ── Nestlé EOS Authentication System ─────────────────────────────

// ── Password hashing (no bcrypt dependency needed) ────────────────
function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const { hash: h } = hashPassword(password, salt);
  return h === hash;
}

// ── JWT-like token (signed HMAC) ──────────────────────────────────
// Stable secret — won't rotate on restart (uses a fixed seed + machine hostname)
const JWT_SECRET = crypto.createHash("sha256").update("nestle-eos-2026-" + os.hostname()).digest("hex");
const TOKEN_TTL  = 8 * 60 * 60 * 1000; // 8 hours

function createToken(user) {
  const payload = JSON.stringify({ userId: user.username, role: user.role, exp: Date.now() + TOKEN_TTL });
  const sig     = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
  return Buffer.from(payload).toString("base64") + "." + sig;
}

function verifyToken(token) {
  try {
    const [b64, sig] = token.split(".");
    const payload    = Buffer.from(b64, "base64").toString("utf8");
    const expected   = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
    if (sig !== expected) return null;
    const data = JSON.parse(payload);
    if (Date.now() > data.exp) return null;
    return data;
  } catch { return null; }
}

// ── Default users ─────────────────────────────────────────────────
function buildDefaultUsers() {
  const users = [
    { username:"admin",          password:"Admin@Nestle2024",   name:"Sarah Mitchell",   role:"Global HR Director",          zone:"HQ – Vevey",    access:"admin" },
    { username:"sarah.mitchell", password:"Nestle@2024",        name:"Sarah Mitchell",   role:"HR Director",                 zone:"HQ – Vevey",    access:"full"  },
    { username:"thomas.brauer",  password:"Nestle@2024",        name:"Thomas Brauer",    role:"EMENA HR Business Partner",   zone:"EMENA",         access:"zone"  },
    { username:"priya.nair",     password:"Nestle@2024",        name:"Priya Nair",       role:"AOA HR Manager",              zone:"AOA",           access:"zone"  },
    { username:"carlos.mendoza", password:"Nestle@2024",        name:"Carlos Mendoza",   role:"Global Safety Officer",       zone:"AMS",           access:"safety"},
    { username:"wei.zhang",      password:"Nestle@2024",        name:"Wei Zhang",        role:"Factory Operations Manager",  zone:"GC",            access:"ops"   },
    { username:"nestle.demo",    password:"Demo@2024",          name:"Demo User",        role:"HR Viewer",                   zone:"Global",        access:"view"  },
  ];
  const map = {};
  users.forEach(u => {
    const { hash, salt } = hashPassword(u.password);
    map[u.username] = { username:u.username, name:u.name, role:u.role, zone:u.zone, access:u.access, hash, salt, createdAt:new Date().toISOString() };
  });
  return map;
}

// In-memory user store
const USERS = buildDefaultUsers();
const SESSIONS = new Set(); // active token blacklist on logout

module.exports = { hashPassword, verifyPassword, createToken, verifyToken, USERS, SESSIONS };