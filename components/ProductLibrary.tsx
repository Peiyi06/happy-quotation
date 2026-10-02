"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

type Product={
  id:string;
  product_code:string;
  name:string;
  destination?:string|null;
  product_type?:string|null;
  days_count:number;
  nights_count:number;
  pax_basis?:number|null;
  selling_price?:number|null;
  quotation_ready:boolean;
  itinerary_ready:boolean;
  status:"draft"|"ready"|"archived";
};

// Product Library is intentionally independent from Inquiry / Quotation / Itinerary workflows.
const statusLabel:Record<string,string>={
  draft:"Draft",
  ready:"Ready to Sell",
  archived:"Archived"
};

export default function ProductLibrary({initialProducts,canCreate}:{initialProducts:Product[];canCreate:boolean}){
  const router=useRouter();
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;
  const statusText=(value:string)=>value==="draft"?t("Draft","草稿"):value==="ready"?t("Ready to Sell","可销售"):value==="archived"?t("Archived","已归档"):value;
  const [products,setProducts]=useState(initialProducts);
  const [status,setStatus]=useState<"all"|"ready"|"draft"|"archived">("all");
  const [query,setQuery]=useState("");
  const [destination,setDestination]=useState("all");
  const [type,setType]=useState("all");
  const [creating,setCreating]=useState(false);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  const destinations=useMemo(()=>Array.from(new Set(products.map(p=>p.destination).filter(Boolean) as string[])).sort(),[products]);
  const types=useMemo(()=>Array.from(new Set(products.map(p=>p.product_type).filter(Boolean) as string[])).sort(),[products]);

  const counts=useMemo(()=>({
    all:products.length,
    ready:products.filter(p=>p.status==="ready").length,
    draft:products.filter(p=>p.status==="draft").length,
    archived:products.filter(p=>p.status==="archived").length
  }),[products]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return products.filter(p=>
      (status==="all"||p.status===status)&&
      (destination==="all"||p.destination===destination)&&
      (type==="all"||p.product_type===type)&&
      (!q||[p.name,p.product_code,p.destination,p.product_type].some(v=>String(v||"").toLowerCase().includes(q)))
    );
  },[products,status,query,destination,type]);

  async function createProduct(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const fd=new FormData(e.currentTarget);
    const payload=Object.fromEntries(fd.entries());
    try{
      const res=await fetch("/api/internal-products",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){
        setMessage(data?.error||t("Unable to create product.","无法建立产品。"));
        return;
      }
      const listRes=await fetch("/api/internal-products");
      const listData=await listRes.json().catch(()=>({products:[]}));
      setProducts(Array.isArray(listData.products)?listData.products:[]);
      setCreating(false);
      router.refresh();
    }finally{
      setSaving(false);
    }
  }

  return <div className="product-library-page">
    <div className="page-head page-compact-header product-page-head">
      <div>
        <span className="page-kicker">{t("PRODUCT LIBRARY","产品资料库")}</span>
        <h1>{t("Products","产品")}</h1>
        <p>{t("Operation can create and maintain reusable travel products in advance.","Operation 预先建立与维护可重复销售的常规旅游产品。")}</p>
      </div>
      {canCreate&&<div className="detail-actions">
        <button className={"btn product-create-btn "+(creating?"":"primary")} type="button" onClick={()=>setCreating(v=>!v)}>
          {creating?t("Close","关闭"):t("＋ Create Product","＋ 建立产品")}
        </button>
      </div>}
    </div>

    {creating&&<section className="panel ios-form-card product-create-panel">
      <div className="panel-head">
        <div>
          <h2>{t("Create Product","建立产品")}</h2>
          <p className="panel-subtext">{t("Create the product record first; Quotation, Itinerary and Inquiry are not linked yet.","先建立产品本身；Quotation、Itinerary 与 Inquiry 暂时不连接。")}</p>
        </div>
      </div>
      <form className="product-create-grid" onSubmit={createProduct}>
        <label className="field product-name-field"><span>{t("Product Name","产品名称")}</span><input name="name" required placeholder="Osaka Kyoto Nara 7D5N"/></label>
        <label className="field"><span>{t("Destination","目的地")}</span><input name="destination" placeholder="Japan"/></label>
        <label className="field"><span>{t("Product Type","产品类型")}</span><input name="product_type" placeholder="Private / Corporate / Family"/></label>
        <label className="field"><span>{t("Days","天数")}</span><input name="days_count" type="number" min="1" defaultValue="1"/></label>
        <label className="field"><span>{t("Nights","晚数")}</span><input name="nights_count" type="number" min="0" defaultValue="0"/></label>
        <label className="field"><span>{t("Pax Basis","人数基准")}</span><input name="pax_basis" type="number" min="1" placeholder="20"/></label>
        <label className="field"><span>{t("Reference Selling Price (RM)","参考售价（RM）")}</span><input name="selling_price" type="number" min="0" step="0.01" placeholder="3480"/></label>
        <label className="field"><span>{t("Status","状态")}</span><select name="status" defaultValue="draft"><option value="draft">{t("Draft","草稿")}</option><option value="ready">{t("Ready to Sell","可销售")}</option><option value="archived">{t("Archived","已归档")}</option></select></label>
        <label className="field"><span>{t("Valid From","有效期开始")}</span><input name="valid_from" type="date"/></label>
        <label className="field"><span>{t("Valid To","有效期结束")}</span><input name="valid_to" type="date"/></label>
        <label className="field product-wide-field"><span>{t("Short Description","简短说明")}</span><textarea name="short_description" placeholder={t("Brief product positioning, highlights or target customer...","简短产品定位、亮点或目标客户...")}/></label>
        <label className="field product-wide-field"><span>{t("Internal Notes","内部备注")}</span><textarea name="internal_notes" placeholder={t("Internal Operation notes...","Operation 内部备注...")}/></label>
        <div className="product-create-actions">
          <button className="btn" type="button" onClick={()=>setCreating(false)}>{t("Cancel","取消")}</button>
          <button className="btn primary" disabled={saving}>{saving?t("Creating...","建立中..."):t("Create Product","建立产品")}</button>
        </div>
      </form>
      {message&&<div className="save-message">{message}</div>}
    </section>}

    <section className="product-toolbar">
      <div className="ios-segmented-control product-status-segments" role="tablist" aria-label={t("Product status","产品状态")}>
        {(["all","ready","draft","archived"] as const).map(key=><button
          key={key}
          type="button"
          className={status===key?"active":""}
          onClick={()=>setStatus(key)}
        >
          <span>{key==="all"?t("All","全部"):statusText(key)}</span>
          <small>{counts[key]}</small>
        </button>)}
      </div>

      <div className="product-filters">
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t("Search product name / destination","搜索产品名称 / 目的地")}/>
        <select value={destination} onChange={e=>setDestination(e.target.value)}>
          <option value="all">{t("All Destinations","全部目的地")}</option>
          {destinations.map(x=><option key={x} value={x}>{x}</option>)}
        </select>
        <select value={type} onChange={e=>setType(e.target.value)}>
          <option value="all">{t("All Product Types","全部产品类型")}</option>
          {types.map(x=><option key={x} value={x}>{x}</option>)}
        </select>
      </div>
    </section>

    <section className="panel product-table-panel">
      <div className="data-table-wrap">
        <table className="data-table product-table">
          <thead><tr>
            <th>{t("Product","产品")}</th>
            <th>{t("Destination","目的地")}</th>
            <th>{t("Duration","天数")}</th>
            <th>{t("Selling Price","售价")}</th>
            <th>{t("Pax Basis","人数基准")}</th>
            <th>{t("Quotation","报价")}</th>
            <th>{t("Itinerary","行程")}</th>
            <th>{t("Status","状态")}</th>
          </tr></thead>
          <tbody>
            {filtered.map(p=><tr key={p.id}>
              <td className="product-name-cell"><strong>{p.name}</strong><small>{p.product_code}</small></td>
              <td>{p.destination||"—"}</td>
              <td>{p.days_count}D{p.nights_count}N</td>
              <td>{p.selling_price===null||p.selling_price===undefined?"—":"RM "+Number(p.selling_price).toLocaleString("en-MY",{minimumFractionDigits:0,maximumFractionDigits:2})+" / pax"}</td>
              <td>{p.pax_basis?String(p.pax_basis)+" pax":"—"}</td>
              <td><span className={"product-readiness "+(p.quotation_ready?"ready":"empty")}>{p.quotation_ready?t("Ready","已就绪"):"—"}</span></td>
              <td><span className={"product-readiness "+(p.itinerary_ready?"ready":"empty")}>{p.itinerary_ready?t("Ready","已就绪"):"—"}</span></td>
              <td><span className={"product-status status-"+p.status}>{statusText(p.status)}</span></td>
            </tr>)}
            {!filtered.length&&<tr><td colSpan={8} className="empty">{t("No products match the current view.","目前没有符合条件的产品。")}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}
