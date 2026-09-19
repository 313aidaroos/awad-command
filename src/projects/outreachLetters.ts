import type { OutreachRow } from "@/projects/lyrixis/outreachTemplate";

function firstName(row: OutreachRow) {
  return row.name.split(" ")[0] || row.name;
}

function wrap(
  row: OutreachRow,
  subject: string,
  pitch: string,
  useA: string,
  useB: string,
  sign: string,
) {
  const first = firstName(row);
  const body = `Good afternoon ${first},

My name is Awad. I developed something you would find very, very useful. It is automated. You save real money. It is a no-brainer if this is already your work.

${pitch}

Two uses that pay for themselves:
1. ${useA}
2. ${useB}

Why I am writing you: ${row.why}

Reply to this email. Say sample and I will show you one pass. Say no and I will not write again.

${sign}
`;
  return { to: row.email, subject, body };
}

const letters: Record<
  string,
  (row: OutreachRow) => { to: string; subject: string; body: string }
> = {
  lyrixis: (row) =>
    wrap(
      row,
      `${row.house} can stop paying studio rates for every chapter`,
      `Lyrixis is a production desk for sound and text. Voices from our library — real people and sophisticated AI. Music gets refined, lyrics stamped, metadata kept. Books you already own get recorded. We do not open Kindle.`,
      `Send one manuscript you have the rights to. Get a spoken chapter with timings back.`,
      `Drop a finished track. Get cleaned audio, printed lyrics, and catalog metadata in one package.`,
      "Awad Alaidaroos\nLyrixis \u00b7 Apixis Dev LLC\nlyrixis@apixis.dev",
    ),
  socixis: (row) =>
    wrap(
      row,
      `${row.house} can stop paying an agency to guess the next post`,
      `Socixis is Cixy on your pages. You connect the accounts you already own. Coins live in Apixis Wallet.`,
      `Autopilot drafts a month of posts and images you approve before anything goes public.`,
      `Hand Cixy a logo. Get on-brand ads and a clean page layout without a second agency.`,
      "Awad Alaidaroos\nSocixis \u00b7 Apixis Dev LLC\nsocixis@apixis.dev",
    ),
  contraxis: (row) =>
    wrap(
      row,
      `${row.house} can stop losing jobs in the inbox`,
      `Contraxis matches homeowners and contractors. You keep the relationship. We keep the queue.`,
      `A homeowner request becomes a clean job ticket instead of a buried email.`,
      `A contractor sees work that fits the trade and the zip — not a junk blast.`,
      "Awad Alaidaroos\nContraxis \u00b7 Apixis Dev LLC\ncontraxis@apixis.dev",
    ),
  rawixis: (row) =>
    wrap(
      row,
      `${row.house} can stop hunting critical materials by phone`,
      `Rawixis is a B2B book for critical raw materials. Same numbers for both sides.`,
      `Post supply once. Buyers see live availability instead of a week of calls.`,
      `Lock a contract on the record so the deal is not a screenshot in a chat.`,
      "Awad Alaidaroos\nRawixis \u00b7 Apixis Dev LLC\nrawixis@apixis.dev",
    ),
  halaxis: (row) =>
    wrap(
      row,
      `${row.house} asked for a book that stays clean`,
      `Halaxis is allocation that can say how the dollar is made. No dressed-up riba.`,
      `Screen a book before money moves and drop what cannot be explained.`,
      `Show an investor a clean holdings view instead of a vague promise.`,
      "Awad Alaidaroos\nHalaxis \u00b7 Apixis Dev LLC\nhalaxis@apixis.dev",
    ),
  recovra: (row) =>
    wrap(
      row,
      `${row.house} is probably still overpaying somewhere`,
      `Recovra finds overcharges already paid and lines up recovery.`,
      `Run last year's vendor invoices and mark the lines that do not belong.`,
      `Hand finance a recovery packet instead of a new full-time hunter.`,
      "Awad Alaidaroos\nRecovra \u00b7 Apixis Dev LLC\nrecovra@apixis.dev",
    ),
  qahwahworld: (row) =>
    wrap(
      row,
      `${row.house} can sell the cup without a bloated agency menu`,
      `Qahwah World is a specialty coffee desk. Work done. Not a 40-page deck.`,
      `New menu and board that match the cup you actually serve.`,
      `Short ads and a page that send people to the door this week.`,
      "Awad Alaidaroos\nQahwah World \u00b7 Apixis Dev LLC\nqahwahworld@apixis.dev",
    ),
  awadbot: (row) =>
    wrap(
      row,
      `${row.house} can watch the book without living in a spreadsheet`,
      `AwadBot is a finance desk. Paper first. No live spend unless you say so in writing.`,
      `Daily tape and a paper book you can read in one screen.`,
      `A risk check before a trade idea becomes an order.`,
      "Awad Alaidaroos\nAwadBot \u00b7 Apixis Dev LLC\nawadbot@apixis.dev",
    ),
  geoxis: (row) =>
    wrap(
      row,
      `${row.house} can see the fleet on one map`,
      `Geoxis is a live map of company movement.`,
      `See which site is up, slow, or dark without twelve chats.`,
      `Watch crews or assets move and catch a stall while it is still cheap.`,
      "Awad Alaidaroos\nGeoxis \u00b7 Apixis Dev LLC\ngeoxis@apixis.dev",
    ),
  launchixis: (row) =>
    wrap(
      row,
      `${row.house} can stand a sister company up without a six-month agency`,
      `Launchixis is launch ops for a new family company.`,
      `Name, first page, and first meter in one pass.`,
      `Wallet checkout on day one so the new apple can take money.`,
      "Awad Alaidaroos\nLaunchixis \u00b7 Apixis Dev LLC\nlaunchixis@apixis.dev",
    ),
  "nursery-toons": (row) =>
    wrap(
      row,
      `${row.house} can get clean kids stories without a giant studio bill`,
      `Nursery Toons is kids cartoons and nursery content. Soft. No junk.`,
      `A locked character bible so the child looks the same every episode.`,
      `A short episode pack you can post without a full studio floor.`,
      "Awad Alaidaroos\nNursery Toons \u00b7 Apixis Dev LLC\nnurserytoons@apixis.dev",
    ),
  content: (row) =>
    wrap(
      row,
      `${row.house} can stop paying per one-minute video like it is a feature film`,
      `Content Studio cuts one-minute social videos on a repeatable desk.`,
      `One script to one vertical cut, ready for the page you already run.`,
      `A weekly pack instead of hiring a crew for every hook.`,
      "Awad Alaidaroos\nContent Studio \u00b7 Apixis Dev LLC\ncontentbot@apixis.dev",
    ),
  apixis: (row) =>
    wrap(
      row,
      `${row.house} can put agents to work in a world that actually keeps a book`,
      `Apixis is the virtual world where AI agents run an economy with rules.`,
      `Stand up agents that trade, argue, and keep a ledger you can read.`,
      `Watch the book instead of a demo reel that resets every night.`,
      "Awad Alaidaroos\nApixis \u00b7 Apixis Dev LLC\nawad@apixis.dev",
    ),
  wallet: (row) =>
    wrap(
      row,
      `${row.house} can stop hanging a card form on every sister site`,
      `Apixis Wallet is the family cash register. 100 XP is one dollar.`,
      `Customer buys coins once. Every apple only redeems.`,
      `You see one ledger instead of five Stripe buttons.`,
      "Awad Alaidaroos\nApixis Wallet \u00b7 Apixis Dev LLC\nawad@apixis.dev",
    ),
};

export function letterFor(slug: string, row: OutreachRow) {
  return (letters[slug] ?? letters.apixis)(row);
}
