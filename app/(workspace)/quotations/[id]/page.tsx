import Link from "next/link";
import { notFound } from "next/navigation";
import { internalDb, internalToken } from "@/lib/internalSession";
import {
  ChildMode, Currency, LeaderCostRow, ProfitMode, TravelerCostRow,
  childRatio, computeProfit, currencyRate, leaderRowTotal, travelerRowPerPax
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

export default async function QuotationDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const token=await internalToken();
  if(!token) notFound();
  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_quote",{p_token:token,p_id:id});
  if(error||!data||!data.id) notFound();

  const margin=Number(data.margin||0);
  const qd=data.quotation_data||{};
  const singleRoomAmount=qd.singleRoomAmount===""||qd.singleRoomAmount==null?null:Number(qd.singleRoomAmount);
  const singleRoomCurrency=(qd.singleRoomCurrency||"RM") as Currency;
  const mainCurrency=(qd.mainCurrency||"RMB") as Currency;
  const mainRate=Number(qd.mainRate)||0;
  const singleRoomSupplement=singleRoomAmount==null?null:singleRoomAmount*currencyRate(singleRoomCurrency,mainCurrency,mainRate);
  const adultSellingPrice=Number(data.selling_price)||0;
  const singleRoomSellingPrice=singleRoomSupplement==null?null:adultSellingPrice+singleRoomSupplement;
  const matrixData=buildMatrix(data);
  const matrix=matrixData.rows;
  const hasLeader=matrixData.hasLeader;

  return <div>
    <div className="page-head quote-detail-head">
      <div>
        <span className="page-kicker">QUOTATION DETAIL</span>
        <h1>{data.title||data.quotation_no}</h1>
        <p>{data.quotation_no} · {data.status||"draft"}</p>
      </div>
      <div className="detail-actions">
        <Link className="btn" href="/quotations">← Back</Link>
        <Link className="btn primary" href={"/quotations/"+id+"/edit"}>Edit Quotation</Link>
      </div>
    </div>

    <section className="final-price-grid">
      <div className="quote-result-hero">
        <span>成人价格 · Twin Sharing</span>
        <strong>{money(adultSellingPrice)}</strong>
        <small>成人默认双人一房</small>
      </div>
      <div className="quote-result-hero">
        <span>单人房价格 · Single Room</span>
        <strong>{singleRoomSellingPrice==null?"—":money(singleRoomSellingPrice)}</strong>
        <small>{singleRoomSupplement==null?"尚未填写单人房差":`含单人房差 ${money(singleRoomSupplement)}`}</small>
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
  </div>;
}

function Detail({label,value}:{label:string;value:any}){
  return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>;
}
