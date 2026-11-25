import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://pakkawatkh.github.io',
  base: '/public',
  trailingSlash: 'always',
  output: 'static',
  integrations: [react()],
});
