export type SectionId =
  | "about"
  | "projects"
  | "experience"
  | "profile"
  | "skills"
  | "blogs"
  | "contact";

export interface SectionDef {
  id: SectionId;
  no: string;
  label: string;
  purpose: string;
}

// Order is back-of-drawer -> front-of-drawer.
export const SECTIONS: SectionDef[] = [
  { id: "about", no: "01", label: "About", purpose: "BACKGROUND" },
  { id: "projects", no: "02", label: "Projects", purpose: "EXHIBITS" },
  { id: "experience", no: "03", label: "Experience", purpose: "SERVICE HISTORY" },
  { id: "profile", no: "04", label: "Profile", purpose: "MASTER RECORD" },
  { id: "skills", no: "05", label: "Skills", purpose: "CAPABILITIES" },
  { id: "blogs", no: "06", label: "Blogs", purpose: "CONFIDENTIAL" },
  { id: "contact", no: "07", label: "Contact", purpose: "CHANNELS" },
];

/** The sheet a visitor lands on: the one-page recruiter record. */
export const HOME_INDEX = SECTIONS.findIndex((s) => s.id === "profile");

/** The folder the résumé's contact button fetches. */
export const CONTACT_INDEX = SECTIONS.findIndex((s) => s.id === "contact");

/**
 * The résumé behind the button in the top bar. `page` is a picture of the PDF
 * (it shows the same on every device, which an embedded PDF does not) — make
 * it again with `npm run resume` whenever the PDF changes.
 */
export const RESUME = {
  pdf: "/assets/resume/Himanshu_CV.pdf",
  page: "/assets/resume/Himanshu_CV.webp",
  /** pixel size of `page` */
  width: 1655,
  height: 2340,
  /** what the file is called once downloaded */
  filename: "Himanshu_Mishra_CV.pdf",
};

export const SUBJECT = {
  name: "Himanshu Mishra",
  dob: "20/10/2005",
  origin: "Vasai, Mumbai",
  occupation: "Developer",
  status: "Explorer for life.",
  email: "himanshu.2010m@gmail.com",
  fileNo: "0726-A",
  caseTag: "IT / B.E.",
};

/*
 * Everything below is FILLER written in the dossier voice so the layout has
 * something real-looking to hold. Swap for real details section by section.
 * Done so far: profile, about, projects, experience, skills and contact.
 * Text inside [[double brackets]] renders as a black redaction bar, text
 * inside ~~tildes~~ is printed struck through, and text inside ==equals== is
 * printed white on a black tab, still readable.
 */

export const PROFILE = {
  recordId: "HM20102005IN0726A",
  sruId: "HM-007",
  fields: [
    ["NAME", "HIMANSHU MISHRA"],
    ["ROLE", "FULL-STACK DEVELOPER"],
    ["BASE", "VASAI, MUMBAI, INDIA"],
    ["D.O.B", "20 / 10 / 2005"],
    ["HEIGHT", "~~5'11\"~~ 6'0\""],
    ["WEIGHT", "55 KG"],
    ["EDUCATION", "B.E. — INFORMATION TECHNOLOGY, 2027"],
    ["STATUS", "OPEN TO WORK"],
  ] as [string, string][],
  summary:
    "THE SUBJECT IS A FULL-STACK DEVELOPER AND A FINAL-YEAR B.E. INFORMATION TECHNOLOGY STUDENT [[class of 2027, attendance record sealed]] WHO BUILDS FOR THE WEB FROM END TO END: REACT AND TYPESCRIPT ON THE FRONT, NODE.JS, EXPRESS AND MONGODB OR SQL BEHIND IT, AND AI MODELS WIRED INTO REAL PRODUCTS. ON RECORD: A FULL-STACK INTERNSHIP AT SARVAPRIYA FOUNDATION, MORE THAN FIVE CLIENT PROJECTS DELIVERED AS A FREELANCER, AND FINALIST AT TWO HACKATHONS, ONE OF THEM HACKSAGON 2026 AGAINST MORE THAN 200 TEAMS. [[sources describe him as hard to stop once started]] HE LEARNS FAST, SHIPS ON TIME AND ASKS BEFORE GUESSING. AVAILABLE FOR INTERNSHIPS, FREELANCE WORK AND FULL-TIME ROLES.",
  columns: [
    {
      title: "STACK",
      body: "react, typescript, javascript, node.js, express, mongodb, sql, python, c++, gsap.",
    },
    {
      title: "TOOLS",
      body: "git / github, docker, postman, figma, linux. terminal over gui, always.",
    },
    {
      title: "FOCUS",
      body: "full-stack web apps, real-time features, ai integrations, and interfaces with motion that feels alive.",
    },
  ],
  likes: "linux, terminals, motion that obeys physics, design rabbit holes, half-finished side projects.",
  dislikes: "anything with a gui when a terminal will do, lorem ipsum, default easing curves.",
  prints: ["REACT", "TS", "JS", "CSS", "HTML", "GSAP", "MOTION", "VITE", "GIT", "LINUX"],
};

