import { assert, assertEquals } from "../../testing/asserts.ts";
import { TextProtoReader } from "../../textproto/mod.ts";
import { BufReader } from "../../io/bufio.ts";
import { connectWebSocket, WebSocket } from "../../ws/mod.ts";

let server: Deno.Process | undefined;
async function startServer(): Promise<void> {
  server = Deno.run({
    args: [Deno.execPath(), "--allow-net", "--allow-read", "server.ts"],
    cwd: "examples/chat",
    stdout: "piped"
  });
  try {
    assert(server.stdout != null);
    const r = new TextProtoReader(new BufReader(server.stdout));
    const s = await r.readLine();
    assert(s !== Deno.EOF && s.includes("chat server starting"));
  } catch {
    server.close();
  }
}

const { test } = Deno;

await startServer();

test("GET / should serve html", async () => {
  const resp = await fetch("http://0.0.0.0:8080/");
  assertEquals(resp.status, 200);
  assertEquals(resp.headers.get("content-type"), "text/html");
  const html = await resp.body.text();
  assert(html.includes("ws chat example"), "body is ok");
});

let ws: WebSocket | undefined;
test("GET /ws should upgrade conn to ws", async () => {
  ws = await connectWebSocket("http://0.0.0.0:8080/ws");
  const it = ws.receive();
  assertEquals((await it.next()).value, "Connected: [1]");
  ws.send("Hello");
  assertEquals((await it.next()).value, "[1]: Hello");
});
test("afterAll", () => {
  server?.close();
  ws?.conn.close();
});
