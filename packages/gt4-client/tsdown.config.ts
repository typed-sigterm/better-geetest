import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: true,
  exports: {
    customExports: {
      './original-sdk/gt4.js': './original-sdk/gt4.js',
      './original-sdk/bypass.js': './original-sdk/bypass.js',
    },
  },
});
