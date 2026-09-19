export type OutreachRow = {
  name: string;
  house: string;
  role?: string;
  email: string;
  why: string;
};

export function publisherLetter(row: OutreachRow) {
  const first = row.name.split(" ")[0] || row.name;
  const subject = `${row.house} already owns the books. We turn them into voices.`;
  const body = `${first} —

One line: you keep the rights. You send the files. Lyrixis sends back spoken chapters with timings.

We do not open Kindle. We do not scrape a store. If a house already has a library and needs audio, that is the whole product. Voices come off our floor. Cixy is not for sale.

Why you: ${row.why}

Reply to this mail. Yes, a sample chapter, or not now. I will not write twice.

Awad
Lyrixis · Apixis Dev LLC
lyrixis@apixis.dev
`;
  return { to: row.email, subject, body };
}
