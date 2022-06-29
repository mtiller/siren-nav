import { NavState } from "./state";
import { Config } from "./config";
import {
  follow,
  StateTransition,
  reduce,
  accept,
  auth,
  followLocation,
  header,
  goto,
  SingleStep
} from "./steps";
import { Entity, Properties } from "siren-types";
import { NavResponse } from "./response";
import { performAction, getRequest } from "./requests";
import { sirenContentType } from "siren-types";
import { Observable, Subscriber } from "rxjs";
import { MultiNav } from "./multi/multinav";

import { followEach, toMulti } from "./multi/multistep";
import { normalizeUrl } from "./utils";
import WebSocket from "isomorphic-ws";

import debug from "debug";
const log = debug("siren:nav");

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
  static create(url: string, config?: Config) {
    config = config || { flatten: true };

    const uri = normalizeUrl(url, null);
    const baseConfig: Config = {
      headers: {
        Accept: sirenContentType // Assume siren unless the user overrides it
      },
      // By default, we assume that any nested object passed as data to an
      // action and serialized as a query string should be flattened.  If false,
      // then the normal axios process of encoding nested objects as strings
      // will be applied.
      flatten: true,
      // Commented out because it causes problems with HTTPS
      // APIs that don't require authentication (for reasons
      // I'm not 100% sure about).
      // withCredentials: true,
      ...config
    };

    log(
      "Creating SirenNav with initial URL of %s and base configuration of %j",
      uri,
      baseConfig
    );
    return new SirenNav(
      Promise.resolve(new NavState(uri, undefined, baseConfig)),
      [],
      baseConfig
    );
  }

  /**
   * Creates an instance of SirenNav.  This constructor is private because
   * it initializes lots of state that should be encapsulated (i.e., we
   * don't generally want people mucking about with this stuff).  Instead,
   * we use static functions to create instances.
   *
   * @param {Promise<NavState>} start
   * @param {StateTransition[]} steps
   *
   * @memberOf SirenNav
   */
  private constructor(
    private start: Promise<NavState>,
    private steps: SingleStep[],
    private baseConfig: Config
  ) {
    log("  New SirenNav with %d steps", steps.length);
  }

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
  follow(
    rel: string,
    parameters?: {},
    which?: (states: NavState[]) => NavState
  ): SirenNav {
    return this.add(
      `Follow relation '${rel}'`,
      follow(rel, this.baseConfig, parameters, which)
    );
  }

  /**
   * Follow the location header in the response when fetching the current resource.
   *
   * @returns {SirenNav}
   * @memberof SirenNav
   */
  followLocation(): SirenNav {
    return this.add(`Follow Location header`, followLocation(this.baseConfig));
  }

  followEach(rel: string, parameters?: {}): MultiNav {
    const multi = this.asMultiNav();
    return multi.doMulti(
      `Follow each relation of type ${rel}`,
      followEach(rel, this.baseConfig, parameters)
    );
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
  performHyperAction<P extends Properties | undefined>(
    name: string,
    body: Entity<P>,
    parameters?: {}
  ): NavResponse {
    return this.performAction(name, body, parameters);
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
  performAction<P>(name: string, body: P, parameters?: {}): NavResponse {
    let state = reduce(this.start, this.steps, []);
    let resp = state.then(s =>
      performAction(name, body, this.baseConfig, parameters)(s)
    );
    return NavResponse.create(resp);
  }

  /**
   * Perform a navigation step.  This is mainly an internal method, but it
   * is exposed as a public method as to allow the set of possible
   * navigation steps to be extensible.  Any transformation satisfying
   * the Step type can be incorporated into the navigation process.
   *
   * @param {StateTransition} step
   * @returns {SirenNav}
   *
   * @memberOf SirenNav
   */
  add(description: string, transition: StateTransition): SirenNav {
    const step: SingleStep = {
      persistent: false,
      description: description,
      transition: transition
    };
    return new SirenNav(this.start, [...this.steps, step], this.baseConfig);
  }

  /**
   * Perform a step that should *always* be performed.  These omni steps are done
   * after the navigation steps.  This is also an internal method, but it is made
   * public to allow extensions.
   */
  addPersistent(description: string, transition: StateTransition): SirenNav {
    const step: SingleStep = {
      persistent: true,
      description: description,
      transition: transition
    };
    return new SirenNav(this.start, [...this.steps, step], this.baseConfig);
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
    const persisted = this.steps.filter(s => s.persistent);
    const state = reduce(this.start, this.steps, []);
    // NB - We keep the persistent steps after we squash these.
    return new SirenNav(state, persisted, this.baseConfig);
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
    return this.add(
      `Goto URL '${url}'`,
      goto(url, this.baseConfig, parameters)
    );
  }

  /**
   * Add an entry to the Accept header.  This can be called multiple times and each
   * call will add an additional option.  As with the Accept header itself, order
   * matters.
   */
  accept(ctype: string): SirenNav {
    return this.add(`Set Accept header to '${ctype}'`, accept(ctype));
  }

  /**
   * This method injects an authorization header.  Note, that it does this for
   * all subsequent requests made by this SirenNav instance *unless* you
   * set the `oneRequest` argument to `true`.
   *
   * @param {string} scheme
   * @param {string} token
   * @param {boolean} [oneRequest] Use auth header only for one request.
   * @returns {SirenNav}
   * @memberof SirenNav
   */
  auth(scheme: string, token: string, oneRequest?: boolean): SirenNav {
    const description = `Set Authorization header to use scheme '${scheme}' and token '${token}'`;
    const transition = auth(scheme, token);
    if (oneRequest) {
      log("  Adding auth as a one time only step");
      return this.add(description, transition);
    } else {
      log("  Adding auth as an omni step");
      return this.addPersistent(description, transition);
    }
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
    return this.add(`Set header '${key}' to '${value}'`, header(key, value));
  }

  /**
   * This method returns the URL of the resource that is being pointed
   * to at the end of the chain of navigation steps.
   *
   * @returns
   *
   * @memberOf SirenNav
   */
  async getURL(parameters?: {}): Promise<string> {
    const state = await reduce(this.start, this.steps, []);
    return normalizeUrl(
      state.cur,
      state.currentConfig.baseURL || null,
      parameters
    );
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
    log("Processings get() request");
    let state = reduce(this.start, this.steps, []);
    let resp = state.then(s => {
      log("  State when getRequest was called: %j", s);
      return getRequest(s);
    });
    return NavResponse.create(resp);
  }

  private async connectObserver<T>(observer: Subscriber<Entity<T>>) {
    // Follow rel
    // Get URL
    const url = await this.getURL();
    log("Attempting to subscribe to %s", url);

    if (url.startsWith("ws:" || url.startsWith("wss:"))) {
      log("Opening web socket");
      const ws = new WebSocket(url);
      ws.onmessage = msg => {
        log("Websocket listening to %s got %j", url, Object.keys(msg));
        log("  Target: %j", msg.target);
        log("  Type: %j", msg.type);
        log("  Data: %j", msg.data);
        observer.next(JSON.parse(msg.data as any) as any);
      };
      ws.onclose = () => {
        log("Websocket listening to %s closed", url);
        observer.complete();
      };
      // istanbul ignore next (not sure how to force such an error)
      ws.onerror = e => {
        log("Websocket listening to %s got error %j", url, e);
        observer.error(e);
      };
    } else {
      // Handle event source case
      const source = new EventSource(url);
      source.onmessage = msg => {
        log("EventSource listening to %s got %j", url, msg);
        observer.next(msg as any);
      };
      // TODO: Distinguish between close and error
      source.onerror = e => {
        log("EventSource listening to %s got error %j", url, e);
        observer.error(e);
      };
    }
  }

  // TODO: Test this
  subscribe<T>(poll?: number): Observable<Entity<T>> {
    return new Observable(observer => {
      this.connectObserver(observer).catch(
        /* istanbul ignore next */ e => {
          console.error("An error occurred while subscribing:");
          console.error(e);
          observer.error(e);
        }
      );
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
    return new MultiNav(starts, this.steps.map(toMulti), this.baseConfig);
  }
}
