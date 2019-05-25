import { NavState } from "../state";
import { getSiren } from "../utils";
import { findPossible, Step } from "../steps";
import { Config } from "../config";

export type MultiStep = (cur: NavState) => Promise<NavState[]>;

export function followEach(rel: string, baseConfig: Config, parameters: {} | undefined): MultiStep {
    return (state: NavState): Promise<NavState[]> => {
        return getSiren(state).then(siren => {
            const possible = findPossible(rel, siren, state, baseConfig, parameters);
            return possible;
        });
    };
}

export function toMulti(step: Step): MultiStep {
    return async (cur: NavState) => {
        const ns: NavState = await step(cur);
        return [ns];
    };
}
