// The link players open. On a local machine it is written with the loopback IP address, never
// with a name like "localhost".
const LOCAL_HOSTNAMES = new Set(["localhost", "[::1]", "0.0.0.0"]);

export function campaignPublicUrl(
  slug: string,
  origin: string = window.location.origin,
): string {
  const url = new URL(origin);
  if (LOCAL_HOSTNAMES.has(url.hostname)) url.hostname = "127.0.0.1";
  return `${url.origin}/play/${slug}`;
}

/** Opens a sharing page of the network, with the link already filled in. */
export const whatsappShareUrl = (link: string, name: string) =>
  `https://wa.me/?text=${encodeURIComponent(`${name} ${link}`)}`;

export const facebookShareUrl = (link: string) =>
  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
