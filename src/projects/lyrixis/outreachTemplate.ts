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

My name is Awad. I developed something you would find very, very useful. It is automated. You save real money. It is a no-brainer if you already own the books.

Lyrixis is a production desk. You keep the rights. You send us the library. We send back spoken chapters with timings, in voices from our floor. You are not renting a booth for every title. You are not waiting months for a narrator calendar.

We do not open Kindle. We do not scrape a store. If ${row.house} already has the files, that is enough.

Why I am writing you: ${row.why}

Reply to this email. Say sample and I will run one chapter so you can hear it. Say no and I will not write again.

Awad Alaidaroos
Lyrixis · Apixis Dev LLC
lyrixis@apixis.dev
`;
  return { to: row.email, subject, body };
}
