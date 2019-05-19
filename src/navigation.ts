import { NavState, Config } from "./state";
import { Cache } from "./cache";
import { follow, Step, reduce, accept, auth, followLocation, header } from "./steps";
import { Entity } from "siren-types";
import { NavResponse } from "./response";
import { performAction, getRequest } from "./requests";
import { sirenContentType } from "siren-types";
import { Observable } from "rxjs";
import { MultiNav } from "./multi/multinav";

import * as URI from "urijs";
import { followEach, toMulti } from "./multi/multistep";

/**
 * The SirenNav class provides a collection of methods that allow for
 * a high-level declarative based approach to API navigation.
 *
 * @export
 * @class SirenNav
 */
export class SirenNav {
    /**
     * Create a new SirenNav instance for an API with an entry point
     * specified by the argument.
     *
     * @static
     * @param {string} url Initial URL
     * @param {string} base Base URL for API (all URIs will be anchored to this)
     * @returns
     *
     * @memberOf SirenNav
     */
    static create(url: string, cache?: Cache, config?: Config) {
        if (!cache) cache = new Cache();
        config = config || {};
        const uri = URI(url);
        if (uri.is("relative")) {
            throw new Error("SirenNav must be created with an absolute URL");
        }
        return new SirenNav(
            Promise.resolve(
                new NavState(
                    url,
                    undefined,
                    {
                        headers: {
                            Accept: sirenContentType, // Assume siren unless the user overrides it
                        },
                        // Commented out because it causes problems with HTTPS
                        // APIs that don't require authentication (for reasons
                        // I'm not 100% sure about).
                        // withCredentials: true,
                        ...config,
                    },
                    cache.getOr(url),
                ),
            ),
            [],
            [],
            cache,
        );
    }

    /**
     * Creates an instance of SirenNav.  This constructor is private because
     * it initializes lots of state that should be encapsulated (i.e., we
     * don't generally want people mucking about with this stuff).  Instead,
     * we use static functions to create instances.
     *
     * @param {Promise<NavState>} start
     * @param {Step[]} steps
     *
     * @memberOf SirenNav
     */
    private constructor(
        private start: Promise<NavState>,
        private steps: Step[],
        private omni: Step[],
        private cache: Cache,
    ) {}

    /**
     * Follow **one** instance of a given relation.  The optional second
     * argument is used to indicate that the first match should be used in cases
     * where multiple matches are available.  If the second argument is
     * undefined or false, then anything but a single (exact) match will result
     * in an error.
     *
     * If you wish to follow all links of a given relation, use followEach.
     *
     * @param {string} rel
     * @param {boolean} [first]
     * @returns {SirenNav}
     *
     * @memberOf SirenNav
     */
    follow(rel: string, parameters?: {}, which?: (states: NavState[]) => NavState): SirenNav {
        return this.do(follow(rel, parameters, which));
    }

    /**
     * Follow the location header in the response when fetching the current resource.
     *
     * @returns {SirenNav}
     * @memberof SirenNav
     */
    followLocation(): SirenNav {
        return this.do(followLocation);
    }

    followEach(rel: string, parameters?: {}): MultiNav {
        const multi = this.asMultiNav();
        return multi.doMulti(followEach(rel, parameters));
    }

    /**
     * Perform an action that expects a "hypermedia" payload as the input
     * to the function.
     *
     * @template P
     * @param {string} name
     * @param {Entity<P>} body
     * @returns {NavResponse}
     *
     * @memberOf SirenNav
     */
    performHyperAction<P extends {}>(name: string, body: Entity<P>): NavResponse {
        return this.performAction(name, body);
    }

    /**
     * Perform an action using an arbitrary type of input data.
     *
     * @template P
     * @param {string} name
     * @param {P} body
     * @returns {NavResponse}
     *
     * @memberOf SirenNav
     */
    performAction<P>(name: string, body: P): NavResponse {
        let state = reduce(this.start, [...this.steps, ...this.omni], this.cache);
        let resp = state.then(s => performAction(name, body)(s));
        return NavResponse.create(resp);
    }

    /**
     * Perform a navigation step.  This is mainly an internal method, but it
     * is exposed as a public method as to allow the set of possible
     * navigation steps to be extensible.  Any transformation satisfying
     * the Step type can be incorporated into the navigation process.
     *
     * @param {Step} step
     * @returns {SirenNav}
     *
     * @memberOf SirenNav
     */
    do(step: Step): SirenNav {
        return new SirenNav(this.start, [...this.steps, step], [...this.omni], this.cache);
    }

