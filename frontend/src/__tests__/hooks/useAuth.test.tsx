import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import {
  createQueryClient,
  makeUser,
  renderWithProviders,
} from "@/test/helpers"

// Mock router
const mockNavigate = vi.fn()
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock API client
vi.mock("@/client", () => ({
  LoginService: {
    loginAccessToken: vi.fn(),
  },
  UsersService: {
    readUserMe: vi.fn().mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      is_superuser: false,
    }),
    registerUser: vi.fn(),
  },
}))

// Mock CF auth
vi.mock("@/auth/cf", () => ({
  cfEnabled: vi.fn().mockReturnValue(false),
  logout: vi.fn(),
}))

// Mock useCustomToast
vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
  }),
}))

// Mock handleError util
vi.mock("@/utils", () => ({
  handleError: vi.fn((callback) => callback),
}))

describe("useAuth hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe("isLoggedIn", () => {
    it("returns false when no token in localStorage", () => {
      expect(isLoggedIn()).toBe(false)
    })

    it("returns true when token exists in localStorage", () => {
      localStorage.setItem("access_token", "test-token")
      expect(isLoggedIn()).toBe(true)
    })

    it("returns true when cfEnabled is true regardless of token", async () => {
      const { cfEnabled } = await import("@/auth/cf")
      vi.mocked(cfEnabled).mockReturnValue(true)
      localStorage.clear()
      expect(isLoggedIn()).toBe(true)
    })
  })

  describe("useAuth", () => {
    it("renders without errors", () => {
      const queryClient = createQueryClient()
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })
      expect(result.current).toBeDefined()
      expect(result.current.loginMutation).toBeDefined()
      expect(result.current.signUpMutation).toBeDefined()
      expect(result.current.logout).toBeDefined()
    })

    it("fetches current user when logged in", async () => {
      const { UsersService } = await import("@/client")
      vi.mocked(UsersService.readUserMe).mockClear()
      localStorage.setItem("access_token", "test-token")

      const queryClient = createQueryClient()
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      await waitFor(() => {
        expect(result.current.user).toBeDefined()
      })
      expect(vi.mocked(UsersService.readUserMe)).toHaveBeenCalled()
    })

    it("does not fetch user when not logged in", async () => {
      const { UsersService } = await import("@/client")
      const { cfEnabled } = await import("@/auth/cf")

      vi.mocked(UsersService.readUserMe).mockClear()
      vi.mocked(cfEnabled).mockReturnValue(false)
      localStorage.clear()

      const queryClient = createQueryClient()
      renderHook(() => useAuth(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      await new Promise((r) => setTimeout(r, 100))
      expect(vi.mocked(UsersService.readUserMe)).not.toHaveBeenCalled()
    })
  })

  describe("loginMutation", () => {
    it("calls loginAccessToken with correct params", async () => {
      const { LoginService } = await import("@/client")
      const mockResponse = { access_token: "new-token" }
      vi.mocked(LoginService.loginAccessToken).mockResolvedValue(mockResponse)

      const queryClient = createQueryClient()
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      result.current.loginMutation.mutate({
        username: "test",
        password: "pass",
      } as any)

      await waitFor(() => {
        expect(LoginService.loginAccessToken).toHaveBeenCalledWith({
          formData: { username: "test", password: "pass" },
        })
      })
    })

    it("stores access token in localStorage on success", async () => {
      const { LoginService } = await import("@/client")
      const mockResponse = { access_token: "new-token-123" }
      vi.mocked(LoginService.loginAccessToken).mockResolvedValue(mockResponse)

      const queryClient = createQueryClient()
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      result.current.loginMutation.mutate({
        username: "test",
        password: "pass",
      } as any)

      await waitFor(() => {
        expect(localStorage.getItem("access_token")).toBe("new-token-123")
      })
    })

    it("navigates to home on successful login", async () => {
      const { LoginService } = await import("@/client")
      vi.mocked(LoginService.loginAccessToken).mockResolvedValue({
        access_token: "new-token",
      })

      const queryClient = createQueryClient()
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      result.current.loginMutation.mutate({
        username: "test",
        password: "pass",
      } as any)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/" })
      })
    })

    it("handles login error", async () => {
      const { LoginService } = await import("@/client")
      const error = new Error("Login failed")
      vi.mocked(LoginService.loginAccessToken).mockRejectedValue(error)

      const queryClient = createQueryClient()
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      result.current.loginMutation.mutate({
        username: "test",
        password: "pass",
      } as any)

      await waitFor(() => {
        expect(result.current.loginMutation.isError).toBe(true)
      })
      expect(localStorage.getItem("access_token")).toBeNull()
    })
  })

  describe("signUpMutation", () => {
    it("calls registerUser with correct params", async () => {
      const { UsersService } = await import("@/client")
      vi.mocked(UsersService.registerUser).mockResolvedValue(
        makeUser({ email: "new@example.com" }),
      )

      const queryClient = createQueryClient()
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      const userData = {
        email: "new@example.com",
        password: "securepass123",
      }
      result.current.signUpMutation.mutate(userData as any)

      await waitFor(() => {
        expect(UsersService.registerUser).toHaveBeenCalledWith({
          requestBody: userData,
        })
      })
    })

    it("navigates to login on successful signup", async () => {
      const { UsersService } = await import("@/client")
      vi.mocked(UsersService.registerUser).mockResolvedValue(
        makeUser({ email: "new@example.com" }),
      )

      const queryClient = createQueryClient()
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      result.current.signUpMutation.mutate({
        email: "new@example.com",
        password: "pass",
      } as any)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/login" })
      })
    })

    it("invalidates users query on successful signup", async () => {
      const { UsersService } = await import("@/client")
      vi.mocked(UsersService.registerUser).mockResolvedValue(
        makeUser({ email: "new@example.com" }),
      )

      const queryClient = createQueryClient()
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      result.current.signUpMutation.mutate({
        email: "new@example.com",
        password: "pass",
      } as any)

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["users"] })
      })
    })

    it("handles signup error", async () => {
      const { UsersService } = await import("@/client")
      const error = new Error("Signup failed")
      vi.mocked(UsersService.registerUser).mockRejectedValue(error)

      const queryClient = createQueryClient()
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      result.current.signUpMutation.mutate({
        email: "new@example.com",
        password: "pass",
      } as any)

      await waitFor(() => {
        expect(result.current.signUpMutation.isError).toBe(true)
      })
    })
  })

  describe("logout", () => {
    it("removes access token from localStorage", async () => {
      const { cfEnabled } = await import("@/auth/cf")
      vi.mocked(cfEnabled).mockReturnValue(false)

      localStorage.setItem("access_token", "test-token")
      mockNavigate.mockClear()

      const queryClient = createQueryClient()
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      result.current.logout()

      expect(localStorage.getItem("access_token")).toBeNull()
    })

    it("navigates to login with replace flag", async () => {
      const { cfEnabled } = await import("@/auth/cf")
      vi.mocked(cfEnabled).mockReturnValue(false)

      localStorage.setItem("access_token", "test-token")
      mockNavigate.mockClear()

      const queryClient = createQueryClient()
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      result.current.logout()

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/login",
        replace: true,
      })
    })

    it("calls cfLogout when CF is enabled", async () => {
      const { cfEnabled } = await import("@/auth/cf")
      const { logout: cfLogout } = await import("@/auth/cf")

      vi.mocked(cfEnabled).mockReturnValue(true)

      const queryClient = createQueryClient()
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      result.current.logout()

      expect(vi.mocked(cfLogout)).toHaveBeenCalled()
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })
})