/**
 * The about folder: the person rather than the developer, over three pages.
 * The technical side lives in the skills folder.
 *
 * The black bars here work the way they do in a released file: they cut a
 * detail out of the middle of a sentence, so the reader can tell what kind of
 * thing is missing but not what it was. The words under a bar are still in
 * the page's source, so anything truly private gets stand-in words there
 * ("name withheld"), never the real ones.
 */
export const ABOUT = {
  /** Page 1: where he is from. */
  origin: {
    body: [
      "THE SUBJECT WAS BORN ON 20 OCTOBER 2005 AT 11:11 IN THE MORNING AT [[st. joseph]] HOSPITAL, LUCKNOW, TO [[names of both parents withheld]]. LUCKNOW'S PART IN THIS FILE ENDS THERE. HE WAS BORN IN THE CITY AND RAISED SOMEWHERE ELSE ENTIRELY.",
      "ALMOST ALL OF THE LIFE ON RECORD HAS BEEN SPENT IN VASAI, MUMBAI, AT [[an address this file does not print]]. HINDI IS SPOKEN AT HOME.",
      "AS A CHILD HE WAS REPORTED AS AVERAGE: NOT THE BEST IN THE ROOM AND NOT THE WORST. THE ONE THING EVERY REPORT AGREES ON IS THE QUESTIONS. HE ASKED WHY THIS, AND THEN WHY NOT THAT, ABOUT HOW THINGS WERE MADE AND HOW THEY WORKED, TO [[teachers, relatives and anyone else in range]], AND HE HAS NOT STOPPED.",
      "HIS FIRST AMBITION WAS NOT ENGINEERING. IT WAS FOOTBALL. HE PLAYED, HE MEANT TO PLAY FOR A LIVING, AND HIS IDOL THEN AND NOW IS CRISTIANO [[ronaldo]]. THE PLAN DID NOT SURVIVE INDIAN PARENTS [[and one conversation at home]] AND WAS DROPPED.",
    ],
    vitals: [
      ["BORN", "20 / 10 / 2005"],
      ["TIME", "11:11 AM"],
      ["PLACE", "LUCKNOW"],
      ["RAISED", "VASAI, MUMBAI"],
      ["AT HOME", "HINDI"],
    ] as [string, string][],
    notes: ["Average on paper", "Asks why", "Shy at first", "Curious anyway"],
    quote: [
      "“If you don't believe you are the best, you'll never achieve all that you're capable of.”",
      "— Cristiano Ronaldo",
    ],
  },

  /** Page 2: school, junior college, and why engineering. */
  formation: {
    body: [
      "THE SUBJECT WENT TO SCHOOL FOR HIS FRIENDS AND FOR THE PLAYGROUND, AND TREATED THE STUDYING AS SOMETHING THAT HAPPENED IN BETWEEN. HIS MARKS WERE [[neither a problem nor a headline]]. HE SEES SCHOOLS AND COLLEGES AS PLACES TO MEET PEOPLE, NOT ONLY AS PLACES TO STUDY, AND STILL DOES. MATHEMATICS AND SCIENCE CAME EASILY TO HIM ALL THE SAME.",
      "HE CALLS HIS TWO YEARS OF JUNIOR COLLEGE THE BEST OF HIS LIFE SO FAR. FOR A WHILE HE HAD EVERYTHING AT ONCE: A GROUP OF FRIENDS WHO KEPT HIM HAPPY, A [[name withheld]], AND GOOD FOCUS ON HIS STUDIES. [[withheld at the request of the subject]]",
      "ENGINEERING IS THE USUAL DREAM OF AN INDIAN PARENT FOR A SON WHO IS GOOD AT MATHEMATICS. THE FILE NOTES THAT IN THIS CASE NOBODY HAD TO ASK HIM. THE DECISION WAS HIS OWN: HE WANTED TO BE A SOFTWARE ENGINEER BECAUSE HE WANTED TO KNOW HOW THINGS WORK.",
      "THE HABIT OF TREATING COLLEGE AS A PLACE FOR PEOPLE HAS LEFT A RECORD. HE VOLUNTEERED AT A CAMPUS BLOOD DONATION DRIVE THAT BROUGHT IN MORE THAN 500 DONATIONS, HELPED RUN COLLEGE HACKATHONS, AND MAKES THE PROMOTIONAL MATERIAL FOR HIS COLLEGE'S ACM STUDENT CHAPTER.",
    ],
    institutions: [
      {
        period: "TO 2021",
        title: "SCHOOLING",
        org: "ST. PETER ENGLISH HIGH SCHOOL",
        note: "went for the friends. stayed for the maths.",
      },
      {
        period: "2021 — 2023",
        title: "JUNIOR COLLEGE — SCIENCE",
        org: "ST. ANNE'S CONVENT HIGH SCHOOL AND JUNIOR COLLEGE",
        note: "physics, chemistry, mathematics, computer science. the best years on record.",
      },
      {
        period: "2023 — 2027",
        title: "B.E. — INFORMATION TECHNOLOGY",
        org: "M. H. SABOO SIDDIK COLLEGE OF ENGINEERING",
        note: "in progress. expected 2027.",
      },
    ],
  },

  /** Page 3: what he thinks about when nobody is asking. */
  offRecord: {
    intro:
      "THE CURIOSITY NOTED ON PAGE ONE NEVER STAYED ON MACHINES. IT LEANS TOWARD THE UNIVERSE. HE TRIED TO STUDY IT, FOUND THE STUDY TOO HARD, AND LEFT IT. THE QUESTIONS STAYED. A PARTIAL LIST WAS RECOVERED:",
    questions: [
      "IS THE BIG BANG REAL, OR JUST A [[logical lie]]?",
      "WHAT WAS THERE BEFORE IT, AND WHAT [[caused it]]?",
      "IF THE UNIVERSE IS INFINITE, WHY DOES THE SPEED OF LIGHT HAVE AN [[exact number]]?",
      "THE FOURTH DIMENSION: [[notes run to several pages]]",
    ],
    body: [
      "HE KEEPS MOST OF THESE THOUGHTS TO HIMSELF. WHAT HE WILL TALK ABOUT, FOR AS LONG AS HE IS ALLOWED TO, IS PSYCHOLOGY. HE FOLLOWS OSHO AND ASHTAVAKRA, [[specific talks and passages withheld]] WHICH TELLS YOU MOST OF WHAT YOU NEED TO KNOW ABOUT HOW HE THINKS.",
      "HE WAS A SHY CHILD AND IS A SHY ADULT. IN CONVERSATION HE HAS TWO SETTINGS: TOO QUIET TO APPROACH, OR FAR MORE OPEN THAN HE MEANT TO BE. HE HAS SAID THINGS TO [[names withheld]] THAT HE REPORTS REGRETTING AFTERWARDS. NO MIDDLE SETTING HAS BEEN FOUND.",
    ],
    interests: [
      "PSYCHOLOGY",
      "OSHO, ASHTAVAKRA",
      "THE UNIVERSE",
      "MUSIC — ALL DAY, NO FIXED GENRE",
      "ANIME — [[titles withheld]]",
      "FILMS",
      "FOOTBALL — CRISTIANO [[ronaldo]]",
    ],
    claims: [
      ["TREKKING", "SAYS HE LOVES IT. NO MAJOR TREK IS ON RECORD."],
      ["COOKING", "SAYS HE CAN. EVIDENCE SO FAR: MAGGI."],
    ] as [string, string][],
    quote: ["“Why this? Why not that?”", "— the subject, to anyone within range, since childhood."],
  },
};

