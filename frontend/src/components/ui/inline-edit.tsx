import * as React from "react"
import { Check, Loader2, Pencil } from "@/lib/icons"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface BaseInlineProps {
  label?: string
  placeholder?: string
  className?: string
  valueClassName?: string
  inputClassName?: string
  disabled?: boolean
  showEditIcon?: boolean
}

// ---------------------------------------------------------------------------
// 1. Inline Text Input
// ---------------------------------------------------------------------------
export interface InlineTextProps extends BaseInlineProps {
  value: string
  onSave: (newValue: string) => Promise<void> | void
  type?: "text" | "number"
}

export function InlineText({
  value,
  onSave,
  placeholder = "+ Add value",
  className,
  valueClassName,
  inputClassName,
  disabled = false,
  showEditIcon = true,
  type = "text",
}: InlineTextProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [currentValue, setCurrentValue] = React.useState(value)
  const [isSaving, setIsSaving] = React.useState(false)
  const [justSaved, setJustSaved] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setCurrentValue(value)
  }, [value])

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    if (currentValue === value) {
      setIsEditing(false)
      return
    }
    try {
      setIsSaving(true)
      await onSave(currentValue)
      setIsEditing(false)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    } catch {
      setCurrentValue(value)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setCurrentValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      e.preventDefault()
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 min-w-0 w-full", className)}>
        <input
          ref={inputRef}
          type={type}
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          className={cn(
            "w-full bg-background border border-primary/50 rounded-lg px-2.5 py-1 text-sm shadow-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 dark:bg-zinc-900/90",
            inputClassName
          )}
        />
        {isSaving && <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />}
      </div>
    )
  }

  const isEmpty = !value || value.trim() === ""

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && setIsEditing(true)}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          setIsEditing(true)
        }
      }}
      className={cn(
        "group relative inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm transition-all duration-150 cursor-pointer hover:bg-zinc-800/40 dark:hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/50",
        disabled && "pointer-events-none opacity-60",
        isEmpty && "text-muted-foreground/70 italic",
        className
      )}
    >
      <span className={cn("truncate font-medium", valueClassName)}>
        {isEmpty ? placeholder : value}
      </span>
      {justSaved ? (
        <Check className="size-3.5 text-emerald-500 shrink-0 animate-in fade-in zoom-in duration-200" />
      ) : (
        showEditIcon && (
          <Pencil className="size-3 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 shrink-0" />
        )
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2. Inline Textarea
// ---------------------------------------------------------------------------
export interface InlineTextareaProps extends BaseInlineProps {
  value: string
  onSave: (newValue: string) => Promise<void> | void
  rows?: number
}

export function InlineTextarea({
  value,
  onSave,
  placeholder = "+ Add details...",
  className,
  valueClassName,
  inputClassName,
  disabled = false,
  rows = 3,
}: InlineTextareaProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [currentValue, setCurrentValue] = React.useState(value)
  const [isSaving, setIsSaving] = React.useState(false)
  const [justSaved, setJustSaved] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    setCurrentValue(value)
  }, [value])

  React.useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus()
      textareaRef.current?.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    if (currentValue === value) {
      setIsEditing(false)
      return
    }
    try {
      setIsSaving(true)
      await onSave(currentValue)
      setIsEditing(false)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    } catch {
      setCurrentValue(value)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      e.preventDefault()
      setCurrentValue(value)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <div className={cn("space-y-2 w-full", className)}>
        <textarea
          ref={textareaRef}
          value={currentValue}
          rows={rows}
          onChange={(e) => setCurrentValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className={cn(
            "w-full bg-background border border-primary/50 rounded-xl p-3 text-sm shadow-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 dark:bg-zinc-900/90 resize-y",
            inputClassName
          )}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">⌘+Enter</kbd> to save</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCurrentValue(value)
                setIsEditing(false)
              }}
              disabled={isSaving}
              className="h-7 px-2 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-7 px-3 text-xs gap-1"
            >
              {isSaving ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Check className="size-3" />
              )}
              Save
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const isEmpty = !value || value.trim() === ""

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && setIsEditing(true)}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          setIsEditing(true)
        }
      }}
      className={cn(
        "group relative block rounded-xl p-3 text-sm transition-all duration-150 cursor-pointer hover:bg-zinc-800/40 dark:hover:bg-zinc-800/60 border border-zinc-800/40 hover:border-zinc-700/60",
        disabled && "pointer-events-none opacity-60",
        isEmpty && "text-muted-foreground/70 italic",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("whitespace-pre-wrap leading-relaxed", valueClassName)}>
          {isEmpty ? placeholder : value}
        </p>
        {justSaved ? (
          <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
        ) : (
          <Pencil className="size-3.5 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 shrink-0 mt-0.5" />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3. Inline Date Input
// ---------------------------------------------------------------------------
export interface InlineDateProps extends BaseInlineProps {
  value: string | null
  onSave: (newValue: string | null) => Promise<void> | void
  displayFormat?: (val: string) => string
}

export function InlineDate({
  value,
  onSave,
  placeholder = "+ Add date",
  className,
  valueClassName,
  inputClassName,
  disabled = false,
  displayFormat,
}: InlineDateProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [currentValue, setCurrentValue] = React.useState(value ? value.slice(0, 10) : "")
  const [isSaving, setIsSaving] = React.useState(false)
  const [justSaved, setJustSaved] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setCurrentValue(value ? value.slice(0, 10) : "")
  }, [value])

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
    }
  }, [isEditing])

  const handleSave = async (newValueString: string) => {
    const valToSave = newValueString ? newValueString : null
    if (valToSave === (value ? value.slice(0, 10) : null)) {
      setIsEditing(false)
      return
    }
    try {
      setIsSaving(true)
      await onSave(valToSave)
      setIsEditing(false)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    } catch {
      setCurrentValue(value ? value.slice(0, 10) : "")
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing) {
    return (
      <div className={cn("inline-flex items-center gap-1.5", className)}>
        <input
          ref={inputRef}
          type="date"
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={() => handleSave(currentValue)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave(currentValue)
            if (e.key === "Escape") {
              setCurrentValue(value ? value.slice(0, 10) : "")
              setIsEditing(false)
            }
          }}
          disabled={isSaving}
          className={cn(
            "bg-background border border-primary/50 rounded-lg px-2.5 py-1 text-sm shadow-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 dark:bg-zinc-900/90",
            inputClassName
          )}
        />
        {isSaving && <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />}
      </div>
    )
  }

  const isEmpty = !value
  const displayText = value
    ? displayFormat
      ? displayFormat(value)
      : value.slice(0, 10)
    : placeholder

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && setIsEditing(true)}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          setIsEditing(true)
        }
      }}
      className={cn(
        "group relative inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm transition-all duration-150 cursor-pointer hover:bg-zinc-800/40 dark:hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/50",
        disabled && "pointer-events-none opacity-60",
        isEmpty && "text-muted-foreground/70 italic",
        className
      )}
    >
      <span className={cn("font-medium", valueClassName)}>{displayText}</span>
      {justSaved ? (
        <Check className="size-3.5 text-emerald-500 shrink-0" />
      ) : (
        <Pencil className="size-3 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 shrink-0" />
      )}
    </div>
  )
}
