import { NavState } from "../state";

import { SingleStep, MultiStep } from "./step";

import debug from "debug";
const log = debug("siren-nav:steps:apply");

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
export async function reduce(
  cur: Promise<NavState>,
  steps: SingleStep[],
  pre: SingleStep[]
): Promise<NavState> {
  let state = await cur;
  for (let i = 0; i < pre.length; i++) {
    state = await applyTransition(pre[i], state);
  }
  if (steps.length == 0) {
    log("Final state: %j", state);
    return state;
  }
  log("Reduce => [%d:%d]: %j", steps.length, pre.length, state);
  const next = steps[0];
  if (next.persistent) {
    return reduce(applyTransition(steps[0], state), steps.slice(1), [
      ...pre,
      next
    ]);
  } else {
    return reduce(applyTransition(steps[0], state), steps.slice(1), pre);
  }
}

function applyTransition(step: SingleStep, state: NavState): Promise<NavState> {
  log("  Applying step '%s'", step.description);
  return step.transition(state);
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
export async function reduceEach(
  cur: Promise<NavState[]>,
  steps: MultiStep[],
  pre: MultiStep[]
): Promise<NavState[]> {
  if (steps.length == 0) return cur;
  let states = await cur;
  log(
    "Reducing multiple states, initial states: %j, %d steps remaining, %d persistent steps",
    states,
    steps.length,
    pre.length
  );
  for (let i = 0; i < pre.length; i++) {
    states = await applySteps(pre[i], states);
  }
  const next = steps[0];
  if (next.persistent) {
    return reduceEach(applySteps(steps[0], states), steps.slice(1), [
      ...pre,
      next
    ]);
  } else {
    return reduceEach(applySteps(steps[0], states), steps.slice(1), pre);
  }
}

async function applySteps(
  step: MultiStep,
  states: NavState[]
): Promise<NavState[]> {
  let ret: NavState[] = [];
  log("  Apply a step to multiple states");
  for (let i = 0; i < states.length; i++) {
    const state = states[i];
    log("    Applying step '%s' to state: %j", step.description, state);
    const results = await step.transition(state);
    ret = [...ret, ...results];
  }
  return ret;
}
