import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link as RouterLink, useRouterState } from "@tanstack/react-router"
import { useState } from "react"
import { SavedFiltersService } from "@/client/sdk.gen"
import type { SavedFilterPublic } from "@/client/types.gen"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useToast } from "@/hooks/use-toast"
import { ListFilter, Pencil, Plus, Trash2 } from "@/lib/icons"

interface FilterCondition {
  field: string
  operator: string
  value: string | number | boolean | string[]
}

interface FilterJson {
  conditions: FilterCondition[]
  op: "and" | "or"
}

const ALLOWED_FIELDS = [
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "company", label: "Company" },
  { value: "stage", label: "Stage" },
  { value: "is_favorite", label: "Is Favorite" },
  { value: "is_archived", label: "Is Archived" },
  { value: "birthday", label: "Birthday" },
  { value: "contact_frequency_days", label: "Contact Frequency (days)" },
  { value: "last_contacted_at", label: "Last Contacted" },
  { value: "created_at", label: "Created At" },
]

const STRING_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "contains", label: "Contains" },
  { value: "in", label: "In (list)" },
]

const NUMBER_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater than or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less than or equal" },
]

const DATE_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
]

const BOOL_OPERATORS = [{ value: "is", label: "Is" }]

function getOperatorsForField(field: string) {
  if (["first_name", "last_name", "company", "stage"].includes(field)) {
    return STRING_OPERATORS
  }
  if (["contact_frequency_days"].includes(field)) {
    return NUMBER_OPERATORS
  }
  if (["birthday", "last_contacted_at", "created_at"].includes(field)) {
    return DATE_OPERATORS
  }
  if (["is_favorite", "is_archived"].includes(field)) {
    return BOOL_OPERATORS
  }
  return STRING_OPERATORS
}

