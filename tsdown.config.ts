import { defineConfig } from 'tsdown';

export default defineConfig({
  workspace: true,
  deps: { onlyBundle: [] },
  treeshake: { moduleSideEffects: false },
});
