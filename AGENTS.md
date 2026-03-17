# Repository Guidelines

## Project Structure & Module Organization
Lumina Studio is a Python + React/TypeScript full-color 3D printing application. Core business logic lives in `core/`, with zero UI dependencies. The FastAPI REST backend in `api/` exposes domain routes (`/api/calibration`, `/api/converter`, `/api/extractor`, `/api/lut`, etc.) with Pydantic schemas in `api/schemas/` and CPU-intensive workers in `api/workers/`. The legacy Gradio UI resides in `ui/`, while the primary React frontend lives in `frontend/src/` with Zustand stores, Axios API clients, and Three.js 3D rendering. Shared utilities are in `utils/` (3MF writer, LUT manager). Configuration is centralized in `config.py`. Community LUT presets are organized by brand under `lut-npy预设/`.

## Build, Test, and Development Commands
No build step needed for Python backend. Frontend builds via `cd frontend && tsc -b && vite build` to `frontend/dist/`.

Development:
- `pip install -r requirements.txt` then `cd frontend && npm install` for dependencies.
- `python main.py` starts Gradio monolithic mode.
- `start_dev.bat` or manually `python api_server.py` (backend :8000) + `cd frontend && npm run dev` (frontend :5173) for separated mode.
- `python -m pytest tests/ -v` runs Python tests; `cd frontend && npx vitest --run` runs frontend tests.
- `python -m pytest tests/ --hypothesis-show-statistics` for Property-Based test statistics.
- `docker build -t lumina-layers . && docker run -p 7860:7860 lumina-layers` for containerized deployment.

## Coding Style & Naming Conventions
Python follows PEP 8 with mandatory type hints on all new functions. Prefer NumPy vectorized operations over `for` loops. All new functions require bilingual Google-Style docstrings (English summary + 中文摘要). No emoji in identifiers. TypeScript uses functional React components with hooks, Zustand for state, and Tailwind CSS for styling. Frontend follows ESLint 9 configuration.

## Frontend Feature Requirements
All new frontend features with user-visible UI must comply with:
- **Internationalization (i18n)**: All user-facing strings must be defined in `frontend/src/i18n/translations.ts` and accessed via the `useI18n()` hook. No hardcoded Chinese or English text in components.
- **Dark/Light Theme**: All colors, backgrounds, and borders must use Tailwind theme variables or tokens from `themeConfig.ts`. Components must render correctly in both dark and light modes. Never hardcode color values like `#fff` or `bg-white`.
- Backend-only changes (core/, api/, utils/) are exempt from these requirements.

## Testing Guidelines
Python tests use pytest + Hypothesis. Unit tests are named `test_*_unit.py`, Property-Based tests `test_*_properties.py`, all under `tests/`. Frontend tests use Vitest + fast-check: unit tests as `*.test.ts(x)`, Property-Based tests as `*.property.test.ts` under `frontend/src/__tests__/`. Cover new algorithms with both unit tests and property-based tests. Worker functions must be tested with pickle-safe arguments only (file paths and scalars, no numpy arrays or PIL Images).

## Architecture Principles
- **Layered separation**: Core → API → Workers → Frontend. Core has zero UI dependencies.
- **Thread separation**: CPU-intensive tasks run in ProcessPoolExecutor via `api/workers/`. Worker functions accept only file paths and scalar parameters for pickle safety. Large results are written to temp files.
- **Coordinator pattern**: `converter.py` orchestrates the image→3D pipeline, delegating to specialized modules (image processor, mesher, vector engine, heightmap loader, 3MF exporter).
- **Strategy pattern**: `get_mesher()` selects between HighFidelityMesher and PixelArtMesher.
- **Centralized config**: All constants and settings in `config.py` (PrinterConfig, ColorSystem, ModelingMode, BedManager, WorkerPoolConfig).

## Commit & Pull Request Guidelines
Use Conventional Commits format: `<type>(<scope>): <subject>`. Types: feat / fix / docs / style / refactor / perf / test / chore. Scope matches module names (calibration, converter, extractor, lut, frontend, api, core). Examples:
- `feat(calibration): add 8-color calibration board generator`
- `fix(vector): resolve SVG path parsing edge case`
- `perf(core): vectorize color matching using numpy broadcasting`

## Security & Configuration
Keep API tokens and printer credentials out of tracked configs. `user_settings.json` is runtime-generated and should not contain secrets. Worker pool size is configurable via environment variables. HEIC support requires optional `pillow-heif` dependency. Docker deployments expose port 7860 by default.
