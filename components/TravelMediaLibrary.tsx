"use client";

import { useEffect,useMemo,useRef,useState } from "react";

type Doc={
  id:string;title:string;fileName:string;storagePath:string;mimeType:string;fileSize:number;
  sourceType:string;status:string;verificationStatus?:string;mediaExtractionStatus?:string;mediaExtractionSummary?:any;destination:string;summary:string;extraction:any;createdAt:string;updatedAt:string;
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
  const [error,setError]=useState("");
  const [inspectorQuery,setInspectorQuery]=useState("");
  const [inspectorResults,setInspectorResults]=useState<any[]>([]);
  const [inspectorLoading,setInspectorLoading]=useState(false);
  const [inspectorMessage,setInspectorMessage]=useState("");
  const [preview,setPreview]=useState<any>(null);
  const [model,setModel]=useState("");
  const [mediaReview,setMediaReview]=useState<any[]>([]);
  const [mediaProcessing,setMediaProcessing]=useState(false);
  const [mediaReviewBusyId,setMediaReviewBusyId]=useState("");
  const [mediaBackfillMessage,setMediaBackfillMessage]=useState("");
  const [keywordDrafts,setKeywordDrafts]=useState<Record<string,string>>({});
  const [keywordBusyId,setKeywordBusyId]=useState("");
  const inputRef=useRef<HTMLInputElement|null>(null);
  const mediaBackfillStartedRef=useRef(false);
  const reviewedMediaIdsRef=useRef<Set<string>>(new Set());

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

  async function loadMediaReview(){
    try{
      const res=await fetch("/api/internal-travel-library-media",{cache:"no-store"});
      const data=await res.json().catch(()=>({}));
      if(res.ok&&data?.ok){
        const candidates=Array.isArray(data.candidates)?data.candidates:[];
        setMediaReview(candidates.filter((item:any)=>
          String(item?.status||"pending_review")==="pending_review" &&
          !reviewedMediaIdsRef.current.has(String(item?.id||""))
        ));
      }
    }catch{}
  }

  async function processMediaBacklog(){
    if(mediaProcessing) return;
    mediaBackfillStartedRef.current=true;
    setMediaProcessing(true);
    setMediaBackfillMessage("Queueing existing Library Sources...");
    let failures=0;
    let processed=0;
    let lastError="";
    try{
      const queueRes=await fetch("/api/internal-travel-library-media",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"queue_existing"})
      });
      const queueData=await queueRes.json().catch(()=>({}));
      if(!queueRes.ok||!queueData?.ok){
        setMediaBackfillMessage("Unable to queue Library Sources: "+String(queueData?.error||"unknown error"));
        return;
      }

      setMediaBackfillMessage("Queued "+Number(queueData.queued||0)+" source(s). Processing...");
      // Each server invocation processes one media chunk. Keep consuming until the queue is empty.
      // 120 passes is intentionally above the normal backlog size so one Library open can finish all queued documents.
      for(let i=0;i<120;i++){
        const res=await fetch("/api/internal-travel-library-media",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({action:"process_next"})
        });
        const data=await res.json().catch(()=>({}));
        if(!res.ok){
          failures++;
          lastError=String(data?.error||"media extraction failed");
          setMediaBackfillMessage("Media extraction failed: "+lastError);
          // Avoid a hot retry loop when one source repeatedly fails.
          await new Promise(resolve=>window.setTimeout(resolve,1200));
          continue;
        }
        if(data?.done){
          if(failures>0){
            setMediaBackfillMessage(failures+" Library Source(s) failed media extraction. "+lastError);
          }else{
            setMediaBackfillMessage(processed===0?"Existing Library Sources are up to date.":"Existing Library Sources media extraction completed.");
          }
          break;
        }
        processed++;
        const s=data?.summary||{};
        setMediaBackfillMessage(
          String(data?.title||"Library Source")+" · "+Number(s.found||0)+" photos found · "+Number(s.matched||0)+" matched"
        );
        await loadMediaReview();
        await load();
      }
    }finally{
      setMediaProcessing(false);
      await loadMediaReview();
      await load();
    }
  }

  useEffect(()=>{
    void loadMediaReview();
    if(mediaBackfillStartedRef.current) return;
    mediaBackfillStartedRef.current=true;
    const timer=window.setTimeout(()=>{ void processMediaBacklog(); },800);
    return ()=>window.clearTimeout(timer);
  },[]);

  async function reviewMediaCandidate(id:string,action:"confirm"|"ignore"){
    const candidate=mediaReview.find((item:any)=>String(item.id)===String(id))||null;
    setMediaReviewBusyId(id);setError("");

    // Optimistically remove reviewed media immediately. Background refreshes are
    // prevented from re-inserting it while the server mutation is in flight.
    reviewedMediaIdsRef.current.add(String(id));
    setMediaReview(current=>current.filter((item:any)=>String(item.id)!==String(id)));

    try{
      const res=await fetch("/api/internal-travel-library-media",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action,id})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){
        reviewedMediaIdsRef.current.delete(String(id));
        if(candidate){
          setMediaReview(current=>{
            if(current.some((item:any)=>String(item.id)===String(id))) return current;
            return [candidate,...current];
          });
        }
        setError(data?.error||"Unable to update extracted media.");
        return;
      }

      await load();
      if(inspectorQuery.trim()) await searchInspector();
      // Do not immediately reload the review queue here. The local queue is the
      // authoritative UI state for this completed review and avoids stale GET races.
    }catch(err:any){
      reviewedMediaIdsRef.current.delete(String(id));
      if(candidate){
        setMediaReview(current=>{
          if(current.some((item:any)=>String(item.id)===String(id))) return current;
          return [candidate,...current];
        });
      }
      setError(String(err?.message||"Unable to update extracted media."));
    }finally{setMediaReviewBusyId("");}
  }

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
      const savedPreview=preview?.id===id?preview:null;
      if(savedPreview) setPreview((p:any)=>p?{...p,saved:true}:p);
      await load();

      const mime=String(savedPreview?.file?.mimeType||"");
      if(
        mime==="application/pdf"||
        mime==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ){
        window.setTimeout(()=>{ void processMediaBacklog(); },250);
      }
    }finally{setSavingId("");}
  }

  async function searchInspector(){
    const query=inspectorQuery.trim();
    if(!query){setInspectorResults([]);setInspectorMessage("请输入景点或酒店关键字。");return;}
    setInspectorLoading(true);setInspectorMessage("");setError("");
    try{
      const res=await fetch("/api/internal-travel-media-inspector?q="+encodeURIComponent(query),{cache:"no-store"});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||"Unable to search Media Library.");return;}
      const results=Array.isArray(data.results)?data.results:[];
      setInspectorResults(results);
      if(!results.length) setInspectorMessage("没有找到相关景点、酒店或已存档照片。");
    }finally{setInspectorLoading(false);}
  }

  async function updateMatchKeywords(placeId:string,keywords:string[]){
    if(!placeId) return;
    const cleaned=Array.from(new Set(keywords.map(x=>String(x||"").trim()).filter(Boolean)));
    setKeywordBusyId(placeId);setError("");
    try{
      const res=await fetch("/api/internal-travel-media-inspector",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"update_keywords",placeId,keywords:cleaned})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||"Unable to update match keywords.");return;}
      const saved=Array.isArray(data.matchKeywords)?data.matchKeywords:cleaned;
      setMediaReview(current=>current.map((item:any)=>
        String(item.suggestedPlaceId||"")===placeId?{...item,matchKeywords:saved}:item
      ));
      setInspectorResults(current=>current.map((place:any)=>
        String(place.placeId||"")===placeId?{...place,matchKeywords:saved}:place
      ));
      setKeywordDrafts(current=>({...current,[placeId]:""}));
    }finally{setKeywordBusyId("");}
  }

  function addMatchKeyword(placeId:string,currentKeywords:any[]){
    const draft=String(keywordDrafts[placeId]||"").trim();
    if(!draft) return;
    const additions=draft.split(/[,，\n]+/).map(x=>x.trim()).filter(Boolean);
    void updateMatchKeywords(placeId,[...(Array.isArray(currentKeywords)?currentKeywords:[]),...additions]);
  }

  async function mutateInspectorImage(imageId:string,action:"remove"|"delete"){
    const permanent=action==="delete";
    const ok=window.confirm(
      permanent
        ?"Permanently delete this image from the Travel Media Library and Storage? This cannot be undone."
        :"Remove this image from this place/hotel? The underlying file will not be deleted."
    );
    if(!ok) return;
    setDeletingId(imageId);setError("");setInspectorMessage("");
    try{
      const res=await fetch("/api/internal-travel-media-inspector",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action,imageId})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||"Unable to update image.");return;}
      setInspectorMessage(permanent?"Image deleted permanently.":"Image removed from this Library record.");
      await searchInspector();
    }finally{setDeletingId("");}
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
    <section className="travel-library-flow-head">
      <div>
        <span className="page-kicker">PROCESSING WORKSPACE</span>
        <h2>Travel Library Processing</h2>
        <p>Upload → AI Review → Media Extraction → Human Review → Library</p>
      </div>
      <div className="travel-library-flow-steps" aria-label="Travel Library processing flow">
        <span>1 Upload</span><b>→</b><span>2 AI Review</span><b>→</b><span>3 Extract Media</span><b>→</b><span>4 Review</span><b>→</b><span>5 Library</span>
      </div>
    </section>

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

    <section className="panel travel-library-document-media">
      <div className="panel-head">
        <div>
          <span className="page-kicker">DOCUMENT MEDIA EXTRACTION</span>
          <h2>Document Media Review｜文件图片匹配审核</h2>
          <p className="panel-subtext">PDF / DOCX 内嵌照片会先拆出并由 AI 结合页内文字与视觉判断。你确认后才会进入正式 Travel Media Library。</p>
        </div>
        <div className="travel-library-document-media-status">
          {mediaProcessing&&<span className="status status-under_review">Processing...</span>}
          <span className="status status-ready">{mediaReview.length} To Review</span>
          <button className="btn compact primary" type="button" disabled={mediaProcessing} onClick={()=>void processMediaBacklog()}>
            {mediaProcessing?"Running...":"Run Media Extraction"}
          </button>
        </div>
      </div>

      {mediaBackfillMessage&&<div className="travel-library-inspector-message">{mediaBackfillMessage}</div>}

      {mediaReview.filter((item:any)=>String(item?.status||"pending_review")==="pending_review"&&!reviewedMediaIdsRef.current.has(String(item?.id||""))).length>0?<div className="travel-library-document-media-grid">
        {mediaReview.filter((item:any)=>String(item?.status||"pending_review")==="pending_review"&&!reviewedMediaIdsRef.current.has(String(item?.id||""))).map((item:any)=><article className="travel-library-document-media-card" key={item.id}>
          <div className="travel-library-document-media-image">
            <img src={item.imageUrl} alt={item.suggestedName||item.originalName||"Extracted media"}/>
            <span>{item.sourcePage?"Page "+item.sourcePage:"DOCX"}</span>
          </div>
          <div className="travel-library-document-media-body">
            <div className="travel-library-document-media-title">
              <div>
                <small>{item.documentTitle||item.fileName||"Library Source"}</small>
                <strong>{item.suggestedName||"Needs manual review"}</strong>
              </div>
              <span className={"status "+(item.suggestedPlaceId?"status-ready":"status-under_review")}>
                {Math.round(Number(item.confidence||0)*100)}%
              </span>
            </div>
            <div className="travel-library-document-media-meta">
              <div><span>Type</span><strong>{item.suggestedType||"unknown"}</strong></div>
              <div><span>Match</span><strong>{item.suggestedPlaceId?"Library Record Found":"No confident record"}</strong></div>
              <div><span>Method</span><strong>{String(item.matchMethod||"").replaceAll("_"," ")||"—"}</strong></div>
              <div><span>Source</span><strong>{item.sourcePage?"Page "+item.sourcePage:"Document"}</strong></div>
            </div>
            {item.suggestedPlaceId&&<div className="travel-library-keywords">
              <div className="travel-library-keywords-head">
                <div>
                  <strong>Match Keywords｜匹配关键词</strong>
                  <span>可新增或删除。至少保留 1 个已保存关键词，才能确认素材进入 Library。</span>
                </div>
              </div>
              <div className="travel-library-keyword-chips">
                {(Array.isArray(item.matchKeywords)?item.matchKeywords:[]).map((keyword:string)=><button
                  type="button"
                  className="travel-library-keyword-chip"
                  key={keyword}
                  title="Remove keyword"
                  disabled={keywordBusyId===String(item.suggestedPlaceId)}
                  onClick={()=>void updateMatchKeywords(
                    String(item.suggestedPlaceId),
                    (Array.isArray(item.matchKeywords)?item.matchKeywords:[]).filter((x:string)=>x!==keyword)
                  )}
                >{keyword}<span>×</span></button>)}
                {(!Array.isArray(item.matchKeywords)||item.matchKeywords.length===0)&&<em>No custom keywords yet</em>}
              </div>
              <div className="travel-library-keyword-input">
                <input
                  value={keywordDrafts[String(item.suggestedPlaceId)]||""}
                  onChange={e=>setKeywordDrafts(current=>({...current,[String(item.suggestedPlaceId)]:e.target.value}))}
                  onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addMatchKeyword(String(item.suggestedPlaceId),item.matchKeywords||[]);}}}
                  placeholder="例如：京都三得利，三得利酒厂..."
                />
                <button className="btn compact" type="button"
                  disabled={keywordBusyId===String(item.suggestedPlaceId)||!String(keywordDrafts[String(item.suggestedPlaceId)]||"").trim()}
                  onClick={()=>addMatchKeyword(String(item.suggestedPlaceId),item.matchKeywords||[])}>
                  {keywordBusyId===String(item.suggestedPlaceId)?"Saving...":"＋ Add Keyword"}
                </button>
              </div>
            </div>}
            <p>{item.reason||"—"}</p>
            {item.nearbyText&&<details>
              <summary>Show page context</summary>
              <div>{item.nearbyText}</div>
            </details>}
            <div className="travel-library-document-media-actions">
              <a className="btn compact" href={item.imageUrl} target="_blank" rel="noreferrer">Open</a>
              <button
                className="btn compact primary"
                type="button"
                disabled={
                  !item.suggestedPlaceId||
                  !Array.isArray(item.matchKeywords)||
                  item.matchKeywords.length<1||
                  mediaReviewBusyId===item.id
                }
                onClick={()=>void reviewMediaCandidate(item.id,"confirm")}
              >
                {mediaReviewBusyId===item.id?"Saving...":"✓ Confirm to Library"}
              </button>
              <button
                className="btn compact danger"
                type="button"
                disabled={mediaReviewBusyId===item.id}
                onClick={()=>void reviewMediaCandidate(item.id,"ignore")}
              >
                Ignore / Delete
              </button>
            </div>
            {!item.suggestedPlaceId&&<div className="travel-library-verification-note">
              AI 没有找到足够可信的景点 / 酒店记录，所以不能直接确认。先 Ignore，或之后加入手动改配功能。
            </div>}
            {item.suggestedPlaceId&&(!Array.isArray(item.matchKeywords)||item.matchKeywords.length<1)&&<div className="travel-library-verification-note">
              请至少新增并保存 1 个 Match Keyword，才能 Confirm to Library。错误的关键词可以直接点击 × 删除。
            </div>}
          </div>
        </article>)}
      </div>:<div className="travel-library-inspector-empty">
        {mediaProcessing?"正在分析现有 Library Sources...":"目前没有待审核的 PDF / DOCX 内嵌照片。点击 Run Media Extraction 手动开始。"}
      </div>}
    </section>

    <section className="panel travel-library-inspector">
      <div className="panel-head">
        <div>
          <span className="page-kicker">MEDIA INSPECTOR</span>
          <h2>Library Search & Validation｜资料库检查</h2>
          <p className="panel-subtext">搜索已经正式存档的景点或酒店，检查系统目前关联的照片是否正确。</p>
        </div>
      </div>

      <div className="travel-library-inspector-search">
        <input
          value={inspectorQuery}
          onChange={e=>setInspectorQuery(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter") void searchInspector();}}
          placeholder="例如：清水寺 / Kiyomizu-dera / DoubleTree Kyoto..."
        />
        <button className="btn primary" type="button" disabled={inspectorLoading} onClick={()=>void searchInspector()}>
          {inspectorLoading?"Searching...":"Search Library"}
        </button>
      </div>

      {inspectorMessage&&<div className="travel-library-inspector-message">{inspectorMessage}</div>}

      {inspectorResults.length>0&&<div className="travel-library-inspector-results">
        {inspectorResults.map((place:any)=><article className="travel-library-inspector-place" key={place.placeId}>
          <div className="travel-library-inspector-place-head">
            <div>
              <span className="page-kicker">{String(place.type||"PLACE").toUpperCase()}</span>
              <h3>{place.canonicalName||"Unnamed Place"}</h3>
              <p>{[place.destination,place.cityArea].filter(Boolean).join(" · ")||"—"}</p>
            </div>
            <div className="travel-library-inspector-badges">
              <span className="status status-ready">{Array.isArray(place.images)?place.images.length:0} Photos</span>
              <span className="travel-library-score">{Math.round(Number(place.score||0)*100)}% Name Match</span>
            </div>
          </div>

          {Array.isArray(place.aliases)&&place.aliases.length>0&&<div className="travel-library-inspector-aliases">
            <span>Aliases</span>
            <div>{place.aliases.map((a:string,i:number)=><em key={i}>{a}</em>)}</div>
          </div>}

          <div className="travel-library-keywords">
            <div className="travel-library-keywords-head">
              <div>
                <strong>Match Keywords｜匹配关键词</strong>
                <span>内部匹配词，不会改变正式景点 / 酒店名称。</span>
              </div>
            </div>
            <div className="travel-library-keyword-chips">
              {(Array.isArray(place.matchKeywords)?place.matchKeywords:[]).map((keyword:string)=><button
                type="button"
                className="travel-library-keyword-chip"
                key={keyword}
                title="Remove keyword"
                disabled={keywordBusyId===String(place.placeId)}
                onClick={()=>void updateMatchKeywords(
                  String(place.placeId),
                  (Array.isArray(place.matchKeywords)?place.matchKeywords:[]).filter((x:string)=>x!==keyword)
                )}
              >{keyword}<span>×</span></button>)}
              {(!Array.isArray(place.matchKeywords)||place.matchKeywords.length===0)&&<em>No custom keywords yet</em>}
            </div>
            <div className="travel-library-keyword-input">
              <input
                value={keywordDrafts[String(place.placeId)]||""}
                onChange={e=>setKeywordDrafts(current=>({...current,[String(place.placeId)]:e.target.value}))}
                onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addMatchKeyword(String(place.placeId),place.matchKeywords||[]);}}}
                placeholder="Add matching keyword..."
              />
              <button className="btn compact" type="button"
                disabled={keywordBusyId===String(place.placeId)||!String(keywordDrafts[String(place.placeId)]||"").trim()}
                onClick={()=>addMatchKeyword(String(place.placeId),place.matchKeywords||[])}>
                {keywordBusyId===String(place.placeId)?"Saving...":"＋ Add Keyword"}
              </button>
            </div>
          </div>

          {Array.isArray(place.images)&&place.images.length>0
            ? <div className="travel-library-inspector-gallery">
                {place.images.map((img:any)=><figure key={img.imageId}>
                  <div className="travel-library-inspector-photo">
                    <img src={img.url} alt={img.name||place.canonicalName}/>
                  </div>
                  <figcaption>
                    <strong>{img.name||"Library Image"}</strong>
                    <span>{img.createdAt?new Date(img.createdAt).toLocaleDateString("en-MY"):"Stored Library Image"}</span>
                    <div>
                      <a className="btn compact" href={img.url} target="_blank" rel="noreferrer">Open</a>
                      <button className="btn compact" type="button" disabled={deletingId===img.imageId} onClick={()=>void mutateInspectorImage(img.imageId,"remove")}>
                        Remove from Place
                      </button>
                      <button className="btn compact danger" type="button" disabled={deletingId===img.imageId} onClick={()=>void mutateInspectorImage(img.imageId,"delete")}>
                        {deletingId===img.imageId?"Deleting...":"Delete"}
                      </button>
                    </div>
                  </figcaption>
                </figure>)}
              </div>
            : <div className="travel-library-inspector-empty">这个景点 / 酒店名称已经存档，但目前没有关联照片。</div>}
        </article>)}
      </div>}

      {!inspectorLoading&&!inspectorResults.length&&!inspectorMessage&&<div className="travel-library-inspector-empty">
        输入景点或酒店关键字，例如「清水寺」、「Kiyomizu」或酒店名称，系统会搜索已经存档的 Library Record 与照片。
      </div>}
    </section>

    <section className="panel">
      <div className="panel-head">
        <div><h2>Library Sources</h2><p className="panel-subtext">原始 Word / PDF / 图片会保存在私有 Supabase Storage；价格只作为历史参考。</p></div>
      </div>

      <div className="travel-library-source-list">
        {docs.map(doc=><article className="travel-library-source-card" key={doc.id}>
          <div className="travel-library-source-main">
            <div>
              <strong>{doc.title||doc.fileName}</strong>
              <small>{doc.fileName} · {fmtSize(doc.fileSize)}</small>
            </div>
            <span className={"status "+(doc.status==="saved"?"status-ready":"status-under_review")}>{doc.status==="saved"?"Saved":"Pending Review"}</span>
          </div>
          <div className="travel-library-source-meta">
            <div><span>Type</span><strong>{doc.sourceType||"other"}</strong></div>
            <div><span>Destination</span><strong>{doc.destination||"—"}</strong></div>
            <div><span>Media</span><strong>{doc.mediaExtractionStatus==="review"
              ? Number(doc.mediaExtractionSummary?.found||0)+" found · "+Number(doc.mediaExtractionSummary?.matched||0)+" matched"
              : doc.mediaExtractionStatus==="processing"?"Processing..."
              : doc.mediaExtractionStatus==="completed"?"Completed"
              : doc.mediaExtractionStatus==="queued"?"Queued"
              : doc.mediaExtractionStatus==="failed"?"Failed"
              :"Not Processed"}</strong></div>
            <div><span>AI Extracted</span><strong>{doc.extraction?.places?.length||0} places · {doc.extraction?.hotels?.length||0} hotels · {doc.extraction?.prices?.length||0} prices</strong></div>
            <div><span>Updated</span><strong>{doc.updatedAt?new Date(doc.updatedAt).toLocaleDateString("en-MY"):"—"}</strong></div>
          </div>
          <div className="travel-library-source-actions">
            <button className="btn compact" type="button" onClick={()=>void openSource(doc)}>Open File</button>
            {doc.status==="pending_review"&&<button className="btn compact" type="button" onClick={()=>setPreview({id:doc.id,file:{name:doc.fileName,path:doc.storagePath,mimeType:doc.mimeType},extraction:doc.extraction})}>Review</button>}
            {doc.status==="pending_review"&&<button className="btn compact primary" type="button" onClick={()=>void confirm(doc.id)} disabled={savingId===doc.id}>{savingId===doc.id?"Saving...":"Save"}</button>}
          </div>
        </article>)}
        {!loading&&!docs.length&&<div className="travel-library-inspector-empty">还没有资料。上传第一份行程、报价、酒店资料或图片。</div>}
      </div>
    </section>
  </div>;}
