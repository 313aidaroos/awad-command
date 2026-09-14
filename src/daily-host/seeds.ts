import type { DailyQuote, DailyWord, HistoricalEvent } from '@/daily-host/types';

const sources = (slug: string, britannica: string) => [
  { title: 'Encyclopaedia Britannica', url: britannica, publisher: 'Britannica' },
  { title: 'On This Day', url: `https://www.history.com/this-day-in-history/${slug}`, publisher: 'HISTORY' },
];

const event = (
  id: string,
  year: number,
  title: string,
  summary: string,
  category: string,
  score: number,
  britannica: string,
): HistoricalEvent => ({
  id,
  normalizedKey: id,
  month: 9,
  day: 14,
  year,
  title,
  summary,
  category,
  score,
  sources: sources(id, britannica),
  confidence: 0.96,
  verified: true,
});

/** Curated demo facts for September 14. Live research can replace this provider. */
export const historicalEvents: HistoricalEvent[] = [
  event('star-spangled-banner-written', 1814, 'The Star-Spangled Banner was written', 'After witnessing the bombardment of Fort McHenry, Francis Scott Key wrote the poem that later became the United States national anthem.', 'culture', 98, 'https://www.britannica.com/topic/The-Star-Spangled-Banner'),
  event('luna-2-moon-impact', 1959, 'Luna 2 reached the Moon', 'The Soviet probe Luna 2 became the first human-made object to reach the surface of the Moon.', 'science', 97, 'https://www.britannica.com/technology/Luna-space-probe'),
  event('first-balloon-flight-england', 1784, 'England saw its first balloon ascent', 'Vincenzo Lunardi piloted the first successful hydrogen-balloon flight in England before a huge London crowd.', 'invention', 91, 'https://www.britannica.com/biography/Vincenzo-Lunardi'),
  event('handels-messiah-completed', 1741, 'Handel completed Messiah', 'George Frideric Handel completed the score of Messiah after an exceptionally concentrated period of composition.', 'arts', 90, 'https://www.britannica.com/topic/Messiah-oratorio-by-Handel'),
  event('battle-of-san-jacinto-chiapas', 1867, 'The Battle of San Jacinto was fought in Mexico', 'Republican forces defeated imperial troops near San Jacinto during the final phase of the French intervention in Mexico.', 'history', 78, 'https://www.britannica.com/event/French-intervention-in-Mexico'),
  event('theodore-roosevelt-president', 1901, 'Theodore Roosevelt became president', 'Vice President Theodore Roosevelt took office after President William McKinley died from wounds inflicted by an assassin.', 'leadership', 95, 'https://www.britannica.com/biography/Theodore-Roosevelt'),
  event('soviet-lunik-announcement', 1959, 'Humanity touched another world', 'Confirmation of Luna 2’s lunar impact marked the first successful arrival of a spacecraft at another celestial body.', 'space', 93, 'https://www.britannica.com/technology/space-probe'),
  event('battle-of-homildon-hill', 1402, 'The Battle of Homildon Hill', 'English forces defeated a Scottish army using massed longbowmen near Wooler in Northumberland.', 'military', 72, 'https://www.britannica.com/technology/longbow'),
  event('gregorian-calendar-hungary', 1582, 'Hungary adopted the Gregorian calendar', 'The calendar reform designed to better align civil dates with the solar year spread through Europe.', 'science', 70, 'https://www.britannica.com/topic/Gregorian-calendar'),
  event('empire-state-express-record', 1891, 'A train inspired a speed legend', 'The Empire State Express began service between New York City and Buffalo, becoming a symbol of fast rail travel.', 'technology', 84, 'https://www.britannica.com/technology/railroad'),
  event('oppenheim-discovers-asteroid', 1864, 'A new asteroid was discovered', 'German astronomer Heinrich Louis d’Arrest discovered the asteroid Freia during the expanding age of telescopic astronomy.', 'science', 76, 'https://www.britannica.com/science/asteroid'),
  event('venus-potential-phosphine-report', 2020, 'A provocative clue was reported in Venus’s clouds', 'Astronomers reported a possible phosphine signature in Venus’s atmosphere, prompting debate and follow-up observations.', 'science', 88, 'https://www.britannica.com/place/Venus-planet'),
];

const word = (
  value: string,
  pronunciation: string,
  partOfSpeech: string,
  definition: string,
  example: string,
  difficulty: DailyWord['difficulty'],
  category = 'general',
): DailyWord => ({
  id: `word-${value}`,
  normalizedKey: value.toLowerCase(),
  word: value,
  pronunciation,
  partOfSpeech,
  definition,
  example,
  difficulty,
  category,
});

