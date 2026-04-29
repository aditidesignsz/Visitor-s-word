/*
 * /api/visit
 *
 * GET    – return the caller's own card (identified by HttpOnly cookie)
 * POST   – create or update a card; accepts name, color, signature, feedback
 * DELETE – delete the caller's card and clear the cookie
 *
 * Feedback is accepted but NEVER returned in responses.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { parse, serialize } from "cookie";
import { createVisitor, deleteVisitor, getVisitorById, toPublic, updateVisitor } from "../../lib/db";
import { isCardColor } from "../../lib/types";
import { validateFeedback, validateName, validateSignature } from "../../lib/validation";

// ─── Cookie helpers ───────────────────────────────────────────────────────────

const COOKIE = "vid";
const YEAR   = 60 * 60 * 24 * 365;

function readId(req: NextApiRequest): string | null {
  return parse(req.headers.cookie ?? "")[COOKIE] ?? null;
}

function setCookie(res: NextApiResponse, id: string) {
  res.setHeader("Set-Cookie", serialize(COOKIE, id, {
    path: "/", maxAge: YEAR,
    httpOnly: true, sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  }));
}

function clearCookie(res: NextApiResponse) {
  res.setHeader("Set-Cookie", serialize(COOKIE, "", {
    path: "/", maxAge: 0,
    httpOnly: true, sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  }));
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  // GET ────────────────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    const id = readId(req);
    if (!id) return res.status(404).end();
    const record = await getVisitorById(id);
    if (!record) return res.status(404).end();
    return res.status(200).json(toPublic(record)); // feedback stripped
  }

  // POST ───────────────────────────────────────────────────────────────────────
  if (req.method === "POST") {
    const body = req.body as Record<string, unknown> ?? {};

    const nameResult = validateName(body.name);
    if (!nameResult.ok) return res.status(nameResult.status).send(nameResult.message);

    if (!isCardColor(body.color)) return res.status(400).send("Invalid color.");

    const sigResult = validateSignature(body.signature);
    if (!sigResult.ok) return res.status(sigResult.status).send(sigResult.message);

    const fbResult = validateFeedback(body.feedback);
    if (!fbResult.ok) return res.status(fbResult.status).send(fbResult.message);

    const existingId = readId(req);

    if (existingId) {
      // Returning visitor — update in place, keep same number.
      const updated = await updateVisitor(existingId, {
        name:      nameResult.value,
        color:     body.color as string as typeof body.color & string,
        signature: sigResult.value,
        feedback:  fbResult.value,
      });
      if (updated) {
        return res.status(200).json(toPublic(updated)); // feedback stripped
      }
      // Cookie was stale — fall through to create a new record.
    }

    // New visitor.
    const created = await createVisitor({
      name:      nameResult.value,
      color:     body.color as string as typeof body.color & string,
      signature: sigResult.value,
      feedback:  fbResult.value,
    });
    setCookie(res, created.id);
    return res.status(201).json(toPublic(created)); // feedback stripped
  }

  // DELETE ─────────────────────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    const id = readId(req);
    if (!id) return res.status(404).end();
    await deleteVisitor(id);
    clearCookie(res);
    return res.status(200).end();
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).send("Method not allowed.");
}
