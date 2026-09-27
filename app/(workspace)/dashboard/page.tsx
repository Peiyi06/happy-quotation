import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

const money=(n:number)=>new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR"}).format(n||0).replace("MYR","RM");

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name,role").eq("id",user!.id).single();
  const { data: quotes=[] } = await supabase.from("quotations")
    .select("id,quotation_no,title,business_type,pax,status,selling_price,margin,updated_at,profiles(full_name)")
    .order("updated_at",{ascending:false})
    .limit(8);

  const all = quotes || [];
  const confirmed = all.filter((q:any)=>q.status==="confirmed").length;
  const total = all.reduce((s:number,q:any)=>s+Number(q.selling_price||0),0);
  const avgMargin = all.length ? all.reduce((s:number,q:any)=>s+Number(q.margin||0),0)/all.length : 0;

  return <div>
    <div className="page-head">
      <div><span className="page-kicker">WORKSPACE</span><h1>Good day, {profile?.full_name || "Team"}</h1><p>{profile?.role==="manager" ? "查看团队报价表现与最新进度。" : "管理你的报价、团型与客户跟进。"}</p></div>
      <Link className="btn primary" href="/quotations/new">＋ New Quotation</Link>
    </div>

    <section className="dashboard-cards">
      <DashCard label={profile?.role==="manager" ? "Recent Team Quotes" : "My Recent Quotes"} value={String(all.length)} />
      <DashCard label="Confirmed" value={String(confirmed)} />
      <DashCard label="Quoted Value" value={money(total)} />
      <DashCard label="Average Margin" value={(avgMargin*100).toFixed(1)+"%"} strong />
    </section>

    <section className="panel">
      <div className="panel-head"><h2>Recent Quotations</h2><Link href="/quotations">View all</Link></div>
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Quote No</th><th>Tour</th><th>Type</th><th>Pax</th><th>Status</th><th>Selling</th><th>Margin</th><th>Updated</th></tr></thead><tbody>
        {all.map((q:any)=><tr key={q.id}><td><Link href={"/quotations/"+q.id}>{q.quotation_no}</Link></td><td>{q.title}</td><td>{q.business_type||"—"}</td><td>{q.pax}</td><td><span className={"status status-"+q.status}>{q.status}</span></td><td>{money(Number(q.selling_price))}</td><td>{(Number(q.margin)*100).toFixed(1)}%</td><td>{new Date(q.updated_at).toLocaleDateString("en-MY")}</td></tr>)}
        {!all.length && <tr><td colSpan={8} className="empty">还没有报价。先建立第一张报价。</td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}
function DashCard({label,value,strong}:{label:string;value:string;strong?:boolean}){return <div className={"dash-card "+(strong?"strong":"")}><span>{label}</span><b>{value}</b></div>}
