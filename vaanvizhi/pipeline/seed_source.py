"""
Helper script to populate data/raw/theni_panchayats_source.csv from theni_gp_names.csv and anchors.csv.
The 12 audited anchor points are stamped verified=1.
The remaining 118 points are placed within their authentic block geographic envelope,
stamped verified=0 and source='unverified_draft'.
"""

import os
import pandas as pd
import numpy as np

# Authentic block cluster centers and extents for Theni District
BLOCK_CLUSTERS = {
    "Andipatti": {
        "center_lat": 9.995, "center_lon": 77.645, "lat_std": 0.045, "lon_std": 0.035,
        "lat_min": 9.88, "lat_max": 10.08, "lon_min": 77.57, "lon_max": 77.72
    },
    "Bodinayakanur": {
        "center_lat": 10.015, "center_lon": 77.355, "lat_std": 0.045, "lon_std": 0.035,
        "lat_min": 9.92, "lat_max": 10.12, "lon_min": 77.25, "lon_max": 77.44
    },
    "Chinnamanur": {
        "center_lat": 9.845, "center_lon": 77.385, "lat_std": 0.035, "lon_std": 0.030,
        "lat_min": 9.79, "lat_max": 9.91, "lon_min": 77.33, "lon_max": 77.45
    },
    "K. Myladumparai": {
        "center_lat": 9.785, "center_lon": 77.545, "lat_std": 0.055, "lon_std": 0.045,
        "lat_min": 9.65, "lat_max": 9.88, "lon_min": 77.38, "lon_max": 77.63
    },
    "Cumbum": {
        "center_lat": 9.735, "center_lon": 77.295, "lat_std": 0.025, "lon_std": 0.020,
        "lat_min": 9.68, "lat_max": 9.78, "lon_min": 77.26, "lon_max": 77.34
    },
    "Periyakulam": {
        "center_lat": 10.115, "center_lon": 77.545, "lat_std": 0.040, "lon_std": 0.035,
        "lat_min": 10.04, "lat_max": 10.18, "lon_min": 77.48, "lon_max": 77.66
    },
    "Theni": {
        "center_lat": 10.010, "center_lon": 77.480, "lat_std": 0.035, "lon_std": 0.030,
        "lat_min": 9.94, "lat_max": 10.07, "lon_min": 77.42, "lon_max": 77.54
    },
    "Uthamapalayam": {
        "center_lat": 9.815, "center_lon": 77.330, "lat_std": 0.035, "lon_std": 0.025,
        "lat_min": 9.77, "lat_max": 9.87, "lon_min": 77.28, "lon_max": 77.38
    }
}

def create_source_file():
    raw_dir = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
    names_file = os.path.join(raw_dir, "theni_gp_names.csv")
    anchors_file = os.path.join(raw_dir, "anchors.csv")
    out_file = os.path.join(raw_dir, "theni_panchayats_source.csv")

    df_names = pd.read_csv(names_file)
    df_anchors = pd.read_csv(anchors_file)

    anchors_map = {}
    for _, r in df_anchors.iterrows():
        key = (str(r["block_name"]).strip(), str(r["gp_name"]).strip())
        anchors_map[key] = (float(r["lat"]), float(r["lon"]), str(r["source"]))

    np.random.seed(101)
    rows = []

    for idx, row in df_names.iterrows():
        b_name = str(row["block_name"]).strip()
        g_name = str(row["gp_name"]).strip()
        key = (b_name, g_name)

        if key in anchors_map:
            lat, lon, src = anchors_map[key]
            rows.append({
                "block_name": b_name,
                "gp_name": g_name,
                "lat": round(lat, 5),
                "lon": round(lon, 5),
                "verified": 1,
                "source": src
            })
        else:
            # Seed based on authentic block bounds
            b_cfg = BLOCK_CLUSTERS[b_name]
            lat = np.clip(np.random.normal(b_cfg["center_lat"], b_cfg["lat_std"]), b_cfg["lat_min"], b_cfg["lat_max"])
            lon = np.clip(np.random.normal(b_cfg["center_lon"], b_cfg["lon_std"]), b_cfg["lon_min"], b_cfg["lon_max"])
            rows.append({
                "block_name": b_name,
                "gp_name": g_name,
                "lat": round(float(lat), 5),
                "lon": round(float(lon), 5),
                "verified": 0,
                "source": "unverified_draft"
            })

    df_out = pd.DataFrame(rows)
    df_out.to_csv(out_file, index=False)
    print(f"Created {len(df_out)} source records in {out_file}")
    print(f"Verified anchors: {(df_out['verified'] == 1).sum()}, Drafts: {(df_out['verified'] == 0).sum()}")

if __name__ == "__main__":
    create_source_file()
