/**
 * GovFlow - Vanilla JS/TS Core Client Logic
 * Powered by Antigravity & Google AI Studio
 */

import { Document, ActiveTask, CriticalAlert, Contract, GovFlowStats } from "./types";

// State definition
interface State {
  activeTab: 'dashboard' | 'validation' | 'contracts' | 'reports' | 'settings';
  documents: Document[];
  activeTasks: ActiveTask[];
  alerts: CriticalAlert[];
  contracts: Contract[];
  stats: GovFlowStats | null;
  settings: {
    strictnessThreshold: number;
    autoProcessEnabled: boolean;
    alertOnLowConfidence: boolean;
    allowedFormats: string[];
    activeAIModel: string;
  };
  searchQuery: string;
  tableSearchQuery: string;
  filterStatus: string;
  filterSupplier: string;
  selectedDoc: Document | null;
  showReportSheet: boolean;
  isActionLoading: boolean;
}

const state: State = {
  activeTab: 'dashboard',
  documents: [],
  activeTasks: [],
  alerts: [],
  contracts: [],
  stats: null,
  settings: {
    strictnessThreshold: 80,
    autoProcessEnabled: true,
    alertOnLowConfidence: true,
    allowedFormats: ['pdf', 'xml', 'png', 'jpeg'],
    activeAIModel: 'gemini-3.5-flash',
  },
  searchQuery: '',
  tableSearchQuery: '',
  filterStatus: 'TODOS',
  filterSupplier: 'TODOS',
  selectedDoc: null,
  showReportSheet: false,
  isActionLoading: false,
};

// Polling interval tracker
let pollingInterval: any = null;

// Helper: initialize lucide icons replacement
function renderIcons() {
  if (typeof (window as any).lucide !== 'undefined') {
    (window as any).lucide.createIcons();
  }
}

// Helpers: format currencies
function formatCurrency(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Helper: format ISO dates
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// HTTP API wrappers
const API = {
  async getDocuments(): Promise<Document[]> {
    const res = await fetch('/api/documents');
    return res.json();
  },
  async getProcessing(): Promise<ActiveTask[]> {
    const res = await fetch('/api/processing');
    return res.json();
  },
  async getAlerts(): Promise<CriticalAlert[]> {
    const res = await fetch('/api/alerts');
    return res.json();
  },
  async getContracts(): Promise<Contract[]> {
    const res = await fetch('/api/contracts');
    return res.json();
  },
  async getSettings(): Promise<any> {
    const res = await fetch('/api/settings');
    return res.json();
  },
  async getStats(): Promise<GovFlowStats> {
    const res = await fetch('/api/stats');
    return res.json();
  },
  async saveSettings(body: any): Promise<any> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  async uploadSimulation(body: any): Promise<any> {
    const res = await fetch('/api/upload-simulation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  async uploadReal(body: any): Promise<any> {
    const res = await fetch('/api/upload-real', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  async resolveAlert(id: string, code: string): Promise<any> {
    const res = await fetch('/api/resolve-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId: id, actionCode: code }),
    });
    return res.json();
  },
  async docAction(docId: string, action: 'approve' | 'fail', reviewer: string): Promise<any> {
    const res = await fetch('/api/document-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId, action, reviewer }),
    });
    return res.json();
  },
  async resetDemo(): Promise<any> {
    const res = await fetch('/api/reset', { method: 'POST' });
    return res.json();
  },
};

// Sync app state from API endpoints
async function syncAllState() {
  try {
    const [docs, processing, alertList, contractList, statsObj, currentSettings] = await Promise.all([
      API.getDocuments(),
      API.getProcessing(),
      API.getAlerts(),
      API.getContracts(),
      API.getStats(),
      API.getSettings(),
    ]);

    state.documents = docs;
    state.activeTasks = processing;
    state.alerts = alertList;
    state.contracts = contractList;
    state.stats = statsObj;
    
    if (currentSettings) {
      state.settings.strictnessThreshold = currentSettings.strictnessThreshold ?? 80;
      state.settings.autoProcessEnabled = currentSettings.autoProcessEnabled ?? true;
      state.settings.alertOnLowConfidence = currentSettings.alertOnLowConfidence ?? true;
      state.settings.activeAIModel = currentSettings.activeAIModel ?? 'gemini-3.5-flash';
    }

    // Refresh GUI
    renderAllViews();
  } catch (err) {
    console.error("Failed to synchronize state with GovFlow server APIs:", err);
  }
}

// Dynamic elements injector logic
function renderAllViews() {
  renderSidebarAndActiveTab();
  renderTopNavAlertsAndKPIs();
  
  if (state.activeTab === 'dashboard') {
    renderDashboardView();
  } else if (state.activeTab === 'validation') {
    renderValidationView();
  } else if (state.activeTab === 'contracts') {
    renderContractsView();
  } else if (state.activeTab === 'reports') {
    renderReportsView();
  } else if (state.activeTab === 'settings') {
    renderSettingsView();
  }

  // Draw overlay details drawer if opened
  if (state.selectedDoc) {
    // Re-bind fresh model reference if state synced
    const freshDoc = state.documents.find(d => d.id === state.selectedDoc!.id) || state.selectedDoc;
    populateDrawer(freshDoc);
  }

  // Bind icons replacement
  renderIcons();
}

// Side links highlights
function renderSidebarAndActiveTab() {
  const tabs = ['dashboard', 'validation', 'contracts', 'reports', 'settings'];
  tabs.forEach(tab => {
    const btn = document.getElementById(`nav-link-${tab}`);
    const sect = document.getElementById(`page-${tab}`);
    if (btn) {
      if (state.activeTab === tab) {
        btn.className = "w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 relative bg-indigo-50 text-indigo-600 font-bold";
        const indicator = btn.querySelector('span');
        if (indicator) indicator.classList.remove('hidden');
        const icon = btn.querySelector('i');
        if (icon) {
          icon.className = "w-[18px] h-[18px] text-indigo-600";
          icon.setAttribute('data-lucide-color', '#4f46e5');
        }
      } else {
        btn.className = "w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 relative text-slate-500 hover:bg-slate-50 hover:text-slate-800";
        const indicator = btn.querySelector('span');
        if (indicator) indicator.classList.add('hidden');
        const icon = btn.querySelector('i');
        if (icon) {
          icon.className = "w-[18px] h-[18px] text-slate-400";
        }
      }
    }
    if (sect) {
      if (state.activeTab === tab) {
        sect.classList.remove('hidden');
      } else {
        sect.classList.add('hidden');
      }
    }
  });
}

// Header badge and generic KPIs
function renderTopNavAlertsAndKPIs() {
  const badge = document.getElementById('notifications-badge');
  const countLabel = document.getElementById('notifications-count-label');
  const listCont = document.getElementById('notifications-list');

  const activeAlerts = state.alerts.filter(a => !a.resolved);

  if (activeAlerts.length > 0) {
    if (badge) badge.classList.remove('hidden');
    if (countLabel) {
      countLabel.textContent = `${activeAlerts.length} ${activeAlerts.length === 1 ? 'Alerta' : 'Alertas'}`;
      countLabel.className = "text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold";
    }
  } else {
    if (badge) badge.classList.add('hidden');
    if (countLabel) {
      countLabel.textContent = `0 Alertas`;
      countLabel.className = "text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-semibold";
    }
  }

  // Populate navigation alarm items
  if (listCont) {
    listCont.innerHTML = '';
    if (activeAlerts.length === 0) {
      listCont.innerHTML = `<div class="p-5 text-center text-slate-400 text-xs">Sem alertas críticos no momento.</div>`;
    } else {
      activeAlerts.forEach(alert => {
        const isHigh = alert.severity === 'high';
        const colorBorder = isHigh ? 'border-rose-500 bg-rose-50/50' : 'border-amber-500 bg-amber-50/50';
        const iconColor = isHigh ? 'text-rose-600' : 'text-amber-500';
        
        const alertHtml = `
          <div class="p-4 border-l-4 ${colorBorder} space-y-1.5 transition-all hover:bg-slate-50">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-800 text-xs flex items-center space-x-1">
                <i data-lucide="alert-triangle" class="w-3.5 h-3.5 ${iconColor} inline"></i>
                <span class="ml-1">${alert.title}</span>
              </span>
              <span class="text-[9px] font-bold uppercase ${isHigh ? 'text-rose-600 bg-rose-50' : 'text-amber-600 bg-amber-50'} px-1.5 py-0.5 rounded">
                ${isHigh ? 'Crítico' : 'Médio'}
              </span>
            </div>
            <p class="text-[11px] text-slate-500 leading-relaxed">${alert.description}</p>
            <div class="pt-1 select-none flex items-center justify-between">
              <span class="text-[9px] text-slate-400 font-semibold px-2 py-0.5 bg-slate-100 rounded font-mono">${alert.contractNumber}</span>
              <button 
                data-alert-id="${alert.id}"
                data-alert-code="${alert.actionCode}"
                class="btn-action-alert text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline font-bold transition-all cursor-pointer"
              >
                ${alert.actionLabel}
              </button>
            </div>
          </div>
        `;
        listCont.insertAdjacentHTML('beforeend', alertHtml);
      });

      // Bind button click listeners
      document.querySelectorAll('.btn-action-alert').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const element = e.currentTarget as HTMLButtonElement;
          const id = element.getAttribute('data-alert-id')!;
          const code = element.getAttribute('data-alert-code')!;
          element.disabled = true;
          element.innerText = "Registrando...";
          try {
            await API.resolveAlert(id, code);
            await syncAllState();
          } catch (err) {
            console.error(err);
            element.innerText = "Falhou";
          }
        });
      });
    }
  }

  // Update high-level KPI cards values
  if (state.stats) {
    const compRate = document.getElementById('stat-compliance-rate');
    const compBar = document.getElementById('stat-compliance-bar');
    const totalDocs = document.getElementById('stat-total-documents');
    const totalValue = document.getElementById('stat-validated-value');
    const totalAlertsCount = document.getElementById('stat-critical-alerts');

    if (compRate) compRate.textContent = `${state.stats.complianceRate}%`;
    if (compBar) compBar.style.width = `${state.stats.complianceRate}%`;
    if (totalDocs) totalDocs.textContent = String(state.stats.totalDocuments);
    if (totalValue) totalValue.textContent = formatCurrency(state.stats.totalValidatedValue);
    if (totalAlertsCount) totalAlertsCount.textContent = String(activeAlerts.length);
  }
}

