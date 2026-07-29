export function formatTime(value) {
  const totalHundredths = Math.max(0, Math.floor(value * 100));
  const minutes = Math.floor(totalHundredths / 6000);
  const seconds = Math.floor((totalHundredths % 6000) / 100);
  const hundredths = totalHundredths % 100;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

export function formatDelta(value) {
  const sign = value <= 0 ? "-" : "+";
  const totalHundredths = Math.floor(Math.abs(value) * 100);
  const seconds = Math.floor(totalHundredths / 100);
  const hundredths = totalHundredths % 100;
  return `${sign}${seconds}.${String(hundredths).padStart(2, "0")}`;
}

export function splitGrade(best, target) {
  if (!best || !target) return "";
  if (best <= target) return "S";
  if (best <= target * 1.25) return "A";
  if (best <= target * 1.6) return "B";
  return "C";
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