    /**
     * Perform a step that should *always* be performed.  These omni steps are done
     * after the navigation steps.  This is also an internal method, but it is made
     * public to allow extensions.
     */
    doOmni(step: Step): SirenNav {
        return new SirenNav(this.start, [...this.steps], [...this.omni, step], this.cache);
    }

    /**
     * This method can be used to generate a new SirenNav instance that
     * has already prenavigated a particular set of steps.  When a
     * "normal" SirenNav instance is evaluated, all the steps in the
     * navigation are repeated.  If the same navigation is repeated
     * over and over, many HTTP requests can potentially be made.
     * If those requests are sure to always return the same result,
     * then these requests will cause delays and unnecessarily
     * network requests.  The squash method performs all the
     * specified steps of the navigation BUT uses the resulting
     * state to create a new SirenNav instance that always starts
     * at the resulting state.  It therefore avoids repeating
     * steps on each execution.  However, squashing a SirenNav
     * is only appropriate if the preceding steps are sure to
     * always return the same results.
     *
     * @returns {SirenNav}
     *
     * @memberOf SirenNav
     */
    squash(): SirenNav {
        // NB - Note that we do NOT squash the omni steps.  Those remain.
        return new SirenNav(reduce(this.start, this.steps, this.cache), [], [...this.omni], this.cache);
    }

    /**
     * This tells the navigator to jump to a given URL.  This is
     * different from creating a new navigator because it
     * retains any information about the root URI of the API
     * and any configuration changes that have accumulated.
     *
     * @param {string} url
     * @returns {SirenNav}
     *
     * @memberOf SirenNav
     */
    goto(url: string, parameters?: {}): SirenNav {
        let newstate = new Promise<NavState>(async (resolve, reject) => {
            let state = await this.start;
            resolve(new NavState(state.rebase(url), parameters, state.config, this.cache.getOr(url)));
        });
        return new SirenNav(newstate, [], [...this.omni], this.cache);
    }

    /**
     * Add an entry to the Accept header.  This can be called multiple times and each
     * call will add an additional option.  As with the Accept header itself, order
     * matters.
     */
    accept(ctype: string): SirenNav {
        return this.do(accept(ctype));
    }

    /**
     * Authorize requests using the given scheme and token
     */
    auth(scheme: string, token: string): SirenNav {
        return this.do(auth(scheme, token));
    }

    /**
     * Add a given header
     *
     * @param {string} key The name of the header
     * @param {string} value The value to give to the header
     * @returns {SirenNav}
     * @memberof SirenNav
     */
    header(key: string, value: string): SirenNav {
        return this.do(header(key, value));
    }

    /**
     * This method returns the URL of the resource that is being pointed
     * to at the end of the chain of navigation steps.
     *
     * @returns
     *
     * @memberOf SirenNav
     */
    getURL(): Promise<string> {
        return reduce(this.start, [...this.steps, ...this.omni], this.cache).then(state => {
            if (state.config.baseURL) {
                return URI(state.cur)
                    .absoluteTo(state.config.baseURL)
                    .toString();
            }
            return state.cur;
        });
    }

    /**
     * The get method returns a NavResponse the represents the value of
     * the current resource.
     *
     * @returns {NavResponse}
     *
     * @memberOf SirenNav
     */
    get(): NavResponse {
        let state = reduce(this.start, [...this.steps, ...this.omni], this.cache);
        let resp = state.then(s => getRequest(s));
        return NavResponse.create(resp);
    }

    // TODO: Test this
    subscribe<T>(rel?: string, poll?: number): Observable<Entity<T>> {
        return new Observable(observer => {
            observer.complete();
            (async () => {
                // Follow rel
                // Get URL
                const url = await this.follow(rel || "events").getURL();
                if (url.startsWith("ws:" || url.startsWith("wss:"))) {
                    throw new Error("Unimplemented");
                    // Handle web socket case
                } else {
                    // Handle event source case
                    const source = new EventSource(url);
                    source.onmessage = msg => observer.next(msg as any);
                    // TODO: Distinguish between close and error
                    source.onerror = e => observer.error(e);
                }
            })();
        });
    }

    /**
     * Transforms the current SirenNav into a MultiNav (one capable of tracking
     * multiple concurrent resources)
     *
     * @protected
     * @returns {MultiNav}
     * @memberof SirenNav
     */
    protected asMultiNav(): MultiNav {
        const starts: Promise<NavState[]> = this.start.then(v => [v]);
        return new MultiNav(starts, this.steps.map(toMulti), this.omni, this.cache);
    }
}
