import Link from "next/link";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import {UiText} from "@/components/WorkspaceLanguage";

const money=(n:number)=>new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR"}).format(n||0).replace("MYR","RM");

export default async function DashboardPage() {
  const user = await internalUser();
  const token = await internalToken();
  const db = internalDb();

  const { data } = token
    ? await db.rpc("staff_list_quotes", { p_token: token })
    : { data: [] };

  const all = Array.isArray(data) ? data : [];
  const recent = all.slice(0,8);
  const confirmed = all.filter((q:any)=>q.status==="confirmed").length;
  const total = all.reduce((s:number,q:any)=>s+Number(q.selling_price||0),0);
  const avgMargin = all.length ? all.reduce((s:number,q:any)=>s+Number(q.margin||0),0)/all.length : 0;

  return <div>
    <div className="page-head workspace-flat-head dashboard-page-head">
      <div>
        <h1><UiText en="Good day" zh="你好" />, {user?.name || "Team"}</h1>
        <p>{user?.role==="manager"?<UiText en="Review team quotation performance and latest progress." zh="查看团队报价表现与最新进度。" />:<UiText en="Manage your quotations, tour groups and customer follow-up." zh="管理你的报价、团型与客户跟进。" />}</p>
      </div>
      <Link className="btn primary" href="/quotations/new">＋ <UiText en="New Quotation" zh="新建报价" /></Link>
    </div>

    <section className="dashboard-overview-strip">
      <OverviewMetric label={user?.role==="manager"?<UiText en="Team Quotations" zh="团队报价" />:<UiText en="My Quotations" zh="我的报价" />} value={String(all.length)} />
      <OverviewMetric label={<UiText en="Confirmed" zh="已确认" />} value={String(confirmed)} />
      <OverviewMetric label={<UiText en="Quoted Value" zh="报价总额" />} value={money(total)} />
      <OverviewMetric label={<UiText en="Average Margin" zh="平均利润率" />} value={(avgMargin*100).toFixed(1)+"%"} />
    </section>

    <section className="panel dashboard-recent-panel">
      <div className="panel-head"><h2><UiText en="Recent Quotations" zh="最近报价" /></h2><Link href="/quotations"><UiText en="View all" zh="查看全部" /></Link></div>
      <div className="data-table-wrap"><table className="data-table dashboard-recent-table"><thead><tr><th><UiText en="Quotation" zh="报价" /></th><th><UiText en="Type" zh="类型" /></th><th><UiText en="Pax" zh="人数" /></th><th><UiText en="Status" zh="状态" /></th><th><UiText en="Selling" zh="售价" /></th><th><UiText en="Margin" zh="利润率" /></th><th><UiText en="Updated" zh="更新时间" /></th></tr></thead><tbody>
        {recent.map((q:any)=><tr key={q.id}>
          <td className="dashboard-quotation-primary">
            <Link href={"/quotations/"+q.id+"?returnTo="+encodeURIComponent("/dashboard")}>{q.quotation_no}</Link>
            <small>{q.title||"—"}</small>
          </td>
          <td>{q.tour_type||"—"}</td>
          <td>{q.pax}</td>
          <td><span className={"status status-"+q.status}>{q.status==="confirmed"?<UiText en="Confirmed" zh="已确认" />:q.status==="ready"?<UiText en="Ready" zh="已就绪" />:q.status==="under_review"?<UiText en="Under Review" zh="审核中" />:q.status==="revision_required"?<UiText en="Revision Required" zh="需要修改" />:q.status==="draft"?<UiText en="Draft" zh="草稿" />:q.status}</span></td>
          <td>{money(Number(q.selling_price))}</td>
          <td>{(Number(q.margin)*100).toFixed(1)}%</td>
          <td>{new Date(q.updated_at).toLocaleDateString("en-MY")}</td>
        </tr>)}
        {!recent.length && <tr><td colSpan={7} className="empty"><UiText en="No quotations yet. Create the first quotation." zh="还没有报价。先建立第一张报价。" /></td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}
function OverviewMetric({label,value}:{label:React.ReactNode;value:string}){return <div className="dashboard-overview-metric"><span>{label}</span><b>{value}</b></div>}
