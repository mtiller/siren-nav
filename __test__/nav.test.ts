import { SirenNav, Cache } from "../src";

describe("URL Testing", () => {
    it("should create a SirenNav instance without a baseURL with hostname", async () => {
        const nav = SirenNav.create("http://user:pass@localhost:3000/foo");
        const url = await nav.getURL();
        expect(url).toEqual("http://user:pass@localhost:3000/foo");
        const nav2 = nav.goto("/bar");
        const url2 = await nav2.getURL();
        expect(url2).toEqual("http://user:pass@localhost:3000/bar");
    });
    it("should throw an error creating a SirenNav instance without a hostname", async () => {
        expect(() => SirenNav.create("/foo")).toThrow();
    });
    it("should create a SirenNav instance", async () => {
        const nav = SirenNav.create("/", "http://localhost:3000");
        const url = await nav.goto("/foo/{foo}/bar/{bar}", { foo: 5, bar: "x" }).getURL();
        expect(url).toEqual("http://localhost:3000/foo/5/bar/x");
    });
});

describe("Navigation Tests", () => {
    it("should follow a template relation", async () => {
        const cache = new Cache();
        cache.add("http://localhost/foo", {
            links: [{ rel: ["search"], href: "/model/{model}" }],
        });
        const nav = SirenNav.create("http://localhost/foo", undefined, cache);
        const url = await nav.follow("search", { model: "X1" }).getURL();
        expect(url).toEqual("http://localhost/model/X1");
    });
});
