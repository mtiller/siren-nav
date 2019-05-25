import { Config } from "./config";

import { normalizeUrl } from "./utils";

export class NavState {
    public readonly cur: string;
    constructor(href: string, parameters: {} | undefined, public currentConfig: Config) {
        this.cur = normalizeUrl(href, null, parameters);
    }
    /**
     * Given a URL, return an absolute URL (using the previous cur value to
     * establish authority, if needed).
     * @param url
     */
    rebase(url: string): string {
        return normalizeUrl(url, this.cur, undefined);
    }
}
