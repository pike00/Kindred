/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { formatLocalTime, TimezoneInput } from "@/components/Contacts/TimezoneInput"

describe("TimezoneInput", () => {
  it("renders with placeholder and opens combobox", async () => {
    const handleChange = vi.fn()
    render(<TimezoneInput value="" onChange={handleChange} />)

    const button = screen.getByRole("combobox")
    expect(button).toBeInTheDocument()
    expect(button.textContent).toContain("Search city or timezone")
  })

  it("filters options when searching for country alias like paki", async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<TimezoneInput value="" onChange={handleChange} />)

    const button = screen.getByRole("combobox")
    await user.click(button)

    const input = screen.getByPlaceholderText(/Search city/i)
    await user.type(input, "paki")

    const option = await screen.findByText("Karachi, Pakistan")
    expect(option).toBeInTheDocument()

    await user.click(option)
    expect(handleChange).toHaveBeenCalledWith("Asia/Karachi")
  })

  it("filters options when searching by offset like GMT+5", async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<TimezoneInput value="" onChange={handleChange} />)

    const button = screen.getByRole("combobox")
    await user.click(button)

    const input = screen.getByPlaceholderText(/Search city/i)
    await user.type(input, "GMT+5")

    const option = await screen.findByText("Karachi, Pakistan")
    expect(option).toBeInTheDocument()
  })
})

describe("formatLocalTime", () => {
  it("formats time without day tag when target date matches local date", () => {
    // Current timezone local time should not append +1d/-1d
    const result = formatLocalTime(Intl.DateTimeFormat().resolvedOptions().timeZone)
    expect(result).not.toBeNull()
    expect(result).not.toContain("+1d")
    expect(result).not.toContain("-1d")
  })

  it("supports day name option for contact detail context", () => {
    const result = formatLocalTime(Intl.DateTimeFormat().resolvedOptions().timeZone, {
      includeDayName: true,
    })
    expect(result).not.toBeNull()
  })
})
