// Codigo propio que next-pwa agrega al service worker.

// La version anterior guardaba todo (imagenes de Cloudinary, paginas del
// catalogo) en la cache "app-shell", sin limite. Al activarse esta version se
// borra, para liberar el espacio en los celulares que ya la tenian.
const OBSOLETE_CACHES = ["app-shell"];

// Tipos minimos: los de "webworker" chocan con los del navegador en el mismo proyecto.
const worker = self as unknown as {
  addEventListener(type: "activate", listener: (event: { waitUntil(promise: Promise<unknown>): void }) => void): void;
};

worker.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all(OBSOLETE_CACHES.map((name) => caches.delete(name))));
});

export {};
