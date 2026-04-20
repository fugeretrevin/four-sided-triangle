import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "@/firebaseConfig"
import { getUserProfile, type UserRole } from "@/lib/users"

interface AuthContextValue {
  user: User | null
  role: UserRole | null
  onboardingComplete: boolean
  loading: boolean
  /** Call after onboarding finishes to update context without a full reload. */
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  onboardingComplete: false,
  loading: true,
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    if (!user) return
    try {
      const profile = await getUserProfile(user.uid)
      setRole(profile.role)
      setOnboardingComplete(profile.onboardingComplete)
    } catch {
      // keep current values
    }
  }, [user])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      // Re-enter loading state while we fetch the profile so that
      // ProtectedRoute shows a spinner instead of acting on stale values.
      setLoading(true)
      setUser(firebaseUser)

      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid)
          setRole(profile.role)
          setOnboardingComplete(profile.onboardingComplete)
        } catch {
          setRole("user")
          setOnboardingComplete(false)
        }
      } else {
        setRole(null)
        setOnboardingComplete(false)
      }

      setLoading(false)
    })

    return unsub
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, role, onboardingComplete, loading, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
