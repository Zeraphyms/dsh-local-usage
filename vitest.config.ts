import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Published primitives import CSS Modules, which must pass through Vite.
    server: { deps: { inline: [/@deepseek-ai\/dsh-client-ui-primitives/] } },
  },
})
