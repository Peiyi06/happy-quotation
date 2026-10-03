import fs from "node:fs";

const file="app/globals.css";
const css=fs.readFileSync(file,"utf8");

const required=[
  "CSS ARCHITECTURE CONTRACT — LOCKED",
  "LAYER 1 — CANONICAL FOUNDATION SYSTEMS",
  "LAYER 2 — LEGACY COMPATIBILITY BRIDGES",
  "FOUNDATION ACTION SYSTEM — LOCKED",
  "FOUNDATION SPACING SYSTEM — LOCKED",
  "FOUNDATION SURFACE SYSTEM — LOCKED",
  "FOUNDATION WORKSPACE NAVIGATION SYSTEM — LOCKED",
  "FOUNDATION MOTION SYSTEM — LOCKED",
  "FOUNDATION TYPOGRAPHY SYSTEM — LOCKED",
  "FOUNDATION — COMPARISON CARD RULE (LOCKED)"
];

const missing=required.filter(marker=>!css.includes(marker));

const canonicalStart=css.indexOf("LAYER 1 — CANONICAL FOUNDATION SYSTEMS");
const compatibilityStart=css.indexOf("LAYER 2 — LEGACY COMPATIBILITY BRIDGES");

const legacyStandardButtonTokens=[
  "--btn-height:40px",
  "--btn-radius:9px",
  "--btn-font-size:13px",
  "--btn-pad-x:15px"
];
const reintroduced=legacyStandardButtonTokens.filter(token=>css.includes(token));

console.log("Foundation CSS audit");
console.log("--------------------");
console.log(`File: ${file}`);
console.log(`Canonical layer: ${canonicalStart>=0?"present":"missing"}`);
console.log(`Compatibility layer: ${compatibilityStart>=0?"present":"missing"}`);
console.log(`Locked markers: ${required.length-missing.length}/${required.length}`);

if(missing.length){
  console.log("\nMissing locked markers:");
  missing.forEach(x=>console.log(`- ${x}`));
}

if(reintroduced.length){
  console.log("\nLegacy standard button values detected:");
  reintroduced.forEach(x=>console.log(`- ${x}`));
}

if(canonicalStart>=0 && compatibilityStart>=0 && compatibilityStart<canonicalStart){
  console.log("\nWarning: compatibility layer appears before canonical Foundation.");
}

if(!missing.length && !reintroduced.length && canonicalStart>=0 && compatibilityStart>canonicalStart){
  console.log("\nArchitecture status: clean");
}else{
  console.log("\nArchitecture status: review recommended");
}

console.log("\nAI Workspace consolidation signals");
console.log("----------------------------------");

const aiSelectors=[
  ".ai-thread-list",
  ".ai-thread-item",
  ".ai-thread-meta",
  ".ai-lab-workbench-head",
  ".ai-lab-compose",
  ".ai-lab-context",
  ".ai-lab-starters"
];

const escapeRegExp=(value)=>value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const countExactBlocks=(selector)=>(css.match(new RegExp("^\\s*"+escapeRegExp(selector)+"\\s*\\{","gm"))||[]).length;
const countOccurrences=(selector)=>(css.match(new RegExp(escapeRegExp(selector),"g"))||[]).length;

aiSelectors.forEach(selector=>{
  console.log(`${selector}: exact blocks=${countExactBlocks(selector)}, total references=${countOccurrences(selector)}`);
});

console.log("Note: exact blocks include responsive/state-scoped rules. Review structurally; do not flatten media/state rules into base rules.");

console.log("\nAI Workspace Phase 2 lock markers");
console.log("---------------------------------");

const aiPhase2Markers=[
  "AI LAB — SIDEBAR STATE FOUNDATION — LOCKED",
  "AI LAB — RESPONSIVE FOUNDATION — LOCKED",
  "AI LAB — DENSITY FOUNDATION — LOCKED",
  "AI LAB — MOTION FOUNDATION — LOCKED"
];

const missingAiPhase2=aiPhase2Markers.filter(marker=>!css.includes(marker));
aiPhase2Markers.forEach(marker=>{
  console.log(`${marker}: ${css.includes(marker)?"present":"missing"}`);
});

if(!missingAiPhase2.length){
  console.log("AI Workspace Phase 2 state architecture: locked");
}else{
  console.log("AI Workspace Phase 2 state architecture: review required");
}
