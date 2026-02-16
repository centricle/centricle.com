// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  adapter: netlify(),
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    port: 7001,
    allowedHosts: true,
  },
});
