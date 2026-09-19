export type OutreachRow = {
  name: string;
  house: string;
  role?: string;
  email: string;
  why: string;
};

export function publisherLetter(row: OutreachRow) {
  const first = row.name.split(" ")[0] || row.name;
  const subject = `${row.house} can stop paying studio rates for every chapter`;
  const body = `Good afternoon ${first},

My name is Awad. I developed something you would find very, very useful. It is automated. You save real money. It is a no-brainer if you already own the catalog.

Lyrixis is a production desk for sound and text.

Voices. You pick from our library. Mix of real people and sophisticated AI voices. Same floor. You do not have to hire a booth for every title.

Music. We refine the sound, stamp and print the lyrics, and keep the metadata with the file so the catalog stays clean.

Books. You send the manuscript you already have the rights to. We record the reading and send back spoken chapters with timings. We do not open Kindle. We do not scrape a store.

Other pieces sit on the same desk: listen-along pages, chapter delivery, QC. Efficient on purpose.

Why I am writing you: ${row.why}

Reply to this email. Say sample and I will run one chapter so you can hear a floor voice on your material. Say no and I will not write again.

Awad Alaidaroos
Lyrixis · Apixis Dev LLC
lyrixis@apixis.dev
`;
  return { to: row.email, subject, body };
}
