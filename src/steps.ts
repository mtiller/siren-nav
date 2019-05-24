import { NavState } from "./state";
import { getSiren } from "./utils";
import { getRequest } from "./requests";
import { MultiStep } from "./multi/multistep";
import { Link, isEmbeddedLink, Siren, collectSelves } from "siren-types";

import * as debug from "debug";
import { headerConfig } from "./config";
const debugSteps = debug("siren-nav:steps");

export type Step = (cur: NavState) => Promise<NavState>;

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
    return reduce(applyStep(steps[0], state), steps.slice(1));
}

function applyStep(step: Step, state: NavState): Promise<NavState> {
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
    return reduceEach(applySteps(steps[0], states), steps.slice(1));
}

async function applySteps(step: MultiStep, states: NavState[]): Promise<NavState[]> {
    let ret: NavState[] = [];
    for (let i = 0; i < states.length; i++) {
        const results = await step(states[i]);
        ret = [...ret, ...results];
    }
    return ret;
}

export function accept(ctype: string): Step {
    return async (state: NavState): Promise<NavState> => {
        debugSteps("Fetching data accepting only '%s' as content type", ctype);
        debugSteps("  Resource: %s", state.cur);
        let newconfig = { ...state.config };
        if (!newconfig.headers) newconfig.headers = {};

        if (newconfig.headers.hasOwnProperty("Accept")) {
            let cur = newconfig.headers["Accept"];
            debugSteps("  Current value of Accept: %s", cur);
            // NB - We must create a new header object!
            newconfig.headers = { ...state.config.headers, Accept: ctype + ", " + cur };
        } else {
            // NB - We must create a new header object!
            newconfig.headers = { ...state.config.headers, Accept: ctype };
        }
        debugSteps("  Updated value of Accept: %s", newconfig.headers["Accept"]);
        return new NavState(state.cur, undefined, newconfig);
    };
}

export function header(key: string, value: string): Step {
    return async (state: NavState): Promise<NavState> => {
        return new NavState(state.cur, undefined, headerConfig(key, value)(state.config));
    };
}

export function contentType(ctype: string): Step {
    return header("Content-Type", ctype);
}

export function auth(scheme: string, token: string): Step {
    return header("Authorization", `${scheme} ${token}`);
}

export function findPossible(rel: string, siren: Siren, state: NavState, parameters: {} | undefined): NavState[] {
    debugSteps("Follow '%s':", rel);
    let possible: NavState[] = [];
    (siren.entities || []).forEach(entity => {
        if (entity.rel.indexOf(rel) == -1) return;
        if (entity.hasOwnProperty("href")) {
            let href = entity["href"];
            debugSteps("  Found possible match in subentity link, href = %s", href);
            const hrefAbs = state.rebase(href);
            possible.push(new NavState(hrefAbs, parameters, state.config));
        } else {
            if (!isEmbeddedLink(entity)) {
                const selves = collectSelves(entity);
                if (selves.length == 1) {
                    debugSteps("  Found possible match in subentity resource, self = %s", self);
                    const selfAbs = state.rebase(selves[0]);
                    possible.push(new NavState(selfAbs, parameters, state.config));
                } else {
                    console.warn("Multiple values found for 'self': " + JSON.stringify(selves) + ", ignoring");
                }
            }
        }
    });
    let links = siren.links || [];
    links.forEach((link: Link) => {
        if (link.rel.indexOf(rel) == -1) return;
        debugSteps("  Found possible match among links: %j", link);
        const hrefAbs = state.rebase(link.href);
        possible.push(new NavState(hrefAbs, parameters, state.config));
    });
    return possible;
}

export const followLocation: Step = async (state: NavState) => {
    debugSteps("Following Location header");
    const resp = await getRequest(state);
    debugSteps("Response for %s was: %j", state.cur, resp);
    debugSteps("  Headers: %j", resp.headers);
    let location = resp.headers["Location"] || resp.headers["location"];
    if (!location) {
        debugSteps("  ERROR: No 'Location' header found, payload for %s was %j", state.cur, resp.data);
        throw new Error("No 'Location' header found in '" + Object.keys(resp.headers).join(", ") + "'");
    } else {
        debugSteps("  Location header: %s", location);
    }
    const locurl = state.rebase(location);
    return new NavState(locurl, undefined, state.config);
};

export function follow(rel: string, parameters: {} | undefined, which?: (states: NavState[]) => NavState): Step {
    return (state: NavState): Promise<NavState> => {
        return getSiren(state).then(siren => {
            const possible = findPossible(rel, siren, state, parameters);
            if (possible.length == 0) {
                console.error("Cannot follow relation '" + rel + "', no links with that relation");
                throw new Error("Cannot follow relation '" + rel + "', no links with that relation");
            }
            if (possible.length > 1) {
                if (!which) {
                    console.error(
                        "Multiple links with relation '" + rel + "' found when only one was expected in ",
                        possible,
                    );
                    throw new Error(
                        "Multiple links with relation '" +
                            rel +
                            "' found when only one was expected in " +
                            JSON.stringify(possible, null, 4),
                    );
                } else {
                    return which(possible);
                }
            }
            debugSteps("  Found match, resulting state: %j", possible[0]);
            return possible[0];
        });
    };
}
