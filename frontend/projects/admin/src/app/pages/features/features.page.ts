import { Dialog } from '@angular/cdk/dialog';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ADMIN_PLATFORM_API,
  AdminFeature,
  AdminFeaturesStore,
  AdminSessionStore,
  FEATURE_ABOUT,
  FEATURE_TAB,
  Toaster,
  accentOf,
  modeSavedToast,
  reachText,
  sinceText,
  type PopkinColour,
} from 'api';
import {
  Button,
  EmptyState,
  FeatureModeChoice,
  FeaturePanel,
  FeaturePanelPopkin,
  Icon,
  PageHead,
  Panel,
} from 'components';
import { FeatureAddPopkinDialog } from '../../dialogs/feature-add-popkin/feature-add-popkin.dialog';
import { FeatureModeData, FeatureModeDialog } from '../../dialogs/feature-mode/feature-mode.dialog';

interface FeatureView {
  feature: AdminFeature;
  reach: string;
  since: string | null;
  about: string;
  chosen: FeaturePanelPopkin[];
}

/**
 * Features (L2-076): who has Plan and Schedules. Choosing a mode or adding a Popkin opens its
 * dialog; it never saves without one. Removing a chosen Popkin asks nothing.
 */
@Component({
  selector: 'pk-features-page',
  imports: [Button, EmptyState, FeaturePanel, Icon, PageHead, Panel, RouterLink],
  providers: [AdminFeaturesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './features.page.html',
})
export class FeaturesPage {
  protected readonly store = inject(AdminFeaturesStore);
  private readonly api = inject(ADMIN_PLATFORM_API);
  private readonly session = inject(AdminSessionStore);
  private readonly dialog = inject(Dialog);
  private readonly toaster = inject(Toaster);
  private readonly document = inject(DOCUMENT);
  private readonly timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  /** Why the signed-in admin cannot change a switch, or null when they can (L2-076 AC12). */
  protected readonly blocked = computed(() => this.session.blockedReason('ChangeFeature'));

  protected readonly views = computed<FeatureView[]>(() => {
    const now = new Date();
    return this.store.features().map((feature) => ({
      feature,
      reach: reachText(feature),
      since: sinceText(feature, now, this.timeZone),
      about: FEATURE_ABOUT[feature.feature],
      chosen: feature.chosen.map((p) => ({
        id: p.popkinId,
        name: p.name,
        emoji: p.emoji,
        accent: accentOf(p.colour as PopkinColour),
      })),
    }));
  });

  constructor() {
    this.store.load();
  }

  protected chose(feature: AdminFeature, choice: FeatureModeChoice): void {
    const ref = this.dialog.open<AdminFeature, FeatureModeData>(FeatureModeDialog, {
      data: { feature, mode: choice.mode },
      ...this.dialogConfig('#keep'),
    });
    ref.closed.subscribe((saved) => {
      if (!saved) {
        choice.revert();
        return;
      }
      this.store.saved(saved);
      const [title, text] = modeSavedToast(saved.feature, saved.mode);
      this.toaster.show('success', title, text);
    });
  }

  protected add(feature: AdminFeature): void {
    const opener = this.document.activeElement as HTMLElement | null;
    const ref = this.dialog.open<AdminFeature, AdminFeature>(FeatureAddPopkinDialog, {
      data: feature,
      ...this.dialogConfig('input[type="search"]'),
    });
    ref.closed.subscribe((saved) => {
      opener?.focus();
      if (!saved) return;
      const added = saved.chosen.find(
        (p) => !feature.chosen.some((c) => c.popkinId === p.popkinId),
      );
      this.store.saved(saved);
      if (added) {
        this.toaster.show(
          'success',
          `${added.name} has ${saved.feature}`,
          `It gets the ${FEATURE_TAB[saved.feature]} tab within a minute.`,
        );
      }
    });
  }

  protected remove(feature: AdminFeature, popkin: FeaturePanelPopkin): void {
    this.api.removePopkin(feature.feature, popkin.id).subscribe({
      next: (saved) => {
        this.store.saved(saved);
        this.toaster.show('success', `${popkin.name} no longer has ${feature.feature}`);
      },
      error: () =>
        this.toaster.show('danger', 'That didn’t go through', 'Nothing has changed; try again.'),
    });
  }

  private dialogConfig(focus: string) {
    return {
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      autoFocus: focus,
      // pk-dialog draws its own backdrop, as the mocks do.
      hasBackdrop: false,
      ariaModal: true,
    };
  }
}
