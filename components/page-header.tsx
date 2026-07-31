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
      <div className="flex items-start gap-4">
        {Icon && (
          <div className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-soft",
            gradient ? "bg-brand-gradient text-white" : "bg-primary/10 text-primary",
          )}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="max-w-3xl">
          <h1 className={cn(
            "text-3xl font-bold tracking-tight md:text-4xl",
            gradient && "text-brand-gradient",
          )}>
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm text-muted-foreground md:text-base">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
