import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/client"
import { VoiceReviewModal } from "@/components/VoiceRecorder/VoiceReviewModal"

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  analyze: vi.fn(),
  update: vi.fn(),
  commit: vi.fn(),
  remove: vi.fn(),
  listContacts: vi.fn(),
  getContact: vi.fn(),
}))

vi.mock("@/client", async () => {
  const actual = await vi.importActual<typeof import("@/client")>("@/client")
  return {
    ...actual,
    VoiceCapturesService: {
      getVoiceCapture: mocks.get,
      analyzeVoiceCapture: mocks.analyze,
      updateVoiceCapture: mocks.update,
      commitVoiceCapture: mocks.commit,
      deleteVoiceCapture: mocks.remove,
    },
    ContactsService: {
      listContacts: mocks.listContacts,
      getContact: mocks.getContact,
    },
  }
})

const contactId = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
const note = (overrides: Record<string, unknown> = {}) => ({
  id: "note-action-id",
  kind: "note",
  enabled: true,
  evidence: "I told Nora she should save this story.",
  review_warning: "Confirm this is a new note.",
  contact_id: contactId,
  body: "Original note",
  ...overrides,
})
const capture = (overrides: Record<string, unknown> = {}) => ({
  id: "capture-1",
  raw_text: "Original immutable words",
  corrected_text: "Reviewed words",
  timezone: "America/Chicago",
  recorded_at: "2026-10-07T16:00:00-05:00",
  created_at: "2026-10-07T16:00:00-05:00",
  updated_at: "2026-10-07T16:00:00-05:00",
  status: "draft",
  revision: 3,
  actions: [note()],
  warnings: ["A name could refer to more than one person."],
  analysis_error: null,
  results: null,
  ...overrides,
})

function renderModal() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onComplete = vi.fn()
  const onClose = vi.fn()
  render(<QueryClientProvider client={client}><VoiceReviewModal captureId="capture-1" onComplete={onComplete} onClose={onClose} /></QueryClientProvider>)
  return { onComplete, onClose, client }
}

