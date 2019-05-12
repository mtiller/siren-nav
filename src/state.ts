import { Siren } from "siren-types";
import { AxiosRequestConfig } from "axios";

import * as URI from "urijs/src/URITemplate";

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
        this.cur = parameters
            ? URI(href)
                  .expand(parameters)
                  .toString()
            : href;
    }
}
