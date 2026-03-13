# LUCID — Layered Unforgable Content Integrity Detection

An AI content forensics platform that performs forensic-grade analysis on text, images, audio, and video to determine if content was AI-generated. Goes beyond binary classification by identifying generation traces, model fingerprints, manipulation patterns, and provenance gaps.

Built for **Cyberthon '26**.

## Features

- **Multi-Modal Analysis** — Upload text, image, audio, or video files for forensic inspection
- **Deep Learning Classifiers** — BERT + LoRA for text, LSTM (ONNX) for audio deepfake detection
- **Gemini Multimodal AI** — Google Gemini 2.5 Flash for image and video analysis
- **Signal Processing** — FFT frequency analysis, Error Level Analysis, mel-spectrograms, optical flow, stylometry
- **Model Fingerprinting** — Estimates which AI model likely produced the content (Stable Diffusion, DALL-E, ElevenLabs, etc.)
- **Provenance Gap Detection** — Checks for C2PA content credentials, metadata chain-of-custody, and originating device information
- **Weighted Confidence Scoring** — Per-technique breakdown with individual scores and a weighted overall probability
- **PDF Reports** — Exportable forensic reports with full analysis breakdown
- **Session History** — Track multiple analyses within a session

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS 4, Zustand, Recharts |
| Backend | FastAPI, Python 3.11+, SQLite (aiosqlite) |
| Text ML | BERT (bert-base-cased) + LoRA adapters via PyTorch, Transformers, PEFT |
| Audio ML | LSTM neural network via ONNX Runtime (MFCC feature extraction with librosa) |
| Multimodal AI | Google Gemini 2.5 Flash (image + video analysis) |
| Signal Processing | OpenCV, librosa, scipy, numpy, nltk |
| PDF Export | ReportLab |

## Project Structure

```
LUCID/
├── frontend/                     # React + Vite + TypeScript
│   └── src/
│       ├── components/
│       │   ├── FileUpload.tsx        # Drag-and-drop upload with type detection
│       │   ├── AnalysisResult.tsx     # Score gauge + breakdown display
│       │   ├── ScoreGauge.tsx         # Circular confidence score visual
│       │   ├── SessionHistory.tsx     # Previous analyses in this session
│       │   ├── Layout.tsx             # App shell, navigation
│       │   └── techniques/
│       │       ├── HeroCard.tsx           # Promoted ML technique card (BERT/LSTM)
│       │       ├── TechniqueAccordion.tsx # Expandable technique list
│       │       ├── TextTechniques.tsx     # Text analysis layout
│       │       ├── ImageTechniques.tsx    # Image analysis layout
│       │       ├── AudioTechniques.tsx    # Audio analysis layout
│       │       ├── VideoTechniques.tsx    # Video analysis layout
│       │       └── constants.ts          # Interpretation text + helpers
│       ├── pages/
│       │   ├── Home.tsx              # Landing page + upload
│       │   ├── Analysis.tsx          # Results page
│       │   └── History.tsx           # Session history page
│       ├── hooks/                    # useAnalysis, useSession
│       ├── services/                 # Axios API client
│       ├── store/                    # Zustand state management
│       ├── types/                    # TypeScript type definitions
│       └── utils/                    # Helper functions
│
├── backend/                      # FastAPI Python backend
│   ├── main.py                       # App entrypoint + lifespan (model preloading)
│   ├── requirements.txt
│   ├── api/
│   │   ├── routes/
│   │   │   ├── analyze.py            # POST /api/analyze
│   │   │   ├── history.py            # GET /api/history
│   │   │   └── report.py             # GET /api/report/{id}, /api/report/{id}/pdf
│   │   └── deps.py                   # Session cookie management
│   ├── analyzers/
│   │   ├── base.py                   # BaseAnalyzer abstract class
│   │   ├── text_analyzer.py          # Text forensics (6 stylometry + BERT)
│   │   ├── image_analyzer.py         # Image forensics (metadata + FFT + ELA + Gemini)
│   │   ├── audio_analyzer.py         # Audio forensics (spectrogram + jitter + LSTM)
│   │   └── video_analyzer.py         # Video forensics (temporal + optical flow + Gemini)
│   ├── forensics/
│   │   ├── bert_classifier.py        # BERT + LoRA text classifier (PyTorch)
│   │   ├── lstm_audio_classifier.py  # LSTM audio deepfake classifier (ONNX Runtime)
│   │   ├── gemini_analyzer.py        # Google Gemini multimodal analyzer
│   │   ├── metadata.py               # EXIF, audio, video metadata extraction
│   │   ├── frequency.py              # FFT spectral analysis
│   │   ├── ela.py                    # Error Level Analysis
│   │   ├── stylometry.py             # Text stylometric features
│   │   ├── spectrogram.py            # Mel-spectrogram, silence, jitter analysis
│   │   └── temporal.py               # Video temporal consistency
│   ├── ml_models/
│   │   ├── bert_ai_detector/         # BERT + LoRA adapter weights
│   │   └── lstm_audio_deepfake/      # LSTM ONNX model + MFCC scaler
│   ├── report/
│   │   └── generator.py              # Forensic report builder + PDF export
│   ├── models/
│   │   └── schemas.py                # Pydantic models (ForensicReport, etc.)
│   └── db/
│       ├── database.py               # SQLite connection (aiosqlite)
│       └── session_store.py          # Session-based history CRUD
│
├── PLAN.md
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+

### Backend

```bash
cd backend
python -m venv venv
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```env
GEMINI_API_KEY=your_google_gemini_api_key_here
```

