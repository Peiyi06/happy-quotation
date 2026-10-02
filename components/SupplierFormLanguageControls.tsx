"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SupplierFormLanguageControls({
  inquiryId,
  currentLanguage,
  englishReady,
  chineseReady,
  returnTo="/inquiries"
}:{
  inquiryId:string;
  currentLanguage:"original"|"en"|"zh";
  englishReady:boolean;
  chineseReady:boolean;
  returnTo?:string;
}){
  const router=useRouter();
  const [loading,setLoading]=useState<""|"en"|"zh">("");
  const [error,setError]=useState("");
  const returnParam=encodeURIComponent(returnTo);
  const basePath="/inquiries/"+inquiryId+"/supplier-form";

  function go(language:"original"|"en"|"zh"){
    if(language==="original"){
      router.push(basePath+"?returnTo="+returnParam);
      return;
    }
    const ready=language==="en"?englishReady:chineseReady;
    if(ready){
      router.push(basePath+"?lang="+language+"&returnTo="+returnParam);
      return;
    }
    void translate(language);
  }

  async function translate(language:"en"|"zh"){
    setLoading(language);setError("");
    try{
      const res=await fetch("/api/supplier-form-translate",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:inquiryId,language})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||"Unable to translate.");return;}
      router.push(basePath+"?lang="+language+"&returnTo="+returnParam);
      router.refresh();
    }finally{setLoading("");}
  }

  return <div className="supplier-language-wrap">
    <div className="supplier-language-switch ios-segmented-control" aria-label="Supplier form language">
      <button type="button" className={currentLanguage==="original"?"active":""} onClick={()=>go("original")}>Original</button>
      <button type="button" className={currentLanguage==="en"?"active":""} disabled={Boolean(loading)} onClick={()=>go("en")}>{loading==="en"?"Translating...":"English"}</button>
      <button type="button" className={currentLanguage==="zh"?"active":""} disabled={Boolean(loading)} onClick={()=>go("zh")}>{loading==="zh"?"翻译中...":"中文"}</button>
    </div>
    {error&&<span className="supplier-language-error">{error}</span>}
  </div>;
}
