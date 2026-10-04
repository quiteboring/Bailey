importScripts("/scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

const AD_HOSTS = [
  "doubleclick.net",
  "googlesyndication.com",
  "googleadservices.com",
  "googleadsyndication.com",
  "googletagservices.com",
  "amazon-adsystem.com",
  "pubmatic.com",
  "rubiconproject.com",
  "criteo.com",
  "criteo.net",
  "outbrain.com",
  "taboola.com",
  "revcontent.com",
  "mgid.com",
  "adnxs.com",
  "adsrvr.org",
  "moatads.com",
  "advertising.com",
  "adform.net",
  "adform.com",
  "smartadserver.com",
  "openx.net",
  "openx.com",
  "mathtag.com",
  "popads.net",
  "popcash.net",
  "propellerads.com",
  "adsterra.com",
  "exoclick.com",
  "scorecardresearch.com",
  "quantserve.com",
];

function realHostname(requestUrl) {
  try {
    const u = new URL(requestUrl);
    const m = u.pathname.match(/^\/scramjet\/(.+)$/);

    return new URL(
      m ? decodeURIComponent(m[1]) : requestUrl,
    ).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isAd(requestUrl) {
  const host = realHostname(requestUrl);

  return (
    host !== "" && AD_HOSTS.some((d) => host === d || host.endsWith("." + d))
  );
}

async function handleRequest(event) {
  if (isAd(event.request.url)) {
    return new Response(null, { status: 204 });
  }

  await scramjet.loadConfig();

  if (scramjet.route(event)) {
    return scramjet.fetch(event);
  }

  return fetch(event.request);
}

self.addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event));
});