// Tab 1: Dashboard Render
function renderDashboardView() {
  renderSupplierConfidenceBars();
  renderDashboardContracts();
}

// Supplier confidence chart
function renderSupplierConfidenceBars() {
  const container = document.getElementById('supplier-confidence-bars');
  if (!container) return;
  container.innerHTML = '';

  // Filter based on global search in sidebar/header
  const docsToAnalyze = state.documents.filter(doc => {
    if (!state.searchQuery) return true;
    const query = state.searchQuery.toLowerCase();
    return (
      doc.supplierName.toLowerCase().includes(query) ||
      doc.cnpj.includes(query) ||
      doc.contractNumber.toLowerCase().includes(query)
    );
  });

  const supplierGroup: Record<string, { total: number; count: number }> = {};
  docsToAnalyze.forEach(doc => {
    if (!supplierGroup[doc.supplierName]) {
      supplierGroup[doc.supplierName] = { total: 0, count: 0 };
    }
    supplierGroup[doc.supplierName].total += doc.confidenceScore;
    supplierGroup[doc.supplierName].count += 1;
  });

  const suppliers = Object.keys(supplierGroup).map(name => ({
    name,
    avgScore: Math.round(supplierGroup[name].total / supplierGroup[name].count)
  })).sort((a, b) => b.avgScore - a.avgScore);

  if (suppliers.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">Nenhum dado estatístico encontrado.</p>`;
    return;
  }

  suppliers.forEach(sup => {
    const colorClass = sup.avgScore >= 90 ? 'bg-emerald-500' : sup.avgScore >= 75 ? 'bg-indigo-600' : 'bg-amber-500';
    const textThemeClass = sup.avgScore >= 90 ? 'text-emerald-700 bg-emerald-50' : sup.avgScore >= 75 ? 'text-indigo-700 bg-indigo-50' : 'text-amber-700 bg-amber-50';
    
    const barHtml = `
      <div class="space-y-1.5 bg-slate-50/50 p-3 rounded-lg border border-slate-100 transition-all hover:bg-slate-50">
        <div class="flex justify-between items-center text-xs">
          <span class="font-semibold text-slate-800 text-[11px] truncate max-w-[210px]">${sup.name}</span>
          <span class="font-bold px-1.5 py-0.5 rounded text-[10px] font-mono ${textThemeClass}">${sup.avgScore}%</span>
        </div>
        <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div class="${colorClass} h-full rounded-full transition-all duration-500" style="width: ${sup.avgScore}%"></div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', barHtml);
  });
}

// Dashboard contracts progress allocated spent
function renderDashboardContracts() {
  const container = document.getElementById('dashboard-contracts-list');
  if (!container) return;
  container.innerHTML = '';

  const query = state.searchQuery.toLowerCase();
  const contractsFiltered = state.contracts.filter(contract => {
    if (!state.searchQuery) return true;
    return (
      contract.id.toLowerCase().includes(query) ||
      contract.supplierName.toLowerCase().includes(query) ||
      contract.title.toLowerCase().includes(query)
    );
  });

  if (contractsFiltered.length === 0) {
    container.innerHTML = `
      <div class="p-5 text-center text-slate-400 text-xs">Nenhum contrato ativo corresponde a busca.</div>
    `;
    return;
  }

  contractsFiltered.forEach(contract => {
    // calculate actual allocation usage percent
    const percent = Math.min(Math.round((contract.allocatedValue / contract.totalValue) * 100), 100);
    const colorBar = percent >= 90 ? 'bg-rose-500' : percent >= 75 ? 'bg-amber-500' : 'bg-indigo-600';
    const isSuspended = contract.status === 'Suspenso';

    const cardHtml = `
      <div class="space-y-2 border-b border-slate-100 last:border-b-0 pb-3 h-fit relative">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="font-mono text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">${contract.id}</span>
            <span class="text-[9px] font-bold uppercase rounded px-1.5 bg-slate-100 ${isSuspended ? 'text-rose-600 bg-rose-50' : 'text-slate-500'}">
              ${isSuspended ? 'BLOQUEADO' : contract.status}
            </span>
          </div>
          <span class="font-bold text-xs text-slate-900 font-mono">${percent}%</span>
        </div>
        <div class="space-y-0.5">
          <h4 class="font-bold text-slate-800 text-[11px] truncate max-w-[340px]">${contract.supplierName}</h4>
          <p class="text-[11px] text-slate-400 truncate max-w-[360px]">${contract.title}</p>
        </div>
        <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div class="${colorBar} h-full rounded-full transition-all duration-300" style="width: ${percent}%"></div>
        </div>
        <div class="flex justify-between text-[11px] font-semibold text-slate-500 font-mono">
          <span>Utilizado: ${formatCurrency(contract.allocatedValue)}</span>
          <span class="text-slate-400">Teto: ${formatCurrency(contract.totalValue)}</span>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', cardHtml);
  });
}

