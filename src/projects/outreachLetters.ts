import type { OutreachRow } from "@/projects/lyrixis/outreachTemplate";

function firstName(row: OutreachRow) {
  return row.name.split(" ")[0] || row.name;
}

function wrap(
  row: OutreachRow,
  subject: string,
  middle: string,
  sign = "Awad Alaidaroos\nApixis Dev LLC",
) {
  const first = firstName(row);
  const body = `Good afternoon ${first},

My name is Awad. I developed something you would find very, very useful. It is automated. You save real money. It is a no-brainer if this is already your work.

${middle}

Why I am writing you: ${row.why}

Reply to this email. Say sample and I will show you one pass. Say no and I will not write again.

${sign}
`;
  return { to: row.email, subject, body };
}

const letters: Record<string, (row: OutreachRow) => { to: string; subject: string; body: string }> =
  {
    lyrixis: (row) =>
      wrap(
        row,
        `${row.house} can stop paying studio rates for every chapter`,
        `Lyrixis is a production desk for sound and text.

Voices. You pick from our library. Mix of real people and sophisticated AI voices. Same floor. You do not have to hire a booth for every title.

Music. We refine the sound, stamp and print the lyrics, and keep the metadata with the file so the catalog stays clean.

Books. You send the manuscript you already have the rights to. We record the reading and send back spoken chapters with timings. We do not open Kindle. We do not scrape a store.

Other pieces sit on the same desk: listen-along pages, chapter delivery, QC. Efficient on purpose.`,
        "Awad Alaidaroos\nLyrixis \u00b7 Apixis Dev LLC\nlyrixis@apixis.dev",
      ),
    socixis: (row) =>
      wrap(
        row,
        `${row.house} can stop paying an agency to guess the next post`,
        `Socixis is an AI marketing desk. Cixy helps you plan, write, and design for the pages you already own. You connect your own accounts. We do not invent fake followers.

You buy coins in Apixis Wallet and redeem Autopilot. One checkout for the whole family.`,
        "Awad Alaidaroos\nSocixis \u00b7 Apixis Dev LLC\nsocixis@apixis.dev",
      ),
    contraxis: (row) =>
      wrap(
        row,
        `${row.house} can stop losing jobs in the inbox`,
        `Contraxis matches homeowners and contractors without the usual runaround. Intake, match, follow-up. You keep the relationship. We keep the queue honest.`,
        "Awad Alaidaroos\nContraxis \u00b7 Apixis Dev LLC\ncontraxis@apixis.dev",
      ),
    rawixis: (row) =>
      wrap(
        row,
        `${row.house} can stop hunting critical materials by phone`,
        `Rawixis is a B2B desk for critical raw materials. Buyers and sellers see the same book. Contracts stay on the record. No theater numbers.`,
        "Awad Alaidaroos\nRawixis \u00b7 Apixis Dev LLC\nrawixis@apixis.dev",
      ),
    halaxis: (row) =>
      wrap(
        row,
        `${row.house} asked for a book that stays clean`,
        `Halaxis is a desk for halal and Sharia-conscious allocation. We do not dress riba in new clothes. If the screen cannot say how a dollar is made, it does not go on the screen.`,
        "Awad Alaidaroos\nHalaxis \u00b7 Apixis Dev LLC\nhalaxis@apixis.dev",
      ),
    recovra: (row) =>
      wrap(
        row,
        `${row.house} is probably still overpaying somewhere`,
        `Recovra finds overcharges companies already paid and lines up recovery. You do not need another full-time hunter on payroll for the first pass.`,
        "Awad Alaidaroos\nRecovra \u00b7 Apixis Dev LLC\nrecovra@apixis.dev",
      ),
    qahwahworld: (row) =>
      wrap(
        row,
        `${row.house} can sell the cup without a bloated agency menu`,
        `Qahwah World is a specialty coffee desk. Menus, brand, short ads. Built for cafes that want the work done, not a 40-page deck.`,
        "Awad Alaidaroos\nQahwah World \u00b7 Apixis Dev LLC\nqahwahworld@apixis.dev",
      ),
    awadbot: (row) =>
      wrap(
        row,
        `${row.house} can watch the book without living in a spreadsheet`,
        `AwadBot is a personal finance desk. Paper first. It reads the tape and keeps a book. It does not spend your live account unless you later say so in writing.`,
        "Awad Alaidaroos\nAwadBot \u00b7 Apixis Dev LLC\nawadbot@apixis.dev",
      ),
    geoxis: (row) =>
      wrap(
        row,
        `${row.house} can see the fleet on one map`,
        `Geoxis is a live map of company movement. Where the work is. Where it stalled. One picture instead of twelve chats.`,
        "Awad Alaidaroos\nGeoxis \u00b7 Apixis Dev LLC\ngeoxis@apixis.dev",
      ),
    launchixis: (row) =>
      wrap(
        row,
        `${row.house} can stand a sister company up without a six-month agency`,
        `Launchixis is launch ops for new family companies. Name, stack, first page, first meter. Fast on purpose.`,
        "Awad Alaidaroos\nLaunchixis \u00b7 Apixis Dev LLC\nlaunchixis@apixis.dev",
      ),
    "nursery-toons": (row) =>
      wrap(
        row,
        `${row.house} can get clean kids stories without a giant studio bill`,
        `Nursery Toons makes kids cartoons and nursery content. Soft, clear, no junk. You keep the characters. We keep the pipeline moving.`,
        "Awad Alaidaroos\nNursery Toons \u00b7 Apixis Dev LLC\nnurserytoons@apixis.dev",
      ),
    content: (row) =>
      wrap(
        row,
        `${row.house} can stop paying per one-minute video like it is a feature film`,
        `Content Studio cuts one-minute social videos on a repeatable desk. Same voice rules. Same Wallet coins.`,
        "Awad Alaidaroos\nContent Studio \u00b7 Apixis Dev LLC\ncontentbot@apixis.dev",
      ),
    apixis: (row) =>
      wrap(
        row,
        `${row.house} can put agents to work in a world that actually keeps a book`,
        `Apixis is the virtual world where AI agents run an economy. Not a slide. A book with rules.`,
        "Awad Alaidaroos\nApixis \u00b7 Apixis Dev LLC\nawad@apixis.dev",
      ),
    wallet: (row) =>
      wrap(
        row,
        `${row.house} can stop hanging a card form on every sister site`,
        `Apixis Wallet is the family cash register. Buy coins once. Redeem everywhere. 100 XP is one dollar. No second checkout.`,
        "Awad Alaidaroos\nApixis Wallet \u00b7 Apixis Dev LLC\nawad@apixis.dev",
      ),
  };

export function letterFor(slug: string, row: OutreachRow) {
  return (letters[slug] ?? letters.apixis)(row);
}
