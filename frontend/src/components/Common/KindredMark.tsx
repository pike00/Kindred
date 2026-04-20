import { cn } from "@/lib/utils"

interface KindredMarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string
}

const maskStyle: React.CSSProperties = {
  WebkitMaskImage: "url(/assets/icons/kindred-mark.svg)",
  maskImage: "url(/assets/icons/kindred-mark.svg)",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  backgroundColor: "currentColor",
}

export function KindredMark({ className, ...props }: KindredMarkProps) {
  return (
    <span
      role="img"
      aria-label="Kindred"
      className={cn("inline-block h-full w-auto aspect-square", className)}
      style={maskStyle}
      {...props}
    />
  )
}