// Tab 2: Validation View
function renderValidationView() {
  populateSupplierFilterDropdown();
  renderSimulationButtons();
  renderActiveTasksList();
  renderDocumentsTable();
}

// Supplier filter unique builder
function populateSupplierFilterDropdown() {
  const select = document.getElementById('filter-supplier') as HTMLSelectElement;
  if (!select) return;

  const currentSelection = select.value;
  select.innerHTML = '<option value="TODOS">Todos Credores</option>';

  const suppliers = Array.from(new Set(state.documents.map(d => d.supplierName))).sort();
  suppliers.forEach(supplier => {
    const opt = document.createElement('option');
    opt.value = supplier;
    opt.textContent = supplier;
    if (supplier === currentSelection) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

function renderSimulationButtons() {
  const container = document.getElementById('simulations-buttons-grid');
  if (!container) return;
  container.innerHTML = '';

  const templates = [
    {
      label: 'MedTech (NF-e Correta)',
      type: 'NF-e',
      supplier: 'MedTech Suprimentos Hospitalares S.A.',
      name: 'NF-2026-991.pdf',
      value: 12540.00
    },
    {
      label: 'Alfa (CND Vencida)',
      type: 'CND Municipal',
      supplier: 'Construtora Alfa S.A.',
      name: 'CND_Muni_Alfa.pdf',
      value: 0
    },
    {
      label: 'TechGov (CND FGTS)',
      type: 'CND FGTS',
      supplier: 'TechGov Soluções TI Ltda',
      name: 'CND_FGTS.xml',
      value: 0
    },
    {
      label: 'Limpeza & Cia (Horas)',
      type: 'Relatório',
      supplier: 'Limpeza & Cia Serv. de Conservação',
      name: 'Planilha_Horas.png',
      value: 4200.00
    }
  ];

  templates.forEach((t, i) => {
    const btnHtml = `
      <button 
        data-index="${i}"
        class="sim-btn-template px-2.5 py-1.5 border border-slate-200 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/25 rounded-lg text-left transition-all text-[11px] font-medium text-slate-700 cursor-pointer flex flex-col justify-between"
      >
        <span class="font-bold truncate text-slate-800 tracking-tight block">${t.label}</span>
        <span class="text-[9px] text-slate-400 truncate block mt-0.5">${t.type} • Simular</span>
      </button>
    `;
    container.insertAdjacentHTML('beforeend', btnHtml);
  });

  // Bind simulation listeners
  document.querySelectorAll('.sim-btn-template').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = parseInt((e.currentTarget as HTMLButtonElement).getAttribute('data-index')!);
      const temp = templates[idx];
      try {
        await API.uploadSimulation({
          docName: temp.name,
          docType: temp.type,
          supplierName: temp.supplier,
          value: temp.value
        });
        await syncAllState();
      } catch (err) {
        console.error(err);
      }
    });
  });
}

