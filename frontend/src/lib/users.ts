import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore"
import type { User } from "firebase/auth"
import { db } from "@/firebaseConfig"

export type UserRole = "admin" | "user"

/**
 * Fetch the role stored for a given uid.
 * Falls back to "user" if no document exists.
 */
export async function getUserRole(uid: string): Promise<UserRole> {
  const snap = await getDoc(doc(db, "users", uid))
  return snap.exists() ? (snap.data().role as UserRole) : "user"
}

/**
 * Create a Firestore user document if one does not already exist.
 * Returns the role (existing or newly assigned "user").
 */
export async function ensureUserDoc(user: User): Promise<UserRole> {
  const ref = doc(db, "users", user.uid)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email,
      displayName: user.displayName ?? null,
      role: "user",
      createdAt: serverTimestamp(),
    })
    return "user"
  }

  return snap.data().role as UserRole
}
