import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { format } from "date-fns"
import {
  Plus,
  Pencil,
  Trash2,
  Ban,
  RefreshCw,
  Calendar,
  MapPin,
  Users,
  CalendarCheck,
  FileText,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getEvents,
  deleteEvent,
  cancelEvent,
  updateEvent,
  type Event,
  type EventStatus,
} from "@/lib/events"

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  EventStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  published: "default",
  draft: "secondary",
  canceled: "destructive",
}

const STATUS_LABEL: Record<EventStatus, string> = {
  published: "Published",
  draft: "Draft",
  canceled: "Canceled",
}

// ── Component ─────────────────────────────────────────────────────────────────

type FilterTab = "all" | EventStatus

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<FilterTab>("all")

  // Delete confirmation dialog state
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getEvents()
      setEvents(data)
    } catch {
      setError("Failed to load events. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  // Client-side filter by selected tab
  const filtered = tab === "all" ? events : events.filter((e) => e.status === tab)

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteEvent(deleteTarget.id)
      setEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      setError("Failed to delete event.")
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleCancel = async (event: Event) => {
    try {
      await cancelEvent(event.id)
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, status: "canceled" } : e))
      )
    } catch {
      setError("Failed to cancel event.")
    }
  }

  const handleRestore = async (event: Event) => {
    try {
      await updateEvent(event.id, { status: "draft" })
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, status: "draft" } : e))
      )
    } catch {
      setError("Failed to restore event.")
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground">
            Manage all events on the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchEvents}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => navigate("/admin/events/new")}>
            <Plus className="size-4" />
            New Event
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total"
          value={events.length}
          icon={<CalendarCheck className="size-4 text-muted-foreground" />}
        />
        <StatCard
          label="Published"
          value={events.filter((e) => e.status === "published").length}
          icon={<CalendarCheck className="size-4 text-green-600" />}
          accent="green"
        />
        <StatCard
          label="Draft"
          value={events.filter((e) => e.status === "draft").length}
          icon={<FileText className="size-4 text-muted-foreground" />}
        />
        <StatCard
          label="Canceled"
          value={events.filter((e) => e.status === "canceled").length}
          icon={<XCircle className="size-4 text-destructive" />}
          accent="red"
        />
      </div>

      {/* Status filter tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="all">
            All
            <span className="ml-1.5 rounded-full bg-background px-1.5 py-0.5 text-xs font-medium">
              {events.length}
            </span>
          </TabsTrigger>
          {(["published", "draft", "canceled"] as EventStatus[]).map((s) => (
            <TabsTrigger key={s} value={s}>
              {STATUS_LABEL[s]}
              <span className="ml-1.5 rounded-full bg-background px-1.5 py-0.5 text-xs font-medium">
                {events.filter((e) => e.status === s).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Events table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <RefreshCw className="mr-2 size-4 animate-spin" />
          Loading events…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-20 text-center text-muted-foreground">
          No events found.{" "}
          {tab === "all" && (
            <button
              className="underline underline-offset-4 hover:text-primary"
              onClick={() => navigate("/admin/events/new")}
            >
              Create the first one
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3 text-center">RSVPs</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((event) => (
                <tr
                  key={event.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  {/* Title */}
                  <td className="max-w-[200px] truncate px-4 py-3 font-medium">
                    {event.title}
                  </td>

                  {/* Date */}
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5 shrink-0" />
                      {event.dateTime
                        ? format(event.dateTime.toDate(), "MMM d, yyyy h:mm a")
                        : "—"}
                    </span>
                  </td>

                  {/* Location */}
                  <td className="max-w-[140px] truncate px-4 py-3 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5 shrink-0" />
                      {event.location || "—"}
                    </span>
                  </td>

                  {/* Tags */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {event.tags?.slice(0, 3).map((t) => (
                        <Badge key={t} variant="outline" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                      {event.tags?.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{event.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* RSVP count */}
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    <span className="flex items-center justify-center gap-1">
                      <Users className="size-3.5" />
                      {event.rsvpCount ?? 0}
                      {event.capacity ? `/${event.capacity}` : ""}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[event.status]}>
                      {STATUS_LABEL[event.status]}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Edit */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Edit"
                        onClick={() =>
                          navigate(`/admin/events/${event.id}/edit`)
                        }
                      >
                        <Pencil className="size-3.5" />
                      </Button>

                      {/* Cancel / Restore */}
                      {event.status !== "canceled" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-orange-500 hover:text-orange-600"
                          title="Cancel event"
                          onClick={() => handleCancel(event)}
                        >
                          <Ban className="size-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-green-600 hover:text-green-700"
                          title="Restore to draft"
                          onClick={() => handleRestore(event)}
                        >
                          <RefreshCw className="size-3.5" />
                        </Button>
                      )}

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        title="Delete"
                        onClick={() => setDeleteTarget(event)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete event?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">
                "{deleteTarget?.title}"
              </span>{" "}
              will be permanently removed. This cannot be undone. Consider
              canceling instead to preserve the record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Keep event
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number
  icon: React.ReactNode
  accent?: "green" | "red"
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p
            className={
              accent === "green"
                ? "text-2xl font-bold text-green-600"
                : accent === "red"
                ? "text-2xl font-bold text-destructive"
                : "text-2xl font-bold"
            }
          >
            {value}
          </p>
        </div>
        {icon}
      </CardContent>
    </Card>
  )
}
