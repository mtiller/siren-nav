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
            expect(mock.history.get[0].headers["Accept"]).toEqual("application/json");
        }),
    );

    it(
        "should add auth header as both an omni and non-omni step",
        usingMockAPI(async mock => {
            const nav = SirenNav.create("http://localhost/self-ref");
            await nav
                .auth("Basic", "Foobar", true)
                .follow("self") // Will include Authorization header
                .follow("self") // No authorization
                .auth("Basic", "OmniFoobar")
                .follow("self") // Authorized
                .follow("self") // Authorized
                .get()
                .asSiren();
            expect(mock.history.get).toHaveLength(5);
            expect(mock.history.get[0].headers).toHaveProperty("Authorization");
            expect(mock.history.get[0].headers["Authorization"]).toEqual("Basic Foobar");

            expect(mock.history.get[1].headers).not.toHaveProperty("Authorization");

            expect(mock.history.get[2].headers).toHaveProperty("Authorization");
            expect(mock.history.get[2].headers["Authorization"]).toEqual("Basic OmniFoobar");

            expect(mock.history.get[3].headers).toHaveProperty("Authorization");
            expect(mock.history.get[3].headers["Authorization"]).toEqual("Basic OmniFoobar");

            expect(mock.history.get[4].headers).toHaveProperty("Authorization");
            expect(mock.history.get[4].headers["Authorization"]).toEqual("Basic OmniFoobar");
        }),
    );
});
