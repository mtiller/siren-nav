import { Siren } from "siren-types";
import { AxiosRequestConfig } from "axios";
import URI from "urijs";

export type Config = AxiosRequestConfig;

export class NavState {
    public readonly cur: string;
    constructor(
        href: string,
        parameters: {} | undefined,
        public root: string,
        public config: Config,
        public value: Siren | null,
    ) {
        this.cur = parameters ? URI.expand(href, parameters).toString() : href;
    }
}
