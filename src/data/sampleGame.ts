import type { Game } from '../types/game'

const sampleGame: Game = {
  title: 'Jeopardy!',
  categories: [
    {
      name: 'History',
      tiles: [
        { points: 200, answered: false, content: { type: 'simple', question: 'This document, signed in 1215, limited the power of the English king.', answer: 'What is the Magna Carta?' } },
        { points: 400, answered: false, content: { type: 'simple', question: 'He led the Allied forces on D-Day during World War II.', answer: 'Who is Dwight D. Eisenhower?' } },
        { points: 600, answered: false, content: { type: 'simple', question: 'The ancient wonder located at Alexandria was this type of structure.', answer: 'What is a lighthouse?' } },
        { points: 800, answered: false, content: { type: 'simple', question: 'This 1789 event marked the beginning of the French Revolution.', answer: 'What is the storming of the Bastille?' } },
        { points: 1000, answered: false, content: { type: 'simple', question: 'The Silk Road connected China to this continent via Central Asia.', answer: 'What is Europe?' } },
      ],
    },
    {
      name: 'Science',
      tiles: [
        { points: 200, answered: false, content: { type: 'simple', question: 'This gas makes up about 78% of Earth\'s atmosphere.', answer: 'What is nitrogen?' } },
        { points: 400, answered: false, content: { type: 'simple', question: 'The speed of light in a vacuum is approximately this many kilometers per second.', answer: 'What is 300,000 km/s?' } },
        { points: 600, answered: false, content: { type: 'simple', question: 'This scientist developed the three laws of motion.', answer: 'Who is Isaac Newton?' } },
        { points: 800, answered: false, content: { type: 'simple', question: 'DNA stands for this full name.', answer: 'What is deoxyribonucleic acid?' } },
        { points: 1000, answered: false, content: { type: 'simple', question: 'This subatomic particle has no electric charge and is found in the nucleus.', answer: 'What is a neutron?' } },
      ],
    },
    {
      name: 'Pop Culture',
      tiles: [
        { points: 200, answered: false, content: { type: 'simple', question: 'This pop star released the album "Thriller" in 1982.', answer: 'Who is Michael Jackson?' } },
        { points: 400, answered: false, content: { type: 'simple', question: 'The fictional detective Sherlock Holmes lives on this famous street in London.', answer: 'What is Baker Street?' } },
        { points: 600, answered: false, content: { type: 'simple', question: 'This Disney film features a girl with magical hair named Rapunzel.', answer: 'What is Tangled?' } },
        { points: 800, answered: false, content: { type: 'simple', question: '"To infinity and beyond!" is the catchphrase of this Toy Story character.', answer: 'Who is Buzz Lightyear?' } },
        { points: 1000, answered: false, content: { type: 'simple', question: 'This TV show is set in the fictional land of Westeros.', answer: 'What is Game of Thrones?' } },
      ],
    },
    {
      name: 'Geography',
      tiles: [
        { points: 200, answered: false, content: { type: 'simple', question: 'This is the largest country in the world by land area.', answer: 'What is Russia?' } },
        { points: 400, answered: false, content: { type: 'simple', question: 'The Amazon River flows through this country.', answer: 'What is Brazil?' } },
        { points: 600, answered: false, content: { type: 'simple', question: 'Mount Everest is located on the border between Nepal and this country.', answer: 'What is Tibet/China?' } },
        { points: 800, answered: false, content: { type: 'simple', question: 'This is the capital city of Australia.', answer: 'What is Canberra?' } },
        { points: 1000, answered: false, content: { type: 'simple', question: 'The Sahara Desert spans this many countries (approximately).', answer: 'What is 11 countries?' } },
      ],
    },
    {
      name: 'Sports',
      tiles: [
        { points: 200, answered: false, content: { type: 'simple', question: 'In basketball, this line determines if a shot is worth 2 or 3 points.', answer: 'What is the three-point line?' } },
        { points: 400, answered: false, content: { type: 'simple', question: 'This country has won the most FIFA World Cup titles.', answer: 'What is Brazil?' } },
        { points: 600, answered: false, content: { type: 'simple', question: 'A perfect score in Olympic gymnastics used to be this number.', answer: 'What is 10?' } },
        { points: 800, answered: false, content: { type: 'simple', question: 'The Tour de France cycling race takes place in this month.', answer: 'What is July?' } },
        { points: 1000, answered: false, content: { type: 'simple', question: 'This sport uses the terms "love", "deuce", and "advantage".', answer: 'What is tennis?' } },
      ],
    },
  ],
}

export default sampleGame
