import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** 空数据展示 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center", className)}>
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
