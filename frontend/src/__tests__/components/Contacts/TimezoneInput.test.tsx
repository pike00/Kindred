/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { TimezoneInput } from "@/components/Contacts/TimezoneInput"

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

    const input = screen.getByPlaceholderText("City, America/New_York, UTC-5…")
    await user.type(input, "paki")

    const option = await screen.findByText("Pakistan")
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

    const input = screen.getByPlaceholderText("City, America/New_York, UTC-5…")
    await user.type(input, "GMT+5")

    const option = await screen.findByText("Karachi")
    expect(option).toBeInTheDocument()
  })
})
