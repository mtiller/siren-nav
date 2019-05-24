import { AxiosRequestConfig } from "axios";

import * as debug from "debug";
const debugConfig = debug("siren-nav:config");

export type Config = AxiosRequestConfig;
export type Configurator = (cur: Config) => Config;

export const headerConfig = (key: string, value: string): Configurator => {
    return (config: Config) => {
        let newconfig = { ...config };
        if (!newconfig.headers) newconfig.headers = {};

        // NB - We must create a new header object!
        newconfig.headers = { ...config.headers };
        newconfig.headers[key] = value;

        debugConfig("  Set header '%s' to '%s'", key, newconfig.headers[key]);
        return newconfig;
    };
};

export const contentTypeConfig = (value: string): Configurator => {
    return headerConfig("Content-Type", value);
};

export const acceptConfig = (value: string): Configurator => {
    return headerConfig("Accept", value);
};
