import { DataStatus } from "./types";

export const STATUS_THEMES: Record<
  DataStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  LIVE: {
    label: "LIVE",
    bg: "bg-primary",
    text: "text-primary-foreground",
    border: "border-primary",
    dot: "bg-primary-foreground",
  },
  FORECAST: {
    label: "FORECAST",
    bg: "bg-secondary",
    text: "text-secondary-foreground",
    border: "border-border",
    dot: "bg-foreground/70",
  },
  CACHED: {
    label: "CACHED",
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    dot: "bg-muted-foreground/60",
  },
  HISTORICAL: {
    label: "HISTORICAL",
    bg: "bg-muted",
    text: "text-muted-foreground/80",
    border: "border-border",
    dot: "bg-muted-foreground/40",
  },
};