/**
 * The projects folder. Page 1 lists every exhibit; each one after that has a
 * page of its own, in this order. `blurb` is the short text on the list,
 * `report` and `notes` are the detail page. Posters are 720px-wide copies in
 * public/assets/images/projects.
 */
export const PROJECTS = [
  {
    tag: "EXHIBIT A",
    name: "AMONGUS FOR CODERS",
    image: "/assets/images/projects/amongus.webp",
    kind: "MULTIPLAYER SOCIAL-DEDUCTION CODING GAME",
    blurb:
      "a real-time multiplayer platform for collaborative problem solving and shared debugging, with socket-based interaction between every player in the room.",
    stack: "REACT / NODE.JS / SOCKET.IO",
    fullStack: "REACT, VITE, TAILWIND, ZUSTAND, MONACO EDITOR, NODE.JS, EXPRESS, SOCKET.IO",
    filed: "2026",
    status: "LIVE",
    live: "amongusforcoder.vercel.app",
    source: "github.com/Himanshu-MlSHRA/AmongUS",
    report:
      "A SOCIAL-DEDUCTION GAME FOR PROGRAMMERS. FOUR OR MORE PLAYERS SHARE ONE CODE EDITOR AND SOLVE A CODING PROBLEM TOGETHER, WHILE [[one to three]] OF THEM, CHOSEN AT RANDOM, QUIETLY SABOTAGE THE WORK. THE TEAM HAS THREE SHARED LIVES. CODE ONLY RUNS WHEN A MAJORITY APPROVES IT, AND EVERY FAILED RUN COSTS A LIFE. ANY PLAYER CAN CALL AN EMERGENCY MEETING, WHERE THE ROOM ARGUES, VOTES, AND EJECTS [[whoever looked most guilty]].",
    notes: [
      {
        title: "LIVE SYNC",
        body: "every keystroke in the shared monaco editor is broadcast to the whole room over socket.io.",
      },
      {
        title: "SANDBOX",
        body: "submissions run against test cases inside node's vm module, cut off after 1.5 seconds.",
      },
      {
        title: "ROOMS",
        body: "public or private, joined by a four-letter code. lobby chat, host settings, kick and mute.",
      },
    ],
  },
  {
    tag: "EXHIBIT B",
    name: "LUMINA",
    image: "/assets/images/projects/lumina.webp",
    kind: "AI MENTAL WELLNESS PLATFORM",
    blurb:
      "an interactive mental wellness platform with voice-based ai conversations and daily mood tracking. it gives personalised activity guidance through a minimal interface.",
    stack: "TYPESCRIPT / NODE.JS / ML",
    fullStack: "REACT, TYPESCRIPT, EXPRESS, PRISMA, SQLITE, SOCKET.IO, GOOGLE GEMINI",
    filed: "2026",
    status: "LIVE",
    live: "luminamentalwellnessplatform.vercel.app",
    source: "github.com/Himanshu-MlSHRA/lumina",
    report:
      "A MENTAL WELLNESS PLATFORM BUILT AROUND AN AI COMPANION THE USER TALKS TO OUT LOUD. LUMINA HOLDS A REAL-TIME VOICE CONVERSATION, REMEMBERS [[what it was told the last time]], TRACKS MOOD FROM A ONE-TAP DAILY CHECK-IN, AND SETS THREE SMALL TASKS A DAY AIMED AT GETTING THE USER OFF THE SCREEN. EVERY FEW WEEKS IT WRITES A PROGRESS REPORT FROM THE USER'S OWN NUMBERS. IT IS EXPLICIT THAT IT IS A REFLECTION AND NOT [[a diagnosis]].",
    notes: [
      {
        title: "VOICE",
        body: "two-way live audio with google gemini, with a running transcript of both sides.",
      },
      {
        title: "REPORT",
        body: "the statistics are computed by hand-written code first. the model only puts them into words, so it cannot invent a finding.",
      },
      {
        title: "COMMUNITY",
        body: "anonymous groups, posts and real-time direct messages, plus five offline calming exercises.",
      },
    ],
  },
  {
    tag: "EXHIBIT C",
    name: "SMART ATTENDANCE SYSTEM",
    image: "/assets/images/projects/attendance.webp",
    kind: "FACE-RECOGNITION ATTENDANCE REGISTER",
    blurb:
      "face-recognition attendance for a college. a webcam or a class photo marks everyone present, teachers get dashboards and reports, and students check in with their own face.",
    stack: "PYTHON / FLASK / REACT",
    fullStack: "PYTHON, FLASK, FACE_RECOGNITION, SQLITE, REACT, TYPESCRIPT, TAILWIND",
    filed: "2025",
    status: "LIVE",
    live: "smart-attendance-system-black.vercel.app",
    source: "github.com/Himanshu-MlSHRA/smart-attendance-system",
    report:
      "AN ATTENDANCE REGISTER THAT TAKES ITSELF. A TEACHER STARTS A CLASS, AND THE WEBCAM, OR ONE PHOTO OF THE WHOLE ROOM, MARKS EVERYONE IT RECOGNISES. STUDENTS CAN ALSO CHECK IN FROM THEIR PHONE, BUT ONLY WITH THE CODE ON THE PROJECTOR AND ONLY IF THEY BLINK, SO [[a photo of a friend]] DOES NOT WORK. ADMINS, TEACHERS AND STUDENTS EACH GET THEIR OWN VIEW.",
    notes: [
      {
        title: "RECOGNITION",
        body: "faces are matched with the face_recognition library. new students are added to the model straight away, with no retraining.",
      },
      {
        title: "RECORDS",
        body: "dashboards show turnout, late arrivals and students below 75%. students see their streak and how many classes they can still miss.",
      },
      {
        title: "EXPORT",
        body: "the register and each course sheet download as csv. a 23-test suite covers login, roles, scanning and check-in.",
      },
    ],
  },
];

