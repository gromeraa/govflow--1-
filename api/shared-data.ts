/**
 * Shared data store for all API functions
 */

// Global in-memory DB
export let documents: any[] = [
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

export let activeTasks: any[] = [
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

export let criticalAlerts: any[] = [
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

export let contracts: any[] = [
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

export let settings: any = {
  strictnessThreshold: 80,
  autoProcessEnabled: true,
  alertOnLowConfidence: true,
  allowedFormats: ["pdf", "xml", "png", "jpeg"],
  activeAIModel: "gemini-3.5-flash"
};
