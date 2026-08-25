import { Loader2 } from "lucide-react";

export function ButtonSpinner({ className = "h-4 w-4 animate-spin" }: { className?: string }) {
  return <Loader2 className={className} aria-hidden="true" />;
}
