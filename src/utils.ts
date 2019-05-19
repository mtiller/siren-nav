import { Siren } from "siren-types";
import { NavState } from "./state";
import axios from "axios";

import * as debug from "debug";
const debugUtils = debug("siren-nav:utils");

export function getSiren(state: NavState): Promise<Siren> {
    if (state.value) return Promise.resolve(state.value);
    else {
        debugUtils("  getSiren for URL '%s' with config: ", state.cur, state.config);
        return Promise.resolve(axios.get(state.cur, state.config)).then(resp => resp.data as Siren);
    }
}
