import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const user = await requireUser();
  if (user) redirect("/dashboard");
  return <LoginForm />;
}