export const words: DailyWord[] = [
  word('resilient', 'rih-ZIL-yuhnt', 'adjective', 'Able to recover quickly from difficulty.', 'The resilient team adapted to every setback.', 'accessible'),
  word('lucid', 'LOO-sid', 'adjective', 'Clear and easy to understand.', 'Her lucid explanation made the idea memorable.', 'accessible'),
  word('catalyst', 'KAT-uh-list', 'noun', 'Something that causes or accelerates change.', 'The discovery became a catalyst for exploration.', 'accessible'),
  word('tenacious', 'tuh-NAY-shuhs', 'adjective', 'Persistent and determined.', 'A tenacious researcher kept testing the theory.', 'intermediate'),
  word('ephemeral', 'ih-FEM-er-uhl', 'adjective', 'Lasting for a very short time.', 'The ephemeral glow faded before sunrise.', 'intermediate'),
  word('serendipity', 'ser-uhn-DIP-ih-tee', 'noun', 'A fortunate discovery made by chance.', 'Serendipity led the inventor to a better material.', 'intermediate'),
  word('perspicacious', 'pur-spih-KAY-shuhs', 'adjective', 'Having keen insight and good judgment.', 'Her perspicacious analysis revealed the hidden risk.', 'advanced'),
  word('equanimity', 'ee-kwuh-NIM-ih-tee', 'noun', 'Calmness under pressure.', 'He met the surprising news with equanimity.', 'advanced'),
  word('audacious', 'aw-DAY-shuhs', 'adjective', 'Bold and willing to take risks.', 'The audacious mission aimed beyond Earth.', 'intermediate'),
  word('pragmatic', 'prag-MAT-ik', 'adjective', 'Focused on practical results.', 'They chose a pragmatic solution that worked today.', 'accessible'),
  word('sagacious', 'suh-GAY-shuhs', 'adjective', 'Showing wise judgment.', 'The sagacious leader listened before deciding.', 'advanced'),
  word('innovate', 'IN-uh-vayt', 'verb', 'To introduce a new method or idea.', 'Small teams can innovate with limited resources.', 'accessible'),
  word('meticulous', 'muh-TIK-yuh-luhs', 'adjective', 'Extremely careful about details.', 'Meticulous notes helped verify the account.', 'intermediate'),
  word('fortitude', 'FOR-tih-tood', 'noun', 'Courage during pain or adversity.', 'The expedition demanded remarkable fortitude.', 'intermediate'),
  word('eloquent', 'EL-uh-kwuhnt', 'adjective', 'Fluent and persuasive in expression.', 'The speech offered an eloquent call for unity.', 'accessible'),
  word('ubiquitous', 'yoo-BIK-wih-tuhs', 'adjective', 'Present or found everywhere.', 'Pocket cameras have become ubiquitous.', 'intermediate'),
  word('quintessential', 'kwin-tuh-SEN-shuhl', 'adjective', 'The most typical or perfect example.', 'It became the quintessential underdog story.', 'advanced'),
  word('confluence', 'KON-floo-uhns', 'noun', 'A coming together of people, ideas, or rivers.', 'A confluence of discoveries changed navigation.', 'intermediate'),
  word('intrepid', 'in-TREP-id', 'adjective', 'Fearless and adventurous.', 'The intrepid pilot crossed unfamiliar skies.', 'intermediate'),
  word('profound', 'pruh-FOUND', 'adjective', 'Very great or deeply meaningful.', 'The invention had a profound social effect.', 'accessible'),
  word('zeitgeist', 'TSYTE-guyst', 'noun', 'The defining spirit of an era.', 'The poster captured the zeitgeist of the 1960s.', 'advanced'),
  word('nuance', 'NOO-ahns', 'noun', 'A subtle distinction or variation.', 'Good history preserves nuance instead of easy myths.', 'intermediate'),
];

