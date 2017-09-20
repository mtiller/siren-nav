import { NavState } from './state';
import { getSelf } from './utils';
import { getSiren } from './utils';
import { Cache } from './cache';
import { Link } from 'siren-types';

export type Step = (cur: NavState, cache: Cache, debug: boolean) => Promise<NavState>;

export async function reduce(cur: Promise<NavState>, steps: Step[], cache: Cache, debug: boolean): Promise<NavState> {
    if (steps.length == 0) return cur;
    let state = await cur;
    return reduce(steps[0](state, cache, debug), steps.slice(1), cache, debug);
}

export function accept(ctype: string, debug?: boolean): Step {
    return async (state: NavState, cache: Cache): Promise<NavState> => {
        if (debug) console.log("Fetching data accepting only '" + ctype + "' as content type");
        if (debug) console.log("  Resource: " + state.cur);
        let newconfig = { ...state.config };
        if (!newconfig.headers) newconfig.headers = {};

        if (newconfig.headers.hasOwnProperty("Accept")) {
            let cur = newconfig.headers["Accept"];
            if (debug) console.log("  Current value of Accept: ", cur);
            newconfig.headers["Accept"] = ctype + ", " + cur;
        } else {
            newconfig.headers["Accept"] = ctype;
        }
        if (debug) console.log("  Updated value of Accept: ", newconfig.headers["Accept"]);
        return new NavState(state.cur, state.root, newconfig, cache.getOr(state.cur));
    }
}

export function auth(scheme: string, token: string, debug?: boolean): Step {
    return async (state: NavState, cache: Cache): Promise<NavState> => {
        if (debug) console.log("Fetching data under scheme " + scheme + " using token " + token);
        if (debug) console.log("  Resource: " + state.cur);
        let newconfig = { ...state.config };
        if (!newconfig.headers) newconfig.headers = {};

        newconfig.headers["Authorization"] = scheme + " " + token;
        if (debug) console.log("  Updated value of Authorization: ", newconfig.headers["Authorization"]);
        return new NavState(state.cur, state.root, newconfig, cache.getOr(state.cur));
    }
}

export function follow(rel: string, first?: boolean): Step {
    return (state: NavState, cache: Cache, debug: boolean): Promise<NavState> => {
        return getSiren(state).then((siren) => {
            if (debug) console.log("Follow '" + rel + "':");
            let possible: NavState[] = [];
            (siren.entities || []).forEach((entity) => {
                if (entity.rel.indexOf(rel) == -1) return;
                if (entity.hasOwnProperty("href")) {
                    if (debug) console.log("  Found possible match in subentity link");
                    let href = entity["href"];
                    possible.push(new NavState(href, state.root, state.config, cache.getOr(href)));
                } else {
                    let self = getSelf(entity);
                    if (self) {
                        if (debug) console.log("  Found possible match in subentity resource");
                        possible.push(new NavState(self, state.root, state.config, cache.getOr(self)));
                    }
                }
            });
            let links = siren.links || [];
            links.forEach((link: Link) => {
                if (link.rel.indexOf(rel) == -1) return;
                if (debug) console.log("  Found possible match among links");
                possible.push(new NavState(link.href, state.root, state.config, cache.getOr(link.href)));
            });
            if (possible.length == 0) {
                if (links.length < 20) {
                    console.error("Cannot follow relation '" + rel + "', no links with that relation in ", links);
                    throw new Error("Cannot follow relation '" + rel + "', no links with that relation in " + JSON.stringify(links, null, 4));
                } else {
                    console.error("Cannot follow relation '" + rel + "', no links with that relation");
                    throw new Error("Cannot follow relation '" + rel + "', no links with that relation");
                }
            }
            if (possible.length > 1 && !first) {
                if (links.length < 20) {
                    console.error("Multiple links with relation '" + rel + "' found when only one was expected in ", links);
                    throw new Error("Multiple links with relation '" + rel + "' found when only one was expected in " + JSON.stringify(links, null, 4));
                } else {
                    console.error("Multiple links with relation '" + rel + "' found when only one was expected");
                    throw new Error("Multiple links with relation '" + rel + "' found when only one was expected");
                }
            }
            if (debug) console.log("  Found match, resulting state: " + JSON.stringify(possible[0]));
            return possible[0];
        })
    }
}
