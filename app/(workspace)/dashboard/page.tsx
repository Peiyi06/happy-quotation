import Link from "next/link";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";

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
    <div className="page-head">
      <div>
        <span className="page-kicker">WORKSPACE</span>
        <h1>Good day, {user?.name || "Team"}</h1>
        <p>{user?.role==="manager" ? "查看团队报价表现与最新进度。" : "管理你的报价、团型与客户跟进。"}</p>
      </div>
      <Link className="btn primary" href="/quotations/new">＋ New Quotation</Link>
    </div>

    <section className="dashboard-cards">
      <DashCard label={user?.role==="manager" ? "Team Quotations" : "My Quotations"} value={String(all.length)} />
      <DashCard label="Confirmed" value={String(confirmed)} />
      <DashCard label="Quoted Value" value={money(total)} />
      <DashCard label="Average Margin" value={(avgMargin*100).toFixed(1)+"%"} strong />
    </section>

    <section className="panel">
      <div className="panel-head"><h2>Recent Quotations</h2><Link href="/quotations">View all</Link></div>
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Quote No</th><th>Tour</th><th>Type</th><th>Pax</th><th>Status</th><th>Selling</th><th>Margin</th><th>Updated</th></tr></thead><tbody>
        {recent.map((q:any)=><tr key={q.id}><td><Link href={"/quotations/"+q.id}>{q.quotation_no}</Link></td><td>{q.title}</td><td>{q.business_type||"—"}</td><td>{q.pax}</td><td><span className={"status status-"+q.status}>{q.status}</span></td><td>{money(Number(q.selling_price))}</td><td>{(Number(q.margin)*100).toFixed(1)}%</td><td>{new Date(q.updated_at).toLocaleDateString("en-MY")}</td></tr>)}
        {!recent.length && <tr><td colSpan={8} className="empty">还没有报价。先建立第一张报价。</td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}
function DashCard({label,value,strong}:{label:string;value:string;strong?:boolean}){return <div className={"dash-card "+(strong?"strong":"")}><span>{label}</span><b>{value}</b></div>}
