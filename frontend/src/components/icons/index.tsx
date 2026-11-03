import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/** Stroke icon base matching the 1.5px line icons used in the Figma file. */
const Stroke = ({ size = 18, children, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4-4" />
  </Stroke>
);

export const FilterIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 5h16l-6 7.5V19l-4-2v-4.5L4 5Z" />
  </Stroke>
);

export const RefreshIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 4v4.5h-4.5" />
  </Stroke>
);

export const StarIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Stroke {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="m12 3.8 2.47 5 5.53.8-4 3.9.94 5.5L12 16.4 7.06 19l.94-5.5-4-3.9 5.53-.8L12 3.8Z" />
  </Stroke>
);

export const ClockIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Stroke>
);

export const SendIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M20.5 3.5 10 14" />
    <path d="m20.5 3.5-6.5 17-4-6.5-6.5-4 17-6.5Z" />
  </Stroke>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m6 9 6 6 6-6" />
  </Stroke>
);

export const ChevronUpDownIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m8 9 4-4 4 4M8 15l4 4 4-4" />
  </Stroke>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </Stroke>
);

export const UploadIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </Stroke>
);

export const PaperclipIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m20 11.5-7.8 7.8a5 5 0 0 1-7.1-7.1l8.2-8.2a3.3 3.3 0 1 1 4.7 4.7l-8.2 8.2a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4" />
  </Stroke>
);

export const TrashIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </Stroke>
);

export const ArchiveIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="3.5" y="4" width="17" height="4.5" rx="1" />
    <path d="M5 8.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5M10 12.5h4" />
  </Stroke>
);

export const CalendarIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Stroke>
);

export const LogoutIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />
  </Stroke>
);

export const ExternalLinkIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </Stroke>
);

export const CloseIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Stroke>
);

export const CheckIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Stroke>
);

export const AlertIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8v4.5M12 16h.01" />
  </Stroke>
);

export const InboxIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3.5 13.5 6 5.5h12l2.5 8M3.5 13.5V18a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4.5M3.5 13.5h5l1.5 2.5h4l1.5-2.5h5" />
  </Stroke>
);

export const BoltIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z" />
  </Stroke>
);

export const UsersIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 19.5a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.3" />
  </Stroke>
);

/* ---------- Editor toolbar icons ---------- */

export const UndoIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Stroke>
);

export const RedoIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
  </Stroke>
);

export const TextSizeIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3 7V5h11v2M8.5 5v14M13 12v-1.5h8V12M17 10.5V19" />
  </Stroke>
);

export const BoldIcon = (p: IconProps) => (
  <Stroke {...p} strokeWidth={2}>
    <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />
  </Stroke>
);

export const ItalicIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M10 5h8M6 19h8M14.5 5l-5 14" />
  </Stroke>
);

export const UnderlineIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14" />
  </Stroke>
);

export const AlignIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />
  </Stroke>
);

export const ListOrderedIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M10 6h10M10 12h10M10 18h10M4 5h1.5v4M4 9h3M4 14.5a1.5 1.5 0 0 1 3 0c0 1.5-3 2-3 3.5h3" />
  </Stroke>
);

export const ListBulletIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="0.6" fill="currentColor" />
    <circle cx="4.5" cy="12" r="0.6" fill="currentColor" />
    <circle cx="4.5" cy="18" r="0.6" fill="currentColor" />
  </Stroke>
);

export const IndentIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M10 6h10M10 12h10M10 18h10M4 9l3 3-3 3" />
  </Stroke>
);

export const OutdentIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M10 6h10M10 12h10M10 18h10M7 9l-3 3 3 3" />
  </Stroke>
);

export const QuoteIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M5 17c2 0 3.5-1.5 3.5-3.5V7H4v6.5h4.5M15 17c2 0 3.5-1.5 3.5-3.5V7H14v6.5h4.5" />
  </Stroke>
);

export const CodeIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m8 7-5 5 5 5M16 7l5 5-5 5" />
  </Stroke>
);

export const StrikeIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 12h16M16.5 7.5C16 5.6 14.2 4.5 12 4.5c-2.6 0-4.5 1.4-4.5 3.4 0 1.2.6 2.1 1.8 2.8M8 16.5c.5 1.9 2.2 3 4.5 3 2.6 0 4.5-1.4 4.5-3.5 0-.6-.1-1.1-.4-1.5" />
  </Stroke>
);

/* ---------- Brand marks ---------- */

export const GoogleIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
    />
  </svg>
);

export const SlackIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#E01E5A" d="M6.2 14.6a2.1 2.1 0 1 1-2.1-2.1h2.1v2.1Zm1 0a2.1 2.1 0 0 1 4.2 0v5.3a2.1 2.1 0 1 1-4.2 0v-5.3Z" />
    <path fill="#36C5F0" d="M9.4 6.2a2.1 2.1 0 1 1 2.1-2.1v2.1H9.4Zm0 1a2.1 2.1 0 0 1 0 4.2H4.1a2.1 2.1 0 1 1 0-4.2h5.3Z" />
    <path fill="#2EB67D" d="M17.8 9.4a2.1 2.1 0 1 1 2.1 2.1h-2.1V9.4Zm-1 0a2.1 2.1 0 0 1-4.2 0V4.1a2.1 2.1 0 1 1 4.2 0v5.3Z" />
    <path fill="#ECB22E" d="M14.6 17.8a2.1 2.1 0 1 1-2.1 2.1v-2.1h2.1Zm0-1a2.1 2.1 0 0 1 0-4.2h5.3a2.1 2.1 0 1 1 0 4.2h-5.3Z" />
  </svg>
);
