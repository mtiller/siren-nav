import { usingMockAPI } from "./api";
import { SirenNav } from "../src";

describe("Test header handling", () => {
    it(
        "should add content-type header",
        usingMockAPI(async mock => {
            const nav = SirenNav.create("http://localhost/self-ref");
            await nav
                .header("Content-Type", "application/json")
                .get()
                .asSiren();
            expect(mock.history.get).toHaveLength(1);
            expect(mock.history.get[0].headers).toHaveProperty("Content-Type");
            expect(mock.history.get[0].headers["Content-Type"]).toEqual("application/json");
        }),
    );

    it(
        "should add accept header",
        usingMockAPI(async mock => {
            const nav = SirenNav.create("http://localhost/self-ref");
            await nav
                .accept("application/json")
                .get()
                .asSiren();
            expect(mock.history.get).toHaveLength(1);
            expect(mock.history.get[0].headers).toHaveProperty("Accept");
            // expect(mock.history.get[0].headers["Accept"]).toEqual("application/json");
        }),
    );

    it(
        "should add auth header",
        usingMockAPI(async mock => {
            const nav = SirenNav.create("http://localhost/self-ref");
            await nav
                .auth("Basic", "Foobar")
                .get()
                .asSiren();
            expect(mock.history.get).toHaveLength(1);
            expect(mock.history.get[0].headers).toHaveProperty("Authorization");
            expect(mock.history.get[0].headers["Authorization"]).toEqual("Basic Foobar");
        }),
    );
});