function renderActiveTasksList() {
  const container = document.getElementById('processing-tasks-list');
  const countLabel = document.getElementById('active-tasks-count');
  if (!container) return;
  container.innerHTML = '';

  const active = state.activeTasks;
  if (countLabel) countLabel.textContent = `${active.length} ${active.length === 1 ? 'TAREFA' : 'TAREFAS'}`;

  if (active.length === 0) {
    container.innerHTML = `
      <div class="py-5 text-center text-slate-400 text-[11px] flex flex-col items-center justify-center space-y-2">
        <i data-lucide="check-circle" class="w-6 h-6 text-slate-300"></i>
        <span>Nenhum parsing ativo. Todos documentos processados.</span>
      </div>
    `;
    return;
  }

  active.forEach(task => {
    const taskHtml = `
      <div class="border border-slate-150 rounded-lg p-3 bg-slate-50/20 space-y-2 text-[11px]">
        <div class="flex justify-between items-center">
          <div class="space-y-0.5">
            <span class="font-bold text-slate-800 truncate block max-w-[150px] font-mono">${task.documentName}</span>
            <span class="text-[10px] text-slate-400 truncate block max-w-[170px] font-medium">${task.supplierName}</span>
          </div>
          <span class="font-bold text-indigo-600 font-mono bg-indigo-50 px-1.5 py-0.5 rounded">${task.progress}%</span>
        </div>
        <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div class="bg-indigo-600 h-full rounded-full transition-all duration-300" style="width: ${task.progress}%"></div>
        </div>
        <div class="text-[10px] text-slate-400 italic flex items-center space-x-1">
          <i data-lucide="refresh-cw" class="w-3 h-3 animate-spin text-slate-300 inline"></i>
          <span>${task.statusText}</span>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', taskHtml);
  });
}

function renderDocumentsTable() {
  const tbody = document.getElementById('documents-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const searchVal = (state.tableSearchQuery || state.searchQuery).toLowerCase();
  
  // Filtering algorithm
  const filteredDocs = state.documents.filter(doc => {
    // filter by status
    if (state.filterStatus !== 'TODOS') {
      if (state.filterStatus === 'APROVADO' && doc.status !== 'Aprovado') return false;
      if (state.filterStatus === 'INCONSISTENCIA' && doc.status !== 'Inconsistência') return false;
      if (state.filterStatus === 'REVISAO' && doc.status !== 'Aguardando Revisão') return false;
    }
    // filter by supplier
    if (state.filterSupplier !== 'TODOS' && doc.supplierName !== state.filterSupplier) return false;

    // filter by search keyword
    if (searchVal) {
      const matchName = doc.supplierName.toLowerCase().includes(searchVal);
      const matchCnpj = doc.cnpj.includes(searchVal);
      const matchContract = doc.contractNumber.toLowerCase().includes(searchVal);
      const matchType = doc.documentType.toLowerCase().includes(searchVal);
      const matchId = doc.id.toLowerCase().includes(searchVal);
      if (!matchName && !matchCnpj && !matchContract && !matchType && !matchId) return false;
    }
    return true;
  });

  if (filteredDocs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-8 text-center text-slate-400 text-xs font-medium">Nenhum demonstrativo em conformidade atende a pesquisa configuriva.</td>
      </tr>
    `;
    return;
  }

  filteredDocs.forEach(doc => {
    const formattedVal = doc.value > 0 ? formatCurrency(doc.value) : 'CND / Isento';
    const parsedDate = formatDate(doc.uploadDate);
    
    // Confidence score indicator pill
    const cScore = doc.confidenceScore;
    const isHighConf = cScore >= 90;
    const isMediumConf = cScore >= 75;
    const bgConf = isHighConf ? 'text-emerald-700 bg-emerald-50' : isMediumConf ? 'text-indigo-700 bg-indigo-50' : 'text-amber-700 bg-amber-50';

    // Status Badge
    let statusClass = 'text-slate-500 bg-slate-100';
    if (doc.status === 'Aprovado') statusClass = 'text-emerald-700 bg-emerald-50 font-bold';
    if (doc.status === 'Inconsistência') statusClass = 'text-rose-700 bg-rose-50 font-bold';
    if (doc.status === 'Aguardando Revisão') statusClass = 'text-amber-700 bg-amber-50 font-bold';

    const rowHtml = `
      <tr class="hover:bg-slate-50 transition-all">
        <td class="py-4 px-4">
          <button 
            data-doc-id="${doc.id}" 
            class="btn-open-drawer-id font-mono font-bold text-indigo-600 hover:underline hover:text-indigo-800 text-left cursor-pointer transition-all uppercase block"
          >
            ${doc.id}
          </button>
          <span class="text-[10px] text-slate-400 mt-0.5 block font-medium">${doc.documentType}</span>
        </td>
        <td class="py-4 px-4 font-semibold text-slate-800 max-w-[200px] truncate" title="${doc.supplierName}">
          <span class="block truncate">${doc.supplierName}</span>
          <span class="text-[9px] text-slate-450 block font-mono mt-0.5">${doc.cnpj}</span>
        </td>
        <td class="py-4 px-4 font-mono font-semibold text-slate-700">${formattedVal}</td>
        <td class="py-4 px-4">
          <span class="font-mono font-bold text-[10px] rounded px-2 py-0.5 ${bgConf}">${cScore}%</span>
        </td>
        <td class="py-4 px-4 text-center">
          <span class="text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wide inline-block ${statusClass}">${doc.status}</span>
        </td>
        <td class="py-4 px-4 text-right">
          <button 
            data-doc-id="${doc.id}"
            class="btn-open-drawer-revisar font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-500 transition-all hover:bg-indigo-50/20 cursor-pointer"
          >
            ${doc.status === 'Aprovado' ? 'Ver Ficha' : 'Revisar / Auditor'}
          </button>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', rowHtml);
  });

  // Rebind listeners on both ID links and buttons
  document.querySelectorAll('.btn-open-drawer-id, .btn-open-drawer-revisar').forEach(el => {
    el.addEventListener('click', (e) => {
      const docId = (e.currentTarget as HTMLElement).getAttribute('data-doc-id')!;
      const selected = state.documents.find(d => d.id === docId);
      if (selected) {
        state.selectedDoc = selected;
        toggleDrawer(true);
      }
    });
  });
}

// Tab 3: Contracts View
function renderContractsView() {
  const container = document.getElementById('contracts-grid-container');
  if (!container) return;
  container.innerHTML = '';

  const contractsFiltered = state.contracts;
  if (contractsFiltered.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs">Nenhum contrato administrativo cadastrado.</div>`;
    return;
  }

  contractsFiltered.forEach(contract => {
    const percent = Math.min(Math.round((contract.allocatedValue / contract.totalValue) * 100), 100);
    const colorBar = percent >= 90 ? 'bg-rose-500' : percent >= 75 ? 'bg-amber-500' : 'bg-indigo-600';
    const isSuspended = contract.status === 'Suspenso';

    const cardHtml = `
      <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md hover:border-indigo-200 transition-all duration-200">
        <div class="space-y-2">
          <div class="flex items-start justify-between">
            <span class="font-mono text-xs text-indigo-650 font-bold bg-indigo-50 px-2 py-0.5 rounded">
              ${contract.id}
            </span>
            <span class="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide inline-block ${isSuspended ? 'text-rose-700 bg-rose-50' : 'text-emerald-700 bg-emerald-50'}">
              ${contract.status}
            </span>
          </div>

          <div class="space-y-0.5 pt-1">
            <h4 class="font-bold text-slate-850 text-sm leading-tight truncate-two-lines" title="${contract.supplierName}">${contract.supplierName}</h4>
            <p class="text-[11px] text-slate-450 leading-relaxed font-sans mt-1 h-10 overflow-hidden line-clamp-2">${contract.title}</p>
          </div>
        </div>

        <div class="space-y-2.5 pt-1">
          <div class="space-y-1">
            <div class="flex justify-between items-center text-[10px] font-bold text-slate-400">
              <span class="uppercase tracking-wider">Limite Contratual Executado</span>
              <span class="font-mono ${percent >= 90 ? 'text-rose-600' : 'text-indigo-600'}">${percent}%</span>
            </div>
            
            <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div 
                class="h-full rounded-full transition-all duration-500 ${colorBar}" 
                style="width: ${percent}%"
              ></div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 border-t border-slate-20 p-2 bg-slate-50/50 rounded-lg text-[11px] font-sans">
            <div>
              <span class="text-slate-400 block font-medium">Finanças Executadas</span>
              <span class="font-bold text-slate-700 font-mono">${formatCurrency(contract.allocatedValue)}</span>
            </div>
            <div>
              <span class="text-slate-400 block font-medium">Limite Contratual</span>
              <span class="font-bold text-slate-700 font-mono">${formatCurrency(contract.totalValue)}</span>
            </div>
          </div>

          <div class="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1">
            <span>Início: ${contract.startDate}</span>
            <span>Término: ${contract.endDate}</span>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', cardHtml);
  });
}

// Tab 4: Reports View
function renderReportsView() {
  const normalView = document.getElementById('registry-normal-view');
  const reportView = document.getElementById('registry-report-sheet');
  const toggleBtnText = document.getElementById('btn-toggle-report-text');

  if (state.showReportSheet) {
    if (normalView) normalView.classList.add('hidden');
    if (reportView) reportView.classList.remove('hidden');
    if (toggleBtnText) toggleBtnText.textContent = "Ver Livro de Execuções";
    renderReportSheet();
  } else {
    if (normalView) normalView.classList.remove('hidden');
    if (reportView) reportView.classList.add('hidden');
    if (toggleBtnText) toggleBtnText.textContent = "Emitir Certidão Consolidada";
    renderChronologicalExecutionsTable();
  }

  // Update base counts
  const reportApprovedCount = document.getElementById('report-validated-count');
  const reportFailedCount = document.getElementById('report-failed-count');
  if (reportApprovedCount) {
    const verifieds = state.documents.filter(d => d.status === 'Aprovado').length;
    reportApprovedCount.textContent = `${verifieds} ${verifieds === 1 ? 'item' : 'itens'}`;
  }
  if (reportFailedCount) {
    const pendingAlerts = state.alerts.filter(a => !a.resolved).length;
    reportFailedCount.textContent = `${pendingAlerts} ${pendingAlerts === 1 ? 'pendência' : 'pendências'}`;
  }
}

// Generate reports page dynamic logger actions
function renderChronologicalExecutionsTable() {
  const tbody = document.getElementById('audit-log-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const searchVal = (document.getElementById('audit-log-search-input') as HTMLInputElement)?.value.toLowerCase() || '';

  // Filter or map recent documents and alerts as a chronologic logger audit list
  const auditEntries: Array<{ time: string; action: string; operator: string; details: string }> = [];

  state.documents.forEach((doc, i) => {
    // Audit check logs
    auditEntries.push({
      time: doc.uploadDate,
      action: `AUDITORIA OCR - ${doc.documentType.toUpperCase()}`,
      operator: `BOT - GovFlow IA (${state.settings.activeAIModel})`,
      details: `${doc.supplierName} - Grau de confiança de auditoria de ${doc.confidenceScore}% (${doc.status})`
    });

    if (doc.reviewedBy) {
      auditEntries.push({
        time: doc.reviewDate || doc.uploadDate,
        action: `DECISÃO AUDITOR - FORÇADO MANUAL`,
        operator: doc.reviewedBy,
        details: `Revisão humana forçada para ${doc.id} (Status alterado para: ${doc.status})`
      });
    }
  });

  // Adding Contract registrations
  state.contracts.forEach((ct, i) => {
    auditEntries.push({
      time: ct.startDate + "T09:00:00Z", // fallback mock timestamp
      action: `REGISTRO CONTRATUAL`,
      operator: "Secretaria de Finanças",
      details: `Novo limite contratual adicionado para ${ct.supplierName} teto ${formatCurrency(ct.totalValue)} ID: ${ct.id}`
    });
  });

  // Sort chronological order
  const sortedEntries = auditEntries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const filteredEntries = sortedEntries.filter(e => {
    if (!searchVal) return true;
    return (
      e.action.toLowerCase().includes(searchVal) ||
      e.operator.toLowerCase().includes(searchVal) ||
      e.details.toLowerCase().includes(searchVal)
    );
  });

  if (filteredEntries.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="p-5 text-center text-slate-400">Nenhum evento registrado.</td>
      </tr>
    `;
    return;
  }

  filteredEntries.forEach(entry => {
    const rowHtml = `
      <tr class="hover:bg-slate-50 transition-all">
        <td class="py-3 px-4 font-mono text-[10px] text-slate-400">${formatDate(entry.time)}</td>
        <td class="py-3 px-4 font-bold text-slate-700 text-[11px]">${entry.action}</td>
        <td class="py-3 px-4 text-slate-500 font-medium">${entry.operator}</td>
        <td class="py-3 px-4 text-slate-500 select-all leading-relaxed">${entry.details}</td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', rowHtml);
  });
}

function renderReportSheet() {
  const hashSpan = document.getElementById('report-signature-hash');
  const dateSpan = document.getElementById('report-generation-date');
  const rowsContainer = document.getElementById('report-supplier-status-rows');

  if (hashSpan) {
    // Generate static deterministic simulation code
    const val = Math.floor(new Date().getTime() / 1500000);
    hashSpan.textContent = `SHA256-GC-GF-${val}`;
  }

  if (dateSpan) {
    dateSpan.textContent = new Date().toLocaleString('pt-BR');
  }

  if (rowsContainer) {
    rowsContainer.innerHTML = '';
    
    // Group status of each unique supplier based on current active checkouts
    const statsBySupplier: Record<string, { approved: number; failed: number; totalVal: number }> = {};
    
    state.documents.forEach(doc => {
      if (!statsBySupplier[doc.supplierName]) {
        statsBySupplier[doc.supplierName] = { approved: 0, failed: 0, totalVal: 0 };
      }
      if (doc.status === 'Aprovado') {
        statsBySupplier[doc.supplierName].approved += 1;
        statsBySupplier[doc.supplierName].totalVal += doc.value;
      } else if (doc.status === 'Inconsistência') {
        statsBySupplier[doc.supplierName].failed += 1;
      }
    });

    const list = Object.keys(statsBySupplier);
    if (list.length === 0) {
      rowsContainer.innerHTML = `<p class="py-4 text-center text-slate-400">Nenhum fornecedor auditado até o momento.</p>`;
      return;
    }

    list.forEach(sup => {
      const entry = statsBySupplier[sup];
      const hasFailure = entry.failed > 0;
      const progressLabel = hasFailure ? 'RESTRIÇÕES ATIVAS' : 'REGULAR PARA REPASSES';
      const labelClass = hasFailure ? 'text-rose-700 bg-rose-50' : 'text-emerald-700 bg-emerald-50';

      const supRowHtml = `
        <div class="flex items-center justify-between py-3">
          <div class="space-y-0.5">
            <span class="font-bold text-slate-800 text-[12px] block">${sup}</span>
            <span class="text-[10px] text-slate-400 block font-semibold">Volume Homologado: ${formatCurrency(entry.totalVal)} (${entry.approved} docs aprovados)</span>
          </div>
          <span class="text-[9px] font-bold tracking-wider px-2 py-1 rounded inline-block ${labelClass}">${progressLabel}</span>
        </div>
      `;
      rowsContainer.insertAdjacentHTML('beforeend', supRowHtml);
    });
  }
}

// Tab 5: Settings View
function renderSettingsView() {
  const thresholdLabel = document.getElementById('settings-threshold-label');
  const thresholdSlider = document.getElementById('settings-threshold-slider') as HTMLInputElement;
  const aiModelSelect = document.getElementById('settings-ai-model') as HTMLSelectElement;
  const autoProcessCheck = document.getElementById('settings-auto-process') as HTMLInputElement;
  const alertLowCheck = document.getElementById('settings-alert-low') as HTMLInputElement;

  if (thresholdLabel) thresholdLabel.textContent = `${state.settings.strictnessThreshold}%`;
  if (thresholdSlider) thresholdSlider.value = String(state.settings.strictnessThreshold);
  if (aiModelSelect) aiModelSelect.value = state.settings.activeAIModel;
  if (autoProcessCheck) autoProcessCheck.checked = state.settings.autoProcessEnabled;
  if (alertLowCheck) alertLowCheck.checked = state.settings.alertOnLowConfidence;
}

// Toggle Add Contract Overlay Modal
function toggleModal(open: boolean) {
  const overlay = document.getElementById('contract-modal-overlay');
  const panel = document.getElementById('contract-modal-panel');
  if (!overlay || !panel) return;

  if (open) {
    overlay.classList.remove('pointer-events-none');
    overlay.classList.add('opacity-100');
    panel.classList.remove('scale-95');
    panel.classList.add('scale-100');
  } else {
    overlay.classList.add('pointer-events-none');
    overlay.classList.remove('opacity-100');
    panel.classList.add('scale-95');
    panel.classList.remove('scale-100');
    // Clear inputs
    const form = document.getElementById('add-contract-form') as HTMLFormElement;
    if (form) form.reset();
  }
}

// Toggle Document Details Drawer
function toggleDrawer(open: boolean) {
  const overlay = document.getElementById('drawer-overlay');
  const panel = document.getElementById('drawer-panel');
  if (!overlay || !panel) return;

  if (open) {
    overlay.classList.remove('pointer-events-none');
    overlay.classList.add('opacity-100');
    panel.classList.remove('translate-x-full');
  } else {
    overlay.classList.add('pointer-events-none');
    overlay.classList.remove('opacity-100');
    panel.classList.add('translate-x-full');
    state.selectedDoc = null;
  }
}

// Populate Details Side Drawer
function populateDrawer(doc: Document) {
  const typeSpan = document.getElementById('drawer-doc-type');
  const nameSpan = document.getElementById('drawer-supplier-name');
  const cnpjSpan = document.getElementById('drawer-cnpj');
  const contractSpan = document.getElementById('drawer-contract');
  const valueContainer = document.getElementById('drawer-value-container');
  const valueDisplay = document.getElementById('drawer-value-display');
  
  const warningsBox = document.getElementById('drawer-warnings-box');
  const warningsList = document.getElementById('drawer-warnings-list');
  const fieldsContainer = document.getElementById('drawer-extracted-fields');
  const checksContainer = document.getElementById('drawer-checks-list');
  
  const controlsBlock = document.getElementById('drawer-audit-controls');
  const approveBtn = document.getElementById('btn-drawer-approve') as HTMLButtonElement;
  const reproveBtn = document.getElementById('btn-drawer-reprove') as HTMLButtonElement;

  if (typeSpan) typeSpan.textContent = doc.documentType;
  if (nameSpan) nameSpan.textContent = doc.supplierName;
  if (cnpjSpan) cnpjSpan.textContent = doc.cnpj;
  if (contractSpan) contractSpan.textContent = doc.contractNumber;

  if (doc.value > 0) {
    if (valueContainer) valueContainer.classList.remove('hidden');
    if (valueDisplay) valueDisplay.textContent = formatCurrency(doc.value);
  } else {
    if (valueContainer) valueContainer.classList.add('hidden');
  }

  // Populate warnings box
  if (doc.warnings && doc.warnings.length > 0) {
    if (warningsBox) warningsBox.classList.remove('hidden');
    if (warningsList) {
      warningsList.innerHTML = '';
      doc.warnings.forEach(w => {
        const li = document.createElement('li');
        li.textContent = w;
        warningsList.appendChild(li);
      });
    }
  } else {
    if (warningsBox) warningsBox.classList.add('hidden');
  }

  // Populate Extracted Fields JSON
  if (fieldsContainer) {
    fieldsContainer.innerHTML = '';
    const entries = Object.entries(doc.extractedFields);
    if (entries.length === 0) {
      fieldsContainer.innerHTML = `<p class="p-3 text-slate-400 italic">Campos vazios estruturados.</p>`;
    } else {
      entries.forEach(([key, val]) => {
        const keyValHtml = `
          <div class="flex px-4 py-2.5 hover:bg-slate-50 transition-all">
            <span class="font-semibold text-slate-400 w-1/3 shrink-0 uppercase tracking-wider text-[10px] mt-0.5">${key}</span>
            <span class="text-slate-800 font-semibold truncate leading-normal" title="${val}">${val}</span>
          </div>
        `;
        fieldsContainer.insertAdjacentHTML('beforeend', keyValHtml);
      });
    }
  }

  // Populate Compliance checks items
  if (checksContainer) {
    checksContainer.innerHTML = '';
    if (!doc.checks || doc.checks.length === 0) {
      checksContainer.innerHTML = `<p class="text-slate-400 italic">Nenhum teste de conformidade configurado.</p>`;
    } else {
      doc.checks.forEach(check => {
        let isSuccess = check.status === 'success';
        let isWarn = check.status === 'warn';
        
        let colorTheme = 'border-emerald-100 bg-emerald-50/20 text-emerald-800';
        let iconMarkup = `<i data-lucide="check-circle" class="w-4 h-4 text-emerald-600 shrink-0"></i>`;
        
        if (isWarn) {
          colorTheme = 'border-amber-100 bg-amber-50/20 text-amber-800';
          iconMarkup = `<i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600 shrink-0"></i>`;
        } else if (!isSuccess && !isWarn) {
          colorTheme = 'border-rose-100 bg-rose-50/20 text-rose-800';
          iconMarkup = `<i data-lucide="x-circle" class="w-4 h-4 text-rose-600 shrink-0"></i>`;
        }

        const checkHtml = `
          <div class="border ${colorTheme} rounded-lg p-3 flex items-start space-x-3 transition-shadow hover:shadow-xs">
            ${iconMarkup}
            <div class="space-y-0.5">
              <div class="flex items-center space-x-2">
                <span class="font-bold text-[11px] uppercase tracking-wide">${check.name}</span>
                <span class="text-[9px] font-bold uppercase ${isSuccess ? 'bg-emerald-100 text-emerald-800' : isWarn ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'} px-1.5 py-0.25 rounded font-mono">
                  ${check.status.toUpperCase()}
                </span>
              </div>
              <p class="text-[11px] leading-relaxed text-slate-500 font-medium">${check.description}</p>
              ${check.details ? `<p class="text-[10px] font-mono text-slate-450 pt-1 border-t border-slate-100/50 mt-1">${check.details}</p>` : ''}
            </div>
          </div>
        `;
        checksContainer.insertAdjacentHTML('beforeend', checkHtml);
      });
    }
  }

  // Populate decision buttons
  if (controlsBlock) {
    if (doc.status !== 'Aprovado') {
      controlsBlock.classList.remove('hidden');
      if (approveBtn) {
        approveBtn.disabled = state.isActionLoading;
        approveBtn.textContent = state.isActionLoading ? "Aprovando..." : "Forçar Aprovação Humana";
      }
      if (reproveBtn) {
        reproveBtn.disabled = state.isActionLoading;
        reproveBtn.textContent = state.isActionLoading ? "Reprovando..." : "Reprovar Documento";
      }
    } else {
      controlsBlock.classList.add('hidden');
    }
  }

  // Update icons replacement in inside drawer elements
  renderIcons();
}

