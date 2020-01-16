import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { Siren } from "siren-types";

function s<T>(obj: Siren<T>): Siren<T> {
  return obj;
}

export function usingMockAPI(tests: (mock: MockAdapter) => Promise<void>) {
  return async (): Promise<void> => {
    const mock = new MockAdapter(axios);

    //// Resources that deal with redirection and location headers
    mock.onGet("http://localhost/308").reply(308, "Wrong place, move along", {
      Location: "http://localhost/bar"
    });
    mock.onGet("http://localhost/resource").reply(
      200,
      {
        message: "You really should follow my location header"
      },
      {
        Location: "http://localhost/bar"
      }
    );
    mock.onGet("http://localhost/bar").reply(
      200,
      s({
        properties: {
          message: "I am bar"
        }
      })
    );
    mock.onGet("http://localhost/array").reply(200, new ArrayBuffer(10));
    mock.onGet("http://localhost/string").reply(200, "a string");
    mock.onGet("http://localhost/string").reply(200, 5);

    //// Resources that involve templates
    mock.onGet("http://localhost/search-template").reply(
      200,
      s({
        properties: undefined,
        links: [{ rel: ["search"], href: "/model/{model}" }]
      })
    );

    //// Resources that provide collections
    mock.onGet("http://localhost/collection").reply(
      200,
      s({
        properties: undefined,
        links: [
          { rel: ["item"], href: "/model/1" },
          { rel: ["item"], href: "/model/2" }
        ]
      })
    );
    mock.onGet("http://localhost/model/1").reply(
      200,
      s({
        properties: { id: 1 },
        links: [{ rel: ["collection"], href: "/collection" }]
      })
    );
    mock.onGet("http://localhost/model/2").reply(
      200,
      s({
        properties: { id: 2 },
        links: [{ rel: ["collection"], href: "/collection" }]
      })
    );

    //// A self referential resource
    mock.onGet("http://localhost/self-ref").reply(
      200,
      s({
        properties: undefined,
        links: [{ rel: ["self"], href: "http://localhost/self-ref" }]
      })
    );

    mock.onGet("http://localhost/api").reply(
      200,
      s({
        properties: undefined,
        actions: [
          {
            name: "query",
            href: "/api/query"
          },
          {
            name: "create",
            href: "/api/create",
            method: "POST",
            type: "application/json"
          }
        ]
      })
    );
    mock.onGet("http://localhost/api/query").reply(
      200,
      s({
        properties: undefined,
        links: []
      })
    );
    mock.onPost("http://localhost/api/create").reply(
      200,
      s({
        properties: undefined
      })
    );
    const msg1: Siren<{ message: string }> = {
      properties: { message: "My message" }
    };
    const msg2: Siren<{ message: string }> = {
      properties: { message: "Another message" }
    };
    mock
      .onGet("http://localhost/sse")
      .reply(
        200,
        `data: ${JSON.stringify(msg1)}\n\ndata: ${JSON.stringify(msg2)}\n\n`,
        {
          "Content-Type": "text/event-stream"
        }
      );

    try {
      await tests(mock);
    } catch (e) {
      throw e;
    } finally {
      mock.reset();
    }
  };
}
