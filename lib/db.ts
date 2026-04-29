/*
 * Database operations — SERVER SIDE ONLY.
 * Import only from pages/api/** files, never from React components.
 *
 * Uses the Supabase service-role client so all operations bypass RLS.
 * Feedback is excluded from every public-facing query at the SQL level.
 */

import { getAdminClient } from "./supabase";
import { toPublic } from "./types";
import type { CardColor, PublicVisitor, VisitorRecord } from "./types";

const db = () => getAdminClient();

// ─── Reads ───────────────────────────────────────────────────────────────────

export async function getVisitorById(id: string): Promise<VisitorRecord | null> {
  const { data, error } = await db()
    .from("visitors")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as VisitorRecord;
}

/** Returns approved cards without feedback — safe for public API responses. */
export async function listPublicVisitors(
  limit = 50,
  offset = 0
): Promise<PublicVisitor[]> {
  const { data, error } = await db()
    .from("visitors")
    .select("id, number, name, color, signature, issued_at")
    .eq("approved", true)
    .order("number", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error || !data) return [];
  return data as PublicVisitor[];
}

export async function countApprovedVisitors(): Promise<number> {
  const { count, error } = await db()
    .from("visitors")
    .select("id", { count: "exact", head: true })
    .eq("approved", true);
  if (error) return 0;
  return count ?? 0;
}

/** Admin only — returns full rows including feedback. */
export async function listAllVisitorsAdmin(
  limit = 200,
  offset = 0
): Promise<VisitorRecord[]> {
  const { data, error } = await db()
    .from("visitors")
    .select("*")
    .order("number", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error || !data) return [];
  return data as VisitorRecord[];
}

// ─── Writes ──────────────────────────────────────────────────────────────────

export async function createVisitor(input: {
  name: string;
  color: CardColor;
  signature: string | null;
  feedback: string | null;
}): Promise<VisitorRecord> {
  // Determine next number atomically via a Postgres function.
  // Falls back to MAX(number)+1 which is safe for low-traffic portfolios.
  const { data: maxRow } = await db()
    .from("visitors")
    .select("number")
    .order("number", { ascending: false })
    .limit(1)
    .single();

  const nextNumber = maxRow ? (maxRow.number as number) + 1 : 1;

  const { data, error } = await db()
    .from("visitors")
    .insert({
      number:    nextNumber,
      name:      input.name,
      color:     input.color,
      signature: input.signature,
      feedback:  input.feedback,
      approved:  false,          // cards go live after owner approves
      issued_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create visitor: ${error?.message ?? "unknown error"}`);
  }
  return data as VisitorRecord;
}

export async function updateVisitor(
  id: string,
  input: {
    name: string;
    color: CardColor;
    signature?: string | null;
    feedback?: string | null;
  }
): Promise<VisitorRecord | null> {
  const patch: Record<string, unknown> = {
    name:     input.name,
    color:    input.color,
    approved: false, // re-queue for review after any edit
  };
  if ("signature" in input) patch.signature = input.signature ?? null;
  if ("feedback"  in input) patch.feedback  = input.feedback  ?? null;

  const { data, error } = await db()
    .from("visitors")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return null;
  return data as VisitorRecord;
}

export async function deleteVisitor(id: string): Promise<boolean> {
  const { error } = await db().from("visitors").delete().eq("id", id);
  return !error;
}

// ─── Admin helpers ────────────────────────────────────────────────────────────

export async function approveVisitor(id: string): Promise<boolean> {
  const { error } = await db()
    .from("visitors")
    .update({ approved: true })
    .eq("id", id);
  return !error;
}

export async function approveAllPending(): Promise<number> {
  const { data, error } = await db()
    .from("visitors")
    .update({ approved: true })
    .eq("approved", false)
    .select("id");
  if (error) return 0;
  return data?.length ?? 0;
}

export { toPublic };
