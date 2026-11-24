import type { SVGProps } from "react";

export type IconName =
  | "vault"
  | "lock"
  | "unlock"
  | "shield"
  | "sparkles"
  | "play"
  | "pause"
  | "download"
  | "library"
  | "film"
  | "blueprint"
  | "arrowRight"
  | "arrowUp"
  | "arrowDown"
  | "check"
  | "alert"
  | "x"
  | "plus"
  | "upload"
  | "link"
  | "clock"
  | "database"
  | "heart"
  | "comment"
  | "share"
  | "volume"
  | "volumeOff"
  | "trash"
  | "star"
  | "search"
  | "refresh"
  | "external"
  | "chevronDown"
  | "info"
  | "offline"
  | "online"
  | "bookmark"
  | "eye"
  | "music"
  | "more"
  | "camera"
  | "battery"
  | "sliders";

const paths: Record<IconName, React.ReactNode> = {
  vault: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="4" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 4v2M12 18v2M3 12h2M19 12h2" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10" rx="3" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
      <path d="M12 14v2.5" />
    </>
  ),
  unlock: (
    <>
      <rect x="4.5" y="10" width="15" height="10" rx="3" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 6.7-1.4" />
      <path d="M12 14v2.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 5 6v6c0 4 3 7.2 7 8.5 4-1.3 7-4.5 7-8.5V6l-7-2.5Z" />
      <path d="m9.2 12 2 2 3.6-3.8" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3.5 13.6 9 19 10.5 13.6 12 12 17.5 10.4 12 5 10.5 10.4 9 12 3.5Z" />
      <path d="M18 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </>
  ),
  play: <path d="M9 5.8v12.4a1 1 0 0 0 1.53.85l9-6.2a1 1 0 0 0 0-1.7l-9-6.2A1 1 0 0 0 9 5.8Z" />,
  pause: (
    <>
      <rect x="7" y="5" width="3.6" height="14" rx="1.2" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="1.2" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v10.5" />
      <path d="m7.8 10.5 4.2 4.2 4.2-4.2" />
      <path d="M5 18.5h14" />
    </>
  ),
  library: (
    <>
      <rect x="3.5" y="4.5" width="6" height="15" rx="2" />
      <rect x="11.5" y="4.5" width="4" height="15" rx="1.6" />
      <path d="m18 6.2 3 .8-2.2 11.6-2.4-.6" />
    </>
  ),
  film: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <path d="M3.5 9h17M3.5 15h17M9 4.5v15M15 4.5v15" />
    </>
  ),
  blueprint: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
      <path d="M3.5 9.5h17M9 9.5V20M14.5 15.5h6" />
    </>
  ),
  arrowRight: <path d="M4.5 12h15m-6-6 6 6-6 6" />,
  arrowUp: <path d="M12 19.5v-15m-6 6 6-6 6 6" />,
  arrowDown: <path d="M12 4.5v15m-6-6 6 6 6-6" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  alert: (
    <>
      <path d="M12 4 3 20h18L12 4Z" />
      <path d="M12 9.5v5M12 17.5v.5" />
    </>
  ),
  x: <path d="m5.5 5.5 13 13m0-13-13 13" />,
  plus: <path d="M12 5v14M5 12h14" />,
  upload: (
    <>
      <path d="M12 16V5.5" />
      <path d="M7.8 9.7 12 5.5l4.2 4.2" />
      <path d="M5 18.5h14" />
    </>
  ),
  link: (
    <>
      <path d="M10 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 1 0-5.7-5.7L11.4 6.4" />
      <path d="M14 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 1 0 5.7 5.7l1.2-1.2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 2" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  heart: (
    <path d="M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 7.5a4.1 4.1 0 0 1 7.5 3.1C19.5 15.6 12 20 12 20Z" />
  ),
  comment: <path d="M20.5 12a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1-4.4A8.5 8.5 0 1 1 20.5 12Z" />,
  share: (
    <>
      <path d="M14 4.5 20 10l-6 5.5V12c-5 0-7.5 2-9 5.5.3-5.4 2.6-8.6 9-9V4.5Z" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9.5h3L12 5v14L7 14.5H4v-5Z" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  volumeOff: (
    <>
      <path d="M4 9.5h3L12 5v14L7 14.5H4v-5Z" />
      <path d="m16 9.5 5 5m0-5-5 5" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M9 7V5h6v2M6.5 7l1 13h9l1-13" />
      <path d="M10.5 11v5M13.5 11v5" />
    </>
  ),
  star: <path d="m12 4 2.4 5.1 5.6.7-4.1 3.9 1 5.6-4.9-2.8-4.9 2.8 1-5.6L4 9.8l5.6-.7L12 4Z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4.5V10h-5.5" />
    </>
  ),
  external: (
    <>
      <path d="M14 4.5h5.5V10" />
      <path d="m19.5 4.5-8 8" />
      <path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
    </>
  ),
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.4" />
    </>
  ),
  offline: (
    <>
      <path d="M4 4.5 20 20.5" />
      <path d="M8.5 15.5a5 5 0 0 1 7 0" />
      <path d="M5.5 12a9 9 0 0 1 3-2M18.5 12a9 9 0 0 0-2.3-1.7" />
      <path d="M12 19v.2" />
    </>
  ),
  online: (
    <>
      <path d="M5.5 12a9 9 0 0 1 13 0" />
      <path d="M8.5 15.5a5 5 0 0 1 7 0" />
      <path d="M12 19v.2" />
    </>
  ),
  bookmark: <path d="M6.5 4.5h11v15l-5.5-4-5.5 4v-15Z" />,
  eye: (
    <>
      <path d="M3 12s3.4-6 9-6 9 6 9 6-3.4 6-9 6-9-6-9-6Z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  music: (
    <>
      <circle cx="7" cy="17" r="2.5" />
      <circle cx="17.5" cy="15" r="2.5" />
      <path d="M9.5 17V7l10.5-2v10" />
    </>
  ),
  more: (
    <>
      <circle cx="6" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="18" cy="12" r="1.2" />
    </>
  ),
  camera: (
    <>
      <rect x="3" y="7" width="14" height="10" rx="3" />
      <path d="m17 11 4-2.5v7L17 13" />
    </>
  ),
  battery: (
    <>
      <rect x="3" y="8" width="16" height="8" rx="2.5" />
      <path d="M21 11v2" />
      <rect x="5.5" y="10.5" width="8" height="3" rx="1" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 8h10M18 8h2M4 16h4M12 16h8" />
      <circle cx="16" cy="8" r="2" />
      <circle cx="10" cy="16" r="2" />
    </>
  ),
};

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
