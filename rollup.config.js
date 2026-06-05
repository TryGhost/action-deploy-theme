const commonjs = require('@rollup/plugin-commonjs');
const {nodeResolve} = require('@rollup/plugin-node-resolve');
const json = require('@rollup/plugin-json');

module.exports = {
    input: 'index.js',
    output: {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: false,
        inlineDynamicImports: true
    },
    plugins: [
        nodeResolve({preferBuiltins: true, exportConditions: ['import', 'default']}),
        commonjs({ignoreDynamicRequires: true}),
        json()
    ],
    onwarn(warning, warn) {
        // Suppress known harmless warnings
        if (warning.code === 'THIS_IS_UNDEFINED') {
            return;
        }
        if (warning.code === 'CIRCULAR_DEPENDENCY') {
            return;
        }
        warn(warning);
    }
};
