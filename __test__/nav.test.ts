import { SirenNav } from "../src";

describe("Navigation Tests", () => {
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
