"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
        setMessage(data?.error||"Unable to create product.");
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
    <div className="page-head product-page-head">
      <div>
        <span className="page-kicker">PRODUCT LIBRARY</span>
        <h1>Products</h1>
        <p>Manage reusable travel products prepared by Operation.</p>
      </div>
      {canCreate&&<button className="btn primary product-create-btn" type="button" onClick={()=>setCreating(v=>!v)}>
        {creating?"Close":"＋ Create Product"}
      </button>}
    </div>

    {creating&&<section className="panel ios-form-card product-create-panel">
      <div className="panel-head">
        <div>
          <h2>Create Product</h2>
          <p className="panel-subtext">先建立产品本身；Quotation、Itinerary 与 Inquiry 暂时不连接。</p>
        </div>
      </div>
      <form className="product-create-grid" onSubmit={createProduct}>
        <label className="field product-name-field"><span>Product Name</span><input name="name" required placeholder="Osaka Kyoto Nara 7D5N"/></label>
        <label className="field"><span>Destination</span><input name="destination" placeholder="Japan"/></label>
        <label className="field"><span>Product Type</span><input name="product_type" placeholder="Private / Corporate / Family"/></label>
        <label className="field"><span>Days</span><input name="days_count" type="number" min="1" defaultValue="1"/></label>
        <label className="field"><span>Nights</span><input name="nights_count" type="number" min="0" defaultValue="0"/></label>
        <label className="field"><span>Pax Basis</span><input name="pax_basis" type="number" min="1" placeholder="20"/></label>
        <label className="field"><span>Reference Selling Price (RM)</span><input name="selling_price" type="number" min="0" step="0.01" placeholder="3480"/></label>
        <label className="field"><span>Status</span><select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="ready">Ready to Sell</option><option value="archived">Archived</option></select></label>
        <label className="field"><span>Valid From</span><input name="valid_from" type="date"/></label>
        <label className="field"><span>Valid To</span><input name="valid_to" type="date"/></label>
        <label className="field product-wide-field"><span>Short Description</span><textarea name="short_description" placeholder="Brief product positioning, highlights or target customer..."/></label>
        <label className="field product-wide-field"><span>Internal Notes</span><textarea name="internal_notes" placeholder="Internal Operation notes..."/></label>
        <div className="product-create-actions">
          <button className="btn" type="button" onClick={()=>setCreating(false)}>Cancel</button>
          <button className="btn primary" disabled={saving}>{saving?"Creating...":"Create Product"}</button>
        </div>
      </form>
      {message&&<div className="save-message">{message}</div>}
    </section>}

    <section className="product-toolbar">
      <div className="ios-segmented-control product-status-segments" role="tablist" aria-label="Product status">
        {(["all","ready","draft","archived"] as const).map(key=><button
          key={key}
          type="button"
          className={status===key?"active":""}
          onClick={()=>setStatus(key)}
        >
          <span>{key==="all"?"All":statusLabel[key]}</span>
          <small>{counts[key]}</small>
        </button>)}
      </div>

      <div className="product-filters">
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search product name / destination"/>
        <select value={destination} onChange={e=>setDestination(e.target.value)}>
          <option value="all">All Destinations</option>
          {destinations.map(x=><option key={x} value={x}>{x}</option>)}
        </select>
        <select value={type} onChange={e=>setType(e.target.value)}>
          <option value="all">All Product Types</option>
          {types.map(x=><option key={x} value={x}>{x}</option>)}
        </select>
      </div>
    </section>

    <section className="panel product-table-panel">
      <div className="data-table-wrap">
        <table className="data-table product-table">
          <thead><tr>
            <th>Product</th>
            <th>Destination</th>
            <th>Duration</th>
            <th>Selling Price</th>
            <th>Pax Basis</th>
            <th>Quotation</th>
            <th>Itinerary</th>
            <th>Status</th>
          </tr></thead>
          <tbody>
            {filtered.map(p=><tr key={p.id}>
              <td className="product-name-cell"><strong>{p.name}</strong><small>{p.product_code}</small></td>
              <td>{p.destination||"—"}</td>
              <td>{p.days_count}D{p.nights_count}N</td>
              <td>{p.selling_price===null||p.selling_price===undefined?"—":"RM "+Number(p.selling_price).toLocaleString("en-MY",{minimumFractionDigits:0,maximumFractionDigits:2})+" / pax"}</td>
              <td>{p.pax_basis?String(p.pax_basis)+" pax":"—"}</td>
              <td><span className={"product-readiness "+(p.quotation_ready?"ready":"empty")}>{p.quotation_ready?"Ready":"—"}</span></td>
              <td><span className={"product-readiness "+(p.itinerary_ready?"ready":"empty")}>{p.itinerary_ready?"Ready":"—"}</span></td>
              <td><span className={"product-status status-"+p.status}>{statusLabel[p.status]||p.status}</span></td>
            </tr>)}
            {!filtered.length&&<tr><td colSpan={8} className="empty">No products match the current view.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}