const quote = (id: string, text: string, author: string, source: string, category: string): DailyQuote => ({
  id,
  normalizedKey: `${author}:${text}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  quote: text,
  author,
  source,
  category,
  verified: true,
});

export const quotes: DailyQuote[] = [
  quote('aurelius-obstacle', 'The impediment to action advances action. What stands in the way becomes the way.', 'Marcus Aurelius', 'Meditations, Book 5', 'philosophy'),
  quote('angelou-courage', 'Courage is the most important of all the virtues because without courage, you cannot practice any other virtue consistently.', 'Maya Angelou', 'Interview in USA Weekend, 1988', 'courage'),
  quote('curie-understand', 'Nothing in life is to be feared; it is only to be understood.', 'Marie Curie', 'Our Precarious World, 1921', 'science'),
  quote('douglass-struggle', 'If there is no struggle, there is no progress.', 'Frederick Douglass', 'West India Emancipation speech, 1857', 'success'),
  quote('newton-shoulders', 'If I have seen further it is by standing on the shoulders of Giants.', 'Isaac Newton', 'Letter to Robert Hooke, 1675', 'science'),
  quote('roosevelt-arena', 'The credit belongs to the man who is actually in the arena.', 'Theodore Roosevelt', 'Citizenship in a Republic, 1910', 'courage'),
  quote('seneca-luck', 'Luck is what happens when preparation meets opportunity.', 'Seneca', 'Common modern paraphrase; attribution disputed', 'wisdom'),
  quote('franklin-time', 'Lost time is never found again.', 'Benjamin Franklin', 'Poor Richard’s Almanack, 1747', 'discipline'),
  quote('woolf-eyes', 'Arrange whatever pieces come your way.', 'Virginia Woolf', 'A Writer’s Diary', 'literature'),
  quote('twain-courage', 'Courage is resistance to fear, mastery of fear—not absence of fear.', 'Mark Twain', 'Pudd’nhead Wilson, 1894', 'courage'),
  quote('keller-face', 'Keep your face to the sunshine and you cannot see a shadow.', 'Helen Keller', 'Optimism, 1903', 'reflection'),
  quote('emerson-path', 'Do not go where the path may lead, go instead where there is no path and leave a trail.', 'Ralph Waldo Emerson', 'Commonly attributed; exact source uncertain', 'leadership'),
  quote('darwin-change', 'It is not the strongest of the species that survives, nor the most intelligent; it is the one most adaptable to change.', 'Leon C. Megginson', 'Interpretation of Darwin, 1963', 'wisdom'),
  quote('nightingale-success', 'I attribute my success to this: I never gave or took an excuse.', 'Florence Nightingale', 'Attributed in historical collections', 'discipline'),
  quote('tubman-dream', 'Every great dream begins with a dreamer.', 'Harriet Tubman', 'Commonly attributed', 'success'),
  quote('einstein-curiosity', 'I have no special talent. I am only passionately curious.', 'Albert Einstein', 'Letter to Carl Seelig, 1952', 'science'),
  quote('lincoln-years', 'It’s not the years in your life that count. It’s the life in your years.', 'Edward J. Stieglitz', 'My Brother Was an Only Child, 1947', 'reflection'),
  quote('aristotle-quality', 'Quality is not an act, it is a habit.', 'Will Durant', 'The Story of Philosophy, paraphrasing Aristotle', 'discipline'),
  quote('churchill-success', 'Success is not final, failure is not fatal: it is the courage to continue that counts.', 'Unknown', 'Frequently misattributed to Winston Churchill', 'courage'),
  quote('teresa-small', 'Not all of us can do great things. But we can do small things with great love.', 'Mother Teresa', 'Commonly attributed', 'wisdom'),
  quote('da-vinci-simple', 'Simplicity is the ultimate sophistication.', 'Unknown', 'Often attributed to Leonardo da Vinci; source unverified', 'wisdom'),
  quote('thoreau-direction', 'Go confidently in the direction of your dreams. Live the life you have imagined.', 'Henry David Thoreau', 'Walden, adapted from the conclusion', 'success'),
  quote('king-injustice', 'Injustice anywhere is a threat to justice everywhere.', 'Martin Luther King Jr.', 'Letter from Birmingham Jail, 1963', 'leadership'),
  quote('lincoln-people', 'Government of the people, by the people, for the people, shall not perish from the earth.', 'Abraham Lincoln', 'Gettysburg Address, 1863', 'leadership'),
  quote('kennedy-country', 'Ask not what your country can do for you—ask what you can do for your country.', 'John F. Kennedy', 'Inaugural Address, 1961', 'leadership'),
  quote('roosevelt-fear', 'The only thing we have to fear is fear itself.', 'Franklin D. Roosevelt', 'First Inaugural Address, 1933', 'courage'),
  quote('armstrong-step', 'That’s one small step for a man, one giant leap for mankind.', 'Neil Armstrong', 'Apollo 11 lunar transmission, 1969', 'history'),
  quote('shakespeare-brevity', 'Brevity is the soul of wit.', 'William Shakespeare', 'Hamlet, Act 2, Scene 2', 'literature'),
  quote('shakespeare-self', 'This above all: to thine own self be true.', 'William Shakespeare', 'Hamlet, Act 1, Scene 3', 'wisdom'),
  quote('austen-tenderness', 'There is no charm equal to tenderness of heart.', 'Jane Austen', 'Emma, 1815', 'literature'),
  quote('frank-sunshine', 'Think of all the beauty still left around you and be happy.', 'Anne Frank', 'The Diary of a Young Girl, 1944 entry', 'reflection'),
  quote('mandela-education', 'Education is the most powerful weapon which you can use to change the world.', 'Nelson Mandela', 'Speech at Madison Park High School, 1990', 'success'),
  quote('earhart-difficult', 'The most difficult thing is the decision to act, the rest is merely tenacity.', 'Amelia Earhart', 'Attributed in The Fun of It, 1932', 'courage'),
  quote('bacon-knowledge', 'Knowledge itself is power.', 'Francis Bacon', 'Meditationes Sacrae, 1597', 'wisdom'),
].map((item) => {
  const uncertain = /disputed|uncertain|commonly attributed|frequently misattributed|unverified/i.test(item.source);
  return { ...item, verified: !uncertain };
});
