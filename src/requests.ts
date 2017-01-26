import { NavState } from './state';
import { Siren } from 'siren-types';
import axios = require('axios');

export interface ResponseData {
    data: any,
    headers: {},
    status: number,
}

export type Request = (cur: NavState, debug: boolean) => Promise<ResponseData>;

export function performAction<T>(name: string, body: T): Request {
    return async (state: NavState, debug: boolean): Promise<Axios.AxiosXHR<{}>> => {
        if (debug) console.log("Performing action "+name+" on "+state.cur);
        if (debug) console.log("  Fetching latest version of "+state.cur);
        let resp = await axios.get(state.cur, state.config);
        let siren: Siren = resp.data as Siren;
        if (debug) console.log("  Latest value of "+state.cur+": ", siren);

        if (!siren.actions) {
            if (debug) console.log("  ERROR: no actions defined in "+state.cur);
            throw new Error("No actions defined for " + state.cur);
        }

        for (let i = 0; i < siren.actions.length; i++) {
            let action = siren.actions[i];
            if (action.name == name) {
                if (debug) console.log("  Found action with name "+name);
                if (!action.href) {
                    if (debug) console.log("    ERROR: no href");
                    throw new Error("No href for action " + name);
                }
                if (debug) console.log("    POSTing to "+action.href);
                return Promise.resolve(axios.post<{}>(action.href, body, state.config));
            }
        }
        throw new Error("Unknown action '" + name + "', choices were " + siren.actions.map((a) => a.name).join(", "));
    }
}

export const getRequest: Request = async (state: NavState, debug: boolean): Promise<ResponseData> => {
    if (debug) console.log("Requesting "+state.cur);
    if (state.value) {
        if (debug) console.log("  Using cached copy: "+JSON.stringify(state.value));
        return Promise.resolve<ResponseData>({ data: state.value, headers: {}, status: 200 });
    }
    if (debug) console.log("  Fetching latest resource at "+state.cur);
    return axios.get(state.cur, state.config).then((v) => {
        if (debug) console.log("  ResponseData for "+state.cur+":", v);
        return v;
    })
}