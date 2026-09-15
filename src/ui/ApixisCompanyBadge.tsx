import { COMPANY_LINE } from '@/lib/branding';

export function ApixisCompanyBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(14,16,19,0.55)] px-2 py-[3px] text-[8px] font-light tracking-[0.16em] text-[rgba(230,232,236,0.58)] ${className}`}
    >
      {COMPANY_LINE}
    </span>
  );
}
