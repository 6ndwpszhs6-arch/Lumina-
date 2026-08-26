import type { CapacitorConfig } from "@capacitor/cli";

// Lumina ships as a hosted web app (Next.js, incl. API routes for chat &
// the admin forum). The native iOS shell just loads that deployed site in
// a WebView rather than bundling a static export, so API routes keep
// working unchanged. Deploy the app first (e.g. to Vercel), then replace
// `url` below with your production domain before running `npx cap sync`.
const config: CapacitorConfig = {
  appId: "app.lumina.dietmetabolism",
  appName: "Lumina",
  webDir: "public",
  server: {
    url: "https://your-deployed-domain.example.com",
    cleartext: false,
  },
};

export default config;
