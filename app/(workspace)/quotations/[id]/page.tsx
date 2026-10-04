import Link from "next/link";
import { notFound } from "next/navigation";
import QuotationDetailMoreActions from "@/components/QuotationDetailMoreActions";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import QuotationReviewActions from "@/components/QuotationReviewActions";
import {UiText} from "@/components/WorkspaceLanguage";
import {Currency} from "@/lib/calculations";
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

  const margin=Number(data.margin||0);
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
  const calculationResult=qd.calculationResult||calculateQuotation(buildQuotationCalculationInput(data));
  const matrix=calculationResult.matrix;
  const hasLeader=Boolean(calculationResult.hasLeader);
  const adultSellingPrice=Number(calculationResult.adultSellingPrice)||0;
  const singleRoomSupplement=calculationResult.singleRoomSupplement==null?null:Number(calculationResult.singleRoomSupplement);
  const singleRoomSellingPrice=calculationResult.singleRoomSellingPrice==null?null:Number(calculationResult.singleRoomSellingPrice);
  const rawReturnTo=String(sp.returnTo||"");
  const returnTo=rawReturnTo.startsWith("/")&&!rawReturnTo.startsWith("//")?rawReturnTo:"/quotations";
  const currentQuoteHref="/quotations/"+id+"?returnTo="+encodeURIComponent(returnTo);

  return <div className="quotation-detail-template">
    <div className="page-head quote-detail-head">
      <div className="quotation-detail-title-block">
        <h1>{data.title||data.quotation_no}</h1>
        <div className="quotation-detail-meta-line">
          <span>{data.quotation_no}</span>
          <span className={"status quotation-header-status status-"+String(data.status||"draft")}>{data.status==="under_review"?<UiText en="Under Review" zh="审核中" />:data.status==="revision_required"?<UiText en="Revision Required" zh="需要修改" />:data.status==="ready"?<UiText en="Ready" zh="已就绪" />:data.status==="sent"?<UiText en="Sent" zh="已发送" />:data.status==="revised"?<UiText en="Revised" zh="已修改" />:data.status==="confirmed"?<UiText en="Confirmed" zh="已确认" />:data.status==="lost"?<UiText en="Lost" zh="未成交" />:data.status==="archived"?<UiText en="Archived" zh="已归档" />:<UiText en="Draft" zh="草稿" />}</span>
        </div>
      </div>
      <div className="detail-actions">
        <Link className="btn quotation-back-action" href={returnTo}>{returnTo.startsWith("/inquiries/")?<UiText en="‹ Inquiry" zh="‹ 询价" />:<UiText en="‹ Back" zh="‹ 返回" />}</Link>
        <Link className="btn" href={"/quotations/"+id+"/edit"}><UiText en="Edit Quotation" zh="编辑报价" /></Link>
        <QuotationDetailMoreActions id={id} />
      </div>
    </div>

    {data.source_inquiry_id&&<section className="quote-source-inquiry quote-source-inquiry-detail">
      <div>
        <span><UiText en="SOURCE INQUIRY" zh="来源询价" /></span>
        <strong>{qd.sourceInquiryNo||<UiText en="Linked Inquiry" zh="关联询价" />}</strong>
        {qd.sourceInquirySnapshot&&<small>{[qd.sourceInquirySnapshot.destination,qd.sourceInquirySnapshot.daysCount?`${qd.sourceInquirySnapshot.daysCount} Days`:"",qd.sourceInquirySnapshot.pax?`${qd.sourceInquirySnapshot.pax} Pax`:""].filter(Boolean).join(" · ")}</small>}
      </div>
      <Link className="btn" href={"/inquiries/"+data.source_inquiry_id+"?returnTo="+encodeURIComponent(currentQuoteHref)}><UiText en="Open Inquiry" zh="打开询价" /></Link>
    </section>}

    {isScenarioPricing ? <>
      <section className="panel scenario-detail-panel">
        <div className="panel-head">
          <div>
            <span className="page-kicker"><UiText en="SCENARIO PRICING" zh="人数报价" /></span>
            <h2><UiText en="Package Price Matrix" zh="配套人数价格矩阵" /></h2>
          </div>
        </div>
        <div className="scenario-result-grid scenario-detail-grid">
          {savedScenarioResults.map((result:any)=><article className="scenario-result-card" key={result.id||result.pax}>
            <div className="scenario-result-head">
              <div><span><UiText en="SCENARIO" zh="人数方案" /></span><strong>{result.pax} Pax</strong></div>
              <span className="scenario-result-days">{itineraryDays||"—"} <UiText en="Days" zh="天" /></span>
            </div>
            <div className="scenario-result-metrics">
              <div className="metric"><span><UiText en="Cost / Pax" zh="每人成本" /></span><strong>{money(Number(result.costPerPax)||0)}</strong></div>
              <div className="metric"><span><UiText en="System Suggested" zh="系统建议价" /></span><strong>{money(Number(result.suggestedPrice)||0)}</strong></div>
            </div>
            <div className="scenario-result-final">
              <span><UiText en="Final Price / Pax" zh="最终报价 / 人" /></span>
              <strong>{money(Number(result.finalPrice)||0)}</strong>
            </div>
            <div className="scenario-result-foot">
              <span><UiText en="Profit" zh="利润" /> <strong>{money(Number(result.finalProfit)||0)}</strong></span>
              <span><UiText en="Margin" zh="毛利率" /> <strong>{((Number(result.finalMargin)||0)*100).toFixed(1)}%</strong></span>
            </div>
          </article>)}
        </div>
      </section>
    </> : <>
    <section className="final-price-grid">
      <div className="quote-result-hero">
        <span><UiText en="Adult Price · Twin Sharing" zh="成人价格 · 双人一房" />{hasLeader?<UiText en=" · Includes Tour Leader" zh=" · 含领队" />:null}</span>
        <strong>{money(adultSellingPrice)}</strong>
        <small>{hasLeader?<><UiText en="Includes tour leader allocation " zh="已含领队分摊 " />{money(Number(calculationResult.leaderPerPax)||0)}</>:<UiText en="Adult price is based on twin sharing" zh="成人默认双人一房" />}</small>
      </div>
      <div className="quote-result-hero">
        <span><UiText en="Single Room Price" zh="单人房价格" />{hasLeader?<UiText en=" · Includes Tour Leader" zh=" · 含领队" />:null}</span>
        <strong>{singleRoomSellingPrice==null?"—":money(singleRoomSellingPrice)}</strong>
        <small>{singleRoomSupplement==null?<UiText en="Single room supplement not entered" zh="尚未填写单人房差" />:<>{hasLeader?<UiText en="Includes Tour Leader · " zh="含领队 · " />:null}<UiText en="Single room supplement " zh="含单人房差 " />{money(singleRoomSupplement)}</>}</small>
      </div>
      <div className="quote-result-hero">
        <span><UiText en="Flight Total Price" zh="航班总报价" /></span>
        <strong>{flightTotalPrice==null?"—":`${flightPriceCurrency} ${flightTotalPrice.toLocaleString("en-MY",{minimumFractionDigits:2,maximumFractionDigits:2})}`}</strong>
        <small>{flightTicketType==="fit"?<UiText en="FIT Ticket" zh="散票" />:flightTicketType==="git"?<UiText en="GIT" zh="团体票" />:flightTicketType==="review"?<UiText en="Manual Review" zh="需人工确认" />:"—"}</small>
      </div>
    </section>

    <section className="dashboard-cards quote-detail-cards">
      <div className="dash-card"><span><UiText en="Total Cost" zh="总成本" /></span><b>{money(Number(data.total_cost))}</b></div>
      <div className="dash-card"><span><UiText en="Profit" zh="利润" /></span><b>{money(Number(data.profit))}</b></div>
      <div className="dash-card"><span><UiText en="Margin" zh="利润率" /></span><b>{(margin*100).toFixed(1)}%</b></div>
      <div className="dash-card"><span><UiText en="Pax" zh="人数" /></span><b>{data.pax||0}</b></div>
    </section>

    {/* FOUNDATION LOCK: comparison matrices use grouped comparison,
        keep supporting metrics secondary, and emphasize the final recommendation. */}
    <section className="panel quotation-matrix-panel">
      <div className="panel-head"><h2><UiText en="Final Quotation Matrix" zh="最终报价矩阵" /></h2></div>
      <div className={"quotation-matrix-compare"+(hasLeader?" has-leader":"")}>
        <div className="quotation-matrix-head">
          <span><UiText en="Traveller Type" zh="旅客类型" /></span>
          <span><UiText en="Excl. Leader" zh="不含领队" /></span>
          {hasLeader&&<span><UiText en="Incl. Leader" zh="含领队" /></span>}
        </div>

        {matrix.map((row:any)=><div className="quotation-matrix-row" key={row.key}>
          <div className="quotation-matrix-traveller">
            <strong>{row.key==="adult"?<UiText en="Adult · Twin Sharing" zh="成人（双人一房）" />:row.key==="childBed"?<UiText en="Child with Bed" zh="小孩加床" />:<UiText en="Child without Bed" zh="小孩不加床" />}</strong>
          </div>

          <div className="quotation-matrix-plan">
            <div className="quotation-matrix-metric"><span><UiText en="Cost" zh="成本" /></span><strong>{money(row.noLeader.cost)}</strong></div>
            <div className="quotation-matrix-metric"><span><UiText en="Profit" zh="利润" /></span><strong>{money(row.noLeader.profit)}</strong></div>
            <div className="quotation-matrix-metric suggested"><span><UiText en="Suggested" zh="建议售价" /></span><strong>{money(row.noLeader.selling)}</strong></div>
          </div>

          {hasLeader&&<div className="quotation-matrix-plan">
            <div className="quotation-matrix-metric"><span><UiText en="Cost" zh="成本" /></span><strong>{money(row.withLeader.cost)}</strong></div>
            <div className="quotation-matrix-metric"><span><UiText en="Profit" zh="利润" /></span><strong>{money(row.withLeader.profit)}</strong></div>
            <div className="quotation-matrix-metric suggested"><span><UiText en="Suggested" zh="建议售价" /></span><strong>{money(row.withLeader.selling)}</strong></div>
          </div>}
        </div>)}
      </div>
    </section>
    </>}

    <section className="panel quote-flight-panel">
      <div className="panel-head quote-flight-head">
        <div><h2><UiText en="Flight Information" zh="航班信息" /></h2></div>
        {itineraryLabel && <div className="itinerary-pill">
          <strong>{itineraryDays} <UiText en="Days" zh="天" /></strong>
          <span>{itineraryLabel}</span>
        </div>}
      </div>

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

    <section className="panel quotation-information-panel">
      <div className="panel-head"><h2><UiText en="Quotation Information" zh="报价资料" /></h2></div>
      <div className="detail-grid quotation-information-grid">
        <Detail label={<UiText en="Customer" zh="客户" />} value={data.customer_name||"—"}/>
        <Detail label={<UiText en="Destination" zh="目的地" />} value={data.destination||"—"}/>
        <Detail label={<UiText en="Departure Date" zh="出发日期" />} value={data.departure_date?new Date(data.departure_date+"T00:00:00").toLocaleDateString("en-MY"):"—"}/>
        <Detail label={<UiText en="Tour Type" zh="团型" />} value={data.tour_type||qd.tourType||"—"}/>
        <Detail label={<UiText en="Supplier" zh="供应商" />} value={data.supplier||"—"}/>
        <Detail label={<UiText en="Status" zh="状态" />} value={data.status==="under_review"?<UiText en="Under Review" zh="审核中" />:data.status==="revision_required"?<UiText en="Revision Required" zh="需要修改" />:data.status==="ready"?<UiText en="Ready" zh="已就绪" />:data.status==="sent"?<UiText en="Sent" zh="已发送" />:data.status==="revised"?<UiText en="Revised" zh="已修改" />:data.status==="confirmed"?<UiText en="Confirmed" zh="已确认" />:data.status==="lost"?<UiText en="Lost" zh="未成交" />:data.status==="archived"?<UiText en="Archived" zh="已归档" />:<UiText en="Draft" zh="草稿" />}/>
        <Detail label={<UiText en="Updated" zh="更新时间" />} value={data.updated_at?new Date(data.updated_at).toLocaleString("en-MY"):"—"}/>
      </div>
    </section>

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

function Detail({label,value}:{label:any;value:any}){
  return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>;
}
