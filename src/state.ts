import { Config } from "./config";

import * as URI from "urijs";
import * as URIT from "urijs/src/URITemplate";

export class NavState {
    public readonly cur: string;
    constructor(href: string, parameters: {} | undefined, public config: Config) {
        const uri = URI(href);
        if (uri.is("relative")) {
            throw new Error("Navigation state specify an absolute URL");
        }
        if (!parameters) this.cur = href;
        else
            this.cur = URIT(href)
                .expand(parameters)
                .toString();
    }
    /**
     * Given a URL, return an absolute URL (using the previous cur value to
     * establish authority, if needed).
     * @param url
     */
    rebase(url: string): string {
        const uri = URI(url);
        if (uri.is("absolute")) return url;
        return uri.absoluteTo(this.cur).toString();
    }
}
