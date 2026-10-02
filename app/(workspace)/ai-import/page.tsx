import { notFound } from "next/navigation";
import AiSupplierImport from "@/components/AiSupplierImport";
import { internalUser } from "@/lib/internalSession";
import {UiText} from "@/components/WorkspaceLanguage";

export default async function AiImportPage(){
  const user=await internalUser();
  if(!user||!["jess","long"].includes(user.username.toLowerCase())) notFound();

  return <div>
    <div className="page-head page-hero-header">
      <div>
        <span className="page-kicker"><UiText en="AI ITINERARY" zh="AI 行程" /></span>
        <h1><UiText en="AI Itinerary" zh="AI 行程" /></h1>
        <p><UiText en="Quickly generate an editable itinerary draft from a file or linked Inquiry data." zh="智能快速生成旅游行程，从文件或 Inquiry 资料快速建立可编辑的 Itinerary Draft。" /></p>
      </div>
    </div>
    <AiSupplierImport/>
  </div>;
}
