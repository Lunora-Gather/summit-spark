export function formatTime(value) {
  const number = Number(value);
  const totalHundredths = Number.isFinite(number) ? Math.max(0, Math.floor(number * 100)) : 0;
  const minutes = Math.floor(totalHundredths / 6000);
  const seconds = Math.floor((totalHundredths % 6000) / 100);
  const hundredths = totalHundredths % 100;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

export function formatDelta(value) {
  const number = Number(value);
  const safe = Number.isFinite(number) ? number : 0;
  const sign = safe <= 0 ? "-" : "+";
  const totalHundredths = Math.floor(Math.abs(safe) * 100);
  const seconds = Math.floor(totalHundredths / 100);
  const hundredths = totalHundredths % 100;
  return `${sign}${seconds}.${String(hundredths).padStart(2, "0")}`;
}

export function splitGrade(best, target) {
  const bestValue = Number(best);
  const targetValue = Number(target);
  if (!Number.isFinite(bestValue) || !Number.isFinite(targetValue) || bestValue <= 0 || targetValue <= 0) return "";
  if (bestValue <= targetValue) return "S";
  if (bestValue <= targetValue * 1.25) return "A";
  if (bestValue <= targetValue * 1.6) return "B";
  return "C";
}

export function formatLocalDateTime(value, fallback = "刚刚") {
  if (!value) return fallback;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
