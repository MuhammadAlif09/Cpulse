export const colors = {
  background: "var(--background)",
  foreground: "var(--foreground)",
  card: "var(--card)",
  cardForeground: "var(--card-foreground)",
  popover: "var(--popover)",
  popoverForeground: "var(--popover-foreground)",
  primary: "var(--primary)",
  primaryForeground: "var(--primary-foreground)",
  secondary: "var(--secondary)",
  secondaryForeground: "var(--secondary-foreground)",
  muted: "var(--muted)",
  mutedForeground: "var(--muted-foreground)",
  accent: "var(--accent)",
  accentForeground: "var(--accent-foreground)",
  destructive: "var(--destructive)",
  destructiveForeground: "var(--destructive-foreground)",
  statusGood: "var(--status-good)",
  statusWarn: "var(--status-warn)",
  statusBad: "var(--status-bad)",
  border: "var(--border)",
  input: "var(--input)",
  ring: "var(--ring)",
  chart: {
    1: "var(--chart-1)",
    2: "var(--chart-2)",
    3: "var(--chart-3)",
    4: "var(--chart-4)",
    5: "var(--chart-5)",
  },
  sidebar: {
    background: "var(--sidebar)",
    foreground: "var(--sidebar-foreground)",
    primary: "var(--sidebar-primary)",
    primaryForeground: "var(--sidebar-primary-foreground)",
    accent: "var(--sidebar-accent)",
    accentForeground: "var(--sidebar-accent-foreground)",
    border: "var(--sidebar-border)",
    ring: "var(--sidebar-ring)",
  },
};

export const radius = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
};

export const fontSize = {
  base: "var(--font-size)",
};

export const fontWeight = {
  normal: "var(--font-weight-normal)",
  medium: "var(--font-weight-medium)",
};

export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
};

export const layout = {
  sidebarWidth: "280px",
  headerHeight: "56px",
};

// ─── Standard CPulse Palettes (Single Source of Truth) ────────────────────────
export const P = {
  bg: "#14181C",
  card: "#1B2127",
  border: "#2A323A",
  fg: "#E4E8EB",
  muted: "#8E99A3",
  accent: "#7FB5A3",
  teal: "#7FB5A3",
  tealLt: "#7FB5A3",
  sky: "#7FB5A3",
  amber: "#D9B26F",
  rose: "#D98880",
  violet: "#7FB5A3",
  slate: "#8E99A3",
  good: "#8FBF9F", // status baik (score >= 80)
  warn: "#D9B26F", // status peringatan (score 50–79)
  bad: "#D98880",  // status bahaya (score < 50)
  indigo: "#7FB5A3",
  emerald: "#8FBF9F",
  purple: "#7FB5A3",
} as const;

export const C = {
  indigo: P.accent,
  teal: P.accent,
  emerald: P.good,
  amber: P.warn,
  rose: P.bad,
  violet: P.accent,
  sky: P.accent,
  purple: P.accent,
} as const;

export function scoreColor(score: number): string {
  if (score >= 80) return P.good;
  if (score >= 50) return P.warn;
  return P.bad;
}

export function scoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Poor";
  return "Critical";
}
