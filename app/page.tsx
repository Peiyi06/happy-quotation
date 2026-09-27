import { redirect } from "next/navigation";
import { internalUser } from "@/lib/internalSession";

export default async function Home(){
  const user = await internalUser();
  redirect(user ? "/dashboard" : "/login");
}
