// Both Asia Insurance partners (osago_v3 and Apex_Box) validate dates we
// send them (issueDate/startDate) against their own server's current date,
// which is Uzbekistan local time (UTC+5, no DST) — not UTC. Render's
// containers run in UTC, so `new Date().toISOString().slice(0, 10)` lags a
// full calendar day behind Tashkent for the five hours between midnight and
// 5am Tashkent time (19:00–24:00 UTC the previous day), submitting a date
// the partner then rejects as "cannot be earlier than the current date" —
// confirmed in production (Apex_Box result_message, 2026-10-08 ~01:20
// Tashkent time). Use these instead of a raw toISOString() wherever a date
// is sent to either partner.
const TASHKENT_TIME_ZONE = 'Asia/Tashkent';

export function tashkentIsoDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TASHKENT_TIME_ZONE,
  }).format(date);
}

export function tashkentTodayIsoDate(): string {
  return tashkentIsoDate(new Date());
}

export function tashkentTomorrowIsoDate(): string {
  return tashkentIsoDate(new Date(Date.now() + 86_400_000));
}
