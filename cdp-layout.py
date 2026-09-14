# -*- coding: utf-8 -*-
import subprocess, json, asyncio, time, requests, websockets, base64
CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"
URL = "file:///C:/Users/16424/projects/p-bottle/prototype/techtree-layout-options.html"
PORT = 9229
OUT = "C:/Users/16424/projects/p-bottle/prototype/techtree-layout-options.png"
def start():
    return subprocess.Popen([CHROME, "--headless=new", "--no-sandbox", "--allow-file-access-from-files",
        "--window-size=1100,2100", f"--remote-debugging-port={PORT}", URL],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
def ws_url():
    for _ in range(30):
        try:
            for t in requests.get(f"http://127.0.0.1:{PORT}/json", timeout=2).json():
                if t.get("type") == "page":
                    return t["webSocketDebuggerUrl"]
        except Exception: pass
        time.sleep(0.3)
    raise RuntimeError("no target")
async def main():
    async with websockets.connect(ws_url(), max_size=10_000_000) as ws:
        mid = 0
        async def call(m, p=None):
            nonlocal mid; mid += 1
            await ws.send(json.dumps({"id": mid, "method": m, "params": p or {}}))
            while True:
                msg = json.loads(await ws.recv())
                if msg.get("id") == mid: return msg.get("result", {})
        await asyncio.sleep(1.5)
        r = await call("Page.captureScreenshot", {"format": "png"})
        with open(OUT, "wb") as f: f.write(base64.b64decode(r.get("data", "")))
        print("saved", OUT)
try:
    p = start(); asyncio.run(main())
finally:
    if 'p' in dir(): p.terminate()
