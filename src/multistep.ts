import { NavState } from "./state";
import { getSiren } from "./utils";
import { findPossible, Step } from "./steps";
import { Cache } from "./cache";

export type MultiStep = (cur: NavState, cache: Cache) => Promise<NavState[]>;

export function followEach(rel: string, parameters: {} | undefined): MultiStep {
    return (state: NavState, cache: Cache): Promise<NavState[]> => {
        return getSiren(state).then(siren => {
            const possible = findPossible(rel, siren, state, cache, parameters);
            return possible;
        });
    };
}

export function toMulti(step: Step): MultiStep {
    return async (cur: NavState, cache: Cache) => {
        const ns: NavState = await step(cur, cache);
        return [ns];
    };
}
