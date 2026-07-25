import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar email={user.email} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
