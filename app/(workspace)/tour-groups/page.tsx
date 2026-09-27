import { createClient } from "@/utils/supabase/server";
import TourGroupCreator from "@/components/TourGroupCreator";

export default async function TourGroupsPage() {
  const supabase = await createClient();
  const { data: groups=[] } = await supabase.from("tour_groups")
    .select("id,name,destination,business_type,description,created_at,quotations(count)")
    .order("destination").order("name");

  const destinations = [...new Set((groups||[]).map((g:any)=>g.destination||"Others"))];
  return <div>
    <div className="page-head"><div><span className="page-kicker">TOUR LIBRARY</span><h1>Tour Groups</h1><p>把相同类型的团归在一起，方便复制旧报价和比较不同人数版本。</p></div></div>
    <TourGroupCreator />
    <div className="tour-group-sections">
      {destinations.map(dest=><section className="panel" key={dest}><div className="panel-head"><h2>{dest}</h2></div><div className="tour-card-grid">
        {(groups||[]).filter((g:any)=>(g.destination||"Others")===dest).map((g:any)=><div className="tour-card" key={g.id}><span>{g.business_type||"General"}</span><h3>{g.name}</h3><p>{g.description||"Reusable quotation group"}</p><b>{g.quotations?.[0]?.count||0} quotations</b></div>)}
      </div></section>)}
      {!groups?.length && <section className="panel empty">还没有 Tour Group。可以先建立「江西 8D7N」、「大阪京都奈良 7D5N」等常用团型。</section>}
    </div>
  </div>;
}
