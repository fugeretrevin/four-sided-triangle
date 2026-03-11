import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Timestamp } from "firebase/firestore"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  getEvent,
  createEvent,
  updateEvent,
  EVENT_TAGS,
  type EventInput,
  type EventStatus,
} from "@/lib/events"
import { useAuth } from "@/contexts/AuthContext"

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a datetime-local string ("YYYY-MM-DDTHH:mm") to a Firestore Timestamp. */
function localStringToTimestamp(value: string): Timestamp {
  return Timestamp.fromDate(new Date(value))
}

/** Convert a Firestore Timestamp to the datetime-local input format. */
function timestampToLocalString(ts: Timestamp): string {
  const d = ts.toDate()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EventForm() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [dateTime, setDateTime] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [status, setStatus] = useState<EventStatus>("draft")
  const [capacity, setCapacity] = useState<string>("")
  const [imageUrl, setImageUrl] = useState("")

  // UI state
  const [loadingEvent, setLoadingEvent] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Populate form when editing
  useEffect(() => {
    if (!id) return

    const load = async () => {
      try {
        const event = await getEvent(id)
        if (!event) {
          setError("Event not found.")
          return
        }
        setTitle(event.title)
        setDescription(event.description)
        setLocation(event.location)
        setDateTime(timestampToLocalString(event.dateTime))
        setTags(event.tags ?? [])
        setStatus(event.status)
        setCapacity(event.capacity !== null ? String(event.capacity) : "")
        setImageUrl(event.imageUrl ?? "")
      } catch {
        setError("Failed to load event data.")
      } finally {
        setLoadingEvent(false)
      }
    }

    load()
  }, [id])

  // Toggle a tag on/off
  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !description.trim() || !location.trim() || !dateTime) {
      setError("Title, description, location, and date are required.")
      return
    }

    setSubmitting(true)

    try {
      const payload: EventInput = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        dateTime: localStringToTimestamp(dateTime),
        tags,
        status,
        capacity: capacity !== "" ? Number(capacity) : null,
        imageUrl: imageUrl.trim(),
        hostId: user?.uid ?? "",
        hostName: user?.displayName ?? user?.email ?? "Admin",
      }

      if (isEdit && id) {
        await updateEvent(id, payload)
      } else {
        await createEvent(payload)
      }

      navigate("/admin/dashboard")
    } catch {
      setError("Failed to save event. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loadingEvent) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading event…
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-6 gap-2 text-muted-foreground"
        onClick={() => navigate("/admin/dashboard")}
      >
        <ArrowLeft className="size-4" />
        Back to events
      </Button>

      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        {isEdit ? "Edit Event" : "New Event"}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {isEdit
          ? "Update the details below and save your changes."
          : "Fill in the details below and choose a status when ready."}
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* ── Event information ────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event Information</CardTitle>
            <CardDescription>
              Core details visible to all students
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="title"
                className="text-sm font-medium leading-none"
              >
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="title"
                placeholder="e.g. Study Group: Intro to Machine Learning"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="description"
                className="text-sm font-medium leading-none"
              >
                Description <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="description"
                placeholder="What will attendees do or learn? Include any important details."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                required
              />
              <span className="text-right text-xs text-muted-foreground">
                {description.length}/2000
              </span>
            </div>

            {/* Location */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="location"
                className="text-sm font-medium leading-none"
              >
                Location <span className="text-destructive">*</span>
              </label>
              <Input
                id="location"
                placeholder="e.g. Reitz Union Room 2365"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={200}
                required
              />
            </div>

            {/* Date & Time */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="dateTime"
                className="text-sm font-medium leading-none"
              >
                Date & Time <span className="text-destructive">*</span>
              </label>
              <Input
                id="dateTime"
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                required
              />
            </div>

            {/* Image URL */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="imageUrl"
                className="text-sm font-medium leading-none"
              >
                Cover Image URL{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Settings ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
            <CardDescription>
              Visibility, discovery, and capacity
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium leading-none">Status</label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as EventStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">
                    Published — visible to all students
                  </SelectItem>
                  <SelectItem value="draft">
                    Draft — hidden, not yet ready
                  </SelectItem>
                  <SelectItem value="canceled">
                    Canceled — no new RSVPs allowed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Tags */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium leading-none">
                Tags{" "}
                <span className="text-muted-foreground">
                  ({tags.length} selected)
                </span>
              </label>
              <p className="text-xs text-muted-foreground">
                Tags help students find events that match their interests.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {EVENT_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="focus:outline-none"
                  >
                    <Badge
                      variant={tags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer select-none transition-colors"
                    >
                      {tag}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Capacity */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="capacity"
                className="text-sm font-medium leading-none"
              >
                Capacity{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <p className="text-xs text-muted-foreground">
                Leave blank for unlimited attendance.
              </p>
              <Input
                id="capacity"
                type="number"
                min={1}
                placeholder="e.g. 50"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="max-w-[140px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/dashboard")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create event"}
          </Button>
        </div>
      </form>
    </div>
  )
}
