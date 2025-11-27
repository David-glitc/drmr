export const navItems = [
  { key: "portfolio", label: "Portfolio", href: "/portfolio", icon: "chart" },
  { key: "staking", label: "Staking", href: "/staking", icon: "diamond" },
  { key: "trade", label: "Trade", href: "/trade", icon: "arrows" },
  { key: "tokens", label: "Tokens", href: "/tokens", icon: "coin" },
] as const;

export const settingsNav = {
  key: "settings",
  label: "Settings",
  href: "/settings",
  icon: "gear",
} as const;