// Dropzone file uploader implementation
function setupDropzone() {
  const dropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('real-file-input') as HTMLInputElement;

  if (!dropzone || !fileInput) return;

  // trigger click on click
  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  // drag handlers
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('border-indigo-600', 'bg-indigo-50/20');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('border-indigo-600', 'bg-indigo-50/20');
  });

  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.classList.remove('border-indigo-600', 'bg-indigo-50/20');
    
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await handleFileUpload(file);
    }
  });

  fileInput.addEventListener('change', async () => {
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      await handleFileUpload(file);
      fileInput.value = ''; // reset selection
    }
  });
}

// Handle selected files
async function handleFileUpload(file: File) {
  const dropzone = document.getElementById('upload-dropzone');
  const uploadIconContainer = document.getElementById('upload-icon-container');
  if (!dropzone) return;

  // Visual feedback
  if (uploadIconContainer) {
    uploadIconContainer.innerHTML = `<i data-lucide="refresh-cw" class="w-6 h-6 animate-spin text-indigo-600"></i>`;
    renderIcons();
  }

  try {
    // Read file as base64
    const reader = new FileReader();
    reader.onload = async () => {
      const rawBase64 = reader.result as string;
      const base64Content = rawBase64.split(',')[1] || rawBase64; // get raw string

      // Send to server real Gemini OCR pipeline!
      await API.uploadReal({
        fileContent: base64Content,
        fileName: file.name,
        mimeType: file.type || "application/pdf"
      });

      // Show success feedback
      if (uploadIconContainer) {
        uploadIconContainer.innerHTML = `<i data-lucide="check" class="w-6 h-6 text-emerald-600"></i>`;
        renderIcons();
        setTimeout(() => {
          if (uploadIconContainer) {
            uploadIconContainer.innerHTML = `<i data-lucide="upload" class="w-6 h-6 text-indigo-600"></i>`;
            renderIcons();
          }
        }, 1500);
      }

      await syncAllState();
    };

    reader.onerror = (err) => {
      console.error(err);
      alert("Falha ao ler o arquivo selecionado.");
    };

    reader.readAsDataURL(file);
  } catch (err) {
    console.error(err);
    alert("Falha ao se comunicar com o extrator cognitivo.");
  }
}

