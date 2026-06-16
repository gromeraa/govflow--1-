/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { Document, ActiveTask, CriticalAlert, Contract, GovFlowStats } from "./src/types";

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = 3000;

// Middleware configurations
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini AI client successfully initialized server-side.");
  } catch (error) {
    console.error("Failed to initialize Gemini Client:", error);
  }
} else {
  console.log("No valid GEMINI_API_KEY found. Running in simulation fallback mode.");
}

// Global in-memory DB
let documents: Document[] = [
  {
    id: "doc-101",
    supplierName: "MedTech Suprimentos Hospitalares S.A.",
    cnpj: "12.345.678/0001-99",
    contractNumber: "CT-2023-045",
    documentType: "NF-e 88234",
    status: "Aprovado",
    confidenceScore: 98,
    uploadDate: "2026-06-12T15:30:00Z",
    value: 12540.00,
    extractedFields: {
      "Razão Social": "MedTech Suprimentos Hospitalares S.A.",
      "CNPJ": "12.345.678/0001-99",
      "Número do Contrato": "CT-2023-045",
      "Tipo de Documento": "Nota Fiscal Eletrônica (NF-e)",
      "Número do Documento": "88234",
      "Data de Emissão": "10/06/2026",
      "Valor Total": "R$ 12.540,00",
      "Confirmação de Assinatura": "Presente e Válida"
    },
    warnings: [],
    checks: [
      { id: "c1", name: "Validação de CNPJ", description: "Verifica se o CNPJ é ativo e cadastrado", status: "success", details: "CNPJ 12.345.678/0001-99 regular" },
      { id: "c2", name: "Verificação de Margem de Valor", description: "Verifica se o valor está dentro do saldo contratual", status: "success", details: "Valor R$ 12.540,00 compatível" },
      { id: "c3", name: "Conformidade Fiscal", description: "Valida assinaturas eletrônicas das notas fiscais", status: "success", details: "Assinatura digital válida (ICP-Brasil)" }
    ]
  },
  {
    id: "doc-102",
    supplierName: "Construtora Alfa S.A.",
    cnpj: "98.765.432/0001-11",
    contractNumber: "CT-2022-112",
    documentType: "CND Municipal",
    status: "Inconsistência",
    confidenceScore: 45,
    uploadDate: "2026-06-14T09:15:00Z",
    value: 0.00,
    extractedFields: {
      "Razão Social": "Construtora Alfa S.A.",
      "CNPJ": "98.765.432/0001-11",
      "Número do Contrato": "CT-2022-112",
      "Tipo de Documento": "Certidão Negativa de Débitos Municipais (CND)",
      "Número do Documento": "CND-9923MC",
      "Data de Emissão": "12/12/2025",
      "Validade da Certidão": "12/06/2026 (Expirou há 3 dias)",
      "Situação Cadastral": "Apresenta pendências na Secretaria de Finanças"
    },
    warnings: ["A certidão de débitos municipal encontra-se expirada.", "Incompatibilidade de datas de validade."],
    checks: [
      { id: "c1", name: "Validação de CNPJ", description: "Verifica se o CNPJ é ativo e cadastrado", status: "success", details: "CNPJ 98.765.432/0001-11 regular" },
      { id: "c2", name: "Análise de Data de Validade", description: "Verifica se os certificados e certidões estão no prazo de vigência", status: "error", details: "Certidão expirou em 12/06/2026" },
      { id: "c3", name: "Detecção de Rasuras", description: "Análise de legibilidade e consistência física do documento", status: "warn", details: "Baixa resolução na área de autenticação" }
    ]
  },
  {
    id: "doc-103",
    supplierName: "TechGov Soluções TI Ltda",
    cnpj: "45.678.901/0001-22",
    contractNumber: "CT-2024-002",
    documentType: "CND FGTS",
    status: "Aguardando Revisão",
    confidenceScore: 82,
    uploadDate: "2026-06-15T11:45:00Z",
    value: 0.00,
    extractedFields: {
      "Razão Social": "TechGov Soluções TI Ltda",
      "CNPJ": "45.678.901/0001-22",
      "Número do Contrato": "CT-2024-002",
      "Tipo de Documento": "CRF - Certificado de Regularidade do FGTS",
      "Número do Certificado": "FGTS-88712",
      "Data de Emissão": "15/05/2026",
      "Validade da Certidão": "15/08/2026",
      "Autenticidade": "Pendente de validação cruzada da chave com a Caixa"
    },
    warnings: ["Verificação automática com o portal da Caixa Econômica Federal falhou por indisponibilidade temporária."],
    checks: [
      { id: "c1", name: "Validação de CNPJ", description: "Verifica se o CNPJ é ativo e cadastrado", status: "success", details: "CNPJ 45.678.901/0001-22 ativo" },
      { id: "c2", name: "Análise de Data de Validade", description: "Verifica se os certificados e certidões estão no prazo de vigência", status: "success", details: "Válido até 15/08/2026" },
      { id: "c3", name: "Consulta de Autenticidade", description: "Validação síncrona com os servidores do Governo Federal", status: "warn", details: "Portal da CEF inacessível durante análise" }
    ]
  },
  {
    id: "doc-104",
    supplierName: "Limpeza & Cia Serv. de Conservação",
    cnpj: "78.901.234/0001-88",
    contractNumber: "CT-2023-089",
    documentType: "Relatório de Horas",
    status: "Aprovado",
    confidenceScore: 95,
    uploadDate: "2026-06-14T17:00:00Z",
    value: 4200.00,
    extractedFields: {
      "Razão Social": "Limpeza & Cia Serv. de Conservação",
      "CNPJ": "78.901.234/0001-88",
      "Número do Contrato": "CT-2023-089",
      "Tipo de Documento": "Relatório Mensal de Prestação de Horas Trabalhadas",
      "Período de Referência": "Maio/2026",
      "Total de Horas Declaradas": "160 horas",
      "Valor Estimado": "R$ 4.200,00",
      "Confirmação de Assinatura": "Gestor de Contratos do Município assinou"
    },
    warnings: [],
    checks: [
      { id: "c1", name: "Validação de CNPJ", description: "Verifica se o CNPJ é ativo e cadastrado", status: "success", details: "CNPJ 78.901.234/0001-88 ativo" },
      { id: "c2", name: "Validação de Assinatura Manual", description: "Confirma assinaturas eletrônicas ou físicas dos supervisores", status: "success", details: "Assinatura do fiscal autorizada" },
      { id: "c3", name: "Soma de Planilhas", description: "Re-cálculo automático das planilhas de horas anexadas", status: "success", details: "Total de 160h bate com dados diários" }
    ]
  }
];

