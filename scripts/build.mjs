import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDirectory = path.join(repositoryDirectory, '.build');

function run(command, args) {
    const result = spawnSync(command, args, {
        cwd: repositoryDirectory,
        shell: process.platform === 'win32',
        stdio: 'inherit',
    });

    if (result.error) {
        throw result.error;
    }

    return result.status === 0;
}

rmSync(buildDirectory, { recursive: true, force: true });

try {
    const compiled = run('tsc', ['--outDir', buildDirectory, '--noEmit', 'false']);
    const bundled = compiled && run('ncc', ['build', path.join(buildDirectory, 'index.js')]);

    if (!bundled) {
        process.exitCode = 1;
    }
} finally {
    rmSync(buildDirectory, { recursive: true, force: true });
}
