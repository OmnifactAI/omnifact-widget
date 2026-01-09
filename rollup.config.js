import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

const production = !process.env.ROLLUP_WATCH;

const typescriptPlugin = typescript({
  tsconfig: './tsconfig.json',
  declaration: false, // We'll generate declarations separately
  declarationDir: undefined
});

export default [
  // IIFE bundle (recommended for script tags)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/omnifact-widget.js',
      format: 'iife',
      name: 'OmnifactWidget',
      sourcemap: true
    },
    plugins: [
      nodeResolve(),
      typescriptPlugin
    ]
  },
  // Minified IIFE for production
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/omnifact-widget.min.js',
      format: 'iife',
      name: 'OmnifactWidget'
    },
    plugins: [
      nodeResolve(),
      typescript({ tsconfig: './tsconfig.json', declaration: false }),
      terser()
    ]
  },
  // ES Module for modern bundlers
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/omnifact-widget.esm.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      nodeResolve(),
      typescript({ tsconfig: './tsconfig.json', declaration: false })
    ]
  },
  // UMD for maximum compatibility
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/omnifact-widget.umd.js',
      format: 'umd',
      name: 'OmnifactWidget',
      sourcemap: true
    },
    plugins: [
      nodeResolve(),
      typescript({ tsconfig: './tsconfig.json', declaration: false })
    ]
  }
];
