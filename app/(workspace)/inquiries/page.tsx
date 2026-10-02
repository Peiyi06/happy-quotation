import Link from "next/link";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import {UiText} from "@/components/WorkspaceLanguage";
import InquiryRows from "./InquiryRows";

export default async function InquiryListPage({
  searchParams
}:{searchParams:Promise<Record<string,string|undefined>>}){
  const sp=await searchParams;
  const token=await internalToken();
  const user=await internalUser();
  const db=internalDb();
  const response=token?await db.rpc("staff_list_inquiries",{p_token:token}):{data:[] as any[],error:null};
  const data=response.data;
  const error=response.error;
  const items=Array.isArray(data)?data:[];
  const q=(sp.q||"").trim().toLowerCase();
  const filtered=q?items.filter((x:any)=>[
    x.inquiry_no,
    x.customer_name,
    x.destination,
    x.sales_owner_name,
    x.operation_assignee_name,
    x.status
  ].some(v=>String(v||"").toLowerCase().includes(q))):items;
  const returnTo="/inquiries"+(sp.q?"?q="+encodeURIComponent(sp.q):"");

  return <div className="inquiry-list-page inquiry-workspace-template">
    <div className="page-head inquiry-list-header">
      <div className="inquiry-list-title">
        <h1><UiText en="Inquiries" zh="询价案件" /></h1>
        <p>{filtered.length} <UiText en={filtered.length===1?"case":"cases"} zh="个案件" /></p>
      </div>
      <div className="detail-actions">
        <Link className="btn primary" href="/inquiries/new">+ <UiText en="New Inquiry" zh="新建询价" /></Link>
      </div>
    </div>

    <section className="inquiry-list-toolbar inquiry-operation-toolbar">
      <div>
        <strong><UiText en="All Inquiries" zh="全部询价" /></strong>
        <span>{filtered.length} <UiText en={filtered.length===1?"case":"cases"} zh="个案件" /></span>
      </div>
      <form>
        <input name="q" defaultValue={sp.q||""} placeholder="Search inquiry, customer or destination"/>
        <button className="btn" type="submit"><UiText en="Search" zh="搜索" /></button>
      </form>
    </section>

    {error&&<div className="save-message"><UiText en="Unable to load inquiries:" zh="无法载入询价案件：" /> {error.message}</div>}

    <section className="inquiry-queue-section">
      <div className="panel-head inquiry-queue-title">
        <div>
          <h2><UiText en="Inquiry Queue" zh="询价队列" /></h2>
          <p className="panel-subtext"><UiText en="Review customer requests and open a case for more details." zh="查看客户需求，并展开案件以查看更多资料。" /></p>
        </div>
        <span className="operation-count">{filtered.length}</span>
      </div>

      {filtered.length
        ?<InquiryRows items={filtered} isManager={user?.role==="manager"} returnTo={returnTo}/>
        :<div className="operation-empty"><UiText en="No inquiries found." zh="没有找到询价案件。" /></div>}
    </section>
  </div>;
}
