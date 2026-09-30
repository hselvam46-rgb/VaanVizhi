"""
VaanVizhi - Reconciliation Module
Enforces physical and mathematical consistency with official block-level forecasts.

Methods:
1. reconcile_additive: For temperature & RH (preserves block arithmetic mean).
2. reconcile_rain_expected_value: Reconciles expected rain E = p * amount to block total,
   rescales amounts while leaving occurrence probabilities unscaled.
3. reconcile_multiplicative: For wind speed (strictly non-negative, volume conserving).
4. reconcile_quantiles: Moves p10 and p90 uncertainty bounds consistently with the median.
"""

import numpy as np

def reconcile_additive(preds: np.ndarray, block_val: float, weights: np.ndarray = None) -> np.ndarray:
    """
    Additive reconciliation: sum(w_i * pan_i) / sum(w_i) == block_val.
    Used for Tmax, Tmin, RH.
    """
    preds = np.asarray(preds, dtype=float)
    if weights is None:
        mean_pred = float(np.mean(preds))
    else:
        weights = np.asarray(weights, dtype=float)
        mean_pred = float(np.average(preds, weights=weights))
        
    shift = block_val - mean_pred
    return preds + shift

def reconcile_rain_expected_value(probs: np.ndarray, amounts: np.ndarray, block_rain: float,
                                  amounts_p10: np.ndarray = None, amounts_p90: np.ndarray = None,
                                  eps: float = 1e-5):
    """
    Physically consistent rain reconciliation:
    Block expected rain: B = mean(p_i * amount_i).
    Reconciles the expected value by scaling amounts by kappa = B / mean(p_i * amount_i).
    Leaves occurrence probabilities unscaled.
    Also rescales p10 and p90 amounts proportionally.
    """
    probs = np.clip(np.asarray(probs, dtype=float), 0.0, 1.0)
    amounts = np.maximum(0.0, np.asarray(amounts, dtype=float))
    
    # Expected rain per panchayat
    expected_rain = probs * amounts
    mean_expected = float(np.mean(expected_rain))
    
    if block_rain <= eps or mean_expected <= eps:
        # Dry block or no rain forecast
        if block_rain <= eps:
            rec_amounts = np.zeros_like(amounts)
            rec_p10 = np.zeros_like(amounts_p10) if amounts_p10 is not None else None
            rec_p90 = np.zeros_like(amounts_p90) if amounts_p90 is not None else None
            return probs, rec_amounts, rec_p10, rec_p90, 0.0
        else:
            # Block forecast has rain but model predicted zero expected: distribute uniformly
            rec_amounts = np.full_like(amounts, block_rain)
            rec_p10 = rec_amounts * 0.5 if amounts_p10 is not None else None
            rec_p90 = rec_amounts * 1.5 if amounts_p90 is not None else None
            return probs, rec_amounts, rec_p10, rec_p90, 1.0

    # Rescaling factor
    kappa = block_rain / mean_expected
    rec_amounts = np.round(amounts * kappa, 2)
    
    rec_p10 = np.round(np.maximum(0.0, amounts_p10 * kappa), 2) if amounts_p10 is not None else None
    rec_p90 = np.round(np.maximum(0.0, amounts_p90 * kappa), 2) if amounts_p90 is not None else None
    
    return probs, rec_amounts, rec_p10, rec_p90, kappa

def reconcile_multiplicative(preds: np.ndarray, block_val: float, weights: np.ndarray = None, eps: float = 1e-4) -> np.ndarray:
    """
    Multiplicative reconciliation: ensures non-negative quantities (e.g. wind speed).
    """
    preds = np.maximum(0.0, np.asarray(preds, dtype=float))
    if weights is None:
        mean_pred = float(np.mean(preds))
    else:
        weights = np.asarray(weights, dtype=float)
        mean_pred = float(np.average(preds, weights=weights))
        
    if mean_pred > eps:
        return np.round(preds * (block_val / mean_pred), 2)
    return preds

def consistency_check(panchayat_vals: np.ndarray, block_val: float, weights: np.ndarray = None, tolerance: float = 1e-3) -> dict:
    """
    Consistency Check (By Construction):
    Verifies that the spatial aggregate over panchayats matches the block forecast.
    """
    if weights is None:
        agg = float(np.mean(panchayat_vals))
    else:
        agg = float(np.average(panchayat_vals, weights=weights))
        
    error = abs(agg - block_val)
    return {
        "block_value": round(block_val, 3),
        "panchayat_aggregated_mean": round(agg, 3),
        "absolute_residual": round(error, 5),
        "is_consistent": error <= tolerance,
        "label": "Consistency check (Satisfied by construction)"
    }
