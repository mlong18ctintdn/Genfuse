import type { FeatureType } from './prompts';

interface SlangEntry {
  keywords: string[];
  meaning: string;
  context: string;
  script: string;
}

const SLANG_DICTIONARY: SlangEntry[] = [
  {
    keywords: ['dân zalo', 'zalo'],
    meaning: 'Cách nói vui của giới trẻ để chỉ những người hơi chậm cập nhật trào lưu mới trên mạng xã hội, sống giản dị và hay dùng Zalo là chính.',
    context: 'Các bạn trẻ thường dùng để tự trêu bản thân hoặc trêu bạn bè khi thấy một trend đang hot rần rần trên TikTok mà giờ mình mới biết.',
    script: 'Ông/bà đúng chuẩn "dân Zalo" chính hiệu rồi đó, có gì mới trên mạng con/cháu nhớ cập nhật cho ông/bà biết với nha!',
  },
  {
    keywords: ['thu thập dữ liệu', 'dữ liệu xã hội'],
    meaning: 'Cách nói hài hước, sang trọng hóa của hành động "hóng hớt", nghe ngóng tin tức hoặc chuyện vui xung quanh.',
    context: 'Dùng khi cả nhà hoặc nhóm bạn đang ngồi trò chuyện, bàn luận sôi nổi về một câu chuyện nào đó.',
    script: 'Nay con/cháu đi thu thập dữ liệu xã hội ở đâu về mà trông hớn hở thế, kể ông/bà nghe ké với nào!',
  },
  {
    keywords: ['tích lũy tài sản', 'quá trình tích lũy'],
    meaning: 'Cách nói tránh đầy lạc quan của việc... đang hết tiền hoặc ví đang hơi mỏng.',
    context: 'Giới trẻ hay dùng vào cuối tháng hoặc sau khi vừa mua sắm xong để tự động viên tinh thần một cách vui vẻ.',
    script: 'Nghe bảo đang trong quá trình tích lũy tài sản hả con? Cuối tuần về nhà ông/bà nấu món ngon bồi bổ cho nhé!',
  },
  {
    keywords: ['cảnh báo clip này có hát', 'clip này có hát'],
    meaning: 'Lời rào trước hài hước của người đăng video để báo hiệu giọng hát của mình không được hay lắm, mong mọi người nghe vui vẻ đừng chê.',
    context: 'Thường xuất hiện ở đầu các video karaoke hoặc hát ngẫu hứng trên TikTok, Facebook.',
    script: 'Hát vui là chính, tự tin lên con/cháu ơi, ông/bà nghe thấy dễ thương lắm rồi!',
  },
  {
    keywords: ['trùng sinh', 'chùa quét lá đa', 'quét lá đa'],
    meaning: 'Cách nói vui lấy cảm hứng từ truyện tiên hiệp, ý chỉ việc muốn làm nhiều việc thiện, sống hiền lành để tích phước và gặp nhiều may mắn.',
    context: 'Dùng khi ai đó muốn tu tâm dưỡng tính, bớt nóng giận hoặc cầu mong mọi chuyện suôn sẻ hơn.',
    script: 'Tâm hướng thiện thế là quý lắm, cứ sống vui vẻ, giúp đỡ mọi người xung quanh là phước tự tìm tới thôi con/cháu ạ!',
  },
  {
    keywords: ['không khớp với server', 'server gốc'],
    meaning: 'Cách nói dí dỏm theo ngôn ngữ công nghệ, ý chỉ lời nói hoặc thông tin vừa nghe có gì đó sai sai, chưa đúng sự thật.',
    context: 'Dùng để trêu nhẹ khi ai đó đang kể chuyện hơi quá lên hoặc nói đùa một điều vô lý.',
    script: 'Nghe câu này thấy dữ liệu hơi không khớp với server gốc rồi nha, khai thật với ông/bà đi nào!',
  },
  {
    keywords: ['miễn dịch với chuẩn mực', 'chuẩn mực xã hội'],
    meaning: 'Cách nói châm biếm nhẹ nhàng dành cho những hành động hơi kỳ quặc, khác người hoặc thiếu ý thức nơi công cộng.',
    context: 'Thường dùng để bình luận về những tình huống dở khóc dở cười ngoài đời hoặc trên mạng.',
    script: 'Chuyện này đúng là bó tay thật, mình cứ giữ nếp sống văn minh của nhà mình là tốt nhất con/cháu ha.',
  },
  {
    keywords: ['động lực thoái hóa', 'thoái hóa'],
    meaning: 'Cách nói vui của trạng thái lười biếng, chỉ muốn nằm nghỉ ngơi chứ không muốn làm việc hay học bài.',
    context: 'Hay dùng vào những ngày thời tiết mát mẻ hoặc sáng thứ Hai đầu tuần.',
    script: 'Hôm nay động lực hơi thoái hóa một chút cũng không sao, nghỉ ngơi nạp lại năng lượng rồi mai mình cố gắng tiếp nhé!',
  },
  {
    keywords: ['hey siri', 'tua về chủ nhật'],
    meaning: 'Lời than thở đáng yêu khi ngày nghỉ cuối tuần trôi qua quá nhanh, mong được quay ngược thời gian về Chủ nhật để nghỉ ngơi tiếp.',
    context: 'Rất phổ biến vào tối Chủ nhật hoặc sáng thứ Hai khi mọi người chuẩn bị đi học, đi làm.',
    script: 'Cố gắng làm việc vui vẻ nha con/cháu, thoáng cái lại đến Chủ nhật cả nhà mình quây quần rồi!',
  },
  {
    keywords: ['sản xuất theo lô', 'theo lô'],
    meaning: 'Chỉ những người hoặc đồ vật trông quá giống nhau về phong cách ăn mặc, kiểu tóc hay hành động.',
    context: 'Dùng để trêu vui khi thấy hội bạn thân mặc đồ y hệt nhau hoặc có chung sở thích.',
    script: 'Nhìn mấy đứa đứng cạnh nhau như sản xuất theo lô vậy, nhưng mà dễ thương và đồng điệu lắm!',
  },
  {
    keywords: ['tôn hoa sen', 'mong tôn hoa sen'],
    meaning: 'Cách nói chơi chữ hài hước của từ "tổn thương", dùng để than thở nhẹ nhàng khi gặp tình huống hơi khổ tâm hoặc trớ trêu.',
    context: 'Dùng trong các cuộc trò chuyện đùa vui với bạn bè để giảm bớt sự căng thẳng.',
    script: 'Thôi đừng buồn nữa, có chuyện gì kể ông/bà nghe để ông/bà xoa dịu nỗi niềm cho nào!',
  },
  {
    keywords: ['trùng sinh chắc luôn', 'chắc luôn'],
    meaning: 'Câu cảm thán khi thấy ai đó đoán trúng phóc suy nghĩ hoặc biết quá rõ chuyện của mình như thể đã trải qua rồi.',
    context: 'Dùng để khen ngợi sự tinh ý, nhạy bén của người đối diện.',
    script: 'Ông/bà sống từng này tuổi rồi nên nhìn phát là đoán trúng liền, không cần trùng sinh đâu nha!',
  },
  {
    keywords: ['tuyệt đối điện ảnh', 'điện ảnh', 'absolute cinema'],
    meaning: 'Lời khen đỉnh cao dành cho ngoại hình, khung cảnh hoặc một khoảnh khắc đẹp xuất sắc như bước ra từ phim ảnh.',
    context: 'Dùng khi xem ảnh chụp đẹp, trang phục ấn tượng hoặc một màn trình diễn xuất sắc.',
    script: 'Tấm ảnh này của con/cháu nhìn đúng chuẩn tuyệt đối điện ảnh luôn, lưu ngay vào Cây Kỷ Niệm của nhà mình đi!',
  },
  {
    keywords: ['tưởng ai cũng biết', 'chữ tar', 'tar'],
    meaning: 'Câu cảm thán ngạc nhiên pha chút hài hước khi bản thân nghĩ một điều gì đó rất hiển nhiên nhưng hóa ra nhiều người chưa biết.',
    context: 'Thường dùng cuối câu khi chia sẻ một mẹo vặt hoặc một thông tin thú vị.',
    script: 'Mỗi thế hệ biết một kiểu khác nhau mà, con/cháu chỉ cho ông/bà biết thêm là quý lắm rồi!',
  },
  {
    keywords: ['chắc cốp'],
    meaning: 'Chỉ sự chắc chắn tuyệt đối, tự tin 100%, đôi khi mang sắc thái trêu đùa khi ai đó tự tin hơi quá đà.',
    context: 'Dùng trước khi làm một việc gì đó hoặc khi khẳng định một dự đoán.',
    script: 'Nghe giọng điệu chắc cốp thế này là ông/bà yên tâm tin tưởng rồi đó!',
  },
  {
    keywords: ['suy'],
    meaning: 'Viết tắt của "suy tư", diễn tả tâm trạng đang buồn bã, tụt cảm xúc hoặc trăn trở nhiều điều theo kiểu nửa đùa nửa thật.',
    context: 'Giới trẻ hay dùng khi nghe nhạc buồn, trời mưa hoặc vừa gặp chuyện không như ý.',
    script: 'Nay có chuyện gì mà trông hơi "suy" thế con/cháu? Ra ăn miếng trái cây rồi tâm sự với ông/bà cho nhẹ lòng nha!',
  },
  {
    keywords: ['chằm zn', 'trằm kẽm', 'trầm cảm'],
    meaning: 'Cách nói lái vui của từ "trầm cảm" (Zn là ký hiệu hóa học của Kẽm), dùng để diễn tả cảm giác mệt mỏi, bế tắc nhẹ hoặc dở khóc dở cười trước một tình huống khó đỡ.',
    context: 'Dùng để giải tỏa cảm xúc một cách hài hước chứ không phải bệnh lý nặng.',
    script: 'Đừng "chằm Zn" nữa, chuyện đâu còn có đó, hít thở sâu rồi mọi việc sẽ ổn thôi con/cháu ơi!',
  },
  {
    keywords: ['cổ điển tôn trọng', 'cổ điển'],
    meaning: 'Cách khen ngợi tinh nghịch, hài hước dành cho những điều mang nét truyền thống, quen thuộc nhưng vẫn rất đáng nể.',
    context: 'Dùng trong các bình luận vui vẻ trên mạng xã hội.',
    script: 'Gừng càng già càng cay, nét đẹp cổ điển bao giờ cũng có giá trị riêng con/cháu nhỉ!',
  },
  {
    keywords: ['ôi tiêu rồi', 'rối em nhờ', 'phở lòng tái', 'đám cá tươi', 'thả thính'],
    meaning: 'Nghệ thuật nói lái "thả thính" đáng yêu của giới trẻ: "Ôi tiêu rồi" = Tôi yêu rồi, "Rối em nhờ" = Nhớ em rồi, "Phở lòng tái" = Phải lòng tớ, "Đám cá tươi" = Đám cưới ta.',
    context: 'Dùng để bày tỏ tình cảm một cách khéo léo, hài hước mà không bị ngại ngùng.',
    script: 'Giới trẻ bây giờ chơi chữ khéo thật đấy, nghe vừa buồn cười vừa dễ thương hết sức!',
  },
  {
    keywords: ['bà khì', 'khì khì'],
    meaning: 'Cách đọc biến âm đáng yêu của từ "kỳ" (kỳ cục quá à), dùng để trách yêu hoặc trêu nhẹ ai đó làm điều gì ngố nghếch, buồn cười.',
    context: 'Rất phổ biến trên TikTok và tin nhắn bạn bè thân thiết để tạo không khí vui vẻ.',
    script: 'Trông mặt làm trò buồn cười "bà khì" dễ sợ, nhưng mà nhìn thấy con/cháu vui là ông/bà mừng rồi!',
  },
  {
    keywords: ['vuýp', 'vip'],
    meaning: 'Cách phát âm kéo dài đầy hào hứng của từ VIP, dùng để khen ngợi một thứ gì đó quá xịn sò, đẳng cấp hoặc đúng ý.',
    context: 'Dùng khi khen trang phục đẹp, món ăn ngon hoặc một màn xử lý quá đỉnh.',
    script: 'Bữa cơm hôm nay cả nhà mình chuẩn bị nhìn "vuýp" quá chừng luôn!',
  },
  {
    keywords: ['sít rịt', 'secret', 'bốc trúng'],
    meaning: 'Bắt nguồn từ trào lưu mở hộp đồ chơi bí mật (blind box), chỉ việc bất ngờ gặp được một tình huống hiếm có hoặc may mắn ngoài dự đoán.',
    context: 'Dùng khi gặp chuyện bất ngờ thú vị trong cuộc sống hằng ngày.',
    script: 'Hôm nay cả nhà sum họp đông đủ thế này đúng là bốc trúng "sít rịt" niềm vui rồi!',
  },
  {
    keywords: ['pickleball', 'vượt mức'],
    meaning: 'Cụm từ hài hước chỉ hành động, lời nói hoặc sự ăn diện hơi lố, vượt quá mức bình thường một cách buồn cười.',
    context: 'Bắt nguồn từ trào lưu chơi môn thể thao Pickleball đang rất hot trong giới trẻ.',
    script: 'Hôm nay ăn diện đẹp vượt mức Pickleball luôn rồi đó nha, đi chơi nhớ chụp thật nhiều ảnh về cho ông/bà xem!',
  },
  {
    keywords: ['cơm nước gì chưa', 'người đẹp'],
    meaning: 'Câu chào hỏi mở đầu cuộc trò chuyện thay cho "Ăn cơm chưa?" truyền thống, tạo cảm giác thân mật, vui tươi và lễ phép pha chút hài hước.',
    context: 'Dùng khi nhắn tin hỏi thăm bạn bè hoặc người thân trong gia đình.',
    script: 'Ông/bà ăn cơm rồi nè người đẹp ơi, con/cháu nhớ ăn uống đúng bữa đừng bỏ bữa nhé!',
  },
  {
    keywords: ['đọc stk', 'số tài khoản'],
    meaning: 'Câu nói đùa vui vẻ khi được ai đó khen ngợi quá nhiều, ý bảo "khen hay quá, đọc số tài khoản để gửi tiền công khen nào".',
    context: 'Dùng để đáp lại những lời khen có cánh giữa bạn bè thân thiết.',
    script: 'Ông/bà khen thật lòng chứ không cần chuyển khoản đâu, chỉ cần con/cháu ngoan khỏe là ông/bà vui nhất rồi!',
  },
  {
    keywords: ['flex'],
    meaning: 'Khoe khéo một thành tích, món đồ mới hoặc niềm vui nhỏ trong cuộc sống một cách tự nhiên, vui vẻ.',
    context: 'Dùng khi đạt điểm cao, được khen thưởng hoặc tự tay nấu được một món ăn ngon.',
    script: 'Giỏi thế này thì phải "flex" mạnh lên cho cả nhà cùng tự hào chứ con/cháu!',
  },
  {
    keywords: ['overthinking'],
    meaning: 'Suy nghĩ quá nhiều, tự lo lắng về những chuyện chưa xảy ra khiến tinh thần mệt mỏi.',
    context: 'Thường dùng vào ban đêm hoặc khi đứng trước một quyết định quan trọng.',
    script: 'Đừng "overthinking" nữa con/cháu ơi, ngủ một giấc thật ngon rồi sáng mai đầu óc tỉnh táo mọi chuyện sẽ sáng rõ thôi!',
  },
  {
    keywords: ['vô tri'],
    meaning: 'Chỉ những khoảnh khắc ngây ngô, không suy nghĩ phức tạp, biểu cảm ngơ ngác nhưng lại rất đáng yêu và giải trí.',
    context: 'Dùng để miêu tả thú cưng, em bé hoặc những lúc bản thân hơi "não cá vàng".',
    script: 'Nhìn cái mặt ngơ ngác vô tri của cháu mà ông/bà buồn cười nãy giờ luôn đó!',
  },
  {
    keywords: ['slay'],
    meaning: 'Khen ngợi ai đó quá xuất sắc, tự tin, thần thái cuốn hút và làm việc gì cũng đỉnh.',
    context: 'Dùng khi thấy bạn bè hoặc người thân mặc đồ đẹp, thuyết trình hay.',
    script: 'Hôm nay con/cháu lên đồ nhìn tự tin và "slay" hết nấc luôn đó nha!',
  },
  {
    keywords: ['chữa lành'],
    meaning: 'Tìm cách nghỉ ngơi, thư giãn tâm hồn như nghe nhạc, trồng cây, đi dạo hoặc về thăm gia đình sau những ngày căng thẳng.',
    context: 'Rất phổ biến khi giới trẻ muốn cân bằng lại cảm xúc sau áp lực học tập, công việc.',
    script: 'Cuối tuần về nhà ăn cơm với ông/bà là liều thuốc "chữa lành" tốt nhất mà chẳng tốn đồng nào nè!',
  },
];

