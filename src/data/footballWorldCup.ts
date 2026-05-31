import type { Game } from '../types/game'

const footballWorldCup: Game = {
  title: 'Fotball-VM: Norge vs Frankrike',
  description: 'Fotball-VM, norsk og fransk fotballhistorie',
  theme: {
    accent: '#f5c518',
    bg: '#155006',
    decorations: 'football',
    categoryColors: [
      { tile: '#1a5c2e', hover: '#226e38', header: '#0f3d1e' }, // gressplen grønn
      { tile: '#8f1c1c', hover: '#b52222', header: '#5c0f0f' }, // norsk rødt
      { tile: '#1a2a6c', hover: '#243899', header: '#111c4a' }, // fransk marineblå
      { tile: '#7a6200', hover: '#9a7c00', header: '#524200' }, // gull/trofé
      { tile: '#3d3530', hover: '#524845', header: '#282220' }, // nøytral skifer
    ],
  },
  tiebreaker: {
    type: 'simple',
    question: 'I hvilket minutt scoret Zinedine Zidane sitt berømte hodeskalle-mål i VM-finalen 2006?',
    answer: '7. minutt',
  },
  categories: [
    {
      name: 'VM-historikk',
      tiles: [
        {
          points: 200,
          answered: false,
          content: {
            type: 'simple',
            question: 'I hvilket land ble det aller første fotball-VM arrangert i 1930?',
            answer: 'Uruguay',
          },
        },
        {
          points: 400,
          answered: false,
          content: {
            type: 'simple',
            question: 'Hvilket land har vunnet flest VM-titler i fotball (5 ganger)?',
            answer: 'Brasil',
          },
        },
        {
          points: 600,
          answered: false,
          content: {
            type: 'simple',
            question: 'Hvem scoret det beryktede «Hånd til Gud»-målet i VM 1986?',
            answer: 'Diego Maradona',
          },
        },
        {
          points: 800,
          answered: false,
          content: {
            type: 'simple',
            question: 'Hvilket land vant VM-finalen i 2022 mot Frankrike etter straffesparkkonkurranse?',
            answer: 'Argentina',
          },
        },
        {
          points: 1000,
          answered: false,
          content: {
            type: 'simple',
            question: 'Hvem er VM-historiens toppscorer med 16 mål, og spilte for Tyskland?',
            answer: 'Miroslav Klose',
          },
        },
      ],
    },
  ],
}

export default footballWorldCup
