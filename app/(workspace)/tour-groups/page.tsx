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
    <TourGroupCreator />
    <div className="tour-group-sections">
      {destinations.map((dest:any)=><section className="panel tour-group-section" key={dest}>
        <div className="panel-head tour-group-section-head"><h2>{dest}</h2><span>{groups.filter((g:any)=>(g.destination||"Others")===dest).length}</span></div>
        <div className="tour-group-list">
          {groups.filter((g:any)=>(g.destination||"Others")===dest).map((g:any)=><div className="tour-group-row" key={g.id}>
            <div className="tour-group-row-main">
              <strong>{g.name}</strong>
              <span>{g.description||<UiText en="Reusable quotation group" zh="可重复使用的报价团组" />}</span>
            </div>
            <div className="tour-group-row-meta">
              <span>{g.business_type||<UiText en="General" zh="一般" />}</span>
              <b>{g.quotation_count||0} <UiText en="quotations" zh="份报价" /></b>
            </div>
          </div>)}
        </div>
      </section>)}
      {!groups.length&&<section className="panel empty"><UiText en="No Tour Groups yet. Create common groups such as Jiangxi 8D7N or Osaka Kyoto Nara 7D5N." zh="还没有 Tour Group。可以先建立「江西 8D7N」、「大阪京都奈良 7D5N」等常用团型。" /></section>}
    </div>
  </div>;
}
