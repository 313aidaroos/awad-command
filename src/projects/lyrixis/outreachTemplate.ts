export type OutreachRow = {
  name: string;
  house: string;
  role: string;
  email: string;
  why: string;
};

export function publisherLetter(row: OutreachRow) {
  const first = row.name.split(" ")[0] || row.name;
  const subject = `${row.house} already has the library. We return the voices.`;
  const body = `Salaam ${first},

Lyrixis is a small production desk. You keep the rights. You send the files. We send back timed audio and aligned text — chapter by chapter — with voices from our floor.

We do not open Kindle. We do not scrape a store. If ${row.house} needs spoken editions for a catalog you already own, that is the whole product.

Why I wrote you: ${row.why}

One sample chapter is enough to see if the voice is right. Reply to this mail or lyrixis@apixis.dev. I will not follow up if you are silent.

Awad Alaidaroos
Apixis Dev LLC
lyrixis@apixis.dev
`;
  return { to: row.email, subject, body };
}
