import Link from "next/link";
import { notFound } from "next/navigation";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";

const supplierLabels:Record<string,string>={
  draft:"Supplier Draft",
  ready:"Ready to Send",
  waiting_quote:"Waiting Supplier Quote",
  quote_received:"Quote Received"
};

type QueueKey="needs_review"|"waiting_supplier"|"quote_received"|"ready_sales";

const queueMeta:Record<QueueKey,{title:string;subtitle:string}>={
  needs_review:{title:"Needs Review",subtitle:"Review case details and prepare supplier inquiry."},
  waiting_supplier:{title:"Waiting Supplier",subtitle:"Supplier inquiry sent; waiting for quotation."},
  quote_received:{title:"Quote Received",subtitle:"Supplier quotation received; prepare the next customer-facing work."},
  ready_sales:{title:"Ready for Sales",subtitle:"Operation work is ready to hand back to Sales."}
};

function queueFor(item:any):QueueKey{
  if(item.status==="ready_customer") return "ready_sales";
  if(item.supplier_status==="quote_received") return "quote_received";
  if(item.supplier_status==="waiting_quote") return "waiting_supplier";
  return "needs_review";
}

function ageLabel(value:string){
  if(!value) return "Updated recently";
  const time=new Date(value).getTime();
  if(!Number.isFinite(time)) return "Updated recently";
  const days=Math.max(0,Math.floor((Date.now()-time)/86400000));
  if(days===0) return "New / Today";
  if(days>=5) return `Waiting ${days}d · Attention`;
  return `Waiting ${days}d`;
}

export default async function OperationWorkspacePage({
  searchParams
}:{searchParams:Promise<Record<string,string|undefined>>}){
  const sp=await searchParams;
  const token=await internalToken();
  const user=await internalUser();
  if(!token||!user) notFound();

  const canViewAll=user.role==="manager"||user.username.toLowerCase()==="long";
  const requestedScope=sp.scope==="all"&&canViewAll?"all":"mine";
  const db=internalDb();
  const {data,error}=await db.rpc("staff_list_operation_queue",{p_token:token,p_scope:requestedScope});
  const items=Array.isArray(data)?data:[];
  const q=(sp.q||"").trim().toLowerCase();
  const filtered=q?items.filter((x:any)=>[
    x.inquiry_no,x.customer_name,x.destination,x.sales_owner_name,x.operation_assignee_name
  ].some(v=>String(v||"").toLowerCase().includes(q))):items;

  const assigned=filtered.filter((x:any)=>x.operation_assignee_id);
  const unassigned=filtered.filter((x:any)=>!x.operation_assignee_id);
  const queues=(Object.keys(queueMeta) as QueueKey[]).map(key=>({
    key,
    ...queueMeta[key],
    items:assigned.filter((x:any)=>queueFor(x)===key)
  }));

  return <div>
    <div className="page-head operation-workspace-head">
      <div>
        <span className="page-kicker">OPERATION WORKSPACE</span>
        <h1>Operation</h1>
        <p>以待办工作为中心查看 Supplier workflow，不需要先进入 Inquiry Library 找案件。</p>
      </div>
      <div className="operation-scope-switch">
        <Link className={requestedScope==="mine"?"active":""} href="/operation">My Queue</Link>
        {canViewAll&&<Link className={requestedScope==="all"?"active":""} href="/operation?scope=all">All Operation</Link>}
      </div>
    </div>

    <section className="operation-toolbar">
      <div>
        <strong>{requestedScope==="mine"?"My Operation Queue":"All Operation"}</strong>
        <span>{assigned.length} active case{assigned.length===1?"":"s"}</span>
      </div>
      <form>
        {requestedScope==="all"&&<input type="hidden" name="scope" value="all"/>}
        <input name="q" defaultValue={sp.q||""} placeholder="Search Inquiry / Customer / Destination / Sales"/>
        <button className="btn" type="submit">Search</button>
      </form>
    </section>

    {error&&<div className="save-message">Unable to load Operation queue: {error.message}</div>}

    {canViewAll&&requestedScope==="all"&&unassigned.length>0&&<section className="panel operation-unassigned">
      <div className="panel-head">
        <div><h2>Unassigned</h2><p className="panel-subtext">这些 active Inquiry 尚未分配 Operation，需要先安排负责人。</p></div>
        <span className="operation-count">{unassigned.length}</span>
      </div>
      <OperationRows items={unassigned}/>
    </section>}

    <div className="operation-queue-grid">
      {queues.map(queue=><section className="panel operation-queue-panel" key={queue.key}>
        <div className="panel-head operation-queue-title">
          <div><h2>{queue.title}</h2><p className="panel-subtext">{queue.subtitle}</p></div>
          <span className="operation-count">{queue.items.length}</span>
        </div>
        {queue.items.length?<OperationRows items={queue.items}/>:<div className="operation-empty">No cases in this queue.</div>}
      </section>)}
    </div>
  </div>;
}

function OperationRows({items}:{items:any[]}){
  return <div className="operation-case-list">
    {items.map((item:any)=><Link className="operation-case-row" href={"/inquiries/"+item.id} key={item.id}>
      <div className="operation-case-main">
        <strong>{item.inquiry_no}</strong>
        <span>{item.customer_name||"—"}</span>
      </div>
      <div className="operation-case-route">
        <strong>{item.destination||"—"}</strong>
        <span>{item.travel_start_date||"—"}{item.travel_end_date?" → "+item.travel_end_date:""}</span>
      </div>
      <div className="operation-case-meta">
        <span>{item.pax||"—"} Pax</span>
        <span>Sales: {item.sales_owner_name||"—"}</span>
        <span>OP: {item.operation_assignee_name||"Unassigned"}</span>
      </div>
      <div className="operation-case-state">
        <span className={"status status-"+item.supplier_status}>{supplierLabels[item.supplier_status]||item.supplier_status}</span>
        <small className={ageLabel(item.supplier_inquiry_updated_at||item.updated_at).includes("Attention")?"attention":""}>{ageLabel(item.supplier_inquiry_updated_at||item.updated_at)}</small>
      </div>
    </Link>)}
  </div>;
}
