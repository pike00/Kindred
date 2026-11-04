import { useEffect, useState } from "react"

/** Delay rapid text changes while keeping empty values immediate. */
export function useDebouncedValue(value: string, delayMs = 200): string {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const delay = value ? delayMs : 0
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
