/** A promise that resolves once the page shell is built and the entrance transition may begin. */
let resolve;
export const ready = new Promise((r) => { resolve = r; });
export const markReady = () => { document.documentElement.classList.add('is-ready'); resolve(); };
