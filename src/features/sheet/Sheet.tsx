import type { ReactNode } from "react";
import {
  ABOUT,
  BLOGS,
  CONTACT,
  EDUCATION,
  EXPERIENCE,
  PROFILE,
  PROJECTS,
  SEALED_PROJECT,
  SECTIONS,
  SKILLS,
  SKILLS_NOTE,
  SKILLS_SUMMARY,
  SUBJECT,
  type SectionDef,
} from "../../data/content";
import "./sheet.css";

/** Renders text, turning every [[bracketed]] run into a black redaction bar. */
function Rd({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[\[.*?\]\])/g).map((part, i) =>
        part.startsWith("[[") ? (
          <span key={i} className="rd" aria-label="redacted">
            {part.slice(2, -2)}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/*
 * The seal is a picture rather than inline SVG: lettering drawn inline has to
 * be laid out again every time the sheet changes size, which is every frame
 * while a folder is in flight.
 */
function Seal() {
  return <img className="sheet__seal" src="/assets/images/seal.svg" alt="" />;
}

function CrossBox({ label }: { label: string }) {
  return (
    <div className="xbox">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="0" x2="100" y2="100" />
        <line x1="100" y1="0" x2="0" y2="100" />
      </svg>
      <span>{label}</span>
    </div>
  );
}

function Fields({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="fields">
      {rows.map(([k, v]) => (
        <div key={k} className="fields__row">
          <dt>{k}:</dt>
          <dd>
            <Rd text={v} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="sheet__h">{children}...</h2>;
}

/* ---------- pages ---------- */

interface PageProps {
  /** turns the folder to another of its pages */
  onTurn?: (to: number) => void;
}

const CHART = [190, 186, 182, 178, 174, 170, 166, 162, 158, 154, 150, 146, 142];

function ProfilePage() {
  return (
    <>
      <div className="split">
        <div>
          <div className="sheet__id">■{PROFILE.recordId}</div>
          <Fields rows={PROFILE.fields} />
        </div>
        <div className="mug">
          <div className="mug__chart">
            {CHART.map((n) => (
              <div key={n} className="mug__line">
                <span>{n}</span>
                <span>{n}</span>
              </div>
            ))}
          </div>
          <img src="/assets/images/mugshot.webp" alt={SUBJECT.name} />
        </div>
      </div>

      <Heading>Summary</Heading>
      <p className="rdx">
        <Rd text={PROFILE.summary} />
      </p>

      <div className="cols3">
        {PROFILE.columns.map((c) => (
          <p key={c.title}>
            <b>■{c.title}:</b> {c.body}
          </p>
        ))}
      </div>

      <div className="split split--even">
        <div>
          <Heading>Experience</Heading>
          {EXPERIENCE.slice(0, 2).map((e, i) => (
            <div key={i} className="entry">
              <div className="entry__top">
                <b>
                  <Rd text={e.role} />
                </b>
                <span>
                  <Rd text={e.period} />
                </span>
              </div>
              <div className="entry__org">
                <Rd text={e.org} />
              </div>
            </div>
          ))}
        </div>
        <div>
          <Heading>Education</Heading>
          {EDUCATION.map((e, i) => (
            <div key={i} className="entry">
              <div className="entry__top">
                <b>{e.title}</b>
                <span>
                  <Rd text={e.period} />
                </span>
              </div>
              <div className="entry__org">
                <Rd text={e.org} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Heading>Fingertips</Heading>
      <div className="split split--prints">
        <div className="prints">
          {PROFILE.prints.map((p) => (
            <figure key={p} className="print">
              <i />
              <figcaption>{p}</figcaption>
            </figure>
          ))}
        </div>
        <div className="likes">
          <h3>LIKES</h3>
          <p>{PROFILE.likes}</p>
          <h3>DISLIKES</h3>
          <p>{PROFILE.dislikes}</p>
          <h3>REACH</h3>
          <p>
            <a href={`mailto:${SUBJECT.email}`}>{SUBJECT.email}</a>
          </p>
        </div>
      </div>
    </>
  );
}

function AboutOriginPage() {
  const { body, vitals, notes, quote } = ABOUT.origin;
  return (
    <div className="split split--wide">
      <div>
        <Heading>Origin</Heading>
        {body.map((p, i) => (
          <p key={i} className="rdx">
            <Rd text={p} />
          </p>
        ))}
      </div>
      <div>
        <Heading>Vitals</Heading>
        <Fields rows={vitals} />
        <Heading>Field notes</Heading>
        <ul className="checks">
          {notes.map((n) => (
            <li key={n}>
              <i>✕</i>
              {n}
            </li>
          ))}
        </ul>
        <blockquote className="quote">“{quote}”</blockquote>
      </div>
    </div>
  );
}

function AboutFormationPage() {
  const { body, institutions } = ABOUT.formation;
  return (
    <>
      <Heading>Formation</Heading>
      {body.map((p, i) => (
        <p key={i} className="rdx">
          <Rd text={p} />
        </p>
      ))}
      <Heading>Institutions</Heading>
      <div className="ledger">
        {institutions.map((e) => (
          <div key={e.org} className="ledger__row">
            <div className="ledger__when">{e.period}</div>
            <div>
              <b>{e.title}</b>
              <div className="entry__org">{e.org}</div>
              <p>{e.note}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AboutOffRecordPage() {
  const { intro, questions, body, interests, claims, quote } = ABOUT.offRecord;
  return (
    <>
      <div className="split split--wide">
        <div>
          <Heading>Off the record</Heading>
          <p className="rdx">
            <Rd text={intro} />
          </p>
          <div className="asked">
            <Fields rows={questions.map((q, i) => [`Q${i + 1}`, q])} />
          </div>
          {body.map((p, i) => (
            <p key={i} className="rdx">
              <Rd text={p} />
            </p>
          ))}
        </div>
        <div>
          <Heading>Known interests</Heading>
          <Fields rows={interests.map((a, i) => [`K${i + 1}`, a])} />
          <Heading>Unverified claims</Heading>
          <Fields rows={claims} />
        </div>
      </div>
      <blockquote className="quote">
        {quote.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </blockquote>
    </>
  );
}

function ProjectsPage({ onTurn }: PageProps) {
  return (
    <>
      <Heading>Exhibits</Heading>
      <div className="exhibits">
        {PROJECTS.map((p, i) => (
          <article key={p.tag} className="exhibit">
            <button className="poster" onClick={() => onTurn?.(i + 1)} aria-label={`Open ${p.name}`}>
              <img src={p.image} alt="" />
            </button>
            <div>
              <div className="exhibit__tag">■{p.tag}</div>
              <h3>{p.name}</h3>
              <p>{p.blurb}</p>
              <Fields
                rows={[
                  ["STACK", p.stack],
                  ["STATUS", p.status],
                ]}
              />
              <div className="exhibit__acts">
                <button className="act" onClick={() => onTurn?.(i + 1)}>
                  Open exhibit ▸
                </button>
                <a className="act act--line" href={`https://${p.live}`} target="_blank" rel="noreferrer">
                  Live demo ↗
                </a>
              </div>
            </div>
          </article>
        ))}
        <article className="exhibit exhibit--sealed">
          <div className="poster poster--sealed">
            <CrossBox label={SEALED_PROJECT.tag} />
            <b className="stamp">{SEALED_PROJECT.stamp}</b>
          </div>
          <div>
            <div className="exhibit__tag">■{SEALED_PROJECT.tag}</div>
            <h3>
              <Rd text={SEALED_PROJECT.name} />
            </h3>
            <p className="exhibit__sealed">
              <Rd text={SEALED_PROJECT.blurb} />
            </p>
            <Fields
              rows={[
                ["STACK", SEALED_PROJECT.stack],
                ["STATUS", SEALED_PROJECT.status],
              ]}
            />
          </div>
        </article>
      </div>
    </>
  );
}

/** One exhibit's own page: the poster, the particulars, and the write-up. */
function exhibitPage(p: (typeof PROJECTS)[number]) {
  return function ExhibitPage({ onTurn }: PageProps) {
    return (
      <>
        <button className="act act--line exhibit__back" onClick={() => onTurn?.(0)}>
          ◂ Back to exhibits
        </button>
        <div className="split split--exhibit">
          <div className="poster">
            <img src={p.image} alt={`${p.name} poster`} />
          </div>
          <div>
            <div className="sheet__id">■{p.tag}</div>
            <h3 className="exhibit__name">{p.name}</h3>
            <dl className="fields">
              {[
                ["TYPE", p.kind],
                ["STACK", p.fullStack],
                ["FILED", p.filed],
                ["STATUS", p.status],
              ].map(([k, v]) => (
                <div key={k} className="fields__row">
                  <dt>{k}:</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="exhibit__acts">
              <a className="act" href={`https://${p.live}`} target="_blank" rel="noreferrer">
                Live demo ↗
              </a>
              <a className="act act--line" href={`https://${p.source}`} target="_blank" rel="noreferrer">
                Source code ↗
              </a>
            </div>
          </div>
        </div>

        <Heading>Report</Heading>
        <p className="rdx">
          <Rd text={p.report} />
        </p>
        <div className="cols3">
          {p.notes.map((n) => (
            <p key={n.title}>
              <b>■{n.title}:</b> {n.body}
            </p>
          ))}
        </div>
      </>
    );
  };
}

function ExperiencePage() {
  return (
    <>
      <Heading>Service history</Heading>
      <div className="ledger">
        {EXPERIENCE.map((e, i) => (
          <div key={i} className="ledger__row">
            <div className="ledger__when">
              <Rd text={e.period} />
            </div>
            <div>
              <b>
                <Rd text={e.role} />
              </b>
              <div className="entry__org">
                <Rd text={e.org} />
              </div>
              <p>{e.note}</p>
            </div>
          </div>
        ))}
      </div>
      <Heading>Education and courses</Heading>
      <div className="ledger">
        {EDUCATION.map((e, i) => (
          <div key={i} className="ledger__row">
            <div className="ledger__when">
              <Rd text={e.period} />
            </div>
            <div>
              <b>{e.title}</b>
              <div className="entry__org">
                <Rd text={e.org} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function SkillsPage() {
  return (
    <>
      <Heading>Capabilities</Heading>
      <p className="rdx">
        <Rd text={SKILLS_NOTE} />
      </p>
      <div className="skills">
        {SKILLS.map((g) => (
          <div key={g.title}>
            <h3>
              ■<Rd text={g.title} />
            </h3>
            {g.items.map(([name, level]) => (
              <div key={name} className="skills__row">
                <span>
                  <Rd text={name} />
                </span>
                <span className="skills__lvl">
                  {"+".repeat(level)}
                  <em>{"+".repeat(5 - level)}</em>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function SkillsSummaryPage() {
  return (
    <>
      <div className="split split--summary">
        <div>
          <Heading>Summary</Heading>
          {SKILLS_SUMMARY.blocks.map((b) => (
            <p key={b.title} className="rdx">
              <b>■{b.title}:</b> <Rd text={b.body} />
            </p>
          ))}
        </div>
        <div>
          <Heading>Fingertips</Heading>
          <div className="prints prints--pair">
            {PROFILE.prints.map((p) => (
              <figure key={p} className="print">
                <i />
                <figcaption>{p}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
      <blockquote className="quote">
        {SKILLS_SUMMARY.quote.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </blockquote>
    </>
  );
}

function BlogsPage() {
  return (
    <>
      <Heading>Confidential entries</Heading>
      <div className="ledger">
        {BLOGS.map((b) => (
          <div key={b.no} className="ledger__row">
            <div className="ledger__when">{b.no}</div>
            <div>
              <b>
                <Rd text={b.title} />
              </b>
              <div className="entry__org">
                FILED <Rd text={b.date} /> — STATUS: CLASSIFIED
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="note">
        ■NOTE: no entries have been declassified yet. check this folder again later.
      </p>
    </>
  );
}

function ContactPage() {
  return (
    <>
      <Heading>Channels</Heading>
      <a className="bigmail" href={`mailto:${SUBJECT.email}`}>
        {SUBJECT.email}
      </a>
      <div className="split split--even">
        <Fields rows={CONTACT.fields} />
        <div className="hours">
          <div className="hours__title">AVAILABILITY</div>
          <div className="hours__box">
            <div className="hours__days">
              {CONTACT.days.map(([d, open]) => (
                <span key={d}>
                  <i className={open ? "on" : ""} />
                  {d}
                </span>
              ))}
            </div>
            <div className="hours__row">
              <span>FROM</span>
              <b>10:00</b>
              <span>TO</span>
              <b>22:00</b>
              <span>IST</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Folders whose first page is a list and whose other pages are each opened
 * from it. These are not leafed through: a page has one way out, back to the
 * list, and the value here is what that button says.
 */
const LISTED: Partial<Record<SectionDef["id"], string>> = {
  projects: "Back to exhibits",
};

/** What is printed in each folder. Most hold one sheet; some hold a few, turned one at a time. */
const PAGES: Record<SectionDef["id"], ((props: PageProps) => ReactNode)[]> = {
  profile: [ProfilePage],
  about: [AboutOriginPage, AboutFormationPage, AboutOffRecordPage],
  projects: [ProjectsPage, ...PROJECTS.map(exhibitPage)],
  experience: [ExperiencePage],
  skills: [SkillsPage, SkillsSummaryPage],
  blogs: [BlogsPage],
  contact: [ContactPage],
};

interface SheetProps {
  section: SectionDef;
  /** which of the folder's sheets this is */
  page?: number;
  /** asks for the sheet to be turned to another page of the same folder */
  onTurn?: (to: number) => void;
}

export default function Sheet({ section, page = 0, onTurn }: SheetProps) {
  const pages = PAGES[section.id];
  const Page = pages[page] ?? pages[0];
  const last = page >= pages.length - 1;
  const backTo = LISTED[section.id];
  const [first, ...rest] = SUBJECT.name.toUpperCase().split(" ");

  return (
    <div className="sheet__in">
      <header className="sheet__top">
        <div className="sheet__agency">
          <Seal />
          <div>
            <div className="sheet__agency-name">Department of Development</div>
            <div className="sheet__agency-kind">PERSONNEL RECORD</div>
            <div className="sheet__barcode" aria-hidden="true" />
          </div>
        </div>
        <table className="sheet__meta">
          <tbody>
            <tr>
              <td>FILE NUMBER</td>
              <td>
                #{SUBJECT.fileNo}-{section.no}
              </td>
            </tr>
            <tr>
              <td>PURPOSE RECORD</td>
              <td>{section.purpose}</td>
            </tr>
            <tr>
              <td>SRU ID</td>
              <td>{PROFILE.sruId}</td>
            </tr>
          </tbody>
        </table>
      </header>

      <div className="sheet__title">
        <div>
          <div className="sheet__name">
            <span>{first}</span>
            <span>{rest.join(" ")}</span>
          </div>
          <div className="sheet__role">
            {section.id === "profile" ? SUBJECT.occupation : section.label}
          </div>
        </div>
        <CrossBox label={`FIG. ${section.no}`} />
      </div>

      <Page onTurn={onTurn} />

      <footer className="sheet__foot">
        <span>
          ( end of record — sheet {section.no} of {String(SECTIONS.length).padStart(2, "0")}
          {pages.length > 1 && !backTo && `, page ${page + 1} of ${pages.length}`} )
        </span>
        {backTo
          ? page > 0 && (
              <button className="sheet__turn sheet__turn--back" onClick={() => onTurn?.(0)}>
                ◂ {backTo}
              </button>
            )
          : pages.length > 1 && (
              <>
                {/* a middle page has both: back in the left corner, on in the right */}
                {page > 0 && (
                  <button
                    className={last ? "sheet__turn" : "sheet__turn sheet__turn--back"}
                    onClick={() => onTurn?.(page - 1)}
                  >
                    ◂ Previous page
                  </button>
                )}
                {!last && (
                  <button className="sheet__turn" onClick={() => onTurn?.(page + 1)}>
                    Next page ▸
                  </button>
                )}
              </>
            )}
      </footer>
    </div>
  );
}
