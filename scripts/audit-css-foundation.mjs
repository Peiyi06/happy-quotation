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
