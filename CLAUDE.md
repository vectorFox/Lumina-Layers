# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Lumina Studio is a physics-based multi-material FDM full-color 3D printing system. It converts arbitrary images into printable full-color 3D models through optical color mixing (transmissive mixing) by stacking transparent filaments. The system uses a closed-loop calibration approach: print physical calibration boards, photograph them to extract actual RGB values, generate LUT lookup tables, and use KDTree nearest-neighbor matching to map image pixels to print layer combinations.

## Architecture

### Layered Architecture
- **Core** (`core/`): Pure business logic, zero UI dependencies
- **API** (`api/`): FastAPI routes + Pydantic schemas, calls Core
- **Workers** (`api/workers/`): CPU-intensive tasks via ProcessPoolExecutor in isolated processes
- **UI** (`ui/`): Gradio components + event handlers (legacy Python frontend)
- **Frontend** (`frontend/`): React + TypeScript SPA, communicates with API via HTTP

### Key Design Patterns
- **Coordinator**: `converter.py` orchestrates image→3D pipeline, delegating to specialized modules
- **Strategy**: `get_mesher()` selects mesh generation strategy (HighFidelityMesher / PixelArtMesher)
- **Thread Separation**: Worker functions accept only file paths and scalar params (pickle-safe), write large results to temp files
- **Centralized Config**: All constants in `config.py` (PrinterConfig, ColorSystem, ModelingMode, BedManager, etc.)

### Three Core Modules
1. **Calibration Generator** — Generates precision calibration boards for physical testing
2. **Color Extractor** — Digitizes photographed calibration boards into LUT files
3. **Image Converter** — Converts images to 3D models using calibration data

## Build & Development Commands

```bash
# Install dependencies
pip install -r requirements.txt
cd frontend && npm install

# Start Gradio monolithic mode
python main.py

# Start frontend + backend separated mode (Windows)
start_dev.bat
# Or manually:
python api_server.py          # Backend :8000
cd frontend && npm run dev    # Frontend :5173

# Run Python tests
python -m pytest tests/ -v

# Run frontend tests
cd frontend && npx vitest --run

# Run Property-Based tests with statistics
python -m pytest tests/ --hypothesis-show-statistics

# Docker
docker build -t lumina-layers .
docker run -p 7860:7860 lumina-layers


# Build frontend for production
cd frontend && tsc -b && vite build
```

## Technology Stack

### Backend (Python)
- **Language**: Python 3.x
- **UI Framework**: Gradio 6.0+
- **API Framework**: FastAPI + Uvicorn (port 8000)
- **Geometry**: Trimesh 4.0+ (mesh generation & export)
- **Computer Vision**: OpenCV (perspective correction, color extraction)
- **Scientific Computing**: NumPy, SciPy, Numba (JIT acceleration)
- **Color Matching**: SciPy KDTree (nearest-neighbor search)
- **Image I/O**: Pillow, pillow-heif (HEIC/HEIF support)
- **Vector Engine**: svgelements, Shapely, mapbox-earcut
- **3MF Export**: Trimesh + lxml + custom BambuStudio metadata writer

### Frontend (TypeScript)
- **Framework**: React 19 + TypeScript 5.8
- **Build Tool**: Vite 6
- **3D Rendering**: Three.js + @react-three/fiber + @react-three/drei
- **State Management**: Zustand 5
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS 4
- **Testing**: Vitest 4 + fast-check (Property-Based Testing)

## Project Structure

```
Lumina-Layers/
├── main.py                 # Gradio monolithic entry point
├── api_server.py           # FastAPI backend entry (uvicorn :8000)
├── config.py               # Centralized configuration
├── core/                   # Pure business logic (no UI deps)
│   ├── converter.py        # Image→3D coordinator
│   ├── calibration.py      # Calibration board generation
│   ├── extractor.py        # Color data extraction from photos
│   ├── image_processing.py # Color quantization & matching
│   ├── mesh_generators.py  # Mesh strategies (HiFi / PixelArt)
│   ├── vector_engine.py    # SVG→3D native vector engine
│   ├── color_replacement.py # Connected-region color replacement
│   ├── heightmap_loader.py # 2.5D relief heightmap processing
│   └── ...
├── api/                    # FastAPI REST backend
│   ├── routers/            # Domain routes (/api/calibration, /converter, etc.)
│   ├── schemas/            # Pydantic request/response models
│   ├── workers/            # CPU-intensive worker functions (process pool)
│   ├── file_bridge.py      # Upload→ndarray/tempfile, HEIC conversion
│   ├── session_store.py    # Session state storage
│   └── worker_pool.py      # ProcessPoolExecutor lifecycle
├── frontend/src/           # React + TypeScript SPA
│   ├── api/                # Axios API clients (per domain)
│   ├── components/         # React components (sections/, ui/, widget/)
│   ├── stores/             # Zustand state stores
│   ├── hooks/              # Custom React hooks
│   └── __tests__/          # Unit + Property-Based tests
├── ui/                     # Gradio UI components (legacy)
├── utils/                  # Helpers (3MF writer, LUT manager, stats)
├── tests/                  # Python tests (pytest + Hypothesis)
├── assets/                 # Reference calibration images & data
└── lut-npy预设/            # Community LUT presets by brand
```

