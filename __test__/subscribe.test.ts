import WebSocket from "ws";
import { SirenNav } from "../src/navigation";

import debug from "debug";
import { usingMockAPI } from "./api";
const log = debug("siren-nav:tests:subscribe");

describe("Subscription tests", () => {
  it.skip(
    "should subscribe to SSE",
    usingMockAPI(async () => {
      const nav = SirenNav.create("http://localhost/sse");
      log("SirenNav created");

      const messages: string[] = [];
      const foo = nav.subscribe<{ message: string }>().subscribe(msg => {
        log("Message received, entity: %j", Object.keys(msg));
        messages.push(msg.properties.message);
      });

      try {
        await new Promise(resolve => {
          setTimeout(() => {
            resolve(undefined);
          }, 500);
        });
      } catch (e) {
        console.error(e);
      } finally {
        foo.unsubscribe();
      }
      expect(messages).toEqual(["My message", "Another message"]);
    })
  );
  it("should subscribe to a web socket that closes properly", async () => {
    const wss = new WebSocket.Server({ port: 8080 });
    log("Web server created");
    const nav = SirenNav.create("ws://localhost:8080");
    log("SirenNav created");

    wss.on("connection", function connection(ws) {
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
  it("should subscribe to a web socket that closes early", async () => {
    const wss = new WebSocket.Server({ port: 8081 });
    log("Web server created");
    const nav = SirenNav.create("ws://localhost:8081");
    log("SirenNav created");

    wss.on("connection", function connection(ws) {
      log("Connection event");
      const send = (msg: string) => {
        try {
          ws.send(JSON.stringify({ properties: { message: msg } }));
        } catch (e) {
          log(`Failed to send a message ${msg}`)
        }
      };
      log("Sending...");
      setTimeout(() => ws.close(), 700);
      setTimeout(() => send("Something"), 200);
      setTimeout(() => send("another thing"), 500);
      setTimeout(() => {
        log("Last message sent");
        send("one other thing, expect to fail");
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
    expect(messages).toEqual(["Something", "another thing"]);
  });
});
