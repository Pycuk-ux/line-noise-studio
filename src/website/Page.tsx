import type { ReactNode } from "react";
import logo from "./assets/logo.svg";
import logoFooter from "./assets/logo-footer.svg";
import check from "./assets/check.svg";
import { DigestCard } from "./SlackMocks";
import { UseCases } from "./UseCases";

const Container = ({ className = "", children }: { className?: string; children: ReactNode }) => (
  <div className={`mx-auto max-w-[1440px] ${className}`}>{children}</div>
);

function Hero() {
  const points = [
    { text: "Answers the spend questions every team has", w: 220 },
    { text: <>Alerts directly<br />the right owner</>, w: 196 },
    { text: "Takes the next step in Slack or Microsoft Teams", w: 220 },
  ];
  return (
    <header className="bg-pe-bg">
      <Container className="flex h-[503px] flex-col items-center px-[56px] pt-[32px]">
        <nav className="flex h-[40px] w-full items-center justify-between">
          <a href="#" aria-label="Partner Element home">
            <img src={logo} alt="Partner Element" width={170} height={40} />
          </a>
          <div className="flex items-center gap-[16px] text-[16px] text-pe-navy">
            <div className="flex items-center gap-[16px] pr-[12px]">
              <a href="#use-cases" className="px-[8px] leading-[24px] hover:underline">Use cases</a>
              <a href="#" className="leading-[24px] hover:underline">Build vs. buy</a>
              <a href="#" className="min-w-[64px] text-center tracking-[0.46px] hover:underline">Log in</a>
            </div>
            <a
              href="#demo"
              className="min-w-[64px] rounded-[5px] border border-pe-navy px-[16px] py-[8px] leading-[20px] tracking-[0.46px] transition-colors hover:bg-pe-navy hover:text-white"
            >
              Request demo
            </a>
          </div>
        </nav>

        <h1 className="mt-[41px] flex w-[880px] flex-col gap-[4px] text-center font-coil text-[60px] leading-[62px] tracking-[-2.4px]">
          <span className="text-pe-ink">One place to ask about spend.</span>
          <span className="text-pe-purple">Whatever your job is.</span>
        </h1>

        <ul className="mt-[28px] flex gap-[16px] px-[16px]">
          {points.map((p, i) => (
            <li key={i} className="contents">
              {i > 0 && <span className="w-px self-stretch bg-pe-line" aria-hidden />}
              <div className="flex flex-col items-center gap-[8px] py-[4px] text-center text-[16px] text-pe-ink" style={{ width: p.w }}>
                <img src={check} alt="" width={17} height={14} />
                <p>{p.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <a
          href="#demo"
          className="mt-[38px] min-w-[64px] rounded-[5px] border-2 border-pe-purple bg-pe-purple px-[24px] py-[12px] text-[16px] font-medium tracking-[-0.32px] text-[#fafafa] transition-colors hover:bg-pe-navy hover:border-pe-navy"
        >
          See it on your data
        </a>
      </Container>
    </header>
  );
}

const Eyebrow = ({ children }: { children: ReactNode }) => (
  <p className="whitespace-nowrap text-[12px] uppercase tracking-[2px] text-pe-navy">{children}</p>
);

function ForEveryRole() {
  const pillars = [
    {
      tag: "Permissioned",
      title: "Access that follows the work",
      body: "Contract owners can see billing. Invoice approvers can see contract terms. If your access is partial, we say so and let you request more in Slack or Teams.",
    },
    {
      tag: "Tailored",
      title: "Answers tailored to you",
      body: "The same question gets a different focus: balances, payment status, contract terms, accounting detail, or spend across teams.",
    },
    {
      tag: "Actionable",
      title: "The next step, in context",
      body: "When an action follows from your question, we put it in the answer: approve, request, change, or close. We turn recurring questions into automations so you don’t have to keep asking.",
    },
  ];
  return (
    <section className="bg-white pb-[48px] pt-[80px]">
      <Container className="flex flex-col gap-[32px] px-[56px]">
        <div className="flex flex-col gap-[16px]">
          <Eyebrow>02 · For every role</Eyebrow>
          <h2 className="font-coil text-[46px] leading-[50.6px] tracking-[-0.46px] text-pe-ink">
            Same question. <span className="text-pe-purple">The answer you need.</span>
          </h2>
        </div>
        <div className="flex gap-[12px]">
          {pillars.map((p) => (
            <div key={p.tag} className="flex flex-1 flex-col items-start">
              <span className="rounded-[12px] bg-[#f3f2f0] p-[8px] text-[14px] font-medium leading-[16px] text-pe-body">{p.tag}</span>
              <h3 className="pt-[12px] font-coil text-[23px] leading-[34.5px] tracking-[-0.23px] text-pe-navy">{p.title}</h3>
              <p className="w-[365px] pt-[8px] text-[14px] leading-[24px] text-pe-body">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="h-px bg-pe-line-2" />
        <p className="w-[840px] text-[16px] text-pe-muted">
          Business teams get their own answers. Finance spends less time following up before close.
          <br />
          Employees need fewer separate ERP and contract-tool licenses.
        </p>
      </Container>
    </section>
  );
}

function WhatItLooksLike() {
  return (
    <section className="bg-pe-bg py-[80px]">
      <Container className="flex justify-between gap-[40px] px-[56px]">
        <div className="w-[598px]">
          <div className="flex flex-col gap-[16px]">
            <Eyebrow>03 · What it looks like</Eyebrow>
            <h2 className="font-coil text-[46px] leading-[50.6px] tracking-[-0.46px] text-pe-ink">
              Three things need you. <span className="text-pe-purple">Everything else can wait.</span>
            </h2>
          </div>
          <p className="mt-[33px] w-[458px] text-[18px] text-pe-body">
            One message in Slack or Teams, with the details and actions to move things forward.
          </p>
        </div>
        <DigestCard />
      </Container>
    </section>
  );
}

function InPractice() {
  const stats = [
    { value: "10×", label: "Faster PO checks", detail: "10 mins → 1 min", cls: "bg-pe-line-2 text-pe-navy" },
    { value: "15×", label: "Faster renewal lookups", detail: "30 mins → 2 mins", cls: "bg-pe-purple text-white" },
  ];
  return (
    <section className="bg-pe-bg pb-[80px]">
      <Container className="flex flex-col gap-[23px] px-[56px]">
        <Eyebrow>03 · In practice</Eyebrow>
        <div className="flex items-center gap-[12px]">
          <figure className="relative h-[218px] flex-1 overflow-hidden rounded-[12px] bg-white">
            <figcaption className="absolute left-[40px] top-[32px] whitespace-nowrap text-[14px] text-pe-muted">
              Director of Workplace Operations, public technology company (~4,000 employees)
            </figcaption>
            <blockquote className="absolute left-[40px] right-[28px] top-[66px] font-coil text-[32px] leading-[40px] tracking-[-0.6px] text-pe-ink">
              “I’d call it our procurement executive assistant.
              <br />
              It’s a one-stop shop for invoices, payment terms and contracts.”
            </blockquote>
          </figure>
          {stats.map((s) => (
            <div key={s.value} className={`relative h-[218px] w-[267px] shrink-0 overflow-hidden rounded-[12px] ${s.cls}`}>
              <p className="absolute left-[24px] top-[21px] whitespace-nowrap text-[52px] leading-[56px] tracking-[-2.08px]">{s.value}</p>
              <p className="absolute left-[24px] top-[78px] whitespace-nowrap text-[14px] opacity-80">{s.label}</p>
              <p className="absolute left-[24px] top-[174px] w-[194px] text-[16px]">{s.detail}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Cta() {
  return (
    <section
      id="demo"
      className="relative overflow-hidden px-[56px] py-[72px]"
      style={{ backgroundImage: "linear-gradient(166.75deg, rgb(26,16,64) 0%, rgb(47,30,103) 60%, rgb(81,70,137) 100%)" }}
    >
      <div className="pointer-events-none absolute right-[182px] top-[307px] size-[320px] rounded-[60px] bg-[#a7a4e0] opacity-30 blur-[100px]" />
      <div className="pointer-events-none absolute left-[93px] top-[-160px] h-[320px] w-[531px] rounded-[60px] bg-[#4298b5] opacity-30 blur-[100px]" />
      <div className="relative flex flex-col items-center gap-[48px] text-center text-[#fafafa]">
        <div className="flex flex-col gap-[16px]">
          <h2 className="font-coil text-[52px] leading-[56px] tracking-[-0.6px]">See it on your data.</h2>
          <p className="text-[16px]">We’ll show you what your team would have been told last month.</p>
        </div>
        <a
          href="#"
          className="min-w-[64px] rounded-[5px] bg-[#fafafa] px-[24px] py-[16px] text-[18px] font-medium tracking-[-0.36px] text-pe-purple transition-colors hover:bg-white"
        >
          See it on your data
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-pe-bg">
      <Container className="h-[287px] px-[80px] pt-[80px]">
        <img src={logoFooter} alt="Partner Element" width={323} height={76} />
        <p className="mt-[8px] text-[14px] text-pe-body">2026 PartnerElement Inc.</p>
        <div className="mt-[41px] flex items-center justify-between">
          <p className="text-[18px] text-pe-body">
            Contact us:{" "}
            <a href="mailto:support@partnerelement.com" className="underline">
              support@partnerelement.com
            </a>
          </p>
          <nav className="flex gap-[40px] text-[16px] leading-[24px] text-pe-navy">
            {["Terms of services", "Privacy policy", "Security", "Status"].map((l) => (
              <a key={l} href="#" className="hover:underline">{l}</a>
            ))}
          </nav>
        </div>
      </Container>
    </footer>
  );
}

export default function Page() {
  return (
    <>
      <Hero />
      <main>
        <UseCases />
        <ForEveryRole />
        <WhatItLooksLike />
        <InPractice />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
