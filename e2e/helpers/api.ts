import type { APIRequestContext } from "@playwright/test"
export { API_URL } from "./urls.js"
import { API_URL } from "./urls.js"

export async function getToken(request: APIRequestContext): Promise<string> {
  let lastErr: unknown = null
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await request.post(`${API_URL}/api/v1/login/access-token`, {
        form: {
          username: process.env.E2E_TEST_EMAIL ?? "admin@example.com",
          password: process.env.E2E_TEST_PASSWORD ?? "changethis",
        },
        timeout: 15_000,
      })
      const text = await res.text()
      if (!text) {
        throw new Error(`empty body, status=${res.status()}`)
      }
      const parsed = JSON.parse(text) as { access_token?: string }
      if (!parsed.access_token) {
        throw new Error(
          `missing access_token, status=${res.status()}: ${text.slice(0, 120)}`,
        )
      }
      return parsed.access_token
    } catch (e) {
      lastErr = e
      // brief backoff
      await new Promise((r) => setTimeout(r, 400 * attempt))
    }
  }
  throw new Error(
    `getToken failed after retries: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`,
  )
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

export async function updateTag(
  request: APIRequestContext,
  token: string,
  tagId: string,
  data: Record<string, unknown>,
) {
  const res = await request.patch(`${API_URL}/api/v1/tags/${tagId}`, {
    headers: authHeaders(token),
    data,
  })
  if (!res.ok()) {
    throw new Error(`updateTag failed ${res.status()}: ${await res.text()}`)
  }
  return res.json()
}

// ─── Interactions ────────────────────────────────────────────────────────────

export async function createInteraction(
  request: APIRequestContext,
  token: string,
  data: {
    contact_id?: string
    attendee_ids?: string[]
    channel?: string
    notes?: string
    occurred_at?: string
    duration_minutes?: number | null
    location_label?: string | null
    is_draft?: boolean
  },
) {
  const attendeeIds = data.attendee_ids ?? (data.contact_id ? [data.contact_id] : [])
  const payload: Record<string, unknown> = {
    attendee_ids: attendeeIds,
    channel: data.channel ?? "call",
    occurred_at: data.occurred_at ?? new Date().toISOString(),
    notes: data.notes ?? null,
  }
  if (data.duration_minutes !== undefined) payload.duration_minutes = data.duration_minutes
  if (data.location_label !== undefined) payload.location_label = data.location_label
  if (data.is_draft !== undefined) payload.is_draft = data.is_draft

  const res = await request.post(`${API_URL}/api/v1/interactions/`, {
    headers: authHeaders(token),
    data: payload,
  })
  if (!res.ok()) {
    throw new Error(
      `createInteraction failed ${res.status()}: ${await res.text()}`,
    )
  }
  return res.json()
}

export async function updateInteraction(
  request: APIRequestContext,
  token: string,
  interactionId: string,
  data: Record<string, unknown>,
) {
  const res = await request.patch(
    `${API_URL}/api/v1/interactions/${interactionId}`,
    {
      headers: authHeaders(token),
      data,
    },
  )
  if (!res.ok()) {
    throw new Error(
      `updateInteraction failed ${res.status()}: ${await res.text()}`,
    )
  }
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

// ─── Reminders ───────────────────────────────────────────────────────────────

export async function createReminder(
  request: APIRequestContext,
  token: string,
  data: {
    title: string
    contact_id?: string | null
    remind_at?: string
    due_date?: string
    description?: string | null
    is_active?: boolean
    frequency?: string
  },
) {
  const payload: Record<string, unknown> = {
    title: data.title,
    remind_at:
      data.remind_at ??
      data.due_date ??
      // default: 1 hour from now
      new Date(Date.now() + 3600_000).toISOString(),
  }
  if (data.contact_id !== undefined) payload.contact_id = data.contact_id
  if (data.description !== undefined) payload.description = data.description
  if (data.is_active !== undefined) payload.is_active = data.is_active
  if (data.frequency !== undefined) payload.frequency = data.frequency

  const res = await request.post(`${API_URL}/api/v1/reminders/`, {
    headers: authHeaders(token),
    data: payload,
  })
  if (!res.ok()) {
    throw new Error(
      `createReminder failed ${res.status()}: ${await res.text()}`,
    )
  }
  return res.json()
}

export async function updateReminder(
  request: APIRequestContext,
  token: string,
  reminderId: string,
  data: Record<string, unknown>,
) {
  const res = await request.patch(
    `${API_URL}/api/v1/reminders/${reminderId}`,
    {
      headers: authHeaders(token),
      data,
    },
  )
  if (!res.ok()) {
    throw new Error(
      `updateReminder failed ${res.status()}: ${await res.text()}`,
    )
  }
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
