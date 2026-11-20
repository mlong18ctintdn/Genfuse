# GENFUSE v2.0

*A place for three generations to keep memories, understand each other, and play.*

Next.js 15 (App Router, RSC) + Supabase + Vercel AI SDK (Gemini 2.5 Flash) + next-intl (vi/en/zh/es) + PayOS.

**Build status:** Phases 1-4 are in this repo: architecture, database, AI backend, all screens, and PayOS payments. Phase 5 (hardening, tests, launch checklist) is next.

> **Not yet built or run.** This was written without network access, so `npm install`, `next build` and a live Supabase/PayOS test have not been done. The TypeScript files parse, and the four language files have identical keys, but expect to fix a few type errors on the first `npm run typecheck`. The two libraries whose APIs I could least verify are `@payos/node` v2 (`paymentRequests.get`) and AI SDK v5 (`onChunk` chunk type); see section 9.

---

## 1. Directory tree

```
genfuse/
├─ package.json  tsconfig.json  next.config.mjs  tailwind.config.ts  postcss.config.mjs  components.json
├─ .env.example
├─ messages/{vi,en,zh,es}.json                    362 keys each, identical
├─ supabase/migrations/
│  ├─ 001_genfuse_schema.sql                      tables, RLS, triggers, credit + billing functions, storage
│  ├─ 002_phase3_additions.sql                    memory replies, story game table + realtime
│  └─ 003_family_and_games.sql                    invite code, switch family, Realtime auth, chore wheel, Ô Ăn Quan
└─ src/
   ├─ middleware.ts                               next-intl routing + Supabase session refresh
   ├─ i18n/{routing,request,navigation}.ts
   ├─ lib/
   │  ├─ site-url.ts                              emailRedirectTo (fixes the localhost bug)
   │  ├─ session.ts  credits.ts  plans.ts  payos.ts  paths.ts  ui-mode.ts  chat-utils.ts  utils.ts
   │  ├─ supabase/{client,server,admin,middleware}.ts
   │  ├─ ai/{model,prompts,guard}.ts
   │  └─ hooks/use-speech.ts                      Web Speech API: vi-VN, en-US, zh-CN, es-ES
   ├─ app/
   │  ├─ globals.css                              theme + Senior Large Mode
   │  ├─ auth/callback/route.ts
   │  ├─ actions/{credits,profile,memories,story}.ts   Server Actions
   │  ├─ api/
   │  │  ├─ chat/route.ts                         streaming: companion, translator, scam check
   │  │  ├─ trivia/route.ts  story/narrate/route.ts
   │  │  └─ payos/{create-payment-link,webhook,status}/route.ts
   │  └─ [locale]/
   │     ├─ layout.tsx  page.tsx (landing)  login/  onboarding/
   │     └─ (app)/  layout.tsx  loading.tsx
   │        home  companion  memory-tree  translator  scam-shield  reminders  games  premium  settings
   └─ components/
      ├─ ui/            shadcn-style primitives (button, input, card, badge, dialog, skeleton, copy-button)
      ├─ layout/        header, sidebar + mobile tab bar, credit badge (Realtime), language switcher
      ├─ providers/     credit-provider (server value + Realtime + refresh)
      ├─ companion/     chat-box, floating-companion
      ├─ memory-tree/   tree-svg, add-memory-dialog, memory-detail, client
      ├─ translator/    translator-client, ai-stream
      ├─ scam/          scam-scanner
      ├─ reminders/  games/  premium/  settings/  onboarding/  auth/  brand/
```

---

## 2. Setup

```bash
cd genfuse
npm install
cp .env.example .env.local        # fill in sections 3-5
npm run typecheck                 # fix anything it reports, then:
npm run dev
```

Node 20+.

---

## 3. Supabase

1. Create a project (region near your users, e.g. Singapore).
2. **SQL Editor:** run `001_genfuse_schema.sql`, `002_phase3_additions.sql`, `003_family_and_games.sql`, then `004_free_game_uses.sql`.
3. **Settings → API:** copy the Project URL, `anon` key and `service_role` key into `.env.local` (`service_role` is server-only).
4. **Fix the `localhost:3000` verification email (you need both parts):**
   1. **Authentication → URL Configuration:** Site URL = `https://YOUR-APP.vercel.app`. Redirect URLs: `https://YOUR-APP.vercel.app/**`, `http://localhost:3000/**`, optionally `https://*-YOUR-TEAM.vercel.app/**` for previews.
   2. Vercel → Environment Variables: `NEXT_PUBLIC_SITE_URL=https://YOUR-APP.vercel.app`, then **redeploy** (`NEXT_PUBLIC_*` is fixed at build time).

   `AuthForm` passes `emailRedirectTo: authRedirectUrl(...)` from `src/lib/site-url.ts`, which uses `NEXT_PUBLIC_SITE_URL`, falling back to `window.location.origin`.
