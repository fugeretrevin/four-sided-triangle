import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  updateDoc,
  increment,
  type Timestamp,
} from "firebase/firestore"
import { db } from "@/firebaseConfig"

export interface Rsvp {
  eventId: string
  userId: string
  createdAt: Timestamp
}

const RSVPS_COL = "rsvps"

function rsvpDocId(eventId: string, userId: string): string {
  return `${eventId}_${userId}`
}

/** Check whether a user has already RSVPed to an event. */
export async function hasRsvped(eventId: string, userId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, RSVPS_COL, rsvpDocId(eventId, userId)))
  return snap.exists()
}

/**
 * RSVP a user to an event.
 * Creates the rsvp document and atomically increments rsvpCount on the event.
 * No-ops if the user has already RSVPed.
 */
export async function rsvpToEvent(eventId: string, userId: string): Promise<void> {
  const rsvpRef = doc(db, RSVPS_COL, rsvpDocId(eventId, userId))
  const snap = await getDoc(rsvpRef)
  if (snap.exists()) return // already RSVPed — idempotent

  await setDoc(rsvpRef, { eventId, userId, createdAt: serverTimestamp() })
  await updateDoc(doc(db, "events", eventId), { rsvpCount: increment(1) })
}

/**
 * Cancel a user's RSVP.
 * Deletes the rsvp document and atomically decrements rsvpCount on the event.
 * No-ops if the user hasn't RSVPed.
 */
export async function cancelRsvp(eventId: string, userId: string): Promise<void> {
  const rsvpRef = doc(db, RSVPS_COL, rsvpDocId(eventId, userId))
  const snap = await getDoc(rsvpRef)
  if (!snap.exists()) return // not RSVPed — idempotent

  await deleteDoc(rsvpRef)
  await updateDoc(doc(db, "events", eventId), { rsvpCount: increment(-1) })
}

/** Return all event IDs the user has RSVPed to. */
export async function getUserRsvpedEventIds(userId: string): Promise<string[]> {
  const q = query(collection(db, RSVPS_COL), where("userId", "==", userId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data().eventId as string)
}
