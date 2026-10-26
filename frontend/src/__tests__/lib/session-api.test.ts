import axios from "axios"
import { beforeEach, expect, it, vi } from "vitest"

beforeEach(() => {
  vi.resetModules()
  vi.spyOn(window, "location", "get").mockReturnValue({
    ...window.location, assign: vi.fn(), reload: vi.fn(),
  })
})

async function setup() {
  const session = await import("@/lib/session")
  const api = await import("@/lib/session-api")
  const { OpenAPI } = await import("@/client/core/OpenAPI")
  const { request } = await import("@/client/core/request")
  const { queryClient } = await import("@/lib/queryClient")
  api.installSessionApi()
  OpenAPI.TOKEN = async () => localStorage.getItem("access_token") || ""
  return { session, api, OpenAPI, request, queryClient }
}

it("cannot repopulate queries or satisfy B's loader with A's late response", async () => {
  const { session, OpenAPI, request, queryClient } = await setup()
  localStorage.setItem("access_token", "token-a")
  queryClient.setQueryData(["contacts"], { secret: "A" })
  let respond!: () => void
  const transport = axios.create({ adapter: (config) => new Promise((resolve) => {
    // Deliberately ignore cancellation in the transport.
    respond = () => resolve({ data: { secret: "late A" }, status: 200, statusText: "OK", headers: {}, config })
  }) })
  const pending = queryClient.fetchQuery({ queryKey: ["notes"], retry: false,
    queryFn: () => request(OpenAPI, { method: "GET", url: "/api/v1/notes" }, transport) })
  const rejected = expect(pending).rejects.toThrow()
  await vi.waitFor(() => expect(respond).toBeTypeOf("function"))
  session.resetSession()
  localStorage.setItem("access_token", "token-b")
  respond()
  await rejected
  const loadB = vi.fn(async () => ({ secret: "B" }))
  expect(await queryClient.ensureQueryData({ queryKey: ["contacts"], queryFn: loadB })).toEqual({ secret: "B" })
  expect(loadB).toHaveBeenCalledOnce()
  expect(queryClient.getQueryData(["notes"])).toBeUndefined()
  queryClient.clear()
})

it("rejects a request queued before a credential change before it is sent", async () => {
  const { OpenAPI, request } = await setup()
  localStorage.setItem("access_token", "token-a")
  const transport = axios.create({ adapter: vi.fn(async () => { throw new Error("must not send") }) })
  const pending = request(OpenAPI, { method: "POST", url: "/api/v1/notes" }, transport)
  localStorage.setItem("access_token", "token-b")
  await expect(pending).rejects.toThrow("session changed")
  expect(transport.defaults.adapter).not.toHaveBeenCalled()
})

it.each([401, 403])("auth failure %s clears private cache and exits the document", async (status) => {
  const { OpenAPI, request, queryClient } = await setup()
  localStorage.setItem("access_token", "token-a")
  queryClient.setQueryData(["contacts"], { secret: "A" })
  const transport = axios.create({ adapter: async (config) => ({ data: {}, status, statusText: "Denied", headers: {}, config }) })
  await expect(request(OpenAPI, { method: "GET", url: "/api/v1/contacts" }, transport)).rejects.toThrow()
  expect(queryClient.getQueryData(["contacts"])).toBeUndefined()
  expect(localStorage.getItem("access_token")).toBeNull()
  expect(window.location.assign).toHaveBeenCalledWith("/login")
})

it("rejects a Cloudflare identity change before returning its response", async () => {
  const { session, OpenAPI, request, queryClient } = await setup()
  session.acceptIdentity("account-a")
  queryClient.setQueryData(["contacts"], { secret: "A" })
  const transport = axios.create({ adapter: async (config) => ({ data: { id: "account-b" }, status: 200, statusText: "OK", headers: {}, config }) })
  await expect(request(OpenAPI, { method: "GET", url: "/api/v1/users/me" }, transport)).rejects.toThrow()
  expect(queryClient.getQueryData(["contacts"])).toBeUndefined()
  expect(window.location.assign).toHaveBeenCalledWith("/")
})

it("rejects direct-fetch bodies that finish after logout", async () => {
  const { session, api } = await setup()
  let complete!: (value: unknown) => void
  vi.stubGlobal("fetch", vi.fn(async () => ({ status: 200, redirected: false, headers: new Headers(),
    json: () => new Promise((resolve) => { complete = resolve }),
    text: vi.fn(), blob: vi.fn(), arrayBuffer: vi.fn(), formData: vi.fn(),
  })))
  const response = await api.sessionFetch("/api/v1/keys")
  const body = response.json()
  session.resetSession()
  complete({ secret: "A" })
  await expect(body).rejects.toThrow("session changed")
})

