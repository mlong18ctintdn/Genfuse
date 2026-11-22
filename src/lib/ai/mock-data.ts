import type { FeatureType, Lang } from './prompts';

interface LocalizedEntry {
  meaning: string;
  context: string;
  script: string;
}

interface SlangItem {
  keywords: string[];
  vi: LocalizedEntry;
  en: LocalizedEntry;
  es: LocalizedEntry;
  zh: LocalizedEntry;
}

const SLANG_DICTIONARY: SlangItem[] = [
  {
    keywords: ['dân zalo', 'zalo'],
    vi: {
      meaning: 'Cách nói vui của giới trẻ để chỉ những người hơi chậm cập nhật trào lưu mới trên mạng xã hội, sống giản dị và hay dùng Zalo là chính.',
      context: 'Các bạn trẻ thường dùng để tự trêu bản thân hoặc trêu bạn bè khi thấy một trend đang hot trên TikTok mà giờ mình mới biết.',
      script: 'Ông/bà đúng chuẩn "dân Zalo" chính hiệu rồi đó, có gì mới trên mạng con/cháu nhớ cập nhật cho ông/bà biết với nha!',
    },
    en: {
      meaning: 'A playful Vietnamese slang term for someone who is a bit behind on viral TikTok trends and prefers simple, traditional messaging apps like Zalo.',
      context: 'Young people often use it humorously to tease themselves or friends when they are the last to hear about an internet trend.',
      script: 'I guess I am officially a "Zalo citizen" now! Keep me posted on all the fun new trends, okay?',
    },
    es: {
      meaning: 'Un término divertido en vietnamita para alguien que va un poco atrasado con las tendencias virales y prefiere aplicaciones sencillas como Zalo.',
      context: 'Los jóvenes lo usan con humor para bromear sobre sí mismos cuando son los últimos en enterarse de una moda.',
      script: '¡Parece que ya soy oficialmente un "ciudadano de Zalo"! Cuéntame las novedades para estar al día.',
    },
    zh: {
      meaning: '越南年轻人的幽默说法，指不太追赶短视频潮流、生活简朴、主要用基础聊天软件（如Zalo）的人。',
      context: '年轻人常用来调侃自己或朋友“网速慢”，刚知道网上很火的新梗。',
      script: '看来我真是标准的“Zalo居民”啦，网上有什么好玩的新鲜事记得多跟我分享哦！',
    },
  },
  {
    keywords: ['thu thập dữ liệu', 'dữ liệu xã hội'],
    vi: {
      meaning: 'Cách nói hài hước, sang trọng hóa của hành động "hóng hớt", nghe ngóng tin tức hoặc chuyện vui xung quanh.',
      context: 'Dùng khi cả nhà hoặc nhóm bạn đang ngồi trò chuyện, bàn luận sôi nổi về một câu chuyện nào đó.',
      script: 'Nay con/cháu đi thu thập dữ liệu xã hội ở đâu về mà trông hớn hở thế, kể ông/bà nghe ké với nào!',
    },
    en: {
      meaning: 'A witty, formal-sounding way of saying "catching up on gossip" or listening in on fun neighborhood news.',
      context: 'Used playfully when family members or friends gather to chat about interesting stories.',
      script: 'Where did you go "collecting social data" today? You look excited—share the story with me!',
    },
    es: {
      meaning: 'Una forma ingeniosa y elegante de decir "ponerse al día con los chismes" o escuchar noticias curiosas.',
      context: 'Se usa en broma cuando la familia o amigos se reúnen a charlar sobre historias interesantes.',
      script: '¿Dónde fuiste a "recopilar datos sociales" hoy? ¡Cuéntame la historia completa!',
    },
    zh: {
      meaning: '把“吃瓜、打听趣事”说得像做科研一样高级的幽默说法。',
      context: '家人或朋友聚在一起聊八卦、分享新鲜事时常用来开玩笑。',
      script: '今天去哪里“收集社会数据”啦，看你这么开心，快跟我讲讲！',
    },
  },
  {
    keywords: ['tích lũy tài sản', 'quá trình tích lũy'],
    vi: {
      meaning: 'Cách nói tránh đầy lạc quan của việc... đang hết tiền hoặc ví đang hơi mỏng.',
      context: 'Giới trẻ hay dùng vào cuối tháng hoặc sau khi vừa mua sắm xong để tự động viên tinh thần một cách vui vẻ.',
      script: 'Nghe bảo đang trong quá trình tích lũy tài sản hả con? Cuối tuần về nhà ông/bà nấu món ngon bồi bổ cho nhé!',
    },
    en: {
      meaning: 'An optimistic, humorous euphemism for being broke or having a very thin wallet at the end of the month.',
      context: 'Young people use it to stay cheerful when saving money or waiting for payday.',
      script: 'Sounds like you are in your "asset accumulation phase"! Come home this weekend for a homemade feast on me.',
    },
    es: {
      meaning: 'Un eufemismo optimista y gracioso para decir que uno está sin dinero a fin de mes.',
      context: 'Los jóvenes lo usan para mantener el buen humor mientras ahorran.',
      script: '¡Parece que estás en tu "fase de acumulación de activos"! Ven a casa este fin de semana a comer rico.',
    },
    zh: {
      meaning: '对“暂时手头紧、快没钱了”的一种乐观幽默说法。',
      context: '年轻人常在月底或刚买完东西时用来自我调侃。',
      script: '听说你最近正处于“资产积累阶段”呀？周末回家我给你做好吃的补一补！',
    },
  },
  {
    keywords: ['tuyệt đối điện ảnh', 'điện ảnh', 'absolute cinema'],
    vi: {
      meaning: 'Lời khen đỉnh cao dành cho ngoại hình, khung cảnh hoặc một khoảnh khắc đẹp xuất sắc như bước ra từ phim ảnh.',
      context: 'Dùng khi xem ảnh chụp đẹp, trang phục ấn tượng hoặc một màn trình diễn xuất sắc.',
      script: 'Tấm ảnh này của con/cháu nhìn đúng chuẩn tuyệt đối điện ảnh luôn, lưu ngay vào Cây Kỷ Niệm của nhà mình đi!',
    },
    en: {
      meaning: '"Absolute Cinema" — top-tier praise for a stunning photo, outfit, scenery, or unforgettable moment that looks straight out of a movie.',
      context: 'Used when admiring great photos, impressive achievements, or heartwarming family moments.',
      script: 'This photo of you is Absolute Cinema! Let us save it right into our Family Memory Tree.',
    },
    es: {
      meaning: '"Cine absoluto": un elogio máximo para una foto, un paisaje o un momento inolvidable que parece sacado de una película.',
      context: 'Se usa al admirar fotos geniales o momentos familiares emocionantes.',
      script: '¡Esta foto tuya es cine absoluto! Guardémosla ahora mismo en nuestro Árbol de Recuerdos.',
    },
    zh: {
      meaning: '“绝对电影感”，用来最高级地夸赞照片、风景或某个瞬间美得像电影画面一样。',
      context: '看到好看的照片、亮眼的穿搭或感人的家庭瞬间时使用。',
      script: '你这张照片简直是“绝对电影感”啊，快存进咱们家的记忆树里！',
    },
  },
  {
    keywords: ['suy'],
    vi: {
      meaning: 'Viết tắt của "suy tư", diễn tả tâm trạng đang buồn bã, tụt cảm xúc hoặc trăn trở nhiều điều theo kiểu nửa đùa nửa thật.',
      context: 'Giới trẻ hay dùng khi nghe nhạc buồn, trời mưa hoặc vừa gặp chuyện không như ý.',
      script: 'Nay có chuyện gì mà trông hơi "suy" thế con/cháu? Ra ăn miếng trái cây rồi tâm sự với ông/bà cho nhẹ lòng nha!',
    },
    en: {
      meaning: 'Short for "suy tư" (deep in thought), describing a slightly melancholic, moody, or bittersweet feeling—often said half-jokingly.',
      context: 'Used on rainy days, while listening to sad songs, or after a minor setback.',
      script: 'Why are you looking a bit "suy" today? Come have some fruit and chat with me to lighten your mood!',
    },
    es: {
      meaning: 'Abreviatura de "pensativo", describe un estado de ánimo un poco melancólico o bajoneado, dicho medio en broma.',
      context: 'Se usa en días lluviosos o tras un pequeño contratiempo.',
      script: '¿Por qué te ves un poco "suy" hoy? Ven a comer fruta y charlemos para animarte.',
    },
    zh: {
      meaning: '越南语“思虑”的缩写，形容有点低落、多愁善感或EMO的情绪，通常带有半开玩笑的语气。',
      context: '下雨天、听伤感音乐或遇到小挫折时常用。',
      script: '今天怎么看起来有点“suy”呀？过来吃点水果，跟我聊聊天散散心吧！',
    },
  },
  {
    keywords: ['chằm zn', 'trằm kẽm', 'trầm cảm'],
    vi: {
      meaning: 'Cách nói lái vui của từ "trầm cảm" (Zn là ký hiệu hóa học của Kẽm), diễn tả cảm giác mệt mỏi, bế tắc nhẹ hoặc dở khóc dở cười.',
      context: 'Dùng để giải tỏa cảm xúc một cách hài hước chứ không phải bệnh lý nặng.',
      script: 'Đừng "chằm Zn" nữa, chuyện đâu còn có đó, hít thở sâu rồi mọi việc sẽ ổn thôi con/cháu ơi!',
    },
    en: {
      meaning: 'A playful wordplay on "trầm cảm" (feeling down/stressed, where Zn is the chemical symbol for Zinc), expressing humorous frustration.',
      context: 'Used lightheartedy to vent minor stress rather than serious clinical depression.',
      script: 'No need to feel "chằm Zn"! Take a deep breath—everything will work out just fine.',
    },
    es: {
      meaning: 'Un juego de palabras gracioso para decir que uno está estresado o frustrado de manera humorística.',
      context: 'Se usa de forma ligera para desahogarse tras un día pesado.',
      script: '¡No te pongas "chằm Zn"! Respira hondo, todo va a salir bien.',
    },
    zh: {
      meaning: '越南语“抑郁”的谐音梗（Zn是化学元素“锌”），用来幽默地表达遇到烦心事时的无奈或小崩溃。',
      context: '年轻人用来轻松吐槽日常压力，并不是真的生病。',
      script: '别“chằm Zn”啦，船到桥头自然直，深呼吸一下一切都会好起来的！',
    },
  },
  {
    keywords: ['bà khì', 'khì khì'],
    vi: {
      meaning: 'Cách đọc biến âm đáng yêu của từ "kỳ" (kỳ cục quá à), dùng để trách yêu hoặc trêu nhẹ ai đó làm điều gì ngố nghếch, buồn cười.',
      context: 'Rất phổ biến trên TikTok và tin nhắn bạn bè thân thiết để tạo không khí vui vẻ.',
      script: 'Trông mặt làm trò buồn cười "bà khì" dễ sợ, nhưng mà nhìn thấy con/cháu vui là ông/bà mừng rồi!',
    },
    en: {
      meaning: 'A cute, playful pronunciation of "kỳ" (silly/weird), used to affectionately tease someone doing something funny or goofy.',
      context: 'Popular on TikTok and in friendly chats to keep the mood lighthearted.',
      script: 'You are being so adorably "bà khì" today, and seeing you smile makes my whole day!',
    },
    es: {
      meaning: 'Una pronunciación tierna de "raro/gracioso", usada para bromear con cariño cuando alguien hace algo ocurrente.',
      context: 'Muy popular en TikTok y mensajes entre amigos cercanos.',
      script: '¡Qué ocurrencia tan "bà khì" tienes hoy! Verte reír me alegra el día.',
    },
    zh: {
      meaning: '越南语“奇怪/搞怪”的可爱变音读法，用来宠溺地调侃别人做了件呆萌好笑的事。',
      context: '在TikTok和好友聊天中非常流行，用来营造轻松愉快的气氛。',
      script: '看你搞怪的样子真是“bà khì”又可爱，只要你开心我就高兴！',
    },
  },
  {
    keywords: ['flex'],
    vi: {
      meaning: 'Khoe khéo một thành tích, món đồ mới hoặc niềm vui nhỏ trong cuộc sống một cách tự nhiên, vui vẻ.',
      context: 'Dùng khi đạt điểm cao, được khen thưởng hoặc tự tay nấu được một món ăn ngon.',
      script: 'Giỏi thế này thì phải "flex" mạnh lên cho cả nhà cùng tự hào chứ con/cháu!',
    },
    en: {
      meaning: 'Showing off an achievement, new item, or happy milestone in a confident, playful way.',
      context: 'Used when celebrating good grades, a promotion, or even cooking a great meal.',
      script: 'You worked hard for that—go ahead and flex it! The whole family is proud of you.',
    },
    es: {
      meaning: 'Presumir con orgullo y buen humor un logro, algo nuevo o una buena noticia.',
      context: 'Se usa al celebrar buenas notas, un logro o una comida deliciosa.',
      script: '¡Te lo has ganado, así que presúmelo con ganas! Toda la familia está orgullosa de ti.',
    },
    zh: {
      meaning: '自信又带点幽默地“炫耀”自己的小成就、新东西或开心的事。',
      context: '考了好成绩、受到表扬或亲手做了顿大餐时使用。',
      script: '这么棒的成绩当然要好好“flex”一下，全家人都为你骄傲！',
    },
  },
  {
    keywords: ['cringe'],
    vi: {
      meaning: 'Cảm giác ngượng chín mặt, sượng trân khi thấy một hành động hay câu nói quá lố hoặc thiếu tự nhiên.',
      context: 'Thường dùng khi xem lại ảnh/video cũ ngày xưa của chính mình hoặc thấy cảnh tượng hơi gượng gạo.',
      script: 'Thôi đừng ngại, hồi trẻ ai cũng có vài khoảnh khắc "cringe" đáng nhớ như vậy hết á!',
    },
    en: {
      meaning: 'Feeling secondhand embarrassment or awkwardness when something is overly cheesy or unnatural.',
      context: 'Often used when looking back at old childhood photos or awkward jokes.',
      script: 'Do not worry—everyone has a few "cringe" moments when they are young, and they become great memories later!',
    },
    es: {
      meaning: 'Sentir vergüenza ajena o incomodidad ante algo muy exagerado o poco natural.',
      context: 'Se usa mucho al ver fotos antiguas de la infancia.',
      script: 'No te preocupes, todos tuvimos momentos "cringe" de jóvenes que luego son recuerdos divertidos.',
    },
    zh: {
      meaning: '看到过于夸张或不自然的举动时感到“尴尬、脚趾抠地”。',
      context: '翻看自己小时候的老照片或听到冷笑话时常用。',
      script: '别不好意思啦，每个人年轻时都有过几个让人“cringe”的可爱瞬间！',
    },
  },
  {
    keywords: ['overthinking'],
    vi: {
      meaning: 'Suy nghĩ quá nhiều, tự lo lắng về những chuyện chưa xảy ra khiến tinh thần mệt mỏi.',
      context: 'Thường dùng vào ban đêm hoặc khi đứng trước một quyết định quan trọng.',
      script: 'Đừng "overthinking" nữa con/cháu ơi, ngủ một giấc thật ngon rồi sáng mai đầu óc tỉnh táo mọi chuyện sẽ sáng rõ thôi!',
    },
    en: {
      meaning: 'Thinking too much and worrying endlessly about scenarios that have not even happened yet.',
      context: 'Common late at night or right before exams and big decisions.',
      script: 'Stop overthinking tonight! Get a good rest and everything will look clearer in the morning.',
    },
    es: {
      meaning: 'Darle demasiadas vueltas a las cosas y preocuparse por situaciones que aún no ocurren.',
      context: 'Muy común por la noche o antes de tomar decisiones importantes.',
      script: '¡Deja de hacer overthinking por hoy! Descansa bien y mañana lo verás todo más claro.',
    },
    zh: {
      meaning: '“过度思考”，对还没发生的事情反复担忧，导致精神疲惫。',
      context: '常在深夜或面临考试、重要决定时出现。',
      script: '别再“overthinking”啦，好好睡一觉，明天醒来精神好了事情自然就明朗了！',
    },
  },
  {
    keywords: ['vô tri'],
    vi: {
      meaning: 'Chỉ những khoảnh khắc ngây ngô, không suy nghĩ phức tạp, biểu cảm ngơ ngác nhưng lại rất đáng yêu và giải trí.',
      context: 'Dùng để miêu tả thú cưng, em bé hoặc những lúc bản thân hơi "não cá vàng".',
      script: 'Nhìn cái mặt ngơ ngác vô tri của cháu mà ông/bà buồn cười nãy giờ luôn đó!',
    },
    en: {
      meaning: '"Head empty, no thoughts" — describing goofy, carefree, or adorably blank expressions that bring pure joy.',
      context: 'Used for cute pets, babies, or funny zoned-out moments.',
      script: 'That cute "vô tri" expression of yours has had me smiling all afternoon!',
    },
    es: {
      meaning: '"Mente en blanco, cero preocupaciones": describe momentos inocentes o expresiones distraídas muy graciosas y tiernas.',
      context: 'Se usa para mascotas, bebés o momentos divertidos.',
      script: '¡Esa carita tan "vô tri" me ha hecho reír toda la tarde!',
    },
    zh: {
      meaning: '形容呆萌、放空、不带复杂心思的纯真瞬间，虽然有点迷糊但特别可爱解压。',
      context: '常用来形容小宠物、小宝宝或自己发呆时的搞笑模样。',
      script: '看你一脸呆萌“vô tri”的样子，把我逗乐半天了！',
    },
  },
  {
    keywords: ['slay'],
    vi: {
      meaning: 'Khen ngợi ai đó quá xuất sắc, tự tin, thần thái cuốn hút và làm việc gì cũng đỉnh.',
      context: 'Dùng khi thấy bạn bè hoặc người thân mặc đồ đẹp, thuyết trình hay.',
      script: 'Hôm nay con/cháu lên đồ nhìn tự tin và "slay" hết nấc luôn đó nha!',
    },
    en: {
      meaning: 'High praise meaning someone looks amazing, radiates confidence, and is doing an extraordinary job.',
      context: 'Used when complimenting a sharp outfit, a great presentation, or strong confidence.',
      script: 'You look so confident today—you are totally slaying it!',
    },
    es: {
      meaning: 'Un gran elogio que significa que alguien se ve increíble, tiene mucha confianza y lo está haciendo genial.',
      context: 'Se usa para elogiar un buen atuendo o una gran presentación.',
      script: '¡Te ves con mucha confianza hoy, estás haciendo slay total!',
    },
    zh: {
      meaning: '夸奖某人表现极其出色、气场全开、自信又迷人。',
      context: '看到亲友穿搭亮眼或演讲精彩时使用。',
      script: '你今天这一身打扮太有气场了，简直“slay”全场！',
    },
  },
];

