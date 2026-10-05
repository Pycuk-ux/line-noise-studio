import type { ReactNode } from "react";
import slackLogo from "./assets/slack-logo.png";
import peAvatar from "./assets/pe-avatar.svg";
import peAvatarFilled from "./assets/pe-avatar-filled.svg";
import fileIcon from "./assets/file.svg";
import downloadIcon from "./assets/download.svg";

// Illustrations of Partner Element answering inside Slack. Positions inside the
// card are taken 1:1 from Figma (they're fixed-size pictures, not flowing text).

const AVATAR_GRADIENT =
  "linear-gradient(121.4deg, rgb(218,218,239) 10.3%, rgb(197,235,234) 47.4%, rgb(231,231,242) 92.8%)";

export function SlackWindow({ width = 546, height, children }: { width?: number; height: number; children: ReactNode }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-[12px] bg-white shadow-pe-card"
      style={{ width, height }}
    >
      <div className="absolute inset-x-0 top-0 h-[48px] bg-pe-slack" />
      <img src={slackLogo} alt="" className="absolute left-[20px] top-[12px] size-[24px] object-cover" />
      <div className="absolute left-[calc(50%-39px)] top-[10px] h-[29px] w-[244px] -translate-x-1/2 rounded-[5px] bg-pe-slack-search" />
      <p className="absolute right-[20px] top-[15px] whitespace-nowrap text-[15px] font-medium text-pe-bg">My workspace</p>
      {children}
    </div>
  );
}

/** "Adam Smith" asking the question. */
function UserMessage({ question }: { question: string }) {
  return (
    <div className="absolute left-[20px] top-[72px] h-[32px] w-[266px]">
      <div className="absolute left-0 top-0 size-[32px] rounded-[5px]" style={{ backgroundImage: AVATAR_GRADIENT }} />
      <p className="trim-cap absolute left-[44px] top-[2px] whitespace-nowrap text-[16px] font-medium tracking-[-0.32px] text-pe-ink-2">
        Adam Smith
      </p>
      <p className="trim-cap absolute left-[140px] top-[5px] whitespace-nowrap text-[12px] tracking-[-0.24px] text-[#3c3c3e] opacity-80">
        6:07 AM
      </p>
      <p className="absolute left-[44px] top-[16px] whitespace-nowrap text-[14px] text-pe-ink-2">{question}</p>
    </div>
  );
}

function AppBadge() {
  return (
    <span className="flex h-[20px] w-[32px] items-center justify-center rounded-[4px] bg-[#f0f0f0] text-[12px] font-medium leading-none tracking-[-0.24px] text-[#3c3c3e]">
      APP
    </span>
  );
}

const Time = ({ children }: { children: string }) => (
  <span className="whitespace-nowrap text-[12px] leading-none tracking-[-0.24px] text-[#3c3c3e] opacity-80">{children}</span>
);

/** Partner Element reply header directly under the question (small variant). */
function BotReply({ children }: { children?: ReactNode }) {
  return (
    <div className="absolute left-[20px] top-[120px] h-[37px] w-[289px]">
      <img src={peAvatar} alt="" width={32} height={32} className="absolute left-0 top-[3px]" />
      <div className="absolute left-[44px] top-0 flex h-[20px] items-center gap-[8px]">
        <span className="whitespace-nowrap text-[16px] font-medium leading-none tracking-[-0.32px] text-pe-ink-2">Partner Element</span>
        <Time>6:08 AM</Time>
        <AppBadge />
      </div>
      {children}
    </div>
  );
}

/** Partner Element reply header further down the thread (large variant). */
function BotReplyLarge({ top }: { top: number }) {
  return (
    <>
      <img src={peAvatar} alt="" width={32} height={32} className="absolute left-[20px]" style={{ top }} />
      <div className="absolute left-[64px] flex h-[20px] items-center gap-[8px]" style={{ top: top - 3 }}>
        <span className="whitespace-nowrap text-[18px] font-medium leading-none tracking-[-0.36px] text-pe-ink-2">Partner Element</span>
        <AppBadge />
      </div>
    </>
  );
}

const Hi = ({ children }: { children: ReactNode }) => <span className="font-medium text-pe-navy">{children}</span>;

function Tags({ top, items, bottom }: { top?: number; bottom?: number; items: string[] }) {
  return (
    <div className="absolute left-[64px] flex items-start gap-[8px]" style={{ top, bottom }}>
      {items.map((t) => (
        <span key={t} className="whitespace-nowrap rounded-[4px] border border-pe-purple px-[8px] py-[2px] text-[14px] text-pe-purple">
          {t}
        </span>
      ))}
    </div>
  );
}

