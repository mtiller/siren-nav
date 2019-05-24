import MockAdapter from "axios-mock-adapter";
import axios from "axios";

export function setupMockAPI(tests: () => Promise<void>) {
    return async () => {
        const mock = new MockAdapter(axios);
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

        mock.onGet("http://localhost/search-template").reply(200, {
            properties: undefined,
            links: [{ rel: ["search"], href: "/model/{model}" }],
        });

        try {
            await tests();
        } catch (e) {
            throw e;
        } finally {
            mock.reset();
        }
    };
}
