import { chatUrl, people, popkinId, saturday } from '../fixtures/chat';
import { homeNow, homeUrl, maraAtHome, theFourteen } from '../fixtures/home';
import { expect, test } from '../fixtures/pk-test';
import { GroupChatPage } from '../pages/group-chat.page';
import { NotFoundPage } from '../pages/not-found.page';
import { PopkinHomePage } from '../pages/popkin-home.page';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: homeNow });
});

test.describe('the header of the Popkin home', () => {
  // L2-019 AC1
  test('shows the emoji, the name, four avatars, the member count and the time left', async ({
    page,
  }) => {
    await maraAtHome(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.root).toBeVisible();
    await expect(home.heading).toHaveText('Lakeside Weekend');
    await expect(home.tile).toHaveText('🏕️');
    await expect(home.screen).toHaveAttribute('data-accent', 'teal');
    await expect(home.avatars).toHaveCount(4);
    await expect(home.moreAvatars).toHaveText('+10');
    await expect(home.memberCount).toHaveText('14 members');
    await expect(home.timeLeft).toHaveText('1 day 6 hrs left · Wraps up Sun, 6 pm');
  });

  // L2-019 AC1
  test('shows no time left for a Popkin without an end date', async ({ page }) => {
    await maraAtHome(page, (home) => (home.popkin.endsAt = null));
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.heading).toHaveText('Lakeside Weekend');
    await expect(home.timeLeft).toHaveCount(0);
  });

  // L2-019 AC1
  test('shows one avatar and "1 member" when the Host is alone', async ({ page }) => {
    await maraAtHome(page, (home) => home.justTheHost());
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.avatars).toHaveCount(1);
    await expect(home.moreAvatars).toHaveCount(0);
    await expect(home.memberCount).toHaveText('1 member');
  });

  // L2-044 AC5
  test('the time left moves on as the minutes pass', async ({ page }) => {
    await maraAtHome(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    await expect(home.timeLeft).toHaveText('1 day 6 hrs left · Wraps up Sun, 6 pm');

    await page.clock.runFor(61_000);

    await expect(home.timeLeft).toHaveText('1 day 5 hrs left · Wraps up Sun, 6 pm');
  });

  // L2-019 AC2
  test('offers Group call, which opens the call, and Invite', async ({ page }) => {
    await maraAtHome(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.groupCall).toHaveAttribute('href', `/p/${popkinId}/call`);
    await expect(home.invite).toBeVisible();
  });

  // The way back to the member's Popkins: in the header on a phone, in the rail from 768 px
  test('leads back to My Popkins on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await maraAtHome(page);
    await page.goto(homeUrl);

    await expect(new PopkinHomePage(page).myPopkins).toHaveAttribute('href', '/popkins');
  });

  // L2-056: the screen says it is loading, and the tabs are already there
  test('says "Loading this Popkin…" over skeletons until the Popkin answers', async ({ page }) => {
    const fixture = await maraAtHome(page);
    const release = fixture.hold('popkin');
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.loading).toBeAttached();
    await expect(home.skeletons.first()).toBeVisible();
    await expect(home.tabs).toHaveText(['Home', 'Chat', 'Photos', 'Experiences']);

    release();

    await expect(home.heading).toHaveText('Lakeside Weekend');
    await expect(home.loading).toHaveCount(0);
  });

  // L2-051 AC1
  test('is the not-found screen for someone who is not a member', async ({ page }) => {
    await maraAtHome(page, (home) => home.fail('popkin', 'not-found'));
    await page.goto(homeUrl);

    await expect(new NotFoundPage(page).root).toBeVisible();
    await expect(page).toHaveURL(homeUrl);
  });

  // L2-056
  test('says "We couldn’t open this Popkin" when it cannot be read, and Try again opens it', async ({
    page,
  }) => {
    const fixture = await maraAtHome(page, (home) => home.fail('popkin'));
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.error).toContainText('We couldn’t open this Popkin');
    await expect(home.error).toContainText(
      'It’s still there. Check your connection and try again.',
    );
    await expect(home.toMyPopkins).toHaveAttribute('href', '/popkins');

    fixture.recover('popkin');
    await home.tryAgain.click();

    await expect(home.heading).toHaveText('Lakeside Weekend');
    await expect(home.memberRows.first()).toBeVisible();
  });
});

