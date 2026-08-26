# Operion Mobile — Frontend Implementation Baseline

**Purpose:** a factual snapshot of what is actually built in `operion-mobile` today —
not the plan, not the design, the code. Use this as the starting point for briefing a
new session or a teammate on "what is Operion FE mobile, right now."

**Scope:** everything under `app/`, `auth/`, `api/`, `outbox/`, `components/`, `theme/`,
`lib/`. Does not describe the backend (separate project, `c:\demo`) or the Pencil
wireframes (`operion.pen`) beyond how code references them.

---

## 1. Stack

- **Expo SDK 54** (`~54.0.37`) + **Expo Router 6** (file-based routing, typed routes on)
- **React 19.1.0** / **React Native 0.81.5**
- **NativeWind v4** (Tailwind classes on RN components) backed by custom design tokens
- **TypeScript** throughout
- `expo-secure-store` — token + device-id persistence
- `expo-sqlite` — durable local write queue (the "outbox", see §4)
- `expo-crypto` — UUID generation
- No state management library, no navigation library beyond Expo Router, no HTTP
  client library (hand-written `fetch` wrapper) — deliberately minimal for the app's
  current size.

**Identity:** app name "Operion", bundle id `com.richardtanus.operion` (iOS + Android),
EAS project `7647cec1-34fd-4a17-b8d2-9960f39648b4` under org `richardtanus-organization`.
EAS build profiles exist for `development` (internal, dev client), `preview` (internal
APK), and `production` (auto-incrementing) — see `eas.json`. No submit config beyond an
empty `production` stub.

