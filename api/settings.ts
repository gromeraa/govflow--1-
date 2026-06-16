import { settings } from "./shared-data";

export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // GET /api/settings
  if (req.method === "GET") {
    return res.status(200).json(settings);
  }

  // POST /api/settings
  if (req.method === "POST") {
    const body = req.body;
    Object.assign(settings, body);
    return res.status(200).json(settings);
  }

  res.status(405).json({ error: "Method not allowed" });
}