/** Divider + "HEADS-UP" proactive alert with an action link. `top` = divider y. */
function HeadsUp({ top, note, action, noteWidth = 272 }: { top: number; note: string; action: string; noteWidth?: number }) {
  return (
    <>
      <div className="absolute left-[64px] right-[20px] h-px bg-pe-line-2" style={{ top }} />
      <p className="absolute left-[64px] whitespace-nowrap font-menlo text-[12px] uppercase text-[#7d3e1d]" style={{ top: top + 20 }}>
        Heads-up
      </p>
      <p className="absolute left-[64px] text-[14px] text-pe-body" style={{ top: top + 42, width: noteWidth }}>
        {note}
      </p>
      <a href="#" className="absolute right-[20px] whitespace-pre text-right text-[14px] font-medium text-pe-navy hover:underline" style={{ top: top + 60 }}>
        {`${action}  →`}
      </a>
    </>
  );
}

function Table({ top, rows, split = "50%" }: { top: number; split?: string; rows: [ReactNode, ReactNode][] }) {
  return (
    <div className="absolute left-[64px] right-[20px] flex h-[78px] flex-col divide-y divide-pe-line-2 overflow-hidden rounded-[5px] border border-pe-line-2" style={{ top }}>
      {rows.map(([l, r], i) => (
        <div key={i} className="relative flex flex-1 items-center justify-between px-[11.5px] text-[14px] text-pe-body">
          <div className="absolute inset-y-[0.5px] w-px bg-pe-line-2" style={{ left: split }} />
          <span className="whitespace-nowrap">{l}</span>
          <span className="whitespace-nowrap text-right font-medium">{r}</span>
        </div>
      ))}
    </div>
  );
}

function Attachment({ name, top, className, download }: { name: string; top: number; className: string; download?: boolean }) {
  return (
    <div className={`absolute left-[62px] flex h-[46px] items-center overflow-hidden rounded-[5px] ${className}`} style={{ top }}>
      <img src={fileIcon} alt="" width={30} height={30} className="absolute left-[8px] top-[8px]" />
      <p className="absolute left-[46px] whitespace-nowrap text-[14px] text-pe-ink-2">{name}</p>
      {download && <img src={downloadIcon} alt="Download" width={24} height={24} className="absolute right-[16px] top-1/2 -translate-y-1/2" />}
    </div>
  );
}

export function MarketingCard() {
  return (
    <SlackWindow height={409}>
      <UserMessage question="How much is left on my events POs?" />
      <BotReply>
        <p className="absolute left-[44px] top-[19px] whitespace-nowrap text-[14px] leading-[18px] text-pe-body">
          3 open POs, <Hi>$41,200 left</Hi> of $120,000
        </p>
      </BotReply>
      <Table top={169} rows={[["Venue", "$18,000"], ["AV", "$15,700"], ["Catering", "$7,500"]]} />
      <Tags top={263} items={["ERP"]} />
      <HeadsUp top={307} note="An AV invoice is waiting on your approval and payment is due in 3 days." action="Approve invoice" />
    </SlackWindow>
  );
}

export function WorkplaceCard() {
  return (
    <SlackWindow height={345}>
      <UserMessage question="When does the janitorial contract in Denver renew?" />
      <BotReply>
        <p className="absolute left-[44px] top-[19px] w-[456px] text-[14px] leading-[22px] text-pe-body">
          Auto-renews <Hi>February 1, 2027</Hi>. Notice is due <Hi>December 3, 2026</Hi>, under the 60-day notice
          clause. Current rate: $4,200 per month. Owner: you.
        </p>
      </BotReply>
      <Tags top={199} items={["Contracts"]} />
      <HeadsUp top={243} note="Review the renewal before the December 3 notice deadline." action="Start renewal review" />
    </SlackWindow>
  );
}

export function ItCard() {
  return (
    <SlackWindow height={319}>
      <UserMessage question="Which SaaS renewals are coming up next quarter?" />
      <BotReply>
        <p className="absolute left-[44px] top-[19px] whitespace-nowrap text-[14px] leading-[22px] text-pe-body">
          <Hi>7 renewals next quarter</Hi>. 3 are next month.
        </p>
      </BotReply>
      <Tags top={173} items={["Contracts", "Employee directory"]} />
      <HeadsUp
        top={217}
        note="One of next month’s contracts needs a new owner. The current owner is inactive."
        action="Find a new owner"
      />
    </SlackWindow>
  );
}

