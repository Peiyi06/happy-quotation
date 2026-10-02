"use client";

import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function WorkspaceSettingsPage(){
  const {language,setLanguage}=useWorkspaceLanguage();

  return <div>
    <div className="page-head settings-page-head">
      <div>
        <h1>{language==="zh"?"系统设置":"Settings"}</h1>
      </div>
    </div>

    <section className="panel settings-panel">
      <div className="panel-head">
        <h2>{language==="zh"?"界面语言":"Interface Language"}</h2>
      </div>

      <div className="language-choice-grid">
        <button
          type="button"
          className={"language-choice "+(language==="en"?"active":"")}
          onClick={()=>setLanguage("en")}
        >
          <strong>English</strong>
          <span>Default</span>
        </button>
        <button
          type="button"
          className={"language-choice "+(language==="zh"?"active":"")}
          onClick={()=>setLanguage("zh")}
        >
          <strong>中文</strong>
          <span>简体中文</span>
        </button>
      </div>

      <div className="settings-language-note">
        {language==="zh"
          ?"语言切换只改变系统界面。客户姓名、景点、酒店、餐厅、备注及其他业务资料会保持原文。"
          :"Language switching changes the interface only. Customer names, attractions, hotels, restaurants, notes and other business content remain exactly as entered."}
      </div>
    </section>
  </div>;
}