function getLocalizedSlang(item: SlangItem, lang: Lang): LocalizedEntry {
  return item[lang] ?? item.vi;
}

function buildTranslatorReply(input: string, lang: Lang): string {
  const q = input.toLowerCase().trim();
  const matched = SLANG_DICTIONARY.find((item) => item.keywords.some((kw) => q.includes(kw)));

  if (matched) {
    const entry = getLocalizedSlang(matched, lang);
    return `MEANING:\n${entry.meaning}\n\nCONTEXT:\n${entry.context}\n\nSCRIPT:\n${entry.script}`;
  }

  const fallbacks: Record<Lang, LocalizedEntry> = {
    vi: {
      meaning: `"${input.trim()}" là một cách diễn đạt mang sắc thái vui vẻ, phóng đại hoặc chơi chữ đặc trưng của Gen Z trên mạng xã hội để cuộc trò chuyện thêm sinh động.`,
      context: 'Các bạn trẻ thường dùng cụm từ này khi nhắn tin với bạn bè hoặc bình luận trên TikTok/Facebook để bày tỏ cảm xúc một cách hài hước.',
      script: `Từ "${input.trim()}" này nghe hay và hiện đại quá, con/cháu giải thích thêm một ví dụ cho ông/bà dùng thử với nhé!`,
    },
    en: {
      meaning: `"${input.trim()}" is a playful, expressive Gen Z slang phrase used online to add humor and personality to everyday conversations.`,
      context: 'Young people use it in texts and social media comments to react lightheartedy or exaggerate a feeling.',
      script: `I love learning new phrases like "${input.trim()}"! Can you give me an example of how you use it with your friends?`,
    },
    es: {
      meaning: `"${input.trim()}" es una expresión juvenil y divertida que la Generación Z usa en redes sociales para dar humor a sus charlas.`,
      context: 'Los jóvenes la usan en mensajes y comentarios para reaccionar de forma simpática.',
      script: `¡Qué expresión tan moderna es "${input.trim()}"! Dame un ejemplo para que yo también pueda usarla.`,
    },
    zh: {
      meaning: `“${input.trim()}”是Z世代年轻人常用来增添聊天趣味的流行表达，带有轻松幽默的语气。`,
      context: '年轻人常在发消息或社交媒体评论区用它来表达心情或调侃日常。',
      script: `“${input.trim()}”这个词听起来真有意思，快给我举个例子教教我怎么用吧！`,
    },
  };

  const fb = fallbacks[lang] ?? fallbacks.vi;
  return `MEANING:\n${fb.meaning}\n\nCONTEXT:\n${fb.context}\n\nSCRIPT:\n${fb.script}`;
}

