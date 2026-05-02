import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSuspenseQuery } from "@tanstack/react-query";

import {
  ContactsKanbanService,
  ContactsService,
  type ContactPublic,
  type ContactsPublic,
} from "@/client/kanban-service";
import { ContactAvatar } from "@/components/Common/ContactAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, GripVertical } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/Common/EmptyState";
import { AddContactDialog } from "./AddContactDialog";
import {
  ContactsKanbanService,
  ContactsService,
  type ContactPublic,
  type ContactsPublic,
} from "@/client";
import { ContactAvatar } from "@/components/Common/ContactAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  GripVertical,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/Common/EmptyState";
import { AddContactDialog } from "./AddContactDialog";

const DEFAULT_STAGES = ["Active", "Dormant", "Lost", "Archived"];
const PAGE_SIZE = 25;

function fullName(contact: ContactPublic): string {
  return (
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    "Unnamed contact"
  );
}

function ContactCard({
  contact,
  isDragging,
}: {
  contact: ContactPublic;
  isDragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs transition-all",
        isDragging && "opacity-50 shadow-lg",
        !isDragging && "hover:-translate-y-px hover:border-primary/30 hover:shadow-sm",
      )}
    >
      <div className="cursor-grab opacity-40 group-hover:opacity-100 transition-opacity">
        <GripVertical className="size-4" />
      </div>
      <ContactAvatar contact={contact} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm truncate">{fullName(contact)}</div>
        {(contact.title || contact.company) && (
          <div className="text-xs text-muted-foreground truncate">
            {contact.title && contact.company
              ? `${contact.title} at ${contact.company}`
              : contact.title || contact.company}
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  contacts,
  isOver,
  onAddContact,
}: {
  stage: string;
  contacts: ContactPublic[];
  isOver?: boolean;
  onAddContact?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex w-80 flex-col rounded-2xl border bg-muted/30 transition-colors",
        isOver && "bg-primary/5 border-primary/30",
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{stage}</h3>
          <Badge variant="secondary" className="text-xs">
            {contacts.length}
          </Badge>
        </div>
        {stage !== "Archived" && onAddContact && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onAddContact}
          >
            +
          </Button>
        )}
      </div>

      {/* Column Body - scrollable */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-300px)]">
        {contacts.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            No contacts
          </div>
        ) : (
          contacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))
        )}
      </div>
    </div>
  );
}

export const KanbanBoard = () => {
  const navigate = useNavigate({ from: "/contacts" });
  const [search, setSearch] = useState("");
  const [activeContact, setActiveContact] = useState<ContactPublic | null>(null);

  // Fetch stages
  const { data: stagesData } = useSuspenseQuery({
    queryKey: ["contact-stages"],
    queryFn: () => ContactsKanbanService.getDistinctStages(),
  });

  const stages = useMemo(() => {
    const serverStages = stagesData ?? [];
    // Merge server stages with defaults
    const allStages = new Set([...DEFAULT_STAGES, ...serverStages]);
    return Array.from(allStages);
  }, [stagesData]);

  // Fetch kanban board data
  const { data: boardData, refetch } = useSuspenseQuery({
    queryKey: ["kanban-board", search],
    queryFn: () =>
      ContactsKanbanService.getKanbanBoard({
        search: search || null,
      }),
  });

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const contactId = active.id as string;
    // Find the contact in the board data
    if (boardData) {
      for (const stage of Object.keys(boardData)) {
        const col = boardData[stage] as ContactsPublic;
        const contact = col?.data?.find((c) => c.id === contactId);
        if (contact) {
          setActiveContact(contact);
          break;
        }
      }
    }
  }, [boardData]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // We handle the visual feedback in the columns
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveContact(null);

      if (!over || !boardData) return;

      const contactId = active.id as string;
      const newStage = over.id as string;

      // Find current stage of the contact
      let oldStage: string | undefined;
      for (const stage of Object.keys(boardData)) {
        const col = boardData[stage] as ContactsPublic;
        if (col?.data?.some((c) => c.id === contactId)) {
          oldStage = stage;
          break;
        }
      }

      if (!oldStage || oldStage === newStage) return;

      // Optimistic update: move contact in local state
      // We'll refetch after the mutation
      try {
        await ContactsService.updateContact({
          contactId,
          requestBody: { stage: newStage },
        });
        refetch();
      } catch (error) {
        console.error("Failed to update contact stage:", error);
        // Revert - refetch to get correct state
        refetch();
      }
    },
    [boardData, refetch],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Contacts
          </h1>
          <p className="text-muted-foreground mt-1">Kanban Board</p>
        </div>
        <AddContactDialog />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="pl-10"
        />
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const col = boardData?.[stage] as ContactsPublic | undefined;
            const contacts = col?.data ?? [];
            return (
              <KanbanColumn
                key={stage}
                stage={stage}
                contacts={contacts}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeContact ? (
            <ContactCard contact={activeContact} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Empty State */}
      {(!boardData ||
        Object.values(boardData).every(
          (col) => (col as ContactsPublic)?.data?.length === 0,
        )) &&
        !search && (
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Add your first contact to start tracking relationships."
            action={<AddContactDialog />}
          />
        )}
    </div>
  );
};
