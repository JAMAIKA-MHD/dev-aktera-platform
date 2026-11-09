// What a brand shares: the player link with its round actions (copy, open, show the QR code),
// and the QR code itself, centered, with the ways to share it underneath. The link bar sits on
// the campaign's page; the QR code opens from it, and the published pop-up shows both.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Download, ExternalLink, QrCode, X } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

import { cn } from "../../lib/utils";
import {
  campaignPublicUrl,
  facebookShareUrl,
  whatsappShareUrl,
} from "./campaignLink";
import { CxButton, cxButtonClass, cxRoot, cxText } from "./campaignUi";

// Drawn large so that the downloaded picture prints sharp, shown smaller. Always black on white,
// whatever the theme: a scanner needs that contrast.
const QR_PIXELS = 512;
const QR_SHOWN = 208;
const COPIED_MS = 2500;

const ROUND = "size-11 rounded-full [&_svg]:size-5";
const roundClass = (className?: string) =>
  cxButtonClass({ iconOnly: true, className: cn(ROUND, className) });

// The networks' own logos: lucide-react has no WhatsApp, and they read best in their colors.
function WhatsAppLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

// The player link, then its actions as round icons. `qrTitle` titles the QR code's pop-up;
// without it (the published pop-up already shows the code) there is no button to open one.
export function CampaignLinkBar({
  slug,
  qrTitle,
}: {
  slug: string;
  qrTitle?: string;
}) {
  const link = campaignPublicUrl(slug);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      setCopied(false);
    }
  };
  const copyLabel = copied ? "Copied" : "Copy link";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className={cxText.label}>Player link</span>
      <code
        title={link}
        className="min-w-0 flex-1 basis-40 break-all font-mono text-[13px] leading-5 text-cx-ink"
      >
        {link}
      </code>
      <div className="flex shrink-0 items-center gap-2">
        <CxButton
          iconOnly
          className={ROUND}
          aria-label={copyLabel}
          title={copyLabel}
          onClick={copyLink}
        >
          {copied ? (
            <Check className="text-cx-success" aria-hidden />
          ) : (
            <Copy aria-hidden />
          )}
        </CxButton>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open live page"
          title="Open live page"
          className={roundClass()}
        >
          <ExternalLink aria-hidden />
        </a>
        {qrTitle !== undefined && (
          <CxButton
            iconOnly
            className={ROUND}
            aria-label="Show QR code"
            title="Show QR code"
            aria-haspopup="dialog"
            onClick={() => setQrOpen(true)}
          >
            <QrCode aria-hidden />
          </CxButton>
        )}
      </div>
      {qrOpen && qrTitle !== undefined && (
        <CampaignDialog
          title="QR code"
          subtitle={qrTitle}
          dismissOnBackdrop
          onClose={() => setQrOpen(false)}
        >
          <CampaignQrCode name={qrTitle} slug={slug} />
        </CampaignDialog>
      )}
    </div>
  );
}

// The QR code, centered, and under it the logos to share it and the icon to download it.
export function CampaignQrCode({ name, slug }: { name: string; slug: string }) {
  const link = campaignPublicUrl(slug);
  const qr = useRef<HTMLCanvasElement>(null);

  const download = () => {
    if (!qr.current) return;
    const anchor = document.createElement("a");
    anchor.href = qr.current.toDataURL("image/png");
    anchor.download = `${slug}-qr-code.png`;
    anchor.click();
  };
  const share = (url: string) =>
    window.open(url, "_blank", "noopener,noreferrer");

  return (
    <div className="grid grid-cols-1 justify-items-center gap-4">
      <div className="max-w-full rounded-cx-lg border border-cx-border bg-white p-2.5">
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
          style={{
            display: "block",
            width: QR_SHOWN,
            height: QR_SHOWN,
            maxWidth: "100%",
          }}
        />
      </div>
      <div className="flex items-center justify-center gap-3">
        <CxButton
          iconOnly
          className={cn(ROUND, "text-[#25D366]")}
          aria-label="Share on WhatsApp"
          title="Share on WhatsApp"
          onClick={() => share(whatsappShareUrl(link, name))}
        >
          <WhatsAppLogo />
        </CxButton>
        <CxButton
          iconOnly
          className={cn(ROUND, "text-[#1877F2]")}
          aria-label="Share on Facebook"
          title="Share on Facebook"
          onClick={() => share(facebookShareUrl(link))}
        >
          <FacebookLogo />
        </CxButton>
        <CxButton
          iconOnly
          className={ROUND}
          aria-label="Download QR code"
          title="Download QR code"
          onClick={download}
        >
          <Download aria-hidden />
        </CxButton>
      </div>
    </div>
  );
}

// The window these sit in, above the page and the campaign editor.
export function CampaignDialog({
  title,
  subtitle,
  icon,
  footer,
  dismissOnBackdrop = false,
  onClose,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  footer?: ReactNode;
  dismissOnBackdrop?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className={cn(
        cxRoot,
        "fixed inset-0 z-50 flex items-center justify-center bg-cx-scrim p-4",
      )}
      onClick={dismissOnBackdrop ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-cx-xl border border-cx-border bg-cx-surface shadow-cx-pop"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-cx-border px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {icon}
            <div className="min-w-0">
              <h3 className={cxText.sectionTitle}>{title}</h3>
              {subtitle && (
                <p
                  dir="auto"
                  className={cn(cxText.caption, "[overflow-wrap:anywhere]")}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <CxButton
            variant="ghost"
            size="sm"
            iconOnly
            autoFocus={!footer}
            aria-label="Close"
            onClick={onClose}
          >
            <X aria-hidden />
          </CxButton>
        </header>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && (
          <footer className="flex shrink-0 justify-end border-t border-cx-border px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
