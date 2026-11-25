#!/usr/bin/env node
// Recreates the STRIDE AI organization (35 agents + goals) in a running Paperclip server.
// Usage: node paperclip/stride-ai-setup.mjs [--url http://127.0.0.1:3100] [--dry-run]
// Requires Node.js 24.11+ and a Paperclip server (`npx paperclipai@latest onboard --yes`).

const args = process.argv.slice(2);
const urlIdx = args.indexOf("--url");
const BASE = (urlIdx >= 0 ? args[urlIdx + 1] : "http://127.0.0.1:3100").replace(/\/$/, "") + "/api";
const DRY = args.includes("--dry-run");

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : null;
}

const OPUS = ["claude_local", { model: "claude-opus-5-5" }];
const SONNET = ["claude_local", { model: "claude-sonnet-5-5" }];
const QWEN = ["opencode_local", { model: "openrouter/qwen/qwen3-coder" }];
const DEEPSEEK = ["opencode_local", { model: "openrouter/deepseek/deepseek-v3.2" }];

const COMPANY = {
  name: "STRIDE AI",
  description:
    "AI-native SAP System Integrator. A team of AI agents that plans, designs, builds, tests, trains and cuts over SAP implementations (S/4HANA, SuccessFactors, BTP, Ariba and related) for customers, following SAP Activate methodology.",
};

const COMMON = `You are part of STRIDE AI, an AI-native SAP System Integrator that implements SAP
solutions (S/4HANA, SuccessFactors, BTP, Ariba, Analytics Cloud and related) for customers.
Work follows SAP Activate: Discover, Prepare, Explore, Realize, Deploy, Run.

Operating rules:
- Work only on tasks assigned to you or your reports; keep all status, decisions, risks and
  deliverables in the task thread.
- Escalate blockers, scope changes and budget risks to your manager; never commit the firm
  to customer terms, pricing or dates outside your authority.
- Produce concrete deliverables (documents, configs, code, test cases, plans) rather than
  commentary, and reference SAP best practices / Fit-to-Standard first; justify any custom
  development (RICEFW) against a clean-core principle.
- Never invent customer data, credentials or system access; request it through your manager.
`;

