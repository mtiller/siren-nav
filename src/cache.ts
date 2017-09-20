import { Siren } from 'siren-types';

export class Cache {
    private cache: { [key: string]: Siren };
    constructor() {
        this.cache = {};
    }
    add(uri: string, resp: Siren) {
        this.cache[uri] = resp;
    }
    has(uri: string): boolean {
        return this.cache.hasOwnProperty(uri);
    }
    get(uri: string): Siren {
        if (this.has(uri)) return this.cache[uri];
        throw new Error("Requested uncached resource: " + uri);
    }
    getOr(uri: string): Siren | null {
        if (this.has(uri)) return this.cache[uri];
        return null;
    }
}