let activeTasks: ActiveTask[] = [
  {
    id: "task-001",
    documentName: "NF-2023-991.pdf",
    supplierName: "MedTech Suprimentos Hospitalares S.A.",
    progress: 65,
    statusText: "Extraindo dados estruturados...",
    documentType: "NF-e"
  },
  {
    id: "task-002",
    documentName: "CND_Federal.xml",
    supplierName: "Limpeza & Cia Serv. de Conservação",
    progress: 30,
    statusText: "Consultando base da Receita...",
    documentType: "CND Federal"
  }
];

let criticalAlerts: CriticalAlert[] = [
  {
    id: "alert-1",
    type: "expired_certificate",
    title: "Certidão Vencida",
    description: "Detectada para Construtora Alfa (CND Municipal venceu há 3 dias).",
    severity: "high",
    actionLabel: "Bloquear Pagamento",
    actionCode: "BLOCK_PAYMENT",
    supplierName: "Construtora Alfa S.A.",
    contractNumber: "CT-2022-112",
    resolved: false,
    blockedPayment: false
  },
  {
    id: "alert-2",
    type: "value_mismatch",
    title: "Divergência de Valores",
    description: "Nota Fiscal de MedTech (NF-e 88234) apresenta valor 15% acima do limite de empenho mensal planejado.",
    severity: "medium",
    actionLabel: "Auditar Divergência",
    actionCode: "AUDIT_DIVERGENCE",
    supplierName: "MedTech Suprimentos Hospitalares S.A.",
    contractNumber: "CT-2023-045",
    resolved: false
  }
];

let contracts: Contract[] = [
  {
    id: "CT-2023-045",
    supplierName: "MedTech Suprimentos Hospitalares S.A.",
    title: "Fornecimento de Insumos Médicos e Descartáveis Hospitalares",
    totalValue: 250000.00,
    allocatedValue: 182300.00,
    startDate: "2023-05-10",
    endDate: "2027-05-10",
    status: "Ativo"
  },
  {
    id: "CT-2022-112",
    supplierName: "Construtora Alfa S.A.",
    title: "Reforma Estrutural da Ala Norte e Almoxarifado Central",
    totalValue: 1200000.00,
    allocatedValue: 980000.00,
    startDate: "2022-01-15",
    endDate: "2026-11-30",
    status: "Ativo"
  },
  {
    id: "CT-2024-002",
    supplierName: "TechGov Soluções TI Ltda",
    title: "Prestação de Serviços de Hospedagem em Nuvem e Suporte Técnico Corporativo",
    totalValue: 480000.00,
    allocatedValue: 120000.00,
    startDate: "2024-01-01",
    endDate: "2028-01-01",
    status: "Ativo"
  },
  {
    id: "CT-2023-089",
    supplierName: "Limpeza & Cia Serv. de Conservação",
    title: "Serviços Contínuos de Conservação, Limpeza, Copa e Portaria Predial",
    totalValue: 350000.00,
    allocatedValue: 215000.00,
    startDate: "2023-09-01",
    endDate: "2026-09-01",
    status: "Ativo"
  }
];