/** The fourth exhibit on the list. It has no page of its own. */
export const SEALED_PROJECT = {
  tag: "EXHIBIT D",
  name: "[[project name withheld]]",
  stamp: "ACCESS DENIED",
  blurb:
    "THIS EXHIBIT IS SEALED. [[a thing still being built and not ready to be shown]] YOUR CLEARANCE DOES NOT COVER IT. [[check this folder again later]]",
  stack: "[[withheld / withheld]]",
  status: "ACCESS NOT GRANTED",
};

export interface Entry {
  period: string;
  role: string;
  org: string;
  note: string;
  /** buttons under the note */
  links?: { label: string; href: string }[];
}

/**
 * Work: the first entries are also the ones shown on the profile sheet.
 * In these lists a bar never hides anything a reader needs: dates and facts
 * stay in plain text, and the bars are only asides.
 */
export const EXPERIENCE: Entry[] = [
  {
    period: "MAY 2025 — ==PRESENT==",
    role: "FULL-STACK DEVELOPER INTERN",
    org: "SARVAPRIYA FOUNDATION",
    note: "helps build and optimise the digital tools behind the foundation's community initiatives, across the front end and the back end. [[performance review withheld]]",
  },
  {
    period: "==FREELANCE==",
    role: "THE FABULOUS SCENTS",
    org: "CLIENT PROJECT — REACT",
    note: "designed and built the storefront's interface in react: every page, every component and every interaction a customer touches. [[the rest of the build was a classmate's work]] shipped and live.",
    links: [{ label: "Visit site", href: "https://thefabulousscents.vercel.app/" }],
  },
  {
    period: "==ONGOING==",
    role: "FREELANCE WEB DEVELOPER",
    org: "SELF-EMPLOYED",
    note: "designed, built and delivered web projects for more than five clients, from the first brief to the live site. [[client list sealed]]",
  },
  {
    period: "2025 — 2026",
    role: "EDITORIAL TEAM MEMBER",
    org: "ACM STUDENT CHAPTER, M. H. SABOO SIDDIK COLLEGE OF ENGINEERING",
    note: "designs and manages the promotional content for the chapter's coding events, technical workshops and hackathons, and works with the organising teams on outreach.",
  },
  {
    period: "==ON CAMPUS==",
    role: "HACKATHON MANAGEMENT",
    org: "COLLEGE-LEVEL HACKATHONS",
    note: "coordinated student teams and handled registrations, scheduling and event operations alongside the management and organising teams. [[sleep not recorded]]",
  },
];

