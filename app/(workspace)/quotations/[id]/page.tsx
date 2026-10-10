import Link from "next/link";
import { notFound } from "next/navigation";
import QuotationDetailMoreActions from "@/components/QuotationDetailMoreActions";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import QuotationReviewActions from "@/components/QuotationReviewActions";
import QuotationPrintButton from "@/components/QuotationPrintButton";
import QuotationFlightCollapsible from "@/components/QuotationFlightCollapsible";
import {UiText} from "@/components/WorkspaceLanguage";
import {Currency, childExtraRowPerPax, childExtraRowTotal, childSetupCost, currencyRate, leaderRowPerPax, leaderRowTotal, travelerRowPerPax, travelerRowTotal} from "@/lib/calculations";
import {buildQuotationCalculationInput,calculateQuotation} from "@/lib/quotationEngine";

const money=(n:number)=>new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR",minimumFractionDigits:2}).format(n||0).replace("MYR","RM");

export default async function QuotationDetailPage({
  params,
  searchParams
}:{
  params:Promise<{id:string}>;
  searchParams:Promise<{returnTo?:string}>;
}){
  const {id}=await params;
  const sp=await searchParams;
  const token=await internalToken();
  if(!token) notFound();
  const user=await internalUser();
  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_quote",{p_token:token,p_id:id});
  if(error||!data||!data.id) notFound();

  let sourceInquiry:any=null;
  if(data.source_inquiry_id){
    const sourceResult=await db.rpc("staff_get_inquiry",{p_token:token,p_id:data.source_inquiry_id});
    sourceInquiry=sourceResult.data||null;
  }
  const canReview=Boolean(user&&(user.role==="manager"||user.username.toLowerCase()==="long"));
  const canSubmit=Boolean(user&&(canReview||user.id===data.owner_id||user.id===sourceInquiry?.operation_assignee_id));

  const qd=data.quotation_data||{};
  const scenarioPricing=qd.scenarioPricing||null;
  const isScenarioPricing=scenarioPricing?.mode==="scenario";
  const savedScenarioResults=Array.isArray(scenarioPricing?.results)?scenarioPricing.results:[];
  const fi=qd.flightInformation||{};
  const outbound=fi.outbound||{};
  const outboundTransit=fi.outboundTransit||{};
  const returning=fi.returning||{};
  const returnTransit=fi.returnTransit||{};
  const outboundFromAirport=outbound.fromAirport||"";
  const outboundToAirport=outbound.toAirport||"";
  const outboundFlightNo=outbound.flightNo||"";
  const outboundFlightDate=outbound.flightDate||"";
  const outboundDepartureTime=outbound.departureTime||"";
  const outboundArrivalTime=outbound.arrivalTime||"";
  const outboundNextDay=Boolean(outbound.nextDay);
  const outboundTransitOpen=Boolean(fi.outboundTransitOpen);
  const outboundTransitFromAirport=outboundTransit.fromAirport||"";
  const outboundTransitToAirport=outboundTransit.toAirport||"";
  const outboundTransitFlightNo=outboundTransit.flightNo||"";
  const outboundTransitFlightDate=outboundTransit.flightDate||"";
  const outboundTransitDepartureTime=outboundTransit.departureTime||"";
  const outboundTransitArrivalTime=outboundTransit.arrivalTime||"";
  const outboundTransitNextDay=Boolean(outboundTransit.nextDay);
  const returnFromAirport=returning.fromAirport||"";
  const returnToAirport=returning.toAirport||"";
  const returnFlightNo=returning.flightNo||"";
  const returnFlightDate=returning.flightDate||"";
  const returnDepartureTime=returning.departureTime||"";
  const returnArrivalTime=returning.arrivalTime||"";
  const returnNextDay=Boolean(returning.nextDay);
  const returnTransitOpen=Boolean(fi.returnTransitOpen);
  const returnTransitFromAirport=returnTransit.fromAirport||"";
  const returnTransitToAirport=returnTransit.toAirport||"";
  const returnTransitFlightNo=returnTransit.flightNo||"";
  const returnTransitFlightDate=returnTransit.flightDate||"";
  const returnTransitDepartureTime=returnTransit.departureTime||"";
  const returnTransitArrivalTime=returnTransit.arrivalTime||"";
  const returnTransitNextDay=Boolean(returnTransit.nextDay);
  const itineraryDays=Number(qd.itineraryDays)||0;
  const itineraryLabel=qd.itineraryLabel||"";
  const flightTotalPrice=qd.flightTotalPrice===""||qd.flightTotalPrice==null?null:Number(qd.flightTotalPrice);
  const flightPriceCurrency=(qd.flightPriceCurrency||"RM") as Currency;
  const flightPax=Number(qd.pax||data.pax)||0;
  const flightTicketType=flightPax>=1&&flightPax<=9?"fit":flightPax>=10&&flightPax<=200?"git":flightPax>200?"review":"none";
  const managementFlightSummary=[
    outboundFromAirport||outboundToAirport?`${outboundFromAirport||"—"} → ${outboundToAirport||"—"}`:"",
    outboundFlightNo,
    data.departure_date&&data.return_date
      ? `${new Date(data.departure_date+"T00:00:00").toLocaleDateString("en-MY")} → ${new Date(data.return_date+"T00:00:00").toLocaleDateString("en-MY")}`
      : "",
    flightTotalPrice==null?"":`${flightPriceCurrency} ${flightTotalPrice.toLocaleString("en-MY",{minimumFractionDigits:2,maximumFractionDigits:2})}`
  ].filter(Boolean).join(" · ");
  const calculationResult=qd.calculationResult||calculateQuotation(buildQuotationCalculationInput(data));
  const hasLeader=Boolean(calculationResult.hasLeader);
  const singleRoomSupplement=calculationResult.singleRoomSupplement==null?null:Number(calculationResult.singleRoomSupplement);
  const rawReturnTo=String(sp.returnTo||"");
  const returnTo=rawReturnTo.startsWith("/")&&!rawReturnTo.startsWith("//")?rawReturnTo:"/quotations";
  const currentQuoteHref="/quotations/"+id+"?returnTo="+encodeURIComponent(returnTo);
  const canEditQuotation=["draft","revision_required"].includes(String(data.status||"draft"));
  const lockedQuotation=!canEditQuotation;
  const managementPax=Math.max(1,Number(qd.pax||data.pax)||1);
  const managementMainCurrency=(qd.mainCurrency||"RMB") as Currency;
  const managementMainRate=Number(qd.mainRate)||0;
  const managementTravelerRows=Array.isArray(qd.travelerRows)?qd.travelerRows:[];
  const managementLeaderRows=Array.isArray(qd.leaderRows)?qd.leaderRows:[];
  const managementChildBed=qd.childBedSetup||null;
  const managementChildNoBed=qd.childNoBedSetup||null;
  const managementChildBedSummary=managementChildBed?childSetupCost(managementChildBed,managementPax,managementMainCurrency,managementMainRate):null;
  const managementChildNoBedSummary=managementChildNoBed?childSetupCost(managementChildNoBed,managementPax,managementMainCurrency,managementMainRate):null;
  const sanitizeFilePart=(value:unknown)=>String(value??"").replace(/[\\/:*?"<>|]+/g," ").replace(/\s+/g," ").trim();
  const printFileName=[data.quotation_no,data.customer_name,data.destination,data.departure_date].map(sanitizeFilePart).filter(Boolean).join(" - ");
  const managementPricingRows=[
    {type:"成人不含领队",label:"adult",leader:false,value:calculationResult.variants["成人不含领队"]},
    ...(hasLeader?[{type:"成人含领队",label:"adult",leader:true,value:calculationResult.variants["成人含领队"]}]:[]),
    {type:"小孩含床不含领队",label:"childBed",leader:false,value:calculationResult.variants["小孩含床不含领队"]},
    ...(hasLeader?[{type:"小孩含床含领队",label:"childBed",leader:true,value:calculationResult.variants["小孩含床含领队"]}]:[]),
    {type:"小孩不含床不含领队",label:"childNoBed",leader:false,value:calculationResult.variants["小孩不含床不含领队"]},
    ...(hasLeader?[{type:"小孩不含床含领队",label:"childNoBed",leader:true,value:calculationResult.variants["小孩不含床含领队"]}]:[])
  ];
  const selectedPricing=calculationResult.selected;
  const selectedPricingType=String(calculationResult.selectedType||qd.selectedType||"成人不含领队");
  const selectedPricingManual=qd.manualQuote!==""&&qd.manualQuote!=null;

  return <div className="quotation-detail-template">
    <div className="page-head quote-detail-head">
      <div className="quotation-detail-title-block">
        <h1>{data.title||data.quotation_no}</h1>
        <div className="quotation-detail-meta-line">
          <span>{data.quotation_no}</span>
          <span className={"status quotation-header-status status-"+String(data.status||"draft")}>{data.status==="under_review"?<UiText en="Under Review" zh="审核中" />:data.status==="revision_required"?<UiText en="Revision Required" zh="需要修改" />:data.status==="ready"?<UiText en="Ready" zh="已就绪" />:data.status==="sent"?<UiText en="Sent" zh="已发送" />:data.status==="revised"?<UiText en="Revised" zh="已修改" />:data.status==="confirmed"?<UiText en="Confirmed" zh="已确认" />:data.status==="lost"?<UiText en="Lost" zh="未成交" />:data.status==="archived"?<UiText en="Archived" zh="已归档" />:<UiText en="Draft" zh="草稿" />}</span>{lockedQuotation&&<span className="quotation-lock-state"><UiText en="Locked" zh="已锁定" /></span>}
        </div>
      </div>
      <div className="detail-actions">
        <Link className="btn quotation-back-action" href={returnTo}>{returnTo.startsWith("/inquiries/")?<UiText en="‹ Inquiry" zh="‹ 询价" />:<UiText en="‹ Back" zh="‹ 返回" />}</Link><QuotationPrintButton fileName={printFileName}/>
        {canEditQuotation?<Link className="btn" href={"/quotations/"+id+"/edit"}><UiText en="Edit Quotation" zh="编辑报价" /></Link>:<span className="btn quotation-locked-action" aria-disabled="true"><UiText en="Quotation Locked" zh="报价已锁定" /></span>}
        <QuotationDetailMoreActions id={id} />
      </div>
    </div>

    <section className="panel quotation-record-context-panel">
      <div className="panel-head"><h2><UiText en="Customer & Trip" zh="客户与行程" /></h2></div>
      <div className="detail-grid quotation-record-context-grid">
        <Detail label={<UiText en="Customer / Company" zh="客户 / 公司" />} value={data.customer_name||qd.sourceInquirySnapshot?.customerName||"—"}/>
        <Detail label={<UiText en="Contact" zh="联系方式" />} value={qd.customerContact||qd.sourceInquirySnapshot?.contact||"—"}/>
        <Detail label={<UiText en="Departure City" zh="出发城市" />} value={qd.departureCity||qd.sourceInquirySnapshot?.departureCity||"—"}/>
        <Detail label={<UiText en="Destination" zh="目的地" />} value={data.destination||qd.sourceInquirySnapshot?.destination||"—"}/>
        <Detail label={<UiText en="Travel Start Date" zh="出发日期" />} value={data.departure_date?new Date(data.departure_date+"T00:00:00").toLocaleDateString("en-MY"):"—"}/>
        <Detail label={<UiText en="Travel End Date" zh="返程日期" />} value={data.return_date?new Date(data.return_date+"T00:00:00").toLocaleDateString("en-MY"):"—"}/>
        <Detail label={<UiText en="Duration" zh="行程天数" />} value={itineraryLabel||"—"}/>
        <Detail label={<UiText en="Pax" zh="人数" />} value={data.pax||qd.pax||"—"}/>
        <Detail label={<UiText en="Tour Type" zh="团型" />} value={data.tour_type||qd.tourType||"—"}/>
        <Detail label={<UiText en="Supplier" zh="供应商" />} value={data.supplier||qd.supplier||"—"}/>
      </div>
    </section>

{data.source_inquiry_id&&<section className="quote-source-inquiry quote-source-inquiry-detail">
      <div>
        <span><UiText en="SOURCE INQUIRY" zh="来源询价" /></span>
        <strong>{qd.sourceInquiryNo||<UiText en="Linked Inquiry" zh="关联询价" />}</strong>
        {qd.sourceInquirySnapshot&&<small>{[qd.sourceInquirySnapshot.destination,qd.sourceInquirySnapshot.daysCount?`${qd.sourceInquirySnapshot.daysCount} Days`:"",qd.sourceInquirySnapshot.pax?`${qd.sourceInquirySnapshot.pax} Pax`:""].filter(Boolean).join(" · ")}</small>}
      </div>
      <Link className="btn" href={"/inquiries/"+data.source_inquiry_id+"?returnTo="+encodeURIComponent(currentQuoteHref)}><UiText en="Open Inquiry" zh="打开询价" /></Link>
    </section>}

    <QuotationFlightCollapsible
      summary={managementFlightSummary}
      defaultOpen={false}
    >
      <section className="panel quote-flight-panel">
      <div className="quote-flight-summary">
        <Detail label={<UiText en="Departure Date" zh="出发日期" />} value={data.departure_date?new Date(data.departure_date+"T00:00:00").toLocaleDateString("en-MY"):"—"}/>
        <Detail label={<UiText en="Return Date (Arrival)" zh="返程日期（抵达）" />} value={data.return_date?new Date(data.return_date+"T00:00:00").toLocaleDateString("en-MY"):"—"}/>
        <Detail label={<UiText en="Flight Total Price" zh="航班总报价" />} value={flightTotalPrice==null?"—":`${flightPriceCurrency} ${flightTotalPrice.toLocaleString("en-MY",{minimumFractionDigits:2,maximumFractionDigits:2})}`}/>
        <Detail label={<UiText en="Ticket Type" zh="机票类型" />} value={flightTicketType==="fit"?<UiText en="FIT Ticket" zh="散票" />:flightTicketType==="git"?<UiText en="GIT" zh="团体票" />:flightTicketType==="review"?<UiText en="Manual Review" zh="需人工确认" />:"—"}/>
      </div>

      <div className="quote-flight-grid">
        <div className="quote-flight-card">
          <h3><UiText en="Departure Flight" zh="去程航班" /></h3>
          <div className="quote-flight-details">
            <Detail label={<UiText en="Airport Route" zh="机场路线" />} value={outboundFromAirport||outboundToAirport?`${outboundFromAirport||"—"} → ${outboundToAirport||"—"}`:"—"}/>
            <Detail label={<UiText en="Airline / Flight No." zh="航空公司 / 航班号" />} value={outboundFlightNo||"—"}/>
            <Detail label={<UiText en="Flight Date" zh="航班日期" />} value={outboundFlightDate?new Date(outboundFlightDate+"T00:00:00").toLocaleDateString("en-MY"):"—"}/>
            <Detail label={<UiText en="Departure Time" zh="起飞时间" />} value={outboundDepartureTime||"—"}/>
            <Detail label={<UiText en="Arrival Time" zh="抵达时间" />} value={outboundArrivalTime||"—"}/>
            <Detail label={<UiText en="Arrival Day" zh="抵达日" />} value={outboundDepartureTime&&outboundArrivalTime?(outboundNextDay?<UiText en="+1 Next Day" zh="+1 次日" />:<UiText en="Same Day" zh="同日" />):"—"}/>
          </div>
          {outboundTransitOpen && <div className="quote-transit-detail">
            <div className="quote-transit-heading"><span><UiText en="TRANSIT" zh="中转" /></span><strong><UiText en="Departure Transit Flight" zh="去程中转航班" /></strong></div>
            <div className="quote-flight-details">
              <Detail label={<UiText en="Airport Route" zh="机场路线" />} value={outboundTransitFromAirport||outboundTransitToAirport?`${outboundTransitFromAirport||"—"} → ${outboundTransitToAirport||"—"}`:"—"}/>
              <Detail label={<UiText en="Airline / Flight No." zh="航空公司 / 航班号" />} value={outboundTransitFlightNo||"—"}/>
              <Detail label={<UiText en="Flight Date" zh="航班日期" />} value={outboundTransitFlightDate?new Date(outboundTransitFlightDate+"T00:00:00").toLocaleDateString("en-MY"):"—"}/>
              <Detail label={<UiText en="Departure Time" zh="起飞时间" />} value={outboundTransitDepartureTime||"—"}/>
              <Detail label={<UiText en="Arrival Time" zh="抵达时间" />} value={outboundTransitArrivalTime||"—"}/>
              <Detail label={<UiText en="Arrival Day" zh="抵达日" />} value={outboundTransitDepartureTime&&outboundTransitArrivalTime?(outboundTransitNextDay?<UiText en="+1 Next Day" zh="+1 次日" />:<UiText en="Same Day" zh="同日" />):"—"}/>
            </div>
          </div>}
        </div>

        <div className="quote-flight-card">
          <h3><UiText en="Return Flight" zh="返程航班" /></h3>
          <div className="quote-flight-details">
            <Detail label={<UiText en="Airport Route" zh="机场路线" />} value={returnFromAirport||returnToAirport?`${returnFromAirport||"—"} → ${returnToAirport||"—"}`:"—"}/>
            <Detail label={<UiText en="Airline / Flight No." zh="航空公司 / 航班号" />} value={returnFlightNo||"—"}/>
            <Detail label={<UiText en="Flight Date" zh="航班日期" />} value={returnFlightDate?new Date(returnFlightDate+"T00:00:00").toLocaleDateString("en-MY"):"—"}/>
            <Detail label={<UiText en="Departure Time" zh="起飞时间" />} value={returnDepartureTime||"—"}/>
            <Detail label={<UiText en="Arrival Time" zh="抵达时间" />} value={returnArrivalTime||"—"}/>
            <Detail label={<UiText en="Arrival Day" zh="抵达日" />} value={returnDepartureTime&&returnArrivalTime?(returnNextDay?<UiText en="+1 Next Day" zh="+1 次日" />:<UiText en="Same Day" zh="同日" />):"—"}/>
          </div>
          {returnTransitOpen && <div className="quote-transit-detail">
            <div className="quote-transit-heading"><span><UiText en="TRANSIT" zh="中转" /></span><strong><UiText en="Return Transit Flight" zh="返程中转航班" /></strong></div>
            <div className="quote-flight-details">
              <Detail label={<UiText en="Airport Route" zh="机场路线" />} value={returnTransitFromAirport||returnTransitToAirport?`${returnTransitFromAirport||"—"} → ${returnTransitToAirport||"—"}`:"—"}/>
              <Detail label={<UiText en="Airline / Flight No." zh="航空公司 / 航班号" />} value={returnTransitFlightNo||"—"}/>
              <Detail label={<UiText en="Flight Date" zh="航班日期" />} value={returnTransitFlightDate?new Date(returnTransitFlightDate+"T00:00:00").toLocaleDateString("en-MY"):"—"}/>
              <Detail label={<UiText en="Departure Time" zh="起飞时间" />} value={returnTransitDepartureTime||"—"}/>
              <Detail label={<UiText en="Arrival Time" zh="抵达时间" />} value={returnTransitArrivalTime||"—"}/>
              <Detail label={<UiText en="Arrival Day" zh="抵达日" />} value={returnTransitDepartureTime&&returnTransitArrivalTime?(returnTransitNextDay?<UiText en="+1 Next Day" zh="+1 次日" />:<UiText en="Same Day" zh="同日" />):"—"}/>
            </div>
          </div>}
        </div>
      </div>
      </section>
    </QuotationFlightCollapsible>

    <section className="quotation-record-stage quotation-management-costing">
      <section className="panel quotation-record-commercial">
        <div className="panel-head"><h2><UiText en="Commercial Settings" zh="商业设置" /></h2></div>
        <div className="detail-grid quotation-record-settings-grid">
          <Detail label={<UiText en="Pricing Structure" zh="报价结构" />} value={isScenarioPricing?<UiText en="Scenario Package" zh="多人数组合" />:<UiText en="Fixed Pax" zh="固定人数" />}/>
          <Detail label={<UiText en="Main Currency" zh="主要币种" />} value={managementMainCurrency}/>
          <Detail label={<UiText en="Exchange Rate → RM" zh="汇率 → RM" />} value={managementMainRate||"—"}/>
          <Detail label={<UiText en="Profit Method" zh="利润方式" />} value={qd.profitMode?<ProfitModeText value={qd.profitMode}/>:"—"}/>
          <Detail label={<UiText en="Profit Rate" zh="利润率" />} value={qd.profitRate!=null?String((Number(qd.profitRate)||0)*100)+"%":"—"}/>
          <Detail label={<UiText en="Minimum Profit / Pax" zh="最低利润 / 人" />} value={qd.minProfit===""||qd.minProfit==null?"—":money(Number(qd.minProfit)||0)}/>
          <Detail label={<UiText en="Maximum Profit / Pax" zh="最高利润 / 人" />} value={qd.maxProfit===""||qd.maxProfit==null?"—":money(Number(qd.maxProfit)||0)}/>
          <Detail label={<UiText en="Fixed Profit / Pax" zh="固定利润 / 人" />} value={qd.fixedProfit===""||qd.fixedProfit==null?"—":money(Number(qd.fixedProfit)||0)}/>
          <Detail label={<UiText en="Quote Rounding" zh="报价取整" />} value={qd.roundUnit?"RM "+qd.roundUnit:"—"}/>
        </div>
      </section>

      <section className="panel quotation-record-cost-panel">
        <div className="panel-head"><h2><UiText en="Cost Breakdown" zh="成本明细" /></h2></div>
        <div className="data-table-wrap"><table className="data-table quotation-record-cost-table">
          <thead><tr>
            <th><UiText en="Cost Item" zh="成本项目" /></th>
            <th><UiText en="Type / Calculation" zh="类型 / 计算方式" /></th>
            <th><UiText en="Unit Price" zh="单价" /></th>
            <th><UiText en="Qty / Days" zh="数量 / 天数" /></th>
            <th><UiText en="Currency / Rate" zh="币种 / 汇率" /></th>
            <th><UiText en="Cost / Pax" zh="每人成本" /></th>
            <th><UiText en="Total" zh="总计" /></th>
          </tr></thead>
          <tbody>
            {managementTravelerRows.map((row:any)=><tr key={row.id}>
              <td><strong>{row.item||"—"}</strong>{row.note&&<small className="quotation-record-row-note">{row.note}</small>}</td>
              <td><span className={"quotation-record-direction "+(row.direction==="deduction"?"deduction":"cost")}>{row.direction==="deduction"?<UiText en="Deduction −" zh="扣减 −" />:<UiText en="Cost +" zh="成本 +" />}</span><small className="quotation-record-row-mode"><CalcModeText value={row.mode}/></small></td>
              <td>{Number(row.unitPrice)||0}</td>
              <td>{Number(row.qty)||0}</td>
              <td><strong>{row.currency||"—"}</strong><small className="quotation-record-row-mode"><UiText en="Rate" zh="汇率" /> {currencyRate(row.currency,managementMainCurrency,managementMainRate)||"—"}</small></td>
              <td>{money(travelerRowPerPax(row,managementPax,managementMainCurrency,managementMainRate))}</td>
              <td>{money(travelerRowTotal(row,managementPax,managementMainCurrency,managementMainRate))}</td>
            </tr>)}
            {!managementTravelerRows.length&&<tr><td colSpan={7} className="empty">—</td></tr>}
          </tbody>
        </table></div>
      </section>

      <section className="panel quotation-record-cost-panel">
        <div className="panel-head"><h2><UiText en="Tour Leader Cost Setup" zh="领队成本设置" /></h2></div>
        <div className="data-table-wrap"><table className="data-table quotation-record-cost-table">
          <thead><tr>
            <th><UiText en="Cost Item" zh="成本项目" /></th>
            <th><UiText en="Type / Calculation" zh="类型 / 计算方式" /></th>
            <th><UiText en="Unit Price" zh="单价" /></th>
            <th><UiText en="Qty / Days" zh="数量 / 天数" /></th>
            <th><UiText en="Currency / Rate" zh="币种 / 汇率" /></th>
            <th><UiText en="Total" zh="总计" /></th>
            <th><UiText en="Allocated / Pax" zh="分摊 / 人" /></th>
          </tr></thead>
          <tbody>
            {managementLeaderRows.map((row:any)=><tr key={row.id}>
              <td><strong>{row.item||"—"}</strong>{row.note&&<small className="quotation-record-row-note">{row.note}</small>}</td>
              <td><span className={"quotation-record-direction "+(row.direction==="deduction"?"deduction":"cost")}>{row.direction==="deduction"?<UiText en="Deduction −" zh="扣减 −" />:<UiText en="Cost +" zh="成本 +" />}</span><small className="quotation-record-row-mode"><CalcModeText value={row.mode||"每人"}/></small></td>
              <td>{Number(row.unitPrice)||0}</td>
              <td>{Number(row.qty)||0}</td>
              <td><strong>{row.currency||"—"}</strong><small className="quotation-record-row-mode"><UiText en="Rate" zh="汇率" /> {currencyRate(row.currency,managementMainCurrency,managementMainRate)||"—"}</small></td>
              <td>{money(leaderRowTotal(row,managementMainCurrency,managementMainRate))}</td>
              <td>{money(leaderRowPerPax(row,managementPax,managementMainCurrency,managementMainRate))}</td>
            </tr>)}
            {!managementLeaderRows.length&&<tr><td colSpan={7} className="empty">—</td></tr>}
          </tbody>
        </table></div>
      </section>

      <div className="quotation-record-child-grid">
        <ChildCostRecord
          title={<UiText en="Child with Bed" zh="小孩含床" />}
          setup={managementChildBed}
          summary={managementChildBedSummary}
          pax={managementPax}
          mainCurrency={managementMainCurrency}
          mainRate={managementMainRate}
        />
        <ChildCostRecord
          title={<UiText en="Child without Bed" zh="小孩不含床" />}
          setup={managementChildNoBed}
          summary={managementChildNoBedSummary}
          pax={managementPax}
          mainCurrency={managementMainCurrency}
          mainRate={managementMainRate}
        />
      </div>
    </section>

    <section className="quotation-record-stage quotation-record-pricing">
      {isScenarioPricing ? <section className="panel quotation-record-pricing-panel">
        <div className="panel-head"><h2><UiText en="System Pricing Matrix" zh="系统定价矩阵" /></h2></div>
        <div className="data-table-wrap"><table className="data-table quotation-record-pricing-table">
          <thead><tr>
            <th><UiText en="Pax" zh="人数" /></th>
            <th><UiText en="Cost / Pax" zh="每人成本" /></th>
            <th><UiText en="System Suggested" zh="系统建议价" /></th>
            <th><UiText en="Final Price / Pax" zh="最终售价 / 人" /></th>
            <th><UiText en="Profit" zh="利润" /></th>
            <th><UiText en="Margin" zh="毛利率" /></th>
          </tr></thead>
          <tbody>
            {savedScenarioResults.map((result:any)=><tr key={result.id||result.pax}>
              <td><strong>{result.pax} Pax</strong></td>
              <td>{money(Number(result.costPerPax)||0)}</td>
              <td>{money(Number(result.suggestedPrice)||0)}</td>
              <td><strong>{money(Number(result.finalPrice)||0)}</strong></td>
              <td>{money(Number(result.finalProfit)||0)}</td>
              <td>{((Number(result.finalMargin)||0)*100).toFixed(1)}%</td>
            </tr>)}
          </tbody>
        </table></div>
      </section> : <>
        <section className="panel quotation-record-pricing-panel">
          <div className="panel-head"><h2><UiText en="System Pricing Matrix" zh="系统定价矩阵" /></h2></div>
          <div className="data-table-wrap"><table className="data-table quotation-record-pricing-table">
            <thead><tr>
              <th><UiText en="Traveller Type" zh="旅客类型" /></th>
              <th><UiText en="Leader" zh="领队" /></th>
              <th><UiText en="Cost" zh="成本" /></th>
              <th><UiText en="System Suggested" zh="系统建议价" /></th>
              <th><UiText en="Final Price" zh="最终售价" /></th>
              <th><UiText en="Profit" zh="利润" /></th>
              <th><UiText en="Margin" zh="毛利率" /></th>
            </tr></thead>
            <tbody>
              {managementPricingRows.map((row:any)=><tr key={row.type} className={row.type===selectedPricingType?"selected":""}>
                <td><strong>{row.label==="adult"?<UiText en="Adult · Twin Sharing" zh="成人（双人一房）" />:row.label==="childBed"?<UiText en="Child with Bed" zh="小孩加床" />:<UiText en="Child without Bed" zh="小孩不加床" />}</strong></td>
                <td>{row.leader?<UiText en="Incl. Leader" zh="含领队" />:<UiText en="Excl. Leader" zh="不含领队" />}</td>
                <td>{money(Number(row.value.cost)||0)}</td>
                <td>{money(Number(row.value.rounded)||0)}</td>
                <td><strong>{money(Number(row.value.final)||0)}</strong>{row.type===selectedPricingType&&selectedPricingManual&&<small className="quotation-record-price-note"><UiText en="Manual Override" zh="人工调整" /></small>}</td>
                <td>{money((Number(row.value.final)||0)-(Number(row.value.cost)||0))}</td>
                <td>{((Number(row.value.margin)||0)*100).toFixed(1)}%</td>
              </tr>)}
            </tbody>
          </table></div>
        </section>

        <section className="panel quotation-record-final-pricing">
          <div className="panel-head"><h2><UiText en="Final Pricing Result" zh="最终报价结果" /></h2></div>
          <div className="quotation-record-final-grid">
            <Detail label={<UiText en="Selected Traveller" zh="已选择旅客类型" />} value={<SelectedTravellerText value={selectedPricingType}/>}/>
            <Detail label={<UiText en="Final Customer Price / Pax" zh="最终对客售价 / 人" />} value={money(Number(selectedPricing.final)||0)}/>
            <Detail label={<UiText en="Profit / Pax" zh="每人利润" />} value={money(Number(calculationResult.finalProfit)||0)}/>
            <Detail label={<UiText en="Margin" zh="毛利率" />} value={((Number(calculationResult.finalMargin)||0)*100).toFixed(1)+"%"}/>
            <Detail label={<UiText en="Pricing Source" zh="定价来源" />} value={selectedPricingManual?<UiText en="Manual Override" zh="人工调整" />:<UiText en="System Price" zh="系统价格" />}/>
            <Detail label={<UiText en="Single Room Supplement" zh="单房差" />} value={singleRoomSupplement==null?"—":money(singleRoomSupplement)}/>
          </div>
        </section>
      </>}
    </section>

    <div className="quotation-record-stage-head quotation-record-workflow-head"><h2><UiText en="Workflow" zh="工作流程" /></h2></div>

    <QuotationReviewActions
      quotationId={id}
      status={data.status||"draft"}
      canSubmit={canSubmit}
      canReview={canReview}
      reviewNote={data.review_note||""}
      reviewedBy={data.reviewed_by_name||""}
      reviewedAt={data.reviewed_at||""}
      sourceInquiryId={data.source_inquiry_id||null}
    />
  </div>;
}

function CalcModeText({value}:{value:string}){
  if(value==="每人每天") return <UiText en="Per Person / Day" zh="每人每天" />;
  if(value==="整团") return <UiText en="Per Group" zh="整团" />;
  if(value==="整团每天") return <UiText en="Per Group / Day" zh="整团每天" />;
  return <UiText en="Per Person" zh="每人" />;
}

function ProfitModeText({value}:{value:string}){
  if(value==="固定金额") return <UiText en="Fixed Amount" zh="固定金额" />;
  if(value==="按售价毛利率") return <UiText en="Margin on Selling Price" zh="按售价毛利率" />;
  return <UiText en="Markup on Cost" zh="按成本加价率" />;
}

function ChildCostRecord({title,setup,summary,pax,mainCurrency,mainRate}:{title:any;setup:any;summary:any;pax:number;mainCurrency:Currency;mainRate:number}){
  const rows=Array.isArray(setup?.otherRows)?setup.otherRows:[];
  return <section className="panel quotation-record-child-card">
    <div className="panel-head"><h2>{title}</h2></div>
    <div className="quotation-record-child-summary">
      <Detail label={<UiText en="Ground Base" zh="地接基数" />} value={setup?String(setup.groundCurrency||"")+" "+String(Number(setup.groundBase)||0):"—"}/>
      <Detail label={<UiText en="Ground Ratio" zh="地接比例" />} value={setup?String(setup.groundRatio||0)+"%":"—"}/>
      <Detail label={<UiText en="Ground Cost / Pax" zh="地接成本 / 人" />} value={summary?money(summary.ground):"—"}/>
      <Detail label={<UiText en="Child Cost / Pax" zh="儿童成本 / 人" />} value={summary?money(summary.total):"—"}/>
    </div>
    <div className="quotation-record-child-items">
      <h3><UiText en="Other Cost Items" zh="其他成本项目" /></h3>
      <div className="data-table-wrap"><table className="data-table quotation-record-child-table">
        <thead><tr>
          <th><UiText en="Cost Item" zh="成本项目" /></th>
          <th><UiText en="Type / Calculation" zh="类型 / 计算方式" /></th>
          <th><UiText en="Unit Price" zh="单价" /></th>
          <th><UiText en="Qty / Days" zh="数量 / 天数" /></th>
          <th><UiText en="Currency / Rate" zh="币种 / 汇率" /></th>
          <th><UiText en="Cost / Pax" zh="每人成本" /></th>
          <th><UiText en="Total" zh="总计" /></th>
        </tr></thead>
        <tbody>
          {rows.map((row:any)=><tr key={row.id}>
            <td><strong>{row.item||"—"}</strong>{row.note&&<small className="quotation-record-row-note">{row.note}</small>}</td>
            <td><span className={"quotation-record-direction "+(row.direction==="deduction"?"deduction":"cost")}>{row.direction==="deduction"?<UiText en="Deduction −" zh="扣减 −" />:<UiText en="Cost +" zh="成本 +" />}</span><small className="quotation-record-row-mode"><CalcModeText value={row.mode}/></small></td>
            <td>{Number(row.unitPrice)||0}</td>
            <td>{Number(row.qty)||0}</td>
            <td><strong>{row.currency||"—"}</strong><small className="quotation-record-row-mode"><UiText en="Rate" zh="汇率" /> {currencyRate(row.currency,mainCurrency,mainRate)||"—"}</small></td>
            <td>{money(childExtraRowPerPax(row,pax,mainCurrency,mainRate))}</td>
            <td>{money(childExtraRowTotal(row,pax,mainCurrency,mainRate))}</td>
          </tr>)}
          {!rows.length&&<tr><td colSpan={7} className="empty">—</td></tr>}
        </tbody>
      </table></div>
    </div>
  </section>;
}

function SelectedTravellerText({value}:{value:string}){
  const hasLeader=!value.includes("不含领队");
  if(value.includes("小孩含床")) return <><UiText en="Child with Bed" zh="小孩加床" /> · {hasLeader?<UiText en="Incl. Leader" zh="含领队" />:<UiText en="Excl. Leader" zh="不含领队" />}</>;
  if(value.includes("小孩不含床")) return <><UiText en="Child without Bed" zh="小孩不加床" /> · {hasLeader?<UiText en="Incl. Leader" zh="含领队" />:<UiText en="Excl. Leader" zh="不含领队" />}</>;
  return <><UiText en="Adult · Twin Sharing" zh="成人（双人一房）" /> · {hasLeader?<UiText en="Incl. Leader" zh="含领队" />:<UiText en="Excl. Leader" zh="不含领队" />}</>;
}

function Detail({label,value}:{label:any;value:any}){
  return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>;
}
