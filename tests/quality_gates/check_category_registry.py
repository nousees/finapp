from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
REGISTRY_PATH = ROOT / "shared/categories/finapp_categories.json"
MOBILE_CATEGORIES_PATH = ROOT / "apps/mobile/src/shared/constants/categories.ts"
ML_CATEGORIES_PATH = ROOT / "services/ml-service/app/services/categorization_service.py"
ANALYSIS_BOOTSTRAP_PATH = ROOT / "services/analysis-control/src/main/java/com/finapp/config/SystemCategoryBootstrap.java"


def fail(message: str) -> None:
    print(f"category-governance: FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_registry() -> dict:
    if not REGISTRY_PATH.exists():
        fail(f"registry is missing: {REGISTRY_PATH}")
    return json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))


def mobile_codes() -> set[str]:
    source = MOBILE_CATEGORIES_PATH.read_text(encoding="utf-8")
    return set(re.findall(r'code:\s*"([^"]+)"', source))


def ml_codes() -> set[str]:
    source = ML_CATEGORIES_PATH.read_text(encoding="utf-8")
    rule_codes = set(re.findall(r'\(\s*"([^"]+)"\s*,\s*"[^"]+"\s*,\s*[0-9.]+', source))
    explicit_codes = set(re.findall(r'"([a-z_]+)"\s*:\s*"([a-z_]+)"', source))
    flattened = {left for left, _right in explicit_codes} | {right for _left, right in explicit_codes}
    return rule_codes | {code for code in flattened if code.isascii()}


def analysis_category_ids() -> set[str]:
    source = ANALYSIS_BOOTSTRAP_PATH.read_text(encoding="utf-8")
    return set(re.findall(r"'([0-9a-fA-F-]{36})'\s*,\s*NULL", source))


def main() -> None:
    registry = load_registry()
    categories = registry.get("categories", [])
    if not isinstance(categories, list) or not categories:
        fail("registry must contain a non-empty categories list")

    codes = [item.get("code") for item in categories]
    ids = [item.get("id") for item in categories]
    registry_codes = set(codes)
    registry_ids = set(ids)

    if len(codes) != len(registry_codes):
        fail("duplicate category code in registry")
    if len(ids) != len(registry_ids):
        fail("duplicate category id in registry")

    required_fields = {"id", "code", "type", "name_en", "icon", "color"}
    allowed_types = {"EXPENSE", "INCOME", "TRANSFER"}
    for item in categories:
        missing = required_fields - set(item)
        if missing:
            fail(f"{item.get('code', '<unknown>')} missing fields: {sorted(missing)}")
        if item["type"] not in allowed_types:
            fail(f"{item['code']} has invalid type: {item['type']}")
        if not re.fullmatch(r"[a-z][a-z0-9_]*", item["code"]):
            fail(f"{item['code']} is not a stable snake_case code")

    for required_code in ("groceries", "subscriptions", "salary", "other"):
        if required_code not in registry_codes:
            fail(f"required category code is missing: {required_code}")

    mobile_missing = sorted(mobile_codes() - registry_codes)
    if mobile_missing:
        fail(f"mobile categories are missing from registry: {mobile_missing}")

    ml_missing = sorted(ml_codes() - registry_codes)
    if ml_missing:
        fail(f"ml-service categories are missing from registry: {ml_missing}")

    analysis_missing = sorted(analysis_category_ids() - registry_ids)
    if analysis_missing:
        fail(f"analysis-control bootstrap ids are missing from registry: {analysis_missing}")

    print(
        json.dumps(
            {
                "status": "ok",
                "registry_categories": len(registry_codes),
                "mobile_categories": len(mobile_codes()),
                "ml_categories": len(ml_codes()),
                "analysis_bootstrap_ids": len(analysis_category_ids()),
            },
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
