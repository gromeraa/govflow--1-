import { activeTasks } from "./shared-data";

export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // GET /api/processing
  if (req.method === "GET") {
    // Simulate progress update
    activeTasks.forEach((task) => {
      if (task.progress < 100) {
        const increment = Math.floor(Math.random() * 15) + 15;
        task.progress = Math.min(task.progress + increment, 100);

        if (task.progress >= 35 && task.progress < 70) {
          task.statusText = "Comparando cadastros CNPJ...";
        } else if (task.progress >= 70 && task.progress < 90) {
          task.statusText = "Validando assinaturas e hashes...";
        } else if (task.progress >= 90) {
          task.statusText = "Escrevendo relatório final...";
        }
      }
    });

    return res.status(200).json(activeTasks);
  }

  res.status(405).json({ error: "Method not allowed" });
}
