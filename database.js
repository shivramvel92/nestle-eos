// ══════════════════════════════════════════════════════════════════
// Nestlé EOS — SQLite Database Layer
// ══════════════════════════════════════════════════════════════════
const Database = require("better-sqlite3");
const path     = require("path");
const fs       = require("fs");

// Use /data dir on Railway (persistent volume), fallback to __dirname locally
const DB_DIR  = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const DB_PATH = path.join(DB_DIR, "nestle_eos.db");
const db      = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ────────────────────────────────────────────────────────
db.exec(`
  -- Factories / Sites
  CREATE TABLE IF NOT EXISTS factories (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    country         TEXT,
    zone            TEXT,
    workers         INTEGER DEFAULT 0,
    risk_level      TEXT DEFAULT 'low',
    utilization     REAL DEFAULT 80,
    throughput      REAL DEFAULT 80,
    nce_score       REAL DEFAULT 50,
    fssc_coverage   REAL DEFAULT 70,
    updated_at      TEXT DEFAULT (datetime('now'))
  );

  -- Employees (synced from SF + local overrides)
  CREATE TABLE IF NOT EXISTS employees (
    id              TEXT PRIMARY KEY,
    first_name      TEXT,
    last_name       TEXT,
    factory_id      TEXT REFERENCES factories(id),
    job_title       TEXT,
    department      TEXT,
    location        TEXT,
    gender          TEXT,
    nationality     TEXT,
    shift           TEXT DEFAULT 'Morning',
    schedule_code   TEXT,
    schedule_name   TEXT,
    standard_hours  REAL DEFAULT 40,
    overtime_hrs    REAL DEFAULT 0,
    fatigue_risk    TEXT DEFAULT 'LOW',
    fatigue_score   INTEGER DEFAULT 20,
    safety_score    INTEGER DEFAULT 80,
    work_days       TEXT DEFAULT '["Mon","Tue","Wed","Thu","Fri"]',
    tenure_months   INTEGER DEFAULT 12,
    status          TEXT DEFAULT 'Active',
    empl_status     TEXT DEFAULT 'A',
    start_date      TEXT,
    sf_source       INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  );

  -- AI Actions applied to employees
  CREATE TABLE IF NOT EXISTS ai_actions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id     TEXT REFERENCES employees(id),
    action_type     TEXT NOT NULL,
    action_verb     TEXT,
    title           TEXT,
    detail          TEXT,
    outcome         TEXT,
    value           TEXT,
    applied_by      TEXT,
    applied_at      TEXT DEFAULT (datetime('now')),
    status          TEXT DEFAULT 'applied',
    reverted_at     TEXT
  );

  -- Safety Incidents
  CREATE TABLE IF NOT EXISTS safety_incidents (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id     TEXT REFERENCES employees(id),
    factory_id      TEXT REFERENCES factories(id),
    incident_type   TEXT NOT NULL,
    incident_name   TEXT,
    severity        TEXT DEFAULT 'MEDIUM',
    description     TEXT,
    quantity_days   REAL DEFAULT 1,
    incident_date   TEXT DEFAULT (date('now')),
    status          TEXT DEFAULT 'open',
    resolved_at     TEXT,
    reported_by     TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  -- Fatigue Alerts
  CREATE TABLE IF NOT EXISTS fatigue_alerts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id     TEXT REFERENCES employees(id),
    factory_id      TEXT REFERENCES factories(id),
    fatigue_score   INTEGER,
    risk_level      TEXT,
    overtime_hrs    REAL,
    alert_reason    TEXT,
    manager_notified INTEGER DEFAULT 0,
    notified_at     TEXT,
    resolved        INTEGER DEFAULT 0,
    resolved_at     TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  -- Shift Plans (AI-optimized schedules)
  CREATE TABLE IF NOT EXISTS shift_plans (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    factory_id      TEXT REFERENCES factories(id),
    plan_name       TEXT,
    current_efficiency REAL,
    optimized_efficiency REAL,
    savings         TEXT,
    summary         TEXT,
    shifts          TEXT,
    actions         TEXT,
    status          TEXT DEFAULT 'draft',
    approved_by     TEXT,
    approved_at     TEXT,
    created_by      TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  -- Skills Assessments
  CREATE TABLE IF NOT EXISTS skills_assessments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    factory_id      TEXT REFERENCES factories(id),
    department      TEXT,
    domain          TEXT NOT NULL,
    required_score  REAL,
    current_score   REAL,
    gap             REAL,
    employee_count  INTEGER DEFAULT 0,
    training_plan   TEXT,
    target_date     TEXT,
    updated_by      TEXT,
    updated_at      TEXT DEFAULT (datetime('now'))
  );

  -- Manager Notifications
  CREATE TABLE IF NOT EXISTS notifications (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    type            TEXT NOT NULL,
    title           TEXT,
    message         TEXT,
    recipient       TEXT,
    related_id      TEXT,
    related_type    TEXT,
    read            INTEGER DEFAULT 0,
    read_at         TEXT,
    sent_by         TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  -- Audit Log — every change tracked
  CREATE TABLE IF NOT EXISTS audit_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    action          TEXT NOT NULL,
    entity_type     TEXT,
    entity_id       TEXT,
    old_value       TEXT,
    new_value       TEXT,
    performed_by    TEXT,
    ip_address      TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );
`);

