# Forensic Analysis System for AI-Generated Content — Hackathon Plan

## 1. Project Overview

**Name**: DeepTrace — AI Content Forensics Platform
**Tagline**: _"Beyond detection. Forensic-grade AI content analysis."_
**Duration**: 24 hours | Team of 2–4
**Deployment**: Cloud (Vercel for frontend + Railway/Render for backend)

The system performs **forensic-level analysis** — not just binary classification — on text, images, audio, and video to determine if content was AI-generated. It identifies generation traces, model fingerprints, manipulation patterns, metadata inconsistencies, and watermark traces, then outputs a probability score with a forensic explanation.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REACT FRONTEND                       │
│  Upload Panel │ Results Dashboard │ Forensic Report View│
│               │ Session History   │ PDF Export           │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API (multipart upload)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 FASTAPI BACKEND                         │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────────┐  │
│  │  Text    │ │  Image   │ │  Audio  │ │   Video    │  │
│  │ Analyzer │ │ Analyzer │ │ Analyzer│ │  Analyzer  │  │
│  └────┬─────┘ └────┬─────┘ └────┬────┘ └─────┬──────┘  │
│       │             │            │             │         │
│  ┌────▼─────────────▼────────────▼─────────────▼──────┐ │
│  │           Forensic Report Generator                │ │
│  │        (Score + Explanation + PDF Export)           │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  Session Store (Redis/SQLite) │ File Processing Queue   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Detection Strategy Per Media Type

### 3.1 TEXT Analysis

