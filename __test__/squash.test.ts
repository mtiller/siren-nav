import { SirenNav } from "../src";
import { usingMockAPI } from "./api";

describe("Squash tests", () => {
    it(
        "should create a squashable sequence",
        usingMockAPI(async mock => {
            const nav = SirenNav.create("http://localhost/self-ref");
            const squashed = nav
                .follow("self")
                .follow("self")
                .follow("self")
                .squash();

            expect(mock.history.get).toHaveLength(0);
            const resp = await squashed.getURL();
            expect(mock.history.get).toHaveLength(3);
            expect(resp).toEqual("http://localhost/self-ref");

            await squashed.getURL();
            expect(mock.history.get).toHaveLength(3);

            await squashed.follow("self").getURL();
            expect(mock.history.get).toHaveLength(4);
        }),
    );
});
