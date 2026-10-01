"use client";

import { useEffect,useMemo,useRef,useState } from "react";

type Doc={
  id:string;title:string;fileName:string;storagePath:string;mimeType:string;fileSize:number;
  sourceType:string;status:string;destination:string;summary:string;extraction:any;createdAt:string;updatedAt:string;
};

const fmtSize=(n:number)=>{
  if(!n) return "0 KB";
  if(n<1024*1024) return (n/1024).toFixed(0)+" KB";
  return (n/1024/1024).toFixed(1)+" MB";
};

export default function TravelMediaLibrary(){
  const [docs,setDocs]=useState<Doc[]>([]);
  const [q,setQ]=useState("");
  const [status,setStatus]=useState("");
  const [loading,setLoading]=useState(true);
  const [analyzing,setAnalyzing]=useState(false);
  const [savingId,setSavingId]=useState("");
  const [error,setError]=useState("");
  const [preview,setPreview]=useState<any>(null);
  const [model,setModel]=useState("");
  const inputRef=useRef<HTMLInputElement|null>(null);

  async function load(){
    setLoading(true);
    try{
      const res=await fetch("/api/internal-travel-library?q="+encodeURIComponent(q)+"&status="+encodeURIComponent(status),{cache:"no-store"});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||"Unable to load library.");return;}
      setDocs(Array.isArray(data.documents)?data.documents:[]);
    }finally{setLoading(false);}
  }

  useEffect(()=>{void load();},[]);

  async function analyze(file:File|null){
    if(!file) return;
    setAnalyzing(true);setError("");setPreview(null);
    try{
      const form=new FormData();
      form.set("file",file);
      const res=await fetch("/api/internal-travel-library",{method:"POST",body:form});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||"Unable to analyze file.");return;}
      setPreview({id:data.id,file:data.file,extraction:data.extraction});
      setModel(data.model||"");
      await load();
    }finally{
      setAnalyzing(false);
      if(inputRef.current) inputRef.current.value="";
    }
  }

  async function confirm(id:string){
    setSavingId(id);setError("");
    try{
      const res=await fetch("/api/internal-travel-library",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"confirm",id})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||"Unable to save to library.");return;}
      if(preview?.id===id) setPreview((p:any)=>p?{...p,saved:true}:p);
      await load();
    }finally{setSavingId("");}
  }

  async function openSource(doc:Doc){
    const res=await fetch("/api/internal-travel-library",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action:"sign",path:doc.storagePath})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data?.ok||!data.url){setError(data?.error||"Unable to open file.");return;}
    window.open(data.url,"_blank","noopener,noreferrer");
  }

  const savedCount=useMemo(()=>docs.filter(x=>x.status==="saved").length,[docs]);
  const pendingCount=useMemo(()=>docs.filter(x=>x.status==="pending_review").length,[docs]);

  return <div className="travel-library-workspace">
    <div className="travel-library-toolbar">
      <div>
        <strong>{docs.length} Sources</strong>
        <span>{savedCount} Saved · {pendingCount} Pending Review</span>
      </div>
      <div className="travel-library-toolbar-actions">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search destination, title or file..."/>
        <select value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending_review">Pending Review</option>
          <option value="saved">Saved</option>
        </select>
        <button className="btn" type="button" onClick={()=>void load()}>Search</button>
        <label className="btn primary travel-library-upload-btn">
          {analyzing?"AI Analyzing...":"＋ Upload & Analyze"}
          <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.rtf,.txt,.jpg,.jpeg,.png,.webp" disabled={analyzing} onChange={e=>void analyze(e.target.files?.[0]||null)}/>
        </label>
      </div>
    </div>

    {error&&<div className="ai-import-error">{error}</div>}

    {preview&&<section className="panel travel-library-review">
      <div className="panel-head">
        <div>
          <span className="page-kicker">AI REVIEW PREVIEW</span>
          <h2>{preview.extraction?.title||preview.file?.name||"Travel Library Source"}</h2>
          <p className="panel-subtext">AI 已整理资料。确认后才会正式写入 Places / Hotels / Itinerary Cases / Historical Price References。</p>
        </div>
        {model&&<span className="ai-model-badge">{model}</span>}
      </div>

      <div className="travel-library-review-meta">
        <div><span>Type</span><strong>{preview.extraction?.sourceType||"other"}</strong></div>
        <div><span>Destination</span><strong>{preview.extraction?.destination||"—"}</strong></div>
        <div><span>Places</span><strong>{preview.extraction?.places?.length||0}</strong></div>
        <div><span>Hotels</span><strong>{preview.extraction?.hotels?.length||0}</strong></div>
        <div><span>Prices</span><strong>{preview.extraction?.prices?.length||0}</strong></div>
      </div>

      <div className="travel-library-review-grid">
        <article>
          <h3>Summary</h3>
          <p>{preview.extraction?.summary||"—"}</p>
        </article>
        <article>
          <h3>Places / Attractions</h3>
          <div className="travel-library-tags">{(preview.extraction?.places||[]).map((x:any,i:number)=><span key={i}>{x.name}</span>)}</div>
        </article>
        <article>
          <h3>Hotels</h3>
          <div className="travel-library-tags">{(preview.extraction?.hotels||[]).map((x:any,i:number)=><span key={i}>{x.name}</span>)}</div>
        </article>
        <article>
          <h3>Historical Price References</h3>
          {(preview.extraction?.prices||[]).length
            ? <div className="travel-library-price-list">{preview.extraction.prices.map((x:any,i:number)=><div key={i}><strong>{[x.currency,x.amount].filter(Boolean).join(" ")||"Price"}</strong><span>{[x.label,x.pax?x.pax+" pax":"",x.travelPeriod,x.supplier].filter(Boolean).join(" · ")}</span></div>)}</div>
            : <p>没有识别到价格资料。</p>}
        </article>
      </div>

      {(preview.extraction?.warnings||[]).length>0&&<div className="ai-warning-list">
        {preview.extraction.warnings.map((w:string,i:number)=><div key={i}>⚠ {w}</div>)}
      </div>}

      <div className="travel-library-review-actions">
        {preview.saved
          ? <span className="status status-ready">Saved to Library</span>
          : <button className="btn primary" type="button" disabled={savingId===preview.id} onClick={()=>void confirm(preview.id)}>
              {savingId===preview.id?"Saving...":"Confirm & Save to Library"}
            </button>}
      </div>
    </section>}

    <section className="panel">
      <div className="panel-head">
        <div><h2>Library Sources</h2><p className="panel-subtext">原始 Word / PDF / 图片会保存在私有 Supabase Storage；价格只作为历史参考。</p></div>
      </div>

      <div className="travel-library-table-wrap">
        <table className="data-table travel-library-table">
          <thead><tr><th>Source</th><th>Type</th><th>Destination</th><th>Status</th><th>AI Extracted</th><th>Updated</th><th></th></tr></thead>
          <tbody>
            {docs.map(doc=><tr key={doc.id}>
              <td><strong>{doc.title||doc.fileName}</strong><small>{doc.fileName} · {fmtSize(doc.fileSize)}</small></td>
              <td>{doc.sourceType||"other"}</td>
              <td>{doc.destination||"—"}</td>
              <td><span className={"status "+(doc.status==="saved"?"status-ready":"status-under_review")}>{doc.status==="saved"?"Saved":"Pending Review"}</span></td>
              <td><small>{doc.extraction?.places?.length||0} places · {doc.extraction?.hotels?.length||0} hotels · {doc.extraction?.prices?.length||0} prices</small></td>
              <td>{doc.updatedAt?new Date(doc.updatedAt).toLocaleDateString("en-MY"):"—"}</td>
              <td><div className="row-actions">
                <button type="button" onClick={()=>void openSource(doc)}>Open File</button>
                {doc.status==="pending_review"&&<button type="button" onClick={()=>setPreview({id:doc.id,file:{name:doc.fileName,path:doc.storagePath},extraction:doc.extraction})}>Review</button>}
                {doc.status==="pending_review"&&<button type="button" onClick={()=>void confirm(doc.id)} disabled={savingId===doc.id}>{savingId===doc.id?"Saving...":"Save"}</button>}
              </div></td>
            </tr>)}
            {!loading&&!docs.length&&<tr><td colSpan={7} className="empty">还没有资料。上传第一份行程、报价、酒店资料或图片。</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}
