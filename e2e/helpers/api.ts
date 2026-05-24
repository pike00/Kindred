import type { APIRequestContext } from "@playwright/test"

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173"
export const API_URL = BASE_URL.replace(":5173", ":8001")

export async function getToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API_URL}/api/v1/login/access-token`, {
    form: {
      username: process.env.E2E_TEST_EMAIL ?? "admin@example.com",
      password: process.env.E2E_TEST_PASSWORD ?? "changethis",
    },
  })
  const { access_token } = await res.json()
  return access_token
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export async function createContact(
  request: APIRequestContext,
  token: string,
  data: { first_name: string; last_name?: string },
) {
  const res = await request.post(`${API_URL}/api/v1/contacts/`, {
    headers: authHeaders(token),
    data,
  })
  return res.json()
}

export async function deleteContact(
  request: APIRequestContext,
  token: string,
  contactId: string,
) {
  await request.delete(`${API_URL}/api/v1/contacts/${contactId}`, {
    headers: authHeaders(token),
  })
}

export async function listContacts(
  request: APIRequestContext,
  token: string,
) {
  const res = await request.get(`${API_URL}/api/v1/contacts/?limit=500`, {
    headers: authHeaders(token),
  })
  const body = await res.json()
  return body.data as Array<{ id: string; first_name: string; last_name?: string }>
}

export async function deleteAllContacts(
  request: APIRequestContext,
  token: string,
) {
  const contacts = await listContacts(request, token)
  await Promise.all(contacts.map((c) => deleteContact(request, token, c.id)))
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export async function createTag(
  request: APIRequestContext,
  token: string,
  data: { name: string; color?: string },
) {
  const res = await request.post(`${API_URL}/api/v1/tags/`, {
    headers: authHeaders(token),
    data: { color: "#3b82f6", ...data },
  })
  return res.json()
}

export async function deleteTag(
  request: APIRequestContext,
  token: string,
  tagId: string,
) {
  await request.delete(`${API_URL}/api/v1/tags/${tagId}`, {
    headers: authHeaders(token),
  })
}

export async function listTags(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_URL}/api/v1/tags/`, {
    headers: authHeaders(token),
  })
  const body = await res.json()
  return body.data as Array<{ id: string; name: string }>
}

export async function deleteAllTags(
  request: APIRequestContext,
  token: string,
) {
  const tags = await listTags(request, token)
  await Promise.all(tags.map((t) => deleteTag(request, token, t.id)))
}

// ─── Interactions ────────────────────────────────────────────────────────────

export async function createInteraction(
  request: APIRequestContext,
  token: string,
  data: { contact_id: string; summary: string; interaction_type?: string },
) {
  const res = await request.post(`${API_URL}/api/v1/interactions/`, {
    headers: authHeaders(token),
    data: { interaction_type: "call", ...data },
  })
  return res.json()
}

export async function deleteInteraction(
  request: APIRequestContext,
  token: string,
  interactionId: string,
) {
  await request.delete(`${API_URL}/api/v1/interactions/${interactionId}`, {
    headers: authHeaders(token),
  })
}

export async function listInteractions(
  request: APIRequestContext,
  token: string,
) {
  const res = await request.get(`${API_URL}/api/v1/interactions/?limit=500`, {
    headers: authHeaders(token),
  })
  const body = await res.json()
  return body.data as Array<{ id: string }>
}

export async function deleteAllInteractions(
  request: APIRequestContext,
  token: string,
) {
  const items = await listInteractions(request, token)
  await Promise.all(items.map((i) => deleteInteraction(request, token, i.id)))
}

// ─── Journal ─────────────────────────────────────────────────────────────────

export async function createJournalEntry(
  request: APIRequestContext,
  token: string,
  data: { title: string; content?: string },
) {
  const res = await request.post(`${API_URL}/api/v1/journal/`, {
    headers: authHeaders(token),
    data,
  })
  return res.json()
}

export async function deleteJournalEntry(
  request: APIRequestContext,
  token: string,
  entryId: string,
) {
  await request.delete(`${API_URL}/api/v1/journal/${entryId}`, {
    headers: authHeaders(token),
  })
}

export async function listJournalEntries(
  request: APIRequestContext,
  token: string,
) {
  const res = await request.get(`${API_URL}/api/v1/journal/?limit=500`, {
    headers: authHeaders(token),
  })
  const body = await res.json()
  return body.data as Array<{ id: string }>
}

export async function deleteAllJournalEntries(
  request: APIRequestContext,
  token: string,
) {
  const items = await listJournalEntries(request, token)
  await Promise.all(items.map((i) => deleteJournalEntry(request, token, i.id)))
}

// ─── Reminders ───────────────────────────────────────────────────────────────

export async function createReminder(
  request: APIRequestContext,
  token: string,
  data: { title: string; contact_id?: string; due_date?: string },
) {
  const res = await request.post(`${API_URL}/api/v1/reminders/`, {
    headers: authHeaders(token),
    data,
  })
  return res.json()
}

export async function deleteReminder(
  request: APIRequestContext,
  token: string,
  reminderId: string,
) {
  await request.delete(`${API_URL}/api/v1/reminders/${reminderId}`, {
    headers: authHeaders(token),
  })
}

export async function listReminders(
  request: APIRequestContext,
  token: string,
) {
  const res = await request.get(`${API_URL}/api/v1/reminders/?limit=500`, {
    headers: authHeaders(token),
  })
  const body = await res.json()
  return body.data as Array<{ id: string; is_done?: boolean }>
}

export async function deleteAllReminders(
  request: APIRequestContext,
  token: string,
) {
  const items = await listReminders(request, token)
  await Promise.all(items.map((i) => deleteReminder(request, token, i.id)))
}

// ─── Gifts ───────────────────────────────────────────────────────────────────

export async function createGift(
  request: APIRequestContext,
  token: string,
  data: { name: string; contact_id: string; status?: string },
) {
  const res = await request.post(`${API_URL}/api/v1/gifts/`, {
    headers: authHeaders(token),
    data: { status: "idea", ...data },
  })
  return res.json()
}

export async function deleteGift(
  request: APIRequestContext,
  token: string,
  giftId: string,
) {
  await request.delete(`${API_URL}/api/v1/gifts/${giftId}`, {
    headers: authHeaders(token),
  })
}
