import { Profile, PUBLIC_EMAIL, type Profile as ProfileT } from "./schema";

export const profile: ProfileT = Profile.parse({
  name: "Sarthak Saxena",
  tagline: "Sure enough to burn the ships.",
  role: "Full-stack engineer",
  location: "Greater Noida, India",
  email: PUBLIC_EMAIL,
  education: {
    degree: "B.Tech, Computer Science and Engineering (AI & ML)",
    school: "Noida Institute of Engineering and Technology",
    years: "2023–2027",
    cgpa: "8.25",
  },
  links: [
    { label: "GitHub", href: "https://github.com/sarthaksaxenaa" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/sarthaksaxenaa/" },
    { label: "LeetCode", href: "https://leetcode.com/u/Sarthxen/" },
  ],
  portrait: {
    src: "/portrait-halftone.webp",
    alt: "Halftone portrait of Sarthak Saxena in a dark suit and glasses",
  },
});
