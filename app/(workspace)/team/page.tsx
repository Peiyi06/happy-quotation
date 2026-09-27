import { createClient } from "@/utils/supabase/server";
import TeamRoleSelect from "@/components/TeamRoleSelect";

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id",user!.id).single();
  if(me?.role!=="manager") return <div className="panel">Manager only.</div>;

  const { data: profiles=[] } = await supabase.from("profiles").select("id,full_name,email,role,created_at").order("created_at");
  return <div>
    <div className="page-head"><div><span className="page-kicker">TEAM</span><h1>Sales Team</h1><p>Manager 可以调整员工角色。</p></div></div>
    <section className="panel"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead><tbody>
      {(profiles||[]).map((p:any)=><tr key={p.id}><td>{p.full_name||"—"}</td><td>{p.email}</td><td><TeamRoleSelect id={p.id} role={p.role} disabled={p.id===user!.id}/></td><td>{new Date(p.created_at).toLocaleDateString("en-MY")}</td></tr>)}
    </tbody></table></div></section>
  </div>;
}
