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
    worker.postMessage(PROTOCOL, [channel.port2])
  })
}

// New JS can be served while an older worker still controls the page. Do not
// mount queries or private routes until that controller confirms NetworkOnly.
export async function ensurePrivateApiWorker(): Promise<void> {
  const workers = navigator.serviceWorker
  if (!workers?.controller) return
  if (await workerIsSafe(workers.controller)) return

  let timeout: ReturnType<typeof setTimeout> | undefined
  let changed: (() => void) | undefined
  try {
    const updated = new Promise<void>((resolve) => {
      changed = () => resolve()
      workers.addEventListener("controllerchange", changed, { once: true })
    })
    const update = async () => {
      const registration = await workers.register("/sw.js", {
        updateViaCache: "none",
      })
      await registration.update()
      await updated
      if (!workers.controller || !(await workerIsSafe(workers.controller))) {
        throw new Error(
          "The security update is not active. Reload to try again.",
        )
      }
    }
    await Promise.race([
      update(),
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
    if (changed) workers.removeEventListener("controllerchange", changed)
  }
}
