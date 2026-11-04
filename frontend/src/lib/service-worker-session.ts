import { requestServiceWorkerActivation } from "./service-worker-update"

const PROTOCOL = "KINDRED_PRIVATE_NETWORK_ONLY_V1"

function workerIsSafe(worker: ServiceWorker): Promise<boolean> {
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    const finish = (safe: boolean) => {
      clearTimeout(timer)
      channel.port1.close()
      channel.port2.close()
      resolve(safe)
    }
    const timer = setTimeout(() => finish(false), 1000)
    channel.port1.onmessage = (event) => finish(event.data === PROTOCOL)
    try {
      worker.postMessage(PROTOCOL, [channel.port2])
    } catch {
      finish(false)
    }
  })
}

// Subscribe before probing: an automatic update can replace the captured old
// controller while its handshake is still pending. Only trust the actual current
// controller after its own successful handshake, regardless of event ordering.
export async function ensurePrivateApiWorker(): Promise<void> {
  const workers = navigator.serviceWorker
  if (!workers?.controller) {
    if (navigator.onLine === false && workers?.ready) {
      await Promise.race([
        workers.ready,
        new Promise<void>((resolve) => setTimeout(resolve, 1500)),
      ])
    }
    if (!workers?.controller) return
  }
  let revision = 0
  let wake!: () => void
  let change = new Promise<void>((resolve) => {
    wake = resolve
  })
  const changed = () => {
    revision++
    wake()
    change = new Promise<void>((resolve) => {
      wake = resolve
    })
  }
  workers.addEventListener("controllerchange", changed)
  let timeout: ReturnType<typeof setTimeout> | undefined
  const currentIsSafe = async (): Promise<boolean> => {
    for (;;) {
      const current = workers.controller
      if (!current) return false
      const safe = await workerIsSafe(current)
      if (current === workers.controller) return safe
    }
  }
  const ensure = async () => {
    if (await currentIsSafe()) return
    const previous = workers.controller
    const registration = await workers.register("/sw.js", {
      updateViaCache: "none",
    })
    if (previous !== workers.controller && (await currentIsSafe())) return
    await registration.update()
    requestServiceWorkerActivation(registration)
    for (;;) {
      const beforeProbe = revision
      if (await currentIsSafe()) return
      if (beforeProbe === revision) await change
    }
  }
  try {
    await Promise.race([
      ensure(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(
                "A security update is required. Reconnect and reload to continue.",
              ),
            ),
          15000,
        )
      }),
    ])
  } finally {
    clearTimeout(timeout)
    workers.removeEventListener("controllerchange", changed)
  }
}
