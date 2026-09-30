import ItineraryEditor from "@/components/ItineraryEditor";
import { internalUser } from "@/lib/internalSession";

export default async function NewItineraryPage(){
  const user=await internalUser();
  return <ItineraryEditor currentStaffId={user?.id||""} currentStaffName={user?.name||""}/>;
}
