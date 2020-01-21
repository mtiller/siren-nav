import { SirenNav, NavState } from "../src";
import { usingMockAPI } from "./api";

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
    const url = await nav
      .goto("/foo/{foo}/bar/{bar}", { foo: 5, bar: "x" })
      .getURL();
    expect(url).toEqual("http://localhost:3000/foo/5/bar/x");
  });
  it("should create a SirenNav instance and go to absolute URL", async () => {
    const nav = SirenNav.create("http://localhost:3000");
    const url = await nav
      .goto("http://example/foo/{foo}/bar/{bar}", { foo: 5, bar: "x" })
      .getURL();
    expect(url).toEqual("http://example/foo/5/bar/x");
    const url2 = await nav
      .goto("http://example.com/foo")
      .goto("/bar")
      .getURL();
    expect(url2).toEqual("http://example.com/bar");
  });
});

describe("Navigation Tests", () => {
  it(
    "should follow a template relation",
    usingMockAPI(async () => {
      const nav = SirenNav.create("http://localhost/search-template");
      const url = await nav.follow("search", { model: "X1" }).getURL();
      expect(url).toEqual("http://localhost/model/X1");
    })
  );

  it("should reject relative URLs", () => {
    expect(() => SirenNav.create("/")).toThrow();
    expect(() => new NavState("/", {}, { flatten: true })).toThrow();
  });

  it(
    "should follow redirects",
    usingMockAPI(async () => {
      const nav = SirenNav.create("http://localhost/308");
      const req = nav.get().asSiren<{ message: string }>();
      expect(req).rejects.not.toBeFalsy();
      const req2 = nav
        .goto("/resource")
        .followLocation()
        .get()
        .asSiren<{ message: string }>();
      const resp = await req2;
      expect(resp.properties.message).toEqual("I am bar");
    })
  );
});