| Technique | Type | Purpose |
|-----------|------|---------|
| Perplexity & burstiness analysis | Custom | LLMs produce unnaturally uniform perplexity. Human text is "bursty" — mixing simple and complex sentences. |
| Token probability analysis | API (OpenAI/local model) | Run text through a language model and check if tokens are consistently high-probability (AI hallmark). |
| Stylometric fingerprinting | Custom | Measure sentence length variance, vocabulary richness (TTR), punctuation patterns, POS tag distributions. |
| Zero-width character / Unicode watermark detection | Custom | Detect hidden watermarks embedded by AI providers (e.g., OpenAI's text watermarking). |
| Repetition & phrase entropy | Custom | AI text often repeats n-grams and has lower phrase-level entropy. |
| GPTZero / Originality.ai API | API (fallback) | Cross-validate with established detector APIs. |

**Key libraries**: `transformers`, `nltk`, `spacy`, `tiktoken`

### 3.2 IMAGE Analysis

| Technique | Type | Purpose |
|-----------|------|---------|
| EXIF / metadata inspection | Custom | AI images lack camera EXIF data. Check for generation metadata (Stable Diffusion parameters, DALL-E signatures). |
| Frequency domain analysis (FFT/DCT) | Custom | AI-generated images have distinct patterns in the frequency spectrum — GAN grid artifacts, diffusion noise signatures. |
| Error Level Analysis (ELA) | Custom | Highlights regions with inconsistent compression levels — reveals splicing or generation artifacts. |
| C2PA / Content Credentials check | Custom | Check for C2PA provenance metadata that some tools now embed. |
| Pixel-level statistical analysis | Custom | Check for uniformity in noise distribution, color histogram anomalies. |
| Pre-trained classifier | API/Model | Use a fine-tuned model (e.g., `umm-maybe/AI-image-detector` from HuggingFace) as a cross-reference. |

**Key libraries**: `Pillow`, `opencv-python`, `numpy`, `scipy` (for FFT), `exifread`, `transformers`

### 3.3 AUDIO Analysis

| Technique | Type | Purpose |
|-----------|------|---------|
| Mel-spectrogram analysis | Custom | AI-generated audio (ElevenLabs, Bark) shows characteristic spectral patterns — overly smooth harmonics, missing micro-variations. |
| Silence pattern analysis | Custom | AI audio has unnaturally uniform silence gaps. Human speech has irregular pauses. |
| Formant consistency check | Custom | AI voice cloning often has inconsistent formant transitions. |
| Metadata / container inspection | Custom | Check for encoding signatures, unusual sample rates, or generation tool metadata. |
| Audio watermark detection | Custom | Some TTS providers embed inaudible watermarks. Detect via spectral analysis in specific frequency bands. |
| Temporal jitter analysis | Custom | Human speech has natural micro-timing variations that AI often fails to replicate. |

**Key libraries**: `librosa`, `pydub`, `soundfile`, `scipy`, `numpy`

### 3.4 VIDEO Analysis

| Technique | Type | Purpose |
|-----------|------|---------|
| Frame-level image analysis | Custom (reuse image pipeline) | Extract keyframes and run image forensics on each — catches AI-generated frames. |
| Temporal consistency check | Custom | AI videos have flickering artifacts, inconsistent lighting between frames, and unnatural motion. |
| Face landmark analysis | Custom | For deepfakes: detect unnatural blinking patterns, asymmetric facial landmarks, jaw-line artifacts. |
| Audio-visual sync analysis | Custom | Check lip-sync accuracy — AI-generated talking head videos often have subtle desync. |
| Container / codec metadata | Custom | Check for encoding anomalies, missing expected metadata fields. |
| Optical flow analysis | Custom | AI-generated video has unrealistic motion patterns detectable via optical flow. |

**Key libraries**: `opencv-python`, `mediapipe` (face landmarks), `ffmpeg-python`, `numpy`

---

## 4. Forensic Report Output

Every analysis produces a **structured forensic report** containing:

```json
{
  "file_name": "sample.png",
  "file_type": "image",
  "file_hash": "sha256:abc123...",
  "overall_verdict": "Likely AI-Generated",
  "confidence_score": 0.87,
  "risk_level": "HIGH",
  "analysis_breakdown": [
    {
      "technique": "EXIF Metadata Inspection",
      "result": "SUSPICIOUS",
      "score": 0.95,
      "explanation": "No camera EXIF data found. Contains Stable Diffusion generation parameters in PNG tEXt chunk."
    },
    {
      "technique": "Frequency Domain Analysis",
      "result": "SUSPICIOUS",
      "score": 0.82,
      "explanation": "Spectral analysis reveals periodic grid-like artifacts at 64px intervals consistent with latent diffusion models."
    },
    {
      "technique": "Error Level Analysis",
      "result": "INCONCLUSIVE",
      "score": 0.51,
      "explanation": "Uniform error levels across image. No clear splicing detected but consistent with single-pass generation."
    }
  ],
  "model_fingerprint": "Stable Diffusion v1.5 (estimated)",
  "provenance_gaps": [
    "No C2PA content credentials found",
    "No originating camera or device information"
  ],
  "forensic_summary": "Image exhibits multiple indicators of AI generation: absence of photographic metadata, frequency-domain artifacts consistent with latent diffusion architecture, and uniform error levels suggesting single-pass synthesis. Estimated source model: Stable Diffusion v1.5 based on spectral signature."
}
```

**PDF Export**: Generated using `reportlab` or `weasyprint`, styled with charts (score gauges, spectral plots) and the full breakdown.

---

## 5. Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Frontend | React 18 + Vite + TailwindCSS | Fast dev, great UI components |
| State mgmt | Zustand or React Context | Lightweight, no Redux overhead |
| HTTP client | Axios | File upload progress tracking |
| Backend | FastAPI (Python 3.11+) | Async, fast, great for ML workloads |
| File handling | python-multipart + aiofiles | Async file upload processing |
| ML/Analysis | transformers, librosa, opencv, scipy, nltk | Core forensic analysis |
| PDF generation | reportlab | Forensic report PDF export |
| Session store | SQLite (via aiosqlite) | Lightweight, zero-config, sufficient for demo |
| Deployment - FE | Vercel | Free, instant deploy from git |
| Deployment - BE | Railway or Render | Free tier supports Python + ML deps |
| File storage | Temp local / Cloudinary (if needed) | Keep uploads ephemeral |

---

## 6. Project Structure

```
DeepTrace/
├── backend/
│   ├── main.py                    # FastAPI app entrypoint
│   ├── requirements.txt
│   ├── api/
│   │   ├── routes/
│   │   │   ├── analyze.py         # POST /analyze — handles all file types
│   │   │   ├── history.py         # GET /history — session-based history
│   │   │   └── report.py          # GET /report/{id}/pdf — PDF download
│   │   └── deps.py                # Dependencies (session middleware)
│   ├── analyzers/
│   │   ├── base.py                # BaseAnalyzer abstract class
│   │   ├── text_analyzer.py       # Text forensics pipeline
│   │   ├── image_analyzer.py      # Image forensics pipeline
│   │   ├── audio_analyzer.py      # Audio forensics pipeline
│   │   └── video_analyzer.py      # Video forensics pipeline
│   ├── forensics/
│   │   ├── metadata.py            # EXIF, container metadata extraction
│   │   ├── frequency.py           # FFT / spectral analysis
│   │   ├── ela.py                 # Error Level Analysis
│   │   ├── stylometry.py          # Text stylometric features
│   │   ├── spectrogram.py         # Audio spectrogram analysis
│   │   └── temporal.py            # Video temporal consistency
│   ├── report/
│   │   ├── generator.py           # Forensic report builder
│   │   └── pdf_export.py          # PDF rendering
│   ├── models/
│   │   └── schemas.py             # Pydantic models for request/response
│   └── db/
│       ├── database.py            # SQLite connection
│       └── session_store.py       # Session-based history CRUD
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── FileUpload.tsx      # Drag-and-drop upload with type detection
│   │   │   ├── AnalysisResult.tsx  # Score gauge + breakdown display
│   │   │   ├── ForensicReport.tsx  # Detailed technique-by-technique view
│   │   │   ├── SessionHistory.tsx  # Previous analyses in this session
│   │   │   ├── ScoreGauge.tsx      # Circular confidence score visual
│   │   │   └── Layout.tsx          # App shell, navigation
│   │   ├── pages/
│   │   │   ├── Home.tsx            # Landing + upload
│   │   │   ├── Analysis.tsx        # Results page
│   │   │   └── History.tsx         # Session history page
│   │   ├── hooks/
│   │   │   ├── useAnalysis.ts      # API call + state management
│   │   │   └── useSession.ts       # Session ID management
│   │   ├── services/
│   │   │   └── api.ts              # Axios API client
│   │   └── styles/
│   │       └── globals.css         # Tailwind + custom styles
│   └── public/
│       └── logo.svg
│
└── README.md
```

---

## 7. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze` | Upload file (multipart) → returns forensic analysis JSON |
| `GET` | `/api/history` | Get session analysis history (via session cookie) |
| `GET` | `/api/report/{analysis_id}` | Get full forensic report JSON |
| `GET` | `/api/report/{analysis_id}/pdf` | Download forensic report as PDF |
| `GET` | `/api/health` | Health check endpoint |

---

## 8. Task Breakdown & Timeline (24 Hours)

### Phase 1: Foundation (Hours 0–3)
| Task | Owner | Time |
|------|-------|------|
| Initialize FastAPI backend + project structure | Backend dev | 1h |
| Initialize React + Vite + Tailwind frontend | Frontend dev | 1h |
| Set up SQLite session store + Pydantic schemas | Backend dev | 1h |
| Build file upload component + API client | Frontend dev | 1h |
| Set up cloud deployment pipeline (Railway + Vercel) | DevOps/any | 1h |

### Phase 2: Core Analyzers (Hours 3–12)
| Task | Owner | Time |
|------|-------|------|
| **Text analyzer**: perplexity, burstiness, stylometry, watermark detection | Backend dev 1 | 4h |
| **Image analyzer**: EXIF, ELA, FFT frequency analysis, AI classifier | Backend dev 2 | 4h |
| **Audio analyzer**: mel-spectrogram, silence patterns, formant analysis | Backend dev 1 | 3h |
| **Video analyzer**: keyframe extraction, temporal consistency, face landmarks | Backend dev 2 | 3h |
| Build results dashboard UI (score gauge, breakdown cards) | Frontend dev | 4h |
| Build session history page | Frontend dev | 2h |

### Phase 3: Report & Polish (Hours 12–18)
| Task | Owner | Time |
|------|-------|------|
| Forensic report generator (aggregation logic, summary generation) | Backend | 2h |
| PDF export with charts and breakdown | Backend | 2h |
| Forensic report detail view in frontend | Frontend | 2h |
| PDF download button + loading states | Frontend | 1h |
| End-to-end integration testing all 4 types | All | 2h |

### Phase 4: Hardening & Demo Prep (Hours 18–24)
| Task | Owner | Time |
|------|-------|------|
| Error handling, edge cases, file validation | Backend | 2h |
| UI polish — animations, responsive design, dark mode | Frontend | 2h |
| Deploy to cloud, test live URL | All | 1h |
| Prepare demo script + test samples (1 per type) | All | 1h |
| Write README + record demo video if needed | All | 1h |

---

## 9. Scoring Strategy — What Makes This Stand Out

| Differentiator | Why It Wins |
|----------------|-------------|
| **Forensic depth, not binary detection** | Judges see a breakdown of *why* — not just "AI: yes/no" |
| **Model fingerprinting** | Attempting to identify *which* model generated it (SD vs DALL-E, GPT-4 vs Claude) is impressive |
| **Provenance gap analysis** | Checking for C2PA credentials, metadata chain-of-custody shows real-world applicability |
| **Multi-modal** | Covering 4 content types shows breadth and ambition |
| **Exportable PDF report** | Professional output judges can hold — feels like a real product |
| **Frequency/spectral visualizations** | Visual evidence (FFT heatmaps, spectrograms) is demo gold |

---

## 10. Sample Test Files to Prepare

Collect these **before** the hackathon:

| Type | Real Sample | AI Sample |
|------|-------------|-----------|
| Text | Wikipedia paragraph, news article | ChatGPT / Claude generated passage |
| Image | DSLR photo with EXIF | DALL-E 3 / Midjourney / Stable Diffusion image |
| Audio | Voice recording (phone/mic) | ElevenLabs / Bark TTS clip |
| Video | Smartphone video clip | Synthesia / HeyGen deepfake, or RunwayML gen |

---

## 11. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| ML model too large for free-tier cloud | Use lightweight models; offload heavy inference to HuggingFace Inference API |
| Video processing is slow | Process only keyframes (1 per second), not every frame |
| API rate limits (GPTZero, OpenAI) | Use APIs as secondary validation only; primary analysis is custom |
| 24h is tight for 4 media types | Prioritize text + image first (most mature tooling), then audio, video last |
| PDF generation is fiddly | Use a simple template; don't over-design |

---

## 12. Minimum Viable Demo Flow

```
1. User opens DeepTrace in browser
2. Drags an image file onto the upload zone
3. System shows a progress spinner with "Analyzing..."
4. Results appear:
   ┌─────────────────────────────────────────┐
   │  🔴 87% — Likely AI-Generated           │
   │                                         │
   │  ▸ EXIF Metadata: SUSPICIOUS (0.95)     │
   │    No camera data. SD params found.     │
   │                                         │
   │  ▸ Frequency Analysis: SUSPICIOUS (0.82)│
   │    Grid artifacts at 64px intervals.    │
   │                                         │
   │  ▸ Error Level Analysis: NEUTRAL (0.51) │
   │    Uniform compression levels.          │
   │                                         │
   │  Model Fingerprint: Stable Diffusion v1 │
   │                                         │
   │  [Download PDF Report]  [New Analysis]  │
   └─────────────────────────────────────────┘
5. User clicks "Download PDF Report" → gets a professional document
6. Analysis saved to session history for comparison
```

---

## 13. Getting Started Commands

```bash
# Backend
mkdir -p backend && cd backend
python -m venv venv && source venv/bin/activate
pip install fastapi uvicorn python-multipart aiofiles aiosqlite \
  transformers torch pillow opencv-python-headless numpy scipy \
  librosa soundfile pydub nltk spacy exifread reportlab ffmpeg-python mediapipe

# Frontend
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install axios react-router-dom zustand tailwindcss @tailwindcss/vite
```