test.describe('the members of the Popkin home', () => {
  // L2-019 AC6
  test('lists the count and the members, the Host first and labelled, the viewer marked', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await maraAtHome(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.meta(home.members)).toHaveText('14');
    await expect(home.memberNames).toHaveText([
      'Mara Okafor (you)',
      'Walt Brennan',
      'Dev Patel',
      'Ellie Brennan',
      'Ruth Lindqvist',
      'Sam Ortega',
    ]);
    await expect(home.hostLabel).toHaveText('Host');
    await expect(home.memberRows.locator('.row__role')).toHaveCount(1);
  });

  // L2-058 AC12: a narrower screen shows fewer of the same members
  test('shows the first four on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await maraAtHome(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.memberNames.filter({ visible: true })).toHaveText([
      'Mara Okafor (you)',
      'Walt Brennan',
      'Dev Patel',
      'Ellie Brennan',
    ]);
  });

  // L2-014 AC5, L2-047 AC2: someone joining shows without a reload
  test('counts and lists someone who joins while the home is open', async ({ page, hub }) => {
    const fixture = await maraAtHome(page, (home) => {
      home.members = theFourteen.slice(0, 3);
      home.popkin.memberCount = 3;
    });
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    await expect(home.memberCount).toHaveText('3 members');
    await hub.connected();

    await fixture.joins(hub, 'Nia Clarke', 'NC');

    await expect(home.memberCount).toHaveText('4 members');
    await expect(home.meta(home.members)).toHaveText('4');
    await expect(home.memberNames.last()).toHaveText('Nia Clarke');
  });

  // L2-047 AC2: someone leaving shows without a reload
  test('counts one member fewer, and lists them no more, when someone leaves', async ({
    page,
    hub,
  }) => {
    const fixture = await maraAtHome(page, (home) => {
      home.members = theFourteen.slice(0, 3);
      home.popkin.memberCount = 3;
    });
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    await expect(home.memberCount).toHaveText('3 members');
    await hub.connected();

    await fixture.leaves(hub, 'Dev Patel');

    await expect(home.memberCount).toHaveText('2 members');
    await expect(home.meta(home.members)).toHaveText('2');
    await expect(home.memberNames.filter({ hasText: 'Dev Patel' })).toHaveCount(0);
  });
});

test.describe('the Chat card of the Popkin home', () => {
  // L2-019 AC3
  test('shows the three latest messages with sender, time and one line, and how many are new', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await maraAtHome(page, (home) => (home.latest = home.latest.slice(1)));
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    const lines = home.chatLines.filter({ visible: true });

    await expect(lines).toHaveCount(3);
    await expect(home.nameOf(lines.nth(0))).toHaveText('Walt');
    await expect(home.timeOf(lines.nth(0))).toHaveText('9:12');
    await expect(home.textOf(lines.nth(0))).toHaveText(
      'Pancakes at the main cabin, 8:30. Bring an appetite.',
    );
    await expect(home.nameOf(lines.nth(2))).toHaveText('Mara');
    await expect(home.newCount).toHaveText('3 new');
  });

  // L2-019 AC3: the three latest of four on a phone are the newest three
  test('keeps to the three latest on a phone and shows a fourth from 1024 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await maraAtHome(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    const lines = home.chatLines.filter({ visible: true });

    await expect(lines).toHaveCount(3);
    await expect(home.nameOf(lines.first())).toHaveText('Walt');
    await expect(home.nameOf(lines.last())).toHaveText('Mara');

    await page.setViewportSize({ width: 1024, height: 800 });

    await expect(lines).toHaveCount(4);
    await expect(home.nameOf(lines.first())).toHaveText('Dev');
  });

  // L2-019 AC3
  test('opens Chat when it is chosen', async ({ page }) => {
    await maraAtHome(page);
    await page.goto(homeUrl);

    await new PopkinHomePage(page).chatCard.click();

    await expect(page).toHaveURL(chatUrl);
    await expect(new GroupChatPage(page).root).toBeVisible();
  });

  // L2-019 AC3
  test('shows no count when nothing is new', async ({ page }) => {
    await maraAtHome(page, (home) => {
      home.newCount = 0;
      home.popkin.unreadCount = 0;
    });
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.chatLines.first()).toBeVisible();
    await expect(home.newCount).toHaveCount(0);
    await expect(home.unreadCount).toHaveCount(0);
  });

  // L2-027 AC3, L2-019 AC7
  test('the count on the card and on the Chat tab rises when a message arrives', async ({
    page,
    hub,
  }) => {
    const fixture = await maraAtHome(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    await expect(home.newCount).toHaveText('3 new');
    await expect(home.unreadCount).toHaveText('3');
    await hub.connected();

    await fixture.arrives(hub, people.walt, 'Kettle is on', saturday(12, 1));

    await expect(home.newCount).toHaveText('4 new');
    await expect(home.unreadCount).toHaveText('4');
    await expect(home.textOf(home.chatLines.filter({ visible: true }).last())).toHaveText(
      'Kettle is on',
    );
  });

  // L2-052: a message is text, never markup
  test('shows a message as the text it is', async ({ page }) => {
    await maraAtHome(page, (home) => {
      home.latest[3] = {
        ...home.latest[3],
        text: '<img src=x onerror="document.title=1"><b>hi</b>',
      };
    });
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.textOf(home.chatLines.filter({ visible: true }).last())).toHaveText(
      '<img src=x onerror="document.title=1"><b>hi</b>',
    );
    await expect(page).not.toHaveTitle('1');
  });
});

