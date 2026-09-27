# Happy Express Travel — Quotation Calculator

Vercel-ready Next.js quotation calculator based on the current Google Sheet logic.

## Features
- Traveler cost modes: 每人 / 每人每天 / 整团 / 整团每天
- Dynamic Add / Duplicate / Delete traveler cost rows
- Main currency + RM exchange rate logic
- Leader cost allocation per traveler
- Child with-bed / no-bed ratio or manual-cost modes
- Profit modes: 固定金额 / 按成本加价率 / 按售价毛利率
- Minimum / maximum / fixed profit controls
- Quote rounding
- Final pricing matrix with / without leader
- Browser Local Storage autosave
- Print / Save as PDF

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Deploy to Vercel
1. Import this repository into Vercel.
2. Framework preset: Next.js (auto-detected).
3. No environment variables are required for this first version.
4. Deploy.

## Important currency behavior
RM uses rate 1. The selected `主要币种` uses the entered main rate. Other currencies intentionally calculate as rate 0 / warning until they are selected as the main currency, matching the safe behavior of the current Sheet logic rather than guessing exchange rates.
