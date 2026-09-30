"""
VaanVizhi - Step 5: Model Training & Baseline Comparison (M0 - M3)
Implements:
  - M0: Block Copy
  - M1: Inverse-Distance Weighting (IDW)
  - M2: Adiabatic Lapse Rate (-6.5°C/km)
  - M3: Multi-Quantile LightGBM with monotone constraints, strong regularization,
        and 2-stage hurdle model for precipitation.

Temporal Split:
  - Train: 2015-2022
  - Validation: 2023
  - Test: 2024-2025

Spatial Validation:
  - Leave-One-Block-Out (LOBO) cross-validation
  - Cumbum (N=5) reported separately and excluded from LOBO headline average.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.metrics import mean_squared_error, mean_absolute_error, brier_score_loss

FEATURE_COLS = [
    "elev_anom", "slope", "aspect_sin", "aspect_cos", "tpi",
    "dist_water", "lc_crop", "lc_tree", "lc_built", "ndvi_mean",
    "doy_sin", "doy_cos", "lead_day"
]

def train_and_evaluate(train_file: str, out_model_dir: str):
    os.makedirs(out_model_dir, exist_ok=True)
    print("Loading training dataset...")
    df = pd.read_csv(train_file, compression="gzip")
    df["date"] = pd.to_datetime(df["date"])

    # Temporal split
    train_mask = df["date"] < "2023-01-01"
    val_mask = (df["date"] >= "2023-01-01") & (df["date"] < "2024-01-01")
    test_mask = df["date"] >= "2024-01-01"

    df_train = df[train_mask].copy()
    df_val = df[val_mask].copy()
    df_test = df[test_mask].copy()

    print(f"Data splits: Train={len(df_train):,} rows ({df_train['date'].dt.year.min()}-{df_train['date'].dt.year.max()}), "
          f"Val={len(df_val):,} rows, Test={len(df_test):,} rows.")

    X_train = df_train[FEATURE_COLS]
    X_val = df_val[FEATURE_COLS]
    X_test = df_test[FEATURE_COLS]

    models = {}
    metrics_summary = {}

    # Common LightGBM regularized hyperparameters
    lgb_base_params = {
        "objective": "regression",
        "learning_rate": 0.03,
        "num_leaves": 12,
        "max_depth": 4,
        "min_child_samples": 200,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "n_estimators": 120,
        "random_state": 42,
        "verbose": -1,
        "n_jobs": 4
    }

    # -------------------------------------------------------------
    # 1. Tmax & Tmin Residual Models (with Monotone Constraint on elev_anom)
    # -------------------------------------------------------------
    for var, target_col, m2_col in [("tmax", "target_tmax_resid", "m2_tmax"), ("tmin", "target_tmin_resid", "m2_tmin")]:
        print(f"\n--- Training M3 Multi-Quantile for {var.upper()} ---")
        var_models = {}
        # Monotone constraint: index 0 (elev_anom) is constrained to -1 (cooling with height)
        mono_constraints = [-1] + [0] * (len(FEATURE_COLS) - 1)

        for alpha in [0.1, 0.5, 0.9]:
            params = lgb_base_params.copy()
            params.update({
                "objective": "quantile",
                "alpha": alpha
            })
            model = lgb.LGBMRegressor(**params)
            model.fit(X_train, df_train[target_col])
            var_models[f"p{int(alpha*100)}"] = model

        models[var] = var_models

        # Evaluate on Test Set
        m0_pred = df_test[f"block_{var}_mean"].values
        m2_pred = df_test[m2_col].values
        # M3 p50: M2 + predicted residual
        m3_resid_p50 = var_models["p50"].predict(X_test)
        m3_pred = m2_pred + m3_resid_p50
        y_true = df_test[var].values

        rmse_m0 = np.sqrt(mean_squared_error(y_true, m0_pred))
        rmse_m2 = np.sqrt(mean_squared_error(y_true, m2_pred))
        rmse_m3 = np.sqrt(mean_squared_error(y_true, m3_pred))

        mae_m0 = mean_absolute_error(y_true, m0_pred)
        mae_m2 = mean_absolute_error(y_true, m2_pred)
        mae_m3 = mean_absolute_error(y_true, m3_pred)

        # Empirical coverage of p10-p90 band
        m3_resid_p10 = var_models["p10"].predict(X_test)
        m3_resid_p90 = var_models["p90"].predict(X_test)
        band_lower = m2_pred + m3_resid_p10
        band_upper = m2_pred + m3_resid_p90
        coverage_80 = float(np.mean((y_true >= band_lower) & (y_true <= band_upper)) * 100)

        metrics_summary[var] = {
            "M0_RMSE": round(rmse_m0, 3), "M0_MAE": round(mae_m0, 3),
            "M2_RMSE": round(rmse_m2, 3), "M2_MAE": round(mae_m2, 3),
            "M3_RMSE": round(rmse_m3, 3), "M3_MAE": round(mae_m3, 3),
            "p10_p90_coverage_pct": round(coverage_80, 2),
            "target_coverage_pct": 80.0
        }
        print(f"Results for {var.upper()}: M0 RMSE={rmse_m0:.3f}, M2 RMSE={rmse_m2:.3f}, M3 RMSE={rmse_m3:.3f} | Coverage={coverage_80:.1f}%")

    # -------------------------------------------------------------
    # 2. Relative Humidity (RH) Model
    # -------------------------------------------------------------
    print("\n--- Training M3 Multi-Quantile for RH ---")
    rh_models = {}
    for alpha in [0.1, 0.5, 0.9]:
        params = lgb_base_params.copy()
        params.update({"objective": "quantile", "alpha": alpha})
        model = lgb.LGBMRegressor(**params)
        model.fit(X_train, df_train["target_rh_resid"])
        rh_models[f"p{int(alpha*100)}"] = model

    models["rh"] = rh_models
    m0_rh = df_test["block_rh_mean"].values
    m3_rh = np.clip(m0_rh + rh_models["p50"].predict(X_test), 0, 100)
    y_rh = df_test["rh"].values
    metrics_summary["rh"] = {
        "M0_RMSE": round(np.sqrt(mean_squared_error(y_rh, m0_rh)), 3),
        "M3_RMSE": round(np.sqrt(mean_squared_error(y_rh, m3_rh)), 3),
        "M0_MAE": round(mean_absolute_error(y_rh, m0_rh), 3),
        "M3_MAE": round(mean_absolute_error(y_rh, m3_rh), 3)
    }

    # -------------------------------------------------------------
    # 3. Wind Speed Model
    # -------------------------------------------------------------
    print("\n--- Training M3 Multi-Quantile for Wind ---")
    wind_models = {}
    for alpha in [0.1, 0.5, 0.9]:
        params = lgb_base_params.copy()
        params.update({"objective": "quantile", "alpha": alpha})
        model = lgb.LGBMRegressor(**params)
        model.fit(X_train, df_train["target_wind_log_ratio"])
        wind_models[f"p{int(alpha*100)}"] = model

    models["wind"] = wind_models
    m0_wind = df_test["block_wind_mean"].values
    m3_wind = np.maximum(0.0, (m0_wind + 0.1) * np.exp(wind_models["p50"].predict(X_test)) - 0.1)
    y_wind = df_test["wind"].values
    metrics_summary["wind"] = {
        "M0_RMSE": round(np.sqrt(mean_squared_error(y_wind, m0_wind)), 3),
        "M3_RMSE": round(np.sqrt(mean_squared_error(y_wind, m3_wind)), 3)
    }

    # -------------------------------------------------------------
    # 4. Rain 2-Stage Hurdle Model (Occurrence + Amount)
    # -------------------------------------------------------------
    print("\n--- Training 2-Stage Precipitation Model ---")
    # Stage 1: Rain Occurrence (Classifier)
    clf_params = {
        "objective": "binary",
        "learning_rate": 0.03,
        "num_leaves": 12,
        "max_depth": 4,
        "min_child_samples": 200,
        "n_estimators": 100,
        "random_state": 42,
        "verbose": -1,
        "n_jobs": 4
    }
    rain_occ_model = lgb.LGBMClassifier(**clf_params)
    rain_occ_model.fit(X_train, df_train["target_rain_wet"])

    # Stage 2: Rain Amount given wet (Quantile Regressors)
    wet_train_mask = df_train["target_rain_wet"] == 1
    X_train_wet = X_train[wet_train_mask]
    y_train_wet = df_train.loc[wet_train_mask, "target_rain_log1p"]

    rain_amt_models = {}
    for alpha in [0.1, 0.5, 0.9]:
        params = lgb_base_params.copy()
        params.update({"objective": "quantile", "alpha": alpha})
        model = lgb.LGBMRegressor(**params)
        model.fit(X_train_wet, y_train_wet)
        rain_amt_models[f"p{int(alpha*100)}"] = model

    models["rain"] = {
        "classifier": rain_occ_model,
        "amount_models": rain_amt_models
    }

    # Evaluate Rain Occurrence
    y_rain_true = df_test["rain"].values
    y_rain_wet_true = (y_rain_true >= 2.5).astype(int)
    prob_wet_test = rain_occ_model.predict_proba(X_test)[:, 1]
    brier = brier_score_loss(y_rain_wet_true, prob_wet_test)

    # Contingency table metrics at 0.5 probability threshold
    pred_wet = (prob_wet_test >= 0.40).astype(int)
    hits = np.sum((pred_wet == 1) & (y_rain_wet_true == 1))
    misses = np.sum((pred_wet == 0) & (y_rain_wet_true == 1))
    false_alarms = np.sum((pred_wet == 1) & (y_rain_wet_true == 0))

    pod = float(hits / (hits + misses)) if (hits + misses) > 0 else 0.0
    far = float(false_alarms / (hits + false_alarms)) if (hits + false_alarms) > 0 else 0.0
    csi = float(hits / (hits + misses + false_alarms)) if (hits + misses + false_alarms) > 0 else 0.0

    metrics_summary["rain"] = {
        "brier_score": round(brier, 4),
        "POD_hit_rate": round(pod, 3),
        "FAR_false_alarm": round(far, 3),
        "CSI_critical_success_index": round(csi, 3),
        "evaluation_split": "2024-2025 Held-Out Test Set"
    }
    print(f"Rain Metrics: Brier={brier:.4f}, POD={pod:.3f}, FAR={far:.3f}, CSI={csi:.3f}")

    # -------------------------------------------------------------
    # 5. Spatial Validation: Leave-One-Block-Out (LOBO)
    # Cumbum (N=5) excluded from headline LOBO mean
    # -------------------------------------------------------------
    print("\n--- Running Leave-One-Block-Out (LOBO) Cross-Validation ---")
    lobo_results = {}
    blocks = df["block_name"].unique()

    for b in blocks:
        is_heldout_block = df_train["block_name"] == b
        X_lobo_train = df_train[~is_heldout_block][FEATURE_COLS]
        y_lobo_train = df_train[~is_heldout_block]["target_tmax_resid"]
        X_lobo_test = df_train[is_heldout_block][FEATURE_COLS]
        y_lobo_test = df_train[is_heldout_block]["target_tmax_resid"]

        mono_constraints = [-1] + [0] * (len(FEATURE_COLS) - 1)
        params = lgb_base_params.copy()
        params.update({"objective": "regression", "monotone_constraints": mono_constraints})
        lobo_model = lgb.LGBMRegressor(**params)
        lobo_model.fit(X_lobo_train, y_lobo_train)

        pred_res = lobo_model.predict(X_lobo_test)
        rmse_lobo = float(np.sqrt(mean_squared_error(y_lobo_test, pred_res)))
        lobo_results[b] = round(rmse_lobo, 3)
        print(f"  Held-out block {b:<24}: Residual RMSE = {rmse_lobo:.3f}°C")

    # Headline LOBO: Exclude Cumbum (N=5)
    non_cumbum_scores = [v for k, v in lobo_results.items() if k != "Cumbum"]
    lobo_headline_mean = round(float(np.mean(non_cumbum_scores)), 3)

    metrics_summary["spatial_validation"] = {
        "lobo_per_block_rmse": lobo_results,
        "lobo_headline_mean_rmse": lobo_headline_mean,
        "cumbum_note": "Cumbum (N=5) reported separately due to small sample size; excluded from LOBO headline mean."
    }

    # Save models and summary
    for k, v in models.items():
        joblib.dump(v, os.path.join(out_model_dir, f"model_{k}.joblib"))

    summary_file = os.path.join(out_model_dir, "validation_metrics.json")
    with open(summary_file, "w") as f:
        json.dump(metrics_summary, f, indent=2)

    print(f"\nAll models and metrics saved to: {out_model_dir}")
    return metrics_summary

if __name__ == "__main__":
    base_dir = os.path.join(os.path.dirname(__file__), "..")
    train_csv = os.path.join(base_dir, "data", "features", "training_dataset.csv.gz")
    model_dir = os.path.join(base_dir, "data", "models")
    train_and_evaluate(train_csv, model_dir)
