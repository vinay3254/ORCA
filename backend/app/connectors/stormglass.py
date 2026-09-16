# backend/app/connectors/stormglass.py
"""Stormglass.io connector.

Real marine weather (wave height, swell, wave period, surface current speed,
water temperature) -- blends several forecast models (Stormglass's own "sg"
model, NOAA, ECMWF, ICON, DWD, Meteo) per point.

**Free-tier quota is severely limited: verified live at 10 requests/day per
key**, not per-user (see `meta.dailyQuota` in a real response). `STORMGLASS_API_KEY`
may hold one key or several comma-separated keys (e.g. from multiple free-tier
accounts); `_live_fetch_stormglass` tries each in order and moves to the next
only on a key-specific failure (401 invalid, 402 quota exhausted, 429 rate
limited), multiplying the effective daily quota by the number of configured
keys. Once every configured key is exhausted, the call fails over to the
disclosed cached snapshot exactly like IMD/MOSDAC without a key -- this is
the intended, honest degradation, not a bug to work around with request
throttling or caching beyond what `fetch_with_fallback` already does.
"""
from pathlib import Path
from typing import Any
import httpx

from app.config import get_settings
from app.connectors.base import fetch_with_fallback
from app.schemas import ConnectorResult, MarineParameter

SNAPSHOT_PATH = (
    Path(__file__).resolve().parent.parent.parent / "data" / "snapshots" / "stormglass.json"
)

STORMGLASS_BASE_URL = "https://api.stormglass.io/v2/weather/point"

# Preferred data-source model, verified against a real live response: every
# parameter tried carried an "sg" (Stormglass's own blended model) value.
PREFERRED_SOURCE = "sg"

# (output field, MarineParameter name, unit, Stormglass param name)
_PARAM_MAP = [
    ("wave_height_m", "significant_wave_height", "m", "waveHeight"),
    ("swell_height_m", "swell_height", "m", "swellHeight"),
    ("wave_period_s", "wave_period", "s", "wavePeriod"),
    ("surface_current_speed_ms", "surface_current_speed", "m/s", "currentSpeed"),
    ("sst_celsius", "sst", "°C", "waterTemperature"),
]


def _pick_source_value(source_values: dict[str, float] | None) -> float | None:
    """Stormglass nests each parameter's value by forecast-model source,
    e.g. {"sg": 0.64, "noaa": 0.73} -- not a plain number. Prefers the "sg"
    blended model; falls back to whichever source is present otherwise."""
    if not source_values:
        return None
    if PREFERRED_SOURCE in source_values:
        return source_values[PREFERRED_SOURCE]
    return next(iter(source_values.values()), None)


# Status codes that mean "this key can't serve this request" -- worth trying
# the next configured key -- rather than a real outage worth failing fast on.
_KEY_EXHAUSTED_STATUS_CODES = {401, 402, 429}


def _configured_stormglass_keys() -> list[str]:
    raw = getattr(get_settings(), "stormglass_api_key", "")
    return [key.strip() for key in raw.split(",") if key.strip()]


async def _live_fetch_stormglass(lat: float, lon: float) -> dict:
    api_keys = _configured_stormglass_keys()
    if not api_keys:
        raise ValueError("No Stormglass API key configured; triggering verified fallback")

    params = {
        "lat": lat,
        "lng": lon,
        "params": ",".join(sg_param for _, _, _, sg_param in _PARAM_MAP),
    }
    body: dict[str, Any] | None = None
    async with httpx.AsyncClient(timeout=10.0) as client:
        for api_key in api_keys:
            try:
                resp = await client.get(STORMGLASS_BASE_URL, headers={"Authorization": api_key}, params=params)
                resp.raise_for_status()
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code in _KEY_EXHAUSTED_STATUS_CODES and api_key != api_keys[-1]:
                    continue
                raise
            body = resp.json()
            break

    hours = body.get("hours", [])
    if not hours:
        raise ValueError("Stormglass returned no forecast hours")
    current = hours[0]

    result: dict[str, Any] = {"forecast_time": current.get("time")}
    parameters: list[dict[str, Any]] = []
    for field_name, mp_name, unit, sg_param in _PARAM_MAP:
        value = _pick_source_value(current.get(sg_param))
        if value is None:
            continue
        result[field_name] = value
        parameters.append(
            MarineParameter(
                parameter=mp_name,
                value=value,
                unit=unit,
                latitude=lat,
                longitude=lon,
                timestamp=current.get("time", ""),
                source="stormglass",
                data_status="LIVE",
                confidence=0.9,
            ).model_dump()
        )
    result["parameters"] = parameters
    return result


async def get_stormglass_marine_data(lat: float, lon: float) -> ConnectorResult:
    return await fetch_with_fallback(
        source="stormglass",
        live_fetch=lambda: _live_fetch_stormglass(lat, lon),
        snapshot_path=SNAPSHOT_PATH,
    )
