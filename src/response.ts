import { ResponseData } from "./requests";
import { SirenNav } from "./navigation";
import { Entity, normalize, NormalizedEntity, Properties } from "siren-types";
import { NavState } from "./state";
import { Cache } from "./cache";

import * as debug from "debug";
const debugResponses = debug("siren-nav:response");

export class NavResponse {
    static create(resp: Promise<ResponseData>, nav: SirenNav): NavResponse {
        return new NavResponse(resp, nav);
    }

    static fromValue(value: {}, nav: SirenNav): NavResponse {
        let resp = Promise.resolve<ResponseData>({ data: value, headers: {}, status: 200 });
        return new NavResponse(resp, nav);
    }

    private constructor(private resp: Promise<ResponseData>, private nav: SirenNav) {}

    async asSiren<T extends Properties>(): Promise<Entity<T>> {
        let resp = await this.resp;
        debugResponses("Response as Siren: %j", resp.data);
        return resp.data as Entity<T>;
    }

    async asNormalizedSiren<T extends Properties>(defaultProps?: T): Promise<NormalizedEntity<T>> {
        let resp = await this.resp;
        debugResponses("Response as Siren: %j", resp.data);
        const entity = resp.data as Entity<T>;
        return normalize<T>(entity, defaultProps);
    }

    async asJson<T extends {}>(): Promise<T> {
        let resp = await this.resp;
        debugResponses("Response as JSON: %j", resp.data);
        return resp.data as T;
    }

    async asBuffer(): Promise<ArrayBuffer | string> {
        let resp = await this.resp;
        if (resp.data instanceof ArrayBuffer) return resp.data;
        if (typeof resp.data == "string") {
            debugResponses("Response as buffer yielded string: %s", resp.data);
            return resp.data;
        }
        if (typeof resp.data == "object") {
            debugResponses("Response as buffer yielded object: %j", resp.data);
            return JSON.stringify(resp.data);
        }
        throw new Error("Response data was neither an ArrayBuffer nor a string nor JSON");
    }

    async asRaw(): Promise<any> {
        let resp = await this.resp;
        debugResponses("Raw response: %j", resp);
        return resp;
    }

    followLocation(parameters?: {}): SirenNav {
        return this.nav.do(async (state: NavState, cache: Cache) => {
            debugResponses("Following Location header");
            let resp = await this.resp;
            debugResponses("Response for %s was: %j", state.cur, resp);
            debugResponses("  Headers: %j", resp.headers);
            let location = resp.headers["Location"] || resp.headers["location"];
            if (!location) {
                debugResponses("  ERROR: No 'Location' header found, payload for %s was %j", state.cur, resp.data);
                throw new Error("No 'Location' header found in '" + Object.keys(resp.headers).join(", ") + "'");
            } else {
                debugResponses("  Location header: %s", location);
            }
            const locurl = state.rebase(location);
            return new NavState(locurl, parameters, state.config, cache.getOr(locurl));
        });
    }
}
