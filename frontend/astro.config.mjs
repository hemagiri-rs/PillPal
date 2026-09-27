// @ts-check
import preact from "@astrojs/preact";
import { defineConfig } from "astro/config";

// Static output only: the same build is served on the web and wrapped by Capacitor later.
export default defineConfig({
  output: "static",
  integrations: [preact()],
  server: { port: 4321 },
});
