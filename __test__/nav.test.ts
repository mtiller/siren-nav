import { SirenNav, NavState } from "../src";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";

describe("URL Testing", () => {
    it("should create a SirenNav instance", async () => {
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
    it("should create a SirenNav instance and go to relative URL", async () => {
        const nav = SirenNav.create("http://localhost:3000");
        const url = await nav.goto("/foo/{foo}/bar/{bar}", { foo: 5, bar: "x" }).getURL();
        expect(url).toEqual("http://localhost:3000/foo/5/bar/x");
    });
    it("should create a SirenNav instance and go to absolute URL", async () => {
        const nav = SirenNav.create("http://localhost:3000");
        const url = await nav.goto("http://example/foo/{foo}/bar/{bar}", { foo: 5, bar: "x" }).getURL();
        expect(url).toEqual("http://example/foo/5/bar/x");
        const url2 = await nav
            .goto("http://example.com/foo")
            .goto("/bar")
            .getURL();
        expect(url2).toEqual("http://example.com/bar");
    });
});

describe("Navigation Tests", () => {
    it("should follow a template relation", async () => {
        const mock = new MockAdapter(axios);
        mock.onGet("http://localhost/foo").reply(200, {
            properties: undefined,
            links: [{ rel: ["search"], href: "/model/{model}" }],
        });
        const nav = SirenNav.create("http://localhost/foo");
        const url = await nav.follow("search", { model: "X1" }).getURL();
        expect(url).toEqual("http://localhost/model/X1");
    });

    it("should reject relative URLs", () => {
        expect(() => SirenNav.create("/")).toThrow();
        expect(() => new NavState("/", {}, {})).toThrow();
    });
});