/** Hackathons. */
export const HONOURS: Entry[] = [
  {
    period: "2026",
    role: "FINALIST — HACKSAGON 2026",
    org: "NATIONAL-LEVEL HACKATHON, ABV-IIITM IEEE STUDENT BRANCH",
    note: "shortlisted as a finalist from more than 200 competing teams.",
    links: [{ label: "Certificate", href: "/assets/resume/Hacksagoan.pdf" }],
  },
  {
    period: "AUG 2026",
    role: "FINALIST — VIBECODE 2.0",
    org: "IEEE STUDENT BRANCH, M. H. SABOO SIDDIK COLLEGE OF ENGINEERING",
    note: "finalist, 18 august 2026. [[the vibes were, reportedly, immaculate]]",
    links: [{ label: "Certificate", href: "/assets/resume/VibeCode_Hackathon_Finalist.pdf" }],
  },
];

export const EDUCATION = [
  {
    period: "2023 — 2027",
    title: "B.E. — INFORMATION TECHNOLOGY",
    org: "M. H. SABOO SIDDIK COLLEGE OF ENGINEERING",
  },
  {
    period: "2021 — 2023",
    title: "HIGHER SECONDARY — SCIENCE",
    org: "ST. ANNE'S CONVENT HIGH SCHOOL AND JUNIOR COLLEGE",
  },
];

