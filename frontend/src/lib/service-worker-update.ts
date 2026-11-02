export function activateServiceWorkerUpdate(
  worker: ServiceWorker,
  reload: () => void,
): void {
  let completed = false
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => {
      if (completed) return
      completed = true
      reload()
    },
    { once: true },
  )
  worker.postMessage({ type: "SKIP_WAITING" })
}

export function requestServiceWorkerActivation(
  registration: ServiceWorkerRegistration,
): void {
  const worker = registration.waiting ?? registration.installing
  if (!worker) return
  const activateWhenInstalled = () => {
    if (worker.state !== "installed") return
    worker.postMessage({ type: "SKIP_WAITING" })
  }
  if (worker.state === "installed") {
    activateWhenInstalled()
    return
  }
  worker.addEventListener("statechange", activateWhenInstalled, { once: true })
  activateWhenInstalled()
}