// Bind navigation selectors click listeners
function initNavigationEvents() {
  const tabs = ['dashboard', 'validation', 'contracts', 'reports', 'settings'];
  tabs.forEach(tab => {
    const btn = document.getElementById(`nav-link-${tab}`);
    if (btn) {
      btn.addEventListener('click', () => {
        state.activeTab = tab as any;
        renderAllViews();
      });
    }
  });

  // Shortcut inside right-bento panel
  const shortcutBtn = document.getElementById('dashboard-to-validation-shortcut');
  if (shortcutBtn) {
    shortcutBtn.addEventListener('click', () => {
      state.activeTab = 'validation';
      renderAllViews();
    });
  }
}

// Header search inputs
function initSearchEvents() {
  const globalSearch = document.getElementById('header-search-input') as HTMLInputElement;
  const clearBtn = document.getElementById('header-search-clear-btn');
  
  if (globalSearch) {
    globalSearch.addEventListener('input', () => {
      state.searchQuery = globalSearch.value;
      if (state.searchQuery) {
        clearBtn?.classList.remove('hidden');
      } else {
        clearBtn?.classList.add('hidden');
      }
      renderAllViews();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (globalSearch) {
        globalSearch.value = '';
        state.searchQuery = '';
        clearBtn.classList.add('hidden');
        renderAllViews();
      }
    });
  }

  // Validation page filtered selectors
  const filterStatusEl = document.getElementById('filter-status') as HTMLSelectElement;
  const filterSupplierEl = document.getElementById('filter-supplier') as HTMLSelectElement;
  const tableSearchEl = document.getElementById('filter-table-search') as HTMLInputElement;

  if (filterStatusEl) {
    filterStatusEl.addEventListener('change', () => {
      state.filterStatus = filterStatusEl.value;
      renderDocumentsTable();
    });
  }

  if (filterSupplierEl) {
    filterSupplierEl.addEventListener('change', () => {
      state.filterSupplier = filterSupplierEl.value;
      renderDocumentsTable();
    });
  }

  if (tableSearchEl) {
    tableSearchEl.addEventListener('input', () => {
      state.tableSearchQuery = tableSearchEl.value;
      renderDocumentsTable();
    });
  }

  // Reports page chronological log search
  const reportLogSearch = document.getElementById('audit-log-search-input') as HTMLInputElement;
  if (reportLogSearch) {
    reportLogSearch.addEventListener('input', () => {
      renderChronologicalExecutionsTable();
    });
  }
}

