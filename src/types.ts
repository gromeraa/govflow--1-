/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ComplianceCheck {
  id: string;
  name: string;
  description: string;
  status: 'success' | 'warn' | 'error';
  details?: string;
}

export interface Document {
  id: string;
  supplierName: string;
  cnpj: string;
  contractNumber: string;
  documentType: string; // e.g., 'NF-e 88234', 'CND Municipal', 'CND FGTS', 'Relatório de Horas', 'CND Federal'
  status: 'Aprovado' | 'Inconsistência' | 'Aguardando Revisão';
  confidenceScore: number; // 0-100
  uploadDate: string;
  value: number; // BRL currency value
  checks: ComplianceCheck[];
  extractedFields: Record<string, string>;
  warnings: string[];
  reviewedBy?: string;
  reviewDate?: string;
}

export interface ActiveTask {
  id: string;
  documentName: string;
  supplierName?: string;
  progress: number; // 0-100
  statusText: string;
  documentType: string;
}

export interface CriticalAlert {
  id: string;
  type: 'expired_certificate' | 'value_mismatch' | 'missing_signature' | 'compliance_fail';
  title: string;
  description: string;
  severity: 'high' | 'medium';
  actionLabel: string;
  actionCode: string;
  supplierName: string;
  contractNumber: string;
  resolved: boolean;
  blockedPayment?: boolean;
}

export interface Contract {
  id: string; // e.g., 'CT-2023-045'
  supplierName: string;
  title: string;
  totalValue: number;
  allocatedValue: number;
  startDate: string;
  endDate: string;
  status: 'Ativo' | 'Suspenso' | 'Concluído';
}

export interface GovFlowStats {
  totalDocuments: number;
  validatedCount: number;
  failedCount: number;
  reviewNeededCount: number;
  averageConfidence: number;
  totalContractVolume: number;
  totalValidatedValue: number;
  complianceRate: number; // percentage
}
