import { Entity } from "siren-types";

export class Cache {
    private cache: { [key: string]: Entity<any> };
    constructor() {
        this.cache = {};
    }
    add(uri: string, resp: Entity<any>) {
        this.cache[uri] = resp;
    }
    has(uri: string): boolean {
        return this.cache.hasOwnProperty(uri);
    }
    get(uri: string): Entity<any> {
        if (this.has(uri)) return this.cache[uri];
        throw new Error("Requested uncached resource: " + uri);
    }
    getOr(uri: string): Entity<any> | null {
        if (this.has(uri)) return this.cache[uri];
        return null;
    }
}
