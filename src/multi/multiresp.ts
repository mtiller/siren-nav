import { ResponseData } from "../requests";
import { Entity, Properties } from "siren-types";

import debug from "debug";
const log = debug("siren-nav:multi:response");

export class MultiResponse {
  static create(resp: Promise<ResponseData[]>): MultiResponse {
    return new MultiResponse(resp);
  }

  private constructor(private resps: Promise<ResponseData[]>) {}

  async asSiren<T extends Properties>(): Promise<Entity<T>[]> {
    const resps = await this.resps;
    log(
      "Responses as Siren: %j",
      resps.map(x => x.data)
    );
    return resps.map(x => x.data as Entity<T>);
  }
}
