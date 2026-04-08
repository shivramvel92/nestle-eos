const express  = require("express");
const cors     = require("cors");
const crypto   = require("crypto");
const { hashPassword, verifyPassword, createToken, verifyToken, USERS, SESSIONS } = require("./auth");
const DB       = require("./database");
const app      = express();

// ── Config ────────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const SF_BASE_URL   = "https://apisalesdemo2.successfactors.eu";
const SF_USERNAME   = "sfapi@SFCPART001970";
const SF_PASSWORD   = "Admin@2024";
const SF_BASIC      = "Basic " + Buffer.from(SF_USERNAME + ":" + SF_PASSWORD).toString("base64");

app.use(cors());
app.use(express.json());

// ── Serve React build in production ──────────────────────────────
const path = require("path");
const fs   = require("fs");
const clientBuild = path.join(__dirname, "client", "build");
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get("/", function(req, res) { res.sendFile(path.join(clientBuild, "index.html")); });
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
app.post("/proxy", async function(req, res) {
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
