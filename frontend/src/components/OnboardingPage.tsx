import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { completeOnboarding } from "@/lib/users"
import { EVENT_TAGS } from "@/lib/events"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import logo from "@/assets/logo_v1.png"

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(user?.displayName ?? "")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedName = displayName.trim()
    if (!trimmedName) {
      setError("Please enter your name.")
      return
    }
    if (selectedTags.length === 0) {
      setError("Please select at least one interest.")
      return
    }

    if (!user) return
    setLoading(true)
    try {
      await completeOnboarding(user.uid, trimmedName, selectedTags)
      await refreshProfile()
      navigate("/dashboard", { replace: true })
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-4">
      <div className="w-full max-w-lg">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2">
              <img
                src={logo}
                alt="Connect Four"
                className="h-12 w-12 rounded-md object-cover"
              />
            </div>
            <CardTitle className="text-xl">Welcome to Connect Four!</CardTitle>
            <CardDescription>
              Tell us a bit about yourself to get started
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="displayName">Your Name</FieldLabel>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="What should we call you?"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel>Interests</FieldLabel>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Pick topics you're interested in so we can personalize your
                    event feed.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                          selectedTags.includes(tag)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  {selectedTags.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {selectedTags.length} selected
                    </p>
                  )}
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
                    {loading ? "Saving..." : "Get Started"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
