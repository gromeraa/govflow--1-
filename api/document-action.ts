import { VercelRequest, VercelResponse } from "@vercel/node";
import { documents, criticalAlerts } from "./shared-data";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method === "POST") {
    const { docId, action, reviewer } = req.body;
    const doc = documents.find((d) => d.id === docId);

    if (doc) {
      if (action === "approve") {
        doc.status = "Aprovado";
        doc.confidenceScore = Math.max(doc.confidenceScore, 95);
        doc.reviewedBy = reviewer || "Auditor Geral";
        doc.reviewDate = new Date().toISOString();
        doc.warnings = [];

        criticalAlerts.forEach((a) => {
          if (a.contractNumber === doc.contractNumber && a.supplierName === doc.supplierName) {
            a.resolved = true;
          }
        });
      } else if (action === "fail") {
        doc.status = "Rejeitado";
        doc.reviewedBy = reviewer || "Auditor Geral";
        doc.reviewDate = new Date().toISOString();
      }
    }

    return res.status(200).json({ success: true, documents, alerts: criticalAlerts });
  }

  res.status(405).json({ error: "Method not allowed" });
}
