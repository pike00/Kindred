import { cn } from "@/lib/utils"

type ContactForAvatar = {
  id: string
  first_name?: string | null
  last_name?: string | null
}

interface ContactAvatarProps {
  contact: ContactForAvatar
  size?: "sm" | "md" | "lg"
  className?: string
}

const AVATAR_PALETTE_SIZE = 12

function hashContactId(id: string): number {
  let sum = 0
  for (let i = 0; i < id.length; i++) {
    sum += id.charCodeAt(i)
  }
  return (sum % AVATAR_PALETTE_SIZE) + 1
}

function initialsFor(contact: ContactForAvatar): string {
  const first = contact.first_name?.trim()[0]
  const last = contact.last_name?.trim()[0]
  if (first && last) return (first + last).toUpperCase()
  if (first) return first.toUpperCase()
  return "?"
}

const sizeClasses: Record<NonNullable<ContactAvatarProps["size"]>, string> = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
}

export function ContactAvatar({
  contact,
  size = "md",
  className,
}: ContactAvatarProps) {
  const slot = hashContactId(contact.id)
  const initials = initialsFor(contact)

  return (
    <div
      className={cn(
        "font-display inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight text-white",
        sizeClasses[size],
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, var(--avatar-${slot}-from), var(--avatar-${slot}-to))`,
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}
