import { AxiosRequestConfig } from "axios";

import debug from "debug";
const log = debug("siren-nav:config");

export type Config = AxiosRequestConfig;
export type Configurator = (cur: Config) => Config;

export const headerConfig = (key: string, value: string): Configurator => {
  return (config: Config) => {
    let newconfig = { ...config };

    // istanbul ignore next (never happens because we always initialize this)
    if (!newconfig.headers) newconfig.headers = {};

    // NB - We must create a new header object!
    newconfig.headers = { ...config.headers };
    newconfig.headers[key] = value;

    log("  Set header '%s' to '%s'", key, newconfig.headers[key]);
    return newconfig;
  };
};
