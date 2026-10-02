import Link from "next/link";
import { notFound } from "next/navigation";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";

const operationStatusLabels:Record<string,string>={
  new:"New",
  in_progress:"In Progress",
  waiting_quote:"In Progress",
  under_review:"Under Review",
  revision_required:"Revision Required",
  ready:"Ready",
  ready_customer:"Ready"
};

type QueueKey="new"|"in_progress"|"under_review"|"revision_required"|"ready";

const queueMeta:Record<QueueKey,{title:string;subtitle:string}>={
  new:{title:"New",subtitle:"New Inquiry received from Sales; Operation has not started yet."},
  in_progress:{title:"In Progress",subtitle:"Operation is preparing supplier inquiry and quotation."},
  under_review:{title:"Under Review",subtitle:"Quotation submitted and waiting for management review."},
  revision_required:{title:"Revision Required",subtitle:"Management requested changes before quotation can be approved."},
  ready:{title:"Ready",subtitle:"Quotation approved and ready for Sales."}
};

function queueFor(item:any):QueueKey{
  if(item.status==="ready"||item.status==="ready_customer") return "ready";
  if(item.status==="revision_required") return "revision_required";
  if(item.status==="under_review") return "under_review";
  if(item.status==="new") return "new";
  return "in_progress";
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

  const expandedQueue=(Object.keys(queueMeta) as QueueKey[]).includes(sp.queue as QueueKey)?sp.queue as QueueKey:undefined;
  const queueHref=(queue?:QueueKey)=>{
    const params=new URLSearchParams();
    if(requestedScope==="all") params.set("scope","all");
    if(sp.q) params.set("q",sp.q);
    if(queue) params.set("queue",queue);
    const query=params.toString();
    return "/operation"+(query?"?"+query:"");
  };

  return <div className="operation-workspace-template">
    <div className="page-head operation-workspace-head">
      <div className="operation-workspace-title-block">
        <h1>Operation</h1>
        <p>{assigned.length} active case{assigned.length===1?"":"s"}</p>
      </div>
      <div className="operation-scope-switch">
        <Link className={requestedScope==="mine"?"active":""} href="/operation">My Operations</Link>
        {canViewAll&&<Link className={requestedScope==="all"?"active":""} href="/operation?scope=all">All Operations</Link>}
      </div>
    </div>

    <section className="operation-toolbar">
      <div>
        <strong>{requestedScope==="mine"?"My Operations":"All Operations"}</strong>
        <span>{assigned.length} active case{assigned.length===1?"":"s"}</span>
      </div>
      <form>
        {requestedScope==="all"&&<input type="hidden" name="scope" value="all"/>}
        <input name="q" defaultValue={sp.q||""} placeholder="Search inquiry, customer or destination"/>
        <button className="btn" type="submit">Search</button>
      </form>
    </section>

    {error&&<div className="save-message">Unable to load Operation queue: {error.message}</div>}

    {canViewAll&&requestedScope==="all"&&unassigned.length>0&&<section className="operation-queue-section operation-unassigned">
      <div className="panel-head">
        <div><h2>Unassigned</h2><p className="panel-subtext">这些 active Inquiry 尚未分配 Operation，需要先安排负责人。</p></div>
        <span className="operation-count">{unassigned.length}</span>
      </div>
      <OperationRows items={unassigned} returnTo={queueHref(expandedQueue)}/>
    </section>}

    <div className="operation-queue-grid">
      {queues.map(queue=>{
        const expanded=expandedQueue===queue.key;
        const visibleItems=expanded?queue.items:queue.items.slice(0,3);
        return <section className={"operation-queue-section operation-queue-panel operation-queue-"+queue.key+" "+(expanded?"expanded":"")} key={queue.key}>
          <div className="panel-head operation-queue-title">
            <div><h2>{queue.title}</h2><p className="panel-subtext">{queue.subtitle}</p></div>
            <span className="operation-count">{queue.items.length}</span>
          </div>
          {queue.items.length?<OperationRows items={visibleItems} returnTo={queueHref(expandedQueue)}/>:<div className="operation-empty">No cases in this queue.</div>}
          {queue.items.length>3&&<div className="operation-queue-footer">
            <Link href={expanded?queueHref():queueHref(queue.key)}>
              {expanded?"Show Less":"View All "+queue.items.length+" Cases →"}
            </Link>
          </div>}
        </section>;
      })}
    </div>
  </div>;
}

function OperationRows({items,returnTo}:{items:any[];returnTo:string}){
  return <div className="operation-case-list">
    <div className="operation-case-columns" aria-hidden="true">
      <span>Inquiry No.</span>
      <span>Customer</span>
      <span>Destination</span>
      <span>Travel Date</span>
      <span>Pax</span>
      <span>Sales</span>
      <span>Operation</span>
      <span>Status</span>
    </div>
    {items.map((item:any)=><Link className="operation-case-row" href={"/inquiries/"+item.id+"?returnTo="+encodeURIComponent(returnTo)} key={item.id}>
      <div className="operation-case-field operation-case-no">
        <span>Inquiry No.</span>
        <strong>{item.inquiry_no}</strong>
      </div>
      <div className="operation-case-field">
        <span>Customer</span>
        <strong>{item.customer_name||"—"}</strong>
      </div>
      <div className="operation-case-field">
        <span>Destination</span>
        <strong>{item.destination||"—"}</strong>
      </div>
      <div className="operation-case-field">
        <span>Travel Date</span>
        <strong>{item.travel_start_date||"—"}{item.travel_end_date?" → "+item.travel_end_date:""}</strong>
      </div>
      <div className="operation-case-field compact">
        <span>Pax</span>
        <strong>{item.pax||"—"}</strong>
      </div>
      <div className="operation-case-field compact">
        <span>Sales</span>
        <strong>{item.sales_owner_name||"—"}</strong>
      </div>
      <div className="operation-case-field compact">
        <span>Operation</span>
        <strong>{item.operation_assignee_name||"Unassigned"}</strong>
      </div>
      <div className="operation-case-state">
        <span className={"status status-"+item.status}>{operationStatusLabels[item.status]||item.status}</span>
        <small className={ageLabel(item.supplier_inquiry_updated_at||item.updated_at).includes("Attention")?"attention":""}>{ageLabel(item.supplier_inquiry_updated_at||item.updated_at)}</small>
      </div>
    </Link>)}
  </div>;
}
