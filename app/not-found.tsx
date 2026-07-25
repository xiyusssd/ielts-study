import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h2 className="mb-2 text-4xl font-bold">404</h2>
        <p className="mb-4 text-muted-foreground">这个页面还不存在</p>
        <Button asChild>
          <Link href="/">回到首页</Link>
        </Button>
      </div>
    </div>
  );
}
