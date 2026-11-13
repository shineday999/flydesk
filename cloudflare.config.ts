import { bindings, defineConfig, defineWorker } from 'cf/config';

export default defineConfig({
  worker: defineWorker({
    name: 'flydesk',
    entrypoint: 'vinext/server/fetch-handler',
    compatibilityDate: '2026-11-13',
    assets: {
      htmlHandling: 'none',
      notFoundHandling: 'none',
      runWorkerFirst: ['/*', '!/_next/static/*', '!/*/_next/static/*'],
    },
    env: {
      ASSETS: bindings.assets(),
      DB: bindings.d1({ name: 'flydesk' }),
      // 必要憑證：以 secret binding 宣告，本機值來自 .dev.vars，
      // 線上值由 `wrangler secret put` 設定（未宣告的變數不會進 worker env）。
      ADMIN_PASSWORD: bindings.secret(),
      SESSION_SECRET: bindings.secret(),
    },
  }),
});
