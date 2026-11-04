// The product documentation shown in the dashboard's documentation panel. One chapter per audience
// or need (orientation, setup, guides, admin, developers, trust, operations), one page per topic.
// Every page says what kind of page it is (tutorial, how-to, reference, explanation: Diátaxis) so
// tasks and reference are never mixed. Keep it true to the product: when a screen changes, change
// its page and bump DOCS_LAST_UPDATED.
import type { ReactNode } from "react";

import { PATHS } from "../../dashboard/paths";
import {
  MAX_ACTIVE_CAMPAIGNS,
  PLAN_ALLOWANCES,
} from "../../lib/planAllowances";
import {
  Callout,
  Code,
  H,
  K,
  P,
  Steps,
  Table,
  Terms,
  UI,
  UL,
} from "./docsBlocks";

export const DOCS_VERSION = "Phase 3";
export const DOCS_LAST_UPDATED = "2026-11-04";

export type DocKind = "Tutorial" | "How-to" | "Reference" | "Explanation";
export type DocAudience =
  "Everyone" | "Marketers" | "Admins" | "Developers" | "IT & Security";

export interface DocPage {
  id: string;
  title: string;
  summary: string;
  kind: DocKind;
  audience: DocAudience[];
  /** Extra words the search matches on. */
  keywords?: string;
  /** The dashboard screen this page documents. */
  open?: { label: string; to: string };
  body: ReactNode;
}

export interface DocChapter {
  id: string;
  title: string;
  icon: string;
  pages: DocPage[];
}

const fmt = (n: number) => n.toLocaleString("en-US");

