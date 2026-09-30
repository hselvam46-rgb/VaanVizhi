"""
VaanVizhi - Step 3a: Real ERA5-Land & CHIRPS Downloader via Open-Meteo Archive API
Fetches 10+ years (2015-01-01 to 2025-09-01) of ERA5-Land reanalysis for the ~35-40 grid points
covering Theni District, Tamil Nadu. Free, open, no API key required.
"""

import os
import sys
import time
import argparse
import requests
import pandas as pd
import numpy as np

# Bounding box for ~35-40 ERA5-Land 0.1° (~9 km) grid cells over Theni
# 9.50N to 10.30N (steps of 0.1° = 9 lat points)
# 77.10E to 77.70E (steps of 0.1° = 7 lon points) -> ~40 valid cells
LATS = np.arange(9.55, 10.26, 0.1)
LONS = np.arange(77.15, 77.71, 0.1)

def download_era5_land(start_date="2015-01-01", end_date="2025-09-01", out_dir="data/raw"):
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "era5_land_theni_2015_2025.csv.gz")
    
    print(f"Targeting {len(LATS) * len(LONS)} grid cells over Theni from {start_date} to {end_date}...")
    
    all_grid_data = []
    cell_id = 1
    
    for lat in LATS:
        for lon in LONS:
            lat = round(float(lat), 3)
            lon = round(float(lon), 3)
            print(f"Fetching Cell {cell_id:02d} ({lat}N, {lon}E)...", end=" ", flush=True)
            
            url = "https://archive-api.open-meteo.com/v1/archive"
            params = {
                "latitude": lat,
                "longitude": lon,
                "start_date": start_date,
                "end_date": end_date,
                "daily": "temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,precipitation_sum,wind_speed_10m_max",
                "timezone": "Asia/Kolkata"
            }
            
            try:
                r = requests.get(url, params=params, timeout=30)
                if r.status_code == 200:
                    data = r.json()
                    daily = data.get("daily", {})
                    df_cell = pd.DataFrame({
                        "date": daily.get("time", []),
                        "grid_lat": lat,
                        "grid_lon": lon,
                        "tmax": daily.get("temperature_2m_max", []),
                        "tmin": daily.get("temperature_2m_min", []),
                        "rh": daily.get("relative_humidity_2m_mean", []),
                        "wind": daily.get("wind_speed_10m_max", []),
                        "rain": daily.get("precipitation_sum", [])
                    })
                    all_grid_data.append(df_cell)
                    print(f"OK ({len(df_cell)} days)")
                else:
                    print(f"HTTP {r.status_code}: {r.text[:80]}")
            except Exception as e:
                print(f"Network error: {e}")
                
            cell_id += 1
            time.sleep(0.5)  # Rate limiting
            
    if all_grid_data:
        df_all = pd.concat(all_grid_data, ignore_index=True)
        df_all.to_csv(out_file, index=False, compression="gzip")
        print(f"\nSaved {len(df_all):,} records to {out_file}")
    else:
        print("\nNo data downloaded. (Check network or run in online environment).")

if __name__ == "__main__":
    download_era5_land()
