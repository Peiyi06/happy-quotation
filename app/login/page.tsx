import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { internalUser } from "@/lib/internalSession";

export default async function LoginPage() {
  const user = await internalUser();
  if (user) redirect("/dashboard");
  return <LoginForm />;
}