test.describe('the Photos and Experiences sections of the Popkin home', () => {
  // L2-019 AC4
  test('Photos shows the count, the latest as thumbnails and See all', async ({ page }) => {
    await maraAtHome(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.meta(home.photos)).toHaveText('48 photos');
    await expect(home.thumbnails).toHaveCount(8);
    await expect(home.thumbnails.first()).toHaveAttribute(
      'href',
      `/p/${popkinId}/photos/00000000-0000-4000-a000-000000000001`,
    );
    await expect(home.thumbnails.first().getByRole('img')).toHaveAccessibleName(
      'First light on the dock. Worth the 6 am alarm.',
    );
    await expect(home.seeAll(home.photos)).toHaveAccessibleName('See all photos');
    await expect(home.seeAll(home.photos)).toHaveAttribute('href', `/p/${popkinId}/photos`);
  });

  // L2-019 AC5
  test('Experiences shows the count, the highest rated with its score, and See all', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await maraAtHome(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    const cards = home.experienceCards.filter({ visible: true });

    await expect(home.meta(home.experiences)).toHaveText('4 shared');
    await expect(cards).toHaveCount(1);
    await expect(home.titleOf(cards.first())).toHaveText('Sunrise canoe to Heron Point');
    await expect(home.ratingOf(cards.first())).toHaveText('4.7 · 11 ratings');
    await expect(cards.first()).toHaveAttribute(
      'href',
      `/p/${popkinId}/experiences/00000000-0000-4000-b000-000000000001`,
    );
    await expect(home.seeAll(home.experiences)).toHaveAccessibleName('See all experiences');
    await expect(home.seeAll(home.experiences)).toHaveAttribute(
      'href',
      `/p/${popkinId}/experiences`,
    );
  });

  // L2-058 AC12: a wider screen shows more of the same
  test('Experiences shows the three highest rated from 768 px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await maraAtHome(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    const cards = home.experienceCards.filter({ visible: true });

    await expect(cards).toHaveCount(3);
    await expect(home.titleOf(cards.nth(1))).toHaveText('La Paloma Taqueria');
    await expect(home.ratingOf(cards.nth(2))).toHaveText('4.3 · 8 ratings');
  });

  // L2-019 AC8
  test('each section of a new Popkin says what it is for and offers its first action', async ({
    page,
  }) => {
    await maraAtHome(page, (home) => home.justTheHost());
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.chat).toContainText('It’s just you so far');
    await expect(home.chat).toContainText(
      'Share the QR code so your people can pop in, or say the first hello.',
    );
    await expect(home.invitePeople).toBeVisible();
    await expect(home.sayHello).toHaveAttribute('href', chatUrl);
    await expect(home.photos).toContainText('No photos yet');
    await expect(home.photos).toContainText('The album fills up as people add to it.');
    await expect(home.addTheFirstPhoto).toHaveAttribute('href', `/p/${popkinId}/photos`);
    await expect(home.meta(home.photos)).toHaveCount(0);
    await expect(home.experiences).toContainText('Nothing shared yet');
    await expect(home.experiences).toContainText(
      'Things you did, places you ate, ideas for next time.',
    );
    await expect(home.shareOne).toHaveAttribute('href', `/p/${popkinId}/experiences`);
    await expect(home.memberNames).toHaveText(['Mara Okafor (you)']);
  });

  // L2-019 AC8: "Say hello" puts the member where they can write
  test('Say hello opens the Everyone thread with the message field ready', async ({ page }) => {
    await maraAtHome(page, (home) => home.justTheHost());
    await page.goto(homeUrl);

    await new PopkinHomePage(page).sayHello.click();

    await expect(page).toHaveURL(chatUrl);
    await expect(new GroupChatPage(page).field).toBeFocused();
  });
});