// A [[bracketed]] row prints as a black bar: a few are scattered through the
// tables for the look of a redacted file.
export const SKILLS = [
  {
    title: "LANGUAGES",
    items: [
      ["TypeScript", 4],
      ["JavaScript", 5],
      ["[[withheld pending review]]", 3],
      ["HTML", 5],
      ["CSS", 5],
    ],
  },
  {
    title: "FRAMEWORKS & MOTION",
    items: [
      ["React", 4],
      ["GSAP", 4],
      ["[[overthinking, professional grade]]", 5],
      ["Framer Motion", 3],
      ["Vite", 4],
    ],
  },
  {
    title: "BACKEND & DATABASE",
    items: [
      ["Node.js", 3],
      ["Express", 3],
      ["[[starting side projects]]", 5],
      ["REST APIs", 4],
      ["SQL / PostgreSQL", 3],
      ["MongoDB", 3],
    ],
  },
  {
    title: "AI / ML",
    items: [
      ["Python", 4],
      ["LLM APIs & prompting", 4],
      ["Pandas / NumPy", 3],
      ["[[finishing side projects]]", 2],
      ["Scikit-learn", 2],
    ],
  },
  {
    title: "TOOLS & ENVIRONMENT",
    items: [
      ["Linux", 5],
      ["Git", 4],
      ["[[classified]]", 4],
      ["Terminal", 5],
      ["Figma", 3],
    ],
  },
  {
    title: "SPOKEN",
    items: [
      ["English", 4],
      ["Hindi", 5],
      ["Marathi", 4],
    ],
  },
] as { title: string; items: [string, number][] }[];

/** Printed under the Capabilities heading, above the tables. */
export const SKILLS_NOTE =
  "THE LEVELS BELOW WERE REPORTED BY THE SUBJECT HIMSELF [[and were then adjusted downward by the reviewing officer]] AND SHOULD BE READ WITH THAT IN MIND. [[some entries have been withheld]]";

/**
 * Second page of the skills folder: the same ground in plain sentences.
 * The [[bracketed]] asides are printed as black bars — they are decoration,
 * so nothing a reader needs should go inside them.
 */
