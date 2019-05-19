import { SirenNav, Cache } from "../src";

describe("MultiNav tests", () => {
    it("should follow multiple links", async () => {
        const cache = new Cache();
        cache.add("http://localhost/collection", {
            properties: undefined,
            links: [{ rel: ["item"], href: "/model/1" }, { rel: ["item"], href: "/model/2" }],
        });
        cache.add("http://localhost/model/1", {
            properties: { id: 1 },
            links: [{ rel: ["collection"], href: "/collection" }],
        });
        cache.add("http://localhost/model/2", {
            properties: { id: 2 },
            links: [{ rel: ["collection"], href: "/collection" }],
        });

        const nav = SirenNav.create("http://localhost/collection", cache);
        const result = await nav
            .followEach("item")
            .follow("collection")
            .followEach("item")
            .get()
            .asSiren();

        expect(result).toHaveLength(4);
    });
});
