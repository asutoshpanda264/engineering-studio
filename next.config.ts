import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Next.js blocks cross-origin requests to dev-only assets/endpoints by
  // default, which silently breaks client hydration when the dev server is
  // reached through a tunnel (ngrok, Cloudflare Tunnel, etc.) instead of
  // localhost — the page paints but nothing is interactive. Wildcards cover
  // ngrok's randomly-generated subdomain, which changes every session.
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app", "*.ngrok.app"],
};

export default nextConfig;
