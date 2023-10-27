import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as packageJson from './package.json';
import tsConfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig(() => ({
    plugins: [
        tsConfigPaths(),
        dts({
            include: ['src/']
        }),
        react()
    ],
    build: {
        lib: {
            entry: resolve('src', 'index.ts'),
            name: 'yasm',
            formats: ['es', 'umd'],
            fileName: format => `index.${format}.js`
        },
        rollupOptions: {
            external: [...Object.keys(packageJson.peerDependencies)]
        }
    }
}));
