# Correção de Deployment na Vercel - GovFlow

## 🔴 Problema Identificado
O projeto não estava carregando dados na Vercel porque:
- O servidor Express (`server.ts`) não estava sendo executado corretamente
- Os endpoints da API (`/api/documents`, `/api/alerts`, etc.) não estavam acessíveis
- O Vercel não estava configurado para rodar o backend

## ✅ Solução Implementada
Convertemos a arquitetura para usar **Vercel Serverless Functions** (o padrão recomendado pela Vercel):

### Mudanças Feitas

#### 1. **Nova Pasta: `/api` (Serverless Functions)**
Criamos funções separadas para cada endpoint:
```
api/
├── shared-data.ts         # Dados compartilhados entre funções
├── documents.ts           # GET /api/documents
├── processing.ts          # GET /api/processing
├── alerts.ts              # GET /api/alerts
├── contracts.ts           # GET /api/contracts
├── settings.ts            # GET/POST /api/settings
├── stats.ts               # GET /api/stats
├── resolve-alert.ts       # POST /api/resolve-alert
├── document-action.ts     # POST /api/document-action
├── upload-simulation.ts   # POST /api/upload-simulation
├── upload-real.ts         # POST /api/upload-real
└── reset.ts               # POST /api/reset
```

#### 2. **`vercel.json` (Configuração de Deployment)**
- Define como cada rota deve ser servida
- Output directory: `dist` (Vite build)
- Build command: `npm run build`

#### 3. **`.vercelignore`**
- Exclui `server.ts` do deploy (não mais necessário)

#### 4. **`package.json`**
- Adicionado `@vercel/node: ^3.0.0` como dependência

## 🚀 Como Usar

### Localmente
O projeto continua funcionando normalmente:
```bash
npm run dev    # Roda com server.ts (desenvolvimento)
npm run build  # Build para produção
npm start      # Roda o servidor local
```

### Na Vercel
1. Faça git push das mudanças:
```bash
git add .
git commit -m "Corrigir deployment na Vercel usando Serverless Functions"
git push
```

2. A Vercel vai automaticamente:
   - Detectar os arquivos em `/api/`
   - Criar Serverless Functions para cada endpoint
   - Servir o frontend estático do `dist/`
   - Rotear corretamente `/api/*` para as funções

## 📋 Notas Técnicas

- **Estado em Memória**: Como as Serverless Functions são stateless, o estado é mantido em memória de forma compartilhada durante a execução. Para persistência real, seria necessário usar um banco de dados.
- **CORS**: Cada função tem CORS habilitado para aceitar requisições do frontend
- **Development**: Localmente ainda usa `server.ts` com Express para melhor experiência

## ✨ Resultado Esperado
- ✅ Frontend carrega sem erros
- ✅ Dados aparecem nos componentes
- ✅ APIs respondem corretamente
- ✅ Sem mais erros de "failed to fetch"