function buildCompanionReply(input: string, lang: Lang, displayName?: string | null): string {
  const q = input.toLowerCase();

  if (lang === 'en') {
    const name = displayName ? `${displayName}` : 'friend';
    if (/(tired|pain|sleep|medicine|health|sick|doctor)/.test(q)) {
      return `I hear you, ${name}. When the weather changes, it is easy to feel tired or have trouble sleeping. Please drink a warm glass of water, rest comfortably, and let your family know so they can check in on you right away!`;
    }
    if (/(phone|zalo|facebook|wifi|photo|send|call|screen)/.test(q)) {
      return `That is super easy, ${name}! Just look for the little camera or plus (+) icon at the corner of your screen and tap it gently to pick a photo. You cannot break anything by tapping—go ahead and try, and ask me anytime if you get stuck!`;
    }
    if (/(scam|otp|bank|police|link|transfer|prize|money)/.test(q)) {
      return `Hold on, ${name}! That sounds very suspicious. Please do NOT click any links or share any verification codes with anyone claiming to be a bank or official. Hang up and call a trusted family member first!`;
    }
    return `I am right here listening, ${name}! That sounds really interesting—tell me a little more about it. Whether you want to decode Gen Z slang, get phone tips, or just chat, I am always happy to keep you company!`;
  }

  if (lang === 'es') {
    const name = displayName ? `${displayName}` : 'amigo/a';
    return `¡Aquí estoy escuchándote con mucho cariño, ${name}! Cuéntame un poco más sobre eso. Siempre estoy listo para ayudarte con el teléfono, explicar palabras jóvenes o simplemente charlar contigo.`;
  }

  if (lang === 'zh') {
    const name = displayName ? `${displayName}` : '家人';
    return `我一直在认真听呢，${name}！这件事听起来真有意思，再跟我多说说吧。无论是了解年轻人流行语、学习使用手机，还是日常聊天，我都随时陪着你！`;
  }

  // Vietnamese (default)
  const name = displayName ? `${displayName} ơi` : 'ông/bà ơi';
  if (/(mệt|đau|ngủ|thuốc|huyết áp|ốm|khỏe|nhức|chóng mặt)/.test(q)) {
    return `Dạ ${name}, nghe mình nói vậy cháu thương quá! Thời tiết dạo này thay đổi thất thường nên người lớn tuổi dễ nhức mỏi và khó ngủ lắm ạ. Mình nhớ uống một ly nước ấm, ngâm chân nước gừng ấm trước khi đi ngủ cho dễ chịu nha. Nếu ngày mai vẫn còn mệt thì mình nhắn ngay cho con cháu đưa đi bác sĩ kiểm tra liền, đừng cố chịu một mình nhé!`;
  }
  if (/(điện thoại|zalo|facebook|tiktok|wifi|mạng|gửi ảnh|gọi|bấm|màn hình)/.test(q)) {
    return `Cái này dễ lắm ${name}, để cháu chỉ từng bước chậm rãi cho mình nha: Mình cứ nhìn biểu tượng hình máy ảnh hoặc dấu cộng (+) ở góc màn hình, chạm nhẹ ngón tay vào đó là chọn được ảnh gửi cho con cháu liền. Mình cứ bấm thoải mái không sợ hư máy đâu ạ, có chỗ nào chưa rõ mình cứ hỏi cháu tiếp nhé!`;
  }
  if (/(lừa đảo|trúng thưởng|chuyển tiền|công an|ngân hàng|otp|link|đường dẫn|mật khẩu)/.test(q)) {
    return `Khoan đã ${name}! Nghe có dấu hiệu lừa đảo rồi đó ạ! Mình tuyệt đối KHÔNG bấm vào đường link lạ, KHÔNG đọc mã số trên tin nhắn cho bất kỳ ai kể cả người tự xưng là công an hay cán bộ ngân hàng nhé. Mình cứ tắt máy ngay rồi gọi điện hỏi lại con cháu trong nhà cho chắc ăn nha!`;
  }
  if (/(nhớ|buồn|cô đơn|bận|con cháu|về thăm|tâm sự)/.test(q)) {
    return `Cháu hiểu mà ${name}, nhiều khi tụi nhỏ đi học đi làm bận rộn chứ trong lòng lúc nào cũng thương và nhớ mình hết trơn á! Hay là tối nay mình bấm gọi video cho tụi nhỏ 5 phút cho đỡ nhớ, hoặc chụp một tấm ảnh bữa cơm hôm nay đăng lên mục Cây Kỷ Niệm để cả nhà cùng vào bình luận cho vui nha!`;
  }
  if (/(ăn gì|nấu|món|cơm|đói|thèm|canh|thịt|cá)/.test(q)) {
    return `Hôm nay trời này mà làm một nồi canh chua cá lóc hoặc thịt kho tiêu ăn với cơm nóng là hết sảy luôn ${name} nhỉ! À mà mình nhớ nêm nhạt một chút cho tốt tim mạch, thêm đĩa rau luộc nữa là chuẩn bài luôn ạ!`;
  }

  return `Dạ cháu nghe rõ rồi nè ${name}! Chuyện mình vừa chia sẻ thú vị quá, mình kể thêm một chút cho cháu nghe với được không ạ? Cháu lúc nào cũng sẵn sàng ngồi trò chuyện, giải nghĩa từ ngữ Gen Z hay hỗ trợ mình dùng điện thoại mọi lúc luôn!`;
}