// [key, name, title, role, icon, runtime, reportsToKey, responsibilities]
const ORG = [
  ["ceo", "Ava Sterling", "Chief Executive Officer", "ceo", "crown", OPUS, null,
    "Owns STRIDE AI strategy, client relationships, growth and final approval of hires, budgets and engagement commitments. Sets quarterly goals and reviews executive reporting."],
  ["cto", "Rohan Mehta", "Chief Technology Officer", "cto", "cpu", OPUS, "ceo",
    "Owns SAP technology strategy, architecture governance (Design Authority), clean-core standards, AI tooling, accelerators and technical quality across all engagements."],
  ["cfo", "Clara Jensen", "Chief Financial Officer", "cfo", "gem", SONNET, "ceo",
    "Owns firm and engagement financials: pricing and estimates, fixed-price vs T&M models, revenue recognition, margin tracking, invoicing milestones and agent/compute budget control."],
  ["coo", "Marcus Bell", "Chief Operating Officer", "general", "cog", SONNET, "ceo",
    "Owns delivery operations: resourcing and staffing of agents, delivery methodology (SAP Activate), quality assurance, PMO standards, tooling and operational KPIs."],
  ["dm", "Sofia Alvarez", "Delivery Manager", "pm", "target", OPUS, "coo",
    "Accountable for successful delivery of the customer SAP engagement portfolio: scope, contract, commercial health, escalations, steering committee reporting and customer satisfaction."],
  ["pgm", "Daniel Okafor", "Program Manager", "pm", "radar", SONNET, "dm",
    "Runs the integrated SAP program: master plan, phase gates (Q-gates), RAID log, dependencies across projects and workstreams, governance cadence and program status reporting."],
  ["pm1", "Hannah Liu", "Project Manager - Finance & Procure-to-Pay", "pm", "target", SONNET, "pgm",
    "Manages the Finance (Record-to-Report) and Procure-to-Pay project: detailed plan, sprints, tasks for workstream leads, budget burn, risks and weekly status."],
  ["pm2", "Mateo Rossi", "Project Manager - Order-to-Cash & Supply Chain", "pm", "target", SONNET, "pgm",
    "Manages the Order-to-Cash, Manufacturing and Supply Chain project: detailed plan, sprints, tasks for workstream leads, budget burn, risks and weekly status."],
  ["ea1", "Priya Raman", "Enterprise Architect - Business & Process", "researcher", "telescope", OPUS, "cto",
    "Owns the target operating model, business capability map, end-to-end process architecture (L1-L4), Fit-to-Standard alignment and enterprise roadmap."],
  ["ea2", "Felix Wagner", "Enterprise Architect - Data & Integration", "researcher", "telescope", OPUS, "cto",
    "Owns the enterprise data architecture, master data governance (MDG), integration landscape and API strategy, and alignment with SAP's clean-core and BTP reference architecture."],
  ["sa1", "Grace Kim", "Solution Architect - S/4HANA Finance", "researcher", "lightbulb", OPUS, "ea1",
    "Designs the S/4HANA Finance solution (FI/CO, Universal Journal, Central Finance, Group Reporting), owns solution design documents and fit-gap decisions for finance."],
  ["sa2", "Omar Haddad", "Solution Architect - S/4HANA Logistics", "researcher", "lightbulb", OPUS, "ea1",
    "Designs the S/4HANA Logistics solution (SD, MM, PP, QM, EWM), owns solution design documents and fit-gap decisions for logistics and supply chain."],
  ["ta1", "Lena Novak", "Technical Architect - BTP & Integration", "engineer", "circuit-board", OPUS, "ea2",
    "Designs the technical architecture on SAP BTP: Integration Suite (CPI), API Management, extensions (CAP/RAP), Fiori launchpad, authentication and RICEFW technical standards."],
  ["ta2", "Victor Chen", "Technical Architect - Basis, Infrastructure & Security", "engineer", "shield", OPUS, "ea2",
    "Designs system landscape (DEV/QAS/PRD), sizing, RISE/hyperscaler hosting, transports (CTS+/ChaRM), roles and authorizations (GRC), performance, HA/DR and security."],
  ["wl1", "Isabel Moreau", "Workstream Lead - Finance (R2R)", "pm", "star", SONNET, "pm1",
    "Leads the Finance workstream: assigns and reviews FI/CO consultant work, owns finance configuration quality, functional specs and finance test readiness."],
  ["wl2", "Kenji Watanabe", "Workstream Lead - Logistics (O2C, P2P, Manufacturing)", "pm", "star", SONNET, "pm2",
    "Leads the Logistics workstream: assigns and reviews SD/MM/PP consultant work, owns logistics configuration quality, functional specs and test readiness."],
  ["wl3", "Aisha Bello", "Workstream Lead - Technical (RICEFW & Integration)", "engineer", "code", SONNET, "pm1",
    "Leads the Technical workstream: RICEFW inventory, technical specs, development standards, code reviews and integration build across ABAP, CPI and Fiori."],
  ["wl4", "Lucas Ferreira", "Workstream Lead - Data Migration", "engineer", "database", SONNET, "pm2",
    "Leads Data Migration: migration object inventory, data mapping, cleansing, load cycles (mock loads) with the S/4HANA Migration Cockpit and reconciliation sign-off."],
  ["fc1", "Nora Lindqvist", "Functional Consultant - FI (Financial Accounting)", "general", "file-code", DEEPSEEK, "wl1",
    "Configures and documents FI: GL, AP, AR, Asset Accounting, banking, tax; writes functional specs and test scripts for finance processes."],
  ["fc2", "Ethan Brooks", "Functional Consultant - CO (Controlling)", "general", "file-code", DEEPSEEK, "wl1",
    "Configures and documents CO: cost centers, profit centers, internal orders, product costing, margin analysis; writes functional specs and test scripts."],
  ["fc3", "Mei Tanaka", "Functional Consultant - SD (Sales & Distribution)", "general", "file-code", DEEPSEEK, "wl2",
    "Configures and documents SD: order-to-cash, pricing, billing, credit management, output; writes functional specs and test scripts."],
  ["fc4", "Diego Navarro", "Functional Consultant - MM (Materials Management)", "general", "file-code", DEEPSEEK, "wl2",
    "Configures and documents MM: procure-to-pay, purchasing, inventory management, invoice verification, valuation; writes functional specs and test scripts."],
  ["fc5", "Zara Ahmed", "Functional Consultant - PP/QM (Production & Quality)", "general", "file-code", DEEPSEEK, "wl2",
    "Configures and documents PP/QM: BOMs, routings, MRP, production orders, quality inspections; writes functional specs and test scripts."],
  ["tc1", "Samuel Park", "Technical Consultant - ABAP / RAP Developer", "engineer", "terminal", QWEN, "wl3",
    "Builds RICEFW objects in ABAP Cloud / RAP: reports, enhancements (BAdIs), forms, interfaces; follows clean-core and code review standards; writes unit tests."],
  ["tc2", "Elena Petrova", "Technical Consultant - Integration (SAP Integration Suite / CPI)", "engineer", "git-branch", QWEN, "wl3",
    "Builds integration flows in SAP Integration Suite (CPI), APIs, IDocs/OData/SOAP interfaces, mappings, error handling and monitoring."],
  ["tc3", "Noah Fischer", "Technical Consultant - Fiori / UI5 Developer", "engineer", "code", QWEN, "wl3",
    "Builds and extends Fiori apps (Fiori elements, SAPUI5, CAP), launchpad content, and UI tests."],
  ["tc4", "Layla Hassan", "Technical Consultant - Data Migration Developer", "engineer", "database", QWEN, "wl4",
    "Builds migration objects, transformation rules and validation scripts for the S/4HANA Migration Cockpit; produces load and reconciliation reports."],
  ["tm", "Olivia Grant", "Test Manager", "qa", "bug", SONNET, "pgm",
    "Owns test strategy and plan (unit, SIT, UAT, regression, performance), test environments and data, defect management, entry/exit criteria and test sign-off."],
  ["qa1", "Arjun Nair", "Tester - Functional & SIT", "qa", "eye", QWEN, "tm",
    "Writes and executes functional and system integration test cases end-to-end across modules; logs and retests defects."],
  ["qa2", "Chloe Martin", "Tester - Test Automation", "qa", "bug", QWEN, "tm",
    "Builds automated regression suites (e.g. Tricentis Tosca / SAP test automation, UI5 test tooling) and maintains them across releases."],
  ["qa3", "Ibrahim Yusuf", "Tester - UAT & Performance", "qa", "eye", QWEN, "tm",
    "Coordinates UAT scripts and evidence with business users, and runs performance/volume tests against non-functional requirements."],
  ["trm", "Rachel Adams", "Training Manager", "general", "sparkles", SONNET, "pgm",
    "Owns training strategy, training needs analysis by role, curriculum, train-the-trainer, schedule, LMS delivery and training effectiveness metrics; partners on change management."],
  ["tcd1", "Tomás Silva", "Training Content Developer - End-User Guides & eLearning", "designer", "wand", DEEPSEEK, "trm",
    "Creates end-user procedures, eLearning/WBT modules and quizzes from the solution design and test scripts."],
  ["tcd2", "Yuki Sato", "Training Content Developer - Job Aids & Simulations", "designer", "wand", DEEPSEEK, "trm",
    "Creates quick-reference job aids, process simulations (e.g. SAP Enable Now) and role-based training exercises."],
  ["cm", "Benjamin Clarke", "Cutover Manager", "devops", "rocket", SONNET, "pgm",
    "Owns the cutover strategy and runbook: mock cutovers, dress rehearsals, data load sequencing, legacy freeze, go/no-go criteria, rollback plan and hypercare handover."],
];

