import { createHash } from "node:crypto";

function dk(title: string) {
  return createHash("sha256").update(`emailtpl|${title}`).digest("hex");
}

export const SEED_EMAIL_TEMPLATES = [
  {
    title: "Thank You After Coffee Chat",
    category: "Thank You",
    subject: "Thank you — [Their Name]",
    body: `Hi [Name],

Thank you so much for taking the time to speak with me today. I really enjoyed learning about your path from [school] to [firm] and your perspective on [something specific discussed]. Your advice on [specific advice] was particularly helpful as I think about my recruiting process.

I'll definitely follow up on [action item they mentioned].

Thanks again — I hope to stay in touch.

Best,
[Your Name]`,
    tags: ["IB", "PE", "networking"],
    isOfficial: true,
    dedupeKey: dk("Thank You After Coffee Chat"),
  },
  {
    title: "Cold Outreach — Alumni",
    category: "Cold Outreach",
    subject: "MSU Broad Student — Quick Question",
    body: `Hi [Name],

I'm [Your Name], a [year] at MSU Broad studying Finance. I came across your profile and was really impressed by your path from Broad to [firm]. I'm currently recruiting for [role] and would love to learn about your experience if you have 15-20 minutes for a quick call.

Completely understand if your schedule is tight.

Best,
[Your Name]`,
    tags: ["IB", "PE", "alumni"],
    isOfficial: true,
    dedupeKey: dk("Cold Outreach — Alumni"),
  },
  {
    title: "Follow Up — Share a Resource",
    category: "Follow Up",
    subject: "Following up + something you might find interesting",
    body: `Hi [Name],

I wanted to follow up on our conversation last week and share [article/resource] that reminded me of what we discussed about [topic].

I've also been thinking about your advice on [their advice] and have been [what you've done about it].

Hope things are going well at [firm].

Best,
[Your Name]`,
    tags: ["IB", "PE", "follow-up"],
    isOfficial: true,
    dedupeKey: dk("Follow Up — Share a Resource"),
  },
  {
    title: "Referral Request",
    category: "Referral Request",
    subject: "Introduction Request — [Target Person/Firm]",
    body: `Hi [Name],

Hope you're doing well. I wanted to reach out because I'm very interested in [target firm] and noticed you're connected with [target person]. If you're comfortable, would you be willing to make an introduction? I'd love to learn more about [target firm]'s [group/role].

No pressure at all if it's not a good fit.

Best,
[Your Name]`,
    tags: ["IB", "PE", "referral"],
    isOfficial: true,
    dedupeKey: dk("Referral Request"),
  },
  {
    title: "Re-engage After Silence",
    category: "Re-engage",
    subject: "Checking in — [Your Name] from MSU",
    body: `Hi [Name],

I hope things are going well at [firm]. I wanted to check in as I'm in the middle of recruiting for [role] this cycle. Our conversation last [timeframe] was really helpful and I've been following [firm]'s work on [recent deal/news].

Would love to reconnect briefly if you have time.

Best,
[Your Name]`,
    tags: ["IB", "PE", "re-engage"],
    isOfficial: true,
    dedupeKey: dk("Re-engage After Silence"),
  },
];
