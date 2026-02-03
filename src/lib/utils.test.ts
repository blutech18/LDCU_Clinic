import { describe, it, expect } from 'vitest';
import { formatDate, formatTime, formatLocalDate, getWeekBounds, calculateAge } from './utils';

describe('Utility Functions', () => {
    describe('formatDate', () => {
        it('formats date correctly', () => {
            // Logic produces full month name due to 'long' option
            expect(formatDate('2024-01-01')).toBe('January 1, 2024');
        });
    });

    describe('formatTime', () => {
        it('formats 24h time to 12h AM/PM', () => {
            expect(formatTime('13:00')).toBe('1:00 PM');
            expect(formatTime('09:30')).toBe('9:30 AM');
            expect(formatTime('00:00')).toBe('12:00 AM');
        });
    });

    describe('formatLocalDate', () => {
        it('formats date object to YYYY-MM-DD', () => {
            // Use specific date to avoid timezone issues in testing if possible
            // Or construct date such that local parts are 2024-01-01
            const date = new Date(2024, 0, 1);
            const formatted = formatLocalDate(date);
            expect(formatted).toBe('2024-01-01');
        });
    });

    describe('getWeekBounds', () => {
        it('returns start and end of week', () => {
            // Jan 10 2024 is Wednesday. Week should be Mon Jan 8 to Fri Jan 12 (or similar span)
            const date = new Date(2024, 0, 10);
            const bounds = getWeekBounds(date);

            // formatLocalDate returns YYYY-MM-DD
            expect(formatLocalDate(bounds.start)).toBe('2024-01-08');

            // The util adds +4 days. 8 + 4 = 12. So ends on Friday.
            expect(formatLocalDate(bounds.end)).toBe('2024-01-12');
        });
    });

    describe('calculateAge', () => {
        it('calculates age correctly', () => {
            const today = new Date();
            const year = today.getFullYear() - 20;
            const dob = `${year}-01-01`;
            expect(calculateAge(dob)).toBe(20);
        });
    });
});
