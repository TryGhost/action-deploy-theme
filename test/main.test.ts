import { execFileSync } from 'node:child_process';
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
    let externalPaths: string[];
    let workspace: string;
    let inputs: Record<string, string>;
    let previousWorkspace: string | undefined;

    beforeEach(() => {
        externalPaths = [];
        workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-theme-unit-'));
        previousWorkspace = process.env.GITHUB_WORKSPACE;
        process.env.GITHUB_WORKSPACE = workspace;
        inputs = {
            'api-key': 'test-api-key',
            'api-url': 'https://example.test',
        };

        mocks.getInput.mockImplementation((name: string) => inputs[name] ?? '');
        mocks.exec.mockImplementation(
            async (_command: string, args: string[], options: { cwd: string }) => {
                fs.writeFileSync(path.join(options.cwd, args[2]), 'zip');
                return 0;
            },
        );
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
            ['-r', '-y', 'my-theme.zip', '.', '-x', ...defaultExcludeArgs],
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
                '-y',
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
        fs.mkdirSync(path.join(workspace, 'build'));
        fs.writeFileSync(path.join(workspace, 'build', 'theme.zip'), 'zip');
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

    it('rejects a working directory outside the workspace', async () => {
        const externalDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-theme-external-'));
        externalPaths.push(externalDirectory);
        inputs['working-directory'] = path.relative(workspace, externalDirectory);

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith(
            'working-directory must resolve within GITHUB_WORKSPACE',
        );
        expect(mocks.exec).not.toHaveBeenCalled();
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it('requires GITHUB_WORKSPACE', async () => {
        delete process.env.GITHUB_WORKSPACE;

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith('GITHUB_WORKSPACE is not set');
        expect(mocks.exec).not.toHaveBeenCalled();
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it('requires working-directory to be a directory', async () => {
        fs.writeFileSync(path.join(workspace, 'theme'), 'not a directory');
        inputs['working-directory'] = 'theme';

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith('working-directory must be a directory');
        expect(mocks.exec).not.toHaveBeenCalled();
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it('rejects a working-directory symlink that escapes the workspace', async () => {
        const externalDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-theme-external-'));
        externalPaths.push(externalDirectory);
        fs.symlinkSync(externalDirectory, path.join(workspace, 'theme'));
        inputs['working-directory'] = 'theme';

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith(
            'working-directory must resolve within GITHUB_WORKSPACE',
        );
        expect(mocks.exec).not.toHaveBeenCalled();
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it('rejects a prebuilt file outside the working directory', async () => {
        const externalDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-theme-external-'));
        externalPaths.push(externalDirectory);
        const externalZip = path.join(externalDirectory, 'theme.zip');
        fs.writeFileSync(externalZip, 'zip');
        inputs.file = path.relative(workspace, externalZip);

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith('file must resolve within GITHUB_WORKSPACE');
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it('rejects a prebuilt-file symlink that escapes the working directory', async () => {
        const externalDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-theme-external-'));
        externalPaths.push(externalDirectory);
        const externalZip = path.join(externalDirectory, 'theme.zip');
        fs.writeFileSync(externalZip, 'zip');
        fs.symlinkSync(externalZip, path.join(workspace, 'theme.zip'));
        inputs.file = 'theme.zip';

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith('file must resolve within GITHUB_WORKSPACE');
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it('allows a prebuilt file elsewhere inside the workspace', async () => {
        fs.mkdirSync(path.join(workspace, 'theme'));
        fs.writeFileSync(path.join(workspace, 'theme.zip'), 'zip');
        inputs['working-directory'] = 'theme';
        inputs.file = '../theme.zip';

        await run();

        expect(mocks.upload).toHaveBeenCalledWith({
            file: path.join(workspace, 'theme.zip'),
        });
        expect(mocks.setFailed).not.toHaveBeenCalled();
    });

    it('requires a prebuilt file to be a regular file', async () => {
        fs.mkdirSync(path.join(workspace, 'theme.zip'));
        inputs.file = 'theme.zip';

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith('file must be a regular file');
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it('rejects a theme name that writes outside the working directory', async () => {
        fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({ name: 'casper' }));
        inputs['theme-name'] = '../theme';

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith('theme-name must be a name, not a path');
        expect(mocks.exec).not.toHaveBeenCalled();
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it.each(['-theme', 'theme\\nested', 'theme\nnested', '.', '..'])(
        'rejects the unsafe theme name %j',
        async (themeName) => {
            fs.writeFileSync(
                path.join(workspace, 'package.json'),
                JSON.stringify({ name: 'casper' }),
            );
            inputs['theme-name'] = themeName;

            await run();

            expect(mocks.setFailed).toHaveBeenCalledWith('theme-name must be a name, not a path');
            expect(mocks.exec).not.toHaveBeenCalled();
            expect(mocks.upload).not.toHaveBeenCalled();
        },
    );

    it('rejects an archive output symlink', async () => {
        const externalDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-theme-external-'));
        externalPaths.push(externalDirectory);
        const externalZip = path.join(externalDirectory, 'casper.zip');
        fs.writeFileSync(externalZip, 'zip');
        fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({ name: 'casper' }));
        fs.symlinkSync(externalZip, path.join(workspace, 'casper.zip'));

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith(
            'Generated archive path must be a regular file',
        );
        expect(mocks.exec).not.toHaveBeenCalled();
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it('removes an existing generated archive before rebuilding it', async () => {
        fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({ name: 'casper' }));
        fs.writeFileSync(path.join(workspace, 'casper.zip'), 'stale');
        mocks.exec.mockImplementationOnce(
            async (_command: string, args: string[], options: { cwd: string }) => {
                const archivePath = path.join(options.cwd, args[2]);
                expect(fs.existsSync(archivePath)).toBe(false);
                fs.writeFileSync(archivePath, 'fresh');
                return 0;
            },
        );

        await run();

        expect(fs.readFileSync(path.join(workspace, 'casper.zip'), 'utf8')).toBe('fresh');
        expect(mocks.setFailed).not.toHaveBeenCalled();
    });

    it('rejects a symlink in the packaged theme source', async () => {
        const externalDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-theme-external-'));
        externalPaths.push(externalDirectory);
        const externalFile = path.join(externalDirectory, 'secret.txt');
        fs.writeFileSync(externalFile, 'secret');
        fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({ name: 'casper' }));
        fs.symlinkSync(externalFile, path.join(workspace, 'asset.txt'));

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith(
            'Theme source must not contain symlinks: asset.txt',
        );
        expect(mocks.exec).not.toHaveBeenCalled();
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it('rejects unsupported files in the packaged theme source', async () => {
        fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({ name: 'casper' }));
        execFileSync('mkfifo', [path.join(workspace, 'theme.pipe')]);

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith(
            'Theme source contains an unsupported file: theme.pipe',
        );
        expect(mocks.exec).not.toHaveBeenCalled();
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it('requires package.json to contain a non-empty string name', async () => {
        fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({ name: 42 }));

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith(
            'package.json must contain a non-empty string name',
        );
        expect(mocks.exec).not.toHaveBeenCalled();
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it('rejects a generated archive that is not a regular file', async () => {
        fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({ name: 'casper' }));
        mocks.exec.mockImplementationOnce(
            async (_command: string, args: string[], options: { cwd: string }) => {
                fs.mkdirSync(path.join(options.cwd, args[2]));
                return 0;
            },
        );

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith(
            'Generated archive path must be a regular file',
        );
        expect(mocks.upload).not.toHaveBeenCalled();
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
        fs.writeFileSync(path.join(workspace, 'theme.zip'), 'zip');
        mocks.upload.mockRejectedValue('upload unavailable');

        await run();

        expect(mocks.setFailed).toHaveBeenCalledWith('upload unavailable');
        expect(mocks.info).not.toHaveBeenCalled();
    });
});
