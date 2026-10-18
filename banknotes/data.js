// Коллекция и тексты интерфейса на двух языках.
// back — оборот купюры; если его нет, на обороте повторяется лицо.
// details — текст страницы купюры: заголовок, плашка с данными, разделы и источники.
// Если details нет, страница показывает название, номинал и эмитента.

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
    details: {
      ru: {
        title: '1 гривна (UAH) — Украина',
        facts: [
          ['Эмитент', 'Национальный банк Украины (НБУ)'],
          ['Материал', 'специальная банкнотная бумага'],
          ['Размер', '118 × 63 мм'],
          ['Образец', '2006'],
        ],
        summary: ['История в одном предложении', 'Владимир Великий на лицевой стороне и реконструкция укреплённого Киева на обороте связывают образ правителя с городом его эпохи.'],
        sections: [
          {
            title: 'Лицевая сторона — Владимир Великий',
            text: ['На банкноте изображён Владимир Великий — киевский князь конца X — начала XI века, при котором произошло крещение Руси. Его портрет соседствует с фигурами святых, государственным трезубцем и орнаментами, отсылающими к средневековому наследию. Жёлто-голубая палитра и крупная цифра «1» придают композиции узнаваемый национальный характер. Портрет — современный художественный образ исторического правителя, а не прижизненное изображение.'],
          },
          {
            title: 'Оборотная сторона — Град Владимира в Киеве',
            text: ['Главный сюжет оборота — Град Владимира, укреплённая часть древнего Киева, развивавшаяся при князе Владимире. Это не фотография сохранившегося города, а историческая реконструкция. Справа от городского пейзажа изображена декоративная композиция с военным снаряжением, крестом и мотивами искусства той эпохи. Вместе обе стороны превращают банкноту в небольшую иллюстрированную историю раннесредневекового Киева.'],
          },
          {
            title: 'Три детали дизайна',
            list: [
              ['Портрет как водяной знак', 'На светлом поле слева от основного портрета есть его повторение, видимое на просвет.'],
              ['Символ старинной гривны', 'Небольшие изображения на двух сторонах совмещаются при просмотре банкноты на свет; в них проявляется буква «У».'],
              ['Семицветная печать', 'На обороте использована специальная орловская офсетная печать, позволяющая получать точные стыки красок в защитных узорах.'],
            ],
          },
          {
            title: 'Создание дизайна и участники',
            people: [
              ['Национальный банк Украины', 'Эмитент, заказчик и орган, утвердивший выпуск банкноты данного образца. Образец 2006 года введён в обращение 22 мая 2006 года. Экземпляр 2011 года сохраняет дизайн этого образца; изменения касались года выпуска и подписи главы НБУ.'],
              ['Василий Лопата', 'Художник-график, соавтор первых эскизов гривны начала 1990-х годов; создавал портреты и пейзажи для первоначальной серии банкнот.'],
              ['Борис Максимов', 'Художник-дизайнер, соавтор первоначального оформления гривны, работавший над общей графической концепцией, орнаментами, цветами и шрифтами.'],
            ],
            text: [
              'Важно об авторстве: подтверждена роль Лопаты и Максимова в становлении визуальной системы гривны, но найденные источники не позволяют надёжно установить персональное авторство всех элементов именно редизайна 2006 года. В материалах об этом образце также упоминается коллектив художников НБУ. Отдельная дизайн-студия по аналогии с O Street для данной версии не подтверждена.',
              'Производство: Банкнотно-монетный двор Национального банка Украины — профильный национальный производственный комплекс. Авторство творческого дизайна и производство банкнот следует учитывать отдельно.',
            ],
          },
          {
            title: 'Исторический контекст',
            text: ['Первоначальные бумажные гривны появились после восстановления независимости Украины и начала денежной реформы 1990-х годов. В ранних версиях одногривневой банкноты Владимир Великий уже был главным персонажем, но на обороте изображались руины Херсонеса. В последующих вариантах сюжет заменили на Град Владимира в Киеве: акцент сместился к столице и её средневековой истории.'],
          },
        ],
        sources: {
          title: 'Источники и ссылки',
          groups: [
            {
              title: 'Официальные источники о банкноте',
              links: [
                ['https://www.otpbank.com.ua/pdf/privateclients/documents/exchange-banknote/bn11.pdf', 'Национальный банк Украины — техническое описание банкноты 1 гривна образца 2006 года (PDF, копия)', 'описание сюжетов, орнаментов и защитных элементов'],
                ['https://bank.gov.ua/admin_uploads/banknote/f48a06b1252f484c9d009d9758483a8a/Poster_1_2006.pdf', 'НБУ — официальный плакат с защитными признаками банкноты (PDF)', 'водяной знак, защитная нить, микротекст'],
                ['https://visnyk.bank.gov.ua/archive/2006/5.pdf', 'Вестник НБУ, май 2006 (PDF)', 'введение образца в обращение 22 мая 2006 года'],
                ['https://visnyk.bank.gov.ua/archive/2011/8.pdf', 'Вестник НБУ, август 2011 (PDF)', 'выпуск 2011 года без смены основного дизайна'],
                ['https://talan.bank.gov.ua/uploads/navchalni_materialy/210kh297-putivnik-istoriia-grivni-vulitsiami-kiieva.pdf?v=2', 'НБУ — путеводитель по истории гривны (PDF)', 'историческое объяснение Града Владимира'],
              ],
            },
            {
              title: 'Художники и история графического дизайна',
              links: [
                ['https://www.gallery.pl.ua/batko-ukra%D1%97nsko%D1%97-grivni.html', 'Полтавский художественный музей — «Батько української гривні»', 'роли Василия Лопаты и Бориса Максимова в первоначальном дизайне'],
                ['https://podrobnosti.ua/345056-utochnenie-avtorami-grivny-javljajutsja-boris-maksimov-i-vasilij-lopata.html', 'Podrobnosti — уточнение об авторах гривны (2006)', 'разделение функций дизайнеров'],
                ['https://myfinance.co.ua/spetsproekty/hryvnia/istoriia-banknoty-v-odnu-hryvniu-sto-tysiach-za-odnu-5785/', 'MyFinance — история одногривневой банкноты', 'сравнение версий оформления'],
              ],
            },
          ],
        },
      },
      en: {
        title: '1 Hryvnia (UAH) — Ukraine',
        facts: [
          ['Issuer', 'National Bank of Ukraine (NBU)'],
          ['Material', 'special banknote paper'],
          ['Size', '118 × 63 mm'],
          ['Design sample', '2006'],
        ],
        summary: ['History in one sentence', 'Volodymyr the Great on the front and a reconstruction of fortified Kyiv on the back connect the image of the ruler with the city of his era.'],
        sections: [
          {
            title: 'Front — Volodymyr the Great',
            text: ['The note shows Volodymyr the Great, Prince of Kyiv in the late 10th and early 11th centuries, under whom Rus was baptised. His portrait sits beside figures of saints, the state trident and ornaments that refer to the medieval heritage. The yellow and blue palette and the large “1” give the composition a recognisable national character. The portrait is a modern artistic image of a historical ruler, not a likeness made in his lifetime.'],
          },
          {
            title: 'Back — Volodymyr’s City in Kyiv',
            text: ['The main subject of the back is Volodymyr’s City, the fortified part of ancient Kyiv that grew under Prince Volodymyr. It is not a photograph of a surviving city but a historical reconstruction. To the right of the cityscape is a decorative composition with military equipment, a cross and motifs from the art of the period. Together the two sides turn the note into a small illustrated history of early medieval Kyiv.'],
          },
          {
            title: 'Three design details',
            list: [
              ['Portrait as a watermark', 'On the light field to the left of the main portrait there is a repeat of it, visible against the light.'],
              ['The old hryvnia symbol', 'Small images on the two sides line up when the note is held to the light, revealing the letter “У”.'],
              ['Seven-colour printing', 'The back uses special Orlov offset printing, which gives exact colour joins in the security patterns.'],
            ],
          },
          {
            title: 'Design and contributors',
            people: [
              ['National Bank of Ukraine', 'Issuer, client and the body that approved this design. The 2006 design entered circulation on 22 May 2006. The 2011 note keeps this design; only the year of issue and the governor’s signature changed.'],
              ['Vasyl Lopata', 'Graphic artist and co-author of the first hryvnia sketches in the early 1990s; drew portraits and landscapes for the original series.'],
              ['Borys Maksymov', 'Designer and co-author of the original hryvnia look, who worked on the overall graphic concept, ornaments, colours and lettering.'],
            ],
            text: [
              'A note on authorship: the role of Lopata and Maksymov in shaping the hryvnia’s visual system is confirmed, but the sources found do not reliably attribute every element of the 2006 redesign to individual artists. Materials about this design also mention a team of NBU artists. No separate design studio, like O Street, is confirmed for this version.',
              'Production: the Banknote Printing and Minting Works of the National Bank of Ukraine, the country’s dedicated production plant. Creative authorship and production should be considered separately.',
            ],
          },
          {
            title: 'Historical context',
            text: ['The first paper hryvnias appeared after Ukraine restored its independence and began the currency reform of the 1990s. Volodymyr the Great was already the main figure on early one-hryvnia notes, but their back showed the ruins of Chersonesus. Later versions replaced it with Volodymyr’s City in Kyiv, shifting the focus to the capital and its medieval history.'],
          },
        ],
        sources: {
          title: 'Sources and links',
          groups: [
            {
              title: 'Official sources on the note',
              links: [
                ['https://www.otpbank.com.ua/pdf/privateclients/documents/exchange-banknote/bn11.pdf', 'National Bank of Ukraine — technical description of the 1 hryvnia note, 2006 design (PDF, copy)', 'subjects, ornaments and security features'],
                ['https://bank.gov.ua/admin_uploads/banknote/f48a06b1252f484c9d009d9758483a8a/Poster_1_2006.pdf', 'NBU — official poster with the note’s security features (PDF)', 'watermark, security thread, microtext'],
                ['https://visnyk.bank.gov.ua/archive/2006/5.pdf', 'NBU Herald, May 2006 (PDF)', 'the design entering circulation on 22 May 2006'],
                ['https://visnyk.bank.gov.ua/archive/2011/8.pdf', 'NBU Herald, August 2011 (PDF)', 'the 2011 issue without a change of design'],
                ['https://talan.bank.gov.ua/uploads/navchalni_materialy/210kh297-putivnik-istoriia-grivni-vulitsiami-kiieva.pdf?v=2', 'NBU — guide to the history of the hryvnia (PDF)', 'historical background of Volodymyr’s City'],
              ],
            },
            {
              title: 'Artists and graphic design history',
              links: [
                ['https://www.gallery.pl.ua/batko-ukra%D1%97nsko%D1%97-grivni.html', 'Poltava Art Museum — “Father of the Ukrainian hryvnia”', 'the roles of Vasyl Lopata and Borys Maksymov in the original design'],
                ['https://podrobnosti.ua/345056-utochnenie-avtorami-grivny-javljajutsja-boris-maksimov-i-vasilij-lopata.html', 'Podrobnosti — clarification on the hryvnia’s authors (2006)', 'how the designers split the work'],
                ['https://myfinance.co.ua/spetsproekty/hryvnia/istoriia-banknoty-v-odnu-hryvniu-sto-tysiach-za-odnu-5785/', 'MyFinance — history of the one-hryvnia note', 'comparison of design versions'],
              ],
            },
          ],
        },
      },
    },
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
    denomination: 'Номинал',
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
    denomination: 'Denomination',
    flip: 'Drag left or right to flip',
    placeholder: 'The description of this note will go here.',
    collection: 'Collection',
  },
};

export const LANGS = ['ru', 'en'];