export function SmartLists() {
  const { isMobile, setOpenMobile } = useSidebar()
  const router = useRouterState()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [deleteFilter, setDeleteFilter] = useState<SavedFilterPublic | null>(
    null,
  )
  const [editFilter, setEditFilter] = useState<SavedFilterPublic | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Form state for create/edit
  const [filterName, setFilterName] = useState("")
  const [filterJson, setFilterJson] = useState<FilterJson>({
    conditions: [{ field: "first_name", operator: "contains", value: "" }],
    op: "and",
  })

  // Must return the same shape ContactsList caches under this exact queryKey:
  // both share ["saved-filters"], so unwrapping to res.data here while
  // ContactsList keeps the full {data,count} object means whichever fetches
  // first wins and the other reads a mismatched shape. On /contacts that
  // collision fed this component the {data,count} object and `.map` threw.
  const { data: filtersData, isLoading } = useQuery({
    queryKey: ["saved-filters"],
    queryFn: () => SavedFiltersService.listSavedFilters(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      SavedFiltersService.deleteSavedFilterRoute({ filterId: id as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] })
      setDeleteFilter(null)
      toast({
        title: "Filter deleted",
        description: "The smart list has been deleted.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete filter.",
        variant: "destructive",
      })
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; filter_json: FilterJson }) =>
      SavedFiltersService.createSavedFilterRoute({
        requestBody: { name: data.name, filter_json: data.filter_json as any },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] })
      setIsCreateOpen(false)
      resetForm()
      toast({
        title: "Filter created",
        description: "The smart list has been created.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create filter.",
        variant: "destructive",
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; name: string; filter_json: FilterJson }) =>
      SavedFiltersService.updateSavedFilterRoute({
        filterId: data.id as any,
        requestBody: { name: data.name, filter_json: data.filter_json as any },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] })
      setEditFilter(null)
      resetForm()
      toast({
        title: "Filter updated",
        description: "The smart list has been updated.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update filter.",
        variant: "destructive",
      })
    },
  })

  const resetForm = () => {
    setFilterName("")
    setFilterJson({
      conditions: [{ field: "first_name", operator: "contains", value: "" }],
      op: "and",
    })
  }

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const openEditDialog = (filter: SavedFilterPublic) => {
    setEditFilter(filter)
    setFilterName(filter.name)
    setFilterJson(filter.filter_json as any)
  }

  const addCondition = () => {
    setFilterJson({
      ...filterJson,
      conditions: [
        ...filterJson.conditions,
        { field: "first_name", operator: "contains", value: "" },
      ],
    })
  }

  const removeCondition = (index: number) => {
    setFilterJson({
      ...filterJson,
      conditions: filterJson.conditions.filter((_, i) => i !== index),
    })
  }

  const updateCondition = (index: number, field: string, value: any) => {
    const newConditions = [...filterJson.conditions]
    newConditions[index] = { ...newConditions[index], [field]: value }
    // Reset operator when field changes
    if (field === "field") {
      const operators = getOperatorsForField(value)
      newConditions[index].operator = operators[0].value
    }
    setFilterJson({ ...filterJson, conditions: newConditions })
  }

  const handleSave = () => {
    if (editFilter) {
      updateMutation.mutate({
        id: editFilter.id as any,
        name: filterName,
        filter_json: filterJson,
      })
    } else {
      createMutation.mutate({ name: filterName, filter_json: filterJson })
    }
  }

  const filters = filtersData?.data ?? []

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ListFilter className="h-4 w-4" />
            Smart Lists
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => {
              resetForm()
              setIsCreateOpen(true)
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {isLoading ? (
              <SidebarMenuItem>
                <span className="text-xs text-muted-foreground px-2">
                  Loading...
                </span>
              </SidebarMenuItem>
            ) : filters.length === 0 ? (
              <SidebarMenuItem>
                <span className="text-xs text-muted-foreground px-2">
                  No smart lists yet
                </span>
              </SidebarMenuItem>
            ) : (
              filters.map((filter) => {
                const isActive =
                  router.location.pathname === "/contacts" &&
                  router.location.search?.saved_filter_id === filter.id
                return (
                  <SidebarMenuItem key={filter.id}>
                    <SidebarMenuButton
                      tooltip={filter.name}
                      isActive={isActive}
                      asChild
                    >
                      <RouterLink
                        to="/contacts"
                        search={{ saved_filter_id: filter.id as any }}
                        onClick={handleMenuClick}
                      >
                        <ListFilter className="h-4 w-4" />
                        <span className="flex-1">{filter.name}</span>
                      </RouterLink>
                    </SidebarMenuButton>
                    <div className="flex items-center gap-1 ml-auto">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => openEditDialog(filter)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => setDeleteFilter(filter)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </SidebarMenuItem>
                )
              })
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateOpen || editFilter !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false)
            setEditFilter(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editFilter ? "Edit Smart List" : "Create Smart List"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="filter-name">Name</Label>
              <Input
                id="filter-name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="e.g., Colleagues overdue > 30d"
              />
            </div>
            <div>
              <Label>Operator</Label>
              <Select
                value={filterJson.op}
                onValueChange={(value: "and" | "or") =>
                  setFilterJson({ ...filterJson, op: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="and">
                    AND (all conditions match)
                  </SelectItem>
                  <SelectItem value="or">OR (any condition matches)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conditions</Label>
              {filterJson.conditions.map((condition, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 border rounded"
                >
                  <div className="flex-1 space-y-2">
                    <Select
                      value={condition.field}
                      onValueChange={(value) =>
                        updateCondition(index, "field", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALLOWED_FIELDS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={condition.operator}
                      onValueChange={(value) =>
                        updateCondition(index, "operator", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getOperatorsForField(condition.field).map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={condition.value as string}
                      onChange={(e) =>
                        updateCondition(index, "value", e.target.value)
                      }
                      placeholder="Value"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeCondition(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addCondition}>
                <Plus className="h-4 w-4 mr-2" />
                Add Condition
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false)
                setEditFilter(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !filterName ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editFilter ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteFilter !== null}
        onOpenChange={(open) => !open && setDeleteFilter(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Smart List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteFilter?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteFilter && deleteMutation.mutate(deleteFilter.id as any)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
