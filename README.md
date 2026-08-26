# Metabo — Diet & Metabolism

A mobile-first app (PWA + Capacitor-ready for iOS) focused on diet and metabolism:

- **TDEE & Calorie Calculator** — BMR (Mifflin-St Jeor), TDEE, and a daily calorie + macro target based on your goal (lose/maintain/gain). Runs fully offline, stored on-device (IndexedDB via Dexie).
- **Diet & Metabolism Assistant** — a chatbot scoped strictly to diet, nutrition, metabolism, and metabolic conditions (diabetes, PKU, thyroid issues, metabolic syndrome). It declines off-topic questions and never gives diagnoses, medication/insulin dosing, or individualized medical nutrition therapy — always deferring to the user's care team for that. Personal chat history stays on-device.
- **News & Research forum** — a read-only feed of medical news and research, curated and published only by the app owner from medically approved sources. Regular users can read and filter by category; there is no user posting, which keeps the feed free of unmoderated/unverified content.
- **Food barcode scanner (Premium)** — scan or enter a food's barcode to see its full macro (calories, protein, fat, saturated fat, carbs, sugar, fiber) and micronutrient (sodium, potassium, calcium, iron, cholesterol, vitamins A/C/D) breakdown, sourced from Open Food Facts. Scanned items can be added to an on-device daily log with running totals.

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

## Premium subscription

The scanner and its macro/micronutrient detail are gated behind a `Subscription` record (`src/lib/subscription.ts`), stored locally per device. Right now there's no real payment processor wired up — the "Upgrade" button just flips that local flag so the gated UI can be built and tested (clearly labeled as a preview in the app itself).

**This is deliberate, not a shortcut**: Apple requires digital subscriptions that unlock features inside an iOS app to go through StoreKit / In-App Purchase — a third-party processor like Stripe isn't allowed for that and risks App Store rejection. The recommended path to real billing:

1. Set up **[RevenueCat](https://www.revenuecat.com)** (handles StoreKit receipt validation and cross-device entitlement without needing your own backend/accounts system) and create a subscription product in App Store Connect.
2. Add the RevenueCat Capacitor SDK, initialize it in the native shell, and replace `setPremium`/`getSubscription` in `src/lib/subscription.ts` with a call to RevenueCat's `getCustomerInfo()` entitlement check.
3. Keep the local `Subscription` table as an on-device cache of that entitlement so the app still works offline.

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
4. Build and run from Xcode, or archive for TestFlight/App Store submission.

## Data & privacy

- Profile, TDEE history, chat history, subscription state, and the food log are stored only in the device's local IndexedDB — never uploaded to any server (chat messages are sent transiently to the Anthropic API solely to generate a reply, and barcodes are sent transiently to Open Food Facts solely to look up nutrition; neither is stored server-side by this app).
- The forum is the only shared/server-stored data, and it only ever contains content the app owner has published.

## Medical disclaimer

Metabo provides general educational information only. It is not medical advice and does not replace a licensed healthcare professional, registered dietitian, or your care team — this is especially important for diabetes, PKU, and other metabolic conditions where treatment must be individualized.

## Possible next steps

1. Real billing via RevenueCat + StoreKit (see Premium subscription above)
2. Native camera barcode scanning via a Capacitor plugin (e.g. `@capacitor-mlkit/barcode-scanning`) — the current camera scan path uses the browser's `BarcodeDetector` API, which isn't universally supported
3. Push notifications for new forum posts
4. Weight trend chart in the calculator history
5. Multi-language support
6. Streaming chat responses
7. Android build via Capacitor
