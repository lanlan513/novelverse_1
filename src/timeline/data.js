// 文学史时间轴数据
// type: movement（文学运动）| author（作家生平）| work（小说出版）| society（社会事件）
// review: verified（已审核）| pending（待审核）| disputed（存疑）
// year 字段尽量使用精确数字；prec 取值：y（精确到年）、range（时间段）、decade（年代）、century（世纪）、circa（约）
// endYear 仅在 range / decade / century 时使用，表示条目在时间轴上横向覆盖的跨度。
// 数据集末尾混入了若干"导入文件原始记录"，其中含年份不规范、来源缺失、字段错误等情况，
// 由 normalize.js 的导入管线逐条校验，供导入容错与错误报告演示。

export const RAW_EVENTS = [
  // ---------- 先秦至唐 ----------
  { id: 'shijing', year: -600, prec: 'range', endYear: -500, type: 'work', title: '《诗经》成书', location: '黄河流域', summary: '中国最早的诗歌总集，收录西周初年至春秋中期的风、雅、颂三百余篇，奠定现实主义诗歌传统。', source: '《十三经注疏·毛诗正义》', sourceUrl: 'https://zh.wikipedia.org/wiki/诗经', review: 'verified' },
  { id: 'sao', year: -300, prec: 'circa', type: 'author', title: '屈原作《离骚》', location: '楚国 · 沅湘', summary: '屈原以楚地巫风与香草美人之喻写成自传性长诗《离骚》，开创楚辞浪漫主义传统。', source: '司马迁《史记·屈原贾生列传》', sourceUrl: 'https://zh.wikipedia.org/wiki/离骚', review: 'verified' },
  { id: 'shiji', year: -91, prec: 'circa', type: 'work', title: '《史记》成书', location: '长安', summary: '司马迁忍辱完成纪传体通史，五十二万余字，开创正史体例，被鲁迅誉为"史家之绝唱，无韵之离骚"。', source: '《汉书·司马迁传》', sourceUrl: 'https://zh.wikipedia.org/wiki/史记', review: 'verified' },
  { id: 'hanfu', year: -140, prec: 'range', endYear: -80, type: 'movement', title: '汉赋兴盛', location: '长安', summary: '枚乘《七发》、司马相如《子虚赋》《上林赋》等铺张扬厉，汉赋成为一代文学代表。', source: '班固《汉书·艺文志》', sourceUrl: 'https://zh.wikipedia.org/wiki/赋', review: 'verified' },
  { id: 'jianan', year: 196, prec: 'range', endYear: 232, type: 'movement', title: '建安文学', location: '邺城', summary: '三曹与建安七子诗作慷慨悲凉、梗概多气，"建安风骨"成为后世文学典范。', source: '刘勰《文心雕龙·时序》', sourceUrl: 'https://zh.wikipedia.org/wiki/建安文学', review: 'verified' },
  { id: 'tao-yuanming', year: 427, type: 'author', title: '陶渊明逝世', location: '浔阳柴桑', summary: '田园诗派开创者，写有《归去来兮辞》《桃花源记》《饮酒》等，于贫病中辞世。', source: '《宋书·隐逸传》', sourceUrl: 'https://zh.wikipedia.org/wiki/陶渊明', review: 'verified' },
  { id: 'wenxuan', year: 530, prec: 'circa', type: 'work', title: '《文选》编成', location: '南朝梁', summary: '萧统主持编选的诗文总集，选录先秦至梁代作品七百余篇，影响后世科举与文学教育千年。', source: '萧统《文选序》', sourceUrl: 'https://zh.wikipedia.org/wiki/文選', review: 'verified' },
  { id: 'li-bai', year: 701, type: 'author', title: '李白出生', location: '碎叶（一说蜀中）', summary: '"诗仙"李白出生，其生卒地与族属至今存在争议，此条标为存疑。', source: '李阳冰《草堂集序》', sourceUrl: 'https://zh.wikipedia.org/wiki/李白', review: 'disputed' },
  { id: 'dufu-death', year: 770, type: 'author', title: '杜甫逝世', location: '潭州至耒阳舟中', summary: '"诗圣"杜甫在漂泊湘江的小船上去世，留下诗史般记录安史之乱的一千四百余首诗。', source: '元稹《唐故工部员外郎杜君墓系铭》', sourceUrl: 'https://zh.wikipedia.org/wiki/杜甫', review: 'verified' },
  { id: 'guwen', year: 810, prec: 'range', endYear: 824, type: 'movement', title: '古文运动', location: '长安', summary: '韩愈、柳宗元倡导先秦两汉散文，反对骈俪浮靡，"文以载道"影响宋代散文。', source: '《旧唐书·韩愈传》', sourceUrl: 'https://zh.wikipedia.org/wiki/古文運動', review: 'verified' },
  { id: 'han-yu', year: 824, type: 'author', title: '韩愈逝世', location: '长安', summary: '唐宋八大家之首，古文运动领袖，因谏迎佛骨被贬潮州，谥文。', source: '皇甫湜《韩文公墓铭》', sourceUrl: 'https://zh.wikipedia.org/wiki/韩愈', review: 'verified' },
  { id: 'bai-juyi-changhen', year: 806, prec: 'circa', type: 'work', title: '《长恨歌》写成', location: '盩厔', summary: '白居易与陈鸿、王质夫同游仙游寺，话及玄宗杨妃旧事，作《长恨歌》，陈鸿作《长恨歌传》。', source: '陈鸿《长恨歌传》', sourceUrl: 'https://zh.wikipedia.org/wiki/长恨歌', review: 'verified' },

  // ---------- 宋元 ----------
  { id: 'song-ci', year: 960, prec: 'range', endYear: 1279, type: 'movement', title: '宋词的黄金时代', location: '汴京 · 临安', summary: '词从市井新声发展为一代文学，婉约豪放并峙，名家从柳永、苏轼到李清照、辛弃疾。', source: '唐圭璋《全宋词》', sourceUrl: 'https://zh.wikipedia.org/wiki/宋词', review: 'verified' },
  { id: 'su-shi', year: 1082, type: 'work', title: '苏轼作前后《赤壁赋》', location: '黄州', summary: '乌台诗案后谪居黄州的苏轼两游赤壁，写下《念奴娇·赤壁怀古》与前后《赤壁赋》。', source: '《东坡全集》', sourceUrl: 'https://zh.wikipedia.org/wiki/苏轼', review: 'verified' },
  { id: 'liqingzhao', year: 1084, prec: 'circa', type: 'author', title: '李清照出生', location: '齐州章丘', summary: '婉约词宗李清照出生，早年词风清丽，南渡后沉郁凄怆，著《漱玉词》《金石录后序》。', source: '《金石录后序》及今人年谱', sourceUrl: 'https://zh.wikipedia.org/wiki/李清照', review: 'verified' },
  { id: 'guanyuan-zaju', year: 1280, prec: 'range', endYear: 1320, type: 'movement', title: '元杂剧成熟', location: '大都', summary: '关汉卿、王实甫、马致远等创作《窦娥冤》《西厢记》等，元杂剧成为与唐诗宋词并称的一代文学。', source: '钟嗣成《录鬼簿》', sourceUrl: 'https://zh.wikipedia.org/wiki/元曲', review: 'verified' },
  { id: 'guan-hanqing', year: 1280, prec: 'circa', type: 'author', title: '关汉卿活跃于大都', location: '大都', summary: '"驱梨园领袖，总编修师首"，关汉卿作杂剧六十余种，生卒年不详，此条以约系年。', source: '《录鬼簿》卷上', sourceUrl: 'https://zh.wikipedia.org/wiki/关汉卿', review: 'pending' },
  { id: 'sanguo-yanyi', year: 1522, prec: 'range', endYear: 1566, type: 'work', title: '《三国志通俗演义》刊行', location: '明代书坊', summary: '罗贯中编撰的历史演义在嘉靖年间刊刻，成为中国第一部长篇章回体历史小说。', source: '嘉靖壬午本《三国志通俗演义》', sourceUrl: 'https://zh.wikipedia.org/wiki/三國演義', review: 'verified' },
  { id: 'shuihu', year: 1550, prec: 'circa', type: 'work', title: '《水浒传》成书流传', location: '明代', summary: '施耐庵（一说与罗贯中合作）写成的英雄传奇，以白话塑造一百单八将，是白话长篇小说成熟标志。', source: '高儒《百川书志》', sourceUrl: 'https://zh.wikipedia.org/wiki/水滸傳', review: 'pending' },
  { id: 'xiyouji', year: 1592, prec: 'circa', type: 'work', title: '《西游记》世德堂本刊行', location: '金陵', summary: '吴承恩撰写的神魔小说以玄奘取经为本，想象瑰奇，世德堂本是现存最早百回本。', source: '金陵世德堂本《新刻出像官板大字西游记》', sourceUrl: 'https://zh.wikipedia.org/wiki/西游记', review: 'verified' },

  // ---------- 清代与近代 ----------
  { id: 'jinpingmei', year: 1610, prec: 'circa', type: 'work', title: '《金瓶梅》抄本流传', location: '明代', summary: '署名兰陵笑笑生的世情小说以家庭生活写世态人情，被称为中国第一部独立创作的长篇世情小说。', source: '袁宏道《与董思白书》', sourceUrl: 'https://zh.wikipedia.org/wiki/金瓶梅', review: 'verified' },
  { id: 'liaozhai', year: 1740, prec: 'range', endYear: 1766, type: 'work', title: '《聊斋志异》成书刊刻', location: '山东淄川', summary: '蒲松龄以数十年写就狐鬼花妖短篇小说近五百篇，"写鬼写妖高人一等，刺贪刺虐入骨三分"。', source: '蒲立德《聊斋志异跋》', sourceUrl: 'https://zh.wikipedia.org/wiki/聊齋志異', review: 'verified' },
  { id: 'wu-jingzi', year: 1750, prec: 'circa', type: 'work', title: '《儒林外史》成书', location: '南京', summary: '吴敬梓写成讽刺小说，刻画科举制度下的众生相，范进中举等章节成为讽刺文学经典。', source: '程晋芳《怀人诗》', sourceUrl: 'https://zh.wikipedia.org/wiki/儒林外史', review: 'verified' },
  { id: 'hongloumeng', year: 1791, type: 'work', title: '程甲本《红楼梦》刊行', location: '北京', summary: '曹雪芹原著、高鹗续补的百二十回程甲本活字刊印，这部家族兴衰巨著成为中国古典小说巅峰。', source: '程伟元、高鹗《红楼梦序》', sourceUrl: 'https://zh.wikipedia.org/wiki/红楼梦', review: 'verified' },
  { id: 'cao-xueqin', year: 1763, prec: 'circa', type: 'author', title: '曹雪芹逝世', location: '北京西郊', summary: '"字字看来皆是血，十年辛苦不寻常"，曹雪芹在贫病中去世，《红楼梦》原稿仅存八十回。', source: '敦诚《挽曹雪芹》', sourceUrl: 'https://zh.wikipedia.org/wiki/曹雪芹', review: 'pending' },

  // ---------- 世界文学：古典至文艺复兴 ----------
  { id: 'aeschylus', year: -458, type: 'work', title: '《俄瑞斯忒亚》三部曲上演', location: '雅典', summary: '埃斯库罗斯的悲剧三部曲在酒神节获胜，古希腊悲剧由此从独唱发展为成熟的戏剧冲突。', source: '亚里士多德《诗学》', sourceUrl: 'https://zh.wikipedia.org/wiki/俄瑞斯忒亚', review: 'verified' },
  { id: 'aeneid', year: -19, type: 'author', title: '维吉尔去世与《埃涅阿斯纪》', location: '布伦迪西乌姆', summary: '维吉尔遗命焚毁未定稿史诗，屋大维下令保存，《埃涅阿斯纪》成为罗马文学最高成就。', source: '苏维托尼乌斯《维吉尔传》', sourceUrl: 'https://zh.wikipedia.org/wiki/埃涅阿斯纪', review: 'verified' },
  { id: 'arabian-nights', year: 900, prec: 'range', endYear: 1400, type: 'work', title: '《一千零一夜》逐步成书', location: '阿拉伯世界', summary: '源于波斯、印度与阿拉伯民间故事的框架故事集历经数百年口传与编订，成为世界民间文学瑰宝。', source: '《一千零一夜》抄本研究', sourceUrl: 'https://zh.wikipedia.org/wiki/一千零一夜', review: 'verified' },
  { id: 'genji', year: 1010, prec: 'circa', type: 'work', title: '紫式部写成《源氏物语》', location: '日本平安京', summary: '宫廷女官紫式部创作五十四卷长篇，被普遍认为是世界上第一部长篇小说。', source: '《紫式部日记》', sourceUrl: 'https://zh.wikipedia.org/wiki/源氏物語', review: 'verified' },
  { id: 'divine-comedy', year: 1321, type: 'work', title: '但丁完成《神曲》', location: '拉文纳', summary: '但丁在流放中完成《神曲》，以托斯卡纳方言写地狱、炼狱、天堂，被称为"中世纪的百科全书"。', source: '薄伽丘《但丁传》', sourceUrl: 'https://zh.wikipedia.org/wiki/神曲', review: 'verified' },
  { id: 'decameron', year: 1353, type: 'work', title: '薄伽丘完成《十日谈》', location: '佛罗伦萨', summary: '十名青年躲避瘟疫时十日讲百个故事，以人性对抗神权，开欧洲短篇小说先河。', source: '薄伽丘《十日谈》自序', sourceUrl: 'https://zh.wikipedia.org/wiki/十日谈', review: 'verified' },
  { id: 'canterbury', year: 1400, type: 'author', title: '乔叟逝世，《坎特伯雷故事集》未完', location: '伦敦', summary: '英国诗歌之父乔叟去世，其朝圣者群像故事奠定了英语文学语言基础。', source: '乔叟《坎特伯雷故事集》', sourceUrl: 'https://zh.wikipedia.org/wiki/杰弗里·乔叟', review: 'verified' },
  { id: 'gutenberg', year: 1455, type: 'society', title: '古登堡活字印刷《圣经》', location: '美因茨', summary: '金属活字印刷术让书籍走出修道院抄本时代，知识与文学的大规模传播成为可能。', source: 'Eisenstein《作为变革动因的印刷机》', sourceUrl: 'https://zh.wikipedia.org/wiki/古騰堡聖經', review: 'verified' },
  { id: 'renaissance', year: 1400, prec: 'range', endYear: 1600, type: 'movement', title: '文艺复兴人文主义文学', location: '意大利 → 欧洲', summary: '彼特拉克、薄伽丘到拉伯雷、塞万提斯、莎士比亚，人文主义文学重发现人和古典世界。', source: '布克哈特《意大利文艺复兴时期的文化》', sourceUrl: 'https://zh.wikipedia.org/wiki/文艺复兴文学', review: 'verified' },
  { id: 'don-quixote', year: 1605, type: 'work', title: '《堂吉诃德》第一部出版', location: '马德里', summary: '塞万提斯写读骑士小说入迷的绅士游侠记，被许多文学史家视为现代小说的开端。', source: '塞万提斯《堂吉诃德》序言', sourceUrl: 'https://zh.wikipedia.org/wiki/堂吉诃德', review: 'verified' },
  { id: 'shakespeare-birth', year: 1564, type: 'author', title: '莎士比亚出生', location: '斯特拉特福', summary: '威廉·莎士比亚受洗于4月26日，诞生日按传统推定为4月23日。', source: '斯特拉特福教区登记册', sourceUrl: 'https://zh.wikipedia.org/wiki/威廉·莎士比亚', review: 'verified' },
  { id: 'shakespeare-death', year: 1616, type: 'author', title: '莎士比亚逝世', location: '斯特拉特福', summary: '莎士比亚于4月23日（儒略历）在故乡新坊宅去世，葬于圣三一教堂，留下三十九部剧作。', source: '莎士比亚墓碑及教区记录', sourceUrl: 'https://zh.wikipedia.org/wiki/威廉·莎士比亞', review: 'verified' },

  // ---------- 十八世纪 ----------
  { id: 'gulliver', year: 1726, type: 'work', title: '《格列佛游记》出版', location: '伦敦', summary: '斯威夫特以外科医生游历小人国、大人国等虚构国度，成为讽刺小说与幻想文学双料经典。', source: 'Swift, Travels into Several Remote Nations', sourceUrl: 'https://zh.wikipedia.org/wiki/格列佛遊記', review: 'verified' },
  { id: 'dream-red-1791-note', year: 1791, type: 'work', title: '程乙本《红楼梦》修订再刊', location: '北京', summary: '程伟元、高鹗在程甲本次年修订刊行程乙本，与程甲本文字差异达两万余字——此为同年重复事件示例。', source: '程乙本《红楼梦引言》', sourceUrl: 'https://zh.wikipedia.org/wiki/程高本', review: 'verified' },
  { id: 'french-revolution', year: 1789, type: 'society', title: '法国大革命爆发', location: '巴黎', summary: '攻占巴士底狱开启革命年代，自由平等思潮深刻改变了十九世纪欧洲文学的精神底色。', source: '勒费弗尔《法国革命史》', sourceUrl: 'https://zh.wikipedia.org/wiki/法国大革命', review: 'verified' },
  { id: 'goethe-werther', year: 1774, type: 'work', title: '歌德发表《少年维特之烦恼》', location: '魏玛', summary: '书信体小说出版后风靡欧洲，引发"维特热"与模仿自杀争议，是狂飙突进运动代表作。', source: '歌德《诗与真》', sourceUrl: 'https://zh.wikipedia.org/wiki/少年维特的烦恼', review: 'verified' },
  { id: 'goethe-faust', year: 1832, type: 'work', title: '《浮士德》第二部出版', location: '魏玛', summary: '歌德去世当年，前后写作近六十年的《浮士德》第二部付梓，悲剧以"永恒之女性"引灵魂上升。', source: '艾克曼《歌德谈话录》', sourceUrl: 'https://zh.wikipedia.org/wiki/浮士德', review: 'verified' },
  { id: 'austen-pride', year: 1813, type: 'work', title: '《傲慢与偏见》出版', location: '伦敦', summary: '简·奥斯汀以"二寸象牙板"的乡绅婚恋喜剧，奠定风俗喜剧小说的典范，初版署名"一位女士"。', source: 'T. Egerton 初版本扉页', sourceUrl: 'https://zh.wikipedia.org/wiki/傲慢与偏见', review: 'verified' },

  // ---------- 十九世纪 ----------
  { id: 'opium-war', year: 1840, type: 'society', title: '第一次鸦片战争爆发', location: '广州至沿海', summary: '战争与随后的开埠深刻冲击天朝秩序，成为近代中国思想与文学转向的起点。', source: '《清史稿·宣宗本纪》', sourceUrl: 'https://zh.wikipedia.org/wiki/第一次鸦片战争', review: 'verified' },
  { id: 'romanticism', year: 1798, prec: 'range', endYear: 1850, type: 'movement', title: '欧洲浪漫主义文学运动', location: '英德法', summary: '华兹华斯、拜伦、雪莱、雨果等推崇想象、自然与个人情感，反抗古典理性规训。', source: '《抒情歌谣集》序言', sourceUrl: 'https://zh.wikipedia.org/wiki/浪漫主义文学', review: 'verified' },
  { id: 'les-mis', year: 1862, type: 'work', title: '雨果发表《悲惨世界》', location: '布鲁塞尔', summary: '冉·阿让的故事覆盖滑铁卢到1832年街垒，出版即被翻译成多国语言，成为社会小说高峰。', source: '雨果《悲惨世界》序言', sourceUrl: 'https://zh.wikipedia.org/wiki/悲惨世界', review: 'verified' },
  { id: 'madame-bovary', year: 1857, type: 'work', title: '《包法利夫人》出版受审', location: '巴黎', summary: '福楼拜因"伤风败俗"受审后被判无罪，客观冷静的叙事使本书成为现实主义里程碑。', source: '巴黎轻罪法庭判决书', sourceUrl: 'https://zh.wikipedia.org/wiki/包法利夫人', review: 'verified' },
  { id: 'war-and-peace', year: 1869, type: 'work', title: '托尔斯泰完成《战争与和平》', location: '亚斯纳亚·波良纳', summary: '以1812年战争为轴书写四大家族与五百余个人物，被毛姆等列为世界十大小说之首。', source: '《俄国导报》连载记录', sourceUrl: 'https://zh.wikipedia.org/wiki/战争与和平', review: 'verified' },
  { id: 'tolstoy-death', year: 1910, type: 'author', title: '托尔斯泰离家出走后病逝', location: '阿斯塔波沃车站', summary: '八十二岁的托尔斯泰为践行信仰离家，病逝于小火车站，噩耗引发全俄知识界震动。', source: '托尔斯泰夫人日记', sourceUrl: 'https://zh.wikipedia.org/wiki/列夫·托尔斯泰', review: 'verified' },
  { id: 'dostoevsky-karamazov', year: 1880, type: 'work', title: '《卡拉马佐夫兄弟》连载', location: '圣彼得堡', summary: '陀思妥耶夫斯基最后一部长篇，以弑父案审问信仰、自由与恶，原计划的第二部未能写出。', source: '《俄国导报》1879—1880', sourceUrl: 'https://zh.wikipedia.org/wiki/卡拉马佐夫兄弟', review: 'verified' },
  { id: 'realism-ru', year: 1840, prec: 'range', endYear: 1900, type: 'movement', title: '俄国批判现实主义黄金期', location: '圣彼得堡 · 莫斯科', summary: '果戈理、屠格涅涅夫、陀思妥耶夫斯基、托尔斯泰、契诃夫群星璀璨，"多余人""小人物"成典型。', source: '别尔嘉耶夫《俄罗斯思想》', sourceUrl: 'https://zh.wikipedia.org/wiki/俄羅斯文學', review: 'verified' },
  { id: 'japan-meiji', year: 1868, type: 'society', title: '日本明治维新', location: '江户（东京）', summary: '维新推动言文一致运动，坪内逍遥《小说神髓》提倡写实，二叶亭四迷写出近代小说《浮云》。', source: '坪内逍遥《小说神髓》', sourceUrl: 'https://zh.wikipedia.org/wiki/明治维新', review: 'verified' },
  { id: 'wuyang', year: 1894, type: 'society', title: '甲午战争爆发', location: '朝鲜半岛 · 黄海', summary: '战败震惊朝野，救亡与启蒙成为文学主旋律，直接催生诗界革命、小说界革命。', source: '《马关条约》', sourceUrl: 'https://zh.wikipedia.org/wiki/甲午战争', review: 'verified' },
  { id: 'xinhai', year: 1911, type: 'society', title: '辛亥革命', location: '武昌', summary: '武昌起义结束帝制，共和体制与白话文浪潮共同改写了二十世纪中国文学的语境。', source: '《中华民国临时政府公报》', sourceUrl: 'https://zh.wikipedia.org/wiki/辛亥革命', review: 'verified' },

  // ---------- 二十世纪上半叶 ----------
  { id: 'xinqingnian', year: 1915, type: 'society', title: '《青年杂志》创刊', location: '上海', summary: '陈独秀创办《青年杂志》（次年改名《新青年》），新文化运动以民主与科学为旗帜拉开序幕。', source: '《青年杂志》创刊号', sourceUrl: 'https://zh.wikipedia.org/wiki/新青年', review: 'verified' },
  { id: 'may-fourth', year: 1919, type: 'society', title: '五四运动爆发', location: '北京', summary: '学生游行引发全国风潮，新文化由此转入深入的文学革命与社会改造实践。', source: '《五四运动回忆录》', sourceUrl: 'https://zh.wikipedia.org/wiki/五四运动', review: 'verified' },
  { id: 'baihua', year: 1917, prec: 'range', endYear: 1921, type: 'movement', title: '文学革命与白话文运动', location: '北京', summary: '胡适《文学改良刍议》、陈独秀《文学革命论》倡白话废文言，现代文学的语言革命展开。', source: '《新青年》第二、三卷', sourceUrl: 'https://zh.wikipedia.org/wiki/文学革命', review: 'verified' },
  { id: 'kuangri', year: 1918, type: 'work', title: '《狂人日记》发表', location: '北京', summary: '鲁迅在《新青年》发表中国第一篇现代白话小说，结尾"救救孩子"成为时代呐喊。', source: '《新青年》第四卷第五号', sourceUrl: 'https://zh.wikipedia.org/wiki/狂人日记', review: 'verified' },
  { id: 'ah-q', year: 1921, prec: 'range', endYear: 1922, type: 'work', title: '《阿Q正传》连载', location: '北京', summary: '鲁迅以"精神胜利法"塑造国民性典型，小说连载期间不断有人怀疑是在骂自己。', source: '《晨报副刊》连载', sourceUrl: 'https://zh.wikipedia.org/wiki/阿Q正传', review: 'verified' },
  { id: 'lu-xun-death', year: 1936, type: 'author', title: '鲁迅在上海逝世', location: '上海', summary: '上万民众自发为抬棺送葬，鲁迅留下"民族魂"挽幛，杂文与短篇小说深刻塑造现代中国。', source: '《鲁迅先生纪念集》', sourceUrl: 'https://zh.wikipedia.org/wiki/鲁迅', review: 'verified' },
  { id: 'ulysses', year: 1922, type: 'work', title: '《尤利西斯》出版', location: '巴黎', summary: '乔伊斯以一天十八小时写布卢姆漫游都柏林，意识流手法彻底改变了小说叙事。', source: 'Shakespeare and Company 初版', sourceUrl: 'https://zh.wikipedia.org/wiki/尤利西斯', review: 'verified' },
  { id: 'kafka', year: 1924, type: 'author', title: '卡夫卡逝世', location: '基尔林', summary: '卡夫卡遗嘱请友人焚毁全部手稿，布洛德违背遗愿整理出版《审判》《城堡》，存在主义文学先声得以传世。', source: 'Max Brod《卡夫卡传》', sourceUrl: 'https://zh.wikipedia.org/wiki/弗朗茨·卡夫卡', review: 'verified' },
  { id: 'great-gatsby', year: 1925, type: 'work', title: '《了不起的盖茨比》出版', location: '纽约', summary: '菲茨杰拉德写爵士时代美国梦的幻灭，初版销量平平，二战后成为美国文学经典。', source: 'Scribner 初版', sourceUrl: 'https://zh.wikipedia.org/wiki/了不起的盖茨比', review: 'verified' },
  { id: 'harlem', year: 1920, prec: 'range', endYear: 1935, type: 'movement', title: '哈莱姆文艺复兴', location: '纽约', summary: '纽约哈莱姆区黑人艺术家掀起"新黑人运动"，兰斯顿·休斯等让非裔文学进入美国主流视野。', source: 'Alain Locke《新黑人》', sourceUrl: 'https://zh.wikipedia.org/wiki/哈莱姆文艺复兴', review: 'verified' },
  { id: 'japan-proletarian', year: 1928, prec: 'range', endYear: 1937, type: 'movement', title: '日本无产阶级文学运动', location: '东京', summary: '小林多喜二《蟹工船》等写工人与渔民斗争，1933年小林被警察拷打致死，运动被镇压。', source: '《战旗》杂志合订本', sourceUrl: 'https://zh.wikipedia.org/wiki/プロレタリア文学', review: 'verified' },
  { id: 'changhenge-1942', year: 1942, type: 'society', title: '延安文艺座谈会', location: '延安', summary: '毛泽东《在延安文艺座谈会上的讲话》确立文艺为工农兵服务的方向，深刻影响此后中国文学体制。', source: '《解放日报》1943年', sourceUrl: 'https://zh.wikipedia.org/wiki/延安文艺座谈会', review: 'verified' },

  // ---------- 二战后 ----------
  { id: 'ww2-end', year: 1945, type: 'society', title: '第二次世界大战结束', location: '全球', summary: '战争创伤、核阴影与冷战格局催生存在主义、荒诞派等战后文学思潮。', source: '联合国《联合国宪章》签署记录', sourceUrl: 'https://zh.wikipedia.org/wiki/第二次世界大战', review: 'verified' },
  { id: 'existentialism', year: 1943, prec: 'range', endYear: 1960, type: 'movement', title: '存在主义文学浪潮', location: '巴黎', summary: '萨特《存在与虚无》、加缪《局外人》《鼠疫》以文学阐释自由选择与荒诞，左岸咖啡馆成为时代地标。', source: '萨特《存在主义是一种人道主义》', sourceUrl: 'https://zh.wikipedia.org/wiki/存在主义', review: 'verified' },
  { id: 'waiting-godot', year: 1953, type: 'work', title: '《等待戈多》首演', location: '巴黎', summary: '贝克特的两幕悲喜剧在巴比伦剧场首演，"什么也没有发生"的戏剧成为荒诞派代表作。', source: 'Théâtre de Babylone 首演海报', sourceUrl: 'https://zh.wikipedia.org/wiki/等待戈多', review: 'verified' },
  { id: 'lolita', year: 1955, type: 'work', title: '《洛丽塔》在巴黎出版', location: '巴黎奥林匹亚出版社', summary: '纳博科夫英文小说因题材在多国遭禁，后成为后现代叙事语言的典范。', source: 'Olympia Press 初版', sourceUrl: 'https://zh.wikipedia.org/wiki/洛丽塔', review: 'pending' },
  { id: 'maodun-prize', year: 1981, type: 'society', title: '首届茅盾文学奖揭晓', location: '北京', summary: '根据茅盾遗愿设立的长篇小说奖，首届授予《许茂和他的女儿们》《东方》等六部作品。', source: '中国作家协会公告', sourceUrl: 'https://zh.wikipedia.org/wiki/茅盾文学奖', review: 'verified' },
  { id: 'shanghen', year: 1977, prec: 'range', endYear: 1980, type: 'movement', title: '伤痕文学', location: '北京 · 上海', summary: '刘心武《班主任》、卢新华《伤痕》等以创伤记忆开启新时期文学，"伤痕"成为一代人的命名。', source: '《文汇报》1978年8月11日', sourceUrl: 'https://zh.wikipedia.org/wiki/伤痕文学', review: 'verified' },
  { id: 'menglong', year: 1980, prec: 'decade', type: 'movement', title: '朦胧诗运动', location: '北京', summary: '北岛、顾城、舒婷等以《今天》杂志为阵地，用隐喻与个人化语言重续现代主义诗歌探索。', source: '《今天》杂志影印合订本', sourceUrl: 'https://zh.wikipedia.org/wiki/朦胧诗', review: 'verified' },
  { id: 'one-hundred-years', year: 1967, type: 'work', title: '《百年孤独》出版', location: '布宜诺斯艾利斯', summary: '加西亚·马尔克斯写布恩迪亚家族七代人与马孔多的兴亡，魔幻现实主义震动世界文坛。', source: 'Editorial Sudamericana 初版', sourceUrl: 'https://zh.wikipedia.org/wiki/百年孤独', review: 'verified' },
  { id: 'boom', year: 1960, prec: 'range', endYear: 1975, type: 'movement', title: '拉美文学爆炸', location: '拉美 → 巴塞罗那', summary: '科塔萨尔、略萨、马尔克斯、富恩特斯集体崛起，拉美小说反向影响欧美与中国文坛。', source: 'Donoso《拉美文学爆炸亲历记》', sourceUrl: 'https://zh.wikipedia.org/wiki/拉丁美洲文学爆炸', review: 'verified' },
  { id: 'old-man-sea', year: 1952, type: 'work', title: '《老人与海》发表', location: '古巴', summary: '海明威在古巴写成中篇，"人可以被毁灭，却不能被打败"，1953年获普利策奖。', source: '《生活》杂志1952年9月', sourceUrl: 'https://zh.wikipedia.org/wiki/老人与海', review: 'verified' },
  { id: 'hemingway-death', year: 1961, type: 'author', title: '海明威自杀', location: '凯彻姆', summary: '受病痛与精神折磨的海明威以双管猎枪结束生命，冰山原则与电报体文风影响几代作家。', source: '《纽约时报》讣告', sourceUrl: 'https://zh.wikipedia.org/wiki/欧内斯特·海明威', review: 'verified' },
  { id: 'gaoxingjian', year: 2000, type: 'society', title: '高行健获诺贝尔文学奖', location: '斯德哥尔摩', summary: '首位以中文写作获诺贝尔文学奖的作家，获奖作品包括《灵山》与戏剧《绝对信号》。', source: '瑞典学院颁奖词', sourceUrl: 'https://zh.wikipedia.org/wiki/高行健', review: 'verified' },
  { id: 'moyan', year: 2012, type: 'society', title: '莫言获诺贝尔文学奖', location: '斯德哥尔摩', summary: '瑞典学院称其"以幻觉现实主义融合民间故事、历史与当代"，代表作《红高粱》《蛙》。', source: '瑞典学院2012年公告', sourceUrl: 'https://zh.wikipedia.org/wiki/莫言', review: 'verified' },

  // ---------- 以下为"导入原始记录"，故意混入异常数据，供 normalize 导入管线演示 ----------
  // 与已有条目重复（同标题同年）→ 应被去重并合并来源
  { id: 'dup-luxun', year: 1918, type: 'work', title: '《狂人日记》发表', location: '北平', summary: '鲁迅创作的第一篇白话小说（导入记录，来源与主记录不同）。', source: '人民文学出版社《鲁迅全集》第一卷', sourceUrl: 'https://www.renwen.com/' },
  // 年份不规范：字符串 "一九二三年"
  { id: 'nüshen-raw', year: '一九二三年', type: 'work', title: '冰心《繁星》《春水》风行', location: '北京', summary: '冰心的小诗集以母爱、童真、自然为主题，风靡校园。', source: '商务印书馆版本记录', review: 'verified' },
  // 约数 "约1763" 且缺来源
  { id: 'cao-death-raw', year: '约1763', type: 'author', title: '曹雪芹卒年异说', location: '北京', summary: '关于曹雪芹卒年有壬午（1763）、癸未（1764）两说，此条来源尚待补录。', review: 'disputed' },
  // 年代 "1850年代"
  { id: 'victorian-raw', year: '1850年代', type: 'movement', title: '维多利亚小说鼎盛期', location: '伦敦', summary: '狄更斯、萨克雷、勃朗特姐妹、乔治·艾略特等连载长篇塑造时代全景。', source: '《维多利亚小说》导读', review: 'verified' },
  // 世纪 "公元前8世纪"
  { id: 'homer-raw', year: '公元前8世纪', type: 'work', title: '荷马史诗定型', location: '爱奥尼亚', summary: '《伊利亚特》《奥德赛》在口传传统中逐步定型，荷马其人是否存在至今争论。', source: 'Parry《荷马史诗的形成》', review: 'disputed' },
  // 时间段 "1925-1927"
  { id: 'xin-yue-raw', year: '1925-1927', type: 'movement', title: '新月派活动', location: '北京 · 上海', summary: '徐志摩、闻一多等以《新月》月刊为阵地，倡导新格律诗"三美"。', source: '《新月》月刊影印本', review: 'verified' },
  // 严重错误：类型不合法 + 年份缺失 → 应跳过
  { id: 'bad-row-1', title: '一条没有年份和类型的记录', summary: '导入时无法定位到时间轴，也没有合法类型。' },
  // 严重错误：年份无法解析
  { id: 'bad-row-2', year: '很久以前', type: 'work', title: '神话口传时代', summary: '年份文本无法解析。', source: '某民俗资料' },
  // 严重错误：标题为空
  { id: 'bad-row-3', year: 1900, type: 'work', title: '   ', summary: '标题为空白。' },
]

