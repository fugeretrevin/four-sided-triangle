import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { format } from "date-fns"
import { Timestamp } from "firebase/firestore"
import { ArrowLeft, Calendar, MapPin, Users, Loader2 } from "lucide-react"
import { db, auth } from "@/firebaseConfig"
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

/** Firestore Timestamp loses its class instance when passed through React Router state.
 *  Handle both the real Timestamp and the plain {seconds, nanoseconds} fallback. */
function toDate(dateTime: unknown): Date | null {
  if (!dateTime) return null
  if (dateTime instanceof Timestamp) return dateTime.toDate()
  if (
    typeof dateTime === "object" &&
    "seconds" in dateTime &&
    "nanoseconds" in dateTime
  ) {
    return new Timestamp(
      (dateTime as { seconds: number }).seconds,
      (dateTime as { nanoseconds: number }).nanoseconds
    ).toDate()
  }
  if (dateTime instanceof Date) return dateTime
  return null
}

export default function EventDisplay() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  if (!state) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="mx-auto flex max-w-3xl items-center justify-center py-20">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">No event data found</p>
            <Button variant="link" onClick={() => navigate("/dashboard")} className="mt-2">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const event = state
  const isUserGoing = event.attendees?.includes(auth.currentUser?.uid)
  const isFull =
    event.capacity != null && (event.rsvpCount ?? 0) >= event.capacity

  const handleJoin = async () => {
    if (!auth.currentUser) {
      navigate("/login")
      return
    }

    setLoading(true)
    try {
      const eventRef = doc(db, "events", event.id)

      if (isUserGoing) {
        await updateDoc(eventRef, {
          attendees: arrayRemove(auth.currentUser.uid),
          rsvpCount: increment(-1),
        })
      } else {
        await updateDoc(eventRef, {
          attendees: arrayUnion(auth.currentUser.uid),
          rsvpCount: increment(1),
        })
      }

      event.rsvpCount = isUserGoing
        ? (event.rsvpCount ?? 1) - 1
        : (event.rsvpCount ?? 0) + 1

      if (!event.attendees) event.attendees = []
      if (isUserGoing) {
        event.attendees = event.attendees.filter(
          (id: string) => id !== auth.currentUser?.uid
        )
      } else {
        event.attendees.push(auth.currentUser.uid)
      }
    } catch (err) {
      console.error("Error updating RSVP:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sticky navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-1.5"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Host info */}
        <p className="mb-4 text-sm text-muted-foreground">
          Hosted by {event.hostName ?? "Unknown"}
        </p>

        <div className="grid gap-6 lg:grid-cols-2 lg:grid-rows-1">
          {/* Left column — image + title/tags */}
          <div className="flex flex-col gap-4">
            <Card className="overflow-hidden">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={event.imageUrl || "/placeholder.jpg"}
                  alt={event.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h1 className="text-xl font-semibold leading-snug">{event.title}</h1>
                {event.tags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {event.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column — details */}
          <Card>
            <CardHeader>
              <CardTitle>About this event</CardTitle>
              <CardDescription>Event details and logistics</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Date & time */}
              <div className="flex items-center gap-2.5 text-sm">
                <Calendar className="size-4 shrink-0 text-muted-foreground" />
                <span>
                  {event.dateTime
                    ? format(toDate(event.dateTime)!, "EEEE, MMMM d, yyyy · h:mm a")
                    : "Date TBD"}
                </span>
              </div>

              {/* Location */}
              <div className="flex items-center gap-2.5 text-sm">
                <MapPin className="size-4 shrink-0 text-muted-foreground" />
                <span>{event.location ?? "Location TBD"}</span>
              </div>

              {/* Capacity / attendees */}
              <div className="flex items-center gap-2.5 text-sm">
                <Users className="size-4 shrink-0 text-muted-foreground" />
                <span>
                  {event.rsvpCount ?? 0} attending
                  {event.capacity ? ` / ${event.capacity}` : ""}
                </span>
                {isFull && !isUserGoing && (
                  <span className="text-sm font-medium text-destructive">· Full</span>
                )}
              </div>

              <Separator />

              {/* Description */}
              <p className="text-sm leading-relaxed text-muted-foreground">
                {event.description || "No description provided."}
              </p>

              {/* RSVP button */}
              <Button
                className="w-full"
                variant={isUserGoing ? "outline" : "default"}
                disabled={loading || (isFull && !isUserGoing)}
                onClick={handleJoin}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Updating…
                  </>
                ) : isUserGoing ? (
                  "Cancel RSVP"
                ) : isFull ? (
                  "Event is Full"
                ) : (
                  "RSVP to this event"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}