"use client";

import { useEffect,useMemo,useRef,useState } from "react";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

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
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;
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
  const [showLibrarySources,setShowLibrarySources]=useState(false);
  const inputRef=useRef<HTMLInputElement|null>(null);
  const mediaBackfillStartedRef=useRef(false);
  const reviewedMediaIdsRef=useRef<Set<string>>(new Set());

  async function load(){
    setLoading(true);
    try{
      const res=await fetch("/api/internal-travel-library?q="+encodeURIComponent(q)+"&status="+encodeURIComponent(status),{cache:"no-store"});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||t("Unable to load library.","无法加载资料库。"));return;}
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
    setMediaBackfillMessage(t("Queueing existing Library Sources...","正在排队现有 Library Sources..."));
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
        setMediaBackfillMessage(t("Unable to queue Library Sources: ","无法排队 Library Sources：")+String(queueData?.error||t("unknown error","未知错误")));
        return;
      }

      setMediaBackfillMessage(t("Queued ","已排队 ")+Number(queueData.queued||0)+t(" source(s). Processing..."," 个来源，处理中..."));
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
          lastError=String(data?.error||t("media extraction failed","媒体提取失败"));
          setMediaBackfillMessage(t("Media extraction failed: ","媒体提取失败：")+lastError);
          // Avoid a hot retry loop when one source repeatedly fails.
          await new Promise(resolve=>window.setTimeout(resolve,1200));
          continue;
        }
        if(data?.done){
          if(failures>0){
            setMediaBackfillMessage(failures+t(" Library Source(s) failed media extraction. "," 个 Library Source 媒体提取失败。")+lastError);
          }else{
            setMediaBackfillMessage(processed===0?t("Existing Library Sources are up to date.","现有 Library Sources 已是最新。"):t("Existing Library Sources media extraction completed.","现有 Library Sources 媒体提取已完成。"));
          }
          break;
        }
        processed++;
        const s=data?.summary||{};
        setMediaBackfillMessage(
          String(data?.title||t("Library Source","资料来源"))+" · "+Number(s.found||0)+t(" photos found · "," 张照片 · ")+Number(s.matched||0)+t(" matched"," 张已匹配")
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
        setError(data?.error||t("Unable to update extracted media.","无法更新已提取媒体。"));
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
      setError(String(err?.message||t("Unable to update extracted media.","无法更新已提取媒体。")));
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
      if(!res.ok||!data?.ok){setError(data?.error||t("Unable to analyze file.","无法分析文件。"));return;}
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
      if(!res.ok||!data?.ok){setError(data?.error||t("Unable to save to library.","无法保存到资料库。"));return;}
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

  function clearInspector(){
    setInspectorQuery("");
    setInspectorResults([]);
    setInspectorMessage("");
    setKeywordDrafts({});
    setError("");
  }

  async function searchInspector(){
    const query=inspectorQuery.trim();
    if(!query){setInspectorResults([]);setInspectorMessage(t("Enter an attraction or hotel keyword.","请输入景点或酒店关键字。"));return;}
    setInspectorLoading(true);setInspectorMessage("");setError("");
    try{
      const res=await fetch("/api/internal-travel-media-inspector?q="+encodeURIComponent(query),{cache:"no-store"});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||t("Unable to search Media Library.","无法搜索 Media Library。"));return;}
      const results=Array.isArray(data.results)?data.results:[];
      setInspectorResults(results);
      if(!results.length) setInspectorMessage(t("No related attractions, hotels or stored photos found.","没有找到相关景点、酒店或已存档照片。"));
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
      if(!res.ok||!data?.ok){setError(data?.error||t("Unable to update match keywords.","无法更新匹配关键词。"));return;}
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
        ?t("Permanently delete this image from the Travel Media Library and Storage? This cannot be undone.","永久从 Travel Media Library 和 Storage 删除这张图片吗？此操作无法撤销。")
        :t("Remove this image from this place/hotel? The underlying file will not be deleted.","从这个景点 / 酒店移除这张图片吗？原始文件不会被删除。")
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
      if(!res.ok||!data?.ok){setError(data?.error||t("Unable to update image.","无法更新图片。"));return;}
      setInspectorMessage(permanent?t("Image deleted permanently.","图片已永久删除。"):t("Image removed from this Library record.","图片已从此 Library 记录移除。"));
      await searchInspector();
    }finally{setDeletingId("");}
  }

  async function openSource(doc:Doc){
    const res=await fetch("/api/internal-travel-library",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action:"sign",path:doc.storagePath})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data?.ok||!data.url){setError(data?.error||t("Unable to open file.","无法打开文件。"));return;}
    window.open(data.url,"_blank","noopener,noreferrer");
  }

  const savedCount=useMemo(()=>docs.filter(x=>x.status==="saved").length,[docs]);
  const pendingCount=useMemo(()=>docs.filter(x=>x.status==="pending_review").length,[docs]);

  return <div className="travel-library-workspace">
    <section className="travel-library-process-strip" aria-label={t("Travel Library processing flow","Travel Library 处理流程")}>
      <span>{t("1 Upload","1 上传")}</span><b>→</b><span>{t("2 AI Review","2 AI 审核")}</span><b>→</b><span>{t("3 Extract Media","3 提取媒体")}</span><b>→</b><span>{t("4 Human Review","4 人工审核")}</span><b>→</b><span>{t("5 Library","5 资料库")}</span>
    </section>

    <div className="travel-library-toolbar">
      <div>
        <strong>{docs.length} {t("Sources","来源")}</strong>
        <span>{savedCount} {t("Saved","已保存")} · {pendingCount} {t("Pending Review","待审核")}</span>
      </div>
      <div className="travel-library-toolbar-actions">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder={t("Search destination, title or file...","搜索目的地、标题或文件...")}/>
        <select value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">{t("All Status","全部状态")}</option>
          <option value="pending_review">{t("Pending Review","待审核")}</option>
          <option value="saved">{t("Saved","已保存")}</option>
        </select>
        <button className="btn" type="button" onClick={()=>void load()}>{t("Search","搜索")}</button>
        <label className="btn primary travel-library-upload-btn">
          {analyzing?t("AI Analyzing...","AI 分析中..."):t("＋ Upload & Analyze","＋ 上传并分析")}
          <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.rtf,.txt,.jpg,.jpeg,.png,.webp" disabled={analyzing} onChange={e=>void analyze(e.target.files?.[0]||null)}/>
        </label>
      </div>
    </div>

    {error&&<div className="ai-import-error">{error}</div>}

    {preview&&<section className="panel travel-library-review">
      <div className="panel-head">
        <div>
          <span className="page-kicker">{t("AI REVIEW PREVIEW","AI 审核预览")}</span>
          <h2>{preview.extraction?.title||preview.file?.name||t("Travel Library Source","Travel Library 来源")}</h2>
          <p className="panel-subtext">{t("AI has organized the information. It will only be written to Places / Hotels / Itinerary Cases / Historical Price References after confirmation.","AI 已整理资料。确认后才会正式写入 Places / Hotels / Itinerary Cases / Historical Price References。")}</p>
        </div>
        {model&&<span className="ai-model-badge">{model}</span>}
      </div>

      <div className="travel-library-review-meta">
        <div><span>{t("Type","类型")}</span><strong>{preview.extraction?.sourceType||"other"}</strong></div>
        <div><span>{t("Destination","目的地")}</span><strong>{preview.extraction?.destination||"—"}</strong></div>
        <div><span>{t("Places","景点")}</span><strong>{preview.extraction?.places?.length||0}</strong></div>
        <div><span>{t("Hotels","酒店")}</span><strong>{preview.extraction?.hotels?.length||0}</strong></div>
        <div><span>{t("Prices","价格")}</span><strong>{preview.extraction?.prices?.length||0}</strong></div>
      </div>

      {preview.extraction?.photoMatch&&<div className={"travel-library-photo-match "+(preview.extraction.photoMatch.status==="matched"?"matched":"review")}>
        <div className="travel-library-photo-match-head">
          <div>
            <span className="page-kicker">{t("PHOTO MATCH REVIEW","照片匹配审核")}</span>
            <h3>{preview.extraction.photoMatch.status==="matched"?t("✓ Matched","✓ 已匹配"):t("Needs Review","需要审核")}</h3>
          </div>
          <span className={"status "+(preview.extraction.photoMatch.status==="matched"?"status-ready":"status-under_review")}>
            {Math.round(Number(preview.extraction.photoMatch.confidence||0)*100)}% {t("Confidence","可信度")}
          </span>
        </div>
        <div className="travel-library-photo-match-grid">
          <div><span>{t("AI Identified","AI 识别")}</span><strong>{preview.extraction.photoMatch.identifiedName||t("Unknown","未知")}</strong></div>
          <div><span>{t("Type","类型")}</span><strong>{preview.extraction.photoMatch.identifiedType||t("unknown","未知")}</strong></div>
          <div><span>{t("Matched Library Record","匹配的资料库记录")}</span><strong>{preview.extraction.photoMatch.matchedName||t("No confident match","没有可信匹配")}</strong></div>
          <div><span>{t("Match Method","匹配方式")}</span><strong>{preview.extraction.photoMatch.method==="ai_semantic"?t("AI Semantic","AI 语义"):preview.extraction.photoMatch.method==="fuzzy"?t("Fuzzy","模糊匹配"):preview.extraction.photoMatch.method==="exact"?t("Exact","精确匹配"):t("AI Identification Only","仅 AI 识别")}</strong></div>
          <div><span>{t("Destination","目的地")}</span><strong>{preview.extraction.photoMatch.destination||"—"}</strong></div>
          <div><span>{t("City / Area","城市 / 区域")}</span><strong>{preview.extraction.photoMatch.cityArea||"—"}</strong></div>
        </div>
        <p>{preview.extraction.photoMatch.reason||"—"}</p>
        {preview.extraction.photoMatch.status!=="matched"&&<small>{t("The system will not treat this as a confirmed match. Check the photo and name before saving.","系统不会把这个结果当作已确认匹配。请先检查照片与名称，再决定是否存档。")}</small>}
      </div>}

      <div className="travel-library-review-grid">
        <article>
          <h3>{t("Summary","摘要")}</h3>
          <p>{preview.extraction?.summary||"—"}</p>
        </article>
        <article>
          <h3>{t("Places / Attractions","景点")}</h3>
          <div className="travel-library-tags">{(preview.extraction?.places||[]).map((x:any,i:number)=><span key={i}>{x.name}</span>)}</div>
        </article>
        <article>
          <h3>{t("Hotels","酒店")}</h3>
          <div className="travel-library-tags">{(preview.extraction?.hotels||[]).map((x:any,i:number)=><span key={i}>{x.name}</span>)}</div>
        </article>
        <article>
          <h3>{t("Historical Price References","历史价格参考")}</h3>
          {(preview.extraction?.prices||[]).length
            ? <div className="travel-library-price-list">{preview.extraction.prices.map((x:any,i:number)=><div key={i}><strong>{[x.currency,x.amount].filter(Boolean).join(" ")||"Price"}</strong><span>{[x.label,x.pax?x.pax+" "+t("pax","人"):"",x.travelPeriod,x.supplier].filter(Boolean).join(" · ")}</span></div>)}</div>
            : <p>{t("No price information detected.","没有识别到价格资料。")}</p>}
        </article>
      </div>

      {(preview.extraction?.warnings||[]).length>0&&<div className="ai-warning-list">
        {preview.extraction.warnings.map((w:string,i:number)=><div key={i}>⚠ {w}</div>)}
      </div>}

      <div className="travel-library-review-actions">
        {preview.saved
          ? <span className="status status-ready">{t("Saved to Library","已保存到资料库")}</span>
          : <button className="btn primary" type="button" disabled={savingId===preview.id} onClick={()=>void confirm(preview.id)}>
              {savingId===preview.id?t("Saving...","保存中..."):t("Confirm & Save to Library","确认并保存到资料库")}
            </button>}
      </div>
    </section>}

    <section className="panel travel-library-document-media">
      <div className="panel-head">
        <div>
          <span className="page-kicker">{t("DOCUMENT MEDIA EXTRACTION","文件媒体提取")}</span>
          <h2>{t("Document Media Review","文件图片匹配审核")}</h2>
          <p className="panel-subtext">{t("Embedded PDF / DOCX images are extracted and reviewed by AI using page text and visual context. They enter the formal Travel Media Library only after your confirmation.","PDF / DOCX 内嵌照片会先拆出并由 AI 结合页内文字与视觉判断。你确认后才会进入正式 Travel Media Library。")}</p>
        </div>
        <div className="travel-library-document-media-status">
          {mediaProcessing&&<span className="status status-under_review">{t("Processing...","处理中...")}</span>}
          <span className="status status-ready">{mediaReview.length} {t("To Review","待审核")}</span>
          <button className="btn compact travel-library-run-extraction" type="button" disabled={mediaProcessing} onClick={()=>void processMediaBacklog()}>
            {mediaProcessing?t("Running...","运行中..."):t("Run Media Extraction","运行媒体提取")}
          </button>
        </div>
      </div>

      {mediaBackfillMessage&&<div className="travel-library-inspector-message">{mediaBackfillMessage}</div>}

      {mediaReview.filter((item:any)=>String(item?.status||"pending_review")==="pending_review"&&!reviewedMediaIdsRef.current.has(String(item?.id||""))).length>0?<div className="travel-library-document-media-list">
        {mediaReview.filter((item:any)=>String(item?.status||"pending_review")==="pending_review"&&!reviewedMediaIdsRef.current.has(String(item?.id||""))).map((item:any)=><article className="travel-library-media-review-row" key={item.id}>
          <div className="travel-library-media-review-thumb">
            <img src={item.imageUrl} alt={item.suggestedName||item.originalName||t("Extracted media","已提取媒体")}/>
            <span>{item.sourcePage?t("Page ","第 ")+item.sourcePage+(language==="zh"?" 页":""):"DOCX"}</span>
          </div>

          <div className="travel-library-media-review-main">
            <small>{item.documentTitle||item.fileName||t("Library Source","资料来源")}</small>
            <strong>{item.suggestedName||t("Needs manual review","需要人工审核")}</strong>
            <span>{item.suggestedPlaceId?t("Library record found","已找到资料库记录"):t("No confident record","没有可信记录")} · {String(item.suggestedType||"unknown")}</span>
          </div>

          <span className={"status travel-library-media-confidence "+(item.suggestedPlaceId?"status-ready":"status-under_review")}>
            {Math.round(Number(item.confidence||0)*100)}%
          </span>

          <div className="travel-library-media-review-actions">
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
              {mediaReviewBusyId===item.id?t("Saving...","保存中..."):t("Confirm","确认")}
            </button>
            <details className="travel-library-media-review-details">
              <summary className="btn compact">{t("More","更多")}</summary>
              <div className="travel-library-media-review-expanded">
                <div className="travel-library-document-media-meta">
                  <div><span>{t("Type","类型")}</span><strong>{item.suggestedType||"unknown"}</strong></div>
                  <div><span>{t("Match","匹配")}</span><strong>{item.suggestedPlaceId?t("Library Record Found","已找到资料库记录"):t("No confident record","没有可信记录")}</strong></div>
                  <div><span>{t("Method","方式")}</span><strong>{String(item.matchMethod||"").replaceAll("_"," ")||"—"}</strong></div>
                  <div><span>{t("Source","来源")}</span><strong>{item.sourcePage?t("Page ","第 ")+item.sourcePage+(language==="zh"?" 页":""):t("Document","文件")}</strong></div>
                </div>

                {item.suggestedPlaceId&&<div className="travel-library-keywords">
                  <div className="travel-library-keywords-head">
                    <div>
                      <strong>{t("Match Keywords","匹配关键词")}</strong>
                      <span>{t("Keep at least one saved keyword before confirming media into the Library.","至少保留 1 个已保存关键词，才能确认素材进入 Library。")}</span>
                    </div>
                  </div>
                  <div className="travel-library-keyword-chips">
                    {(Array.isArray(item.matchKeywords)?item.matchKeywords:[]).map((keyword:string)=><button
                      type="button"
                      className="travel-library-keyword-chip"
                      key={keyword}
                      title={t("Remove keyword","删除关键词")}
                      disabled={keywordBusyId===String(item.suggestedPlaceId)}
                      onClick={()=>void updateMatchKeywords(
                        String(item.suggestedPlaceId),
                        (Array.isArray(item.matchKeywords)?item.matchKeywords:[]).filter((x:string)=>x!==keyword)
                      )}
                    >{keyword}<span>×</span></button>)}
                    {(!Array.isArray(item.matchKeywords)||item.matchKeywords.length===0)&&<em>{t("No custom keywords yet","尚无自定义关键词")}</em>}
                  </div>
                  <div className="travel-library-keyword-input">
                    <input
                      value={keywordDrafts[String(item.suggestedPlaceId)]||""}
                      onChange={e=>setKeywordDrafts(current=>({...current,[String(item.suggestedPlaceId)]:e.target.value}))}
                      onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addMatchKeyword(String(item.suggestedPlaceId),item.matchKeywords||[]);}}}
                      placeholder={t("Add matching keyword...","新增匹配关键词...")}
                    />
                    <button className="btn compact" type="button"
                      disabled={keywordBusyId===String(item.suggestedPlaceId)||!String(keywordDrafts[String(item.suggestedPlaceId)]||"").trim()}
                      onClick={()=>addMatchKeyword(String(item.suggestedPlaceId),item.matchKeywords||[])}>
                      {keywordBusyId===String(item.suggestedPlaceId)?t("Saving...","保存中..."):t("＋ Add Keyword","＋ 新增关键词")}
                    </button>
                  </div>
                </div>}

                <div className="travel-library-media-review-reason">
                  <strong>{t("AI Review","AI 判断")}</strong>
                  <p>{item.reason||"—"}</p>
                </div>

                {item.nearbyText&&<details className="travel-library-page-context">
                  <summary>{t("Show page context","显示页面上下文")}</summary>
                  <div>{item.nearbyText}</div>
                </details>}

                {!item.suggestedPlaceId&&<div className="travel-library-verification-note">
                  {t("AI did not find a sufficiently reliable attraction / hotel record, so this cannot be confirmed directly. Ignore it for now or use manual remapping later.","AI 没有找到足够可信的景点 / 酒店记录，所以不能直接确认。先 Ignore，或之后加入手动改配功能。")}
                </div>}
                {item.suggestedPlaceId&&(!Array.isArray(item.matchKeywords)||item.matchKeywords.length<1)&&<div className="travel-library-verification-note">
                  {t("Add and save at least one Match Keyword before confirming to Library.","请至少新增并保存 1 个 Match Keyword，才能确认到资料库。")}
                </div>}

                <div className="travel-library-media-expanded-actions">
                  <a className="btn compact" href={item.imageUrl} target="_blank" rel="noreferrer">{t("Open Image","打开图片")}</a>
                  <button
                    className="btn compact danger"
                    type="button"
                    disabled={mediaReviewBusyId===item.id}
                    onClick={()=>void reviewMediaCandidate(item.id,"ignore")}
                  >
                    {t("Ignore / Delete","忽略 / 删除")}
                  </button>
                </div>
              </div>
            </details>
          </div>
        </article>)}
      </div>:<div className="travel-library-inspector-empty">
        {mediaProcessing?t("Analyzing existing Library Sources...","正在分析现有 Library Sources..."):t("There are no PDF / DOCX embedded photos awaiting review. Click Run Media Extraction to start manually.","目前没有待审核的 PDF / DOCX 内嵌照片。点击 Run Media Extraction 手动开始。")}
      </div>}
    </section>

    <section className="panel travel-library-inspector">
      <div className="panel-head">
        <div>
          <span className="page-kicker">{t("MEDIA INSPECTOR","媒体检查器")}</span>
          <h2>{t("Library Search & Validation","资料库检查")}</h2>
          <p className="panel-subtext">{t("Search stored attractions or hotels and verify the photos currently linked to them.","搜索已经正式存档的景点或酒店，检查系统目前关联的照片是否正确。")}</p>
        </div>
      </div>

      <div className="travel-library-inspector-search">
        <input
          value={inspectorQuery}
          onChange={e=>{
            const value=e.target.value;
            setInspectorQuery(value);
            if(!value.trim()){
              setInspectorResults([]);
              setInspectorMessage("");
              setKeywordDrafts({});
            }
          }}
          onKeyDown={e=>{if(e.key==="Enter") void searchInspector();}}
          placeholder={t("e.g. Kiyomizu-dera / DoubleTree Kyoto...","例如：清水寺 / Kiyomizu-dera / DoubleTree Kyoto...")}
        />
        <button className="btn travel-library-inspector-search-btn" type="button" disabled={inspectorLoading} onClick={()=>void searchInspector()}>
          {inspectorLoading?t("Searching...","搜索中..."):t("Search Library","搜索资料库")}
        </button>
        <button
          className="btn"
          type="button"
          disabled={inspectorLoading||(!inspectorQuery&&!inspectorResults.length&&!inspectorMessage)}
          onClick={clearInspector}
        >
          {t("Clear","清除")}
        </button>
      </div>

      {inspectorMessage&&<div className="travel-library-inspector-message">{inspectorMessage}</div>}

      {inspectorResults.length>0&&<div className="travel-library-inspector-results">
        {inspectorResults.map((place:any)=><article className="travel-library-inspector-place" key={place.placeId}>
          <div className="travel-library-inspector-place-head">
            <div>
              <span className="page-kicker">{String(place.type||t("PLACE","地点")).toUpperCase()}</span>
              <h3>{place.canonicalName||t("Unnamed Place","未命名地点")}</h3>
              <p>{[place.destination,place.cityArea].filter(Boolean).join(" · ")||"—"}</p>
            </div>
            <div className="travel-library-inspector-badges">
              <span className="status status-ready">{Array.isArray(place.images)?place.images.length:0} {t("Photos","张照片")}</span>
              <span className="travel-library-score">{Math.round(Number(place.score||0)*100)}% {t("Name Match","名称匹配")}</span>
            </div>
          </div>

          {Array.isArray(place.aliases)&&place.aliases.length>0&&<div className="travel-library-inspector-aliases">
            <span>{t("Aliases","别名")}</span>
            <div>{place.aliases.map((a:string,i:number)=><em key={i}>{a}</em>)}</div>
          </div>}

          <div className="travel-library-keywords">
            <div className="travel-library-keywords-head">
              <div>
                <strong>{t("Match Keywords","匹配关键词")}</strong>
                <span>{t("Internal matching terms do not change the official attraction / hotel name.","内部匹配词，不会改变正式景点 / 酒店名称。")}</span>
              </div>
            </div>
            <div className="travel-library-keyword-chips">
              {(Array.isArray(place.matchKeywords)?place.matchKeywords:[]).map((keyword:string)=><button
                type="button"
                className="travel-library-keyword-chip"
                key={keyword}
                title={t("Remove keyword","删除关键词")}
                disabled={keywordBusyId===String(place.placeId)}
                onClick={()=>void updateMatchKeywords(
                  String(place.placeId),
                  (Array.isArray(place.matchKeywords)?place.matchKeywords:[]).filter((x:string)=>x!==keyword)
                )}
              >{keyword}<span>×</span></button>)}
              {(!Array.isArray(place.matchKeywords)||place.matchKeywords.length===0)&&<em>{t("No custom keywords yet","尚无自定义关键词")}</em>}
            </div>
            <div className="travel-library-keyword-input">
              <input
                value={keywordDrafts[String(place.placeId)]||""}
                onChange={e=>setKeywordDrafts(current=>({...current,[String(place.placeId)]:e.target.value}))}
                onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addMatchKeyword(String(place.placeId),place.matchKeywords||[]);}}}
                placeholder={t("Add matching keyword...","新增匹配关键词...")}
              />
              <button className="btn compact" type="button"
                disabled={keywordBusyId===String(place.placeId)||!String(keywordDrafts[String(place.placeId)]||"").trim()}
                onClick={()=>addMatchKeyword(String(place.placeId),place.matchKeywords||[])}>
                {keywordBusyId===String(place.placeId)?t("Saving...","保存中..."):t("＋ Add Keyword","＋ 新增关键词")}
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
                    <strong>{img.name||t("Library Image","资料库图片")}</strong>
                    <span>{img.createdAt?new Date(img.createdAt).toLocaleDateString("en-MY"):t("Stored Library Image","已存档资料库图片")}</span>
                    <div>
                      <a className="btn compact" href={img.url} target="_blank" rel="noreferrer">{t("Open","打开")}</a>
                      <button className="btn compact" type="button" disabled={deletingId===img.imageId} onClick={()=>void mutateInspectorImage(img.imageId,"remove")}>
                        {t("Remove from Place","从地点移除")}
                      </button>
                      <button className="btn compact danger" type="button" disabled={deletingId===img.imageId} onClick={()=>void mutateInspectorImage(img.imageId,"delete")}>
                        {deletingId===img.imageId?t("Deleting...","删除中..."):t("Delete","删除")}
                      </button>
                    </div>
                  </figcaption>
                </figure>)}
              </div>
            : <div className="travel-library-inspector-empty">{t("This attraction / hotel is stored but currently has no linked photos.","这个景点 / 酒店名称已经存档，但目前没有关联照片。")}</div>}
        </article>)}
      </div>}

      {!inspectorLoading&&!inspectorResults.length&&!inspectorMessage&&<div className="travel-library-inspector-empty">
        {t("Enter an attraction or hotel keyword, such as Kiyomizu or a hotel name. The system will search stored Library Records and photos.","输入景点或酒店关键字，例如「清水寺」、「Kiyomizu」或酒店名称，系统会搜索已经存档的 Library Record 与照片。")}
      </div>}
    </section>

    <section className="panel travel-library-sources-toggle">
      <div className="panel-head">
        <div>
          <h2>{t("Library Sources","资料来源")}</h2>
          <p className="panel-subtext">{t("Original Word / PDF / image files are stored in private Supabase Storage; prices are historical references only.","原始 Word / PDF / 图片会保存在私有 Supabase Storage；价格只作为历史参考。")}</p>
        </div>
        <button
          className="btn"
          type="button"
          aria-expanded={showLibrarySources}
          onClick={()=>setShowLibrarySources(current=>!current)}
        >
          {showLibrarySources?t("Hide Sources","隐藏来源"):t("Show Sources","显示来源")}
        </button>
      </div>

      {showLibrarySources&&<div className="travel-library-source-list">
        {docs.map(doc=><article className="travel-library-source-card" key={doc.id}>
          <div className="travel-library-source-main">
            <strong>{doc.title||doc.fileName}</strong>
            <small>
              {[doc.fileName,doc.sourceType||"other",doc.destination||"",fmtSize(doc.fileSize)].filter(Boolean).join(" · ")}
            </small>
          </div>

          <div className="travel-library-source-summary">
            <span className={"status travel-library-source-status "+(doc.status==="saved"?"status-ready":"status-under_review")}>
              {doc.status==="saved"?t("Saved","已保存"):t("Pending Review","待审核")}
            </span>
            <div className="travel-library-source-processing">
              <span>{t("Media","媒体")}</span>
              <strong>{doc.mediaExtractionStatus==="review"
                ? Number(doc.mediaExtractionSummary?.found||0)+t(" found · "," 个找到 · ")+Number(doc.mediaExtractionSummary?.matched||0)+t(" matched"," 个匹配")
                : doc.mediaExtractionStatus==="processing"?t("Processing...","处理中...")
                : doc.mediaExtractionStatus==="completed"?t("Completed","已完成")
                : doc.mediaExtractionStatus==="queued"?t("Queued","已排队")
                : doc.mediaExtractionStatus==="failed"?t("Failed","失败")
                :t("Not Processed","未处理")}</strong>
            </div>
            <div className="travel-library-source-processing">
              <span>{t("AI","AI")}</span>
              <strong>{doc.extraction?.places?.length||0} {t("places","景点")} · {doc.extraction?.hotels?.length||0} {t("hotels","酒店")} · {doc.extraction?.prices?.length||0} {t("prices","价格")}</strong>
            </div>
            <div className="travel-library-source-updated">
              <span>{t("Updated","更新时间")}</span>
              <strong>{doc.updatedAt?new Date(doc.updatedAt).toLocaleDateString("en-MY"):"—"}</strong>
            </div>
          </div>

          <div className="travel-library-source-actions">
            <button className="travel-library-source-open" type="button" onClick={()=>void openSource(doc)}>{t("Open","打开")} →</button>
            {doc.status==="pending_review"&&<button className="btn compact travel-library-source-review" type="button" onClick={()=>setPreview({id:doc.id,file:{name:doc.fileName,path:doc.storagePath,mimeType:doc.mimeType},extraction:doc.extraction})}>{t("Review","审核")}</button>}
            {doc.status==="pending_review"&&<button className="travel-library-source-save" type="button" onClick={()=>void confirm(doc.id)} disabled={savingId===doc.id}>{savingId===doc.id?t("Saving...","保存中..."):t("Save","保存")}</button>}
          </div>
        </article>)}
        {!loading&&!docs.length&&<div className="travel-library-inspector-empty">{t("No data yet. Upload the first itinerary, quotation, hotel document or image.","还没有资料。上传第一份行程、报价、酒店资料或图片。")}</div>}
      </div>}
    </section>
  </div>;}
