import { Siren } from 'siren-types'
import { AxiosRequestConfig } from 'axios';

export type Config = AxiosRequestConfig;

export class NavState {
    constructor(public cur: string, public root: string, public config: Config, public value: Siren | null) {
    }
}
