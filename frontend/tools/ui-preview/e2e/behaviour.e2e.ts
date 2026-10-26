import { expect, test } from '@playwright/test';

test.describe('Dialog', () => {
  test('opens as a modal with focus inside, closes on Escape, and returns focus', async ({
    page,
  }) => {
    await page.goto('/?component=dialog');
    const dialog = page.getByRole('dialog', { name: 'Time for a break?' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    const opener = page.getByRole('button', { name: 'Open the dialog' });
    await opener.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('closes from its close button and from an action inside it', async ({ page }) => {
    await page.goto('/?component=dialog');
    const dialog = page.getByRole('dialog');

    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole('button', { name: 'Open the dialog' }).click();
    await dialog.getByRole('button', { name: 'Keep going' }).click();
    await expect(dialog).toBeHidden();
  });

  test('opens as a true modal, which makes the page behind it inert', async ({ page }) => {
    await page.goto('/?component=dialog');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    expect(await dialog.evaluate((element) => element.matches(':modal'))).toBe(true);
  });
});

test.describe('Toast', () => {
  test('hides itself after 8 seconds', async ({ page }) => {
    await page.clock.install();
    await page.goto('/?component=toast');
    const status = page.getByRole('status');
    await expect(status.getByText('Settings saved')).toBeVisible();

    await page.clock.fastForward(8_000);

    await expect(status.getByText('Settings saved')).toBeHidden();
  });

  test('pauses while the pointer is over it', async ({ page }) => {
    await page.clock.install();
    await page.goto('/?component=toast');
    const toast = page.getByRole('status').getByText('Goal updated');

    await toast.hover();
    await page.clock.fastForward(20_000);
    await expect(toast).toBeVisible();

    await page.mouse.move(0, 0);
    await page.clock.fastForward(8_000);
    await expect(toast).toBeHidden();
  });

  test('can be dismissed, and new messages are announced in the status region', async ({
    page,
  }) => {
    await page.goto('/?component=toast');
    const status = page.getByRole('status');

    await status.getByRole('button', { name: 'Dismiss message' }).first().click();
    await expect(status.getByText('Settings saved')).toBeHidden();

    await page.getByRole('button', { name: 'Show a message' }).click();
    await expect(status.getByText('Settings saved')).toBeVisible();
  });
});

test.describe('AvatarPicker', () => {
  test('is one radio group whose choice moves with the arrow keys', async ({ page }) => {
    await page.goto('/?component=avatar-picker');
    const group = page.getByRole('group', { name: 'Choose your picture' });
    await expect(group.getByRole('radio', { name: 'Square' })).toBeChecked();

    await group.getByRole('radio', { name: 'Square' }).focus();
    await page.keyboard.press('ArrowRight');

    await expect(group.getByRole('radio', { name: 'Triangle' })).toBeChecked();
    await expect(group.getByRole('radio', { name: 'Square' })).not.toBeChecked();
  });

  test('changes the choice on tap', async ({ page }) => {
    await page.goto('/?component=avatar-picker');

    await page.getByRole('radio', { name: 'Heart' }).click({ force: true });

    await expect(page.getByRole('radio', { name: 'Heart' })).toBeChecked();
  });
});

test.describe('SkillStatus', () => {
  test('names every status in words, with Early signal when evidence is short', async ({
    page,
  }) => {
    await page.goto('/?component=skill-status&band=parent');

    for (const word of [
      'Not started',
      'Exploring',
      'Building',
      'Strong',
      'Mastered',
      'Review due',
    ]) {
      await expect(page.getByText(word, { exact: true })).toHaveCount(word === 'Exploring' ? 2 : 1);
    }
    await expect(page.getByText('Early signal')).toBeVisible();
  });
});

test.describe('ActivityCard', () => {
  test('is one button per card, named by its kind, title and length', async ({ page }) => {
    await page.goto('/?component=activity-card');

    await expect(page.getByRole('button')).toHaveCount(4);
    await expect(
      page.getByRole('button', { name: 'Review Number bonds to 10 About 4 minutes' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tile Farm About 1 minute' })).toBeVisible();
  });
});

test.describe('ProgressTrail', () => {
  test('tells screen readers which question the child is on', async ({ page }) => {
    await page.goto('/?component=progress-trail&band=early-primary');

    for (const name of ['Question 1 of 5', 'Question 6 of 8', 'Question 6 of 6']) {
      await expect(page.getByRole('img', { name })).toBeVisible();
    }
    await expect(page.getByText('6 of 8', { exact: true })).toBeVisible();
  });

  test('shows the count from age 6, and the dots only for ages 3 to 5', async ({ page }) => {
    await page.goto('/?component=progress-trail&band=early-years');

    await expect(page.getByRole('img', { name: 'Question 6 of 8' })).toBeVisible();
    await expect(page.getByText('6 of 8', { exact: true })).toBeHidden();
  });
});

test.describe('Feedback', () => {
  test('announces each kind of feedback in a status region', async ({ page }) => {
    await page.goto('/?component=feedback');

    for (const message of ['That’s it!', 'Nearly. Have another go!', 'Here’s a hint.']) {
      await expect(page.getByRole('status').filter({ hasText: message })).toBeVisible();
    }
  });
});

test.describe('Celebration', () => {
  test('announces the cheer in a status region', async ({ page }) => {
    await page.goto('/?component=celebration');

    await expect(page.getByRole('status').filter({ hasText: 'You did it!' })).toBeVisible();
  });

  test('plays the celebration burst unless motion is reduced', async ({ page }) => {
    const burstDuration = () =>
      page
        .locator('.lf-celebration__piece')
        .first()
        .evaluate((piece) => getComputedStyle(piece).animationDuration);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?component=celebration');
    expect(await burstDuration()).not.toBe('0s');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await burstDuration()).toBe('0s');
  });
});

test.describe('PicturePinPad', () => {
  test('fills a slot per picture, deletes the last one, and takes no fourth', async ({ page }) => {
    await page.goto('/?component=picture-pin');
    const pad = page.getByRole('group', { name: 'Robin’s picture PIN' });
    await expect(page.getByText('2 of 3 pictures chosen')).toBeAttached();

    await pad.getByRole('button', { name: 'Star' }).click();
    await expect(page.getByText('All three pictures chosen.')).toBeVisible();
    await expect(pad.getByRole('button', { name: 'Moon' })).toBeDisabled();

    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('2 of 3 pictures chosen')).toBeAttached();
    await expect(pad.getByRole('button', { name: 'Moon' })).toBeEnabled();
  });
});
