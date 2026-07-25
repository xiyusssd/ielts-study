"use client";
import { ModuleError } from "@/components/module-error";
export default function Error(props: { error: Error; reset: () => void }) {
  return <ModuleError {...props} module="阅读" />;
}
