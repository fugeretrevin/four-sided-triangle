import { useState, useEffect, type FormEvent } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
} from "firebase/auth"
import { FirebaseError } from "firebase/app"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { auth } from "@/firebaseConfig"
import { ensureUserDoc } from "@/lib/users"

const googleProvider = new GoogleAuthProvider()

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [unverifiedUser, setUnverifiedUser] = useState<ReturnType<
    typeof auth.currentUser
  > | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const navigate = useNavigate()

  // If a user is already signed in on mount (e.g. after email verification link),
  // redirect them directly without requiring another login
  useEffect(() => {
    const current = auth.currentUser
    if (current?.emailVerified) {
      navigate("/dashboard")
    }
  }, [navigate])

  // Google sign-in via popup
  const handleGoogleLogin = async () => {
    setError(null)
    setGoogleLoading(true)
    try {
      const { user } = await signInWithPopup(auth, googleProvider)
      await ensureUserDoc(user)
      navigate("/dashboard")
    } catch (err: unknown) {
      if (
        err instanceof FirebaseError &&
        err.code !== "auth/popup-closed-by-user" &&
        err.code !== "auth/cancelled-popup-request"
      ) {
        setError("Google sign-in failed. Please try again.")
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  // Email + password sign-in
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setUnverifiedUser(null)
    setLoading(true)

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const user = credential.user

      if (!user.emailVerified) {
        // Block access until the user verifies their email
        setUnverifiedUser(user)
        await auth.signOut()
        return
      }

      // Ensure user document exists (handles accounts created before this was added)
      await ensureUserDoc(user)
      navigate("/dashboard")
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        if (
          err.code === "auth/invalid-credential" ||
          err.code === "auth/user-not-found" ||
          err.code === "auth/wrong-password"
        ) {
          setError("Invalid email or password.")
        } else {
          setError(err.message)
        }
      } else {
        setError("An unexpected error occurred.")
      }
    } finally {
      setLoading(false)
    }
  }

  // Resend verification email to unverified user
  const handleResendVerification = async () => {
    if (!unverifiedUser) return
    setResendLoading(true)
    setResendSent(false)
    try {
      await sendEmailVerification(unverifiedUser)
      setResendSent(true)
    } catch {
      setError("Failed to resend verification email. Please try again later.")
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {unverifiedUser ? (
            // Unverified email notice — shown instead of the form
            <div className="flex flex-col gap-4 text-center">
              <p className="text-sm text-muted-foreground">
                Your email address{" "}
                <span className="font-medium text-foreground">
                  {unverifiedUser.email}
                </span>{" "}
                has not been verified yet. Please check your inbox and click the
                verification link before logging in.
              </p>
              {resendSent && (
                <p className="text-sm text-green-600">
                  Verification email sent! Check your inbox.
                </p>
              )}
              <Button
                variant="outline"
                onClick={handleResendVerification}
                disabled={resendLoading}
              >
                {resendLoading ? "Sending..." : "Resend verification email"}
              </Button>
              <Button
                variant="ghost"
                className="text-sm"
                onClick={() => setUnverifiedUser(null)}
              >
                Back to login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              <FieldGroup>
                {/* Google sign-in */}
                <Field>
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                        fill="currentColor"
                      />
                    </svg>
                    {googleLoading ? "Signing in..." : "Continue with Google"}
                  </Button>
                </Field>

                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                  Or continue with email
                </FieldSeparator>

                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Field>

                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <a
                      href="#"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Field>

                {error && (
                  <Field>
                    <p className="text-sm text-destructive">{error}</p>
                  </Field>
                )}

                <Field>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Login"}
                  </Button>
                  <FieldDescription className="text-center">
                    Don&apos;t have an account?{" "}
                    <Link
                      to="/signup"
                      className="underline underline-offset-4 hover:text-primary"
                    >
                      Sign up
                    </Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </a>
        .
      </FieldDescription>
    </div>
  )
}
