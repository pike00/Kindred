import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"

import {
  type ContactPublic,
  ContactsService,
  SearchService,
  type SearchResponse,
  type SearchResultItem,
} from "@/client"
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
} from "@/lib/icons"

import { UsersRound } from "@/lib/icons"
import { useCommandPalette } from "./CommandPaletteContext"
import { SearchBadge } from "./SearchBadge"
const CONTACT_LIMIT = 8
const SEARCH_LIMIT = 20

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
  const { open, setOpen, toggle } = useCommandPalette()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toggle])

  // Full-text search
  const { data: searchData, isFetching: searchLoading } = useQuery<SearchResponse>({
    queryKey: ["search", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 1) {
        return { results: [], total: 0, query: searchQuery }
      }
      return SearchService.search({ q: searchQuery, limit: SEARCH_LIMIT })
    },
    enabled: open && searchQuery.length >= 1,
    staleTime: 30_000,
  })

  const searchResults: SearchResultItem[] = searchData?.results ?? []
  const { data: contactsData } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => ContactsService.listContacts(),
    enabled: open,
  })

  const contacts = useMemo(() => contactsData?.data ?? [], [contactsData])

  const runCommand = (action: () => void) => {
    setOpen(false)
    // Clear search state
    setSearchQuery("")
    queryClient.removeQueries({ queryKey: ["search"] })
    action()
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Type a command or search..."
        onChangeCapture={(e) => {
          const target = e.target as HTMLInputElement
          setSearchQuery(target.value)
        }}
      />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        {/* Full-text search results */}
        {searchQuery.length >= 1 && (
          <>
            <CommandGroup heading="Search Results">
              {searchLoading && (
                <CommandItem disabled>
                  <span className="text-muted-foreground">Searching...</span>
                </CommandItem>
              )}
              {!searchLoading && searchResults.length === 0 && (
                <CommandItem disabled>
                  <span className="text-muted-foreground">No results found.</span>
                </CommandItem>
              )}
              {searchResults.slice(0, 10).map((result) => (
                <CommandItem
                  key={`${result.type}:${result.id}`}
                  value={`search:${result.type}:${result.id} ${result.title} ${result.snippet ?? ""}`}
                  onSelect={() =>
                    runCommand(() => {
                      if (result.type === "contact") {
                        navigate({
                          to: "/contacts/$contactId",
                          params: { contactId: result.id },
                        })
                      } else if (result.type === "note") {
                        // Notes are displayed on contact page
                        navigate({
                          to: "/contacts/$contactId",
                          params: { contactId: result.id },
                        })
                      } else if (result.type === "interaction") {
                        navigate({ to: "/interactions" })
                      } else if (result.type === "journal_entry") {
                        navigate({ to: "/journal" })
                      }
                    })
                  }
                >
                  <SearchBadge type={result.type} />
                  <span className="truncate">{result.title}</span>
                  {result.snippet && (
                    <span className="ml-2 truncate text-xs text-muted-foreground">
                      {result.snippet}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Contact quick access */}
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
