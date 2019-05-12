import { Siren } from "siren-types";
import { NavState } from "./state";
import axios from "axios";

import * as debug from "debug";
const debugUtils = debug("siren-nav:utils");

export function getSelf(v: Siren): string | null {
    if (!v.links) return null;
    if (!Array.isArray(v.links)) return null;
    for (let i = 0; i < v.links.length; i++) {
        let link = v.links[i];
        if (link.rel.indexOf("self") >= 0) return link.href;
    }
    return null;
}

export function getSiren(state: NavState): Promise<Siren> {
    if (state.value) return Promise.resolve(state.value);
    debugUtils("  getSiren for URL '%s' with config: ", state.cur, state.config);
    return Promise.resolve(axios.get(state.cur, state.config)).then(resp => resp.data as Siren);
}
