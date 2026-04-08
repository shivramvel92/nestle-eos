/* eslint-disable no-unused-vars, no-dupe-keys, react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useMemo } from "react";

// SAP Fiori-style typography: Inter font
const FONT_LINK = document.createElement("link");
FONT_LINK.rel = "stylesheet";
FONT_LINK.href = "https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;500;600;700;800;900&display=swap";
document.head.appendChild(FONT_LINK);

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const API_BASE = "http://localhost:3001";
const tok = () => localStorage.getItem("eos_token") || "";
const authH = () => ({ "Content-Type":"application/json", "Authorization":"Bearer "+tok() });
const apiFetch = (path, opts={}) => fetch(API_BASE+path, { ...opts, headers:{ ...authH(), ...(opts.headers||{}) } }).then(r=>r.json());



// ── Demo credential hints (passwords never stored in frontend) ────
const DEMO_HINTS = [
  { username:"admin",          password:"Admin@Nestle2024", name:"Sarah Mitchell",   role:"Global HR Director",          zone:"HQ – Vevey"  },
  { username:"thomas.brauer",  password:"Nestle@2024",      name:"Thomas Brauer",    role:"EMENA HR Business Partner",   zone:"EMENA"       },
  { username:"priya.nair",     password:"Nestle@2024",      name:"Priya Nair",       role:"AOA HR Manager",              zone:"AOA"         },
  { username:"carlos.mendoza", password:"Nestle@2024",      name:"Carlos Mendoza",   role:"Global Safety Officer",       zone:"AMS"         },
  { username:"wei.zhang",      password:"Nestle@2024",      name:"Wei Zhang",        role:"Factory Operations Manager",  zone:"GC"          },
  { username:"nestle.demo",    password:"Demo@2024",        name:"Demo User",        role:"HR Viewer",                   zone:"Global"      },
];


const C = {
  bg:         "#F5F5F5",   // nestle.com light grey page bg
  surface:    "#FFFFFF",   // pure white cards
  surfaceAlt: "#F0F2F5",   // slightly off-white alt
  border:     "#E0E0E0",   // very light border
  accent:     "#E8312A",   // Nestlé red (primary brand)
  accentSoft: "#FF4D44",
  accentBlue: "#005695",   // Nestlé blue (secondary brand)
  gold:       "#B45309",   // warm amber
  text:       "#1A1A1A",   // near-black primary text
  muted:      "#6B7280",   // medium grey
  mutedLight: "#9CA3AF",   // light grey
  green:      "#047857",   // deep green
  yellow:     "#D97706",
  blue:       "#005695",   // Nestlé brand blue
  purple:     "#6D28D9",
  shadow:     "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:   "0 4px 12px rgba(0,0,0,0.08)",
};

// ── seeded PRNG ────────────────────────────────────────────────────
function seededRng(seed) {
  let s = Math.abs(seed) % 2147483647 || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// ── name pools per factory ─────────────────────────────────────────
const NAMES = {
  "MX-05": { first: ["Carlos","Miguel","Alejandro","José","Luis","Jorge","Manuel","Francisco","Juan","Roberto","María","Ana","Claudia","Patricia","Sandra","Gabriela","Sofía","Laura","Elena","Rosa","Diego","Andrés","Ricardo","Sergio","Fernando","Isabel","Valeria","Mónica","Daniela","Verónica"], last: ["García","Martínez","López","Hernández","González","Pérez","Sánchez","Ramírez","Torres","Flores","Morales","Jiménez","Vargas","Castillo","Romero","Ortega","Ruiz","Mendoza","Reyes","Cruz"] },
  "IN-04": { first: ["Rajesh","Priya","Amit","Neha","Suresh","Kavya","Vikram","Anita","Ravi","Deepa","Kiran","Sunita","Arjun","Meera","Sanjay","Pooja","Rahul","Divya","Anil","Rekha","Vijay","Nisha","Manoj","Swati","Ashok","Geeta","Nikhil","Shweta","Ramesh","Puja"], last: ["Sharma","Patel","Singh","Verma","Gupta","Kumar","Yadav","Joshi","Mehta","Nair","Reddy","Iyer","Pillai","Rao","Shah","Mishra","Jain","Agarwal","Bose","Das"] },
  "BR-02": { first: ["João","Pedro","Lucas","Gabriel","Rafael","Matheus","Gustavo","Thiago","Felipe","André","Ana","Fernanda","Juliana","Camila","Beatriz","Mariana","Amanda","Larissa","Natalia","Paula","Bruno","Ricardo","Marcelo","Leonardo","Eduardo"], last: ["Silva","Santos","Oliveira","Souza","Lima","Pereira","Costa","Ferreira","Alves","Rodrigues","Gomes","Martins","Rocha","Ribeiro","Almeida","Carvalho","Nascimento","Moreira","Cardoso","Barbosa"] },
  "US-07": { first: ["James","Michael","Robert","David","William","John","Thomas","Mark","Steven","Kevin","Jennifer","Mary","Patricia","Linda","Barbara","Elizabeth","Susan","Jessica","Sarah","Karen","Emily","Daniel","Chris","Matthew","Anthony"], last: ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Wilson","Anderson","Taylor","Martinez","Thomas","Lee","Moore","Jackson","Harris","Thompson","White","Clark"] },
  "CN-03": { first: ["Wei","Fang","Jun","Lei","Hao","Jing","Ying","Ming","Tao","Hui","Xin","Li","Na","Yang","Xue","Rui","Chen","Lan","Bo","Shan","Gang","Bin","Qiang","Peng","Jie"], last: ["Wang","Li","Zhang","Liu","Chen","Yang","Huang","Zhao","Wu","Zhou","Xu","Sun","Ma","Zhu","Hu","Lin","Guo","He","Luo","Cao"] },
  "VD-01": { first: ["Hans","Peter","Thomas","Andreas","Michael","Stefan","Daniel","Markus","Christian","Martin","Anna","Marie","Sarah","Julia","Lea","Sandra","Nicole","Claudia","Barbara","Monika","Lukas","Simon","Fabian","Tobias","Florian"], last: ["Müller","Meier","Schmid","Keller","Weber","Huber","Schneider","Meyer","Steiner","Fischer","Baumann","Zimmermann","Brunner","Wirz","Roth","Gerber","Moser","Nussbaumer","Graf","Lehmann"] },
};

const ROLES_FACTORY = ["Milk Processing Technician","Chocolate Conching Operator","Coffee Roasting Specialist","Infant Formula Technician","Packaging Line Operator","Quality Assurance Analyst","Food Safety Auditor","Flavour Development Technician","Cold Chain Supervisor","Sterilisation Technician","Nespresso Pod Operator","Maggi Seasoning Technician","KitKat Enrober Operator","MILO Blending Technician","Nutritional Compliance Officer","Shift Supervisor","Process Engineer","Maintenance Technician","Lab Analyst","HSE Officer"];
const ROLES_OFFICE  = ["HR Business Partner","Zone Supply Chain Manager","Nestlé Business Services Analyst","R&D Food Scientist","Nutritional Science Manager","Category Development Manager","Demand Planning Analyst","Nespresso B2B Account Manager","Purina PetCare Specialist","Corporate Wellness Manager","SAP S/4HANA Consultant","ESG Reporting Analyst","Trade Marketing Manager","Global Procurement Specialist","Factory Excellence Coach"];
const DEPTS = ["Liquid & Beverage Production","Confectionery Line","Dairy & Infant Nutrition","Culinary & Seasonings","Coffee & Beverages","Quality & Food Safety","Packaging & Sustainability","Technical Maintenance","Cold Chain & Logistics","R&D Innovation Hub","Nestlé Business Services","HR & Organisational Development","Finance & Control","IT & Digital Transformation","HSE & Compliance"];
const DAYS  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const SHIFTS = [
  { id: "A", label: "Morning",   time: "06:00 – 14:00", color: "#D46B08", bg: "#FFF7E6", border: "#FFD591" },
  { id: "B", label: "Afternoon", time: "14:00 – 22:00", color: "#005695", bg: "#E6F4FF", border: "#91CAFF" },
  { id: "C", label: "Night",     time: "22:00 – 06:00", color: "#531DAB", bg: "#F9F0FF", border: "#D3ADF7" },
];

function makeEmployee(factory, idx) {
  const seed = factory.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 10000 + idx * 17 + 3;
  const r = seededRng(seed);
  const pool = NAMES[factory.id] || NAMES["US-07"];
  const fn   = pool.first[Math.floor(r() * pool.first.length)];
  const ln   = pool.last[Math.floor(r() * pool.last.length)];
  const isOff = r() > 0.78;
  const roles = isOff ? ROLES_OFFICE : ROLES_FACTORY;
  const role  = roles[Math.floor(r() * roles.length)];
  const dept  = DEPTS[Math.floor(r() * DEPTS.length)];
  const shift = SHIFTS[Math.floor(r() * 3)];
  const tenure      = 1 + Math.floor(r() * 18);
  const overtimeHrs = Math.floor(r() * 18);
  const fatigueRisk = overtimeHrs > 12 ? "HIGH" : overtimeHrs > 8 ? "MEDIUM" : "LOW";
  const safetyScore = Math.floor(60 + r() * 40);
  const workDays = [...DAYS].sort(() => r() - 0.5).slice(0, 5).sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
  return {
    id: `${factory.id}-${String(idx + 1).padStart(4, "0")}`,
    name: `${fn} ${ln}`, avatar: `${fn[0]}${ln[0]}`,
    role, dept, shift, tenure, overtimeHrs, fatigueRisk, safetyScore, workDays,
  };
}


// Map a SuccessFactors User record to our employee schema
function mapSFEmployee(sfUser, factory, idx) {
  // Deterministic RNG seeded by SF userId for fatigue/safety scores
  const seed = (sfUser.userId || String(idx)).split("").reduce((a,c) => a + c.charCodeAt(0), 0) * 17 + idx;
  const r    = seededRng(seed);

  // ── Real work days from SF WorkScheduleDay ──────────────────────
  // sfUser.workDays = ["Mon","Tue",...] from server (real SF data)
  // DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
  const sfWorkDays = sfUser.workDays && sfUser.workDays.length > 0
    ? sfUser.workDays.filter(d => DAYS.includes(d))
    : null;

  // Fallback to seeded random if SF gave us nothing
  const workDays = sfWorkDays || [...DAYS].sort(() => r() - 0.5).slice(0, 5).sort((a,b) => DAYS.indexOf(a) - DAYS.indexOf(b));

  // ── Shift derived from SF schedule name / hours ─────────────────
  const scheduleName = (sfUser.scheduleName || "").toLowerCase();
  let shift;
  if (scheduleName.includes("night") || scheduleName.includes("late")) {
    shift = SHIFTS[2]; // Night
  } else if (scheduleName.includes("afternoon") || scheduleName.includes("evening") || scheduleName.includes("pm")) {
    shift = SHIFTS[1]; // Afternoon
  } else {
    shift = SHIFTS[0]; // Morning (default for Early/Standard/NORM/SUN-THU etc.)
  }

  // ── Hours from SF standardHours ────────────────────────────────
  const stdHours    = sfUser.standardHours || 40;
  const hoursPerDay = sfUser.scheduleHours || 8;
  const overtimeHrs = Math.max(0, stdHours - 40) + Math.floor(r() * 6); // realistic OT

  const fatigueRisk = overtimeHrs > 12 ? "HIGH" : overtimeHrs > 8 ? "MEDIUM" : "LOW";
  const safetyScore = Math.floor(60 + r() * 40);

  // ── Tenure from real SF start date ─────────────────────────────
  let tenure = 1 + Math.floor(r() * 60);
  if (sfUser.startDate) {
    const ms = Date.now() - new Date(sfUser.startDate).getTime();
    tenure = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24 * 30)));
  }

  const fn = (sfUser.firstName || "Unknown").trim();
  const ln = (sfUser.lastName  || "").trim();

  return {
    id:              sfUser.userId || (factory.id + "-" + String(idx+1).padStart(4,"0")),
    name:            (fn + " " + ln).trim(),
    avatar:          (fn[0] || "?") + (ln[0] || ""),
    role:            sfUser.jobTitle        || "Employee",
    dept:            sfUser.department      || "General",
    location:        sfUser.location        || factory.name,
    gender:          sfUser.gender          || "",
    nationality:     sfUser.nationality     || "",
    timezone:        sfUser.timezone        || "",
    workscheduleCode:sfUser.workscheduleCode|| "",
    scheduleName:    sfUser.scheduleName    || "Standard",
    scheduleHours:   hoursPerDay,
    shift, tenure, overtimeHrs, fatigueRisk, safetyScore, workDays,
    status:          sfUser.status          || "Active",
    sfSource:        true,
  };
}

const FACTORIES = [
  { id: "VD-01", name: "Vevey HQ Plant", country: "Switzerland", zone: "EMENA", workers: 1240, risk: "low",    utilization: 87 },
  { id: "IN-04", name: "Pune Factory",   country: "India",       zone: "AOA",   workers: 3800, risk: "high",   utilization: 94 },
  { id: "BR-02", name: "São Paulo",      country: "Brazil",      zone: "AMS",   workers: 2600, risk: "medium", utilization: 79 },
  { id: "US-07", name: "Solon Ohio",     country: "USA",         zone: "AMS",   workers: 890,  risk: "low",    utilization: 82 },
  { id: "CN-03", name: "Tianjin",        country: "China",       zone: "GC",    workers: 4200, risk: "medium", utilization: 91 },
  { id: "MX-05", name: "Silao",          country: "Mexico",      zone: "AMS",   workers: 1650, risk: "high",   utilization: 96 },
];

const PAGE_SIZE = 25;

// ── small components ───────────────────────────────────────────────
const Badge = ({ label, color }) => {
  const map = { red:["#FFF1F0","#CF1322","#FFCCC7"], yellow:["#FFFBE6","#D46B08","#FFE58F"], green:["#F6FFED","#389E0D","#B7EB8F"], blue:["#E6F4FF","#005695","#91CAFF"], purple:["#F9F0FF","#531DAB","#D3ADF7"] };
  const [bg,txt,bd] = map[color]||map.green;
  return <span style={{ fontSize:10, fontWeight:600, letterSpacing:"0.06em", padding:"2px 8px", borderRadius:4, background:bg, color:txt, border:`1px solid ${bd}`, whiteSpace:"nowrap", fontVariantNumeric:"tabular-nums" }}>{label}</span>;
};

function useAIChat() {
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const send = async (text, sys) => {
    const next = [...messages, { role:"user", content:text }];
    setMessages(next); setLoading(true);
    try {
      const res  = await fetch(API_BASE+"/proxy", { method:"POST", headers:authH(), body:JSON.stringify({ model:ANTHROPIC_MODEL, max_tokens:1000, system:sys, messages:next }) });
      const data = await res.json();
      const reply = data.content?.find(b=>b.type==="text")?.text || "No response.";
      setMessages(m => [...m, { role:"assistant", content:reply }]);
    } catch { setMessages(m => [...m, { role:"assistant", content:"⚠️ API error." }]); }
    setLoading(false);
  };
  return { messages, loading, send, reset:()=>setMessages([]) };
}

// ══════════════════════════════════════════════════════════════════
// EMPLOYEE DETAIL PANEL
// ══════════════════════════════════════════════════════════════════
function EmployeeDetail({ emp, factory, onClose, onApply }) {
  const [aiLoading,    setAiLoading]    = useState(false);
  const [actions,      setActions]      = useState([]);
  const [aiError,      setAiError]      = useState("");
  const [appliedSet,   setAppliedSet]   = useState(new Set());
  const [workDays,     setWorkDays]     = useState(emp.workDays);
  const [overtimeHrs,  setOvertimeHrs]  = useState(emp.overtimeHrs);
  const [safetyScore,  setSafetyScore]  = useState(emp.safetyScore);
  const [trainingNote, setTrainingNote] = useState("");
  const [briefingNote, setBriefingNote] = useState("");

  const hue = emp.id.split("").reduce((a,c)=>a+c.charCodeAt(0),0) % 360;

  const fetchAI = async () => {
    setAiLoading(true); setActions([]); setAiError(""); setAppliedSet(new Set());
    const sys = `You are Nestlé's AI HR Copilot. Return ONLY a valid JSON object, no markdown, no explanation.\nSchema: { "actions": [ { "id":1, "emoji":"⏱️", "verb":"REDUCE", "title":"short title", "detail":"why with numbers", "outcome":"measurable result", "type":"cap_hours", "value":44 } ] }\nAction types: cap_hours (value=new weekly hours number), add_rest_days (value=array of day names to rest), enroll_training (value=module name string), safety_briefing (value=topic string), rotate_shift (value=new shift label string).\nGenerate exactly 3 actions. Be specific with numbers. Return ONLY JSON.`;
    const user = `Employee: ${emp.name} | Role: ${emp.role} | Dept: ${emp.dept} | Factory: ${factory.name} (${factory.country}) | Shift: ${emp.shift.label} ${emp.shift.time} | Hours/Week: ${overtimeHrs}h | Fatigue Risk: ${emp.fatigueRisk} | Safety Score: ${safetyScore}/100 | Tenure: ${emp.tenure} months | Work Days: ${workDays.join(", ")} | Status: ${emp.status}`;
    try {
      const res  = await fetch(API_BASE+"/proxy", { method:"POST", headers:authH(), body:JSON.stringify({ model:ANTHROPIC_MODEL, max_tokens:600, system:sys, messages:[{ role:"user", content:user }] }) });
      const data = await res.json();
      const text = data.content?.find(b=>b.type==="text")?.text || "";
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      setActions(parsed.actions || []);
    } catch(e) { setAiError("AI unavailable: " + e.message); }
    setAiLoading(false);
  };

  const applyAction = async (action) => {
    if (appliedSet.has(action.id)) return;
    // Optimistic UI updates
    if (action.type === "cap_hours" && typeof action.value === "number") {
      setOvertimeHrs(action.value);
      const newRisk = action.value <= 44 ? "LOW" : action.value <= 50 ? "MEDIUM" : "HIGH";
      if (onApply) onApply(emp.id, { overtimeHrs:action.value, fatigueRisk:newRisk });
    }
    if (action.type === "add_rest_days" && Array.isArray(action.value)) {
      const newDays = workDays.filter(d => !action.value.includes(d));
      setWorkDays(newDays);
      if (onApply) onApply(emp.id, { workDays:newDays });
    }
    if (action.type === "enroll_training") setTrainingNote("Enrolled: " + action.value);
    if (action.type === "safety_briefing") {
      setBriefingNote("Briefing Scheduled: " + action.value);
      const ns = Math.min(100, safetyScore + 5);
      setSafetyScore(ns);
      if (onApply) onApply(emp.id, { safetyScore:ns });
    }
    if (action.type === "rotate_shift") setBriefingNote("Shift Change Requested to " + action.value);
    setAppliedSet(prev => new Set([...prev, action.id]));

    // Persist to database via API
    try {
      await fetch(API_BASE+"/api/employees/"+emp.id+"/actions", {
        method:"POST", headers:authH(),
        body: JSON.stringify({ action_type:action.type, action_verb:action.verb, title:action.title, detail:action.detail, outcome:action.outcome, value:action.value }),
      });
    } catch(e) { console.warn("Action not persisted:", e); }
  };

  const verbColor = { REDUCE:C.accent, ENFORCE:C.gold, ENROLL:C.blue, SCHEDULE:C.purple, ROTATE:C.green };

  return (
    <div style={{ width:"40%", minWidth:360, borderLeft:`1px solid ${C.border}`, background:C.surface, overflowY:"auto", display:"flex", flexDirection:"column", animation:"slideIn 0.2s ease" }}>
      <div style={{ padding:"18px 22px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:"#F8F9FA" }}>
        <span style={{ fontWeight:800, fontSize:14 }}>Employee Profile</span>
        <button onClick={onClose} style={{ background:"none", border:"1px solid #E0E0E0", borderRadius:6, padding:"4px 10px", color:"#9CA3AF", fontSize:13, cursor:"pointer" }}>✕</button>
      </div>
      <div style={{ padding:22, flex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:22 }}>
          <div style={{ width:62, height:62, borderRadius:"50%", background:`hsl(${hue},70%,92%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:`hsl(${hue},70%,32%)`, flexShrink:0, border:`2px solid hsl(${hue},60%,82%)` }}>{emp.avatar}</div>
          <div>
            <div style={{ fontWeight:800, fontSize:19 }}>{emp.name}</div>
            <div style={{ color:"#6B7280", fontSize:11, marginBottom:6 }}>{emp.id}</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <Badge label={emp.fatigueRisk+" RISK"} color={emp.fatigueRisk==="HIGH"?"red":emp.fatigueRisk==="MEDIUM"?"yellow":"green"} />
              <Badge label={emp.shift.label.toUpperCase()+" SHIFT"} color={emp.shift.id==="A"?"yellow":emp.shift.id==="B"?"blue":"purple"} />
              {trainingNote && <Badge label="TRAINING" color="blue" />}
              {appliedSet.size > 0 && <Badge label={appliedSet.size+" APPLIED"} color="green" />}
            </div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:18 }}>
          {[["Role",emp.role],["Department",emp.dept],["Factory",factory.name],["Country",factory.country],["Tenure",emp.tenure+" months"],["Safety Score",safetyScore+" / 100"],["Hours / Week",overtimeHrs+"h"],["Work Schedule",emp.scheduleName||emp.shift.label],["Timezone",emp.timezone||"—"],["Schedule Hours",emp.scheduleHours+"h/day"]].map(([k,v])=>(
            <div key={k} style={{ background:"#F8F8F8", border:"1px solid #EBEBEB", borderRadius:8, padding:"10px 12px" }}>
              <div style={{ color:"#9CA3AF", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{k}</div>
              <div style={{ fontWeight:600, fontSize:12, wordBreak:"break-word" }}>{v}</div>
            </div>
          ))}
        </div>

        {(trainingNote || briefingNote) && (
          <div style={{ marginBottom:14, display:"flex", flexDirection:"column", gap:6 }}>
            {trainingNote && <div style={{ background:"#E6F4FF", border:"1px solid #91CAFF", borderRadius:8, padding:"8px 12px", fontSize:11, color:"#005695", fontWeight:600 }}>📚 {trainingNote}</div>}
            {briefingNote && <div style={{ background:"#FFFBE6", border:"1px solid #FFE58F", borderRadius:8, padding:"8px 12px", fontSize:11, color:"#D46B08", fontWeight:600 }}>🛡️ {briefingNote}</div>}
          </div>
        )}

        <div style={{ background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:10, padding:16, marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:11, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:12 }}>
            📅 Weekly Schedule {appliedSet.size>0 && <span style={{ color:C.green, marginLeft:6 }}>· Updated</span>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5 }}>
            {DAYS.map(d => {
              const on = workDays.includes(d);
              return (
                <div key={d} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:9, color:C.muted, marginBottom:4, fontWeight:600 }}>{d}</div>
                  <div style={{ height:50, borderRadius:8, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:1, background:on?emp.shift.bg:"#F8F9FA", border:`1px solid ${on?emp.shift.border||emp.shift.color+"66":"#E8EDF2"}`, transition:"all 0.4s ease" }}>
                    {on ? (<><div style={{ fontSize:12, color:emp.shift.color, fontWeight:700 }}>✓</div><div style={{ fontSize:8, color:emp.shift.color, fontWeight:800, letterSpacing:"0.05em" }}>{emp.shift.id}</div><div style={{ fontSize:8, color:"#9CA3AF", fontWeight:500 }}>WORK</div></>) : (<div style={{ fontSize:9, color:"#CBD5E1", fontWeight:500 }}>OFF</div>)}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:10, fontSize:11, color:C.muted }}>
            <span style={{ color:emp.shift.color }}>■</span> {emp.scheduleName||emp.shift.label} shift · {emp.scheduleHours}h/day · {workDays.length} working days{emp.workscheduleCode?" · Code: "+emp.workscheduleCode:""}
          </div>
        </div>

        <div style={{ background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.1em" }}>Weekly Hours</span>
            <span style={{ fontWeight:800, fontSize:16, color:overtimeHrs>50?C.accent:overtimeHrs>44?C.gold:C.green, transition:"color 0.4s" }}>{overtimeHrs}h / week</span>
          </div>
          <div style={{ height:8, background:"#F0F0F0", borderRadius:99, overflow:"hidden" }}>
            <div style={{ width:`${Math.min(100,(overtimeHrs/60)*100)}%`, height:"100%", background:overtimeHrs>50?C.accent:overtimeHrs>44?C.gold:C.green, borderRadius:99, transition:"width 0.6s ease, background 0.4s" }} />
          </div>
          <div style={{ marginTop:6, fontSize:11, color:C.muted }}>
            {overtimeHrs>50?"⚠ Exceeds safe threshold — immediate action required":overtimeHrs>44?"Monitor — approaching fatigue zone":"✓ Within safe weekly limits"}
          </div>
        </div>

        <div style={{ background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:10, padding:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em" }}>⚡ AI Action Plan</span>
            <button onClick={fetchAI} disabled={aiLoading} style={{ padding:"5px 14px", fontSize:11, fontWeight:700, background:aiLoading?C.surfaceAlt:C.accent, border:"none", borderRadius:6, color:"#fff", cursor:aiLoading?"not-allowed":"pointer" }}>
              {aiLoading?"Analysing…":actions.length?"Regenerate":"Generate Actions"}
            </button>
          </div>
          {aiLoading && (
            <div style={{ display:"flex", gap:6, alignItems:"center", padding:"8px 0" }}>
              {[0,1,2].map(i=><div key={i} style={{ width:8,height:8,borderRadius:"50%",background:C.accent,animation:`bounce 1s ease-in-out ${i*0.2}s infinite` }} />)}
              <span style={{ color:"#6B7280", fontSize:12 }}>Generating action plan…</span>
            </div>
          )}
          {aiError && <div style={{ color:C.accent, fontSize:12, padding:"8px 0" }}>{aiError}</div>}
          {!actions.length && !aiLoading && !aiError && (
            <div style={{ color:"#6B7280", fontSize:12, textAlign:"center", padding:"10px 0" }}>Generate an AI action plan to see recommended interventions</div>
          )}
          {actions.map(action => {
            const applied = appliedSet.has(action.id);
            const vc = verbColor[action.verb] || C.blue;
            return (
              <div key={action.id} style={{ background:applied?"#F6FFED":"#FFFFFF", border:`1px solid ${applied?"#95DE64":"#EDEDED"}`, borderRadius:10, padding:14, marginBottom:10, transition:"all 0.3s ease", animation:"fadeIn 0.3s ease" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                  <span style={{ fontSize:15 }}>{action.emoji}</span>
                  <span style={{ fontSize:10, fontWeight:900, color:vc, letterSpacing:"0.1em", background:vc+"18", padding:"2px 7px", borderRadius:4 }}>{action.verb}</span>
                </div>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>{action.title}</div>
                <div style={{ fontSize:11, color:C.muted, lineHeight:1.5, marginBottom:4 }}>{action.detail}</div>
                <div style={{ fontSize:11, color:C.green, fontWeight:600, marginBottom:8 }}>→ {action.outcome}</div>
                <button onClick={() => applyAction(action)} disabled={applied} style={{ width:"100%", padding:"7px 0", fontSize:11, fontWeight:800, background:applied?"transparent":vc, border:applied?"1px solid #52C41A":"none", borderRadius:7, color:applied?C.green:"#fff", cursor:applied?"default":"pointer", letterSpacing:"0.05em", transition:"all 0.3s" }}>
                  {applied ? "✓ APPLIED" : "▶ APPLY ACTION"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// EMPLOYEE ROSTER (full-screen overlay)
// ══════════════════════════════════════════════════════════════════
function EmployeeRoster({ factory, highlightRisk, onClose }) {
  const [overrides,   setOverrides]   = useState({});
  const [page,        setPage]        = useState(0);
  const [search,      setSearch]      = useState("");
  const [filterShift, setFilterShift] = useState("ALL");
  const [filterRisk,  setFilterRisk]  = useState(highlightRisk || "ALL");
  const [filterDept,  setFilterDept]  = useState("ALL");
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [sfData,      setSFData]      = useState(null);
  const [sfLoading,   setSFLoading]   = useState(true);
  const [sfError,     setSFError]     = useState("");

  // Fetch employees from local database
  useEffect(() => {
    setSFLoading(true); setSFError(""); setSFData(null);
    const pages = [];
    const BATCH = 100;
    const loadAll = async (skip=0) => {
      const res  = await fetch(API_BASE+"/api/employees?factory="+factory.id+"&top="+BATCH+"&skip="+skip);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      pages.push(...(data.employees||[]));
      if ((data.employees||[]).length === BATCH && pages.length < 1000) await loadAll(skip+BATCH);
    };
    loadAll()
      .then(() => { setSFData(pages.map(u => mapDBEmployee(u, factory))); })
      .catch(err => setSFError(err.message))
      .finally(() => setSFLoading(false));
  }, [factory]); // eslint-disable-line

  const allEmployees = useMemo(() =>
    sfData || Array.from({ length: factory.workers }, (_, i) => makeEmployee(factory, i)),
    [sfData, factory]
  );

  const filtered = useMemo(() => allEmployees.filter(e => {
    if (search && !`${e.name} ${e.role} ${e.dept} ${e.id}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterShift !== "ALL" && e.shift.id !== filterShift) return false;
    if (filterRisk  !== "ALL" && e.fatigueRisk !== filterRisk) return false;
    if (filterDept  !== "ALL" && e.dept !== filterDept) return false;
    return true;
  }), [allEmployees, search, filterShift, filterRisk, filterDept]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageEmps   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => setPage(0), [search, filterShift, filterRisk, filterDept]);

  const highCount  = useMemo(() => allEmployees.filter(e=>e.fatigueRisk==="HIGH").length, [allEmployees]);
  const nightCount = useMemo(() => allEmployees.filter(e=>e.shift.id==="C").length, [allEmployees]);
  const avgOT      = useMemo(() => (allEmployees.reduce((s,e)=>s+e.overtimeHrs,0)/allEmployees.length).toFixed(1), [allEmployees]);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"#F5F7FA", display:"flex", flexDirection:"column", animation:"fadeIn 0.2s ease" }}>

      {/* ── top bar ── */}
      <div style={{ padding:"16px 28px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#FFFFFF", borderBottom:"1px solid #EDEDED", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <button onClick={onClose} style={{ background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 16px", color:"#1A1A1A", fontSize:13, cursor:"pointer", fontWeight:700 }}>← Back</button>
          <div>
            <div style={{ fontWeight:800, fontSize:17 }}>{factory.name} — Full Workforce Roster</div>
            <div style={{ color:"#6B7280", fontSize:12 }}>{factory.country} · {factory.zone} · {factory.id} · {(sfData ? sfData.length : factory.workers).toLocaleString()} employees</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Badge label={highCount+" HIGH RISK"} color="red" />
          <Badge label={`${factory.workers.toLocaleString()} WORKERS`} color="blue" />
          <Badge label={factory.risk.toUpperCase()+" FACTORY RISK"} color={factory.risk==="high"?"red":factory.risk==="medium"?"yellow":"green"} />
        </div>
      </div>

      {/* ── SF status banner ── */}
      {sfLoading && (
        <div style={{ margin:"12px 28px 0", padding:"10px 16px", background:"#E6F4FF", border:"1px solid #91CAFF", borderRadius:8, display:"flex", alignItems:"center", gap:10, fontSize:12 }}>
          <div style={{ display:"flex", gap:5 }}>{[0,1,2].map(i=><div key={i} style={{ width:7,height:7,borderRadius:"50%",background:"#005695",animation:`bounce 1s ease-in-out ${i*0.2}s infinite` }}/>)}</div>
          <span style={{ color:"#005695", fontWeight:600 }}>Loading employees from database…</span>
        </div>
      )}
      {sfError && !sfLoading && (
        <div style={{ margin:"12px 28px 0", padding:"10px 16px", background:"#FFF1F0", border:"1px solid #FFCCC7", borderRadius:8, color:"#CF1322", fontSize:11, color:"#F87171" }}>
          ⚠️ Database error — showing generated workforce data.&nbsp;
          <span style={{ color:C.muted, fontFamily:"monospace" }}>{sfError}</span>
        </div>
      )}
      {sfData && !sfError && !sfLoading && (
        <div style={{ margin:"12px 28px 0", padding:"8px 16px", background:"#F6FFED", border:"1px solid #B7EB8F", borderRadius:8, fontSize:11, color:"#389E0D", fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
          ✅ {sfData.length.toLocaleString()} employees loaded from local database · Factory: {factory.id}
        </div>
      )}

      {/* ── KPI strip ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, padding:"14px 28px", borderBottom:`1px solid ${C.border}`, background:"#FAFBFC", borderBottom:"1px solid #EDEDED", flexShrink:0 }}>
        {[
          { label:"Total Workforce",      value:(allEmployees.length||0).toLocaleString(), accent:C.blue },
          { label:"High Fatigue Risk",    value:highCount,                         accent:C.accent },
          { label:"Night Shift Workers",  value:nightCount.toLocaleString(),        accent:C.purple },
          { label:"Avg Overtime hrs/wk",  value:avgOT,                             accent:C.gold },
        ].map(k=>(
          <div key={k.label} style={{ background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 16px", borderLeft:`3px solid ${k.accent}` }}>
            <div style={{ color:"#9CA3AF", fontSize:10, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:3 }}>{k.label}</div>
            <div style={{ color:"#1A1A1A", fontSize:22, fontWeight:800 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── filter bar ── */}
      <div style={{ padding:"10px 28px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", background:"#FFFFFF", borderBottom:"1px solid #EDEDED", flexShrink:0 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, role, ID, department…"
          style={{ flex:"1 1 220px", padding:"8px 14px", fontSize:13, background:"#FFFFFF", border:"1px solid #E2E8F0", borderRadius:8, color:"#374151", outline:"none" }} />
        {[
          { val:filterShift, set:setFilterShift, opts:[["ALL","All Shifts"],["A","Morning 06–14"],["B","Afternoon 14–22"],["C","Night 22–06"]] },
          { val:filterRisk,  set:setFilterRisk,  opts:[["ALL","All Risk"],["HIGH","High Risk"],["MEDIUM","Medium"],["LOW","Low"]] },
          { val:filterDept,  set:setFilterDept,  opts:[["ALL","All Depts"],...DEPTS.map(d=>[d,d])] },
        ].map((f,i)=>(
          <select key={i} value={f.val} onChange={e=>f.set(e.target.value)}
            style={{ padding:"8px 12px", fontSize:12, background:"#FFFFFF", border:"1px solid #E2E8F0", borderRadius:8, color:"#374151", outline:"none", cursor:"pointer" }}>
            {f.opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <span style={{ color:"#6B7280", fontSize:12, marginLeft:"auto", whiteSpace:"nowrap" }}>
          {filtered.length.toLocaleString()} of {factory.workers.toLocaleString()} shown
        </span>
      </div>

      {/* ── body: table + detail ── */}
      <div style={{ flex:1, overflow:"hidden", display:"flex" }}>
        {/* TABLE */}
        <div style={{ flex:1, overflowY:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead style={{ position:"sticky", top:0, zIndex:10, background:"#F8F9FA" }}>
              <tr>
                {["Employee","Role / Department","Schedule","Working Days","Hrs/Wk","Risk","Safety Score",""].map(h=>(
                  <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10, fontWeight:600, color:"#94A3B8", letterSpacing:"0.08em", textTransform:"uppercase", borderBottom:"2px solid #F1F5F9", whiteSpace:"nowrap", background:"#F8FAFC" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageEmps.map(emp => {
                const ov = overrides[emp.id] || {};
                const rowEmp = { ...emp, ...ov };
                const hue = emp.id.split("").reduce((a,c)=>a+c.charCodeAt(0),0) % 360;
                const active = selectedEmp?.id === emp.id;
                return (
                  <tr key={emp.id} onClick={()=>setSelectedEmp(active?null:emp)}
                    style={{ borderBottom:"1px solid #F0F0F0", cursor:"pointer", background:active?"#EBF4FF":"transparent", transition:"background 0.1s" }}
                    onMouseOver={e=>{ if(!active) e.currentTarget.style.background="#F8FBFF"; }}
                    onMouseOut={e=>{ if(!active) e.currentTarget.style.background="transparent"; }}>

                    {/* Employee */}
                    <td style={{ padding:"11px 16px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:34, height:34, borderRadius:"50%", background:`hsl(${hue},70%,92%)`, border:`1.5px solid hsl(${hue},60%,82%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:`hsl(${hue},70%,32%)`, flexShrink:0 }}>{emp.avatar}</div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:13, color:"#1A1A1A" }}>{emp.name}</div>
                          <div style={{ color:"#9CA3AF", fontSize:10 }}>{emp.id} · {emp.tenure}mo</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td style={{ padding:"11px 16px" }}>
                      <div style={{ fontSize:12, fontWeight:500, color:"#374151" }}>{emp.role}</div>
                      <div style={{ fontSize:11, color:"#94A3B8" }}>{emp.dept}</div>
                    </td>

                    {/* Shift */}
                    <td style={{ padding:"11px 16px" }}>
                      <div style={{ display:"inline-flex", flexDirection:"column", alignItems:"flex-start", background:emp.shift.bg, border:`1px solid ${emp.shift.border||emp.shift.color+"44"}`, borderRadius:6, padding:"5px 12px", gap:1 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:emp.shift.color, letterSpacing:"0.01em" }}>{emp.shift.label}</span>
                        <span style={{ fontSize:9, color:emp.shift.color, opacity:0.7 }}>{emp.shift.time}</span>
                      </div>
                    </td>

                    {/* Weekly mini-grid */}
                    <td style={{ padding:"11px 16px" }}>
                      <div style={{ display:"flex", gap:3 }}>
                        {DAYS.map(d => {
                          const on = rowEmp.workDays.includes(d);
                          return (
                            <div key={d} title={on?`${d}: ${emp.shift.time}`:`${d}: Off`}
                              style={{ width:22, height:22, borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, background:on?emp.shift.bg:"#F5F7F9", color:on?emp.shift.color:"#CBD5E1", border:`1px solid ${on?emp.shift.border||emp.shift.color+"55":"#E8EDF2"}`, transition:"all 0.3s ease" }}>
                              {d[0]}
                            </div>
                          );
                        })}
                      </div>
                    </td>

                    {/* Overtime */}
                    <td style={{ padding:"11px 16px", whiteSpace:"nowrap" }}>
                      <span style={{ fontSize:15, fontWeight:800, color:rowEmp.overtimeHrs>50?"#CF1322":rowEmp.overtimeHrs>44?"#D46B08":"#389E0D", transition:"color 0.4s", fontWeight:700 }}>{rowEmp.overtimeHrs}h</span>
                      <span style={{ color:"#9CA3AF", fontSize:10 }}>/wk</span>
                    </td>

                    {/* Fatigue risk */}
                    <td style={{ padding:"11px 16px" }}>
                      <Badge label={rowEmp.fatigueRisk} color={rowEmp.fatigueRisk==="HIGH"?"red":rowEmp.fatigueRisk==="MEDIUM"?"yellow":"green"} />
                    </td>

                    {/* Safety score */}
                    <td style={{ padding:"11px 16px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:48, height:5, background:"#EDF2F7", borderRadius:99, overflow:"hidden" }}>
                          <div style={{ width:`${rowEmp.safetyScore}%`, height:"100%", background:rowEmp.safetyScore>80?"#10B981":rowEmp.safetyScore>65?"#F59E0B":"#EF4444", borderRadius:99, transition:"width 0.6s ease, background 0.4s" }} />
                        </div>
                        <span style={{ fontSize:11, fontWeight:700, color:C.muted, transition:"color 0.4s" }}>{rowEmp.safetyScore}</span>
                      </div>
                    </td>

                    {/* CTA */}
                    <td style={{ padding:"11px 16px" }}>
                      <button onClick={e=>{ e.stopPropagation(); setSelectedEmp(active?null:emp); }}
                        style={{ padding:"5px 14px", fontSize:11, fontWeight:600, background:active?"#F0F4F8":"#005695", border:`1px solid ${active?"#D0D0D0":"#005695"}`, borderRadius:5, color:active?"#6B7280":"#FFFFFF", cursor:"pointer", whiteSpace:"nowrap", letterSpacing:"0.02em" }}>
                        {active?"Close":"View →"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {pageEmps.length === 0 && (
            <div style={{ textAlign:"center", padding:60, color:"#9CA3AF" }}>No employees match your filters.</div>
          )}
        </div>

        {/* DETAIL PANEL */}
        {selectedEmp && <EmployeeDetail emp={selectedEmp} factory={factory} onClose={()=>setSelectedEmp(null)}
          onApply={(empId, changes) => setOverrides(prev => ({ ...prev, [empId]: { ...(prev[empId]||{}), ...changes } }))} />}
      </div>

      {/* ── pagination ── */}
      {totalPages > 1 && (
        <div style={{ padding:"10px 28px", borderTop:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#FFFFFF", borderTop:"1px solid #EDEDED", flexShrink:0 }}>
          <span style={{ fontSize:12, color:"#64748B" }}>
            Page {page+1} of {totalPages} · {page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,filtered.length)} of {filtered.length.toLocaleString()} employees
          </span>
          <div style={{ display:"flex", gap:5 }}>
            {[["«",()=>setPage(0),page===0],["‹",()=>setPage(p=>Math.max(0,p-1)),page===0]].map(([l,fn,dis])=>(
              <button key={l} onClick={fn} disabled={dis} style={{ padding:"5px 10px", fontSize:12, background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:6, color:C.text, cursor:dis?"not-allowed":"pointer", opacity:dis?0.4:1 }}>{l}</button>
            ))}
            {Array.from({ length:Math.min(7,totalPages) }, (_,i)=>{
              const p = Math.max(0,Math.min(totalPages-7,page-3))+i;
              return <button key={p} onClick={()=>setPage(p)} style={{ padding:"5px 10px", fontSize:12, background:p===page?C.accent:C.surfaceAlt, border:`1px solid ${p===page?C.accent:C.border}`, borderRadius:6, color:"#fff", cursor:"pointer", fontWeight:p===page?700:400 }}>{p+1}</button>;
            })}
            {[["›",()=>setPage(p=>Math.min(totalPages-1,p+1)),page===totalPages-1],["»",()=>setPage(totalPages-1),page===totalPages-1]].map(([l,fn,dis])=>(
              <button key={l} onClick={fn} disabled={dis} style={{ padding:"5px 10px", fontSize:12, background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:6, color:C.text, cursor:dis?"not-allowed":"pointer", opacity:dis?0.4:1 }}>{l}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// SAFETY HUB — Real SF EmployeeTime + AI incident prediction
// ══════════════════════════════════════════════════════════════════
function SafetyHubTab() {
  const [incidents,   setIncidents]   = useState([]);
  const [factories,   setFactories]   = useState([]);
  const [fatigueData, setFatigueData] = useState([]);
  const [sfAbsences,  setSfAbsences]  = useState([]);
  const [timeTypes,   setTimeTypes]   = useState({});
  const [loading,     setLoading]     = useState(true);
  const [selFactory,  setSelFactory]  = useState("ALL");
  const [showAdd,     setShowAdd]     = useState(false);
  const [aiReport,    setAiReport]    = useState("");
  const [aiLoading,   setAiLoading]   = useState(false);
  const [form,        setForm]        = useState({ factory_id:"VD-01", incident_type:"SICK", incident_name:"", severity:"MEDIUM", description:"", quantity_days:1 });
  const [msg,         setMsg]         = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [incRes, facRes, fatRes] = await Promise.all([
        fetch(API_BASE+"/api/incidents"),
        fetch(API_BASE+"/api/factories"),
        fetch(API_BASE+"/api/fatigue"),
      ]);
      const [inc, fac, fat] = await Promise.all([incRes.json(), facRes.json(), fatRes.json()]);
      setIncidents(Array.isArray(inc) ? inc : []);
      setFactories(Array.isArray(fac) ? fac : []);
      setFatigueData(Array.isArray(fat) ? fat : []);

      // Load SF data separately (non-blocking, no auth needed)
      try {
        const [abs, tt] = await Promise.all([
          fetch(API_BASE+"/sf/absences?top=200").then(r=>r.json()),
          fetch(API_BASE+"/sf/timetypes").then(r=>r.json()),
        ]);
        setSfAbsences(Array.isArray(abs) ? abs : []);
        setTimeTypes(tt && typeof tt==="object" ? tt : {});
      } catch(e) { console.log("SF data optional:", e.message); }
    } catch(e) {
      console.error("Safety Hub load error:", e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const filtered = selFactory==="ALL" ? incidents : incidents.filter(i=>i.factory_id===selFactory);
  const open     = filtered.filter(i=>i.status==="open");
  const resolved = filtered.filter(i=>i.status==="resolved");
  const critical = filtered.filter(i=>i.severity==="HIGH"||i.severity==="CRITICAL");
  const resolveName = (code) => timeTypes[code] || code;

  // Group SF absences by type name
  const sfGrouped = useMemo(() => {
    const map = {};
    sfAbsences.forEach(a => {
      const code = a.timeType || "UNKNOWN";
      const name = resolveName(code);
      if (!map[name]) map[name] = { name, count:0, days:0, employees:new Set() };
      map[name].count++;
      map[name].days += parseFloat(a.quantityInDays)||1;
      if (a.userId) map[name].employees.add(a.userId);
    });
    return Object.values(map).sort((a,b)=>b.count-a.count).slice(0,8);
  }, [sfAbsences, timeTypes]); // eslint-disable-line

  // Safety score per factory from DB
  const factorySafety = useMemo(() => {
    // Always use FACTORIES constant as base so scorecard is never empty
    const base = factories.length > 0 ? factories : FACTORIES.map(f=>({
      id:f.id, name:f.name, country:f.country, zone:f.zone,
      workers:f.workers, risk_level:f.risk, utilization:f.utilization,
      nce_score:70, fssc_coverage:75,
    }));
    const map = {};
    base.forEach(f => {
      const fInc    = incidents.filter(i=>i.factory_id===f.id);
      const fFat    = fatigueData.filter(fa=>fa.factory_id===f.id);
      const openInc = fInc.filter(i=>i.status==="open").length;
      const critInc = fInc.filter(i=>i.severity==="HIGH"||i.severity==="CRITICAL").length;
      const highFat = fFat.filter(fa=>fa.risk_level==="HIGH"||fa.risk_level==="CRITICAL").length;
      // Base score from factory risk level + adjustments
      const baseScore = f.risk_level==="high"?65:f.risk_level==="medium"?78:88;
      const score   = Math.max(0, baseScore - openInc*8 - critInc*12 - highFat*3);
      const level   = score<50?"CRITICAL":score<65?"HIGH":score<80?"MEDIUM":"LOW";
      map[f.id]     = { ...f, score, level, openInc, critInc, highFat };
    });
    return map;
  }, [incidents, factories, fatigueData]);

  const resolveIncident = async (id) => {
    await fetch(API_BASE+"/api/incidents/"+id+"/resolve", { method:"PUT", headers:{"Content-Type":"application/json"} });
    // Reload from server for fresh count
    const fresh = await fetch(API_BASE+"/api/incidents");
    const freshData = await fresh.json();
    if (Array.isArray(freshData)) setIncidents(freshData);
    setMsg("Incident resolved ✓");
    setTimeout(()=>setMsg(""), 2000);
  };

  const submitIncident = async () => {
    if (!form.incident_name) return setMsg("Incident name required");
    try {
      const res  = await fetch(API_BASE+"/api/incidents", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ ...form }),
      });
      const data = await res.json();
      if (data.error) { setMsg("Error: " + data.error); return; }
      // Update state immediately with the new incident
      setIncidents(prev => [...prev, {
        ...form,
        id: Date.now(),
        status:"open",
        incident_date: new Date().toISOString().slice(0,10),
        reported_by:"current_user"
      }]);
      setShowAdd(false);
      setForm({ factory_id:"VD-01", incident_type:"SICK", incident_name:"", severity:"MEDIUM", description:"", quantity_days:1 });
      setMsg("Incident reported successfully ✓");
      setTimeout(()=>setMsg(""), 4000);
      // Background refresh to get server-assigned ID
      fetch(API_BASE+"/api/incidents").then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setIncidents(d); }).catch(()=>{});
    } catch(e) {
      setMsg("Error: " + e.message);
    }
  };

  const generateReport = async () => {
    setAiLoading(true); setAiReport("");
    const factSummary = Object.values(factorySafety).map(f=>`${f.name} (${f.zone}): Safety Score ${f.score}/100, ${f.openInc} open incidents, ${f.critInc} critical, ${f.highFat} high-fatigue employees`).join(" | ");
    const incSummary  = incidents.slice(0,10).map(i=>`${i.incident_name} [${i.severity}] at factory ${i.factory_id} — ${i.status}`).join("; ");
    const absSummary  = sfGrouped.slice(0,5).map(g=>`${g.name}: ${g.count} cases, ${g.days.toFixed(0)} days, ${g.employees.size} employees`).join("; ");
    const res = await fetch(API_BASE+"/proxy", {
      method:"POST", headers:authH(),
      body: JSON.stringify({ model:ANTHROPIC_MODEL, max_tokens:700,
        system:"You are Nestlé's Global Safety Intelligence Officer. Analyse cross-factory safety data and provide a board-ready safety briefing. Use clear headings, specific factory names, and actionable recommendations aligned with FSSC 22000 and Nestlé NCE standards.",
        messages:[{ role:"user", content:`FACTORY SAFETY SCORES:
${factSummary}

RECENT INCIDENTS (DB):
${incSummary}

SF ABSENCE PATTERNS:
${absSummary}

Total open incidents: ${open.length} | Critical: ${critical.length} | High-fatigue alerts: ${fatigueData.filter(f=>!f.resolved).length}

Generate a concise board-level safety briefing with: 1) Overall risk status 2) Top 3 concerns with factory names 3) Immediate actions required 4) 30-day safety outlook.` }]
      })
    });
    const data = await res.json();
    setAiReport(data.content?.find(b=>b.type==="text")?.text || "");
    setAiLoading(false);
  };

  const SEVERITY_COLOR = { CRITICAL:"red", HIGH:"red", MEDIUM:"yellow", LOW:"green" };
  const LEVEL_COL = { CRITICAL:"#CF1322", HIGH:"#E8312A", MEDIUM:"#D46B08", LOW:"#389E0D" };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:"#1A1A1A", margin:"0 0 4px" }}>🛡 Safety Intelligence Hub</h2>
          <p style={{ fontSize:13, color:"#6B7280", margin:0 }}>Live safety data from database · {incidents.length} incidents tracked · {sfAbsences.length} SF absence records</p>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <select value={selFactory} onChange={e=>setSelFactory(e.target.value)}
            style={{ padding:"7px 12px", fontSize:12, background:"#FFFFFF", border:"1px solid #E2E8F0", borderRadius:8, color:"#374151" }}>
            <option value="ALL">All Factories</option>
            {factories.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button onClick={()=>setShowAdd(s=>!s)}
            style={{ padding:"7px 16px", fontSize:12, fontWeight:600, background:"#E8312A", border:"none", borderRadius:8, color:"#fff", cursor:"pointer" }}>
            + Report Incident
          </button>
        </div>
      </div>

      {msg && <div style={{ marginBottom:14, padding:"9px 14px", background:"#F6FFED", border:"1px solid #B7EB8F", borderRadius:8, fontSize:12, color:"#389E0D", fontWeight:600 }}>✅ {msg}</div>}

      {/* Report incident form */}
      {showAdd && (
        <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:12, padding:20, marginBottom:20, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:16, color:"#1A1A1A" }}>📋 Report New Safety Incident</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:12 }}>
            {[["incident_name","Incident Title","text"],["description","Description","text"]].map(([k,lbl,type])=>(
              <div key={k}>
                <label style={{ fontSize:11, fontWeight:600, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:4 }}>{lbl}</label>
                <input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                  style={{ width:"100%", padding:"8px 12px", fontSize:13, background:"#F8F9FA", border:"1px solid #E2E8F0", borderRadius:7, color:"#1A1A1A", outline:"none", boxSizing:"border-box" }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:4 }}>Days Lost</label>
              <input type="number" value={form.quantity_days} onChange={e=>setForm(f=>({...f,quantity_days:Number(e.target.value)}))}
                style={{ width:"100%", padding:"8px 12px", fontSize:13, background:"#F8F9FA", border:"1px solid #E2E8F0", borderRadius:7, color:"#1A1A1A", outline:"none", boxSizing:"border-box" }} />
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
            {[
              ["factory_id","Factory", (factories.length>0?factories:FACTORIES.map(f=>({id:f.id,name:f.name}))).map(f=>[f.id,f.name])],
              ["severity","Severity",[["LOW","Low"],["MEDIUM","Medium"],["HIGH","High"],["CRITICAL","Critical"]]],
              ["incident_type","Type",[["SICK","Sick Leave"],["INJURY","Injury"],["ACCIDENT","Accident"],["NEAR_MISS","Near Miss"],["LOA","Leave of Absence"],["OTHER","Other"]]],
            ].map(([k,lbl,opts])=>(
              <div key={k}>
                <label style={{ fontSize:11, fontWeight:600, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:4 }}>{lbl}</label>
                <select value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                  style={{ width:"100%", padding:"8px 12px", fontSize:13, background:"#F8F9FA", border:"1px solid #E2E8F0", borderRadius:7, color:"#1A1A1A", outline:"none", boxSizing:"border-box" }}>
                  {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={submitIncident} style={{ padding:"8px 20px", fontSize:13, fontWeight:600, background:"#E8312A", border:"none", borderRadius:7, color:"#fff", cursor:"pointer" }}>Submit Incident</button>
            <button onClick={()=>setShowAdd(false)} style={{ padding:"8px 14px", fontSize:13, fontWeight:600, background:"#F5F5F5", border:"1px solid #E0E0E0", borderRadius:7, color:"#6B7280", cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {loading && <div style={{ color:"#005695", padding:20 }}>Loading safety data…</div>}

      {!loading && (
        <>
          {/* KPI Strip */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:20 }}>
            {[
              { label:"Open Incidents",    value:open.length,                   accent:"#E8312A",  sub:"Requires action" },
              { label:"Resolved",          value:resolved.length,               accent:"#389E0D",  sub:"This period" },
              { label:"Critical / High",   value:critical.length,               accent:"#D46B08",  sub:"Immediate attention" },
              { label:"Fatigue Alerts",    value:fatigueData.filter(f=>!f.resolved).length, accent:"#6D28D9", sub:"Active alerts" },
              { label:"SF Absence Cases",  value:sfAbsences.length,             accent:"#005695",  sub:"From SuccessFactors" },
            ].map(k=>(
              <div key={k.label} style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:10, padding:"14px 16px", borderLeft:"3px solid "+k.accent, boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize:10, fontWeight:600, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{k.label}</div>
                <div style={{ fontSize:24, fontWeight:700, color:"#1A1A1A" }}>{k.value}</div>
                <div style={{ fontSize:11, color:"#9CA3AF", marginTop:2 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            {/* Factory Safety Scorecard */}
            <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ padding:"13px 16px", borderBottom:"1px solid #F0F0F0", fontWeight:700, fontSize:14, color:"#1A1A1A" }}>Factory Safety Scorecard</div>
              <div style={{ padding:"4px 0" }}>
                {Object.values(factorySafety).sort((a,b)=>a.score-b.score).map(f=>(
                  <div key={f.id} style={{ padding:"10px 16px", borderBottom:"1px solid #F8F8F8", display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:40, height:40, borderRadius:8, background:LEVEL_COL[f.level]+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ fontSize:11, fontWeight:800, color:LEVEL_COL[f.level] }}>{f.score}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:"#1A1A1A" }}>{f.name}</span>
                        <Badge label={f.level} color={f.level==="CRITICAL"||f.level==="HIGH"?"red":f.level==="MEDIUM"?"yellow":"green"} />
                      </div>
                      <div style={{ height:5, background:"#F0F0F0", borderRadius:99, overflow:"hidden" }}>
                        <div style={{ width:f.score+"%", height:"100%", background:LEVEL_COL[f.level], borderRadius:99, transition:"width 0.6s ease" }} />
                      </div>
                      <div style={{ fontSize:10, color:"#9CA3AF", marginTop:3 }}>
                        {f.openInc} open · {f.critInc} critical · {f.highFat} fatigue alerts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SF Absence Patterns */}
            <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ padding:"13px 16px", borderBottom:"1px solid #F0F0F0", fontWeight:700, fontSize:14, color:"#1A1A1A", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span>SF Absence Patterns</span>
                <Badge label="Live SF Data" color="blue" />
              </div>
              <div style={{ padding:16 }}>
                {sfGrouped.length===0 && <div style={{ color:"#9CA3AF", fontSize:13 }}>No SF absence data</div>}
                {sfGrouped.map((g,i)=>{
                  const max = sfGrouped[0]?.count||1;
                  const isRisk = g.name.toUpperCase().includes("SICK")||g.name.toUpperCase().includes("ILL")||g.name.toUpperCase().includes("INJURY");
                  const col = isRisk?"#E8312A":g.name.toUpperCase().includes("LEAVE")||g.name.toUpperCase().includes("LOA")?"#D46B08":"#005695";
                  return (
                    <div key={i} style={{ marginBottom:12 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:"#1A1A1A" }}>{g.name}</span>
                        <span style={{ fontSize:11, color:"#6B7280" }}>{g.count} cases · {g.employees.size} employees · {g.days.toFixed(0)} days</span>
                      </div>
                      <div style={{ height:6, background:"#F0F0F0", borderRadius:99, overflow:"hidden" }}>
                        <div style={{ width:(g.count/max*100)+"%", height:"100%", background:col, borderRadius:99, transition:"width 0.6s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Incidents Table */}
          <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", marginBottom:16 }}>
            <div style={{ padding:"13px 16px", borderBottom:"1px solid #F0F0F0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontWeight:700, fontSize:14, color:"#1A1A1A" }}>Incident Log — {filtered.length} records</span>
              <div style={{ display:"flex", gap:6 }}>
                <Badge label={open.length+" OPEN"} color="red" />
                <Badge label={resolved.length+" RESOLVED"} color="green" />
              </div>
            </div>
            {filtered.length===0 ? (
              <div style={{ padding:32, textAlign:"center", color:"#9CA3AF", fontSize:13 }}>
                No incidents recorded yet. Click "Report Incident" to log the first one.
              </div>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#F8FAFC" }}>
                    {["Incident","Factory","Type","Severity","Days","Date","Status","Action"].map(h=>(
                      <th key={h} style={{ padding:"9px 14px", textAlign:"left", fontSize:10, fontWeight:600, color:"#94A3B8", letterSpacing:"0.08em", textTransform:"uppercase", borderBottom:"2px solid #F1F5F9" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0,15).map(inc=>(
                    <tr key={inc.id} style={{ borderBottom:"1px solid #F0F0F0" }}>
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ fontSize:12, fontWeight:600, color:"#1A1A1A" }}>{inc.incident_name||inc.incident_type}</div>
                        {inc.description && <div style={{ fontSize:11, color:"#9CA3AF", marginTop:1 }}>{inc.description.slice(0,40)}{inc.description.length>40?"…":""}</div>}
                      </td>
                      <td style={{ padding:"10px 14px", fontSize:12, color:"#374151" }}>{factories.find(f=>f.id===inc.factory_id)?.name||inc.factory_id}</td>
                      <td style={{ padding:"10px 14px", fontSize:11, color:"#6B7280" }}>{inc.incident_type}</td>
                      <td style={{ padding:"10px 14px" }}><Badge label={inc.severity} color={SEVERITY_COLOR[inc.severity]||"blue"} /></td>
                      <td style={{ padding:"10px 14px", fontSize:12, color:"#374151" }}>{inc.quantity_days}d</td>
                      <td style={{ padding:"10px 14px", fontSize:11, color:"#9CA3AF" }}>{inc.incident_date?.slice(0,10)||"—"}</td>
                      <td style={{ padding:"10px 14px" }}>
                        <Badge label={inc.status.toUpperCase()} color={inc.status==="open"?"red":"green"} />
                      </td>
                      <td style={{ padding:"10px 14px" }}>
                        {inc.status==="open" && (
                          <button onClick={()=>resolveIncident(inc.id)}
                            style={{ padding:"4px 10px", fontSize:11, fontWeight:600, background:"#F6FFED", border:"1px solid #B7EB8F", borderRadius:5, color:"#389E0D", cursor:"pointer" }}>
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* AI Board Briefing */}
          <div style={{ background:"#F8F9FA", border:"1px solid #EDEDED", borderRadius:12, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:"#1A1A1A" }}>⚡ AI Safety Board Briefing</div>
                <div style={{ fontSize:11, color:"#9CA3AF", marginTop:2 }}>Powered by live DB + SF data · FSSC 22000 & NCE aligned</div>
              </div>
              <button onClick={generateReport} disabled={aiLoading}
                style={{ padding:"8px 18px", fontSize:12, fontWeight:700, background:aiLoading?"#F5F5F5":"#E8312A", border:aiLoading?"1px solid #E0E0E0":"none", borderRadius:8, color:aiLoading?"#9CA3AF":"#fff", cursor:aiLoading?"not-allowed":"pointer" }}>
                {aiLoading?"Generating…":"Generate Board Briefing"}
              </button>
            </div>
            {aiLoading && (
              <div style={{ display:"flex", gap:6, alignItems:"center", padding:"8px 0" }}>
                {[0,1,2].map(i=><div key={i} style={{ width:7,height:7,borderRadius:"50%",background:"#E8312A",animation:`bounce 1s ease-in-out ${i*0.2}s infinite` }}/>)}
                <span style={{ color:"#9CA3AF", fontSize:12 }}>Analysing cross-factory safety data…</span>
              </div>
            )}
            {aiReport && <div style={{ fontSize:13, lineHeight:1.85, whiteSpace:"pre-wrap", color:"#1A1A1A" }}>{aiReport}</div>}
            {!aiReport && !aiLoading && (
              <div style={{ color:"#9CA3AF", fontSize:13 }}>
                Click "Generate Board Briefing" for a comprehensive AI safety report using live incident data, factory safety scores, fatigue alerts, and SF absence patterns — ready for board presentation.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}


function FatigueAlertsTab() {
  const [alerts,    setAlerts]    = useState([]);
  const [factories, setFactories] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selFactory,setSelFactory]= useState("ALL");
  const [notified,  setNotified]  = useState(new Set());
  const [resolved,  setResolved]  = useState(new Set());
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [msg,       setMsg]       = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [alertRes, facRes] = await Promise.all([
        fetch(API_BASE+"/api/fatigue"),
        fetch(API_BASE+"/api/factories"),
      ]);
      const [alertData, facData] = await Promise.all([alertRes.json(), facRes.json()]);
      setAlerts(Array.isArray(alertData) ? alertData : []);
      setFactories(Array.isArray(facData) ? facData : []);
    } catch(e) { console.error("Fatigue load error:", e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const filtered = selFactory === "ALL"
    ? alerts
    : alerts.filter(a => a.factory_id === selFactory);

  const critical = filtered.filter(a => a.risk_level === "CRITICAL" || a.fatigue_score > 70);
  const high     = filtered.filter(a => a.risk_level === "HIGH" || (a.fatigue_score > 50 && a.fatigue_score <= 70));

  const notifyManager = async (alert) => {
    try {
      await fetch(API_BASE+"/api/fatigue/"+alert.id+"/notify", { method:"PUT", headers:authH() });
      setNotified(s => new Set([...s, alert.id]));
      setMsg("Manager notified for "+alert.emp_name+" ✓");
      setTimeout(()=>setMsg(""), 3000);
    } catch(e) { setMsg("Failed to notify: "+e.message); }
  };

  const resolveAlert = async (alert) => {
    try {
      await fetch(API_BASE+"/api/fatigue/"+alert.id+"/resolve", { method:"PUT", headers:authH() });
      setResolved(s => new Set([...s, alert.id]));
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
      setMsg("Alert resolved ✓");
      setTimeout(()=>setMsg(""), 3000);
    } catch(e) { setMsg("Error: "+e.message); }
  };

  const generateInsight = async () => {
    if (filtered.length === 0) return;
    setAiLoading(true); setAiInsight("");
    const top = filtered.slice(0,8).map(a =>
      `${a.emp_name||"Employee"} (${a.job_title||"N/A"}): fatigue score ${a.fatigue_score}/100, overtime ${a.overtime_hrs}h/wk, risk ${a.risk_level}, factory ${a.factory_id}`
    ).join("; ");
    const res = await fetch(API_BASE+"/proxy", {
      method:"POST", headers:authH(),
      body: JSON.stringify({ model:ANTHROPIC_MODEL, max_tokens:600,
        system:"You are Nestlé's AI Fatigue Risk Manager. Analyse fatigue data and provide a specific intervention plan aligned with Nestlé NCE and FSSC 22000 standards. Be concise and actionable.",
        messages:[{ role:"user", content:`FATIGUE ALERTS FROM DATABASE:
${top}

Critical: ${critical.length} | High: ${high.length} | Total flagged: ${filtered.length}

Provide: 1) Immediate actions for top 3 critical cases 2) Scheduling adjustments 3) Manager escalation steps` }]
      })
    });
    const data = await res.json();
    setAiInsight(data.content?.find(b=>b.type==="text")?.text || "");
    setAiLoading(false);
  };

  const riskCol  = { CRITICAL:"#CF1322", HIGH:"#D46B08", MEDIUM:"#005695", LOW:"#389E0D" };
  const riskBg   = { CRITICAL:"#FFF1F0", HIGH:"#FFF7E6", MEDIUM:"#E6F4FF", LOW:"#F6FFED" };
  const facName  = (id) => factories.find(f=>f.id===id)?.name || id || "—";

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:"#1A1A1A", margin:"0 0 4px" }}>⚡ Fatigue Risk Intelligence</h2>
          <p style={{ fontSize:13, color:"#6B7280", margin:0 }}>Live fatigue alerts from database · Auto-generated from SF work hours & overtime</p>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <select value={selFactory} onChange={e=>setSelFactory(e.target.value)}
            style={{ padding:"7px 12px", fontSize:12, background:"#FFFFFF", border:"1px solid #E2E8F0", borderRadius:8, color:"#374151" }}>
            <option value="ALL">All Factories</option>
            {factories.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button onClick={load} style={{ padding:"7px 14px", fontSize:12, fontWeight:600, background:"#F5F5F5", border:"1px solid #E0E0E0", borderRadius:8, color:"#374151", cursor:"pointer" }}>↻ Refresh</button>
        </div>
      </div>

      {msg && <div style={{ marginBottom:14, padding:"9px 14px", background:"#F6FFED", border:"1px solid #B7EB8F", borderRadius:8, fontSize:12, color:"#389E0D", fontWeight:600 }}>✅ {msg}</div>}

      {/* KPI Strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Total Flagged",    value:filtered.length,    accent:"#005695", sub:"Active alerts" },
          { label:"Critical Risk",    value:critical.length,    accent:"#CF1322", sub:">70pts fatigue" },
          { label:"High Risk",        value:high.length,        accent:"#D46B08", sub:"51–70pts fatigue" },
          { label:"Managers Notified",value:notified.size,      accent:"#389E0D", sub:"This session" },
        ].map(k=>(
          <div key={k.label} style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:10, padding:"14px 16px", borderLeft:"3px solid "+k.accent, boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:10, fontWeight:600, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{k.label}</div>
            <div style={{ fontSize:24, fontWeight:700, color:"#1A1A1A" }}>{k.value}</div>
            <div style={{ fontSize:11, color:"#9CA3AF", marginTop:2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ color:"#005695", padding:20, fontSize:13 }}>Loading fatigue alerts from database…</div>}

      {!loading && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:16 }}>
          {/* Alert list */}
          <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ padding:"13px 20px", borderBottom:"1px solid #F0F0F0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontWeight:700, fontSize:14, color:"#1A1A1A" }}>Fatigue Risk Alerts — {filtered.length} employees flagged</span>
              {filtered.length > 0 && <Badge label={critical.length+" CRITICAL"} color="red" />}
            </div>
            <div style={{ maxHeight:480, overflowY:"auto" }}>
              {filtered.length === 0 && (
                <div style={{ padding:40, textAlign:"center", color:"#9CA3AF", fontSize:13 }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
                  No fatigue alerts. Open a factory roster first to scan employees, or alerts appear automatically when employees are loaded.
                </div>
              )}
              {filtered.sort((a,b)=>b.fatigue_score-a.fatigue_score).map(alert => {
                const hue      = (alert.emp_name||"").split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360;
                const risk     = alert.risk_level || (alert.fatigue_score>70?"CRITICAL":alert.fatigue_score>50?"HIGH":"MEDIUM");
                const col      = riskCol[risk] || "#005695";
                const bg       = riskBg[risk]  || "#E6F4FF";
                const isNotif  = notified.has(alert.id) || alert.manager_notified;
                const initials = (alert.emp_name||"??").split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase();
                return (
                  <div key={alert.id} style={{ padding:"13px 20px", borderBottom:"1px solid #F8F8F8", display:"flex", alignItems:"center", gap:14 }}>
                    {/* Avatar */}
                    <div style={{ width:40, height:40, borderRadius:"50%", background:`hsl(${hue},70%,92%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:`hsl(${hue},70%,32%)`, flexShrink:0 }}>
                      {initials}
                    </div>
                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                        <span style={{ fontWeight:600, fontSize:13, color:"#1A1A1A" }}>{alert.emp_name||"Unknown"}</span>
                        <Badge label={risk} color={risk==="CRITICAL"?"red":risk==="HIGH"?"yellow":"blue"} />
                      </div>
                      <div style={{ fontSize:11, color:"#6B7280", marginBottom:6 }}>
                        {alert.job_title||"Employee"} · {facName(alert.factory_id)} · {alert.alert_reason||"Overtime detected"}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ flex:1, height:6, background:"#F0F0F0", borderRadius:99, overflow:"hidden" }}>
                          <div style={{ width:Math.min(100,alert.fatigue_score)+"%", height:"100%", background:col, borderRadius:99, transition:"width 0.5s" }} />
                        </div>
                        <span style={{ fontSize:11, fontWeight:700, color:col, minWidth:50 }}>{alert.fatigue_score}/100</span>
                        <span style={{ fontSize:11, color:"#9CA3AF" }}>{alert.overtime_hrs||0}h OT/wk</span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div style={{ display:"flex", flexDirection:"column", gap:5, alignItems:"flex-end", flexShrink:0 }}>
                      <button onClick={()=>notifyManager(alert)} disabled={isNotif}
                        style={{ fontSize:10, fontWeight:600, padding:"5px 10px", background:isNotif?"#F6FFED":"#005695", border:isNotif?"1px solid #B7EB8F":"none", borderRadius:5, color:isNotif?"#389E0D":"#fff", cursor:isNotif?"default":"pointer", whiteSpace:"nowrap" }}>
                        {isNotif ? "✓ Notified" : "📧 Notify Manager"}
                      </button>
                      <button onClick={()=>resolveAlert(alert)}
                        style={{ fontSize:10, fontWeight:600, padding:"5px 10px", background:"#FFF1F0", border:"1px solid #FFCCC7", borderRadius:5, color:"#CF1322", cursor:"pointer" }}>
                        Resolve
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* AI Intervention Plan */}
            <div style={{ background:"#F8F9FA", border:"1px solid #EDEDED", borderRadius:12, padding:18, flex:1, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:"#1A1A1A" }}>AI Intervention Plan</div>
                  <div style={{ fontSize:10, color:"#9CA3AF", marginTop:2 }}>Based on live DB fatigue data</div>
                </div>
                <button onClick={generateInsight} disabled={aiLoading||filtered.length===0}
                  style={{ fontSize:11, fontWeight:700, padding:"6px 14px", background:aiLoading||filtered.length===0?"#F5F5F5":"#E8312A", border:aiLoading||filtered.length===0?"1px solid #E0E0E0":"none", borderRadius:6, color:aiLoading||filtered.length===0?"#9CA3AF":"#fff", cursor:filtered.length===0?"not-allowed":"pointer" }}>
                  {aiLoading ? "…" : "Generate"}
                </button>
              </div>
              {aiLoading && <div style={{ display:"flex", gap:5, padding:"8px 0" }}>{[0,1,2].map(i=><div key={i} style={{ width:7,height:7,borderRadius:"50%",background:"#E8312A",animation:`bounce 1s ease-in-out ${i*0.2}s infinite` }}/>)}</div>}
              {aiInsight
                ? <div style={{ fontSize:12, lineHeight:1.8, whiteSpace:"pre-wrap", color:"#1A1A1A" }}>{aiInsight}</div>
                : !aiLoading && <div style={{ fontSize:12, color:"#9CA3AF", lineHeight:1.6 }}>Click Generate for AI-powered fatigue intervention recommendations based on live employee data.</div>
              }
            </div>

            {/* Risk thresholds */}
            <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:12, padding:18, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:12 }}>Risk Thresholds</div>
              {[["CRITICAL",">70pts","Immediate intervention","#CF1322"],["HIGH","51–70pts","Manager notification","#D46B08"],["MEDIUM","31–50pts","Monitor closely","#005695"],["LOW","≤30pts","Within safe limits","#389E0D"]].map(([l,pts,action,col])=>(
                <div key={l} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:9 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:col, flexShrink:0 }} />
                  <span style={{ fontSize:12, fontWeight:700, color:col, width:70 }}>{l}</span>
                  <span style={{ fontSize:11, color:"#6B7280" }}>{pts} · {action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function SkillsIntelligenceTab() {
  const [positions,  setPositions]  = useState(null);
  const [jobcodes,   setJobcodes]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [aiGap,      setAiGap]      = useState("");
  const [aiLoading,  setAiLoading]  = useState(false);
  const [selectedDept, setSelectedDept] = useState("ALL");

  useEffect(() => {
    Promise.all([
      fetch(API_BASE+"/sf/positions", { headers:authH() }).then(r=>r.json()),
      fetch(API_BASE+"/sf/jobcodes", { headers:authH() }).then(r=>r.json()),
    ]).then(([pos, jc]) => {
      setPositions(Array.isArray(pos) ? pos : []);
      setJobcodes(Array.isArray(jc) ? jc : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const departments = useMemo(() => {
    if (!positions) return [];
    return ["ALL", ...new Set(positions.map(p=>p.department||p.division).filter(Boolean))];
  }, [positions]);

  const filtered = useMemo(() => {
    if (!positions) return [];
    if (selectedDept === "ALL") return positions;
    return positions.filter(p => p.department === selectedDept || p.division === selectedDept);
  }, [positions, selectedDept]);

  const SKILL_DOMAINS = [
    { domain:"AI & Predictive Manufacturing", required:88, current:29, gap:59, color:C.accent },
    { domain:"Food Safety & FSSC 22000", required:95, current:71, gap:24, color:C.green },
    { domain:"Nestlé Continuous Excellence (NCE)", required:85, current:52, gap:33, color:C.gold },
    { domain:"Sustainable Packaging & Net Zero", required:80, current:38, gap:42, color:C.blue },
    { domain:"Nutritional Science & Regulatory", required:78, current:55, gap:23, color:C.purple },
    { domain:"Digital Supply Chain & SAP S/4HANA", required:82, current:34, gap:48, color:C.muted },
    { domain:"Zone Cross-Functional Leadership", required:70, current:49, gap:21, color:C.gold },
    { domain:"Consumer & Shopper Marketing", required:72, current:44, gap:28, color:C.blue },
  ];

  const generateGapAnalysis = async () => {
    setAiLoading(true); setAiGap("");
    const posCount = positions?.length || 0;
    const jobCount = jobcodes?.length || 0;
    const topJobs = jobcodes?.slice(0,8).map(j=>j.externalName_en_US||j.name_defaultValue||j.externalCode).join(", ") || "";
    const gaps = SKILL_DOMAINS.map(d=>`${d.domain}: gap=${d.gap}pts`).join("; ");
    const res = await fetch(API_BASE+"/proxy", {
      method:"POST", headers:authH(),
      body: JSON.stringify({ model:ANTHROPIC_MODEL, max_tokens:700,
        system:"You are Nestlé's AI Talent Development Strategist. Analyse skill gaps and design targeted reskilling programmes. Be specific with timelines, learning methods, and ROI metrics.",
        messages:[{ role:"user", content:`SF Data: ${posCount} active positions, ${jobCount} job codes. Top job types: ${topJobs}.\nSkill gaps: ${gaps}.\n\nProvide a 90-day reskilling roadmap with 4 specific programmes targeting the biggest gaps.` }]
      })
    });
    const data = await res.json();
    setAiGap(data.content?.find(b=>b.type==="text")?.text || "");
    setAiLoading(false);
  };

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, margin:"0 0 4px", color:"#1A1A1A" }}>🎓 Skills Intelligence</h2>
      <p style={{ color:"#6B7280", fontSize:13, margin:"0 0 22px", color:"#6B7280" }}>
        SF Positions & Job Codes: {positions?.length||0} positions · {jobcodes?.length||0} job codes · AI-powered gap analysis
      </p>
      {loading && <div style={{ color:"#005695", padding:20 }}>Loading SF position & job code data…</div>}
      {!loading && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
            {/* Skill gap bars */}
            <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:12, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:20 }}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:16 }}>Skills Gap by Domain</div>
              {SKILL_DOMAINS.map(d=>(
                <div key={d.domain} style={{ marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontSize:12, fontWeight:600 }}>{d.domain}</span>
                    <span style={{ fontSize:11, color:C.accent, fontWeight:700 }}>Gap: {d.gap}pts</span>
                  </div>
                  <div style={{ position:"relative", height:8, background:C.border, borderRadius:99, overflow:"hidden", marginBottom:3 }}>
                    <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${d.required}%`, background:C.border, borderRadius:99 }} />
                    <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${d.current}%`, background:d.color, borderRadius:99, transition:"width 0.6s ease" }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:10, color:C.muted }}>Current: {d.current}%</span>
                    <span style={{ fontSize:10, color:C.muted }}>Required: {d.required}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* SF Positions table */}
            <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:12, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", overflow:"hidden" }}>
              <div style={{ padding:"13px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontWeight:700, fontSize:13 }}>SF Active Positions</span>
                <select value={selectedDept} onChange={e=>setSelectedDept(e.target.value)}
                  style={{ fontSize:11, background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 8px", color:C.text }}>
                  {departments.slice(0,10).map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ maxHeight:360, overflowY:"auto" }}>
                {filtered.length === 0 && <div style={{ color:C.muted, padding:20, fontSize:13 }}>No positions found</div>}
                {filtered.slice(0,15).map((p,i)=>(
                  <div key={i} style={{ padding:"10px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600 }}>{p.externalName_en_US||p.externalName_defaultValue||p.code}</div>
                      <div style={{ fontSize:10, color:C.muted }}>{p.jobCode||"—"} · {p.division||p.department||"—"}</div>
                    </div>
                    <Badge label={p.type||"OPEN"} color="blue" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Gap Analysis */}
          <div style={{ background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <span style={{ fontWeight:700, fontSize:14 }}>🤖 AI 90-Day Reskilling Roadmap</span>
              <button onClick={generateGapAnalysis} disabled={aiLoading}
                style={{ padding:"7px 18px", fontSize:12, fontWeight:700, background:aiLoading?C.surfaceAlt:C.accent, border:"none", borderRadius:7, color:"#fff", cursor:aiLoading?"not-allowed":"pointer" }}>
                {aiLoading?"Generating…":"Generate Roadmap"}
              </button>
            </div>
            {aiGap
              ? <div style={{ fontSize:13, lineHeight:1.8, whiteSpace:"pre-wrap" }}>{aiGap}</div>
              : !aiLoading && <div style={{ color:"#6B7280", fontSize:13 }}>Click Generate for AI-powered reskilling roadmap based on SF position data and skill gaps</div>
            }
            {aiLoading && <div style={{ color:"#6B7280", fontSize:13 }}>Analysing SF positions and designing reskilling programmes…</div>}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// OPERATIONS TAB — Throughput vs Utilization + Shift Optimizer
// ══════════════════════════════════════════════════════════════════
function OperationsTab() {
  const [selectedFactory, setSelectedFactory] = useState(FACTORIES[0]);
  const [shiftPlan, setShiftPlan]   = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch(API_BASE+"/sf/departments", { headers:authH() }).then(r=>r.json()).catch(()=>[]),
      fetch(API_BASE+"/sf/locations", { headers:authH() }).then(r=>r.json()).catch(()=>[]),
    ]).then(([depts, locs]) => {
      setDepartments(Array.isArray(depts) ? depts.slice(0,8) : []);
    });
  }, []);

  const generateShiftPlan = async () => {
    setPlanLoading(true); setShiftPlan(null);
    const f = selectedFactory;
    const res = await fetch(API_BASE+"/proxy", {
      method:"POST", headers:authH(),
      body: JSON.stringify({ model:ANTHROPIC_MODEL, max_tokens:800,
        system:"You are Nestlé's AI Operations Optimizer. Return ONLY valid JSON. Schema: { summary:string, currentEfficiency:number, optimizedEfficiency:number, shifts:[{name:string,workers:number,hours:string,role:string,change:string}], savings:string, actions:[string] }",
        messages:[{ role:"user", content:`Optimize shift schedule for ${f.name} (${f.country}). Workers: ${f.workers}. Current utilization: ${f.utilization}%. Safety risk: ${f.risk}. Zone: ${f.zone}. Departments from SF: ${departments.slice(0,5).map(d=>d.name_en_US||d.name_localized||d.externalCode).join(", ")||"Production, Quality, Maintenance, Warehouse, HR"}. Suggest optimal 3-shift rotation to maximize throughput while reducing fatigue.` }]
      })
    });
    const data = await res.json();
    const text = data.content?.find(b=>b.type==="text")?.text||"";
    try {
      const clean = text.replace(/```json|```/g,"").trim();
      setShiftPlan(JSON.parse(clean));
    } catch { setShiftPlan({ summary:text, shifts:[], actions:[], currentEfficiency:f.utilization, optimizedEfficiency:f.utilization+8, savings:"Analysis complete" }); }
    setPlanLoading(false);
  };

  // Throughput correlation data
  const correlationData = FACTORIES.map(f => ({
    name: f.name,
    utilization: f.utilization,
    throughput: Math.round(f.utilization * 0.85 + (f.risk==="low"?12:f.risk==="medium"?5:-3) + (f.workers/500)),
    workers: f.workers,
    risk: f.risk,
  }));

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, margin:"0 0 4px", color:"#1A1A1A" }}>🏭 Operations Intelligence</h2>
      <p style={{ color:"#6B7280", fontSize:13, margin:"0 0 22px", color:"#6B7280" }}>Factory throughput vs workforce utilization · AI-powered shift optimization · SF department data</p>

      {/* Throughput vs Utilization */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
        <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:12, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:20 }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:16 }}>Throughput vs Workforce Utilization</div>
          {correlationData.map(f => {
            const col = f.risk==="high"?C.accent:f.risk==="medium"?C.gold:C.green;
            return (
              <div key={f.name} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:600 }}>{f.name}</span>
                  <div style={{ display:"flex", gap:10 }}>
                    <span style={{ fontSize:11, color:C.blue }}>Util: {f.utilization}%</span>
                    <span style={{ fontSize:11, color:col }}>Output: {f.throughput}%</span>
                  </div>
                </div>
                <div style={{ position:"relative", height:10, background:"#E8E8E8", borderRadius:99, overflow:"hidden" }}>
                  <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${f.throughput}%`, background:col+"55", borderRadius:99 }} />
                  <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${f.utilization}%`, background:col, borderRadius:99, opacity:0.8 }} />
                </div>
                <div style={{ display:"flex", gap:4, marginTop:3 }}>
                  <div style={{ width:8, height:3, background:col, borderRadius:1 }} />
                  <span style={{ fontSize:9, color:C.muted }}>Utilization</span>
                  <div style={{ width:8, height:3, background:col+"55", borderRadius:1, marginLeft:6 }} />
                  <span style={{ fontSize:9, color:C.muted }}>Throughput index</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* SF Departments */}
        <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:12, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:20 }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:16 }}>SF Department Structure</div>
          {departments.length === 0 && <div style={{ color:"#6B7280", fontSize:13 }}>Loading SF department data…</div>}
          {departments.map((d,i)=>(
            <div key={i} style={{ padding:"10px 14px", marginBottom:8, background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ fontWeight:600, fontSize:12 }}>{d.name_en_US||d.name_localized||d.externalCode}</div>
              <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>Code: {d.externalCode}{d.parent?" · Parent: "+d.parent:""}</div>
            </div>
          ))}
          {departments.length === 0 && (
            <div style={{ color:"#6B7280", fontSize:12, fontStyle:"italic" }}>SF Departments will appear here when loaded from SuccessFactors</div>
          )}
        </div>
      </div>

      {/* Shift Optimizer */}
      <div style={{ background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <span style={{ fontWeight:700, fontSize:14 }}>⚙ AI Shift Optimization Engine</span>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <select value={selectedFactory.id} onChange={e=>setSelectedFactory(FACTORIES.find(f=>f.id===e.target.value))}
              style={{ fontSize:12, background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:7, padding:"6px 12px", color:C.text }}>
              {FACTORIES.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <button onClick={generateShiftPlan} disabled={planLoading}
              style={{ padding:"7px 18px", fontSize:12, fontWeight:700, background:planLoading?C.surfaceAlt:C.accent, border:"none", borderRadius:7, color:"#fff", cursor:planLoading?"not-allowed":"pointer" }}>
              {planLoading?"Optimizing…":"Optimize Shifts"}
            </button>
          </div>
        </div>

        {planLoading && <div style={{ color:"#6B7280", fontSize:13 }}>Running AI shift optimization for {selectedFactory.name}…</div>}

        {shiftPlan && (
          <div style={{ animation:"fadeIn 0.3s ease" }}>
            <div style={{ display:"flex", gap:14, marginBottom:16 }}>
              <div style={{ flex:1, background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:10, padding:"13px 16px", textAlign:"center" }}>
                <div style={{ color:"#9CA3AF", fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>Current Efficiency</div>
                <div style={{ fontSize:28, fontWeight:800, color:C.gold, marginTop:4 }}>{shiftPlan.currentEfficiency}%</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", fontSize:20, color:C.green }}>→</div>
              <div style={{ flex:1, background:"#0A2E1A", border:`1px solid ${C.green}44`, borderRadius:10, padding:"13px 16px", textAlign:"center" }}>
                <div style={{ color:"#9CA3AF", fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>Optimized Efficiency</div>
                <div style={{ fontSize:28, fontWeight:800, color:C.green, marginTop:4 }}>{shiftPlan.optimizedEfficiency}%</div>
              </div>
              <div style={{ flex:2, background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:10, padding:"13px 16px" }}>
                <div style={{ color:"#9CA3AF", fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Projected Savings</div>
                <div style={{ fontSize:13, fontWeight:600, color:C.green }}>{shiftPlan.savings}</div>
              </div>
            </div>

            <div style={{ fontSize:13, color:C.muted, marginBottom:14, fontStyle:"italic" }}>{shiftPlan.summary}</div>

            {shiftPlan.shifts?.length > 0 && (
              <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(shiftPlan.shifts.length,3)},1fr)`, gap:10, marginBottom:14 }}>
                {shiftPlan.shifts.map((s,i)=>(
                  <div key={i} style={{ background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:9, padding:"12px 14px" }}>
                    <div style={{ fontWeight:700, fontSize:12, marginBottom:6, color:[C.gold,C.blue,C.purple][i%3] }}>{s.name}</div>
                    <div style={{ fontSize:11, color:C.muted }}>👥 {s.workers} workers</div>
                    <div style={{ fontSize:11, color:C.muted }}>⏰ {s.hours}</div>
                    <div style={{ fontSize:11, color:C.muted }}>💼 {s.role}</div>
                    {s.change && <div style={{ fontSize:10, color:C.green, marginTop:4, fontWeight:600 }}>↑ {s.change}</div>}
                  </div>
                ))}
              </div>
            )}

            {shiftPlan.actions?.length > 0 && (
              <div>
                <div style={{ fontWeight:700, fontSize:12, marginBottom:8, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Immediate Actions</div>
                {shiftPlan.actions.map((a,i)=>(
                  <div key={i} style={{ padding:"8px 14px", marginBottom:6, background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:7, fontSize:12 }}>
                    {i+1}. {a}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!shiftPlan && !planLoading && (
          <div style={{ color:"#6B7280", fontSize:13, textAlign:"center", padding:20 }}>
            Select a factory and click Optimize Shifts to get AI-powered shift rotation recommendations
          </div>
        )}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════════════════════════════════

// ── Auth API ──────────────────────────────────────────────────────
const AUTH = {
  async login(username, password) {
    const r = await fetch(API_BASE+"/auth/login", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ username, password }),
    });
    return r.json();
  },
  async logout(token) {
    await fetch(API_BASE+"/auth/logout", {
      method:"POST", headers:{"Authorization":"Bearer "+token},
    }).catch(()=>{});
    sessionStorage.removeItem("nestle_eos_token");
  },
  async changePassword(token, currentPassword, newPassword) {
    const r = await fetch(API_BASE+"/auth/change-password", {
      method:"POST", headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
      body:JSON.stringify({ currentPassword, newPassword }),
    });
    return r.json();
  },
  async getUsers(token) {
    const r = await fetch(API_BASE+"/auth/users", { headers:{"Authorization":"Bearer "+token} });
    return r.json();
  },
  async addUser(token, data) {
    const r = await fetch(API_BASE+"/auth/users", {
      method:"POST", headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
      body:JSON.stringify(data),
    });
    return r.json();
  },
  async deleteUser(token, id) {
    const r = await fetch(API_BASE+"/auth/users/"+id, {
      method:"DELETE", headers:{"Authorization":"Bearer "+token},
    });
    return r.json();
  },
  async resetPassword(token, id, newPassword) {
    const r = await fetch(API_BASE+"/auth/users/"+id+"/reset-password", {
      method:"POST", headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
      body:JSON.stringify({ newPassword }),
    });
    return r.json();
  },
};

function sfFetch(path, token) {
  return fetch("http://localhost:3001" + path, {
    headers: { "Authorization": "Bearer " + token }
  }).then(r => r.json());
}


function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) return;
    setError(""); setLoading(true);
    try {
      const data = await AUTH.login(username.trim(), password);
      if (data.ok && data.token) {
        sessionStorage.setItem("nestle_eos_token", data.token);
        onLogin({ ...data.user, token: data.token });
      } else {
        setError(data.error || "Invalid username or password.");
        setLoading(false);
      }
    } catch(e) {
      setError("Cannot connect to server. Make sure node server.js is running on port 3001.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F5F5F5", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Helvetica Neue','Helvetica','Arial',sans-serif", color:C.text }}>
      <div style={{ width:420, animation:"fadeIn 0.4s ease" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:64, height:64, background:C.accent, borderRadius:12, fontSize:28, fontWeight:900, color:"#fff", marginBottom:16, boxShadow:"0 4px 20px rgba(232,49,42,0.25)" }}>N</div>
          <div style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.5px" }}>Nestlé EOS</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>Enterprise AI Operating System</div>
        </div>

        {/* Card */}
        <div style={{ background:"#FFFFFF", border:"1px solid #E8E8E8", borderRadius:12, padding:36, boxShadow:"0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:6, letterSpacing:"-0.3px", color:"#1A1A1A" }}>Sign in to your account</div>
          <div style={{ fontSize:13, color:"#6B7280", marginBottom:24, fontWeight:400, lineHeight:1.6 }}>Access the Nestlé workforce intelligence platform</div>

          {/* Username */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:"0.09em", display:"block", marginBottom:6 }}>Username</label>
            <input
              value={username} onChange={e=>setUsername(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              placeholder="Enter your username"
              style={{ width:"100%", padding:"11px 14px", fontSize:13, background:"#F8F9FA", border:`1px solid ${error?C.accent:C.border}`, borderRadius:8, color:C.text, outline:"none", boxSizing:"border-box" }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6 }}>Password</label>
            <div style={{ position:"relative" }}>
              <input
                type={showPass?"text":"password"}
                value={password} onChange={e=>setPassword(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                placeholder="Enter your password"
                style={{ width:"100%", padding:"11px 44px 11px 14px", fontSize:14, background:"#F8F9FA", border:`1px solid ${error?C.accent:C.border}`, borderRadius:8, color:C.text, outline:"none", boxSizing:"border-box" }}
              />
              <button onClick={()=>setShowPass(s=>!s)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:13 }}>
                {showPass?"🙈":"👁"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background:"#2D0A0A", border:`1px solid ${C.accent}44`, borderRadius:8, padding:"10px 14px", fontSize:12, color:"#CF1322", marginBottom:16 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button onClick={handleLogin} disabled={loading||!username||!password}
            style={{ width:"100%", padding:"12px", fontSize:13, fontWeight:700, letterSpacing:"0.03em", background:loading||!username||!password?C.surfaceAlt:C.accent, border:"none", borderRadius:8, color:"#fff", cursor:loading||!username||!password?"not-allowed":"pointer", transition:"background 0.2s", boxSizing:"border-box" }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>

          <div style={{ marginTop:20, padding:14, background:"#F8F9FA", border:"1px solid #E8E8E8", borderRadius:8 }}>
            <div style={{ fontSize:10, fontWeight:600, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Available accounts — click username to fill</div>
            <div style={{ fontSize:11, color:"#9CA3AF", marginBottom:8 }}>Default password: <code style={{ background:"#F0F0F0", padding:"1px 6px", borderRadius:3 }}>Nestle@2024</code></div>
            <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
              {DEMO_HINTS.map(u=>(
                <div key={u.username} onClick={()=>{ setUsername(u.username); setError(""); }}
                  style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 10px", borderRadius:6, cursor:"pointer", background:"transparent", transition:"background 0.1s" }}
                  onMouseOver={e=>e.currentTarget.style.background="#F0F0F0"}
                  onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                  <div>
                    <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>{u.username}</span>
                    <span style={{ fontSize:11, color:"#9CA3AF", marginLeft:8 }}>{u.role}</span>
                  </div>
                  <span style={{ fontSize:10, color:"#9CA3AF", fontFamily:"monospace" }}>{u.password||u.hint}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ textAlign:"center", marginTop:20, fontSize:11, color:"#9CA3AF" }}>
          © 2026 Nestlé S.A. · Enterprise AI Operating System
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing:border-box; }
        body { -webkit-font-smoothing:antialiased; background:#F5F5F5; }
        input::placeholder { color:#AAAAAA; font-size:13px; }
      `}</style>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// CHANGE PASSWORD MODAL
// ══════════════════════════════════════════════════════════════════
function ChangePwdModal({ token, onClose }) {
  const [current, setCurrent] = useState("");
  const [next,    setNext]    = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg,     setMsg]     = useState(null); // { type: ok|err, text }
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (next !== confirm) return setMsg({ type:"err", text:"Passwords do not match." });
    if (next.length < 8) return setMsg({ type:"err", text:"Password must be at least 8 characters." });
    setLoading(true); setMsg(null);
    const data = await AUTH.changePassword(token, current, next);
    setLoading(false);
    if (data.ok) setMsg({ type:"ok", text:"Password changed successfully." });
    else setMsg({ type:"err", text:data.error || "Failed to change password." });
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:12, width:400, padding:28, boxShadow:"0 8px 40px rgba(0,0,0,0.15)", animation:"fadeIn 0.2s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontWeight:700, fontSize:16 }}>🔑 Change Password</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#9CA3AF" }}>✕</button>
        </div>
        {[["Current Password", current, setCurrent], ["New Password", next, setNext], ["Confirm New Password", confirm, setConfirm]].map(([label, val, set]) => (
          <div key={label} style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:600, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:5 }}>{label}</label>
            <input type="password" value={val} onChange={e=>set(e.target.value)}
              style={{ width:"100%", padding:"9px 12px", fontSize:13, background:"#F8F9FA", border:"1px solid #E0E0E0", borderRadius:7, color:"#1A1A1A", outline:"none", boxSizing:"border-box" }} />
          </div>
        ))}
        {msg && (
          <div style={{ padding:"8px 12px", borderRadius:7, fontSize:12, marginBottom:14, background:msg.type==="ok"?"#F6FFED":"#FFF1F0", color:msg.type==="ok"?"#389E0D":"#CF1322", border:`1px solid ${msg.type==="ok"?"#B7EB8F":"#FFCCC7"}` }}>
            {msg.type==="ok"?"✓ ":""}{msg.text}
          </div>
        )}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={submit} disabled={loading||!current||!next||!confirm}
            style={{ flex:1, padding:"10px", fontSize:13, fontWeight:700, background:loading?"#E0E0E0":"#E8312A", border:"none", borderRadius:8, color:"#fff", cursor:"pointer" }}>
            {loading?"Saving…":"Change Password"}
          </button>
          <button onClick={onClose} style={{ padding:"10px 16px", fontSize:13, background:"#F5F5F5", border:"1px solid #E0E0E0", borderRadius:8, color:"#374151", cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// USER MANAGEMENT MODAL (Admin only)
// ══════════════════════════════════════════════════════════════════
function UserMgmtModal({ token, onClose, currentUser }) {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState("list"); // list | add
  const [form,    setForm]    = useState({ username:"", password:"", name:"", role:"HR User", zone:"Global", access:"zone", email:"" });
  const [msg,     setMsg]     = useState(null);
  const [resetPwd, setResetPwd] = useState({ id:null, value:"" });

  const loadUsers = async () => {
    setLoading(true);
    const data = await AUTH.getUsers(token);
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []); // eslint-disable-line

  const addUser = async () => {
    if (!form.username || !form.password || !form.name) return setMsg({ type:"err", text:"Username, password, and name are required." });
    const data = await AUTH.addUser(token, form);
    if (data.ok) { setMsg({ type:"ok", text:"User created successfully." }); setView("list"); loadUsers(); setForm({ username:"", password:"", name:"", role:"HR User", zone:"Global", access:"zone", email:"" }); }
    else setMsg({ type:"err", text:data.error || "Failed to create user." });
  };

  const deleteUser = async (id, name) => {
    if (!window.confirm("Delete user " + name + "?")) return;
    const data = await AUTH.deleteUser(token, id);
    if (data.ok) loadUsers();
    else setMsg({ type:"err", text:data.error || "Failed to delete user." });
  };

  const doResetPwd = async () => {
    if (!resetPwd.value || resetPwd.value.length < 8) return setMsg({ type:"err", text:"Password must be at least 8 characters." });
    const data = await AUTH.resetPassword(token, resetPwd.id, resetPwd.value);
    if (data.ok) { setMsg({ type:"ok", text:"Password reset successfully." }); setResetPwd({ id:null, value:"" }); }
    else setMsg({ type:"err", text:data.error || "Failed to reset password." });
  };

  const ACCESS_OPTIONS = ["full","zone","safety","ops","admin"];
  const F = (label, field, type="text", opts=null) => (
    <div key={field} style={{ marginBottom:12 }}>
      <label style={{ fontSize:11, fontWeight:600, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:4 }}>{label}</label>
      {opts
        ? <select value={form[field]} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}
            style={{ width:"100%", padding:"8px 10px", fontSize:13, background:"#F8F9FA", border:"1px solid #E0E0E0", borderRadius:7, color:"#1A1A1A" }}>
            {opts.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        : <input type={type} value={form[field]} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}
            style={{ width:"100%", padding:"8px 10px", fontSize:13, background:"#F8F9FA", border:"1px solid #E0E0E0", borderRadius:7, color:"#1A1A1A", outline:"none", boxSizing:"border-box" }} />
      }
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:12, width:600, maxHeight:"80vh", display:"flex", flexDirection:"column", boxShadow:"0 8px 40px rgba(0,0,0,0.15)", animation:"fadeIn 0.2s ease" }}>
        {/* Header */}
        <div style={{ padding:"18px 24px", borderBottom:"1px solid #F0F0F0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontWeight:700, fontSize:16 }}>👥 User Management</div>
          <div style={{ display:"flex", gap:8 }}>
            {view==="list" && <button onClick={()=>{setView("add");setMsg(null);}} style={{ padding:"6px 14px", fontSize:12, fontWeight:600, background:"#E8312A", border:"none", borderRadius:7, color:"#fff", cursor:"pointer" }}>+ Add User</button>}
            {view==="add" && <button onClick={()=>setView("list")} style={{ padding:"6px 14px", fontSize:12, background:"#F5F5F5", border:"1px solid #E0E0E0", borderRadius:7, cursor:"pointer" }}>← Back</button>}
            <button onClick={onClose} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#9CA3AF" }}>✕</button>
          </div>
        </div>

        {msg && (
          <div style={{ margin:"12px 24px 0", padding:"8px 12px", borderRadius:7, fontSize:12, background:msg.type==="ok"?"#F6FFED":"#FFF1F0", color:msg.type==="ok"?"#389E0D":"#CF1322", border:`1px solid ${msg.type==="ok"?"#B7EB8F":"#FFCCC7"}` }}>
            {msg.text}
          </div>
        )}

        <div style={{ flex:1, overflow:"auto", padding:"16px 24px" }}>
          {view==="list" && (
            <>
              {loading && <div style={{ color:"#9CA3AF", padding:20, textAlign:"center" }}>Loading users…</div>}
              {!loading && users.map(u=>(
                <div key={u.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid #F5F5F5" }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:"#FFF1F0", border:"1px solid #FFCCC7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#E8312A", flexShrink:0 }}>{u.avatar}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>{u.name}</div>
                    <div style={{ fontSize:11, color:"#9CA3AF" }}>{u.username} · {u.role} · {u.zone}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    {/* Reset password inline */}
                    {resetPwd.id===u.id
                      ? <div style={{ display:"flex", gap:4 }}>
                          <input value={resetPwd.value} onChange={e=>setResetPwd(r=>({...r,value:e.target.value}))} placeholder="New password" type="password"
                            style={{ padding:"4px 8px", fontSize:11, border:"1px solid #E0E0E0", borderRadius:5, width:120, outline:"none" }} />
                          <button onClick={doResetPwd} style={{ padding:"4px 8px", fontSize:11, fontWeight:600, background:"#005695", border:"none", borderRadius:5, color:"#fff", cursor:"pointer" }}>Save</button>
                          <button onClick={()=>setResetPwd({id:null,value:""})} style={{ padding:"4px 8px", fontSize:11, background:"#F5F5F5", border:"1px solid #E0E0E0", borderRadius:5, cursor:"pointer" }}>✕</button>
                        </div>
                      : <button onClick={()=>setResetPwd({id:u.id,value:""})} style={{ padding:"4px 10px", fontSize:11, background:"#F5F5F5", border:"1px solid #E0E0E0", borderRadius:5, cursor:"pointer", color:"#374151" }}>Reset Pwd</button>
                    }
                    {u.id !== currentUser.id && (
                      <button onClick={()=>deleteUser(u.id, u.name)} style={{ padding:"4px 10px", fontSize:11, background:"#FFF1F0", border:"1px solid #FFCCC7", borderRadius:5, cursor:"pointer", color:"#CF1322" }}>Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {view==="add" && (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
                {F("Username", "username")}
                {F("Password", "password", "password")}
                {F("Full Name", "name")}
                {F("Email", "email", "email")}
                {F("Job Role", "role")}
                {F("Zone", "zone")}
                {F("Access Level", "access", "text", ACCESS_OPTIONS)}
              </div>
              <button onClick={addUser} style={{ width:"100%", padding:"10px", fontSize:13, fontWeight:700, background:"#E8312A", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", marginTop:8 }}>
                Create User
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// JOULE — Floating HR Copilot (SAP Joule-style)
// ══════════════════════════════════════════════════════════════════
function JouleWidget({ currentUser }) {
  const [open,      setOpen]      = useState(false);
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [pulse,     setPulse]     = useState(true);
  const chatEnd = useRef(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);
  useEffect(() => { const t = setTimeout(()=>setPulse(false), 4000); return ()=>clearTimeout(t); }, []);

  const SYSTEM = `You are Nestlé's HR AI Copilot (Joule), embedded in the Nestlé EOS platform. You have deep knowledge of Nestlé brands (Nespresso, KitKat, Maggi, Purina, MILO, Nescafé, Gerber), zones (EMENA, AOA, AMS, GC), frameworks (NCE, FSSC 22000, Net Zero 2050), and 270K employees across 350+ factories. The user is ${currentUser?.name||"an HR professional"} (${currentUser?.role||"HR"}). Be concise, specific, and actionable.`;

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role:"user", content:input };
    const next = [...messages, userMsg];
    setMessages(next); setInput(""); setLoading(true);
    try {
      const res  = await fetch(API_BASE+"/proxy", {
        method:"POST", headers:authH(),
        body: JSON.stringify({ model:ANTHROPIC_MODEL, max_tokens:400, system:SYSTEM, messages:next }),
      });
      const data = await res.json();
      const reply = data.content?.find(b=>b.type==="text")?.text || "I'm unable to respond right now.";
      setMessages(m => [...m, { role:"assistant", content:reply }]);
    } catch { setMessages(m => [...m, { role:"assistant", content:"⚠️ Connection error. Please try again." }]); }
    setLoading(false);
  };

  const PROMPTS = [
    "Summarise today's workforce risks",
    "Which factory needs urgent attention?",
    "Top 3 fatigue alerts this week",
    "Skills gap in EMENA zone",
  ];

  return (
    <>
      {/* Floating button */}
      <div style={{ position:"fixed", bottom:28, right:28, zIndex:1000 }}>
        {/* Tooltip on first load */}
        {pulse && !open && (
          <div style={{ position:"absolute", bottom:68, right:0, background:"#1A1A1A", color:"#fff", fontSize:11, fontWeight:600, padding:"6px 12px", borderRadius:8, whiteSpace:"nowrap", boxShadow:"0 4px 12px rgba(0,0,0,0.15)", animation:"fadeIn 0.3s ease" }}>
            Ask Nestlé HR Copilot
            <div style={{ position:"absolute", bottom:-5, right:18, width:10, height:10, background:"#1A1A1A", transform:"rotate(45deg)" }} />
          </div>
        )}
        <button
          onClick={()=>{ setOpen(o=>!o); setPulse(false); }}
          style={{
            width:52, height:52, borderRadius:"50%",
            background: open ? "#1A1A1A" : "linear-gradient(135deg, #E8312A 0%, #C0392B 100%)",
            border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow: open ? "0 4px 16px rgba(0,0,0,0.25)" : "0 4px 16px rgba(232,49,42,0.4)",
            transition:"all 0.2s ease", transform: open ? "rotate(0deg)" : "scale(1)",
          }}
          title="Nestlé HR Copilot"
        >
          {open
            ? <span style={{ color:"#fff", fontSize:18, fontWeight:300 }}>✕</span>
            : <span style={{ fontSize:22 }}>🤖</span>
          }
        </button>
        {/* Unread dot */}
        {!open && messages.length > 0 && (
          <div style={{ position:"absolute", top:2, right:2, width:10, height:10, background:"#10B981", borderRadius:"50%", border:"2px solid #F5F5F5" }} />
        )}
      </div>

      {/* Chat panel */}
      {open && (
        <div style={{
          position:"fixed", bottom:92, right:28, width:360, height:520, zIndex:999,
          background:"#FFFFFF", borderRadius:16, overflow:"hidden",
          boxShadow:"0 8px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)",
          display:"flex", flexDirection:"column", animation:"jouleOpen 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          border:"1px solid #E8E8E8",
        }}>
          {/* Header */}
          <div style={{ background:"linear-gradient(135deg, #E8312A 0%, #C0392B 100%)", padding:"14px 16px", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🤖</div>
            <div style={{ flex:1 }}>
              <div style={{ color:"#fff", fontWeight:700, fontSize:13, letterSpacing:"0.01em" }}>Nestlé HR Copilot</div>
              <div style={{ color:"rgba(255,255,255,0.75)", fontSize:10, fontWeight:400 }}>Powered by Claude · Always available</div>
            </div>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#4ADE80", boxShadow:"0 0 6px #4ADE80" }} />
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 8px", display:"flex", flexDirection:"column", gap:10, background:"#FAFAFA" }}>
            {messages.length === 0 && (
              <div style={{ textAlign:"center", padding:"20px 0" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>👋</div>
                <div style={{ fontSize:13, fontWeight:600, color:"#1A1A1A", marginBottom:4 }}>Hi, {currentUser?.name?.split(" ")[0] || "there"}!</div>
                <div style={{ fontSize:12, color:"#6B7280", lineHeight:1.6 }}>Ask me anything about workforce, safety, scheduling, or talent across Nestlé's 350+ factories.</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:14, justifyContent:"center" }}>
                  {PROMPTS.map((p,i)=>(
                    <button key={i} onClick={()=>{ setInput(p); }}
                      style={{ padding:"5px 10px", fontSize:11, fontWeight:500, background:"#FFFFFF", border:"1px solid #E0E0E0", borderRadius:20, color:"#374151", cursor:"pointer" }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m,i) => (
              <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                {m.role==="assistant" && (
                  <div style={{ width:24, height:24, borderRadius:"50%", background:"#FFF1F0", border:"1px solid #FFCCC7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0, marginRight:7, alignSelf:"flex-end" }}>🤖</div>
                )}
                <div style={{
                  maxWidth:"80%", padding:"9px 12px", borderRadius:m.role==="user"?"14px 14px 2px 14px":"14px 14px 14px 2px",
                  background:m.role==="user"?"#E8312A":"#FFFFFF",
                  color:m.role==="user"?"#fff":"#1A1A1A",
                  fontSize:12, lineHeight:1.6, whiteSpace:"pre-wrap",
                  boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
                  border:m.role==="assistant"?"1px solid #F0F0F0":"none",
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:24, height:24, borderRadius:"50%", background:"#FFF1F0", border:"1px solid #FFCCC7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>🤖</div>
                <div style={{ background:"#FFFFFF", border:"1px solid #F0F0F0", borderRadius:"14px 14px 14px 2px", padding:"9px 14px", display:"flex", gap:4 }}>
                  {[0,1,2].map(i=><div key={i} style={{ width:6,height:6,borderRadius:"50%",background:"#CBD5E1",animation:`bounce 1s ease-in-out ${i*0.2}s infinite` }}/>)}
                </div>
              </div>
            )}
            <div ref={chatEnd} />
          </div>

          {/* Input */}
          <div style={{ padding:"10px 12px", background:"#FFFFFF", borderTop:"1px solid #F0F0F0", display:"flex", gap:8 }}>
            <input
              value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&send()}
              placeholder="Ask about workforce, safety, skills…"
              style={{ flex:1, padding:"8px 12px", fontSize:12, background:"#F8F9FA", border:"1px solid #E8E8E8", borderRadius:20, color:"#1A1A1A", outline:"none" }}
            />
            <button onClick={send} disabled={loading||!input.trim()}
              style={{ width:34, height:34, borderRadius:"50%", background:loading||!input.trim()?"#E8E8E8":"#E8312A", border:"none", color:"#fff", cursor:loading||!input.trim()?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>
              ➤
            </button>
          </div>

          {/* Clear */}
          {messages.length > 0 && (
            <div style={{ padding:"4px 12px 8px", textAlign:"center" }}>
              <button onClick={()=>setMessages([])} style={{ fontSize:10, color:"#9CA3AF", background:"none", border:"none", cursor:"pointer" }}>Clear conversation</button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes jouleOpen {
          from { opacity:0; transform:scale(0.85) translateY(20px); transform-origin:bottom right; }
          to   { opacity:1; transform:scale(1)    translateY(0);    transform-origin:bottom right; }
        }
      `}</style>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// USER MANAGEMENT (Admin only)
// ══════════════════════════════════════════════════════════════════
function UserManagementTab() {
  const [users,       setUsers]      = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [showAdd,     setShowAdd]    = useState(false);
  const [showPwdFor,  setShowPwdFor] = useState(null);
  const [form,        setForm]       = useState({ username:"", password:"", name:"", role:"", zone:"Global", access:"view" });
  const [newPwd,      setNewPwd]     = useState("");
  const [msg,         setMsg]        = useState({ text:"", type:"" });

  
  const auth  = () => authH();
  const flash = (text, type="ok") => { setMsg({text, type}); setTimeout(()=>setMsg({text:"",type:""}), 3000); };

  const loadUsers = async () => {
    setLoading(true);
    const res = await fetch(API_BASE+"/auth/users", { headers: auth() });
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []); // eslint-disable-line

  const addUser = async () => {
    if (!form.username || !form.password || !form.name) return flash("All fields required", "err");
    const res  = await fetch(API_BASE+"/auth/users", { method:"POST", headers:auth(), body:JSON.stringify(form) });
    const data = await res.json();
    if (data.ok) { flash("User created successfully"); setShowAdd(false); setForm({username:"",password:"",name:"",role:"",zone:"Global",access:"view"}); loadUsers(); }
    else flash(data.error || "Failed to create user", "err");
  };

  const deleteUser = async (username) => {
    if (!window.confirm("Delete user " + username + "?")) return;
    const res  = await fetch(API_BASE+"/auth/users/" + username, { method:"DELETE", headers:auth() });
    const data = await res.json();
    if (data.ok) { flash("User deleted"); loadUsers(); }
    else flash(data.error, "err");
  };

  const changePassword = async (username) => {
    if (newPwd.length < 8) return flash("Password must be at least 8 characters", "err");
    const res  = await fetch(API_BASE+"/auth/users/" + username + "/password", { method:"PUT", headers:auth(), body:JSON.stringify({ newPassword:newPwd }) });
    const data = await res.json();
    if (data.ok) { flash("Password updated"); setShowPwdFor(null); setNewPwd(""); }
    else flash(data.error, "err");
  };

  const ACCESS_COLORS = { admin:"red", full:"blue", zone:"green", safety:"yellow", ops:"purple", view:"blue" };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:"#1A1A1A", margin:"0 0 4px" }}>⚙ User Management</h2>
          <p style={{ fontSize:13, color:"#6B7280", margin:0 }}>Manage access credentials for the Nestlé EOS platform</p>
        </div>
        <button onClick={()=>setShowAdd(s=>!s)}
          style={{ padding:"9px 18px", fontSize:13, fontWeight:600, background:"#005695", border:"none", borderRadius:8, color:"#fff", cursor:"pointer" }}>
          {showAdd ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {/* Flash message */}
      {msg.text && (
        <div style={{ padding:"10px 16px", borderRadius:8, marginBottom:16, fontSize:12, fontWeight:600,
          background:msg.type==="err"?"#FFF1F0":"#F6FFED", color:msg.type==="err"?"#CF1322":"#389E0D",
          border:msg.type==="err"?"1px solid #FFCCC7":"1px solid #B7EB8F" }}>
          {msg.type==="err" ? "⚠️ " : "✅ "}{msg.text}
        </div>
      )}

      {/* Add user form */}
      {showAdd && (
        <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:12, padding:20, marginBottom:20, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:16, color:"#1A1A1A" }}>New User</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:12 }}>
            {[["username","Username (login ID)","text"],["password","Password (min 8 chars)","password"],["name","Full Name","text"]].map(([k,lbl,type])=>(
              <div key={k}>
                <label style={{ fontSize:11, fontWeight:600, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:4 }}>{lbl}</label>
                <input type={type} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                  style={{ width:"100%", padding:"8px 12px", fontSize:13, background:"#F8F9FA", border:"1px solid #E2E8F0", borderRadius:7, color:"#1A1A1A", outline:"none", boxSizing:"border-box" }} />
              </div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
            {[["role","Job Title / Role","text"],["zone","Zone / Location","text"]].map(([k,lbl,type])=>(
              <div key={k}>
                <label style={{ fontSize:11, fontWeight:600, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:4 }}>{lbl}</label>
                <input type={type} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                  style={{ width:"100%", padding:"8px 12px", fontSize:13, background:"#F8F9FA", border:"1px solid #E2E8F0", borderRadius:7, color:"#1A1A1A", outline:"none", boxSizing:"border-box" }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:4 }}>Access Level</label>
              <select value={form.access} onChange={e=>setForm(f=>({...f,access:e.target.value}))}
                style={{ width:"100%", padding:"8px 12px", fontSize:13, background:"#F8F9FA", border:"1px solid #E2E8F0", borderRadius:7, color:"#1A1A1A", outline:"none", boxSizing:"border-box" }}>
                {[["admin","Admin (full access)"],["full","Full Access"],["zone","Zone HR"],["safety","Safety Only"],["ops","Operations Only"],["view","View Only"]].map(([v,l])=>(
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={addUser} style={{ padding:"8px 20px", fontSize:13, fontWeight:600, background:"#E8312A", border:"none", borderRadius:7, color:"#fff", cursor:"pointer" }}>Create User</button>
            <button onClick={()=>setShowAdd(false)} style={{ padding:"8px 16px", fontSize:13, fontWeight:600, background:"#F5F5F5", border:"1px solid #E0E0E0", borderRadius:7, color:"#6B7280", cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Users table */}
      <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#F8FAFC" }}>
              {["User","Role","Zone","Access Level","Created","Actions"].map(h=>(
                <th key={h} style={{ padding:"11px 16px", textAlign:"left", fontSize:10, fontWeight:600, color:"#94A3B8", letterSpacing:"0.08em", textTransform:"uppercase", borderBottom:"2px solid #F1F5F9" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ padding:40, textAlign:"center", color:"#9CA3AF" }}>Loading users…</td></tr>}
            {!loading && users.map(u => {
              const hue = u.username.split("").reduce((a,c)=>a+c.charCodeAt(0),0) % 360;
              return (
                <tr key={u.username} style={{ borderBottom:"1px solid #F0F0F0" }}>
                  <td style={{ padding:"12px 16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:"50%", background:`hsl(${hue},70%,92%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:`hsl(${hue},70%,32%)`, flexShrink:0 }}>
                        {u.name.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13, color:"#1A1A1A" }}>{u.name}</div>
                        <div style={{ fontSize:11, color:"#94A3B8", fontFamily:"monospace" }}>{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:"12px 16px", fontSize:12, color:"#374151" }}>{u.role}</td>
                  <td style={{ padding:"12px 16px", fontSize:12, color:"#374151" }}>{u.zone}</td>
                  <td style={{ padding:"12px 16px" }}>
                    <Badge label={u.access.toUpperCase()} color={ACCESS_COLORS[u.access]||"blue"} />
                  </td>
                  <td style={{ padding:"12px 16px", fontSize:11, color:"#94A3B8" }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                  <td style={{ padding:"12px 16px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      {showPwdFor === u.username ? (
                        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                          <input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="New password" autoFocus
                            style={{ padding:"5px 10px", fontSize:12, border:"1px solid #E2E8F0", borderRadius:6, outline:"none", width:130 }} />
                          <button onClick={()=>changePassword(u.username)} style={{ padding:"5px 10px", fontSize:11, fontWeight:600, background:"#005695", border:"none", borderRadius:5, color:"#fff", cursor:"pointer" }}>Save</button>
                          <button onClick={()=>{ setShowPwdFor(null); setNewPwd(""); }} style={{ padding:"5px 8px", fontSize:11, background:"#F5F5F5", border:"1px solid #E0E0E0", borderRadius:5, color:"#6B7280", cursor:"pointer" }}>✕</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={()=>{ setShowPwdFor(u.username); setNewPwd(""); }}
                            style={{ padding:"5px 10px", fontSize:11, fontWeight:600, background:"#F0F4F8", border:"1px solid #E2E8F0", borderRadius:5, color:"#374151", cursor:"pointer" }}>
                            Change Password
                          </button>
                          <button onClick={()=>deleteUser(u.username)}
                            style={{ padding:"5px 10px", fontSize:11, fontWeight:600, background:"#FFF1F0", border:"1px solid #FFCCC7", borderRadius:5, color:"#CF1322", cursor:"pointer" }}>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding:"12px 16px", borderTop:"1px solid #F0F0F0", fontSize:12, color:"#94A3B8" }}>
          {users.length} user{users.length!==1?"s":""} · Changes take effect immediately · Sessions expire after 8 hours
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// NOTIFICATION BELL
// ══════════════════════════════════════════════════════════════════
function NotificationBell({ user }) {
  const [open,    setOpen]    = useState(false);
  const [notifs,  setNotifs]  = useState([]);
  const [unread,  setUnread]  = useState(0);

  const load = () => {
    fetch(API_BASE+"/api/notifications", { headers:authH() })
      .then(r=>r.json()).then(d=>{ setNotifs(d.notifications||[]); setUnread(d.unread||0); }).catch(()=>{});
  };

  useEffect(() => { load(); const t=setInterval(load,30000); return ()=>clearInterval(t); }, []);

  const markRead = (id) => {
    fetch(API_BASE+"/api/notifications/"+id+"/read", { method:"PUT", headers:authH() });
    setNotifs(n=>n.map(x=>x.id===id?{...x,read:1}:x));
    setUnread(u=>Math.max(0,u-1));
  };

  const typeIcon = { ai_action:"⚡", safety_incident:"🛡️", fatigue_alert:"⚠️", shift_plan:"📅" };

  return (
    <div style={{ position:"relative" }}>
      <button onClick={()=>{ setOpen(o=>!o); if(!open) load(); }}
        style={{ position:"relative", width:34, height:34, borderRadius:8, background:"#F5F5F5", border:"1px solid #E8E8E8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
        🔔
        {unread > 0 && (
          <div style={{ position:"absolute", top:-4, right:-4, width:16, height:16, borderRadius:"50%", background:"#E8312A", color:"#fff", fontSize:9, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #F5F5F5" }}>{unread>9?"9+":unread}</div>
        )}
      </button>
      {open && (
        <div style={{ position:"absolute", right:0, top:42, width:320, background:"#FFFFFF", border:"1px solid #E8E8E8", borderRadius:12, boxShadow:"0 8px 24px rgba(0,0,0,0.12)", zIndex:500, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", borderBottom:"1px solid #F0F0F0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontWeight:700, fontSize:13, color:"#1A1A1A" }}>Notifications</span>
            {unread > 0 && <Badge label={unread+" unread"} color="red" />}
          </div>
          <div style={{ maxHeight:360, overflowY:"auto" }}>
            {notifs.length===0 && <div style={{ padding:20, textAlign:"center", color:"#9CA3AF", fontSize:13 }}>No notifications</div>}
            {notifs.slice(0,15).map(n=>(
              <div key={n.id} onClick={()=>markRead(n.id)}
                style={{ padding:"10px 16px", borderBottom:"1px solid #F8F8F8", background:n.read?"#FFFFFF":"#F8FBFF", cursor:"pointer", display:"flex", gap:10, alignItems:"flex-start" }}>
                <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{typeIcon[n.type]||"📢"}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:n.read?400:600, color:"#1A1A1A", marginBottom:2 }}>{n.title}</div>
                  <div style={{ fontSize:11, color:"#6B7280", lineHeight:1.4 }}>{n.message}</div>
                  <div style={{ fontSize:10, color:"#9CA3AF", marginTop:3 }}>{new Date(n.created_at).toLocaleString()}</div>
                </div>
                {!n.read && <div style={{ width:7, height:7, borderRadius:"50%", background:"#E8312A", flexShrink:0, marginTop:4 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// EMPLOYEE PROFILES TAB
// ══════════════════════════════════════════════════════════════════
function EmployeeProfilesTab() {
  const [employees,   setEmployees]   = useState([]);
  const [stats,       setStats]       = useState({});
  const [factories,   setFactories]   = useState([]);
  const [depts,       setDepts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(0);
  const [selected,    setSelected]    = useState(null);
  const [search,      setSearch]      = useState("");
  const [filterFac,   setFilterFac]   = useState("ALL");
  const [filterDept,  setFilterDept]  = useState("ALL");
  const [filterShift, setFilterShift] = useState("ALL");
  const [filterRisk,  setFilterRisk]  = useState("ALL");
  const [aiAdvice,    setAiAdvice]    = useState("");
  const [aiLoading,   setAiLoading]   = useState(false);
  const PAGE_SIZE = 20;

  const load = async (pg=0, fac=filterFac, dept=filterDept, shift=filterShift, risk=filterRisk, srch=search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ top:PAGE_SIZE, skip:pg*PAGE_SIZE, factory:fac, dept, shift, risk, search:srch });
      const [empRes, statsRes, facRes, deptRes] = await Promise.all([
        fetch(API_BASE+"/api/employees?"+params),
        fetch(API_BASE+"/api/employees/stats?factory="+fac),
        fetch(API_BASE+"/api/factories"),
        fetch(API_BASE+"/api/employees/depts?factory="+fac),
      ]);
      const [empData, statsData, facData, deptData] = await Promise.all([empRes.json(), statsRes.json(), facRes.json(), deptRes.json()]);
      setEmployees(empData.employees || []);
      setTotal(empData.total || 0);
      setStats(statsData || {});
      setFactories(Array.isArray(facData) ? facData : []);
      setDepts(Array.isArray(deptData) ? deptData : []);
      setPage(pg);
    } catch(e) { console.error("Employee load error:", e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const applyFilters = () => load(0, filterFac, filterDept, filterShift, filterRisk, search);

  const generateAiAdvice = async (emp) => {
    setAiAdvice(""); setAiLoading(true);
    const res = await fetch(API_BASE+"/proxy", {
      method:"POST", headers:authH(),
      body: JSON.stringify({ model:ANTHROPIC_MODEL, max_tokens:400,
        system:"You are Nestlé's AI HR Advisor. Give a concise, specific 3-point development plan for this employee. Focus on skills, safety, and career growth aligned with NCE and FSSC 22000.",
        messages:[{ role:"user", content:`Employee: ${emp.name}, Role: ${emp.job_title}, Dept: ${emp.department}, Factory: ${emp.factory_id}, Tenure: ${emp.tenure_months} months, Fatigue Risk: ${emp.fatigue_risk} (${emp.fatigue_score}/100), Safety Score: ${emp.safety_score}/100, Overtime: ${emp.overtime_hrs}h/wk, Shift: ${emp.shift}. Generate a personalised HR action plan.` }]
      })
    });
    const data = await res.json();
    setAiAdvice(data.content?.find(b=>b.type==="text")?.text || "");
    setAiLoading(false);
  };

  const RISK_COL = { CRITICAL:"#CF1322", HIGH:"#D46B08", MEDIUM:"#005695", LOW:"#389E0D" };
  const RISK_BG  = { CRITICAL:"#FFF1F0", HIGH:"#FFF7E6", MEDIUM:"#E6F4FF", LOW:"#F6FFED" };
  const facName  = (id) => factories.find(f=>f.id===id)?.name || id;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ display:"flex", gap:0, height:"calc(100vh - 160px)", overflow:"hidden", margin:"-28px -32px", padding:0 }}>
      {/* LEFT PANEL — list */}
      <div style={{ width:selected?"55%":"100%", borderRight:"1px solid #EDEDED", display:"flex", flexDirection:"column", transition:"width 0.2s" }}>
        {/* Header */}
        <div style={{ padding:"18px 24px 14px", borderBottom:"1px solid #F0F0F0", background:"#FFFFFF" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <h2 style={{ fontSize:18, fontWeight:700, color:"#1A1A1A", margin:"0 0 2px" }}>👥 Employee Profiles</h2>
              <p style={{ fontSize:12, color:"#6B7280", margin:0 }}>{total.toLocaleString()} employees across all factories</p>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:14 }}>
            {[
              { label:"Total",    value:stats.total||0,    col:"#005695" },
              { label:"Critical", value:stats.critical||0, col:"#CF1322" },
              { label:"High Risk",value:stats.high||0,     col:"#D46B08" },
              { label:"Avg Safety",value:(stats.avgSafety||0)+"%", col:"#389E0D" },
              { label:"On Overtime",value:stats.overtime||0, col:"#6D28D9" },
            ].map(s=>(
              <div key={s.label} style={{ background:"#F8FAFC", borderRadius:8, padding:"8px 10px", borderLeft:"3px solid "+s.col }}>
                <div style={{ fontSize:9, fontWeight:600, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#1A1A1A", marginTop:2 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&applyFilters()}
              placeholder="Search name, role, ID…"
              style={{ flex:1, minWidth:160, padding:"7px 12px", fontSize:12, background:"#F8F9FA", border:"1px solid #E2E8F0", borderRadius:7, color:"#1A1A1A", outline:"none" }} />
            {[
              ["Factory", filterFac, setFilterFac, [["ALL","All Factories"],...(factories.map(f=>[f.id,f.name]))]],
              ["Dept",    filterDept,setFilterDept,[["ALL","All Depts"],...depts.map(d=>[d,d.length>20?d.slice(0,20)+"…":d])]],
              ["Shift",   filterShift,setFilterShift,[["ALL","All Shifts"],["Morning","Morning"],["Afternoon","Afternoon"],["Night","Night"]]],
              ["Risk",    filterRisk,setFilterRisk,[["ALL","All Risk"],["CRITICAL","Critical"],["HIGH","High"],["MEDIUM","Medium"],["LOW","Low"]]],
            ].map(([lbl,val,setter,opts])=>(
              <select key={lbl} value={val} onChange={e=>{ setter(e.target.value); }}
                style={{ padding:"6px 10px", fontSize:12, background:"#FFFFFF", border:"1px solid #E2E8F0", borderRadius:7, color:"#374151" }}>
                {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            <button onClick={applyFilters} style={{ padding:"7px 16px", fontSize:12, fontWeight:600, background:"#005695", border:"none", borderRadius:7, color:"#fff", cursor:"pointer" }}>Search</button>
          </div>
        </div>

        {/* Table */}
        <div style={{ flex:1, overflowY:"auto", background:"#FFFFFF" }}>
          {loading && <div style={{ padding:32, textAlign:"center", color:"#9CA3AF" }}>Loading employees…</div>}
          {!loading && employees.length === 0 && <div style={{ padding:32, textAlign:"center", color:"#9CA3AF" }}>No employees found. Run <code>node seed_employees.js</code> to seed data.</div>}
          {!loading && employees.length > 0 && (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#F8FAFC", position:"sticky", top:0, zIndex:1 }}>
                  {["Employee","Role / Dept","Factory","Shift","Fatigue","Safety","Overtime"].map(h=>(
                    <th key={h} style={{ padding:"9px 14px", textAlign:"left", fontSize:10, fontWeight:600, color:"#94A3B8", letterSpacing:"0.07em", textTransform:"uppercase", borderBottom:"2px solid #F1F5F9", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const hue  = emp.id.split("").reduce((a,c)=>a+c.charCodeAt(0),0) % 360;
                  const risk = emp.fatigue_risk || "LOW";
                  const isSelected = selected?.id === emp.id;
                  return (
                    <tr key={emp.id} onClick={()=>{ setSelected(emp); setAiAdvice(""); }}
                      style={{ borderBottom:"1px solid #F5F5F5", cursor:"pointer", background:isSelected?"#EBF4FF":"transparent", transition:"background 0.1s" }}
                      onMouseOver={e=>{ if(!isSelected) e.currentTarget.style.background="#F8FBFF"; }}
                      onMouseOut={e=>{ if(!isSelected) e.currentTarget.style.background="transparent"; }}>
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                          <div style={{ width:32, height:32, borderRadius:"50%", background:`hsl(${hue},70%,92%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:`hsl(${hue},70%,32%)`, flexShrink:0 }}>
                            {(emp.first_name?.[0]||"?")+( emp.last_name?.[0]||"")}
                          </div>
                          <div>
                            <div style={{ fontSize:12, fontWeight:600, color:"#1A1A1A" }}>{emp.name}</div>
                            <div style={{ fontSize:10, color:"#94A3B8", fontFamily:"monospace" }}>{emp.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ fontSize:12, color:"#374151" }}>{emp.job_title}</div>
                        <div style={{ fontSize:10, color:"#9CA3AF" }}>{emp.department}</div>
                      </td>
                      <td style={{ padding:"10px 14px", fontSize:11, color:"#6B7280" }}>{facName(emp.factory_id)}</td>
                      <td style={{ padding:"10px 14px" }}>
                        <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:4,
                          background:emp.shift==="Night"?"#F9F0FF":emp.shift==="Afternoon"?"#E6F4FF":"#FFF7E6",
                          color:emp.shift==="Night"?"#531DAB":emp.shift==="Afternoon"?"#005695":"#D46B08" }}>
                          {emp.shift}
                        </span>
                      </td>
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:40, height:4, background:"#F0F0F0", borderRadius:99, overflow:"hidden" }}>
                            <div style={{ width:Math.min(100,emp.fatigue_score||0)+"%", height:"100%", background:RISK_COL[risk]||"#005695" }} />
                          </div>
                          <Badge label={risk} color={risk==="CRITICAL"||risk==="HIGH"?"red":risk==="MEDIUM"?"yellow":"green"} />
                        </div>
                      </td>
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:40, height:4, background:"#F0F0F0", borderRadius:99, overflow:"hidden" }}>
                            <div style={{ width:(emp.safety_score||0)+"%", height:"100%", background:emp.safety_score>80?"#10B981":emp.safety_score>65?"#F59E0B":"#EF4444" }} />
                          </div>
                          <span style={{ fontSize:11, color:"#6B7280" }}>{emp.safety_score}</span>
                        </div>
                      </td>
                      <td style={{ padding:"10px 14px", fontSize:12, fontWeight:700, color:emp.overtime_hrs>10?"#CF1322":emp.overtime_hrs>5?"#D46B08":"#389E0D" }}>
                        {emp.overtime_hrs || 0}h
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div style={{ padding:"10px 20px", borderTop:"1px solid #F0F0F0", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#FFFFFF" }}>
            <span style={{ fontSize:12, color:"#6B7280" }}>Showing {page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,total)} of {total.toLocaleString()}</span>
            <div style={{ display:"flex", gap:4 }}>
              <button onClick={()=>load(page-1)} disabled={page===0}
                style={{ padding:"4px 12px", fontSize:12, background:page===0?"#F5F5F5":"#FFFFFF", border:"1px solid #E0E0E0", borderRadius:5, cursor:page===0?"not-allowed":"pointer", color:page===0?"#9CA3AF":"#374151" }}>‹ Prev</button>
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                const pg = Math.max(0,Math.min(page-2,totalPages-5))+i;
                return (
                  <button key={pg} onClick={()=>load(pg)}
                    style={{ padding:"4px 10px", fontSize:12, background:pg===page?"#005695":"#FFFFFF", border:"1px solid #E0E0E0", borderRadius:5, cursor:"pointer", color:pg===page?"#fff":"#374151", fontWeight:pg===page?700:400 }}>
                    {pg+1}
                  </button>
                );
              })}
              <button onClick={()=>load(page+1)} disabled={page>=totalPages-1}
                style={{ padding:"4px 12px", fontSize:12, background:page>=totalPages-1?"#F5F5F5":"#FFFFFF", border:"1px solid #E0E0E0", borderRadius:5, cursor:page>=totalPages-1?"not-allowed":"pointer", color:page>=totalPages-1?"#9CA3AF":"#374151" }}>Next ›</button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL — profile detail */}
      {selected && (
        <div style={{ width:"45%", overflowY:"auto", background:"#FAFAFA", display:"flex", flexDirection:"column" }}>
          {/* Profile header */}
          <div style={{ background:"#FFFFFF", padding:"20px 24px", borderBottom:"1px solid #EDEDED" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                {(() => { const hue=selected.id.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360; return (
                  <div style={{ width:56, height:56, borderRadius:"50%", background:`hsl(${hue},70%,92%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:800, color:`hsl(${hue},70%,32%)` }}>
                    {(selected.first_name?.[0]||"?")+( selected.last_name?.[0]||"")}
                  </div>
                ); })()}
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:"#1A1A1A" }}>{selected.name}</div>
                  <div style={{ fontSize:13, color:"#6B7280" }}>{selected.job_title}</div>
                  <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>{selected.id} · {facName(selected.factory_id)}</div>
                </div>
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:"none", border:"1px solid #E0E0E0", borderRadius:6, padding:"4px 10px", fontSize:12, color:"#6B7280", cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <Badge label={selected.status||"Active"} color={selected.status==="Overtime Alert"?"yellow":"green"} />
              <Badge label={selected.shift+" Shift"} color="blue" />
              <Badge label={selected.fatigue_risk+" RISK"} color={selected.fatigue_risk==="CRITICAL"||selected.fatigue_risk==="HIGH"?"red":"green"} />
              <Badge label={selected.department} color="blue" />
            </div>
          </div>

          {/* Profile details */}
          <div style={{ padding:"16px 24px", display:"flex", flexDirection:"column", gap:14 }}>
            {/* Key metrics */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                { label:"Fatigue Score",  value:selected.fatigue_score+"/100",   col:RISK_COL[selected.fatigue_risk]||"#005695" },
                { label:"Safety Score",   value:selected.safety_score+"/100",    col:selected.safety_score>80?"#389E0D":selected.safety_score>65?"#D46B08":"#CF1322" },
                { label:"Weekly Overtime",value:(selected.overtime_hrs||0)+"h",  col:selected.overtime_hrs>10?"#CF1322":"#374151" },
                { label:"Tenure",         value:Math.floor((selected.tenure_months||0)/12)+"y "+(selected.tenure_months%12)+"m", col:"#374151" },
              ].map(m=>(
                <div key={m.label} style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:8, padding:"10px 14px" }}>
                  <div style={{ fontSize:10, fontWeight:600, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:3 }}>{m.label}</div>
                  <div style={{ fontSize:18, fontWeight:700, color:m.col }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Personal details */}
            <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:10, padding:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Personal Details</div>
              {[
                ["Full Name",    selected.name],
                ["Employee ID",  selected.id],
                ["Department",   selected.department],
                ["Location",     selected.location||"—"],
                ["Nationality",  selected.nationality||"—"],
                ["Gender",       selected.gender||"—"],
                ["Start Date",   selected.start_date||"—"],
                ["Schedule",     selected.schedule_name||selected.schedule_code||"Standard"],
                ["Std Hours",    (selected.standard_hours||40)+"h/week"],
                ["Work Days",    (() => { try { return JSON.parse(selected.work_days||"[]").join(", "); } catch(e) { return "Mon–Fri"; } })()],
              ].map(([k,v])=>(
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #F8F8F8" }}>
                  <span style={{ fontSize:12, color:"#6B7280" }}>{k}</span>
                  <span style={{ fontSize:12, fontWeight:500, color:"#1A1A1A" }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Risk bars */}
            <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:10, padding:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Risk Assessment</div>
              {[
                ["Fatigue Risk",   selected.fatigue_score||0, 100, RISK_COL[selected.fatigue_risk]||"#005695"],
                ["Safety Score",   selected.safety_score||0,  100, selected.safety_score>80?"#389E0D":selected.safety_score>65?"#D46B08":"#CF1322"],
                ["Overtime Index", Math.min(100,((selected.overtime_hrs||0)/20)*100), 100, selected.overtime_hrs>10?"#CF1322":selected.overtime_hrs>5?"#D46B08":"#389E0D"],
              ].map(([lbl,val,max,col])=>(
                <div key={lbl} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:12, color:"#374151" }}>{lbl}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:col }}>{Math.round(val)}{lbl==="Safety Score"?"/100":"%"}</span>
                  </div>
                  <div style={{ height:7, background:"#F0F0F0", borderRadius:99, overflow:"hidden" }}>
                    <div style={{ width:Math.min(100,val)+"%", height:"100%", background:col, borderRadius:99, transition:"width 0.5s" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* AI Advisor */}
            <div style={{ background:"#F8F9FA", border:"1px solid #EDEDED", borderRadius:10, padding:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#1A1A1A" }}>⚡ AI HR Advisor</div>
                  <div style={{ fontSize:10, color:"#9CA3AF" }}>Personalised development plan</div>
                </div>
                <button onClick={()=>generateAiAdvice(selected)} disabled={aiLoading}
                  style={{ padding:"5px 12px", fontSize:11, fontWeight:600, background:aiLoading?"#F5F5F5":"#E8312A", border:aiLoading?"1px solid #E0E0E0":"none", borderRadius:6, color:aiLoading?"#9CA3AF":"#fff", cursor:"pointer" }}>
                  {aiLoading?"…":"Generate"}
                </button>
              </div>
              {aiLoading && <div style={{ display:"flex", gap:4 }}>{[0,1,2].map(i=><div key={i} style={{ width:6,height:6,borderRadius:"50%",background:"#E8312A",animation:`bounce 1s ease-in-out ${i*0.2}s infinite` }}/>)}</div>}
              {aiAdvice && <div style={{ fontSize:12, lineHeight:1.8, whiteSpace:"pre-wrap", color:"#1A1A1A" }}>{aiAdvice}</div>}
              {!aiAdvice && !aiLoading && <div style={{ fontSize:12, color:"#9CA3AF" }}>Click Generate for a personalised HR action plan based on this employee's profile.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// HOME PAGE — SAP WorkZone style
// ══════════════════════════════════════════════════════════════════
function HomePage({ onNavigate, currentUser, dbStats, dbFactories }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  const APPS = [
    { id:"overview",   icon:"🏠", label:"Workforce Overview",      desc:"Factory workforce status, KPIs and full employee roster drill-down", color:"#005695", badge:null },
    { id:"analytics",  icon:"📊", label:"Analytics & Insights",     desc:"Live charts — workforce, safety incidents, fatigue trends, skills gap", color:"#6D28D9", badge:"New" },
    { id:"employees",  icon:"👥", label:"Employee Profiles",        desc:"Searchable employee database with profiles, risk scores and AI advisor", color:"#389E0D", badge:dbStats?.employees ? dbStats.employees.toLocaleString()+" emp" : null },
    { id:"safety",     icon:"🛡", label:"Safety Intelligence Hub",  desc:"Incident tracking, factory safety scorecard, SF absence patterns", color:"#E8312A", badge:dbStats?.openIncidents ? dbStats.openIncidents+" open" : null },
    { id:"fatigue",    icon:"⚡", label:"Fatigue Risk Intelligence", desc:"Live fatigue alerts, overtime analysis and manager notifications", color:"#D46B08", badge:dbStats?.pendingAlerts ? dbStats.pendingAlerts+" alerts" : null },
    { id:"skills",     icon:"🎓", label:"Skills Intelligence",       desc:"Skills gap analysis, training roadmaps and NCE maturity tracking", color:"#531DAB", badge:null },
    { id:"operations", icon:"🏭", label:"Operations & Scheduling",   desc:"AI shift optimisation, utilisation analytics and throughput KPIs", color:"#1D7A8A", badge:null },
    { id:"copilot",    icon:"🤖", label:"HR AI Copilot",             desc:"Ask anything about workforce, safety, scheduling or talent data", color:"#6D28D9", badge:"AI Powered" },
    ...(currentUser?.access==="admin" ? [{ id:"users", icon:"⚙", label:"User Management", desc:"Manage EOS users, roles, access levels and passwords", color:"#6B7280", badge:"Admin" }] : []),
  ];

  const factoryHighlights = (dbFactories.length > 0 ? dbFactories : []).slice(0, 6);

  return (
    <div style={{ minHeight:"calc(100vh - 100px)", background:"#F5F7FA" }}>
      {/* Hero banner */}
      <div style={{ background:"linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)", padding:"40px 48px 36px", position:"relative", overflow:"hidden" }}>
        {/* Background pattern */}
        <div style={{ position:"absolute", inset:0, opacity:0.05, backgroundImage:"radial-gradient(circle at 20% 50%, #E8312A 0%, transparent 50%), radial-gradient(circle at 80% 20%, #005695 0%, transparent 40%)" }} />

        <div style={{ position:"relative", zIndex:1, maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:6, letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:500 }}>{today}</div>
              <h1 style={{ fontSize:30, fontWeight:800, color:"#FFFFFF", margin:"0 0 8px", letterSpacing:"-0.5px" }}>
                {greeting}, <span style={{ color:"#E8312A" }}>{currentUser?.name?.split(" ")[0]}</span> 👋
              </h1>
              <p style={{ fontSize:14, color:"rgba(255,255,255,0.65)", margin:"0 0 24px", maxWidth:540, lineHeight:1.6 }}>
                Welcome to <strong style={{ color:"#fff" }}>Nestlé EOS</strong> — your enterprise AI operating system for workforce intelligence across 270,000+ employees in 188 countries.
              </p>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {[
                  { label:"🏭 "+( dbFactories.length||6)+" Factories", col:"#E8312A" },
                  { label:"👥 "+(dbStats?.employees||"480")+" Employees in DB", col:"#005695" },
                  { label:"🛡 "+(dbStats?.openIncidents||0)+" Open Incidents", col:"#D46B08" },
                  { label:"⚡ "+(dbStats?.pendingAlerts||0)+" Fatigue Alerts", col:"#531DAB" },
                ].map((b,i)=>(
                  <div key={i} style={{ padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600, background:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.9)", border:"1px solid rgba(255,255,255,0.15)", backdropFilter:"blur(4px)" }}>
                    {b.label}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ width:100, height:100, borderRadius:20, background:"rgba(232,49,42,0.2)", border:"1px solid rgba(232,49,42,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:44, backdropFilter:"blur(10px)" }}>
                🏢
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:8 }}>{currentUser?.role}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>{currentUser?.zone}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:"32px 48px", maxWidth:1296, margin:"0 auto" }}>

        {/* Quick stats row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:32 }}>
          {[
            { label:"Total Employees",    value:(dbStats?.employees||480).toLocaleString(), icon:"👥", col:"#005695", bg:"#E6F4FF" },
            { label:"Open Safety Issues", value:dbStats?.openIncidents||0,  icon:"🛡", col:"#E8312A", bg:"#FFF1F0" },
            { label:"Fatigue Alerts",     value:dbStats?.pendingAlerts||0,  icon:"⚡", col:"#D46B08", bg:"#FFF7E6" },
            { label:"AI Actions Applied", value:dbStats?.actionsApplied||0, icon:"🤖", col:"#531DAB", bg:"#F9F0FF" },
          ].map(k=>(
            <div key={k.label} style={{ background:"#FFFFFF", borderRadius:12, padding:"18px 20px", border:"1px solid #EDEDED", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", display:"flex", alignItems:"center", gap:14, cursor:"default" }}>
              <div style={{ width:44,height:44,borderRadius:10,background:k.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>{k.icon}</div>
              <div>
                <div style={{ fontSize:24,fontWeight:800,color:k.col }}>{k.value}</div>
                <div style={{ fontSize:11,color:"#9CA3AF",marginTop:1 }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* App tiles */}
        <div style={{ marginBottom:32 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:"#1A1A1A", margin:0 }}>Applications</h2>
            <span style={{ fontSize:12, color:"#9CA3AF" }}>{APPS.length} modules available</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
            {APPS.map(app=>(
              <button key={app.id} onClick={()=>onNavigate(app.id)}
                style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:14, padding:"22px 20px 18px", textAlign:"left", cursor:"pointer", transition:"all 0.18s", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", position:"relative", overflow:"hidden" }}
                onMouseOver={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.1)"; e.currentTarget.style.borderColor=app.color+"55"; }}
                onMouseOut={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor="#EDEDED"; }}>
                {/* Color accent top bar */}
                <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:app.color, borderRadius:"14px 14px 0 0" }} />
                {/* Badge */}
                {app.badge && (
                  <div style={{ position:"absolute", top:12, right:12, fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:99, background:app.color+"18", color:app.color, letterSpacing:"0.04em" }}>
                    {app.badge}
                  </div>
                )}
                <div style={{ width:46,height:46,borderRadius:12,background:app.color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:14,border:`1px solid ${app.color}20` }}>{app.icon}</div>
                <div style={{ fontSize:13,fontWeight:700,color:"#1A1A1A",marginBottom:6 }}>{app.label}</div>
                <div style={{ fontSize:11,color:"#9CA3AF",lineHeight:1.55 }}>{app.desc}</div>
                <div style={{ marginTop:14,display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:600,color:app.color }}>
                  Open <span style={{ fontSize:14 }}>→</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Factory status quick view */}
        {factoryHighlights.length > 0 && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <h2 style={{ fontSize:16, fontWeight:700, color:"#1A1A1A", margin:0 }}>Factory Status</h2>
              <button onClick={()=>onNavigate("overview")} style={{ fontSize:12, fontWeight:600, color:"#005695", background:"none", border:"none", cursor:"pointer" }}>View all →</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {factoryHighlights.map(f=>{
                const risk = f.risk_level || f.risk || "low";
                const col  = risk==="high"?"#E8312A":risk==="medium"?"#D46B08":"#389E0D";
                const util = f.utilization || 80;
                return (
                  <div key={f.id} style={{ background:"#FFFFFF", borderRadius:12, padding:"16px 18px", border:"1px solid #EDEDED", borderLeft:"4px solid "+col, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{f.name}</div>
                        <div style={{ fontSize:11, color:"#9CA3AF", marginTop:1 }}>{f.country} · {f.zone}</div>
                      </div>
                      <span style={{ fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:5, background:col+"18", color:col }}>{risk.toUpperCase()}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <span style={{ fontSize:11, color:"#6B7280" }}>Utilization</span>
                      <span style={{ fontSize:11, fontWeight:700, color:util>90?col:"#374151" }}>{util}%</span>
                    </div>
                    <div style={{ height:5, background:"#F0F0F0", borderRadius:99, overflow:"hidden" }}>
                      <div style={{ width:util+"%", height:"100%", background:col, borderRadius:99, transition:"width 0.6s" }} />
                    </div>
                    <div style={{ fontSize:11, color:"#9CA3AF", marginTop:8 }}>{(f.dbWorkers||f.workers||0).toLocaleString()} employees</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// REUSABLE CHART COMPONENTS (pure SVG — no dependencies)
// ══════════════════════════════════════════════════════════════════

function BarChart({ data, height=160, color="#005695", showValues=true, maxOverride=null }) {
  const max = maxOverride || Math.max(...data.map(d=>d.value), 1);
  const barW = Math.floor(560 / (data.length * 2));
  return (
    <svg width="100%" viewBox={`0 0 580 ${height+40}`} style={{ overflow:"visible" }}>
      {data.map((d, i) => {
        const barH = Math.round((d.value / max) * height);
        const x = i * (barW * 2) + barW / 2 + 10;
        const y = height - barH + 10;
        const col = d.color || color;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={Math.max(barH,2)} fill={col} rx={3} opacity={0.9} />
            {showValues && d.value > 0 && (
              <text x={x+barW/2} y={y-4} textAnchor="middle" fontSize={10} fill="#6B7280" fontFamily="inherit">{d.value}</text>
            )}
            <text x={x+barW/2} y={height+22} textAnchor="middle" fontSize={9} fill="#9CA3AF" fontFamily="inherit" style={{ userSelect:"none" }}>
              {(d.label||"").length > 7 ? d.label.slice(0,6)+"…" : d.label}
            </text>
          </g>
        );
      })}
      <line x1={10} y1={height+10} x2={570} y2={height+10} stroke="#F0F0F0" strokeWidth={1} />
    </svg>
  );
}

function HBarChart({ data, color="#005695" }) {
  const max = Math.max(...data.map(d=>d.value), 1);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {data.map((d,i) => {
        const col = d.color || color;
        const pct = Math.round((d.value/max)*100);
        return (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:130, fontSize:11, color:"#374151", textAlign:"right", flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.label}</div>
            <div style={{ flex:1, height:18, background:"#F0F2F5", borderRadius:4, overflow:"hidden" }}>
              <div style={{ width:pct+"%", height:"100%", background:col, borderRadius:4, transition:"width 0.6s ease", display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:4 }}>
                {pct > 15 && <span style={{ fontSize:9, color:"#fff", fontWeight:700 }}>{d.value}</span>}
              </div>
            </div>
            {pct <= 15 && <span style={{ fontSize:10, color:"#6B7280", minWidth:24 }}>{d.value}</span>}
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data, size=140 }) {
  const total = data.reduce((s,d)=>s+d.value, 0) || 1;
  const r = 48, cx = size/2, cy = size/2, stroke = 18;
  let cumPct = 0;
  const circumference = 2 * Math.PI * r;
  const segments = data.map(d => {
    const pct = d.value / total;
    const seg = { ...d, pct, offset: cumPct };
    cumPct += pct;
    return seg;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink:0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F0F0F0" strokeWidth={stroke} />
      {segments.map((s,i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color}
          strokeWidth={stroke}
          strokeDasharray={`${s.pct * circumference} ${circumference}`}
          strokeDashoffset={-s.offset * circumference}
          style={{ transition:"stroke-dasharray 0.6s ease" }}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      ))}
      <text x={cx} y={cy-4} textAnchor="middle" fontSize={18} fontWeight={700} fill="#1A1A1A" fontFamily="inherit">{total}</text>
      <text x={cx} y={cy+12} textAnchor="middle" fontSize={9} fill="#9CA3AF" fontFamily="inherit">TOTAL</text>
    </svg>
  );
}

function LineChart({ data, height=100, color="#005695", label="" }) {
  if (!data || data.length < 2) return null;
  const max  = Math.max(...data.map(d=>d.value), 1);
  const min  = Math.min(...data.map(d=>d.value), 0);
  const W = 560, H = height;
  const xStep = W / (data.length - 1);
  const toY = v => H - ((v - min) / (max - min || 1)) * (H - 16) - 4;
  const pts  = data.map((d,i) => [i * xStep + 10, toY(d.value)]);
  const path = pts.map((p,i) => (i===0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = path + ` L${pts[pts.length-1][0]},${H+5} L${pts[0][0]},${H+5} Z`;
  return (
    <svg width="100%" viewBox={`0 0 580 ${H+30}`} style={{ overflow:"visible" }}>
      <defs>
        <linearGradient id={`lg-${label}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#lg-${label})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p,i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r={3} fill={color} />
          <text x={p[0]} y={H+20} textAnchor="middle" fontSize={9} fill="#9CA3AF" fontFamily="inherit">{data[i].label}</text>
        </g>
      ))}
      <line x1={10} y1={H+5} x2={570} y2={H+5} stroke="#F0F0F0" strokeWidth={1} />
    </svg>
  );
}

function StatCard({ label, value, sub, icon, col="#005695", bg="#E6F4FF" }) {
  return (
    <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:10, padding:"14px 16px", borderLeft:"3px solid "+col, boxShadow:"0 1px 3px rgba(0,0,0,0.04)", display:"flex", alignItems:"center", gap:12 }}>
      <div style={{ width:40, height:40, borderRadius:10, background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:9, fontWeight:600, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</div>
        <div style={{ fontSize:22, fontWeight:700, color:col, marginTop:1 }}>{value}</div>
        {sub && <div style={{ fontSize:10, color:"#9CA3AF", marginTop:1 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ANALYTICS TAB
// ══════════════════════════════════════════════════════════════════
function AnalyticsTab() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [facRes, incRes, fatRes, skillRes] = await Promise.all([
          fetch(API_BASE+"/api/factories"),
          fetch(API_BASE+"/api/incidents"),
          fetch(API_BASE+"/api/fatigue"),
          fetch(API_BASE+"/api/skills"),
        ]);
        const [facs, incs, fat, skills] = await Promise.all([
          facRes.json(), incRes.json(), fatRes.json(), skillRes.json()
        ]);

        // Enrich factories with employee counts
        const statsResults = await Promise.all(
          (Array.isArray(facs)?facs:[]).map(f =>
            fetch(API_BASE+"/api/employees/stats?factory="+f.id).then(r=>r.json()).catch(()=>({}))
          )
        );
        const enrichedFacs = (Array.isArray(facs)?facs:[]).map((f,i) => ({
          ...f, empCount: statsResults[i]?.total||f.workers||0,
          critical: statsResults[i]?.critical||0,
          high: statsResults[i]?.high||0,
        }));

        setData({ facs: enrichedFacs, incs: Array.isArray(incs)?incs:[], fat: Array.isArray(fat)?fat:[], skills: Array.isArray(skills)?skills:[] });
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    loadAll();
  }, []); // eslint-disable-line

  if (loading) return <div style={{ padding:40, textAlign:"center", color:"#9CA3AF" }}>Loading analytics data…</div>;
  if (!data) return null;

  const { facs, incs, fat, skills } = data;

  // ── Derived data ─────────────────────────────────────────────
  const totalEmps   = facs.reduce((s,f)=>s+f.empCount, 0);
  const openIncs    = incs.filter(i=>i.status==="open").length;
  const critFatigue = fat.filter(f=>f.risk_level==="CRITICAL"||f.fatigue_score>70).length;
  const avgSafety   = facs.length ? Math.round(facs.reduce((s,f)=>s+(f.fssc_coverage||75),0)/facs.length) : 0;

  // Workforce by factory
  const wfData = [...facs].sort((a,b)=>b.empCount-a.empCount).map(f=>({
    label: f.name.split(" ")[0],
    value: f.empCount,
    color: (f.risk_level||f.risk)==="high"?"#E8312A":(f.risk_level||f.risk)==="medium"?"#D46B08":"#005695",
  }));

  // Incidents by factory
  const incByFac = facs.map(f=>({
    label: f.name.split(" ")[0],
    value: incs.filter(i=>i.factory_id===f.id).length,
    color: "#E8312A",
  })).sort((a,b)=>b.value-a.value);

  // Incidents by severity
  const incBySev = [
    { label:"Critical", value:incs.filter(i=>i.severity==="CRITICAL").length, color:"#CF1322" },
    { label:"High",     value:incs.filter(i=>i.severity==="HIGH").length,     color:"#E8312A" },
    { label:"Medium",   value:incs.filter(i=>i.severity==="MEDIUM").length,   color:"#D46B08" },
    { label:"Low",      value:incs.filter(i=>i.severity==="LOW").length,      color:"#389E0D" },
  ];

  // Fatigue risk distribution
  const fatDonut = [
    { label:"Critical", value:fat.filter(f=>f.fatigue_score>70).length,                                      color:"#CF1322" },
    { label:"High",     value:fat.filter(f=>f.fatigue_score>50&&f.fatigue_score<=70).length,                  color:"#D46B08" },
    { label:"Medium",   value:fat.filter(f=>f.fatigue_score>30&&f.fatigue_score<=50).length,                  color:"#005695" },
    { label:"Low",      value:fat.filter(f=>f.fatigue_score<=30).length,                                      color:"#389E0D" },
  ].filter(d=>d.value>0);

  // Fatigue by factory
  const fatByFac = facs.map(f=>({
    label: f.name.split(" ")[0],
    value: fat.filter(fa=>fa.factory_id===f.id).length,
    color: "#D46B08",
  })).filter(d=>d.value>0).sort((a,b)=>b.value-a.value);

  // Skills gap
  const skillsGap = (Array.isArray(skills)?skills:[]).map(s=>({
    label: (s.domain||"").split(" ").slice(0,3).join(" "),
    value: Math.round(s.gap||0),
    color: (s.gap||0)>45?"#E8312A":(s.gap||0)>30?"#D46B08":"#005695",
  })).sort((a,b)=>b.value-a.value).slice(0,8);

  // Utilization by factory
  const utilData = [...facs].sort((a,b)=>(b.utilization||80)-(a.utilization||80)).map(f=>({
    label: f.name.split(" ")[0],
    value: f.utilization||80,
    color: (f.utilization||80)>92?"#E8312A":(f.utilization||80)>84?"#D46B08":"#389E0D",
  }));

  // NCE score by factory
  const nceData = [...facs].sort((a,b)=>(a.nce_score||60)-(b.nce_score||60)).map(f=>({
    label: f.name.split(" ")[0],
    value: f.nce_score||60,
    color: (f.nce_score||60)<60?"#E8312A":(f.nce_score||60)<70?"#D46B08":"#389E0D",
  }));

  // Incident status distribution
  const incStatus = [
    { label:"Open",     value:incs.filter(i=>i.status==="open").length,     color:"#E8312A" },
    { label:"Resolved", value:incs.filter(i=>i.status==="resolved").length, color:"#389E0D" },
  ].filter(d=>d.value>0);

  // Incidents by type
  const incType = {};
  incs.forEach(i=>{ incType[i.incident_type]=(incType[i.incident_type]||0)+1; });
  const incTypeData = Object.entries(incType).map(([k,v])=>({ label:k, value:v, color:"#E8312A" }))
    .sort((a,b)=>b.value-a.value).slice(0,6);

  const CARD = { background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:12, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" };
  const TITLE = { fontSize:13, fontWeight:700, color:"#1A1A1A", marginBottom:4 };
  const SUB   = { fontSize:11, color:"#9CA3AF", marginBottom:16, display:"block" };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:22 }}>
        <h2 style={{ fontSize:20, fontWeight:700, color:"#1A1A1A", margin:"0 0 4px" }}>📊 Analytics & Insights</h2>
        <p style={{ fontSize:13, color:"#6B7280", margin:0 }}>Live workforce intelligence across all factories · Data from local database</p>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
        <StatCard label="Total Workforce"    value={totalEmps.toLocaleString()} icon="👥" col="#005695" bg="#E6F4FF" sub="Across 6 factories" />
        <StatCard label="Open Safety Issues" value={openIncs}    icon="🛡" col="#E8312A" bg="#FFF1F0" sub={incs.length+" total incidents"} />
        <StatCard label="Fatigue Alerts"     value={fat.filter(f=>!f.resolved).length} icon="⚡" col="#D46B08" bg="#FFF7E6" sub={critFatigue+" critical"} />
        <StatCard label="FSSC 22000 Avg"     value={avgSafety+"%"} icon="✅" col="#389E0D" bg="#F6FFED" sub="Food safety coverage" />
      </div>

      {/* Row 1: Workforce + Utilization */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <div style={CARD}>
          <div style={TITLE}>Workforce by Factory</div>
          <span style={SUB}>Employee headcount — colour = risk level</span>
          <BarChart data={wfData} height={130} />
        </div>
        <div style={CARD}>
          <div style={TITLE}>Factory Utilization (%)</div>
          <span style={SUB}>Production line utilization — &gt;92% = high risk</span>
          <BarChart data={utilData} height={130} maxOverride={100} />
        </div>
      </div>

      {/* Row 2: Incidents + Fatigue */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        {/* Safety incidents card */}
        <div style={CARD}>
          <div style={TITLE}>Safety Incidents by Factory</div>
          <span style={SUB}>All recorded incidents — open and resolved</span>
          <BarChart data={incByFac} height={120} color="#E8312A" />
          <div style={{ marginTop:14, display:"flex", gap:8, flexWrap:"wrap" }}>
            {incBySev.map(s=>(
              <div key={s.label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:s.color }} />
                <span style={{ color:"#374151" }}>{s.label}</span>
                <span style={{ fontWeight:700, color:s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fatigue distribution */}
        <div style={CARD}>
          <div style={TITLE}>Fatigue Risk Distribution</div>
          <span style={SUB}>Active alerts by risk level</span>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            <DonutChart data={fatDonut.length>0?fatDonut:[{label:"None",value:1,color:"#E8E8E8"}]} size={130} />
            <div style={{ flex:1 }}>
              {fatDonut.map(d=>(
                <div key={d.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:"1px solid #F8F8F8" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:d.color }} />
                    <span style={{ fontSize:12, color:"#374151" }}>{d.label}</span>
                  </div>
                  <div>
                    <span style={{ fontSize:13, fontWeight:700, color:d.color }}>{d.value}</span>
                    <span style={{ fontSize:10, color:"#9CA3AF", marginLeft:4 }}>({Math.round(d.value/Math.max(fat.length,1)*100)}%)</span>
                  </div>
                </div>
              ))}
              {fatDonut.length===0 && <div style={{ fontSize:12, color:"#9CA3AF" }}>No active fatigue alerts</div>}
            </div>
          </div>
          <div style={{ marginTop:14 }}>
            <div style={{ fontSize:11, color:"#9CA3AF", marginBottom:8 }}>Alerts by factory</div>
            <HBarChart data={fatByFac.length>0?fatByFac:[{ label:"None", value:0 }]} color="#D46B08" />
          </div>
        </div>
      </div>

      {/* Row 3: Skills Gap + NCE + Incident Types */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:16 }}>
        {/* Skills gap */}
        <div style={CARD}>
          <div style={TITLE}>Skills Gap by Domain</div>
          <span style={SUB}>Gap score (pts) — higher = more urgent</span>
          <HBarChart data={skillsGap} color="#531DAB" />
        </div>

        {/* NCE maturity */}
        <div style={CARD}>
          <div style={TITLE}>NCE Maturity Score</div>
          <span style={SUB}>Nestlé Continuous Excellence by factory</span>
          <BarChart data={nceData} height={120} maxOverride={100} />
          <div style={{ marginTop:8, fontSize:10, color:"#9CA3AF" }}>Target: 80pts · Global avg: {nceData.length?Math.round(nceData.reduce((s,d)=>s+d.value,0)/nceData.length):0}pts</div>
        </div>

        {/* Incident breakdown */}
        <div style={CARD}>
          <div style={TITLE}>Incidents by Type</div>
          <span style={SUB}>All recorded incident categories</span>
          <HBarChart data={incTypeData.length>0?incTypeData:[{label:"No incidents",value:0}]} color="#E8312A" />
          <div style={{ marginTop:14, display:"flex", gap:10, alignItems:"center" }}>
            <DonutChart data={incStatus.length>0?incStatus:[{label:"None",value:1,color:"#E8E8E8"}]} size={72} />
            <div>
              {incStatus.map(s=>(
                <div key={s.label} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:s.color }} />
                  <span style={{ fontSize:11, color:"#374151" }}>{s.label}: <strong style={{ color:s.color }}>{s.value}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: FSSC Coverage */}
      <div style={CARD}>
        <div style={TITLE}>FSSC 22000 Food Safety Coverage by Factory</div>
        <span style={SUB}>Target: 90%+ certification coverage across all production lines</span>
        <div style={{ display:"flex", gap:14, alignItems:"flex-end" }}>
          <div style={{ flex:2 }}>
            <HBarChart data={[...facs].sort((a,b)=>(a.fssc_coverage||75)-(b.fssc_coverage||75)).map(f=>({
              label:f.name,
              value:f.fssc_coverage||75,
              color:(f.fssc_coverage||75)>=90?"#389E0D":(f.fssc_coverage||75)>=75?"#D46B08":"#E8312A",
            }))} />
          </div>
          <div style={{ flex:1, padding:"10px 14px", background:"#F8F9FA", borderRadius:8, border:"1px solid #EDEDED" }}>
            <div style={{ fontSize:11, color:"#9CA3AF", marginBottom:8 }}>Quick Stats</div>
            {[
              ["Factories ≥90%", facs.filter(f=>(f.fssc_coverage||75)>=90).length+"/"+facs.length, "#389E0D"],
              ["Avg Coverage",   Math.round(facs.reduce((s,f)=>s+(f.fssc_coverage||75),0)/Math.max(facs.length,1))+"%", "#005695"],
              ["Gap to Target",  Math.max(0,90-Math.round(facs.reduce((s,f)=>s+(f.fssc_coverage||75),0)/Math.max(facs.length,1)))+"%", "#D46B08"],
            ].map(([l,v,c])=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid #F0F0F0" }}>
                <span style={{ fontSize:11, color:"#6B7280" }}>{l}</span>
                <span style={{ fontSize:12, fontWeight:700, color:c }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NestleHRDemo() {
  const [showChangePwd,  setShowChangePwd]  = useState(false);
  const [showUserMgmt,   setShowUserMgmt]   = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    // Restore session from sessionStorage on reload
    const token = sessionStorage.getItem("nestle_eos_token");
    const stored = sessionStorage.getItem("nestle_eos_user");
    if (token && stored) {
      try { return { ...JSON.parse(stored), token }; } catch {}
    }
    return null;
  });
  const [tab,             setTab]             = useState("home");
  const [showAppLauncher,  setShowAppLauncher]  = useState(false);
  const [dbStats,         setDbStats]         = useState({});
  const [dbFactories,     setDbFactories]     = useState([]);

  // Load dashboard stats from DB
  useEffect(() => {
    fetch(API_BASE+"/api/dashboard", { headers:authH() })
      .then(r=>r.json()).then(d=>setDbStats(d)).catch(()=>{});
    // Load live factory worker counts
    fetch(API_BASE+"/api/factories").then(r=>r.json()).then(facs => {
      if (!Array.isArray(facs)) return;
      Promise.all(facs.map(f =>
        fetch(API_BASE+"/api/employees/stats?factory="+f.id).then(r=>r.json()).catch(()=>({}))
      )).then(stats => {
        setDbFactories(facs.map((f,i) => ({ ...f, dbWorkers: stats[i]?.total || f.workers })));
      });
    }).catch(()=>{});
  }, []);

  const [selectedFactory, setSelectedFactory] = useState(FACTORIES[5]); // Silao
  const [rosterFactory,   setRosterFactory]   = useState(null);
  const [rosterRisk,      setRosterRisk]      = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleResult,  setScheduleResult]  = useState(null);
  const [chatInput,       setChatInput]       = useState("");
  const chatEndRef = useRef(null);
  const ai = useAIChat();

  const SYSTEM_PROMPT = `You are Nestlé's Global HR AI Copilot — enterprise workforce intelligence for 270,000+ employees across 350+ factories in 188 countries. You have deep knowledge of Nestlé brands (Nespresso, KitKat, Maggi, Purina, MILO, Nestlé Pure Life, Gerber, Nescafé), business zones (EMENA, AOA, AMS, GC), operational frameworks (NCE - Nestlé Continuous Excellence, FSSC 22000 food safety certification, Net Zero 2050 sustainability), and key manufacturing sites (Vevey HQ, Pune Dairy, São Paulo, Solon Ohio, Tianjin, Silao). Cover scheduling, safety, NCE maturity, FSSC compliance, skills gaps, and talent mobility. Be concise, specific to Nestlé context, data-driven, under 200 words unless asked for more.`;

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [ai.messages]);

  if (!currentUser) return <LoginScreen onLogin={(user) => {
    sessionStorage.setItem("nestle_eos_user", JSON.stringify(user));
    setCurrentUser(user);
  }} />;

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    ai.send(chatInput, SYSTEM_PROMPT);
    setChatInput("");
  };

  const openRoster = (factory, risk=null) => { setRosterFactory(factory); setRosterRisk(risk); };

  const generateSchedule = async () => {
    setScheduleLoading(true); setScheduleResult(null);
    try {
      const res  = await fetch(API_BASE+"/proxy", { method:"POST", headers:authH(), body:JSON.stringify({ model:ANTHROPIC_MODEL, max_tokens:1000, system:"You are Nestlé's AI Workforce Scheduling Engine with expertise in NCE (Nestlé Continuous Excellence), food safety compliance (FSSC 22000), and multi-zone factory operations. Respond ONLY with a valid JSON object, no markdown, no preamble. Schema: { summary: string, shifts: [{shift: string, workers: number, role: string, note: string}], alerts: [string], efficiency_gain: string }", messages:[{ role:"user", content:`Optimal 3-shift schedule for ${selectedFactory.name} (${selectedFactory.country}). Workers: ${selectedFactory.workers}. Utilization: ${selectedFactory.utilization}%. Safety risk: ${selectedFactory.risk}. Consider local labour laws, fatigue management, food safety compliance.` }] }) });
      const data = await res.json();
      const text = data.content?.find(b=>b.type==="text")?.text||"{}";
      try { setScheduleResult(JSON.parse(text.replace(/```json|```/g,"").trim())); }
      catch { setScheduleResult({ summary:text, shifts:[], alerts:[], efficiency_gain:"N/A" }); }
    } catch { setScheduleResult({ summary:"Error generating schedule.", shifts:[], alerts:[], efficiency_gain:"N/A" }); }
    setScheduleLoading(false);
  };

  const TABS = [
    { id:"overview",    label:"Overview" },
    { id:"analytics",   label:"📊 Analytics" },
    { id:"employees",   label:"👥 Employee Profiles" },
    { id:"safety",      label:"🛡 Safety Hub" },
    { id:"fatigue",     label:"⚡ Fatigue Alerts" },
    { id:"skills",      label:"🎓 Skills Intelligence" },
    { id:"operations",  label:"🏭 Operations" },
    { id:"copilot",     label:"🤖 HR Copilot" },
    ...(currentUser?.access==="admin" ? [{ id:"users", label:"⚙ User Management" }] : []),
  ];

  const APPS = [
    { id:"overview",   icon:"🏠", label:"Workforce Overview",       desc:"Factory workforce status, KPIs and drill-down roster",           color:"#005695" },
    { id:"analytics",  icon:"📊", label:"Analytics & Insights",      desc:"Charts, trends, fatigue distribution and skills gap analysis",   color:"#6D28D9" },
    { id:"employees",  icon:"👥", label:"Employee Profiles",         desc:"Full employee database with search, filters and AI advisor",      color:"#389E0D" },
    { id:"safety",     icon:"🛡", label:"Safety Intelligence Hub",   desc:"Incident tracking, factory safety scorecard and AI briefing",    color:"#E8312A" },
    { id:"fatigue",    icon:"⚡", label:"Fatigue Risk Intelligence",  desc:"Live fatigue alerts, overtime analysis and intervention plans",   color:"#D46B08" },
    { id:"skills",     icon:"🎓", label:"Skills Intelligence",        desc:"Skills gap analysis, training roadmaps and NCE maturity",        color:"#531DAB" },
    { id:"operations", icon:"🏭", label:"Operations & Scheduling",    desc:"AI shift optimisation, utilisation and throughput analytics",    color:"#005695" },
    { id:"copilot",    icon:"🤖", label:"HR AI Copilot",              desc:"Multi-turn AI assistant for workforce, safety and talent queries", color:"#1D7A8A" },
    ...(currentUser?.access==="admin" ? [{ id:"users", icon:"⚙", label:"User Management", desc:"Manage platform users, roles and access permissions", color:"#6B7280" }] : []),
  ];

  // shared clickable worker count
  const WorkerCount = ({ factory, style={} }) => (
    <button onClick={()=>openRoster(factory)}
      style={{ fontSize:"inherit", fontWeight:800, color:C.blue, background:"none", border:"none", cursor:"pointer", padding:0, textDecoration:"underline", textDecorationStyle:"dotted", textUnderlineOffset:3, ...style }}
      title={`View all ${factory.workers.toLocaleString()} employees at ${factory.name}`}>
      {factory.workers.toLocaleString()}
    </button>
  );

  return (
    <div style={{ fontFamily:"'Helvetica Neue','Helvetica','Arial',sans-serif", background:"#F5F5F5", minHeight:"100vh", color:"#1A1A1A" }}>

      {/* HEADER */}
      <div style={{ background:"#FFFFFF", borderBottom:"1px solid #E8E8E8", padding:"0 32px", position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", height:58 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {/* ── 9-dot App Launcher ── */}
            <div style={{ position:"relative" }}>
              <button onClick={()=>setShowAppLauncher(s=>!s)}
                style={{ width:38,height:38,borderRadius:8,background:showAppLauncher?"#F0F0F0":"transparent",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"background 0.15s" }}
                title="Open App Launcher"
                onMouseOver={e=>e.currentTarget.style.background="#F0F0F0"}
                onMouseOut={e=>e.currentTarget.style.background=showAppLauncher?"#F0F0F0":"transparent"}>
                <svg width="18" height="18" viewBox="0 0 18 18">
                  {[[1,1],[7,1],[13,1],[1,7],[7,7],[13,7],[1,13],[7,13],[13,13]].map(([x,y],i)=>(
                    <rect key={i} x={x} y={y} width="4" height="4" rx="1" fill={showAppLauncher?"#1A1A1A":"#6B7280"} />
                  ))}
                </svg>
              </button>
              {showAppLauncher && (
                <>
                  <div style={{ position:"fixed",inset:0,zIndex:498 }} onClick={()=>setShowAppLauncher(false)} />
                  <div style={{ position:"absolute",left:0,top:46,width:348,background:"#FFFFFF",border:"1px solid #E0E0E0",borderRadius:14,boxShadow:"0 10px 48px rgba(0,0,0,0.15)",zIndex:499,overflow:"hidden",animation:"fadeIn 0.15s ease" }}>
                    <div style={{ padding:"14px 18px 12px",borderBottom:"1px solid #F0F0F0",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                      <div>
                        <div style={{ fontSize:13,fontWeight:700,color:"#1A1A1A" }}>Nestlé EOS Applications</div>
                        <div style={{ fontSize:11,color:"#9CA3AF",marginTop:1 }}>Click to open any module</div>
                      </div>
                      <button onClick={()=>{ setTab("home"); setShowAppLauncher(false); }}
                        style={{ fontSize:11,fontWeight:600,color:"#005695",background:"#E6F4FF",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer" }}>Home</button>
                    </div>
                    <div style={{ padding:"8px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:3 }}>
                      {APPS.map(app=>(
                        <button key={app.id} onClick={()=>{ setTab(app.id); setShowAppLauncher(false); }}
                          style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",borderRadius:8,background:tab===app.id?"#EBF4FF":"transparent",border:`1px solid ${tab===app.id?"#91CAFF":"transparent"}`,cursor:"pointer",textAlign:"left",transition:"all 0.1s" }}
                          onMouseOver={e=>{ if(tab!==app.id) e.currentTarget.style.background="#F5F7FA"; e.currentTarget.style.border="1px solid #E8E8E8"; }}
                          onMouseOut={e=>{ if(tab!==app.id){ e.currentTarget.style.background="transparent"; e.currentTarget.style.border="1px solid transparent"; } }}>
                          <div style={{ width:36,height:36,borderRadius:8,background:app.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,border:`1px solid ${app.color}22` }}>{app.icon}</div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontSize:12,fontWeight:600,color:"#1A1A1A",marginBottom:2 }}>{app.label}</div>
                            <div style={{ fontSize:10,color:"#9CA3AF",lineHeight:1.4 }}>{app.desc.slice(0,55)}{app.desc.length>55?"…":""}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Logo ── */}
            <div style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"4px 8px",borderRadius:8,transition:"background 0.1s" }}
              onClick={()=>setTab("home")}
              onMouseOver={e=>e.currentTarget.style.background="#F5F5F5"}
              onMouseOut={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ width:36,height:36,borderRadius:8,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#fff",letterSpacing:"-1px",boxShadow:"0 2px 8px #E8312A55" }}>N</div>
              <div>
                <div style={{ fontSize:14,fontWeight:700,letterSpacing:"-0.2px" }}>Nestlé <span style={{ color:C.accent,fontWeight:800 }}>HR·EOS</span></div>
                <div style={{ fontSize:10,color:C.muted,letterSpacing:"0.05em",textTransform:"uppercase" }}>Enterprise AI Operating System</div>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Badge label="LIVE AI" color="green" />
            <Badge label="270K EMPLOYEES" color="yellow" />
            <Badge label="188 COUNTRIES" color="blue" />
            <NotificationBell user={currentUser} />
            <div style={{ width:1, height:24, background:C.border, margin:"0 4px" }} />
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 10px", background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ width:26, height:26, borderRadius:"50%", background:C.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:"#fff" }}>{currentUser.avatar}</div>
              <div>
                <div style={{ fontSize:11, fontWeight:700 }}>{currentUser.name}</div>
                <div style={{ fontSize:9, color:C.muted }}>{currentUser.role} · {currentUser.zone}</div>
              </div>
            </div>
            <button onClick={async()=>{
              try { await fetch(API_BASE+"/auth/logout",{ method:"POST", headers:authH() }); } catch(e){}
              localStorage.removeItem("eos_token");
              setCurrentUser(null);
            }}
              style={{ padding:"5px 12px", fontSize:11, fontWeight:700, background:"transparent", border:"1px solid #D0D0D0", borderRadius:7, color:"#6B7280", cursor:"pointer" }}>
              Sign Out
            </button>
          </div>
        </div>
        <div style={{ display:"flex", gap:0, borderTop:"1px solid #F0F0F0" }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"10px 18px", fontSize:13, fontWeight:tab===t.id?700:400, background:"transparent", border:"none", cursor:"pointer", color:tab===t.id?C.accent:C.muted, borderBottom:`2px solid ${tab===t.id?C.accent:"transparent"}`, transition:"all 0.15s", letterSpacing:"0", whiteSpace:"nowrap" }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"28px 32px", maxWidth:1280, margin:"0 auto" }}>

        {/* ══ HOME ══ */}
        {tab==="home" && <HomePage onNavigate={setTab} currentUser={currentUser} dbStats={dbStats} dbFactories={dbFactories} />}

        {/* ══ ANALYTICS ══ */}
        {tab==="analytics" && <AnalyticsTab />}

        {/* ══ OVERVIEW ══ */}
        {tab==="overview" && (
          <div>
            <h2 style={{ fontSize:20, fontWeight:700, margin:"0 0 4px", color:"#1A1A1A" }}>Workforce Intelligence Dashboard</h2>
            <p style={{ color:"#6B7280", fontSize:13, margin:"0 0 22px", color:"#6B7280" }}>
              Click any <span style={{ color:C.blue, fontWeight:700, textDecoration:"underline dotted", textUnderlineOffset:2 }}>worker count</span> to drill into the full employee roster
            </p>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
              {[
                { label:"Global Workforce", value:"270,000+", sub:"Across 188 countries", accent:C.blue },
                { label:"Factories Covered", value:"350+", sub:"Nespresso · KitKat · Maggi · Purina", accent:C.gold },
                { label:"Open Safety Incidents", value:dbStats.openIncidents||"—", sub:"Requires attention", accent:C.accent },
                { label:"Actions Applied (AI)", value:dbStats.actionsApplied||"—", sub:"Via HR Copilot", accent:C.purple },
              ].map(k=>(
                <div key={k.label} style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:12, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:"18px 22px", borderLeft:`3px solid ${k.accent}` }}>
                  <div style={{ color:"#9CA3AF", fontSize:10, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5 }}>{k.label}</div>
                  <div style={{ color:"#1A1A1A", fontSize:26, fontWeight:800, lineHeight:1 }}>{k.value}</div>
                  {k.sub&&<div style={{ color:"#6B7280", fontSize:11, marginTop:4 }}>{k.sub}</div>}
                </div>
              ))}
            </div>

            <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:12, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", overflow:"hidden" }}>
              <div style={{ padding:"13px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontWeight:700, fontSize:14 }}>Factory Workforce Status</span>
                <span style={{ color:"#6B7280", fontSize:12 }}>Click worker count → employee roster &nbsp;·&nbsp; 6 of 350 factories shown</span>
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#F8F9FA" }}>
                    {["Factory","Zone","Workforce ↗","Utilization","Risk","Actions"].map(h=>(
                      <th key={h} style={{ padding:"10px 20px", textAlign:"left", fontSize:10, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.06em", textTransform:"uppercase", fontWeight:600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {([...( dbFactories.length>0 ? dbFactories.map(f=>({...f, risk:f.risk_level||f.risk, workers:f.dbWorkers||f.workers, utilization:f.utilization||80})) : FACTORIES )].sort((a,b)=>(a.risk==="high"||a.risk_level==="high")?-1:(b.risk==="high"||b.risk_level==="high")?1:0)).map(f=>(
                    <tr key={f.id} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"13px 20px" }}>
                        <div style={{ fontWeight:600, fontSize:13 }}>{f.name}</div>
                        <div style={{ color:"#6B7280", fontSize:11 }}>{f.id} · {f.country}</div>
                      </td>
                      <td style={{ padding:"13px 20px", color:"#6B7280", fontSize:12 }}>{f.zone}</td>
                      <td style={{ padding:"13px 20px" }}>
                        <WorkerCount factory={f} style={{ fontSize:18 }} />
                        <span style={{ color:"#6B7280", fontSize:11 }}> workers</span>
                      </td>
                      <td style={{ padding:"13px 20px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:80, height:6, background:"#E8E8E8", borderRadius:99, overflow:"hidden" }}>
                            <div style={{ width:`${f.utilization}%`, height:"100%", borderRadius:99, background:(f.utilization||80)>90?C.accent:(f.utilization||80)>80?C.gold:C.green }} />
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, color:(f.utilization||80)>90?C.accent:C.text }}>{f.utilization||80}%</span>
                        </div>
                      </td>
                      <td style={{ padding:"13px 20px" }}>
                        <Badge label={(f.risk||f.risk_level||"low").toUpperCase()} color={(f.risk||f.risk_level)==="high"?"red":(f.risk||f.risk_level)==="medium"?"yellow":"green"} />
                      </td>
                      <td style={{ padding:"13px 20px" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={()=>openRoster(f)} style={{ background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 12px", fontSize:11, fontWeight:700, color:C.blue, cursor:"pointer" }}>👥 Roster</button>
                          <button onClick={()=>{ setSelectedFactory(f); setTab("scheduling"); }} style={{ background:C.accent, border:"none", borderRadius:6, padding:"5px 12px", fontSize:11, fontWeight:700, color:"#fff", cursor:"pointer" }}>⚡ Schedule</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ SCHEDULING ══ */}
        {tab==="scheduling" && (
          <div>
            <h2 style={{ fontSize:20, fontWeight:700, margin:"0 0 4px", color:"#1A1A1A" }}>AI Workforce Scheduling</h2>
            <p style={{ color:"#6B7280", fontSize:13, margin:"0 0 22px", color:"#6B7280" }}>Automated shift optimisation · fatigue management · local labour law compliance</p>

            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:18 }}>
              {FACTORIES.map(f=>(
                <button key={f.id} onClick={()=>{ setSelectedFactory(f); setScheduleResult(null); }}
                  style={{ padding:"7px 15px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", background:selectedFactory.id===f.id?C.accent:C.surfaceAlt, border:`1px solid ${selectedFactory.id===f.id?C.accent:C.border}`, color:"#fff", transition:"all 0.15s" }}>
                  {f.name}
                </button>
              ))}
            </div>

            <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:12, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:22, marginBottom:18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:800 }}>{selectedFactory.name}</div>
                  <div style={{ color:"#6B7280", fontSize:13 }}>{selectedFactory.country} · {selectedFactory.zone} · {selectedFactory.id}</div>
                </div>
                <Badge label={selectedFactory.risk.toUpperCase()+" RISK"} color={selectedFactory.risk==="high"?"red":selectedFactory.risk==="medium"?"yellow":"green"} />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:18 }}>
                {/* Workforce — CLICKABLE */}
                <div style={{ background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px", borderLeft:`3px solid ${C.blue}` }}>
                  <div style={{ color:"#9CA3AF", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Workforce</div>
                  <WorkerCount factory={selectedFactory} style={{ fontSize:30 }} />
                  <div style={{ color:"#6B7280", fontSize:11, marginTop:3 }}>Click to view full roster ↗</div>
                </div>
                <div style={{ background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px", borderLeft:`3px solid ${selectedFactory.utilization>90?C.accent:C.green}` }}>
                  <div style={{ color:"#9CA3AF", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Utilization</div>
                  <div style={{ fontSize:30, fontWeight:800, color:selectedFactory.utilization>90?C.accent:C.text }}>{selectedFactory.utilization}%</div>
                  <div style={{ color:"#6B7280", fontSize:11, marginTop:3 }}>{selectedFactory.utilization>90?"⚠ Overstretched":"Optimal range"}</div>
                </div>
                <div style={{ background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px", borderLeft:`3px solid ${C.gold}` }}>
                  <div style={{ color:"#9CA3AF", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Zone</div>
                  <div style={{ fontSize:30, fontWeight:800 }}>{selectedFactory.zone}</div>
                  <div style={{ color:"#6B7280", fontSize:11, marginTop:3 }}>Regional cluster</div>
                </div>
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button onClick={generateSchedule} disabled={scheduleLoading}
                  style={{ background:scheduleLoading?C.surfaceAlt:`linear-gradient(135deg,${C.accent},${C.accentSoft})`, color:"#fff", border:"none", borderRadius:8, padding:"11px 26px", fontSize:14, fontWeight:700, cursor:scheduleLoading?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:8 }}>
                  {scheduleLoading?<><span style={{ display:"inline-block",width:16,height:16,border:"2px solid #fff",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite" }} />Generating…</>:"⚡ Generate AI Schedule"}
                </button>
                <button onClick={()=>openRoster(selectedFactory)}
                  style={{ background:"#F8F9FA", border:`1px solid ${C.blue}`, borderRadius:8, padding:"11px 20px", fontSize:13, fontWeight:700, color:C.blue, cursor:"pointer" }}>
                  👥 Full Roster ({selectedFactory.workers.toLocaleString()})
                </button>
              </div>
            </div>

            {scheduleResult && (
              <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:12, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:22, animation:"fadeIn 0.4s ease" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div style={{ fontWeight:800, fontSize:16 }}>AI Schedule · {selectedFactory.name}</div>
                  <Badge label={`+${scheduleResult.efficiency_gain} EFFICIENCY`} color="green" />
                </div>
                <p style={{ color:"#6B7280", fontSize:13, marginBottom:14, lineHeight:1.6 }}>{scheduleResult.summary}</p>
                {scheduleResult.shifts?.length>0 && (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:10, marginBottom:14 }}>
                    {scheduleResult.shifts.map((s,i)=>(
                      <div key={i} style={{ background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:10, padding:15 }}>
                        <div style={{ fontWeight:700, color:C.accent, marginBottom:4, fontSize:13 }}>{s.shift}</div>
                        <div style={{ fontWeight:600, marginBottom:6, fontSize:12 }}>{s.role}</div>
                        {/* worker count in schedule card also clickable */}
                        <WorkerCount factory={selectedFactory} style={{ fontSize:22 }} />
                        <span style={{ color:"#6B7280", fontSize:12 }}> workers</span>
                        {s.note&&<div style={{ color:"#6B7280", fontSize:11, marginTop:6 }}>{s.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {scheduleResult.alerts?.map((a,i)=>(
                  <div key={i} style={{ background:"#1A0A0A", border:`1px solid #7F1D1D`, borderRadius:8, padding:"9px 14px", marginBottom:5, fontSize:13, color:"#FCA5A5" }}>{a}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ SAFETY ══ */}
        {/* ══ SAFETY HUB ══ */}
        {tab==="safety" && <SafetyHubTab />}

        {/* ══ FATIGUE ALERTS ══ */}
        {tab==="fatigue" && <FatigueAlertsTab />}

        {/* ══ SKILLS INTELLIGENCE ══ */}
        {tab==="skills" && <SkillsIntelligenceTab />}

        {/* ══ OPERATIONS ══ */}
        {tab==="operations" && <OperationsTab />}

        {/* ══ EMPLOYEE PROFILES ══ */}
        {tab==="employees" && <EmployeeProfilesTab />}

        {/* ══ USER MANAGEMENT ══ */}
        {tab==="users" && <UserManagementTab />}

        {/* ══ HR COPILOT ══ */}
        {tab==="copilot" && (
          <div>
            <h2 style={{ fontSize:20, fontWeight:700, margin:"0 0 4px", color:"#1A1A1A" }}>HR AI Copilot</h2>
            <p style={{ color:"#6B7280", fontSize:13, margin:"0 0 18px", color:"#6B7280" }}>Ask anything about workforce, scheduling, safety, or talent across 350+ factories</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:18 }}>
              {["Which factories are lagging on NCE maturity?","Fatigue risk report for Pune Dairy plant","Which zones need FSSC 22000 upskilling?","How do we reskill Maggi line operators for AI-assisted production?","Benchmark Nespresso workforce vs KitKat on safety compliance"].map((p,i)=>(
                <button key={i} onClick={()=>setChatInput(p)} style={{ padding:"7px 13px", fontSize:12, fontWeight:600, cursor:"pointer", background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:8, color:C.text }}>{p}</button>
              ))}
            </div>
            <div style={{ background:"#FFFFFF", border:"1px solid #EDEDED", borderRadius:12, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", height:400, overflowY:"auto", padding:18, marginBottom:14, display:"flex", flexDirection:"column", gap:14 }}>
              {ai.messages.length===0&&<div style={{ color:"#6B7280", fontSize:13, textAlign:"center", margin:"auto" }}><div style={{ fontSize:38, marginBottom:10 }}>🤖</div><div style={{ fontWeight:700, color:C.text, marginBottom:4 }}>Nestlé HR Copilot</div>Ask anything about any factory or employee population.</div>}
              {ai.messages.map((m,i)=>(
                <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                  <div style={{ maxWidth:"75%", padding:"11px 15px", borderRadius:m.role==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px", background:m.role==="user"?C.accent:"#F0F4F8", fontSize:13, lineHeight:1.7, whiteSpace:"pre-wrap" }}>
                    {m.role==="assistant"&&<div style={{ fontSize:10, color:C.muted, marginBottom:4, fontWeight:700, letterSpacing:"0.05em" }}>⚡ NESTLÉ HR COPILOT</div>}
                    {m.content}
                  </div>
                </div>
              ))}
              {ai.loading&&<div style={{ display:"flex" }}><div style={{ background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:"12px 12px 12px 2px", padding:"11px 15px", color:"#6B7280", fontSize:13 }}>Thinking…</div></div>}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSendChat()} placeholder="Ask about any factory, workforce issue, or safety concern…" style={{ flex:1, padding:"11px 15px", fontSize:13, background:"#FFFFFF", border:"1px solid #E2E8F0", borderRadius:8, color:"#374151", outline:"none" }} />
              <button onClick={handleSendChat} disabled={ai.loading||!chatInput.trim()} style={{ padding:"11px 22px", fontSize:14, fontWeight:700, background:ai.loading||!chatInput.trim()?C.surfaceAlt:C.accent, color:"#fff", border:"none", borderRadius:8, cursor:"pointer" }}>Send</button>
              {ai.messages.length>0&&<button onClick={ai.reset} style={{ padding:"11px 15px", background:"#F8F9FA", border:`1px solid ${C.border}`, borderRadius:8, color:"#6B7280", fontSize:12, cursor:"pointer" }}>Clear</button>}
            </div>
          </div>
        )}
      </div>

      {/* FULL-SCREEN ROSTER OVERLAY */}
      {rosterFactory && (
        <EmployeeRoster
          factory={rosterFactory}
          highlightRisk={rosterRisk}
          onClose={()=>{ setRosterFactory(null); setRosterRisk(null); }}
        />
      )}

      {/* JOULE — Floating HR Copilot */}
      <JouleWidget currentUser={currentUser} />

      {/* CHANGE PASSWORD MODAL */}
      {showChangePwd && <ChangePwdModal token={currentUser.token||sessionStorage.getItem("nestle_eos_token")||""} onClose={()=>setShowChangePwd(false)} />}

      {/* USER MANAGEMENT MODAL */}
      {showUserMgmt && <UserMgmtModal token={currentUser.token||sessionStorage.getItem("nestle_eos_token")||""} onClose={()=>setShowUserMgmt(false)} currentUser={currentUser} />}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { transform:translateX(20px); opacity:0; } to { transform:translateX(0); opacity:1; } }
        @keyframes bounce  { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        body { -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; text-rendering:optimizeLegibility; background:#F5F5F5; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:#F5F5F5; }
        ::-webkit-scrollbar-thumb { background:#D0D0D0; border-radius:99px; }
        ::-webkit-scrollbar-thumb:hover { background:#B0B0B0; }
        input, select, button, textarea { font-family:inherit; }
        input::placeholder { color:#AAAAAA; font-size:13px; }
        select option { background:#FFFFFF; color:#1A1A1A; }
        th { font-weight:600; letter-spacing:0.04em; color:#6B7280; }
        a { color:#005695; }
      `}</style>
    </div>
  );
}

// Map DB employee record to roster display format
function mapDBEmployee(dbEmp, factory) {
  let workDays = ["Mon","Tue","Wed","Thu","Fri"];
  try { workDays = JSON.parse(dbEmp.work_days || "[]"); if (!workDays.length) workDays = ["Mon","Tue","Wed","Thu","Fri"]; } catch(e) {}
  const shiftLabel = dbEmp.shift || "Morning";
  const shift      = SHIFTS.find(s => s.label === shiftLabel) || SHIFTS[0];
  return {
    id:           dbEmp.id,
    name:         dbEmp.name || ((dbEmp.first_name||"Unknown")+" "+(dbEmp.last_name||"")).trim(),
    avatar:       dbEmp.avatar || ((dbEmp.first_name||"?")[0]+(dbEmp.last_name||"")[0]).toUpperCase(),
    firstName:    dbEmp.first_name || "Unknown",
    lastName:     dbEmp.last_name  || "",
    role:         dbEmp.job_title  || "Employee",
    dept:         dbEmp.department || "General",
    location:     dbEmp.location   || (factory && factory.country) || "",
    shift,
    scheduleCode: dbEmp.schedule_code || null,
    scheduleName: dbEmp.schedule_name || shiftLabel,
    scheduleHours:Math.round((dbEmp.standard_hours||40) / Math.max(1, workDays.length||5)),
    workDays,
    standardHours:dbEmp.standard_hours || 40,
    overtimeHrs:  dbEmp.overtime_hrs   || 0,
    fatigueRisk:  dbEmp.fatigue_risk   || "LOW",
    safetyScore:  dbEmp.safety_score   || 80,
    tenure:       dbEmp.tenure_months  || 12,
    status:       dbEmp.status || ((dbEmp.overtime_hrs||0) > 14 ? "Overtime Alert" : "Active"),
  };
}