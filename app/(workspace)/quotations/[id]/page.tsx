import Link from "next/link";
import { notFound } from "next/navigation";
import DuplicateQuotationButton from "@/components/DuplicateQuotationButton";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import QuotationReviewActions from "@/components/QuotationReviewActions";
import {
  ChildMode, Currency, LeaderCostRow, ProfitMode, TravelerCostRow,
  childRatio, computeProfit, currencyRate, leaderRowTotal, travelerRowPerPax, roundUpTo
} from "@/lib/calculations";

const money=(n:number)=>new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR",minimumFractionDigits:2}).format(n||0).replace("MYR","RM");

function buildMatrix(q:any){
  const s=q?.quotation_data||{};
  const pax=Math.max(1,Number(s.pax||q?.pax)||1);
  const mainCurrency=(s.mainCurrency||"RMB") as Currency;
  const mainRate=Number(s.mainRate)||0;
  const travelerRows=(Array.isArray(s.travelerRows)?s.travelerRows:[]) as TravelerCostRow[];
  const leaderRows=(Array.isArray(s.leaderRows)?s.leaderRows:[]) as LeaderCostRow[];
  const profitMode=(s.profitMode||"按成本加价率") as ProfitMode;
  const profitRate=Number(s.profitRate)||0;
  const minProfit=Number(s.minProfit)||0;
  const maxProfit=s.maxProfit===""||s.maxProfit==null?"":Number(s.maxProfit);
  const fixedProfit=s.fixedProfit===""||s.fixedProfit==null?"":Number(s.fixedProfit);

  const travelerPerPax=travelerRows.reduce((sum,row)=>sum+travelerRowPerPax(row,pax,mainCurrency,mainRate),0);
  const leaderTotal=leaderRows.reduce((sum,row)=>sum+leaderRowTotal(row,mainCurrency,mainRate),0);
  const leaderPerPax=leaderTotal/pax;
  const hasLeader=Boolean(s.hasLeader ?? leaderRows.some((r:any)=>(Number(r.unitPrice)||0)>0 && (Number(r.qty)||0)>0));

  const ratioEligible=travelerRows.filter(r=>r.childRatioApplicable).reduce((sum,row)=>sum+travelerRowPerPax(row,pax,mainCurrency,mainRate),0);
  const ratioExcluded=travelerRows.filter(r=>!r.childRatioApplicable).reduce((sum,row)=>sum+travelerRowPerPax(row,pax,mainCurrency,mainRate),0);

  const childCost=(mode:ChildMode,manual:number,currency:Currency)=>{
    const ratio=childRatio(mode);
    if(ratio===null) return (Number(manual)||0)*currencyRate(currency,mainCurrency,mainRate);
    return ratioEligible*ratio+ratioExcluded;
  };

  const childBed=childCost((s.childBedMode||"手动成本") as ChildMode,Number(s.childBedManual)||0,(s.childBedCurrency||"RM") as Currency);
  const childNoBed=childCost((s.childNoBedMode||"手动成本") as ChildMode,Number(s.childNoBedManual)||0,(s.childNoBedCurrency||"RM") as Currency);

  const make=(cost:number)=>{
    const profit=computeProfit(cost,profitMode,profitRate,minProfit,maxProfit,fixedProfit);
    return {cost,profit,selling:cost+profit};
  };

  return {
    hasLeader,
    rows:[
      ["成人（双人一房）",make(travelerPerPax),make(travelerPerPax+leaderPerPax)],
      ["小孩加床",make(childBed),make(childBed+leaderPerPax)],
      ["小孩不加床",make(childNoBed),make(childNoBed+leaderPerPax)]
    ] as const
  };
}

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
  const outboundFromAirport=qd.outboundFromAirport||"";
  const outboundToAirport=qd.outboundToAirport||"";
  const outboundFlightNo=qd.outboundFlightNo||"";
  const outboundFlightDate=qd.outboundFlightDate||"";
  const outboundDepartureTime=qd.outboundDepartureTime||"";
  const outboundArrivalTime=qd.outboundArrivalTime||"";
  const outboundNextDay=Boolean(qd.outboundNextDay);
  const outboundTransitOpen=Boolean(qd.outboundTransitOpen);
  const outboundTransitFromAirport=qd.outboundTransitFromAirport||"";
  const outboundTransitToAirport=qd.outboundTransitToAirport||"";
  const outboundTransitFlightNo=qd.outboundTransitFlightNo||"";
  const outboundTransitFlightDate=qd.outboundTransitFlightDate||"";
  const outboundTransitDepartureTime=qd.outboundTransitDepartureTime||"";
  const outboundTransitArrivalTime=qd.outboundTransitArrivalTime||"";
  const outboundTransitNextDay=Boolean(qd.outboundTransitNextDay);
  const returnFromAirport=qd.returnFromAirport||"";
  const returnToAirport=qd.returnToAirport||"";
  const returnFlightNo=qd.returnFlightNo||"";
  const returnFlightDate=qd.returnFlightDate||"";
  const returnDepartureTime=qd.returnDepartureTime||"";
  const returnArrivalTime=qd.returnArrivalTime||"";
  const returnNextDay=Boolean(qd.returnNextDay);
  const returnTransitOpen=Boolean(qd.returnTransitOpen);
  const returnTransitFromAirport=qd.returnTransitFromAirport||"";
  const returnTransitToAirport=qd.returnTransitToAirport||"";
  const returnTransitFlightNo=qd.returnTransitFlightNo||"";
  const returnTransitFlightDate=qd.returnTransitFlightDate||"";
  const returnTransitDepartureTime=qd.returnTransitDepartureTime||"";
  const returnTransitArrivalTime=qd.returnTransitArrivalTime||"";
  const returnTransitNextDay=Boolean(qd.returnTransitNextDay);
  const itineraryDays=Number(qd.itineraryDays)||0;
  const itineraryNights=Number(qd.itineraryNights)||0;
  const itineraryLabel=qd.itineraryLabel||"";
  const flightTotalPrice=qd.flightTotalPrice===""||qd.flightTotalPrice==null?null:Number(qd.flightTotalPrice);
  const flightPriceCurrency=(qd.flightPriceCurrency||"RM") as Currency;
  const flightPax=Number(qd.pax||data.pax)||0;
  const flightTicketType=flightPax>=1&&flightPax<=9?"FIT Ticket｜散票":flightPax>=10&&flightPax<=200?"GIT｜团体票":flightPax>200?"Manual Review｜需人工确认":"—";
  const singleRoomAmount=qd.singleRoomAmount===""||qd.singleRoomAmount==null?null:Number(qd.singleRoomAmount);
  const singleRoomCurrency=(qd.singleRoomCurrency||"RM") as Currency;
  const mainCurrency=(qd.mainCurrency||"RMB") as Currency;
  const mainRate=Number(qd.mainRate)||0;
  const singleRoomSupplement=singleRoomAmount==null?null:singleRoomAmount*currencyRate(singleRoomCurrency,mainCurrency,mainRate);
  const matrixData=buildMatrix(data);
  const matrix=matrixData.rows;
  const hasLeader=matrixData.hasLeader;
  const roundUnit=Number(qd.roundUnit)||50;
  const selectedType=qd.selectedType||"成人不含领队";
  const manualQuote=qd.manualQuote;
  const adultNoLeaderSuggested=matrix[0][1].selling;
  const adultLeaderSuggested=matrix[0][2].selling;
  const savedFinalQuote=Number(data.selling_price)||0;
  const adultSellingPrice=hasLeader
    ? (selectedType==="成人含领队" && manualQuote!=="" && manualQuote!=null
        ? savedFinalQuote
        : roundUpTo(adultLeaderSuggested,roundUnit))
    : (selectedType==="成人不含领队" && manualQuote!=="" && manualQuote!=null
        ? savedFinalQuote
        : roundUpTo(adultNoLeaderSuggested,roundUnit));
  const singleRoomSellingPrice=singleRoomSupplement==null?null:adultSellingPrice+singleRoomSupplement;
  const rawReturnTo=String(sp.returnTo||"");
  const returnTo=rawReturnTo.startsWith("/")&&!rawReturnTo.startsWith("//")?rawReturnTo:"/quotations";
  const returnLabel=returnTo.startsWith("/inquiries/")?"← Inquiry":"← Back";
  const currentQuoteHref="/quotations/"+id+"?returnTo="+encodeURIComponent(returnTo);

  return <div className="quotation-detail-template">
    <div className="page-head quote-detail-head">
      <div className="quotation-detail-title-block">
        <h1>{data.title||data.quotation_no}</h1>
        <div className="quotation-detail-meta-line">
          <span>{data.quotation_no}</span>
          <span className={"status quotation-header-status status-"+String(data.status||"draft")}>{data.status||"draft"}</span>
        </div>
      </div>
      <div className="detail-actions">
        <Link className="btn quotation-back-action" href={returnTo}>{returnLabel}</Link>
        <DuplicateQuotationButton id={id} />
        <Link className="btn" href={"/quotations/"+id+"/edit"}>Edit Quotation</Link>
      </div>
    </div>

    {data.source_inquiry_id&&<section className="quote-source-inquiry quote-source-inquiry-detail">
      <div>
        <span>SOURCE INQUIRY｜来源询价</span>
        <strong>{qd.sourceInquiryNo||"Linked Inquiry"}</strong>
        {qd.sourceInquirySnapshot&&<small>{[qd.sourceInquirySnapshot.destination,qd.sourceInquirySnapshot.daysCount&&qd.sourceInquirySnapshot.nightsCount?`${qd.sourceInquirySnapshot.daysCount}D${qd.sourceInquirySnapshot.nightsCount}N`:"",qd.sourceInquirySnapshot.pax?`${qd.sourceInquirySnapshot.pax} Pax`:""].filter(Boolean).join(" · ")}</small>}
      </div>
      <Link className="btn" href={"/inquiries/"+data.source_inquiry_id+"?returnTo="+encodeURIComponent(currentQuoteHref)}>Open Inquiry</Link>
    </section>}

    <section className="final-price-grid">
      <div className="quote-result-hero">
        <span>成人价格 · Twin Sharing{hasLeader?" · 含领队":""}</span>
        <strong>{money(adultSellingPrice)}</strong>
        <small>{hasLeader?`已含领队分摊 ${money(Number(qd.leaderPerPax)||matrix[0][2].cost-matrix[0][1].cost)}`:"成人默认双人一房"}</small>
      </div>
      <div className="quote-result-hero">
        <span>单人房价格 · Single Room{hasLeader?" · 含领队":""}</span>
        <strong>{singleRoomSellingPrice==null?"—":money(singleRoomSellingPrice)}</strong>
        <small>{singleRoomSupplement==null?"尚未填写单人房差":`${hasLeader?"含领队 · ":""}含单人房差 ${money(singleRoomSupplement)}`}</small>
      </div>
      <div className="quote-result-hero">
        <span>航班总报价 · Flight</span>
        <strong>{flightTotalPrice==null?"—":`${flightPriceCurrency} ${flightTotalPrice.toLocaleString("en-MY",{minimumFractionDigits:2,maximumFractionDigits:2})}`}</strong>
        <small>{flightTicketType}</small>
      </div>
    </section>

    <section className="dashboard-cards quote-detail-cards">
      <div className="dash-card"><span>Total Cost</span><b>{money(Number(data.total_cost))}</b></div>
      <div className="dash-card"><span>Profit</span><b>{money(Number(data.profit))}</b></div>
      <div className="dash-card"><span>Margin</span><b>{(margin*100).toFixed(1)}%</b></div>
      <div className="dash-card"><span>Pax</span><b>{data.pax||0}</b></div>
    </section>

    <section className="panel">
      <div className="panel-head"><h2>最终报价矩阵</h2></div>
      <div className="matrix-wrap">
        <table className="matrix detail-matrix">
          <thead><tr>
            <th>旅客类型</th>
            <th>不含领队成本</th>
            <th>不含领队利润</th>
            <th>不含领队建议售价</th>
            {hasLeader&&<><th>含领队成本</th><th>含领队利润</th><th>含领队建议售价</th></>}
          </tr></thead>
          <tbody>
            {matrix.map(([label,a,b])=><tr key={label}>
              <td className="label-cell">{label}</td>
              <td>{money(a.cost)}</td>
              <td>{money(a.profit)}</td>
              <td className="sale">{money(a.selling)}</td>
              {hasLeader&&<><td>{money(b.cost)}</td><td>{money(b.profit)}</td><td className="sale">{money(b.selling)}</td></>}
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    <section className="panel quote-flight-panel">
      <div className="panel-head quote-flight-head">
        <div>
          <h2>航班信息</h2>
          <span>Flight Information</span>
        </div>
        {itineraryLabel && <div className="itinerary-pill">
          <strong>{itineraryDays}天{itineraryNights}晚</strong>
          <span>{itineraryLabel}</span>
        </div>}
      </div>

      <div className="quote-flight-summary">
        <Detail label="Departure Date" value={data.departure_date?new Date(data.departure_date+"T00:00:00").toLocaleDateString("en-MY"):"—"}/>
        <Detail label="Return Date (Arrival)" value={data.return_date?new Date(data.return_date+"T00:00:00").toLocaleDateString("en-MY"):"—"}/>
        <Detail label="Flight Total Price｜航班总报价" value={flightTotalPrice==null?"—":`${flightPriceCurrency} ${flightTotalPrice.toLocaleString("en-MY",{minimumFractionDigits:2,maximumFractionDigits:2})}`}/>
        <Detail label="Ticket Type｜机票类型" value={flightTicketType}/>
      </div>

      <div className="quote-flight-grid">
        <div className="quote-flight-card">
          <h3>Departure Flight</h3>
          <div className="quote-flight-details">
            <Detail label="Airport Route" value={outboundFromAirport||outboundToAirport?`${outboundFromAirport||"—"} → ${outboundToAirport||"—"}`:"—"}/>
            <Detail label="Airline / Flight No." value={outboundFlightNo||"—"}/>
            <Detail label="Flight Date" value={outboundFlightDate?new Date(outboundFlightDate+"T00:00:00").toLocaleDateString("en-MY"):"—"}/>
            <Detail label="Departure Time" value={outboundDepartureTime||"—"}/>
            <Detail label="Arrival Time" value={outboundArrivalTime||"—"}/>
            <Detail label="Arrival Day" value={outboundDepartureTime&&outboundArrivalTime?(outboundNextDay?"+1 Next Day":"Same Day"):"—"}/>
          </div>
          {outboundTransitOpen && <div className="quote-transit-detail">
            <div className="quote-transit-heading"><span>TRANSIT</span><strong>Departure Transit Flight</strong></div>
            <div className="quote-flight-details">
              <Detail label="Airport Route" value={outboundTransitFromAirport||outboundTransitToAirport?`${outboundTransitFromAirport||"—"} → ${outboundTransitToAirport||"—"}`:"—"}/>
              <Detail label="Airline / Flight No." value={outboundTransitFlightNo||"—"}/>
              <Detail label="Flight Date" value={outboundTransitFlightDate?new Date(outboundTransitFlightDate+"T00:00:00").toLocaleDateString("en-MY"):"—"}/>
              <Detail label="Departure Time" value={outboundTransitDepartureTime||"—"}/>
              <Detail label="Arrival Time" value={outboundTransitArrivalTime||"—"}/>
              <Detail label="Arrival Day" value={outboundTransitDepartureTime&&outboundTransitArrivalTime?(outboundTransitNextDay?"+1 Next Day":"Same Day"):"—"}/>
            </div>
          </div>}
        </div>

        <div className="quote-flight-card">
          <h3>Return Flight</h3>
          <div className="quote-flight-details">
            <Detail label="Airport Route" value={returnFromAirport||returnToAirport?`${returnFromAirport||"—"} → ${returnToAirport||"—"}`:"—"}/>
            <Detail label="Airline / Flight No." value={returnFlightNo||"—"}/>
            <Detail label="Flight Date" value={returnFlightDate?new Date(returnFlightDate+"T00:00:00").toLocaleDateString("en-MY"):"—"}/>
            <Detail label="Departure Time" value={returnDepartureTime||"—"}/>
            <Detail label="Arrival Time" value={returnArrivalTime||"—"}/>
            <Detail label="Arrival Day" value={returnDepartureTime&&returnArrivalTime?(returnNextDay?"+1 Next Day":"Same Day"):"—"}/>
          </div>
          {returnTransitOpen && <div className="quote-transit-detail">
            <div className="quote-transit-heading"><span>TRANSIT</span><strong>Return Transit Flight</strong></div>
            <div className="quote-flight-details">
              <Detail label="Airport Route" value={returnTransitFromAirport||returnTransitToAirport?`${returnTransitFromAirport||"—"} → ${returnTransitToAirport||"—"}`:"—"}/>
              <Detail label="Airline / Flight No." value={returnTransitFlightNo||"—"}/>
              <Detail label="Flight Date" value={returnTransitFlightDate?new Date(returnTransitFlightDate+"T00:00:00").toLocaleDateString("en-MY"):"—"}/>
              <Detail label="Departure Time" value={returnTransitDepartureTime||"—"}/>
              <Detail label="Arrival Time" value={returnTransitArrivalTime||"—"}/>
              <Detail label="Arrival Day" value={returnTransitDepartureTime&&returnTransitArrivalTime?(returnTransitNextDay?"+1 Next Day":"Same Day"):"—"}/>
            </div>
          </div>}
        </div>
      </div>
    </section>

    <section className="panel">
      <div className="panel-head"><h2>Quotation Information</h2></div>
      <div className="detail-grid">
        <Detail label="Customer" value={data.customer_name||"—"}/>
        <Detail label="Destination" value={data.destination||"—"}/>
        <Detail label="Departure Date" value={data.departure_date?new Date(data.departure_date+"T00:00:00").toLocaleDateString("en-MY"):"—"}/>
        <Detail label="Business Type" value={data.business_type||"—"}/>
        <Detail label="Tour Code" value={data.tour_code||"—"}/>
        <Detail label="Supplier" value={data.supplier||"—"}/>
        <Detail label="Status" value={data.status||"draft"}/>
        <Detail label="Updated" value={data.updated_at?new Date(data.updated_at).toLocaleString("en-MY"):"—"}/>
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

function Detail({label,value}:{label:string;value:any}){
  return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>;
}
