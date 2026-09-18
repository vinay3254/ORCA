from datetime import datetime, timezone
import pytest
from app.agents import region_scan_agent
from app.agents.region_scan_agent import run_region_scan_agent, REGION_CANDIDATES
from app.schemas import ConnectorResult


@pytest.mark.asyncio
async def test_region_scan_agent_scans_all_candidate_regions():
    lat, lon = 12.9141, 74.8560  # Mangaluru
    output, trace = await run_region_scan_agent(lat, lon)

    assert len(output["regions"]) == len(REGION_CANDIDATES)
    assert {r["region"] for r in output["regions"]} == {label for label, _, _ in REGION_CANDIDATES}
    assert output["favorable_count"] == len(output["favorable_regions"])
    for region in output["regions"]:
        assert region["pfz_likelihood"] in {"high", "moderate", "low", "unknown"}
        assert isinstance(region["reasons"], list)
    assert trace.agent == "region_scan"


async def test_region_scan_agent_handles_masked_grid_cell_without_crashing(monkeypatch):
    async def fake_get_sst(lat, lon):
        return ConnectorResult(
            data={"sst_celsius": None}, source="noaa-erddap-sst",
            fetched_at=datetime.now(timezone.utc), is_cached=False,
        )

    async def fake_get_chlorophyll(lat, lon):
        return ConnectorResult(
            data={"chlorophyll_mg_m3": None}, source="noaa-erddap-chlorophyll",
            fetched_at=datetime.now(timezone.utc), is_cached=False,
        )

    monkeypatch.setattr(region_scan_agent, "get_sst", fake_get_sst)
    monkeypatch.setattr(region_scan_agent, "get_chlorophyll", fake_get_chlorophyll)

    output, _ = await run_region_scan_agent(12.9141, 74.8560)
    assert all(r["pfz_likelihood"] == "unknown" for r in output["regions"])
    assert output["favorable_count"] == 0
