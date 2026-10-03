import Link from "next/link";
import { internalDb, internalToken } from "@/lib/internalSession";
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
      {/* FOUNDATION LOCK: Quotation Library tables may expose at most 7 primary columns.
          Additional data belongs in secondary text or Quotation Detail. */}
      <div className="data-table-wrap"><table className="data-table quotation-table"><thead><tr><th><UiText en="Quote No" zh="报价编号" /></th><th><UiText en="Tour" zh="行程" /></th><th><UiText en="Customer" zh="客户" /></th><th><UiText en="Pax" zh="人数" /></th><th><UiText en="Status" zh="状态" /></th><th><UiText en="Selling" zh="售价" /></th></tr></thead><tbody>
        {quotes.map((x:any)=><tr key={x.id}>
          <td><Link href={"/quotations/"+x.id}>{x.quotation_no}</Link></td>
          <td>
            <strong><Link href={"/quotations/"+x.id}>{x.title}</Link></strong>
            <small>{[x.destination,x.tour_group_name||null].filter(Boolean).join(" · ")||<UiText en="Unclassified" zh="未分类" />}</small>
          </td>
          <td>{x.customer_name||"—"}</td>
          <td>{x.pax}</td>
          <td>{/* FOUNDATION LOCK: normal workflow labels stay compact: Draft / Review / Ready / Confirmed. */}
            <span className={"status status-"+x.status}>{x.status==="under_review"?<UiText en="Review" zh="审核" />:x.status==="revision_required"?<UiText en="Revision Required" zh="需要修改" />:x.status==="ready"?<UiText en="Ready" zh="已就绪" />:x.status==="sent"?<UiText en="Sent" zh="已发送" />:x.status==="revised"?<UiText en="Revised" zh="已修改" />:x.status==="confirmed"?<UiText en="Confirmed" zh="已确认" />:x.status==="lost"?<UiText en="Lost" zh="未成交" />:x.status==="archived"?<UiText en="Archived" zh="已归档" />:<UiText en="Draft" zh="草稿" />}</span></td>
          <td>{money(Number(x.selling_price))}</td>
        </tr>)}
        {!quotes.length&&<tr><td colSpan={6} className="empty"><UiText en="No quotations match the current filters." zh="没有符合条件的报价。" /></td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}
