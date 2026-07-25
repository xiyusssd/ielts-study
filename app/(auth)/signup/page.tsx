import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { SignupForm } from "@/components/auth/signup-form";

export default async function SignupPage() {
  const user = await requireUser();
  if (user) redirect("/dashboard");
  return <SignupForm />;
}
