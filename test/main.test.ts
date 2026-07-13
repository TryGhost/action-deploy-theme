import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    adminApi: vi.fn(),
    exec: vi.fn(),
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

vi.mock(import('@actions/exec'), () => ({
    exec: mocks.exec,
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

const defaultExcludeArgs = [
    '*.git*',
    '*.zip',
    'yarn*',
    'npm*',
    'pnpm*',
    'node_modules*',
    'AGENTS.md',
    'CLAUDE.md',
    'pnpm-workspace.yaml',
    '*routes.yaml',
    '*redirects.yaml',
    '*redirects.json',
];

describe('run', () => {
    let workspace: string;
    let inputs: Record<string, string>;
    let previousWorkspace: string | undefined;

    beforeEach(() => {
        workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-theme-unit-'));
        previousWorkspace = process.env.GITHUB_WORKSPACE;
        process.env.GITHUB_WORKSPACE = workspace;
        inputs = {
            'api-key': 'test-api-key',
            'api-url': 'https://example.test',
        };

        mocks.getInput.mockImplementation((name: string) => inputs[name] ?? '');
        mocks.exec.mockResolvedValue(0);
        mocks.upload.mockResolvedValue(undefined);
    });

    afterEach(() => {
        if (previousWorkspace === undefined) {
            delete process.env.GITHUB_WORKSPACE;
        } else {
            process.env.GITHUB_WORKSPACE = previousWorkspace;
        }
        fs.rmSync(workspace, { force: true, recursive: true });
    });

    it('packages and uploads a theme using the default inputs', async () => {
        fs.writeFileSync(
            path.join(workspace, 'package.json'),
            JSON.stringify({ name: 'My Theme' }),
        );

        await run();

        const zipPath = path.join(workspace, 'my-theme.zip');
        expect(mocks.adminApi).toHaveBeenCalledWith({
            url: 'https://example.test',
            key: 'test-api-key',
            version: 'v6.0',
        });
        expect(mocks.exec).toHaveBeenCalledWith(
            'zip',
            ['-r', 'my-theme.zip', '.', '-x', ...defaultExcludeArgs],
            { cwd: workspace },
        );
        expect(mocks.upload).toHaveBeenCalledWith({ file: zipPath });
        expect(mocks.info).toHaveBeenCalledWith(`${zipPath} successfully uploaded.`);
        expect(mocks.setFailed).not.toHaveBeenCalled();
    });

    it('honours custom package, version, theme name, and exclude inputs', async () => {
        const themeDirectory = path.join(workspace, 'packages', 'casper');
        fs.mkdirSync(themeDirectory, { recursive: true });
        fs.writeFileSync(
            path.join(themeDirectory, 'package.json'),
            JSON.stringify({ name: 'unused' }),
        );
        Object.assign(inputs, {
            exclude: 'gulpfile.js   assets/private/*',
            'theme-name': 'custom-casper',
            version: 'v5.0',
            'working-directory': 'packages/casper',
        });

        await run();

        expect(mocks.adminApi).toHaveBeenCalledWith({
            url: 'https://example.test',
            key: 'test-api-key',
            version: 'v5.0',
        });
        expect(mocks.exec).toHaveBeenCalledWith(
            'zip',
            [
                '-r',
                'custom-casper.zip',
                '.',
                '-x',
                ...defaultExcludeArgs,
                'gulpfile.js',
                'assets/private/*',
            ],
            { cwd: themeDirectory },
        );
        expect(mocks.upload).toHaveBeenCalledWith({
            file: path.join(themeDirectory, 'custom-casper.zip'),
        });
    });

    it('uploads a prebuilt file without reading or packaging the theme', async () => {
        Object.assign(inputs, {
            exclude: '--ignored-for-prebuilt-files',
            file: 'build/theme.zip',
            'theme-name': 'ignored',
        });

        await run();

        expect(mocks.exec).not.toHaveBeenCalled();
        expect(mocks.upload).toHaveBeenCalledWith({
            file: path.join(workspace, 'build/theme.zip'),
        });
        expect(mocks.setFailed).not.toHaveBeenCalled();
    });

    it('rejects option-like exclude patterns before invoking zip', async () => {
        fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({ name: 'casper' }));
        inputs.exclude = 'assets/* --junk-paths';

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith(
            'Invalid exclude pattern: option-like values are not allowed',
        );
        expect(mocks.exec).not.toHaveBeenCalled();
        expect(mocks.upload).not.toHaveBeenCalled();
        expect(mocks.info).not.toHaveBeenCalled();
    });

    it('reports an invalid package file without invoking zip or upload', async () => {
        fs.writeFileSync(path.join(workspace, 'package.json'), '{not json');

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith(expect.stringContaining('JSON'));
        expect(mocks.exec).not.toHaveBeenCalled();
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it('reports a missing package file without invoking zip or upload', async () => {
        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith(expect.stringContaining('package.json'));
        expect(mocks.exec).not.toHaveBeenCalled();
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it('reports a zip failure without attempting an upload', async () => {
        fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({ name: 'casper' }));
        mocks.exec.mockRejectedValue(new Error('zip failed'));

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith('zip failed');
        expect(mocks.upload).not.toHaveBeenCalled();
        expect(mocks.info).not.toHaveBeenCalled();
    });

    it('stringifies a non-Error upload failure', async () => {
        inputs.file = 'theme.zip';
        mocks.upload.mockRejectedValue('upload unavailable');

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith('upload unavailable');
        expect(mocks.info).not.toHaveBeenCalled();
    });
});
