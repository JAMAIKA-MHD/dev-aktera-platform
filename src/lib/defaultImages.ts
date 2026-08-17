const buildSvgDataUrl = (
  title: string,
  subtitle: string,
  primary: string,
  secondary: string,
) => {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="${primary}" />
      <stop offset="100%" stop-color="${secondary}" />
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#g)" />
  <circle cx="1020" cy="130" r="180" fill="#FFFFFF22" />
  <circle cx="170" cy="560" r="220" fill="#FFFFFF18" />
  <text x="80" y="320" fill="#FFFFFF" font-family="Poppins, Arial, sans-serif" font-size="64" font-weight="700">${title}</text>
  <text x="80" y="380" fill="#FFFFFFCC" font-family="Poppins, Arial, sans-serif" font-size="30">${subtitle}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const DEFAULT_CAMPAIGN_IMAGE_URL = buildSvgDataUrl(
  "Aktera Campaign",
  "Interactive zero-party data experience",
  "#4F46E5",
  "#7C3AED",
);

export const DEFAULT_PRIZE_IMAGE_URL = buildSvgDataUrl(
  "Aktera Reward",
  "Voucher or physical item template",
  "#0EA5E9",
  "#2563EB",
);
