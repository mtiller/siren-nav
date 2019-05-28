import * as WebSocket from "ws";
import { SirenNav } from "../src/navigation";

import * as debug from "debug";
const log = debug("siren-nav:tests:subscribe");

describe("Subscription tests", () => {
    it("should subscribe to a web socket", async () => {
        const wss = new WebSocket.Server({ port: 8080 });
        log("Web server created");
        const nav = SirenNav.create("ws://localhost:8080");
        log("SirenNav created");

        wss.on("connection", function connection(ws) {
            log("Web socket server address: %j", wss.address);
            log("Connection event");
            const send = (msg: string) => {
                ws.send(JSON.stringify({ properties: { message: msg } }));
            };
            log("Sending...");
            setTimeout(() => send("Something"), 200);
            setTimeout(() => send("another thing"), 500);
            setTimeout(() => {
                log("Last message sent");
                send("one other thing");
            }, 800);
        });

        const messages: string[] = [];
        const foo = nav.subscribe<{ message: string }>().subscribe(msg => {
            log("Message received, entity: %j", Object.keys(msg));
            messages.push(msg.properties.message);
        });

        log("Awaiting promise");
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                log("Initiating shutdown");
                foo.unsubscribe();
                wss.close(err => {
                    if (err) reject(err);
                    else resolve();
                });
            }, 900);
        });
        log("Promise resolved");
        expect(messages).toEqual(["Something", "another thing", "one other thing"]);
    });
});
