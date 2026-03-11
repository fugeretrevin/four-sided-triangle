import { useState, type FormEvent } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
  reload,
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

// Possible steps in the signup flow
type SignupStep = "form" | "verify"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [step, setStep] = useState<SignupStep>("form")
  // Pending user waiting for email verification
  const [pendingUser, setPendingUser] = useState<ReturnType<
    typeof auth.currentUser
  > | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const [checkLoading, setCheckLoading] = useState(false)
  const navigate = useNavigate()

  // Google sign-up via popup (Google accounts are pre-verified)
  const handleGoogleSignup = async () => {
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

  // Email + password registration
  const handleSignup = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      )
      // Create the Firestore user document before signing out
      await ensureUserDoc(credential.user)
      // Send verification email immediately after account creation
      await sendEmailVerification(credential.user)
      setPendingUser(credential.user)
      // Sign out so the user can't access the app without verifying first
      await auth.signOut()
      setStep("verify")
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        if (err.code === "auth/email-already-in-use") {
          setError("An account with this email already exists.")
        } else if (err.code === "auth/weak-password") {
          setError("Password must be at least 6 characters.")
        } else if (err.code === "auth/invalid-email") {
          setError("Please enter a valid email address.")
        } else {
          setError(err.message)
        }
      } else {
        setError("Failed to create account.")
      }
    } finally {
      setLoading(false)
    }
  }

  // Resend verification email to the pending user
  const handleResend = async () => {
    if (!pendingUser) return
    setResendLoading(true)
    setResendSent(false)
    try {
      await sendEmailVerification(pendingUser)
      setResendSent(true)
    } catch {
      setError("Could not resend verification email. Please try again later.")
    } finally {
      setResendLoading(false)
    }
  }

  // Check if the user has completed email verification
  const handleCheckVerification = async () => {
    if (!pendingUser) return
    setCheckLoading(true)
    setError(null)
    try {
      // Reload fetches the latest user state from Firebase
      await reload(pendingUser)
      if (pendingUser.emailVerified) {
        navigate("/dashboard")
      } else {
        setError("Email not verified yet. Please click the link in your inbox.")
      }
    } catch {
      setError("Could not verify. Please try logging in manually.")
    } finally {
      setCheckLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        {step === "form" ? (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Create an account</CardTitle>
              <CardDescription>
                Sign up with Google or your email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup}>
                <FieldGroup>
                  {/* Google sign-up */}
                  <Field>
                    <Button
                      variant="outline"
                      type="button"
                      className="w-full"
                      onClick={handleGoogleSignup}
                      disabled={googleLoading}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                          fill="currentColor"
                        />
                      </svg>
                      {googleLoading
                        ? "Signing up..."
                        : "Continue with Google"}
                    </Button>
                  </Field>

                  <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                    Or register with email
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
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm Password
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </Field>

                  {error && (
                    <Field>
                      <p className="text-sm text-destructive">{error}</p>
                    </Field>
                  )}

                  <Field>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? "Creating account..." : "Create account"}
                    </Button>
                    <FieldDescription className="text-center">
                      Already have an account?{" "}
                      <Link
                        to="/login"
                        className="underline underline-offset-4 hover:text-primary"
                      >
                        Log in
                      </Link>
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </form>
            </CardContent>
          </>
        ) : (
          /* Email verification pending screen */
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Verify your email</CardTitle>
              <CardDescription>
                We sent a verification link to your inbox
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {/* Mail icon */}
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-7 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0-9.75 6.75L2.25 6.75"
                    />
                  </svg>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  A verification link was sent to{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                  Click the link in the email to activate your account.
                </p>

                {resendSent && (
                  <p className="text-center text-sm text-green-600">
                    Verification email resent successfully!
                  </p>
                )}

                {error && (
                  <p className="text-center text-sm text-destructive">
                    {error}
                  </p>
                )}

                {/* Primary action: check if verified and proceed */}
                <Button
                  onClick={handleCheckVerification}
                  disabled={checkLoading}
                  className="w-full"
                >
                  {checkLoading ? "Checking..." : "I've verified my email"}
                </Button>

                {/* Secondary action: resend the verification email */}
                <Button
                  variant="outline"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="w-full"
                >
                  {resendLoading ? "Sending..." : "Resend verification email"}
                </Button>

                <FieldDescription className="text-center">
                  <button
                    type="button"
                    className="underline underline-offset-4 hover:text-primary"
                    onClick={() => {
                      setStep("form")
                      setError(null)
                      setResendSent(false)
                    }}
                  >
                    Back to sign up
                  </button>
                </FieldDescription>
              </div>
            </CardContent>
          </>
        )}
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
