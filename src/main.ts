import fs from 'node:fs';
import path from 'node:path';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import slug from 'slug';
import GhostAdminApi from '@tryghost/admin-api';

function isWithin(directory: string, candidate: string): boolean {
    const relativePath = path.relative(directory, candidate);
    return (
        relativePath === '' ||
        (relativePath !== '..' &&
            !relativePath.startsWith(`..${path.sep}`) &&
            !path.isAbsolute(relativePath))
    );
}

function resolveExistingPathWithin(
    resolutionDirectory: string,
    boundaryDirectory: string,
    inputPath: string,
    inputName: string,
    boundaryName: string,
    expectedType: 'directory' | 'file',
): string {
    const candidate = path.resolve(resolutionDirectory, inputPath || '.');
    if (path.isAbsolute(inputPath) || !isWithin(boundaryDirectory, candidate)) {
        throw new Error(`${inputName} must resolve within ${boundaryName}`);
    }

    const realDirectory = fs.realpathSync(boundaryDirectory);
    const realCandidate = fs.realpathSync(candidate);
    if (!isWithin(realDirectory, realCandidate)) {
        throw new Error(`${inputName} must resolve within ${boundaryName}`);
    }

    const candidateStats = fs.statSync(realCandidate);
    if (expectedType === 'directory' && !candidateStats.isDirectory()) {
        throw new Error(`${inputName} must be a directory`);
    }
    if (expectedType === 'file' && !candidateStats.isFile()) {
        throw new Error(`${inputName} must be a regular file`);
    }

    return candidate;
}

function assertSafeThemeName(themeName: string): void {
    const containsControlCharacter = [...themeName].some((character) => {
        const codePoint = character.charCodeAt(0);
        return codePoint <= 0x1f || codePoint === 0x7f;
    });
    if (
        !themeName ||
        themeName === '.' ||
        themeName === '..' ||
        themeName.startsWith('-') ||
        /[/\\]/.test(themeName) ||
        containsControlCharacter
    ) {
        throw new Error('theme-name must be a name, not a path');
    }
}

function prepareArchivePath(directory: string, themeName: string): string {
    const archivePath = path.resolve(directory, `${themeName}.zip`);
    if (fs.existsSync(archivePath)) {
        const archiveStats = fs.lstatSync(archivePath);
        if (!archiveStats.isFile() || archiveStats.isSymbolicLink()) {
            throw new Error('Generated archive path must be a regular file');
        }
        fs.unlinkSync(archivePath);
    }

    return archivePath;
}

function isBuiltInExcluded(relativePath: string): boolean {
    const archivePath = relativePath.split(path.sep).join('/');
    return (
        archivePath.includes('.git') ||
        archivePath.endsWith('.zip') ||
        /^(?:yarn|npm|pnpm|node_modules)/.test(archivePath) ||
        archivePath === 'AGENTS.md' ||
        archivePath === 'CLAUDE.md' ||
        archivePath === 'pnpm-workspace.yaml' ||
        archivePath.endsWith('routes.yaml') ||
        archivePath.endsWith('redirects.yaml') ||
        archivePath.endsWith('redirects.json')
    );
}

function assertSafeThemeSource(directory: string, currentDirectory = directory): void {
    for (const entry of fs.readdirSync(currentDirectory, { withFileTypes: true })) {
        const entryPath = path.join(currentDirectory, entry.name);
        const relativePath = path.relative(directory, entryPath);
        if (isBuiltInExcluded(relativePath)) {
            continue;
        }
        if (entry.isSymbolicLink()) {
            throw new Error(`Theme source must not contain symlinks: ${relativePath}`);
        }
        if (entry.isDirectory()) {
            assertSafeThemeSource(directory, entryPath);
        } else if (!entry.isFile()) {
            throw new Error(`Theme source contains an unsupported file: ${relativePath}`);
        }
    }
}

export async function run(): Promise<void> {
    try {
        const url = core.getInput('api-url');
        const api = new GhostAdminApi({
            url,
            key: core.getInput('api-key'),
            version: core.getInput('version') || 'v6.0',
        });
        const workspace = process.env.GITHUB_WORKSPACE;
        if (!workspace) {
            throw new Error('GITHUB_WORKSPACE is not set');
        }

        const workspacePath = path.resolve(workspace);
        fs.realpathSync(workspacePath);
        const basePath = resolveExistingPathWithin(
            workspacePath,
            workspacePath,
            core.getInput('working-directory'),
            'working-directory',
            'GITHUB_WORKSPACE',
            'directory',
        );

        let zipPath = core.getInput('file');

        // Zip file was not provided - zip everything up!
        if (!zipPath) {
            const pkgPath = resolveExistingPathWithin(
                basePath,
                workspacePath,
                'package.json',
                'package.json',
                'GITHUB_WORKSPACE',
                'file',
            );
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { name?: unknown };
            if (typeof pkg.name !== 'string' || !pkg.name.trim()) {
                throw new Error('package.json must contain a non-empty string name');
            }
            const themeName = core.getInput('theme-name') || slug(pkg.name);
            assertSafeThemeName(themeName);
            const themeZip = `${themeName}.zip`;
            const excludeRaw = core.getInput('exclude').trim();
            const excludeArgs = excludeRaw ? excludeRaw.split(/\s+/) : [];
            if (excludeArgs.some((pattern) => pattern.startsWith('-'))) {
                throw new Error('Invalid exclude pattern: option-like values are not allowed');
            }
            assertSafeThemeSource(basePath);
            zipPath = prepareArchivePath(basePath, themeName);
            // Create a zip
            await exec.exec(
                'zip',
                [
                    '-r',
                    '-y',
                    themeZip,
                    '.',
                    '-x',
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
                    ...excludeArgs,
                ],
                { cwd: basePath },
            );
            if (!fs.lstatSync(zipPath).isFile()) {
                throw new Error('Generated archive path must be a regular file');
            }
        } else {
            zipPath = resolveExistingPathWithin(
                basePath,
                workspacePath,
                zipPath,
                'file',
                'GITHUB_WORKSPACE',
                'file',
            );
        }

        // Deploy it to the configured site
        await api.themes.upload({ file: zipPath });
        core.info(`${zipPath} successfully uploaded.`);
    } catch (err) {
        core.setFailed(err instanceof Error ? err.message : String(err));
    }
}
