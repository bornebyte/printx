export async function requestPrintNotifications() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "default") await Notification.requestPermission();
  return Notification.permission === "granted";
}

export function notifyPrintJob(printerName: string, printerCode: string) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  new Notification("PrintX job queued", {
    body: `Your document is queued at ${printerName} (${printerCode}).`,
    icon: "/favicon.ico",
  });
}
