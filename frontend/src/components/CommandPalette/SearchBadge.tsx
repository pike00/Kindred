import {
  BookOpen,
  MessagesSquare,
  NotebookPen,
  UserRoundSearch,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

type SearchResultType = "contact" | "note" | "interaction" | "journal_entry"

const typeConfig: Record<
  SearchResultType,
  {
    label: string
    icon: React.ReactNode
    variant: "default" | "secondary" | "destructive" | "outline"
  }
> = {
  contact: {
    label: "Contact",
    icon: <UserRoundSearch className="h-3 w-3" />,
    variant: "default",
  },
  note: {
    label: "Note",
    icon: <NotebookPen className="h-3 w-3" />,
    variant: "secondary",
  },
  interaction: {
    label: "Interaction",
    icon: <MessagesSquare className="h-3 w-3" />,
    variant: "outline",
  },
  journal_entry: {
    label: "Journal",
    icon: <BookOpen className="h-3 w-3" />,
    variant: "destructive",
  },
}

interface SearchBadgeProps {
  type: string
}

export function SearchBadge({ type }: SearchBadgeProps) {
  const config = typeConfig[type as SearchResultType] ?? typeConfig.contact

  return (
    <Badge variant={config.variant} className="flex items-center gap-1 text-xs">
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  )
}
