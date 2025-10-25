// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    interface PageState {
      lastUpdated?: number;
    }
    interface PageData {}
    // interface Platform {}
  }
}

export {};