// 压测数据：模拟从外部资料包导入的大量条目。
// 全部以确定伪随机生成，保证刷新后位置稳定；标题显式标注"[模拟资料]"，
// 且其中混入约 1% 的损坏记录，用来验证大体量导入时的容错路径。
export function generateStressEvents(count = 1600) {
  let seed = 20260917
  const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  const types = ['movement', 'author', 'work', 'society']
  const places = ['长安', '洛阳', '汴京', '北京', '上海', '伦敦', '巴黎', '圣彼得堡', '东京', '纽约', '加尔各答', '开罗', '布宜诺斯艾利斯']
  const rows = []
  for (let i = 0; i < count; i += 1) {
    const year = Math.round(-500 + rand() * 2520)
    const type = types[Math.floor(rand() * types.length)]
    if (i % 97 === 53) {
      rows.push({ id: `stress-bad-${i}`, year: '无法解析的年份', type, title: `模拟损坏记录 ${i}` })
      continue
    }
    rows.push({
      id: `stress-${i}`,
      year,
      prec: rand() < 0.12 ? 'decade' : 'y',
      type,
      title: `[模拟资料] ${year < 0 ? `前${-year}` : year}年${type === 'work' ? '小说' : type === 'author' ? '作家' : type === 'movement' ? '思潮' : '事件'} #${i}`,
      location: places[Math.floor(rand() * places.length)],
      summary: `这是压测资料包中的第 ${i + 1} 条记录，用于验证时间轴在大量事件下的虚拟滚动与聚合性能。`,
      source: '模拟资料包 v1（文学史时间轴压测数据）',
      review: rand() < 0.65 ? 'verified' : rand() < 0.5 ? 'pending' : 'disputed',
    })
  }
  return rows
}
