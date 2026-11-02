/** npm run test-fit — fit question helpers: variants, draft assembly, speaking time, generic phrases. */
import { FIT_DATA, assembleDraft, genericFlags, promptFor, speakingSeconds, storyMatchesThemes, targetSeconds, variantKind } from "../src/lib/fit";

let fails = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok || !detail ? "" : ` — ${detail}`}`);
};
const q = (id: string) => FIT_DATA.questions.find((x) => x.id === id)!;

check("26 questions in 8 categories", FIT_DATA.questions.length === 26 && FIT_DATA.categories.length === 8);
check("every question's category is listed", FIT_DATA.questions.every((x) => FIT_DATA.categories.includes(x.category)));
check("variant kinds", variantKind(q("why-city")) === "city" && variantKind(q("why-group")) === "group" && variantKind(q("why-firm")) === "firm" && variantKind(q("why-ib")) === null);
check("prompt with variant", promptFor(q("why-firm"), "Houlihan Lokey") === "Why Houlihan Lokey?" && promptFor(q("why-city"), "Chicago") === "Why Chicago?");
check("target seconds", JSON.stringify(targetSeconds(q("why-ib"))) === '{"min":60,"max":90}');
check("speaking time ~150 wpm", speakingSeconds(Array(150).fill("word").join(" ")) === 60);

const team = assembleDraft(q("teamwork"), { situation: "our case competition team", task: "the valuation", action: "rebuilt the model overnight", result: "we placed second of 30" });
check("teamwork: builder answers fill matching placeholders", team.draft.includes("rebuilt the model overnight") && team.draft.includes("we placed second of 30"), team.draft);

const city = assembleDraft(q("why-city"), { personal: "My family lives in the suburbs", professional: "the middle-market scene is strong" }, { variant: "Chicago", variantKind: "city" });
check("why city: [City] from the chosen city", city.draft.startsWith("Chicago is where"), city.draft);

const tmay = assembleDraft(q("story-tmay"), { spark: "my uncle walked me through his company's sale" }, { year: "sophomore", school: "Michigan State", hometown: "Grand Rapids" });
check("TMAY: profile context fills year/school/hometown", tmay.draft.startsWith("I'm a sophomore at Michigan State") && tmay.draft.includes("Grand Rapids") && tmay.draft.includes("my uncle"), tmay.draft);
check("TMAY: unfilled placeholders stay visible", tmay.unfilled.includes("major") && tmay.draft.includes("[major]"));

const unused = assembleDraft(q("why-ib"), { spark: "x", understanding: "y", fit: "z", goal: "g", extra: "e" });
check("unused builder answers are reported", Array.isArray(unused.unused));

check("generic phrases flagged", genericFlags("I thrive in a fast-paced environment and I want to learn a lot.").length === 2);
check("stories match themes", storyMatchesThemes({ slot: "leadership", title: "Ran the club" }, ["leadership", "teamwork"]) && !storyMatchesThemes({ slot: "analytical", title: "Stock pitch" }, ["leadership"]));

console.log(fails ? `\n${fails} failed` : "\nFit helper checks pass.");
process.exit(fails ? 1 : 0);
