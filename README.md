# DocuSense — Full-Stack Setup Guide

## Architecture

```
Frontend  →  React / TanStack Start (Vite)   →  http://localhost:3000
Backend   →  C# ASP.NET Core Web API (.NET 10) →  http://localhost:5000
Database  →  SQLite  (docusense.db, auto-created on first run)
```

---

## Prerequisites

| Tool | Check | Install |
|------|-------|---------|
| .NET 10 SDK | `dotnet --version` | https://dotnet.microsoft.com/download |
| Node.js 20+ | `node --version` | https://nodejs.org |
| npm | `npm --version` | (bundled with Node) |

---

## Running Locally

### Option A — Single script (recommended)
```powershell
# From the repo root
.\start-dev.ps1
```

### Option B — Two terminals manually

**Terminal 1 — Backend:**
```powershell
cd "e:\thesis files\DocuSence_v1\DocuSense.Api"
dotnet run --configuration Release
# API available at http://localhost:5000
```

**Terminal 2 — Frontend:**
```powershell
cd "e:\thesis files\DocuSence_v1\widget-wonderland-08"
npm install   # first time only
npm run dev
# App available at http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/scan` | Upload a document for analysis |
| `GET` | `/api/scans` | List all past scans (newest first) |
| `GET` | `/api/scans/{id}` | Get a specific scan by ID |
| `DELETE` | `/api/scans/{id}` | Delete a scan |

### Upload example (curl)
```bash
curl -X POST http://localhost:5000/api/scan \
  -F "file=@my_paper.pdf"
```

---

## Four Analysis Layers

| # | Layer | What it measures |
|---|-------|-----------------|
| 01 | **Stylometric** | Sentence-length variance, type-token ratio (lexical diversity) |
| 02 | **Semantic** | Hedging phrases, boilerplate openers, transition cadence |
| 03 | **Metadata** | Created/modified timestamp gap vs. expected typing time |
| 04 | **Classifier** | Independent heuristic signals: AI-signature phrase density, contraction rate, sentence-starter repetition |

**Overall score** = Stylometric × 30% + Semantic × 35% + Metadata × 15% + Classifier × 20%

Each layer examines genuinely different evidence (ensemble diversity condition).

---

## Supported File Formats

`PDF`, `DOCX`, `DOC`, `TXT`, `RTF`, `ODT`

Max upload size: **100 MB**

---

## Database

The SQLite database (`docusense.db`) is created automatically at first run using EF Core migrations. The schema contains five normalized tables: Users, Documents, DetectionResults, DetectionLayerScores, HighlightedSections. All scan history is persisted there. To reset dev data, delete the file and restart the backend.

Authentication uses signed JWTs (HMAC-SHA256). The `Jwt:Key` in `appsettings.json` can be overridden via environment variable for production.

---

## Project Structure

```
DocuSence_v1/
├── DocuSense.Api/              ← C# ASP.NET Core backend
│   ├── Controllers/
│   │   └── ScanController.cs  ← REST endpoints
│   ├── Data/
│   │   └── AppDbContext.cs     ← EF Core / SQLite
│   ├── Models/
│   │   └── ScanModels.cs       ← C# types
│   ├── Services/
│   │   ├── AnalysisService.cs  ← 4-layer analysis engine
│   │   └── DocumentReaderService.cs  ← PDF/DOCX/TXT extraction
│   └── Program.cs              ← App bootstrap, CORS, DI
│
├── widget-wonderland-08/       ← React / TypeScript frontend
│   └── src/
│       ├── lib/
│       │   └── api.ts          ← Typed fetch helpers → backend
│       ├── data/
│       │   └── scans.ts        ← TypeScript type definitions
│       ├── components/docusense/
│       │   ├── UploadPanel.tsx
│       │   ├── EvidencePanel.tsx
│       │   ├── ReaderPanel.tsx
│       │   └── Dashboard.tsx
│       └── routes/
│           └── index.tsx       ← Main page (API-wired)
│
└── start-dev.ps1               ← One-click dev startup
```
