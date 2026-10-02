"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalcMode, ChildMode, Currency, LeaderCostRow, ProfitMode, TravelerCostRow,
  childRatio, computeProfit, currencyRate, leaderRowTotal, roundUpTo,
  travelerRowPerPax, travelerRowTotal
} from "@/lib/calculations";

const calcModes: CalcMode[] = ["每人", "每人每天", "整团", "整团每天"];
const currencies: Currency[] = ["RM", "RMB", "USD", "JPY", "KRW", "THB", "VND", "其他"];
const childModes: ChildMode[] = ["50%","60%","65%","70%","75%","80%","85%","90%","95%","100%","手动成本"];
const profitModes: ProfitMode[] = ["固定金额", "按成本加价率", "按售价毛利率"];
const travelerTypes = ["成人不含领队","成人含领队","小孩含床不含领队","小孩含床含领队","小孩不含床不含领队","小孩不含床含领队"] as const;
type TravelerType = typeof travelerTypes[number];
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

const defaultLeaderRows: LeaderCostRow[] = [
  { id: uid(), item: "机票", unitPrice: 0, qty: 1, currency: "RM", note: "" },
  { id: uid(), item: "单房", unitPrice: 0, qty: 1, currency: "RM", note: "" },
  { id: uid(), item: "工钱", unitPrice: 0, qty: 1, currency: "RM", note: "" },
  { id: uid(), item: "Bonus", unitPrice: 0, qty: 1, currency: "RM", note: "" },
  { id: uid(), item: "其他", unitPrice: 0, qty: 1, currency: "RM", note: "" },
];

