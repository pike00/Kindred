import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import vm from "node:vm"

// Exercise the actual production worker and bundled Workbox in a bounded
// synthetic worker environment. No server, browser profile or real user data.
const dist = new URL("../dist/", import.meta.url)
const listeners = new Map()
const cacheNames = new Map([
  [
    "api-cache",
    { privateBody: "account-a", authorization: "Bearer synthetic-a" },
  ],
])
let networkStatus = 200
let offline = false
const origin = "https://kindred.test"
const context = vm.createContext({
  URL,
  Request,
  Response,
  Headers,
  console,
  setTimeout,
  clearTimeout,
  FetchEvent: class FetchEvent {},
  location: new URL(`${origin}/sw.js`),
  registration: { scope: `${origin}/` },
  navigator: { userAgent: "synthetic" },
  clients: { claim: async () => {}, matchAll: async () => [] },
  skipWaiting: async () => {},
  addEventListener(type, handler) {
    listeners.set(type, [...(listeners.get(type) || []), handler])
  },
  caches: {
    delete: async (name) => cacheNames.delete(name),
    keys: async () => [...cacheNames.keys()],
    open: async (name) => {
      cacheNames.set(name, {})
      return {
        keys: async () => [],
        match: async () => undefined,
        delete: async () => true,
      }
    },
    match: async () => undefined,
  },
  fetch: async () => {
    if (offline) throw new TypeError("synthetic network unavailable")
    return new Response(JSON.stringify({ account: "b" }), {
      status: networkStatus,
    })
  },
})
context.self = context
context.importScripts = (...urls) => {
  for (const url of urls) {
    const name = new URL(url, `${origin}/sw.js`).pathname.slice(1)
    assert(!name.includes(".."))
    vm.runInContext(readFileSync(new URL(name, dist), "utf8"), context, {
      filename: name,
    })
  }
}
vm.runInContext(readFileSync(new URL("sw.js", dist), "utf8"), context, {
  filename: "sw.js",
})
await new Promise(setImmediate)
assert(listeners.has("activate"), "worker did not initialize")
const activation = []
for (const handler of listeners.get("activate"))
  handler({ waitUntil: (promise) => activation.push(promise) })
await Promise.all(activation)
assert(
  !cacheNames.has("api-cache"),
  "upgrade retained the legacy private cache",
)

async function fetchPrivate() {
  const waits = []
  let result
  const event = {
    request: new Request(`${origin}/api/v1/contacts/`, {
      headers: { Authorization: "Bearer synthetic-b" },
    }),
    waitUntil: (promise) => waits.push(promise),
    respondWith: (promise) => {
      result = promise
    },
  }
  for (const handler of listeners.get("fetch")) handler(event)
  assert(result, "private GET was not routed")
  try {
    return await result
  } finally {
    await Promise.allSettled(waits)
  }
}
assert.equal((await fetchPrivate()).status, 200)
assert(!cacheNames.has("api-cache"), "private response was cached")
for (const status of [401, 403]) {
  networkStatus = status
  assert.equal(
    (await fetchPrivate()).status,
    status,
    "auth denial became cached success",
  )
}
offline = true
await assert.rejects(
  fetchPrivate(),
  "offline request replayed a private response",
)
assert(!cacheNames.has("api-cache"))
// A final old-worker write must still never be replayed by the new worker.
cacheNames.set("api-cache", { privateBody: "late account-a" })
await assert.rejects(fetchPrivate())
assert(
  !cacheNames.has("api-cache"),
  "post-control cleanup missed a late legacy cache",
)
console.log(
  JSON.stringify({
    check: "production-private-worker",
    activationPurge: true,
    privateGetsNetworkOnly: true,
    authDenialsPreserved: true,
    offlineReplayBlocked: true,
    lateLegacyPurge: true,
    worker: fileURLToPath(new URL("sw.js", dist)),
  }),
)
