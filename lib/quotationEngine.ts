import {
  ChildMode, Currency, LeaderCostRow, ProfitMode, TravelerCostRow,
  childRatio, computeProfit, currencyRate, leaderRowTotal, roundUpTo, travelerRowPerPax
} from "@/lib/calculations";

export const travelerTypes=["成人不含领队","成人含领队","小孩含床不含领队","小孩含床含领队","小孩不含床不含领队","小孩不含床含领队"] as const;
export type TravelerType=typeof travelerTypes[number];

export type QuotationCalculationInput={
  pax:number;days:number;mainCurrency:Currency;mainRate:number;
  travelerRows:TravelerCostRow[];leaderRows:LeaderCostRow[];
  profitMode:ProfitMode;profitRate:number;minProfit:number|"";maxProfit:number|"";fixedProfit:number|"";roundUnit:number;
  childBedMode:ChildMode;childBedManual:number;childBedCurrency:Currency;
  childNoBedMode:ChildMode;childNoBedManual:number;childNoBedCurrency:Currency;
  selectedType:TravelerType;manualQuote:number|"";
  singleRoomAmount:number|"";singleRoomCurrency:Currency;
};

export type QuotationPricePoint={cost:number;profit:number;selling:number;suggested:number;rounded:number;final:number;margin:number};
export type QuotationCalculationResult={
  version:1;hasLeader:boolean;travelerPerPax:number;leaderTotal:number;leaderPerPax:number;
  ratioEligible:number;ratioExcluded:number;childBedCost:number;childNoBedCost:number;
  variants:Record<TravelerType,QuotationPricePoint>;selectedType:TravelerType;selected:QuotationPricePoint;
  finalQuote:number;finalProfit:number;finalMargin:number;singleRoomSupplement:number|null;
  adultSellingPrice:number;singleRoomSellingPrice:number|null;
  matrix:Array<{key:"adult"|"childBed"|"childNoBed";label:string;noLeader:QuotationPricePoint;withLeader:QuotationPricePoint}>;
};

export const isLeaderType=(type:TravelerType)=>!type.includes("不含领队");
export const toNoLeaderType=(type:TravelerType):TravelerType=>({
  "成人含领队":"成人不含领队","小孩含床含领队":"小孩含床不含领队","小孩不含床含领队":"小孩不含床不含领队",
  "成人不含领队":"成人不含领队","小孩含床不含领队":"小孩含床不含领队","小孩不含床不含领队":"小孩不含床不含领队"
} as Record<TravelerType,TravelerType>)[type];
export const normalizeSelectedType=(type:TravelerType,hasLeader:boolean):TravelerType=>!hasLeader&&isLeaderType(type)?toNoLeaderType(type):type;

export function buildQuotationCalculationInput(source:any):QuotationCalculationInput{
  const s=source?.quotation_data||source||{};
  return {
    pax:Math.max(1,Number(s.pax??source?.pax)||1),days:Math.max(0,Number(s.itineraryDays??s.days)||0),
    mainCurrency:(s.mainCurrency||"RMB") as Currency,mainRate:Number(s.mainRate)||0,
    travelerRows:Array.isArray(s.travelerRows)?s.travelerRows:[],leaderRows:Array.isArray(s.leaderRows)?s.leaderRows:[],
    profitMode:(s.profitMode||"按成本加价率") as ProfitMode,profitRate:Number(s.profitRate)||0,
    minProfit:s.minProfit===""||s.minProfit==null?"":Number(s.minProfit),maxProfit:s.maxProfit===""||s.maxProfit==null?"":Number(s.maxProfit),
    fixedProfit:s.fixedProfit===""||s.fixedProfit==null?"":Number(s.fixedProfit),roundUnit:Number(s.roundUnit)||50,
    childBedMode:(s.childBedMode||"手动成本") as ChildMode,childBedManual:Number(s.childBedManual)||0,childBedCurrency:(s.childBedCurrency||"RM") as Currency,
    childNoBedMode:(s.childNoBedMode||"手动成本") as ChildMode,childNoBedManual:Number(s.childNoBedManual)||0,childNoBedCurrency:(s.childNoBedCurrency||"RM") as Currency,
    selectedType:(s.selectedType||"成人不含领队") as TravelerType,manualQuote:s.manualQuote===""||s.manualQuote==null?"":Number(s.manualQuote),
    singleRoomAmount:s.singleRoomAmount===""||s.singleRoomAmount==null?"":Number(s.singleRoomAmount),singleRoomCurrency:(s.singleRoomCurrency||"RM") as Currency
  };
}

