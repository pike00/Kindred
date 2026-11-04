import { expect, it, vi } from "vitest"
import {
  activateServiceWorkerUpdate,
  requestServiceWorkerActivation,
} from "@/lib/service-worker-update"

it("activates a waiting worker only after explicit confirmation", () => {
  const target = new EventTarget()
  vi.stubGlobal("navigator", { serviceWorker: target })
  const worker = {
    postMessage: vi.fn(),
    state: "installed",
    addEventListener: vi.fn(),
  } as unknown as ServiceWorker
  const reload = vi.fn()

  activateServiceWorkerUpdate(worker, reload)

  expect(worker.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" })
  expect(reload).not.toHaveBeenCalled()
  target.dispatchEvent(new Event("controllerchange"))
  expect(reload).toHaveBeenCalledOnce()
})

it("asks an installing security worker to activate after it installs", () => {
  const worker = new EventTarget() as EventTarget & {
    postMessage: ReturnType<typeof vi.fn>
    state: ServiceWorkerState
  }
  worker.postMessage = vi.fn()
  worker.state = "installing"
  const registration = {
    waiting: null,
    installing: worker,
  } as unknown as ServiceWorkerRegistration

  requestServiceWorkerActivation(registration)
  expect(worker.postMessage).not.toHaveBeenCalled()

  Object.defineProperty(worker, "state", { value: "installed" })
  worker.dispatchEvent(new Event("statechange"))
  expect(worker.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" })
})
