export type CalcMode = "每人" | "每人每天" | "整团" | "整团每天";
export type Currency = "RM" | "RMB" | "USD" | "JPY" | "KRW" | "THB" | "VND" | "其他";
export type ProfitMode = "固定金额" | "按成本加价率" | "按售价毛利率";
export type ChildMode = "50%" | "60%" | "65%" | "70%" | "75%" | "80%" | "85%" | "90%" | "95%" | "100%" | "手动成本";

export interface TravelerCostRow {
  id: string;
  item: string;
  mode: CalcMode;
  unitPrice: number | "";
  qty: number | "";
  currency: Currency;
  childRatioApplicable: boolean;
  note: string;
}

export interface LeaderCostRow {
  id: string;
  item: string;
  unitPrice: number | "";
  qty: number | "";
  currency: Currency;
  note: string;
}

export const currencyRate = (currency: Currency, mainCurrency: Currency, mainRate: number) => {
  if (currency === "RM") return 1;
  if (currency === mainCurrency) return mainRate || 0;
  return 0;
};

export const travelerRowTotal = (row: TravelerCostRow, pax: number, mainCurrency: Currency, mainRate: number) => {
  const unit = Number(row.unitPrice) || 0;
  const qty = Number(row.qty) || 0;
  const rate = currencyRate(row.currency, mainCurrency, mainRate);
  if (!unit || !qty || !rate || pax <= 0) return 0;
  const base = unit * qty * rate;
  return row.mode === "每人" || row.mode === "每人每天" ? base * pax : base;
};

export const travelerRowPerPax = (row: TravelerCostRow, pax: number, mainCurrency: Currency, mainRate: number) => {
  if (pax <= 0) return 0;
  return travelerRowTotal(row, pax, mainCurrency, mainRate) / pax;
};

export const leaderRowTotal = (row: LeaderCostRow, mainCurrency: Currency, mainRate: number) => {
  const unit = Number(row.unitPrice) || 0;
  const qty = Number(row.qty) || 0;
  const rate = currencyRate(row.currency, mainCurrency, mainRate);
  return unit && qty && rate ? unit * qty * rate : 0;
};

export const childRatio = (mode: ChildMode) => mode === "手动成本" ? null : Number(mode.replace("%", "")) / 100;

export const computeProfit = (cost: number, mode: ProfitMode, rate: number, minProfit: number, maxProfit: number | "", fixedProfit: number | "") => {
  let profit = 0;
  if (mode === "固定金额") {
    profit = Number(fixedProfit) || Number(minProfit) || 0;
  } else if (mode === "按成本加价率") {
    profit = Math.max(cost * rate, Number(minProfit) || 0);
  } else {
    const marginProfit = rate >= 1 ? 0 : cost / (1 - rate) - cost;
    profit = Math.max(marginProfit, Number(minProfit) || 0);
  }
  if (maxProfit !== "" && Number(maxProfit) >= 0) profit = Math.min(profit, Number(maxProfit));
  return profit;
};

export const roundUpTo = (value: number, unit: number) => {
  if (!unit || unit <= 0) return value;
  return Math.ceil(value / unit) * unit;
};
