import { notFound } from "next/navigation";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import ItineraryEditor from "@/components/ItineraryEditor";

export default async function EditItineraryPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const token=await internalToken();
  if(!token) notFound();
  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_itinerary",{p_token:token,p_id:id});
  if(error||!data||!data.id) notFound();
  const user=await internalUser();
  return <ItineraryEditor itineraryId={id} initialItinerary={data} currentStaffId={user?.id||""} currentStaffName={user?.name||""}/>;
}
