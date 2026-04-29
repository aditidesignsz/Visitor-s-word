/*
 * /api/visitors
 *
 * GET – returns approved public visitor cards.
 *       No feedback is ever included.
 *
 * Query params:
 *   limit  – max records (default 50, cap 200)
 *   offset – pagination offset (default 0)
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { countApprovedVisitors, listPublicVisitors } from "../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Method not allowed.");
  }

  const limit  = Math.min(200, Math.max(1, Number(req.query.limit)  || 50));
  const offset = Math.max(0,              Number(req.query.offset) || 0);

  const [visitors, total] = await Promise.all([
    listPublicVisitors(limit, offset),
    countApprovedVisitors(),
  ]);

  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
  return res.status(200).json({ visitors, total, limit, offset });
}
