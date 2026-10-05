import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import quoteIcon from "./assets/quote.svg";
import { ApCard, FpaCard, ItCard, MarketingCard, ProcurementCard, WorkplaceCard } from "./SlackMocks";

type UseCase = {
  id: string;
  tab: string;
  /** Headline: dark lead-in + purple payoff. `stack` puts the payoff on its own line. */
  title: [string, string];
  stack?: boolean;
  audience: string;
  questions: string[];
  Illustration: () => ReactNode;
};

const USE_CASES: UseCase[] = [
  {
    id: "marketing-events",
    tab: "Marketing & Events",
    title: ["Stay ahead of event spend", "without tracking every PO yourself."],
    stack: true,
    audience: "Budget owners who run events, agencies and campaigns",
    questions: [
      "How much is left on my events POs?",
      "Has the venue invoice been paid?",
      "What did we pay this vendor last time?",
      "Which contracts or invoices need attention before my next event?",
    ],
    Illustration: MarketingCard,
  },
  {
    id: "workplace-facilities",
    tab: "Workplace & Facilities",
    title: ["Every office vendor, contract and invoice ", "in one thread."],
    audience: "Teams that own leases, office services and site vendors",
    questions: [
      "When does the janitorial contract in Denver renew?",
      "Which facilities POs are about to run out?",
      "Is the HVAC repair covered by the service contract?",
      "What are we paying per month across coffee vendors?",
    ],
    Illustration: WorkplaceCard,
  },
  {
    id: "it-saas",
    tab: "IT & SaaS owners",
    title: ["Walk into every renewal ", "knowing spend and terms."],
    audience: "Owners of software, hardware and security tooling",
    questions: [
      "Which SaaS renewals are coming up next quarter?",
      "What’s our total spend with Atlassian this year?",
      "Who owns the Figma contract?",
      "Do we have a signed DPA with this vendor?",
    ],
    Illustration: ItCard,
  },
  {
    id: "procurement",
    tab: "Procurement",
    title: ["Fewer “where’s my PO?” pings. ", "More time negotiating."],
    audience: "Owners of software, hardware and security tooling",
    questions: [
      "Which requests have been stuck in approval for over 5 days?",
      "Show POs over $50K with no contract attached.",
      "What did we pay this vendor under the last agreement?",
      "Show the request, contract, and PO for this purchase.",
    ],
    Illustration: ProcurementCard,
  },
  {
    id: "ap-accounting",
    tab: "AP & Accounting",
    title: ["Answers before close, ", "not during it."],
    audience: "Owners of software, hardware and security tooling",
    questions: [
      "Has invoice INV-8812 been paid, and when?",
      "What are the payment terms for this vendor?",
      "Which invoices have been awaiting approval for more than 3 business days?",
      "Which open POs have no invoice recorded this month?",
      "Reconcile the attached vendor statement.",
    ],
    Illustration: ApCard,
  },
  {
    id: "fpa-finance",
    tab: "FP&A & Finance leaders",
    title: ["The real spend picture, ", "without waiting on a report."],
    audience: "Owners of software, hardware and security tooling",
    questions: [
      "How much remains on open POs by cost center?",
      "Which large POs are past service end with money remaining?",
      "What did we pay this vendor last quarter?",
      "Which of these 20 POs have no invoice recorded for Q2?",
    ],
    Illustration: FpaCard,
  },
];

/** Distance from the viewport top where the menu sticks and subsections "arrive". */
const STICKY_TOP = 120;
/** Vertical padding above each subsection's content (below its divider). */
const ROW_PAD = 56;

/**
 * Index of the subsection that is first from the top: the first one whose bottom
 * edge is still below the sticky line.
 */
function currentIndex(rows: (HTMLElement | null)[]) {
  for (let i = 0; i < rows.length; i++) {
    const el = rows[i];
    if (el && el.getBoundingClientRect().bottom > STICKY_TOP + 1) return i;
  }
  return rows.length - 1;
}

export function UseCases() {
  const [active, setActive] = useState(0);
  const rowRefs = useRef<(HTMLElement | null)[]>([]);
  // While a click-triggered smooth scroll runs, keep the clicked tab highlighted
  // instead of flickering through the tabs it passes.
  const lockRef = useRef<number | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (lockRef.current === null) setActive(currentIndex(rowRefs.current));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onScrollEnd = () => {
      if (lockRef.current !== null) {
        clearTimeout(lockRef.current);
        lockRef.current = null;
        update();
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("scrollend", onScrollEnd);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
    };
  }, []);

  const goTo = useCallback((i: number) => {
    const row = rowRefs.current[i];
    if (!row) return;
    // Align the subsection's illustration + text with the sticky menu (120px).
    const pad = i === 0 ? 0 : ROW_PAD;
    const top = window.scrollY + row.getBoundingClientRect().top + pad - STICKY_TOP;
    setActive(i);
    if (lockRef.current !== null) clearTimeout(lockRef.current);
    // Fallback unlock for browsers without the `scrollend` event.
    lockRef.current = window.setTimeout(() => {
      lockRef.current = null;
      setActive(currentIndex(rowRefs.current));
    }, 1200);
    window.scrollTo({ top, behavior: "smooth" });
    history.replaceState(null, "", `#${USE_CASES[i].id}`);
  }, []);

  return (
    <section id="use-cases" className="bg-pe-bg py-[80px]">
      <div className="mx-auto flex max-w-[1440px] justify-between px-[56px]">
        {/* Stretches to the height of all subsections, so the sticky menu
            scrolls away together with the last one. */}
        <aside className="w-[225px] shrink-0 pt-[44px]">
          <nav className="sticky flex flex-col gap-[24px]" style={{ top: STICKY_TOP }} aria-label="Use cases">
            <p className="text-[12px] uppercase tracking-[2px] text-pe-ink-2">Use cases</p>
            <ul className="flex flex-col border-l border-pe-line">
              {USE_CASES.map((uc, i) => (
                <li key={uc.id}>
                  <a
                    href={`#${uc.id}`}
                    aria-current={i === active ? "true" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      goTo(i);
                    }}
                    className={`-ml-px block whitespace-nowrap border-l-2 px-[12px] py-[8px] font-coil text-[18px] tracking-[-0.54px] transition-colors duration-200 ${
                      i === active
                        ? "border-pe-navy text-pe-navy"
                        : "border-transparent text-pe-lilac hover:text-pe-navy"
                    }`}
                  >
                    {uc.tab}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="w-[993px] shrink-0">
          {USE_CASES.map((uc, i) => (
            <article
              key={uc.id}
              id={uc.id}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              className={`flex justify-between ${i === 0 ? "pb-[61px]" : "border-t border-pe-line pt-[56px]"} ${
                i > 0 && i < USE_CASES.length - 1 ? "pb-[56px]" : ""
              }`}
            >
              <div className={`flex w-[403px] flex-col gap-[12px] ${i === 0 ? "pt-[44px]" : ""}`}>
                <h3 className="font-coil text-[32px] leading-[36px] tracking-[-0.96px] text-pe-ink">
                  {uc.title[0]}
                  {uc.stack && <br />}
                  <span className="text-pe-purple">{uc.title[1]}</span>
                </h3>
                <p className="text-[14px] text-pe-body">{uc.audience}</p>
                <ul className="flex flex-col gap-[12px] pt-[32px]">
                  {uc.questions.map((q) => (
                    <li key={q} className="flex items-start gap-[12px] text-[14px] text-pe-body">
                      <img src={quoteIcon} alt="" width={14} height={24} className="shrink-0" />
                      <span className="pt-[3px]">{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <uc.Illustration />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
