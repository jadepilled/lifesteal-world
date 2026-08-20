import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const githubPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  site: githubPages ? 'https://jadepilled.github.io/lifesteal-world' : 'https://lifesteal.world',
  base: githubPages ? '/lifesteal-world' : '/',
  output: 'static',
  integrations: [sitemap()],
  build: {
    assets: '_assets',
    inlineStylesheets: 'auto',
  },
});
