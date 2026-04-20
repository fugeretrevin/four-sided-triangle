import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore"
import type { User } from "firebase/auth"
import { db } from "@/firebaseConfig"

export type UserRole = "superadmin" | "club_leader" | "user"

/** Returns true for roles that can access the admin panel. */
export function isAdminRole(role: UserRole | null): boolean {
  return role === "superadmin" || role === "club_leader"
}

export interface UserProfile {
  role: UserRole
  onboardingComplete: boolean
}

/**
 * Fetch the role stored for a given uid.
 * Falls back to "user" if no document exists.
 */
export async function getUserRole(uid: string): Promise<UserRole> {
  const snap = await getDoc(doc(db, "users", uid))
  return snap.exists() ? (snap.data().role as UserRole) : "user"
}

/**
 * Fetch both the role and onboarding status for a given uid.
 */
export async function getUserProfile(uid: string): Promise<UserProfile> {
  const snap = await getDoc(doc(db, "users", uid))
  if (!snap.exists()) {
    return { role: "user", onboardingComplete: false }
  }
  const data = snap.data()
  return {
    role: (data.role as UserRole) ?? "user",
    onboardingComplete: data.onboardingComplete === true,
  }
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
      tags: [],
      onboardingComplete: false,
      createdAt: serverTimestamp(),
    })
    return "user"
  }

  return snap.data().role as UserRole
}

/**
 * Complete onboarding by saving display name and interest tags.
 */
export async function completeOnboarding(
  uid: string,
  displayName: string,
  tags: string[]
): Promise<void> {
  const ref = doc(db, "users", uid)
  await updateDoc(ref, {
    displayName,
    tags,
    onboardingComplete: true,
  })
}
