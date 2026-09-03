import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.iscracingteam.com',
  // Static output: five mostly-static pages per language.
  output: 'static',
  build: { format: 'directory' }
});