let settings = {
  strictnessThreshold: 80,
  autoProcessEnabled: true,
  alertOnLowConfidence: true,
  allowedFormats: ["pdf", "xml", "png", "jpeg"],
  activeAIModel: "gemini-3.5-flash"
};

// Simulation Tick Rule - Increments active tasks' progress automatically
setInterval(() => {
  activeTasks = activeTasks.map(task => {
    if (task.progress < 100) {
      const nextProgress = task.progress + Math.floor(Math.random() * 15) + 15;
      const progress = Math.min(nextProgress, 100);
      let statusText = task.statusText;
      
      if (progress >= 35 && progress < 70) {
        statusText = "Comparando cadastros CNPJ...";
      } else if (progress >= 70 && progress < 90) {
        statusText = "Validando assinaturas e hashes...";
      } else if (progress >= 90) {
        statusText = "Escrevendo relatório final...";
      }

      return {
        ...task,
        progress,
        statusText
      };
    }
    return task;
  });

  // Resolve 100% progress tasks and transition to processed documents
  const completed = activeTasks.filter(task => task.progress >= 100);
  if (completed.length > 0) {
    completed.forEach(task => {
      // Create document entry
      const doubleVal = task.documentType === "NF-e" ? (Math.floor(Math.random() * 25000) + 1500) : 0;
      const generatedId = "doc-" + Math.floor(Math.random() * 1000 + 400);
      const isApprovedValue = Math.random() > 0.35;
      const confidence = Math.floor(Math.random() * 20) + 79; // 79% to 98%

      const newDoc: Document = {
        id: generatedId,
        supplierName: task.supplierName || "Fornecedor Autônomo S.A.",
        cnpj: "18.243.511/0001-44",
        contractNumber: "CT-2023-045",
        documentType: `${task.documentType} ${Math.floor(Math.random() * 90000 + 10000)}`,
        status: isApprovedValue ? "Aprovado" : "Aguardando Revisão",
        confidenceScore: confidence,
        uploadDate: new Date().toISOString(),
        value: doubleVal,
        extractedFields: {
          "Razão Social": task.supplierName || "Fornecedor Autônomo S.A.",
          "CNPJ": "18.243.511/0001-44",
          "Número do Contrato": "CT-2023-045",
          "Tipo de Documento": task.documentType,
          "Chave de Acesso": "35260618243511000144550010000" + Math.floor(Math.random() * 90000 + 10000),
          "Valor Declarado": doubleVal > 0 ? `R$ ${doubleVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00",
          "Checksum de Validação": "SHA256-" + Math.floor(Math.random() * 99999 + 11111)
        },
        warnings: isApprovedValue ? [] : ["Autenticação remota do selo cartorário expirou há poucos dias."],
        checks: [
          { id: "c1", name: "Inscrição Estadual", description: "Verifica o CNPJ perante o Sintegra", status: "success", details: "CNPJ 18.243.511/0001-44 regular" },
          { id: "c2", name: "Análise de Assinatura Digital", description: "Certificado digital ICP-Brasil", status: "success", details: "Signatário verificado com sucesso" },
          { id: "c3", name: "Certidão de FGTS", description: "Validar certidão FGTS conjunta com Caixa", status: isApprovedValue ? "success" : "warn", details: isApprovedValue ? "FGTS regularizado" : "Inconsistência leve na CEF" }
        ]
      };

      documents.unshift(newDoc);

      // Create an alert occasionally if status is bad
      if (!isApprovedValue) {
        criticalAlerts.unshift({
          id: "alert-" + Math.floor(Math.random() * 1000 + 100),
          type: "compliance_fail",
          title: "Validação Incerta",
          description: `Análise do documento ${task.documentName} apontou inconsistências estruturais no CNPJ.`,
          severity: "medium",
          actionLabel: "Auditar Divergência",
          actionCode: "AUDIT_DIVERGENCE",
          supplierName: newDoc.supplierName,
          contractNumber: newDoc.contractNumber,
          resolved: false
        });
      }
    });

    activeTasks = activeTasks.filter(task => task.progress < 100);
  }
}, 3000);

// API Endpoints

// 1. Get documents list
app.get("/api/documents", (req, res) => {
  res.json(documents);
});

// 2. Get active processing tasks
app.get("/api/processing", (req, res) => {
  res.json(activeTasks);
});

// 3. Get alerts
app.get("/api/alerts", (req, res) => {
  res.json(criticalAlerts);
});

// 4. Get contracts
app.get("/api/contracts", (req, res) => {
  res.json(contracts);
});

// 5. Get settings
app.get("/api/settings", (req, res) => {
  res.json(settings);
});

// 6. Update settings
app.post("/api/settings", (req, res) => {
  settings = { ...settings, ...req.body };
  res.json(settings);
});

// 7. Get calculated stats for graphs
app.get("/api/stats", (req, res) => {
  const totalDocs = documents.length;
  const validated = documents.filter(d => d.status === "Aprovado").length;
  const failed = documents.filter(d => d.status === "Inconsistência").length;
  const reviews = documents.filter(d => d.status === "Aguardando Revisão").length;

  const totalConf = documents.reduce((acc, curr) => acc + curr.confidenceScore, 0);
  const avgConf = totalDocs > 0 ? Math.round(totalConf / totalDocs) : 0;

  const totalContVolume = contracts.reduce((acc, curr) => acc + curr.totalValue, 0);
  const totalValValue = documents
    .filter(d => d.status === "Aprovado")
    .reduce((acc, curr) => acc + curr.value, 0);

  const compliance = totalDocs > 0 ? Math.round((validated / totalDocs) * 100) : 100;

  const stats: GovFlowStats = {
    totalDocuments: totalDocs,
    validatedCount: validated,
    failedCount: failed,
    reviewNeededCount: reviews,
    averageConfidence: avgConf,
    totalContractVolume: totalContVolume,
    totalValidatedValue: totalValValue,
    complianceRate: compliance
  };

  res.json(stats);
});

// 8. Resolve/Action alert
app.post("/api/resolve-alert", (req, res) => {
  const { alertId, actionCode } = req.body;
  const alert = criticalAlerts.find(a => a.id === alertId);
  
  if (alert) {
    if (actionCode === "BLOCK_PAYMENT") {
      alert.blockedPayment = true;
      alert.resolved = true;
      alert.description += " [PAGAMENTO BLOQUEADO PELO AUDITOR]";
      
      // Update contract state optionally
      const contract = contracts.find(c => c.id === alert.contractNumber);
      if (contract) {
        contract.status = "Suspenso";
      }
    } else {
      alert.resolved = true;
      alert.description += " [VERIFICADO / AUDITADO]";
    }
  }

  res.json({ success: true, alerts: criticalAlerts, contracts });
});

// 9. Document action: approve / review from UI details tab
app.post("/api/document-action", (req, res) => {
  const { docId, action, reviewer } = req.body;
  const doc = documents.find(d => d.id === docId);

  if (doc) {
    if (action === "approve") {
      doc.status = "Aprovado";
      doc.confidenceScore = Math.max(doc.confidenceScore, 95);
      doc.reviewedBy = reviewer || "Auditor Geral";
      doc.reviewDate = new Date().toISOString();
      doc.warnings = [];
      // Resolve any corresponding alerts
      criticalAlerts = criticalAlerts.map(a => {
        if (a.contractNumber === doc.contractNumber && a.supplierName === doc.supplierName) {
          return { ...a, resolved: true };
        }
        return a;
      });
    } else if (action === "fail") {
      doc.status = "Inconsistência";
      doc.reviewedBy = reviewer || "Auditor Geral";
      doc.reviewDate = new Date().toISOString();
      
      // Trigger critical alert
      criticalAlerts.unshift({
        id: "alert-" + Math.floor(Math.random() * 1000 + 400),
        type: "compliance_fail",
        title: "Reprovado por Auditor",
        description: `O documento ${doc.documentType} foi reprovado manualmente pelo auditor ${reviewer}.`,
        severity: "high",
        actionLabel: "Bloquear Pagamento",
        actionCode: "BLOCK_PAYMENT",
        supplierName: doc.supplierName,
        contractNumber: doc.contractNumber,
        resolved: false
      });
    }
  }

  res.json({ success: true, documents, alerts: criticalAlerts });
});

// 10. Start manual simulation task (e.g. user drags and drops or clicks templates)
app.post("/api/upload-simulation", (req, res) => {
  const { docName, docType, supplierName, value } = req.body;
  
  const contract = contracts.find(c => c.supplierName === supplierName) || contracts[0];
  
  const newTask: ActiveTask = {
    id: "task-" + Math.floor(Math.random() * 9999 + 100),
    documentName: docName || "DOCUMENT_UPLOAD.pdf",
    supplierName: supplierName || contract.supplierName,
    progress: 0,
    statusText: "Iniciando verificação de OCR...",
    documentType: docType || "NF-e"
  };

  activeTasks.push(newTask);
  res.json({ success: true, task: newTask, processing: activeTasks });
});

// 11. Real Gemini OCR Extraction & Compliance Engine
app.post("/api/upload-real", async (req, res) => {
  const { fileContent, fileName, mimeType } = req.body;

  if (!fileContent) {
    return res.status(400).json({ error: "No file content specified" });
  }

  // Generate unique task id
  const taskId = "task-" + Math.floor(Math.random() * 9999 + 100);
  
  // Register in active processes immediately so user sees the progress bar!
  const tempTask: ActiveTask = {
    id: taskId,
    documentName: fileName || "real_document.pdf",
    supplierName: "Processando via Inteligência Artificial...",
    progress: 15,
    statusText: "Fazendo upload para o modelo de linguagem...",
    documentType: fileName.toLowerCase().endsWith(".xml") ? "XML" : "PDF"
  };
  activeTasks.push(tempTask);

  // Return immediately so the client can show progress as we poll,
  // but analyze asynchronously in background
  res.json({ success: true, taskId, status: "processing" });

  try {
    let resultText = "";
    
    if (ai) {
      console.log(`Starting real Gemini AI analysis for: ${fileName}`);
      
      const prompt = `
        Analise este documento fiscal ou administrativo brasileiro e retorne uma resposta estrita no formato JSON.
        Importante: Extraia estritamente os seguintes campos em formato JSON válido com as seguintes chaves textuais:
        {
          "supplierName": "Nome completo do fornecedor ou emissor",
          "cnpj": "CNPJ do emissor formatado",
          "contractNumber": "Número do Contrato associado (ex: CT-2023-045, se não achar, deduza do material ou invente uma)",
          "documentType": "Tipo de Certidão ou Nota (ex: NF-e, CND Municipal, CND FGTS, Relatório de Horas)",
          "documentNumber": "Número da nota fiscal ou código da certidão",
          "issueDate": "Data de emissão",
          "value": "Valor financeiro decimal se houver nota fiscal, zero se for certidão",
          "status": "Deduza se está 'Aprovado' (tudo regular e dentro dos prazos) ou 'Inconsistência' (data vencida ou CNPJ incorreto) ou 'Aguardando Revisão'",
          "warnings": ["Array de alertas de inconsistências detectadas ou observações se aplicável"],
          "confidenceScore": "Inteiro entre 0 e 100 indicando a precisão da extração",
          "complianceChecks": [
            { "name": "Nome da verificação", "description": "Breve descrição do que faz", "status": "success ou error ou warn", "details": "Detalhes técnicos da análise" }
          ]
        }
        Certifique-se de que a resposta seja puramente um JSON válido, sem tags markdown ou textos adicionais de introdução.
      `;

      const documentPart = {
        inlineData: {
          mimeType: mimeType || "application/pdf",
          data: fileContent // base64 string
        }
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [documentPart, { text: prompt }] },
        config: {
          responseMimeType: "application/json"
        }
      });

      resultText = response.text || "{}";
      console.log("Raw Gemini Response received:", resultText);
    } else {
      // Simulate slow execution to showcase the elegant pipeline in the frontend
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Fallback with randomized smart data based on name
      const lowerName = (fileName || "").toLowerCase();
      let detectedType = "NF-e";
      let sup = "MedTech Suprimentos Hospitalares S.A.";
      let val = 12540.00;
      let status: 'Aprovado' | 'Inconsistência' | 'Aguardando Revisão' = "Aprovado";
      let warnings: string[] = [];

      if (lowerName.includes("cnd") || lowerName.includes("certidao") || lowerName.includes("certidão")) {
        detectedType = "CND Federal";
        val = 0;
        sup = "Construtora Alfa S.A.";
        if (lowerName.includes("vencid")) {
          status = "Inconsistência";
          warnings.push("Certidão Negativa de Débitos expirada há mais de 10 dias de acordo com o Siafi.");
        }
      } else if (lowerName.includes("horas") || lowerName.includes("relatorio") || lowerName.includes("relatório")) {
        detectedType = "Relatório de Horas";
        val = 4200.00;
        sup = "Limpeza & Cia Serv. de Conservação";
      }

      resultText = JSON.stringify({
        supplierName: sup,
        cnpj: "12.345.678/0001-99",
        contractNumber: "CT-2023-045",
        documentType: detectedType,
        documentNumber: "NFS-E-2026-04" + Math.floor(Math.random() * 900 + 100),
        issueDate: "15/06/2026",
        value: val,
        status: status,
        warnings: warnings,
        confidenceScore: 94,
        complianceChecks: [
          { name: "Verificação de CNPJ", description: "Verifica situação cadastral na RFB", status: "success", details: "Situação ATIVA cadastrada" },
          { name: "Validação Anti-Fraude", description: "Verifica assinatura digital", status: "success", details: "Assinado eletronicamente por representante legal" },
          { name: "Comparação Contratual", description: "Verifica enquadramento no CT-2023-045", status: status === "Inconsistência" ? "error" : "success", details: status === "Inconsistência" ? "Preço unitário excede a tabela homologada" : "Enquadramento financeiro de acordo" }
        ]
      });
    }

    // Process extraction JSON
    const data = JSON.parse(resultText.trim() || "{}");
    
    // Update task completion in global state
    const index = activeTasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      activeTasks[index].progress = 100;
      activeTasks[index].statusText = "Concluído!";
    }

    // Commit to documents array
    const realDocId = "doc-" + Math.floor(Math.random() * 8999 + 1000);
    const resolvedDoc: Document = {
      id: realDocId,
      supplierName: data.supplierName || "Fornecedor Extraído Inc.",
      cnpj: data.cnpj || "11.222.333/0001-44",
      contractNumber: data.contractNumber || "CT-2023-045",
      documentType: data.documentType || "Acompanhamento Administrativo",
      status: data.status || "Aprovação Pendente",
      confidenceScore: typeof data.confidenceScore === "number" ? data.confidenceScore : 91,
      uploadDate: new Date().toISOString(),
      value: typeof data.value === "number" ? data.value : 0,
      warnings: data.warnings || [],
      extractedFields: {
        "Razão Social": data.supplierName || "Não identificado",
        "CNPJ": data.cnpj || "Não identificado",
        "ID de Contrato": data.contractNumber || "CT-2023-045",
        "Número do Documento": data.documentNumber || "N/A",
        "Data de Emissão": data.issueDate || "N/A",
        "Estoque de Confiança": `${data.confidenceScore || 90}%`
      },
      checks: data.complianceChecks || [
        { id: "c1", name: "Análise Cognitiva", description: "Processamento de linguagem natural", status: "success", details: "Gramática e sintaxe documental estruturada" }
      ]
    };

    documents.unshift(resolvedDoc);

    // Create persistent warning alerts
    if (resolvedDoc.status === "Inconsistência" || resolvedDoc.warnings.length > 0) {
      criticalAlerts.unshift({
        id: "alert-" + Math.floor(Math.random() * 9999 + 100),
        type: "compliance_fail",
        title: `Alerta: ${resolvedDoc.documentType}`,
        description: resolvedDoc.warnings[0] || `Detetada inconsistência no documento de ${resolvedDoc.supplierName}`,
        severity: "high",
        actionLabel: "Bloquear Pagamento",
        actionCode: "BLOCK_PAYMENT",
        supplierName: resolvedDoc.supplierName,
        contractNumber: resolvedDoc.contractNumber,
        resolved: false
      });
    }

  } catch (error) {
    console.error("Async document extraction processing failed:", error);
    // Graceful task failure registration
    const index = activeTasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      activeTasks[index].statusText = "Falha no processamento. Tente novamente.";
      activeTasks[index].progress = 100;
    }
  }
});


// Reset all data to default demo state
app.post("/api/reset", (req, res) => {
  documents = [
    {
      id: "doc-101",
      supplierName: "MedTech Suprimentos Hospitalares S.A.",
      cnpj: "12.345.678/0001-99",
      contractNumber: "CT-2023-045",
      documentType: "NF-e 88234",
      status: "Aprovado",
      confidenceScore: 98,
      uploadDate: "2026-06-12T15:30:00Z",
      value: 12540.00,
      extractedFields: {
        "Razão Social": "MedTech Suprimentos Hospitalares S.A.",
        "CNPJ": "12.345.678/0001-99",
        "Número do Contrato": "CT-2023-045",
        "Tipo de Documento": "Nota Fiscal Eletrônica (NF-e)",
        "Número do Documento": "88234",
        "Data de Emissão": "10/06/2026",
        "Valor Total": "R$ 12.540,00",
        "Confirmação de Assinatura": "Presente e Válida"
      },
      warnings: [],
      checks: [
        { id: "c1", name: "Validação de CNPJ", description: "Verifica se o CNPJ é ativo e cadastrado", status: "success", details: "CNPJ 12.345.678/0001-99 regular" },
        { id: "c2", name: "Verificação de Margem de Valor", description: "Verifica se o valor está dentro do saldo contratual", status: "success", details: "Valor R$ 12.540,00 compatível" },
        { id: "c3", name: "Conformidade Fiscal", description: "Valida assinaturas eletrônicas das notas fiscais", status: "success", details: "Assinatura digital válida (ICP-Brasil)" }
      ]
    },
    {
      id: "doc-102",
      supplierName: "Construtora Alfa S.A.",
      cnpj: "98.765.432/0001-11",
      contractNumber: "CT-2022-112",
      documentType: "CND Municipal",
      status: "Inconsistência",
      confidenceScore: 45,
      uploadDate: "2026-06-14T09:15:00Z",
      value: 0.00,
      extractedFields: {
        "Razão Social": "Construtora Alfa S.A.",
        "CNPJ": "98.765.432/0001-11",
        "Número do Contrato": "CT-2022-112",
        "Tipo de Documento": "Certidão Negativa de Débitos Municipais (CND)",
        "Número do Documento": "CND-9923MC",
        "Data de Emissão": "12/12/2025",
        "Validade da Certidão": "12/06/2026 (Expirou há 3 dias)",
        "Situação Cadastral": "Apresenta pendências na Secretaria de Finanças"
      },
      warnings: ["A certidão de débitos municipal encontra-se expirada.", "Incompatibilidade de datas de validade."],
      checks: [
        { id: "c1", name: "Validação de CNPJ", description: "Verifica se o CNPJ é ativo e cadastrado", status: "success", details: "CNPJ 98.765.432/0001-11 regular" },
        { id: "c2", name: "Análise de Data de Validade", description: "Verifica se os certificados e certidões estão no prazo de vigência", status: "error", details: "Certidão expirou em 12/06/2026" },
        { id: "c3", name: "Detecção de Rasuras", description: "Análise de legibilidade e consistência física do documento", status: "warn", details: "Baixa resolução na área de autenticação" }
      ]
    },
    {
      id: "doc-103",
      supplierName: "TechGov Soluções TI Ltda",
      cnpj: "45.678.901/0001-22",
      contractNumber: "CT-2024-002",
      documentType: "CND FGTS",
      status: "Aguardando Revisão",
      confidenceScore: 82,
      uploadDate: "2026-06-15T11:45:00Z",
      value: 0.00,
      extractedFields: {
        "Razão Social": "TechGov Soluções TI Ltda",
        "CNPJ": "45.678.901/0001-22",
        "Número do Contrato": "CT-2024-002",
        "Tipo de Documento": "CRF - Certificado de Regularidade do FGTS",
        "Número do Certificado": "FGTS-88712",
        "Data de Emissão": "15/05/2026",
        "Validade da Certidão": "15/08/2026",
        "Autenticidade": "Pendente de validação cruzada da chave com a Caixa"
      },
      warnings: ["Verificação automática com o portal da Caixa Econômica Federal falhou por indisponibilidade temporária."],
      checks: [
        { id: "c1", name: "Validação de CNPJ", description: "Verifica se o CNPJ é ativo e cadastrado", status: "success", details: "CNPJ 45.678.901/0001-22 ativo" },
        { id: "c2", name: "Análise de Data de Validade", description: "Verifica se os certificados e certidões estão no prazo de vigência", status: "success", details: "Válido até 15/08/2026" },
        { id: "c3", name: "Consulta de Autenticidade", description: "Validação síncrona com os servidores do Governo Federal", status: "warn", details: "Portal da CEF inacessível durante análise" }
      ]
    },
    {
      id: "doc-104",
      supplierName: "Limpeza & Cia Serv. de Conservação",
      cnpj: "78.901.234/0001-88",
      contractNumber: "CT-2023-089",
      documentType: "Relatório de Horas",
      status: "Aprovado",
      confidenceScore: 95,
      uploadDate: "2026-06-14T17:00:00Z",
      value: 4200.00,
      extractedFields: {
        "Razão Social": "Limpeza & Cia Serv. de Conservação",
        "CNPJ": "78.901.234/0001-88",
        "Número do Contrato": "CT-2023-089",
        "Tipo de Documento": "Relatório Mensal de Prestação de Horas Trabalhadas",
        "Período de Referência": "Maio/2026",
        "Total de Horas Declaradas": "160 horas",
        "Valor Estimado": "R$ 4.200,00",
        "Confirmação de Assinatura": "Gestor de Contratos do Município assinou"
      },
      warnings: [],
      checks: [
        { id: "c1", name: "Validação de CNPJ", description: "Verifica se o CNPJ é ativo e cadastrado", status: "success", details: "CNPJ 78.901.234/0001-88 ativo" },
        { id: "c2", name: "Validação de Assinatura Manual", description: "Confirma assinaturas eletrônicas ou físicas dos supervisores", status: "success", details: "Assinatura do fiscal autorizada" },
        { id: "c3", name: "Soma de Planilhas", description: "Re-cálculo automático das planilhas de horas anexadas", status: "success", details: "Total de 160h bate com dados diários" }
      ]
    }
  ];

  activeTasks = [
    {
      id: "task-001",
      documentName: "NF-2023-991.pdf",
      supplierName: "MedTech Suprimentos Hospitalares S.A.",
      progress: 65,
      statusText: "Extraindo dados estruturados...",
      documentType: "NF-e"
    },
    {
      id: "task-002",
      documentName: "CND_Federal.xml",
      supplierName: "Limpeza & Cia Serv. de Conservação",
      progress: 30,
      statusText: "Consultando base da Receita...",
      documentType: "CND Federal"
    }
  ];

  criticalAlerts = [
    {
      id: "alert-1",
      type: "expired_certificate",
      title: "Certidão Vencida",
      description: "Detectada para Construtora Alfa (CND Municipal venceu há 3 dias).",
      severity: "high",
      actionLabel: "Bloquear Pagamento",
      actionCode: "BLOCK_PAYMENT",
      supplierName: "Construtora Alfa S.A.",
      contractNumber: "CT-2022-112",
      resolved: false,
      blockedPayment: false
    },
    {
      id: "alert-2",
      type: "value_mismatch",
      title: "Divergência de Valores",
      description: "Nota Fiscal de MedTech (NF-e 88234) apresenta valor 15% acima do limite de empenho mensal planejado.",
      severity: "medium",
      actionLabel: "Auditar Divergência",
      actionCode: "AUDIT_DIVERGENCE",
      supplierName: "MedTech Suprimentos Hospitalares S.A.",
      contractNumber: "CT-2023-045",
      resolved: false
    }
  ];

  contracts = [
    {
      id: "CT-2023-045",
      supplierName: "MedTech Suprimentos Hospitalares S.A.",
      title: "Fornecimento de Insumos Médicos e Descartáveis Hospitalares",
      totalValue: 250000.00,
      allocatedValue: 182300.00,
      startDate: "2023-05-10",
      endDate: "2027-05-10",
      status: "Ativo"
    },
    {
      id: "CT-2022-112",
      supplierName: "Construtora Alfa S.A.",
      title: "Reforma Estrutural da Ala Norte e Almoxarifado Central",
      totalValue: 1200000.00,
      allocatedValue: 980000.00,
      startDate: "2022-01-15",
      endDate: "2026-11-30",
      status: "Ativo"
    },
    {
      id: "CT-2024-002",
      supplierName: "TechGov Soluções TI Ltda",
      title: "Prestação de Serviços de Hospedagem em Nuvem e Suporte Técnico Corporativo",
      totalValue: 480000.00,
      allocatedValue: 120000.00,
      startDate: "2024-01-01",
      endDate: "2028-01-01",
      status: "Ativo"
    },
    {
      id: "CT-2023-089",
      supplierName: "Limpeza & Cia Serv. de Conservação",
      title: "Serviços Contínuos de Conservação, Limpeza, Copa e Portaria Predial",
      totalValue: 350000.00,
      allocatedValue: 215000.00,
      startDate: "2023-09-01",
      endDate: "2026-09-01",
      status: "Ativo"
    }
  ];

  res.json({ success: true });
});

// Main Server Startup Block
async function startServer() {
  // Vite developer asset registration or static folders setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port : ${PORT}`);
    console.log(`Dev links: http://localhost:${PORT}`);
  });
}

startServer();
