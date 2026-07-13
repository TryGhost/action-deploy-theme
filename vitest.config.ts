import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        clearMocks: true,
        environment: 'node',
        restoreMocks: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json-summary', 'lcov'],
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.d.ts'],
            thresholds: {
                branches: 91,
                functions: 99,
                lines: 99,
                statements: 99,
            },
        },
    },
});
