import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useMemo } from "react"
import { type ContactPublic, ContactsService } from "@/client"
import { ContactAvatar } from "@/components/Common/ContactAvatar"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import useAuth from "@/hooks/useAuth"
import { useRegisterShortcuts } from "@/hooks/useKeyboardShortcuts"
import {
  Bell,
  Home,
  MessagesSquare,
  NotebookPen,
  Plus,
  Settings,
  ShieldCheck,
  Tag,
  Users,
  UsersRound,
} from "@/lib/icons"
import { useCommandPalette } from "./CommandPaletteContext"

const CONTACT_LIMIT = 8

function contactLabel(contact: ContactPublic): string {
  const parts = [contact.first_name, contact.last_name].filter(Boolean)
  return parts.join(" ") || "Unnamed contact"
}

function contactHaystack(contact: ContactPublic): string {
  return [
    contact.first_name,
    contact.last_name,
    contact.middle_name,
    contact.nickname,
    contact.company,
    contact.title,
    ...(contact.tags?.map((t) => t.name) ?? []),
    ...(contact.groups?.map((g) => g.name) ?? []),
  ]
    .filter(Boolean)
    .join(" ")
}

export function CommandPalette() {
  // Register the Cmd+K / Ctrl+K shortcut in the global registry
  useRegisterShortcuts([
    {
      keys: "Meta+k",
      description: "Open command palette",
      group: "Search",
      callback: () => toggle(),
    },
    {
      keys: "Control+k",
      description: "Open command palette",
      group: "Search",
      callback: () => toggle(),
    },
  ])
  const { open, setOpen, toggle } = useCommandPalette()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: contactsData } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => ContactsService.listContacts(),
    enabled: open,
  })

  const contacts = useMemo(() => contactsData?.data ?? [], [contactsData])

  const runCommand = (action: () => void) => {
    setOpen(false)
    action()
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search contacts..." />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        {contacts.length > 0 && (
          <CommandGroup heading="Contacts">
            {contacts.slice(0, CONTACT_LIMIT).map((contact) => (
              <CommandItem
                key={contact.id}
                value={`contact:${contact.id} ${contactHaystack(contact)}`}
                onSelect={() =>
                  runCommand(() =>
                    navigate({
                      to: "/contacts/$contactId",
                      params: { contactId: contact.id },
                    }),
                  )
                }
              >
                <ContactAvatar contact={contact} size="sm" />
                <span className="truncate">{contactLabel(contact)}</span>
                {contact.company && (
                  <span className="ml-2 truncate text-xs text-muted-foreground">
                    {contact.company}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Quick actions">
          <CommandItem
            value="action:new-contact"
            onSelect={() => runCommand(() => navigate({ to: "/contacts" }))}
          >
            <Plus />
            <span>Add contact</span>
          </CommandItem>
          <CommandItem
            value="action:new-interaction log"
            onSelect={() => runCommand(() => navigate({ to: "/interactions" }))}
          >
            <MessagesSquare />
            <span>Log interaction</span>
          </CommandItem>
          <CommandItem
            value="action:new-journal entry"
            onSelect={() => runCommand(() => navigate({ to: "/journal" }))}
          >
            <NotebookPen />
            <span>New journal entry</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          <CommandItem
            value="nav:dashboard home"
            onSelect={() => runCommand(() => navigate({ to: "/" }))}
          >
            <Home />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem
            value="nav:contacts people"
            onSelect={() => runCommand(() => navigate({ to: "/contacts" }))}
          >
            <Users />
            <span>Contacts</span>
          </CommandItem>
          <CommandItem
            value="nav:interactions"
            onSelect={() => runCommand(() => navigate({ to: "/interactions" }))}
          >
            <MessagesSquare />
            <span>Interactions</span>
          </CommandItem>
          <CommandItem
            value="nav:tags"
            onSelect={() => runCommand(() => navigate({ to: "/tags" }))}
          >
            <Tag />
            <span>Tags</span>
          </CommandItem>
          <CommandItem
            value="nav:groups"
            onSelect={() => runCommand(() => navigate({ to: "/groups" }))}
          >
            <UsersRound />
            <span>Groups</span>
          </CommandItem>
          <CommandItem
            value="nav:reminders"
            onSelect={() => runCommand(() => navigate({ to: "/reminders" }))}
          >
            <Bell />
            <span>Reminders</span>
          </CommandItem>
          <CommandItem
            value="nav:journal"
            onSelect={() => runCommand(() => navigate({ to: "/journal" }))}
          >
            <NotebookPen />
            <span>Journal</span>
          </CommandItem>
          <CommandItem
            value="nav:settings"
            onSelect={() => runCommand(() => navigate({ to: "/settings" }))}
          >
            <Settings />
            <span>Settings</span>
          </CommandItem>
          {user?.is_superuser && (
            <CommandItem
              value="nav:admin"
              onSelect={() => runCommand(() => navigate({ to: "/admin" }))}
            >
              <ShieldCheck />
              <span>Admin</span>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
