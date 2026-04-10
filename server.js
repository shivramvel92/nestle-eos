const express  = require("express");
const cors     = require("cors");
const crypto   = require("crypto");
const { hashPassword, verifyPassword, createToken, verifyToken, USERS, SESSIONS } = require("./auth");
const DB       = require("./database");

// Auto-seed employees if DB is empty
if (DB.countEmployees() === 0) {
  try { require("./seed_employees"); console.log("✅ Auto-seeded employees"); }
  catch(e) { console.error("⚠️ Seed error:", e.message); }
}

const app      = express();

// ── Config ────────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const SF_BASE_URL   = "https://apisalesdemo2.successfactors.eu";
const SF_USERNAME   = "sfapi@SFCPART001970";
const SF_PASSWORD   = "Admin@2024";
const SF_BASIC      = "Basic " + Buffer.from(SF_USERNAME + ":" + SF_PASSWORD).toString("base64");

// Allow all origins in production (Railway serves frontend from same domain)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ── Serve React build in production ──────────────────────────────
const path = require("path");
const fs   = require("fs");

// Possible build locations
const buildPaths = [
  path.join(__dirname, "client", "build"),
  path.join(__dirname, "build"),
];
const clientBuild = buildPaths.find(p => fs.existsSync(p));

if (clientBuild) {
  console.log("✅ Serving React build from:", clientBuild);
  app.use(express.static(clientBuild));
} else {
  console.log("⚠️  No React build found. API-only mode.");
  app.get("/", function(req, res) { res.json({ status:"ok", message:"Nestlé EOS API running. React build not found." }); });
}

// ── SF OData helper ───────────────────────────────────────────────
async function sfGet(path) {
  if (typeof fetch === "undefined") throw new Error("Upgrade to Node 18+ for built-in fetch support");
  const res  = await fetch(SF_BASE_URL + path, { headers: { Authorization: SF_BASIC, Accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) throw new Error("SF " + res.status + ": " + text.slice(0,300));
  return JSON.parse(text);
}

// ── Auth middleware ───────────────────────────────────────────────
function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error:"Not authenticated" });
  if (SESSIONS.has(token)) return res.status(401).json({ error:"Session expired" });
  const data = verifyToken(token);
  if (!data) return res.status(401).json({ error:"Invalid or expired token" });
  req.user = USERS[data.userId];
  if (!req.user) return res.status(401).json({ error:"User not found" });
  next();
}

// Soft auth — sets req.user if token present but never blocks
function softAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (token && !SESSIONS.has(token)) {
    const data = verifyToken(token);
    if (data) req.user = USERS[data.userId] || null;
  }
  if (!req.user) req.user = { username:"anonymous", name:"Anonymous", role:"Viewer", access:"view" };
  next();
}

// ══════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════════════
app.post("/auth/login", function(req, res) {
  const username = (req.body.username || "").trim().toLowerCase();
  const password = req.body.password || "";
  const user     = USERS[username];
  if (!user || !verifyPassword(password, user.hash, user.salt)) {
    return res.status(401).json({ ok:false, error:"Invalid username or password" });
  }
  const token = createToken(user);
  DB.audit("LOGIN", "user", username, null, { username }, username);
  res.json({ ok:true, token, user:{ username:user.username, name:user.name, role:user.role, zone:user.zone, access:user.access, avatar:(user.name.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase()) } });
});

app.post("/auth/logout", requireAuth, function(req, res) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  SESSIONS.add(token);
  DB.audit("LOGOUT", "user", req.user.username, null, null, req.user.username);
  res.json({ ok:true });
});

app.get("/auth/me", requireAuth, function(req, res) {
  const u = req.user;
  res.json({ username:u.username, name:u.name, role:u.role, zone:u.zone, access:u.access, avatar:(u.name.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase()) });
});

app.get("/auth/users", requireAuth, function(req, res) {
  if (req.user.access !== "admin") return res.status(403).json({ error:"Admin only" });
  res.json(Object.values(USERS).map(u => ({ username:u.username, name:u.name, role:u.role, zone:u.zone, access:u.access, createdAt:u.createdAt })));
});

app.post("/auth/users", requireAuth, function(req, res) {
  if (req.user.access !== "admin") return res.status(403).json({ error:"Admin only" });
  const { username, password, name, role, zone, access } = req.body;
  if (!username || !password || !name) return res.status(400).json({ error:"Username, password and name required" });
  if (USERS[username.toLowerCase()]) return res.status(409).json({ error:"User already exists" });
  if (password.length < 8) return res.status(400).json({ error:"Password must be at least 8 characters" });
  const ph = hashPassword(password);
  USERS[username.toLowerCase()] = { username:username.toLowerCase(), name, role:role||"HR Viewer", zone:zone||"Global", access:access||"view", hash:ph.hash, salt:ph.salt, createdAt:new Date().toISOString() };
  DB.audit("CREATE_USER", "user", username, null, { username, name, role }, req.user.username);
  res.json({ ok:true });
});

app.delete("/auth/users/:username", requireAuth, function(req, res) {
  if (req.user.access !== "admin") return res.status(403).json({ error:"Admin only" });
  const username = req.params.username.toLowerCase();
  if (username === req.user.username) return res.status(400).json({ error:"Cannot delete yourself" });
  if (!USERS[username]) return res.status(404).json({ error:"User not found" });
  delete USERS[username];
  DB.audit("DELETE_USER", "user", username, { username }, null, req.user.username);
  res.json({ ok:true });
});

app.put("/auth/users/:username/password", requireAuth, function(req, res) {
  const username = req.params.username.toLowerCase();
  if (req.user.access !== "admin" && req.user.username !== username) return res.status(403).json({ error:"Not allowed" });
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error:"Password must be at least 8 characters" });
  if (!USERS[username]) return res.status(404).json({ error:"User not found" });
  const ph = hashPassword(newPassword);
  USERS[username].hash = ph.hash; USERS[username].salt = ph.salt;
  DB.audit("CHANGE_PASSWORD", "user", username, null, null, req.user.username);
  res.json({ ok:true });
});

