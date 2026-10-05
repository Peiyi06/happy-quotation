"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";
import {quotationTerminology} from "@/lib/quotationTerminology";
import FlightInformation,{emptyFlightInformation,type FlightInformationValue} from "@/components/FlightInformation";
import {
  CalcMode, ChildCostRow, ChildCostSetup, ChildMode, Currency, LeaderCostRow, ProfitMode, TravelerCostRow,
  childExtraRowPerPax, childSetupCost, currencyRate, leaderRowPerPax, leaderRowTotal, travelerRowPerPax, travelerRowTotal
} from "@/lib/calculations";
import {
  calculateQuotation, isLeaderType, toNoLeaderType, travelerTypes,
  type QuotationCalculationInput, type TravelerType
} from "@/lib/quotationEngine";
import {
  calculateScenarioPricing, makeScenarioRowsFromTravelerRows,
  type PricingScenario, type ScenarioCostRow, type ScenarioValue
} from "@/lib/scenarioPricing";

const calcModes: CalcMode[] = ["每人", "每人每天", "整团", "整团每天"];
const currencies: Currency[] = ["RM", "RMB", "USD", "JPY", "KRW", "THB", "VND", "其他"];
const profitModes: ProfitMode[] = ["固定金额", "按成本加价率", "按售价毛利率"];
type QuoteStatus = "draft"|"under_review"|"revision_required"|"ready"|"sent"|"revised"|"confirmed"|"lost"|"archived";
type CalculatorProps = { workspaceMode?: boolean; quotationId?: string; initialQuotation?: any; currentStaffId?: string; currentStaffName?: string; sourceInquiryId?: string; sourceInquiryNo?: string; sourceInquirySnapshot?: any };

const travelerTypeLabel = (type: TravelerType) => ({
  "成人不含领队":"成人（双人一房）｜不含领队",
  "成人含领队":"成人（双人一房）｜含领队",
  "小孩含床不含领队":"小孩加床｜不含领队",
  "小孩含床含领队":"小孩加床｜含领队",
  "小孩不含床不含领队":"小孩不加床｜不含领队",
  "小孩不含床含领队":"小孩不加床｜含领队",
} as Record<TravelerType,string>)[type];

const travelerBaseLabel = (type: TravelerType) => ({
  "成人不含领队":"成人",
  "成人含领队":"成人",
  "小孩含床不含领队":"小孩加床",
  "小孩含床含领队":"小孩加床",
  "小孩不含床不含领队":"小孩不加床",
  "小孩不含床含领队":"小孩不加床",
} as Record<TravelerType,string>)[type];

const uid = () => Math.random().toString(36).slice(2, 10);
const money = (n: number) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", minimumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0).replace("MYR", "RM");
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const formatDisplayDate = (date:string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const [y,m,d] = date.split("-");
  return `${d}/${m}/${y}`;
};

const defaultTravelerRows: TravelerCostRow[] = [
  { id: uid(), item: "地接报价", direction:"cost", mode: "每人", unitPrice: "", qty: 1, currency: "RMB", childRatioApplicable: true, note: "" },
  { id: uid(), item: "小费", direction:"cost", mode: "每人每天", unitPrice: "", qty: 1, currency: "RM", childRatioApplicable: false, note: "" },
  { id: uid(), item: "旅游保险", direction:"cost", mode: "每人", unitPrice: "", qty: 1, currency: "RM", childRatioApplicable: false, note: "" },
  { id: uid(), item: "机场接送", direction:"cost", mode: "整团", unitPrice: "", qty: 1, currency: "RM", childRatioApplicable: false, note: "" },
];

const defaultPricingScenarios:PricingScenario[]=[
  {id:"pax-4",pax:4,manualFinalPrice:""},
  {id:"pax-6",pax:6,manualFinalPrice:""},
  {id:"pax-8",pax:8,manualFinalPrice:""},
  {id:"pax-10",pax:10,manualFinalPrice:""},
];

const defaultLeaderRows: LeaderCostRow[] = [
  { id: uid(), item: "机票", direction:"cost", mode:"每人", unitPrice: 0, qty: 1, currency: "RM", note: "" },
  { id: uid(), item: "单房", direction:"cost", mode:"每人", unitPrice: 0, qty: 1, currency: "RM", note: "" },
  { id: uid(), item: "工钱", direction:"cost", mode:"每人每天", unitPrice: 0, qty: 1, currency: "RM", note: "" },
  { id: uid(), item: "Bonus", direction:"cost", mode:"每人", unitPrice: 0, qty: 1, currency: "RM", note: "" },
  { id: uid(), item: "其他", direction:"cost", mode:"每人", unitPrice: 0, qty: 1, currency: "RM", note: "" },
];

const createDefaultChildSetup = (): ChildCostSetup => ({
  groundBase:"",
  groundRatio:100,
  groundCurrency:"RMB",
  groundDirection:"cost",
  otherRows:[
    {id:uid(),item:"旅游保险",direction:"cost",mode:"每人",unitPrice:"",qty:1,currency:"RM",note:""},
    {id:uid(),item:"机场接送",direction:"cost",mode:"整团",unitPrice:"",qty:1,currency:"RM",note:""},
    {id:uid(),item:"小费",direction:"cost",mode:"每人每天",unitPrice:"",qty:1,currency:"RM",note:""}
  ]
});