it("a sibling-tab transition discards local state without deleting its new token", async () => {
  const { session, queryClient } = await setup()
  session.listenForSessionChanges()
  queryClient.setQueryData(["contacts"], { secret: "A" })
  localStorage.setItem("access_token", "token-b")
  window.dispatchEvent(new StorageEvent("storage", { key: "access_token" }))
  expect(queryClient.getQueryData(["contacts"])).toBeUndefined()
  expect(localStorage.getItem("access_token")).toBe("token-b")
  expect(window.location.reload).toHaveBeenCalledOnce()
})

it("does not install a late login response after logout", async () => {
  const { session } = await setup()
  const loginSession = session.captureSession()
  session.leaveSession("/login")
  expect(() => session.completeLogin("late-token", loginSession)).toThrow("session changed")
  expect(localStorage.getItem("access_token")).toBeNull()
  expect(window.location.assign).toHaveBeenCalledOnce()
})

it("treats an Access HTML redirect as an auth transition", async () => {
  const { OpenAPI, request, queryClient } = await setup()
  queryClient.setQueryData(["contacts"], { secret: "A" })
  const transport = axios.create({ adapter: async (config) => ({ data: "<html>Login</html>", status: 200, statusText: "OK", headers: { "content-type": "text/html" }, config }) })
  await expect(request(OpenAPI, { method: "GET", url: "/api/v1/contacts" }, transport)).rejects.toThrow()
  expect(queryClient.getQueryData(["contacts"])).toBeUndefined()
  expect(window.location.assign).toHaveBeenCalledWith("/login")
})

it("rejects new SDK work after sibling credential drift before its storage event", async () => {
  const { session, OpenAPI, request, queryClient } = await setup()
  localStorage.setItem("access_token", "token-a")
  session.acceptIdentity("account-a")
  queryClient.setQueryData(["contacts"], { secret: "A" })
  localStorage.setItem("access_token", "token-b")
  const adapter = vi.fn(async () => { throw new Error("must not send") })
  await expect(request(OpenAPI, { method: "POST", url: "/api/v1/notes" }, axios.create({ adapter }))).rejects.toThrow("session changed")
  expect(adapter).not.toHaveBeenCalled()
  expect(queryClient.getQueryData(["contacts"])).toBeUndefined()
  expect(session.getVerifiedAccountId()).toBeNull()
  expect(localStorage.getItem("access_token")).toBe("token-b")
  expect(window.location.reload).toHaveBeenCalled()
})

it("does not overwrite a sibling's login with a simultaneous late login response", async () => {
  const { session } = await setup()
  const pendingLogin = session.captureSession()
  localStorage.setItem("access_token", "sibling-token-b")
  expect(() => session.completeLogin("token-a", pendingLogin)).toThrow("session changed")
  expect(localStorage.getItem("access_token")).toBe("sibling-token-b")
  expect(window.location.reload).toHaveBeenCalled()
})

it("rejects an A Authorization header under a B generation before fetching", async () => {
  const { session, api } = await setup()
  localStorage.setItem("access_token", "token-b")
  session.acceptIdentity("account-b")
  const fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
  await expect(api.sessionFetch("/api/v1/keys", { headers: { Authorization: "Bearer token-a" } })).rejects.toThrow("session changed")
  expect(fetchMock).not.toHaveBeenCalled()
  expect(localStorage.getItem("access_token")).toBe("token-b")
})

it("captures before asynchronous credential resolution and rejects drift during the await", async () => {
  const { session, api, OpenAPI } = await setup()
  localStorage.setItem("access_token", "token-a")
  session.acceptIdentity("account-a")
  let resolveToken!: (token: string) => void
  OpenAPI.TOKEN = () => new Promise((resolve) => { resolveToken = resolve })
  const fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
  const pending = api.sessionFetch("/api/v1/keys")
  const rejected = expect(pending).rejects.toThrow("session changed")
  localStorage.setItem("access_token", "token-b")
  resolveToken("token-a")
  await rejected
  expect(fetchMock).not.toHaveBeenCalled()
  expect(localStorage.getItem("access_token")).toBe("token-b")
})
