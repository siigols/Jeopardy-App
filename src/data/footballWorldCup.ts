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
      name: 'Godt og blandet',
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
        {
      name: 'Over/under',
      tiles: [
        {
          points: 500,
          answered: false,
          content: {
            type: 'overUnder',
            statement: 'Neymar med 8 VM-mål',
            items: [
              {
                image: '/question-images/over_under/david villa.png',
                label: 'David Villa',
                value: '9',
                answer: 'over',
              },
              {
                image: '/question-images/over_under/suarez.png',
                label: 'Luis Suárez',
                value: '7',
                answer: 'under',
              },
              {
                image: '/question-images/over_under/henry.png',
                label: 'Thierry Henry',
                value: '6',
                answer: 'under',
              },
              {
                image: '/question-images/over_under/kane.png',
                label: 'Kane',
                value: '10',
                answer: 'over',
              },
              {
                image: '/question-images/over_under/zidane.png',
                label: 'Zinedine Zidane',
                value: '5',
                answer: 'under',
              },
            ],
          },
        },
        {
          points: 500,
          answered: false,
          content: {
            type: 'overUnder',
            statement: 'Titanic (1997) hadde et budsjett på ca. 200 millioner dollar',
            items: [
              {
                image: '/question-images/over_under/avatar.png',
                label: 'Avatar',
                value: '237 mill',
                answer: 'over',
              },
              {
                image: '/question-images/over_under/endgame.png',
                label: 'Avengers: Endgame',
                value: '356 mill',
                answer: 'over',
              },
              {
                image: '/question-images/over_under/interstellar.png',
                label: 'Interstellar',
                value: '165 mill',
                answer: 'under',
              },
              {
                image: '/question-images/over_under/dark_knight.png',
                label: 'The Dark Knight',
                value: '185 mill',
                answer: 'under',
              },
              {
                image: '/question-images/over_under/pirates.png',
                label: 'Pirates of the Caribbean: On Stranger Tides',
                value: '379 mill',
                answer: 'over',
              },
            ],
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
    {
      name: 'Norge i VM',
      tiles: [
        {
          points: 200,
          answered: false,
          content: {
            type: 'simple',
            question: 'Toppscorer for Norge i VM gjennom tidene?',
            answer: 'Haaland og Rekdal, 2',
          },
        },
        {
          points: 400,
          answered: false,
          content: {
            type: 'simple',
            question: 'Rekdal scorte på straffe, hvem scorte det andre målet mot Brasil?',
            answer: 'Tore André Flo',
          },
        },
        {
          points: 600,
          answered: false,
          content: {
            type: 'simple',
            question: 'Hva er kallenavnet til mangeårig norsk landslagstrener Egil Olsen?',
            answer: 'Drillo',
          },
        },
        {
          points: 800,
          answered: false,
          content: {
            type: 'simple',
            question: 'For hvilken engelske klubb spiller den norske superstjernen Erling Haaland?',
            answer: 'Manchester City',
          },
        },
        {
          points: 1000,
          answered: false,
          content: {
            type: 'simple',
            question: 'Hva heter Erling Haalands far, som selv spilte for det norske A-landslaget?',
            answer: 'Alf-Inge Haaland',
          },
        },
      ],
    },
    {
      name: 'Frankrike',
      tiles: [
        {
          points: 200,
          answered: false,
          content: {
            type: 'simple',
            question: 'I hvilket år vant Frankrike sitt første VM, som vertsnasjon?',
            answer: '1998',
          },
        },
        {
          points: 400,
          answered: false,
          content: {
            type: 'simple',
            question: 'Hvem scoret to hoder-mål i VM-finalen 1998 for Frankrike mot Brasil?',
            answer: 'Zinedine Zidane',
          },
        },
        {
          points: 600,
          answered: false,
          content: {
            type: 'simple',
            question: 'Hvem satte rekorden for flest mål i ett enkelt VM med 13 mål for Frankrike i 1958?',
            answer: 'Just Fontaine',
          },
        },
        {
          points: 800,
          answered: false,
          content: {
            type: 'simple',
            question: 'Hvem vant Gullstøvelen (toppscorer) i VM 2022 med 8 mål for Frankrike?',
            answer: 'Kylian Mbappé',
          },
        },
        {
          points: 1000,
          answered: false,
          content: {
            type: 'simple',
            question: 'Hvilken fransk landslagstrener ledet Frankrike til VM-gullet i 1998?',
            answer: 'Aimé Jacquet',
          },
        },
      ],
    },
    {
      name: 'Top 10',
      tiles: [
        {
          points: 200,
          answered: false,
          content: {
            type: 'tenable',
            prompt: 'Største ølmerker i Europa (liter)',
            items: [
              'Baltika (Russland)',
              'Heineken (Nederland)',
              'Stella Artois (Belgia)',
              'Carlsberg (Danmark)',
              'Guinness (Irland)',
              'Tuborg (Danmark)',
              'Efes (Tyrkia)',
              'Amstel (Nederland)',
              'Krombacher (Tyskland)',
              'Zubr (Polen)',
            ],
          },
        },
        {
          points: 400,
          answered: false,
          content: {
            type: 'tenable',
            prompt: 'Top 10 Instagram-følgere',
            items: [
              'Instagram (685.9M)',
              'Cristiano Ronaldo (667.9M)',
              'Leo Messi (509.6M)',
              'Selena Gomez (405.3M)',
              'Kylie Jenner (382.4M)',
              'Dwayne "The Rock" Johnson (382.3M)',
              'Ariana Grande (363.4M)',
              'Kim Kardashian (344.9M)',
              'Beyoncé (300.2M)',
              'Khloé Kardashian (292.7M)',
            ],
          },
        },
        {
          points: 600,
          answered: false,
          content: {
            type: 'tenable',
            prompt: 'Top 10 dødelige dyr (ikke insekter)',
            items: [
              'Slanger',
              'Hunder',
              'Snegler',
              'Skorpioner',
              'Ormer',
              'Krokodiller',
              'Elefanter',
              'Flodhester',
              'Løver',
              'Hjort',
            ],
          },
        },
        {
          points: 800,
          answered: false,
          content: {
            type: 'tenable',
            prompt: 'Mest produserte grønnsaker i Norge',
            items: [
              'Gulrot',
              'Kepaløk',
              'Agurk',
              'Hodekål (hvitkål og rødkål)',
              'Kålrot ',
              'Kinakål',
              'Brokkoli',
              'Purre',
              'Tomat',
              'Isbergsalat og andre salater',
            ],
          },
        },
        {
          points: 1000,
          answered: false,
          content: {
            type: 'tenable',
            prompt: 'Største land i verden etter areal (inkl. land og vann)',
            items: [
              'Russland (17.09M km²)',
              'Canada (9.98M km²)',
              'Kina (9.70M km²)',
              'USA (9.37M km²)',
              'Brasil (8.51M km²)',
              'Australia (7.69M km²)',
              'India (3.28M km²)',
              'Argentina (2.78M km²)',
              'Kasakhstan (2.72M km²)',
              'Algerie (2.38M km²)',
            ],
          },
        },
      ],
    },
    {
      name: 'Plasser bildet',
      tiles: [
        {
          points: 1000,
          answered: false,
          content: {
            type: 'yearCountryImage',
            prompt: 'Hvilket år og land?',
            image: '/question-images/year-country/frankrike_1969.png',
            year: '1969',
            country: 'Frankrike',
          },
        },
        {
          points: 1000,
          answered: false,
          content: {
            type: 'yearCountryImage',
            prompt: 'Hvilket år og land?',
            image: '/question-images/year-country/canada_1942.png',
            year: '1942',
            country: 'Canada',
          },
        },
        {
          points: 500,
          answered: false,
          content: {
            type: 'yearCountryImage',
            prompt: 'Hvilket år og land?',
            image: '/question-images/year-country/Australia_1932.png',
            year: '1932',
            country: 'Australia',
          },
        },
        {
          points: 1000,
          answered: false,
          content: {
            type: 'yearCountryImage',
            prompt: 'Hvilket år og land?',
            image: '/question-images/year-country/hongkong_1996.png',
            year: '1996',
            country: 'Hongkong',
          },
        },
        {
          points: 1000,
          answered: false,
          content: {
            type: 'yearCountryImage',
            prompt: 'Hvilket år og land?',
            image: '/question-images/year-country/portugal_1900.png',
            year: '1900',
            country: 'Portugal',
          },
        },
      ],
    },
  ],
}

export default footballWorldCup