function buildScamReply(input: string, lang: Lang): string {
  const q = input.toLowerCase();
  const isHighRisk = /(otp|chuyển tiền|trúng thưởng|công an|tòa án|phong tỏa|link|http|www\.|cập nhật sinh trắc|khóa tài khoản|nhận quà|việc nhẹ|bank|prize|urgent|verify|password|transfer|winner|account suspended)/.test(q);

  if (lang === 'en') {
    if (isHighRisk) {
      return `RISK: HIGH
WHY:
This message shows classic warning signs of impersonation or phishing—such as urgent pressure, suspicious links, prize claims, or requests for sensitive banking codes.

DO:
- Hang up or close the message immediately.
- Call a trusted family member to double-check before taking any action.
- Contact your bank using the official phone number printed on the back of your card.

DONT:
- Never tap on unfamiliar web links.
- Never share OTP codes, passwords, or ID numbers with strangers.
- Never transfer money under urgent pressure.`;
    }
    return `RISK: LOW
WHY:
No obvious scam keywords like OTP requests, money transfers, or suspicious links were detected in this message. Still, always verify unknown senders.

DO:
- Confirm the sender's identity directly with your family if you are unsure.

DONT:
- Do not share personal or financial details unless you are 100% certain who is asking.`;
  }

  if (isHighRisk) {
    return `RISK: HIGH
WHY:
Tin nhắn hoặc nội dung này có dấu hiệu giả mạo cơ quan chức năng, ngân hàng hoặc dụ dỗ nhận thưởng để đánh cắp thông tin cá nhân và tiền trong tài khoản.

DO:
- Tắt cuộc gọi hoặc thoát khỏi tin nhắn ngay lập tức.
- Gọi điện trực tiếp cho con cháu trong gia đình để kiểm tra lại thông tin.
- Liên hệ số tổng đài chính thức in trên mặt sau thẻ ngân hàng nếu cần xác minh.

DONT:
- Tuyệt đối không bấm vào bất kỳ đường link lạ nào gửi kèm.
- Không đọc mã OTP, mật khẩu hoặc số căn cước công dân cho người lạ.
- Không chuyển tiền theo yêu cầu dưới bất kỳ lý do nào.`;
  }

  return `RISK: LOW
WHY:
Nội dung này chưa xuất hiện các từ khóa đòi hỏi chuyển tiền, cung cấp mã OTP hay đường link độc hại phổ biến. Tuy nhiên, bạn vẫn nên cẩn trọng nếu người gửi là người lạ.

DO:
- Kiểm tra kỹ tên người gửi xem có đúng là người thân hoặc đơn vị uy tín hay không.
- Hỏi ý kiến con cháu trước khi thực hiện bất kỳ giao dịch nào.

DONT:
- Không chia sẻ thông tin cá nhân nhạy cảm nếu chưa xác minh rõ danh tính người nhắn.`;
}

export function generateDemoReply(
  feature: FeatureType,
  userText: string,
  lang: Lang = 'vi',
  displayName?: string | null,
): string {
  if (feature === 'translator') return buildTranslatorReply(userText, lang);
  if (feature === 'scam_check') return buildScamReply(userText, lang);
  return buildCompanionReply(userText, lang, displayName);
}