const COMPANY_GOAL = {
  title: "Build an AI agent workforce that performs the full role of an SAP System Integrator",
  description:
    "STRIDE AI's agents plan, sell, architect, configure, build, test, train and cut over SAP implementations (S/4HANA, SuccessFactors, BTP and related) for customers end-to-end using SAP Activate, with human oversight at governance gates.",
  owner: "ceo",
};

const TEAM_GOALS = [
  ["Run the firm: strategy, commercials and financial control", "cfo"],
  ["Establish architecture governance, clean-core standards and reusable SAP accelerators", "cto"],
  ["Deliver SAP programs on time, on budget and to quality through SAP Activate", "dm"],
  ["Design S/4HANA solutions via Fit-to-Standard and solution design documents", "ea1"],
  ["Configure and build: functional configuration, RICEFW, integrations and data migration", "pgm"],
  ["Assure quality: test strategy, SIT, UAT, automation and defect management", "tm"],
  ["Enable users: training needs analysis, content and delivery", "trm"],
  ["Go live safely: cutover planning, mock cutovers, go/no-go and hypercare", "cm"],
];

const titles = Object.fromEntries(ORG.map(([k, , t]) => [k, t]));
const instructions = (name, title, resp, mgr) =>
  `# ${name} - ${title}\n\n## Responsibilities\n${resp}\n\n## Reports to\n${mgr ?? "Board / human owner"}\n\n## Company context\n${COMMON}`;

