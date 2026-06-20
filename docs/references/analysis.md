# Cinemetrics visual analysis

Source priority:

1. Live site: https://cinemetrics.uchicago.edu/
2. Local snapshot: `docs/references/Cinemetrics - Movie Measurement and Study Tool Database.html`
3. Local screenshot/reference image: `docs/references/ref_style.jpg`

## 1. Visual identity

Cinemetrics is not styled like a neutral analytics dashboard. Its identity is closer to a film archive page: a deep red masthead, black navigation and hero stage, cream film-stock content blocks, and theatrical serif display type. The strongest memory cue is the film-roll edge treatment around the body content.

The site balances two visual modes:

- Archive / database mode: compact navigation, dense labels, hard-edged tabs, functional buttons.
- Cinema / memorial mode: black stage, sepia image, serif quote, soft text shadow.

For CastLock-Vis, the useful direction is "cinematic archive console": retain our clear analytical panel structure, but use Cinemetrics-derived color, typography, borders, and film-stock details around the application shell.

## 2. Color system

The local HTML exposes the site's design tokens. Key values:

| Token | HSL | Approx hex | Role |
| --- | --- | --- | --- |
| `--brand-500` | `8, 74%, 37%` | `#A43718` | Masthead red / brand |
| `--brand-600` | `8, 78%, 31%` | `#8D2A11` | Darker red |
| `--brand-700` | `7, 78%, 23%` | `#681C0D` | Deep red |
| `--roll-500` | `38, 65%, 81%` | `#EED5AF` | Film roll paper |
| `--roll-600` | `40, 54%, 75%` | `#E1C99E` | Film roll shadow |
| `--roll-700` | `40, 31%, 65%` | `#C2AF89` | Dark film edge |
| `--accent-500` | `38, 65%, 81%` | `#EED5AF` | Active nav / cream accent |
| `--accent-700` | `40, 31%, 51%` | `#9F8554` | Muted accent border |
| `--black` | `0, 0%, 11%` | `#1C1C1C` | Black stage |
| `--gray-700` | `0, 0%, 8%` | `#141414` | Deep nav |
| `--display` | `0, 0%, 11%` | `#1C1C1C` | Main dark text |
| `--link` | `194, 91%, 27%` | `#066985` | Link accent |

Screenshot samples from `ref_style.jpg` confirm the same structure:

- Top red area average: `#A63B2A`.
- Navigation / black hero area average: roughly `#3E3C3A` in the screenshot, but the actual CSS uses darker stops such as `#151515`, `#252525`, `#353535`.
- Cream body area average: `#D6C29E`.

Implementation implication:

- Use red for branding/header, not for data selection. Red already competes with Markov lock-in and C-view snapback.
- Use cream/gold as the unified UI interaction and selection highlight. It matches Cinemetrics navigation active states and avoids changing semantic data colors.
- Use near-white border lines on cards/panels to get the hard, archival edge seen in the site.

## 3. Typography

The live site uses local Next/font variables:

- `--font-alata`: `"Alata", "Alata Fallback"` for general UI and navigation.
- `--font-playfair-display`: `"Playfair Display", "Playfair Display Fallback"` for serif display moments, especially the hero quote.

The local HTML includes `@font-face` rules for both:

- Alata regular weight 400, split into multiple `woff2` unicode ranges.
- Playfair Display variable weight 400-900, split into multiple `woff2` unicode ranges.

Observed usage:

- Base document font: Alata.
- Quote/memorial hero: Playfair Display via a `font-serif` class.
- Navigation labels: Alata, medium/semibold, compact and centered.
- Body copy on film roll: dark text on cream background, Alata-like sans with generous line height.

Implementation implication:

- Prefer `Alata` for UI if the font is installed or later added locally; otherwise fall back to Trebuchet/Gill/system sans.
- Prefer `Playfair Display` for display headings if installed or later added locally; otherwise fall back to Georgia/Times.
- Do not download fonts into the repo without an explicit decision. If exact matching is needed later, download Alata and Playfair Display `woff2` from the live site's `/_next/static/media/...` URLs or from Google Fonts, place them under `public/fonts/`, and add `@font-face` declarations in `src/styles/global.css`.

## 4. Layout and surface treatment

### Masthead

The site has a red masthead that carries the logo and utility actions. The masthead is not flat: it uses red tonal variation and subtle shadow. For our current dashboard, keeping the red top band is appropriate because it gives a first-viewport Cinemetrics signal.

### Navigation

The site uses a black/dark-gray tab bar below the masthead. Active/hover states turn cream/gold, with hard tab shapes and only small radii. This is the best reference for our app-level interaction color.

### Hero stage

The home page hero is a black stage with an archival image and Playfair Display quote. The black stage should inform our panel header treatment: pure dark, no red gradient inside panel headers.

### Movie roll content

The local CSS defines `.movie-roll`:

- Cream roll background.
- Max width `1380px`.
- Horizontal padding `2rem`.
- Side perforations drawn with `::before`/`::after`.
- Perforation width `30px`, with repeated 30px vertical cells.
- On narrow screens, perforation width drops to `15px`.

Implementation implication:

- Keep the global genre legend as a film-roll strip because it is a non-chart explanatory surface.
- Keep view panels clean and chart-first. Use film-roll cues subtly on outer panel edges only, not inside the chart area.

## 5. Borders, radius, and weight

Cinemetrics uses:

- Small radii (`rounded-sm`, `rounded-lg` in Tailwind terms, but visually restrained).
- Hard tab/button edges.
- Thin but high-contrast separators around navigation and roll edges.
- Cream film-stock edges against black, creating a white/bright outline effect.

User design instruction mapping:

- View panels should remain clean and crisp.
- Panel title bars should be pure black/deep rail color, no gradient.
- Card/panel edges should be harder, brighter, and slightly heavier.

Implementation implication:

- Reduce radii to 0-2px for panels/cards.
- Increase border width for main surfaces to 1.5-2px where it will not crowd dense chart content.
- Use a brighter cream-white border token for external surfaces, while retaining subdued internal chart grid/axis colors.

## 6. Interaction and selection colors

The current CastLock-Vis had blue `--color-accent` as data interaction highlight. The user has allowed interaction/selection highlights to change, while explicitly preserving meaningful data colors.

Do not change:

- `--genre-*`
- `--cluster-*`
- `--color-success`
- `--color-snapback`
- `--color-markov-cell`
- `--color-markov-diag`
- `--color-river-other`
- `--color-entropy-line`

Can change:

- Generic `--color-accent`
- `--color-control-fill`
- `--color-control-hover`
- Brush/select/highlight outlines that are not semantic data encodings.

Recommended change:

- Set generic interaction highlight to Cinemetrics cream/gold (`#EED5AF`).
- Set hover/control active to a slightly stronger gold (`#F4DEB8` or `#E1C99E` depending on contrast).
- Keep red only for brand/header and existing red semantic data.

## 7. CastLock-Vis design decisions

Apply the reference as follows:

- Header: keep red masthead derived from `--brand-*`.
- Panels: pure black title rail, no gradient; brighter hard border; minimal radius.
- Genre legend: remain film-roll paper, because this is the closest analogue to Cinemetrics' body content block.
- Details panel and controls: use hard archival borders and cream/gold interaction states.
- Chart interiors: keep dark and clean; do not add decorative film texture inside chart plotting areas.
- Typography: use `Alata`/`Playfair Display` in the stack first, with local fallbacks. This will improve automatically if the user installs the fonts.
