import { VercelRequest, VercelResponse } from "@vercel/node";
import { documents, activeTasks, criticalAlerts, contracts, settings } from "./shared-data";
import type { GovFlowStats } from "../src/types";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // GET /api/documents
  if (req.method === "GET") {
    return res.status(200).json(documents);
  }

  res.status(405).json({ error: "Method not allowed" });
}
