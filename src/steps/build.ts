import { NavState } from "../state";
import { headerConfig } from "../config";
import { StateTransition } from "./step";

export function header(key: string, value: string): StateTransition {
    return async (state: NavState): Promise<NavState> => {
        return new NavState(state.cur, undefined, headerConfig(key, value)(state.currentConfig));
    };
}

export function accept(ctype: string): StateTransition {
    return header("Accept", ctype);
}

export function contentType(ctype: string): StateTransition {
    return header("Content-Type", ctype);
}

export function auth(scheme: string, token: string): StateTransition {
    return header("Authorization", `${scheme} ${token}`);
}