// Header Dropdowns events
function initDropdownEvents() {
  const helpBtn = document.getElementById('btn-help-dropdown');
  const helpMenu = document.getElementById('help-dropdown-menu');
  const alertBtn = document.getElementById('btn-notifications-dropdown');
  const alertMenu = document.getElementById('notifications-dropdown-menu');

  if (helpBtn && helpMenu) {
    helpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      helpMenu.classList.toggle('hidden');
      alertMenu?.classList.add('hidden');
    });
  }

  if (alertBtn && alertMenu) {
    alertBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      alertMenu.classList.toggle('hidden');
      helpMenu?.classList.add('hidden');
    });
  }

  // Close when click outside
  document.addEventListener('click', () => {
    helpMenu?.classList.add('hidden');
    alertMenu?.classList.add('hidden');
  });
}

// Details Drawer close/actions registration
function initDrawerEvents() {
  const closeBtn = document.getElementById('drawer-close-btn');
  const okBtn = document.getElementById('drawer-ok-btn');
  const overlay = document.getElementById('drawer-overlay');
  
  const approveBtn = document.getElementById('btn-drawer-approve') as HTMLButtonElement;
  const reproveBtn = document.getElementById('btn-drawer-reprove') as HTMLButtonElement;

  const closeDrawer = () => {
    toggleDrawer(false);
  };

  closeBtn?.addEventListener('click', closeDrawer);
  okBtn?.addEventListener('click', closeDrawer);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeDrawer();
    }
  });

  // Approve button action
  approveBtn?.addEventListener('click', async () => {
    if (!state.selectedDoc) return;
    state.isActionLoading = true;
    approveBtn.disabled = true;
    approveBtn.textContent = "Aprovando...";
    try {
      await API.docAction(state.selectedDoc.id, 'approve', "Auditor Geral");
      await syncAllState();
      closeDrawer();
    } catch (err) {
      console.error(err);
      alert("Erro ao validar o empenho.");
    } finally {
      state.isActionLoading = false;
    }
  });

  // Reprove button action
  reproveBtn?.addEventListener('click', async () => {
    if (!state.selectedDoc) return;
    state.isActionLoading = true;
    reproveBtn.disabled = true;
    reproveBtn.textContent = "Reprovando...";
    try {
      await API.docAction(state.selectedDoc.id, 'fail', "Auditor Geral");
      await syncAllState();
      closeDrawer();
    } catch (err) {
      console.error(err);
      alert("Erro ao reportar a restrição fiscal.");
    } finally {
      state.isActionLoading = false;
    }
  });
}

