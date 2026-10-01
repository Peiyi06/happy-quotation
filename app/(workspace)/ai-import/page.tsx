import { notFound } from "next/navigation";
import AiSupplierImport from "@/components/AiSupplierImport";
import { internalUser } from "@/lib/internalSession";

export default async function AiImportPage(){
  const user=await internalUser();
  if(!user||!["jess","long"].includes(user.username.toLowerCase())) notFound();

  return <div>
    <div className="page-head page-hero-header">
      <div>
        <span className="page-kicker">OPERATION AI</span>
        <h1>Supplier Itinerary Import</h1>
        <p>供应商文件 → AI 结构化 → Operation Review → Draft Itinerary</p>
      </div>
    </div>
    <AiSupplierImport/>
  </div>;
}
