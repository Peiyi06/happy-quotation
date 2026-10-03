"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function WorkspaceSidebarLink({
  href,
  children,
  match,
}:{
  href:string;
  children:React.ReactNode;
  match?:string[];
}){
  const pathname=usePathname();
  const paths=match?.length?match:[href];
  const active=paths.some(path=>pathname===path||pathname.startsWith(path+"/"));

  return <Link
    href={href}
    className={active?"sidebar-nav-item active":"sidebar-nav-item"}
    aria-current={active?"page":undefined}
  >
    {children}
  </Link>;
}