export function calculateQuotation(input:QuotationCalculationInput):QuotationCalculationResult{
  const safePax=Math.max(1,Number(input.pax)||1);
  // v1 preserves current behavior. Per-day modes are intentionally not multiplied by days yet.
  const travelerPerPax=input.travelerRows.reduce((sum,row)=>sum+travelerRowPerPax(row,safePax,input.mainCurrency,input.mainRate),0);
  const leaderTotal=input.leaderRows.reduce((sum,row)=>sum+leaderRowTotal(row,input.mainCurrency,input.mainRate),0);
  const leaderPerPax=leaderTotal/safePax;
  const hasLeader=input.leaderRows.some(row=>(Number(row.unitPrice)||0)>0&&(Number(row.qty)||0)>0);
  const ratioEligible=input.travelerRows.filter(row=>row.childRatioApplicable).reduce((sum,row)=>sum+travelerRowPerPax(row,safePax,input.mainCurrency,input.mainRate),0);
  const ratioExcluded=input.travelerRows.filter(row=>!row.childRatioApplicable).reduce((sum,row)=>sum+travelerRowPerPax(row,safePax,input.mainCurrency,input.mainRate),0);
  const childCost=(mode:ChildMode,manual:number,currency:Currency)=>{
    const ratio=childRatio(mode);
    return ratio===null?(Number(manual)||0)*currencyRate(currency,input.mainCurrency,input.mainRate):ratioEligible*ratio+ratioExcluded;
  };
  const childBedCost=childCost(input.childBedMode,input.childBedManual,input.childBedCurrency);
  const childNoBedCost=childCost(input.childNoBedMode,input.childNoBedManual,input.childNoBedCurrency);
  const selectedType=normalizeSelectedType(input.selectedType,hasLeader);
  const make=(type:TravelerType,cost:number):QuotationPricePoint=>{
    const profit=computeProfit(cost,input.profitMode,input.profitRate,Number(input.minProfit)||0,input.maxProfit,input.fixedProfit);
    const selling=cost+profit,rounded=roundUpTo(selling,input.roundUnit);
    const final=type===selectedType&&input.manualQuote!==""?Number(input.manualQuote):rounded;
    const finalProfit=final-cost;
    return {cost,profit,selling,suggested:selling,rounded,final,margin:final?finalProfit/final:0};
  };
  const variants={
    "成人不含领队":make("成人不含领队",travelerPerPax),"成人含领队":make("成人含领队",travelerPerPax+leaderPerPax),
    "小孩含床不含领队":make("小孩含床不含领队",childBedCost),"小孩含床含领队":make("小孩含床含领队",childBedCost+leaderPerPax),
    "小孩不含床不含领队":make("小孩不含床不含领队",childNoBedCost),"小孩不含床含领队":make("小孩不含床含领队",childNoBedCost+leaderPerPax)
  } as Record<TravelerType,QuotationPricePoint>;
  const selected=variants[selectedType],finalQuote=selected.final,finalProfit=finalQuote-selected.cost,finalMargin=finalQuote?finalProfit/finalQuote:0;
  const singleRoomSupplement=input.singleRoomAmount===""?null:Number(input.singleRoomAmount)*currencyRate(input.singleRoomCurrency,input.mainCurrency,input.mainRate);
  const adultType:TravelerType=hasLeader?"成人含领队":"成人不含领队";
  const adultSellingPrice=variants[adultType].final;
  return {
    version:1,hasLeader,travelerPerPax,leaderTotal,leaderPerPax,ratioEligible,ratioExcluded,childBedCost,childNoBedCost,variants,
    selectedType,selected,finalQuote,finalProfit,finalMargin,singleRoomSupplement,adultSellingPrice,
    singleRoomSellingPrice:singleRoomSupplement==null?null:adultSellingPrice+singleRoomSupplement,
    matrix:[
      {key:"adult",label:"成人（双人一房）",noLeader:variants["成人不含领队"],withLeader:variants["成人含领队"]},
      {key:"childBed",label:"小孩加床",noLeader:variants["小孩含床不含领队"],withLeader:variants["小孩含床含领队"]},
      {key:"childNoBed",label:"小孩不加床",noLeader:variants["小孩不含床不含领队"],withLeader:variants["小孩不含床含领队"]}
    ]
  };
}