// ══════════════════════════════════════════════════════════════════
// FACTORY ROUTES
// ══════════════════════════════════════════════════════════════════
app.get("/api/factories", function(req, res) {
  res.json(DB.getFactories());
});

app.get("/api/factories/:id", softAuth, function(req, res) {
  const f = DB.getFactory(req.params.id);
  if (!f) return res.status(404).json({ error:"Factory not found" });
  res.json(f);
});

app.put("/api/factories/:id", softAuth, function(req, res) {
  const allowed = ["workers","risk_level","utilization","throughput","nce_score","fssc_coverage"];
  const data = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
  DB.updateFactory(req.params.id, data);
  DB.audit("UPDATE_FACTORY", "factory", req.params.id, null, data, req.user.username);
  res.json({ ok:true, factory: DB.getFactory(req.params.id) });
});

// ══════════════════════════════════════════════════════════════════
// EMPLOYEE ROUTES (SF + DB hybrid)
// ══════════════════════════════════════════════════════════════════

// WorkSchedule cache
let wsCache = null, wsCacheExp = 0;
const SF_DAY_MAP = { "1":"Sun","2":"Mon","3":"Tue","4":"Wed","5":"Thu","6":"Fri","7":"Sat" };

async function getWorkSchedules() {
  if (wsCache && Date.now() < wsCacheExp) return wsCache;
  const data = await sfGet("/odata/v2/WorkSchedule?$select=externalCode,externalName_en_US,averageHoursPerDay,averageHoursPerWeek,averageWorkingDaysPerWeek&$format=json&$top=200");
  const schedules = data && data.d && data.d.results || [];
  const result = {};
  for (const ws of schedules.slice(0,20)) {
    result[ws.externalCode] = { code:ws.externalCode, name:ws.externalName_en_US||ws.externalCode, hoursPerDay:parseFloat(ws.averageHoursPerDay)||8, days:[] };
    try {
      const dayData = await Promise.race([
        sfGet("/odata/v2/WorkScheduleDay?$filter=" + encodeURIComponent("WorkSchedule_externalCode eq '"+ws.externalCode+"'") + "&$select=day,workingHours&$format=json&$top=14"),
        new Promise((_,reject)=>setTimeout(()=>reject(new Error("timeout")),5000))
      ]);
      result[ws.externalCode].days = dayData && dayData.d && dayData.d.results || [];
    } catch(e) {}
  }
  wsCache = result; wsCacheExp = Date.now() + 30*60*1000;
  return result;
}

app.get("/api/employees", softAuth, function(req, res) {
  const factoryId = req.query.factory || "ALL";
  const top    = Math.min(Number(req.query.top||100), 500);
  const skip   = Number(req.query.skip||0);
  const search = req.query.search || "";
  const dept   = req.query.dept   || "ALL";
  const shift  = req.query.shift  || "ALL";
  const risk   = req.query.risk   || "ALL";

  const employees = DB.getEmployees(factoryId, top, skip, search, dept, shift, risk);
  const total     = DB.countEmployees(factoryId !== "ALL" ? factoryId : null);

  res.json({ total, skip, top, source:"db", employees: employees.map(mapDbEmployee) });
});

app.get("/api/employees/stats", softAuth, function(req, res) {
  res.json(DB.getEmployeeStats(req.query.factory));
});

app.get("/api/employees/depts", softAuth, function(req, res) {
  res.json(DB.getAllDepts(req.query.factory));
});

function mapDbEmployee(e) {
  let workDays = ["Mon","Tue","Wed","Thu","Fri"];
  try { workDays = typeof e.work_days==="string" ? JSON.parse(e.work_days) : (e.work_days||workDays); } catch(x) {}
  return { ...e, workDays, name:(e.first_name+" "+e.last_name).trim(), avatar:((e.first_name||"?")[0]+(e.last_name||"?")[0]).toUpperCase() };
}

app.get("/api/employees/:id", softAuth, function(req, res) {
  const emp = DB.getEmployee(req.params.id);
  if (!emp) return res.status(404).json({ error:"Employee not found" });
  res.json(mapDbEmployee(emp));
});

app.put("/api/employees/:id", softAuth, function(req, res) {
  const allowed = ["job_title","department","shift","schedule_code","schedule_name","standard_hours","overtime_hrs","fatigue_risk","fatigue_score","safety_score","work_days","status"];
  const data = {};
  allowed.forEach(k=>{ if(req.body[k]!==undefined) data[k]=req.body[k]; });
  const old = DB.getEmployee(req.params.id);
  DB.updateEmployee(req.params.id, data);
  DB.audit("UPDATE_EMPLOYEE", "employee", req.params.id, old, data, req.user.username);
  res.json({ ok:true, employee: mapDbEmployee(DB.getEmployee(req.params.id)) });
});

