import { tashkentIsoDate, tashkentTomorrowIsoDate } from './tashkent-date';

describe('tashkent-date', () => {
  it('reads the Tashkent (UTC+5) calendar date, not the UTC one', () => {
    // 2026-10-07T20:30:00Z is still Oct 7 in UTC, but already Oct 8 in
    // Tashkent (UTC+5) — exactly the production scenario that made Apex_Box
    // reject our submitted date as "earlier than the current date".
    const lateUtcPreviousDay = new Date('2026-10-07T20:30:00.000Z');
    expect(tashkentIsoDate(lateUtcPreviousDay)).toBe('2026-10-08');
  });

  it('agrees with the plain UTC date well inside the day', () => {
    const midday = new Date('2026-10-08T10:00:00.000Z');
    expect(tashkentIsoDate(midday)).toBe('2026-10-08');
  });

  it("tomorrow's date is exactly one day after today's, even across the UTC/Tashkent boundary", () => {
    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-10-07T20:30:00.000Z').getTime());

    expect(tashkentTomorrowIsoDate()).toBe('2026-10-09');

    nowSpy.mockRestore();
  });
});
