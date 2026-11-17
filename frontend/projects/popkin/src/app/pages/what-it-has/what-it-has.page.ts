import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import {
  ALWAYS_THERE,
  FEATURE_TEXT,
  NewPopkinCreator,
  NewPopkinDraft,
  PopkinFeature,
  accentOf,
} from 'api';
import { Alert, Button, Screen, SettingRow, SplitAside, Stack, TopBar } from 'components';

/**
 * The last step of starting a Popkin while a feature is offered: whether it has Plan and
 * Schedules, both on at first (L2-152). Opened with nothing offered, it goes back a step.
 */
@Component({
  selector: 'pk-what-it-has-page',
  imports: [Alert, Button, Screen, SettingRow, SplitAside, Stack, TopBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './what-it-has.page.html',
})
export class WhatItHasPage implements OnInit {
  private readonly store = inject(NewPopkinDraft);
  private readonly creator = inject(NewPopkinCreator);
  private readonly router = inject(Router);

  /** The features a new Popkin is offered, from the route's resolver (L2-152 AC1). */
  readonly offered = input<PopkinFeature[]>([]);

  protected readonly lead = `${ALWAYS_THERE} Switch on anything else it needs.`;
  protected readonly status = this.creator.status;
  protected readonly draft = this.store.draft;
  protected readonly accent = computed(() => accentOf(this.draft().colour));
  protected readonly rows = computed(() =>
    this.offered().map((feature) => ({
      feature,
      ...FEATURE_TEXT[feature],
      on: this.isOn(feature),
    })),
  );

  /** The picture beside the switches from 768 px: the tabs the Popkin will have. */
  protected readonly tabs = computed(() => {
    const has = (feature: PopkinFeature) => this.offered().includes(feature) && this.isOn(feature);
    return [
      'Home',
      'Chat',
      ...(has('Plan') ? ['Plan'] : []),
      ...(has('Schedules') ? ['Schedule'] : []),
      'Photos',
      'Experiences',
    ].join(' · ');
  });

  constructor() {
    this.creator.clear();
  }

  ngOnInit(): void {
    if (this.offered().length === 0) void this.router.navigateByUrl('/new/length');
  }

  protected toggle(feature: PopkinFeature, on: boolean): void {
    const features = { ...this.draft().features };
    if (feature === 'Plan') features.plan = on;
    else features.schedules = on;
    this.store.update({ features });
  }

  protected popItUp(): void {
    this.creator.popItUp(this.offered());
  }

  private isOn(feature: PopkinFeature): boolean {
    const features = this.draft().features;
    return feature === 'Plan' ? features.plan : features.schedules;
  }
}
