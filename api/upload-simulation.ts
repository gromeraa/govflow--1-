import { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method === "POST") {
    // Simulate upload - for demo purposes
    return res.status(200).json({
      success: true,
      message: "Upload simulado processado com sucesso",
      taskId: "task-" + Math.random().toString(36).substr(2, 9),
    });
  }

  res.status(405).json({ error: "Method not allowed" });
}
