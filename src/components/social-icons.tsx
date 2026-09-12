import type { SVGProps } from "react";

type SocialIconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 19, ...props }: SocialIconProps) {
  return { width: size, height: size, viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true, focusable: false, ...props };
}

/** Brand marks are drawn inline: lucide-react no longer ships brand icons. */
export function FacebookIcon(props: SocialIconProps) {
  return (
    <svg {...base(props)} fill="currentColor">
      <path d="M14.5 8.5h2.2V5.3A26 26 0 0 0 14 5.2c-2.7 0-4.5 1.6-4.5 4.6v2.4H7.1v3.1h2.4V23h3.2v-7.7h2.5l.4-3.1h-2.9V10c0-.9.3-1.5 1.8-1.5Z" />
    </svg>
  );
}

export function InstagramIcon(props: SocialIconProps) {
  return (
    <svg {...base(props)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function YoutubeIcon(props: SocialIconProps) {
  return (
    <svg {...base(props)} fill="currentColor">
      <path d="M21.6 7.9a2.6 2.6 0 0 0-1.8-1.9C18.2 5.6 12 5.6 12 5.6s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.9 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.1 2.6 2.6 0 0 0 1.8 1.9c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.9 27 27 0 0 0 .4-4.1 27 27 0 0 0-.4-4.1ZM10.2 15V9l5.2 3-5.2 3Z" />
    </svg>
  );
}

export function TiktokIcon(props: SocialIconProps) {
  return (
    <svg {...base(props)} fill="currentColor">
      <path d="M16.6 3h-2.9v11.3a2.3 2.3 0 1 1-1.9-2.3V9a5.2 5.2 0 1 0 4.8 5.2V9.5a5.6 5.6 0 0 0 3.3 1.1V7.8a3.3 3.3 0 0 1-3.3-3.2V3Z" />
    </svg>
  );
}