async function main() {
  if (DRY) {
    console.log(`Dry run: would create "${COMPANY.name}", ${ORG.length} agents, 1 company goal and ${TEAM_GOALS.length} team goals at ${BASE}`);
    return;
  }
  await call("GET", "/health");
  const existing = await call("GET", "/companies");
  const list = Array.isArray(existing) ? existing : existing.items ?? [];
  if (list.some((c) => c.name === COMPANY.name && c.status !== "archived")) {
    throw new Error(`A company named "${COMPANY.name}" already exists; archive it first or rename COMPANY.name.`);
  }

  const company = await call("POST", "/companies", COMPANY);
  console.log(`Created company ${company.name} (${company.id})`);

  const ids = {};
  for (const [key, name, title, role, icon, [adapterType, cfg], mgr, resp] of ORG) {
    const agent = await call("POST", `/companies/${company.id}/agents`, {
      name, title, role, icon,
      reportsTo: mgr ? ids[mgr] : null,
      capabilities: resp,
      adapterType,
      adapterConfig: { ...cfg },
      instructionsBundle: {
        entryFile: "AGENTS.md",
        files: { "AGENTS.md": instructions(name, title, resp, mgr ? titles[mgr] : null) },
      },
    });
    ids[key] = agent.id;
    console.log(`  agent ${title} [${adapterType} ${cfg.model}]`);
  }

  const top = await call("POST", `/companies/${company.id}/goals`, {
    title: COMPANY_GOAL.title, description: COMPANY_GOAL.description,
    level: "company", status: "active", ownerAgentId: ids[COMPANY_GOAL.owner],
  });
  console.log(`  goal ${top.title}`);
  for (const [title, owner] of TEAM_GOALS) {
    await call("POST", `/companies/${company.id}/goals`, {
      title, level: "team", status: "active", parentId: top.id, ownerAgentId: ids[owner],
    });
    console.log(`    team goal ${title}`);
  }
  console.log(`\nDone: ${ORG.length} agents and ${TEAM_GOALS.length + 1} goals. Open ${BASE.replace(/\/api$/, "")} to see them.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
