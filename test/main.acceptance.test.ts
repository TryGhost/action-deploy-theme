import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    adminApi: vi.fn(),
    getInput: vi.fn(),
    info: vi.fn(),
    setFailed: vi.fn(),
    upload: vi.fn(),
}));

vi.mock(import('@actions/core'), () => ({
    getInput: mocks.getInput,
    info: mocks.info,
    setFailed: mocks.setFailed,
}));

vi.mock(import('@tryghost/admin-api'), () => ({
    default: class MockGhostAdminApi {
        themes = { upload: mocks.upload };

        constructor(options: unknown) {
            mocks.adminApi(options);
        }
    },
}));

import { run } from '../src/main';

describe('theme packaging acceptance', () => {
    let externalPaths: string[];
    let inputs: Record<string, string>;
    let workspace: string;
    let previousWorkspace: string | undefined;

    beforeEach(() => {
        externalPaths = [];
        workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-theme-acceptance-'));
        previousWorkspace = process.env.GITHUB_WORKSPACE;
        process.env.GITHUB_WORKSPACE = workspace;

        inputs = {
            'api-key': 'test-api-key',
            'api-url': 'https://example.test',
            exclude: 'private.txt',
        };
        mocks.getInput.mockImplementation((name: string) => inputs[name] ?? '');
        mocks.upload.mockResolvedValue(undefined);
    });

    afterEach(() => {
        if (previousWorkspace === undefined) {
            delete process.env.GITHUB_WORKSPACE;
        } else {
            process.env.GITHUB_WORKSPACE = previousWorkspace;
        }
        fs.rmSync(workspace, { force: true, recursive: true });
        for (const externalPath of externalPaths) {
            fs.rmSync(externalPath, { force: true, recursive: true });
        }
    });

    it('creates a real archive containing only deployable theme files', async () => {
        const includedFiles = ['index.hbs', 'assets/main.css'];
        const excludedFiles = [
            '.git/config',
            'existing.zip',
            'yarn.lock',
            'npm-debug.log',
            'pnpm-lock.yaml',
            'node_modules/dependency.js',
            'AGENTS.md',
            'CLAUDE.md',
            'pnpm-workspace.yaml',
            'routes.yaml',
            'redirects.yaml',
            'redirects.json',
            'private.txt',
        ];

        fs.writeFileSync(
            path.join(workspace, 'package.json'),
            JSON.stringify({ name: 'Acceptance Theme' }),
        );
        for (const file of [...includedFiles, ...excludedFiles]) {
            const filePath = path.join(workspace, file);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, file);
        }

        await run();

        const zipPath = path.join(workspace, 'acceptance-theme.zip');
        const archiveFiles = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
            .trim()
            .split('\n')
            .filter((entry) => !entry.endsWith('/'));

        expect(archiveFiles).toEqual(expect.arrayContaining(['package.json', ...includedFiles]));
        for (const excludedFile of excludedFiles) {
            expect(archiveFiles).not.toContain(excludedFile);
        }
        expect(mocks.upload).toHaveBeenCalledWith({ file: zipPath });
        expect(mocks.info).toHaveBeenCalledWith(`${zipPath} successfully uploaded.`);
        expect(mocks.setFailed).not.toHaveBeenCalled();
    });

    it('does not package a symlink to a file outside the workspace', async () => {
        const externalDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-theme-external-'));
        externalPaths.push(externalDirectory);
        const externalFile = path.join(externalDirectory, 'secret.txt');
        fs.writeFileSync(externalFile, 'secret');
        fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({ name: 'theme' }));
        fs.symlinkSync(externalFile, path.join(workspace, 'asset.txt'));

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith(
            'Theme source must not contain symlinks: asset.txt',
        );
        expect(mocks.upload).not.toHaveBeenCalled();
        expect(fs.existsSync(path.join(workspace, 'theme.zip'))).toBe(false);
    });

    it('ignores an excluded node_modules symlink without dereferencing it', async () => {
        const externalDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-theme-external-'));
        externalPaths.push(externalDirectory);
        fs.writeFileSync(path.join(externalDirectory, 'secret.txt'), 'secret');
        fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({ name: 'theme' }));
        fs.writeFileSync(path.join(workspace, 'index.hbs'), 'theme');
        fs.symlinkSync(externalDirectory, path.join(workspace, 'node_modules'));

        await run();

        const archiveFiles = execFileSync('unzip', ['-Z1', 'theme.zip'], {
            cwd: workspace,
            encoding: 'utf8',
        })
            .trim()
            .split('\n');
        expect(archiveFiles).toEqual(expect.arrayContaining(['package.json', 'index.hbs']));
        expect(archiveFiles).not.toContain('node_modules/secret.txt');
        expect(mocks.setFailed).not.toHaveBeenCalled();
    });

    it('rejects a nested node_modules symlink that the root exclusion does not match', async () => {
        const externalDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-theme-external-'));
        externalPaths.push(externalDirectory);
        fs.writeFileSync(path.join(externalDirectory, 'secret.txt'), 'secret');
        fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({ name: 'theme' }));
        fs.mkdirSync(path.join(workspace, 'packages', 'theme'), { recursive: true });
        fs.symlinkSync(
            externalDirectory,
            path.join(workspace, 'packages', 'theme', 'node_modules'),
        );

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith(
            `Theme source must not contain symlinks: ${path.join('packages', 'theme', 'node_modules')}`,
        );
        expect(mocks.upload).not.toHaveBeenCalled();
        expect(fs.existsSync(path.join(workspace, 'theme.zip'))).toBe(false);
    });

    it('rebuilds an existing archive without retaining stale entries', async () => {
        fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({ name: 'theme' }));
        fs.writeFileSync(path.join(workspace, 'index.hbs'), 'theme');
        fs.writeFileSync(path.join(workspace, 'stale-secret.txt'), 'secret');
        execFileSync('zip', ['theme.zip', 'stale-secret.txt'], { cwd: workspace });
        fs.rmSync(path.join(workspace, 'stale-secret.txt'));

        await run();

        const archiveFiles = execFileSync('unzip', ['-Z1', 'theme.zip'], {
            cwd: workspace,
            encoding: 'utf8',
        })
            .trim()
            .split('\n');
        expect(archiveFiles).toEqual(expect.arrayContaining(['package.json', 'index.hbs']));
        expect(archiveFiles).not.toContain('stale-secret.txt');
        expect(mocks.setFailed).not.toHaveBeenCalled();
    });
});
