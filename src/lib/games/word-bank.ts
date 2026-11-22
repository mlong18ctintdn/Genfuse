/**
 * Puzzle bank for "Đố chữ gia đình". Answers stay on the server (word_secrets table);
 * clients only ever see the blanks and the clue. Written per language so every family
 * plays in its own.
 */
export type WordCategory = 'idiom' | 'genz' | 'family';
export type WordLang = 'vi' | 'en' | 'zh' | 'es';
export type Puzzle = { answer: string; clue: string };

export const WORD_CATEGORIES: WordCategory[] = ['idiom', 'genz', 'family'];

export const WORD_BANK: Record<WordLang, Record<WordCategory, Puzzle[]>> = {
  vi: {
    idiom: [
      { answer: 'đi một ngày đàng học một sàng khôn', clue: 'Đi đây đó nhiều thì hiểu biết rộng ra.' },
      { answer: 'ăn quả nhớ kẻ trồng cây', clue: 'Được hưởng thành quả thì phải biết ơn người đã làm ra nó.' },
      { answer: 'có công mài sắt có ngày nên kim', clue: 'Kiên trì làm mãi thì việc khó mấy cũng thành.' },
      { answer: 'lá lành đùm lá rách', clue: 'Người có điều kiện giúp đỡ người đang khó khăn.' },
      { answer: 'uống nước nhớ nguồn', clue: 'Không bao giờ quên cội nguồn và người đã giúp mình.' },
    ],
    genz: [
      { answer: 'chill', clue: 'Cảm giác thư giãn, thoải mái, không áp lực.' },
      { answer: 'flex', clue: 'Khoe khoang một món đồ hay thành tích nào đó.' },
      { answer: 'crush', clue: 'Người mà mình thầm thích nhưng chưa nói ra.' },
      { answer: 'gét gô', clue: 'Câu rủ nhau: "nào, đi thôi!" (phát âm theo tiếng Anh "let\'s go").' },
      { answer: 'xu cà na', clue: 'Nói chệch từ "xui", ý là gặp chuyện không may.' },
    ],
    family: [
      { answer: 'bánh chưng', clue: 'Món gói bằng lá dong, hình vuông, không thể thiếu ngày Tết.' },
      { answer: 'áo dài', clue: 'Trang phục truyền thống thướt tha của phụ nữ Việt Nam.' },
      { answer: 'nón lá', clue: 'Vật đội đầu che mưa nắng, làm từ lá cọ.' },
      { answer: 'mâm ngũ quả', clue: 'Năm loại trái cây bày trên bàn thờ ngày Tết.' },
      { answer: 'bà ngoại', clue: 'Mẹ của mẹ mình.' },
    ],
  },
  en: {
    idiom: [
      { answer: 'break the ice', clue: 'Start a conversation when people feel shy or awkward.' },
      { answer: 'piece of cake', clue: 'Something that is very easy to do.' },
      { answer: 'once in a blue moon', clue: 'Something that happens very rarely.' },
      { answer: 'spill the beans', clue: 'Accidentally tell a secret.' },
      { answer: 'under the weather', clue: 'Feeling a little sick.' },
    ],
    genz: [
      { answer: 'no cap', clue: 'Slang for "I am not lying, this is true".' },
      { answer: 'slay', clue: 'To do something really, really well.' },
      { answer: 'rizz', clue: 'Short for charisma: the charm to attract someone.' },
      { answer: 'bet', clue: 'A short way to say "okay, deal".' },
      { answer: 'glow up', clue: 'A big positive change in looks or confidence.' },
    ],
    family: [
      { answer: 'apple pie', clue: 'A warm dessert grandmas bake, often with cinnamon.' },
      { answer: 'family photo', clue: 'Everyone squeezes together to take this picture.' },
      { answer: 'grandma', clue: 'Your mother\'s or father\'s mother.' },
      { answer: 'birthday cake', clue: 'You blow out the candles on it and make a wish.' },
      { answer: 'bedtime story', clue: 'Read to children just before they fall asleep.' },
    ],
  },
  zh: {
    idiom: [
      { answer: '画蛇添足', clue: '做了多余的事，结果反而坏事。' },
      { answer: '守株待兔', clue: '不努力，只想靠运气得到好处。' },
      { answer: '亡羊补牢', clue: '出了问题以后赶快补救，还不算晚。' },
      { answer: '塞翁失马', clue: '一时的坏事，说不定会变成好事。' },
      { answer: '一帆风顺', clue: '像船顺风前进，形容事情非常顺利。' },
    ],
    genz: [
      { answer: '永远的神', clue: '网络用语（四个字，常缩写成 yyds），用来夸某人或某物太棒了。' },
      { answer: '绝绝子', clue: '年轻人用来夸某样东西好到极点。' },
      { answer: '破防', clue: '心理防线被突破，被感动或被气到情绪失控。' },
      { answer: '躺平', clue: '不再拼命竞争，选择简单安稳的生活。' },
      { answer: '内卷', clue: '大家都过度竞争，却没有真正的进步。' },
    ],
    family: [
      { answer: '饺子', clue: '过年全家一起包的、形状像元宝的食物。' },
      { answer: '红包', clue: '过年时长辈送给孩子的、装着钱的红色小袋子。' },
      { answer: '春节', clue: '中国最重要的传统节日，全家团聚。' },
      { answer: '团圆饭', clue: '除夕夜全家人围坐在一起吃的饭。' },
      { answer: '压岁钱', clue: '过年时长辈给晚辈的祝福钱。' },
    ],
  },
  es: {
    idiom: [
      { answer: 'más vale tarde que nunca', clue: 'Es mejor hacer algo con retraso que no hacerlo.' },
      { answer: 'a caballo regalado no le mires el diente', clue: 'No critiques un regalo que te han dado.' },
      { answer: 'al mal tiempo buena cara', clue: 'Ante los problemas, mantén una actitud positiva.' },
      { answer: 'ojos que no ven corazón que no siente', clue: 'Lo que no sabes no te hace sufrir.' },
      { answer: 'no hay mal que por bien no venga', clue: 'De algo malo puede salir algo bueno.' },
    ],
    genz: [
      { answer: 'cringe', clue: 'Algo que da vergüenza ajena.' },
      { answer: 'crush', clue: 'La persona que te gusta en secreto.' },
      { answer: 'mood', clue: 'Cuando algo refleja exactamente cómo te sientes.' },
      { answer: 'stalkear', clue: 'Mirar a escondidas las redes de alguien.' },
      { answer: 'random', clue: 'Algo inesperado o sin relación con nada.' },
    ],
    family: [
      { answer: 'abuela', clue: 'La madre de tu mamá o de tu papá.' },
      { answer: 'paella', clue: 'Plato de arroz español que se come en familia, a menudo con mariscos.' },
      { answer: 'tortilla de patatas', clue: 'Huevos y patatas cuajados en la sartén.' },
      { answer: 'nochebuena', clue: 'La cena familiar del 24 de diciembre.' },
      { answer: 'arroz con leche', clue: 'Postre dulce y cremoso con canela, como el de la abuela.' },
    ],
  },
};

/** Lower-case, no accents, only letters/digits: how a guess is compared with the answer. */
export function normalizeGuess(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export const isLetter = (ch: string) => /[\p{L}\p{N}]/u.test(ch);

/** The blanks shown to everybody: letters become "_", spaces and punctuation stay. */
export function maskAnswer(answer: string): string[] {
  return [...answer].map((ch) => (isLetter(ch) ? '_' : ch));
}
