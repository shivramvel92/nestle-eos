// Run once: node seed_employees.js
const Database = require("better-sqlite3");
const path     = require("path");
const db       = new Database(path.join(__dirname, "nestle_eos.db"));

const FACTORIES = [
  { id:"VD-01", name:"Vevey HQ Plant",  country:"Switzerland", zone:"EMENA" },
  { id:"IN-04", name:"Pune Factory",    country:"India",       zone:"AOA"   },
  { id:"BR-02", name:"São Paulo",       country:"Brazil",      zone:"AMS"   },
  { id:"US-07", name:"Solon Ohio",      country:"USA",         zone:"AMS"   },
  { id:"CN-03", name:"Tianjin",         country:"China",       zone:"GC"    },
  { id:"MX-05", name:"Silao",           country:"Mexico",      zone:"AMS"   },
];

const ROLES = {
  "VD-01": [
    ["Nespresso Pod Operator","Coffee & Beverages"],
    ["Quality Assurance Analyst","Quality & Food Safety"],
    ["R&D Food Scientist","R&D Innovation Hub"],
    ["NCE Continuous Improvement Lead","HR & Organisational Development"],
    ["Packaging Line Operator","Packaging & Sustainability"],
    ["Food Safety Auditor","Quality & Food Safety"],
    ["Process Engineer","Technical Maintenance"],
    ["HSE Officer","HSE & Compliance"],
    ["HR Business Partner","HR & Organisational Development"],
    ["SAP S/4HANA Consultant","IT & Digital Transformation"],
  ],
  "IN-04": [
    ["Milk Processing Technician","Dairy & Infant Nutrition"],
    ["Infant Formula Technician","Dairy & Infant Nutrition"],
    ["Sterilisation Technician","Dairy & Infant Nutrition"],
    ["Quality Inspector","Quality & Food Safety"],
    ["Shift Supervisor","Liquid & Beverage Production"],
    ["Packaging Technician","Packaging & Sustainability"],
    ["Maintenance Technician","Technical Maintenance"],
    ["Lab Analyst","Quality & Food Safety"],
    ["Cold Chain Supervisor","Cold Chain & Logistics"],
    ["MILO Blending Technician","Liquid & Beverage Production"],
  ],
  "BR-02": [
    ["Maggi Seasoning Technician","Culinary & Seasonings"],
    ["Flavour Development Technician","R&D Innovation Hub"],
    ["Packaging Line Operator","Packaging & Sustainability"],
    ["Quality Assurance Analyst","Quality & Food Safety"],
    ["Shift Supervisor","Culinary & Seasonings"],
    ["Maintenance Technician","Technical Maintenance"],
    ["Nutritional Compliance Officer","Quality & Food Safety"],
    ["HSE Officer","HSE & Compliance"],
    ["Warehouse Associate","Cold Chain & Logistics"],
    ["Process Engineer","Culinary & Seasonings"],
  ],
  "US-07": [
    ["Purina PetCare Specialist","R&D Innovation Hub"],
    ["Gerber Nutritional Technician","Dairy & Infant Nutrition"],
    ["Quality Assurance Analyst","Quality & Food Safety"],
    ["Packaging Engineer","Packaging & Sustainability"],
    ["Shift Supervisor","Confectionery Line"],
    ["Food Safety Auditor","Quality & Food Safety"],
    ["Maintenance Technician","Technical Maintenance"],
    ["Lab Analyst","Quality & Food Safety"],
    ["HSE Officer","HSE & Compliance"],
    ["SAP S/4HANA Consultant","IT & Digital Transformation"],
  ],
  "CN-03": [
    ["KitKat Enrober Operator","Confectionery Line"],
    ["Chocolate Conching Operator","Confectionery Line"],
    ["Packaging Line Operator","Packaging & Sustainability"],
    ["Quality Inspector","Quality & Food Safety"],
    ["Shift Supervisor","Confectionery Line"],
    ["Cold Chain Supervisor","Cold Chain & Logistics"],
    ["Process Engineer","Confectionery Line"],
    ["Maintenance Technician","Technical Maintenance"],
    ["Food Safety Auditor","Quality & Food Safety"],
    ["MILO Blending Technician","Liquid & Beverage Production"],
  ],
  "MX-05": [
    ["Milk Processing Technician","Dairy & Infant Nutrition"],
    ["Packaging Line Operator","Packaging & Sustainability"],
    ["Shift Supervisor","Liquid & Beverage Production"],
    ["Quality Inspector","Quality & Food Safety"],
    ["Maintenance Technician","Technical Maintenance"],
    ["HSE Officer","HSE & Compliance"],
    ["Coffee Roasting Specialist","Coffee & Beverages"],
    ["Lab Analyst","Quality & Food Safety"],
    ["Warehouse Associate","Cold Chain & Logistics"],
    ["Process Engineer","Liquid & Beverage Production"],
  ],
};

