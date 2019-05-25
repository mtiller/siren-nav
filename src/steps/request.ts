import { Siren, isEmbeddedLink, collectSelves, Link } from "siren-types";
import { StateTransition } from "./step";

import * as debug from "debug";
import { NavState } from "../state";
import { getRequest } from "../requests";
import { getSiren } from "../utils";
import { Config } from "../config";
const debugSteps = debug("siren-nav:steps:follow");

////
// This file is for "request" steps.  Those are steps that conceptually perform
// requests and for which it is intuitive for the configuration to be reset
// following the step.  As a result, these steps generally require a base
// configuration to be passed in (the NavState is initialized with this base
// configuration).
////

export function findPossible(
    rel: string,
    siren: Siren,
    state: NavState,
    baseConfig: Config,
    parameters: {} | undefined,
): NavState[] {
    debugSteps("Follow '%s':", rel);
    let possible: NavState[] = [];
    (siren.entities || []).forEach(entity => {
        if (entity.rel.indexOf(rel) == -1) return;
        if (entity.hasOwnProperty("href")) {
            let href = entity["href"];
            debugSteps("  Found possible match in subentity link, href = %s", href);
            const hrefAbs = state.rebase(href);
            possible.push(new NavState(hrefAbs, parameters, baseConfig));
        } else {
            if (!isEmbeddedLink(entity)) {
                const selves = collectSelves(entity);
                if (selves.length == 1) {
                    debugSteps("  Found possible match in subentity resource, self = %s", self);
                    const selfAbs = state.rebase(selves[0]);
                    possible.push(new NavState(selfAbs, parameters, baseConfig));
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
        possible.push(new NavState(hrefAbs, parameters, baseConfig));
    });
    return possible;
}

export function followLocation(baseConfig: Config) {
    return async (state: NavState) => {
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
        return new NavState(locurl, undefined, baseConfig);
    };
}

export function follow(
    rel: string,
    baseConfig: Config,
    parameters: {} | undefined,
    which?: (states: NavState[]) => NavState,
): StateTransition {
    return (state: NavState): Promise<NavState> => {
        return getSiren(state).then(siren => {
            const possible = findPossible(rel, siren, state, baseConfig, parameters);
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

export function goto(url: string, baseConfig: Config, parameters?: {} | undefined): StateTransition {
    return async (state: NavState): Promise<NavState> => {
        return new NavState(state.rebase(url), parameters, baseConfig);
    };
}
