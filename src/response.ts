import { ResponseData } from './requests';
import { SirenNav } from './navigation';
import { Entity } from 'siren-types';
import { NavState } from './state';
import { Cache } from './cache';

export class NavResponse {
    static create(resp: Promise<ResponseData>, nav: SirenNav): NavResponse {
        return new NavResponse(resp, nav);
    }

    static fromValue(value: {}, nav: SirenNav): NavResponse {
        let resp = Promise.resolve<ResponseData>({ data: value, headers: {}, status: 200 });
        return new NavResponse(resp, nav);
    }

    private constructor(private resp: Promise<ResponseData>, private nav: SirenNav) {

    }

    async asSiren<T extends {}>(): Promise<Entity<T>> {
        let resp = await this.resp;
        return resp.data as Entity<T>;
    }

    async asJson<T extends {}>(): Promise<T> {
        let resp = await this.resp;
        return resp.data as T;
    }

    async asBuffer(): Promise<ArrayBuffer | string> {
        let resp = await this.resp;
        if (resp.data instanceof ArrayBuffer) return resp.data;
        if (typeof resp.data == "string") return resp.data;
        throw new Error("Response data was neither an ArrayBuffer nor a string");
    }

    async asRaw(): Promise<any> {
        let resp = await this.resp;
        return resp;
    }

    followLocation(): SirenNav {
        return this.nav.do(async (state: NavState, cache: Cache, debug: boolean) => {
            if (debug) console.log("Following Location header");
            let resp = await this.resp;
            let location = resp.headers["Location"] || resp.headers["location"];
            if (!location) {
                if (debug) console.log("  ERROR: No 'Location' header found");
                throw new Error("No 'Location' header found in '" + Object.keys(resp.headers).join(", ") + "'")
            } else {
                if (debug) console.log("  Location header: "+location);
            }
            return new NavState(location, state.root, state.config, cache.getOr(location));
        })
    }
}
