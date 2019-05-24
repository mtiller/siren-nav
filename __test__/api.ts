import MockAdapter from "axios-mock-adapter";
import axios from "axios";

export function usingMockAPI(tests: (mock: MockAdapter) => Promise<void>) {
    return async () => {
        const mock = new MockAdapter(axios);

        //// Resources that deal with redirection and location headers
        mock.onGet("http://localhost/308").reply(308, "Wrong place, move along", {
            Location: "http://localhost/bar",
        });
        mock.onGet("http://localhost/resource").reply(
            200,
            {
                message: "You really should follow my location header",
            },
            {
                Location: "http://localhost/bar",
            },
        );
        mock.onGet("http://localhost/bar").reply(200, {
            properties: {
                message: "I am bar",
            },
        });

        //// Resources that involve templates
        mock.onGet("http://localhost/search-template").reply(200, {
            properties: undefined,
            links: [{ rel: ["search"], href: "/model/{model}" }],
        });

        //// Resources that provide collections
        mock.onGet("http://localhost/collection").reply(200, {
            properties: undefined,
            links: [{ rel: ["item"], href: "/model/1" }, { rel: ["item"], href: "/model/2" }],
        });
        mock.onGet("http://localhost/model/1").reply(200, {
            properties: { id: 1 },
            links: [{ rel: ["collection"], href: "/collection" }],
        });
        mock.onGet("http://localhost/model/2").reply(200, {
            properties: { id: 2 },
            links: [{ rel: ["collection"], href: "/collection" }],
        });

        //// A self referential resource
        mock.onGet("http://localhost/self-ref").reply(200, {
            properties: undefined,
            links: [{ rel: ["self"], href: "http://localhost/self-ref" }],
        });

        try {
            await tests(mock);
        } catch (e) {
            throw e;
        } finally {
            mock.reset();
        }
    };
}
