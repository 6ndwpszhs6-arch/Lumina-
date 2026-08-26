import "server-only";
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

// Server-only. Never import this from a client component.
export const stripe: Stripe | null = secretKey ? new Stripe(secretKey) : null;
