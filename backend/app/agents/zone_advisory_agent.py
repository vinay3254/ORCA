# backend/app/agents/zone_advisory_agent.py
"""Zone Advisory Agent.

Answers "which fishing zones should I avoid?" by scanning a small ring of
candidate zones around the query location and flagging which ones are
currently hazardous -- reusing the same lightweight forecast+risk pattern
already used by what_if_agent's spatial comparison (a direct INCOIS marine
forecast call + calculate_risk, not the full weather_agent/risk_agent
Stormglass-backed pipeline, so a scan of several candidates doesn't burn
through Stormglass's severely limited free-tier daily quota).
"""
import asyncio
from datetime import datetime, timezone
from app.agents.risk_engine import calculate_risk
from app.agents.what_if_agent import calculate_destination_coords
from app.connectors.incois import get_marine_forecast
from app.connectors.geospatial import get_nearby_boundary
from app.schemas import TraceEntry

# A compass ring around the query point, wide enough to cover distinct
# nearby zones a fisherman would actually choose between.
ZONE_CANDIDATES = [
    ("North", 12.0, "north"),
    ("South", 12.0, "south"),
    ("East", 12.0, "east"),
    ("West", 12.0, "west"),
    ("Offshore", 20.0, "offshore"),
]

AVOID_RISK_LEVELS = {"HIGH", "EXTREME"}


async def _assess_zone(label: str, distance_km: float, lat: float, lon: float) -> dict:
    forecast = await get_marine_forecast(lat, lon)
    params = {p["parameter"]: p["value"] for p in forecast.data.get("parameters", [])}
    boundary = await get_nearby_boundary(lat, lon)
    boundary_distance = boundary.data.get("distance_km")
    within_warning_zone = boundary_distance is not None and boundary_distance <= 5.0

    risk = calculate_risk(
        wave_height_m=float(params.get("significant_wave_height", 1.5)),
        wind_speed_kmh=float(params.get("wind_speed", 20.0)),
        wave_period_s=float(params.get("wave_period", 7.0)) if params.get("wave_period") is not None else None,
        swell_height_m=float(params.get("swell_height", 1.2)) if params.get("swell_height") is not None else None,
        surface_current_ms=float(params.get("surface_current_speed", 0.35)) if params.get("surface_current_speed") is not None else None,
        within_warning_zone=within_warning_zone,
        boundary_name=boundary.data.get("nearest_boundary"),
    )

    reasons = list(risk.factors)
    if within_warning_zone:
        reasons.append(f"Within {boundary_distance}km of {boundary.data.get('nearest_boundary')}")

    return {
        "zone": label,
        "distance_km": distance_km,
        "lat": lat,
        "lon": lon,
        "risk_score": risk.risk_score,
        "risk_level": risk.risk_level,
        "verdict": "avoid" if risk.risk_level in AVOID_RISK_LEVELS else "safe",
        "reasons": reasons,
    }


async def run_zone_advisory_agent(lat: float, lon: float) -> tuple[dict, TraceEntry]:
    """Scans nearby candidate zones and flags which ones should currently be avoided."""
    coords = [
        (label, distance_km, *calculate_destination_coords(lat, lon, distance_km, direction))
        for label, distance_km, direction in ZONE_CANDIDATES
    ]
    zones = await asyncio.gather(
        *(_assess_zone(label, distance_km, zlat, zlon) for label, distance_km, zlat, zlon in coords)
    )
    zones = list(zones)
    avoid_zones = [z for z in zones if z["verdict"] == "avoid"]

    output = {
        "zones": zones,
        "avoid_zones": avoid_zones,
        "avoid_count": len(avoid_zones),
        "safe_count": len(zones) - len(avoid_zones),
    }

    trace = TraceEntry(
        agent="zone_advisory",
        inputs={"lat": lat, "lon": lon, "candidates": len(zones)},
        output=output,
        sources=["INCOIS", "overpass-osm-protected-areas"],
        fetched_at=datetime.now(timezone.utc),
        is_cached=False,
    )
    return output, trace
