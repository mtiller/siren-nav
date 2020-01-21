import { NavState } from "./state";
import { Siren } from "siren-types";
import axios from "axios";
import { AxiosResponse } from "axios";

import debug from "debug";
import { normalizeUrl, urlEncoded, buildQueryString } from "./utils";
import { headerConfig } from "./config";
const log = debug("siren-nav:requests");

export interface ResponseData {
  data: any;
  headers: {};
  status: number;
}

export type Request = (cur: NavState) => Promise<ResponseData>;

export function performAction<T extends {}>(
  name: string,
  body: T,
  parameters?: {}
): Request {
  return async (state: NavState): Promise<AxiosResponse> => {
    log("Performing action %s on %s", name, state.cur);
    log("  Fetching with current state of: %j", state);
    const resp = await getRequest(state);
    let siren: Siren = resp.data as Siren;
    // We may need to tweak the config, so let's start with the config of
    // the NavState
    let request = state.currentConfig;

    log("  Latest value of %s: %j", siren, state.cur);

    if (!siren.actions) {
      log("  ERROR: no actions defined in %s", state.cur);
      throw new Error("No actions defined for " + state.cur);
    }

    const action = siren.actions.find(action => action.name == name);
    if (!action) {
      throw new Error(
        `No action named ${name} found among: ${JSON.stringify(
          siren.actions.map(action => action.name)
        )}`
      );
    }
    log("  Found action with name %s", name);

    // Make sure there is an href here...
    if (!action.href) {
      log("    ERROR: no href");
      throw new Error("No href for action " + name);
    }

    // If the action specifies a content-type for the payload, include that
    // in the request.
    if (action.type) {
      log("    Content-Type set to %s", action.type);
      request = headerConfig("Content-Type", action.type)(request);
    }

    const method = (action.method || "get").toLowerCase();
    // Specify the method associated with the action (or fallback to "get")
    // Note that axios expects "get" or "post" (i.e., no GET, no POST).
    request = { ...request, method: method };

    let url = normalizeUrl(action.href, state.cur, parameters);

    if (urlEncoded(action)) {
      const qs = typeof body === "string" ? body : buildQueryString(body, true);
      log("  Encoding data with query string: %s", qs);
      // Add only URL but concatenate with query string
      request = { ...request, url: url + qs };
    } else {
      // Add URL and data to request
      log("  Encoding data as JSON in body: %j", body);
      request = { ...request, url: url, data: body };
    }

    log("    Making a request to %s with config %j", url, request);
    return Promise.resolve(axios.request(request));
  };
}

export const getRequest: Request = async (
  state: NavState
): Promise<ResponseData> => {
  log("Requesting %s, current state is: %j", state.cur, state);
  log(
    "  Fetching latest resource at %s with config %j",
    state.cur,
    state.currentConfig
  );
  return axios.get(state.cur, state.currentConfig).then(v => {
    log("  ResponseData for %s: %j", state.cur, v);
    return v;
  });
};
