"""
VaanVizhi - Step 0: Build Source Coordinates (Geocoding via OSM Nominatim)
Takes the official list of Gram Panchayat names and Blocks from theni.nic.in,
queries OSM Nominatim within the coarse Theni bounding box, leaves unresolved rows blank,
and stamps all geocoded rows with verified=0.
"""

import os
import sys
import time
import argparse
import requests
import pandas as pd
import numpy as np

# Coarse Theni District Bounding Box (Lat 9.40 - 10.50 N, Lon 76.90 - 78.00 E)
COARSE_LAT_MIN = 9.40
COARSE_LAT_MAX = 10.50
COARSE_LON_MIN = 76.90
COARSE_LON_MAX = 78.00

def geocode_village(gp_name: str, block_name: str, email: str, timeout: int = 10):
    """
    Queries OpenStreetMap Nominatim with proper user-agent etiquette.
    Tries hierarchical queries: (1) Village, Block, Theni, Tamil Nadu (2) Village, Theni, Tamil Nadu.
    Accepts coordinates ONLY if inside the coarse Theni bounding box.
    """
    headers = {
        "User-Agent": f"VaanVizhi-Geocode-Tool/1.0 ({email})"
    }
    
    queries = [
        f"{gp_name}, {block_name}, Theni, Tamil Nadu, India",
        f"{gp_name}, Theni, Tamil Nadu, India",
        f"{gp_name} village, Theni, Tamil Nadu, India"
    ]
    
    for q in queries:
        try:
            params = {
                "q": q,
                "format": "json",
                "limit": 1,
                "viewbox": f"{COARSE_LON_MIN},{COARSE_LAT_MAX},{COARSE_LON_MAX},{COARSE_LAT_MIN}",
                "bounded": 1
            }
            resp = requests.get("https://nominatim.openstreetmap.org/search", params=params, headers=headers, timeout=timeout)
            if resp.status_code == 200:
                results = resp.json()
                if results:
                    lat = float(results[0]["lat"])
                    lon = float(results[0]["lon"])
                    if COARSE_LAT_MIN <= lat <= COARSE_LAT_MAX and COARSE_LON_MIN <= lon <= COARSE_LON_MAX:
                        return lat, lon, "nominatim_bounded"
            time.sleep(1.0)  # Respect Nominatim 1 req/sec policy
        except Exception:
            pass
            
    return None, None, "unresolved"

def build_source(names_file: str, out_file: str, email: str):
    if not os.path.exists(names_file):
        raise FileNotFoundError(f"Names file not found: {names_file}")
        
    df_names = pd.read_csv(names_file)
    print(f"Loaded {len(df_names)} panchayat records from {names_file}")
    
    # If out_file already exists, load existing to avoid re-querying resolved rows
    existing_data = {}
    if os.path.exists(out_file):
        try:
            df_old = pd.read_csv(out_file)
            for _, r in df_old.iterrows():
                key = (str(r["block_name"]).strip(), str(r["gp_name"]).strip())
                existing_data[key] = (r.get("lat"), r.get("lon"), r.get("verified", 0), r.get("source", "existing"))
            print(f"Found existing source file with {len(existing_data)} entries.")
        except Exception:
            pass

    records = []
    resolved_count = 0
    blank_count = 0

    for idx, row in df_names.iterrows():
        b_name = str(row["block_name"]).strip()
        g_name = str(row["gp_name"]).strip()
        key = (b_name, g_name)
        
        if key in existing_data and pd.notna(existing_data[key][0]) and pd.notna(existing_data[key][1]):
            lat, lon, verified, src = existing_data[key]
            records.append({
                "block_name": b_name,
                "gp_name": g_name,
                "lat": lat,
                "lon": lon,
                "verified": verified,
                "source": src
            })
            resolved_count += 1
            continue

        print(f"[{idx+1}/{len(df_names)}] Geocoding {g_name} ({b_name})...", end=" ", flush=True)
        lat, lon, src = geocode_village(g_name, b_name, email)
        
        if lat is not None and lon is not None:
            print(f"OK -> ({lat:.4f}, {lon:.4f})")
            records.append({
                "block_name": b_name,
                "gp_name": g_name,
                "lat": round(lat, 5),
                "lon": round(lon, 5),
                "verified": 0,
                "source": src
            })
            resolved_count += 1
        else:
            print("BLANK (Requires manual coordinates)")
            records.append({
                "block_name": b_name,
                "gp_name": g_name,
                "lat": "",
                "lon": "",
                "verified": 0,
                "source": "unresolved_blank"
            })
            blank_count += 1

    df_out = pd.DataFrame(records)
    os.makedirs(os.path.dirname(out_file) or ".", exist_ok=True)
    df_out.to_csv(out_file, index=False)
    print(f"\nDone! Source file written to: {out_file}")
    print(f"Summary: {resolved_count} resolved, {blank_count} left blank for manual/independent entry.")
    print("All geocoded rows stamped with verified=0 as untrusted drafts.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Geocode Theni Gram Panchayats with Nominatim")
    parser.add_argument("--names", default=os.path.join(os.path.dirname(__file__), "..", "data", "raw", "theni_gp_names.csv"))
    parser.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "data", "raw", "theni_panchayats_source.csv"))
    parser.add_argument("--email", default="agromet-ops@vaanvizhi.tn.gov.in")
    args = parser.parse_args()
    
    build_source(args.names, args.out, args.email)