## Coding Standards

### Python
- All new functions require type hints
- Prefer `numpy` vectorized operations over `for` loops
- Bilingual Google-Style docstrings (English summary + Chinese summary):
```python
def func(param: str) -> int:
    """English summary.
    中文摘要。

    Args:
        param (str): English description. (中文描述)

    Returns:
        int: English description. (中文描述)
    """
```
- No emoji in variable or function names
- Worker functions must be pickle-serializable (top-level functions, scalar/path args only)

### TypeScript / React
- Functional components with hooks
- Zustand for state management (no Redux)
- API clients organized by domain in `frontend/src/api/`
- Tailwind CSS for styling, dark/light theme via `themeConfig.ts`

### Frontend Feature Checklist
All new frontend features with user-visible UI must satisfy:
1. **i18n**: All user-facing text must go through `frontend/src/i18n/translations.ts` — no hardcoded Chinese or English strings in components. Use the `useI18n()` hook to retrieve translations.
2. **Theme**: All colors, backgrounds, and borders must use Tailwind theme variables or `themeConfig.ts` tokens. Components must render correctly in both dark and light modes. Never use hardcoded color values (e.g. `#fff`, `bg-white`).
3. **Backend-only features** (core/, api/, utils/) are exempt from i18n and theme requirements.

## Testing

### Python (pytest + Hypothesis)
- Unit tests: `tests/test_*_unit.py`
- Property-Based tests: `tests/test_*_properties.py`
- Run: `python -m pytest tests/ -v`

### Frontend (Vitest + fast-check)
- Unit tests: `frontend/src/__tests__/*.test.ts(x)`
- Property-Based tests: `frontend/src/__tests__/*.property.test.ts`
- Run: `cd frontend && npx vitest --run`

## Performance Considerations

- K-Means color quantization reduces matching complexity (1M pixels → 64 colors)
- KD-Tree spatial index for O(log n) color lookup
- Hue-aware matching engine (`color_matching_hue_aware.py`) improves color fidelity
- NumPy vectorized operations for voxel matrix filling
- Large model preview downsampling (>1600px)
- Numba JIT for critical computation paths
- ProcessPoolExecutor isolates CPU-intensive tasks from asyncio event loop
- `Cache-Control: no-cache` headers ensure preview refresh after color replacement

## Supported Color Systems

| Mode | Filaments | Colors | Notes |
|------|-----------|--------|-------|
| CMYW | 4 | 1024 | Cyan/Magenta/Yellow/White |
| RYBW | 4 | 1024 | Red/Yellow/Blue/White |
| 6-Color | 6 | 1296 | Extended six-color |
| 8-Color Max | 8 | 2738 | Professional (dual-page workflow) |
| 5-Color Extended | 5 | — | Red/Yellow/Blue/Black/White |
| BW | 2 | 32 | Black & white grayscale |

## Output Formats

| Format | Purpose |
|--------|---------|
| `.3mf` | 3D Manufacturing Format (BambuStudio compatible, with metadata) |
| `.glb` | GL Transmission Format (3D preview) |
| `.npy` | NumPy array (LUT calibration data) |
| `.npz` | Compressed NumPy (merged LUT + stacking data + metadata) |
| `.svg` | Vector graphics (vector engine input) |

## Important Notes

- The project maintains dual frontends: Gradio (legacy) and React (primary development direction)
- React frontend has full feature coverage and is the recommended interface
- Slicer integration supports BambuStudio, OrcaSlicer, and ElegooSlicer
- PyInstaller is used for standalone executable packaging
- License: CC BY-NC-SA 4.0 with commercial exemption for individual creators and small businesses selling physical prints
