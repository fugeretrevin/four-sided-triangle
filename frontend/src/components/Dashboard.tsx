import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { format } from "date-fns"
import {
  Calendar,
  MapPin,
  Users,
  LogOut,
  X,
  Loader2,
} from "lucide-react"
import logo from "@/assets/logo_v1.png"
import { cn } from "@/lib/utils"
import { auth } from "@/firebaseConfig"
import { useAuth } from "@/contexts/AuthContext"
import { getEvents, EVENT_TAGS, type Event } from "@/lib/events"
import { getUserRsvpedEventIds, rsvpToEvent, cancelRsvp } from "@/lib/rsvps"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ── Gradient palette for cards without cover images ───────────────────────────

const CARD_GRADIENTS = [
  "from-blue-500/20 to-indigo-500/20",
  "from-rose-400/20 to-orange-400/20",
  "from-emerald-400/20 to-teal-400/20",
  "from-amber-400/20 to-yellow-300/20",
  "from-violet-400/20 to-purple-400/20",
  "from-sky-400/20 to-cyan-400/20",
]

function cardGradient(title: string): string {
  return CARD_GRADIENTS[title.charCodeAt(0) % CARD_GRADIENTS.length]
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [events, setEvents] = useState<Event[]>([])
  const [rsvpedIds, setRsvpedIds] = useState<Set<string>>(new Set())
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<"discover" | "my-rsvps">("discover")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null)
  //const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  // Load published events + current user's RSVP set
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const [eventsData, rsvpIds] = await Promise.all([
          getEvents("published"),
          user ? getUserRsvpedEventIds(user.uid) : Promise.resolve([]),
        ])
        setEvents(eventsData)
        setRsvpedIds(new Set(rsvpIds))
      } catch {
        setLoadError("Could not load events. Check your Firestore security rules allow authenticated reads on the events collection.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  // Keep the detail modal in sync when rsvpCount updates locally
  /*useEffect(() => {
    if (selectedEvent) {
      const updated = events.find((e) => e.id === selectedEvent.id)
      if (updated) setSelectedEvent(updated)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events])*/

  const handleLogout = async () => {
    await auth.signOut()
    navigate("/login")
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  /** RSVP or cancel RSVP — stops event propagation so card click doesn't fire. */
  const handleRsvp = async (event: Event, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user || rsvpLoading) return
    setRsvpLoading(event.id)
    try {
      if (rsvpedIds.has(event.id)) {
        await cancelRsvp(event.id, user.uid)
        setRsvpedIds((prev) => {
          const next = new Set(prev)
          next.delete(event.id)
          return next
        })
        setEvents((prev) =>
          prev.map((e) =>
            e.id === event.id
              ? { ...e, rsvpCount: Math.max(0, (e.rsvpCount ?? 1) - 1) }
              : e
          )
        )
      } else {
        await rsvpToEvent(event.id, user.uid)
        setRsvpedIds((prev) => new Set([...prev, event.id]))
        setEvents((prev) =>
          prev.map((e) =>
            e.id === event.id ? { ...e, rsvpCount: (e.rsvpCount ?? 0) + 1 } : e
          )
        )
      }
    } catch (err) {
      console.error("RSVP failed:", err)
      setLoadError("RSVP failed. Please try again.")
    } finally {
      setRsvpLoading(null)
    }
  }

  const filteredEvents =
    selectedTags.length === 0
      ? events
      : events.filter((e) => e.tags?.some((t) => selectedTags.includes(t)))

  const myEvents = [...events]
    .filter((e) => rsvpedIds.has(e.id))
    .sort((a, b) => {
      if (!a.dateTime || !b.dateTime) return 0
      return a.dateTime.toMillis() - b.dateTime.toMillis()
    })

  const firstName = user?.displayName?.split(" ")[0] ?? null

  return (
    <div className="min-h-screen bg-muted/30">
      {/* ── Sticky navbar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 font-semibold">
            <img src={logo} alt="Connect Four" className="h-10 w-10 rounded-md object-cover" />
            <span className="hidden sm:inline">Connect Four</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {user?.displayName ?? user?.email}
            </span>
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {(user?.displayName ?? user?.email ?? "U")[0].toUpperCase()}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Page content ──────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Header + tab switcher */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {firstName ? `Hi, ${firstName} 👋` : "Events"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Discover events happening at your campus
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          >
            <TabsList>
              <TabsTrigger value="discover">Discover</TabsTrigger>
              <TabsTrigger value="my-rsvps">
                My RSVPs
                {rsvpedIds.size > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground">
                    {rsvpedIds.size}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* ── Discover tab ──────────────────────────────────── */}
        {activeTab === "discover" && (
          <>
            {loadError && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {loadError}
              </div>
            )}

            {/* Tag filter chips */}
            <div className="mb-6 flex flex-wrap gap-2">
              <FilterChip
                label="All"
                active={selectedTags.length === 0}
                onClick={() => setSelectedTags([])}
              />
              {EVENT_TAGS.map((tag) => (
                <FilterChip
                  key={tag}
                  label={tag}
                  active={selectedTags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                />
              ))}
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-background py-20 text-center">
                <p className="text-sm text-muted-foreground">
                  No events match your filters.
                </p>
                {selectedTags.length > 0 && (
                  <button
                    className="mt-2 text-sm text-primary underline underline-offset-4"
                    onClick={() => setSelectedTags([])}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isRsvped={rsvpedIds.has(event.id)}
                    rsvpLoading={rsvpLoading === event.id}
                    onRsvp={handleRsvp}
                    onClick={() => navigate("/event", { state: event })}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── My RSVPs tab ──────────────────────────────────── */}
        {activeTab === "my-rsvps" && (
          <>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : myEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-background py-20 text-center">
                <p className="text-sm text-muted-foreground">
                  You haven&apos;t RSVPed to any events yet.
                </p>
                <button
                  className="mt-2 text-sm text-primary underline underline-offset-4"
                  onClick={() => setActiveTab("discover")}
                >
                  Browse events
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {myEvents.map((event) => (
                  <RsvpListItem
                    key={event.id}
                    event={event}
                    rsvpLoading={rsvpLoading === event.id}
                    onCancel={(e) => handleRsvp(event, e)}
                    onClick={() => navigate("/event", { state: event })}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Event detail modal ────────────────────────────────── */}
      {/*<Dialog
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        {selectedEvent && (
          <EventDetailContent
            event={selectedEvent}
            isRsvped={rsvpedIds.has(selectedEvent.id)}
            rsvpLoading={rsvpLoading === selectedEvent.id}
            onRsvp={(e) => handleRsvp(selectedEvent, e)}
          />
        )}
      </Dialog>*/}
    </div>
  )
}

// ── FilterChip ────────────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground"
      )}
    >
      {label}
    </button>
  )
}

// ── EventCard ─────────────────────────────────────────────────────────────────

function EventCard({
  event,
  isRsvped,
  rsvpLoading,
  onRsvp,
  onClick,
}: {
  event: Event
  isRsvped: boolean
  rsvpLoading: boolean
  onRsvp: (event: Event, e: React.MouseEvent) => void
  onClick: () => void
}) {
  const isFull =
    event.capacity != null && (event.rsvpCount ?? 0) >= event.capacity

  return (
    <Card
      className="group cursor-pointer overflow-hidden border transition-all hover:shadow-md"
      onClick={onClick}
    >
      {event.imageUrl ? (
        <div className="h-40 overflow-hidden">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className={cn("h-40 bg-gradient-to-br", cardGradient(event.title))} />
      )}

      <CardContent className="flex flex-col gap-3 p-4">
        <h3 className="line-clamp-2 font-semibold leading-snug">{event.title}</h3>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          {event.dateTime && (
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5 shrink-0" />
              {format(event.dateTime.toDate(), "MMM d, yyyy · h:mm a")}
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>

        {event.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {event.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{event.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            {event.rsvpCount ?? 0}
            {event.capacity ? `/${event.capacity}` : " going"}
          </span>
          <Button
            size="sm"
            variant={isRsvped ? "secondary" : "default"}
            disabled={rsvpLoading || (isFull && !isRsvped)}
            onClick={(e) => onRsvp(event, e)}
            className="h-7 px-3 text-xs"
          >
            {rsvpLoading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : isRsvped ? (
              "✓ Going"
            ) : isFull ? (
              "Full"
            ) : (
              "RSVP"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── RsvpListItem ──────────────────────────────────────────────────────────────

function RsvpListItem({
  event,
  rsvpLoading,
  onCancel,
  onClick,
}: {
  event: Event
  rsvpLoading: boolean
  onCancel: (e: React.MouseEvent) => void
  onClick: () => void
}) {
  const isPast = event.dateTime && event.dateTime.toDate() < new Date()

  return (
    <div
      className={cn(
        "flex cursor-pointer items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/30",
        isPast && "opacity-60"
      )}
      onClick={onClick}
    >
      {event.imageUrl ? (
        <img
          src={event.imageUrl}
          alt=""
          className="size-14 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div
          className={cn(
            "size-14 shrink-0 rounded-lg bg-gradient-to-br",
            cardGradient(event.title)
          )}
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{event.title}</p>
          {isPast && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              Past
            </Badge>
          )}
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3.5 shrink-0" />
          {event.dateTime
            ? format(event.dateTime.toDate(), "MMM d, yyyy · h:mm a")
            : "—"}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{event.location}</span>
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        disabled={rsvpLoading}
        onClick={onCancel}
        title="Cancel RSVP"
      >
        {rsvpLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <X className="size-4" />
        )}
      </Button>
    </div>
  )
}
