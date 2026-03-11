import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore"
import { db } from "@/firebaseConfig"

// ── Types ────────────────────────────────────────────────────────────────────

export type EventStatus = "published" | "draft" | "canceled"

export interface Event {
  id: string
  title: string
  description: string
  location: string
  dateTime: Timestamp
  tags: string[]
  status: EventStatus
  /** null means no cap */
  capacity: number | null
  rsvpCount: number
  hostId: string
  hostName: string
  /** empty string means no image */
  imageUrl: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

/** Data required to create or update an event (server-managed fields excluded). */
export type EventInput = Omit<Event, "id" | "rsvpCount" | "createdAt" | "updatedAt">

// ── Controlled tag vocabulary ─────────────────────────────────────────────────

export const EVENT_TAGS = [
  "Academic",
  "Arts",
  "Career",
  "Cultural",
  "Food",
  "Gaming",
  "Greek Life",
  "Health",
  "Music",
  "Social",
  "Sports",
  "Technology",
  "Volunteer",
] as const

export type EventTag = (typeof EVENT_TAGS)[number]

// ── Collection reference ──────────────────────────────────────────────────────

const EVENTS_COL = "events"

// ── CRUD helpers ──────────────────────────────────────────────────────────────

/** Fetch all events, optionally filtered by status, ordered by dateTime asc. */
export async function getEvents(status?: EventStatus): Promise<Event[]> {
  const q = status
    ? query(
        collection(db, EVENTS_COL),
        where("status", "==", status),
        orderBy("dateTime", "asc")
      )
    : query(collection(db, EVENTS_COL), orderBy("dateTime", "asc"))

  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event))
}

/** Fetch a single event by Firestore document id. Returns null if not found. */
export async function getEvent(id: string): Promise<Event | null> {
  const snap = await getDoc(doc(db, EVENTS_COL, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Event
}

/** Create a new event and return the generated document id. */
export async function createEvent(data: EventInput): Promise<string> {
  const ref = await addDoc(collection(db, EVENTS_COL), {
    ...data,
    rsvpCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/** Update an existing event's fields (updatedAt is always refreshed). */
export async function updateEvent(
  id: string,
  data: Partial<EventInput>
): Promise<void> {
  await updateDoc(doc(db, EVENTS_COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/** Hard-delete an event document. Prefer cancelEvent for published events. */
export async function deleteEvent(id: string): Promise<void> {
  await deleteDoc(doc(db, EVENTS_COL, id))
}

/** Soft-cancel: sets status to "canceled" without removing the document. */
export async function cancelEvent(id: string): Promise<void> {
  await updateDoc(doc(db, EVENTS_COL, id), {
    status: "canceled",
    updatedAt: serverTimestamp(),
  })
}
