import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** 页面标题组件，统一 header 风格 */
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  gradient,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  gradient?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-soft",
            gradient ? "bg-brand-gradient text-white" : "bg-primary/10 text-primary",
          )}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className={cn(
            "text-3xl font-bold tracking-tight",
            gradient && "text-brand-gradient",
          )}>
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
