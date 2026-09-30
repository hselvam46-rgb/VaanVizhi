"""
VaanVizhi - Step 4: Build Training Dataset (Pseudo-Block Forecast Trick)
Averages panchayat truth to block level to simulate block forecasts,
computes baseline M2 lapse-rate expectations, residual targets,
temporal cyclical features, and joins all static covariates.
"""

import os
import numpy as np
import pandas as pd

def build_training_dataset(truth_path: str, static_path: str, master_path: str) -> pd.DataFrame:
    print("Loading truth timeseries and static features...")
    df_truth = pd.read_csv(truth_path, compression="gzip")
    df_static = pd.read_csv(static_path)
    df_master = pd.read_csv(master_path)

    # Convert date to datetime
    df_truth["date"] = pd.to_datetime(df_truth["date"])
    doy = df_truth["date"].dt.dayofyear.values
    doy_rad = 2 * np.pi * doy / 365.25
    df_truth["doy_sin"] = np.sin(doy_rad)
    df_truth["doy_cos"] = np.cos(doy_rad)

    # 1. Calculate Pseudo-Block Forecasts
    # Group by date and block_id to get block means and stds for each weather variable
    vars_list = ["tmax", "tmin", "rh", "wind", "rain"]
    
    # Aggregate block-level statistics
    block_aggs = df_truth.groupby(["date", "block_id"])[vars_list].agg(["mean", "std"]).reset_index()
    # Flatten multi-level columns
    flat_cols = ["date", "block_id"]
    for v in vars_list:
        flat_cols.extend([f"block_{v}_mean", f"block_{v}_std"])
    block_aggs.columns = flat_cols
    
    # Fill any NaN std with 0.0 (e.g. if single point)
    block_aggs = block_aggs.fillna(0.0)

    # Merge block forecast back to panchayat level truth
    df_merged = pd.merge(df_truth, block_aggs, on=["date", "block_id"], how="left")
    
    # Merge static features
    df_merged = pd.merge(df_merged, df_static, on=["gp_id", "block_id"], how="left")

    # 2. Compute Baseline M2 (Elevation Lapse-Rate) for Temperatures
    # M2 formula: pan = block_mean + (-0.0065) * elev_anom
    df_merged["m2_tmax"] = df_merged["block_tmax_mean"] - 0.0065 * df_merged["elev_anom"]
    df_merged["m2_tmin"] = df_merged["block_tmin_mean"] - 0.0055 * df_merged["elev_anom"]

    # 3. Targets for Machine Learning (Residuals & Rain 2-Stage)
    # Tmax & Tmin: residual on top of M2 lapse rate
    df_merged["target_tmax_resid"] = df_merged["tmax"] - df_merged["m2_tmax"]
    df_merged["target_tmin_resid"] = df_merged["tmin"] - df_merged["m2_tmin"]
    
    # RH: residual on top of block mean
    df_merged["target_rh_resid"] = df_merged["rh"] - df_merged["block_rh_mean"]
    
    # Wind: log ratio residual
    df_merged["target_wind_log_ratio"] = np.log((df_merged["wind"] + 0.1) / (df_merged["block_wind_mean"] + 0.1))

    # Rain 2-Stage:
    # Occurrence: wet threshold = 2.5 mm (standard IMD/meteorological rainy day definition)
    df_merged["target_rain_wet"] = (df_merged["rain"] >= 2.5).astype(int)
    # Amount given wet: log1p(rain)
    df_merged["target_rain_log1p"] = np.log1p(np.maximum(0.0, df_merged["rain"]))

    # Simulate lead-day (1 to 5) with slight forecast uncertainty propagation
    # In live NWP, day 1 is sharper than day 5
    np.random.seed(42)
    df_merged["lead_day"] = np.random.randint(1, 6, size=len(df_merged))

    return df_merged

if __name__ == "__main__":
    base_dir = os.path.join(os.path.dirname(__file__), "..")
    truth_file = os.path.join(base_dir, "data", "interim", "truth_timeseries.csv.gz")
    static_file = os.path.join(base_dir, "data", "features", "panchayat_static_features.csv")
    master_file = os.path.join(base_dir, "data", "features", "panchayat_master.csv")
    
    print("Building training dataset with pseudo-block forecasts...")
    df_train = build_training_dataset(truth_file, static_file, master_file)
    
    out_dir = os.path.join(base_dir, "data", "features")
    out_file = os.path.join(out_dir, "training_dataset.csv.gz")
    df_train.to_csv(out_file, index=False, compression="gzip")
    print(f"Constructed training table: {len(df_train):,} rows with {df_train.shape[1]} columns.")
    print(f"Saved to: {out_file}")
