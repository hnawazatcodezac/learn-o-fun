import { describe, expect, it } from 'vitest';
import { Family, ParentAccount } from './family';
import { AT, problems, uuid } from './testing';

const family = {
  id: uuid(1),
  market: 'GB',
  homeRegion: 'eu-1',
  timeZone: 'Europe/London',
  members: [
    { accountId: uuid(2), role: 'owner' },
    { accountId: uuid(3), role: 'caregiver' },
  ],
  createdAt: AT,
};

describe('Family', () => {
  it('accepts a family with one owner', () => {
    expect(problems(Family, family)).toEqual([]);
  });

  it('needs exactly one owner', () => {
    expect(
      problems(Family, { ...family, members: [{ accountId: uuid(2), role: 'guardian' }] }),
    ).toEqual([{ path: 'members', message: 'A family has exactly one owner; this one has 0' }]);
    expect(
      problems(Family, {
        ...family,
        members: [
          { accountId: uuid(2), role: 'owner' },
          { accountId: uuid(3), role: 'owner' },
        ],
      }),
    ).toEqual([{ path: 'members', message: 'A family has exactly one owner; this one has 2' }]);
  });

  it('rejects an unknown role and a bad region', () => {
    expect(
      problems(Family, { ...family, members: [{ accountId: uuid(2), role: 'child' }] })[0]?.path,
    ).toBe('members.0.role');
    expect(problems(Family, { ...family, homeRegion: 'Europe' })).toEqual([
      { path: 'homeRegion', message: 'Expected a region such as eu-1' },
    ]);
  });
});

describe('ParentAccount', () => {
  const account = {
    id: uuid(2),
    displayName: 'Sam',
    email: 'sam@example.com',
    uiLocale: 'en-GB',
    createdAt: AT,
  };

  it('accepts an account', () => {
    expect(problems(ParentAccount, account)).toEqual([]);
  });

  it('rejects a bad email', () => {
    expect(problems(ParentAccount, { ...account, email: 'sam' })).toEqual([
      { path: 'email', message: 'Expected an email address' },
    ]);
  });

  it('rejects any field it does not know, so no extra personal data slips in', () => {
    expect(problems(ParentAccount, { ...account, phone: '+44 7700 900000' })[0]?.message).toMatch(
      /Unrecognized key: "phone"/,
    );
  });
});
