import type { SVGProps } from "react";

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

export const IconOverview = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="3" y="3" width="18" height="5" rx="1" />
    <rect x="6" y="10" width="15" height="5" rx="1" />
    <rect x="9" y="17" width="12" height="4" rx="1" />
  </Icon>
);

export const IconNetwork = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="12" cy="5" r="2.5" />
    <circle cx="5" cy="19" r="2.5" />
    <circle cx="19" cy="19" r="2.5" />
    <path d="M12 7.5v4M12 11.5H5v5M12 11.5h7v5" />
  </Icon>
);

export const IconStore = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 9l1.5-5h13L20 9" />
    <path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9" />
    <path d="M5.5 12.5V20h13v-7.5" />
    <path d="M10 20v-4.5h4V20" />
  </Icon>
);

export const IconLogout = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9" />
    <path d="M16 8l4 4-4 4M20 12H9" />
  </Icon>
);

export const IconEye = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const IconEyeOff = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.3 6.4A16.6 16.6 0 0 0 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1.1" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Icon>
);

export const IconCopy = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
    <path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
  </Icon>
);

export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const IconRefresh = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M20 11a8 8 0 0 0-14.5-4M4 13a8 8 0 0 0 14.5 4" />
    <path d="M5.5 3v4h4M18.5 21v-4h-4" />
  </Icon>
);

export const IconCard = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 10h18M7 15h4" />
  </Icon>
);

export const IconUser = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </Icon>
);

export const IconBag = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </Icon>
);

export const IconMenu = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10" />
    <path d="M17 3c-2 2-3 4.5-3 7h3v11" />
  </Icon>
);

export const IconTeam = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" />
    <path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.3c2 .7 3.5 2.5 3.5 5.7" />
  </Icon>
);

export const IconPalette = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z" />
    <circle cx="7.5" cy="11" r="1" /><circle cx="10.5" cy="7" r="1" /><circle cx="15" cy="7.5" r="1" />
  </Icon>
);

export const IconPos = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="4" y="3" width="16" height="6" rx="1.5" />
    <path d="M6 9v11h12V9M9 13h6M9 16.5h6" />
  </Icon>
);

export const IconTable = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="4" rx="1" />
    <path d="M6 9v10M18 9v10M3 19h18" />
  </Icon>
);

export const IconBike = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="6" cy="17" r="3" />
    <circle cx="18" cy="17" r="3" />
    <path d="M6 17l4-8h5l3 8M10 9L9 6H7" />
  </Icon>
);

export const IconReceipt = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
    <path d="M9 8h6M9 12h6" />
  </Icon>
);

export const IconChart = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
  </Icon>
);

export const IconWallet = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="3" y="6" width="18" height="14" rx="2" />
    <path d="M3 10h18M16 15h2" />
  </Icon>
);

export const IconSpark = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    <path d="M19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z" />
  </Icon>
);

export const IconCar = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M5 16V11l1.7-4.3A2 2 0 0 1 8.6 5.4h6.8a2 2 0 0 1 1.9 1.3L19 11v5" />
    <path d="M3 16h18v2.5a.5.5 0 0 1-.5.5H19a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H3.5a.5.5 0 0 1-.5-.5z" />
    <circle cx="7.5" cy="13" r=".8" />
    <circle cx="16.5" cy="13" r=".8" />
  </Icon>
);

export const IconInbox = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 13l2.2-7a1.5 1.5 0 0 1 1.4-1h8.8a1.5 1.5 0 0 1 1.4 1L20 13" />
    <path d="M4 13h4.5a1 1 0 0 1 1 .8 2.5 2.5 0 0 0 5 0 1 1 0 0 1 1-.8H20v5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z" />
  </Icon>
);

export const IconIdCard = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="11" r="2" />
    <path d="M6 16c.6-1.6 1.8-2.3 3-2.3s2.4.7 3 2.3" />
    <path d="M14.5 10h4M14.5 13h3" />
  </Icon>
);

export const IconTag = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M3 12.5V4.5A1.5 1.5 0 0 1 4.5 3h8a1.5 1.5 0 0 1 1.1.4l7 7a1.5 1.5 0 0 1 0 2.2l-7.5 7.5a1.5 1.5 0 0 1-2.2 0l-7-7A1.5 1.5 0 0 1 3 12.5z" />
    <circle cx="8" cy="8" r="1.2" />
  </Icon>
);