export default function QuotationCalculator({workspaceMode=false,quotationId,initialQuotation,currentStaffId="",currentStaffName="",sourceInquiryId="",sourceInquiryNo="",sourceInquirySnapshot}:CalculatorProps) {
  const router = useRouter();
  const resolvedSourceInquiryId=sourceInquiryId||initialQuotation?.source_inquiry_id||initialQuotation?.quotation_data?.sourceInquiryId||"";
  const resolvedSourceInquiryNo=sourceInquiryNo||initialQuotation?.quotation_data?.sourceInquiryNo||"";
  const resolvedSourceInquirySnapshot=sourceInquirySnapshot||initialQuotation?.quotation_data?.sourceInquirySnapshot||null;
  const [quoteTitle, setQuoteTitle] = useState("New Tour Quotation");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [outboundFromAirport, setOutboundFromAirport] = useState("");
  const [outboundToAirport, setOutboundToAirport] = useState("");
  const [outboundFlightNo, setOutboundFlightNo] = useState("");
  const [outboundFlightDate, setOutboundFlightDate] = useState("");
  const [outboundDepartureTime, setOutboundDepartureTime] = useState("");
  const [outboundArrivalTime, setOutboundArrivalTime] = useState("");
  const [outboundNextDay, setOutboundNextDay] = useState(false);
  const [outboundTransitOpen, setOutboundTransitOpen] = useState(false);
  const [outboundTransitFromAirport, setOutboundTransitFromAirport] = useState("");
  const [outboundTransitToAirport, setOutboundTransitToAirport] = useState("");
  const [outboundTransitFlightNo, setOutboundTransitFlightNo] = useState("");
  const [outboundTransitFlightDate, setOutboundTransitFlightDate] = useState("");
  const [outboundTransitDepartureTime, setOutboundTransitDepartureTime] = useState("");
  const [outboundTransitArrivalTime, setOutboundTransitArrivalTime] = useState("");
  const [outboundTransitNextDay, setOutboundTransitNextDay] = useState(false);

  const [returnFromAirport, setReturnFromAirport] = useState("");
  const [returnToAirport, setReturnToAirport] = useState("");
  const [returnFlightNo, setReturnFlightNo] = useState("");
  const [returnFlightDate, setReturnFlightDate] = useState("");
  const [returnDepartureTime, setReturnDepartureTime] = useState("");
  const [returnArrivalTime, setReturnArrivalTime] = useState("");
  const [returnNextDay, setReturnNextDay] = useState(false);
  const [returnTransitOpen, setReturnTransitOpen] = useState(false);
  const [returnTransitFromAirport, setReturnTransitFromAirport] = useState("");
  const [returnTransitToAirport, setReturnTransitToAirport] = useState("");
  const [returnTransitFlightNo, setReturnTransitFlightNo] = useState("");
  const [returnTransitFlightDate, setReturnTransitFlightDate] = useState("");
  const [returnTransitDepartureTime, setReturnTransitDepartureTime] = useState("");
  const [returnTransitArrivalTime, setReturnTransitArrivalTime] = useState("");
  const [returnTransitNextDay, setReturnTransitNextDay] = useState(false);

  const [flightTotalPrice, setFlightTotalPrice] = useState<number | "">("");
  const [flightPriceCurrency, setFlightPriceCurrency] = useState<Currency>("RM");
  const [customerName, setCustomerName] = useState("");
  const [status, setStatus] = useState<QuoteStatus>("draft");
  const [tourGroupId, setTourGroupId] = useState("");
  const [tourGroups, setTourGroups] = useState<any[]>([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const baselineRef = useRef("");
  const commercialBaselineRef = useRef("");
  const [tourCode, setTourCode] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [op, setOp] = useState(currentStaffName);
  const [supplier, setSupplier] = useState("");
  const [pax, setPax] = useState(1);
  const [mainCurrency, setMainCurrency] = useState<Currency>("RMB");
  const [mainRate, setMainRate] = useState(0.62);
  const [travelerRows, setTravelerRows] = useState<TravelerCostRow[]>(defaultTravelerRows);
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
    if (count >= 1 && count <= 9) return { code:"FIT", label:"FIT Ticket｜散票", state:"fit" };
    if (count >= 10 && count <= 200) return { code:"GIT", label:"GIT｜团体票", state:"git" };
    if (count > 200) return { code:"REVIEW", label:"Manual Review｜需人工确认", state:"review" };
    return { code:"", label:"—", state:"pending" };
  }, [pax]);

  const inferNextDay = (departure:string, arrival:string) => {
    if (!/^\d{2}:\d{2}$/.test(departure) || !/^\d{2}:\d{2}$/.test(arrival)) return false;
    const [dh,dm]=departure.split(":").map(Number);
    const [ah,am]=arrival.split(":").map(Number);
    const departureMinutes=dh*60+dm;
    const arrivalMinutes=ah*60+am;
    return arrivalMinutes < departureMinutes;
  };

  useEffect(() => {
    setOutboundNextDay(inferNextDay(outboundDepartureTime,outboundArrivalTime));
  }, [outboundDepartureTime,outboundArrivalTime]);

  useEffect(() => {
    setReturnNextDay(inferNextDay(returnDepartureTime,returnArrivalTime));
  }, [returnDepartureTime,returnArrivalTime]);

  // Sync the fixed ground quote row with the quotation's main currency.
  useEffect(() => {
    setTravelerRows(rows => rows.map((row,index) =>
      index === 0 ? {...row,item:"地接报价",direction:"cost",currency:mainCurrency} : row
    ));
  }, [mainCurrency]);

  useEffect(() => {
    setOutboundTransitNextDay(inferNextDay(outboundTransitDepartureTime,outboundTransitArrivalTime));
  }, [outboundTransitDepartureTime,outboundTransitArrivalTime]);

  useEffect(() => {
    setReturnTransitNextDay(inferNextDay(returnTransitDepartureTime,returnTransitArrivalTime));
  }, [returnTransitDepartureTime,returnTransitArrivalTime]);


  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/internal-groups", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setTourGroups(Array.isArray(data.groups) ? data.groups : []);
      } catch {}
    };
    load();

    try {
      const source = initialQuotation?.quotation_data || (!workspaceMode ? JSON.parse(localStorage.getItem("happy-quotation-v1") || "{}") : {});
      if (initialQuotation) {
        setQuoteTitle(initialQuotation.title || "Quotation");
        setDestination(initialQuotation.destination || "");
        setDepartureDate(initialQuotation.departure_date || "");
        setReturnDate(initialQuotation.return_date || "");
        setCustomerName(initialQuotation.customer_name || "");
        setStatus(initialQuotation.status || "draft");
        setTourGroupId(initialQuotation.tour_group_id || "");
        setTourCode(initialQuotation.tour_code || "");
        setBusinessType(initialQuotation.business_type || "");
        setSupplier(initialQuotation.supplier || "");
        setPax(Number(initialQuotation.pax) || 1);
      }
      Object.entries(source).forEach(([k, v]) => {
        const setters: Record<string, (x: any) => void> = {
          tourCode:setTourCode,businessType:setBusinessType,op:setOp,supplier:setSupplier,pax:setPax,mainCurrency:setMainCurrency,mainRate:setMainRate,
          outboundFromAirport:setOutboundFromAirport,outboundToAirport:setOutboundToAirport,outboundFlightNo:setOutboundFlightNo,outboundFlightDate:setOutboundFlightDate,outboundDepartureTime:setOutboundDepartureTime,outboundArrivalTime:setOutboundArrivalTime,outboundNextDay:setOutboundNextDay,
          outboundTransitOpen:setOutboundTransitOpen,outboundTransitFromAirport:setOutboundTransitFromAirport,outboundTransitToAirport:setOutboundTransitToAirport,outboundTransitFlightNo:setOutboundTransitFlightNo,outboundTransitFlightDate:setOutboundTransitFlightDate,outboundTransitDepartureTime:setOutboundTransitDepartureTime,outboundTransitArrivalTime:setOutboundTransitArrivalTime,outboundTransitNextDay:setOutboundTransitNextDay,
          returnFromAirport:setReturnFromAirport,returnToAirport:setReturnToAirport,returnFlightNo:setReturnFlightNo,returnFlightDate:setReturnFlightDate,returnDepartureTime:setReturnDepartureTime,returnArrivalTime:setReturnArrivalTime,returnNextDay:setReturnNextDay,
          returnTransitOpen:setReturnTransitOpen,returnTransitFromAirport:setReturnTransitFromAirport,returnTransitToAirport:setReturnTransitToAirport,returnTransitFlightNo:setReturnTransitFlightNo,returnTransitFlightDate:setReturnTransitFlightDate,returnTransitDepartureTime:setReturnTransitDepartureTime,returnTransitArrivalTime:setReturnTransitArrivalTime,returnTransitNextDay:setReturnTransitNextDay,
          flightTotalPrice:setFlightTotalPrice,flightPriceCurrency:setFlightPriceCurrency,
          travelerRows:setTravelerRows,leaderRows:setLeaderRows,leaderOpen:setLeaderOpen,singleRoomAmount:setSingleRoomAmount,singleRoomCurrency:setSingleRoomCurrency,profitMode:setProfitMode,profitRate:setProfitRate,minProfit:setMinProfit,maxProfit:setMaxProfit,
          fixedProfit:setFixedProfit,roundUnit:setRoundUnit,childBedMode:setChildBedMode,childBedManual:setChildBedManual,childBedCurrency:setChildBedCurrency,
          childNoBedMode:setChildNoBedMode,childNoBedManual:setChildNoBedManual,childNoBedCurrency:setChildNoBedCurrency,selectedType:setSelectedType,manualQuote:setManualQuote
        };
        setters[k]?.(v);
      });
    } catch {}
    setHydrated(true);
  }, [initialQuotation, workspaceMode]);

  useEffect(() => {
    if (!hydrated) return;
    const state = {tourCode,businessType,op,supplier,pax,mainCurrency,mainRate,
      outboundFromAirport,outboundToAirport,outboundFlightNo,outboundFlightDate,outboundDepartureTime,outboundArrivalTime,outboundNextDay,
      outboundTransitOpen,outboundTransitFromAirport,outboundTransitToAirport,outboundTransitFlightNo,outboundTransitFlightDate,outboundTransitDepartureTime,outboundTransitArrivalTime,outboundTransitNextDay,
      returnFromAirport,returnToAirport,returnFlightNo,returnFlightDate,returnDepartureTime,returnArrivalTime,returnNextDay,
      returnTransitOpen,returnTransitFromAirport,returnTransitToAirport,returnTransitFlightNo,returnTransitFlightDate,returnTransitDepartureTime,returnTransitArrivalTime,returnTransitNextDay,
      flightTotalPrice,flightPriceCurrency,
      travelerRows,leaderRows,leaderOpen,singleRoomAmount,singleRoomCurrency,profitMode,profitRate,minProfit,maxProfit,fixedProfit,roundUnit,childBedMode,childBedManual,childBedCurrency,childNoBedMode,childNoBedManual,childNoBedCurrency,selectedType,manualQuote};
    localStorage.setItem("happy-quotation-v1", JSON.stringify(state));
  }, [hydrated,tourCode,businessType,op,supplier,pax,mainCurrency,mainRate,
  outboundFromAirport,outboundToAirport,outboundFlightNo,outboundFlightDate,outboundDepartureTime,outboundArrivalTime,outboundNextDay,
  outboundTransitOpen,outboundTransitFromAirport,outboundTransitToAirport,outboundTransitFlightNo,outboundTransitFlightDate,outboundTransitDepartureTime,outboundTransitArrivalTime,outboundTransitNextDay,
  returnFromAirport,returnToAirport,returnFlightNo,returnFlightDate,returnDepartureTime,returnArrivalTime,returnNextDay,
  returnTransitOpen,returnTransitFromAirport,returnTransitToAirport,returnTransitFlightNo,returnTransitFlightDate,returnTransitDepartureTime,returnTransitArrivalTime,returnTransitNextDay,
  flightTotalPrice,flightPriceCurrency,
  travelerRows,leaderRows,leaderOpen,singleRoomAmount,singleRoomCurrency,profitMode,profitRate,minProfit,maxProfit,fixedProfit,roundUnit,childBedMode,childBedManual,childBedCurrency,childNoBedMode,childNoBedManual,childNoBedCurrency,selectedType,manualQuote]);

  const currentSnapshot = JSON.stringify({
    quoteTitle,destination,departureDate,returnDate,customerName,status,tourGroupId,
    outboundFromAirport,outboundToAirport,outboundFlightNo,outboundFlightDate,outboundDepartureTime,outboundArrivalTime,outboundNextDay,
    outboundTransitOpen,outboundTransitFromAirport,outboundTransitToAirport,outboundTransitFlightNo,outboundTransitFlightDate,outboundTransitDepartureTime,outboundTransitArrivalTime,outboundTransitNextDay,
    returnFromAirport,returnToAirport,returnFlightNo,returnFlightDate,returnDepartureTime,returnArrivalTime,returnNextDay,
    returnTransitOpen,returnTransitFromAirport,returnTransitToAirport,returnTransitFlightNo,returnTransitFlightDate,returnTransitDepartureTime,returnTransitArrivalTime,returnTransitNextDay,
    flightTotalPrice,flightPriceCurrency,
    tourCode,businessType,op,supplier,pax,mainCurrency,mainRate,
    travelerRows,leaderRows,leaderOpen,singleRoomAmount,singleRoomCurrency,profitMode,profitRate,minProfit,maxProfit,fixedProfit,roundUnit,
    childBedMode,childBedManual,childBedCurrency,childNoBedMode,childNoBedManual,childNoBedCurrency,
    selectedType,manualQuote
  });

  const currentCommercialSnapshot = JSON.stringify({
    supplier,pax,mainCurrency,mainRate,
    flightTotalPrice,flightPriceCurrency,
    travelerRows,leaderRows,
    singleRoomAmount,singleRoomCurrency,
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

  const itinerarySummary = useMemo(() => {
    const addDays = (date:string, days:number) => {
      if (!date) return "";
      const [year,month,day] = date.split("-").map(Number);
      const d = new Date(Date.UTC(year, month - 1, day));
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0,10);
    };
    const diffDays = (start:string, end:string) => {
      if (!start || !end) return 0;
      const [sy,sm,sd] = start.split("-").map(Number);
      const [ey,em,ed] = end.split("-").map(Number);
      const a = Date.UTC(sy, sm - 1, sd);
      const b = Date.UTC(ey, em - 1, ed);
      return Math.round((b-a)/86400000);
    };
    const finalReturnFlightDate = returnTransitOpen && returnTransitFlightDate ? returnTransitFlightDate : returnFlightDate;
    const finalReturnNextDay = returnTransitOpen && returnTransitFlightDate ? returnTransitNextDay : returnNextDay;
    const arrivalReturnDate = finalReturnFlightDate ? addDays(finalReturnFlightDate, finalReturnNextDay ? 1 : 0) : "";
    const days = departureDate && arrivalReturnDate ? diffDays(departureDate, arrivalReturnDate) + 1 : 0;

    let nights = 0;
    const finalOutboundFlightDate = outboundTransitOpen && outboundTransitFlightDate ? outboundTransitFlightDate : outboundFlightDate;
    const finalOutboundNextDay = outboundTransitOpen && outboundTransitFlightDate ? outboundTransitNextDay : outboundNextDay;
    const finalOutboundArrivalTime = outboundTransitOpen && outboundTransitFlightDate ? outboundTransitArrivalTime : outboundArrivalTime;
    if (finalOutboundFlightDate && returnFlightDate) {
      let hotelStart = finalOutboundFlightDate;
      if (finalOutboundNextDay) {
        const arrivalMinutes = finalOutboundArrivalTime ? Number(finalOutboundArrivalTime.slice(0,2))*60 + Number(finalOutboundArrivalTime.slice(3,5)) : 9999;
        hotelStart = arrivalMinutes <= 180 ? finalOutboundFlightDate : addDays(finalOutboundFlightDate,1);
      }
      nights = Math.max(0, diffDays(hotelStart, returnFlightDate));
    }
    return {
      returnDate: arrivalReturnDate,
      days,
      nights,
      label: days ? `${days}D${nights}N` : ""
    };
  }, [departureDate,outboundFlightDate,outboundArrivalTime,outboundNextDay,outboundTransitOpen,outboundTransitFlightDate,outboundTransitArrivalTime,outboundTransitNextDay,returnFlightDate,returnNextDay,returnTransitOpen,returnTransitFlightDate,returnTransitNextDay]);

  useEffect(() => {
    setDepartureDate(outboundFlightDate);
  }, [outboundFlightDate]);

  useEffect(() => {
    setReturnDate(itinerarySummary.returnDate);
  }, [itinerarySummary.returnDate]);

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

  const calc = useMemo(() => {
    const safePax = Math.max(1, Number(pax) || 1);
    const travelerPerPax = travelerRows.reduce((s,r) => s + travelerRowPerPax(r,safePax,mainCurrency,mainRate), 0);
    const leaderTotal = leaderRows.reduce((s,r) => s + leaderRowTotal(r,mainCurrency,mainRate), 0);
    const leaderPerPax = leaderTotal / safePax;

    const ratioEligible = travelerRows.filter(r => r.childRatioApplicable).reduce((s,r)=>s+travelerRowPerPax(r,safePax,mainCurrency,mainRate),0);
    const ratioExcluded = travelerRows.filter(r => !r.childRatioApplicable).reduce((s,r)=>s+travelerRowPerPax(r,safePax,mainCurrency,mainRate),0);

    const childCost = (mode: ChildMode, manual: number, curr: Currency) => {
      const ratio = childRatio(mode);
      if (ratio === null) return (Number(manual)||0) * currencyRate(curr,mainCurrency,mainRate);
      return ratioEligible * ratio + ratioExcluded;
    };

    const childBed = childCost(childBedMode, childBedManual, childBedCurrency);
    const childNoBed = childCost(childNoBedMode, childNoBedManual, childNoBedCurrency);
    const make = (cost:number) => {
      const profit = computeProfit(cost,profitMode,profitRate,Number(minProfit)||0,maxProfit,fixedProfit);
      return {cost,profit,suggested:cost+profit};
    };
    return {
      travelerPerPax, leaderTotal, leaderPerPax,
      adultNoLeader: make(travelerPerPax),
      adultLeader: make(travelerPerPax + leaderPerPax),
      childBedNoLeader: make(childBed),
      childBedLeader: make(childBed + leaderPerPax),
      childNoBedNoLeader: make(childNoBed),
      childNoBedLeader: make(childNoBed + leaderPerPax),
    };
  }, [pax,travelerRows,leaderRows,mainCurrency,mainRate,profitMode,profitRate,minProfit,maxProfit,fixedProfit,childBedMode,childBedManual,childBedCurrency,childNoBedMode,childNoBedManual,childNoBedCurrency]);

  const hasLeader = leaderRows.some(r => (Number(r.unitPrice)||0) > 0 && (Number(r.qty)||0) > 0);

  const toNoLeaderType = (type: TravelerType): TravelerType => ({
    "成人含领队":"成人不含领队",
    "小孩含床含领队":"小孩含床不含领队",
    "小孩不含床含领队":"小孩不含床不含领队",
    "成人不含领队":"成人不含领队",
    "小孩含床不含领队":"小孩含床不含领队",
    "小孩不含床不含领队":"小孩不含床不含领队",
  } as Record<TravelerType,TravelerType>)[type];

  const isLeaderType = (type: TravelerType) => !type.includes("不含领队");

  const effectiveSelectedType = (!hasLeader && isLeaderType(selectedType))
    ? toNoLeaderType(selectedType)
    : selectedType;

  const selected = ({
    "成人不含领队": calc.adultNoLeader,
    "成人含领队": calc.adultLeader,
    "小孩含床不含领队": calc.childBedNoLeader,
    "小孩含床含领队": calc.childBedLeader,
    "小孩不含床不含领队": calc.childNoBedNoLeader,
    "小孩不含床含领队": calc.childNoBedLeader,
  } as Record<TravelerType, {cost:number;profit:number;suggested:number}>)[effectiveSelectedType];

  const selectedIncludesLeader = isLeaderType(effectiveSelectedType);
  const selectedTravelerLabel = travelerBaseLabel(effectiveSelectedType);
  const selectedTravelerCost = ({
    "成人不含领队": calc.adultNoLeader.cost,
    "成人含领队": calc.adultNoLeader.cost,
    "小孩含床不含领队": calc.childBedNoLeader.cost,
    "小孩含床含领队": calc.childBedNoLeader.cost,
    "小孩不含床不含领队": calc.childNoBedNoLeader.cost,
    "小孩不含床含领队": calc.childNoBedNoLeader.cost,
  } as Record<TravelerType, number>)[effectiveSelectedType];
  const selectedSummaryLabel = `${selectedTravelerLabel} · ${selectedIncludesLeader ? "含领队" : "不含领队"}`;

  const finalQuote = manualQuote === "" ? roundUpTo(selected.suggested, roundUnit) : Number(manualQuote);
  const finalProfit = finalQuote - selected.cost;
  const finalMargin = finalQuote ? finalProfit / finalQuote : 0;

  useEffect(() => {
    if (!hasLeader && isLeaderType(selectedType)) {
      setSelectedType(toNoLeaderType(selectedType));
      setManualQuote("");
    }
  }, [hasLeader, selectedType]);


  const setTraveler = (id:string, patch:Partial<TravelerCostRow>) => setTravelerRows(rows => rows.map(r => r.id === id ? {...r,...patch}:r));
  const addTraveler = () => setTravelerRows(rows => [...rows,{id:uid(),item:"",direction:"cost",mode:"每人",unitPrice:"",qty:1,currency:"RM",childRatioApplicable:false,note:""}]);
  const duplicateTraveler = (id:string) => setTravelerRows(rows => { const r=rows.find(x=>x.id===id); return r ? [...rows,{...r,id:uid(),item:r.item ? `${r.item} Copy` : ""}] : rows; });
  const removeTraveler = (id:string) => setTravelerRows(rows => rows.length > 1 ? rows.filter(r=>r.id!==id):rows);
  const setLeader = (id:string, patch:Partial<LeaderCostRow>) => setLeaderRows(rows => rows.map(r => r.id===id?{...r,...patch}:r));

  const saveQuotation = async (): Promise<boolean> => {
    setSaving(true);
    setSaveMessage("");

    const quotationData = {tourCode,businessType,op:op || currentStaffName,opStaffId:initialQuotation?.quotation_data?.opStaffId || initialQuotation?.owner_id || currentStaffId,supplier,pax,mainCurrency,mainRate,
      outboundFromAirport,outboundToAirport,outboundFlightNo,outboundFlightDate,outboundDepartureTime,outboundArrivalTime,outboundNextDay,
      outboundTransitOpen,outboundTransitFromAirport,outboundTransitToAirport,outboundTransitFlightNo,outboundTransitFlightDate,outboundTransitDepartureTime,outboundTransitArrivalTime,outboundTransitNextDay,
      returnFromAirport,returnToAirport,returnFlightNo,returnFlightDate,returnDepartureTime,returnArrivalTime,returnNextDay,
      returnTransitOpen,returnTransitFromAirport,returnTransitToAirport,returnTransitFlightNo,returnTransitFlightDate,returnTransitDepartureTime,returnTransitArrivalTime,returnTransitNextDay,
      flightTotalPrice,flightPriceCurrency,flightTicketType:flightTicketType.code,
      itineraryDays:itinerarySummary.days,itineraryNights:itinerarySummary.nights,itineraryLabel:itinerarySummary.label,
      travelerRows,leaderRows,leaderOpen,singleRoomAmount,singleRoomCurrency,hasLeader,profitMode,profitRate,minProfit,maxProfit,fixedProfit,roundUnit,childBedMode,childBedManual,childBedCurrency,childNoBedMode,childNoBedManual,childNoBedCurrency,selectedType:effectiveSelectedType,manualQuote,sourceInquiryId:resolvedSourceInquiryId,sourceInquiryNo:resolvedSourceInquiryNo,sourceInquirySnapshot:resolvedSourceInquirySnapshot};
    const payload = {
      source_inquiry_id: resolvedSourceInquiryId || "",
      tour_group_id: tourGroupId || "",
      tour_code: tourCode,
      title: quoteTitle || tourCode || "Untitled Quotation",
      destination: destination || "",
      departure_date: departureDate || "",
      return_date: returnDate || "",
      business_type: businessType || "",
      customer_name: customerName || "",
      supplier: supplier || "",
      pax,
      status,
      total_cost: selected.cost,
      selling_price: finalQuote,
      profit: finalProfit,
      margin: finalMargin,
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
          setSaveMessage("Session expired. Please login again.");
          setTimeout(() => router.push("/login"), 700);
          setSaving(false);
          return false;
        } else {
          setSaveMessage(data?.error || "Unable to save quotation.");
          setSaving(false);
          return false;
        }
      } else {
        setSaveMessage(data?.review_required?"Saved · Revision Required":"Saved");
        baselineRef.current = currentSnapshot;
        commercialBaselineRef.current = currentCommercialSnapshot;
        setIsDirty(false);
        if(data?.review_required) setStatus("revision_required");
        if (!quotationId && data.id) router.replace("/quotations/" + data.id);
        router.refresh();
      }
    } catch {
      setSaveMessage("Unable to save quotation. Please try again.");
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
        setSaveMessage(data?.error||"Unable to submit for review.");
        return;
      }
      setStatus("under_review");
      setSaveMessage("Submitted for management review");
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
    if (!confirm("确认重置当前报价？未保存的修改会被清空。")) return;

    setQuoteTitle("New Tour Quotation");
    setDestination("");
    setDepartureDate("");
    setReturnDate("");
    setOutboundFromAirport("");
    setOutboundToAirport("");
    setOutboundFlightNo("");
    setOutboundFlightDate("");
    setOutboundDepartureTime("");
    setOutboundArrivalTime("");
    setOutboundNextDay(false);
    setOutboundTransitOpen(false);
    setOutboundTransitFromAirport("");
    setOutboundTransitToAirport("");
    setOutboundTransitFlightNo("");
    setOutboundTransitFlightDate("");
    setOutboundTransitDepartureTime("");
    setOutboundTransitArrivalTime("");
    setOutboundTransitNextDay(false);
    setReturnFromAirport("");
    setReturnToAirport("");
    setReturnFlightNo("");
    setReturnFlightDate("");
    setReturnDepartureTime("");
    setReturnArrivalTime("");
    setReturnNextDay(false);
    setReturnTransitOpen(false);
    setReturnTransitFromAirport("");
    setReturnTransitToAirport("");
    setReturnTransitFlightNo("");
    setReturnTransitFlightDate("");
    setReturnTransitDepartureTime("");
    setReturnTransitArrivalTime("");
    setReturnTransitNextDay(false);
    setFlightTotalPrice("");
    setFlightPriceCurrency("RM");
    setCustomerName("");
    setStatus("draft");
    setTourGroupId("");

    setTourCode("");
    setBusinessType("");
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

    localStorage.removeItem("happy-quotation-v1");
  };

  const matrix = [
    ["成人（双人一房）", calc.adultNoLeader, calc.adultLeader],
    ["小孩加床", calc.childBedNoLeader, calc.childBedLeader],
    ["小孩不加床", calc.childNoBedNoLeader, calc.childNoBedLeader],
  ] as const;

  return <main className="app-shell">
    {workspaceMode&&resolvedSourceInquiryId&&<section className="quote-source-inquiry">
      <div>
        <span>SOURCE INQUIRY｜来源询价</span>
        <strong>{resolvedSourceInquiryNo||"Linked Inquiry"}</strong>
        {resolvedSourceInquirySnapshot&&<small>{[resolvedSourceInquirySnapshot.destination,resolvedSourceInquirySnapshot.daysCount&&resolvedSourceInquirySnapshot.nightsCount?`${resolvedSourceInquirySnapshot.daysCount}D${resolvedSourceInquirySnapshot.nightsCount}N`:"",resolvedSourceInquirySnapshot.pax?`${resolvedSourceInquirySnapshot.pax} Pax`:""].filter(Boolean).join(" · ")}</small>}
      </div>
      <button className="btn" type="button" onClick={()=>{const href="/inquiries/"+resolvedSourceInquiryId;if(isDirty)setPendingHref(href);else router.push(href);}}>Open Inquiry</button>
    </section>}
    <header className="topbar">
      <div>
        <div className="eyebrow">HAPPY EXPRESS TRAVEL</div>
        <h1>Outbound Quotation</h1>
        <p>Outbound Tour Quotation Calculator</p>
      </div>
      <div className="top-actions quote-top-actions no-print">
        {workspaceMode && isDirty && <span className="unsaved-badge">Unsaved changes</span>}
        {workspaceMode && <button className="btn primary" onClick={()=>void saveQuotation()} disabled={saving}>{saving?"Saving...":"Save Quotation"}</button>}
        {workspaceMode&&displayStatus==="under_review"&&<span className="quote-editor-review-state">Under Review</span>}
        {workspaceMode&&displayStatus==="ready"&&<span className="quote-editor-review-state ready">Ready</span>}
        {workspaceMode&&status==="ready"&&commercialDirty&&<span className="quote-commercial-change-note">Commercial changes pending save</span>}
        <button className="btn ghost quote-action-secondary" onClick={()=>window.print()}>Print / PDF</button>
        <button className="btn danger quote-action-danger" onClick={resetAll}>Reset</button>
      </div>
    </header>

    <section className="summary-grid">
      <Summary label={`旅客成本 / ${selectedTravelerLabel}`} value={money(selectedTravelerCost)} />
      <Summary label={`领队分摊 / ${selectedTravelerLabel}`} value={selectedIncludesLeader ? money(calc.leaderPerPax) : "—"} />
      <Summary label={`系统建议售价 / ${selectedSummaryLabel}`} value={money(selected.suggested)} />
      <Summary label={`最终报价 / ${selectedSummaryLabel}`} value={money(finalQuote)} strong />
    </section>

    {workspaceMode && <section className="quote-meta-panel">
      <div className="quote-meta-grid">
        <Field label="Quotation Title"><input value={quoteTitle} onChange={e=>setQuoteTitle(e.target.value)} placeholder="例如：江西 8D7N · HT Group" /></Field>
        <Field label="Destination"><input value={destination} onChange={e=>setDestination(e.target.value)} placeholder="China / Japan / Thailand" /></Field>
        <Field label="Departure Date"><input type="text" value={formatDisplayDate(departureDate)} readOnly placeholder="—" /></Field>
        <Field label="Return Date (Arrival)"><input type="text" value={formatDisplayDate(returnDate)} readOnly placeholder="—" /></Field>
        <Field label="Customer"><input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Customer / Company" /></Field>
        <Field label="Tour Group"><select value={tourGroupId} onChange={e=>setTourGroupId(e.target.value)}><option value="">Unclassified</option>{tourGroups.map((g:any)=><option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
        <Field label="Status"><div className={"quote-status-readonly status-"+displayStatus}>{displayStatus==="under_review"?"Under Review":displayStatus==="revision_required"?"Revision Required":displayStatus.charAt(0).toUpperCase()+displayStatus.slice(1)}</div></Field>
      </div>

      <div className="flight-info-card">
        <div className="flight-info-head">
          <div>
            <span className="page-kicker">FLIGHT INFORMATION</span>
            <h3>航班信息</h3>
          </div>
          {itinerarySummary.label && <div className="itinerary-pill">
            <strong>{itinerarySummary.days}天{itinerarySummary.nights}晚</strong>
            <span>{itinerarySummary.label}</span>
          </div>}
        </div>

        <div className="flight-pair-grid">
          <div className="flight-block">
            <div className="flight-block-head">
              <h4>Departure Flight</h4>
              <button type="button" className={"btn transit-toggle "+(outboundTransitOpen?"active":"")} onClick={()=>setOutboundTransitOpen(v=>!v)}>
                {outboundTransitOpen?"− Transit Flight":"+ Transit Flight"}
              </button>
            </div>
            <div className="flight-fields">
              <Field label="From Airport Code"><input maxLength={3} value={outboundFromAirport} onChange={e=>setOutboundFromAirport(e.target.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,3))} placeholder="KUL" /></Field>
              <Field label="To Airport Code"><input maxLength={3} value={outboundToAirport} onChange={e=>setOutboundToAirport(e.target.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,3))} placeholder="CSX" /></Field>
              <Field label="Airline / Flight No."><input value={outboundFlightNo} onChange={e=>setOutboundFlightNo(e.target.value.toUpperCase())} placeholder="CZ1234" /></Field>
              <Field label="Departure Flight Date"><input type="date" value={outboundFlightDate} onChange={e=>{setOutboundFlightDate(e.target.value); setDepartureDate(e.target.value);}} /></Field>
              <TimeField label="Departure Time" value={outboundDepartureTime} setValue={setOutboundDepartureTime} />
              <TimeField label="Arrival Time" value={outboundArrivalTime} setValue={setOutboundArrivalTime} />
              <div className={"flight-day-status "+(outboundDepartureTime&&outboundArrivalTime?(outboundNextDay?"next":"same"):"pending")}>
                <span>{outboundDepartureTime&&outboundArrivalTime?(outboundNextDay?"+1 Next Day":"Same Day"):"Waiting for time"}</span>
              </div>
            </div>

            {outboundTransitOpen && <div className="transit-flight-panel">
              <div className="transit-flight-title"><span>TRANSIT</span><strong>Departure Transit Flight</strong></div>
              <div className="flight-fields">
                <Field label="From Airport Code"><input maxLength={3} value={outboundTransitFromAirport} onChange={e=>setOutboundTransitFromAirport(e.target.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,3))} placeholder="CAN" /></Field>
                <Field label="To Airport Code"><input maxLength={3} value={outboundTransitToAirport} onChange={e=>setOutboundTransitToAirport(e.target.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,3))} placeholder="CSX" /></Field>
                <Field label="Airline / Flight No."><input value={outboundTransitFlightNo} onChange={e=>setOutboundTransitFlightNo(e.target.value.toUpperCase())} placeholder="CZ5678" /></Field>
                <Field label="Transit Flight Date"><input type="date" value={outboundTransitFlightDate} onChange={e=>setOutboundTransitFlightDate(e.target.value)} /></Field>
                <TimeField label="Departure Time" value={outboundTransitDepartureTime} setValue={setOutboundTransitDepartureTime} />
                <TimeField label="Arrival Time" value={outboundTransitArrivalTime} setValue={setOutboundTransitArrivalTime} />
                <div className={"flight-day-status "+(outboundTransitDepartureTime&&outboundTransitArrivalTime?(outboundTransitNextDay?"next":"same"):"pending")}>
                  <span>{outboundTransitDepartureTime&&outboundTransitArrivalTime?(outboundTransitNextDay?"+1 Next Day":"Same Day"):"Waiting for time"}</span>
                </div>
              </div>
            </div>}
          </div>

          <div className="flight-block">
            <div className="flight-block-head">
              <h4>Return Flight</h4>
              <button type="button" className={"btn transit-toggle "+(returnTransitOpen?"active":"")} onClick={()=>setReturnTransitOpen(v=>!v)}>
                {returnTransitOpen?"− Transit Flight":"+ Transit Flight"}
              </button>
            </div>
            <div className="flight-fields">
              <Field label="From Airport Code"><input maxLength={3} value={returnFromAirport} onChange={e=>setReturnFromAirport(e.target.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,3))} placeholder="CSX" /></Field>
              <Field label="To Airport Code"><input maxLength={3} value={returnToAirport} onChange={e=>setReturnToAirport(e.target.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,3))} placeholder="KUL" /></Field>
              <Field label="Airline / Flight No."><input value={returnFlightNo} onChange={e=>setReturnFlightNo(e.target.value.toUpperCase())} placeholder="CZ1235" /></Field>
              <Field label="Return Flight Date"><input type="date" value={returnFlightDate} onChange={e=>setReturnFlightDate(e.target.value)} /></Field>
              <TimeField label="Departure Time" value={returnDepartureTime} setValue={setReturnDepartureTime} />
              <TimeField label="Arrival Time" value={returnArrivalTime} setValue={setReturnArrivalTime} />
              <div className={"flight-day-status "+(returnDepartureTime&&returnArrivalTime?(returnNextDay?"next":"same"):"pending")}>
                <span>{returnDepartureTime&&returnArrivalTime?(returnNextDay?"+1 Next Day":"Same Day"):"Waiting for time"}</span>
              </div>
            </div>

            {returnTransitOpen && <div className="transit-flight-panel">
              <div className="transit-flight-title"><span>TRANSIT</span><strong>Return Transit Flight</strong></div>
              <div className="flight-fields">
                <Field label="From Airport Code"><input maxLength={3} value={returnTransitFromAirport} onChange={e=>setReturnTransitFromAirport(e.target.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,3))} placeholder="CAN" /></Field>
                <Field label="To Airport Code"><input maxLength={3} value={returnTransitToAirport} onChange={e=>setReturnTransitToAirport(e.target.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,3))} placeholder="KUL" /></Field>
                <Field label="Airline / Flight No."><input value={returnTransitFlightNo} onChange={e=>setReturnTransitFlightNo(e.target.value.toUpperCase())} placeholder="CZ5679" /></Field>
                <Field label="Transit Flight Date"><input type="date" value={returnTransitFlightDate} onChange={e=>setReturnTransitFlightDate(e.target.value)} /></Field>
                <TimeField label="Departure Time" value={returnTransitDepartureTime} setValue={setReturnTransitDepartureTime} />
                <TimeField label="Arrival Time" value={returnTransitArrivalTime} setValue={setReturnTransitArrivalTime} />
                <div className={"flight-day-status "+(returnTransitDepartureTime&&returnTransitArrivalTime?(returnTransitNextDay?"next":"same"):"pending")}>
                  <span>{returnTransitDepartureTime&&returnTransitArrivalTime?(returnTransitNextDay?"+1 Next Day":"Same Day"):"Waiting for time"}</span>
                </div>
              </div>
            </div>}
          </div>
        </div>

        <div className="flight-total-price-row">
          <Field label="Flight Total Price｜航班总报价">
            <input type="number" min="0" value={flightTotalPrice} onChange={e=>setFlightTotalPrice(e.target.value===""?"":Number(e.target.value))} placeholder="0.00" />
          </Field>
          <Field label="Currency｜币种">
            <select value={flightPriceCurrency} onChange={e=>setFlightPriceCurrency(e.target.value as Currency)}>{currencies.map(cur=><option key={cur}>{cur}</option>)}</select>
          </Field>
          <div className="field">
            <span>Ticket Type｜机票类型</span>
            <div className={"ticket-type-auto "+flightTicketType.state}>
              <strong>{flightTicketType.label}</strong>
            </div>
          </div>
        </div>
      </div>

      {saveMessage && <div className="save-message">{saveMessage}</div>}
    </section>}

    <Section title="① 基本资料 & 利润设置">
      <div className="form-grid six">
        <Field label="Tour Code"><input value={tourCode} onChange={e=>setTourCode(e.target.value)} /></Field>
        <Field label="业务类型"><input value={businessType} onChange={e=>setBusinessType(e.target.value)} /></Field>
        <Field label="OP"><input value={op || currentStaffName} readOnly /></Field>
        <Field label="Supplier"><input value={supplier} onChange={e=>setSupplier(e.target.value)} /></Field>
        <Field label="人数"><input type="number" min="1" value={pax} onChange={e=>setPax(Number(e.target.value)||1)} /></Field>
        <Field label="主要币种"><select value={mainCurrency} onChange={e=>setMainCurrency(e.target.value as Currency)}>{currencies.map(c=><option key={c}>{c}</option>)}</select></Field>
        <Field label="主要汇率 → RM"><input type="number" step="0.0001" value={mainRate} onChange={e=>setMainRate(Number(e.target.value)||0)} /></Field>
        <Field label="利润方式"><select value={profitMode} onChange={e=>setProfitMode(e.target.value as ProfitMode)}>{profitModes.map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="利润率"><input type="number" step="0.01" value={profitRate} onChange={e=>setProfitRate(Number(e.target.value)||0)} /></Field>
        <Field label="最低毛利 / 人"><input type="number" value={minProfit} onChange={e=>setMinProfit(e.target.value===""?"":Number(e.target.value))} placeholder="可留空" /></Field>
        <Field label="最高毛利 / 人"><input type="number" value={maxProfit} onChange={e=>setMaxProfit(e.target.value===""?"":Number(e.target.value))} placeholder="可留空" /></Field>
        <Field label="固定利润 / 人"><input type="number" value={fixedProfit} onChange={e=>setFixedProfit(e.target.value===""?"":Number(e.target.value))} placeholder="固定金额模式" /></Field>
        <Field label="报价取整"><input type="number" min="1" value={roundUnit} onChange={e=>setRoundUnit(Number(e.target.value)||1)} /></Field>
      </div>
    </Section>

    <Section title="② 旅客成本输入" action={<button className="btn primary no-print" onClick={addTraveler}>＋ Add Cost Row</button>}>
      <div className="table-wrap"><table><thead><tr><th>成本项目</th><th>类型｜Type</th><th>计算方式</th><th>单价</th><th>数量 / 天数</th><th>币种</th><th>汇率</th><th>总成本</th><th>每人成本</th><th>儿童比例</th><th>备注</th><th className="no-print">操作</th></tr></thead>
      <tbody>{travelerRows.map((r,index)=>{
        const isGroundQuote=index===0;
        const rate=currencyRate(r.currency,mainCurrency,mainRate); const total=travelerRowTotal(r,pax,mainCurrency,mainRate); const pp=travelerRowPerPax(r,pax,mainCurrency,mainRate);
        return <tr key={r.id}>
          <td>{isGroundQuote
            ? <input value="地接报价" readOnly className="system-fixed-input" />
            : <input value={r.item} onChange={e=>setTraveler(r.id,{item:e.target.value})}/>}</td>
          <td>{isGroundQuote
            ? <select value="cost" disabled className="system-fixed-input"><option value="cost">成本 +</option></select>
            : <select value={r.direction||"cost"} onChange={e=>setTraveler(r.id,{direction:e.target.value as "cost"|"deduction"})}>
                <option value="cost">成本 +</option>
                <option value="deduction">扣减 −</option>
              </select>}</td>
          <td><select value={r.mode} onChange={e=>setTraveler(r.id,{mode:e.target.value as CalcMode})}>{calcModes.map(x=><option key={x}>{x}</option>)}</select></td>
          <td><input type="number" min="0" value={r.unitPrice} onChange={e=>setTraveler(r.id,{unitPrice:e.target.value===""?"":Math.max(0,Number(e.target.value))})}/></td>
          <td><input type="number" value={r.qty} onChange={e=>setTraveler(r.id,{qty:e.target.value===""?"":Number(e.target.value)})}/></td>
          <td>{isGroundQuote
            ? <select value={mainCurrency} disabled className="system-fixed-input">{currencies.map(c=><option key={c}>{c}</option>)}</select>
            : <select value={r.currency} onChange={e=>setTraveler(r.id,{currency:e.target.value as Currency})}>{currencies.map(c=><option key={c}>{c}</option>)}</select>}</td>
          <td className={rate===0?"warn":""}>{rate || "—"}</td><td className={total<0?"deduction-value":""}>{money(total)}</td><td className={pp<0?"deduction-value":""}>{money(pp)}</td>
          <td><select value={r.childRatioApplicable?"是":"否"} onChange={e=>setTraveler(r.id,{childRatioApplicable:e.target.value==="是"})}><option>是</option><option>否</option></select></td>
          <td><input value={r.note} onChange={e=>setTraveler(r.id,{note:e.target.value})}/></td>
          <td className="row-actions no-print">{isGroundQuote
            ? <span className="fixed-row-label">固定</span>
            : <><button onClick={()=>duplicateTraveler(r.id)}>复制</button><button onClick={()=>removeTraveler(r.id)}>删除</button></>}</td>
        </tr>})}</tbody></table></div>
    </Section>

    <section className="section single-room-section">
      <div className="section-head"><h2>单人房</h2></div>
      <div className="single-room-grid">
        <Field label="手动填写数额"><input type="number" min="0" value={singleRoomAmount} onChange={e=>setSingleRoomAmount(e.target.value===""?"":Number(e.target.value))} placeholder="0.00" /></Field>
        <Field label="币种"><select value={singleRoomCurrency} onChange={e=>setSingleRoomCurrency(e.target.value as Currency)}>{currencies.map(cur=><option key={cur}>{cur}</option>)}</select></Field>
      </div>
    </section>

    <div className="two-col">
      <section className="section leader-toggle-section">
        <div className="section-head leader-toggle-head">
          <button className={"btn leader-toggle-btn "+(leaderOpen?"active":"")} onClick={()=>setLeaderOpen(v=>!v)}>
            领队陪同
          </button>
        </div>
        {leaderOpen && <div className="table-wrap"><table><thead><tr><th>项目</th><th>单价</th><th>数量 / 天数</th><th>币种</th><th>总成本</th><th>每人分摊</th><th>备注</th></tr></thead>
        <tbody>{leaderRows.map(r=>{const total=leaderRowTotal(r,mainCurrency,mainRate);return <tr key={r.id}>
          <td><input value={r.item} onChange={e=>setLeader(r.id,{item:e.target.value})}/></td>
          <td><input type="number" value={r.unitPrice} onChange={e=>setLeader(r.id,{unitPrice:e.target.value===""?"":Number(e.target.value)})}/></td>
          <td><input type="number" value={r.qty} onChange={e=>setLeader(r.id,{qty:e.target.value===""?"":Number(e.target.value)})}/></td>
          <td><select value={r.currency} onChange={e=>setLeader(r.id,{currency:e.target.value as Currency})}>{currencies.map(c=><option key={c}>{c}</option>)}</select></td>
          <td>{money(total)}</td><td>{money(total/Math.max(1,pax))}</td><td><input value={r.note} onChange={e=>setLeader(r.id,{note:e.target.value})}/></td>
        </tr>})}</tbody></table></div>}
      </section>

      <Section title="③ 儿童成本设置">
        <div className="child-grid">
          <ChildCard title="小孩加床｜与2位成人同房 + 1张加床" mode={childBedMode} setMode={setChildBedMode} manual={childBedManual} setManual={setChildBedManual} currency={childBedCurrency} setCurrency={setChildBedCurrency} />
          <ChildCard title="小孩不加床｜与2位成人同房，不另加床" mode={childNoBedMode} setMode={setChildNoBedMode} manual={childNoBedManual} setManual={setChildNoBedManual} currency={childNoBedCurrency} setCurrency={setChildNoBedCurrency} />
        </div>
      </Section>
    </div>

    <Section title="④ 对客报价">
      <div className="quote-panel">
        <Field label="旅客类型"><select value={effectiveSelectedType} onChange={e=>{setSelectedType(e.target.value as TravelerType);setManualQuote("")}}>{travelerTypes.filter(x=>hasLeader || x.includes("不含领队")).map(x=><option key={x} value={x}>{travelerTypeLabel(x)}</option>)}</select></Field>
        <Metric label="成本" value={money(selected.cost)} />
        <Metric label="系统建议价" value={money(selected.suggested)} />
        <Field label="手动最终报价"><input type="number" value={manualQuote} onChange={e=>setManualQuote(e.target.value===""?"":Number(e.target.value))} placeholder={`自动取整 ${roundUnit}`} /></Field>
        <Metric label="最终报价" value={money(finalQuote)} strong />
        <Metric label="最终毛利" value={money(finalProfit)} />
        <Metric label="毛利率" value={pct(finalMargin)} />
      </div>
    </Section>

    <Section title="最终报价矩阵">
      <div className="matrix-wrap"><table className="matrix"><thead><tr><th>旅客类型</th><th>不含领队成本</th><th>不含领队利润</th><th>不含领队建议售价</th>{hasLeader&&<><th>含领队成本</th><th>含领队利润</th><th>含领队建议售价</th></>}</tr></thead><tbody>
        {matrix.map(([label,a,b])=><tr key={label}><td className="label-cell">{label}</td><td>{money(a.cost)}</td><td>{money(a.profit)}</td><td className="sale">{money(a.suggested)}</td>{hasLeader&&<><td>{money(b.cost)}</td><td>{money(b.profit)}</td><td className="sale">{money(b.suggested)}</td></>}</tr>)}
      </tbody></table></div>
    </Section>

    {workspaceMode&&<section className="panel inquiry-workflow-panel quotation-editor-workflow">
      <div className="panel-head inquiry-workflow-panel-head quotation-workflow-compact-head">
        <div>
          <span className="page-kicker">WORKFLOW</span>
          <h2>工作流程</h2>
        </div>
      </div>

      <div className="simple-workflow-grid quotation-workflow-compact system-workflow-grid">
        <div className={"simple-workflow-card "+((displayStatus==="under_review"||displayStatus==="ready")?"complete":"current")}>
          <div className="simple-workflow-card-head">
            <span className="simple-workflow-index">01</span>
            <span className="simple-workflow-state">{(displayStatus==="under_review"||displayStatus==="ready")?"✓ Done":displayStatus==="revision_required"?"Revise":"Current"}</span>
          </div>
          <div className="simple-workflow-title">
            <strong>Quotation</strong>
          </div>
          {(displayStatus==="draft"||displayStatus==="revision_required")&&<div className="simple-workflow-actions">
            <button className="btn" type="button" disabled={saving||!isDirty} onClick={()=>void saveQuotation()}>
              {saving?"Saving...":isDirty?"Save":"Saved ✓"}
            </button>
            {quotationId&&<button className="btn primary" type="button" disabled={saving} onClick={()=>void submitForReview()}>
              {saving?"Working...":displayStatus==="revision_required"?"Resubmit":"Submit"}
            </button>}
          </div>}
        </div>

        <div className="simple-workflow-arrow" aria-hidden="true">→</div>

        <div className={"simple-workflow-card "+(displayStatus==="ready"?"complete":displayStatus==="under_review"?"current":"upcoming")}>
          <div className="simple-workflow-card-head">
            <span className="simple-workflow-index">02</span>
            <span className="simple-workflow-state">{displayStatus==="ready"?"✓ Done":displayStatus==="under_review"?"Reviewing":"Next"}</span>
          </div>
          <div className="simple-workflow-title">
            <strong>Management Review</strong>
          </div>
          {displayStatus==="under_review"&&<div className="quotation-workflow-waiting">Waiting for approval</div>}
        </div>

        <div className="simple-workflow-arrow" aria-hidden="true">→</div>

        <div className={"simple-workflow-card "+(displayStatus==="ready"?"current":"upcoming")}>
          <div className="simple-workflow-card-head">
            <span className="simple-workflow-index">03</span>
            <span className="simple-workflow-state">{displayStatus==="ready"?"Current":"Next"}</span>
          </div>
          <div className="simple-workflow-title">
            <strong>Itinerary</strong>
          </div>
          {displayStatus==="ready"&&resolvedSourceInquiryId&&<div className="simple-workflow-actions">
            <button className="btn primary" type="button" onClick={()=>router.push("/itineraries/new?sourceInquiry="+resolvedSourceInquiryId)}>Create</button>
            <button className="btn" type="button" onClick={()=>router.push("/ai-import?sourceInquiry="+resolvedSourceInquiryId)}>AI</button>
          </div>}
          {displayStatus==="ready"&&!resolvedSourceInquiryId&&<div className="quotation-workflow-waiting">No linked Inquiry</div>}
        </div>
      </div>
    </section>}

    {pendingHref && <div className="unsaved-overlay no-print" role="dialog" aria-modal="true">
      <div className="unsaved-dialog">
        <div className="unsaved-icon">!</div>
        <div>
          <h3>当前报价尚未存档</h3>
          <p>你已经修改了这张报价。离开之前要先保存吗？</p>
        </div>
        <div className="unsaved-actions">
          <button className="btn primary" onClick={saveAndLeave} disabled={saving}>{saving?"Saving...":"Save & Continue"}</button>
          <button className="btn leave-btn" onClick={leaveWithoutSaving} disabled={saving}>Leave Without Saving</button>
          <button className="btn" onClick={()=>setPendingHref(null)} disabled={saving}>Cancel</button>
        </div>
      </div>
    </div>}

    <footer>{workspaceMode ? "报价保存后会同步至公司云端数据库，可在 Quotation Library 重新打开及修改。" : "数据会自动保存在此浏览器 Local Storage。"} 其他非主要币种若未设为「主要币种」，汇率会显示 —，避免静默误算。</footer>
  </main>
}

