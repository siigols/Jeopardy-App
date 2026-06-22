import type { Game } from '../types/game'

const sampleGame: Game = {
  title: 'Jeopardy!',
  description: 'Klassisk Jeopardy med spørsmål om historie, vitenskap, kultur, geografi og sport.',
  tiebreaker: {
    type: 'simple',
    question: 'Hvilket år ble den første e-posten noensinne sendt?',
    answer: '1971',
  },
  categories: [
    {
      name: 'Historie',
      tiles: [
        { points: 200, answered: false, content: { type: 'simple', question: 'Dette dokumentet, signert i 1215, begrenset den engelske kongens makt.', answer: 'Hva er Magna Carta?' } },
        { points: 400, answered: false, content: { type: 'simple', question: 'Han ledet de allierte styrkene på D-dagen under andre verdenskrig.', answer: 'Hvem er Dwight D. Eisenhower?' } },
        { points: 600, answered: false, content: { type: 'simple', question: 'Det antikke underet i Alexandria var denne typen struktur.', answer: 'Hva er et fyrtårn?' } },
        { points: 800, answered: false, content: { type: 'simple', question: 'Denne hendelsen i 1789 markerte starten på den franske revolusjonen.', answer: 'Hva er stormingen av Bastillen?' } },
        { points: 1000, answered: false, content: { type: 'simple', question: 'Silkeveien koblet Kina til dette kontinentet via Sentral-Asia.', answer: 'Hva er Europa?' } },
      ],
    },
    {
      name: 'Vitenskap',
      tiles: [
        { points: 200, answered: false, content: { type: 'simple', question: 'Denne gassen utgjør omtrent 78 % av jordens atmosfære.', answer: 'Hva er nitrogen?' } },
        { points: 400, answered: false, content: { type: 'simple', question: 'Lysets hastighet i vakuum er omtrent dette antallet kilometer per sekund.', answer: 'Hva er 300 000 km/s?' } },
        { points: 600, answered: false, content: { type: 'simple', question: 'Denne vitenskapsmannen utviklet de tre bevegelseslovene.', answer: 'Hvem er Isaac Newton?' } },
        { points: 800, answered: false, content: { type: 'simple', question: 'DNA er forkortelse for dette fulle navnet.', answer: 'Hva er deoksyribonukleinsyre?' } },
        { points: 1000, answered: false, content: { type: 'simple', question: 'Denne subatomære partikkelen har ingen elektrisk ladning og finnes i atomkjernen.', answer: 'Hva er et nøytron?' } },
      ],
    },
    {
      name: 'Populærkultur',
      tiles: [
        { points: 200, answered: false, content: { type: 'simple', question: 'Denne popstjernen ga ut albumet «Thriller» i 1982.', answer: 'Hvem er Michael Jackson?' } },
        { points: 400, answered: false, content: { type: 'simple', question: 'Den fiktive detektiven Sherlock Holmes bor i denne berømte gaten i London.', answer: 'Hva er Baker Street?' } },
        { points: 600, answered: false, content: { type: 'simple', question: 'Denne Disney-filmen handler om en jente med magisk hår som heter Rapunzel.', answer: 'Hva er Flukten fra tårnet?' } },
        { points: 800, answered: false, content: { type: 'simple', question: '«Til uendelig og langt forbi!» er slagordet til denne figuren fra Toy Story.', answer: 'Hvem er Buzz Lightyear?' } },
        { points: 1000, answered: false, content: { type: 'simple', question: 'Denne TV-serien er satt til det fiktive landet Westeros.', answer: 'Hva er Game of Thrones?' } },
      ],
    },
    {
      name: 'Geografi',
      tiles: [
        { points: 200, answered: false, content: { type: 'simple', question: 'Dette er verdens største land målt i landareal.', answer: 'Hva er Russland?' } },
        { points: 400, answered: false, content: { type: 'simple', question: 'Amazonas-elven renner gjennom dette landet.', answer: 'Hva er Brasil?' } },
        { points: 600, answered: false, content: { type: 'simple', question: 'Mount Everest ligger på grensen mellom Nepal og dette landet.', answer: 'Hva er Tibet/Kina?' } },
        { points: 800, answered: false, content: { type: 'simple', question: 'Dette er hovedstaden i Australia.', answer: 'Hva er Canberra?' } },
        { points: 1000, answered: false, content: { type: 'simple', question: 'Sahara-ørkenen strekker seg over omtrent dette antallet land.', answer: 'Hva er 11 land?' } },
      ],
    },
    {
      name: 'Sport',
      tiles: [
        { points: 200, answered: false, content: { type: 'simple', question: 'I basketball bestemmer denne linjen om et skudd er verdt 2 eller 3 poeng.', answer: 'Hva er trepoentslinjen?' } },
        { points: 400, answered: false, content: { type: 'simple', question: 'Dette landet har vunnet flest FIFA-verdensmesterskap.', answer: 'Hva er Brasil?' } },
        { points: 600, answered: false, content: { type: 'simple', question: 'En perfekt score i olympisk turn pleide å være dette tallet.', answer: 'Hva er 10?' } },
        { points: 800, answered: false, content: { type: 'simple', question: 'Tour de France-sykkelrittet foregår i denne måneden.', answer: 'Hva er juli?' } },
        { points: 1000, answered: false, content: {
          type: 'overUnder',
          statement: 'Over eller under 185 cm?',
          items: [
            { image: 'https://placehold.co/300x400/2d2d3a/f0f0f8?text=Messi', label: 'Lionel Messi', answer: 'under', value: '170 cm' },
            { image: 'https://placehold.co/300x400/2d2d3a/f0f0f8?text=LeBron', label: 'LeBron James', answer: 'over', value: '206 cm' },
            { image: 'https://placehold.co/300x400/2d2d3a/f0f0f8?text=Haaland', label: 'Erling Haaland', answer: 'over', value: '194 cm' },
            { image: 'https://placehold.co/300x400/2d2d3a/f0f0f8?text=Simone', label: 'Simone Biles', answer: 'under', value: '142 cm' },
            { image: 'https://placehold.co/300x400/2d2d3a/f0f0f8?text=Bolt', label: 'Usain Bolt', answer: 'over', value: '195 cm' },
          ],
        } },
      ],
    },
  ],
}

export default sampleGame
