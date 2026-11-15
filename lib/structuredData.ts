import { profile } from "@/content/profile";
import { projects } from "@/content/projects";
import { SITE_URL } from "@/lib/site";

/**
 * schema.org JSON-LD for the home page: who this is (Person), the site, and the two shipped
 * projects credited to that person. Search engines and AI answer engines use it to build a
 * knowledge panel and link the GitHub, LinkedIn and LeetCode profiles to one identity.
 */
export function buildStructuredData() {
  const personId = `${SITE_URL}/#person`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": `${SITE_URL}/#profile`,
        url: SITE_URL,
        name: `${profile.name}, ${profile.role}`,
        mainEntity: { "@id": personId },
        inLanguage: "en",
      },
      {
        "@type": "Person",
        "@id": personId,
        name: profile.name,
        url: SITE_URL,
        image: `${SITE_URL}${profile.portrait.src}`,
        jobTitle: profile.role,
        description: "Full-stack engineer building real-time and AI products with Next.js, TypeScript and FastAPI.",
        address: { "@type": "PostalAddress", addressLocality: "Greater Noida", addressCountry: "IN" },
        alumniOf: { "@type": "CollegeOrUniversity", name: profile.education.school },
        knowsAbout: ["Next.js", "React", "TypeScript", "Node.js", "FastAPI", "PostgreSQL", "WebSockets", "three.js", "Machine learning"],
        sameAs: profile.links.map((l) => l.href),
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: profile.name,
        publisher: { "@id": personId },
      },
      ...projects.map((p) => ({
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#${p.slug}`,
        name: p.name,
        description: p.summary,
        applicationCategory: "WebApplication",
        operatingSystem: "Web",
        url: p.liveUrl ?? p.repoUrl,
        codeRepository: p.repoUrl,
        creator: { "@id": personId },
      })),
    ],
  };
}

/** JSON for a <script> tag: "<" escaped so content can never close the tag (XSS). */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