export const SKILLS_SUMMARY = {
  blocks: [
    {
      title: "TECHNICAL",
      body: "THE SUBJECT BUILDS FOR THE WEB FROM END TO END. [[he will tell you this within two minutes of meeting you]] HE WRITES INTERFACES IN REACT AND TYPESCRIPT, AND ADDS MOTION TO THEM UNTIL THEY FEEL ALIVE, WHETHER OR NOT ANYONE ASKED FOR IT. BEHIND THE INTERFACE HE CAN SET UP THE SERVER, THE API AND THE DATABASE, [[sources confirm it worked on the second attempt]] AND HE IS COMFORTABLE CONNECTING AI MODELS TO REAL PRODUCTS AND CLEANING DATA IN PYTHON. THE SUBJECT RUNS LINUX, SPECIFICALLY OMARCHY, AND BELIEVES THIS MAKES HIM LOOK COOL. [[it does not. this has been explained to him more than once]] HE ALSO ENJOYS TAKING ON PROBLEMS FAR ABOVE HIS LEVEL, AND IS OFTEN SURPRISED WHEN THEY TURN OUT TO BE HARD. HE SOLVES THEM ANYWAY, EVENTUALLY.",
    },
    {
      title: "NON-TECHNICAL",
      body: "AWAY FROM THE KEYBOARD, THE SUBJECT CAN EXPLAIN A TECHNICAL IDEA IN PLAIN WORDS, WRITE A CLEAR MESSAGE, AND PRESENT TO A ROOM WITHOUT READING FROM HIS SLIDES. [[the slides, however, will have animations]] HE WORKS WELL IN A TEAM AND JUST AS WELL ALONE, PLANS HIS WORK, AND MEETS HIS DEADLINES — USUALLY WITH A FEW MINUTES TO SPARE, WHICH HE CALLS TIME MANAGEMENT. HE DOES THE UNGLAMOROUS WORK TOO: EXCEL AND SPREADSHEETS, DOCUMENTATION, RESEARCH. [[he has been seen colour-coding a spreadsheet for fun]] HE LEARNS QUICKLY, ADMITS WHEN HE DOES NOT KNOW SOMETHING, AND ASKS BEFORE GUESSING. [[the last habit is rarer than it sounds]]",
    },
  ],
  quote: [
    "“Jack of all trades, master of none.” They say it like an insult.",
    "But the actual quote is: “Jack of all trades, master of none, certainly better than a master of one.”",
  ],
};

export const BLOGS = [
  { no: "B-001", date: "[[00/00/0000]]", title: "[[why the terminal hits different]]" },
  { no: "B-002", date: "[[00/00/0000]]", title: "[[notes on making interfaces feel alive]]" },
  { no: "B-003", date: "[[00/00/0000]]", title: "[[breaking things on purpose, a method]]" },
  { no: "B-004", date: "[[00/00/0000]]", title: "[[untitled entry, still being written up]]" },
];

export const CONTACT = {
  phone: "+91 7235034984",
  /**
   * Web3Forms access key (web3forms.com, free): with it the statement box
   * sends straight to the inbox the key was made for. It is meant to sit in
   * the page, so it is not a secret. Left empty, the box opens the visitor's
   * mail app instead.
   */
  formKey: "",
  links: [
    { label: "GitHub", href: "https://github.com/Himanshu-MlSHRA" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/himanshu-mishra-b4577b20b/" },
    { label: "Call", href: "tel:+917235034984" },
    { label: "Email", href: `mailto:${SUBJECT.email}` },
  ],
  fields: [
    ["EMAIL", SUBJECT.email],
    ["PHONE", "+91 72350 34984"],
    ["LOCATION", "VASAI, MUMBAI — IST (UTC+5:30)"],
    ["RESPONSE", "USUALLY WITHIN 24 HOURS"],
  ] as [string, string][],
  /** printed above the message box */
  sigh: "STATISTICALLY, YOU WILL READ THIS, NOD, AND CLOSE THE TAB. THE SUBJECT IS AWARE. HE LEFT THE BOX HERE ANYWAY. [[optimism is filed under unverified claims]] IF YOU DO WRITE, IT GOES STRAIGHT TO HIS INBOX AND HE WILL READ IT TWICE.",
  /** printed in place of the box once a statement is sent */
  sent: "STATEMENT FILED. THE SUBJECT HAS BEEN NOTIFIED AND IS NOW PRETENDING HE WAS NOT WAITING FOR THIS. [[he was]] EXPECT A REPLY WITHIN 24 HOURS, SOONER IF IT WAS A COMPLIMENT.",
  failed: "THE STATEMENT DID NOT GO THROUGH. EITHER THE INTERNET OR FATE INTERVENED. TRY AGAIN, OR USE THE EMAIL ABOVE.",
  days: [
    ["MON", true],
    ["TUE", true],
    ["WED", true],
    ["THU", true],
    ["FRI", true],
    ["SAT", true],
    ["SUN", false],
  ] as [string, boolean][],
};
