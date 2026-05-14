export default defineNuxtConfig({
  compatibilityDate: '2026-03-22',
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/energy_stats_favicon.ico' }
      ]
    }
  },
  modules: ['@nuxt/ui', '@pinia/nuxt', 'pinia-plugin-persistedstate/nuxt', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'js-base64',
      ]
    }
  },
  devtools: { enabled: true },
  runtimeConfig: {
    apiBaseUrl: process.env.NUXT_API_BASE_URL || 'http://localhost:8080/energyStatsApi',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/energyStatsApi',
    },
  },
  colorMode: {
    preference: 'light',
    fallback: 'light',
    storageKey: 'nuxt-color-mode'
  },
})