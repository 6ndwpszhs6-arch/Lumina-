# Metabo — Diet & Metabolism

A mobile-first app (PWA + Capacitor-ready for iOS) focused on diet and metabolism:

- **TDEE & Calorie Calculator** — BMR (Mifflin-St Jeor), TDEE, and a daily calorie + macro target based on your goal (lose/maintain/gain). Runs fully offline, stored on-device (IndexedDB via Dexie).
- **Diet & Metabolism Assistant** — a chatbot scoped strictly to diet, nutrition, metabolism, and metabolic conditions (diabetes, PKU, thyroid issues, metabolic syndrome). It declines off-topic questions and never gives diagnoses, medication/insulin dosing, or individualized medical nutrition therapy — always deferring to the user's care team for that. Personal chat history stays on-device.
- **News & Research forum** — a read-only feed of medical news and research, curated and published only by the app owner from medically approved sources. Regular users can read and filter by category; there is no user posting, which keeps the feed free of unmoderated/unverified content.
- **Food barcode scanner (Premium)** — scan or enter a food's barcode to see its full macro (calories, protein, fat, saturated fat, carbs, sugar, fiber) and micronutrient (sodium, potassium, calcium, iron, cholesterol, vitamins A/C/D) breakdown, sourced from Open Food Facts (which already covers real Greek packaged products, since it's a global crowdsourced database with real barcodes contributed by shoppers everywhere, Greece included — coverage for a given product just depends on whether someone's scanned it in). Scanned items can be added to an on-device daily log with running totals. Camera scanning uses the device's native camera (via ML Kit) when running as the built iOS/Android app, and the browser's `BarcodeDetector` API on web where supported (Chrome/Edge) — **note: Safari does not implement `BarcodeDetector` at all**, so camera scanning on the web/PWA version won't work in Safari on iPhone/iPad; manual barcode entry always works everywhere, and the native app path doesn't depend on Safari support at all.
- **Greek dishes database (Premium)** — a curated, name-searchable list of ~14 traditional Greek foods (feta, tzatziki, moussaka, souvlaki, dolmades, spanakopita, baklava, and more) with the same macro/micronutrient detail, for exactly the case barcode scanning can't cover: homemade or unpackaged dishes that never had a barcode to begin with. Values are typical/representative figures per dish (`src/lib/greekFoods.ts`), not measurements of one specific product — labeled as such in the UI, and easy to extend with more dishes.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Dexie.js (IndexedDB) for on-device data — profile, TDEE history, chat history, and an offline cache of the news feed
- Supabase (Postgres) for the shared news/research feed
- Anthropic Claude API for the chatbot, called from a Next.js API route (the API key never reaches the client)
- Open Food Facts (free, keyless) for barcode nutrition lookups, proxied through a Next.js API route
- Capacitor-ready for wrapping the deployed web app as a native iOS app

## Getting started (web)

```bash
npm install
cp .env.example .env.local   # fill in the values described below
npm run dev
```

Open http://localhost:3000. On a phone, open the same URL in Safari/Chrome and "Add to Home Screen" for an installable, native-like experience.

### Environment variables

See `.env.example`. None are required just to browse the calculator — the app degrades gracefully:

| Variable | Purpose | If missing |
|---|---|---|
| `ANTHROPIC_API_KEY` | Powers the chatbot | Chat screen shows "not configured yet" |
| `ANTHROPIC_MODEL` | Optional model override | Defaults to `claude-sonnet-5` |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public read access to published forum posts | Forum shows "not configured yet" (or last cached posts if any) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side writes from the admin panel | Admin API routes return 503 |
| `ADMIN_SECRET` | Password gating `/admin` and the admin API routes | Admin routes return 401 |

### Setting up the forum backend (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `docs/supabase-schema.sql` — it creates the `forum_posts` table with Row Level Security so anonymous users can only ever read posts you've published; only your service role key can write.
3. Copy the Project URL, `anon` public key, and `service_role` secret key into `.env.local`.
4. Visit `/admin`, enter your `ADMIN_SECRET`, and publish your first post. Only cite medically approved sources (e.g. ADA, WHO, NIH, CDC, Mayo Clinic, peer-reviewed journals) and link back to the original source.

### Setting up the chatbot

Set `ANTHROPIC_API_KEY` in `.env.local`. The system prompt (in `src/app/api/chat/route.ts`) restricts the assistant to diet/nutrition/metabolism topics and metabolic conditions, and instructs it to defer medical decisions (diagnosis, medication, PKU protein limits, etc.) to the user's healthcare provider.

## Premium subscription (Stripe)

The scanner and its macro/micronutrient detail are gated behind a `Subscription` record (`src/lib/subscription.ts`), cached locally per device. Billing is real, via **Stripe Checkout** — there's no in-app account system, so **email is the link** between a Stripe customer and the on-device Premium flag: the Stripe webhook writes subscription status into a Supabase `subscriptions` table keyed by email, and the app looks it up by email both right after checkout and via the "Restore access" flow on a new device.

