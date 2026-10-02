# LAN Dashboard – Frontend

React frontend for the yearly LAN party dashboard: overview (beamer screen), tournaments with Challonge brackets,
seat map, nerd stats and the admin area. The backend and the **Docker deployment** live in the separate
[`lan-party-dashboard-backend`](https://github.com/priisig/lan-party-dashboard-backend) repository (`deploy/`).

| | |
|---|---|
| Stack | React 19, TypeScript, Vite, React Router, TanStack Query |
| Styling | plain CSS with design tokens (`src/theme/tokens.css`), fonts bundled locally via Fontsource (works offline at the LAN) |
| Tests | Vitest + Testing Library |

## Development

```bash
npm install
npm run dev        # http://localhost:5173, proxies /api to http://localhost:8080
npm test           # unit tests
npm run build      # type check + production build to dist/
```

Start the backend first (see its README; `LAN_SEED_DEMO=true` gives you demo data). Use the `BACKEND_URL`
environment variable to point the dev proxy at another backend.

## Views

| Route | View |
|---|---|
| `/` | Overview (scrolling page): welcome, "Jetzt läuft", profile, Teamspeak, WLAN with QR code, servers, programme, tournaments, seat map teaser |
| `/turniere` | tournaments, bracket (from Challonge), sign-up (account needed), participants |
| `/sitzplan` | seat map, reserve / change / cancel own seat (account needed), player search |
| `/stats` | Nerd Stats: pushed metrics + integration widgets |
| `/login`, `/registrieren` | login and account creation (`?next=` returns to the page you came from) |
| `/profil` | own reservation, tournaments, profile data, password change |
| `/admin` | admin panel for accounts with role *Orga*; `/admin/sitzordnung` (seat editor), `/admin/events` |

**Coloured words:** admin-editable headings accept `{lila:Wort}` markup (`lila`, `blau`, `gruen`, `orange`, `rot`).
The admin fields have colour swatches: select text, click a colour. Rendering is in `components/AccentText.tsx`
(text nodes only, never HTML).

**Seat map:** orientation (rows horizontal / vertical), row and seat order, and room markers (beamer, entrance, …
on any edge) are independent settings, so moving the beamer never rotates the seats.

**Kiosk / beamer:** `/?kiosk=1` rotates through the views set in the admin area, forces the wall layout
(fit-to-screen grid instead of the scrolling page), hides the cursor and never scrolls. `?kiosk=0` turns it off again (the setting is kept per
browser tab).

## Screen sizes

The layout tier is set as `<html data-tier="…">` (`src/hooks/useLayoutTier.ts`) and the CSS picks it up:

| Tier | Width | Layout |
|---|---|---|
| `wall` | ≥ 1600 px or kiosk | the prototype layout. `rem` scales with the viewport width (`clamp(12px, 0.8333vw, 40px)`), so HD, beamer and 4K show the same picture |
| `laptop` | 1024–1599 px | fixed 14 px `rem`, two-column layouts, tournament list as a chip bar |
| `mobile` | < 1024 px | one column, bottom tab bar, scrollable bracket, admin sidebar as a drawer |

## Data and live updates

- `src/api/queries.ts`: one query per data area. Time-dependent data (banners, schedule, LIVE tag) is re-fetched
  every 30 s.
- `src/hooks/useEventStream.ts`: subscribes to `/api/public/stream` (SSE). The backend sends "topic changed" and
  the matching queries reload, so admin changes show up on every screen within a second.
- The clock and countdowns use the **server time** (`src/lib/time.ts`), so beamer laptops with a wrong clock still
  show the right time. All times are shown in the event's timezone.

## Structure

```
src/
  api/          types (mirror the backend DTOs), fetch client with CSRF handling, query hooks
  layout/       PublicLayout (header, LIVE tag, clock, announcement bar, bottom nav, kiosk rotation)
  pages/        Overview, Tournaments, Seating, NerdStats, Auth (login/registration), Profile (+ CSS per page)
  components/   SeatMap (shared with admin), BracketView, AccentText, WifiQr, Icon, Logo, Avatar
  widgets/      Nerd Stats widgets + registry
  admin/        admin panel (lazy loaded): sidebar layout, sections/, AccentInput, seating editor, events
  theme/        tokens.css (colours/fonts from the design), base.css (global classes like .card, .btn, .in)
  lib/ hooks/   accent markup, WLAN QR payload, time/LAN-day helpers, layout tier, kiosk, SSE
```

## Adding a Nerd Stats widget

1. Backend: implement an `IntegrationProvider` with a new `type` (see backend README).
2. Frontend: create `src/widgets/MyWidget.tsx` (gets `{ name, data }`, where `data` is the JSON your provider
   returns) and register it in `src/widgets/registry.tsx`. Use `wide: true` to make it span two columns.

## Theming

All colours are CSS variables in `src/theme/tokens.css`. For a different look in a future year, adjust them there.
Admins can change the logo and texts at runtime.

## Docker & deployment

`Dockerfile` builds the app and serves it with nginx. `nginx.conf.template` proxies `/api` to `BACKEND_URL`
(default `http://backend:8080`), with buffering turned off for Server-Sent Events. It re-resolves the backend via
Docker's DNS, so a redeployed backend container is picked up, and passes the reverse proxy's `X-Forwarded-Proto`
through.

| | |
|---|---|
| `git push` | `.github/workflows/ci.yml` runs `npm test` and `npm run build` (incl. type check) |
| `git tag vX.Y.Z && git push origin vX.Y.Z` | `.github/workflows/release.yml` builds `ghcr.io/priisig/lan-party-dashboard-frontend:X.Y.Z` and deploys it on the homeserver |

The production compose stack and the server setup live in the backend repo (`deploy/`,
[`DEPLOYMENT.md`](https://github.com/priisig/lan-party-dashboard-backend/blob/main/DEPLOYMENT.md)).
