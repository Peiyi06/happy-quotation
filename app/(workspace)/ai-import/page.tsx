import { notFound } from "next/navigation";
import AiSupplierImport from "@/components/AiSupplierImport";
import { internalUser } from "@/lib/internalSession";

export default async function AiImportPage(){
  const user=await internalUser();
  if(!user||!["jess","long"].includes(user.username.toLowerCase())) notFound();

  return <div>
    <div className="page-head page-hero-header">
      <div>
        <span className="page-kicker">AI ITINERARY</span>
        <h1>AI Itinerary</h1>
        <p>智能快速生成旅游行程｜从文件或 Inquiry 资料快速建立可编辑的 Itinerary Draft</p>
      </div>
    </div>
    <AiSupplierImport/>
  </div>;
}
