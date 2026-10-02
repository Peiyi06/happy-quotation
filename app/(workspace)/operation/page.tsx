import Link from "next/link";
import { notFound } from "next/navigation";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import OperationRows from "./OperationRows";
import styles from "./OperationWorkspace.module.css";
import {UiText} from "@/components/WorkspaceLanguage";

type QueueKey="new"|"in_progress"|"under_review"|"revision_required"|"ready";

const queueMeta:Record<QueueKey,{title:{en:string;zh:string};subtitle:{en:string;zh:string}}>={
  new:{title:{en:"New",zh:"新案件"},subtitle:{en:"New Inquiry received from Sales; Operation has not started yet.",zh:"Sales 新提交的询价，Operation 尚未开始处理。"}},
  in_progress:{title:{en:"In Progress",zh:"处理中"},subtitle:{en:"Operation is preparing supplier inquiry and quotation.",zh:"Operation 正在准备供应商询价与报价。"}},
  under_review:{title:{en:"Under Review",zh:"审核中"},subtitle:{en:"Quotation submitted and waiting for management review.",zh:"报价已提交，等待管理层审核。"}},
  revision_required:{title:{en:"Revision Required",zh:"需要修改"},subtitle:{en:"Management requested changes before quotation can be approved.",zh:"管理层要求修改报价后再审核。"}},
  ready:{title:{en:"Ready",zh:"已就绪"},subtitle:{en:"Quotation approved and ready for Sales.",zh:"报价已通过，可交由 Sales 继续处理。"}}
};

function queueFor(item:any):QueueKey{
  if(item.status==="ready"||item.status==="ready_customer") return "ready";
  if(item.status==="revision_required") return "revision_required";
  if(item.status==="under_review") return "under_review";
  if(item.status==="new") return "new";
  return "in_progress";
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
        <h1><UiText en="Operation" zh="运营" /></h1>
        <p>{assigned.length} <UiText en={assigned.length===1?"active case":"active cases"} zh="个进行中案件" /></p>
      </div>
      <div className="operation-scope-switch">
        <Link className={requestedScope==="mine"?"active":""} href="/operation"><UiText en="My Operations" zh="我的运营案件" /></Link>
        {canViewAll&&<Link className={requestedScope==="all"?"active":""} href="/operation?scope=all"><UiText en="All Operations" zh="全部运营案件" /></Link>}
      </div>
    </div>

    <section className="operation-toolbar">
      <div>
        <strong>{requestedScope==="mine"?<UiText en="My Operations" zh="我的运营案件" />:<UiText en="All Operations" zh="全部运营案件" />}</strong>
        <span>{assigned.length} <UiText en={assigned.length===1?"active case":"active cases"} zh="个进行中案件" /></span>
      </div>
      <form>
        {requestedScope==="all"&&<input type="hidden" name="scope" value="all"/>}
        <input name="q" defaultValue={sp.q||""} placeholder="Search inquiry, customer or destination"/>
        <button className="btn" type="submit"><UiText en="Search" zh="搜索" /></button>
      </form>
    </section>

    {error&&<div className="save-message"><UiText en="Unable to load Operation queue:" zh="无法载入运营队列：" /> {error.message}</div>}

    {canViewAll&&requestedScope==="all"&&unassigned.length>0&&<section className={"operation-queue-section operation-unassigned "+styles.queueSection}>
      <div className="panel-head">
        <div><h2><UiText en="Unassigned" zh="未分配" /></h2><p className="panel-subtext"><UiText en="These active inquiries have not been assigned to Operation yet." zh="这些进行中的询价尚未分配 Operation，需要先安排负责人。" /></p></div>
        <span className="operation-count">{unassigned.length}</span>
      </div>
      <OperationRows items={unassigned.slice(0,5)} returnTo={queueHref(expandedQueue)}/>
      {unassigned.length>5&&<div className="operation-queue-footer">
        <span>{unassigned.length-5} <UiText en={unassigned.length-5===1?"more unassigned case":"more unassigned cases"} zh="个未分配案件" /></span>
      </div>}
    </section>}

    <div className={"operation-queue-grid "+styles.queueGrid}>
      {queues.map(queue=>{
        const expanded=expandedQueue===queue.key;
        const visibleItems=expanded?queue.items:queue.items.slice(0,5);
        return <section className={"operation-queue-section operation-queue-panel operation-queue-"+queue.key+" "+styles.queueSection+" "+(expanded?"expanded":"")} key={queue.key}>
          <div className="panel-head operation-queue-title">
            <div><h2><UiText en={queue.title.en} zh={queue.title.zh} /></h2><p className="panel-subtext"><UiText en={queue.subtitle.en} zh={queue.subtitle.zh} /></p></div>
            <span className="operation-count">{queue.items.length}</span>
          </div>
          {queue.items.length?<OperationRows items={visibleItems} returnTo={queueHref(expandedQueue)}/>:<div className="operation-empty"><UiText en="No cases in this queue." zh="此队列目前没有案件。" /></div>}
          {queue.items.length>5&&<div className="operation-queue-footer">
            <Link href={expanded?queueHref():queueHref(queue.key)}>
              {expanded?<UiText en="Show Less" zh="收起" />:<><UiText en="View All" zh="查看全部" /> {" "+queue.items.length+" "}<UiText en="Cases →" zh="个案件 →" /></>}
            </Link>
          </div>}
        </section>;
      })}

      <section className={"operation-queue-section operation-queue-panel operation-queue-itinerary_ready operation-coming-soon "+styles.queueSection} aria-disabled="true">
        <div className="panel-head operation-queue-title">
          <div><h2><UiText en="Itinerary Ready" zh="行程已完成" /></h2><p className="panel-subtext"><UiText en="Completed itinerary tracking will be available here." zh="未来已完成的行程会在这里追踪。" /></p></div>
          <span className="operation-coming-soon-badge"><UiText en="Coming Soon" zh="即将推出" /></span>
        </div>
        <div className="operation-empty"><UiText en="Coming soon." zh="即将推出。" /></div>
      </section>
    </div>
  </div>;
}
