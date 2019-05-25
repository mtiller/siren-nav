import { NavState } from "../state";

/**
 * There are, in practice, two types of steps.  The first type is referred to as
 * a build step is one that is preparing to make a request but doesn't actually
 * make one.  The important point is that the request configuration details are
 * generally modified, but not reset.  This is in contrast to a RequestStep.
 *
 * A request step actually makes a request.  As such, the current configuration
 * is used to formulate the request but then the configuration is reset to a
 * base configuration in preparation for the next step.
 *
 * Note that a navigator preserves what are called "omni" steps.  These are
 * steps that should be performed for every request.  Those are added as the
 * last steps before a request is made.  So even though the configuration is
 * reset with every request, omni steps will be applied after that so any impact
 * they have on the configuration **is effectively preserved** despite the reset
 * of the configuration.
 */
export type StateTransition = (cur: NavState) => Promise<NavState>;
export type Transition<T> = (cur: NavState) => Promise<T>;

export interface Step<T> {
    persistent: boolean;
    description: string;
    transition: Transition<T>;
}

export type SingleStep = Step<NavState>;
export type MultiStep = Step<NavState[]>;
