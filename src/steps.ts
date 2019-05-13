import { NavState } from "./state";
import { getSelf } from "./utils";
import { getSiren } from "./utils";
import { Cache } from "./cache";
import { Link } from "siren-types";

import * as debug from "debug";
const debugSteps = debug("siren-nav:steps");

export type Step = (cur: NavState, cache: Cache) => Promise<NavState>;

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
 * @param cache
 */
export async function reduce(cur: Promise<NavState>, steps: Step[], cache: Cache): Promise<NavState> {
    if (steps.length == 0) return cur;
    let state = await cur;
    return reduce(steps[0](state, cache), steps.slice(1), cache);
}

export function accept(ctype: string): Step {
    return async (state: NavState, cache: Cache): Promise<NavState> => {
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
        return new NavState(state.cur, undefined, newconfig, cache.getOr(state.cur));
    };
}

export function auth(scheme: string, token: string): Step {
    return async (state: NavState, cache: Cache): Promise<NavState> => {
        debugSteps("Fetching data under scheme %s using token %s", scheme, token);
        debugSteps("  Resource: %s", state.cur);
        let newconfig = { ...state.config };
        if (!newconfig.headers) newconfig.headers = {};

        // NB - We must create a new header object!
        newconfig.headers = { ...state.config.headers, Authorization: scheme + " " + token };
        debugSteps("  Updated value of Authorization: %s", newconfig.headers["Authorization"]);
        return new NavState(state.cur, undefined, newconfig, cache.getOr(state.cur));
    };
}

export function follow(rel: string, parameters: {} | undefined, which?: (states: NavState[]) => NavState): Step {
    return (state: NavState, cache: Cache): Promise<NavState> => {
        return getSiren(state).then(siren => {
            debugSteps("Follow '%s':", rel);
            let possible: NavState[] = [];
            (siren.entities || []).forEach(entity => {
                if (entity.rel.indexOf(rel) == -1) return;
                if (entity.hasOwnProperty("href")) {
                    let href = entity["href"];
                    debugSteps("  Found possible match in subentity link, href = %s", href);
                    const hrefAbs = state.rebase(href);
                    possible.push(new NavState(hrefAbs, parameters, state.config, cache.getOr(hrefAbs)));
                } else {
                    let self = getSelf(entity);
                    if (self) {
                        debugSteps("  Found possible match in subentity resource, self = %s", self);
                        const selfAbs = state.rebase(self);
                        possible.push(new NavState(selfAbs, parameters, state.config, cache.getOr(selfAbs)));
                    }
                }
            });
            let links = siren.links || [];
            links.forEach((link: Link) => {
                if (link.rel.indexOf(rel) == -1) return;
                debugSteps("  Found possible match among links: %j", link);
                const hrefAbs = state.rebase(link.href);
                possible.push(new NavState(hrefAbs, parameters, state.config, cache.getOr(hrefAbs)));
            });
            if (possible.length == 0) {
                console.error("Cannot follow relation '" + rel + "', no links with that relation");
                throw new Error("Cannot follow relation '" + rel + "', no links with that relation");
            }
            if (possible.length > 1) {
                if (!which) {
                    console.error(
                        "Multiple links with relation '" + rel + "' found when only one was expected in ",
                        links,
                    );
                    throw new Error(
                        "Multiple links with relation '" +
                            rel +
                            "' found when only one was expected in " +
                            JSON.stringify(links, null, 4),
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
