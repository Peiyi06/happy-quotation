"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
export default function TeamRoleSelect({id,role,disabled}:{id:string;role:"manager"|"sales";disabled?:boolean}){
  const router=useRouter();
  return <select disabled={disabled} value={role} onChange={async e=>{
    const supabase=createClient();
    await supabase.from("profiles").update({role:e.target.value}).eq("id",id);
    router.refresh();
  }}><option value="sales">Sales</option><option value="manager">Manager</option></select>;
}