function Section({title,children,action}:{title:string;children:React.ReactNode;action?:React.ReactNode}){return <section className="section"><div className="section-head"><h2>{title}</h2>{action}</div>{children}</section>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
function TimeField({label,value,setValue}:{label:string;value:string;setValue:(v:string)=>void}){
  const normalize=(raw:string)=>{
    const digits=raw.replace(/\D/g,"").slice(0,4);
    if(digits.length<=2) return digits;
    return digits.slice(0,2)+":"+digits.slice(2);
  };
  const valid=(v:string)=>{
    if(!/^\d{2}:\d{2}$/.test(v)) return v;
    const [h,m]=v.split(":").map(Number);
    if(h>23||m>59) return "";
    return v;
  };
  const meridiem=(()=>{
    const hourMatch=value.match(/^(\d{2})/);
    if(!hourMatch) return "";
    const h=Number(hourMatch[1]);
    if(h>23) return "";
    return h<12?"AM":"PM";
  })();
  return <label className="field time-field">
    <span>{label}</span>
    <div className="time-input-wrap">
      <input
        inputMode="numeric"
        maxLength={5}
        placeholder="HH:MM"
        value={value}
        onChange={e=>setValue(normalize(e.target.value))}
        onBlur={e=>setValue(valid(e.target.value))}
      />
      {meridiem&&<b className="time-meridiem">{meridiem}</b>}
    </div>
  </label>;
}

function Summary({label,value,strong}:{label:string;value:string;strong?:boolean}){return <div className={`summary-card ${strong?"strong":""}`}><span>{label}</span><b>{value}</b></div>}
function Metric({label,value,strong}:{label:string;value:string;strong?:boolean}){return <div className={`metric ${strong?"strong":""}`}><span>{label}</span><b>{value}</b></div>}
function ChildCard({title,mode,setMode,manual,setManual,currency,setCurrency}:{title:string;mode:ChildMode;setMode:(v:ChildMode)=>void;manual:number;setManual:(v:number)=>void;currency:Currency;setCurrency:(v:Currency)=>void}){
  return <div className="child-card"><h3>{title}</h3><Field label="计算模式"><select value={mode} onChange={e=>setMode(e.target.value as ChildMode)}>{childModes.map(x=><option key={x}>{x}</option>)}</select></Field>{mode==="手动成本"&&<><Field label="手动成本 / 人"><input type="number" value={manual} onChange={e=>setManual(Number(e.target.value)||0)}/></Field><Field label="币种"><select value={currency} onChange={e=>setCurrency(e.target.value as Currency)}>{currencies.map(c=><option key={c}>{c}</option>)}</select></Field></>}</div>
}
