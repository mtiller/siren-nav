import { SirenNav } from "../src";
import { Siren } from "siren-types";
import { usingMockAPI } from "./api";

describe("Squash tests", () => {
    it(
        "should create a squashable sequence",
        usingMockAPI(async mock => {
            const nav = SirenNav.create("http://localhost/self-ref");
            let count = 0;
            const me: Siren = {
                properties: undefined,
                links: [{ rel: ["self"], href: "http://localhost/self-ref" }],
            };
            mock.onGet("http://localhost/self-ref").reply(() => {
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
            expect(resp).toEqual("http://localhost/self-ref");

            await squashed.getURL();
            expect(count).toEqual(3);

            await squashed.follow("self").getURL();
            expect(count).toEqual(4);
        }),
    );
});
