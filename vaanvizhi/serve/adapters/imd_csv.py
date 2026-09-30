"""
VaanVizhi - Official IMD Block Forecast CSV Adapter
Parses officer/KVK-uploaded CSV bulletins containing official IMD Agromet block forecasts.
"""

import io
import pandas as pd
from typing import Dict, List, Any

REQUIRED_COLUMNS = {"block_id", "date", "tmax", "tmin", "rh", "wind", "rain"}

def parse_imd_csv(csv_content: str) -> Dict[str, Any]:
    """
    Parses an uploaded IMD CSV string.
    Expected format:
      block_id,date,tmax,tmin,rh,wind,rain
      BODI,2026-09-30,34.0,23.5,72.0,14.5,4.0
    """
    try:
        df = pd.read_csv(io.StringIO(csv_content))
    except Exception as e:
        return {"status": "error", "message": f"Malformed CSV: {e}"}

    df.columns = [c.strip().lower() for c in df.columns]
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        return {"status": "error", "message": f"CSV missing required columns: {missing}"}

    forecasts_by_block = {}
    for block_id, grp in df.groupby("block_id"):
        block_id_clean = str(block_id).strip().upper()
        records = []
        for i, (_, row) in enumerate(grp.sort_values(by="date").iterrows()):
            records.append({
                "date": str(row["date"]).strip(),
                "lead_day": i + 1,
                "tmax": float(row["tmax"]),
                "tmin": float(row["tmin"]),
                "rh": float(row["rh"]),
                "wind": float(row["wind"]),
                "rain": float(row["rain"])
            })
        forecasts_by_block[block_id_clean] = records

    return {
        "status": "success",
        "blocks_loaded": list(forecasts_by_block.keys()),
        "total_records": len(df),
        "source": "official_imd_csv_upload",
        "data": forecasts_by_block
    }
