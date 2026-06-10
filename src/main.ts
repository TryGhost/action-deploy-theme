import fs from 'node:fs';
import path from 'node:path';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import slug from 'slug';
import GhostAdminApi from '@tryghost/admin-api';

export async function run(): Promise<void> {
    try {
        const url = core.getInput('api-url');
        const api = new GhostAdminApi({
            url,
            key: core.getInput('api-key'),
            version: core.getInput('version') || 'v6.0'
        });
        const workingDir = core.getInput('working-directory');
        const basePath = path.join(process.env.GITHUB_WORKSPACE ?? '', workingDir);
        const pkgPath = path.join(basePath, 'package.json');

        let zipPath = core.getInput('file');

        // Zip file was not provided - zip everything up!
        if (!zipPath) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {name: string};
            const themeName = core.getInput('theme-name') || slug(pkg.name);
            const themeZip = `${themeName}.zip`;
            const exclude = core.getInput('exclude') || '';
            zipPath = themeZip;

            // Create a zip
            await exec.exec(`zip -r ${themeZip} . -x *.git* *.zip yarn* npm* pnpm* node_modules* *routes.yaml *redirects.yaml *redirects.json ${exclude}`, [], {cwd: basePath});
        }

        zipPath = path.join(basePath, zipPath);

        // Deploy it to the configured site
        await api.themes.upload({file: zipPath});
        core.info(`${zipPath} successfully uploaded.`);
    } catch (err) {
        core.setFailed(err instanceof Error ? err.message : String(err));
    }
}
