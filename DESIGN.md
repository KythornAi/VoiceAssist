version: alpha
name: Raycast
# Reference: https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/raycast/DESIGN.md
# Used as design context for VoiceAssist V2 UI polish pass.
# Character: pure near-black canvas, hairline 1px borders, command-palette chrome, Inter typography.

description: |
  Raycast's marketing system reads like an extended product screenshot. The chrome IS the in-product chrome at marketing scale: pure-near-black canvas, hairline 1px borders, command-palette-style cards, Inter typography with the ss03 stylistic set enabled site-wide, white CTA pill, and a small set of saturated category accent colors (yellow / red / green / blue) reserved for extension and feature illustrations. Section rhythm is generous (~96px) but the page never breaks tonal continuity — the whole site sits in one continuous dark mode.

colors:
  primary: "#ffffff"
  primary-pressed: "#e8e8e8"
  on-primary: "#000000"
  ink: "#f4f4f6"
  body: "#cdcdcd"
  charcoal: "#d3d3d4"
  mute: "#9c9c9d"
  ash: "#6a6b6c"
  stone: "#434345"
  on-dark: "#ffffff"
  on-dark-mute: "rgba(255,255,255,0.72)"
  canvas: "#07080a"
  surface: "#0d0d0d"
  surface-elevated: "#101111"
  surface-card: "#121212"
  button-fg: "#18191a"
  hairline: "#242728"
  hairline-soft: "rgba(255,255,255,0.08)"
  hairline-strong: "rgba(255,255,255,0.16)"
  accent-blue: "#57c1ff"
  accent-blue-soft: "rgba(87,193,255,0.15)"
  accent-red: "#ff6161"
  accent-red-soft: "rgba(255,97,97,0.15)"
  accent-green: "#59d499"
  accent-green-soft: "rgba(89,212,153,0.15)"
  accent-yellow: "#ffc533"
  accent-yellow-soft: "rgba(255,197,51,0.15)"

typography:
  font-family: Inter
  font-feature: '"calt", "kern", "liga", "ss03"'
  heading-xl: { fontSize: 24px, fontWeight: 500, lineHeight: 1.6, letterSpacing: 0.2px }
  heading-md: { fontSize: 20px, fontWeight: 500, lineHeight: 1.4, letterSpacing: 0.2px }
  body-lg: { fontSize: 18px, fontWeight: 400, lineHeight: 1.6 }
  body-md: { fontSize: 16px, fontWeight: 400, lineHeight: 1.6 }
  body-sm: { fontSize: 14px, fontWeight: 400, lineHeight: 1.6 }
  body-sm-strong: { fontSize: 14px, fontWeight: 500, lineHeight: 1.6, letterSpacing: 0.2px }
  caption-md: { fontSize: 13px, fontWeight: 400, lineHeight: 1.4, letterSpacing: 0.1px }
  caption-sm: { fontSize: 12px, fontWeight: 400, lineHeight: 1.5, letterSpacing: 0.4px }
  button-md: { fontSize: 14px, fontWeight: 500, lineHeight: 1.6, letterSpacing: 0.2px }

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 10px
  xl: 16px
  full: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px

components:
  button-primary:
    backgroundColor: "#ffffff"
    textColor: "#000000"
    rounded: 8px
    padding: 8px 16px
    height: 36px
  button-secondary:
    backgroundColor: "transparent"
    textColor: "#ffffff"
    border: "1px solid #242728"
    rounded: 8px
    padding: 8px 16px
    height: 36px
  button-ghost:
    backgroundColor: "#101111"
    textColor: "#ffffff"
    rounded: 8px
    padding: 8px 16px
    height: 36px
  text-input:
    backgroundColor: "#101111"
    textColor: "#ffffff"
    border: "1px solid #242728"
    rounded: 8px
    padding: 8px 12px
    height: 36px
  pill-tab:
    backgroundColor: "transparent"
    textColor: "#cdcdcd"
    rounded: 9999px
    padding: 4px 10px
  pill-tab-active:
    backgroundColor: "#101111"
    textColor: "#ffffff"
    rounded: 9999px
  card:
    backgroundColor: "#0d0d0d"
    border: "1px solid #242728"
    rounded: 10px
    padding: 24px
  badge-soft:
    backgroundColor: "rgba(87,193,255,0.15)"
    textColor: "#57c1ff"
    rounded: 4px
    padding: 2px 8px
