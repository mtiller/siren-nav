import { usingMockAPI } from "./api";
import { SirenNav } from "../src/navigation";

describe("Action tests", () => {
    it(
        "should perform a GET action without arguments",
        usingMockAPI(async mock => {
            const nav = SirenNav.create("http://localhost/api");
            const foo = nav.performAction("query", {});
            const r1 = await foo.asSiren();
            expect(r1).toMatchSnapshot();
        }),
    );
    it(
        "should perform a GET action with arguments",
        usingMockAPI(async mock => {
            const nav = SirenNav.create("http://localhost/api");
            const foo = nav.performAction("query", { term: "home", x: 5 });
            const r1 = await foo.asSiren();
            expect(r1).toMatchSnapshot();

            expect(mock.history.get).toHaveLength(2);
            expect(mock.history.get[1].method).toEqual("get");
            expect(mock.history.get[1].data).toEqual("?term=home&x=5");
        }),
    );
    it(
        "should perform a hypermedia action",
        usingMockAPI(async mock => {
            const nav = SirenNav.create("http://localhost/api");
            const foo = nav.performHyperAction<undefined>("query", {
                properties: undefined,
                links: [],
            });
            const r1 = await foo.asSiren();
            expect(r1).toMatchSnapshot();
        }),
    );
    it.skip(
        "should perform a POST action",
        usingMockAPI(async () => {
            const nav = SirenNav.create("http://localhost/api");
            const bar = nav.performAction("create", {});
            const r2 = await bar.asSiren();
            expect(r2).toMatchSnapshot();
        }),
    );
});
