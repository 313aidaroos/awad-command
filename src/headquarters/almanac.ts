export const vocabulary = [
  [
    "Perspicacious",
    "Quick to understand things accurately.",
    "Her perspicacious questions revealed the flaw in our plan.",
  ],
  [
    "Equanimity",
    "Calmness under pressure or difficulty.",
    "He handled the difficult negotiations with equanimity.",
  ],
  [
    "Nuance",
    "A subtle difference in meaning or expression.",
    "Reading several sources helped her understand the nuance.",
  ],
  [
    "Foresight",
    "The ability to anticipate future needs or events.",
    "Their foresight helped the business prepare for change.",
  ],
  [
    "Resilient",
    "Able to recover after difficulty.",
    "The resilient team rebuilt after the setback.",
  ],
  [
    "Empirical",
    "Based on observation or experience.",
    "We asked for empirical evidence before accepting the claim.",
  ],
  [
    "Pragmatic",
    "Focused on practical results.",
    "A pragmatic solution kept the project moving.",
  ],
  [
    "Tenacity",
    "Determination to continue despite difficulty.",
    "Her tenacity turned a small idea into a business.",
  ],
  [
    "Discernment",
    "The ability to judge and understand well.",
    "Discernment matters when comparing conflicting reports.",
  ],
  [
    "Reciprocity",
    "An exchange of benefits or actions between parties.",
    "The agreement was built on reciprocity.",
  ],
  [
    "Cogent",
    "Clear, logical, and convincing.",
    "He offered a cogent explanation of the decision.",
  ],
  [
    "Diligence",
    "Careful and persistent effort.",
    "Diligence helped the team catch errors before launch.",
  ],
  [
    "Agency",
    "The ability to make choices and act on them.",
    "Education can give people greater agency.",
  ],
  [
    "Salient",
    "Especially noticeable or important.",
    "She summarized the salient points of the report.",
  ],
  [
    "Fortitude",
    "Courage during pain or adversity.",
    "The community showed fortitude during recovery.",
  ],
  [
    "Lucid",
    "Clear and easy to understand.",
    "The historian gave a lucid account of the conflict.",
  ],
  [
    "Synthesis",
    "Combining different ideas into a coherent whole.",
    "The briefing offered a synthesis of several sources.",
  ],
  [
    "Judicious",
    "Showing careful and sensible judgment.",
    "A judicious pause prevented a costly mistake.",
  ],
  [
    "Inquisitive",
    "Eager to learn and ask questions.",
    "An inquisitive reader checks the original evidence.",
  ],
  [
    "Stewardship",
    "Responsible care and management of something.",
    "Good stewardship protected the company’s resources.",
  ],
  [
    "Meticulous",
    "Very careful and attentive to detail.",
    "Meticulous records made the review straightforward.",
  ],
  [
    "Diplomacy",
    "Managing relations through discussion and tact.",
    "Patient diplomacy kept the talks open.",
  ],
  [
    "Context",
    "The circumstances needed to understand something.",
    "The archive provided context for today’s debate.",
  ],
  [
    "Candid",
    "Honest and direct.",
    "A candid conversation clarified their priorities.",
  ],
  [
    "Adaptable",
    "Able to adjust to new conditions.",
    "An adaptable team responded quickly to change.",
  ],
  [
    "Corroborate",
    "To support a claim with additional evidence.",
    "Independent records corroborate the account.",
  ],
  [
    "Precedent",
    "An earlier example that guides later decisions.",
    "The treaty established a precedent for future talks.",
  ],
  [
    "Intrepid",
    "Brave when facing danger or difficulty.",
    "The intrepid reporter pursued the story.",
  ],
  [
    "Deliberate",
    "Done with careful thought or intention.",
    "She made a deliberate choice to listen first.",
  ],
  [
    "Provenance",
    "The origin or history of something.",
    "The researcher checked the photograph’s provenance.",
  ],
  [
    "Serendipity",
    "Finding something valuable by chance.",
    "Serendipity led her to an overlooked archive.",
  ],
] as const;
export function wordForDate(date: string) {
  const days = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86400000);
  return vocabulary[
    ((days % vocabulary.length) + vocabulary.length) % vocabulary.length
  ];
}
export function moonPhase(now: Date) {
  const age =
    ((((now.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000) %
      29.530588853) +
      29.530588853) %
    29.530588853;
  const names = [
    "New moon",
    "Waxing crescent",
    "First quarter",
    "Waxing gibbous",
    "Full moon",
    "Waning gibbous",
    "Last quarter",
    "Waning crescent",
  ];
  return {
    name: names[Math.round((age / 29.530588853) * 8) % 8],
    illumination: Math.round(
      (1 - Math.cos((age / 29.530588853) * Math.PI * 2)) * 50,
    ),
    age,
  };
}
