import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import TrashActions from "@/components/TrashActions";
import {UiText} from "@/components/WorkspaceLanguage";

const money=(n:number)=>new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR"}).format(n||0).replace("MYR","RM");

export default async function TrashPage(){
  const user=await internalUser();
  if(!user||user.role!=="manager") return <div className="panel"><UiText en="Manager only." zh="仅限 Manager 使用。" /></div>;
  const token=await internalToken();
  const db=internalDb();
  const {data}=token?await db.rpc("staff_list_trash",{p_token:token}):{data:[]};
  const items=Array.isArray(data)?data:[];

  return <div>
    <div className="page-head workspace-flat-head">
      <div><h1><UiText en="Deleted Quotations" zh="已删除报价" /></h1><p><UiText en="Hidden quotations are kept here and can be restored by a Manager." zh="这里显示被隐藏的报价。资料仍保留，可由 Manager 恢复。" /></p></div>
    </div>
    <section className="panel trash-table-panel">
      <div className="data-table-wrap"><table className="data-table trash-table"><thead><tr><th><UiText en="Quote No" zh="报价编号" /></th><th><UiText en="Tour" zh="行程" /></th><th><UiText en="Sales" zh="销售" /></th><th><UiText en="Customer" zh="客户" /></th><th><UiText en="Pax" zh="人数" /></th><th><UiText en="Selling" zh="售价" /></th><th><UiText en="Deleted By" zh="删除者" /></th><th><UiText en="Deleted" zh="删除时间" /></th><th><UiText en="Action" zh="操作" /></th></tr></thead><tbody>
        {items.map((x:any)=><tr key={x.id}>
          <td>{x.quotation_no}</td>
          <td><strong>{x.title}</strong><small>{x.destination||""}</small></td>
          <td>{x.owner_name||"—"}</td>
          <td>{x.customer_name||"—"}</td>
          <td>{x.pax}</td>
          <td>{money(Number(x.selling_price))}</td>
          <td>{x.deleted_by_name||"—"}</td>
          <td>{new Date(x.deleted_at).toLocaleString("en-MY")}</td>
          <td><TrashActions id={x.id}/></td>
        </tr>)}
        {!items.length&&<tr><td colSpan={9} className="empty"><UiText en="Trash is empty." zh="回收站目前为空。" /></td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}
