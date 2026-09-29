import QuotationCalculator from "@/components/QuotationCalculator";
import { internalUser } from "@/lib/internalSession";

export default async function NewQuotationPage(){
  const user=await internalUser();
  return <QuotationCalculator workspaceMode currentStaffId={user?.id||""} currentStaffName={user?.name||""} />;
}
