"use client";

import { BadgeCheck, Check, LockKeyhole, PackageCheck, Truck } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

export type EscrowMilestone = 'PAID' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED';
export interface EscrowTimelineProps { currentStatus: EscrowMilestone; }

export function EscrowTimeline({ currentStatus }: EscrowTimelineProps) {
  const { t, locale } = useTranslation();
  const steps = [
    { key: 'PAID', label: t('escrow.paid'), desc: t('escrow.paidDesc'), icon: LockKeyhole },
    { key: 'SHIPPED', label: t('escrow.shipped'), desc: t('escrow.shippedDesc'), icon: Truck },
    { key: 'DELIVERED', label: t('escrow.delivered'), desc: t('escrow.deliveredDesc'), icon: PackageCheck },
    { key: 'COMPLETED', label: t('escrow.completed'), desc: t('escrow.completedDesc'), icon: BadgeCheck },
  ];
  const currentIndex = Math.max(0, steps.findIndex(step => step.key === currentStatus));
  return <ol className="escrow-steps" aria-label={locale === 'vi' ? 'Tiến trình ký quỹ' : 'Escrow progress'}>
    {steps.map((step, index) => {
      const Icon = index < currentIndex ? Check : step.icon;
      return <li key={step.key} className="escrow-step" data-complete={index <= currentIndex} aria-current={index === currentIndex ? 'step' : undefined}>
        <span className="step-icon"><Icon size={20} strokeWidth={1.7} aria-hidden="true" /></span>
        <div><p className="mb-1 text-[10px] font-semibold tracking-[.16em] text-muted">0{index + 1}</p><p className={`text-sm font-semibold ${index <= currentIndex ? 'text-ink' : 'text-muted'}`}>{step.label}</p><p className="mt-1.5 max-w-52 text-xs leading-5 text-muted">{step.desc}</p></div>
      </li>;
    })}
  </ol>;
}
