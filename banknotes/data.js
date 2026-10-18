// Коллекция и тексты интерфейса на двух языках.
// back — оборот купюры; если его нет, на обороте повторяется лицо.

export const ITEMS = [
  {
    id: 'burundi',
    src: 'assets/objects/01.png',
    material: 'cotton',
    name: { ru: 'Бурунди', en: 'Burundi' },
    caption: { ru: '10 000 франков', en: '10.000 Francs' },
    issuer: { ru: 'Банк Республики Бурунди', en: 'Banque de la République du Burundi' },
  },
  {
    id: 'saint-lucia',
    src: 'assets/objects/02.png',
    material: 'cotton',
    name: { ru: 'Сент-Люсия', en: 'Saint Lucia' },
    caption: { ru: '5 долларов', en: '5 Dollars' },
    issuer: { ru: 'Barclays Bank (Dominion, Colonial and Overseas)', en: 'Barclays Bank (Dominion, Colonial and Overseas)' },
  },
  {
    id: 'barbados',
    src: 'assets/objects/03.png',
    material: 'polymer',
    name: { ru: 'Барбадос', en: 'Barbados' },
    caption: { ru: '100 долларов', en: '100 Dollars' },
    issuer: { ru: 'Центральный банк Барбадоса', en: 'Central Bank of Barbados' },
  },
  {
    id: 'hong-kong',
    src: 'assets/objects/04.png',
    material: 'cotton',
    name: { ru: 'Гонконг', en: 'Hong Kong' },
    caption: { ru: '10 гонконгских долларов', en: '10 Hong Kong Dollars' },
    issuer: { ru: 'Правительство САР Гонконг', en: 'Government of the Hong Kong (SAR)' },
  },
  {
    id: 'thailand',
    src: 'assets/objects/05.png',
    material: 'cotton',
    name: { ru: 'Таиланд', en: 'Thailand' },
    caption: { ru: '100 бат', en: '100 Baht' },
    issuer: { ru: 'Правительство Таиланда', en: 'Government of Thailand' },
  },
  {
    id: 'ukraine',
    src: 'assets/objects/06.png',
    back: 'assets/objects/06-back.png',
    material: 'cotton',
    name: { ru: 'Украина', en: 'Ukraine' },
    caption: { ru: '1 гривна', en: '1 Hryvnia' },
    issuer: { ru: 'Национальный банк Украины', en: 'National Bank of Ukraine' },
  },
];

export const UI = {
  ru: {
    modes: 'Вид коллекции',
    wheel: 'Колесо',
    grid: 'Сетка',
    language: 'Язык',
    close: 'Закрыть',
    prev: 'К предыдущей',
    next: 'К следующей',
    open: 'Открыть',
    issuer: 'Эмитент',
    flip: 'Потяните влево или вправо, чтобы перевернуть',
    placeholder: 'Здесь будет описание купюры.',
    collection: 'Коллекция',
  },
  en: {
    modes: 'Collection view',
    wheel: 'Wheel',
    grid: 'Grid',
    language: 'Language',
    close: 'Close',
    prev: 'Previous',
    next: 'Next',
    open: 'Open',
    issuer: 'Issuer',
    flip: 'Drag left or right to flip',
    placeholder: 'The description of this note will go here.',
    collection: 'Collection',
  },
};

export const LANGS = ['ru', 'en'];
