# Design System: E-Cell Startup Pitching Competition 2026

## 1. Visual Theme & Atmosphere
The portal adopts a sophisticated **Editorial & Executive Design System**, heavily inspired by modern luxury/editorial websites like Wander Hotels (`wanderhotels.com`). 

It deliberately avoids gimmicky, neon, gaming-style "vibe-coded" bloat (such as overwhelming canvas animations, excessive 3D tilts, or loud gradients) in favor of:
- High typographic contrast and generous, intentional whitespace.
- Pristine, subtle 1px border hierarchy and soft elevation shadows.
- Warm Alabaster/Sand base in Light Mode (Default) and an Obsidian/Onyx mixed black base in Dark Mode (No purple/blue dark tones).

## 2. Color Palette & Roles

### Light Theme (Default)
* **Warm Alabaster Background (`#FAF8F5`):** Primary canvas providing a refined, organic feel.
* **Crisp Card Surface (`#FFFFFF`):** High-contrast container surface.
* **Soft Warm Sand (`#F3F0EA`):** Sub-surface elements, code highlight boxes, and subtle badges.
* **Obsidian Charcoal (`#1A1918`):** Primary text and high-priority titles.
* **Muted Stone (`#5C5955`):** Secondary text and informative subtitles.
* **Terracotta Accent (`#C85A32`):** Primary action color, button backgrounds, brand highlights, and active step indicators.
* **Azure Blue (`#0EA5E9`):** Guidance action buttons and helper icons.
* **Emerald Green (`#059669`):** Step completion and successful submission feedback.

### Dark Theme (Onyx / Mixed Black)
* **Onyx Mixed Black Background (`#111111`):** Deep, pure neutral background with zero blue or purple tint.
* **Warm Charcoal Surface (`#1A1A1A`):** Container surfaces.
* **Dark Slate Sub-surface (`#222222`):** Input fields and inner callout blocks.
* **Off-White Text (`#F4F4F0`):** High legibility primary text.
* **Terracotta Flame (`#D97757`):** Warm terracotta accent in dark mode.

## 3. Typography Rules
* **Header Font:** `Outfit` (sans-serif) — Clean geometric headers with `-0.02em` letter-spacing.
* **Body Font:** `Plus Jakarta Sans` — Highly legible, modern sans-serif optimized for form inputs, labels, and reading flow.
* **Code & Tokens:** `JetBrains Mono` — Crisp, uppercase monospace for referral codes (`NEC2621509`) and technical tags.
* **Labels:** Uppercase, `12px` font size with `0.06em` letter-spacing for sharp form field identification.

## 4. Component Stylings

* **Navigation Bar:**
  - Sticky header with `16px` backdrop blur (`rgba(250, 248, 245, 0.92)`).
  - Pill-shaped navigation buttons (`--radius-full`) with crisp 1px borders.
  - Dedicated Light/Dark mode switcher button with dynamic sun/moon icons.

* **Eureka Mandatory Step Card (Uncluttered 2-Column Grid):**
  - **Left Column:** Clear step description, dashed referral code copy box with JetBrains Mono font, and camera screenshot notice.
  - **Right Column:** Direct action cards ("Open Eureka Portal" & "View Step-by-Step Guide") with clean icon containers and subtle hover translation.
  - Left border accent in Terracotta (`4px solid #C85A32`).

* **Inputs / Forms:**
  - Soft rounded corners (`10px`).
  - Crisp `1px` subtle borders (`#E5E0D8`), transitioning to Terracotta (`#C85A32`) with a soft glow (`0 0 0 3px rgba(200,90,50,0.08)`) on focus.
  - Explicit required indicators (`*`) in Rose (`#DC2626`).

* **Buttons:**
  - Fully rounded pill buttons (`border-radius: 9999px`).
  - Terracotta fill (`#C85A32`) for primary actions with smooth `-1px` vertical lift on hover.

* **Stats Grid:**
  - Clean 4-column layout showcasing key competition facts (`1 to 3 Members`, `2nd & 3rd Year Eligibility`, `Mentorship`, `2026 Edition`).

## 5. Layout Principles
* **Whitespace & Density:** Generous vertical padding (`56px` hero padding, `32px` card padding) to prevent congestion and cognitive overload.
* **Hierarchy:** Clear progressive disclosure using 4-step progress stepper bar.
* **Responsive Adaptability:** Smooth collapse to single-column on mobile viewports with a floating bottom navigation bar.
