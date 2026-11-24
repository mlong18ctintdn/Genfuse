import type { FeatureType, Lang } from './prompts';

type SlangEntry = {
  meaning: Record<Lang, string>;
  context: Record<Lang, string>;
  script: Record<Lang, string>;
};

const SLANG_DICTIONARY: Record<string, SlangEntry> = {
  slay: {
    meaning: {
      vi: 'Xuất sắc, đỉnh cao, làm gì cũng cuốn hút và đầy tự tin.',
      en: 'Doing something exceptionally well with confidence and style.',
      zh: '超级棒、表现惊艳、非常有自信和魅力。',
      es: 'Hacer algo espectacular, con mucha confianza y estilo.',
    },
    context: {
      vi: 'Gen Z dùng để khen ai đó ăn mặc đẹp, làm bài tốt hoặc xử lý tình huống cực ngầu.',
      en: 'Used to praise someone’s outfit, achievement, or bold confidence.',
      zh: '年轻人用来夸赞别人穿搭好看、表现出色或气场十足。',
      es: 'Se usa para elogiar cómo alguien se viste, actúa o triunfa.',
    },
    script: {
      vi: '“Hôm nay nhìn con slay quá nha! Cả nhà rất tự hào về sự tự tin của con.”',
      en: '"You totally slayed today! We are so proud of your confidence."',
      zh: '“你今天真是太酷太出彩了！全家人为你感到骄傲。”',
      es: '"¡Hoy estuviste increíble! Qué orgullo ver tu seguridad."',
    },
  },
  flex: {
    meaning: {
      vi: 'Khoe khéo thành tích, món đồ mới hoặc niềm vui một cách hài hước.',
      en: 'Playfully showing off an achievement, new item, or proud moment.',
      zh: '幽默地炫耀自己的小成就、新物品或开心事。',
      es: 'Presumir con humor un logro, algo nuevo o un momento de orgullo.',
    },
    context: {
      vi: 'Thường dùng vui vẻ khi đạt điểm cao, tự kiếm tiền mua quà hoặc khoe gia đình.',
      en: 'Used casually when celebrating good grades, hard-earned rewards, or family pride.',
      zh: '常用于考出好成绩、靠自己买到心仪物品或分享喜悦时。',
      es: 'Se usa al celebrar buenas notas, esfuerzo propio o alegrías familiares.',
    },
    script: {
      vi: '“Cho bố/mẹ flex ké niềm vui này của con với cả nhà nhé!”',
      en: '"Let us flex this awesome milestone with the whole family!"',
      zh: '“让爸妈也跟着向全家人炫耀一下你的小成就吧！”',
      es: '"¡Déjanos presumir este gran logro tuyo con toda la familia!"',
    },
  },
  'red flag': {
    meaning: {
      vi: 'Dấu hiệu cảnh báo nguy hiểm hoặc tính cách không tốt ở một người/tình huống.',
      en: 'A warning sign of unhealthy behavior, dishonesty, or danger.',
      zh: '危险信号，指某人或某段关系中不健康、不真诚的苗头。',
      es: 'Una señal de alerta sobre actitudes tóxicas, engaño o peligro.',
    },
    context: {
      vi: 'Giới trẻ dùng để nhắc nhở nhau tránh xa những người thiếu tôn trọng hoặc hành vi đáng ngờ.',
      en: 'Used to point out early warning signs in friendships, dating, or online scams.',
      zh: '年轻人用来提醒彼此远离不尊重人或可疑的人和事。',
      es: 'Se usa para advertir sobre señales tempranas de desconfianza o riesgo.',
    },
    script: {
      vi: '“Bố/mẹ mừng vì con biết nhận ra điều gì an toàn cho mình. Có gì cứ tâm sự nhé!”',
      en: '"I’m glad you trust your instincts about what feels safe. Always talk to us anytime!"',
      zh: '“很高兴你懂得保护自己、辨别是非，有什么事随时跟家里说！”',
      es: '"Nos alegra que sepas cuidar tu bienestar. Siempre puedes contarnos todo."',
    },
  },
  redflag: {
    meaning: {
      vi: 'Dấu hiệu cảnh báo nguy hiểm hoặc tính cách không tốt ở một người/tình huống.',
      en: 'A warning sign of unhealthy behavior, dishonesty, or danger.',
      zh: '危险信号，指某人或某段关系中不健康、不真诚的苗头。',
      es: 'Una señal de alerta sobre actitudes tóxicas, engaño o peligro.',
    },
    context: {
      vi: 'Giới trẻ dùng để nhắc nhở nhau tránh xa những người thiếu tôn trọng hoặc hành vi đáng ngờ.',
      en: 'Used to point out early warning signs in friendships, dating, or online scams.',
      zh: '年轻人用来提醒彼此远离不尊重人或可疑的人和事。',
      es: 'Se usa para advertir sobre señales tempranas de desconfianza o riesgo.',
    },
    script: {
      vi: '“Bố/mẹ mừng vì con biết nhận ra điều gì an toàn cho mình. Có gì cứ tâm sự nhé!”',
      en: '"I’m glad you trust your instincts about what feels safe. Always talk to us anytime!"',
      zh: '“很高兴你懂得保护自己、辨别是非，有什么事随时跟家里说！”',
      es: '"Nos alegra que sepas cuidar tu bienestar. Siempre puedes contarnos todo."',
    },
  },
  overthinking: {
    meaning: {
      vi: 'Suy nghĩ quá nhiều, lo âu thái quá về những chuyện chưa xảy ra.',
      en: 'Worrying excessively and analyzing every detail until feeling mentally exhausted.',
      zh: '想太多、过度焦虑，反复纠结还没发生的事情。',
      es: 'Pensar demasiado y preocuparse en exceso por cosas que aún no pasan.',
    },
    context: {
      vi: 'Dùng khi cảm thấy áp lực tinh thần, mất ngủ vì suy diễn nhiều tình huống.',
      en: 'Used when feeling stressed or losing sleep over imagined scenarios.',
      zh: '用于学业压力大、精神紧绷或因胡思乱想而睡不着的时候。',
      es: 'Se usa cuando hay estrés mental o insomnio por darle demasiadas vueltas a todo.',
    },
    script: {
      vi: '“Đừng overthinking một mình nữa nha, có chuyện gì cứ nói ra để cả nhà cùng gỡ.”',
      en: '"You don’t have to carry those thoughts alone—let’s talk it through together."',
      zh: '“别一个人胡思乱想啦，有什么心事说出来，全家人一起帮你分担。”',
      es: '"No cargues con tantas vueltas tú solo; hablemos y lo resolvemos juntos."',
    },
  },
  'chữa lành': {
    meaning: {
      vi: 'Nghỉ ngơi, thư giãn để xoa dịu căng thẳng và phục hồi tinh thần.',
      en: 'Taking peaceful time to rest, recharge, and soothe emotional stress.',
      zh: '治愈自己——通过休息、放松来缓解压力、恢复好心情。',
      es: 'Sanar y recargar energías descansando de la rutina y el estrés.',
    },
    context: {
      vi: 'Gen Z nói đi “chữa lành” khi muốn nghe nhạc, đi dạo, ăn ngon hoặc ở bên gia đình.',
      en: 'Used when stepping back from busy school/work life to enjoy nature, music, or family.',
      zh: '年轻人面对学习工作疲惫时，喜欢用听歌、散步或陪伴家人来“治愈”自己。',
      es: 'Se usa al buscar calma con música, paseos, buena comida o tiempo en familia.',
    },
    script: {
      vi: '“Cuối tuần này cả nhà mình cùng nấu bữa ngon để ‘chữa lành’ cho nhau nhé!”',
      en: '"Let’s have a cozy family dinner this weekend to recharge together!"',
      zh: '“这周末全家人一起吃顿好的，好好放松治愈一下吧！”',
      es: '"¡Este fin de semana hagamos una comida rica en familia para recargar energías!"',
    },
  },
  'vô tri': {
    meaning: {
      vi: 'Ngây ngô, hài hước một cách đáng yêu và không cần suy nghĩ phức tạp.',
      en: 'Silly, lighthearted, and effortlessly funny without needing deep meaning.',
      zh: '无厘头、呆萌又解压的轻松搞笑。',
      es: 'Algo gracioso, espontáneo y ligero que hace reír sin complicarse.',
    },
    context: {
      vi: 'Thường chỉ những video giải trí nhẹ nhàng hoặc biểu cảm ngơ ngác dễ thương.',
      en: 'Used for harmless, goofy memes or funny everyday moments that relieve stress.',
      zh: '常用来形容让人放松大笑的萌宠视频或呆萌表情。',
      es: 'Se usa para videos divertidos o momentos graciosos que quitan el estrés.',
    },
    script: {
      vi: '“Lâu lâu xem mấy clip vui nhộn thư giãn đầu óc cũng dễ thương mà!”',
      en: '"Sharing a silly laugh together is honestly the best stress relief!"',
      zh: '“偶尔看看这些轻松搞笑的小视频放松一下心情也挺好的！”',
      es: '"¡Reírse un rato con cosas sencillas es el mejor remedio para el estrés!"',
    },
  },
  lowkey: {
    meaning: {
      vi: 'Kín đáo, nhẹ nhàng, không phô trương nhưng thật lòng thích/muốn.',
      en: 'Quietly, subtly, or secretly feeling or enjoying something without making a big deal.',
      zh: '低调地、默默地、其实心里很喜欢但不想太张扬。',
      es: 'De forma discreta, tranquila o en secreto, sin llamar mucho la atención.',
    },
    context: {
      vi: 'Ví dụ: “Con lowkey thích món bà nấu nhất” nghĩa là rất thích nhưng nói nhẹ nhàng.',
      en: 'Example: "I lowkey love Grandma’s soup" means genuinely loving it in a chill way.',
      zh: '例如“我其实超爱奶奶做的汤”，表达一种含蓄又真诚的喜爱。',
      es: 'Por ejemplo: "Lowkey me encanta la comida de la abuela", dicho con cariño discreto.',
    },
    script: {
      vi: '“Bố/mẹ cũng lowkey rất thích nghe con kể chuyện mỗi ngày đó!”',
      en: '"We lowkey love hearing all about your day every evening!"',
      zh: '“其实爸妈每天也都很期待听你分享生活里的点点滴滴呢！”',
      es: '"¡A nosotros también nos encanta escucharte contar tu día con calma!"',
    },
  },
  ghost: {
    meaning: {
      vi: 'Bỗng dưng im lặng, biến mất không trả lời tin nhắn hay cuộc gọi.',
      en: 'Suddenly cutting off all communication and disappearing without explanation.',
      zh: '像幽灵一样突然消失、不回消息也不解释。',
      es: 'Desaparecer de repente y dejar de responder mensajes sin dar explicación.',
    },
    context: {
      vi: 'Dùng khi ai đó đột ngột ngừng nhắn tin làm người khác hụt hẫng hoặc lo lắng.',
      en: 'Used when a friend or acquaintance stops replying out of nowhere.',
      zh: '指朋友或熟人突然断联不回信息，让人感到失落或担心。',
      es: 'Se usa cuando alguien deja de contestar de la nada y genera incertidumbre.',
    },
    script: {
      vi: '“Nếu bạn bè làm con buồn vì im lặng, ở nhà luôn có gia đình lắng nghe con nhé.”',
      en: '"If someone goes quiet on you, remember your family is always right here for you."',
      zh: '“如果朋友突然不联系让你难过，别忘了家里永远有人愿意倾听你。”',
      es: '"Si alguien desaparece y te hace sentir mal, recuerda que tu familia siempre está aquí."',
    },
  },
  delulu: {
    meaning: {
      vi: 'Mơ mộng lạc quan quá mức một cách hài hước (viết tắt của delusional).',
      en: 'Playfully overly optimistic or daydreaming big dreams (short for delusional).',
      zh: '可爱又乐观的“小幻想”，指带着幽默感的自信梦想。',
      es: 'Soñar en grande con un optimismo exagerado y divertido.',
    },
    context: {
      vi: 'Gen Z hay đùa “hơi delulu một chút mới có động lực” khi đặt mục tiêu lớn.',
      en: 'Used humorously when manifesting big goals or having fun daydreams.',
      zh: '年轻人常开玩笑说“有点小幻想才有动力”，用来给自己打气。',
      es: 'Se usa en broma al imaginar metas grandes con mucha ilusión.',
    },
    script: {
      vi: '“Cứ mơ ước lớn lên con nhé, cả nhà luôn ủng hộ nỗ lực của con!”',
      en: '"Dream big—we’re always cheering for your hard work!"',
      zh: '“勇敢去追梦吧，全家人永远支持你的每一份努力！”',
      es: '"¡Sueña en grande, que toda la familia siempre apoya tu esfuerzo!"',
    },
  },
  rizz: {
    meaning: {
      vi: 'Sự duyên dáng, khéo ăn nói và sức hút tự nhiên khiến mọi người quý mến.',
      en: 'Natural charm, charisma, and smooth communication skills.',
      zh: '个人魅力、幽默感以及让人觉得舒服的沟通吸引力。',
      es: 'Carisma natural, simpatía y facilidad para caer bien al hablar.',
    },
    context: {
      vi: 'Khen ai đó nói chuyện có duyên, hài hước và dễ kết bạn.',
      en: 'Used to compliment someone’s charm, humor, or likable personality.',
      zh: '用来夸赞一个人说话有分寸、幽默风趣、很受欢迎。',
      es: 'Se usa para elogiar el carisma, el humor y la simpatía de alguien.',
    },
    script: {
      vi: '“Con nhà mình đúng là có rizz tự nhiên, nói chuyện ai cũng quý!”',
      en: '"You’ve got natural charm—everyone loves talking with you!"',
      zh: '“咱们家的孩子天生就有亲和力，说话大家都喜欢听！”',
      es: '"¡Tienes un carisma natural increíble, a todos les encanta hablar contigo!"',
    },
  },
  burnout: {
    meaning: {
      vi: 'Kiệt sức cả về thể chất lẫn tinh thần do học tập hoặc làm việc quá tải.',
      en: 'Physical and emotional exhaustion caused by prolonged stress or overwork.',
      zh: '身心俱疲、因长期学习或工作压力过大而产生的倦怠感。',
      es: 'Agotamiento físico y mental por exceso de estudio, trabajo o presión.',
    },
    context: {
      vi: 'Dấu hiệu cần nghỉ ngơi, ngủ đủ giấc và giảm bớt áp lực kỳ vọng.',
      en: 'A signal that it’s time to rest, sleep well, and take pressure off.',
      zh: '这是身体发出的信号，提醒我们需要好好休息、补充睡眠、放松心情。',
      es: 'Es una señal de que toca descansar, dormir bien y bajar el ritmo.',
    },
    script: {
      vi: '“Sức khỏe của con quan trọng hơn điểm số. Hôm nay nghỉ ngơi sớm đi con nhé!”',
      en: '"Your well-being matters way more than grades or tasks. Get some rest tonight!"',
      zh: '“你的身体健康比成绩和工作都重要，今晚早点休息吧！”',
      es: '"Tu salud vale mucho más que cualquier nota o tarea. ¡Descansa hoy!"',
    },
  },
  fomo: {
    meaning: {
      vi: 'Hội chứng sợ bỏ lỡ trào lưu, tin tức hoặc cuộc vui của bạn bè.',
      en: 'Fear Of Missing Out—feeling anxious when seeing others post exciting activities.',
      zh: '错失恐惧症——看到别人分享热闹动态时，担心自己落后或错过。',
      es: 'Miedo a perderse planes, tendencias o momentos que otros comparten en redes.',
    },
    context: {
      vi: 'Thường xảy ra khi lướt mạng xã hội quá nhiều và so sánh mình với người khác.',
      en: 'Happens when scrolling social media and comparing one’s life to highlight reels.',
      zh: '刷社交媒体看到别人光鲜动态时容易产生焦虑和攀比心理。',
      es: 'Pasa al ver redes sociales y compararse con lo que publican los demás.',
    },
    script: {
      vi: '“Mỗi người có nhịp đi riêng của mình, ở nhà luôn bình yên và trân trọng con nhất.”',
      en: '"Everyone moves at their own pace—you’re never missing out when you’re loved at home."',
      zh: '“每个人都有自己的节奏，不用和别人比，家里永远是最温暖的港湾。”',
      es: '"Cada quien va a su propio ritmo; en casa siempre tienes tu lugar especial."',
    },
  },
};

