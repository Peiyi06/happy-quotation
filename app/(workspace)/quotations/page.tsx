import Link from "next/link";
import { internalDb, internalToken } from "@/lib/internalSession";
import QuotationRowActions from "@/components/QuotationRowActions";
import NewQuotationMenu from "@/components/NewQuotationMenu";
import QuotationFilters from "@/components/QuotationFilters";
import {UiText} from "@/components/WorkspaceLanguage";

const money=(n:number)=>new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR"}).format(n||0).replace("MYR","RM");

export default async function QuotationsPage({ searchParams }:{searchParams:Promise<Record<string,string|undefined>>}) {
  const sp=await searchParams;
  const token=await internalToken();
  const db=internalDb();
  const {data}=token?await db.rpc("staff_list_quotes",{p_token:token}):{data:[]};
  let quotes=Array.isArray(data)?data:[];

  const q=(sp.q||"").toLowerCase();
  const destination=(sp.destination||"").toLowerCase();
  if(sp.status) quotes=quotes.filter((x:any)=>x.status===sp.status);
  if(destination) quotes=quotes.filter((x:any)=>(x.destination||"").toLowerCase().includes(destination));
  if(q) quotes=quotes.filter((x:any)=>[x.quotation_no,x.title,x.customer_name].some((v:any)=>(v||"").toLowerCase().includes(q)));

  return <div className="quotation-library-template">
    <div className="page-head quotation-library-head">
      <div className="quotation-library-title-block">
        <h1><UiText en="Quotation" zh="报价" /></h1>
        <p>{quotes.length} <UiText en={quotes.length===1?"quotation":"quotations"} zh="份报价" /></p>
      </div>
      <NewQuotationMenu />
    </div>
    <QuotationFilters q={sp.q||""} destination={sp.destination||""} status={sp.status||""}/>
    <section className="panel quotation-library-table-panel">
      <div className="data-table-wrap"><table className="data-table quotation-table"><thead><tr><th><UiText en="Quote No" zh="报价编号" /></th><th><UiText en="Tour" zh="行程" /></th><th><UiText en="Group" zh="团型" /></th><th><UiText en="Customer" zh="客户" /></th><th><UiText en="Pax" zh="人数" /></th><th><UiText en="Status" zh="状态" /></th><th><UiText en="Selling" zh="售价" /></th><th><UiText en="Margin" zh="利润率" /></th><th><UiText en="Updated" zh="更新时间" /></th><th><UiText en="Action" zh="操作" /></th></tr></thead><tbody>
        {quotes.map((x:any)=><tr key={x.id}><td><Link href={"/quotations/"+x.id}>{x.quotation_no}</Link></td><td><strong>{x.title}</strong><small>{x.destination||""}</small></td><td>{x.tour_group_name||<UiText en="Unclassified" zh="未分类" />}</td><td>{x.customer_name||"—"}</td><td>{x.pax}</td><td><span className={"status status-"+x.status}>{x.status==="under_review"?<UiText en="Under Review" zh="审核中" />:x.status==="revision_required"?<UiText en="Revision Required" zh="需要修改" />:x.status==="ready"?<UiText en="Ready" zh="已就绪" />:x.status==="sent"?<UiText en="Sent" zh="已发送" />:x.status==="revised"?<UiText en="Revised" zh="已修改" />:x.status==="confirmed"?<UiText en="Confirmed" zh="已确认" />:x.status==="lost"?<UiText en="Lost" zh="未成交" />:x.status==="archived"?<UiText en="Archived" zh="已归档" />:<UiText en="Draft" zh="草稿" />}</span></td><td>{money(Number(x.selling_price))}</td><td>{(Number(x.margin)*100).toFixed(1)}%</td><td>{new Date(x.updated_at).toLocaleDateString("en-MY")}</td><td><QuotationRowActions id={x.id}/></td></tr>)}
        {!quotes.length&&<tr><td colSpan={10} className="empty"><UiText en="No quotations match the current filters." zh="没有符合条件的报价。" /></td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}
