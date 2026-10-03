import Link from "next/link";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import {UiText} from "@/components/WorkspaceLanguage";
import InquiryFilters from "@/components/InquiryFilters";

const baseStatusLabels:Record<string,{en:string;zh:string}>={
  new:{en:"New",zh:"新案件"},
  in_progress:{en:"In Progress",zh:"处理中"},
  waiting_quote:{en:"In Progress",zh:"处理中"},
  under_review:{en:"Under Review",zh:"审核中"},
  revision_required:{en:"Revision Required",zh:"需要修改"},
  ready:{en:"Ready",zh:"已就绪"},
  ready_customer:{en:"Ready",zh:"已就绪"},
  itinerary_ready:{en:"Itinerary Ready",zh:"行程已完成"},
  closed:{en:"Closed",zh:"已关闭"}
};

export default async function InquiryListPage({
  searchParams
}:{searchParams:Promise<Record<string,string|undefined>>}){
  const sp=await searchParams;
  const token=await internalToken();
  const user=await internalUser();
  const db=internalDb();
  const response=token?await db.rpc("staff_list_inquiries",{p_token:token}):{data:[] as any[],error:null};
  let items=Array.isArray(response.data)?response.data:[];

  const q=(sp.q||"").trim().toLowerCase();
  if(sp.status) items=items.filter((x:any)=>x.status===sp.status);
  if(q) items=items.filter((x:any)=>[
    x.inquiry_no,
    x.customer_name,
    x.destination,
    x.sales_owner_name,
    x.operation_assignee_name
  ].some((v:any)=>String(v||"").toLowerCase().includes(q)));

  return <div className="inquiry-library-template">
    <div className="page-head inquiry-library-head">
      <div className="inquiry-library-title-block">
        <h1><UiText en="Inquiry" zh="询价" /></h1>
        <p>{items.length} <UiText en={items.length===1?"inquiry":"inquiries"} zh="个询价案件" /></p>
      </div>
      <Link className="btn primary" href="/inquiries/new"><UiText en="+ New Inquiry" zh="+ 新建询价" /></Link>
    </div>

    <InquiryFilters q={sp.q||""} status={sp.status||""}/>

    <section className="panel">
      {response.error&&<div className="save-message"><UiText en="Unable to load inquiries:" zh="无法载入询价案件：" /> {response.error.message}</div>}
      <div className="data-table-wrap">
        <table className="data-table inquiry-table">
          <thead><tr>
            <th><UiText en="Inquiry" zh="询价" /></th>
            <th><UiText en="Destination" zh="目的地" /></th>
            <th><UiText en="Travel Date" zh="旅游日期" /></th>
            <th><UiText en="Pax" zh="人数" /></th>
            <th><UiText en="Sales" zh="销售" /></th>
            <th><UiText en="Operation" zh="运营" /></th>
            <th><UiText en="Status" zh="状态" /></th>
          </tr></thead>
          <tbody>
            {items.map((i:any)=><tr key={i.id}>
              <td className="inquiry-primary-cell">
                <Link href={"/inquiries/"+i.id}>{i.inquiry_no}</Link>
                <small>{i.customer_name||"—"}</small>
              </td>
              <td>{i.destination||"—"}</td>
              <td>{i.travel_start_date||"—"}{i.travel_end_date?" → "+i.travel_end_date:""}</td>
              <td>{i.pax||"—"}</td>
              <td>{i.sales_owner_name||"—"}</td>
              <td>{i.operation_assignee_name||"—"}</td>
              <td><span className={"status status-"+i.status}>
                {i.status==="revision_required"&&user?.role!=="manager"
                  ?<UiText en="Re-quote" zh="重新报价" />
                  :baseStatusLabels[i.status]
                    ?<UiText en={baseStatusLabels[i.status].en} zh={baseStatusLabels[i.status].zh} />
                    :i.status}
              </span></td>
            </tr>)}
            {!items.length&&<tr><td colSpan={7} className="empty"><UiText en="No inquiries yet." zh="还没有询价案件。" /></td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}
