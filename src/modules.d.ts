declare module '@tryghost/admin-api' {
    interface GhostAdminApiOptions {
        url: string;
        key: string;
        version: string;
    }

    class GhostAdminApi {
        constructor(options: GhostAdminApiOptions);
        themes: {
            upload(options: {file: string}): Promise<unknown>;
        };
    }

    export = GhostAdminApi;
}
