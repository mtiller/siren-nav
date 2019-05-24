import { SirenNav } from "../src";
import { usingMockAPI } from "./api";

describe("MultiNav tests", () => {
    it(
        "should follow multiple links",
        usingMockAPI(async () => {
            const nav = SirenNav.create("http://localhost/collection");
            const result = await nav
                .followEach("item")
                .follow("collection")
                .followEach("item")
                .get()
                .asSiren();

            expect(result).toHaveLength(4);
        }),
    );
});
