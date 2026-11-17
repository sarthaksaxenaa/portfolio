import { Experience, Project, type Experience as ExperienceT, type Project as ProjectT } from "./schema";

const CARENEXUS_CI = "CareNexus CI";

export const rideshare: ProjectT = Project.parse({
  slug: "rideshare",
  name: "RideShare",
  summary: "Real-time ride-hailing: book, match, track and pay, live.",
  problem:
    "A ride marketplace where riders, drivers and admins see the same trip change state at the same moment, and money only moves when a trip actually happens.",
  role: "Solo build: product, backend, frontend, deployment",
  period: "2026",
  stack: ["Next.js", "TypeScript", "Express", "Socket.io", "Prisma", "PostgreSQL (Neon)", "Stripe", "OSRM"],
  decisions: [
    {
      context: "Two drivers accept the same ride within milliseconds of each other.",
      chosen: "A conditional updateMany that assigns the driver only while the trip is still unassigned, so the database decides the winner in one atomic write.",
      rejected: ["Read the trip, check it in app code, then write (a race window between check and write)"],
      why: "Exactly one driver per trip, with no locks held across a network round trip.",
    },
    {
      context: "Riders cancel after booking.",
      chosen: "Stripe authorize-then-capture: the fare is held at booking and only captured when the trip completes.",
      rejected: ["Charge at booking and refund on cancel"],
      why: "Cancelled trips never become charges, so there is nothing to refund or reconcile.",
    },
    {
      context: "Riders need the driver's position while the trip is live.",
      chosen: "Socket.io rooms per trip streaming driver coordinates, with a reconnect banner when the socket drops.",
      rejected: ["Polling a location endpoint every few seconds"],
      why: "Sub-second updates without hammering the API, and an honest UI when the connection is lost.",
    },
  ],
  stats: [],
  facts: [
    "Rider, driver and admin roles",
    "Haversine fare estimate with surge windows",
    "JWT in HttpOnly cookies, rate-limited auth",
    "Driver onboarding with admin approval",
  ],
  honestNote: "No automated test suite yet. It is the next rep.",
  liveUrl: "https://rideshare-platform.vercel.app",
  repoUrl: "https://github.com/sarthaksaxenaa/RideShare-Platform",
  accent: "#818CF8",
  kicker: "Platform",
  shots: [
    { src: "/screens/rideshare-booking.webp", alt: "RideShare booking screen: a road route across Greater Noida with fares per vehicle" },
    { src: "/screens/rideshare-hero.webp", alt: "RideShare landing page: Motion, Mastered" },
    { src: "/screens/rideshare-how.webp", alt: "RideShare how-it-works: set pickup, choose a ride, track it live" },
  ],
  highlights: [
    "Live trip state to rider and driver over Socket.io rooms",
    "Exactly one driver per ride: an optimistic compare-and-set",
    "Fare held at booking, captured only when the trip ends",
  ],
});

export const carenexus: ProjectT = Project.parse({
  slug: "carenexus",
  name: "CareNexus",
  summary: "A triage assistant that answers the first question: how urgently should I get care?",
  problem:
    "People describe symptoms in everyday words. The answer has to be fast, grounded in real conditions, and never miss an emergency, even without an AI key.",
  role: "Lead developer; final-year capstone",
  period: "2026",
  stack: ["Next.js 16", "React 19", "FastAPI", "PostgreSQL (Neon)", "three.js", "Docker", "Render", "Gemini (optional)"],
  decisions: [
    {
      context: "Some messages describe a heart attack or a stroke.",
      chosen: "Emergency phrase rules run before anything else, and negation is deliberately ignored.",
      rejected: ["Let the language model decide urgency"],
      why: "A false alarm is safer than a missed heart attack, and rules are testable.",
    },
    {
      context: "Retrieval kept surfacing the wrong conditions.",
      chosen: "Re-index on symptoms with field weighting, light stemming and medical synonyms.",
      rejected: ["Tune the ranking on top of the existing index"],
      why: "The index was matching words in treatment advice, not symptoms. Fixing the cause beat tuning the symptom.",
    },
    {
      context: "An AI key may be missing, slow or down.",
      chosen: "An offline TF-IDF engine answers on its own; Gemini only rewrites from retrieved conditions, and any failure falls back.",
      rejected: ["LLM-only answers"],
      why: "The product works for everyone, every time, and the LLM can never invent a condition.",
    },
  ],
  stats: [
    { kind: "measured", value: "570", label: "tests passing", source: CARENEXUS_CI, measuredAt: "2026-11-09" },
    { kind: "measured", value: "94%", label: "backend line coverage", source: CARENEXUS_CI, measuredAt: "2026-11-09" },
    { kind: "measured", value: "62.8% → 86.0%", label: "first-match retrieval accuracy", source: CARENEXUS_CI, measuredAt: "2026-11-09" },
    { kind: "measured", value: "93.3%", label: "accuracy on unseen queries", source: CARENEXUS_CI, measuredAt: "2026-11-09" },
    { kind: "measured", value: "107 ms", label: "API median, warm", source: "CareNexus CI probe", measuredAt: "2026-11-09" },
    { kind: "measured", value: "0", label: "known vulnerabilities", source: "pip-audit + npm audit", measuredAt: "2026-11-09" },
  ],
  facts: ["50 ICD-10 conditions across 11 specialties", "3D body-map symptom picker with a list fallback"],
  honestNote: "The free API sleeps when idle; the first request can take about 30 seconds.",
  liveUrl: "https://carenexus-health.vercel.app",
  repoUrl: "https://github.com/sarthaksaxenaa/CareNexus",
  accent: "#9B6BFF",
  kicker: "Health",
  shots: [
    { src: "/screens/carenexus-chat.webp", alt: "CareNexus health check with the 3D body map beside the conversation" },
    { src: "/screens/carenexus-home.webp", alt: "CareNexus home page: A Clearer Kind of Care" },
    { src: "/screens/carenexus-dashboard.webp", alt: "CareNexus dashboard with past checks and their urgency" },
    { src: "/screens/carenexus-profile.webp", alt: "CareNexus health profile used to personalise answers" },
  ],
  phoneShot: { src: "/screens/carenexus-mobile-chat.webp", alt: "CareNexus health check on a phone" },
  highlights: [
    "570 automated tests, 94% backend coverage, in CI",
    "Retrieval accuracy raised from 62.8% to 86.0%",
    "107 ms median API response, warm",
  ],
});

export const skillmatrix = {
  name: "SkillMatrix Pro",
  summary: "Resume analysis against 60+ roles, skill-gap detection and a 10-round AI mock interview.",
  stack: ["React", "FastAPI", "Gemini"],
  repoUrl: "https://github.com/sarthaksaxenaa/SkillMatrix-Pro",
} as const;

export const prodigy: ExperienceT = Experience.parse({
  company: "Prodigy",
  title: "Web Developer Intern",
  period: "Jun – Aug 2025",
  location: "Remote",
  points: [
    "Built an analytics dashboard for real-time seller statistics and auditing",
    "Added role-based access control and JWT authentication",
    "Shipped REST APIs over DynamoDB, adding 5+ analytics features",
  ],
  stats: [
    { kind: "reported", value: "~15 min", label: "saved per task for engineers", source: "Prodigy team" },
    { kind: "reported", value: "40%", label: "fewer manual-entry errors", source: "Prodigy team" },
  ],
});

export const projects = [rideshare, carenexus] as const;