export default function QuotationCalculator({workspaceMode=false,quotationId,initialQuotation,currentStaffId="",currentStaffName="",sourceInquiryId="",sourceInquiryNo="",sourceInquirySnapshot}:CalculatorProps) {
  const router = useRouter();
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;
  const terms=quotationTerminology(t);
  const calcModeLabel=(value:CalcMode)=>({
    "每人":t("Per Person","每人"),
    "每人每天":t("Per Person / Day","每人每天"),
    "整团":t("Per Group","整团"),
    "整团每天":t("Per Group / Day","整团每天")
  } as Record<CalcMode,string>)[value]||value;
  const profitModeLabel=(value:ProfitMode)=>({
    "固定金额":t("Fixed Amount","固定金额"),
    "按成本加价率":t("Markup on Cost","按成本加价率"),
    "按售价毛利率":t("Margin on Selling Price","按售价毛利率")
  } as Record<ProfitMode,string>)[value]||value;
  const childModeLabel=(value:ChildMode)=>value==="手动成本"?t("Manual Cost","手动成本"):value;
  const currencyLabel=(value:Currency)=>value==="其他"?t("Other","其他"):value;
  const travelerTypeDisplay=(type:TravelerType)=>({
    "成人不含领队":t("Adult · Twin Sharing · Excl. Leader","成人（双人一房）· 不含领队"),
    "成人含领队":t("Adult · Twin Sharing · Incl. Leader","成人（双人一房）· 含领队"),
    "小孩含床不含领队":t("Child with Bed · Excl. Leader","小孩加床 · 不含领队"),
    "小孩含床含领队":t("Child with Bed · Incl. Leader","小孩加床 · 含领队"),
    "小孩不含床不含领队":t("Child without Bed · Excl. Leader","小孩不加床 · 不含领队"),
    "小孩不含床含领队":t("Child without Bed · Incl. Leader","小孩不加床 · 含领队")
  } as Record<TravelerType,string>)[type];
  const travelerBaseDisplay=(type:TravelerType)=>({
    "成人不含领队":t("Adult","成人"),
    "成人含领队":t("Adult","成人"),
    "小孩含床不含领队":t("Child with Bed","小孩加床"),
    "小孩含床含领队":t("Child with Bed","小孩加床"),
    "小孩不含床不含领队":t("Child without Bed","小孩不加床"),
    "小孩不含床含领队":t("Child without Bed","小孩不加床")
  } as Record<TravelerType,string>)[type];
  const costItemDisplay=(value:string)=>({
    "地接报价":t("Ground Package","地接报价"),
    "小费":t("Tips","小费"),
    "旅游保险":t("Travel Insurance","旅游保险"),
    "机场接送":t("Airport Transfer","机场接送"),
    "机票":t("Air Ticket","机票"),
    "单房":t("Single Room","单房"),
    "工钱":t("Tour Leader Fee","工钱"),
    "其他":t("Other","其他")
  } as Record<string,string>)[value]||value;
  const resolvedSourceInquiryId=sourceInquiryId||initialQuotation?.source_inquiry_id||initialQuotation?.quotation_data?.sourceInquiryId||"";
  const resolvedSourceInquiryNo=sourceInquiryNo||initialQuotation?.quotation_data?.sourceInquiryNo||"";
  const resolvedSourceInquirySnapshot=sourceInquirySnapshot||initialQuotation?.quotation_data?.sourceInquirySnapshot||null;
  const [quoteTitle, setQuoteTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [flightInformation,setFlightInformation] = useState<FlightInformationValue>(()=>emptyFlightInformation());
  const [flightTotalPrice, setFlightTotalPrice] = useState<number | "">("");
  const [flightPriceCurrency, setFlightPriceCurrency] = useState<Currency>("RM");
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [status, setStatus] = useState<QuoteStatus>("draft");
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showHeaderMore,setShowHeaderMore]=useState(false);
  const baselineRef = useRef("");
  const commercialBaselineRef = useRef("");
  const [tourType, setTourType] = useState("");
  const [op, setOp] = useState(currentStaffName);
  const [supplier, setSupplier] = useState("");
  const [pax, setPax] = useState(1);
  const [mainCurrency, setMainCurrency] = useState<Currency>("RMB");
  const [mainRate, setMainRate] = useState(0.62);
  const [travelerRows, setTravelerRows] = useState<TravelerCostRow[]>(defaultTravelerRows);
  const [pricingMode,setPricingMode]=useState<"single"|"scenario">("single");
  const [pricingScenarios,setPricingScenarios]=useState<PricingScenario[]>(()=>defaultPricingScenarios.map(s=>({...s})));
  const [scenarioRows,setScenarioRows]=useState<ScenarioCostRow[]>([]);
  const [leaderRows, setLeaderRows] = useState<LeaderCostRow[]>(defaultLeaderRows);
  const [leaderOpen, setLeaderOpen] = useState(false);
  const [childOpen, setChildOpen] = useState(false);
  const [singleRoomAmount, setSingleRoomAmount] = useState<number | "">("");
  const [singleRoomCurrency, setSingleRoomCurrency] = useState<Currency>("RM");

  const [profitMode, setProfitMode] = useState<ProfitMode>("按成本加价率");
  const [profitRate, setProfitRate] = useState(0.15);
  const [minProfit, setMinProfit] = useState<number | "">("");
  const [maxProfit, setMaxProfit] = useState<number | "">("");
  const [fixedProfit, setFixedProfit] = useState<number | "">("");
  const [roundUnit, setRoundUnit] = useState(50);

  const [childBedMode, setChildBedMode] = useState<ChildMode>("手动成本");
  const [childBedManual, setChildBedManual] = useState(0);
  const [childBedCurrency, setChildBedCurrency] = useState<Currency>("RM");
  const [childNoBedMode, setChildNoBedMode] = useState<ChildMode>("手动成本");
  const [childNoBedManual, setChildNoBedManual] = useState(0);
  const [childNoBedCurrency, setChildNoBedCurrency] = useState<Currency>("RM");
  const [childBedSetup, setChildBedSetup] = useState<ChildCostSetup>(()=>createDefaultChildSetup());
  const [childNoBedSetup, setChildNoBedSetup] = useState<ChildCostSetup>(()=>createDefaultChildSetup());

  const [selectedType, setSelectedType] = useState<TravelerType>("成人不含领队");
  const [manualQuote, setManualQuote] = useState<number | "">("");
  const [hydrated, setHydrated] = useState(false);

  const flightTicketType = useMemo(() => {
    const count = Number(pax) || 0;
    if (count >= 1 && count <= 9) return { code:"FIT", label:t("FIT Ticket","散票"), state:"fit" };
    if (count >= 10 && count <= 200) return { code:"GIT", label:t("GIT","团体票"), state:"git" };
    if (count > 200) return { code:"REVIEW", label:t("Manual Review","需人工确认"), state:"review" };
    return { code:"", label:"—", state:"pending" };
  }, [pax,language]);

  useEffect(() => {
    try {
      const source = initialQuotation?.quotation_data || {};
      if (initialQuotation) {
        setQuoteTitle(initialQuotation.title || "Quotation");
        setDestination(initialQuotation.destination || "");
        setDepartureDate(initialQuotation.departure_date || "");
        setReturnDate(initialQuotation.return_date || "");
        setCustomerName(initialQuotation.customer_name || "");
        setCustomerContact(initialQuotation.quotation_data?.customerContact || "");
        setDepartureCity(initialQuotation.quotation_data?.departureCity || initialQuotation.quotation_data?.sourceInquirySnapshot?.departureCity || "");
        setStatus(initialQuotation.status || "draft");
        setTourType(initialQuotation.tour_type || "");
        setSupplier(initialQuotation.supplier || "");
        setPax(Number(initialQuotation.pax) || 1);
      }
      Object.entries(source).forEach(([k, v]) => {
        const setters: Record<string, (x: any) => void> = {
          tourType:setTourType,op:setOp,supplier:setSupplier,pax:setPax,mainCurrency:setMainCurrency,mainRate:setMainRate,
          customerContact:setCustomerContact,departureCity:setDepartureCity,flightInformation:setFlightInformation,
          flightTotalPrice:setFlightTotalPrice,flightPriceCurrency:setFlightPriceCurrency,
          travelerRows:setTravelerRows,leaderRows:setLeaderRows,leaderOpen:setLeaderOpen,singleRoomAmount:setSingleRoomAmount,singleRoomCurrency:setSingleRoomCurrency,
          profitMode:setProfitMode,profitRate:setProfitRate,minProfit:setMinProfit,maxProfit:setMaxProfit,fixedProfit:setFixedProfit,roundUnit:setRoundUnit,
          childBedMode:setChildBedMode,childBedManual:setChildBedManual,childBedCurrency:setChildBedCurrency,
          childNoBedMode:setChildNoBedMode,childNoBedManual:setChildNoBedManual,childNoBedCurrency:setChildNoBedCurrency,
          childBedSetup:setChildBedSetup,childNoBedSetup:setChildNoBedSetup,
          selectedType:setSelectedType,manualQuote:setManualQuote
        };
        setters[k]?.(v);
      });
      const savedScenarioPricing=source.scenarioPricing;
      if(savedScenarioPricing&&typeof savedScenarioPricing==="object"){
        if(savedScenarioPricing.mode==="scenario"||savedScenarioPricing.mode==="single") setPricingMode(savedScenarioPricing.mode);
        if(Array.isArray(savedScenarioPricing.scenarios)&&savedScenarioPricing.scenarios.length) setPricingScenarios(savedScenarioPricing.scenarios);
        if(Array.isArray(savedScenarioPricing.rows)&&savedScenarioPricing.rows.length) setScenarioRows(savedScenarioPricing.rows);
      }
    } catch {}
    setHydrated(true);
  }, [initialQuotation]);

  const currentSnapshot = JSON.stringify({
    quoteTitle,destination,departureDate,returnDate,customerName,customerContact,departureCity,status,
    flightInformation,flightTotalPrice,flightPriceCurrency,
    tourType,op,supplier,pax,mainCurrency,mainRate,
    travelerRows,leaderRows,leaderOpen,singleRoomAmount,singleRoomCurrency,profitMode,profitRate,minProfit,maxProfit,fixedProfit,roundUnit,
    childBedMode,childBedManual,childBedCurrency,childNoBedMode,childNoBedManual,childNoBedCurrency,childBedSetup,childNoBedSetup,
    selectedType,manualQuote,pricingMode,pricingScenarios,scenarioRows
  });

  const currentCommercialSnapshot=JSON.stringify({
    supplier,pax,mainCurrency,mainRate,flightTotalPrice,flightPriceCurrency,
    travelerRows,leaderRows,singleRoomAmount,singleRoomCurrency,
    profitMode,profitRate,minProfit,maxProfit,fixedProfit,roundUnit,
    childBedMode,childBedManual,childBedCurrency,
    childNoBedMode,childNoBedManual,childNoBedCurrency,childBedSetup,childNoBedSetup,
    selectedType,manualQuote,pricingMode,pricingScenarios,scenarioRows
  });
  const commercialDirty = Boolean(
    hydrated &&
    commercialBaselineRef.current &&
    currentCommercialSnapshot !== commercialBaselineRef.current
  );
  const displayStatus:QuoteStatus =
    status==="ready" && commercialDirty ? "revision_required" : status;

  const travelDuration = useMemo(() => {
    if (!departureDate || !returnDate) return {days:0,label:""};
    const [sy,sm,sd]=departureDate.split("-").map(Number);
    const [ey,em,ed]=returnDate.split("-").map(Number);
    const start=Date.UTC(sy,sm-1,sd);
    const end=Date.UTC(ey,em-1,ed);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return {days:0,label:""};
    const days=Math.floor((end-start)/86400000)+1;
    return {days,label:`${days} ${t("Days","天")}`};
  }, [departureDate,returnDate,language]);

  useEffect(() => {
    if (!hydrated) return;
    if (!baselineRef.current) {
      baselineRef.current = currentSnapshot;
      commercialBaselineRef.current = currentCommercialSnapshot;
      setIsDirty(false);
      return;
    }
    if(!commercialBaselineRef.current){
      commercialBaselineRef.current = currentCommercialSnapshot;
    }
    setIsDirty(currentSnapshot !== baselineRef.current);
  }, [hydrated,currentSnapshot,currentCommercialSnapshot]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const guardNavigation = (event: MouseEvent) => {
      if (!isDirty || pendingHref) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(url.pathname + url.search + url.hash);
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", guardNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", guardNavigation, true);
    };
  }, [isDirty,pendingHref]);

  const calculationInput = useMemo<QuotationCalculationInput>(()=>({
    pax:Math.max(1,Number(pax)||1),
    days:travelDuration.days,
    mainCurrency,mainRate,travelerRows,leaderRows,
    profitMode,profitRate,minProfit,maxProfit,fixedProfit,roundUnit,
    childBedMode,childBedManual,childBedCurrency,
    childNoBedMode,childNoBedManual,childNoBedCurrency,childBedSetup,childNoBedSetup,
    selectedType,manualQuote,singleRoomAmount,singleRoomCurrency
  }),[
    pax,travelDuration.days,mainCurrency,mainRate,travelerRows,leaderRows,
    profitMode,profitRate,minProfit,maxProfit,fixedProfit,roundUnit,
    childBedMode,childBedManual,childBedCurrency,
    childNoBedMode,childNoBedManual,childNoBedCurrency,childBedSetup,childNoBedSetup,
    selectedType,manualQuote,singleRoomAmount,singleRoomCurrency
  ]);

  const calculationResult = useMemo(()=>calculateQuotation(calculationInput),[calculationInput]);
  const scenarioPricingInput=useMemo(()=>({
    days:travelDuration.days,mainCurrency,mainRate,profitMode,profitRate,minProfit,maxProfit,fixedProfit,roundUnit,
    scenarios:pricingScenarios,rows:scenarioRows
  }),[
    travelDuration.days,mainCurrency,mainRate,profitMode,profitRate,minProfit,maxProfit,fixedProfit,roundUnit,
    pricingScenarios,scenarioRows
  ]);
  const scenarioResults=useMemo(()=>calculateScenarioPricing(scenarioPricingInput),[scenarioPricingInput]);
  const primaryScenarioResult=scenarioResults[0]||null;
  const calc = {
    travelerPerPax:calculationResult.travelerPerPax,
    leaderTotal:calculationResult.leaderTotal,
    leaderPerPax:calculationResult.leaderPerPax,
    adultNoLeader:calculationResult.variants["成人不含领队"],
    adultLeader:calculationResult.variants["成人含领队"],
    childBedNoLeader:calculationResult.variants["小孩含床不含领队"],
    childBedLeader:calculationResult.variants["小孩含床含领队"],
    childNoBedNoLeader:calculationResult.variants["小孩不含床不含领队"],
    childNoBedLeader:calculationResult.variants["小孩不含床含领队"]
  };
  const hasLeader=calculationResult.hasLeader;
  const effectiveSelectedType=calculationResult.selectedType;
  const selected=calculationResult.selected;
  const selectedIncludesLeader=isLeaderType(effectiveSelectedType);
  const selectedTravelerLabel=travelerBaseDisplay(effectiveSelectedType);
  const selectedTravelerCost=({
    "成人不含领队":calc.adultNoLeader.cost,
    "成人含领队":calc.adultNoLeader.cost,
    "小孩含床不含领队":calc.childBedNoLeader.cost,
    "小孩含床含领队":calc.childBedNoLeader.cost,
    "小孩不含床不含领队":calc.childNoBedNoLeader.cost,
    "小孩不含床含领队":calc.childNoBedNoLeader.cost
  } as Record<TravelerType,number>)[effectiveSelectedType];
  const selectedSummaryLabel=`${selectedTravelerLabel} · ${selectedIncludesLeader?t("Incl. Leader","含领队"):t("Excl. Leader","不含领队")}`;
  const finalQuote=calculationResult.finalQuote;
  const finalProfit=calculationResult.finalProfit;
  const finalMargin=calculationResult.finalMargin;

  useEffect(()=>{
    if(!hasLeader&&isLeaderType(selectedType)){
      setSelectedType(toNoLeaderType(selectedType));
      setManualQuote("");
    }
  },[hasLeader,selectedType]);

  const setTraveler = (id:string, patch:Partial<TravelerCostRow>) => setTravelerRows(rows => rows.map(r => r.id === id ? {...r,...patch}:r));
  const setScenarioRow=(id:string,patch:Partial<Omit<ScenarioCostRow,"values">>)=>setScenarioRows(rows=>rows.map(r=>r.id===id?{...r,...patch}:r));
  const setScenarioCell=(rowId:string,scenarioId:string,patch:Partial<ScenarioValue>)=>setScenarioRows(rows=>rows.map(r=>{
    if(r.id!==rowId) return r;
    const current=r.values[scenarioId]||{unitPrice:"",qty:1};
    const next:ScenarioValue={
      unitPrice:patch.unitPrice===undefined?current.unitPrice:patch.unitPrice,
      qty:patch.qty===undefined?current.qty:patch.qty
    };
    return {...r,values:{...r.values,[scenarioId]:next}};
  }));
  const addScenarioRow=()=>setScenarioRows(rows=>[...rows,{
    id:uid(),item:"",direction:"cost",mode:"每人",currency:"RM",note:"",
    values:Object.fromEntries(pricingScenarios.map(s=>[s.id,{unitPrice:"",qty:1}]))
  }]);
  const duplicateScenarioRow=(id:string)=>setScenarioRows(rows=>{
    const row=rows.find(r=>r.id===id);
    return row?[...rows,{...row,id:uid(),item:row.item?`${row.item} Copy`:"",values:Object.fromEntries(Object.entries(row.values).map(([k,v])=>[k,{...v}]))}]:rows;
  });
  const removeScenarioRow=(id:string)=>setScenarioRows(rows=>rows.length>1?rows.filter(r=>r.id!==id):rows);
  const setScenarioManual=(id:string,value:number|"")=>setPricingScenarios(items=>items.map(s=>s.id===id?{...s,manualFinalPrice:value}:s));
  const addPricingScenario=()=>{
    const raw=window.prompt(t("Enter pax for the new scenario","请输入新 Scenario 的人数"));
    if(!raw) return;
    const next=Math.max(1,Math.round(Number(raw)||0));
    if(!next||pricingScenarios.some(s=>s.pax===next)) return;
    const id=`pax-${next}-${uid()}`;
    setPricingScenarios(items=>[...items,{id,pax:next,manualFinalPrice:"" as const}].sort((a,b)=>a.pax-b.pax));
    setScenarioRows(rows=>rows.map(row=>({...row,values:{...row.values,[id]:{unitPrice:"",qty:1}}})));
  };
  const removePricingScenario=(id:string)=>{
    if(pricingScenarios.length<=1) return;
    setPricingScenarios(items=>items.filter(s=>s.id!==id));
    setScenarioRows(rows=>rows.map(row=>{const values={...row.values};delete values[id];return {...row,values};}));
  };
  const enableScenarioPricing=()=>{
    if(!scenarioRows.length) setScenarioRows(makeScenarioRowsFromTravelerRows(travelerRows,pricingScenarios));
    setPricingMode("scenario");
  };
  const addTraveler = () => setTravelerRows(rows => [...rows,{id:uid(),item:"",direction:"cost",mode:"每人",unitPrice:"",qty:1,currency:"RM",childRatioApplicable:false,note:""}]);
  const duplicateTraveler = (id:string) => setTravelerRows(rows => { const r=rows.find(x=>x.id===id); return r ? [...rows,{...r,id:uid(),item:r.item ? `${r.item} Copy` : ""}] : rows; });
  const removeTraveler = (id:string) => setTravelerRows(rows => rows.length > 1 ? rows.filter(r=>r.id!==id):rows);
  const setLeader = (id:string, patch:Partial<LeaderCostRow>) => setLeaderRows(rows => rows.map(r => r.id===id?{...r,...patch}:r));
  const addLeader = () => setLeaderRows(rows=>[...rows,{id:uid(),item:"",direction:"cost",mode:"每人",unitPrice:"",qty:1,currency:"RM",note:""}]);
  const duplicateLeader = (id:string) => setLeaderRows(rows=>{const row=rows.find(r=>r.id===id);return row?[...rows,{...row,id:uid(),item:row.item?row.item+" Copy":""}]:rows;});
  const removeLeader = (id:string) => setLeaderRows(rows=>rows.length>1?rows.filter(r=>r.id!==id):rows);

  const saveQuotation = async (): Promise<boolean> => {
    setSaving(true);
    setSaveMessage("");

    const quotationData = {tourType,op:op || currentStaffName,opStaffId:initialQuotation?.quotation_data?.opStaffId || initialQuotation?.owner_id || currentStaffId,supplier,pax,mainCurrency,mainRate,customerContact,departureCity,flightInformation,
      flightTotalPrice,flightPriceCurrency,flightTicketType:flightTicketType.code,
      itineraryDays:travelDuration.days,itineraryLabel:travelDuration.label,
      travelerRows,leaderRows,leaderOpen,singleRoomAmount,singleRoomCurrency,hasLeader,profitMode,profitRate,minProfit,maxProfit,fixedProfit,roundUnit,childBedMode,childBedManual,childBedCurrency,childNoBedMode,childNoBedManual,childNoBedCurrency,childBedSetup,childNoBedSetup,selectedType:effectiveSelectedType,manualQuote,calculationInput:{...calculationInput,selectedType:effectiveSelectedType},calculationResult,scenarioPricing:{version:1,mode:pricingMode,scenarios:pricingScenarios,rows:scenarioRows,results:scenarioResults},sourceInquiryId:resolvedSourceInquiryId,sourceInquiryNo:resolvedSourceInquiryNo,sourceInquirySnapshot:resolvedSourceInquirySnapshot};
    const payload = {
      source_inquiry_id: resolvedSourceInquiryId || "",
      title: quoteTitle || customerName || destination || "Untitled Quotation",
      destination: destination || "",
      departure_date: departureDate || "",
      return_date: returnDate || "",
      tour_type: tourType || "",
      customer_name: customerName || "",
      supplier: supplier || "",
      pax: pricingMode==="scenario" ? (primaryScenarioResult?.pax || pax) : pax,
      status,
      total_cost: pricingMode==="scenario" ? (primaryScenarioResult?.costPerPax || 0) : selected.cost,
      selling_price: pricingMode==="scenario" ? (primaryScenarioResult?.finalPrice || 0) : finalQuote,
      profit: pricingMode==="scenario" ? (primaryScenarioResult?.finalProfit || 0) : finalProfit,
      margin: pricingMode==="scenario" ? (primaryScenarioResult?.finalMargin || 0) : finalMargin,
      quotation_data: quotationData,
    };

    try {
      const res = await fetch("/api/internal-quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: quotationId || null, payload }),
      });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        if (res.status === 401) {
          setSaveMessage(t("Session expired. Please login again.","登录已过期，请重新登录。"));
          setTimeout(() => router.push("/login"), 700);
          setSaving(false);
          return false;
        } else {
          setSaveMessage(data?.error || t("Unable to save quotation.","无法保存报价。"));
          setSaving(false);
          return false;
        }
      } else {
        setSaveMessage(data?.review_required?t("Saved · Revision Required","已保存 · 需要修改"):t("Saved","已保存"));
        baselineRef.current = currentSnapshot;
        commercialBaselineRef.current = currentCommercialSnapshot;
        setIsDirty(false);
        if(data?.review_required) setStatus("revision_required");
        if (!quotationId && data.id) router.replace("/quotations/" + data.id);
        router.refresh();
      }
    } catch {
      setSaveMessage(t("Unable to save quotation. Please try again.","无法保存报价，请重试。"));
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  };

  const saveAndLeave = async () => {
    const href = pendingHref;
    if (!href) return;
    const ok = await saveQuotation();
    if (ok) {
      setPendingHref(null);
      window.location.href = href;
    }
  };


  const submitForReview = async () => {
    if(!quotationId) return;
    const ok=await saveQuotation();
    if(!ok) return;
    setSaving(true);
    setSaveMessage("");
    try{
      const res=await fetch("/api/internal-quotation-review",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:quotationId,action:"submit"})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){
        setSaveMessage(data?.error||t("Unable to submit for review.","无法提交审核。"));
        return;
      }
      setStatus("under_review");
      setSaveMessage(t("Submitted for management review","已提交管理层审核"));
      router.refresh();
    }finally{
      setSaving(false);
    }
  };

  const leaveWithoutSaving = () => {
    const href = pendingHref;
    if (!href) return;
    baselineRef.current = currentSnapshot;
    setIsDirty(false);
    setPendingHref(null);
    window.location.href = href;
  };

  const resetAll = () => {
    if (!confirm(t("Reset this quotation? Unsaved changes will be cleared.","确认重置当前报价？未保存的修改会被清空。"))) return;

    setQuoteTitle("");
    setDestination("");
    setDepartureDate("");
    setReturnDate("");
    setFlightInformation(emptyFlightInformation());
    setFlightTotalPrice("");
    setFlightPriceCurrency("RM");
    setCustomerName("");
    setCustomerContact("");
    setDepartureCity("");
    setStatus("draft");
    setTourType("");
    setOp(currentStaffName);
    setSupplier("");
    setPax(1);
    setMainCurrency("RMB");
    setMainRate(0.62);

    setTravelerRows([
      { id: uid(), item: "地接报价", direction:"cost", mode: "每人", unitPrice: "", qty: 1, currency: "RMB", childRatioApplicable: true, note: "" },
      { id: uid(), item: "小费", direction:"cost", mode: "每人每天", unitPrice: "", qty: 1, currency: "RM", childRatioApplicable: false, note: "" },
      { id: uid(), item: "旅游保险", direction:"cost", mode: "每人", unitPrice: "", qty: 1, currency: "RM", childRatioApplicable: false, note: "" },
      { id: uid(), item: "机场接送", direction:"cost", mode: "整团", unitPrice: "", qty: 1, currency: "RM", childRatioApplicable: false, note: "" }
    ]);

    setLeaderRows(defaultLeaderRows.map(row=>({...row,id:uid()})));
    setLeaderOpen(false);
    setSingleRoomAmount("");
    setSingleRoomCurrency("RM");

    setProfitMode("按成本加价率");
    setProfitRate(0.15);
    setMinProfit("");
    setMaxProfit("");
    setFixedProfit("");
    setRoundUnit(50);

    setChildBedMode("手动成本");
    setChildBedManual(0);
    setChildBedCurrency("RM");
    setChildNoBedMode("手动成本");
    setChildNoBedManual(0);
    setChildNoBedCurrency("RM");
    setChildBedSetup(createDefaultChildSetup());
    setChildNoBedSetup(createDefaultChildSetup());

    setSelectedType("成人不含领队");
    setManualQuote("");
    setSaveMessage("");

  };

  const pricingRows:{type:TravelerType;label:string;mode:string;value:typeof calc.adultNoLeader}[]=[
    {type:"成人不含领队",label:t("Adult · Twin Sharing","成人（双人一房）"),mode:t("Excl. Leader","不含领队"),value:calc.adultNoLeader},
    ...(hasLeader?[{type:"成人含领队" as TravelerType,label:t("Adult · Twin Sharing","成人（双人一房）"),mode:t("Incl. Leader","含领队"),value:calc.adultLeader}]:[]),
    {type:"小孩含床不含领队",label:t("Child with Bed","小孩加床"),mode:t("Excl. Leader","不含领队"),value:calc.childBedNoLeader},
    ...(hasLeader?[{type:"小孩含床含领队" as TravelerType,label:t("Child with Bed","小孩加床"),mode:t("Incl. Leader","含领队"),value:calc.childBedLeader}]:[]),
    {type:"小孩不含床不含领队",label:t("Child without Bed","小孩不加床"),mode:t("Excl. Leader","不含领队"),value:calc.childNoBedNoLeader},
    ...(hasLeader?[{type:"小孩不含床含领队" as TravelerType,label:t("Child without Bed","小孩不加床"),mode:t("Incl. Leader","含领队"),value:calc.childNoBedLeader}]:[])
  ];

  const printFlights=[
    {label:t("Departure","去程"),...flightInformation.outbound},
    ...(flightInformation.outboundTransitOpen?[{label:t("Departure Transit","去程中转"),...flightInformation.outboundTransit}]:[]),
    {label:t("Return","返程"),...flightInformation.returning},
    ...(flightInformation.returnTransitOpen?[{label:t("Return Transit","返程中转"),...flightInformation.returnTransit}]:[])
  ].filter(leg=>leg.fromAirport||leg.toAirport||leg.flightNo||leg.flightDate||leg.departureTime||leg.arrivalTime);

  const printStatus=displayStatus==="under_review"?t("Under Review","审核中")
    :displayStatus==="revision_required"?t("Revision Required","需要修改")
    :displayStatus==="ready"?t("Ready","已就绪")
    :displayStatus==="sent"?t("Sent","已发送")
    :displayStatus==="revised"?t("Revised","已修改")
    :displayStatus==="confirmed"?t("Confirmed","已确认")
    :displayStatus==="lost"?t("Lost","未成交")
    :displayStatus==="archived"?t("Archived","已归档")
    :t("Draft","草稿");

  const printTravelerRows=travelerRows.map(row=>{
    const perPax=travelerRowPerPax(row,Math.max(1,Number(pax)||1),mainCurrency,mainRate);
    const rate=currencyRate(row.currency,mainCurrency,mainRate);
    return {...row,perPax,rate};
  });
  const printLeaderRows=leaderRows.map(row=>{
    const total=leaderRowTotal(row,mainCurrency,mainRate);
    const perPax=leaderRowPerPax(row,Math.max(1,Number(pax)||1),mainCurrency,mainRate);
    const rate=currencyRate(row.currency,mainCurrency,mainRate);
    return {...row,total,perPax,rate};
  }).filter(row=>(Number(row.unitPrice)||0)!==0||(Number(row.qty)||0)!==0);
  const printChildBed=childSetupCost(childBedSetup,Math.max(1,Number(pax)||1),mainCurrency,mainRate);
  const printChildNoBed=childSetupCost(childNoBedSetup,Math.max(1,Number(pax)||1),mainCurrency,mainRate);

  const printTotalPages=pricingMode==="scenario"&&scenarioResults.length>0?5:4;
  const sanitizePrintFilePart=(value:unknown)=>String(value??"")
    .replace(/[\\/:*?"<>|]+/g," ")
    .replace(/\s+/g," ")
    .trim();

  const printCustomerName=resolvedSourceInquirySnapshot?.customerName||customerName||"";
  const printDestination=resolvedSourceInquirySnapshot?.destination||destination||"";
  const printTravelStartDate=resolvedSourceInquirySnapshot?.travelStartDate||departureDate||"";
  const printQuotationNo=initialQuotation?.quotation_no||t("New Quotation","新报价");
  const printFileBaseName=[
    printQuotationNo,
    printCustomerName,
    printDestination,
    printTravelStartDate
  ].map(sanitizePrintFilePart).filter(Boolean).join(" - ");

  const handlePrintPdf=()=>{
    const previousTitle=document.title;
    document.title=printFileBaseName||"Happy Express Quotation";
    const restoreTitle=()=>{
      document.title=previousTitle;
      window.removeEventListener("afterprint",restoreTitle);
    };
    window.addEventListener("afterprint",restoreTitle);
    window.print();
  };

  return <main className={"app-shell "+(workspaceMode?"quotation-editor-shell":"")}>
    <div className="quotation-print-document" aria-hidden="true">
      <section className="print-page">
        <div className="print-doc-header">
          <div>
            <span className="print-brand">HAPPY EXPRESS TRAVEL</span>
            <h1>{t("Internal Quotation Calculation","内部报价计算单")}</h1>
            <p>{quoteTitle||destination||t("Outbound Quotation","出境游报价")}</p>
          </div>
          <div className="print-doc-meta">
            <div><span>{t("Quotation No.","报价编号")}</span><strong>{initialQuotation?.quotation_no||t("New Draft","新草稿")}</strong></div>
            <div><span>{t("Status","状态")}</span><strong>{printStatus}</strong></div>
            <div><span>{t("Prepared By","制表人")}</span><strong>{op||currentStaffName||"—"}</strong></div>
          </div>
        </div>

        <PrintSectionNo no="01" title={terms.customerTrip}>
          <div className="print-info-grid">
            <PrintInfo label={t("Customer / Company","客户 / 公司")} value={resolvedSourceInquirySnapshot?.customerName||customerName||"—"}/>
            <PrintInfo label={t("Destination","目的地")} value={resolvedSourceInquirySnapshot?.destination||destination||"—"}/>
            <PrintInfo label={t("Tour Type","团型")} value={resolvedSourceInquirySnapshot?.tourType||tourType||"—"}/>
            <PrintInfo label={t("Pax","人数")} value={String(resolvedSourceInquirySnapshot?.pax||pax||"—")}/>
            <PrintInfo label={t("Departure City","出发城市")} value={resolvedSourceInquirySnapshot?.departureCity||departureCity||"—"}/>
            <PrintInfo label={t("Travel Dates","旅游日期")} value={[resolvedSourceInquirySnapshot?.travelStartDate||departureDate,resolvedSourceInquirySnapshot?.travelEndDate||returnDate].filter(Boolean).map(formatDisplayDate).join(" → ")||"—"}/>
            <PrintInfo label={t("Duration","行程天数")} value={travelDuration.label||"—"}/>
            <PrintInfo label={t("Supplier","供应商")} value={supplier||"—"}/>
          </div>
        </PrintSectionNo>

        <PrintSectionNo no="02" title={terms.flightInformation}>
          {printFlights.length?<div className="print-table print-flight-table">
            <div className="print-tr print-th"><span>{t("Sector","航段")}</span><span>{t("Flight","航班")}</span><span>{t("Date","日期")}</span><span>{t("Departure","起飞")}</span><span>{t("Arrival","抵达")}</span></div>
            {printFlights.map((leg,index)=><div className="print-tr" key={index}>
              <span><small>{leg.label}</small><strong>{[leg.fromAirport,leg.toAirport].filter(Boolean).join(" → ")||"—"}</strong></span>
              <span>{leg.flightNo||"—"}</span><span>{formatDisplayDate(leg.flightDate)||leg.flightDate||"—"}</span>
              <span>{leg.departureTime||"—"}</span><span>{leg.arrivalTime||"—"}{leg.nextDay?" +1":""}</span>
            </div>)}
          </div>:<div className="print-empty">{t("No flight information entered.","尚未填写航班资料。")}</div>}
          <div className="print-inline-note">
            <span>{t("Flight Total Price","航班总报价")}</span><strong>{flightTotalPrice===""?"—":money(Number(flightTotalPrice)*currencyRate(flightPriceCurrency,mainCurrency,mainRate))}</strong>
            <span>{t("Ticket Type","机票类型")}</span><strong>{flightTicketType.code||"—"}</strong>
          </div>
        </PrintSectionNo>

        <PrintSectionNo no="03" title={terms.commercialSettings}>
          <div className="print-info-grid rules">
            <PrintInfo label={t("Main Currency","主要币种")} value={currencyLabel(mainCurrency)}/>
            <PrintInfo label={t("Exchange Rate → RM","汇率 → RM")} value={String(mainRate||"—")}/>
            <PrintInfo label={t("Profit Method","利润方式")} value={profitModeLabel(profitMode)}/>
            <PrintInfo label={t("Profit Rate","利润率")} value={pct(Number(profitRate)||0)}/>
            <PrintInfo label={t("Minimum Profit / Pax","最低毛利 / 人")} value={minProfit===""?"—":money(Number(minProfit))}/>
            <PrintInfo label={t("Maximum Profit / Pax","最高毛利 / 人")} value={maxProfit===""?"—":money(Number(maxProfit))}/>
            <PrintInfo label={t("Fixed Profit / Pax","固定利润 / 人")} value={fixedProfit===""?"—":money(Number(fixedProfit))}/>
            <PrintInfo label={t("Quote Rounding","报价取整")} value={t(`Round up to RM ${roundUnit}`,`向上取整至 RM ${roundUnit}`)}/>
          </div>
        </PrintSectionNo>
        <PrintFooter quotationNo={initialQuotation?.quotation_no||"Draft"} page="1" total={printTotalPages}/>
      </section>

      <section className="print-page">
        <div className="print-doc-header compact">
          <div><span className="print-brand">HAPPY EXPRESS TRAVEL</span><h1>{terms.quotationPricing}</h1></div>
          <div className="print-doc-meta">
            <div><span>{t("Quotation No.","报价编号")}</span><strong>{initialQuotation?.quotation_no||t("New Draft","新草稿")}</strong></div>
            <div><span>{terms.pricingStructure}</span><strong>{pricingMode==="scenario"?t("Scenario Package","多人数组合"):t("Fixed Pax","固定人数")}</strong></div>
          </div>
        </div>

        <PrintSectionNo no="04" title={terms.systemPricingMatrix}>
          <div className="print-table print-pricing-table">
            <div className="print-tr print-th"><span>{terms.travellerType}</span><span>{t("Leader","领队")}</span><span>{terms.costPerPax}</span><span>{terms.systemSuggested}</span><span>{terms.finalPrice}</span><span>{terms.profit}</span><span>{terms.margin}</span></div>
            {pricingRows.map(row=>{
              const active=row.type===effectiveSelectedType;
              const final=row.value.final;
              const profit=final-row.value.cost;
              return <div className={"print-tr "+(active?"print-selected":"")} key={row.type}>
                <span><strong>{row.label}</strong>{active&&manualQuote!==""?<small>{t("Manual Override","人工调整")}</small>:null}</span>
                <span>{row.mode}</span><span>{money(row.value.cost)}</span><span>{money(row.value.rounded)}</span>
                <span><strong>{money(final)}</strong></span><span>{money(profit)}</span><span>{pct(row.value.margin)}</span>
              </div>
            })}
          </div>
        </PrintSectionNo>

        <PrintSectionNo no="05" title={t("Final Pricing Decision","最终定价决定")}>
          <div className="print-final-decision">
            <div><span>{terms.travellerType}</span><strong>{selectedSummaryLabel}</strong></div>
            <div><span>{terms.costPerPax}</span><strong>{money(selected.cost)}</strong></div>
            <div><span>{terms.systemSuggested}</span><strong>{money(selected.rounded)}</strong></div>
            <div className="primary"><span>{terms.finalCustomerPrice}</span><strong>{money(finalQuote)}</strong><small>{manualQuote!==""?t("Manual Override","人工调整"):t("System Price","系统价格")}</small></div>
            <div><span>{t("Final Profit","最终利润")}</span><strong>{money(finalProfit)}</strong></div>
            <div><span>{t("Final Margin","最终毛利率")}</span><strong>{pct(finalMargin)}</strong></div>
          </div>
        </PrintSectionNo>
        <PrintFooter quotationNo={initialQuotation?.quotation_no||"Draft"} page="2" total={printTotalPages}/>
      </section>

      <section className="print-page">
        <div className="print-doc-header compact">
          <div><span className="print-brand">HAPPY EXPRESS TRAVEL</span><h1>{t("Cost Calculation Detail","成本计算明细")}</h1></div>
          <div className="print-doc-meta"><div><span>{t("Quotation No.","报价编号")}</span><strong>{initialQuotation?.quotation_no||t("New Draft","新草稿")}</strong></div></div>
        </div>

        <PrintSectionNo no="06" title={terms.costBreakdown}>
          <div className="print-table print-cost-table">
            <div className="print-tr print-th"><span>{terms.costItem}</span><span>{t("Type","类型")}</span><span>{terms.calculation}</span><span>{terms.unitPrice}</span><span>{t("Qty / Days","数量 / 天数")}</span><span>{terms.currency}</span><span>{terms.rate}</span><span>{terms.costPerPax}</span></div>
            {printTravelerRows.map(row=><div className="print-tr" key={row.id}>
              <span><strong>{costItemDisplay(row.item)||"—"}</strong>{row.note?<small>{row.note}</small>:null}</span>
              <span>{row.direction==="deduction"?t("Deduction −","扣减 −"):t("Cost +","成本 +")}</span>
              <span>{calcModeLabel(row.mode)}</span><span>{Number(row.unitPrice)||0}</span><span>{Number(row.qty)||0}</span>
              <span>{currencyLabel(row.currency)}</span><span>{row.rate||"—"}</span><span><strong>{money(row.perPax)}</strong></span>
            </div>)}
          </div>
          <div className="print-total-line"><span>{t("Traveller Base Cost / Pax","旅客基础成本 / 人")}</span><strong>{money(calculationResult.travelerPerPax)}</strong></div>
        </PrintSectionNo>

        <PrintSectionNo no="07" title={terms.tourLeaderCostSetup}>
          {hasLeader&&printLeaderRows.length?<><div className="print-table print-leader-table">
            <div className="print-tr print-th"><span>{terms.costItem}</span><span>{terms.calculation}</span><span>{terms.unitPrice}</span><span>{t("Qty / Days","数量 / 天数")}</span><span>{terms.currency}</span><span>{t("Total","总额")}</span><span>{t("Allocated / Pax","每人分摊")}</span></div>
            {printLeaderRows.map(row=><div className="print-tr" key={row.id}>
              <span><strong>{costItemDisplay(row.item)||"—"}</strong>{row.note?<small>{row.note}</small>:null}</span>
              <span>{calcModeLabel(row.mode||"每人")}</span><span>{Number(row.unitPrice)||0}</span><span>{Number(row.qty)||0}</span><span>{currencyLabel(row.currency)}</span>
              <span>{money(row.total)}</span><span><strong>{money(row.perPax)}</strong></span>
            </div>)}
          </div><div className="print-total-line split"><span>{t("Total Leader Cost","领队总成本")} <strong>{money(calculationResult.leaderTotal)}</strong></span><span>{t("Allocated / Pax","每人分摊")} <strong>{money(calculationResult.leaderPerPax)}</strong></span></div></>
          :<div className="print-empty">{t("No leader cost applied.","没有应用领队成本。")}</div>}
        </PrintSectionNo>
        <PrintFooter quotationNo={initialQuotation?.quotation_no||"Draft"} page="3" total={printTotalPages}/>
      </section>

      <section className="print-page">
        <div className="print-doc-header compact">
          <div><span className="print-brand">HAPPY EXPRESS TRAVEL</span><h1>{terms.childCostSetup}</h1></div>
          <div className="print-doc-meta"><div><span>{t("Quotation No.","报价编号")}</span><strong>{initialQuotation?.quotation_no||t("New Draft","新草稿")}</strong></div></div>
        </div>

        <PrintSectionNo no="08" title={terms.childCostSetup}>
          <div className="print-child-detail-stack">
            {[
              {title:t("Child with Bed","小孩含床"),setup:childBedSetup,summary:printChildBed},
              {title:t("Child without Bed","小孩不含床"),setup:childNoBedSetup,summary:printChildNoBed}
            ].map((child,index)=>{
              const groundRate=currencyRate(child.setup.groundCurrency,mainCurrency,mainRate);
              const groundBaseRm=(Number(child.setup.groundBase)||0)*groundRate;
              const groundPerPax=child.summary.ground;
              const childRows=(child.setup.otherRows||[]).map(row=>({
                ...row,
                rate:currencyRate(row.currency,mainCurrency,mainRate),
                perPax:childExtraRowPerPax(row,Math.max(1,Number(pax)||1),mainCurrency,mainRate)
              }));
              return <div className="print-child-detail" key={index}>
                <div className="print-child-detail-head">
                  <div><span>{child.title}</span><small>{t("Detailed cost breakdown","成本明细")}</small></div>
                  <strong>{money(child.summary.total)}</strong>
                </div>
                <div className="print-table print-child-cost-table">
                  <div className="print-tr print-th">
                    <span>{terms.costItem}</span><span>{t("Type","类型")}</span><span>{terms.calculation}</span><span>{terms.unitPrice}</span>
                    <span>{t("Qty / Ratio","数量 / 比例")}</span><span>{terms.currency}</span><span>{terms.rate}</span><span>{terms.costPerPax}</span>
                  </div>
                  <div className="print-tr">
                    <span><strong>{t("Ground Package","地接报价")}</strong></span>
                    <span>{child.setup.groundDirection==="deduction"?t("Deduction −","扣减 −"):t("Cost +","成本 +")}</span>
                    <span>{t("Child Ratio","儿童比例")}</span>
                    <span>{Number(child.setup.groundBase)||0}<small>{t("Base after FX","汇率后基础值")} {money(groundBaseRm)}</small></span>
                    <span>{child.setup.groundRatio}%</span><span>{currencyLabel(child.setup.groundCurrency)}</span><span>{groundRate||"—"}</span>
                    <span><strong>{money(groundPerPax)}</strong></span>
                  </div>
                  {childRows.map(row=><div className="print-tr" key={row.id}>
                    <span><strong>{costItemDisplay(row.item)||"—"}</strong>{row.note?<small>{row.note}</small>:null}</span>
                    <span>{row.direction==="deduction"?t("Deduction −","扣减 −"):t("Cost +","成本 +")}</span>
                    <span>{calcModeLabel(row.mode||"每人")}</span><span>{Number(row.unitPrice)||0}</span><span>{Number(row.qty)||0}</span>
                    <span>{currencyLabel(row.currency)}</span><span>{row.rate||"—"}</span><span><strong>{money(row.perPax)}</strong></span>
                  </div>)}
                </div>
                <div className="print-child-totals">
                  <span>{t("Ground","地接")} <strong>{money(child.summary.ground)}</strong></span>
                  <span>{t("Other Items","其他项目")} <strong>{money(child.summary.extras)}</strong></span>
                  <span>{t("Child Cost / Pax","儿童成本 / 人")} <strong>{money(child.summary.total)}</strong></span>
                </div>
              </div>
            })}
          </div>
        </PrintSectionNo>
        <PrintFooter quotationNo={initialQuotation?.quotation_no||"Draft"} page="4" total={printTotalPages}/>
      </section>

      {pricingMode==="scenario"&&scenarioResults.length>0&&<section className="print-page">
        <div className="print-doc-header compact">
          <div><span className="print-brand">HAPPY EXPRESS TRAVEL</span><h1>{t("Pax Scenario Comparison","人数情境比较")}</h1></div>
          <div className="print-doc-meta"><div><span>{t("Quotation No.","报价编号")}</span><strong>{initialQuotation?.quotation_no||t("New Draft","新草稿")}</strong></div></div>
        </div>
        <PrintSectionNo no="09" title={t("Pax Scenario Comparison","人数情境比较")}>
          <div className="print-table print-scenario-table">
            <div className="print-tr print-th"><span>{t("Pax","人数")}</span><span>{terms.costPerPax}</span><span>{terms.systemSuggested}</span><span>{terms.finalPrice}</span><span>{terms.profit}</span><span>{terms.margin}</span></div>
            {scenarioResults.map(row=><div className="print-tr" key={row.id}><span>{row.pax}</span><span>{money(row.costPerPax)}</span><span>{money(row.roundedPrice)}</span><span><strong>{money(row.finalPrice)}</strong></span><span>{money(row.finalProfit)}</span><span>{pct(row.finalMargin)}</span></div>)}
          </div>
        </PrintSectionNo>
        <PrintFooter quotationNo={initialQuotation?.quotation_no||"Draft"} page="5" total={printTotalPages}/>
      </section>}
    </div>

    <header className={"topbar "+(workspaceMode?"quotation-editor-header":"")}>
      <div className="quotation-editor-title-block">
        {!workspaceMode&&<div className="eyebrow">HAPPY EXPRESS TRAVEL</div>}
        <h1>{t("Outbound Quotation","出境游报价")}</h1>
        {workspaceMode
          ?<div className="quotation-editor-meta-line">
              <span>{initialQuotation?.quotation_no||t("New Draft","新草稿")}</span>
              <span className={"status quotation-editor-status status-"+displayStatus}>
                {displayStatus==="under_review"?t("Under Review","审核中"):displayStatus==="revision_required"?t("Revision Required","需要修改"):displayStatus==="ready"?t("Ready","已就绪"):displayStatus==="sent"?t("Sent","已发送"):displayStatus==="revised"?t("Revised","已修改"):displayStatus==="confirmed"?t("Confirmed","已确认"):displayStatus==="lost"?t("Lost","未成交"):displayStatus==="archived"?t("Archived","已归档"):t("Draft","草稿")}
              </span>
            </div>
          :<p>{t("Outbound Tour Quotation Calculator","出境游报价计算器")}</p>}
      </div>
      <div className="top-actions quote-top-actions no-print">
        {workspaceMode&&<button className="btn quotation-editor-back" type="button" onClick={()=>{const href=quotationId?"/quotations/"+quotationId:"/quotations";if(isDirty)setPendingHref(href);else router.push(href);}}>{t("‹ Back","‹ 返回")}</button>}
        <button className="btn ghost quote-action-secondary" type="button" onClick={handlePrintPdf}>{t("Print / PDF","打印 / PDF")}</button>
        {workspaceMode
          ?<div className="quotation-header-more">
              <button className="btn quotation-header-more-trigger" type="button" aria-expanded={showHeaderMore} aria-label={t("More actions","更多操作")} onClick={()=>setShowHeaderMore(v=>!v)}>•••</button>
              {showHeaderMore&&<div className="quotation-header-more-menu">
                <button type="button" className="quotation-header-reset" onClick={()=>{setShowHeaderMore(false);resetAll();}}>{t("Reset Quotation","重置报价")}</button>
              </div>}
            </div>
          :<button className="btn danger quote-action-danger" onClick={resetAll}>{t("Reset","重置")}</button>}
      </div>
    </header>

    {workspaceMode&&resolvedSourceInquiryId&&<section className="quote-source-inquiry">
      <div>
        <span>{t("SOURCE INQUIRY","来源询价")}</span>
        <strong>{resolvedSourceInquiryNo||t("Linked Inquiry","关联询价")}</strong>
        {resolvedSourceInquirySnapshot&&<small>{[resolvedSourceInquirySnapshot.destination,resolvedSourceInquirySnapshot.daysCount?`${resolvedSourceInquirySnapshot.daysCount} Days`:"",resolvedSourceInquirySnapshot.pax?`${resolvedSourceInquirySnapshot.pax} Pax`:""].filter(Boolean).join(" · ")}</small>}
      </div>
      <button className="btn" type="button" onClick={()=>{const href="/inquiries/"+resolvedSourceInquiryId;if(isDirty)setPendingHref(href);else router.push(href);}}>{t("Open Inquiry","打开询价")}</button>
    </section>}

    <section className="summary-grid">
      <Summary label={`${t("Traveller Cost","旅客成本")} / ${selectedTravelerLabel}`} value={money(selectedTravelerCost)} />
      <Summary label={`${t("Tour Leader Allocation","领队分摊")} / ${selectedTravelerLabel}`} value={selectedIncludesLeader ? money(calc.leaderPerPax) : "—"} />
      <Summary label={`${t("System Suggested Price","系统建议售价")} / ${selectedSummaryLabel}`} value={money(selected.suggested)} />
      <Summary label={`${t("Final Quote","最终报价")} / ${selectedSummaryLabel}`} value={money(finalQuote)} strong />
    </section>

    {workspaceMode && <section className="quote-meta-panel quotation-information-stack">
      <div className="quotation-context-section">
      <div className="quotation-identity-block">
        <div className="quotation-identity-head"><h2>{t("Quotation Title","报价标题")}</h2></div>
        <input className="quotation-title-input" value={quoteTitle} onChange={e=>setQuoteTitle(e.target.value)} placeholder={t("Create a quotation title","请输入报价标题")} />
      </div>

      <div className="quotation-trip-context">
        <div className="quotation-trip-context-head">
          <div>
            <h2>{terms.customerTrip}</h2>
          </div>
          <span className={"quotation-source-mode "+(resolvedSourceInquiryId?"linked":"direct")}>
            {resolvedSourceInquiryId?t("Linked Inquiry","来自 Inquiry"):t("Direct Quotation","直接报价")}
          </span>
        </div>

        {resolvedSourceInquiryId
          ?<div className="quotation-trip-readonly-grid">
              <div><span>{t("Customer / Company","客户 / 公司")}</span><strong>{resolvedSourceInquirySnapshot?.customerName||customerName||"—"}</strong></div>
              <div><span>{t("Contact","联系方式")}</span><strong>{resolvedSourceInquirySnapshot?.contact||customerContact||"—"}</strong></div>
              <div><span>{t("Departure City","出发城市")}</span><strong>{resolvedSourceInquirySnapshot?.departureCity||departureCity||"—"}</strong></div>
              <div><span>{t("Destination","目的地")}</span><strong>{resolvedSourceInquirySnapshot?.destination||destination||"—"}</strong></div>
              <div><span>{t("Travel Dates","旅游日期")}</span><strong>{[resolvedSourceInquirySnapshot?.travelStartDate||departureDate,resolvedSourceInquirySnapshot?.travelEndDate||returnDate].filter(Boolean).map(formatDisplayDate).join(" → ")||"—"}</strong></div>
              <div><span>{t("Pax","人数")}</span><strong>{resolvedSourceInquirySnapshot?.pax||pax||"—"}</strong></div>
              <div><span>{t("Tour Type","团型")}</span><strong>{resolvedSourceInquirySnapshot?.tourType||tourType||"—"}</strong></div>
            </div>
          :<div className="quote-meta-grid quotation-direct-trip-grid">
              <Field label={t("Customer / Company","客户 / 公司")}><input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder={t("Optional for product quotation","产品报价可留空")} /></Field>
              <Field label={t("Contact","联系方式")}><input value={customerContact} onChange={e=>setCustomerContact(e.target.value)} placeholder={t("Optional","可留空")} /></Field>
              <Field label={t("Departure City","出发城市")}><input value={departureCity} onChange={e=>setDepartureCity(e.target.value)} placeholder={t("Optional","可留空")} /></Field>
              <Field label={t("Destination","目的地")}><input value={destination} onChange={e=>setDestination(e.target.value)} placeholder="China / Japan / Thailand" /></Field>
              <Field label={t("Travel Start Date","出发日期")}><input type="date" value={departureDate} onChange={e=>setDepartureDate(e.target.value)} /></Field>
              <Field label={t("Travel End Date","返程日期")}><input type="date" value={returnDate} onChange={e=>setReturnDate(e.target.value)} /></Field>
              <Field label={t("Pax","人数")}><input type="number" min="1" value={pax} onChange={e=>setPax(Number(e.target.value)||1)} /></Field>
              <Field label={t("Tour Type","团型")}><input value={tourType} onChange={e=>setTourType(e.target.value)} placeholder={t("Private / Corporate / Series","私人团 / 企业团 / 系列产品")} /></Field>
            </div>}
      </div>
      </div>

      <div className="flight-section-surface quotation-flight-section">
        <FlightInformation
          value={flightInformation}
          onChange={setFlightInformation}
          durationDays={travelDuration.days}
          footer={
            <div className="flight-total-price-row">
              <Field label={t("Flight Total Price","航班总报价")}>
                <input type="number" min="0" value={flightTotalPrice} onChange={e=>setFlightTotalPrice(e.target.value===""?"":Number(e.target.value))} placeholder="0.00" />
              </Field>
              <Field label={terms.currency}>
                <select value={flightPriceCurrency} onChange={e=>setFlightPriceCurrency(e.target.value as Currency)}>{currencies.map(cur=><option key={cur} value={cur}>{currencyLabel(cur)}</option>)}</select>
              </Field>
              <div className="field">
                <span>{t("Ticket Type","机票类型")}</span>
                <div className={"ticket-type-auto "+flightTicketType.state}>
                  <strong>{flightTicketType.label}</strong>
                </div>
              </div>
            </div>
          }
        />
      </div>

      {saveMessage && <div className="save-message">{saveMessage}</div>}
    </section>}

    <Section title={terms.commercialSettings}>
      <div className="form-grid six quotation-commercial-core">
        <Field label={t("Supplier","供应商")}><input value={supplier} onChange={e=>setSupplier(e.target.value)} /></Field>
        <Field label={t("Main Currency","主要币种")}><select value={mainCurrency} onChange={e=>setMainCurrency(e.target.value as Currency)}>{currencies.map(c=><option key={c} value={c}>{c==="其他"?t("Other","其他"):c}</option>)}</select></Field>
        <Field label={t("Exchange Rate → RM","汇率 → RM")}><input type="number" step="0.0001" value={mainRate} onChange={e=>setMainRate(Number(e.target.value)||0)} /></Field>
        <Field label={t("Profit Method","利润方式")}><select value={profitMode} onChange={e=>setProfitMode(e.target.value as ProfitMode)}>{profitModes.map(x=><option key={x} value={x}>{profitModeLabel(x)}</option>)}</select></Field>
        <Field label={t("Profit Rate","利润率")}><input type="number" step="0.01" value={profitRate} onChange={e=>setProfitRate(Number(e.target.value)||0)} /></Field>
      </div>
      <details className="quotation-advanced-profit">
        <summary>{t("Advanced Profit Settings","高级利润设置")}</summary>
        <div className="form-grid four">
          <Field label={t("Minimum Profit / Pax","最低毛利 / 人")}><input type="number" value={minProfit} onChange={e=>setMinProfit(e.target.value===""?"":Number(e.target.value))} placeholder={t("Optional","可留空")} /></Field>
          <Field label={t("Maximum Profit / Pax","最高毛利 / 人")}><input type="number" value={maxProfit} onChange={e=>setMaxProfit(e.target.value===""?"":Number(e.target.value))} placeholder={t("Optional","可留空")} /></Field>
          <Field label={t("Fixed Profit / Pax","固定利润 / 人")}><input type="number" value={fixedProfit} onChange={e=>setFixedProfit(e.target.value===""?"":Number(e.target.value))} placeholder={t("Fixed amount mode","固定金额模式")} /></Field>
          <Field label={t("Quote Rounding","报价取整")}><input type="number" min="1" value={roundUnit} onChange={e=>setRoundUnit(Number(e.target.value)||1)} /></Field>
        </div>
      </details>
    </Section>

    <section className="section quotation-pricing-mode-section">
      <div className="section-head scenario-pricing-mode-head">
        <div>
          <h2>{terms.pricingStructure}</h2>
        </div>
        <div className="scenario-mode-switch no-print">
          <button type="button" className={pricingMode==="single"?"active":""} onClick={()=>setPricingMode("single")}>
            {t("Fixed Pax","固定人数")}
          </button>
          <button type="button" className={pricingMode==="scenario"?"active":""} onClick={enableScenarioPricing}>
            {t("Scenario Package","多人数组合")}
          </button>
        </div>
      </div>
      <p className="scenario-mode-note">
        {pricingMode==="single"
          ? t("Use the Inquiry pax as one pricing scenario.","根据 Inquiry 的固定人数计算单一报价。")
          : t("Compare and calculate multiple pax scenarios side by side.","同屏比较并计算不同人数的配套价格。")}
      </p>
    </section>

    {pricingMode==="single" ? <>
    <Section title={terms.costBreakdown} action={<button className="btn no-print" onClick={addTraveler}>{t("+ Add Cost Row","+ 新增成本项目")}</button>}>
      <div className="traveller-cost-table">
        <div className="traveller-cost-table-head" aria-hidden="true">
          <span>{terms.costItem}</span>
          <span>{t("Type","类型")}</span>
          <span>{terms.calculation}</span>
          <span>{terms.unitPrice}</span>
          <span>{t("Qty / Days","数量 / 天数")}</span>
          <span>{terms.currency}</span>
          <span>{terms.costPerPax}</span>
          <span></span>
        </div>

        <div className="traveller-cost-table-body">
          {travelerRows.map(r=>{
            const rate=currencyRate(r.currency,mainCurrency,mainRate);
            const total=travelerRowTotal(r,pax,mainCurrency,mainRate);
            const pp=travelerRowPerPax(r,pax,mainCurrency,mainRate);
            return <div className="traveller-cost-row" key={r.id}>
              <div className="traveller-cost-row-main">
                <div className="traveller-cost-cell item">
                  <input aria-label={terms.costItem} value={costItemDisplay(r.item)} onChange={e=>setTraveler(r.id,{item:e.target.value})}/>
                  {r.note&&<small className="traveller-cost-note-preview">↳ {r.note}</small>}
                </div>

                <div className="traveller-cost-cell">
                  <select aria-label={t("Type","类型")} value={r.direction||"cost"} onChange={e=>setTraveler(r.id,{direction:e.target.value as "cost"|"deduction"})}>
                    <option value="cost">{t("Cost +","成本 +")}</option>
                    <option value="deduction">{t("Deduction −","扣减 −")}</option>
                  </select>
                </div>

                <div className="traveller-cost-cell">
                  <select aria-label={terms.calculation} value={r.mode} onChange={e=>setTraveler(r.id,{mode:e.target.value as CalcMode})}>{calcModes.map(x=><option key={x} value={x}>{calcModeLabel(x)}</option>)}</select>
                </div>

                <div className="traveller-cost-cell">
                  <input aria-label={terms.unitPrice} type="number" min="0" value={r.unitPrice} onChange={e=>setTraveler(r.id,{unitPrice:e.target.value===""?"":Math.max(0,Number(e.target.value))})}/>
                </div>

                <div className="traveller-cost-cell">
                  <input aria-label={t("Qty / Days","数量 / 天数")} type="number" value={r.qty} onChange={e=>setTraveler(r.id,{qty:e.target.value===""?"":Number(e.target.value)})}/>
                </div>

                <div className="traveller-cost-cell traveller-cost-currency">
                  <select aria-label={terms.currency} value={r.currency} onChange={e=>setTraveler(r.id,{currency:e.target.value as Currency})}>{currencies.map(c=><option key={c} value={c}>{currencyLabel(c)}</option>)}</select>
                  <small>{terms.rate} {rate || "—"}</small>
                </div>

                <div className={"traveller-cost-result "+(pp<0?"deduction-value":"")}>
                  <strong>{money(pp)}</strong>
                  <small>{t("Total","总计")} {money(total)}</small>
                </div>

                <details className="traveller-cost-more no-print">
                  <summary aria-label={t("More actions","更多操作")}>•••</summary>
                  <div className="traveller-cost-more-menu">
                    <label>
                      <span>{t("Remarks","备注")}</span>
                      <input value={r.note} onChange={e=>setTraveler(r.id,{note:e.target.value})} placeholder={t("Add remark","添加备注")}/>
                    </label>
                    <button type="button" onClick={()=>duplicateTraveler(r.id)}>{t("Duplicate","复制")}</button>
                    <button type="button" className="danger-link" onClick={()=>removeTraveler(r.id)}>{t("Delete","删除")}</button>
                  </div>
                </details>
              </div>
            </div>
          })}
        </div>
      </div>
    </Section>
    </> : <Section
      title={t("Scenario Cost Matrix","人数成本矩阵")}
      action={<div className="scenario-section-actions no-print">
        <button className="btn" type="button" onClick={addPricingScenario}>{t("+ Add Pax","+ 新增人数")}</button>
        <button className="btn" type="button" onClick={addScenarioRow}>{t("+ Add Cost Row","+ 新增成本项目")}</button>
      </div>}
    >
      <div className="scenario-matrix-wrap">
        <div className={"scenario-cost-matrix"+(pricingScenarios.length<=4?" default-scenarios":" extended-scenarios")} style={{gridTemplateColumns:pricingScenarios.length<=4?`330px repeat(${pricingScenarios.length},minmax(0,1fr))`:`330px repeat(${pricingScenarios.length},176px)`}}>
          <div className="scenario-matrix-header scenario-matrix-static">
            <span>{terms.costItem}</span>
            <span>{t("Method","计算方式")}</span>
            <span>{terms.currency}</span>
          </div>
          {pricingScenarios.map(s=><div className="scenario-matrix-header scenario-matrix-pax-head" key={s.id}>
            <div className="scenario-pax-title">
              <strong>{s.pax}</strong>
              <span>Pax</span>
            </div>
            <button type="button" className="scenario-remove-pax no-print" onClick={()=>removePricingScenario(s.id)} disabled={pricingScenarios.length<=1}>×</button>
            <div className="scenario-cell-labels">
              <span>{terms.unitPrice}</span>
            </div>
          </div>)}

          {scenarioRows.map((row,index)=><div className="scenario-matrix-row" key={row.id} style={{gridTemplateColumns:pricingScenarios.length<=4?`330px repeat(${pricingScenarios.length},minmax(0,1fr))`:`330px repeat(${pricingScenarios.length},176px)`}}>
            <div className="scenario-matrix-static scenario-row-meta">
              <div className="scenario-item-field">
                <input value={costItemDisplay(row.item)} onChange={e=>setScenarioRow(row.id,{item:e.target.value})} placeholder={t("Cost item","成本项目")} />
                {index>0&&<div className="scenario-row-actions no-print">
                  <button type="button" onClick={()=>duplicateScenarioRow(row.id)}>{t("Copy","复制")}</button>
                  <button type="button" onClick={()=>removeScenarioRow(row.id)}>{t("Delete","删除")}</button>
                </div>}
              </div>
              <select value={row.mode} onChange={e=>setScenarioRow(row.id,{mode:e.target.value as CalcMode})}>
                {calcModes.map(mode=><option key={mode} value={mode}>{calcModeLabel(mode)}</option>)}
              </select>
              <select value={row.currency} onChange={e=>setScenarioRow(row.id,{currency:e.target.value as Currency})}>
                {currencies.map(cur=><option key={cur} value={cur}>{currencyLabel(cur)}</option>)}
              </select>
            </div>
            {pricingScenarios.map(s=>{
              const value=row.values[s.id]||{unitPrice:"",qty:1};
              return <div className="scenario-cost-cell" key={s.id}>
                <input
                  className="scenario-unit-price-input"
                  aria-label={t(`${row.item||"Cost"} unit price for ${s.pax} pax`,`${row.item||"成本"} ${s.pax}人单价`)}
                  type="number" min="0" value={value.unitPrice}
                  onChange={e=>setScenarioCell(row.id,s.id,{unitPrice:e.target.value===""?"":Math.max(0,Number(e.target.value))})}
                  placeholder="0.00"
                />
                <div className="scenario-qty-control">
                  <span>{t("Qty","数量")}</span>
                  <input
                    className="scenario-qty-input"
                    aria-label={t(`${row.item||"Cost"} quantity for ${s.pax} pax`,`${row.item||"成本"} ${s.pax}人数量`)}
                    type="number" min="0" value={value.qty}
                    onChange={e=>setScenarioCell(row.id,s.id,{qty:e.target.value===""?"":Math.max(0,Number(e.target.value))})}
                    placeholder="1"
                  />
                </div>
              </div>;
            })}
          </div>)}
        </div>
      </div>
      <div className="scenario-formula-note">
        <span>{t("Package Days","配套天数")}: <strong>{travelDuration.days||"—"}</strong></span>
        <span>{t("Per Person / Day and Per Group / Day automatically use Package Days.","每人每天及整团每天会自动使用配套天数。")}</span>
      </div>
    </Section>}

    {pricingMode==="scenario"&&<Section title={t("Scenario Pricing Results","人数报价结果")}>
      <div className="scenario-result-grid">
        {scenarioResults.map(result=><article className="scenario-result-card" key={result.id}>
          <div className="scenario-result-head">
            <div><span>{t("SCENARIO","人数方案")}</span><strong>{result.pax} Pax</strong></div>
            <span className="scenario-result-days">{travelDuration.days||"—"} {t("Days","天")}</span>
          </div>
          <div className="scenario-result-metrics">
            <Metric label={terms.costPerPax} value={money(result.costPerPax)} />
            <Metric label={terms.systemSuggested} value={money(result.suggestedPrice)} />
          </div>
          <Field label={t("Manual Final Price","手动最终报价")}>
            <input type="number" min="0" value={pricingScenarios.find(s=>s.id===result.id)?.manualFinalPrice??""}
              onChange={e=>setScenarioManual(result.id,e.target.value===""?"":Math.max(0,Number(e.target.value)))}
              placeholder={money(result.roundedPrice)} />
          </Field>
          <div className="scenario-result-final">
            <span>{t("Final Price / Pax","最终报价 / 人")}</span>
            <strong>{money(result.finalPrice)}</strong>
          </div>
          <div className="scenario-result-foot">
            <span>{terms.profit} <strong>{money(result.finalProfit)}</strong></span>
            <span>{terms.margin} <strong>{pct(result.finalMargin)}</strong></span>
          </div>
        </article>)}
      </div>
    </Section>}

    {pricingMode==="single"&&<>
    <section className="section single-room-section">
      <div className="section-head"><h2>{t("Single Room","单人房")}</h2></div>
      <div className="single-room-grid">
        <Field label={t("Manual Amount","手动填写数额")}><input type="number" min="0" value={singleRoomAmount} onChange={e=>setSingleRoomAmount(e.target.value===""?"":Number(e.target.value))} placeholder="0.00" /></Field>
        <Field label={terms.currency}><select value={singleRoomCurrency} onChange={e=>setSingleRoomCurrency(e.target.value as Currency)}>{currencies.map(cur=><option key={cur} value={cur}>{currencyLabel(cur)}</option>)}</select></Field>
      </div>
    </section>

    <div className="two-col">
      <section className={"section cost-setup-collapsible "+(leaderOpen?"open":"collapsed")}>
        <button type="button" className="cost-setup-toggle" onClick={()=>setLeaderOpen(v=>!v)} aria-expanded={leaderOpen}>
          <span>{terms.tourLeaderCostSetup}</span>
          <span className="cost-setup-chevron" aria-hidden="true">⌄</span>
        </button>
        {leaderOpen&&<div className="cost-setup-content">
          <div className="cost-setup-actions no-print">
            <button type="button" className="btn" onClick={addLeader}>{t("+ Add Cost Row","+ 新增成本项目")}</button>
          </div>
        <div className="traveller-cost-table leader-cost-table">
          <div className="traveller-cost-table-head" aria-hidden="true">
            <span>{terms.costItem}</span>
            <span>{t("Type","类型")}</span>
            <span>{terms.calculation}</span>
            <span>{terms.unitPrice}</span>
            <span>{t("Qty / Days","数量 / 天数")}</span>
            <span>{terms.currency}</span>
            <span>{terms.costPerPax}</span>
            <span></span>
          </div>
          <div className="traveller-cost-table-body">
            {leaderRows.map(r=>{
              const normalizedDirection=(r.direction||"cost") as "cost"|"deduction";
              const normalizedMode=(r.mode||"每人") as CalcMode;
              const normalizedRow={...r,direction:normalizedDirection,mode:normalizedMode};
              const total=leaderRowTotal(normalizedRow,mainCurrency,mainRate);
              const perPax=leaderRowPerPax(normalizedRow,Math.max(1,Number(pax)||1),mainCurrency,mainRate);
              const rate=currencyRate(r.currency,mainCurrency,mainRate);
              return <div className="traveller-cost-row" key={r.id}>
                <div className="traveller-cost-row-main">
                  <div className="traveller-cost-cell item">
                    <input aria-label={terms.costItem} value={costItemDisplay(r.item)} onChange={e=>setLeader(r.id,{item:e.target.value})}/>
                    {r.note&&<small className="traveller-cost-note-preview">↳ {r.note}</small>}
                  </div>
                  <div className="traveller-cost-cell">
                    <select aria-label={t("Type","类型")} value={normalizedDirection} onChange={e=>setLeader(r.id,{direction:e.target.value as "cost"|"deduction"})}>
                      <option value="cost">{t("Cost +","成本 +")}</option>
                      <option value="deduction">{t("Deduction −","扣减 −")}</option>
                    </select>
                  </div>
                  <div className="traveller-cost-cell">
                    <select aria-label={terms.calculation} value={normalizedMode} onChange={e=>setLeader(r.id,{mode:e.target.value as CalcMode})}>{calcModes.map(mode=><option key={mode} value={mode}>{calcModeLabel(mode)}</option>)}</select>
                  </div>
                  <div className="traveller-cost-cell">
                    <input aria-label={terms.unitPrice} type="number" min="0" value={r.unitPrice} onChange={e=>setLeader(r.id,{unitPrice:e.target.value===""?"":Math.max(0,Number(e.target.value))})}/>
                  </div>
                  <div className="traveller-cost-cell">
                    <input aria-label={t("Qty / Days","数量 / 天数")} type="number" min="0" value={r.qty} onChange={e=>setLeader(r.id,{qty:e.target.value===""?"":Math.max(0,Number(e.target.value))})}/>
                  </div>
                  <div className="traveller-cost-cell traveller-cost-currency">
                    <select aria-label={terms.currency} value={r.currency} onChange={e=>setLeader(r.id,{currency:e.target.value as Currency})}>{currencies.map(cur=><option key={cur} value={cur}>{currencyLabel(cur)}</option>)}</select>
                    <small>{terms.rate} {rate||"—"}</small>
                  </div>
                  <div className={"traveller-cost-result "+(perPax<0?"deduction-value":"")}>
                    <strong>{money(perPax)}</strong>
                    <small>{t("Total","总计")} {money(total)}</small>
                  </div>
                  <details className="traveller-cost-more no-print">
                    <summary aria-label={t("More actions","更多操作")}>•••</summary>
                    <div className="traveller-cost-more-menu">
                      <label><span>{t("Remarks","备注")}</span><input value={r.note} onChange={e=>setLeader(r.id,{note:e.target.value})} placeholder={t("Add remark","添加备注")}/></label>
                      <button type="button" onClick={()=>duplicateLeader(r.id)}>{t("Duplicate","复制")}</button>
                      <button type="button" className="danger-link" onClick={()=>removeLeader(r.id)}>{t("Delete","删除")}</button>
                    </div>
                  </details>
                </div>
              </div>
            })}
          </div>
        </div></div>}
      </section>

      <section className={"section cost-setup-collapsible "+(childOpen?"open":"collapsed")}>
        <button type="button" className="cost-setup-toggle" onClick={()=>setChildOpen(v=>!v)} aria-expanded={childOpen}>
          <span>{terms.childCostSetup}</span>
          <span className="cost-setup-chevron" aria-hidden="true">⌄</span>
        </button>
        {childOpen&&<div className="cost-setup-content">
          <div className="child-grid">
            <ChildCostCard title={t("Child with Bed","小孩含床")} t={t} setup={childBedSetup} setSetup={setChildBedSetup} pax={Math.max(1,Number(pax)||1)} mainCurrency={mainCurrency} mainRate={mainRate} displayItem={costItemDisplay} calcModeLabel={calcModeLabel} />
            <ChildCostCard title={t("Child without Bed","小孩不含床")} t={t} setup={childNoBedSetup} setSetup={setChildNoBedSetup} pax={Math.max(1,Number(pax)||1)} mainCurrency={mainCurrency} mainRate={mainRate} displayItem={costItemDisplay} calcModeLabel={calcModeLabel} />
          </div>
        </div>}
      </section>
    </div>

    <Section title={terms.quotationPricing}>
      <div className="pricing-foundation">
        <div className="pricing-foundation-head">
          <div>
            <span className="pricing-foundation-kicker">{t("SYSTEM PRICING MATRIX","系统定价矩阵")}</span>
            <p>{t("Review system pricing, then set the final customer price from one source of truth.","先审核系统定价，再从同一个定价来源确认最终对客售价。")}</p>
          </div>
          <div className="pricing-foundation-rule">
            <span>{t("Rounding Rule","取整规则")}</span>
            <strong>{t(`Nearest RM ${roundUnit}`,`RM ${roundUnit} 取整`)}</strong>
          </div>
        </div>

        <div className="pricing-matrix-table" role="table" aria-label={t("Quotation Pricing Matrix","报价定价矩阵")}>
          <div className="pricing-matrix-header" role="row">
            <span>{terms.travellerType}</span>
            <span>{t("Leader","领队")}</span>
            <span>{t("Cost","成本")}</span>
            <span>{terms.systemSuggested}</span>
            <span>{terms.finalPrice}</span>
            <span>{terms.profit}</span>
            <span>{terms.margin}</span>
          </div>

          {pricingRows.map(row=>{
            const active=row.type===effectiveSelectedType;
            const rowFinal=row.value.final;
            const rowProfit=rowFinal-row.value.cost;
            const overridden=active&&manualQuote!=="";
            return <button
              type="button"
              role="row"
              key={row.type}
              className={"pricing-matrix-row "+(active?"active ":"")+(overridden?"overridden":"")}
              onClick={()=>{setSelectedType(row.type);setManualQuote("")}}
            >
              <span className="pricing-matrix-traveller" role="cell">
                <i aria-hidden="true"></i>
                <strong>{row.label}</strong>
              </span>
              <span className="pricing-matrix-mode" role="cell">{row.mode}</span>
              <span role="cell">{money(row.value.cost)}</span>
              <span role="cell">{money(row.value.rounded)}</span>
              <span className="pricing-matrix-final" role="cell">
                <strong>{money(rowFinal)}</strong>
                {overridden&&<small>{t("Override","人工调整")}</small>}
              </span>
              <span role="cell">{money(rowProfit)}</span>
              <span role="cell">{pct(row.value.margin)}</span>
            </button>
          })}
        </div>

        <div className="pricing-decision">
          <div className="pricing-decision-head">
            <div>
              <span>{t("SELECTED TRAVELLER TYPE","已选择旅客类型")}</span>
              <h3>{selectedTravelerLabel}</h3>
              <p>{selectedIncludesLeader?t("Leader cost included","已包含领队成本"):t("Leader cost excluded","不包含领队成本")}</p>
            </div>
            <div className={"pricing-decision-state "+(manualQuote!==""?"manual":"system")}>
              <span>{manualQuote!==""?t("Manual Override","人工调整"):t("System Price","系统价格")}</span>
            </div>
          </div>

          <div className="pricing-decision-grid">
            <div className="pricing-decision-metric">
              <span>{terms.costPerPax}</span>
              <strong>{money(selected.cost)}</strong>
            </div>
            <div className="pricing-decision-metric">
              <span>{terms.systemSuggested}</span>
              <strong>{money(selected.rounded)}</strong>
            </div>

            <label className="pricing-final-input">
              <span>{t("Final Customer Price / Pax","最终对客售价 / 人")}</span>
              <div>
                <b>RM</b>
                <input
                  type="number"
                  min="0"
                  value={manualQuote}
                  onChange={e=>setManualQuote(e.target.value===""?"":Math.max(0,Number(e.target.value)))}
                  placeholder={selected.rounded.toFixed(2)}
                />
              </div>
              <small>{manualQuote===""?t("Using system suggested price","目前采用系统建议价"):t(`Adjusted ${money(Number(manualQuote)-selected.rounded)} from system price`,`较系统建议价调整 ${money(Number(manualQuote)-selected.rounded)}`)}</small>
            </label>

            <div className="pricing-final-result">
              <span>{t("Final Result","最终结果")}</span>
              <strong>{money(finalQuote)}</strong>
              <small>{terms.profit} {money(finalProfit)} · {terms.margin} {pct(finalMargin)}</small>
            </div>
          </div>

          {manualQuote!==""&&<button type="button" className="pricing-reset no-print" onClick={()=>setManualQuote("")}>{t("Use System Suggested","恢复系统建议价")}</button>}
        </div>
      </div>
    </Section>
    </>}
    {workspaceMode&&<div className={"quotation-save-state "+(isDirty?"unsaved":"saved")}>
      <div>
        <strong>{isDirty?t("● Unsaved Changes","● 有未保存修改"):t("✓ All changes saved","✓ 所有修改已保存")}</strong>
        <span>{isDirty?t("Save this quotation before submitting or leaving the workspace.","提交审核或离开工作区前，请先保存这份报价。"):quotationId?t("This quotation is saved.","当前报价已保存。"):t("Save the draft to create this quotation.","保存草稿后会正式建立这份报价。")}</span>
      </div>
      {isDirty&&<button className="btn primary" type="button" disabled={saving} onClick={()=>void saveQuotation()}>{saving?t("Saving...","保存中..."):quotationId?t("Save Quotation","保存报价"):t("Save Draft","保存草稿")}</button>}
    </div>}

    {workspaceMode&&<section className="panel inquiry-workflow-panel quotation-editor-workflow">
      <div className="panel-head inquiry-workflow-panel-head quotation-workflow-compact-head">
        <div>
          <h2>{t("Workflow","工作流程")}</h2>
        </div>
      </div>

      <div className="simple-workflow-grid quotation-workflow-compact system-workflow-grid">
        <div className={"simple-workflow-card "+((displayStatus==="under_review"||displayStatus==="ready")?"complete":"current")}>
          <div className="simple-workflow-card-head">
            <span className="simple-workflow-index">01</span>
            <span className="simple-workflow-state">{(displayStatus==="under_review"||displayStatus==="ready")?t("✓ Done","✓ 已完成"):displayStatus==="revision_required"?t("Revise","修改"):t("Current","当前")}</span>
          </div>
          <div className="simple-workflow-title">
            <strong>{t("Quotation","报价")}</strong>
          </div>
          {(displayStatus==="draft"||displayStatus==="revision_required")&&<div className="simple-workflow-actions">
            {quotationId
              ?<button className="btn primary" type="button" disabled={saving||isDirty} onClick={()=>void submitForReview()}>
                  {saving?t("Working...","处理中..."):displayStatus==="revision_required"?t("Resubmit for Review","重新提交审核"):t("Submit for Review","提交审核")}
                </button>
              :<span className="quotation-workflow-waiting">{t("Save the draft first to enable submission.","先保存草稿后才可提交审核。")}</span>}
          </div>}
        </div>

        <div className="simple-workflow-arrow" aria-hidden="true">→</div>

        <div className={"simple-workflow-card "+(displayStatus==="ready"?"complete":displayStatus==="under_review"?"current":"upcoming")}>
          <div className="simple-workflow-card-head">
            <span className="simple-workflow-index">02</span>
            <span className="simple-workflow-state">{displayStatus==="ready"?t("✓ Done","✓ 已完成"):displayStatus==="under_review"?t("Reviewing","审核中"):t("Next","下一步")}</span>
          </div>
          <div className="simple-workflow-title">
            <strong>{t("Management Review","管理层审核")}</strong>
          </div>
          {displayStatus==="under_review"&&<div className="quotation-workflow-waiting">{t("Waiting for approval","等待批准")}</div>}
        </div>

        <div className="simple-workflow-arrow" aria-hidden="true">→</div>

        <div className={"simple-workflow-card "+(displayStatus==="ready"?"current":"upcoming")}>
          <div className="simple-workflow-card-head">
            <span className="simple-workflow-index">03</span>
            <span className="simple-workflow-state">{displayStatus==="ready"?t("Current","当前"):t("Next","下一步")}</span>
          </div>
          <div className="simple-workflow-title">
            <strong>{t("Itinerary","行程")}</strong>
          </div>
          {displayStatus==="ready"&&resolvedSourceInquiryId&&<div className="simple-workflow-actions">
            <button className="btn primary" type="button" onClick={()=>router.push("/itineraries/new?sourceInquiry="+resolvedSourceInquiryId)}>{t("Create","创建")}</button>
            <button className="btn" type="button" onClick={()=>router.push("/ai-import?sourceInquiry="+resolvedSourceInquiryId)}>AI</button>
          </div>}
          {displayStatus==="ready"&&!resolvedSourceInquiryId&&<div className="quotation-workflow-waiting">{t("No linked Inquiry","没有关联的 Inquiry")}</div>}
        </div>
      </div>
    </section>}

    {pendingHref && <div className="unsaved-overlay no-print" role="dialog" aria-modal="true">
      <div className="unsaved-dialog">
        <div className="unsaved-icon">!</div>
        <div>
          <h3>{t("Unsaved quotation","当前报价尚未存档")}</h3>
          <p>{t("You have unsaved changes. Save before leaving?","你已经修改了这张报价。离开之前要先保存吗？")}</p>
        </div>
        <div className="unsaved-actions">
          <button className="btn primary" onClick={saveAndLeave} disabled={saving}>{saving?t("Saving...","保存中..."):t("Save & Continue","保存并继续")}</button>
          <button className="btn leave-btn" onClick={leaveWithoutSaving} disabled={saving}>{t("Leave Without Saving","不保存离开")}</button>
          <button className="btn" onClick={()=>setPendingHref(null)} disabled={saving}>{t("Cancel","取消")}</button>
        </div>
      </div>
    </div>}

    {!workspaceMode&&<footer>{t("Data is automatically saved in this browser's Local Storage.","数据会自动保存在此浏览器 Local Storage。")} {t("For non-primary currencies without an exchange rate, the rate displays — to prevent silent miscalculation.","其他非主要币种若未设为主要币种，汇率会显示 —，避免静默误算。")}</footer>}
  </main>
}


function PrintSectionNo({no,title,children}:{no:string;title:React.ReactNode;children:React.ReactNode}){
  return <section className="print-doc-section"><div className="print-section-title"><span>{no}</span><h2>{title}</h2></div>{children}</section>;
}
function PrintInfo({label,value}:{label:React.ReactNode;value:string}){
  return <div className="print-info"><span>{label}</span><strong>{value||"—"}</strong></div>;
}
function PrintFooter({quotationNo,page,total}:{quotationNo:string;page:string;total:number}){
  return <footer className="print-doc-footer"><span>Happy Express Travel · Internal Use Only</span><span>{quotationNo}</span><span>{page} / {total}</span></footer>;
}

function Section({title,children,action}:{title:React.ReactNode;children:React.ReactNode;action?:React.ReactNode}){return <section className="section"><div className="section-head"><h2>{title}</h2>{action}</div>{children}</section>}
function Field({label,children}:{label:React.ReactNode;children:React.ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
function Summary({label,value,strong}:{label:React.ReactNode;value:string;strong?:boolean}){return <div className={`summary-card ${strong?"strong":""}`}><span>{label}</span><b>{value}</b></div>}
function Metric({label,value,strong}:{label:React.ReactNode;value:string;strong?:boolean}){return <div className={`metric ${strong?"strong":""}`}><span>{label}</span><b>{value}</b></div>}
function ChildCostCard({title,t,setup,setSetup,pax,mainCurrency,mainRate,displayItem,calcModeLabel}:{title:React.ReactNode;t:(en:string,zh:string)=>string;setup:ChildCostSetup;setSetup:(v:ChildCostSetup)=>void;pax:number;mainCurrency:Currency;mainRate:number;displayItem:(v:string)=>string;calcModeLabel:(v:CalcMode)=>string}){
  const terms=quotationTerminology(t);
  const normalizedSetup:ChildCostSetup={
    ...setup,
    groundDirection:setup.groundDirection||"cost",
    otherRows:(setup.otherRows||[]).map(row=>({...row,direction:row.direction||"cost",mode:row.mode||"每人"}))
  };
  const summary=childSetupCost(normalizedSetup,pax,mainCurrency,mainRate);
  const updateRow=(id:string,patch:Partial<ChildCostRow>)=>setSetup({...normalizedSetup,otherRows:normalizedSetup.otherRows.map(row=>row.id===id?{...row,...patch}:row)});
  const addRow=()=>setSetup({...normalizedSetup,otherRows:[...normalizedSetup.otherRows,{id:uid(),item:"",direction:"cost",mode:"每人",unitPrice:"",qty:1,currency:"RM",note:""}]});
  const removeRow=(id:string)=>setSetup({...normalizedSetup,otherRows:normalizedSetup.otherRows.filter(row=>row.id!==id)});

  return <div className="child-cost-card">
    <div className="child-cost-card-head">
      <div>
        <h3>{title}</h3>
      </div>
      <div className="child-cost-total">
        <span>{t("Child Cost / Pax","儿童成本 / 人")}</span>
        <strong>{money(summary.total)}</strong>
      </div>
    </div>

    <div className="child-cost-breakdown-table">
      <div className="child-cost-breakdown-head" aria-hidden="true">
        <span>{terms.costItem}</span>
        <span>{t("Type","类型")}</span>
        <span>{terms.calculation}</span>
        <span>{terms.unitPrice}</span>
        <span>{t("Qty / Ratio","数量 / 比例")}</span>
        <span>{terms.currency}</span>
        <span>{terms.costPerPax}</span>
        <span></span>
      </div>

      <div className="child-cost-breakdown-row ground">
        <div className="child-cost-cell item">
          <strong>{t("Ground Package","地接报价")}</strong>
        </div>
        <div className="child-cost-cell">
          <select aria-label={t("Type","类型")} value={normalizedSetup.groundDirection||"cost"} onChange={e=>setSetup({...normalizedSetup,groundDirection:e.target.value as "cost"|"deduction"})}>
            <option value="cost">{t("Cost +","成本 +")}</option>
            <option value="deduction">{t("Deduction −","扣减 −")}</option>
          </select>
        </div>
        <div className="child-cost-cell">
          <div className="child-ratio-mode">{t("Child Ratio","儿童比例")}</div>
        </div>
        <div className="child-cost-cell">
          <input aria-label={t("Ground Package Base","Ground Package 基础成本")} type="number" min="0" value={normalizedSetup.groundBase} onChange={e=>setSetup({...normalizedSetup,groundBase:e.target.value===""?"":Math.max(0,Number(e.target.value))})}/>
        </div>
        <div className="child-cost-cell">
          <div className="child-ratio-input"><input aria-label={t("Child Ratio","儿童比例")} type="number" min="0" max="100" value={normalizedSetup.groundRatio} onChange={e=>setSetup({...normalizedSetup,groundRatio:Math.max(0,Math.min(100,Number(e.target.value)||0))})}/><span>%</span></div>
        </div>
        <div className="child-cost-cell child-cost-currency">
          <select aria-label={terms.currency} value={normalizedSetup.groundCurrency} onChange={e=>setSetup({...normalizedSetup,groundCurrency:e.target.value as Currency})}>{currencies.map(cur=><option key={cur} value={cur}>{cur==="其他"?t("Other","其他"):cur}</option>)}</select>
          <small>{terms.rate} {currencyRate(normalizedSetup.groundCurrency,mainCurrency,mainRate)||"—"}</small>
        </div>
        <div className={"child-cost-result "+(summary.ground<0?"deduction-value":"")}>
          <strong>{money(summary.ground)}</strong>
          <small>{t("Base","基础")} {Number(normalizedSetup.groundBase)||0} × {normalizedSetup.groundRatio}%</small>
        </div>
        <span></span>
      </div>

      {normalizedSetup.otherRows.map(row=>{
        const rowPerPax=childExtraRowPerPax(row,pax,mainCurrency,mainRate);
        const rate=currencyRate(row.currency,mainCurrency,mainRate);
        return <div className="child-cost-breakdown-row" key={row.id}>
          <div className="child-cost-cell item">
            <input aria-label={terms.costItem} value={displayItem(row.item)} onChange={e=>updateRow(row.id,{item:e.target.value})}/>
          </div>
          <div className="child-cost-cell">
            <select aria-label={t("Type","类型")} value={row.direction||"cost"} onChange={e=>updateRow(row.id,{direction:e.target.value as "cost"|"deduction"})}>
              <option value="cost">{t("Cost +","成本 +")}</option>
              <option value="deduction">{t("Deduction −","扣减 −")}</option>
            </select>
          </div>
          <div className="child-cost-cell">
            <select aria-label={terms.calculation} value={row.mode||"每人"} onChange={e=>updateRow(row.id,{mode:e.target.value as CalcMode})}>{calcModes.map(mode=><option key={mode} value={mode}>{calcModeLabel(mode)}</option>)}</select>
          </div>
          <div className="child-cost-cell">
            <input aria-label={terms.unitPrice} type="number" min="0" value={row.unitPrice} onChange={e=>updateRow(row.id,{unitPrice:e.target.value===""?"":Math.max(0,Number(e.target.value))})}/>
          </div>
          <div className="child-cost-cell">
            <input aria-label={t("Qty / Days","数量 / 天数")} type="number" min="0" value={row.qty} onChange={e=>updateRow(row.id,{qty:e.target.value===""?"":Math.max(0,Number(e.target.value))})}/>
          </div>
          <div className="child-cost-cell child-cost-currency">
            <select aria-label={terms.currency} value={row.currency} onChange={e=>updateRow(row.id,{currency:e.target.value as Currency})}>{currencies.map(cur=><option key={cur} value={cur}>{cur==="其他"?t("Other","其他"):cur}</option>)}</select>
            <small>{terms.rate} {rate||"—"}</small>
          </div>
          <div className={"child-cost-result "+(rowPerPax<0?"deduction-value":"")}>
            <strong>{money(rowPerPax)}</strong>
          </div>
          <button type="button" className="child-extra-remove no-print" onClick={()=>removeRow(row.id)} aria-label={t("Delete cost","删除成本")}>×</button>
        </div>
      })}
    </div>

    <div className="child-cost-footer">
      <button type="button" className="btn no-print" onClick={addRow}>{t("+ Add Cost Row","+ 新增成本项目")}</button>
      <div className="child-cost-summary-line">
        <span>{t("Ground","地接")} <strong>{money(summary.ground)}</strong></span>
        <span>{t("Other Costs","其他成本")} <strong>{money(summary.extras)}</strong></span>
        <span className="total">{t("Total / Pax","每人总成本")} <strong>{money(summary.total)}</strong></span>
      </div>
    </div>
  </div>
}
