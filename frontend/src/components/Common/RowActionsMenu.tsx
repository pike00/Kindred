import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type LucideIcon, MoreHorizontal } from "@/lib/icons"
import { cn } from "@/lib/utils"

export interface RowActionItem {
  label: string
  icon?: LucideIcon
  onSelect: () => void
  variant?: "default" | "destructive"
  disabled?: boolean
}

interface RowActionsMenuProps {
  items: RowActionItem[]
  ariaLabel?: string
  triggerClassName?: string
}

export function RowActionsMenu({
  items,
  ariaLabel = "Open actions menu",
  triggerClassName,
}: RowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("size-8 p-0", triggerClassName)}
          aria-label={ariaLabel}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <DropdownMenuItem
              key={item.label}
              onSelect={item.onSelect}
              disabled={item.disabled}
              className={cn(
                item.variant === "destructive" &&
                  "text-destructive focus:text-destructive",
              )}
            >
              {Icon && <Icon className="size-4" />}
              {item.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
