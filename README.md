# DeepTrace — AI Content Forensics Platform

A forensic analysis system that detects AI-generated content across text, images, audio, and video. Goes beyond surface-level detection by identifying generation traces, model fingerprints, manipulation patterns, and provenance gaps.

## Features

- **Multi-Modal Analysis** — Upload text, image, audio, or video files for forensic inspection
- **Forensic Depth** — Metadata inspection, frequency-domain analysis, stylometric fingerprinting, spectral analysis, and more
- **Model Fingerprinting** — Estimates which AI model likely produced the content (Stable Diffusion, DALL-E, GPT-4, ElevenLabs, etc.)
- **Provenance Gap Detection** — Checks for C2PA content credentials, metadata chain-of-custody, and originating device information
- **Confidence Scoring** — Per-technique breakdown with individual scores and an overall probability
- **PDF Reports** — Exportable forensic reports with full analysis breakdown
- **Session History** — Track multiple analyses within a session

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Zustand |
| Backend | FastAPI, Python 3.11+ |
| ML/Analysis | transformers, librosa, OpenCV, scipy, nltk, spaCy |
| PDF Export | reportlab |
| Database | SQLite (session store) |

## Project Structure

```
DeepTrace/
├── frontend/             # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/   # UI components (FileUpload, ScoreGauge, etc.)
│   │   ├── pages/        # Route pages (Home, Analysis, History)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API client
│   │   ├── store/        # Zustand state management
│   │   ├── types/        # TypeScript type definitions
│   │   └── utils/        # Helper functions
│   └── ...
├── backend/              # FastAPI Python backend
│   ├── api/routes/       # REST endpoints
│   ├── analyzers/        # Per-media-type analysis pipelines
│   ├── forensics/        # Core forensic techniques
│   ├── report/           # Report generation + PDF export
│   ├── models/           # Pydantic schemas
│   └── db/               # SQLite session store
├── PLAN.md               # Detailed project plan
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` with a proxy to the backend.

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The API server starts at `http://localhost:8000`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze` | Upload a file for forensic analysis |
| `GET` | `/api/history` | Get session analysis history |
| `GET` | `/api/report/{id}` | Get full forensic report |
| `GET` | `/api/report/{id}/pdf` | Download report as PDF |

## Detection Techniques

### Text
Perplexity & burstiness analysis, token probability, stylometric fingerprinting, watermark detection

### Image
EXIF metadata inspection, FFT frequency analysis, Error Level Analysis (ELA), C2PA credential check, AI image classifier

### Audio
Mel-spectrogram analysis, silence pattern analysis, formant consistency, temporal jitter, watermark detection

### Video
Keyframe extraction + image pipeline, temporal consistency, face landmark analysis, audio-visual sync, optical flow

## License

MIT
