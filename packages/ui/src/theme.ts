export type Theme = "light" | "dark";

/** Runs before first paint so both apps share the same persisted/system theme contract. */
export const themeScript = `(()=>{try{var t=localStorage.getItem("theme");var d=t||((window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches)?"light":"dark");document.documentElement.dataset.theme=d;}catch(e){document.documentElement.dataset.theme="dark";}})();`;
