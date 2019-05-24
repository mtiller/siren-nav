import { Siren, Action } from "siren-types";
import { NavState } from "./state";
import axios from "axios";

import * as debug from "debug";
const debugUtils = debug("siren-nav:utils");

import * as URIT from "urijs/src/URITemplate";

export function getSiren(state: NavState): Promise<Siren> {
    if (state.value) return Promise.resolve(state.value);
    else {
        debugUtils("  getSiren for URL '%s' with config: ", state.cur, state.config);
        return Promise.resolve(axios.get(state.cur, state.config)).then(resp => resp.data as Siren);
    }
}

export function normalizeUrl(href: string, base: string, parameters?: {}): string {
    let url = URI(href)
        .absoluteTo(base)
        .toString();
    if (parameters) {
        url = URIT(url)
            .expand(parameters)
            .toString();
        debugUtils("  After expansion with %j, URL became: ", parameters, url);
    }
    debugUtils("  Absolute URL: %s", url);
    return url;
}

export function formulateData(action: Action, body: {}): {} | string {
    const type = action.type;
    // Is there a type specified other than urlencoded?  If so, we just use body
    if (type && type !== "application/x-www-form-urlencoded") return body;

    // Ensure he body exists and it is an object
    if (!body || typeof body != "object") return body;

    // URL encode field of body.
    return new URI("").search(body).toString();
}
