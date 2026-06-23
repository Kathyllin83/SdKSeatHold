import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SeatHold',
      formats: ['es', 'umd'],
      fileName: (format) => `seathold.${format === 'es' ? 'esm' : format}.js`,
    },
    rollupOptions: {
      external: [],
    },
  },
});
