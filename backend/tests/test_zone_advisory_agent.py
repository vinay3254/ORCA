import pytest
from app.agents.zone_advisory_agent import run_zone_advisory_agent, ZONE_CANDIDATES


@pytest.mark.asyncio
async def test_zone_advisory_agent_scans_all_candidate_zones():
    lat, lon = 12.9141, 74.8560  # Mangaluru
    output, trace = await run_zone_advisory_agent(lat, lon)

    assert len(output["zones"]) == len(ZONE_CANDIDATES)
    assert {z["zone"] for z in output["zones"]} == {label for label, _, _ in ZONE_CANDIDATES}
    assert output["avoid_count"] + output["safe_count"] == len(ZONE_CANDIDATES)
    for zone in output["zones"]:
        assert zone["verdict"] in {"avoid", "safe"}
        assert isinstance(zone["reasons"], list)
    assert trace.agent == "zone_advisory"
