import { SirenNav } from "../src";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { Siren } from "siren-types";

describe("Squash tests", () => {
    it("should create a squashable sequence", async () => {
        const nav = SirenNav.create("http://localhost/");
        const mock = new MockAdapter(axios);
        let count = 0;
        const me: Siren = {
            properties: undefined,
            links: [{ rel: ["self"], href: "http://localhost/" }],
        };
        mock.onGet("http://localhost/").reply(() => {
            count++;
            return [200, me];
        });
        const squashed = nav
            .follow("self")
            .follow("self")
            .follow("self")
            .squash();

        expect(count).toEqual(0);
        const resp = await squashed.getURL();
        expect(count).toEqual(3);
        expect(resp).toEqual("http://localhost/");

        await squashed.getURL();
        expect(count).toEqual(3);

        await squashed.follow("self").getURL();
        expect(count).toEqual(4);
    });
});
