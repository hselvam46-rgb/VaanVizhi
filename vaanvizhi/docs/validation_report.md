# VaanVizhi: Operational Downscaling Validation Report

**District Pilot:** Theni District, Tamil Nadu (8 Blocks, 130 Gram Panchayats)  
**Dataset Time Window:** 2015-01-01 to 2025-08-31 (506,480 daily records)  
**Splits:**
- **Training Window:** 2015–2022 (8 years, 379,860 records)
- **Validation Window:** 2023 (1 year, 47,450 records)
- **Held-Out Test Window:** 2024–2025 (~1.7 years, 79,170 records)

---

## 1. Headline Baseline Comparison (Held-Out Test Split)

| Meteorological Variable | M0: Block Copy (RMSE) | M2: Adiabatic Lapse Rate (RMSE) | M3: Multi-Quantile LightGBM (RMSE) | MAE Reduction vs M0 | Empirical p10–p90 Coverage (Target: 80%) |
|---|---|---|---|---|---|
| **Maximum Temperature (Tmax)** | 0.460°C | 0.392°C | **0.389°C** | **+15.3%** | **80.02%** |
| **Minimum Temperature (Tmin)** | 0.601°C | 0.566°C | **0.342°C** | **+40.6%** | **80.91%** |
| **Relative Humidity (RH)** | 3.62% | — | **2.91%** | **+19.6%** | **79.80%** |
| **Wind Speed (10m)** | 2.84 km/h | — | **2.18 km/h** | **+23.2%** | **80.40%** |

> **Key Finding**: Baseline M2 (adiabatic lapse rate: $-6.5^\circ\text{C}/\text{km}$) resolves over 75% of the spatial variance in temperature due to the dramatic elevation gradient of Theni (from 220m valley to 1450m Western Ghats ridge). The regularized M3 LightGBM captures the second-order microclimatic cooling from vegetative canopy cover, valley cold-air pooling, and reservoir proximity.

---

## 2. 2-Stage Precipitation Model Verification

Standard meteorological evaluation at the IMD rainy day threshold ($Rain \ge 2.5\text{ mm}$):

| Metric | Score | Scientific Meaning |
|---|---|---|
| **Brier Score** | **0.1442** | High probabilistic calibration of rain occurrence probability $P(\text{rain} \ge 2.5\text{ mm})$. |
| **Critical Success Index (CSI / Threat Score)** | **0.335** | Overall skill combining hit rate and false alarms. |
| **Probability of Detection (POD / Hit Rate)** | **0.429** | Fraction of actual rain events correctly flagged. |
| **False Alarm Ratio (FAR)** | **0.397** | Proportion of rain warnings where dry conditions persisted. |

---

## 3. Leave-One-Block-Out (LOBO) Spatial Generalization

Evaluates performance when an entire administrative block is withheld from training:

| Held-Out Block | Number of Panchayats ($N$) | Held-Out Residual RMSE (°C) | Geographic Setting |
|---|---|---|---|
| **Andipatti** | 30 | 0.400°C | Rain-shadow eastern scrub / Vaigai dam command |
| **Bodinayakanur** | 15 | 0.390°C | Foothills and steep slopes up to Bodi Mettu |
| **Chinnamanur** | 14 | 0.388°C | Upper Cumbum agricultural valley |
| **K. Myladumparai** | 18 | 0.406°C | Megamalai high plateau and Varusanadu valley |
| **Periyakulam** | 17 | 0.389°C | Kodaikanal foothills & Manjalar horticulture belt |
| **Theni** | 18 | 0.401°C | Central district headquarters plain |
| **Uthamapalayam** | 13 | 0.388°C | Irrigated valley floor |
| **Cumbum\*** | 5 | 0.362°C | Southern valley floor (High variance block) |

- **Headline LOBO Mean (Excluding Cumbum)**: **0.394°C**
- *\*Note on Cumbum*: Cumbum block has only 5 village panchayats. Its areal mean is subject to small-sample variance, so it is audited separately and excluded from the headline cross-validation average.

---

## 4. Mathematical Consistency Check (By Construction)

For all 650 forecast days across all 8 blocks:
$$\frac{1}{N} \sum_{i=1}^N \hat{Y}_{i}^{\text{panchayat}} - Y^{\text{block}} = 0.00000$$
The reconciliation engine mathematically conserves the block areal mean for temperature and relative humidity additively, and scales precipitation volume by expected value without negative truncation.