// ── Seed default factories if empty ──────────────────────────────
const factoryCount = db.prepare("SELECT COUNT(*) as c FROM factories").get().c;
if (factoryCount === 0) {
  const insert = db.prepare(`
    INSERT INTO factories (id, name, country, zone, workers, risk_level, utilization, throughput, nce_score, fssc_coverage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const factories = [
    ["VD-01", "Vevey HQ Plant",  "Switzerland", "EMENA", 1240, "low",    87, 82, 78, 94],
    ["IN-04", "Pune Factory",    "India",        "AOA",   3800, "high",   94, 87, 61, 71],
    ["BR-02", "São Paulo",       "Brazil",       "AMS",   2600, "medium", 79, 74, 69, 82],
    ["US-07", "Solon Ohio",      "USA",          "AMS",   890,  "low",    82, 80, 82, 91],
    ["CN-03", "Tianjin",         "China",        "GC",    4200, "medium", 91, 85, 73, 88],
    ["MX-05", "Silao",           "Mexico",       "AMS",   1650, "high",   96, 88, 55, 67],
  ];
  const seedAll = db.transaction(() => { factories.forEach(f => insert.run(...f)); });
  seedAll();
  console.log("✅ Factories seeded");
}

// ── Seed default skills assessments ──────────────────────────────
const skillCount = db.prepare("SELECT COUNT(*) as c FROM skills_assessments").get().c;
if (skillCount === 0) {
  const ins = db.prepare(`INSERT INTO skills_assessments (factory_id, domain, required_score, current_score, gap) VALUES (?, ?, ?, ?, ?)`);
  const domains = [
    ["AI & Predictive Manufacturing", 88, 29, 59],
    ["Food Safety & FSSC 22000",       95, 71, 24],
    ["Nestlé Continuous Excellence",   85, 52, 33],
    ["Sustainable Packaging & Net Zero",80,38, 42],
    ["Nutritional Science & Regulatory",78,55, 23],
    ["Digital Supply Chain & SAP S/4HANA",82,34,48],
  ];
  const factories = ["VD-01","IN-04","BR-02","US-07","CN-03","MX-05"];
  const seed = db.transaction(() => {
    factories.forEach(fid => { domains.forEach(([d,r,c,g]) => ins.run(fid, d, r, c, g)); });
  });
  seed();
  console.log("✅ Skills assessments seeded");
}

// ── Seed sample incidents so Safety Hub shows meaningful data ─────
const incidentCount = db.prepare("SELECT COUNT(*) as c FROM safety_incidents").get().c;
if (incidentCount === 0) {
  const ins = db.prepare("INSERT INTO safety_incidents (factory_id, incident_type, incident_name, severity, description, quantity_days, incident_date, status, reported_by) VALUES (?,?,?,?,?,?,?,?,?)");
  const seedInc = db.transaction(() => {
    ins.run("IN-04","INJURY",    "Line operator hand laceration",    "HIGH",    "Machine guard failure on packaging line B", 3, "2026-03-10", "open",     "system");
    ins.run("IN-04","SICK",      "Heat exhaustion — 3 workers",      "HIGH",    "High ambient temperature in dairy section",  2, "2026-03-18", "open",     "system");
    ins.run("MX-05","ACCIDENT",  "Forklift near-miss incident",      "CRITICAL","Near-miss in warehouse zone 3",              1, "2026-03-22", "open",     "system");
    ins.run("MX-05","INJURY",    "Slip and fall — wet floor",        "MEDIUM",  "Packaging area floor not properly marked",   2, "2026-03-28", "open",     "system");
    ins.run("BR-02","SICK",      "Respiratory illness — 5 workers",  "MEDIUM",  "Possible exposure to cleaning agents",       4, "2026-03-05", "resolved", "system");
    ins.run("CN-03","NEAR_MISS", "Chemical spill near-miss",         "HIGH",    "Improper storage of cleaning chemicals",     1, "2026-03-15", "open",     "system");
    ins.run("CN-03","SICK",      "Back injury — repetitive strain",  "MEDIUM",  "Ergonomic assessment required",              5, "2026-03-20", "resolved", "system");
    ins.run("VD-01","SICK",      "Seasonal illness wave",            "LOW",     "Multiple sick leave reports — flu season",   2, "2026-03-12", "resolved", "system");
    ins.run("US-07","NEAR_MISS", "Electrical fault in lab",          "MEDIUM",  "Short circuit in QA testing area",           0, "2026-03-25", "open",     "system");
  });
  seedInc();
  console.log("✅ Safety incidents seeded");
}

// ── Seed fatigue alerts ───────────────────────────────────────────
const fatigueCount = db.prepare("SELECT COUNT(*) as c FROM fatigue_alerts").get().c;
if (fatigueCount === 0) {
  // Use NULL for employee_id — real IDs are set when employees sync from SF
  const ins = db.prepare("INSERT INTO fatigue_alerts (employee_id, factory_id, fatigue_score, risk_level, overtime_hrs, alert_reason) VALUES (?,?,?,?,?,?)");
  const seed = db.transaction(() => {
    ins.run(null,"IN-04", 88,"CRITICAL",22,"Sustained overtime — 22h above standard weekly hours · Pune Line B");
    ins.run(null,"IN-04", 81,"CRITICAL",18,"Night shift rotation — 6 consecutive nights without rest · Pune Line A");
    ins.run(null,"MX-05", 79,"CRITICAL",20,"Double shift coverage — absent colleague replacement · Silao");
    ins.run(null,"MX-05", 74,"HIGH",    16,"Peak production period overtime accumulation · Silao");
    ins.run(null,"CN-03", 68,"HIGH",    14,"Cross-department cover — extended hours 3 weeks running · Tianjin");
    ins.run(null,"CN-03", 65,"HIGH",    13,"Weekend work — 6-day working week for 4 consecutive weeks · Tianjin");
    ins.run(null,"BR-02", 62,"HIGH",    12,"Late shift overlap — insufficient rest between shifts · São Paulo");
    ins.run(null,"BR-02", 57,"HIGH",    10,"Holiday period — reduced headcount driving overtime · São Paulo");
    ins.run(null,"VD-01", 48,"MEDIUM",  8, "Moderate overtime — approaching weekly threshold · Vevey");
    ins.run(null,"US-07", 44,"MEDIUM",  6, "Scheduled maintenance period — extended shift pattern · Ohio");
  });
  seed();
  console.log("✅ Fatigue alerts seeded");
}

// ── Helper queries ────────────────────────────────────────────────
module.exports = {
  db,

  // Factories
  getFactories:    () => db.prepare("SELECT * FROM factories ORDER BY zone, name").all(),
  getFactory:      (id) => db.prepare("SELECT * FROM factories WHERE id=?").get(id),
  updateFactory:   (id, data) => {
    const fields = Object.keys(data).map(k => `${k}=?`).join(",");
    return db.prepare(`UPDATE factories SET ${fields}, updated_at=datetime('now') WHERE id=?`).run(...Object.values(data), id);
  },

  // Employees
  getEmployees: (factoryId, limit=100, offset=0, search="", dept="", shift="", risk="") => {
    let q = "SELECT * FROM employees WHERE 1=1";
    const params = [];
    if (factoryId && factoryId !== "ALL") { q += " AND factory_id=?"; params.push(factoryId); }
    if (search) { q += " AND (first_name||' '||last_name LIKE ? OR job_title LIKE ? OR id LIKE ?)"; params.push("%"+search+"%","%"+search+"%","%"+search+"%"); }
    if (dept  && dept  !== "ALL") { q += " AND department=?";    params.push(dept); }
    if (shift && shift !== "ALL") { q += " AND shift=?";         params.push(shift); }
    if (risk  && risk  !== "ALL") { q += " AND fatigue_risk=?";  params.push(risk); }
    q += " ORDER BY last_name, first_name LIMIT ? OFFSET ?";
    params.push(limit, offset);
    return db.prepare(q).all(...params);
  },
  getEmployee:     (id) => db.prepare("SELECT * FROM employees WHERE id=?").get(id),
  getAllDepts:      (factoryId) => factoryId && factoryId !== "ALL"
    ? db.prepare("SELECT DISTINCT department FROM employees WHERE factory_id=? ORDER BY department").all(factoryId).map(r=>r.department)
    : db.prepare("SELECT DISTINCT department FROM employees ORDER BY department").all().map(r=>r.department),
  getEmployeeStats: (factoryId) => {
    const w = factoryId && factoryId !== "ALL" ? "WHERE factory_id=?" : "";
    const p = factoryId && factoryId !== "ALL" ? [factoryId] : [];
    return {
      total:    db.prepare("SELECT COUNT(*) as c FROM employees "+w).get(...p).c,
      critical: db.prepare("SELECT COUNT(*) as c FROM employees "+w+(w?" AND ":" WHERE ")+"fatigue_risk='CRITICAL'").get(...p).c,
      high:     db.prepare("SELECT COUNT(*) as c FROM employees "+w+(w?" AND ":" WHERE ")+"fatigue_risk='HIGH'").get(...p).c,
      overtime: db.prepare("SELECT COUNT(*) as c FROM employees "+w+(w?" AND ":" WHERE ")+"overtime_hrs>0").get(...p).c,
      avgSafety:db.prepare("SELECT ROUND(AVG(safety_score),1) as a FROM employees "+w).get(...p).a || 0,
      avgFatigue:db.prepare("SELECT ROUND(AVG(fatigue_score),1) as a FROM employees "+w).get(...p).a || 0,
      byShift:  db.prepare("SELECT shift, COUNT(*) as c FROM employees "+(w||"")+" GROUP BY shift").all(...p),
      byDept:   db.prepare("SELECT department, COUNT(*) as c FROM employees "+(w||"")+" GROUP BY department ORDER BY c DESC LIMIT 8").all(...p),
      byRisk:   db.prepare("SELECT fatigue_risk, COUNT(*) as c FROM employees "+(w||"")+" GROUP BY fatigue_risk").all(...p),
    };
  },
  upsertEmployee:  (emp) => {
    return db.prepare(`
      INSERT INTO employees (id, first_name, last_name, factory_id, job_title, department, location, gender, nationality, shift, schedule_code, schedule_name, standard_hours, overtime_hrs, fatigue_risk, fatigue_score, safety_score, work_days, tenure_months, status, empl_status, start_date, sf_source)
      VALUES (@id,@first_name,@last_name,@factory_id,@job_title,@department,@location,@gender,@nationality,@shift,@schedule_code,@schedule_name,@standard_hours,@overtime_hrs,@fatigue_risk,@fatigue_score,@safety_score,@work_days,@tenure_months,@status,@empl_status,@start_date,@sf_source)
      ON CONFLICT(id) DO UPDATE SET
        first_name=excluded.first_name, last_name=excluded.last_name, job_title=excluded.job_title,
        department=excluded.department, location=excluded.location, shift=excluded.shift,
        schedule_code=excluded.schedule_code, schedule_name=excluded.schedule_name,
        standard_hours=excluded.standard_hours, overtime_hrs=excluded.overtime_hrs,
        fatigue_risk=excluded.fatigue_risk, fatigue_score=excluded.fatigue_score,
        safety_score=excluded.safety_score, work_days=excluded.work_days,
        tenure_months=excluded.tenure_months, status=excluded.status,
        updated_at=datetime('now')
    `).run(emp);
  },
  updateEmployee: (id, data) => {
    const fields = Object.keys(data).map(k => `${k}=?`).join(",");
    return db.prepare(`UPDATE employees SET ${fields}, updated_at=datetime('now') WHERE id=?`).run(...Object.values(data), id);
  },
  countEmployees: (factoryId) => factoryId
    ? db.prepare("SELECT COUNT(*) as c FROM employees WHERE factory_id=?").get(factoryId).c
    : db.prepare("SELECT COUNT(*) as c FROM employees").get().c,

  // AI Actions
  saveAction:      (action) => db.prepare(`
    INSERT INTO ai_actions (employee_id, action_type, action_verb, title, detail, outcome, value, applied_by)
    VALUES (@employee_id,@action_type,@action_verb,@title,@detail,@outcome,@value,@applied_by)
  `).run(action),
  getActions:      (employeeId) => db.prepare("SELECT * FROM ai_actions WHERE employee_id=? ORDER BY applied_at DESC").all(employeeId),
  getRecentActions: (limit=20) => db.prepare(`
    SELECT a.*, e.first_name||' '||e.last_name as emp_name, e.factory_id
    FROM ai_actions a JOIN employees e ON a.employee_id=e.id
    ORDER BY a.applied_at DESC LIMIT ?
  `).all(limit),

  // Safety Incidents
  saveIncident: (inc) => {
    const row = {
      employee_id:    inc.employee_id    || null,
      factory_id:     inc.factory_id     || null,
      incident_type:  inc.incident_type  || "OTHER",
      incident_name:  inc.incident_name  || inc.incident_type || "Incident",
      severity:       inc.severity       || "MEDIUM",
      description:    inc.description    || "",
      quantity_days:  inc.quantity_days  || 1,
      incident_date:  inc.incident_date  || new Date().toISOString().slice(0,10),
      reported_by:    inc.reported_by    || "system",
    };
    return db.prepare(`
      INSERT INTO safety_incidents (employee_id, factory_id, incident_type, incident_name, severity, description, quantity_days, incident_date, reported_by)
      VALUES (@employee_id,@factory_id,@incident_type,@incident_name,@severity,@description,@quantity_days,@incident_date,@reported_by)
    `).run(row);
  },
  getIncidents:    (factoryId) => db.prepare("SELECT * FROM safety_incidents WHERE factory_id=? ORDER BY incident_date DESC").all(factoryId),
  getAllIncidents:  () => db.prepare("SELECT * FROM safety_incidents ORDER BY incident_date DESC LIMIT 200").all(),
  resolveIncident: (id, by) => db.prepare("UPDATE safety_incidents SET status='resolved', resolved_at=datetime('now'), reported_by=? WHERE id=?").run(by, id),

  // Fatigue Alerts
  saveFatigueAlert: (alert) => db.prepare(`
    INSERT INTO fatigue_alerts (employee_id, factory_id, fatigue_score, risk_level, overtime_hrs, alert_reason)
    VALUES (@employee_id,@factory_id,@fatigue_score,@risk_level,@overtime_hrs,@alert_reason)
  `).run(alert),
  getFatigueAlerts: (factoryId) => factoryId
    ? db.prepare("SELECT a.*, COALESCE(e.first_name||' '||e.last_name, a.alert_reason) as emp_name, COALESCE(e.job_title,'Employee') as job_title FROM fatigue_alerts a LEFT JOIN employees e ON a.employee_id=e.id WHERE a.factory_id=? AND a.resolved=0 ORDER BY a.fatigue_score DESC").all(factoryId)
    : db.prepare("SELECT a.*, COALESCE(e.first_name||' '||e.last_name, a.alert_reason) as emp_name, COALESCE(e.job_title,'Employee') as job_title, a.factory_id FROM fatigue_alerts a LEFT JOIN employees e ON a.employee_id=e.id WHERE a.resolved=0 ORDER BY a.fatigue_score DESC LIMIT 100").all(),
  notifyManager:   (id, by) => db.prepare("UPDATE fatigue_alerts SET manager_notified=1, notified_at=datetime('now') WHERE id=?").run(id),
  resolveFatigue:  (id) => db.prepare("UPDATE fatigue_alerts SET resolved=1, resolved_at=datetime('now') WHERE id=?").run(id),

  // Shift Plans
  saveShiftPlan:   (plan) => db.prepare(`
    INSERT INTO shift_plans (factory_id, plan_name, current_efficiency, optimized_efficiency, savings, summary, shifts, actions, status, created_by)
    VALUES (@factory_id,@plan_name,@current_efficiency,@optimized_efficiency,@savings,@summary,@shifts,@actions,@status,@created_by)
  `).run(plan),
  getShiftPlans:   (factoryId) => db.prepare("SELECT * FROM shift_plans WHERE factory_id=? ORDER BY created_at DESC LIMIT 10").all(factoryId),
  approveShiftPlan:(id, by) => db.prepare("UPDATE shift_plans SET status='approved', approved_by=?, approved_at=datetime('now') WHERE id=?").run(by, id),

  // Skills
  getSkills:       (factoryId) => factoryId
    ? db.prepare("SELECT * FROM skills_assessments WHERE factory_id=? ORDER BY gap DESC").all(factoryId)
    : db.prepare("SELECT domain, AVG(required_score) as required_score, AVG(current_score) as current_score, AVG(gap) as gap FROM skills_assessments GROUP BY domain ORDER BY gap DESC").all(),
  updateSkill:     (id, data) => {
    const fields = Object.keys(data).map(k => `${k}=?`).join(",");
    return db.prepare(`UPDATE skills_assessments SET ${fields}, updated_at=datetime('now') WHERE id=?`).run(...Object.values(data), id);
  },

  // Notifications
  saveNotification: (n) => db.prepare(`
    INSERT INTO notifications (type, title, message, recipient, related_id, related_type, sent_by)
    VALUES (@type,@title,@message,@recipient,@related_id,@related_type,@sent_by)
  `).run(n),
  getNotifications: (recipient) => db.prepare("SELECT * FROM notifications WHERE recipient=? OR recipient='all' ORDER BY created_at DESC LIMIT 50").all(recipient),
  markRead:        (id) => db.prepare("UPDATE notifications SET read=1, read_at=datetime('now') WHERE id=?").run(id),
  getUnreadCount:  (recipient) => db.prepare("SELECT COUNT(*) as c FROM notifications WHERE (recipient=? OR recipient='all') AND read=0").get(recipient).c,

  // Audit Log
  audit:           (action, entityType, entityId, oldVal, newVal, by) =>
    db.prepare("INSERT INTO audit_log (action, entity_type, entity_id, old_value, new_value, performed_by) VALUES (?,?,?,?,?,?)").run(action, entityType, entityId, JSON.stringify(oldVal), JSON.stringify(newVal), by),
  getAuditLog:     (entityId) => db.prepare("SELECT * FROM audit_log WHERE entity_id=? ORDER BY created_at DESC LIMIT 50").all(entityId),

  // Dashboard summary
  getDashboardStats: () => ({
    factories:        db.prepare("SELECT COUNT(*) as c FROM factories").get().c,
    employees:        db.prepare("SELECT COUNT(*) as c FROM employees").get().c,
    highRiskEmployees:db.prepare("SELECT COUNT(*) as c FROM employees WHERE fatigue_risk='HIGH'").get().c,
    openIncidents:    db.prepare("SELECT COUNT(*) as c FROM safety_incidents WHERE status='open'").get().c,
    pendingAlerts:    db.prepare("SELECT COUNT(*) as c FROM fatigue_alerts WHERE resolved=0").get().c,
    actionsApplied:   db.prepare("SELECT COUNT(*) as c FROM ai_actions WHERE status='applied'").get().c,
    avgSafetyScore:   db.prepare("SELECT AVG(safety_score) as avg FROM employees").get().avg || 0,
    pendingShiftPlans:db.prepare("SELECT COUNT(*) as c FROM shift_plans WHERE status='draft'").get().c,
  }),
};
