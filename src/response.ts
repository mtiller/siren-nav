import { ResponseData } from "./requests";
import { Entity, normalize, NormalizedEntity, Properties } from "siren-types";

import * as debug from "debug";
const debugResponses = debug("siren-nav:response");

export class NavResponse {
  static create(resp: Promise<ResponseData>): NavResponse {
    return new NavResponse(resp);
  }

  private constructor(private resp: Promise<ResponseData>) {}

  async asSiren<T extends Properties>(): Promise<Entity<T>> {
    let resp = await this.resp;
    debugResponses("Response as Siren: %j", resp.data);
    return resp.data as Entity<T>;
  }

  async asNormalizedSiren<T extends Properties>(
    defaultProps?: T
  ): Promise<NormalizedEntity<T | undefined>> {
    let resp = await this.resp;
    debugResponses("Response as Siren: %j", resp.data);
    const entity = resp.data as Entity<T>;
    return normalize<T | undefined>(entity, defaultProps);
  }

  async asJson<T extends {}>(): Promise<T> {
    let resp = await this.resp;
    debugResponses("Response as JSON: %j", resp.data);
    return resp.data as T;
  }

  async asBuffer(): Promise<ArrayBuffer | string> {
    let resp = await this.resp;
    if (resp.data instanceof ArrayBuffer) return resp.data;
    if (typeof resp.data == "string") {
      debugResponses("Response as buffer yielded string: %s", resp.data);
      return resp.data;
    }
    if (typeof resp.data == "object") {
      debugResponses("Response as buffer yielded object: %j", resp.data);
      return JSON.stringify(resp.data);
    }
    throw new Error(
      "Response data was neither an ArrayBuffer nor a string nor JSON"
    );
  }

  async asRaw(): Promise<any> {
    let resp = await this.resp;
    debugResponses("Raw response: %j", resp);
    return resp;
  }
}
