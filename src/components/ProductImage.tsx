import { Croissant } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductImage({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={cn("grid place-items-center bg-gradient-warm/30 text-primary", className)}>
        <Croissant className="h-10 w-10 opacity-60" />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" className={cn("object-cover", className)} />;
}