export const DOC_CHAPTERS: DocChapter[] = [
  // ───────────────────────────── 1. Orientation ─────────────────────────────
  {
    id: "orientation",
    title: "Getting started",
    icon: "fa-solid fa-compass",
    pages: [
      {
        id: "overview",
        title: "What is Aktera?",
        summary:
          "What the platform does, who it is for, and how the pieces fit together.",
        kind: "Explanation",
        audience: ["Everyone"],
        keywords: "introduction about platform octoreach architecture",
        body: (
          <>
            <P>
              Aktera is a gamification marketing platform built for the Algerian
              market. Brands create short, branded game campaigns — a Wheel of
              Fortune, a Quiz, a Scratch Card and more — and share a public
              link. Players open the link on their phone, register with their
              phone number and consent, play, and instantly learn whether they
              won a reward.
            </P>
            <H>Who it is for</H>
            <UL
              items={[
                <>
                  <UI>Marketing teams</UI> that want to collect qualified,
                  consented leads and grow engagement around a launch, a season
                  (Ramadan, back to school) or a store opening.
                </>,
                <>
                  <UI>Agencies</UI> that run campaigns on behalf of several
                  brands.
                </>,
                <>
                  <UI>Retail and FMCG brands</UI> that distribute vouchers,
                  top-ups or physical gifts and need proof of fair distribution.
                </>,
              ]}
            />
            <H>Problems it solves</H>
            <Table
              head={["Problem", "How Aktera handles it"]}
              rows={[
                [
                  "Low engagement on classic contests",
                  "Five ready-made mobile games and themed templates, branded in minutes in the Player Studio.",
                ],
                [
                  "Unfair or manipulable draws",
                  "Every outcome is decided on the server; the browser only animates the result.",
                ],
                [
                  "Duplicate and fake participations",
                  "Algerian phone numbers are normalized and limited per campaign.",
                ],
                [
                  "Compliance with Law 18-07",
                  "No participation is accepted without explicit, recorded consent.",
                ],
                [
                  "Manual voucher distribution",
                  "Codes are claimed atomically, one per winner, with expiry tracking.",
                ],
              ]}
            />
            <H>How the pieces fit together</H>
            <div className="my-4 grid gap-2 sm:grid-cols-3">
              {[
                [
                  "1. Dashboard",
                  "Your team builds campaigns, manages rewards and reads analytics.",
                ],
                [
                  "2. Player page",
                  "The public /play/your-campaign link players open on their phone.",
                ],
                [
                  "3. Secure draw",
                  "A server function checks consent, limits and stock, then decides the outcome.",
                ],
              ].map(([title, text]) => (
                <div
                  key={title}
                  className="rounded-xl border border-card-border bg-card-bg-subtle p-3"
                >
                  <p className="text-[13px] font-bold text-brand-text">
                    {title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-brand-text/75">
                    {text}
                  </p>
                </div>
              ))}
            </div>
            <Callout kind="tip">
              New here? Go straight to the <UI>Quickstart</UI>: you can have a
              working campaign in about 15 minutes.
            </Callout>
          </>
        ),
      },
      {
        id: "glossary",
        title: "Core concepts & glossary",
        summary:
          "The vocabulary used everywhere in the product and this guide.",
        kind: "Reference",
        audience: ["Everyone"],
        keywords: "terms definitions vocabulary words",
        body: (
          <>
            <P>
              Use these terms consistently with your team and with support —
              they match the labels on screen.
            </P>
            <Terms
              items={[
                [
                  "Organization",
                  "Your company account. Campaigns, rewards, analytics and billing all belong to one organization.",
                ],
                [
                  "Member",
                  "A person who signs in to the dashboard of an organization, with a role (Owner, Admin, Editor or Viewer).",
                ],
                [
                  "Campaign",
                  "One game experience with a name, a public link, a period, a game, rewards and rules.",
                ],
                [
                  "Campaign link (slug)",
                  <>
                    The end of the public URL, e.g. <K>/play/ramadan-2026</K>.
                  </>,
                ],
                [
                  "Engagement",
                  "What the player does: a skill game, a knowledge quiz, or pure luck.",
                ],
                [
                  "Reward method",
                  "How the outcome is decided: Instant win (immediate result) or Draw (a scheduled sweepstake).",
                ],
                [
                  "Reward",
                  "An item in the Reward Library that can be won: a Digital Item or a Physical Item.",
                ],
                [
                  "Digital Item",
                  "A reward made of codes (vouchers, top-ups, discount codes). One code goes to each winner.",
                ],
                [
                  "Physical Item",
                  "A reward you hand over yourself (a product, a gift). Aktera records winners and delivery status.",
                ],
                [
                  "Partner library",
                  "Rewards offered by a partner, without managing your own stock.",
                ],
                [
                  "Participation / entry",
                  "One play by one phone number in one campaign.",
                ],
                [
                  "Impression",
                  "One visit of the public page, used for conversion rates.",
                ],
                [
                  "Player Studio",
                  "The editor where you design what players see: texts, colors, images, form and game look.",
                ],
                [
                  "Sandbox",
                  "A safe test mode. It plays the real experience with demo outcomes and DEMO- codes; it never uses real stock.",
                ],
                [
                  "Consent",
                  "The player's explicit agreement to the use of their data, required by Law 18-07 before any participation.",
                ],
              ]}
            />
          </>
        ),
      },
      {
        id: "quickstart",
        title: "Quickstart: your first campaign",
        summary:
          "From zero to a live, tested campaign link in about 15 minutes.",
        kind: "Tutorial",
        audience: ["Marketers"],
        keywords: "start first tutorial launch begin",
        open: { label: "Create a campaign", to: PATHS.create },
        body: (
          <>
            <P>
              In this tutorial you create a <UI>Wheel of Fortune</UI> campaign
              that gives away 50 discount codes over one week, brand it, test
              it, and publish its link.
            </P>
            <Callout kind="note">
              Prerequisites: a dashboard account with an organization, and a
              list of discount codes (a CSV or Excel file, or simply a few codes
              you can paste).
            </Callout>
            <Steps
              steps={[
                {
                  title: "Create the reward",
                  body: (
                    <>
                      Open <UI>Reward Library → Local Library</UI> and create a
                      Digital Item named <K>10% discount</K>. Open it and add
                      your codes with <UI>Paste Bulk</UI> (one per line) or{" "}
                      <UI>Import File</UI>.
                    </>
                  ),
                  result:
                    "the reward shows 50 codes available in its stock summary.",
                },
                {
                  title: "Start the Campaign Wizard",
                  body: (
                    <>
                      In <UI>Campaign Radios</UI>, click <UI>New campaign</UI>{" "}
                      (its arrow lets you start from a game type). In{" "}
                      <UI>Foundation</UI>, enter a campaign name (3–80
                      characters), your brand name, a start and end date, and
                      how many plays each phone number is allowed. The player
                      link is generated for you.
                    </>
                  ),
                  result: "the summary on the right fills in as you type.",
                },
                {
                  title: "Pick the engagement and reward method",
                  body: (
                    <>
                      In <UI>Engagement</UI>, choose <UI>Luck</UI>. In{" "}
                      <UI>Reward</UI>, choose <UI>Instant win</UI> and the{" "}
                      <UI>Wheel of Fortune</UI> reveal. As the instant win mode,
                      keep <UI>Auto-distribute</UI> so the 50 codes last the
                      whole week.
                    </>
                  ),
                },
                {
                  title: "Allocate the reward",
                  body: (
                    <>
                      In <UI>Prizes</UI>, add <K>10% discount</K> with a
                      quantity of 50.
                    </>
                  ),
                  result: 'the summary shows "1 rewards".',
                },
                {
                  title: "Test, then publish",
                  body: (
                    <>
                      In <UI>Review</UI>, use <UI>Try it before you publish</UI>{" "}
                      and play a few rounds. Sandbox codes start with{" "}
                      <K>DEMO-</K> and never touch your stock. Then click{" "}
                      <UI>Publish</UI>.
                    </>
                  ),
                  result: "the campaign appears as Active in Campaign Radios.",
                },
                {
                  title: "Brand it in the Player Studio",
                  body: (
                    <>
                      Click <UI>Design player screens</UI>: pick a theme, upload
                      your logo, set your colors and edit the welcome text.
                      Changes save automatically.
                    </>
                  ),
                },
                {
                  title: "Share the link",
                  body: (
                    <>
                      From the campaign workspace, click <UI>Open live page</UI>{" "}
                      and share the URL (<K>/play/your-link</K>) on social
                      media, in SMS or as a QR code in store.
                    </>
                  ),
                  result:
                    "participations appear in the workspace and in the Analytics Desk within seconds.",
                },
              ]}
            />
          </>
        ),
      },
    ],
  },

  // ───────────────────────────── 2. Onboarding ─────────────────────────────
  {
    id: "setup",
    title: "Onboarding & setup",
    icon: "fa-solid fa-rocket",
    pages: [
      {
        id: "account",
        title: "Account & organization",
        summary:
          "Create your account, complete your organization and choose a plan.",
        kind: "How-to",
        audience: ["Admins"],
        keywords: "register signup sign up trial plan organization create",
        open: { label: "Open Organization", to: PATHS.account },
        body: (
          <>
            <Steps
              steps={[
                {
                  title: "Create your account",
                  body: "Sign up with your work email and a password (at least 6 characters). Registration may be by invitation only while the platform is in early access.",
                },
                {
                  title: "Complete your organization",
                  body: "On first sign-in you are asked for your organization details (name, contact email, phone). The dashboard opens once this is done.",
                  result: "you land on the Overview screen.",
                },
                {
                  title: "Check your plan",
                  body: (
                    <>
                      New organizations start on the <UI>Free</UI> plan. See{" "}
                      <UI>Billing & Quota</UI> to compare plans and request an
                      upgrade.
                    </>
                  ),
                },
              ]}
            />
            <H>Inviting teammates</H>
            <Steps
              steps={[
                {
                  title: "Open the Team tab",
                  body: (
                    <>
                      Go to <UI>Organization → Team</UI>. Only an Owner or an
                      Admin sees the invitation controls.
                    </>
                  ),
                },
                {
                  title: "Invite",
                  body: (
                    <>
                      Enter the <UI>Work email</UI>, choose a <UI>Role</UI>{" "}
                      (Admin, Editor or Viewer) and send the invitation.
                    </>
                  ),
                  result:
                    "the person appears in the team list with their role.",
                },
                {
                  title: "Change a role or remove a member",
                  body: "From the same list. The Owner's row cannot be changed, and nobody can change their own role.",
                },
              ]}
            />
          </>
        ),
      },
      {
        id: "roles",
        title: "Roles & permissions",
        summary: "What each role can see and do, with a permissions matrix.",
        kind: "Reference",
        audience: ["Admins", "IT & Security"],
        keywords:
          "rbac role owner admin editor manager viewer access rights team",
        body: (
          <>
            <P>
              Every member has one role in the organization. Permissions are
              enforced on the server (row-level security and the team function),
              not only by the interface. Roles and plans can only be changed by
              the server, never from the browser.
            </P>
            <Terms
              items={[
                [
                  "Owner",
                  "Full access, including billing, the team and deleting the organization.",
                ],
                [
                  "Admin",
                  "Manages campaigns, rewards, integrations and the team.",
                ],
                [
                  "Editor",
                  "Creates and edits campaigns and rewards, with no access to settings.",
                ],
                ["Viewer", "Read-only access."],
              ]}
            />
            <Table
              head={["Action", "Owner", "Admin", "Editor", "Viewer"]}
              rows={[
                ["View campaigns, rewards and analytics", "✓", "✓", "✓", "✓"],
                ["Create, edit, archive campaigns", "✓", "✓", "✓", "—"],
                ["Design in the Player Studio", "✓", "✓", "✓", "—"],
                ["Manage rewards, codes and delivery", "✓", "✓", "✓", "—"],
                ["Invite members, change roles", "✓", "✓", "—", "—"],
                ["Integrations", "✓", "✓", "—", "—"],
                ["Billing and plan", "✓", "—", "—", "—"],
                ["Delete the organization", "✓", "—", "—", "—"],
              ]}
            />
            <Callout kind="security">
              A Viewer can never change data, even through the API: write
              requests from a Viewer are refused by the database.
            </Callout>
          </>
        ),
      },
      {
        id: "sso",
        title: "Single sign-on (SSO / SAML / SCIM)",
        summary: "Enterprise identity options and their availability.",
        kind: "Reference",
        audience: ["IT & Security"],
        keywords: "saml scim okta azure entra google workspace identity",
        body: (
          <>
            <P>
              Today members sign in with email and password. SAML single sign-on
              and SCIM user provisioning are planned for the Enterprise plan.
            </P>
            <Table
              head={["Capability", "Status"]}
              rows={[
                ["Email & password sign-in", "Available"],
                [
                  "Password and email change",
                  "Available (Organization → Security / Email)",
                ],
                ["SAML 2.0 SSO", "Planned — Enterprise"],
                ["SCIM provisioning", "Planned — Enterprise"],
              ]}
            />
            <P>
              If SSO is a requirement for your procurement, open a support
              ticket so we can share the timeline.
            </P>
          </>
        ),
      },
      {
        id: "environments",
        title: "Sandbox vs live",
        summary:
          "How testing works, and what changes when a campaign goes live.",
        kind: "Explanation",
        audience: ["Marketers", "Developers"],
        keywords: "test demo environment production simulate",
        body: (
          <>
            <P>
              Aktera has no separate staging account: every campaign can be
              played in a <UI>sandbox</UI> before and after it goes live. The
              sandbox runs exactly the same player experience, with one
              difference: outcomes come from a demo gateway.
            </P>
            <Table
              head={["", "Sandbox", "Live (/play/:slug)"]}
              rows={[
                [
                  "Who decides the outcome",
                  "Demo gateway in your browser",
                  "Server (select-prize)",
                ],
                [
                  "Reward codes",
                  <>
                    Fake, starting with <K>DEMO-</K>
                  </>,
                  "Real codes from your stock",
                ],
                ["Stock used", "Never", "Yes, one code per winner"],
                ["Counts in analytics", "No", "Yes"],
                [
                  "Where",
                  "Player Studio, wizard review, top-bar sandbox",
                  "The public link",
                ],
              ]}
            />
            <H>Where to find the sandbox</H>
            <UL
              items={[
                <>
                  <UI>Interactive Player Sandbox</UI> in the top bar: pick any
                  campaign and play it in a phone-sized frame.
                </>,
                <>
                  <UI>Try it before you publish</UI> in the last step of the
                  wizard.
                </>,
                <>
                  <UI>Simulate plays</UI> in a campaign workspace.
                </>,
                <>The live preview of the Player Studio.</>,
              ]}
            />
          </>
        ),
      },
      {
        id: "go-live",
        title: "Go-live checklist",
        summary: "Everything to verify before you share a campaign link.",
        kind: "How-to",
        audience: ["Marketers"],
        keywords: "launch publish checklist ready",
        body: (
          <>
            <Table
              head={["Check", "Where"]}
              rows={[
                [
                  "Start and end dates are right (Algeria time)",
                  "Wizard → Foundation",
                ],
                [
                  "Plays per phone number matches your rules",
                  "Wizard → Foundation",
                ],
                [
                  "Rewards have enough codes for the allocated quantity",
                  "Reward Library → reward → stock summary",
                ],
                [
                  "Code expiry dates are after the campaign end",
                  "Reward → Validity period",
                ],
                [
                  "Sweepstake rules are written (Draw campaigns)",
                  "Wizard → Reward",
                ],
                [
                  "Consent text and legal links are filled",
                  "Player Studio → Legal",
                ],
                [
                  "Organizer name and address are filled",
                  "Player Studio → Legal",
                ],
                [
                  "Arabic and French texts reviewed",
                  "Player Studio → Languages",
                ],
                ["No issues left", "Player Studio → Validation"],
                [
                  "Played end-to-end in the sandbox",
                  "Top bar → Interactive Player Sandbox",
                ],
                [
                  "Opened the live link on a real phone",
                  "Workspace → Open live page",
                ],
              ]}
            />
            <Callout kind="warning">
              Once a campaign has participations, changing its rewards or rules
              affects fairness. Prefer <UI>Relaunch</UI> to start a new run with
              new parameters.
            </Callout>
          </>
        ),
      },
    ],
  },

  // ───────────────────────────── 3. User guides ─────────────────────────────
  {
    id: "guides",
    title: "User guides",
    icon: "fa-solid fa-book-open",
    pages: [
      {
        id: "overview-screen",
        title: "Overview",
        summary:
          "Your home screen: key numbers, agenda and audience at a glance.",
        kind: "Reference",
        audience: ["Marketers"],
        keywords: "home dashboard kpi agenda visitors",
        open: { label: "Open Overview", to: PATHS.home },
        body: (
          <>
            <P>
              The Overview is the first screen after sign-in. It summarizes the
              activity of the whole organization.
            </P>
            <Terms
              items={[
                [
                  "KPI cards",
                  "Participations, winners, rewards claimed and conversion across your campaigns.",
                ],
                [
                  "Visitor statistics",
                  "Visits and participations over time, to spot peaks after a post or an SMS.",
                ],
                [
                  "Campaign agenda",
                  "A calendar of your campaigns by start and end date, to avoid overlaps.",
                ],
                [
                  "Audience & insights",
                  "Where your players come from (wilaya) and which campaigns perform best.",
                ],
              ]}
            />
          </>
        ),
      },
      {
        id: "campaigns",
        title: "Manage campaigns",
        summary:
          "Find, open, edit, archive, relaunch and delete your campaigns.",
        kind: "How-to",
        audience: ["Marketers"],
        keywords:
          "campaign radios list workspace archive relaunch delete status filter",
        open: { label: "Open Campaign Radios", to: PATHS.campaigns },
        body: (
          <>
            <P>
              <UI>Campaign Radios</UI> lists every campaign of your organization
              as cards. Use <UI>Search campaigns…</UI>,{" "}
              <UI>Filter by status</UI> and <UI>Filter by game</UI> to narrow
              the list. Each card shows the timeline, entries and the share of
              allocated prizes already won.
            </P>
            <H>Campaign statuses</H>
            <Table
              head={["Status", "Meaning", "Players can play?"]}
              rows={[
                ["Draft", "Saved but not published.", "No"],
                [
                  "Scheduled",
                  "Published, before its start date.",
                  "No — players are told when it opens",
                ],
                [
                  "Active",
                  "Published and within its start and end dates.",
                  "Yes",
                ],
                ["Paused", "Temporarily stopped.", "No"],
                [
                  "Archived",
                  "Finished and kept for history and analytics.",
                  "No",
                ],
              ]}
            />
            <H>Card actions</H>
            <Table
              head={["Action", "What it does"]}
              rows={[
                ["Open the card", "Opens the campaign workspace."],
                [
                  "Publish / Pause / Resume",
                  "Puts a draft live, or stops and restarts a live campaign.",
                ],
                [
                  "Design player screens",
                  "Opens the campaign in the Player Studio.",
                ],
                ["Analytics", "Opens the Analytics Desk on this campaign."],
                [
                  "Duplicate & relaunch",
                  "Starts a new run from this campaign with new parameters (dates, rewards).",
                ],
                ["Archive", "Ends it and keeps all its data."],
                [
                  "Delete permanently",
                  "Only for drafts and archived campaigns. This cannot be undone.",
                ],
              ]}
            />
            <H>The campaign workspace</H>
            <P>
              The workspace shows the campaign summary and details, the{" "}
              <UI>Player link</UI> (with <UI>Copy link</UI>), participants,
              prizes won and remaining rewards, the server-side win chance and
              daily quota pacing, and a player preview. From the header you can
              open analytics, <UI>Simulate plays</UI>, <UI>Open live page</UI>,
              design the player screens or duplicate and relaunch.
            </P>
            <Callout kind="warning">
              Deleting a campaign also removes what players see at its link.
              Archive first if you may need the data later.
            </Callout>
          </>
        ),
      },
      {
        id: "wizard",
        title: "Create a campaign (wizard)",
        summary:
          "Every step and field of the Campaign Wizard, from Foundation to Review.",
        kind: "How-to",
        audience: ["Marketers"],
        keywords:
          "wizard create foundation engagement reward prizes review draw instant probability guaranteed sms",
        open: { label: "Create a campaign", to: PATHS.create },
        body: (
          <>
            <P>
              The wizard has five steps. A summary on the side shows what you
              chose so far; you can go back to any step before publishing.
            </P>
            <H>1. Foundation</H>
            <Table
              head={["Field", "Rules"]}
              rows={[
                [
                  "Campaign name",
                  "3 to 80 characters. Shown in the dashboard and to players.",
                ],
                [
                  "Brand name",
                  "2 to 50 characters. Shown to players on the welcome screen, with an optional brand logo.",
                ],
                [
                  "Player link",
                  <>
                    The public address <K>/play/…</K>. Generated automatically;
                    it cannot be edited.
                  </>,
                ],
                [
                  "Starts / Ends",
                  "The period during which participations are accepted.",
                ],
                [
                  "Plays per phone number",
                  "How many times one phone number can play. Recommended: 1 play, so prizes reach more customers.",
                ],
              ]}
            />
            <H>2. Engagement — what the player does</H>
            <UL
              items={[
                <>
                  <UI>Skill</UI>: Hit It. You set a game duration and a target
                  score; the player must reach it before the time runs out to
                  qualify.
                </>,
                <>
                  <UI>Knowledge</UI>: Trivia Quiz. You write the questions and
                  answers, choose the <UI>Number of questions</UI> and the{" "}
                  <UI>Minimum passing score</UI>.
                </>,
                <>
                  <UI>Luck</UI>: no task; the reveal is chosen in the next step.
                </>,
              ]}
            />
            <H>3. Reward — how the outcome is decided</H>
            <Table
              head={["Method", "How it works", "Options"]}
              rows={[
                [
                  "Instant win",
                  "The player learns the result immediately, revealed with a Wheel of Fortune, Scratch Card or Mystery Box.",
                  "One instant win mode (they cannot be combined): Auto-distribute, a fixed Chance to win against limited stock, or Guaranteed winning (zero losers). Optional consolation prizes for players who do not win.",
                ],
                [
                  "Draw",
                  "A scheduled grand sweepstake: qualified players enter, winners are drawn later on the server.",
                  "Draw date and time, Number of winners, Ticket prefix, sweepstake rules players accept. Choose Aktera manages the prizes (stock tracking and SMS to winners and other players, required before going live) or I handle the prizes myself.",
                ],
              ]}
            />
            <Callout kind="tip">
              <UI>Auto-distribute</UI> is the safest default: Aktera computes
              the win probability so your rewards last until the end date
              instead of running out on day one.
            </Callout>
            <H>4. Prizes</H>
            <P>
              Choose rewards from your library and the quantity of each. For
              instant win with several rewards you can set a <UI>Weight %</UI>{" "}
              per reward to make some rarer than others.
            </P>
            <H>5. Review</H>
            <P>
              <UI>Review your campaign</UI>, use{" "}
              <UI>Try it before you publish</UI> to play it in the sandbox, then{" "}
              <UI>Publish</UI>. From here you can also{" "}
              <UI>Design what players see</UI> in the Player Studio.
            </P>
            <Callout kind="security">
              Win probability, weights, stock and correct quiz answers stay on
              the server. They are never sent to the player's browser.
            </Callout>
          </>
        ),
      },
      {
        id: "games",
        title: "Game mechanics reference",
        summary: "The five games, what players do and what you configure.",
        kind: "Reference",
        audience: ["Marketers"],
        keywords: "wheel quiz scratch mystery box hit it game",
        body: (
          <>
            <Table
              head={["Game", "Category", "Player action", "You configure"]}
              rows={[
                [
                  "Wheel of Fortune",
                  "Luck (reveal)",
                  "Spins the wheel.",
                  "Segments, colors, center button.",
                ],
                [
                  "Scratch Card",
                  "Luck (reveal)",
                  "Scratches the cover to reveal the result.",
                  "Cover image and text.",
                ],
                [
                  "Mystery Box",
                  "Luck (reveal)",
                  "Picks one box among several.",
                  "Box color and icon.",
                ],
                [
                  "Trivia Quiz",
                  "Knowledge",
                  "Answers multiple-choice questions.",
                  "Questions, answers, number of questions, passing score.",
                ],
                [
                  "Hit It",
                  "Skill",
                  "Taps the target as many times as possible.",
                  "Duration, target score, target icon or image.",
                ],
              ]}
            />
            <P>
              In every game the animation only <em>shows</em> the outcome. For
              skill and quiz games the server checks the score; for every game
              it decides the prize.
            </P>
          </>
        ),
      },
      {
        id: "rewards",
        title: "Reward Library",
        summary:
          "Create Digital and Physical Items, and connect partner libraries.",
        kind: "How-to",
        audience: ["Marketers"],
        keywords:
          "reward prize library voucher physical digital partner stock template",
        open: { label: "Open Reward Library", to: PATHS.prizes },
        body: (
          <>
            <P>
              The <UI>Reward Library</UI> is where you choose where your rewards
              come from.
            </P>
            <Terms
              items={[
                [
                  "Local Library",
                  "Your own Digital Items and Physical Items: upload codes, set stock and expiry, follow delivery.",
                ],
                [
                  "Partner libraries",
                  "Offer partner rewards without managing stock. Use Add a partner to keep track of a partner you work with.",
                ],
              ]}
            />
            <H>Create a reward</H>
            <Steps
              steps={[
                {
                  title: "Open the Local Library",
                  body: (
                    <>
                      Click <UI>Open Local Library</UI>, then create a reward.
                    </>
                  ),
                },
                {
                  title: "Fill the reward form",
                  body: (
                    <>
                      <UI>Reward Name</UI>, <UI>Display Value / Face Value</UI>{" "}
                      (e.g. 500 DA), type (Digital or Physical),{" "}
                      <UI>Total Warehouse Stock</UI>, an image and the{" "}
                      <UI>Redemption Instructions</UI> players will read.
                    </>
                  ),
                },
                {
                  title: "Set the validity (Digital Items)",
                  body: "Choose: never expires, expires on a fixed date (end of that day, Algeria time), or a period after delivery (the countdown starts when the code is given to the winner).",
                },
              ]}
            />
            <P>
              Each reward card shows <UI>Total stock</UI>, <UI>Available</UI>{" "}
              and the campaigns it is linked to.
            </P>
          </>
        ),
      },
      {
        id: "codes",
        title: "Digital codes: import, export, expiry",
        summary: "Fill a reward with codes and keep its stock healthy.",
        kind: "How-to",
        audience: ["Marketers"],
        keywords:
          "codes coupon import csv excel paste bulk export generate duplicate expiry",
        body: (
          <>
            <P>
              Open a Digital Item to see its codes table, one slot per unit of
              stock. Search with <UI>Search codes…</UI>.
            </P>
            <H>Ways to add codes</H>
            <Table
              head={["Method", "Behavior"]}
              rows={[
                [
                  "Paste Bulk",
                  "Paste one code per line. Choose to fill the next empty slots (existing codes kept) or Replace All from slot 1.",
                ],
                [
                  "Import File",
                  "Upload a CSV or Excel file with Index and Code columns. Download the template from the dialog.",
                ],
                [
                  "Auto-fill",
                  "Generates unique 8-character uppercase alphanumeric codes for all empty slots.",
                ],
                ["Inline", "Type a code directly in an empty slot."],
              ]}
            />
            <Code label="CSV template">{`Index,Code,Status,Used on
1,COUPON-DZ-101,,
2,COUPON-DZ-102,,
3,COUPON-DZ-103,,`}</Code>
            <Callout kind="note">
              <K>Status</K> and <K>Used on</K> are filled by Aktera — leave them
              empty. An exported file can be imported back unchanged.
            </Callout>
            <H>Duplicates</H>
            <P>
              If imported codes collide with existing ones, Aktera lists the
              duplicates. Provide replacement codes inline, cancel the import,
              or <UI>Proceed Anyway</UI>.
            </P>
            <H>Stock warnings and expiry</H>
            <P>
              The stock summary shows what is left to give and warns you before
              the codes run out. You can set one expiry date for all the codes
              of a reward from its edit form; codes past their date are marked
              expired.
            </P>
          </>
        ),
      },
      {
        id: "physical",
        title: "Physical items & delivery",
        summary: "Track winners of physical rewards and their delivery status.",
        kind: "How-to",
        audience: ["Marketers"],
        keywords: "physical delivery winners export shipping",
        body: (
          <>
            <P>
              For a Physical Item, the reward page shows{" "}
              <UI>Winners and delivery</UI>: each winner, the date they won, and
              the delivery status.
            </P>
            <UL
              items={[
                "You handle the delivery; Aktera records the status you set.",
                <>
                  Use <UI>Export winners</UI> to download the list for your
                  logistics team or partner.
                </>,
              ]}
            />
          </>
        ),
      },
      {
        id: "studio",
        title: "Player Studio",
        summary:
          "Design everything players see, screen by screen, with live preview.",
        kind: "How-to",
        audience: ["Marketers"],
        keywords:
          "studio design brand colors logo template legal languages arabic french export import undo",
        open: { label: "Open Player Studio", to: PATHS.studio },
        body: (
          <>
            <P>
              The Player Studio customizes the look and texts of a campaign. It
              never changes the rules: odds, stock and answers stay in the
              wizard.
            </P>
            <H>Panels</H>
            <Table
              head={["Panel", "What you do there"]}
              rows={[
                [
                  "Theme",
                  "Pick a template from the library — Classic, Comic Burst, Pixel Quest, Arcade Night or Quiz Show — then a style preset. Templates restyle every screen; you can recolor the primary and accent colors.",
                ],
                ["Brand Identity", "Logo, colors, fonts, corners and motion."],
                [
                  "Sections",
                  "Edit one screen at a time — Welcome, Registration, Game, Result: titles, buttons, form fields, game look.",
                ],
                [
                  "Legal",
                  "Organizer name and address, consent text, policy version, terms and privacy links.",
                ],
                [
                  "Export",
                  "Export the design as a configuration file, import one, or reset.",
                ],
                [
                  "Validation",
                  "Lists the issues to fix before players see the experience.",
                ],
              ]}
            />
            <H>Working in the Studio</H>
            <UL
              items={[
                "Changes save automatically; the top bar tells you when something is not saved yet.",
                "Undo and Redo are in the top bar (Ctrl+Z / Ctrl+Shift+Z).",
                "The preview can switch devices (phone, tablet, desktop, portrait and landscape).",
                <>
                  <UI>Languages</UI>: write Arabic, French and English texts.
                  Arabic is shown right-to-left automatically.
                </>,
                "If a teammate saved the same design meanwhile, the Studio warns you instead of overwriting their work.",
              ]}
            />
          </>
        ),
      },
      {
        id: "sandbox",
        title: "Interactive Player Sandbox",
        summary:
          "Play any campaign in a phone frame, without using real stock.",
        kind: "How-to",
        audience: ["Marketers"],
        keywords: "sandbox simulator test preview phone",
        body: (
          <>
            <Steps
              steps={[
                {
                  title: "Open it",
                  body: (
                    <>
                      Click <UI>Interactive Player Sandbox</UI> in the top bar.
                    </>
                  ),
                },
                {
                  title: "Pick a campaign",
                  body: "Choose a campaign in the drop-down, or the default demo experience.",
                },
                {
                  title: "Play",
                  body: (
                    <>
                      Register, play and see the result. Won codes start with{" "}
                      <K>DEMO-</K>.
                    </>
                  ),
                  result: "nothing is recorded and no stock is used.",
                },
              ]}
            />
          </>
        ),
      },
      {
        id: "analytics",
        title: "Analytics Desk",
        summary:
          "Measure participation, rewards and usage; export your players.",
        kind: "Reference",
        audience: ["Marketers"],
        keywords:
          "analytics statistics kpi export report wilaya map leaderboard players docx csv",
        open: { label: "Open Analytics Desk", to: PATHS.analytics },
        body: (
          <>
            <P>
              The Analytics Desk has three sections. Choose a campaign or{" "}
              <UI>All Campaigns Combined</UI>.
            </P>
            <Table
              head={["Section", "What you see"]}
              rows={[
                [
                  "Campaigns",
                  "Visits, participations, conversion, winners, Coupon Claim %, trends over time, a leaderboard of campaigns, the map of Algeria by wilaya, and the players table.",
                ],
                [
                  "Rewards",
                  "Codes given, claimed and remaining per reward, expiry and delivery.",
                ],
                ["Billing", "Usage against your plan allowance over time."],
              ]}
            />
            <H>Players table</H>
            <P>
              Search, filter, sort and page through participants (phone, wilaya,
              result, prize, date). Use <UI>Export</UI> to download it as an
              Excel file for your CRM.
            </P>
            <H>Reports</H>
            <P>
              Download a campaign report (Word document with charts) or the
              players table as an Excel file with <UI>Export</UI>.
            </P>
            <Callout kind="note">
              Analytics count live participations only — sandbox plays are never
              included.
            </Callout>
          </>
        ),
      },
      {
        id: "player-page",
        title: "The public player page",
        summary: "What players experience at /play/your-link, step by step.",
        kind: "Explanation",
        audience: ["Everyone"],
        keywords: "player public page play link flow consent phone",
        body: (
          <>
            <Steps
              steps={[
                {
                  title: "Welcome",
                  body: "Your branding, the campaign title and the prizes to win.",
                },
                {
                  title: "Registration",
                  body: "The player enters an Algerian phone number (05, 06 or 07…, or +213) and the fields you chose, then ticks consent.",
                },
                {
                  title: "Game",
                  body: "The game you selected. The animation moves towards the outcome decided by the server.",
                },
                {
                  title: "Result",
                  body: "Win or lose message. Winners see their code, its expiry and the redemption instructions.",
                },
              ]}
            />
            <P>
              The page works on any screen, from small phones to desktops, in
              portrait and landscape, in Arabic, French and English.
            </P>
          </>
        ),
      },
    ],
  },

  // ───────────────────────────── 4. Admin ─────────────────────────────
  {
    id: "admin",
    title: "Administration",
    icon: "fa-solid fa-user-shield",
    pages: [
      {
        id: "organization",
        title: "Organization settings",
        summary:
          "Organization profile, team, notifications, security, integrations and billing.",
        kind: "How-to",
        audience: ["Admins"],
        keywords:
          "profile team notification password security email integrations billing settings alerts",
        open: { label: "Open Organization", to: PATHS.account },
        body: (
          <>
            <Table
              head={["Tab", "What you can change"]}
              rows={[
                [
                  "Organization",
                  "Organization profile: name, contact details and logo.",
                ],
                [
                  "Team",
                  "Invite colleagues and decide what each person can do (see Roles & permissions).",
                ],
                [
                  "Notifications",
                  "Which operational alerts and summaries you receive.",
                ],
                ["Security", "Change your password (at least 6 characters)."],
                ["Email", "Change the email you sign in with."],
                [
                  "Integrations",
                  "API keys and webhook endpoints (coming soon).",
                ],
                ["Billing", "Your subscription, usage and invoices."],
              ]}
            />
          </>
        ),
      },
      {
        id: "billing",
        title: "Billing & quota",
        summary: "Plans, usage, invoices and plan changes.",
        kind: "Reference",
        audience: ["Admins"],
        keywords: "billing plan invoice quota upgrade payment usage",
        open: { label: "Open Billing & Quota", to: PATHS.billing },
        body: (
          <>
            <P>
              <UI>Billing & Quota</UI> shows your current plan, monthly captured
              leads against your allowance, and your <UI>Invoice History</UI>.
              Use <UI>Upgrade / Manage Plan</UI> to request another tier and
              payment method; the request is confirmed by our team.
            </P>
            <H>Plans</H>
            <Table
              head={["Plan", "Participations / month", "Active campaigns"]}
              rows={Object.values(PLAN_ALLOWANCES).map((plan) => [
                plan.label,
                fmt(plan.entriesPerMonth),
                plan.activeCampaigns === null
                  ? "Unlimited"
                  : String(plan.activeCampaigns),
              ])}
            />
          </>
        ),
      },
      {
        id: "data-retention",
        title: "Player data & retention",
        summary: "What player data is kept, why, and how to export it.",
        kind: "Explanation",
        audience: ["Admins", "IT & Security"],
        keywords: "retention data personal phone delete gdpr 18-07",
        body: (
          <>
            <P>
              For each participation Aktera keeps the phone number, the fields
              of your registration form, the consent proof (text version and
              time), the wilaya, the result and the reward given.
            </P>
            <UL
              items={[
                "Data is only visible to members of your organization.",
                "Export it at any time from the Analytics Desk players table.",
                "To delete a player's data on request, open a support ticket with the phone number and campaign.",
              ]}
            />
          </>
        ),
      },
    ],
  },

  // ───────────────────────────── 5. Developers ─────────────────────────────
  {
    id: "developers",
    title: "Developers & integrations",
    icon: "fa-solid fa-code",
    pages: [
      {
        id: "integrations",
        title: "Integration overview",
        summary: "How to connect Aktera to your channels and tools today.",
        kind: "Explanation",
        audience: ["Developers"],
        keywords: "integration crm api webhook zapier embed qr link",
        body: (
          <>
            <Table
              head={["Need", "How", "Status"]}
              rows={[
                [
                  "Drive traffic to a campaign",
                  <>
                    Share <K>/play/your-link</K> (social, SMS, QR code, website
                    button)
                  </>,
                  "Available",
                ],
                [
                  "Send leads to a CRM",
                  "Export players from the Analytics Desk (Excel) and import them",
                  "Available",
                ],
                [
                  "Reuse a design across campaigns",
                  "Player Studio → Export / Import configuration file",
                  "Available",
                ],
                ["API keys", "Organization → Integrations", "Coming soon"],
                [
                  "Webhooks (participation, win, redemption)",
                  "Organization → Integrations",
                  "Coming soon",
                ],
                ["Zapier / Slack connectors", "—", "Planned"],
              ]}
            />
            <Callout kind="note">
              Add UTM parameters to the link to tell channels apart in your own
              web analytics, e.g. <K>/play/ramadan?utm_source=instagram</K>.
            </Callout>
          </>
        ),
      },
      {
        id: "participation-api",
        title: "Participation endpoint",
        summary:
          "The server function behind every play: request, response and errors.",
        kind: "Reference",
        audience: ["Developers", "IT & Security"],
        keywords:
          "select-prize api endpoint request response json idempotency error code",
        body: (
          <>
            <P>
              The player page sends every play to the <K>select-prize</K>{" "}
              function. It is documented here for security reviews and
              troubleshooting; it is not meant to be called by your own systems
              yet.
            </P>
            <H>Request</H>
            <Code label="POST /functions/v1/select-prize">{`{
  "campaign_id": "6f1c…",
  "phone_number": "+213541234567",
  "game_payload": { "score": 9 },
  "metadata": {
    "consent": { "accepted": true, "version": "2026-10" },
    "client_request_id": "b7e2c1d0-…",
    "source": "public_page",
    "wilaya": "16"
  }
}`}</Code>
            <H>Response (200)</H>
            <Code label="JSON">{`{
  "ok": true,
  "entry": { "id": "…", "redeemed_coupon_value": "COUPON-DZ-101" },
  "prize": { "id": "…", "name": "10% discount" },
  "coupon": { "code": "COUPON-DZ-101", "expires_at": "2026-12-31T22:59:59Z" }
}`}</Code>
            <H>Behavior</H>
            <UL
              items={[
                <>
                  Phone numbers are normalized: <K>0541234567</K> and{" "}
                  <K>+213541234567</K> are the same player.
                </>,
                <>
                  Idempotency: the same <K>client_request_id</K> returns the
                  same answer with <K>replayed: true</K>, and nothing is written
                  twice.
                </>,
                "Codes are claimed atomically: two winners can never receive the same code.",
              ]}
            />
            <H>Error codes</H>
            <Table
              head={["Code", "HTTP", "Meaning"]}
              rows={[
                [
                  <K key="INVALID_INPUT">INVALID_INPUT</K>,
                  "400",
                  "Campaign or phone missing, or not an Algerian mobile number.",
                ],
                [
                  <K key="CONSENT_REQUIRED">CONSENT_REQUIRED</K>,
                  "400",
                  "The player did not give consent.",
                ],
                [
                  <K key="CAMPAIGN_CLOSED">CAMPAIGN_CLOSED</K>,
                  "400 / 404",
                  "Campaign not found, not active, ended, or out of stock.",
                ],
                [
                  <K key="CAMPAIGN_NOT_STARTED">CAMPAIGN_NOT_STARTED</K>,
                  "400",
                  <>
                    Before the start date. The response includes{" "}
                    <K>starts_at</K> so the page can say when it opens.
                  </>,
                ],
                [
                  <K key="ALREADY_PARTICIPATED">ALREADY_PARTICIPATED</K>,
                  "400",
                  "This phone number reached its plays limit for the campaign.",
                ],
                [
                  <K key="DRAW_FAILED">DRAW_FAILED</K>,
                  "500",
                  "The draw could not complete; nothing was given.",
                ],
                [
                  <K key="SERVER_ERROR">SERVER_ERROR</K>,
                  "500",
                  "Unexpected error; retry with the same client_request_id.",
                ],
              ]}
            />
          </>
        ),
      },
      {
        id: "config-file",
        title: "Studio configuration file",
        summary: "The JSON design file you can export and import.",
        kind: "Reference",
        audience: ["Developers"],
        keywords: "json config export import design schema",
        body: (
          <>
            <P>
              <UI>Player Studio → Export</UI> downloads the design as a JSON
              file. It holds content and style only — texts, colors, images,
              layout — never prizes, weights, stock or answers. Import it in
              another campaign to reuse a design. Older files are migrated
              automatically to the current version on import.
            </P>
          </>
        ),
      },
      {
        id: "changelog",
        title: "Changelog & versioning",
        summary: "What changed recently and how changes are announced.",
        kind: "Reference",
        audience: ["Everyone"],
        keywords: "changelog release notes new version deprecation",
        body: (
          <>
            <Table
              head={["Release", "Highlights"]}
              rows={[
                [
                  "Phase 3 (current)",
                  "Themed templates (Comic Burst, Pixel Quest, Arcade Night, Quiz Show) with win intros, team management and roles, redesigned Campaign Wizard and campaigns screens, client support tickets, reward expiry and physical delivery tracking, partner libraries, this documentation.",
                ],
                [
                  "Phase 2",
                  "Player Studio, server-side prize selection with consent and duplicate protection, Analytics Desk, Reward Library.",
                ],
              ]}
            />
            <P>
              Changes that affect live campaigns or exported file formats are
              announced in advance in this changelog. Older Studio files keep
              importing after a format change.
            </P>
          </>
        ),
      },
    ],
  },

  // ───────────────────────────── 6. Trust ─────────────────────────────
  {
    id: "trust",
    title: "Security & compliance",
    icon: "fa-solid fa-shield-halved",
    pages: [
      {
        id: "security",
        title: "Security overview",
        summary: "How data, access and prize integrity are protected.",
        kind: "Explanation",
        audience: ["IT & Security"],
        keywords: "security encryption rls hosting data residency architecture",
        body: (
          <>
            <Terms
              items={[
                [
                  "Hosting",
                  "Supabase (managed PostgreSQL, storage and edge functions) and Firebase Hosting for the web application.",
                ],
                [
                  "Encryption",
                  "All traffic uses HTTPS (TLS). Data is encrypted at rest by the hosting providers.",
                ],
                [
                  "Access control",
                  "Row-level security is enabled on every table: a member only reaches their own organization's data.",
                ],
                [
                  "Anonymous visitors",
                  "Read nothing directly. The player page receives only safe fields (no answers, weights, stock or probabilities).",
                ],
                [
                  "Prize integrity",
                  "Outcomes are decided server-side only; codes are claimed atomically; duplicate participations are refused.",
                ],
                ["Secrets", "Service keys never reach the browser."],
              ]}
            />
            <P>
              For data residency details or a security questionnaire, open a
              support ticket.
            </P>
          </>
        ),
      },
      {
        id: "compliance",
        title: "Law 18-07 & consent",
        summary: "How Aktera supports Algerian personal data protection rules.",
        kind: "Explanation",
        audience: ["IT & Security", "Admins"],
        keywords: "law 18-07 consent gdpr privacy compliance anpdp dpa",
        body: (
          <>
            <P>
              Algerian Law 18-07 governs the processing of personal data. Aktera
              is built so that your campaigns comply by default:
            </P>
            <UL
              items={[
                "No participation is accepted without explicit consent — this is checked on the server, not only in the form.",
                "The consent text, its version and the time it was given are stored with each participation.",
                "You publish your own organizer details, terms and privacy links in Player Studio → Legal.",
                "You remain the data controller of your players' data; Aktera processes it on your behalf.",
              ]}
            />
            <Callout kind="warning">
              You are responsible for any declarations required by the national
              authority (ANPDP) for your processing. Ask your legal team.
            </Callout>
          </>
        ),
      },
      {
        id: "disclosure",
        title: "Vulnerability disclosure",
        summary: "How to report a security issue.",
        kind: "Reference",
        audience: ["IT & Security"],
        keywords: "vulnerability bug bounty report security issue",
        body: (
          <P>
            Report a suspected vulnerability through <UI>Client support</UI>{" "}
            with severity <UI>Urgent</UI> and the type{" "}
            <UI>Error in the platform</UI>. Do not include exploit details in
            public channels. We acknowledge every report and keep you informed
            until it is resolved.
          </P>
        ),
      },
    ],
  },

  // ───────────────────────────── 7. Operations ─────────────────────────────
  {
    id: "operations",
    title: "Operations & support",
    icon: "fa-solid fa-life-ring",
    pages: [
      {
        id: "troubleshooting",
        title: "Troubleshooting & FAQ",
        summary: "Common problems, their causes and fixes.",
        kind: "How-to",
        audience: ["Everyone"],
        keywords: "faq problem error troubleshoot fix help",
        body: (
          <>
            <Table
              head={["Symptom", "Likely cause", "Fix"]}
              rows={[
                [
                  "Players see “campaign closed”",
                  "Ended, paused, or out of stock. Before the start date players are told when it opens instead.",
                  "Check dates and status; add codes or quantity.",
                ],
                [
                  "“Already participated”",
                  "The phone number reached its plays limit.",
                  "Expected. Raise Plays per phone number if your rules allow.",
                ],
                [
                  "Winner got no code",
                  "The reward ran out of codes.",
                  "Add codes; the entry is flagged so you can send one manually.",
                ],
                [
                  "Studio says “Not saved”",
                  "Network issue or a teammate saved meanwhile.",
                  "Wait for autosave; reload if you are warned of a conflict.",
                ],
                [
                  "Codes import refused",
                  "Wrong columns or duplicates.",
                  "Use the template (Index, Code); resolve duplicates.",
                ],
                [
                  "Arabic text looks wrong",
                  "Mixed directions.",
                  "Write Arabic in the Arabic field of Languages; direction is automatic.",
                ],
              ]}
            />
            <H>FAQ</H>
            <Terms
              items={[
                [
                  "Can I change rewards after launch?",
                  "Yes, but it affects fairness for players who already played. Prefer Relaunch.",
                ],
                [
                  "Are sandbox plays counted?",
                  "No. They never appear in analytics and never use stock.",
                ],
                [
                  "Which phone numbers are accepted?",
                  "Algerian mobiles starting with 05, 06 or 07 (10 digits), or the same with +213.",
                ],
                [
                  "Can a player play on two campaigns?",
                  "Yes. Limits apply per campaign.",
                ],
              ]}
            />
          </>
        ),
      },
      {
        id: "support",
        title: "Support process",
        summary: "How to open a ticket, severity levels and ticket states.",
        kind: "How-to",
        audience: ["Everyone"],
        keywords: "support ticket help severity escalation contact",
        open: { label: "Open Client support", to: PATHS.support },
        body: (
          <>
            <Steps
              steps={[
                {
                  title: "Open a ticket",
                  body: (
                    <>
                      Go to <UI>Client support</UI> and click{" "}
                      <UI>Open new support ticket</UI>.
                    </>
                  ),
                },
                {
                  title: "Describe the problem",
                  body: "Choose the section (Campaign creation, Analytics, Inventory, Player screen editor, Other), the type (Error, Slowness, Other), the severity, and describe it (10–2,000 characters). Your account details are attached automatically.",
                },
                {
                  title: "Follow it",
                  body: (
                    <>
                      You receive a reference like <K>SUP-0042</K>. Open the
                      ticket to read answers and add comments.
                    </>
                  ),
                  result: "the ticket appears in your history with its state.",
                },
              ]}
            />
            <H>Severity levels</H>
            <Table
              head={["Severity", "Use it when"]}
              rows={[
                [
                  "Urgent",
                  "A live campaign is down or players cannot receive rewards; or a security issue.",
                ],
                ["High", "A major feature is broken with no workaround."],
                ["Medium", "A feature is impaired but a workaround exists."],
                ["Low", "A question, a cosmetic issue or a suggestion."],
              ]}
            />
            <H>Ticket states</H>
            <Terms
              items={[
                ["New", "Received, not yet picked up."],
                ["Open", "Being worked on."],
                [
                  "On hold",
                  "Waiting for information from you or a third party.",
                ],
                ["Resolved", "Fixed or answered."],
                ["Cancelled", "Closed without action (duplicate, withdrawn)."],
              ]}
            />
            <P>
              Response targets per severity are defined in your service
              agreement. To escalate, add a comment to the ticket asking for
              escalation and raise its severity.
            </P>
          </>
        ),
      },
      {
        id: "limits",
        title: "Limits & quotas",
        summary: "Product limits to know when planning a campaign.",
        kind: "Reference",
        audience: ["Everyone"],
        keywords: "limits quota maximum characters duration",
        body: (
          <Table
            head={["Item", "Limit"]}
            rows={[
              ["Campaign name", "3–80 characters"],
              ["Brand name", "2–50 characters"],
              ["Hit It target score", "At least 1"],
              ["Quiz answers per question", "2–4"],
              [
                "Active campaigns at once",
                `${MAX_ACTIVE_CAMPAIGNS} on every plan (enforced on the server)`,
              ],
              ["Support ticket description", "10–2,000 characters"],
              [
                "Participations per month",
                "Depends on your plan (see Billing & quota)",
              ],
              ["Active campaigns", "Depends on your plan"],
            ]}
          />
        ),
      },
      {
        id: "offboarding",
        title: "Data export & account closure",
        summary: "Take your data with you and close your organization.",
        kind: "How-to",
        audience: ["Admins"],
        keywords: "offboarding export close delete account cancel",
        body: (
          <Steps
            steps={[
              {
                title: "Export players",
                body: "Analytics Desk → players table → Export (Excel), per campaign or for all campaigns.",
              },
              {
                title: "Export codes and winners",
                body: "Reward Library → each reward → Export (codes) or Export winners (physical).",
              },
              {
                title: "Export designs",
                body: "Player Studio → Export, for each campaign you want to keep.",
              },
              {
                title: "Request closure",
                body: "Open a support ticket asking to close the organization. All data is deleted once closure is confirmed.",
              },
            ]}
          />
        ),
      },
    ],
  },
];

export const ALL_DOC_PAGES: (DocPage & { chapter: DocChapter })[] =
  DOC_CHAPTERS.flatMap((chapter) =>
    chapter.pages.map((page) => ({ ...page, chapter })),
  );

export function findDocPage(id: string) {
  return ALL_DOC_PAGES.find((page) => page.id === id);
}

/** Pages whose title, summary, chapter or keywords contain every word of the query. */
export function searchDocPages(query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ALL_DOC_PAGES;
  return ALL_DOC_PAGES.filter((page) => {
    const haystack =
      `${page.title} ${page.summary} ${page.chapter.title} ${page.keywords ?? ""} ${page.audience.join(" ")}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}