export function ProcurementCard() {
  const link = (t: string) => <span className="text-pe-purple">{t} →</span>;
  return (
    <SlackWindow height={396}>
      <UserMessage question="How much is left on my Q4 events POs?" />
      <BotReply />
      <Table
        top={144}
        split="calc(50% + 98px)"
        rows={[
          [<><b className="font-medium">Purchase request</b>: Approved</>, link("View request")],
          [<><b className="font-medium">Contract</b>: Signed</>, link("View contract")],
          [<><b className="font-medium">PO</b>: Open · $60,000 total · $20,000 remaining</>, link("View PO")],
        ]}
      />
      <Tags top={234} items={["Procurement", "Contracts", "ERP"]} />
      <HeadsUp
        top={278}
        noteWidth={309}
        note="The PO has $20,000 remaining and its service period ends in 30 days."
        action="Set a reminder"
      />
    </SlackWindow>
  );
}

export function ApCard() {
  return (
    <SlackWindow height={381}>
      <UserMessage question="Reconcile the attached vendor statement." />
      <Attachment name="statement-demo.csv" top={120} className="w-[259px] bg-[#f4f1fa]" />
      <BotReplyLarge top={193} />
      <p className="absolute left-[64px] top-[211px] w-[385px] text-[14px] leading-[22px] text-pe-body">
        Reconciled 10 invoices. Payment statuses and discrepancies are in the report.
      </p>
      <Attachment name="reconciliation-report.csv" top={263} className="right-[22px] bg-pe-bg" download />
      <Tags top={333} items={["ERP"]} />
    </SlackWindow>
  );
}

export function FpaCard() {
  return (
    <SlackWindow height={316}>
      <UserMessage question="Which of these 20 POs have no invoice recorded for Q2?" />
      <BotReplyLarge top={131} />
      <p className="absolute left-[64px] top-[149px] whitespace-nowrap text-[14px] font-medium leading-[22px] text-pe-navy">
        20 POs checked. 4 have no invoice recorded for Q2:
      </p>
      <a
        href="#"
        className="absolute left-[64px] top-[205px] flex h-[40px] w-[154px] items-center rounded-[5px] bg-[#f6f5fd] pl-[16px] text-[14px] font-medium leading-[22px] text-pe-navy"
      >
        Download list
        <img src={downloadIcon} alt="" width={24} height={24} className="absolute right-[16px] top-1/2 -translate-y-1/2" />
      </a>
      <Tags bottom={23} items={["ERP"]} />
    </SlackWindow>
  );
}

/** Section 03 — the daily digest message. */
export function DigestCard() {
  const items = [
    { y: 116, title: "Your AV vendor invoice is waiting on your approval", meta: "$9,800 · due Friday", metaY: 136, action: "Approve invoice  →" },
    { y: 198, title: "The Austin venue request has been with Legal for nine days", meta: "Owner: Jordan Lee · nudged today", metaY: 241, action: "View request →", wrap: true },
    { y: 303, title: "PO-DEMO-104 is ready for closure", meta: "$15,700 open · owner confirmed no further invoices expected", metaY: 323, action: "Close PO →" },
  ];
  return (
    <SlackWindow width={658} height={430}>
      <div className="absolute left-[20px] top-[68px] h-[32px] w-[266px]">
        <img src={peAvatarFilled} alt="" width={32} height={32} className="absolute left-0 top-0" />
        <div className="absolute left-[44px] top-[6px] flex h-[20px] items-center gap-[8px]">
          <span className="whitespace-nowrap text-[18px] font-medium leading-none tracking-[-0.36px] text-pe-ink-2">Partner Element</span>
          <AppBadge />
          <Time>6:07 AM</Time>
        </div>
      </div>
      {items.map((it) => (
        <div key={it.title}>
          <p
            className={`trim-cap absolute left-[64px] text-[18px] tracking-[-0.36px] text-pe-ink-2 ${it.wrap ? "w-[336px]" : "whitespace-nowrap"}`}
            style={{ top: it.y }}
          >
            {it.title}
          </p>
          <p className="absolute left-[64px] whitespace-nowrap text-[14px] leading-[22px] text-pe-muted" style={{ top: it.metaY }}>
            {it.meta}
          </p>
          <a href="#" className="absolute right-[20px] whitespace-pre text-right text-[14px] font-medium text-pe-navy hover:underline" style={{ top: it.y - 2 }}>
            {it.action}
          </a>
        </div>
      ))}
      {[178, 283, 365].map((y) => (
        <div key={y} className="absolute left-[64px] h-px w-[574px] bg-[#e0deef]" style={{ top: y }} />
      ))}
      <p className="absolute left-[64px] top-[385px] whitespace-nowrap text-[14px] leading-[22px] text-pe-body">
        14 other monitored requests and POs have no flagged exceptions.
      </p>
    </SlackWindow>
  );
}
