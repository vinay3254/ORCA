# backend/app/agents/region_scan_agent.py
"""Region Scan Agent.

Answers "which regions show high chlorophyll concentration and favourable
sea surface temperature?" by sampling several candidate points around the
query location -- reusing the exact same SST/chlorophyll connectors and
PFZ-likelihood scoring heuristic ocean_analytics_agent already uses for a
single point (`_score`), just applied across a small ring instead of one
location. No new external data source.
"""
import asyncio
from datetime import datetime, timezone
from app.agents.ocean_analytics_agent import _score
from app.agents.what_if_agent import calculate_destination_coords
from app.connectors.ocean_analytics import get_sst, get_chlorophyll
from app.schemas import TraceEntry

# Candidate points to sample around the query location. Biased offshore at
# increasing distance (PFZ fronts are typically found well offshore, per
# INCOIS advisory bearings/distances already surfaced elsewhere in the app)
# with two lateral coastal points for spread.
REGION_CANDIDATES = [
    ("Near Offshore", 15.0, "offshore"),
    ("Mid Offshore", 30.0, "offshore"),
    ("Far Offshore", 45.0, "offshore"),
    ("North Coastal", 20.0, "north"),
    ("South Coastal", 20.0, "south"),
]


async def _assess_region(label: str, distance_km: float, lat: float, lon: float) -> dict:
    sst_result, chl_result = await asyncio.gather(get_sst(lat, lon), get_chlorophyll(lat, lon))
    sst_raw = sst_result.data.get("sst_celsius")
    chl_raw = chl_result.data.get("chlorophyll_mg_m3")

    # A live ERDDAP response with a null value (not a connector failure) is an
    # honest "no data" for a masked grid cell -- e.g. a candidate point that
    # landed on land -- not something to fabricate a score for.
    if sst_raw is None or chl_raw is None:
        return {
            "region": label,
            "distance_km": distance_km,
            "lat": lat,
            "lon": lon,
            "sst_celsius": sst_raw,
            "chlorophyll_mg_m3": chl_raw,
            "pfz_likelihood": "unknown",
            "reasons": ["No SST/chlorophyll data for this point (likely land or a masked grid cell)."],
            "is_cached": sst_result.is_cached or chl_result.is_cached,
        }

    sst_c, chlorophyll = float(sst_raw), float(chl_raw)
    likelihood, reasons = _score(sst_c, chlorophyll)

    return {
        "region": label,
        "distance_km": distance_km,
        "lat": lat,
        "lon": lon,
        "sst_celsius": sst_c,
        "chlorophyll_mg_m3": chlorophyll,
        "pfz_likelihood": likelihood,
        "reasons": reasons,
        "is_cached": sst_result.is_cached or chl_result.is_cached,
    }


async def run_region_scan_agent(lat: float, lon: float) -> tuple[dict, TraceEntry]:
    """Scans nearby candidate regions and ranks them by PFZ-likelihood (SST + chlorophyll)."""
    coords = [
        (label, distance_km, *calculate_destination_coords(lat, lon, distance_km, direction))
        for label, distance_km, direction in REGION_CANDIDATES
    ]
    regions = list(
        await asyncio.gather(
            *(_assess_region(label, distance_km, rlat, rlon) for label, distance_km, rlat, rlon in coords)
        )
    )
    favorable_regions = [r for r in regions if r["pfz_likelihood"] == "high"]
    is_cached = any(r["is_cached"] for r in regions)

    output = {
        "regions": regions,
        "favorable_regions": favorable_regions,
        "favorable_count": len(favorable_regions),
    }

    trace = TraceEntry(
        agent="region_scan",
        inputs={"lat": lat, "lon": lon, "candidates": len(regions)},
        output=output,
        sources=["noaa-erddap-sst", "noaa-erddap-chlorophyll"],
        fetched_at=datetime.now(timezone.utc),
        is_cached=is_cached,
    )
    return output, trace