// Add Contract Modal actions
function initContractModalEvents() {
  const openBtn = document.getElementById('btn-open-add-contract-modal');
  const closeBtn = document.getElementById('btn-close-contract-modal');
  const cancelBtn = document.getElementById('btn-cancel-contract-modal');
  const form = document.getElementById('add-contract-form') as HTMLFormElement;
  const overlay = document.getElementById('contract-modal-overlay');

  openBtn?.addEventListener('click', () => {
    toggleModal(true);
  });

  const closeModal = () => {
    toggleModal(false);
  };

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-contract') as HTMLButtonElement;
    btn.disabled = true;
    btn.innerText = "Registrando...";

    const formData = new FormData(form);
    const contractData = {
      id: formData.get('id') as string,
      supplierName: formData.get('supplierName') as string,
      title: formData.get('title') as string,
      totalValue: parseFloat(formData.get('totalValue') as string),
      allocatedValue: 0, // initially zero allocated spent
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      status: 'Ativo'
    };

    try {
      // Simulate/register contract on server
      const res = await fetch('/api/upload-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docName: `${contractData.id}_Contract.pdf`,
          docType: "CONTRATO ADM",
          supplierName: contractData.supplierName,
          value: contractData.totalValue,
        })
      });

      // Optimistically append client-side mock to contracts array directly for instantly polished dashboard!
      state.contracts.push(contractData as Contract);
      
      closeModal();
      await syncAllState();
    } catch (err) {
      console.error(err);
      alert("Erro ao cadastrar contrato.");
    } finally {
      btn.disabled = false;
      btn.innerText = "Registrar Contrato";
    }
  });
}

// Settings inputs values changes listeners
function initSettingsEvents() {
  const slider = document.getElementById('settings-threshold-slider') as HTMLInputElement;
  const label = document.getElementById('settings-threshold-label');
  const form = document.getElementById('settings-form') as HTMLFormElement;

  if (slider && label) {
    slider.addEventListener('input', () => {
      label.textContent = `${slider.value}%`;
      state.settings.strictnessThreshold = parseInt(slider.value);
    });
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnText = document.getElementById('save-settings-btn-text');
    if (btnText) btnText.textContent = "Gravando...";

    const payload = {
      strictnessThreshold: state.settings.strictnessThreshold,
      autoProcessEnabled: (document.getElementById('settings-auto-process') as HTMLInputElement)?.checked,
      alertOnLowConfidence: (document.getElementById('settings-alert-low') as HTMLInputElement)?.checked,
      activeAIModel: (document.getElementById('settings-ai-model') as HTMLSelectElement)?.value,
    };

    try {
      await API.saveSettings(payload);
      if (btnText) btnText.textContent = "Salvo com sucesso!";
      setTimeout(() => {
        if (btnText) btnText.textContent = "Salvar Configurações";
      }, 1500);
      await syncAllState();
    } catch (err) {
      console.error(err);
      alert("Falha ao salvar as configurações.");
      if (btnText) btnText.textContent = "Salvar Configurações";
    }
  });
}

// Print / toggle report view sheet
function initReportEvents() {
  const toggleBtn = document.getElementById('btn-toggle-report');
  
  toggleBtn?.addEventListener('click', () => {
    state.showReportSheet = !state.showReportSheet;
    renderReportsView();
  });
}

// Reset data back to clean defaults
function initResetDemoEvents() {
  const btn = document.getElementById('btn-reset-demo');
  const btnText = document.getElementById('reset-btn-text');

  btn?.addEventListener('click', async () => {
    if (!confirm("Deseja realmente restabelecer a base de demonstração do GovFlow? Todas as notas recentes serão deletadas.")) {
      return;
    }

    if (btnText) btnText.innerText = "Resetando...";
    try {
      await API.resetDemo();
      await syncAllState();
      if (btnText) btnText.innerText = "Concluído!";
      setTimeout(() => {
        if (btnText) btnText.innerText = "Resetar Demo";
      }, 1200);
    } catch (err) {
      console.error(err);
      alert("Falha ao restabelecer base de dados.");
      if (btnText) btnText.innerText = "Resetar Demo";
    }
  });
}

// Start polling sequence for background simulate parsing tasks
function startPolling() {
  pollingInterval = setInterval(async () => {
    try {
      const active = await API.getProcessing();
      const previousCount = state.activeTasks.length;
      state.activeTasks = active;
      
      // If task finalized / count changed or we have active progress, trigger full state sync!
      if (active.length !== previousCount || active.some(p => p.progress > 0)) {
        await syncAllState();
      } else {
        renderActiveTasksList(); // update just list visual progress
      }
    } catch (err) {
      console.warn("Polling active tasks failed seamlessly:", err);
    }
  }, 3000);
}

// Global App Initialization sequence
async function initGovFlowApp() {
  // Setup HTML elements event bindings
  initNavigationEvents();
  initSearchEvents();
  initDropdownEvents();
  setupDropzone();
  initDrawerEvents();
  initContractModalEvents();
  initSettingsEvents();
  initReportEvents();
  initResetDemoEvents();

  // Sync initial server data
  await syncAllState();

  // Trigger polling
  startPolling();
}

// Run when target components load
window.addEventListener('DOMContentLoaded', () => {
  initGovFlowApp();
});