Start the API server:

```bash
uvicorn main:app --reload
```

The backend starts at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` with a proxy to the backend at `/api`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze` | Upload a file for forensic analysis (multipart form) |
| `GET` | `/api/history` | Get session analysis history (via session cookie) |
| `GET` | `/api/report/{id}` | Get full forensic report JSON |
| `GET` | `/api/report/{id}/pdf` | Download forensic report as PDF |
| `GET` | `/api/health` | Health check |

## Detection Techniques

### Text (7 techniques)

| Technique | Type | Weight |
|-----------|------|--------|
| BERT + LoRA Deep Learning Classifier | Neural Network | 5.0x |
| Sentence Length Variance | Stylometry | 1.0x |
| Vocabulary Richness (TTR) | Stylometry | 1.0x |
| Punctuation Pattern Analysis | Stylometry | 1.0x |
| Repetition & N-gram Entropy | Stylometry | 1.0x |
| POS Tag Distribution | Stylometry | 1.0x |
| Readability Metrics | Stylometry | 1.0x |

### Image (6 techniques)

| Technique | Type | Weight |
|-----------|------|--------|
| Gemini Multimodal Analysis | AI Model | 4.0x |
| EXIF / Metadata Inspection | Forensic | 2.0x |
| Frequency Domain Analysis (FFT) | Signal Processing | 1.0x |
| Error Level Analysis (ELA) | Signal Processing | 1.0x |
| Pixel Statistical Analysis | Signal Processing | 1.0x |
| Color Histogram Analysis | Signal Processing | 1.0x |

### Audio (5 techniques)

| Technique | Type | Weight |
|-----------|------|--------|
| LSTM Deep Learning Audio Classifier | Neural Network (ONNX) | 5.0x |
| Audio Metadata Inspection | Forensic | 2.0x |
| Mel-Spectrogram Analysis | Signal Processing | 1.0x |
| Silence Pattern Analysis | Signal Processing | 1.0x |
| Pitch & Amplitude Jitter Analysis | Signal Processing | 1.0x |

### Video (5 techniques)

| Technique | Type | Weight |
|-----------|------|--------|
| Gemini Video Analysis | AI Model | 4.0x |
| Video Metadata Inspection | Forensic | 2.0x |
| Temporal Consistency Analysis | Signal Processing | 1.0x |
| Face Landmark Analysis | Computer Vision | 1.0x |
| Optical Flow Detection | Computer Vision | 1.0x |

## Scoring System

Each technique produces a score from 0.0 to 1.0 and a result label (SUSPICIOUS / INCONCLUSIVE / CLEAN). The final confidence score is a **weighted average** of all techniques:

| Verdict | Score Range | Risk Level |
|---------|-------------|------------|
| AI-Generated | >= 85% | CRITICAL |
| Likely AI-Generated | >= 65% | HIGH |
| Inconclusive | >= 45% | MEDIUM |
| Likely Human | >= 25% | LOW |
| Human | < 25% | NONE |

## ML Models

### BERT Text Classifier
- Base: `bert-base-cased` with LoRA (PEFT) adapters
- Trained on human vs AI-generated text
- Input: first ~512 tokens
- Output: binary classification (AI-Generated / Human-Written) with confidence
- Runtime: PyTorch

### LSTM Audio Deepfake Classifier
- Architecture: LSTM neural network
- Features: 40 MFCC coefficients extracted from 1-second audio chunks
- Preprocessing: StandardScaler normalization (fitted during training)
- Input: `.wav`, `.flac`, `.mp3`, `.ogg` files
- Output: binary classification (AI-Generated / Human-Audio) with confidence
- Runtime: ONNX Runtime

### Google Gemini 2.5 Flash
- Used for image and video multimodal analysis
- Requires `GEMINI_API_KEY` environment variable
- Gracefully skipped if API key is not configured

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | No | Google Gemini API key for multimodal image/video analysis. If not set, Gemini techniques are skipped. |

## License

MIT
