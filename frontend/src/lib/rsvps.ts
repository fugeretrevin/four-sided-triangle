import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  updateDoc,
  increment,
  runTransaction,
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

/**
 * RSVP a user to an event.
 * Creates the rsvp document and increments rsvpCount on the event.
 * Uses a transaction to ensure the count stays accurate.
 */
export async function rsvpToEvent(eventId: string, userId: string): Promise<void> {
  const rsvpRef = doc(db, RSVPS_COL, rsvpDocId(eventId, userId))
  const eventRef = doc(db, "events", eventId)

  await runTransaction(db, async (tx) => {
    const rsvpSnap = await tx.get(rsvpRef)
    if (rsvpSnap.exists()) return // already RSVPed — idempotent

    tx.set(rsvpRef, { eventId, userId, createdAt: serverTimestamp() })
    tx.update(eventRef, { rsvpCount: increment(1) })
  })
}

/**
 * Cancel a user's RSVP.
 * Deletes the rsvp document and decrements rsvpCount on the event.
 */
export async function cancelRsvp(eventId: string, userId: string): Promise<void> {
  const rsvpRef = doc(db, RSVPS_COL, rsvpDocId(eventId, userId))
  const eventRef = doc(db, "events", eventId)

  await runTransaction(db, async (tx) => {
    const rsvpSnap = await tx.get(rsvpRef)
    if (!rsvpSnap.exists()) return // not RSVPed — idempotent

    tx.delete(rsvpRef)
    tx.update(eventRef, { rsvpCount: increment(-1) })
  })
}

/** Return all event IDs the user has RSVPed to. */
export async function getUserRsvpedEventIds(userId: string): Promise<string[]> {
  const q = query(collection(db, RSVPS_COL), where("userId", "==", userId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data().eventId as string)
}