function buildTranslatorReply(input: string): string {
  const q = input.toLowerCase().trim();
  const matched = SLANG_DICTIONARY.find((item) =>
    item.keywords.some((kw) => q.includes(kw)),
  );

  if (matched) {
    return `MEANING:\n${matched.meaning}\n\nCONTEXT:\n${matched.context}\n\nSCRIPT:\n${matched.script}`;
  }

  return `MEANING:\n"${input.trim()}" là một cách diễn đạt mang sắc thái vui vẻ, phóng đại hoặc chơi chữ đặc trưng của Gen Z trên mạng xã hội để cuộc trò chuyện thêm phần sinh động.\n\nCONTEXT:\nCác bạn trẻ thường dùng cụm từ này khi nhắn tin với bạn bè hoặc bình luận trên TikTok/Facebook để bày tỏ cảm xúc một cách hài hước, nhẹ nhàng.\n\nSCRIPT:\nTừ "${input.trim()}" này nghe hay và hiện đại quá, con/cháu giải thích thêm một ví dụ cho ông/bà dùng thử với nhé!`;
}

function buildCompanionReply(input: string, displayName?: string | null): string {
  const q = input.toLowerCase();
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

function buildScamReply(input: string): string {
  const q = input.toLowerCase();
  const isHighRisk = /(otp|chuyển tiền|trúng thưởng|công an|tòa án|phong tỏa|link|http|www\.|cập nhật sinh trắc|khóa tài khoản|nhận quà|việc nhẹ)/.test(q);

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
  displayName?: string | null,
): string {
  if (feature === 'translator') return buildTranslatorReply(userText);
  if (feature === 'scam_check') return buildScamReply(userText);
  return buildCompanionReply(userText, displayName);
}
