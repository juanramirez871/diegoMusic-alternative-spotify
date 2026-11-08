type Listener = () => void;

const sessionExpiredListeners = new Set<Listener>();

/** Lets the auth layer react when the API rejects the stored session token. */
export const authEvents = {
  onSessionExpired(listener: Listener): () => void {
    sessionExpiredListeners.add(listener);
    return () => {
      sessionExpiredListeners.delete(listener);
    };
  },

  notifySessionExpired(): void {
    sessionExpiredListeners.forEach((listener) => listener());
  },
};