// ══════════════════════════════════════════════════════════════════
// AI ACTIONS — Save and apply
// ══════════════════════════════════════════════════════════════════
app.post("/api/employees/:id/actions", softAuth, function(req, res) {
  const { action_type, action_verb, title, detail, outcome, value } = req.body;
  const empId = req.params.id;
  const emp   = DB.getEmployee(empId);
  if (!emp) return res.status(404).json({ error:"Employee not found" });

  // Apply action to employee record
  const updates = {};
  if (action_type === "cap_hours" && value) {
    updates.overtime_hrs = Number(value);
    updates.fatigue_risk = value<=44?"LOW":value<=50?"MEDIUM":"HIGH";
    updates.fatigue_score = Math.max(0, emp.fatigue_score - 20);
    updates.status = "Active";
  }
  if (action_type === "add_rest_days" && value) {
    const restDays = Array.isArray(value) ? value : JSON.parse(value);
    let days = JSON.parse(emp.work_days||"[]");
    days = days.filter(d => !restDays.includes(d));
    updates.work_days = JSON.stringify(days);
    updates.overtime_hrs = Math.max(0, emp.overtime_hrs - 4);
  }
  if (action_type === "safety_briefing") {
    updates.safety_score = Math.min(100, emp.safety_score + 5);
  }

  if (Object.keys(updates).length > 0) {
    DB.updateEmployee(empId, updates);
  }

  // Save action log
  const saved = DB.saveAction({ employee_id:empId, action_type, action_verb:action_verb||action_type, title:title||"", detail:detail||"", outcome:outcome||"", value:JSON.stringify(value), applied_by:req.user.username });

  // Create notification
  DB.saveNotification({ type:"ai_action", title:`Action Applied: ${title}`, message:`${req.user.name} applied "${title}" to employee ${emp.first_name} ${emp.last_name}`, recipient:"all", related_id:empId, related_type:"employee", sent_by:req.user.username });

  // Auto-resolve fatigue alert if hours capped
  if (action_type==="cap_hours") {
    DB.db.prepare("UPDATE fatigue_alerts SET resolved=1, resolved_at=datetime('now') WHERE employee_id=? AND resolved=0").run(empId);
  }

  DB.audit("APPLY_ACTION", "employee", empId, { overtime_hrs:emp.overtime_hrs }, updates, req.user.username);
  res.json({ ok:true, employee:mapDbEmployee(DB.getEmployee(empId)), actions:DB.getActions(empId) });
});

app.get("/api/employees/:id/actions", softAuth, function(req, res) {
  res.json(DB.getActions(req.params.id));
});

// ══════════════════════════════════════════════════════════════════
// SAFETY INCIDENTS
// ══════════════════════════════════════════════════════════════════
app.get("/api/incidents", function(req, res) {
  const factoryId = req.query.factory;
  res.json(factoryId ? DB.getIncidents(factoryId) : DB.getAllIncidents());
});

app.post("/api/incidents", softAuth, function(req, res) {
  try {
    const by  = req.user.username;
    const inc = { ...req.body, reported_by: by };
    DB.saveIncident(inc);
    DB.audit("CREATE_INCIDENT", "incident", null, null, inc, by);
    try { DB.saveNotification({ type:"safety_incident", title:"New Incident: "+(inc.incident_name||""), message:(inc.severity||"")+" severity at factory "+(inc.factory_id||""), recipient:"all", related_id:inc.factory_id||"", related_type:"factory", sent_by:by }); } catch(e) {}
    res.json({ ok:true });
  } catch(e) { console.error("Incident save error:", e.message); res.status(500).json({ error:e.message }); }
});

