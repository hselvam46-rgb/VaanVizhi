# VaanVizhi: Data Sources & Provenance Inventory

| Dataset | Usage in VaanVizhi | Spatial / Temporal Resolution | Official Source & Access Protocol | Operational Notes |
|---|---|---|---|---|
| **Panchayat Master Table** | Administrative hierarchy and LGD mapping | Point / Tabular (130 Gram Panchayats across 8 Blocks) | [Local Government Directory (LGD)](https://lgdirectory.gov.in) & [Theni District Administration](https://theni.nic.in/subdivision-blocks/) | Strict 130-panchayat verification split: Andipatti 30, Bodinayakanur 15, Chinnamanur 14, K. Myladumparai 18, Cumbum 5, Periyakulam 17, Theni 18, Uthamapalayam 13. |
| **Panchayat Centroids & Anchors** | Geographic positioning & covariate extraction | Vector point centroids | Census 2011 Village Directories, Survey of India Toposheets, OSM Nominatim | Stamped with `verified=1` for audited ground truth anchors and `verified=0` for draft geocodes. |
| **Topography (DEM)** | Elevation lapse rate, slope, aspect, Topographic Position Index (TPI) | 30 m | NASA NASADEM / SRTM | 1 km buffer mean elevation; computes elevation anomaly relative to block areal mean ($\Delta elev$). |
| **Land Cover Fractions** | Canopy evaporative cooling, urban heat, and water proximity | 10 m | ESA WorldCover | Class fractions inside 1 km radius: crop, tree cover, built-up, water body. |
| **Vegetation Index (NDVI)** | Phenological transpiration & crop vigor | 10–250 m | Sentinel-2 / MODIS | Monthly composites. |
| **Hydrological Water Bodies** | Distance to reservoirs / rivers (dist_water) | Vector | OpenStreetMap & PWD Tamil Nadu | Distance to Vaigai reservoir, Manjalar dam, Sothuparai, Suruli river, and Mullaperiyar basin. |
| **Live NWP Block Forecast** | Live daily operational inference | 9 km native HRES | ECMWF IFS 9 km via Open-Meteo (`models=ecmwf_ifs`) | Multi-point spatial block mean computed over 3–5 representative sample points inside each block. |
| **Official IMD Block Forecast** | Ingestion of official Agromet DSS bulletins | Block level tabular | IMD Mausam / GKMS AMFU KVK Bulletins | Ingested via `/api/input/imd-block` CSV parser. |
| **Gridded Truth Reanalysis** | Offline model training target (2015–2025) | ~9 km hourly / daily | Copernicus ERA5-Land (Temperature, RH, Wind) & CHIRPS 0.05° (Rainfall) | In offline mode, clearly labeled `[SYNTHETIC DEMO - NOT VALIDATED ON GROUND TRUTH]`. |
| **Agronomic Advisory Rules** | Multi-crop rule triggers & advisory text | Phenological stage & probabilistic thresholds | TNAU Crop Production Guide (Horticulture & Agriculture), ICAR-KVK Theni, ICAR-NRCB | Every rule contains explicit agronomist citation (`source:` field). |
