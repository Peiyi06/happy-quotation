import { internalDb, internalToken } from "@/lib/internalSession";
import TourGroupCreator from "@/components/TourGroupCreator";
import {UiText} from "@/components/WorkspaceLanguage";

export default async function TourGroupsPage(){
  const token=await internalToken();
  const db=internalDb();
  const {data}=token?await db.rpc("staff_list_groups",{p_token:token}):{data:[]};
  const groups=Array.isArray(data)?data:[];
  const destinations=[...new Set(groups.map((g:any)=>g.destination||"Others"))];

  return <div>
    <div className="page-head page-compact-header"><div><span className="page-kicker"><UiText en="TOUR LIBRARY" zh="旅游团资料库" /></span><h1><UiText en="Tour Groups" zh="旅游团" /></h1><p><UiText en="Group similar tours together to reuse past quotations and compare different pax versions." zh="把相同类型的团归在一起，方便复制旧报价和比较不同人数版本。" /></p></div></div>
    <TourGroupCreator />
    <div className="tour-group-sections">
      {destinations.map((dest:any)=><section className="panel" key={dest}><div className="panel-head"><h2>{dest}</h2></div><div className="tour-card-grid">
        {groups.filter((g:any)=>(g.destination||"Others")===dest).map((g:any)=><div className="tour-card" key={g.id}><span>{g.business_type||<UiText en="General" zh="一般" />}</span><h3>{g.name}</h3><p>{g.description||<UiText en="Reusable quotation group" zh="可重复使用的报价团组" />}</p><b>{g.quotation_count||0} <UiText en="quotations" zh="份报价" /></b></div>)}
      </div></section>)}
      {!groups.length&&<section className="panel empty"><UiText en="No Tour Groups yet. Create common groups such as Jiangxi 8D7N or Osaka Kyoto Nara 7D5N." zh="还没有 Tour Group。可以先建立「江西 8D7N」、「大阪京都奈良 7D5N」等常用团型。" /></section>}
    </div>
  </div>;
}