5. **Authentication → SMTP Settings:** the built-in mailer allows only a few emails per hour. Use Resend, Brevo or SendGrid before launch.
6. Realtime for `families` and `story_games` is enabled by the migrations.

## 4. Gemini

<https://aistudio.google.com/apikey> → `GOOGLE_GENERATIVE_AI_API_KEY`. Optional OpenAI fallback: `OPENAI_API_KEY` (used automatically if the Google key is missing; `AI_PRIMARY_PROVIDER=openai` prefers it). Enable billing on the Google project before real families use it.

## 5. PayOS

1. <https://my.payos.vn>: verify the account, link a Vietnamese bank account, create a payment channel.
2. Copy **Client ID**, **API Key**, **Checksum Key** into `.env.local`.
3. In the channel settings set the webhook URL to `https://YOUR-APP.vercel.app/api/payos/webhook` (PayOS tests it when you save).
4. Flow: the checkout modal calls `/api/payos/create-payment-link`, which records a `pending` transaction, creates the PayOS link and returns a VietQR code. The webhook verifies PayOS's signature and calls `activate_premium_from_order()`. The modal also polls `/api/payos/status`, which asks PayOS directly if the webhook is late, so the customer isn't left waiting.

## 6. Deploy

Push to GitHub, import in Vercel, add all variables from `.env.example`, deploy, re-check section 3 step 4.

---

## 7. How the key guarantees work

| Requirement | Implementation |
|---|---|
| Credits never on the client | `families.credits_remaining` in Postgres; no client INSERT/UPDATE privilege or policy. |
| Atomic decrement | SQL `consume_family_credit()`: one `UPDATE … WHERE credits_remaining > 0`; executable only by `service_role`. |
| Charged only after success | Chat: on the **first streamed token** (abort if the spend fails). Trivia, narrator, memory archiver: after the result is saved. |
| Live header badge | Supabase Realtime on `families` + `getCreditStatus()` re-read after each AI call. |
| Price tamper-proof | The browser sends only `monthly`/`yearly`; amount and duration come from `src/lib/plans.ts` and SQL. |
| Webhook safety | Signature verified by the SDK; activation is idempotent and checks the amount. |
| Fast first paint | RSC pages, `loading.tsx` skeletons, no chart/editor libraries, one font family, tree is plain SVG. |
| Senior mode | `data-ui="senior"` on `<html>` from a cookie (no flash): 20px root size, higher contrast, large targets, auto-read-aloud, voice auto-send. |

## 8. Behaviour notes