(Metabo is a web app/PWA, not a native iOS app anymore, so Stripe is used directly rather than Apple's StoreKit/In-App Purchase — that requirement only applies to purchases made from inside a native app binary.)

### Setup

1. Create a free account at [stripe.com](https://stripe.com).
2. In the Stripe Dashboard, create a **Product** (e.g. "Metabo Premium") with a recurring **Price** (e.g. $4.99/month). Copy its Price ID (`price_...`).
3. Under **Developers → API keys**, copy your **Secret key** (`sk_test_...` while testing, `sk_live_...` once ready for real charges).
4. Under **Developers → Webhooks**, add an endpoint pointing at `https://<your-deployment>/api/subscription/webhook`, subscribed to at least: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy its **Signing secret** (`whsec_...`).
5. In your Supabase project's SQL editor, re-run `docs/supabase-schema.sql` — it now also creates the `subscriptions` table (safe to re-run; uses `create table if not exists`).
6. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_ID` in `.env.local` (or your deployment's environment variables) — see `.env.example`.
7. Test with [Stripe's test card](https://docs.stripe.com/testing) `4242 4242 4242 4242`, any future expiry, any CVC, before switching to live keys.

The Premium price shown in the app's UI (`src/components/Paywall.tsx`, `src/components/ProfileScreen.tsx`) is plain text — if you change the price in Stripe, update those two spots to match.

## User accounts (Supabase Auth)

Signing in is **optional** — the app keeps working fully offline/local-only without an account, exactly as before. Logging in (magic link or Google) syncs profile, TDEE history, and food log to the account via `src/lib/sync.ts`, so they follow the user across devices. On first login, on-device data and the account's synced data are merged (newest profile wins; history/log/chat entries are unioned by id, so nothing on either side is discarded).

Signing in also fixes the fragile part of the Stripe "Restore access" flow: once logged in, Premium is checked against the account's own email automatically, instead of the user having to remember and retype whatever email they subscribed with.

### Setup

1. In your Supabase project's SQL editor, re-run `docs/supabase-schema.sql` — it now also creates the `profiles`, `tdee_history`, `food_log`, and `chat_messages` tables (safe to re-run).
2. Magic-link email sign-in works out of the box once `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (same vars as the forum) — no extra setup.
3. For Google sign-in: in [Google Cloud Console](https://console.cloud.google.com), create an OAuth 2.0 Client ID (type "Web application"), then in Supabase go to **Authentication → Providers → Google**, enable it, and paste in the Client ID/Secret. Supabase's provider page shows the exact redirect URI to add to the Google OAuth client.
4. Under **Authentication → URL Configuration** in Supabase, add your deployed domain (and `http://localhost:3000` for local dev) to the allowed redirect URLs, or magic links and OAuth redirects will fail.

## Building the iOS app (Capacitor)

Metabo's native shell loads your deployed website in a WebView rather than bundling a static export, so the chat and admin API routes keep working unchanged.

1. Deploy the Next.js app (e.g. to Vercel) with the environment variables above configured.
2. Update `server.url` in `capacitor.config.ts` to your deployed domain.
3. On a Mac with Xcode installed:
   ```bash
   npx cap add ios
   npx cap sync
   npx cap open ios
   ```
4. In Xcode, add a `NSCameraUsageDescription` entry to `Info.plist` (e.g. "Used to scan food barcodes for nutrition lookup") — required by iOS whenever an app requests camera access, including via the barcode scanner's `@capacitor-mlkit/barcode-scanning` plugin.
5. Build and run from Xcode, or archive for TestFlight/App Store submission.

**Note on camera scanning**: the scanner's native-camera code path (`Capacitor.isNativePlatform()` branch in `src/components/ScanScreen.tsx`) has not been exercised on a real device or simulator — this sandbox has no Xcode/iOS toolchain to test it. It follows the plugin's documented API, and the build/typecheck pass, but treat the very first on-device test as a real test, not a formality.

## Data & privacy

- By default (no account), profile, TDEE history, chat history, subscription state, and the food log are stored only in the device's local IndexedDB — never uploaded to any server (chat messages are sent transiently to the Anthropic API solely to generate a reply, and barcodes are sent transiently to Open Food Facts solely to look up nutrition; neither is stored server-side by this app).
- Signing in (optional — see "User accounts" above) uploads profile, TDEE history, and food log to Supabase, scoped to that account via Row Level Security so only the signed-in user can ever read or write their own rows.
- The forum is the only always-shared/server-stored data, and it only ever contains content the app owner has published.

## Medical disclaimer

Metabo provides general educational information only. It is not medical advice and does not replace a licensed healthcare professional, registered dietitian, or your care team — this is especially important for diabetes, PKU, and other metabolic conditions where treatment must be individualized.

## Possible next steps

1. Real AI provider wired up for the chat assistant (currently shows an "under construction" placeholder — see `src/app/api/chat/route.ts`)
2. On-device verification of the native camera barcode scanner (see note under Building the iOS app above)
3. Push notifications for new forum posts
4. Weight trend chart in the calculator history
5. Multi-language support
6. Streaming chat responses
7. Android build via Capacitor (the ML Kit scanner plugin already supports Android; Android just hasn't been added/tested as a platform yet)
