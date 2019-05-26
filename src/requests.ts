import { NavState } from "./state";
import { Siren } from "siren-types";
import axios from "axios";
import { AxiosResponse } from "axios";

import * as debug from "debug";
import { normalizeUrl, formulateData } from "./utils";
import { headerConfig } from "./config";
const debugRequests = debug("siren-nav:requests");

export interface ResponseData {
    data: any;
    headers: {};
    status: number;
}

export type Request = (cur: NavState) => Promise<ResponseData>;

export function performAction<T extends {}>(name: string, body: T, parameters?: {}): Request {
    return async (state: NavState): Promise<AxiosResponse> => {
        debugRequests("Performing action %s on %s", name, state.cur);
        debugRequests("  Fetching with current state of: %j", state);
        const resp = await getRequest(state);
        let siren: Siren = resp.data as Siren;
        // We may need to tweak the config, so let's start with the config of
        // the NavState
        let request = state.currentConfig;

        debugRequests("  Latest value of %s: %j", siren, state.cur);

        if (!siren.actions) {
            debugRequests("  ERROR: no actions defined in %s", state.cur);
            throw new Error("No actions defined for " + state.cur);
        }

        const action = siren.actions.find(action => action.name == name);
        if (!action) {
            throw new Error(
                `No action named ${name} found among: ${JSON.stringify(siren.actions.map(action => action.name))}`,
            );
        }
        debugRequests("  Found action with name %s", name);

        // Make sure there is an href here...
        if (!action.href) {
            debugRequests("    ERROR: no href");
            throw new Error("No href for action " + name);
        }

        // If the action specifies a content-type for the payload, include that
        // in the request.
        if (action.type) {
            debugRequests("    Content-Type set to %s", action.type);
            request = headerConfig("Content-Type", action.type)(request);
        }

        // Specify the method associated with the action (or fallback to "get")
        // Note that axios expects "get" or "post" (i.e., no GET, no POST).
        request = { ...request, method: (action.method || "get").toLowerCase() };

        let url = normalizeUrl(action.href, state.cur, parameters);

        let data: {} | string = formulateData(action, body);
        debugRequests("  Data for request: %j", data);

        // Add URL and data to request
        request = { ...request, url: url, data: data };

        debugRequests("    Making a request to %s with config %j", url, request);
        return Promise.resolve(axios.request(request));
    };
}

export const getRequest: Request = async (state: NavState): Promise<ResponseData> => {
    debugRequests("Requesting %s, current state is: %j", state.cur, state);
    debugRequests("  Fetching latest resource at %s with config %j", state.cur, state.currentConfig);
    return axios.get(state.cur, state.currentConfig).then(v => {
        debugRequests("  ResponseData for %s: %j", state.cur, v);
        return v;
    });
};
