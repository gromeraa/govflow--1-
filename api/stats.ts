import { documents, contracts } from "./shared-data";

export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method === "GET") {
    const totalDocs = documents.length;
    const validated = documents.filter((d) => d.status === "Aprovado").length;
    const failed = documents.filter((d) => d.status === "Inconsistência").length;
    const reviews = documents.filter((d) => d.status === "Aguardando Revisão").length;

    const totalConf = documents.reduce((acc, curr) => acc + curr.confidenceScore, 0);
    const avgConf = totalDocs > 0 ? Math.round(totalConf / totalDocs) : 0;

    const totalContVolume = contracts.reduce((acc, curr) => acc + curr.totalValue, 0);
    const totalValValue = documents
      .filter((d) => d.status === "Aprovado")
      .reduce((acc, curr) => acc + curr.value, 0);

    const compliance = totalDocs > 0 ? Math.round((validated / totalDocs) * 100) : 100;

    const stats: any = {
      totalDocuments: totalDocs,
      validatedCount: validated,
      failedCount: failed,
      reviewNeededCount: reviews,
      averageConfidence: avgConf,
      totalContractVolume: totalContVolume,
      totalValidatedValue: totalValValue,
      complianceRate: compliance,
    };

    return res.status(200).json(stats);
  }

  res.status(405).json({ error: "Method not allowed" });
}