const FIRST_NAMES = ["Carlos","Maria","Priya","Wei","James","Fatima","Alex","Yuki","Mohammed","Emma","Raj","Sofia","David","Aisha","Luis","Chen","Amara","John","Nadia","Omar","Lisa","Ravi","Ines","Tom","Zara","Kenji","Ana","Mike","Leila","Sam"];
const LAST_NAMES  = ["Rodriguez","Santos","Sharma","Zhang","Wilson","Al-Rashid","Chen","Tanaka","Hassan","Mueller","Patel","Costa","Kim","Okonkwo","Hernandez","Wang","Diallo","Smith","Petrov","Khalil","Anderson","Kumar","Ferreira","Johnson","Ahmed","Nakamura","Silva","Brown","Dubois","Torres"];
const SHIFTS      = ["Morning","Afternoon","Night"];
const SCHEDULES   = [["STD-5x8","Standard 5-day",40],["SHIFT-A","Morning Shift",42],["SHIFT-B","Afternoon Shift",42],["SHIFT-C","Night Shift",44],["FLEX","Flexible",38]];
const NATIONALITIES = { "VD-01":["Swiss","French","German"], "IN-04":["Indian","Sri Lankan"], "BR-02":["Brazilian","Argentine"], "US-07":["American","Canadian"], "CN-03":["Chinese","Korean"], "MX-05":["Mexican","Colombian"] };
const GENDERS     = ["M","F","M","M","F","F","M","F"];

function rng(seed) {
  let s = Math.abs(seed) % 2147483647 || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

db.prepare("DELETE FROM employees").run();
db.prepare("DELETE FROM sqlite_sequence WHERE name='employees'").run().changes;

const ins = db.prepare(`
  INSERT INTO employees (id,first_name,last_name,factory_id,job_title,department,location,gender,nationality,
    shift,schedule_code,schedule_name,standard_hours,overtime_hrs,fatigue_risk,fatigue_score,safety_score,
    work_days,tenure_months,status,start_date,sf_source)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)
`);

let empCount = 0;
const seedAll = db.transaction(() => {
  FACTORIES.forEach((fac, fi) => {
    const roles   = ROLES[fac.id];
    const nats    = NATIONALITIES[fac.id];
    const perRole = 8; // ~8 employees per role = ~80 per factory

    for (let ri = 0; ri < roles.length; ri++) {
      const [role, dept] = roles[ri];
      for (let j = 0; j < perRole; j++) {
        const seed   = (fi+1)*1000 + ri*100 + j;
        const r      = rng(seed);
        const fnIdx  = Math.floor(r() * FIRST_NAMES.length);
        const lnIdx  = Math.floor(r() * LAST_NAMES.length);
        const sched  = SCHEDULES[Math.floor(r() * SCHEDULES.length)];
        const shift  = SHIFTS[Math.floor(r() * SHIFTS.length)];
        const nat    = nats[Math.floor(r() * nats.length)];
        const gender = GENDERS[Math.floor(r() * GENDERS.length)];
        const ot     = Math.round(r() * 18);
        const fs     = Math.min(100, Math.round(ot * 3.5 + r() * 25));
        const fr     = fs > 70 ? "CRITICAL" : fs > 50 ? "HIGH" : fs > 30 ? "MEDIUM" : "LOW";
        const ss     = Math.round(60 + r() * 40);
        const tenure = Math.round(r() * 120) + 3;
        const days   = tenure * 30;
        const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0,10);
        const workDays  = sched[0].includes("C") ? '["Mon","Tue","Wed","Thu","Fri"]' :
                          sched[0] === "FLEX"     ? '["Mon","Tue","Wed","Thu"]' :
                          '["Mon","Tue","Wed","Thu","Fri"]';
        const status    = ot > 14 ? "Overtime Alert" : "Active";
        const empId     = `${fac.id}-${String(ri).padStart(2,"0")}${String(j).padStart(2,"0")}`;

        ins.run(
          empId, FIRST_NAMES[fnIdx], LAST_NAMES[lnIdx], fac.id,
          role, dept, fac.country, gender, nat,
          shift, sched[0], sched[1], sched[2], ot, fr, fs, ss,
          workDays, tenure, status, startDate
        );
        empCount++;
      }
    }
  });
});

seedAll();
console.log(`✅ Seeded ${empCount} employees across ${FACTORIES.length} factories`);
db.close();