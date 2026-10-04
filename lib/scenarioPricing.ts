import {CalcMode,Currency,ProfitMode,computeProfit,currencyRate,roundUpTo} from "@/lib/calculations";

export type ScenarioValue={unitPrice:number|"";qty:number|""};
export type PricingScenario={id:string;pax:number;manualFinalPrice:number|""};
export type ScenarioCostRow={
  id:string;
  item:string;
  direction?:"cost"|"deduction";
  mode:CalcMode;
  currency:Currency;
  note:string;
  values:Record<string,ScenarioValue>;
};
export type ScenarioPricingInput={
  days:number;
  mainCurrency:Currency;
  mainRate:number;
  profitMode:ProfitMode;
  profitRate:number;
  minProfit:number|"";
  maxProfit:number|"";
  fixedProfit:number|"";
  roundUnit:number;
  scenarios:PricingScenario[];
  rows:ScenarioCostRow[];
};
export type ScenarioPricingResult={
  id:string;
  pax:number;
  totalGroupCost:number;
  costPerPax:number;
  suggestedProfit:number;
  suggestedPrice:number;
  roundedPrice:number;
  manualFinalPrice:number|"";
  finalPrice:number;
  finalProfit:number;
  finalMargin:number;
};

export const defaultScenarioIds=[4,6,8,10];

export function scenarioCellPerPax(
  row:ScenarioCostRow,
  scenario:PricingScenario,
  days:number,
  mainCurrency:Currency,
  mainRate:number
){
  const value=row.values[scenario.id]||{unitPrice:"",qty:""};
  const unit=Number(value.unitPrice)||0;
  const qty=Number(value.qty)||0;
  const pax=Math.max(1,Number(scenario.pax)||1);
  const rate=currencyRate(row.currency,mainCurrency,mainRate);
  const sign=row.direction==="deduction"?-1:1;
  if(!unit||!qty||!rate) return 0;
  const base=unit*qty*rate*sign;
  if(row.mode==="每人") return base;
  if(row.mode==="每人每天") return base*Math.max(0,days);
  if(row.mode==="整团") return base/pax;
  return base*Math.max(0,days)/pax;
}

export function calculateScenarioPricing(input:ScenarioPricingInput):ScenarioPricingResult[]{
  return input.scenarios.map(scenario=>{
    const pax=Math.max(1,Number(scenario.pax)||1);
    const costPerPax=input.rows.reduce(
      (sum,row)=>sum+scenarioCellPerPax(row,scenario,input.days,input.mainCurrency,input.mainRate),0
    );
    const totalGroupCost=costPerPax*pax;
    const suggestedProfit=computeProfit(
      costPerPax,input.profitMode,input.profitRate,Number(input.minProfit)||0,input.maxProfit,input.fixedProfit
    );
    const suggestedPrice=costPerPax+suggestedProfit;
    const roundedPrice=roundUpTo(suggestedPrice,input.roundUnit);
    const finalPrice=scenario.manualFinalPrice===""?roundedPrice:Number(scenario.manualFinalPrice);
    const finalProfit=finalPrice-costPerPax;
    const finalMargin=finalPrice?finalProfit/finalPrice:0;
    return {
      id:scenario.id,pax,totalGroupCost,costPerPax,suggestedProfit,suggestedPrice,roundedPrice,
      manualFinalPrice:scenario.manualFinalPrice,finalPrice,finalProfit,finalMargin
    };
  });
}

export function makeScenarioRowsFromTravelerRows(rows:any[],scenarios:PricingScenario[]):ScenarioCostRow[]{
  return (Array.isArray(rows)?rows:[]).map((row:any)=>({
    id:String(row.id||Math.random().toString(36).slice(2,10)),
    item:String(row.item||""),
    direction:row.direction==="deduction"?"deduction":"cost",
    mode:(row.mode||"每人") as CalcMode,
    currency:(row.currency||"RM") as Currency,
    note:String(row.note||""),
    values:Object.fromEntries(scenarios.map(s=>[
      s.id,
      {unitPrice:row.unitPrice??"",qty:row.qty??1}
    ]))
  }));
}
