export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function formatDateYmd(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function formatDateTimeLikeTracksolid(d, timeStr) {
  // timeStr: "HH:mm:ss"
  return `${formatDateYmd(d)} ${timeStr}`;
}

export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function monthStart(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function monthEnd(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

