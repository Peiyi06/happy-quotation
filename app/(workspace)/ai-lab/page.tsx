import { notFound } from "next/navigation";
import AiLabWorkspace from "@/components/AiLabWorkspace";
import { internalUser } from "@/lib/internalSession";

export default async function AiLabPage(){
  const user=await internalUser();
  if(!user||user.username.toLowerCase()!=="long") notFound();
  return <AiLabWorkspace/>;
}