**Local dev workflow (Windows-specific):**
- `dev.cmd` — puts a working Node (v20.20.2) on `PATH` for the current terminal window
  (global `nvm use` can't run here without admin rights).
- `tunnel.cmd` — one-command flow for testing on a physical phone: opens a Cloudflare
  quick-tunnel to `localhost:8081` first, reads its public hostname, then starts Metro
  with `EXPO_PACKAGER_PROXY_URL` set to that hostname, and prints a QR code for Expo Go.
  Cloudflare was chosen over ngrok (Expo's bundled ngrok client is outdated; the team's
  ngrok account also hit an ACL block). Must run in a real terminal window (QR needs to
  be visible).

---

## 2. Navigation / app shell

Expo Router, two route groups under `app/`:

- **`app/_layout.tsx`** — root layout. Wraps everything in
  `SafeAreaProvider > AuthProvider > OutboxProvider`, and hides the splash screen only
  once auth status has resolved (`status !== 'loading'`) so the app never flashes an
  unauthenticated screen before the stored token has been checked.
- **`app/index.tsx`** — always redirects to `/(auth)/login`; the actual routing decision
  (send to login vs. dashboard) is centralized in `auth/useAuthGuard.ts`, not here.
- **`app/(auth)/_layout.tsx`** + **`login.tsx`** — unauthenticated stack.
- **`app/(app)/_layout.tsx`** + **`dashboard.tsx`**, **`debug-outbox.tsx`** — authenticated stack.
- **`auth/useAuthGuard.ts`** — one hook, called from both group layouts: if
  unauthenticated and outside `(auth)`, redirect to login; if authenticated and still
  inside `(auth)`, redirect to dashboard. Keeps the redirect logic in one place instead
  of per-screen guards.

---

## 3. Auth

- **`auth/AuthContext.tsx`** — React context holding `status` (`loading` /
  `authenticated` / `unauthenticated`), `user`, `token`.
  - On mount: reads a stored token from SecureStore, validates it via `GET /auth/me`.
    Valid → `authenticated`. Invalid/expired → token is dropped and state becomes
    `unauthenticated` (never gets stuck "half-authenticated").
  - `login(email, password)` calls the API **directly**, bypassing the outbox
    entirely — a queued login would be meaningless since there's no session yet to act
    on. This is a deliberate "blocking-error, manual-retry" flow, not a queued write.
  - `logout()` clears the stored token and resets state.
- **`auth/tokenStorage.ts`** — thin wrapper over `expo-secure-store`, key
  `operion.accessToken`.
- **`api/auth.ts`** — `login`, `register`, `getMe`, calling `/auth/login`,
  `/auth/register`, `/auth/me`. `register()` exists in the API layer but **no screen
  calls it yet** (no registration UI).
- **`api/types.ts`** — `Role` (`ADMIN`/`TECHNICIAN`/`PROCUREMENT`/`ACCOUNTING`/`OPERATOR`),
  `Scope` (`SUPERVISOR`/`MANAGER`/`OWNER`/`PRINCIPAL`), request/response shapes. Hand-verified
  against the real backend source (`AuthController.java`, `*Request.java`,
  `*Response.java`, the Role/Scope enums) — not guessed.

---

## 4. Outbox — durable offline-write queue

This is the most architecturally significant piece of the app so far, even though no
real write-screen uses it yet (only the debug screen exercises it).

**Why it exists:** writes made in the field (e.g. a warehouse scan) must survive the app
being killed mid-request — this is the stated reason React Native was chosen over a PWA
(a PWA can't give durable, file-backed storage across a kill). A write is either
`queued`, `confirmed`, or `failed` — a queued write must **never** render as an error.

- **`outbox/schema.ts`** — SQLite table `outbox_items`: `id`, `kind`, `endpoint`,
  `method`, `payload`, `status`, `attempts`, `last_error`, `client_created_at`,
  `server_confirmed_at`, `origin_node_id`, `revision`. Indexed on `(status,
  client_created_at)`.
- **`outbox/db.ts`** — opens/migrates the SQLite DB once per process (`expo-sqlite`).
- **`outbox/types.ts`** — `OutboxItem`: `id` is both the primary key and the
  idempotency key sent with every replay; `status` is `pending | sending | confirmed |
  failed`; carries **dual timestamps** (client-performed vs. server-confirmed) and an
  `origin_node_id` (per-install UUID, for a future multi-device-per-outlet scenario) and
  a monotonic `revision` counter, all captured from day one even though nothing needs
  them yet.
- **`outbox/outboxStore.ts`** — CRUD: `enqueue`, `listAll`, `listByStatus`,
  `markSending/Confirmed/Failed`, `retry`, and `resetStuckSending` — rows left `sending`
  mean the app died mid-request; they're reset to `pending` on next boot, which is the
  actual durability guarantee.
- **`outbox/outboxProcessor.ts`** — `processPending()`: FIFO replay, one item at a time
  (ordering matters for a write queue), each request carries its own `id` as an
  `Idempotency-Key` header so a request that actually succeeded but lost its response
  can be safely replayed without double-effect server-side.
- **`outbox/OutboxProvider.tsx`** — wires the processor to run: once on mount (after
  `resetStuckSending`), every 15s, and whenever the app returns to foreground
  (`AppState` listener). Exposes `items` / `enqueue` / `retryItem` / `refresh`.
- **`outbox/useOutboxAction.ts`** — the hook real write-screens are meant to use.
  Collapses the store's `pending`/`sending` into one UI-facing `queued` state (three
  states total: `queued` / `confirmed` / `failed`). **Not** for approval/authorization
  actions — those go through `api/client.ts` directly (blocking-error, manual-retry),
  same category as login.
- **`lib/originNodeId.ts`** / **`lib/uuid.ts`** — per-install UUID (persisted in
  SecureStore) and UUID generation (`expo-crypto`), used by the outbox.

---

## 5. API layer

- **`api/env.ts`** — `getApiBaseUrl()` reads `EXPO_PUBLIC_API_BASE_URL` from env,
  throwing a descriptive error on first *use* (not module load) if unset — so the app
  still boots and shows a real in-app error screen instead of a Metro-level crash.
- **`api/client.ts`** — `apiRequest<T>()`: fetch wrapper handling JSON body, Bearer
  auth header, and response parsing. Every successful backend response is wrapped
  `{success, message, data}` and this auto-unwraps `.data`; error bodies use a
  *different* shape (`{error, ...}`, not `{message}`) built by hand in the backend's
  `GlobalExceptionHandler` — the client accounts for both, plus the case of a raw 403
  with no body at all from Spring Security's filter chain (never reaches the handler).
- **`api/httpError.ts`** — `ApiError` (status, message, body).
- All request/response types are hand-verified against the live backend source at
  `c:\demo\src\main\java\com\example\operion` (noted inline in the code), not inferred
  from guesswork.

**Current backend target:** `EXPO_PUBLIC_API_BASE_URL` in `.env` points at the deployed
Railway backend, `https://operion-services-production.up.railway.app` (service
`Operion-services`, environment `production`, with an attached Postgres). This is a
production-labeled environment, not a dev/staging sandbox — there is currently no
separate environment to test against.

---

## 6. Design system / component kit

- **`theme/tokens.js`** — single source of truth for colors, spacing, radii, typography.
  Plain JS on purpose (Tailwind's config loads it via Node `require`, which can't parse
  TS syntax); `theme/tokens.d.ts` gives app code the types back. **Colors are
  deliberately unbranded placeholders** — no real visual design pass has happened yet.
- **`theme/strings.ts`** — placeholder for user-facing vocabulary; currently just holds
  the "Unit"/"Units" strings flagged for the pending `AirsoftUnit → ServiceableUnit`
  rename, so that swap is a one-file change later rather than a grep across components.
  Not a full i18n system.
- **`components/`** — four primitives, each deliberately mirroring the vocabulary
  already established in the Pencil wireframe kit (`operion.pen` /
  `SESSION_BRIEF_C_PENCIL_HANDOFF.md`) as a separate implementation of the same
  contract:
  - **`Button`** — `primary` (filled) / `secondary` (outlined) variants.
  - **`TextField`** — `editable` / `readonly-derived` variants. `readonly-derived` is
    for server-computed values that are never stored (e.g. PRA's remaining balance) —
    gray/italic, and must never be rendered as a plain editable field.
  - **`Chip`** — one status badge, 5 tones (`neutral`/`success`/`warning`/`danger`/
    `pending`). A screen with more than one independent status dimension (e.g.
    Realisasi's `status` + `varianceStatus`) renders multiple `Chip`s side by side —
    the component itself only ever renders one; composing that layout is the screen's
    job.
  - **`Callout`** — dashed-border note box, for recording what a build/drawing
    revealed that a spec didn't anticipate, or for surfacing an open question visibly
    instead of silently resolving it.
  - **`SyncStateIndicator`** — renders the outbox's three write-states
    (`queued`/`confirmed`/`failed`) consistently everywhere a write happens, wrapping
    `Chip` + a retry action on failure. Every future write screen should use this
    rather than drawing its own pending/error UI.

---

## 7. Screens that actually exist today

| Route | Status | Notes |
|---|---|---|
| `(auth)/login.tsx` | **Real, functional** | Email/password form → `AuthContext.login()` directly (not outboxed), inline error text, submitting state. |
| `(app)/dashboard.tsx` | **Scaffolding, not a designed screen** | Explicitly a placeholder — module 3 (outlet-operator / scan-loop) hasn't been through the screen-inventory-and-gates process yet. Exists to prove the auth-gated route group and NativeWind styling work. Has a link to the debug screen and a logout button. |
| `(app)/debug-outbox.tsx` | **Dev-only, not part of any designed flow** | Lets you enqueue fake outbox items and watch `queued → confirmed/failed`, including surviving a kill-and-relaunch mid-queue. Should be gated behind `__DEV__` or removed before a production build. |

**Nothing from the PROC-01–08 procurement screen spec (`SESSION_BRIEF_B_DESIGN_WIREFRAMES.md`)
has been implemented in code yet.** Everything built so far is authentication plus the
offline-write infrastructure underneath it — no procurement, no outlet-operator/scan
screens.

---

## 8. Known gaps / not-yet-done

- No procurement screens (PROC-01–08) in code.
- No outlet-operator / scan-loop screens (module 3); dashboard is a stand-in only.
- No registration UI (`register()` exists in `api/auth.ts`, unused).
- Design tokens are placeholder/unbranded — no real visual design pass yet.
- `debug-outbox.tsx` needs to be dev-gated or removed before shipping.
- Only one backend environment exists to test against (`production` on Railway) — no
  staging/dev sandbox.

---

*Generated from a direct read of the codebase — regenerate rather than hand-edit if it
drifts from the code.*
