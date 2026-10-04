"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";
import FlightInformation,{emptyFlightInformation,type FlightInformationValue} from "@/components/FlightInformation";
import {
  CalcMode, ChildMode, Currency, LeaderCostRow, ProfitMode, TravelerCostRow,
  currencyRate, leaderRowTotal, travelerRowPerPax, travelerRowTotal
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
const childModes: ChildMode[] = ["50%","60%","65%","70%","75%","80%","85%","90%","95%","100%","手动成本"];
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
  { id: uid(), item: "地接报价", direction:"cost", mode: "每人", unitPrice: "", qty: 1, currency: "RM", childRatioApplicable: true, note: "" },
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
  { id: uid(), item: "机票", unitPrice: 0, qty: 1, currency: "RM", note: "" },
  { id: uid(), item: "单房", unitPrice: 0, qty: 1, currency: "RM", note: "" },
  { id: uid(), item: "工钱", unitPrice: 0, qty: 1, currency: "RM", note: "" },
  { id: uid(), item: "Bonus", unitPrice: 0, qty: 1, currency: "RM", note: "" },
  { id: uid(), item: "其他", unitPrice: 0, qty: 1, currency: "RM", note: "" },
];

export default function QuotationCalculator({workspaceMode=false,quotationId,initialQuotation,currentStaffId="",currentStaffName="",sourceInquiryId="",sourceInquiryNo="",sourceInquirySnapshot}:CalculatorProps) {
  const router = useRouter();
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;
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
  const [quoteTitle, setQuoteTitle] = useState("New Tour Quotation");
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
  const [scenarioRows,setScenarioRows]=useState<ScenarioCostRow[]>(()=>makeScenarioRowsFromTravelerRows(defaultTravelerRows,defaultPricingScenarios));
  const [leaderRows, setLeaderRows] = useState<LeaderCostRow[]>(defaultLeaderRows);
  const [leaderOpen, setLeaderOpen] = useState(false);
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

  // Sync the fixed ground quote row with the quotation's main currency.
  useEffect(() => {
    setTravelerRows(rows => rows.map((row,index) =>
      index === 0 ? {...row,item:"地接报价",direction:"cost",currency:mainCurrency} : row
    ));
  }, [mainCurrency]);

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
    childBedMode,childBedManual,childBedCurrency,childNoBedMode,childNoBedManual,childNoBedCurrency,
    selectedType,manualQuote,pricingMode,pricingScenarios,scenarioRows
  });

  const currentCommercialSnapshot=JSON.stringify({
    supplier,pax,mainCurrency,mainRate,flightTotalPrice,flightPriceCurrency,
    travelerRows,leaderRows,singleRoomAmount,singleRoomCurrency,
    profitMode,profitRate,minProfit,maxProfit,fixedProfit,roundUnit,
    childBedMode,childBedManual,childBedCurrency,
    childNoBedMode,childNoBedManual,childNoBedCurrency,
    selectedType,manualQuote
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
    childNoBedMode,childNoBedManual,childNoBedCurrency,
    selectedType,manualQuote,singleRoomAmount,singleRoomCurrency
  }),[
    pax,travelDuration.days,mainCurrency,mainRate,travelerRows,leaderRows,
    profitMode,profitRate,minProfit,maxProfit,fixedProfit,roundUnit,
    childBedMode,childBedManual,childBedCurrency,
    childNoBedMode,childNoBedManual,childNoBedCurrency,
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
  const setScenarioCell=(rowId:string,scenarioId:string,patch:Partial<ScenarioValue>)=>setScenarioRows(rows=>rows.map(r=>r.id===rowId?{
    ...r,values:{...r.values,[scenarioId]:{unitPrice:"",qty:1,...(r.values[scenarioId]||{}),...patch}}
  }:r));
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
    setPricingScenarios(items=>[...items,{id,pax:next,manualFinalPrice:""}].sort((a,b)=>a.pax-b.pax));
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

  const saveQuotation = async (): Promise<boolean> => {
    setSaving(true);
    setSaveMessage("");

    const quotationData = {tourType,op:op || currentStaffName,opStaffId:initialQuotation?.quotation_data?.opStaffId || initialQuotation?.owner_id || currentStaffId,supplier,pax,mainCurrency,mainRate,customerContact,departureCity,flightInformation,
      flightTotalPrice,flightPriceCurrency,flightTicketType:flightTicketType.code,
      itineraryDays:travelDuration.days,itineraryLabel:travelDuration.label,
      travelerRows,leaderRows,leaderOpen,singleRoomAmount,singleRoomCurrency,hasLeader,profitMode,profitRate,minProfit,maxProfit,fixedProfit,roundUnit,childBedMode,childBedManual,childBedCurrency,childNoBedMode,childNoBedManual,childNoBedCurrency,selectedType:effectiveSelectedType,manualQuote,calculationInput:{...calculationInput,selectedType:effectiveSelectedType},calculationResult,scenarioPricing:{version:1,mode:pricingMode,scenarios:pricingScenarios,rows:scenarioRows,results:scenarioResults},sourceInquiryId:resolvedSourceInquiryId,sourceInquiryNo:resolvedSourceInquiryNo,sourceInquirySnapshot:resolvedSourceInquirySnapshot};
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

    setQuoteTitle("New Tour Quotation");
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
      { id: uid(), item: "地接报价", direction:"cost", mode: "每人", unitPrice: "", qty: 1, currency: "RM", childRatioApplicable: true, note: "" },
      { id: uid(), item: "小费", direction:"cost", mode: "每人每天", unitPrice: "", qty: 1, currency: "RM", childRatioApplicable: false, note: "" },
      { id: uid(), item: "旅游保险", direction:"cost", mode: "每人", unitPrice: "", qty: 1, currency: "RM", childRatioApplicable: false, note: "" },
      { id: uid(), item: "机场接送", direction:"cost", mode: "整团", unitPrice: "", qty: 1, currency: "RM", childRatioApplicable: false, note: "" }
    ]);

    setLeaderRows([
      { id: uid(), item: "机票", unitPrice: 0, qty: 1, currency: "RM", note: "" },
      { id: uid(), item: "单房", unitPrice: 0, qty: 1, currency: "RM", note: "" },
      { id: uid(), item: "工钱", unitPrice: 0, qty: 1, currency: "RM", note: "" },
      { id: uid(), item: "Bonus", unitPrice: 0, qty: 1, currency: "RM", note: "" },
      { id: uid(), item: "其他", unitPrice: 0, qty: 1, currency: "RM", note: "" }
    ]);
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

    setSelectedType("成人不含领队");
    setManualQuote("");
    setSaveMessage("");

  };

  const matrix = [
    ["成人（双人一房）", calc.adultNoLeader, calc.adultLeader],
    ["小孩加床", calc.childBedNoLeader, calc.childBedLeader],
    ["小孩不加床", calc.childNoBedNoLeader, calc.childNoBedLeader],
  ] as const;

  return <main className={"app-shell "+(workspaceMode?"quotation-editor-shell":"")}>
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
        <button className="btn ghost quote-action-secondary" type="button" onClick={()=>window.print()}>{t("Print / PDF","打印 / PDF")}</button>
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

    {workspaceMode && <section className="quote-meta-panel">
      <div className="quotation-identity-block">
        <Field label={t("Quotation Title","报价标题")}><input value={quoteTitle} onChange={e=>setQuoteTitle(e.target.value)} placeholder={t("e.g. Hokkaido Winter 7D5N · HT Group","例如：北海道冬季 7D5N · HT Group")} /></Field>
      </div>

      <div className="quotation-trip-context">
        <div className="quotation-trip-context-head">
          <div>
            <span className="page-kicker">{t("CUSTOMER & TRIP","客户与行程")}</span>
            <h3>{t("Customer & Trip Information","客户与行程资料")}</h3>
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

      <FlightInformation
        value={flightInformation}
        onChange={setFlightInformation}
        durationDays={travelDuration.days}
        footer={
          <div className="flight-total-price-row">
            <Field label={t("Flight Total Price","航班总报价")}>
              <input type="number" min="0" value={flightTotalPrice} onChange={e=>setFlightTotalPrice(e.target.value===""?"":Number(e.target.value))} placeholder="0.00" />
            </Field>
            <Field label={t("Currency","币种")}>
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

      {saveMessage && <div className="save-message">{saveMessage}</div>}
    </section>}

    <Section title={t("Commercial Settings","商业设置")}>
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
          <span className="page-kicker">{t("PRICING MODE","报价模式")}</span>
          <h2>{t("Pricing Structure","报价结构")}</h2>
        </div>
        <div className="scenario-mode-switch no-print">
          <button type="button" className={pricingMode==="single"?"active":""} onClick={()=>setPricingMode("single")}>
            {t("Single Pax","单一人数")}
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
    <Section title={t("Traveller Cost Input","旅客成本输入")} action={<button className="btn no-print" onClick={addTraveler}>{t("+ Add Cost Row","+ 新增成本项目")}</button>}>
      <div className="traveller-cost-list">
        {travelerRows.map((r,index)=>{
          const isGroundQuote=index===0;
          const rate=currencyRate(r.currency,mainCurrency,mainRate);
          const total=travelerRowTotal(r,pax,mainCurrency,mainRate);
          const pp=travelerRowPerPax(r,pax,mainCurrency,mainRate);
          return <div className={"traveller-cost-card"+(isGroundQuote?" fixed":"")} key={r.id}>
            <div className="traveller-cost-inputs">
              <Field label={t("Cost Item","成本项目")}>
                {isGroundQuote
                  ? <input value={t("Ground Package","地接报价")} readOnly className="system-fixed-input" />
                  : <input value={costItemDisplay(r.item)} onChange={e=>setTraveler(r.id,{item:e.target.value})}/>}
              </Field>

              <Field label={t("Type","类型")}>
                {isGroundQuote
                  ? <select value="cost" disabled className="system-fixed-input"><option value="cost">{t("Cost +","成本 +")}</option></select>
                  : <select value={r.direction||"cost"} onChange={e=>setTraveler(r.id,{direction:e.target.value as "cost"|"deduction"})}>
                      <option value="cost">{t("Cost +","成本 +")}</option>
                      <option value="deduction">{t("Deduction −","扣减 −")}</option>
                    </select>}
              </Field>

              <Field label={t("Calculation","计算方式")}>
                <select value={r.mode} onChange={e=>setTraveler(r.id,{mode:e.target.value as CalcMode})}>{calcModes.map(x=><option key={x} value={x}>{calcModeLabel(x)}</option>)}</select>
              </Field>

              <Field label={t("Unit Price","单价")}>
                <input type="number" min="0" value={r.unitPrice} onChange={e=>setTraveler(r.id,{unitPrice:e.target.value===""?"":Math.max(0,Number(e.target.value))})}/>
              </Field>

              <Field label={t("Qty / Days","数量 / 天数")}>
                <input type="number" value={r.qty} onChange={e=>setTraveler(r.id,{qty:e.target.value===""?"":Number(e.target.value)})}/>
              </Field>

              <Field label={t("Currency","币种")}>
                {isGroundQuote
                  ? <select value={mainCurrency} disabled className="system-fixed-input">{currencies.map(c=><option key={c} value={c}>{currencyLabel(c)}</option>)}</select>
                  : <select value={r.currency} onChange={e=>setTraveler(r.id,{currency:e.target.value as Currency})}>{currencies.map(c=><option key={c} value={c}>{currencyLabel(c)}</option>)}</select>}
              </Field>
            </div>

            <div className="traveller-cost-lower">
              <div className="traveller-cost-secondary-inputs">
                <Field label={t("Child Ratio","儿童比例")}>
                  <select value={r.childRatioApplicable?"yes":"no"} onChange={e=>setTraveler(r.id,{childRatioApplicable:e.target.value==="yes"})}>
                    <option value="yes">{t("Yes","是")}</option>
                    <option value="no">{t("No","否")}</option>
                  </select>
                </Field>
                <Field label={t("Remarks","备注")}>
                  <input value={r.note} onChange={e=>setTraveler(r.id,{note:e.target.value})}/>
                </Field>
              </div>

              <div className="traveller-cost-summary">
                <div className={"traveller-cost-metric "+(rate===0?"warn":"")}>
                  <span>{t("Rate","汇率")}</span>
                  <strong>{rate || "—"}</strong>
                </div>
                <div className={"traveller-cost-metric "+(total<0?"deduction-value":"")}>
                  <span>{t("Total Cost","总成本")}</span>
                  <strong>{money(total)}</strong>
                </div>
                <div className={"traveller-cost-metric primary "+(pp<0?"deduction-value":"")}>
                  <span>{t("Cost / Pax","每人成本")}</span>
                  <strong>{money(pp)}</strong>
                </div>
              </div>

              <div className="traveller-cost-actions no-print">
                {isGroundQuote
                  ? <span className="fixed-row-label">{t("Fixed","固定")}</span>
                  : <><button type="button" onClick={()=>duplicateTraveler(r.id)}>{t("Duplicate","复制")}</button><button type="button" onClick={()=>removeTraveler(r.id)}>{t("Delete","删除")}</button></>}
              </div>
            </div>
          </div>
        })}
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
        <div className="scenario-cost-matrix" style={{"--scenario-count":String(pricingScenarios.length)} as React.CSSProperties}>
          <div className="scenario-matrix-header scenario-matrix-static">
            <span>{t("Cost Item","成本项目")}</span>
            <span>{t("Method","计算方式")}</span>
            <span>{t("Currency","币种")}</span>
          </div>
          {pricingScenarios.map(s=><div className="scenario-matrix-header scenario-matrix-pax-head" key={s.id}>
            <strong>{s.pax} Pax</strong>
            <button type="button" className="scenario-remove-pax no-print" onClick={()=>removePricingScenario(s.id)} disabled={pricingScenarios.length<=1}>×</button>
            <small>{t("Unit Price · Qty","单价 · 数量")}</small>
          </div>)}

          {scenarioRows.map((row,index)=><div className="scenario-matrix-row" key={row.id}>
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
                  aria-label={t(`${row.item||"Cost"} unit price for ${s.pax} pax`,`${row.item||"成本"} ${s.pax}人单价`)}
                  type="number" min="0" value={value.unitPrice}
                  onChange={e=>setScenarioCell(row.id,s.id,{unitPrice:e.target.value===""?"":Math.max(0,Number(e.target.value))})}
                  placeholder="0.00"
                />
                <span>×</span>
                <input
                  aria-label={t(`${row.item||"Cost"} quantity for ${s.pax} pax`,`${row.item||"成本"} ${s.pax}人数量`)}
                  type="number" min="0" value={value.qty}
                  onChange={e=>setScenarioCell(row.id,s.id,{qty:e.target.value===""?"":Math.max(0,Number(e.target.value))})}
                  placeholder="1"
                />
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
            <Metric label={t("Cost / Pax","每人成本")} value={money(result.costPerPax)} />
            <Metric label={t("System Suggested","系统建议价")} value={money(result.suggestedPrice)} />
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
            <span>{t("Profit","利润")} <strong>{money(result.finalProfit)}</strong></span>
            <span>{t("Margin","毛利率")} <strong>{pct(result.finalMargin)}</strong></span>
          </div>
        </article>)}
      </div>
    </Section>}

    {pricingMode==="single"&&<>
    <section className="section single-room-section">
      <div className="section-head"><h2>{t("Single Room","单人房")}</h2></div>
      <div className="single-room-grid">
        <Field label={t("Manual Amount","手动填写数额")}><input type="number" min="0" value={singleRoomAmount} onChange={e=>setSingleRoomAmount(e.target.value===""?"":Number(e.target.value))} placeholder="0.00" /></Field>
        <Field label={t("Currency","币种")}><select value={singleRoomCurrency} onChange={e=>setSingleRoomCurrency(e.target.value as Currency)}>{currencies.map(cur=><option key={cur} value={cur}>{currencyLabel(cur)}</option>)}</select></Field>
      </div>
    </section>

    <div className="two-col">
      <section className="section leader-toggle-section">
        <div className="section-head leader-toggle-head">
          <button className={"btn leader-toggle-btn "+(leaderOpen?"active":"")} onClick={()=>setLeaderOpen(v=>!v)}>
            {t("Tour Leader","领队陪同")}
          </button>
        </div>
        {leaderOpen && <div className="table-wrap"><table><thead><tr><th>{t("Item","项目")}</th><th>{t("Unit Price","单价")}</th><th>{t("Qty / Days","数量 / 天数")}</th><th>{t("Currency","币种")}</th><th>{t("Total Cost","总成本")}</th><th>{t("Per-Pax Allocation","每人分摊")}</th><th>{t("Remarks","备注")}</th></tr></thead>
        <tbody>{leaderRows.map(r=>{const total=leaderRowTotal(r,mainCurrency,mainRate);return <tr key={r.id}>
          <td><input value={costItemDisplay(r.item)} onChange={e=>setLeader(r.id,{item:e.target.value})}/></td>
          <td><input type="number" value={r.unitPrice} onChange={e=>setLeader(r.id,{unitPrice:e.target.value===""?"":Number(e.target.value)})}/></td>
          <td><input type="number" value={r.qty} onChange={e=>setLeader(r.id,{qty:e.target.value===""?"":Number(e.target.value)})}/></td>
          <td><select value={r.currency} onChange={e=>setLeader(r.id,{currency:e.target.value as Currency})}>{currencies.map(c=><option key={c} value={c}>{currencyLabel(c)}</option>)}</select></td>
          <td>{money(total)}</td><td>{money(total/Math.max(1,pax))}</td><td><input value={r.note} onChange={e=>setLeader(r.id,{note:e.target.value})}/></td>
        </tr>})}</tbody></table></div>}
      </section>

      <Section title={t("Child Cost Settings","儿童成本设置")}>
        <div className="child-grid">
          <ChildCard title={t("Child with Bed · Shares with 2 adults + 1 extra bed","小孩加床 · 与2位成人同房 + 1张加床")} t={t} mode={childBedMode} setMode={setChildBedMode} manual={childBedManual} setManual={setChildBedManual} currency={childBedCurrency} setCurrency={setChildBedCurrency} />
          <ChildCard title={t("Child without Bed · Shares with 2 adults, no extra bed","小孩不加床 · 与2位成人同房，不另加床")} t={t} mode={childNoBedMode} setMode={setChildNoBedMode} manual={childNoBedManual} setManual={setChildNoBedManual} currency={childNoBedCurrency} setCurrency={setChildNoBedCurrency} />
        </div>
      </Section>
    </div>

    <Section title={t("Customer Quotation","对客报价")}>
      <div className="quote-panel">
        <Field label={t("Traveller Type","旅客类型")}><select value={effectiveSelectedType} onChange={e=>{setSelectedType(e.target.value as TravelerType);setManualQuote("")}}>{travelerTypes.filter(x=>hasLeader || x.includes("不含领队")).map(x=><option key={x} value={x}>{travelerTypeDisplay(x)}</option>)}</select></Field>
        <Metric label={t("Cost","成本")} value={money(selected.cost)} />
        <Metric label={t("System Suggested Price","系统建议价")} value={money(selected.suggested)} />
        <Field label={t("Manual Final Quote","手动最终报价")}><input type="number" value={manualQuote} onChange={e=>setManualQuote(e.target.value===""?"":Number(e.target.value))} placeholder={t(`Auto round ${roundUnit}`,`自动取整 ${roundUnit}`)} /></Field>
        <Metric label={t("Final Quote","最终报价")} value={money(finalQuote)} strong />
        <Metric label={t("Final Profit","最终毛利")} value={money(finalProfit)} />
        <Metric label={t("Margin","毛利率")} value={pct(finalMargin)} />
      </div>
    </Section>

    <Section title={t("Final Quotation Matrix","最终报价矩阵")}>
      <div className={"quotation-matrix-compare foundation-comparison-matrix quotation-editor-matrix quotation-matrix-cards"+(hasLeader?" has-leader":"")}>
        {matrix.map(([label,a,b])=><div className="quotation-matrix-row" key={label}>
          <div className="quotation-matrix-traveller">
            <span>{t("Traveller Type","旅客类型")}</span>
            <strong>{label==="成人（双人一房）"?t("Adult · Twin Sharing","成人（双人一房）"):label==="小孩加床"?t("Child with Bed","小孩加床"):t("Child without Bed","小孩不加床")}</strong>
          </div>

          <div className="quotation-matrix-plan">
            <div className="quotation-matrix-plan-head">
              <span>{t("Leader Mode","领队模式")}</span>
              <strong>{t("Excl. Leader","不含领队")}</strong>
            </div>
            <div className="quotation-matrix-plan-metrics">
              <div className="quotation-matrix-metric" data-comparison-metric data-comparison-role="supporting">
                <span>{t("Cost","成本")}</span><strong>{money(a.cost)}</strong>
              </div>
              <div className="quotation-matrix-metric" data-comparison-metric data-comparison-role="supporting">
                <span>{t("Profit","利润")}</span><strong>{money(a.profit)}</strong>
              </div>
              <div className="quotation-matrix-metric suggested" data-comparison-metric data-comparison-role="recommended">
                <span>{t("Suggested","建议售价")}</span><strong>{money(a.suggested)}</strong>
              </div>
            </div>
          </div>

          {hasLeader&&<div className="quotation-matrix-plan">
            <div className="quotation-matrix-plan-head">
              <span>{t("Leader Mode","领队模式")}</span>
              <strong>{t("Incl. Leader","含领队")}</strong>
            </div>
            <div className="quotation-matrix-plan-metrics">
              <div className="quotation-matrix-metric" data-comparison-metric data-comparison-role="supporting">
                <span>{t("Cost","成本")}</span><strong>{money(b.cost)}</strong>
              </div>
              <div className="quotation-matrix-metric" data-comparison-metric data-comparison-role="supporting">
                <span>{t("Profit","利润")}</span><strong>{money(b.profit)}</strong>
              </div>
              <div className="quotation-matrix-metric suggested" data-comparison-metric data-comparison-role="recommended">
                <span>{t("Suggested","建议售价")}</span><strong>{money(b.suggested)}</strong>
              </div>
            </div>
          </div>}
        </div>)}
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

function Section({title,children,action}:{title:React.ReactNode;children:React.ReactNode;action?:React.ReactNode}){return <section className="section"><div className="section-head"><h2>{title}</h2>{action}</div>{children}</section>}
function Field({label,children}:{label:React.ReactNode;children:React.ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
function Summary({label,value,strong}:{label:React.ReactNode;value:string;strong?:boolean}){return <div className={`summary-card ${strong?"strong":""}`}><span>{label}</span><b>{value}</b></div>}
function Metric({label,value,strong}:{label:React.ReactNode;value:string;strong?:boolean}){return <div className={`metric ${strong?"strong":""}`}><span>{label}</span><b>{value}</b></div>}
function ChildCard({title,t,mode,setMode,manual,setManual,currency,setCurrency}:{title:React.ReactNode;t:(en:string,zh:string)=>string;mode:ChildMode;setMode:(v:ChildMode)=>void;manual:number;setManual:(v:number)=>void;currency:Currency;setCurrency:(v:Currency)=>void}){
  return <div className="child-card"><h3>{title}</h3><Field label={t("Calculation Mode","计算模式")}><select value={mode} onChange={e=>setMode(e.target.value as ChildMode)}>{childModes.map(x=><option key={x} value={x}>{x==="手动成本"?t("Manual Cost","手动成本"):x}</option>)}</select></Field>{mode==="手动成本"&&<><Field label={t("Manual Cost / Pax","手动成本 / 人")}><input type="number" value={manual} onChange={e=>setManual(Number(e.target.value)||0)}/></Field><Field label={t("Currency","币种")}><select value={currency} onChange={e=>setCurrency(e.target.value as Currency)}>{currencies.map(c=><option key={c} value={c}>{c==="其他"?t("Other","其他"):c}</option>)}</select></Field></>}</div>
}
