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
      { tile: '#8b3a00', hover: '#b34d00', header: '#5c2600' }, // mørk oransje
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
            question: 'Hvilken juice er i drinken Screwdriver?',
            answer: 'Appelsinjuice',
          },
        },
        {
          points: 400,
          answered: false,
          content: {
            type: 'simple',
            question: 'Hvor mange stjerner er det på det kinesiske flagget?',
            answer: '5',
          },
        },
        {
          points: 600,
          answered: false,
          content: {
            type: 'simple',
            question: 'Hvilken film med kinopremiere i sommer har sponset Haaland?',
            answer: 'The Odyssey',
          },
        },
        {
          points: 800,
          answered: false,
          content: {
            type: 'simple',
            question: 'Hva er forskjellen mellom Brandy og Cognac?',
            answer: 'Cognac må komme fra Cognac i Frankrike',
          },
        },
        {
          points: 1000,
          answered: false,
          content: {
            type: 'simple',
            question: 'Hva heter det hvis du får tre strikes på rad i bowling?',
            answer: 'Turkey',
          },
        },
      ],
    },
        {
      name: 'Higher / Lower',
      tiles: [
        {
          points: 500,
          answered: false,
          content: {
            type: 'higherLower',
            metric: 'VM-mål',
            items: [
              { image: '/question-images/higher-lower/neymar.png', label: 'Neymar', value: '8 mål', numericValue: 8 },
              { image: '/question-images/over_under/david villa.png', label: 'David Villa', value: '9 mål', numericValue: 9 },
              { image: '/question-images/over_under/suarez.png', label: 'Luis Suárez', value: '7 mål', numericValue: 7 },
              { image: '/question-images/over_under/henry.png', label: 'Thierry Henry', value: '6 mål', numericValue: 6 },
              { image: '/question-images/over_under/kane.png', label: 'Harry Kane', value: '10 mål', numericValue: 10 },
              { image: '/question-images/over_under/zidane.png', label: 'Zinedine Zidane', value: '5 mål', numericValue: 5 },
            ],
          },
        },
        {
          points: 500,
          answered: false,
          content: {
            type: 'higherLower',
            metric: 'Filmbudsjett',
            items: [
              { image: '/question-images/higher-lower/titanic.png', label: 'Titanic (1997)', value: '200 mill $', numericValue: 200 },
              { image: '/question-images/over_under/avatar.png', label: 'Avatar', value: '237 mill $', numericValue: 237 },
              { image: '/question-images/over_under/endgame.png', label: 'Avengers: Endgame', value: '356 mill $', numericValue: 356 },
              { image: '/question-images/over_under/interstellar.png', label: 'Interstellar', value: '165 mill $', numericValue: 165 },
              { image: '/question-images/over_under/dark_knight.png', label: 'The Dark Knight', value: '185 mill $', numericValue: 185 },
              { image: '/question-images/over_under/pirates.png', label: 'Pirates of the Caribbean: On Stranger Tides', value: '379 mill $', numericValue: 379 },
            ],
          },
        },
        {
          points: 500,
          answered: false,
          content: {
            type: 'higherLower',
            metric: 'Airbnb-pris per natt',
            items: [
              { image: '/question-images/higher-lower/stowe.png', label: 'Home in Stowe, Vermont', value: '$5 608', numericValue: 5608 },
              { image: '/question-images/higher-lower/mexico.png', label: 'Flat in Ensenada, Mexico', value: '$2 224', numericValue: 2224 },
              { image: '/question-images/higher-lower/italy.png', label: 'Villa in Avola, Italy', value: '$5 615', numericValue: 5615 },
              { image: '/question-images/higher-lower/joshua.png', label: 'Home in Joshua Tree, California', value: '$2 306', numericValue: 2306 },
              { image: '/question-images/higher-lower/geogria.png', label: 'Chalet in Mineral Bluff, Georgia', value: '$8 572', numericValue: 8572 },
              { image: '/question-images/higher-lower/alps.png', label: 'Chalet in Saint-Gervais-les-Bains, France', value: '$10 334', numericValue: 10334 },
            ],
          },
        },{
          points: 500,
          answered: false,
          content: {
            type: 'higherLower',
            metric: 'Airbnb-pris per natt',
            items: [
              { image: '/question-images/higher-lower/mexico.png', label: 'Flat in Ensenada, Mexico', value: '$2 224', numericValue: 2224 },
              { image: '/question-images/higher-lower/joshua.png', label: 'Home in Joshua Tree, California', value: '$2 306', numericValue: 2306 },
              { image: '/question-images/higher-lower/stowe.png', label: 'Home in Stowe, Vermont', value: '$5 608', numericValue: 5608 },
              { image: '/question-images/higher-lower/italy.png', label: 'Villa in Avola, Italy', value: '$5 615', numericValue: 5615 },
              { image: '/question-images/higher-lower/geogria.png', label: 'Chalet in Mineral Bluff, Georgia', value: '$8 572', numericValue: 8572 },
              { image: '/question-images/higher-lower/alps.png', label: 'Chalet in Saint-Gervais-les-Bains, France', value: '$10 334', numericValue: 10334 },
            ],
          },
        },
        {
          points: 500,
          answered: false,
          content: {
            type: 'higherLower',
            metric: 'Airbnb-pris per natt',
            items: [
              { image: '/question-images/higher-lower/mexico.png', label: 'Flat in Ensenada, Mexico', value: '$2 224', numericValue: 2224 },
              { image: '/question-images/higher-lower/italy.png', label: 'Villa in Avola, Italy', value: '$5 615', numericValue: 5615 },
              { image: '/question-images/higher-lower/joshua.png', label: 'Home in Joshua Tree, California', value: '$2 306', numericValue: 2306 },
              { image: '/question-images/higher-lower/stowe.png', label: 'Home in Stowe, Vermont', value: '$5 608', numericValue: 5608 },
              { image: '/question-images/higher-lower/geogria.png', label: 'Chalet in Mineral Bluff, Georgia', value: '$8 572', numericValue: 8572 },
              { image: '/question-images/higher-lower/alps.png', label: 'Chalet in Saint-Gervais-les-Bains, France', value: '$10 334', numericValue: 10334 },
            ],
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
            answer: 'Haaland, 4',
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
            question: 'Hvor mange kamper har Norge spilt i VM-historien?',
            answer: '10',
          },
        },
        {
          points: 800,
          answered: false,
          content: {
            type: 'simple',
            question: 'Hvor mange spillere har foreldre som har spilt i VM?',
            answer: '3 (Haaland, Sørloth, Thorstvedt)',
          },
        },
        {
          points: 1000,
          answered: false,
          content: {
            type: 'simple',
            question: 'Hva er snitthøyden til den norske VM-troppen, og hvilken plass gir det blant alle lagene?',
            answer: '186.7, 2. plass',
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
            question: 'Hva er det høyeste fjellet i Frankrike?',
            answer: 'Mont Blanc',
          },
        },
        {
          points: 400,
          answered: false,
          content: {
            type: 'multipleChoice',
            question: 'Hvor mange tidssoner er det i Frankrike?',
            options: ['1', '3', '9', '12'],
            correctIndex: 3,
          },
        },
        {
          points: 600,
          answered: false,
          content: {
            type: 'multipleChoice',
            question: 'Hva er TGV i Frankrike?',
            options: ['En markør for ost av høy kvalitet', 'En type lyntog', 'En LGBTQ lov', 'Et politisk parti'],
            correctIndex: 1,
          },
        },
        {
          points: 800,
          answered: false,
          content: {
            type: 'multipleChoice',
            question: 'Hvem av disse er ikke en kjent fransk maler?',
            options: ['Claude Monet', 'Paul Cezanne', 'Pierre-Auguste Renoir', 'Alexandre Dumas'],
            correctIndex: 3,
          },
        },
        {
          points: 1000,
          answered: false,
          content: {
            type: 'simple',
            question: 'Hvilket navn er ulovlig å gi til en gris i Frankrike?',
            answer: 'Napoleon',
          },
        },
      ],
    },
    {
      name: 'Top 10',
      tiles: [
        {
          points: 1000,
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
          points: 1000,
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
          points: 1000,
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
          points: 1000,
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
          points: 600,
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
          points: 600,
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