- **Memory saving is never blocked by credits.** With no credits the leaf is saved without AI title/summary.
- **Sealed Time Capsules** are invisible to other members until `unlock_date` (RLS). The author sees a sealed leaf and the UI hides its text until the date.
- **AI chats are private** per user (a teen's chats are not shown to parents).
- **Provider fallback** is by configuration, not automatic mid-request failover.
- Story game: you can't add two sentences in a row; the AI narrator's line hands the turn back and costs one credit.
- Care reminders appear in the app; there are no push notifications or emails yet.
- Column/table names follow your schema section (`subscription_tier`, `ai_messages`); extra columns are listed in the migrations.

## 9. Known risks (check first when you run it)

1. `@payos/node` v2: I confirmed `new PayOS({...})`, `paymentRequests.create`, `webhooks.verify` from its README, but `paymentRequests.get(orderCode)` (used only in the status fallback) is from memory. If it differs, only that fallback breaks; the webhook path is unaffected.
2. AI SDK v5: `onChunk` text chunk type is matched as `text` or `text-delta`; `useChat({ messages, transport })` and `DefaultChatTransport` follow the v5 docs as I know them.
3. Not tested with real Supabase RLS: run a smoke test with two accounts in two families to confirm they can't see each other's data (Phase 5 includes a script).

---

## 10. PWA (cài đặt như app thật)

Files: `src/app/manifest.ts`, `public/sw.js`, `public/offline.html`, `public/*.png` icons, `src/components/pwa/{sw-register,install-banner}.tsx`, `pwa.*` keys in `messages/*.json`, `/sw.js` headers in `next.config.mjs`.

- **Android (Chrome):** the service worker is registered in production only, so Chrome offers "Install app"; the corner banner has its own *Install app* button. Other Android browsers get manual steps after 6 s.
- **iPhone/iPad (Safari):** there is no install prompt, so the banner shows the 3 "Add to Home Screen" steps. Opened from the home screen it runs full screen (`appleWebApp.capable`).
- The banner never shows on desktop or inside the installed app; "Not now" hides it for 14 days.
- **Needs HTTPS** (Vercel provides it). Test on a real deployment, not `next dev` (the service worker is off in dev).
- The service worker caches only `/offline.html` and one icon. It never stores pages, API responses, photos or chats, because family data must not stay on shared devices.
- `maximumScale: 1` is set as requested. Android Chrome then blocks pinch-zoom, which hurts low-vision users. The actual cause of iOS auto-zoom is text under 16px in fields, so all fields are now ≥16px (`globals.css`); if you want pinch-zoom back on Android, delete the `maximumScale: 1` line in `src/app/[locale]/layout.tsx`.
- Theme colour is `#1E3A5F` (manifest and browser bar); background `#FAF8F5`. Regenerate icons by editing the circles in the script you used, or replace the PNGs in `public/` (192, 512, 512 maskable, 180 apple-touch).

---

## 11. Family room, chore wheel, Ô Ăn Quan (migration 003)

**Run `003_family_and_games.sql` after 001 and 002.** It is additive: `families` and `profiles.family_id` already existed, so it adds to them instead of recreating them.

- **`invite_code`** is a *generated alias* of the existing `family_code` (same 6 characters, no I/O/0/1, easy to read aloud). Renaming the column would have broken onboarding and the older code. `families.created_by` is new (backfilled with each family's earliest member).
- **Create / join from `/home` and `/settings`** (`FamilyRoomCard`): RPCs `switch_to_family(code)` and `create_family_for_member(name)`. Limits: one change per 24 h, 30 members per family, 10 wrong codes per 15 min. The old family and its memories stay in place (the person can return with the old code); reminders addressed to the person are deleted.
- **Realtime channel `family:{family_id}`** (`src/components/providers/family-provider.tsx`): Presence shows who is online, Broadcast carries activity toasts, wheel spins and Ô Ăn Quan moves. The channel is **private**: migration 003 adds `realtime.messages` policies so only members of that family can read or write it. If the migration prints "realtime.messages not found", enable Realtime in the dashboard and re-run section 3 of the file. In the Supabase dashboard, check *Realtime → Settings → "Allow public access"* is **off**, otherwise private channels are not enforced.
- **Chore wheel** (`chore-wheel.tsx`): the *server* picks the chore and person (`crypto.randomInt`), saves the history row, and returns the payload; the client then broadcasts it, so every phone spins to the same spot. A second spin within about 5.5 s is refused. Defaults (including "Miễn việc hôm nay") are seeded in the family's language on first visit. Everyone can add or remove chores (max 20).
- **Ô Ăn Quan** (`o-an-quan.tsx`, rules in `src/lib/games/o-an-quan.ts`): the same pure engine runs on the server (validates every move, turn and move number) and on both phones (animates step by step). The mover animates at once, the server confirms, then the move is broadcast; the other phone replays it. If a move is missed or the connection drops, the board reloads from the database.
- **Boards are rotated per player:** each player sees their own side at the bottom, so the room creator is at the bottom and the joiner sees the board turned 180°. "Right" is the same direction for both. (Showing the joiner at the top, as first described, would make them play a mirrored board.)
- **Rule choices to confirm with your family:** a quan square is captured only with 5 or more pebbles on it; 1 quan = 10 pebbles; borrowed pebbles are repaid at the end. House rules vary, edit `o-an-quan.ts` if yours differ. The engine was run through 20,000 random games (pebbles always 50, quan always 2, every game ends).
- **Not tested live:** like the rest of the project, none of this has been run against a real Supabase project or with two devices. Check first: two accounts in one family see each other online; a third account in another family receives nothing; a spin lands on the same segment on both phones.
- Limitations: the member list refreshes when a new person appears online or on reload, not the moment someone leaves; "Allow public access" for Realtime must be off (see above).

---

## 12. Free uses: 5 AI + 10 games (migration 004)

- Both counters live on `families` and are shared by the whole family. `credits_remaining` (default 5) is the AI counter, unchanged; `free_ai_uses` is a read-only generated alias of it. New column `free_game_uses` (default 10) also applies to existing families.
- **AI** (Companion, Translator, Scam Shield, memory archiver, trivia, story narrator) spends 1 use as before; at 0 the server answers `NO_CREDITS` and the page shows the *See Premium plans* button.
- **Games:** spinning the chore wheel and a Ô Ăn Quan game starting (when the second player joins, not when the room is created) each spend 1 use through `consume_family_game_use()` (atomic, `service_role` only). At 0 the buttons are disabled and `UpgradeGate` appears; the server refuses too (`NO_GAME_USES`). If the last use is taken by someone else at the same moment, the spin row or the join is rolled back, so nobody gets a free game or loses a use for nothing.
- Premium families are never charged. Header badge: `5 AI • 10 Games left`, or `Premium`; it updates by Realtime and after each spend the provider calls `router.refresh()`.
- Trivia and the story game are AI features, so they use the AI counter, not the game counter.
- Run section 4 of the SQL (`revoke update on families`) only if your app never updates `families` from the browser; nothing in this code does.
