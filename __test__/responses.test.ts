import { usingMockAPI } from "./api";
import { SirenNav } from "../src/navigation";

describe("Response Tests", () => {
    it(
        "should follow a template relation",
        usingMockAPI(async () => {
            const nav = SirenNav.create("http://localhost/bar");
            const resp = await nav.get();
            const siren = await resp.asSiren();
            expect(siren).toMatchSnapshot();
            const nsiren = await resp.asNormalizedSiren();
            expect(nsiren).toMatchSnapshot();
            const json = await resp.asJson();
            expect(json).toMatchSnapshot();
            const buffer = await resp.asBuffer();
            expect(buffer).toMatchSnapshot();
            const raw = await resp.asRaw();
            expect(raw).toMatchSnapshot();
        }),
    );
    it(
        "should handle arrays",
        usingMockAPI(async () => {
            const nav = SirenNav.create("http://localhost/array");
            const resp = await nav.get();
            const buffer = await resp.asBuffer();
            expect(typeof buffer).toEqual("object");
            expect(buffer).toMatchSnapshot();
        }),
    );
    it(
        "should handle strings",
        usingMockAPI(async () => {
            const nav = SirenNav.create("http://localhost/string");
            const resp = nav.get();
            expect(resp.asBuffer()).rejects.toMatchSnapshot();
        }),
    );
    it(
        "should handle number",
        usingMockAPI(async () => {
            const nav = SirenNav.create("http://localhost/number");
            const resp = nav.get();
            expect(resp.asBuffer()).rejects.toMatchSnapshot();
        }),
    );
});