describe("VoiceReviewModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.get.mockResolvedValue(capture())
    mocks.listContacts.mockResolvedValue({ data: [], count: 0 })
    mocks.getContact.mockResolvedValue({ id: contactId, first_name: "Nora", last_name: "Taylor" })
  })

  it("keeps original words immutable and displays edited transcript, warning, evidence, and timezone", async () => {
    mocks.get.mockResolvedValue(capture({
      actions: [
        { ...note(), kind: "note" },
        { ...note(), id: "interaction", kind: "interaction", attendee_ids: [contactId], channel: "call", occurred_at: "2026-10-06T12:00:00-05:00", notes: "Talked" },
        { ...note(), id: "contact-update", kind: "contact_update", fields: [{ field: "company", value: "Acme" }] },
        { ...note(), id: "life-event", kind: "life_event", event_type: "move", title: "Moved", occurred_at: "2026-10-05" },
        { ...note(), id: "reminder", kind: "reminder", title: "Check in", remind_at: "2026-11-07T09:00:00-06:00" },
      ],
    }))
    renderModal()
    expect(await screen.findByText("Original immutable words")).toBeInTheDocument()
    expect(screen.getByLabelText("Reviewed transcript")).toHaveValue("Reviewed words")
    expect(screen.getByText(/more than one person/)).toBeInTheDocument()
    expect(screen.getAllByText(/I told Nora she should save this story/)).toHaveLength(5)
    expect(screen.getAllByText(/America\/Chicago/)).toHaveLength(2)
    expect(screen.getByText("Interaction 2")).toBeInTheDocument()
    expect(screen.getByText("Contact update 3")).toBeInTheDocument()
    expect(screen.getByText("Life event 4")).toBeInTheDocument()
    expect(screen.getByText("Reminder 5")).toBeInTheDocument()
  })

  it("analyzes edited text at the current revision when retry is requested", async () => {
    mocks.analyze.mockResolvedValue(capture({ revision: 4, corrected_text: "Fixed words", actions: [note()] }))
    renderModal()
    fireEvent.change(await screen.findByLabelText("Reviewed transcript"), { target: { value: "Fixed words" } })
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry analysis" }))
    await waitFor(() => expect(mocks.analyze).toHaveBeenCalledWith({
      captureId: "capture-1",
      requestBody: { revision: 3, text: "Fixed words" },
    }))
  })

  it("preserves edits and stable action IDs when draft saving fails", async () => {
    mocks.update.mockRejectedValue(new Error("offline"))
    renderModal()
    const text = await screen.findByLabelText("Note text")
    fireEvent.change(text, { target: { value: "Keep this edited note" } })
    await userEvent.setup().click(screen.getByRole("button", { name: "Save draft" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("offline")
    expect(screen.getByLabelText("Note text")).toHaveValue("Keep this edited note")
    expect(mocks.update).toHaveBeenCalledWith({
      captureId: "capture-1",
      requestBody: { revision: 3, corrected_text: "Reviewed words", actions: [expect.objectContaining({ id: "note-action-id", body: "Keep this edited note" })] },
    })
  })

  it("saves edited content before closing", async () => {
    mocks.update.mockImplementation(async ({ requestBody }) => capture({ revision: 4, ...requestBody }))
    const { onClose } = renderModal()
    fireEvent.change(await screen.findByLabelText("Reviewed transcript"), { target: { value: "New reviewed words" } })
    await userEvent.setup().click(screen.getByRole("button", { name: "Save draft and close" }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ requestBody: expect.objectContaining({ corrected_text: "New reviewed words", revision: 3 }) }))
  })

  it("retries a failed commit with the exact original body", async () => {
    mocks.commit.mockRejectedValueOnce(new Error("connection lost"))
      .mockResolvedValueOnce(capture({ status: "committed", results: { notes: ["saved-note"] } }))
    const { onComplete } = renderModal()
    await screen.findByLabelText("Note text")
    await userEvent.setup().click(screen.getByRole("button", { name: "Commit reviewed actions" }))
    await screen.findByText("connection lost")
    const firstBody = mocks.commit.mock.calls[0][0].requestBody
    expect(screen.getByLabelText("Note text")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Save draft and close" })).toBeDisabled()
    expect(await screen.findByText(/could not confirm whether this commit completed/i)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry exact commit" }))
    await waitFor(() => expect(onComplete).toHaveBeenCalled())
    expect(mocks.commit.mock.calls[1][0].requestBody).toBe(firstBody)
    expect(mocks.commit.mock.calls[1][0].requestBody.actions[0]).toMatchObject({ id: "note-action-id", body: "Original note" })
  })

  it("reconciles an ambiguous commit before submitting newer visible edits", async () => {
    mocks.commit.mockRejectedValueOnce(new Error("connection lost"))
      .mockResolvedValueOnce(capture({ status: "committed", results: { notes: ["saved-note"] } }))
    mocks.get.mockResolvedValueOnce(capture()).mockResolvedValueOnce(capture({ revision: 4 }))
    renderModal()
    await userEvent.setup().click(await screen.findByRole("button", { name: "Commit reviewed actions" }))
    await screen.findByRole("button", { name: "Refresh status before submitting edits" })
    expect(screen.getByLabelText("Note text")).toBeDisabled()
    await userEvent.setup().click(screen.getByRole("button", { name: "Refresh status before submitting edits" }))
    expect(await screen.findByText(/capture is still uncommitted/i)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Note text"), { target: { value: "Corrected note" } })
    expect(screen.getByLabelText("Note text")).toHaveValue("Corrected note")
    await userEvent.setup().click(screen.getByRole("button", { name: "Commit reviewed actions" }))
    await waitFor(() => expect(mocks.commit).toHaveBeenCalledTimes(2))
    expect(mocks.commit.mock.calls[1][0].requestBody).toMatchObject({
      revision: 4,
      actions: [expect.objectContaining({ id: "note-action-id", body: "Corrected note" })],
    })
  })

  it("treats a committed reconciliation as success without sending a duplicate", async () => {
    const completed = capture({ status: "committed", results: { notes: ["saved-note"] } })
    mocks.commit.mockRejectedValueOnce(new Error("connection lost"))
    mocks.get.mockResolvedValueOnce(capture()).mockResolvedValueOnce(completed)
    const { onComplete } = renderModal()
    await userEvent.setup().click(await screen.findByRole("button", { name: "Commit reviewed actions" }))
    await userEvent.setup().click(await screen.findByRole("button", { name: "Refresh status before submitting edits" }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(completed))
    expect(mocks.commit).toHaveBeenCalledOnce()
  })

  it("allows corrected values after a definite HTTP rejection", async () => {
    const request = { method: "POST", url: "", path: {} }
    const response = { url: "", ok: false, status: 422, statusText: "Unprocessable Entity", body: {} }
    mocks.commit.mockRejectedValueOnce(new ApiError(request as never, response as never, "Invalid field"))
      .mockResolvedValueOnce(capture({ status: "committed", results: { notes: ["saved-note"] } }))
    renderModal()
    await userEvent.setup().click(await screen.findByRole("button", { name: "Commit reviewed actions" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid field")
    fireEvent.change(screen.getByLabelText("Note text"), { target: { value: "Corrected after rejection" } })
    await userEvent.setup().click(screen.getByRole("button", { name: "Commit reviewed actions" }))
    await waitFor(() => expect(mocks.commit).toHaveBeenCalledTimes(2))
    expect(mocks.commit.mock.calls[1][0].requestBody.actions[0]).toMatchObject({ body: "Corrected after rejection" })
  })

  it("locks the editor during commit and restores edits after a definite rejection", async () => {
    const request = { method: "POST", url: "", path: {} }
    const response = { url: "", ok: false, status: 422, statusText: "Unprocessable Entity", body: {} }
    let rejectCommit!: (error: unknown) => void
    const pendingCommit = new Promise<never>((_resolve, reject) => { rejectCommit = reject })
    mocks.commit.mockImplementationOnce(() => pendingCommit)
      .mockResolvedValueOnce(capture({ status: "committed", results: { notes: ["saved-note"] } }))
    renderModal()
    await userEvent.setup().click(await screen.findByRole("button", { name: "Commit reviewed actions" }))
    await waitFor(() => expect(mocks.commit).toHaveBeenCalledOnce())
    expect(screen.getByLabelText("Reviewed transcript")).toBeDisabled()
    expect(screen.getByLabelText("Note text")).toBeDisabled()
    await act(async () => { rejectCommit(new ApiError(request as never, response as never, "Invalid field")) })
    expect(await screen.findByText("Invalid field")).toBeInTheDocument()
    expect(screen.getByLabelText("Reviewed transcript")).toBeEnabled()
    expect(screen.getByLabelText("Note text")).toBeEnabled()
    fireEvent.change(screen.getByLabelText("Note text"), { target: { value: "Corrected after rejection" } })
    await userEvent.setup().click(screen.getByRole("button", { name: "Commit reviewed actions" }))
    await waitFor(() => expect(mocks.commit).toHaveBeenCalledTimes(2))
    expect(mocks.commit.mock.calls[1][0].requestBody.actions[0]).toMatchObject({ body: "Corrected after rejection" })
  })

  it("locks the editor while saving and unlocks it after the saved state replaces it", async () => {
    let resolveSave!: (value: ReturnType<typeof capture>) => void
    const pendingSave = new Promise<ReturnType<typeof capture>>((resolve) => { resolveSave = resolve })
    mocks.update.mockImplementationOnce(() => pendingSave)
    renderModal()
    fireEvent.change(await screen.findByLabelText("Note text"), { target: { value: "Draft being saved" } })
    await userEvent.setup().click(screen.getByRole("button", { name: "Save draft" }))
    expect(screen.getByLabelText("Reviewed transcript")).toBeDisabled()
    expect(screen.getByLabelText("Note text")).toBeDisabled()
    await act(async () => { resolveSave(capture({ revision: 4, actions: [note({ body: "Draft being saved" })] })) })
    expect(await screen.findByText("Draft saved.")).toBeInTheDocument()
    expect(screen.getByLabelText("Note text")).toBeEnabled()
    expect(screen.getByLabelText("Note text")).toHaveValue("Draft being saved")
  })

  it("locks the editor while analysis replaces the action list", async () => {
    let resolveAnalysis!: (value: ReturnType<typeof capture>) => void
    const pendingAnalysis = new Promise<ReturnType<typeof capture>>((resolve) => { resolveAnalysis = resolve })
    mocks.analyze.mockImplementationOnce(() => pendingAnalysis)
    renderModal()
    await userEvent.setup().click(await screen.findByRole("button", { name: "Retry analysis" }))
    expect(screen.getByLabelText("Reviewed transcript")).toBeDisabled()
    expect(screen.getByLabelText("Note text")).toBeDisabled()
    await act(async () => { resolveAnalysis(capture({ revision: 4, actions: [note({ body: "Analyzed note" })] })) })
    await waitFor(() => expect(screen.getByLabelText("Note text")).toHaveValue("Analyzed note"))
    expect(screen.getByLabelText("Reviewed transcript")).toBeEnabled()
    expect(screen.getByLabelText("Note text")).toBeEnabled()
  })

  it("rejects unset contact values and requires an explicit clear action", async () => {
    mocks.get.mockResolvedValue(capture({ actions: [
      { id: "u", kind: "contact_update", enabled: true, evidence: "works at a company", contact_id: contactId, fields: [{ field: "company", value: "" }] },
    ] }))
    mocks.commit.mockResolvedValue(capture({ status: "committed", results: { contacts: [contactId] } }))
    renderModal()
    await screen.findByLabelText("company value")
    await userEvent.setup().click(screen.getByRole("button", { name: "Commit reviewed actions" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Contact update field company needs a value or an explicit clear.")
    expect(mocks.commit).not.toHaveBeenCalled()
    await userEvent.setup().click(screen.getByRole("button", { name: "Clear company" }))
    expect(screen.getByText("This will clear company.")).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole("button", { name: "Commit reviewed actions" }))
    await waitFor(() => expect(mocks.commit).toHaveBeenCalledOnce())
    expect(mocks.commit.mock.calls[0][0].requestBody.actions[0].fields).toEqual([{ field: "company", value: null }])
  })

  it("offers all five manual card types after analysis failure", async () => {
    mocks.get.mockResolvedValue(capture({ actions: [], analysis_error: "Provider unavailable" }))
    renderModal()
    await screen.findByText(/No actions found\./)
    for (const kind of ["interaction", "note", "contact update", "life event", "reminder"]) {
      await userEvent.setup().click(screen.getByRole("button", { name: `Add ${kind}` }))
    }
    expect(screen.getByText("Interaction 1")).toBeInTheDocument()
    expect(screen.getByText("Note 2")).toBeInTheDocument()
    expect(screen.getByText("Contact update 3")).toBeInTheDocument()
    expect(screen.getByText("Life event 4")).toBeInTheDocument()
    expect(screen.getByText("Reminder 5")).toBeInTheDocument()
  })

  it("searches contacts on the backend and advances through result pages", async () => {
    mocks.listContacts.mockResolvedValue({ data: [{ id: contactId, first_name: "Nora", last_name: "Taylor" }], count: 41 })
    renderModal()
    await screen.findByLabelText("Search contacts")
    await userEvent.setup().click(screen.getByRole("button", { name: "Remove contact" }))
    await userEvent.setup().click(screen.getByRole("button", { name: "Next" }))
    await waitFor(() => expect(mocks.listContacts).toHaveBeenCalledWith({ search: null, skip: 20, limit: 20 }))
  })

  it("edits the fields for all action types and keeps date-only contact and event values", async () => {
    mocks.getContact.mockResolvedValue({ id: contactId, first_name: "Nora", last_name: "Taylor", company: "Old Co", birthday: "1985-02-03" })
    mocks.update.mockImplementation(async ({ requestBody }) => capture({ revision: 4, ...requestBody }))
    mocks.get.mockResolvedValue(capture({ actions: [
      { id: "i", kind: "interaction", enabled: true, evidence: "met", attendee_ids: [contactId], channel: "call", occurred_at: "2026-10-06T12:00:00-05:00", notes: "Talked", duration_minutes: 10, location_label: "Cafe" },
      { id: "n", kind: "note", enabled: true, evidence: "save", contact_id: contactId, body: "Note" },
      { id: "u", kind: "contact_update", enabled: true, evidence: "works", contact_id: contactId, fields: [{ field: "company", value: "New Co" }] },
      { id: "e", kind: "life_event", enabled: true, evidence: "moved", contact_id: contactId, event_type: "move", title: "New home", occurred_at: "2026-10-05", description: "Details" },
      { id: "r", kind: "reminder", enabled: true, evidence: "call", contact_id: null, title: "Call back", remind_at: "2026-11-07T09:00:00-06:00", description: "Details", frequency: "once" },
    ] }))
    renderModal()
    await screen.findByLabelText("Reminder title")
    fireEvent.change(screen.getByLabelText("Interaction notes"), { target: { value: "Edited interaction" } })
    fireEvent.change(screen.getByLabelText("Duration in minutes"), { target: { value: "25" } })
    fireEvent.change(screen.getByLabelText("Location"), { target: { value: "Library" } })
    fireEvent.change(screen.getByLabelText("Occurred at"), { target: { value: "2026-10-06T13:45" } })
    fireEvent.change(screen.getByLabelText("Note text"), { target: { value: "Edited note" } })
    fireEvent.change(screen.getByLabelText("company value"), { target: { value: "Newer Co" } })
    fireEvent.change(screen.getByLabelText("Add field"), { target: { value: "birthday" } })
    fireEvent.change(screen.getByLabelText("Event date"), { target: { value: "2026-10-04" } })
    fireEvent.change(screen.getByLabelText("Event type"), { target: { value: "graduation" } })
    fireEvent.change(screen.getByLabelText("Event title"), { target: { value: "Graduated" } })
    fireEvent.change(screen.getByLabelText("Event description"), { target: { value: "Updated event" } })
    fireEvent.change(screen.getByLabelText("Reminder title"), { target: { value: "Edited reminder" } })
    fireEvent.change(screen.getByLabelText("Remind at"), { target: { value: "2026-11-07T10:30" } })
    fireEvent.change(screen.getByLabelText("Reminder description"), { target: { value: "Updated reminder details" } })
    fireEvent.change(screen.getByLabelText("Frequency"), { target: { value: "weekly" } })
    expect(await screen.findByText("Current company: Old Co")).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole("button", { name: "Save draft" }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalled())
    const saved = mocks.update.mock.calls[0][0].requestBody
    expect(saved.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "i", notes: "Edited interaction", duration_minutes: 25, location_label: "Library" }),
      expect.objectContaining({ id: "n", body: "Edited note" }),
      expect.objectContaining({ id: "u", fields: expect.arrayContaining([{ field: "company", value: "Newer Co" }, { field: "birthday", value: "" }]) }),
      expect.objectContaining({ id: "e", event_type: "graduation", title: "Graduated", occurred_at: "2026-10-04", description: "Updated event" }),
      expect.objectContaining({ id: "r", title: "Edited reminder", frequency: "weekly", description: "Updated reminder details", remind_at: expect.stringMatching(/^2026-11-07T10:30:00[+-]\d\d:\d\d$/) }),
    ]))
  })

  it("supports unresolved multi-contact attendees and nullable action fields", async () => {
    mocks.listContacts.mockResolvedValue({ data: [{ id: contactId, first_name: "Nora", last_name: "Taylor" }], count: 1 })
    mocks.update.mockImplementation(async ({ requestBody }) => capture({ revision: 4, ...requestBody }))
    mocks.get.mockResolvedValue(capture({ actions: [
      { id: "i", kind: "interaction", enabled: true, evidence: "", attendee_ids: [], channel: null, occurred_at: null, notes: "Initial", duration_minutes: 5, location_label: "Somewhere" },
      { id: "u", kind: "contact_update", enabled: true, evidence: "", contact_id: null, fields: [{ field: "birthday", value: null }] },
      { id: "e", kind: "life_event", enabled: true, evidence: "", contact_id: null, event_type: "move", title: "Move", occurred_at: "2026-10-01", description: "Details" },
    ] }))
    renderModal()
    await screen.findByLabelText("Occurred at")
    fireEvent.change(screen.getByLabelText("Channel"), { target: { value: "email" } })
    fireEvent.change(screen.getByLabelText("Interaction notes"), { target: { value: "" } })
    fireEvent.change(screen.getByLabelText("Duration in minutes"), { target: { value: "" } })
    fireEvent.change(screen.getByLabelText("Location"), { target: { value: "" } })
    fireEvent.change(screen.getByLabelText("Event date"), { target: { value: "" } })
    fireEvent.change(screen.getByLabelText("Event description"), { target: { value: "" } })
    expect(screen.getByText("This will clear birthday.")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Search contacts to add"), { target: { value: "Nora" } })
    await waitFor(() => expect(mocks.listContacts).toHaveBeenCalledWith({ search: "Nora", skip: 0, limit: 20 }))
    const contactRows = await screen.findAllByRole("button", { name: /Nora Taylor/ })
    await userEvent.setup().click(contactRows[0])
    expect(screen.getAllByRole("button", { name: /Nora Taylor \(selected\)/ }).length).toBeGreaterThan(0)
    await userEvent.setup().click(screen.getByRole("button", { name: "Remove contact" }))
    await userEvent.setup().click((await screen.findAllByRole("button", { name: /Nora Taylor/ }))[0])
    await userEvent.setup().click(screen.getByRole("button", { name: "Save draft" }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalled())
    expect(mocks.update.mock.calls[0][0].requestBody.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "i", attendee_ids: [contactId], channel: "email", occurred_at: null, notes: "", duration_minutes: null, location_label: null }),
      expect.objectContaining({ id: "u", fields: [{ field: "birthday", value: null }] }),
      expect.objectContaining({ id: "e", occurred_at: null, description: null }),
    ]))
  })

  it("automatically analyzes a new capture once and reports missing targets before commit", async () => {
    mocks.get.mockResolvedValue(capture({ actions: [], analysis_error: null }))
    mocks.analyze.mockResolvedValue(capture({ revision: 4, actions: [note({ contact_id: null })] }))
    renderModal()
    await waitFor(() => expect(mocks.analyze).toHaveBeenCalledWith({ captureId: "capture-1", requestBody: { revision: 3, text: "Reviewed words" } }))
    await userEvent.setup().click(await screen.findByRole("button", { name: "Commit reviewed actions" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Note needs a contact.")
    expect(mocks.commit).not.toHaveBeenCalled()
  })

  it("shows current revision conflict while retaining local transcript and card edits", async () => {
    const request = { method: "PUT", url: "", path: {} }
    const response = { url: "", ok: false, status: 409, statusText: "Conflict", body: {} }
    mocks.update.mockRejectedValue(new ApiError(request as never, response as never, "Revision conflict"))
    mocks.get.mockResolvedValueOnce(capture()).mockResolvedValueOnce(capture({ revision: 4, corrected_text: "Other edit" }))
    renderModal()
    fireEvent.change(await screen.findByLabelText("Reviewed transcript"), { target: { value: "Keep my edit" } })
    await userEvent.setup().click(screen.getByRole("button", { name: "Save draft" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("This capture changed elsewhere")
    expect(screen.getByLabelText("Reviewed transcript")).toHaveValue("Keep my edit")
    expect(screen.getByLabelText("Note text")).toHaveValue("Original note")
  })

  it("deletes only after explicit confirmation and reports deletion errors", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true)
    mocks.remove.mockRejectedValue(new Error("Delete failed"))
    renderModal()
    await userEvent.setup().click(await screen.findByRole("button", { name: "Delete draft" }))
    expect(confirm).toHaveBeenCalledWith("Delete this uncommitted voice draft?")
    expect(mocks.remove).toHaveBeenCalledWith({ captureId: "capture-1" })
    expect(await screen.findByRole("alert")).toHaveTextContent("Delete failed")
  })

  it("shows saved result counts for an already-committed capture", async () => {
    mocks.get.mockResolvedValue(capture({ status: "committed", results: { notes: ["n1", "n2"], reminders: [], interactions: ["i1"] } }))
    renderModal()
    expect(await screen.findByText("This capture is already committed.")).toBeInTheDocument()
    expect(screen.getByText("Created 2 notes, 1 interaction.")).toBeInTheDocument()
  })

  it("searches for a contact on the server and stores the chosen target", async () => {
    mocks.listContacts.mockResolvedValue({ data: [{ id: contactId, first_name: "Nora", last_name: "Taylor" }], count: 1 })
    mocks.update.mockImplementation(async ({ requestBody }) => capture({ revision: 4, ...requestBody }))
    renderModal()
    await screen.findByLabelText("Search contacts")
    await userEvent.setup().clear(screen.getByLabelText("Search contacts"))
    fireEvent.change(screen.getByLabelText("Search contacts"), { target: { value: "Nora" } })
    await waitFor(() => expect(mocks.listContacts).toHaveBeenCalledWith({ search: "Nora", skip: 0, limit: 20 }))
    await userEvent.setup().click(await screen.findByRole("button", { name: /Nora Taylor/ }))
    expect(screen.getByText("Nora Taylor")).toBeInTheDocument()
  })

  it("allows skipping and keeping a card, and removing an action", async () => {
    renderModal()
    await screen.findByLabelText("Note text")
    await userEvent.setup().click(screen.getByRole("button", { name: "Skip" }))
    expect(screen.getByText("Skipped")).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole("button", { name: "Keep" }))
    expect(screen.getByText("Included")).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole("button", { name: "Remove note" }))
    expect(screen.queryByText("Note 1")).not.toBeInTheDocument()
  })

  it("does not overlap analysis requests while the current analysis is pending", async () => {
    let resolveAnalysis!: (value: ReturnType<typeof capture>) => void
    mocks.analyze.mockImplementation(() => new Promise((resolve) => { resolveAnalysis = resolve }))
    mocks.get.mockResolvedValue(capture({ actions: [], analysis_error: "Provider unavailable" }))
    renderModal()
    const retry = await screen.findByRole("button", { name: "Retry analysis" })
    act(() => {
      fireEvent.click(retry)
      fireEvent.click(retry)
    })
    expect(mocks.analyze).toHaveBeenCalledTimes(1)
    resolveAnalysis(capture({ actions: [note()], corrected_text: "", revision: 4 }))
    await waitFor(() => expect(screen.getByLabelText("Reviewed transcript")).toHaveValue("Reviewed words"))
  })

  it("saves an unchanged draft and displays the saved status", async () => {
    renderModal()
    await screen.findByLabelText("Note text")
    await userEvent.setup().click(await screen.findByRole("button", { name: "Save draft" }))
    expect(await screen.findByText("Draft saved.")).toBeInTheDocument()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("keeps the modal open when saving before close fails", async () => {
    mocks.update.mockRejectedValue(new Error("Still offline"))
    const { onClose } = renderModal()
    fireEvent.change(await screen.findByLabelText("Reviewed transcript"), { target: { value: "Edited before close" } })
    await userEvent.setup().click(screen.getByRole("button", { name: "Save draft and close" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Still offline")
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Reviewed transcript")).toHaveValue("Edited before close")
  })

  it("refreshes the latest capture on a commit conflict and keeps local edits", async () => {
    const request = { method: "POST", url: "", path: {} }
    const response = { url: "", ok: false, status: 409, statusText: "Conflict", body: {} }
    mocks.commit.mockRejectedValue(new ApiError(request as never, response as never, "Revision conflict"))
    mocks.get.mockResolvedValueOnce(capture()).mockResolvedValueOnce(capture({ revision: 4, corrected_text: "Server edit" }))
    renderModal()
    fireEvent.change(await screen.findByLabelText("Reviewed transcript"), { target: { value: "Local edit" } })
    await userEvent.setup().click(screen.getByRole("button", { name: "Commit reviewed actions" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("This capture changed elsewhere")
    expect(screen.getByLabelText("Reviewed transcript")).toHaveValue("Local edit")
    expect(mocks.get).toHaveBeenCalledTimes(2)
  })

  it("closes a draft after confirmed deletion", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true)
    mocks.remove.mockResolvedValue(undefined)
    const { onClose } = renderModal()
    await userEvent.setup().click(await screen.findByRole("button", { name: "Delete draft" }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it("keeps the draft when deletion is declined", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    renderModal()
    await userEvent.setup().click(await screen.findByRole("button", { name: "Delete draft" }))
    expect(confirm).toHaveBeenCalledOnce()
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it("shows a recoverable load error when the capture cannot be fetched", async () => {
    mocks.get.mockRejectedValue(new Error("Server unavailable"))
    renderModal()
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load this voice capture. Server unavailable")
  })

  it("displays a readable empty result receipt", async () => {
    mocks.get.mockResolvedValue(capture({ status: "committed", results: { notes: [] } }))
    renderModal()
    expect(await screen.findByText("No records were created.")).toBeInTheDocument()
  })

  it("handles receipts without result details", async () => {
    mocks.get.mockResolvedValue(capture({ status: "committed", results: null }))
    renderModal()
    expect(await screen.findByText("Saved results are available on this capture.")).toBeInTheDocument()
  })

  it("shows a useful name for nameless search matches", async () => {
    mocks.listContacts.mockResolvedValue({ data: [{ id: "unnamed", first_name: "", last_name: null }], count: 1 })
    mocks.get.mockResolvedValue(capture({ actions: [] , analysis_error: "No provider" }))
    renderModal()
    await userEvent.setup().click(await screen.findByRole("button", { name: "Add note" }))
    await screen.findByLabelText("Search contacts")
    fireEvent.change(screen.getByLabelText("Search contacts"), { target: { value: "mystery" } })
    expect(await screen.findByRole("button", { name: "Unnamed contact" })).toBeInTheDocument()
  })

  it("uses the draft save fallback for a non-Error rejection", async () => {
    mocks.update.mockRejectedValue("offline")
    renderModal()
    fireEvent.change(await screen.findByLabelText("Reviewed transcript"), { target: { value: "Edited words" } })
    await userEvent.setup().click(screen.getByRole("button", { name: "Save draft" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save this draft.")
  })

  it("uses the commit fallback for a non-Error rejection", async () => {
    mocks.commit.mockRejectedValue("offline")
    renderModal()
    await userEvent.setup().click(await screen.findByRole("button", { name: "Commit reviewed actions" }))
    expect(await screen.findByText("Could not commit the reviewed actions.")).toBeInTheDocument()
  })

  it("uses the delete fallback for a non-Error rejection", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true)
    mocks.remove.mockRejectedValue("offline")
    renderModal()
    await userEvent.setup().click(await screen.findByRole("button", { name: "Delete draft" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not delete this draft.")
  })
})
