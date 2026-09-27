import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import QuotationCalculator from "@/components/QuotationCalculator";

export default async function EditQuotationPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data,error}=await supabase.from("quotations").select("*").eq("id",id).single();
  if(error||!data) notFound();
  return <QuotationCalculator workspaceMode quotationId={id} initialQuotation={data} />;
}
