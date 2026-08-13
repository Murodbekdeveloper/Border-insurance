import { describe, expect, it } from 'vitest';
import {
  maskAlnumUpper,
  maskDigits,
  maskExpDate,
  maskLetters,
  maskLettersStrict,
  maskLettersUpper,
  maskPhoneUZ,
  maskPlateNumber,
  maskYear,
} from './masks';

describe('maskDigits', () => {
  it('strips non-digit characters and caps the length', () => {
    expect(maskDigits('12a34b567c89', 7)).toBe('1234567');
  });

  it('keeps short input untouched', () => {
    expect(maskDigits('123', 7)).toBe('123');
  });
});

describe('maskLetters', () => {
  it('strips digits and symbols but keeps spaces and apostrophes', () => {
    expect(maskLetters("Aziz123 Kar!mov$$ O'ktam", 60)).toBe("Aziz Karmov O'ktam");
  });
});

describe('maskLettersStrict', () => {
  it('keeps only uppercase Latin letters', () => {
    expect(maskLettersStrict('a1b2', 2)).toBe('AB');
  });
});

describe('maskLettersUpper', () => {
  it('uppercases and strips non-letters', () => {
    expect(maskLettersUpper('ali valiyev1', 40)).toBe('ALI VALIYEV');
  });
});

describe('maskAlnumUpper', () => {
  it('uppercases and strips symbols, keeping letters and digits', () => {
    expect(maskAlnumUpper('1hgcm82633a123456!!##', 17)).toBe('1HGCM82633A123456');
  });

  it('caps at maxLen after cleaning, not before', () => {
    // junk characters near the front must not eat into the length budget
    expect(maskAlnumUpper('a1b2c3', 4)).toBe('A1B2');
  });
});

describe('maskPlateNumber', () => {
  it('uppercases, strips punctuation, collapses double spaces', () => {
    expect(maskPlateNumber('01-a@123#aa!!')).toBe('01A123AA');
  });
});

describe('maskExpDate', () => {
  it('inserts the slash after two digits', () => {
    expect(maskExpDate('1230')).toBe('12/30');
  });

  it('clamps a month above 12 down to 12', () => {
    expect(maskExpDate('1399')).toBe('12/99');
  });

  it('clamps a month of 00 up to 01', () => {
    expect(maskExpDate('0099')).toBe('01/99');
  });

  it('pads a lone month digit greater than 1', () => {
    expect(maskExpDate('9')).toBe('09');
  });

  it('does not pad a lone leading 0 or 1 (still awaiting the second digit)', () => {
    expect(maskExpDate('1')).toBe('1');
  });
});

describe('maskYear', () => {
  it('keeps only digits and caps at 4', () => {
    expect(maskYear('20e2z1')).toBe('2021');
  });
});

describe('maskPhoneUZ', () => {
  it('locks the +998 prefix and keeps up to 9 trailing digits', () => {
    expect(maskPhoneUZ('abc9012345679xyz')).toBe('+998901234567');
  });

  it('handles a pasted value that already includes +998', () => {
    expect(maskPhoneUZ('+998901234567')).toBe('+998901234567');
  });

  it('never produces more than 9 digits after the prefix', () => {
    expect(maskPhoneUZ('9012345678901234')).toBe('+998901234567');
  });
});
