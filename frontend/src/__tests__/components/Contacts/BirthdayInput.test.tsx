import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  BirthdayInput,
  InlineBirthday,
  formatBirthdayValue,
  getDaysInMonth,
  parseBirthdayValue,
} from "@/components/Contacts/BirthdayInput"

describe("parseBirthdayValue", () => {
  it("parses full ISO date", () => {
    expect(parseBirthdayValue("1990-05-14")).toEqual({
      month: "5",
      day: "14",
      year: "1990",
    })
  })

  it("parses sentinel year 0001 as empty year", () => {
    expect(parseBirthdayValue("0001-05-14")).toEqual({
      month: "5",
      day: "14",
      year: "",
    })
  })

  it("parses leap year sentinel 0004 as empty year", () => {
    expect(parseBirthdayValue("0004-02-29")).toEqual({
      month: "2",
      day: "29",
      year: "",
    })
  })

  it("parses partial ISO date with leading dashes", () => {
    expect(parseBirthdayValue("--08-20")).toEqual({
      month: "8",
      day: "20",
      year: "",
    })
    expect(parseBirthdayValue("-08-20")).toEqual({
      month: "8",
      day: "20",
      year: "",
    })
    expect(parseBirthdayValue("08-20")).toEqual({
      month: "8",
      day: "20",
      year: "",
    })
  })

  it("handles null, empty, or invalid input", () => {
    expect(parseBirthdayValue(null)).toEqual({ month: "", day: "", year: "" })
    expect(parseBirthdayValue("")).toEqual({ month: "", day: "", year: "" })
    expect(parseBirthdayValue("invalid")).toEqual({
      month: "",
      day: "",
      year: "",
    })
  })
})

describe("formatBirthdayValue", () => {
  it("formats date with year", () => {
    expect(formatBirthdayValue("5", "14", "1990")).toBe("1990-05-14")
  })

  it("formats date without year as sentinel 0001", () => {
    expect(formatBirthdayValue("5", "14", "")).toBe("0001-05-14")
  })

  it("formats Feb 29 without year as sentinel 0004", () => {
    expect(formatBirthdayValue("2", "29", "")).toBe("0004-02-29")
  })

  it("returns null if month or day is missing", () => {
    expect(formatBirthdayValue("", "14", "1990")).toBeNull()
    expect(formatBirthdayValue("5", "", "1990")).toBeNull()
  })
})

describe("getDaysInMonth", () => {
  it("returns 31 for January", () => {
    expect(getDaysInMonth("1")).toBe(31)
  })

  it("returns 29 for February", () => {
    expect(getDaysInMonth("2")).toBe(29)
  })

  it("returns 30 for April, June, September, November", () => {
    expect(getDaysInMonth("4")).toBe(30)
    expect(getDaysInMonth("6")).toBe(30)
    expect(getDaysInMonth("9")).toBe(30)
    expect(getDaysInMonth("11")).toBe(30)
  })
})

describe("BirthdayInput Component", () => {
  it("renders month, day, and year inputs", () => {
    const handleChange = vi.fn()
    render(<BirthdayInput value={null} onChange={handleChange} />)

    expect(screen.getByLabelText("Birthday month")).toBeInTheDocument()
    expect(screen.getByLabelText("Birthday day")).toBeInTheDocument()
    expect(screen.getByLabelText("Birthday year")).toBeInTheDocument()
  })

  it("renders with existing full date", () => {
    const handleChange = vi.fn()
    render(<BirthdayInput value="1990-05-14" onChange={handleChange} />)

    expect(screen.getByText("May")).toBeInTheDocument()
    expect(screen.getByText("14")).toBeInTheDocument()
    expect(screen.getByLabelText("Birthday year")).toHaveValue(1990)
  })

  it("renders with date without year", () => {
    const handleChange = vi.fn()
    render(<BirthdayInput value="0001-08-20" onChange={handleChange} />)

    expect(screen.getByText("August")).toBeInTheDocument()
    expect(screen.getByText("20")).toBeInTheDocument()
    expect(screen.getByLabelText("Birthday year")).toHaveValue(null)
  })

  it("emits updated birthday when year input changes", async () => {
    const handleChange = vi.fn()
    render(<BirthdayInput value="0001-05-14" onChange={handleChange} />)

    const yearInput = screen.getByLabelText("Birthday year")
    fireEvent.change(yearInput, { target: { value: "1985" } })

    expect(handleChange).toHaveBeenCalledWith("1985-05-14")
  })

  it("clears birthday when clear button is clicked", async () => {
    const handleChange = vi.fn()
    render(<BirthdayInput value="1990-05-14" onChange={handleChange} />)

    const clearButton = screen.getByLabelText("Clear birthday")
    fireEvent.click(clearButton)

    expect(handleChange).toHaveBeenCalledWith(null)
  })
})

describe("InlineBirthday Component", () => {
  it("renders formatted birthday with age when full date is provided", () => {
    const handleSave = vi.fn()
    render(<InlineBirthday value="1990-05-14" onSave={handleSave} />)

    expect(screen.getByText(/May 14, 1990/i)).toBeInTheDocument()
  })

  it("renders formatted birthday without age when yearless date is provided", () => {
    const handleSave = vi.fn()
    render(<InlineBirthday value="0001-08-20" onSave={handleSave} />)

    expect(screen.getByText("August 20")).toBeInTheDocument()
  })

  it("renders placeholder when value is null", () => {
    const handleSave = vi.fn()
    render(<InlineBirthday value={null} onSave={handleSave} />)

    expect(screen.getByText("+ Add birthday")).toBeInTheDocument()
  })

  it("opens edit mode on click and saves changes", async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<InlineBirthday value="0001-05-14" onSave={handleSave} />)

    const button = screen.getByRole("button", { name: /May 14/i })
    await user.click(button)

    expect(screen.getByLabelText("Birthday year")).toBeInTheDocument()
    const yearInput = screen.getByLabelText("Birthday year")
    await user.type(yearInput, "1995")

    const saveButton = screen.getByLabelText("Save birthday")
    await user.click(saveButton)

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith("1995-05-14")
    })
  })

  it("cancels edit mode on cancel click", async () => {
    const handleSave = vi.fn()
    const user = userEvent.setup()
    render(<InlineBirthday value="0001-05-14" onSave={handleSave} />)

    const button = screen.getByRole("button", { name: /May 14/i })
    await user.click(button)

    const cancelButton = screen.getByLabelText("Cancel editing birthday")
    await user.click(cancelButton)

    expect(handleSave).not.toHaveBeenCalled()
    expect(screen.getByText("May 14")).toBeInTheDocument()
  })
})
