import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import TrashActions from "@/components/TrashActions";

const money=(n:number)=>new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR"}).format(n||0).replace("MYR","RM");

export default async function TrashPage(){
  const user=await internalUser();
  if(!user||user.role!=="manager") return <div className="panel">Manager only.</div>;
  const token=await internalToken();
  const db=internalDb();
  const {data}=token?await db.rpc("staff_list_trash",{p_token:token}):{data:[]};
  const items=Array.isArray(data)?data:[];

  return <div>
    <div className="page-head">
      <div><span className="page-kicker">TRASH</span><h1>Deleted Quotations</h1><p>这里显示被隐藏的报价。资料仍保留，可由 Manager 恢复。</p></div>
    </div>
    <section className="panel">
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Quote No</th><th>Tour</th><th>Sales</th><th>Customer</th><th>Pax</th><th>Selling</th><th>Deleted By</th><th>Deleted</th><th>Action</th></tr></thead><tbody>
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
        {!items.length&&<tr><td colSpan={9} className="empty">Trash is empty.</td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}
