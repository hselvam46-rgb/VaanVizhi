# VaanVizhi: Hyperlocal Agromet Downscaling and Advisory System
**Pilot District:** Theni District, Tamil Nadu (8 Blocks, 130 Gram Panchayats)

VaanVizhi is an end-to-end meteorological and agronomic decision-support platform designed to bridge the resolution gap between coarse Numerical Weather Prediction (NWP) block forecasts (9 km ECMWF IFS / IMD Agromet DSS) and the microclimatic realities of village-level agriculture across the Western Ghats.

---

## Architecture at a Glance

```
┌──────────────────────── OFFLINE PIPELINE ────────────────────────┐
│ 1. Master Table: 130 Panchayats (LGD/Census + 11 Audited Anchors) │
│ 2. Static Covariates: DEM (Lapse Rate, Slope, TPI, Aspect),       │
│    ESA WorldCover (Tree, Crop, Built), Water Proximity, NDVI      │
│ 3. Truth Series: 10 Years (2015-2025) ERA5-Land & CHIRPS          │
│ 4. Pseudo-Block Trick: Group by Block Mean -> Learn Residuals      │
│ 5. Models (M0: Copy, M1: IDW, M2: Lapse-Rate, M3: LightGBM)       │
│    - Monotone Constraints on Elevation Anomaly                     │
│    - 2-Stage Hurdle Model for Precipitation (Occurrence + Amount)  │
│    - p10/p50/p90 Multi-Quantile Uncertainty Bands (80% Coverage)  │
│ 6. Validation: LOBO Spatial CV (Cumbum Isolated) & Held-Out Test  │
└─────────────────────────────────┬────────────────────────────────┘
                                  ▼
┌──────────────────────── ONLINE INFERENCE ─────────────────────────┐
│ Input Adapter: ECMWF IFS 9 km (Open-Meteo) or Official IMD CSV    │
│ Downscaling: M3 Multi-Quantile Residual on top of M2 Lapse Rate   │
│ Reconciliation:                                                   │
│   - Additive for Temp/RH (Areal Mean Conserved)                   │
│   - Expected Value Scaling for Rain (E[R] = p * amount Conserved) │
│ Advisory Engine: YAML Crop Rules (Banana, Grapes, Paddy, Cotton)   │
│   - Every rule cited (TNAU / ICAR GKMS)                           │
│ Delivery:                                                         │
│   - FastAPI REST Server (Port 8055)                               │
│   - Synchronized Dual-Map (ECMWF Block vs Panchayat Downscaled)   │
│   - 5-Day Shaded Quantile Chart & SHAP Top Drivers                │
│   - Tamil SMS (DLT <= 70 chars per segment) & WhatsApp Cards      │
└───────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
vaanvizhi/
├── data/
│   ├── raw/
│   │   ├── theni_gp_names.csv        # 130 verified names & blocks from theni.nic.in
│   │   ├── anchors.csv               # Independently audited ground-truth GPS anchors
│   │   ├── anchors_TEMPLATE.csv      # Template for ground-truth coordinates
│   │   └── theni_panchayats_source.csv # Source coordinates with verification stamps
│   ├── interim/
│   │   ├── truth_timeseries.csv.gz   # 10-year daily truth time series (2015-2025)
│   │   └── truth_metadata.json       # Provenance metadata & honest disclaimers
│   ├── features/
│   │   ├── panchayat_master.csv      # Validated master table (130 Panchayats)
│   │   ├── panchayat_static_features.csv # DEM, landcover, water, climatology
│   │   └── training_dataset.csv.gz   # Pseudo-block training table (506,480 rows)
│   └── models/
│       ├── model_tmax.joblib         # Multi-quantile LightGBM models (p10, p50, p90)
│       ├── model_tmin.joblib
│       ├── model_rh.joblib
│       ├── model_wind.joblib
│       ├── model_rain.joblib         # 2-stage hurdle model
│       └── validation_metrics.json   # Full benchmark evaluation metrics
├── pipeline/
│   ├── 00_build_source.py            # Geocoding runner with Nominatim & coarse box filter
│   ├── 01_master_table.py            # Strict quality gate validator (counts, box, anchors)
│   ├── 02_static_features.py         # Topographic, canopy, and hydrological covariates
│   ├── 03_download_era5_chirps.py    # Real ERA5-Land downloader via Open-Meteo Archive
│   ├── 03_truth_extract.py           # 10-year truth extractor with metadata stamping
│   ├── 04_build_training.py          # Pseudo-block training table assembler
│   └── 05_train.py                   # Model training, baselines M0-M3, LOBO spatial CV
├── serve/
│   ├── api.py                        # FastAPI application with REST endpoints
│   ├── daily_job.py                  # Daily inference job & SHAP explainability
│   ├── reconcile.py                  # Additive, multiplicative & rain reconciliation
│   └── adapters/
│       ├── ecmwf.py                  # ECMWF IFS 9 km multi-point areal mean adapter
│       └── imd_csv.py                # Official IMD CSV bulletin parser
├── advisory/
│   ├── crop_calendar.yaml            # Phenological stages for Theni signature crops
│   ├── rules/                        # Banana, Grapes, Paddy, Cotton, Coconut
│   ├── templates_ta.yaml             # Short Unicode Tamil SMS templates (< 70 chars)
│   └── engine.py                     # Rules evaluation engine with DLT segment metrics
├── web/
│   └── static/
│       ├── index.html                # Interactive single-page dashboard
│       ├── style.css                 # Dark theme modern responsive styles
│       └── app.js                    # Dual synchronized Leaflet maps & Chart.js logic
└── docs/
    ├── data_sources.md               # Complete data inventory
    ├── assumptions.md                # Scientific limits, caveats, station requirements
    └── validation_report.md          # 10-year validation report & LOBO benchmarks
```

---

## Quickstart & Running the Application

### 1. Run the FastAPI Server with Built-in Web Dashboard
```bash
python -m uvicorn vaanvizhi.serve.api:app --host 127.0.0.1 --port 8055
```
Open your browser at: **`http://127.0.0.1:8055/`**

### 2. Run the Offline Validation & Quality Gate
```bash
# Validate master table coordinates against independent anchors
python vaanvizhi/pipeline/01_master_table.py --source vaanvizhi/data/raw/theni_panchayats_source.csv --anchors vaanvizhi/data/raw/anchors.csv

# Run baseline comparison and Leave-One-Block-Out spatial CV
python vaanvizhi/pipeline/05_train.py
```

### 3. Key REST API Endpoints
- `GET /api/metadata`: Data provenance, disclaimers, and resolution caveats
- `GET /api/blocks`: Summary of 8 Theni blocks
- `GET /api/panchayats`: List of all 130 village panchayats with verification status
- `GET /api/map/{date}/{var}`: GeoJSON layer for synchronized dual-map viewer
- `GET /api/forecast/panchayat/{gp_id}`: 5-day downscaled forecast with p10-p90 bands & SHAP drivers
- `POST /api/advisory/generate`: Crop rule evaluation with Tamil SMS (DLT metrics) & WhatsApp cards
- `POST /api/input/imd-block`: Ingest official IMD CSV bulletin and recalculate downscaling
- `GET /api/validation/summary`: Complete performance metrics table
