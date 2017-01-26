import { Siren } from 'siren-types';
import { NavState } from './state';
import axios = require('axios');

export function getSelf(v: Siren): string | null {
    if (!v.links) return null;
    if (!Array.isArray(v.links)) return null;
    for (let i = 0; i < v.links.length; i++) {
        let link = v.links[i];
        if (link.rel.indexOf("self") >= 0) return link.href;
    }
    return null;
}

export function getSiren(state: NavState): Promise<Siren> {
    if (state.value) return Promise.resolve(state.value);
    return Promise.resolve(axios.get<Siren>(state.cur)).then((resp) => resp.data);
}