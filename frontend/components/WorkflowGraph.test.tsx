import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkflowGraph } from "./WorkflowGraph";
import { TraceEntry } from "@/lib/types";

describe("WorkflowGraph", () => {
  const sampleTrace: TraceEntry[] = [
    {
      agent: "planner",
      inputs: { message: "Is it safe to fish near Mangaluru?" },
      output: { intent: "fishing safety", place_name: "Mangaluru" },
      sources: [],
      fetched_at: null,
      is_cached: false,
    },
    {
      agent: "geospatial",
      inputs: { place_name: "Mangaluru" },
      output: { lat: 12.91, lon: 74.85, resolved_name: "Mangaluru Coastal Sector" },
      sources: ["OSM/Nominatim"],
      fetched_at: null,
      is_cached: false,
    },
    {
      agent: "weather",
      inputs: { lat: 12.91, lon: 74.85 },
      output: { wave_height_m: 1.2 },
      sources: ["INCOIS", "open-meteo-marine"],
      fetched_at: null,
      is_cached: false,
    },
  ];

  it("renders all workflow nodes, branch labels, and bottom-left controls in idle state", () => {
    const html = renderToStaticMarkup(<WorkflowGraph trace={[]} />);
    expect(html).toContain("User message");
    expect(html).toContain("planner");
    expect(html).toContain("geospatial");
    expect(html).toContain("weather");
    expect(html).toContain("risk");
    expect(html).toContain("ocean_analytics");
    expect(html).toContain("route");
    expect(html).toContain("reporting");
    expect(html).toContain("Answer + trace");

    // Branch decision labels from user's reference diagram
    expect(html).toContain("one location");
    expect(html).toContain("two locations");
    expect(html).toContain("no location");

    // Controls
    expect(html).toContain('title="Zoom in"');
    expect(html).toContain('title="Zoom out"');
    expect(html).toContain('title="Fit to view"');
  });

  it("shows only the real LangGraph pipeline nodes, not per-connector telemetry leaves", () => {
    // Regression guard: the graph previously rendered a separate node per data
    // source (INCOIS, Open-Meteo, ISRO-MOSDAC, ...), none of which are actual
    // LangGraph nodes -- that content belongs in the node detail drawer's
    // "Data Sources Consulted" list instead. Keep this list of graph.py's
    // actual nodes as the only thing rendered on the canvas.
    const html = renderToStaticMarkup(<WorkflowGraph trace={sampleTrace} />);
    for (const leafLabel of [
      "OSM Nominatim",
      "Overpass MPA",
      "INCOIS OSF",
      "Open-Meteo",
      "IMD Coastal",
      "GDACS / Blitz",
      "ISRO-MOSDAC",
      "NOAA ERDDAP",
      "Searoute Net",
    ]) {
      expect(html).not.toContain(leafLabel);
    }
  });

  it("does not render connecting lines before query execution (idle state requirement)", () => {
    const html = renderToStaticMarkup(<WorkflowGraph trace={[]} />);
    expect(html).not.toContain('data-testid="edge-line"');
    expect(html).toContain("IDLE");
  });

  it("renders connected curves and status indicators when query trace is populated", () => {
    const html = renderToStaticMarkup(<WorkflowGraph trace={sampleTrace} />);
    expect(html).toContain('data-testid="edge-line"');
    expect(html).toContain("CONVERGED");
  });

  it("renders streaming active dispatch state during live execution", () => {
    const html = renderToStaticMarkup(<WorkflowGraph trace={sampleTrace} isStreaming={true} />);
    expect(html).toContain("ACTIVE DISPATCH");
  });
});
