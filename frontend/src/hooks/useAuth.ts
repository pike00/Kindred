import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { cfEnabled, logout as cfLogout } from "@/auth/cf"
import {
  type Body_login_login_access_token as AccessToken,
  LoginService,
  type UserPublic,
  type UserRegister,
  UsersService,
} from "@/client"
import {
  acceptIdentity,
  assertSession,
  captureSession,
  completeLogin,
  leaveSession,
  resetSession,
} from "@/lib/session"
import { sessionFetch } from "@/lib/session-api"
import { handleError } from "@/utils"
import useCustomToast from "./useCustomToast"

const isLoggedIn = () => {
  if (cfEnabled()) return true
  return localStorage.getItem("access_token") !== null
}

const useAuth = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()

  const { data: user } = useQuery<UserPublic | null, Error>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const session = captureSession()
      const user = await UsersService.readUserMe()
      assertSession(session)
      acceptIdentity(user.id)
      return user
    },
    enabled: isLoggedIn(),
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  })

  const signUpMutation = useMutation({
    mutationFn: (data: UserRegister) =>
      UsersService.registerUser({ requestBody: data }),
    onSuccess: () => {
      navigate({ to: "/login" })
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const login = async (data: AccessToken) => {
    resetSession()
    await queryClient.cancelQueries()
    queryClient.clear()
    const session = captureSession()
    const response = await LoginService.loginAccessToken({
      formData: data,
    })
    completeLogin(response.access_token, session)
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onError: handleError.bind(showErrorToast),
  })

  const logout = async () => {
    await queryClient.cancelQueries()
    queryClient.clear()
    if (cfEnabled()) {
      cfLogout()
      return
    }
    try {
      await sessionFetch("/api/v1/users/me/logout", {
        method: "POST",
        signal: AbortSignal.timeout(3000),
      })
    } catch {
      // Local logout still succeeds if the server is unreachable.
    } finally {
      leaveSession("/login")
    }
  }

  return {
    signUpMutation,
    loginMutation,
    logout,
    user,
  }
}

export { isLoggedIn }
export default useAuth