app.put("/api/incidents/:id/resolve", softAuth, function(req, res) {
  try {
    const by = req.user.username;
    DB.resolveIncident(req.params.id, by);
    DB.audit("RESOLVE_INCIDENT", "incident", req.params.id, null, { status:"resolved" }, by);
    res.json({ ok:true });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ══════════════════════════════════════════════════════════════════
// FATIGUE ALERTS
// ══════════════════════════════════════════════════════════════════
app.get("/api/fatigue", function(req, res) {
  res.json(DB.getFatigueAlerts(req.query.factory));
});

app.put("/api/fatigue/:id/notify", softAuth, function(req, res) {
  DB.notifyManager(req.params.id, req.user.username);
  const alert = DB.db.prepare("SELECT fa.*, e.first_name||' '||e.last_name as emp_name FROM fatigue_alerts fa JOIN employees e ON fa.employee_id=e.id WHERE fa.id=?").get(req.params.id);
  DB.saveNotification({ type:"fatigue_alert", title:`Manager Notified: Fatigue Risk`, message:`Manager notified for ${alert?.emp_name||"employee"} — fatigue score ${alert?.fatigue_score}/100`, recipient:"all", related_type:"employee", related_id:alert?.employee_id, sent_by:req.user.username });
  DB.audit("NOTIFY_MANAGER", "fatigue_alert", req.params.id, null, { notified:true }, req.user.username);
  res.json({ ok:true });
});

app.put("/api/fatigue/:id/resolve", softAuth, function(req, res) {
  DB.resolveFatigue(req.params.id);
  DB.audit("RESOLVE_FATIGUE", "fatigue_alert", req.params.id, null, { resolved:true }, req.user.username);
  res.json({ ok:true });
});

// ══════════════════════════════════════════════════════════════════
// SHIFT PLANS
// ══════════════════════════════════════════════════════════════════
app.get("/api/shiftplans", softAuth, function(req, res) {
  res.json(DB.getShiftPlans(req.query.factory));
});

app.post("/api/shiftplans", softAuth, function(req, res) {
  const plan = { ...req.body, created_by:req.user.username, status:"draft" };
  if (plan.shifts && typeof plan.shifts !== "string") plan.shifts = JSON.stringify(plan.shifts);
  if (plan.actions && typeof plan.actions !== "string") plan.actions = JSON.stringify(plan.actions);
  DB.saveShiftPlan(plan);
  DB.audit("CREATE_SHIFT_PLAN", "shift_plan", plan.factory_id, null, plan, req.user.username);
  res.json({ ok:true, plans:DB.getShiftPlans(plan.factory_id) });
});

app.put("/api/shiftplans/:id/approve", softAuth, function(req, res) {
  DB.approveShiftPlan(req.params.id, req.user.username);
  DB.audit("APPROVE_SHIFT_PLAN", "shift_plan", req.params.id, null, { status:"approved" }, req.user.username);
  DB.saveNotification({ type:"shift_plan", title:"Shift Plan Approved", message:`Shift plan approved by ${req.user.name}`, recipient:"all", related_type:"shift_plan", related_id:req.params.id, sent_by:req.user.username });
  res.json({ ok:true });
});

// ══════════════════════════════════════════════════════════════════
// SKILLS
// ══════════════════════════════════════════════════════════════════
app.get("/api/skills", softAuth, function(req, res) {
  res.json(DB.getSkills(req.query.factory));
});

app.put("/api/skills/:id", softAuth, function(req, res) {
  const { current_score, training_plan, target_date } = req.body;
  const data = {};
  if (current_score !== undefined) { data.current_score=current_score; data.gap=DB.db.prepare("SELECT required_score FROM skills_assessments WHERE id=?").get(req.params.id)?.required_score - current_score; data.updated_by=req.user.username; }
  if (training_plan !== undefined) data.training_plan = training_plan;
  if (target_date   !== undefined) data.target_date   = target_date;
  DB.updateSkill(req.params.id, data);
  DB.audit("UPDATE_SKILL", "skill", req.params.id, null, data, req.user.username);
  res.json({ ok:true });
});

// ══════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════
app.get("/api/notifications", softAuth, function(req, res) {
  res.json({ notifications:DB.getNotifications(req.user.username), unread:DB.getUnreadCount(req.user.username) });
});

app.put("/api/notifications/:id/read", softAuth, function(req, res) {
  DB.markRead(req.params.id);
  res.json({ ok:true });
});

// ══════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════
app.get("/api/dashboard", softAuth, function(req, res) {
  res.json({ ...DB.getDashboardStats(), factories:DB.getFactories(), recentActions:DB.getRecentActions(10) });
});

// ══════════════════════════════════════════════════════════════════
// SF TIME TYPES (for Safety Hub)
// ══════════════════════════════════════════════════════════════════
app.get("/sf/timetypes", async function(req, res) {
  try {
    const data = await sfGet("/odata/v2/TimeType?$select=externalCode,externalName_en_US,externalName_defaultValue,category&$top=200&$format=json");
    const map  = {};
    (data && data.d && data.d.results || []).forEach(t=>{ map[t.externalCode]=t.externalName_en_US||t.externalName_defaultValue||t.externalCode; });
    res.json(map);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.get("/sf/absences", async function(req, res) {
  try {
    const top  = Math.min(Number(req.query.top||200),500);
    const data = await sfGet("/odata/v2/EmployeeTime?$select=externalCode,userId,timeType,startDate,endDate,absenceDurationCategory,quantityInDays,approvalStatus&$top="+top+"&$format=json&$orderby=startDate desc");
    res.json(data && data.d && data.d.results || []);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.get("/sf/positions", async function(req, res) {
  try {
    const data = await sfGet("/odata/v2/Position?$select=code,effectiveStartDate,jobCode,type,division,department,externalName_en_US,externalName_defaultValue,location,payGrade&$top=200&$format=json");
    res.json(data && data.d && data.d.results || []);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.get("/sf/departments", async function(req, res) {
  try {
    const data = await sfGet("/odata/v2/FODepartment?$select=externalCode,name_en_US,name_defaultValue,name_localized,description,parent&$top=200&$format=json");
    res.json(data && data.d && data.d.results || []);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.get("/sf/jobcodes", async function(req, res) {
  try {
    const data = await sfGet("/odata/v2/FOJobCode?$select=externalCode,name_en_US,name_defaultValue,name_localized,isRegular&$top=200&$format=json");
    res.json(data && data.d && data.d.results || []);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.get("/sf/test", async function(req, res) {
  try {
    const data = await sfGet("/odata/v2/PerPersonal?$format=json&$top=1");
    res.json({ ok:true, sample:(data && data.d && data.d.results && data.d.results[0])||{} });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// ══════════════════════════════════════════════════════════════════
// ANTHROPIC PROXY
// ══════════════════════════════════════════════════════════════════
app.post("/proxy", softAuth, async function(req, res) {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "Content-Type":"application/json", "x-api-key":ANTHROPIC_API_KEY, "anthropic-version":"2023-06-01" },
      body: JSON.stringify(req.body),
    });
    res.json(await r.json());
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── Audit log ─────────────────────────────────────────────────────
app.get("/api/audit", softAuth, function(req, res) {
  if (req.user.access !== "admin") return res.status(403).json({ error:"Admin only" });
  const logs = DB.db.prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100").all();
  res.json(logs);
});

const PORT = process.env.PORT || 3001;

// ══════════════════════════════════════════════════════════════════
// AI AGENT SYSTEM
// ══════════════════════════════════════════════════════════════════

// ── Agent Tool Registry ───────────────────────────────────────────
const AGENT_TOOLS = {
  // Query employees with filters
  query_employees: function(args) {
    const fac   = args.factory_id || null;
    const risk  = args.risk_level  || null;
    const limit = args.limit       || 20;
    let q = "SELECT id, first_name||' '||last_name as name, job_title, department, factory_id, fatigue_risk, fatigue_score, overtime_hrs, safety_score, shift FROM employees WHERE 1=1";
    const p = [];
    if (fac)  { q += " AND factory_id=?";  p.push(fac); }
    if (risk) { q += " AND fatigue_risk=?"; p.push(risk); }
    q += " ORDER BY fatigue_score DESC LIMIT ?"; p.push(limit);
    return DB.db.prepare(q).all(...p);
  },

  // Get factory summary
  get_factory_stats: function(args) {
    const fid = args.factory_id;
    const f   = DB.getFactory(fid);
    if (!f) return { error: "Factory not found" };
    const stats = DB.getEmployeeStats(fid);
    const incs  = DB.getIncidents(fid);
    const alerts = DB.getFatigueAlerts(fid);
    return { factory:f, employees:stats, open_incidents:incs.filter(i=>i.status==="open").length, active_fatigue_alerts:alerts.length };
  },

  // Get all factories overview
  get_all_factories: function(args) {
    return DB.getFactories().map(f => {
      const stats = DB.getEmployeeStats(f.id);
      const incs  = DB.getIncidents(f.id).filter(i=>i.status==="open").length;
      const fat   = DB.getFatigueAlerts(f.id).length;
      return { ...f, employee_count:stats.total, open_incidents:incs, fatigue_alerts:fat, critical_employees:stats.critical };
    });
  },

  // Search incidents
  query_incidents: function(args) {
    const all  = DB.getAllIncidents();
    const fac  = args.factory_id;
    const sev  = args.severity;
    const stat = args.status;
    return all
      .filter(i => (!fac  || i.factory_id===fac))
      .filter(i => (!sev  || i.severity===sev))
      .filter(i => (!stat || i.status===stat))
      .slice(0, args.limit||15);
  },

  // Get skills gaps
  get_skills_gaps: function(args) {
    return DB.getSkills(args.factory_id || null)
      .sort((a,b)=>(b.gap||0)-(a.gap||0))
      .slice(0, args.limit||8);
  },

  // Apply action to employee
  apply_employee_action: function(args) {
    const emp = DB.getEmployee(args.employee_id);
    if (!emp) return { error:"Employee not found" };
    const updates = {};
    if (args.action_type==="cap_hours" && args.value) {
      updates.overtime_hrs = Number(args.value);
      updates.fatigue_risk = args.value<=44?"LOW":args.value<=50?"MEDIUM":"HIGH";
      updates.fatigue_score = Math.max(0,(emp.fatigue_score||50)-20);
      updates.status = "Active";
    }
    if (args.action_type==="safety_briefing") {
      updates.safety_score = Math.min(100,(emp.safety_score||80)+5);
    }
    if (Object.keys(updates).length>0) DB.updateEmployee(args.employee_id, updates);
    DB.saveAction({ employee_id:args.employee_id, action_type:args.action_type, action_verb:args.action_type, title:args.title||args.action_type, detail:args.detail||"", outcome:args.outcome||"", value:JSON.stringify(args.value||""), applied_by:"agent" });
    return { ok:true, employee_id:args.employee_id, updates_applied:updates };
  },

  // Create safety incident
  create_incident: function(args) {
    const inc = { employee_id:null, factory_id:args.factory_id, incident_type:args.incident_type||"OTHER", incident_name:args.incident_name||"Agent Alert", severity:args.severity||"MEDIUM", description:args.description||"", quantity_days:args.quantity_days||1, incident_date:new Date().toISOString().slice(0,10), reported_by:"safety_sentinel_agent" };
    DB.saveIncident(inc);
    return { ok:true, incident:inc };
  },

  // Create fatigue alert
  create_fatigue_alert: function(args) {
    const existing = DB.db.prepare("SELECT id FROM fatigue_alerts WHERE employee_id=? AND resolved=0").get(args.employee_id||"");
    if (existing) return { ok:false, reason:"Alert already exists" };
    DB.saveFatigueAlert({ employee_id:args.employee_id||null, factory_id:args.factory_id, fatigue_score:args.fatigue_score||75, risk_level:args.risk_level||"HIGH", overtime_hrs:args.overtime_hrs||0, alert_reason:args.alert_reason||"Agent detected risk" });
    return { ok:true };
  },

  // Send notification
  notify_manager: function(args) {
    DB.saveNotification({ type:"agent_alert", title:args.title||"Agent Alert", message:args.message||"", recipient:"all", related_id:args.factory_id||"", related_type:"factory", sent_by:"agent" });
    return { ok:true };
  },

  // Get recent AI actions
  get_recent_actions: function(args) {
    return DB.getRecentActions(args.limit||10);
  },
};

// ── LLM Agent Runner ──────────────────────────────────────────────
async function runAgent(systemPrompt, userMessage, tools, maxSteps=8) {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");

  const claudeTools = tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: { type:"object", properties:t.parameters, required:t.required||[] }
  }));

  const messages = [{ role:"user", content:userMessage }];
  const steps    = [];
  let   thinking = "";

  for (let step=0; step<maxSteps; step++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "Content-Type":"application/json", "x-api-key":ANTHROPIC_API_KEY, "anthropic-version":"2023-06-01" },
      body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:2000, system:systemPrompt, tools:claudeTools, messages }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    messages.push({ role:"assistant", content:data.content });

    // Collect text
    const textBlock = data.content.find(b=>b.type==="text");
    if (textBlock) thinking = textBlock.text;

    // Check for tool calls
    const toolCalls = data.content.filter(b=>b.type==="tool_use");
    if (toolCalls.length===0 || data.stop_reason==="end_turn") break;

    // Execute tools
    const toolResults = [];
    for (const tc of toolCalls) {
      steps.push({ tool:tc.name, input:tc.input, step });
      let result;
      try {
        const fn = AGENT_TOOLS[tc.name];
        if (!fn) result = { error:"Unknown tool: "+tc.name };
        else result = fn(tc.input);
      } catch(e) { result = { error:e.message }; }
      steps.push({ tool:tc.name, output:result, step });
      toolResults.push({ type:"tool_result", tool_use_id:tc.id, content:JSON.stringify(result) });
    }
    messages.push({ role:"user", content:toolResults });
  }

  return { thinking, steps, messages };
}

// ── Tool definitions for agents ───────────────────────────────────
const HR_COPILOT_TOOLS = [
  { name:"get_all_factories",  description:"Get overview of all 6 factories with employee counts, incidents, and fatigue alerts", parameters:{}, required:[] },
  { name:"query_employees",    description:"Search employees by factory and risk level", parameters:{ factory_id:{type:"string"}, risk_level:{type:"string",enum:["LOW","MEDIUM","HIGH","CRITICAL"]}, limit:{type:"number"} } },
  { name:"get_factory_stats",  description:"Get detailed stats for a specific factory", parameters:{ factory_id:{type:"string"} }, required:["factory_id"] },
  { name:"query_incidents",    description:"Search safety incidents", parameters:{ factory_id:{type:"string"}, severity:{type:"string"}, status:{type:"string"}, limit:{type:"number"} } },
  { name:"get_skills_gaps",    description:"Get skills gap data", parameters:{ factory_id:{type:"string"}, limit:{type:"number"} } },
  { name:"get_recent_actions", description:"Get recent AI actions applied", parameters:{ limit:{type:"number"} } },
];

const SAFETY_SENTINEL_TOOLS = [
  { name:"get_all_factories",   description:"Get all factories with safety stats", parameters:{}, required:[] },
  { name:"query_employees",     description:"Find high-risk employees", parameters:{ factory_id:{type:"string"}, risk_level:{type:"string"}, limit:{type:"number"} } },
  { name:"query_incidents",     description:"Check recent incidents", parameters:{ factory_id:{type:"string"}, status:{type:"string"} } },
  { name:"create_incident",     description:"Log a new safety incident detected by the agent", parameters:{ factory_id:{type:"string"}, incident_type:{type:"string"}, incident_name:{type:"string"}, severity:{type:"string"}, description:{type:"string"} }, required:["factory_id","incident_name","severity"] },
  { name:"create_fatigue_alert",description:"Create a fatigue alert for a high-risk employee", parameters:{ employee_id:{type:"string"}, factory_id:{type:"string"}, fatigue_score:{type:"number"}, risk_level:{type:"string"}, overtime_hrs:{type:"number"}, alert_reason:{type:"string"} }, required:["factory_id"] },
  { name:"notify_manager",      description:"Send alert notification to managers", parameters:{ factory_id:{type:"string"}, title:{type:"string"}, message:{type:"string"} }, required:["title","message"] },
];

const ACTION_AGENT_TOOLS = [
  { name:"query_employees",       description:"Find employees needing action", parameters:{ factory_id:{type:"string"}, risk_level:{type:"string"}, limit:{type:"number"} } },
  { name:"apply_employee_action", description:"Apply an HR action to an employee", parameters:{ employee_id:{type:"string"}, action_type:{type:"string",enum:["cap_hours","safety_briefing","rotate_shift","add_rest_days"]}, value:{type:"number"}, title:{type:"string"}, detail:{type:"string"}, outcome:{type:"string"} }, required:["employee_id","action_type","title"] },
  { name:"notify_manager",        description:"Notify manager of actions taken", parameters:{ factory_id:{type:"string"}, title:{type:"string"}, message:{type:"string"} }, required:["title","message"] },
];

// ── POST /agents/copilot — RAG-powered HR Copilot ─────────────────
app.post("/agents/copilot", softAuth, async function(req, res) {
  try {
    const { message, history } = req.body;
    const result = await runAgent(
      `You are Nestlé's Global HR AI Copilot (Joule). You have access to live database tools. ALWAYS use tools to get real data before answering — never make up numbers. You know about: 6 factories (Vevey/Switzerland, Pune/India, São Paulo/Brazil, Solon Ohio/USA, Tianjin/China, Silao/Mexico), NCE (Nestlé Continuous Excellence), FSSC 22000, Net Zero 2050, 270K global employees. Be concise and data-driven.`,
      message,
      HR_COPILOT_TOOLS
    );
    // Save to audit log
    DB.audit("COPILOT_QUERY", "agent", null, { message }, { thinking:result.thinking.slice(0,200), steps:result.steps.length }, req.user.username);
    res.json({ reply:result.thinking, steps:result.steps, tool_calls:result.steps.filter(s=>s.input).length });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── POST /agents/sentinel — Safety Sentinel Agent ─────────────────
app.post("/agents/sentinel", softAuth, async function(req, res) {
  try {
    const result = await runAgent(
      `You are Nestlé's Safety Sentinel AI Agent — a fully autonomous safety officer that proactively scans ALL factory data, identifies emerging safety risks, and takes IMMEDIATE action without human intervention. Your autonomous capabilities:
1. DETECT: Scan every factory for high overtime + open incidents (compound risk)
2. ALERT: Create fatigue alerts for employees with fatigue_score > 70
3. ESCALATE: Create safety incidents for factories with 3+ open issues
4. NOTIFY: Send manager notifications for every CRITICAL finding
5. REPORT: Provide a comprehensive risk assessment

Be thorough — check EVERY factory. Cross-reference overtime data with incident history. If overtime > 12h AND there are open incidents at the same factory, that's a CRITICAL compound risk. Always take action first, then report what you did. Format your report clearly with factory names, specific numbers, and actions taken.`,
      "Run a full safety scan across all Nestlé factories. Identify risks, create alerts for critical cases, and notify managers. Report your findings.",
      SAFETY_SENTINEL_TOOLS,
      12
    );
    DB.audit("SENTINEL_RUN", "agent", null, null, { steps:result.steps.length, thinking:result.thinking.slice(0,300) }, "sentinel_agent");
    res.json({ report:result.thinking, actions_taken:result.steps.filter(s=>s.input).length, steps:result.steps });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── POST /agents/actions — Bulk Action Agent ──────────────────────
app.post("/agents/actions", softAuth, async function(req, res) {
  try {
    const { factory_id, target } = req.body;
    const result = await runAgent(
      `You are Nestlé's HR Action Agent. Given a factory and target, query high-risk employees and apply appropriate interventions: cap overtime hours for HIGH/CRITICAL fatigue employees, schedule safety briefings for low safety scores. Apply actions to the top 5 most at-risk employees. Notify the manager with a summary. Report every action taken.`,
      `Factory: ${factory_id||"all"}. Target: ${target||"reduce fatigue risk"}. Find high-risk employees and apply interventions.`,
      ACTION_AGENT_TOOLS,
      10
    );
    DB.audit("ACTION_AGENT_RUN", "agent", factory_id||"all", null, { steps:result.steps.length }, req.user.username);
    res.json({ report:result.thinking, actions_taken:result.steps.filter(s=>s.input).length, steps:result.steps });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── GET /agents/log — Agent activity log ─────────────────────────
app.get("/agents/log", softAuth, function(req, res) {
  const logs = DB.db.prepare("SELECT * FROM audit_log WHERE entity_type='agent' OR action LIKE '%AGENT%' OR action LIKE '%SENTINEL%' OR action LIKE '%COPILOT%' ORDER BY created_at DESC LIMIT 50").all();
  res.json(logs);
});


// ── Health check (Railway) ────────────────────────────────────────
app.get("/health", function(req, res) {
  res.json({ ok:true, status:"healthy", ts:new Date().toISOString() });
});

// ── React catch-all (MUST be after all API routes) ───────────────
if (clientBuild) {
  app.get("/{*path}", function(req, res) {
    res.sendFile(path.join(clientBuild, "index.html"));
  });
}

app.listen(PORT, function() {
  console.log("✅ Nestlé EOS Server running on port " + PORT);
  console.log("   Database:", require("path").join(__dirname,"nestle_eos.db"));
  // Pre-warm SF work schedule cache (non-blocking, best-effort)
  setImmediate(() => {
    getWorkSchedules()
      .then(ws => console.log("✅ SF WorkSchedule cache:", Object.keys(ws).length, "schedules"))
      .catch(() => console.log("ℹ️  SF cache skipped (will load on first request)"));
  });
});

// ══════════════════════════════════════════════════════════════════
// MULTI-AGENT SYSTEM
// ══════════════════════════════════════════════════════════════════

// ── Shared message bus between agents ────────────────────────────
function createBus() {
  const messages = [];
  return {
    post: (from, to, type, payload) => {
      const msg = { id:Date.now()+Math.random(), from, to, type, payload, ts:new Date().toISOString() };
      messages.push(msg);
      return msg;
    },
    inbox:  (agent) => messages.filter(m => m.to===agent || m.to==="ALL"),
    all:    ()      => [...messages],
    clear:  ()      => messages.splice(0),
  };
}

// ── Specialist Agent definitions ──────────────────────────────────
const SPECIALIST_AGENTS = {

  safety_agent: {
    name:   "Safety Agent",
    emoji:  "🛡",
    system: `You are the Nestlé Safety Sentinel — an autonomous AI agent specialised in FSSC 22000 compliance, safety incident analysis, and proactive risk detection across Nestlé's global factory network. When analysing safety:
1. Use tools to pull REAL incident data from all factories
2. Cross-reference incident frequency with fatigue scores to identify systemic risks
3. Calculate risk levels using the Nestlé Risk Matrix (severity × likelihood)
4. Produce a structured JSON report with keys: risk_level (CRITICAL/HIGH/MEDIUM/LOW), factories_at_risk (array with factory names and specific reasons), immediate_actions (array of specific, measurable interventions), incident_count, fssc_compliance_gaps (array), recommendation.
Always cite specific factory IDs, employee counts, and incident types. Be authoritative and action-oriented.`,
    tools:  ["query_incidents", "get_all_factories", "get_factory_stats", "create_incident", "notify_manager"],
  },

  fatigue_agent: {
    name:   "Fatigue Agent",
    emoji:  "⚡",
    system: `You are the Nestlé Fatigue Risk Intelligence Agent — an autonomous AI that monitors 270K+ employees for burnout, overtime violations, and rest-compliance risks. When analysing fatigue:
1. Query ALL factories for CRITICAL and HIGH risk employees
2. Calculate factory-level Fatigue Risk Index (weighted: overtime_hrs × 0.4 + fatigue_score × 0.4 + consecutive_shifts × 0.2)
3. Identify employees exceeding ILO weekly hour limits (48h) and EU Working Time Directive thresholds
4. Take AUTONOMOUS ACTION: create fatigue alerts for critical cases, apply hour caps for the worst offenders
Output structured JSON with keys: critical_employees (array with id, name, factory, score, overtime_hrs), factories_ranked (array sorted by risk), total_at_risk, avg_overtime, autonomous_actions_taken (array of what you did), recommended_actions (array of what managers should do).`,
    tools:  ["query_employees", "get_factory_stats", "get_all_factories", "create_fatigue_alert", "apply_employee_action"],
  },

  skills_agent: {
    name:   "Skills Agent",
    emoji:  "🎓",
    system: `You are the Nestlé Skills & Development Specialist Agent. Your domain: skills gaps, training needs, NCE maturity, competency development. When asked to analyse skills, use tools to get gap data and output structured JSON with keys: critical_gaps (array), highest_gap_domain, factories_needing_training (array), nce_maturity_avg, training_priorities (array of {domain, urgency, factory}).`,
    tools:  ["get_skills_gaps", "get_all_factories", "get_factory_stats", "notify_manager"],
  },

  workforce_agent: {
    name:   "Workforce Agent",
    emoji:  "👥",
    system: `You are the Nestlé Workforce Planning Specialist Agent. Your domain: headcount, utilisation, shift optimisation, talent mobility. When asked to analyse workforce, use tools to get factory stats and output structured JSON with keys: total_workforce, overutilised_factories (array), underutilised_factories (array), shift_imbalances (array), redeployment_opportunities (array), efficiency_score.`,
    tools:  ["get_all_factories", "get_factory_stats", "query_employees", "get_recent_actions"],
  },
};

// Run a specialist agent and parse its JSON output
async function runSpecialistAgent(agentKey, task, bus) {
  const agent = SPECIALIST_AGENTS[agentKey];
  const tools = agent.tools.map(name => {
    const defs = {
      query_employees:    { desc:"Search employees by factory and risk level",  params:{ factory_id:{type:"string"}, risk_level:{type:"string"}, limit:{type:"number"} } },
      get_all_factories:  { desc:"Get all factories with stats",                params:{} },
      get_factory_stats:  { desc:"Get detailed stats for a factory",            params:{ factory_id:{type:"string"} }, req:["factory_id"] },
      query_incidents:    { desc:"Search safety incidents",                     params:{ factory_id:{type:"string"}, severity:{type:"string"}, status:{type:"string"} } },
      get_skills_gaps:    { desc:"Get skills gap data by factory",              params:{ factory_id:{type:"string"}, limit:{type:"number"} } },
      create_incident:    { desc:"Log a new safety incident",                   params:{ factory_id:{type:"string"}, incident_name:{type:"string"}, severity:{type:"string"}, description:{type:"string"} } },
      create_fatigue_alert:{ desc:"Create fatigue alert",                       params:{ factory_id:{type:"string"}, fatigue_score:{type:"number"}, risk_level:{type:"string"}, overtime_hrs:{type:"number"}, alert_reason:{type:"string"} } },
      apply_employee_action:{ desc:"Apply action to employee",                  params:{ employee_id:{type:"string"}, action_type:{type:"string"}, value:{type:"number"}, title:{type:"string"} } },
      notify_manager:     { desc:"Send notification to managers",               params:{ factory_id:{type:"string"}, title:{type:"string"}, message:{type:"string"} } },
      get_recent_actions: { desc:"Get recent AI actions",                       params:{ limit:{type:"number"} } },
    };
    const d = defs[name] || { desc:name, params:{} };
    return { name, description:d.desc, input_schema:{ type:"object", properties:d.params, required:d.req||[] } };
  });

  bus.post(agentKey, "orchestrator", "STATUS", { message:`${agent.emoji} ${agent.name} starting task: ${task.slice(0,60)}` });

  const result = await runAgent(agent.system, task, tools.map(t=>({ name:t.name, description:t.description, parameters:t.input_schema.properties, required:t.input_schema.required||[] })), 8);

  // Parse JSON from response
  let structured = null;
  try {
    const jsonMatch = result.thinking.match(/```json\n([\s\S]*?)\n```/) || result.thinking.match(/\{[\s\S]*\}/);
    if (jsonMatch) structured = JSON.parse(jsonMatch[1]||jsonMatch[0]);
  } catch(e) {}

  bus.post(agentKey, "orchestrator", "REPORT", { raw:result.thinking, structured, tool_calls:result.steps.filter(s=>s.input).length, steps:result.steps });
  return { agentKey, name:agent.name, emoji:agent.emoji, thinking:result.thinking, structured, steps:result.steps };
}

// ── Orchestrator Agent ────────────────────────────────────────────
async function runOrchestrator(userTask, bus) {
  bus.post("orchestrator", "ALL", "INIT", { task:userTask });

  // Step 1: Orchestrator decides which agents to call
  const planRes = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "x-api-key":ANTHROPIC_API_KEY, "anthropic-version":"2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens:600,
      system:`You are the Nestlé EOS Orchestrator — the central intelligence coordinating a multi-agent AI system for Nestlé's global workforce of 270K employees across 350+ factories. You coordinate 4 specialist agents: safety_agent (FSSC 22000 compliance, incident analysis), fatigue_agent (overtime, rest compliance, burnout prevention), skills_agent (NCE maturity, training gaps, reskilling), workforce_agent (headcount, utilisation, talent mobility). Given a task, decide which agents to activate and craft a SPECIFIC sub-task for each with clear data requirements. Respond with ONLY valid JSON: { "agents": [ { "id": "safety_agent", "task": "specific task description" } ] }. Select only agents relevant to the request. Always include at least 2 agents for cross-domain insight.`,
      messages:[{ role:"user", content:userTask }]
    })
  });
  const planData = await planRes.json();
  const planText = planData.content?.find(b=>b.type==="text")?.text || "{}";
  let plan = { agents:[] };
  try {
    const m = planText.match(/\{[\s\S]*\}/);
    if (m) plan = JSON.parse(m[0]);
  } catch(e) { plan.agents = Object.keys(SPECIALIST_AGENTS).slice(0,2).map(id=>({ id, task:userTask })); }

  bus.post("orchestrator", "ALL", "PLAN", { agents:plan.agents.map(a=>a.id), message:`Activating ${plan.agents.length} specialist agents` });

  // Step 2: Run agents in parallel
  const agentResults = await Promise.all(
    plan.agents.map(a => runSpecialistAgent(a.id, a.task, bus).catch(e => ({ agentKey:a.id, error:e.message, thinking:"Error: "+e.message, steps:[] })))
  );

  // Step 3: Orchestrator synthesises results
  const synthContext = agentResults.map(r => `${r.emoji||""} ${r.name} Report:\n${(r.thinking||"").slice(0,600)}`).join("\n\n---\n\n");
  const synthRes = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "x-api-key":ANTHROPIC_API_KEY, "anthropic-version":"2023-06-01" },
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514", max_tokens:1000,
      system:`You are the Nestlé EOS Orchestrator delivering an executive-level AI briefing. Synthesise specialist agent reports into a compelling, data-rich narrative. Be SPECIFIC with numbers, percentages, factory names, and employee counts. Structure your response with clear Markdown:

## 🎯 Executive Summary
One powerful sentence with the most critical finding.

## 📊 Key Findings
Bullet each domain's top insight with real numbers.

## 🚨 Immediate Actions Required
Numbered list of urgent interventions with responsible parties.

## 📈 Strategic Recommendations
Forward-looking actions tied to Nestlé frameworks: NCE maturity roadmap, FSSC 22000 compliance trajectory, Net Zero 2050 workforce readiness.

## 🤖 AI Agent Activity
Summarise how many autonomous actions the agents took (alerts created, managers notified, interventions applied).

Reference Nestlé context throughout. Be authoritative and concise.`,
      messages:[{ role:"user", content:`Original task: ${userTask}\n\nSpecialist Agent Reports:\n${synthContext}\n\nProvide executive synthesis.` }]
    })
  });
  const synthData = await synthRes.json();
  const synthesis = synthData.content?.find(b=>b.type==="text")?.text || "";

  bus.post("orchestrator", "ALL", "SYNTHESIS", { message:"Synthesis complete", synthesis:synthesis.slice(0,300) });

  // Save to audit log
  DB.audit("MULTI_AGENT_RUN", "agent", "orchestrator", { task:userTask }, { agents:plan.agents.map(a=>a.id), tool_calls:agentResults.reduce((s,r)=>s+(r.steps||[]).filter(x=>x.input).length,0) }, "orchestrator");

  return { synthesis, agentResults, bus_messages:bus.all(), plan };
}

// ── POST /agents/orchestrate ──────────────────────────────────────
app.post("/agents/orchestrate", softAuth, async function(req, res) {
  if (!ANTHROPIC_API_KEY) return res.status(400).json({ error:"ANTHROPIC_API_KEY not configured" });
  const { task } = req.body;
  if (!task) return res.status(400).json({ error:"task required" });
  try {
    const bus    = createBus();
    const result = await runOrchestrator(task, bus);
    res.json(result);
  } catch(e) {
    console.error("Orchestrator error:", e);
    res.status(500).json({ error:e.message });
  }
});