export function generateDemoReply(
  feature: FeatureType,
  userText: string,
  lang: Lang,
  displayName?: string | null,
): string {
  const defaultName: Record<Lang, string> = {
    vi: 'bạn',
    en: 'friend',
    zh: '家人',
    es: 'amigo/a',
  };
  const name = displayName?.trim() || defaultName[lang];
  const text = userText.toLowerCase().trim();

  // =========================================================================
  // 1. CẢNH BÁO LỪA ĐẢO (SCAM ALERT - LUÔN MIỄN PHÍ 100% CHO CẢ 4 NGÔN NGỮ)
  // =========================================================================
  if (feature === 'scam_check') {
    const highRiskKeywords = [
      // VI
      'otp', 'mật khẩu', 'chuyển khoản', 'trúng thưởng', 'khóa tài khoản', 'công an',
      'viện kiểm sát', 'tòa án', 'vneid', 'thuế', 'cấp cứu', 'nâng cấp sim', 'việc nhẹ lương cao',
      'hoa hồng', 'biên lai', 'stk', 'số tài khoản', 'mã xác nhận', 'bắt giam', 'lệnh bắt',
      // EN
      'password', 'suspended', 'verify', 'winner', 'prize', 'click here', 'police', 'tax',
      'bank', 'urgent', 'wire transfer', 'gift card', 'ssn', 'irs', 'customs', 'locked',
      // ZH
      '验证码', '密码', '转账', '中奖', '冻结', '公安', '法院', '检察院', '税务', '刷单',
      '兼职', '汇款', '安全账户', '点击链接', '退税', '海关', '异常',
      // ES
      'contraseña', 'transferencia', 'premio', 'bloqueada', 'policía', 'impuestos',
      'urgente', 'haz clic', 'banco', 'código', 'multa', 'aduana', 'estafa',
      // URLs
      'http', 'https', 'bit.ly', '.xyz', '.top', '.club', 'link',
    ];

    const mediumRiskKeywords = [
      // VI
      'khuyến mãi', 'giảm giá', 'tặng quà', 'miễn phí', 'đầu tư', 'lợi nhuận', 'kết bạn',
      'shipper', 'giao hàng', 'bưu kiện', 'tuyển dụng', 'cộng tác viên',
      // EN
      'promo', 'free gift', 'investment', 'profit', 'delivery', 'parcel', 'crypto', 'forex',
      // ZH
      '促销', '免费送', '投资', '高收益', '快递', '包裹', '加好友', '理财',
      // ES
      'promoción', 'regalo gratis', 'inversión', 'ganancias', 'paquete', 'entrega',
    ];

    const isHigh = highRiskKeywords.some((kw) => text.includes(kw));
    const isMedium = mediumRiskKeywords.some((kw) => text.includes(kw));

    const scamTemplates: Record<Lang, { high: string; medium: string; low: string }> = {
      vi: {
        high: `RISK: HIGH
WHY:
Tin nhắn này có dấu hiệu lừa đảo mức độ cao (yêu cầu mã OTP/mật khẩu, chứa đường link lạ, giả danh công an/thuế/ngân hàng hoặc thông báo trúng thưởng, khóa tài khoản khẩn cấp).

DO:
- Giữ bình tĩnh và dừng ngay mọi thao tác theo tin nhắn này.
- Gọi điện trực tiếp cho con cháu trong nhà hoặc gọi số tổng đài chính thức in mặt sau thẻ ngân hàng để kiểm tra.
- Chặn ngay số điện thoại hoặc tài khoản vừa gửi tin nhắn.

DONT:
- Tuyệt đối KHÔNG bấm vào bất kỳ đường link nào trong tin nhắn.
- KHÔNG đọc mã OTP, mật khẩu ngân hàng hay gửi ảnh CCCD cho bất kỳ ai.
- KHÔNG chuyển tiền để "xác minh" hay "nhận thưởng".`,
        medium: `RISK: MEDIUM
WHY:
Tin nhắn có nội dung mời chào giao hàng, tặng quà hoặc đầu tư lợi nhuận — đây là kịch bản kẻ gian hay dùng để dẫn dụ người dùng cung cấp thông tin cá nhân.

DO:
- Kiểm tra lại xem bạn có thực sự đặt đơn hàng hay đăng ký dịch vụ này không.
- Nhắn hỏi người thân trên GENFUSE trước khi phản hồi.

DONT:
- Không chuyển tiền đặt cọc hay phí nhận quà trước.
- Không cài đặt ứng dụng lạ ngoài App Store / CH Play.`,
        low: `RISK: LOW
WHY:
Tin nhắn chưa phát hiện từ khóa lừa đảo nguy hiểm (như đòi mã OTP, đe dọa pháp lý hay link độc hại). Tuy nhiên bạn vẫn nên cảnh giác nếu cuộc trò chuyện sau đó nhắc đến tiền bạc.

DO:
- Luôn xác minh danh tính người gửi trước khi trao đổi thông tin quan trọng.
- Chia sẻ với gia đình nếu thấy có dấu hiệu bất thường.

DONT:
- Không cung cấp mật khẩu, mã OTP hay thông tin tài khoản ngân hàng cho người lạ.`,
      },
      en: {
        high: `RISK: HIGH
WHY:
This message contains classic high-risk scam triggers (OTP/password requests, suspicious links, fake bank/police/tax threats, or urgent prize claims).

DO:
- Stay calm and stop interacting with the sender immediately.
- Call a family member or your bank’s official phone number on the back of your card to verify.
- Block and report the sender right away.

DONT:
- Do NOT click any links or download attachments from this message.
- Do NOT share OTP codes, PINs, passwords, or ID photos.
- Do NOT transfer money under urgency or fear.`,
        medium: `RISK: MEDIUM
WHY:
This message mentions promotions, parcel deliveries, or investment offers—common hooks used by scammers to gather personal details.

DO:
- Verify directly through the official shopping or courier app you actually used.
- Ask a family member on GENFUSE for a second opinion.

DONT:
- Never pay upfront "release fees" or "tax fees" for a prize or package.
- Do not install unknown apps outside official app stores.`,
        low: `RISK: LOW
WHY:
No obvious high-risk scam patterns (such as OTP theft, legal threats, or suspicious links) were detected, though you should remain cautious if money comes up later.

DO:
- Double-check who the sender is before sharing personal plans or details.
- Ask your family anytime a message feels unusual.

DONT:
- Never share one-time passcodes or banking credentials with anyone.`,
      },
      zh: {
        high: `RISK: HIGH
WHY:
该信息包含高风险诈骗特征（索要验证码/密码、陌生链接、冒充公检法/银行/税务威胁，或虚假中奖、账户冻结通知）。

DO:
- 保持冷静，立即停止与对方联系。
- 直接拨打家人电话，或拨打银行卡背面的官方客服电话核实。
- 立即拉黑并举报该号码或账号。

DONT:
- 绝对不要点击短信或聊天中的任何陌生链接。
- 绝对不要向任何人透露短信验证码、银行密码或身份证照片。
- 绝对不要向所谓的“安全账户”转账汇款。`,
        medium: `RISK: MEDIUM
WHY:
该信息涉及快递包裹、免费领奖或高收益投资，属于诈骗分子常用的引流话术。

DO:
- 通过官方购物平台或快递官网核实订单状态。
- 在 GENFUSE 上发给家人帮忙把关。

DONT:
- 不要提前支付任何“手续费”“保证金”或“税费”。
- 不要下载安装来源不明的手机软件。`,
        low: `RISK: LOW
WHY:
暂未检测到索要验证码、法律威胁或恶意链接等高危诈骗词汇，但如果后续涉及钱财仍需提高警惕。

DO:
- 涉及个人隐私或财务前，先核实对方真实身份。
- 如有任何疑问随时与家人沟通。

DONT:
- 切勿向陌生人泄露验证码或银行卡信息。`,
      },
      es: {
        high: `RISK: HIGH
WHY:
Este mensaje tiene señales claras de estafa de alto riesgo (solicitud de códigos OTP/contraseñas, enlaces sospechosos, amenazas falsas de bancos/policía o premios urgentes).

DO:
- Mantén la calma y deja de responder de inmediato.
- Llama directamente a un familiar o al número oficial que aparece detrás de tu tarjeta bancaria.
- Bloquea y reporta al remitente.

DONT:
- NO hagas clic en ningún enlace ni descargues archivos.
- NO compartas códigos SMS, contraseñas ni fotos de tu documento de identidad.
- NO envíes dinero bajo presión o miedo.`,
        medium: `RISK: MEDIUM
WHY:
El mensaje menciona entregas de paquetes, regalos o inversiones—ganchos frecuentes para obtener tus datos personales.

DO:
- Verifica directamente en la aplicación oficial donde hiciste tu compra.
- Consulta con tu familia en GENFUSE antes de responder.

DONT:
- No pagues tarifas adelantadas para liberar un supuesto paquete o premio.
- No instales aplicaciones fuera de las tiendas oficiales.`,
        low: `RISK: LOW
WHY:
No se detectaron patrones graves de estafa (como robo de códigos o enlaces maliciosos), aunque conviene mantener precaución si luego piden dinero.

DO:
- Confirma siempre la identidad del remitente antes de dar datos personales.
- Pregunta a tu familia si algo te genera dudas.

DONT:
- Nunca compartas claves bancarias ni códigos de verificación.`,
      },
    };

    if (isHigh) return scamTemplates[lang].high;
    if (isMedium) return scamTemplates[lang].medium;
    return scamTemplates[lang].low;
  }

  // =========================================================================
  // 2. TỪ ĐIỂN GEN Z (TRANSLATOR - HỖ TRỢ ĐỦ 4 NGÔN NGỮ)
  // =========================================================================
  if (feature === 'translator') {
    const matchedKey = Object.keys(SLANG_DICTIONARY).find((k) => text.includes(k));
    if (matchedKey) {
      const entry = SLANG_DICTIONARY[matchedKey];
      return `MEANING:\n${entry.meaning[lang]}\n\nCONTEXT:\n${entry.context[lang]}\n\nSCRIPT:\n${entry.script[lang]}`;
    }

    const fallbackTranslator: Record<Lang, string> = {
      vi: `MEANING:\n“${userText.trim()}” là cách diễn đạt trẻ trung, giàu cảm xúc của thế hệ Gen Z nhằm nhấn mạnh thái độ hoặc tâm trạng một cách hài hước, gần gũi.\n\nCONTEXT:\nGiới trẻ thường dùng cụm từ này khi trò chuyện với bạn bè để tạo không khí thoải mái, tự nhiên và bắt nhịp xu hướng mạng xã hội.\n\nSCRIPT:\n“Nghe từ ‘${userText.trim()}’ hay quá, con giải thích thêm cho bố/mẹ dùng cùng với nhé!”`,
      en: `MEANING:\n"${userText.trim()}" is an expressive Gen Z phrase used to emphasize mood, humor, or relatable energy.\n\nCONTEXT:\nYoung people use this casually in chats or social media to keep conversations playful and authentic.\n\nSCRIPT:\n"I love learning new phrases from you—tell me how you and your friends use '${userText.trim()}'!"`,
      zh: `MEANING:\n“${userText.trim()}”是年轻人常用的一种生动表达，用来幽默、接地气地强调当下的心情或态度。\n\nCONTEXT:\n年轻人在日常聊天和社交媒体上经常使用这类网络流行语，让交流显得更轻松有趣。\n\nSCRIPT:\n“‘${userText.trim()}’这个词很有意思呀，快给爸妈讲讲你们平时怎么用吧！”`,
      es: `MEANING:\n"${userText.trim()}" es una expresión juvenil que los jóvenes usan para enfatizar su estado de ánimo o actitud con humor.\n\nCONTEXT:\nSe usa de forma relajada en chats y redes sociales para hacer la conversación más cercana y divertida.\n\nSCRIPT:\n"¡Qué interesante suena '${userText.trim()}'! Cuéntame cómo la usan tú y tus amigos."`,
    };
    return fallbackTranslator[lang];
  }

  // =========================================================================
  // 3. TRỢ LÝ TÂM TÌNH GIA ĐÌNH (LOVING COMPANION - 8 CHỦ ĐỀ x 4 NGÔN NGỮ)
  // =========================================================================
  const topics = {
    emotion: [
      'buồn', 'mệt', 'áp lực', 'stress', 'chán', 'khóc', 'cô đơn', 'lo lắng', 'sợ', 'mất ngủ',
      'sad', 'tired', 'anxious', 'overwhelmed', 'lonely', 'cry', 'depressed', 'worried',
      '难过', '累', '压力', '焦虑', '孤独', '伤心', '失眠', '烦',
      'triste', 'cansado', 'estrés', 'ansioso', 'solo', 'llorar', 'preocupado',
    ],
    familyConflict: [
      'cãi', 'giận', 'hiểu lầm', 'mẹ', 'bố', 'ba', 'má', 'con', 'ông', 'bà', 'la mắng', 'không hiểu',
      'fight', 'argue', 'angry', 'mom', 'dad', 'parents', 'kid', 'grandma', 'grandpa', 'misunderstand',
      '吵架', '生气', '误会', '妈妈', '爸爸', '父母', '孩子', '奶奶', '爷爷', '代沟',
      'pelea', 'discutir', 'enojado', 'mamá', 'papá', 'padres', 'hijo', 'abuela', 'abuelo',
    ],
    health: [
      'thuốc', 'sức khỏe', 'huyết áp', 'đau', 'khám', 'bệnh', 'tập thể dục', 'ăn uống', 'uống nước',
      'medicine', 'health', 'blood pressure', 'pain', 'doctor', 'exercise', 'sleep', 'pill',
      '吃药', '健康', '血压', '疼', '医生', '锻炼', '身体', '体检',
      'medicina', 'salud', 'presión', 'dolor', 'médico', 'ejercicio', 'dormir',
    ],
    studyWork: [
      'học', 'thi', 'điểm', 'trường', 'bài tập', 'công việc', 'sếp', 'deadline', 'lương',
      'study', 'exam', 'school', 'homework', 'grade', 'work', 'job', 'boss',
      '学习', '考试', '成绩', '学校', '作业', '工作', '加班',
      'estudiar', 'examen', 'escuela', 'tarea', 'notas', 'trabajo',
    ],
    games: [
      'chơi', 'game', 'cờ', 'ô ăn quan', 'cá ngựa', 'đố chữ', 'vòng quay', 'giải trí', 'vui',
      'game', 'play', 'bored', 'fun', 'board game', 'quiz', 'wheel',
      '玩', '游戏', '下棋', '无聊', '娱乐', '开心',
      'jugar', 'juego', 'aburrido', 'divertido', 'ruleta',
    ],
    memory: [
      'kỷ niệm', 'cây ký ức', 'ảnh', 'ngày xưa', 'kể chuyện', 'lưu giữ', 'sinh nhật',
      'memory', 'tree', 'photo', 'story', 'birthday', 'remember', 'nostalgia',
      '回忆', '记忆树', '照片', '故事', '生日', '过去',
      'recuerdo', 'árbol', 'foto', 'historia', 'cumpleaños',
    ],
    greeting: [
      'xin chào', 'chào', 'hello', 'hi', 'hey', 'cảm ơn', 'thank', '你好', '您好', '谢谢', 'hola', 'gracias',
    ],
  };

  const has = (list: string[]) => list.some((kw) => text.includes(kw));

  // --- TIẾNG VIỆT ---
  if (lang === 'vi') {
    if (has(topics.emotion)) {
      return `Mình đang ở ngay đây lắng nghe ${name} nè. Khi mệt mỏi hay áp lực, ${name} cứ cho phép bản thân chậm lại một nhịp nhé — hít thở sâu, uống một ngụm nước ấm và đừng tự trách mình. ${name} có muốn kể rõ hơn điều gì đang làm mình nặng lòng không?`;
    }
    if (has(topics.familyConflict)) {
      return `Sự khác biệt suy nghĩ giữa ông bà, bố mẹ và con cháu là điều rất tự nhiên, ${name} ạ — vì thế hệ nào cũng thương nhau nhưng cách thể hiện lại khác nhau. Thay vì tranh luận lúc đang nóng, ${name} thử mở đầu bằng một câu nhẹ nhàng như: “Con/Mẹ chỉ muốn cả nhà hiểu nhau hơn thôi”. ${name} muốn mình gợi ý cách nói chuyện cho tình huống cụ thể này không?`;
    }
    if (has(topics.health)) {
      return `Sức khỏe của cả nhà luôn là điều quý giá nhất đó ${name}! Đừng quên dùng mục **Nhắc nhở chăm sóc** trên GENFUSE để đặt lịch uống thuốc, đo huyết áp hoặc tập thể dục nhẹ mỗi ngày để cả nhà cùng nhắc nhau nhé. Hôm nay ${name} thấy trong người thế nào rồi?`;
    }
    if (has(topics.studyWork)) {
      return `Cố gắng từng bước một là đã rất giỏi rồi ${name} ơi! Đừng ôm đồm hết mọi thứ cùng lúc — hãy chia nhỏ việc cần làm và nghỉ giải lao 5–10 phút sau mỗi giờ tập trung nhé. Xong việc nhớ tự thưởng cho mình một bữa ngon cùng gia đình nha!`;
    }
    if (has(topics.games)) {
      return `Nghe hào hứng quá ${name} ơi! Cả nhà mình vào ngay **Khu vui chơi số hóa** làm một ván **Ô Ăn Quan**, **Cờ Cá Ngựa** hoặc **Đố Chữ Gia Đình** đi — chơi chung vừa vui vừa gắn kết ba thế hệ cực kỳ luôn!`;
    }
    if (has(topics.memory)) {
      return `Những khoảnh khắc bình dị bên gia đình chính là món quà đẹp nhất theo thời gian đó ${name}! Bạn hãy vào **Cây Ký Ức** treo thêm một chiếc lá kỷ niệm kèm lời nhắn yêu thương để ông bà và con cháu cùng đọc lại bất cứ lúc nào nhé.`;
    }
    if (has(topics.greeting)) {
      return `Chào ${name}! Rất vui được đồng hành cùng ${name} hôm nay. ${name} đang muốn tâm sự chuyện gia đình, tra từ điển Gen Z, kiểm tra tin nhắn lạ hay tìm trò chơi vui cho cả nhà nào?`;
    }
    return `Cảm ơn ${name} đã chia sẻ với mình! Mình luôn sẵn sàng lắng nghe mọi câu chuyện của ${name} — từ cách trò chuyện thấu hiểu giữa các thế hệ, dịch tiếng lóng Gen Z cho đến những mẹo chăm sóc sức khỏe hằng ngày. ${name} muốn mình hỗ trợ điều gì cụ thể nhất?`;
  }

  // --- ENGLISH ---
  if (lang === 'en') {
    if (has(topics.emotion)) {
      return `I’m right here with you, ${name}. Take a slow, deep breath—it’s completely okay to pause and rest when things feel heavy. Want to tell me a little more about what’s been weighing on your mind?`;
    }
    if (has(topics.familyConflict)) {
      return `Generational gaps happen in every loving family, ${name}—most of the time everyone cares deeply, they just express it differently. A gentle opener like "I really want us to understand each other" can soften the moment. Want help phrasing what you’d like to say?`;
    }
    if (has(topics.health)) {
      return `Taking care of your health keeps the whole family strong, ${name}! You can set daily medication, blood pressure, or light exercise reminders in **Care Reminders** so everyone stays supported. How are you feeling today?`;
    }
    if (has(topics.studyWork)) {
      return `Taking things one step at a time is already a big win, ${name}! Break your tasks into small chunks, take a short stretch break every hour, and celebrate your progress with your family tonight.`;
    }
    if (has(topics.games)) {
      return `Sounds like the perfect time for family game night, ${name}! Jump into the **Digital Playground** to play **Ô Ăn Quan**, **Cờ Cá Ngựa**, or a quick **Family Word Game** together!`;
    }
    if (has(topics.memory)) {
      return `Everyday family moments become the brightest treasures over time, ${name}! Add a new leaf to the **Memory Tree** with a warm note so grandparents and kids can revisit it anytime.`;
    }
    if (has(topics.greeting)) {
      return `Hello ${name}! It’s wonderful to chat with you today. Would you like family conversation tips, Gen Z slang translations, scam protection, or a fun game to play together?`;
    }
    return `Thank you for sharing that with me, ${name}! I’m always here to help bridge conversations across generations, decode Gen Z expressions, or suggest warm ways to check in on loved ones. What would you like to explore next?`;
  }

  // --- 简体中文 (CHINESE) ---
  if (lang === 'zh') {
    if (has(topics.emotion)) {
      return `${name}，我一直在这里陪着你。感到累或压力大的时候，请允许自己先停下来深呼吸、喝口温水，不要责怪自己。愿意和我多聊聊最近让你烦心的事情吗？`;
    }
    if (has(topics.familyConflict)) {
      return `${name}，祖辈、父母和孩子之间有想法差异是很正常的——其实大家都很爱彼此，只是表达方式不同。试着用一句温和的话开场：“我只是希望我们一家人能更理解彼此。”需要我帮你一起想想怎么沟通吗？`;
    }
    if (has(topics.health)) {
      return `${name}，家人的健康永远是第一位！别忘了在 GENFUSE 的**健康提醒**里设置每天吃药、量血压或散步的小提醒，让全家人互相督促。你今天感觉怎么样？`;
    }
    if (has(topics.studyWork)) {
      return `${name}，一步一个脚印去努力就已经很棒了！把任务拆分成小目标，每专注一小时就起来活动五分钟，忙完记得和家人一起吃顿热乎饭放松一下。`;
    }
    if (has(topics.games)) {
      return `听起来太棒了，${name}！快叫上全家人一起进入**数字游乐场**，来一局**分石棋（Ô Ăn Quan）**、**飞行棋**或**家庭猜词**吧，三代人一起玩最开心了！`;
    }
    if (has(topics.memory)) {
      return `${name}，平凡日常里的陪伴才是最珍贵的回忆！快去**家庭记忆树**挂上一片新叶子，写下暖心的话，让爷爷奶奶和孩子们随时都能重温。`;
    }
    if (has(topics.greeting)) {
      return `你好呀，${name}！很高兴今天能陪伴你。你想聊聊家庭沟通、翻译年轻人流行语、检测可疑短信，还是找个全家人一起玩的小游戏呢？`;
    }
    return `谢谢你和我分享这些，${name}！无论是化解代沟、解读网络新词，还是日常健康关怀，我都会一直在你身边倾听和支持。你现在最想聊哪方面的话题呢？`;
  }

  // --- ESPAÑOL (SPANISH) ---
  if (has(topics.emotion)) {
    return `Aquí estoy contigo, ${name}. Respira profundo y date permiso para descansar un momento cuando sientas mucha carga. ¿Quieres contarme un poco más sobre lo que te tiene así?`;
  }
  if (has(topics.familyConflict)) {
    return `Las diferencias entre generaciones pasan en todas las familias que se quieren, ${name}; cada quien demuestra su cariño a su manera. Empezar con una frase suave como "Solo quiero que nos entendamos mejor" ayuda mucho. ¿Quieres que preparemos juntos qué decir?`;
  }
  if (has(topics.health)) {
    return `¡Cuidar la salud mantiene fuerte a toda la familia, ${name}! Puedes programar recordatorios diarios para medicinas, presión arterial o caminatas en **Recordatorios de Cuidado**. ¿Cómo te sientes hoy?`;
  }
  if (has(topics.studyWork)) {
    return `Ir paso a paso ya es un gran avance, ${name}. Divide tus pendientes en metas pequeñas, descansa unos minutos cada hora y luego comparte una buena comida en familia.`;
  }
  if (has(topics.games)) {
    return `¡Suena genial, ${name}! Entra al **Rincón de Juegos** y arma una partida de **Ô Ăn Quan**, **Parchís (Cờ Cá Ngựa)** o **Juego de Palabras** con toda la familia.`;
  }
  if (has(topics.memory)) {
    return `¡Los momentos sencillos en familia son el mejor tesoro, ${name}! Cuelga una nueva hoja en el **Árbol de Recuerdos** para que abuelos, padres e hijos la disfruten siempre.`;
  }
  if (has(topics.greeting)) {
    return `¡Hola, ${name}! Qué alegría conversar contigo hoy. ¿Quieres consejos para hablar en familia, traducir jerga juvenil, revisar un mensaje sospechoso o jugar un rato?`;
  }
  return `¡Gracias por compartirlo conmigo, ${name}! Siempre estoy aquí para ayudarte a conectar generaciones, entender expresiones nuevas o cuidar a quienes más quieres. ¿Sobre qué te gustaría conversar hoy?`;
}
