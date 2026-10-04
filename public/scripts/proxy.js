const { ScramjetController } = $scramjetLoadController();

export const scramjet = new ScramjetController({
  files: {
    wasm: "/scram/scramjet.wasm.wasm",
    all: "/scram/scramjet.all.js",
    sync: "/scram/scramjet.sync.js",
  },
});

const controllerReady = scramjet.init();
const bareMuxConnection = new BareMux.BareMuxConnection("/baremux/worker.js");

export function registerWorkerEarly(onError) {
  navigator.serviceWorker.register("./sw.js").catch(onError);
}

export async function ensureProxy() {
  await controllerReady;
  const registration = await navigator.serviceWorker.register("./sw.js");
  if (!registration.active) {
    await new Promise((resolve) => {
      const worker = registration.installing || registration.waiting;
      if (!worker) return resolve();
      worker.addEventListener("statechange", () => {
        if (worker.state === "activated") resolve();
      });
    });
  }
  const wispUrl =
    (location.protocol === "https:" ? "wss" : "ws") +
    "://" +
    location.host +
    "/wisp/";
  if ((await bareMuxConnection.getTransport()) !== "/libcurl/index.mjs") {
    await bareMuxConnection.setTransport("/libcurl/index.mjs", [
      { websocket: wispUrl },
    ]);
  }
}
