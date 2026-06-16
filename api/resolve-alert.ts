import { criticalAlerts, contracts } from "./shared-data";

export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method === "POST") {
    const { alertId, actionCode } = req.body;
    const alert = criticalAlerts.find((a) => a.id === alertId);

    if (alert) {
      if (actionCode === "BLOCK_PAYMENT") {
        alert.blockedPayment = true;
        alert.resolved = true;
        alert.description += " [PAGAMENTO BLOQUEADO PELO AUDITOR]";

        const contract = contracts.find((c) => c.id === alert.contractNumber);
        if (contract) {
          contract.status = "Suspenso";
        }
      } else {
        alert.resolved = true;
        alert.description += " [VERIFICADO / AUDITADO]";
      }
    }

    return res.status(200).json({ success: true, alerts: criticalAlerts, contracts });
  }

  res.status(405).json({ error: "Method not allowed" });
}
