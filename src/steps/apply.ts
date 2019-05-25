import { NavState } from "../state";
import { MultiStep } from "../multi/multistep";

import { Step } from "./step";

import * as debug from "debug";
const debugSteps = debug("siren-nav:steps:apply");

/**
 * This function takes a promise to a NavState along with a set of steps and
 * reduces them down to a promise to a final NavState.  Because this is a
 * chaining API, the interactions with the API are described by these steps.
 * But at the end of the day, these steps need to be evaluated to get to the
 * final NavState needed to processed (*i.e.,* make an actual request and
 * process the resulting data).
 *
 * @param cur
 * @param steps
 */
export async function reduce(cur: Promise<NavState>, steps: Step[]): Promise<NavState> {
    if (steps.length == 0) return cur;
    const state = await cur;
    debugSteps("Reducing steps, initial state is %j", state);
    return reduce(applyStep(steps[0], state), steps.slice(1));
}

function applyStep(step: Step, state: NavState): Promise<NavState> {
    debugSteps("  Applying step, initial state is: %j", state);
    return step(state);
}

/**
 * This function parallels `reduce` except that it starts with a collection of
 * NavStates and instead of applying one step at a time, it applys steps in
 * "waves".  Every step in the first element of `steps` gets applied to every
 * NavState in `cur`.  This is the first "wave" of steps.  Then every step in
 * the second element (second "wave" of steps) gets applied to
 * **each** of the NavState instances that resulted from application of the
 * first "wave".
 *
 * @param cur The current set of NavStates
 * @param steps The steps to apply.  The first element in this array is the set
 * of steps to apply first.  The next element is the set of steps to apply
 * second. etc.
 */
export async function reduceEach(cur: Promise<NavState[]>, steps: MultiStep[]): Promise<NavState[]> {
    if (steps.length == 0) return cur;
    const states = await cur;
    debugSteps("Reducing multiple states, initial states: %j", states);
    return reduceEach(applySteps(steps[0], states), steps.slice(1));
}

async function applySteps(step: MultiStep, states: NavState[]): Promise<NavState[]> {
    let ret: NavState[] = [];
    debugSteps("  Apply a step to multiple states");
    for (let i = 0; i < states.length; i++) {
        const state = states[i];
        debugSteps("    Applying steps to state: %j", state);
        const results = await step(state);
        ret = [...ret, ...results];
    }
    return ret;
}
