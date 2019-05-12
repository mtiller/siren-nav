import { SirenNav } from "../src";

describe("Navigation Tests", () => {
    it("should create a SirenNav instance", async () => {
        const nav = SirenNav.create("/", "http://localhost:3000");
        const url = await nav.goto("/foo/{foo}/bar/{bar}", { foo: 5, bar: "x" }).getURL();
        expect(url).toEqual("http://localhost:3000/foo/5/bar/x");
    });
});
