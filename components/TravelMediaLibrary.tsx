"use client";

import { useEffect,useMemo,useRef,useState } from "react";

type Doc={
  id:string;title:string;fileName:string;storagePath:string;mimeType:string;fileSize:number;
  sourceType:string;status:string;verificationStatus?:string;destination:string;summary:string;extraction:any;createdAt:string;updatedAt:string;
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
  const [deletingId,setDeletingId]=useState("");
  const [signedUrls,setSignedUrls]=useState<Record<string,string>>({});
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

  async function verifyAndSave(id:string){
    setSavingId(id);setError("");
    try{
      const res=await fetch("/api/internal-travel-library",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"verify_and_save",id})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||"Unable to verify and save.");return;}
      if(preview?.id===id) setPreview((p:any)=>p?{...p,saved:true}:p);
      await load();
    }finally{setSavingId("");}
  }

  async function deleteDocument(doc:Doc){
    const ok=window.confirm("Delete this test source and its private Storage file? This cannot be undone.");
    if(!ok) return;
    setDeletingId(doc.id);setError("");
    try{
      const res=await fetch("/api/internal-travel-library",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"delete",id:doc.id})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||"Unable to delete source.");return;}
      if(preview?.id===doc.id) setPreview(null);
      setSignedUrls(current=>{
        const next={...current};
        delete next[doc.id];
        return next;
      });
      await load();
    }finally{setDeletingId("");}
  }

  async function signedUrlFor(doc:Doc){
    if(signedUrls[doc.id]) return signedUrls[doc.id];
    const res=await fetch("/api/internal-travel-library",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action:"sign",path:doc.storagePath})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data?.ok||!data.url) return "";
    setSignedUrls(current=>({...current,[doc.id]:data.url}));
    return data.url as string;
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
  const photoQueue=useMemo(()=>docs.filter(x=>x.mimeType?.startsWith("image/")&&x.status==="pending_review"),[docs]);

  useEffect(()=>{
    for(const doc of photoQueue.slice(0,12)){
      if(!signedUrls[doc.id]) void signedUrlFor(doc);
    }
  },[photoQueue]);

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

    <section className="panel travel-library-verification">
      <div className="panel-head">
        <div>
          <span className="page-kicker">CALIBRATION MODE</span>
          <h2>Verification Queue｜照片验证窗口</h2>
          <p className="panel-subtext">逐张检查 AI 判断。确认正确后才正式存档；错误或测试资料可以直接删除。</p>
        </div>
        <span className="status status-under_review">{photoQueue.length} To Verify</span>
      </div>

      {photoQueue.length>0?<div className="travel-library-verification-grid">
        {photoQueue.map(doc=>{
          const match=doc.extraction?.photoMatch||{};
          const url=signedUrls[doc.id]||"";
          return <article className={"travel-library-verification-card "+(match.status==="matched"?"matched":"review")} key={doc.id}>
            <div className="travel-library-verification-image">
              {url?<img src={url} alt={match.identifiedName||doc.fileName}/>:<div className="travel-library-verification-loading">Loading photo...</div>}
            </div>
            <div className="travel-library-verification-body">
              <div className="travel-library-verification-top">
                <div>
                  <span>AI Identified</span>
                  <strong>{match.identifiedName||"Unknown"}</strong>
                </div>
                <span className={"status "+(match.status==="matched"?"status-ready":"status-under_review")}>
                  {Math.round(Number(match.confidence||0)*100)}%
                </span>
              </div>
              <div className="travel-library-verification-details">
                <div><span>Matched Record</span><strong>{match.matchedName||"No confident match"}</strong></div>
                <div><span>Method</span><strong>{match.method==="ai_semantic"?"AI Semantic":match.method==="fuzzy"?"Fuzzy":match.method==="exact"?"Exact":"AI Identification Only"}</strong></div>
                <div><span>Destination</span><strong>{match.destination||doc.destination||"—"}</strong></div>
                <div><span>Type</span><strong>{match.identifiedType||doc.sourceType||"unknown"}</strong></div>
              </div>
              <p>{match.reason||doc.summary||"—"}</p>
              <small>{doc.fileName}</small>
              <div className="travel-library-verification-actions">
                <button className="btn" type="button" onClick={()=>void openSource(doc)}>Open Photo</button>
                <button className="btn primary" type="button" disabled={savingId===doc.id||match.status!=="matched"} onClick={()=>void verifyAndSave(doc.id)}>
                  {savingId===doc.id?"Saving...":"✓ Verify & Save"}
                </button>
                <button className="btn danger" type="button" disabled={deletingId===doc.id} onClick={()=>void deleteDocument(doc)}>
                  {deletingId===doc.id?"Deleting...":"Delete"}
                </button>
              </div>
              {match.status!=="matched"&&<div className="travel-library-verification-note">AI 没有达到自动匹配门槛，因此 Verify & Save 暂时锁定。可先删除测试资料，或从下方 Review 查看判断内容。</div>}
            </div>
          </article>;
        })}
      </div>:<div className="travel-library-verification-empty">目前没有待验证照片。上传一张测试照片后会自动出现在这里。</div>}
    </section>

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

      {preview.extraction?.photoMatch&&<div className={"travel-library-photo-match "+(preview.extraction.photoMatch.status==="matched"?"matched":"review")}>
        <div className="travel-library-photo-match-head">
          <div>
            <span className="page-kicker">PHOTO MATCH REVIEW</span>
            <h3>{preview.extraction.photoMatch.status==="matched"?"✓ Matched":"Needs Review"}</h3>
          </div>
          <span className={"status "+(preview.extraction.photoMatch.status==="matched"?"status-ready":"status-under_review")}>
            {Math.round(Number(preview.extraction.photoMatch.confidence||0)*100)}% Confidence
          </span>
        </div>
        <div className="travel-library-photo-match-grid">
          <div><span>AI Identified</span><strong>{preview.extraction.photoMatch.identifiedName||"Unknown"}</strong></div>
          <div><span>Type</span><strong>{preview.extraction.photoMatch.identifiedType||"unknown"}</strong></div>
          <div><span>Matched Library Record</span><strong>{preview.extraction.photoMatch.matchedName||"No confident match"}</strong></div>
          <div><span>Match Method</span><strong>{preview.extraction.photoMatch.method==="ai_semantic"?"AI Semantic":preview.extraction.photoMatch.method==="fuzzy"?"Fuzzy":preview.extraction.photoMatch.method==="exact"?"Exact":"AI Identification Only"}</strong></div>
          <div><span>Destination</span><strong>{preview.extraction.photoMatch.destination||"—"}</strong></div>
          <div><span>City / Area</span><strong>{preview.extraction.photoMatch.cityArea||"—"}</strong></div>
        </div>
        <p>{preview.extraction.photoMatch.reason||"—"}</p>
        {preview.extraction.photoMatch.status!=="matched"&&<small>系统不会把这个结果当作已确认匹配。请先检查照片与名称，再决定是否存档。</small>}
      </div>}

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
