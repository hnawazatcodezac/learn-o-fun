import { expect, type Page } from '@playwright/test';
import {
  ALEX,
  ARI,
  named,
  passGate,
  playAs,
  ROBIN,
  SAM,
  signInAs,
  type TestLocale,
} from './helpers';

/*
 * Every screen of the app, each opened in a test locale with its data on screen, for the passes
 * that check them all: accessibility (FRONTEND-KICKOFF 15e) and right to left (15f).
 */

export const ACTIVITY = '/play?activity=hop-line-add-within-20';

export const withLocale = (path: string, locale: TestLocale) =>
  locale === 'en' ? path : `${path}${path.includes('?') ? '&' : '?'}locale=${locale}`;

export const cards = (page: Page) => page.getByRole('main').getByRole('listitem');

export interface Screen {
  name: string;
  /** Opens the screen in a locale and waits until it shows its data. */
  open: (page: Page, locale: TestLocale) => Promise<void>;
}

async function openPicker(page: Page, locale: TestLocale) {
  await page.goto(withLocale('/', locale));
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(2);
}

async function openToday(page: Page, locale: TestLocale) {
  await playAs(page, ROBIN);
  await page.goto(withLocale('/today', locale));
  await expect(cards(page)).toHaveCount(3);
}

async function openPlay(page: Page, locale: TestLocale) {
  await playAs(page, ROBIN);
  await page.goto(withLocale(ACTIVITY, locale));
  await expect(page.getByRole('slider')).toBeFocused();
}

async function openPaused(page: Page, locale: TestLocale) {
  await openPlay(page, locale);
  await page.getByRole('button', { name: named('Pause', locale) }).click();
  await expect(page.getByRole('dialog', { name: named('Paused', locale) })).toBeVisible();
}

/** A dashboard page, signed in as Sam, or as Alex, whose plan has room for another child. */
async function openDashboard(page: Page, path: string, locale: TestLocale, account = SAM) {
  await signInAs(page, account);
  await page.goto(withLocale(path, locale));
}

export const SCREENS: readonly Screen[] = [
  { name: 'the profile picker', open: openPicker },
  {
    name: 'the picture PIN',
    open: async (page, locale) => {
      await openPicker(page, locale);
      await page.getByRole('button', { name: /Ari/ }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    },
  },
  {
    name: 'the parental gate',
    open: async (page, locale) => {
      await openPicker(page, locale);
      await page.getByRole('button', { name: named('Grown-ups', locale) }).click();
      await expect(
        page.getByRole('dialog', { name: named('For grown-ups', locale) }),
      ).toBeVisible();
    },
  },
  { name: 'Today', open: openToday },
  {
    name: 'the library',
    open: async (page, locale) => {
      await playAs(page, ROBIN);
      await page.goto(withLocale('/library', locale));
      await expect(cards(page)).toHaveCount(5);
    },
  },
  {
    name: 'the grown-ups’ settings',
    open: async (page, locale) => {
      await openToday(page, locale);
      await page.getByRole('button', { name: named('Grown-ups', locale) }).click();
      await passGate(page, locale);
      await expect(
        page.getByRole('dialog', { name: named('Settings for Robin', locale) }),
      ).toBeVisible();
    },
  },
  { name: 'a game', open: openPlay },
  { name: 'the pause menu', open: openPaused },
  {
    name: 'the game’s settings',
    open: async (page, locale) => {
      await openPaused(page, locale);
      await page.getByRole('button', { name: named('Settings', locale) }).click();
      await passGate(page, locale);
      await expect(page.getByRole('dialog', { name: named('Settings', locale) })).toBeVisible();
    },
  },
  {
    name: 'the dashboard sign-in',
    open: async (page, locale) => {
      await page.goto(withLocale('/parent/login', locale));
      await expect(page.locator('main').getByRole('button')).toHaveCount(2);
    },
  },
  {
    name: 'the overview',
    open: async (page, locale) => {
      await openDashboard(page, '/parent', locale);
      await expect(page.locator('main').getByRole('heading', { level: 3 })).toHaveCount(2);
    },
  },
  {
    name: 'a child’s profile',
    open: async (page, locale) => {
      await openDashboard(page, `/parent/child?id=${ARI}`, locale);
      await expect(page.getByRole('main').getByRole('textbox').first()).toHaveValue('Ari');
    },
  },
  {
    name: 'adding a child',
    open: async (page, locale) => {
      await openDashboard(page, '/parent/children/new', locale, ALEX);
      await expect(page.getByRole('main').getByRole('textbox').first()).toBeVisible();
    },
  },
  {
    name: 'goals and time',
    open: async (page, locale) => {
      await openDashboard(page, `/parent/child/learning?id=${ARI}`, locale);
      await expect(page.getByRole('main').getByRole('combobox').first()).toBeVisible();
    },
  },
  {
    name: 'progress',
    open: async (page, locale) => {
      await openDashboard(page, `/parent/child/progress?id=${ROBIN}`, locale);
      await expect(page.locator('.parent-reasons__card')).toHaveCount(3);
    },
  },
  {
    name: 'session history',
    open: async (page, locale) => {
      await openDashboard(page, `/parent/child/sessions?id=${ROBIN}`, locale);
      await expect(page.locator('main .parent-session')).toHaveCount(21);
    },
  },
  {
    name: 'the plan',
    open: async (page, locale) => {
      await openDashboard(page, '/parent/plan', locale);
      await expect(page.getByTestId('plan-features').locator('dd')).toHaveCount(5);
    },
  },
];
