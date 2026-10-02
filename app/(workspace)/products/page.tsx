import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import ProductLibrary from "@/components/ProductLibrary";

export default async function ProductsPage(){
  const token=await internalToken();
  const user=await internalUser();
  const db=internalDb();
  const {data}=token?await db.rpc("staff_list_products",{p_token:token}):{data:[]};
  const products=Array.isArray(data)?data:[];
  return <ProductLibrary initialProducts={products} canCreate={user?.role==="manager"}/>;
}
