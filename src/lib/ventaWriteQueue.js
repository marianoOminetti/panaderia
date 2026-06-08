/**
 * Cola serializada para escrituras de ventas (register, sync offline, edit, entrega).
 * Evita races sin agregar queries extra.
 */
let tail = Promise.resolve();
let inFlight = 0;

export function enqueueVentaWrite(fn) {
  inFlight += 1;
  const run = tail.then(() => fn());
  tail = run.catch(() => {});
  return run.finally(() => {
    inFlight -= 1;
  });
}

export function isVentaWriteBusy() {
  return inFlight > 0;
}
