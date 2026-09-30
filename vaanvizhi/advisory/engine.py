"""
VaanVizhi - Agromet Advisory Rules Engine
Evaluates phenological crop rules against downscaled hyperlocal forecasts,
formats professional English advisories, renders short DLT-compliant Tamil SMS,
and constructs formatted WhatsApp notification cards.
"""

import os
import sys
import glob
import math
import yaml
from datetime import datetime, date
from typing import Dict, List, Any

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

class AdvisoryEngine:
    def __init__(self, advisory_dir: str = None):
        if advisory_dir is None:
            advisory_dir = os.path.dirname(__file__)
        self.advisory_dir = advisory_dir
        
        # Load Crop Calendar
        cal_path = os.path.join(advisory_dir, "crop_calendar.yaml")
        with open(cal_path, "r", encoding="utf-8") as f:
            self.crop_calendar = yaml.safe_load(f)

        # Load Tamil Templates
        ta_path = os.path.join(advisory_dir, "templates_ta.yaml")
        with open(ta_path, "r", encoding="utf-8") as f:
            self.tamil_templates = yaml.safe_load(f)

        # Load all crop rules
        self.rules: List[Dict[str, Any]] = []
        rules_pattern = os.path.join(advisory_dir, "rules", "*.yaml")
        for r_file in glob.glob(rules_pattern):
            with open(r_file, "r", encoding="utf-8") as f:
                loaded = yaml.safe_load(f)
                if isinstance(loaded, list):
                    self.rules.extend(loaded)

    def determine_stage(self, crop: str, sowing_date_str: str = None, explicit_stage: str = None) -> str:
        if explicit_stage:
            return explicit_stage
            
        crop_info = self.crop_calendar.get(crop.lower())
        if not crop_info:
            return "all"
            
        if not sowing_date_str:
            # Default to primary active stage
            return list(crop_info["stages"].keys())[0]

        try:
            s_date = datetime.strptime(sowing_date_str, "%Y-%m-%d").date()
            days_after_sowing = (date.today() - s_date).days
            if days_after_sowing < 0:
                days_after_sowing = 10
        except Exception:
            days_after_sowing = 30

        for stage_name, stage_cfg in crop_info["stages"].items():
            d_min, d_max = stage_cfg["days"]
            if d_min <= days_after_sowing <= d_max:
                return stage_name

        # If beyond maximum duration, pick final stage
        return list(crop_info["stages"].keys())[-1]

    def _eval_condition(self, cond: Dict[str, Any], weather: Dict[str, float]) -> bool:
        var = cond.get("var")
        op = cond.get("op")
        val = cond.get("value")
        actual = weather.get(var)

        if actual is None:
            return False

        if op == ">":
            return actual > val
        elif op == ">=":
            return actual >= val
        elif op == "<":
            return actual < val
        elif op == "<=":
            return actual <= val
        elif op == "==":
            return actual == val
        return False

    def evaluate(self, crop: str, stage: str, weather: Dict[str, float], gp_name: str = "Panchayat", issue_date: str = None) -> List[Dict[str, Any]]:
        crop_clean = crop.lower().strip()
        matched_advisories = []

        for rule in self.rules:
            if rule.get("crop") != crop_clean and rule.get("crop") != "any":
                continue

            rule_stages = rule.get("stages", [])
            if stage not in rule_stages and "all" not in rule_stages and "any" not in rule_stages:
                continue

            # Evaluate 'when' block
            when_block = rule.get("when", {})
            all_conds = when_block.get("all", [])
            matches = True
            for c in all_conds:
                if not self._eval_condition(c, weather):
                    matches = False
                    break

            if matches:
                rule_id = rule.get("id")
                # Tamil template lookup
                ta_tmpl = self.tamil_templates.get("templates", {}).get(rule_id, {})
                tamil_sms_body = ta_tmpl.get("sms", rule.get("advice_ta", ""))
                dlt_id = ta_tmpl.get("dlt_template_id", "DLT_STANDARD")

                # Format full WhatsApp message
                crop_ta = self.crop_calendar.get(crop_clean, {}).get("crop_name_ta", crop)
                whatsapp_text = (
                    f"🌾 *வானிலை வேளாண் ஆலோசனை - தேனி மாவட்டம்*\n"
                    f"📍 *கிராம ஊராட்சி:* {gp_name}\n"
                    f"🌱 *பயிர்:* {crop_ta} ({stage})\n"
                    f"⚠️ *எச்சரிக்கை:* {tamil_sms_body}\n"
                    f"🔬 *ஆதாரம்:* {rule.get('source', 'TNAU / ICAR')}\n"
                    f"📲 *VaanVizhi தளம்:* https://vaanvizhi.tn.gov.in"
                )

                # Unicode SMS length calculation (1 segment ~ 70 Unicode chars)
                char_count = len(tamil_sms_body)
                dlt_segments = math.ceil(char_count / 70) if char_count > 0 else 1

                matched_advisories.append({
                    "rule_id": rule_id,
                    "crop": crop_clean,
                    "stage": stage,
                    "severity": rule.get("severity", "amber"),
                    "advice_en": rule.get("advice_en"),
                    "advice_ta": tamil_sms_body,
                    "whatsapp_text": whatsapp_text,
                    "source": rule.get("source"),
                    "sms_char_count": char_count,
                    "dlt_segments": dlt_segments,
                    "dlt_template_id": dlt_id
                })

        # If no severe alert triggered, return general optimal advisory
        if not matched_advisories:
            crop_ta = self.crop_calendar.get(crop_clean, {}).get("crop_name_ta", crop)
            msg_en = "Weather conditions are generally favorable. Continue regular intercultural and field maintenance operations."
            msg_ta = "வானிலை சாதாரணமாக உள்ளது. வழக்கமான பயிர் பராமரிப்பு மற்றும் மேலாண்மை பணிகளை தொடரலாம்."
            matched_advisories.append({
                "rule_id": f"{crop_clean}_general_maintenance",
                "crop": crop_clean,
                "stage": stage,
                "severity": "green",
                "advice_en": msg_en,
                "advice_ta": msg_ta,
                "whatsapp_text": f"🌾 *வேளாண் ஆலோசனை - {gp_name}*\n🌱 *பயிர்:* {crop_ta}\n✅ {msg_ta}\n🔬 *ஆதாரம்:* TNAU / ICAR GKMS",
                "source": "TNAU Agritech Portal (Standard Agromet Practices)",
                "sms_char_count": len(msg_ta),
                "dlt_segments": 1,
                "dlt_template_id": "DLT_TN_GENERAL"
            })

        return matched_advisories

if __name__ == "__main__":
    engine = AdvisoryEngine()
    print(f"Loaded {len(engine.rules)} rules across {len(engine.crop_calendar)} crops.")
    # Test evaluation
    sample_weather = {
        "tmax": 38.0, "tmin": 24.0, "rh": 86.0, "wind": 26.0, "prob_rain": 0.75, "rain_amount": 18.0
    }
    alerts = engine.evaluate(crop="banana", stage="shooting_flowering", weather=sample_weather, gp_name="Surulipatty")
    print(f"Generated {len(alerts)} alerts for Banana:")
    for a in alerts:
        print(f"[{a['severity'].upper()}] {a['rule_id']}: {a['advice_en']}")
        print(f"  Tamil SMS ({a['sms_char_count']} chars, {a['dlt_segments']} DLT seg): {a['advice_ta']}")
        print(f"  Citation: {a['source']}")
