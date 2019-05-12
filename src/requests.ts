import { NavState } from "./state";
import { Siren } from "siren-types";
import axios from "axios";
import { AxiosResponse } from "axios";

import * as URI from "urijs/src/URITemplate";

import * as debug from "debug";
const debugRequests = debug("siren-nav:requests");

export interface ResponseData {
    data: any;
    headers: {};
    status: number;
}

export type Request = (cur: NavState) => Promise<ResponseData>;

export function performAction<T>(name: string, body: T, parameters?: {}): Request {
    return async (state: NavState): Promise<AxiosResponse> => {
        debugRequests("Performing action %s on %s", name, state.cur);
        debugRequests("  Fetching latest version of %s with config %j", state.cur, state.config);
        let resp = await axios.get(state.cur, state.config);
        let siren: Siren = resp.data as Siren;

        debugRequests("  Latest value of %s: %j", siren, state.cur);

        if (!siren.actions) {
            debugRequests("  ERROR: no actions defined in %s", state.cur);
            throw new Error("No actions defined for " + state.cur);
        }

        for (let i = 0; i < siren.actions.length; i++) {
            let action = siren.actions[i];
            if (action.name == name) {
                let method = action.method || "get";
                debugRequests("  Found action with name %s", name);
                if (!action.href) {
                    debugRequests("    ERROR: no href");
                    throw new Error("No href for action " + name);
                }
                let url = action.href;
                if (parameters) {
                    url = URI(url)
                        .expand(parameters)
                        .toString();
                }

                let data: T | undefined = body;

                // If no action type was given or if they specifically asked for url encoding,
                // add data as a url encoded query string.
                // TODO: support some kind of flattening or other convention for marshalling objects
                // in this way?
                if (!action.type || action.type.toLowerCase() == "application/x-www-form-urlencoded") {
                    let args: string[] = [];
                    data = undefined;
                    if (body && typeof body == "object") {
                        args = Object.keys(body).map(
                            key => encodeURIComponent(key) + "=" + encodeURIComponent(body[key]),
                        );
                    }
                    if (args.length > 0) {
                        url = url + "?" + args.join("&");
                    }
                }
                debugRequests("    Making a %s request to %s with config %j", method.toUpperCase(), url, state.config);
                return Promise.resolve(
                    axios.request({
                        ...state.config,
                        baseURL: state.config.baseURL,
                        method: method.toLowerCase(),
                        url: url,
                        data: data,
                    }),
                );
            }
        }
        throw new Error("Unknown action '" + name + "', choices were " + siren.actions.map(a => a.name).join(", "));
    };
}

export const getRequest: Request = async (state: NavState): Promise<ResponseData> => {
    debugRequests("Requesting %s", state.cur);
    if (state.value) {
        debugRequests("  Using cached copy: %j", state.value);
        return Promise.resolve<ResponseData>({ data: state.value, headers: {}, status: 200 });
    }
    debugRequests("  Fetching latest resource at %s with config %j", state.cur, state.config);
    return axios.get(state.cur, state.config).then(v => {
        debugRequests("  ResponseData for %s: %j", state.cur, v);
        return v;
    });
};