test.describe('a section of the Popkin home that fails', () => {
  // L2-019 AC9
  test('says so with Try again while the other sections still show', async ({ page }) => {
    const fixture = await maraAtHome(page, (home) => home.fail('photos'));
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    // Once connected the home reads itself again; the section still fails then.
    await expect.poll(() => fixture.asked.photos).toBe(2);

    await expect(home.failureOf(home.photos)).toContainText(
      'Photos didn’t load. The rest of the Popkin is fine.',
    );
    await expect(home.chatLines.first()).toBeVisible();
    await expect(home.experienceCards.first()).toBeVisible();
    await expect(home.memberRows.first()).toBeVisible();
    await expect(home.heading).toHaveText('Lakeside Weekend');

    fixture.recover('photos');
    const before = { ...fixture.asked };
    await home.tryAgainIn(home.photos).click();

    await expect(home.thumbnails).toHaveCount(8);
    await expect(home.failureOf(home.photos)).toHaveCount(0);
    // Only the section that failed is read again.
    expect(fixture.asked).toEqual({ ...before, photos: before.photos + 1 });
  });

  // L2-019 AC9
  for (const [read, name, text] of [
    ['preview', 'Chat', 'Chat didn’t load. The rest of the Popkin is fine.'],
    ['experiences', 'Experiences', 'Experiences didn’t load. The rest of the Popkin is fine.'],
    ['members', 'Members', 'Members didn’t load. The rest of the Popkin is fine.'],
  ] as const) {
    test(`${name} failing says "${text}"`, async ({ page }) => {
      const fixture = await maraAtHome(page, (home) => home.fail(read));
      await page.goto(homeUrl);
      const home = new PopkinHomePage(page);
      const section = read === 'preview' ? home.chat : home.section(name);
      // Once connected the home reads itself again; the section still fails then.
      await expect.poll(() => fixture.asked[read]).toBe(2);

      await expect(home.failureOf(section)).toContainText(text);
      await expect(home.thumbnails.first()).toBeVisible();

      fixture.recover(read);
      await home.tryAgainIn(section).click();

      await expect(home.failureOf(section)).toHaveCount(0);
    });
  }
});

test.describe('the tabs and the layout of the Popkin home', () => {
  // L2-019 AC7
  test('shows the four tabs with Home current and the unread count on Chat', async ({ page }) => {
    await maraAtHome(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.tabs).toHaveText(['Home', 'Chat', 'Photos', 'Experiences']);
    await expect(home.currentTab).toHaveText('Home');
    await expect(home.chatTab).toHaveAccessibleName(/3 unread messages/);
  });

  // L2-019 AC7, L2-058 AC8: the tabs are along the bottom of a phone
  test('shows the tabs on a phone too', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await maraAtHome(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.tabs).toHaveText(['Home', 'Chat', 'Photos', 'Experiences']);
    await expect(home.tabs.first()).toBeVisible();
    await expect(home.currentTab).toHaveText('Home');
    await expect(home.unreadCount).toHaveText('3');
  });

  // L2-058 AC8
  test('is one column on a phone and two from 1024 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await maraAtHome(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    await expect(home.memberRows.first()).toBeVisible();

    expect(await home.columns()).toBe(1);

    await page.setViewportSize({ width: 1024, height: 800 });

    expect(await home.columns()).toBe(2);
    await expect(home.sidebarTimeLeft).toHaveText('1 day 6 hrs left');
  });
});
