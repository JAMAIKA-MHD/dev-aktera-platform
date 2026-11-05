// What a brand shares: the player link, and its QR code with what can be done with it behind
// the "⋯" menu. The same block in the published pop-up and on the campaign's page.
import { useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Facebook,
  MessageCircle,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

import {
  campaignPublicUrl,
  facebookShareUrl,
  whatsappShareUrl,
} from "./campaignLink";
import {
  ActionMenu,
  CxButton,
  cxButtonClass,
  cxText,
  type ActionMenuItem,
} from "./campaignUi";

// Drawn large so that the downloaded picture prints sharp, shown small. Always black on white,
// whatever the theme: a scanner needs that contrast.
const QR_PIXELS = 512;
const QR_SHOWN = 136;
const COPIED_MS = 2500;

export function CampaignLinkShare({
  name,
  slug,
}: {
  name: string;
  slug: string;
}) {
  const link = campaignPublicUrl(slug);
  const qr = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      setCopied(false);
    }
  };

  const downloadQr = () => {
    if (!qr.current) return;
    const anchor = document.createElement("a");
    anchor.href = qr.current.toDataURL("image/png");
    anchor.download = `${slug}-qr-code.png`;
    anchor.click();
  };

  const openShare = (url: string) =>
    window.open(url, "_blank", "noopener,noreferrer");

  const qrActions: ActionMenuItem[] = [
    { label: "Download QR code", icon: Download, onSelect: downloadQr },
    {
      label: "Share on WhatsApp",
      icon: MessageCircle,
      onSelect: () => openShare(whatsappShareUrl(link, name)),
    },
    {
      label: "Share on Facebook",
      icon: Facebook,
      onSelect: () => openShare(facebookShareUrl(link)),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className={cxText.label}>Player link</span>
        <code
          title={link}
          className="min-w-0 flex-1 basis-48 truncate font-mono text-[13px] leading-5 text-cx-ink"
        >
          {link}
        </code>
        <CxButton size="sm" onClick={copyLink}>
          {copied ? (
            <Check className="text-cx-success" aria-hidden />
          ) : (
            <Copy aria-hidden />
          )}
          {copied ? "Copied" : "Copy link"}
        </CxButton>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open live page"
          className={cxButtonClass({ size: "sm" })}
        >
          <ExternalLink aria-hidden />
          Open
        </a>
      </div>

      <div className="flex items-start gap-4 border-t border-cx-border pt-4">
        <div className="shrink-0 rounded-cx-md border border-cx-border bg-white p-1.5">
          <QRCodeCanvas
            ref={qr}
            role="img"
            aria-label={`QR code of the player link: ${link}`}
            value={link}
            size={QR_PIXELS}
            level="M"
            marginSize={1}
            bgColor="#FFFFFF"
            fgColor="#000000"
            style={{ display: "block", width: QR_SHOWN, height: QR_SHOWN }}
          />
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-0.5">
          <span className={cxText.label}>QR code</span>
          <p className={cxText.caption}>
            Players scan it to open the campaign. Download it for your print and
            displays, or share the link.
          </p>
        </div>
        <ActionMenu
          label="QR code actions"
          placement="bottom"
          variant="secondary"
          items={qrActions}
        />
      </div>
    </div>
  );
}
