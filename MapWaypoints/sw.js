const addResourcesToCache = async (resources) => {
    const cache = await caches.open("v1");
    await cache.addAll(resources);
};
  
self.addEventListener("install", (event) => {
    event.waitUntil(
        addResourcesToCache([
        "/MapWaypoints/",
        "/MapWaypoints/index.html",
        "/MapWaypoints/css/style.css",
        "/MapWaypoints/js/ui.js",
        "/MapWaypoints/thirdparty/leaflet/leaflet-src.esm.js",
        "/MapWaypoints/thirdparty/leaflet/leaflet-src.esm.js.map",
        "/MapWaypoints/thirdparty/leaflet/leaflet-src.js",
        "/MapWaypoints/thirdparty/leaflet/leaflet-src.js.map",
        "/MapWaypoints/thirdparty/leaflet/leaflet.css",
        "/MapWaypoints/thirdparty/leaflet/leaflet.js",
        "/MapWaypoints/thirdparty/leaflet/leaflet.js.map",
        ]),
    );
});