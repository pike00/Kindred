import { describe, expect, it } from "vitest"
import {
  cn,
  describeContactSource,
  formatBirthday,
  formatDateISO,
  formatDateWithRelative,
  formatPhone,
} from "../../lib/utils"

describe("cn", () => {
  it("merges simple class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1")
  })

  it("merges conditional classes", () => {
    expect(cn("px-2", true && "py-1", false && "hidden")).toBe("px-2 py-1")
  })

  it("handles tailwind class conflicts with twMerge", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })

  it("handles nested arrays", () => {
    expect(cn(["px-2", "py-1"], "margin-auto")).toBe("px-2 py-1 margin-auto")
  })

  it("handles objects with conditional classes", () => {
    expect(
      cn({
        "px-2": true,
        "py-1": true,
        hidden: false,
      }),
    ).toBe("px-2 py-1")
  })

  it("handles empty inputs", () => {
    expect(cn()).toBe("")
  })

  it("handles undefined and null", () => {
    expect(cn("px-2", undefined, null, "py-1")).toBe("px-2 py-1")
  })

  it("handles complex tailwind color overrides", () => {
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500")
  })

  it("handles spacing conflicts", () => {
    expect(cn("mt-4", "mt-8")).toBe("mt-8")
  })

  it("preserves non-conflicting classes", () => {
    expect(cn("px-4 py-2", "text-lg")).toBe("px-4 py-2 text-lg")
  })

  it("handles multiple conflicting classes", () => {
    expect(cn("w-full", "w-1/2", "h-32", "h-64")).toBe("w-1/2 h-64")
  })

  it("handles mixed truthy falsy values", () => {
    const zero: number = 0
    const empty: string = ""
    expect(cn("px-2", zero && "py-1", empty && "hidden", "margin-auto")).toBe(
      "px-2 margin-auto",
    )
  })

  it("handles complex class combinations", () => {
    const result = cn(
      "inline-flex items-center justify-center",
      "px-3 py-2",
      "text-sm font-medium",
      false && "opacity-50",
      true && "text-white",
    )
    expect(result).toContain("inline-flex")
    expect(result).toContain("items-center")
    expect(result).toContain("px-3")
    expect(result).toContain("text-white")
  })
})

describe("formatBirthday", () => {
  const now = new Date(2026, 5, 6) // 2026-06-06

  it("formats the date and computes age before the birthday this year", () => {
    const info = formatBirthday("1959-06-12", now)
    expect(info).not.toBeNull()
    expect(info?.formatted).toBe("June 12, 1959")
    expect(info?.age).toBe(66)
    expect(info?.nextAge).toBe(67)
    expect(info?.daysUntil).toBe(6)
    expect(info?.upcoming).toBe("turning 67 in 6 days")
  })

  it("counts age as reached on the birthday itself", () => {
    const info = formatBirthday("1959-06-06", now)
    expect(info?.age).toBe(67)
    expect(info?.daysUntil).toBe(0)
    expect(info?.upcoming).toBe("turns 67 today")
  })

  it("says tomorrow the day before", () => {
    const info = formatBirthday("1990-06-07", now)
    expect(info?.upcoming).toBe("turns 36 tomorrow")
  })

  it("rolls to next year for a birthday already passed", () => {
    const info = formatBirthday("1980-01-15", now)
    expect(info?.age).toBe(46)
    expect(info?.upcoming).toBe("turning 47 in 7 months")
  })

  it("uses weeks for mid-range countdowns", () => {
    const info = formatBirthday("1980-06-27", now)
    expect(info?.upcoming).toBe("turning 46 in 3 weeks")
  })

  it("omits age and year when the year is a placeholder", () => {
    const info = formatBirthday("1604-03-02", now)
    expect(info?.formatted).toBe("March 2")
    expect(info?.age).toBeNull()
    expect(info?.nextAge).toBeNull()
    expect(info?.upcoming).toBe("next birthday in 9 months")
  })

  it("returns null for unparseable input", () => {
    expect(formatBirthday("not-a-date", now)).toBeNull()
  })
})

describe("formatDateISO", () => {
  it("preserves date-only API values across timezones", () => {
    expect(formatDateISO("2024-01-08")).toBe("2024-01-08")
    expect(
      formatDateWithRelative("2024-01-08", new Date(2024, 0, 8, 23, 59)),
    ).toBe("2024-01-08 (today)")
  })
})

describe("formatPhone", () => {
  it("formats a US E.164 number", () => {
    expect(formatPhone("+15055544644")).toBe("+1 (505) 554-4644")
  })

  it("leaves non-US / unparseable numbers untouched", () => {
    expect(formatPhone("+442071838750")).toBe("+442071838750")
    expect(formatPhone("not-a-number")).toBe("not-a-number")
  })
})

describe("describeContactSource", () => {
  it("surfaces the iMessage channel over the raw webhook source", () => {
    const src = describeContactSource("webhook", "imessage:+15055544644")
    expect(src.label).toBe("iMessage")
    expect(src.detail).toBe("+1 (505) 554-4644")
    expect(src.isMessagingChannel).toBe(true)
  })

  it("keeps an email handle as-is for email-based iMessage", () => {
    const src = describeContactSource("webhook", "imessage:josh@example.com")
    expect(src.label).toBe("iMessage")
    expect(src.detail).toBe("josh@example.com")
    expect(src.isMessagingChannel).toBe(true)
  })

  it("maps known plain sources to friendly labels", () => {
    expect(describeContactSource("carddav", "uid-123")).toEqual({
      label: "CardDAV",
      detail: "uid-123",
      isMessagingChannel: false,
    })
    expect(describeContactSource("manual").label).toBe("Manual")
  })

  it("does not treat an unknown channel prefix as messaging", () => {
    const src = describeContactSource("webhook", "ftp:somewhere")
    expect(src.label).toBe("Webhook")
    expect(src.detail).toBe("ftp:somewhere")
    expect(src.isMessagingChannel).toBe(false)
  })

  it("falls back to the raw source when unmapped", () => {
    expect(describeContactSource("mystery").label).toBe("mystery")
  })
})
