# VaanVizhi: Meteorological Assumptions, Disclosures & Scientific Limits

### 1. Spatial Resolution of Gridded Reanalysis (~9 km)
- **The Core Limit**: Copernicus ERA5-Land provides reanalysis fields at $\approx 0.1^\circ$ (~9–10 km). Across Theni District's ~2,889 km² area, there are approximately 35–40 independent grid cells.
- **Consequence for Panchayats**: Gram Panchayats falling within the same ERA5-Land grid cell share identical reanalysis truth.
- **Physical Temperature Disaggregation**: Sub-cell temperature variations are anchored on physical dry/moist adiabatic lapse rates:
  $$\Delta T = -0.0065 \times (elev - block\_mean\_elev)$$
  The machine learning model (M3) learns only the second-order residual beyond this lapse-rate baseline.
- **Rainfall Station Verification Needed**: Because precipitation operates on fine convective scales (< 2–5 km), sub-cell precipitation skill cannot be claimed on gridded reanalysis alone. Operational deployment requires local ground validation against Tamil Nadu Agricultural University (TNAU) and IMD AWS/ARG rain gauge networks.

### 2. Consistency Check vs. Empirical Model Skill
- **Consistency by Construction**: The mathematical reconciliation operators:
  - Additive: $pan_i = p_i + (B - \bar{p})$
  - Expected Rain Rescaling: $\text{amount}'_i = \text{amount}_i \times \frac{B_{\text{rain}}}{\frac{1}{N}\sum (p_i \times \text{amount}_i)}$
  guarantee by construction that the areal panchayat mean matches the input block forecast identically ($\text{Residual} = 0.0000$).
- **Distinction**: This proves **internal physical consistency**, not forecast accuracy. Actual model skill is evaluated strictly against held-out temporal and spatial splits using RMSE, MAE, Critical Success Index (CSI), and Brier reliability scores.

### 3. Cumbum Block Sample Size ($N=5$)
- Cumbum Block contains only 5 village panchayats (the remainder of the valley tract comprises urban town panchayats and Cumbum municipality).
- Because a 5-point areal mean exhibits higher statistical variance, Cumbum is reported separately in cross-validation and excluded from the headline Leave-One-Block-Out (LOBO) average.

### 4. Tamil DLT SMS Compliance
- Under Telecom Regulatory Authority of India (TRAI) Distributed Ledger Technology (DLT) regulations, Indian SMS gateways enforce a **70-character per segment limit for Unicode text** (such as Tamil script).
- Every Tamil advisory in VaanVizhi is audited for segment length ($\le 70$ characters for critical emergency warnings) to prevent unexpected multi-segment concatenation failure on rural feature phones.

### 5. Input Quality Dependency
- Downscaled outputs are inherently constrained by the accuracy of the input numerical weather prediction (NWP) model. The interchangeable adapter architecture supports both ECMWF IFS 9 km and official IMD Agromet DSS bulletins.
