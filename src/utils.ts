import { Siren, Action } from "siren-types";
import { NavState } from "./state";
import axios from "axios";

import debug from "debug";
const debugUtils = debug("siren-nav:utils");

import URI from "urijs";
import URIT from "urijs/src/URITemplate";

export function getSiren(state: NavState): Promise<Siren> {
  debugUtils("  getSiren for URL '%s' with state: %j", state.cur, state);
  return Promise.resolve(axios.get(state.cur, state.currentConfig)).then(
    resp => resp.data as Siren
  );
}

export function normalizeUrl(
  href: string,
  base: string | null,
  parameters?: {}
): string {
  const uri = URI(href);
  let url = base ? uri.absoluteTo(base) : uri;
  if (url.is("relative"))
    throw new Error("Normalized URL is relative: " + url.toString());
  if (parameters) {
    url = URIT(url.toString()).expand(parameters);
    debugUtils(
      "  After expansion with %j, URL became: %s",
      parameters,
      url.toString()
    );
  }
  debugUtils("  Absolute URL: %s", url.toString());
  return url.toString();
}

export function urlEncoded(action: Action): boolean {
  const type = action.type;
  // If a type is specified for the action, use that to decide...
  if (type) {
    // If it indicates form url encoding, then we should encode data in the URL.
    return type === "application/x-www-form-urlencoded";
  } else {
    // If no type is specified, then look at the method;
    const method = action.method;
    if (method) {
      // If a method has been defined, use URL encoding for GET or DELETE
      // (since they do not allow a body).  For anything else, assume the data
      // will be passed in the request body (i.e., not URL encoded)
      switch (method.toLowerCase()) {
        case "get":
        case "delete":
          return true;
        default:
          return false;
      }
    } else {
      // If no method is specified, then the default is GET and the
      // default encoding for GET is url encoded
      return true;
    }
  }
}

// export function formulateData(action: Action, body: {}): {} | string {
//   const type = action.type;
//   debugUtils("  Formulating data, type = %s", action.type);
//   debugUtils("    Action = %j", action);
//   debugUtils("    typeof body = %s", typeof body);
//   debugUtils("    body = %j", body);

//   // Is there a type specified other than urlencoded?  If so, we just use body
//   if (type && type !== "application/x-www-form-urlencoded") return body;

//   // Ensure the body exists and it is an object
//   if (!body || typeof body != "object") return body;

//   // URL encode field of body.
//   return new URI("").search(body).toString();
// }
