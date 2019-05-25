import { NavState } from "../state";
import { getSiren } from "../utils";
import { findPossible, Transition, MultiStep, SingleStep } from "../steps";
import { Config } from "../config";

export type MultiStateTransition = Transition<NavState[]>;

export function followEach(rel: string, baseConfig: Config, parameters: {} | undefined): MultiStateTransition {
    return (state: NavState): Promise<NavState[]> => {
        return getSiren(state).then(siren => {
            const possible = findPossible(rel, siren, state, baseConfig, parameters);
            return possible;
        });
    };
}

export function toMulti(step: SingleStep): MultiStep {
    return {
        persistent: step.persistent,
        description: step.description,
        transition: async (cur: NavState) => {
            const ns: NavState = await step.transition(cur);
            return [ns];
        },
    };
}
