export const notifyBaggagesChanged = () => {
  window.dispatchEvent(new CustomEvent("app_baggages_changed"));
  try {
    localStorage.setItem("app_baggages_sync_time", Date.now().toString());
  } catch (e) {
    // Ignore storage errors
  }
};

export const subscribeBaggagesChanged = (callback: () => void, pollIntervalMs = 2500) => {
  const handleEvent = () => callback();

  const handleStorage = (e: StorageEvent) => {
    if (e.key === "app_baggages_sync_time") {
      callback();
    }
  };

  window.addEventListener("app_baggages_changed", handleEvent);
  window.addEventListener("storage", handleStorage);
  window.addEventListener("focus", handleEvent);

  let intervalId: any = null;
  if (pollIntervalMs > 0) {
    intervalId = setInterval(callback, pollIntervalMs);
  }

  return () => {
    window.removeEventListener("app_baggages_changed", handleEvent);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("focus", handleEvent);
    if (intervalId) clearInterval(intervalId);
  };
};
