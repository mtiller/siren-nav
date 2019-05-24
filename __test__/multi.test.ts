import { SirenNav } from "../src";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";

describe("MultiNav tests", () => {
    it("should follow multiple links", async () => {
        const mock = new MockAdapter(axios);
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

        const nav = SirenNav.create("http://localhost/collection");
        const result = await nav
            .followEach("item")
            .follow("collection")
            .followEach("item")
            .get()
            .asSiren();

        expect(result).toHaveLength(4);
    });
});
