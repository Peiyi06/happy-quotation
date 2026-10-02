"use client";

import {createContext,useContext,useEffect,useMemo,useState} from "react";

export type WorkspaceLanguage="en"|"zh";

type LanguageContextValue={
  language:WorkspaceLanguage;
  setLanguage:(language:WorkspaceLanguage)=>void;
};

const LanguageContext=createContext<LanguageContextValue>({
  language:"en",
  setLanguage:()=>{}
});

const STORAGE_KEY="happy-workspace-language";

export function WorkspaceLanguageProvider({children}:{children:React.ReactNode}){
  const [language,setLanguageState]=useState<WorkspaceLanguage>("en");

  useEffect(()=>{
    const saved=window.localStorage.getItem(STORAGE_KEY);
    const next:WorkspaceLanguage=saved==="zh"?"zh":"en";
    setLanguageState(next);
    document.documentElement.lang=next==="zh"?"zh-CN":"en";
    document.documentElement.dataset.uiLanguage=next;
  },[]);

  function setLanguage(next:WorkspaceLanguage){
    setLanguageState(next);
    window.localStorage.setItem(STORAGE_KEY,next);
    document.documentElement.lang=next==="zh"?"zh-CN":"en";
    document.documentElement.dataset.uiLanguage=next;
  }

  const value=useMemo(()=>({language,setLanguage}),[language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useWorkspaceLanguage(){
  return useContext(LanguageContext);
}

export function UiText({en,zh}:{en:string;zh:string}){
  const {language}=useWorkspaceLanguage();
  return <>{language==="zh"?zh:en}</>;
}
