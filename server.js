import express from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')
const dataFile = path.join(dataDir, 'store.json')
const PORT = process.env.PORT || 8787
const app = express()
app.use(express.json({ limit: '2mb' }))

const demoUser = { id: 'user-demo', name: '林舟', handle: 'linzhou', initials: 'LZ' }
const seed = {
  users: [demoUser],
  projects: [
    {
      id: 'proj-salt-wind', title: '盐与风的航线', description: '在潮汐尽头，寻找一座不存在的岛。', visibility: 'private',
      cover: { kind: 'image', value: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', name: 'salt-wind.jpg' },
      ownerId: demoUser.id, createdAt: '2026-09-08T09:30:00.000Z', updatedAt: '2026-09-16T10:24:00.000Z',
      draft: { id: 'draft-salt-wind', content: '潮水退去以后，港口只剩下一种颜色。\n\n我把地图折成四份，塞进旧风衣的内袋。', version: 7, updatedAt: '2026-09-16T10:24:00.000Z' }, sharedStatus: 'private'
    },
    {
      id: 'proj-lanterns', title: '午夜图书馆', description: '每一本被遗忘的书，都在午夜后亮起一盏灯。', visibility: 'shared',
      cover: { kind: 'image', value: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80', name: 'library.jpg' },
      ownerId: demoUser.id, createdAt: '2026-08-22T12:10:00.000Z', updatedAt: '2026-09-12T16:40:00.000Z',
      draft: { id: 'draft-lanterns', content: '图书馆在午夜十二点准时醒来。', version: 3, updatedAt: '2026-09-12T16:40:00.000Z' }, sharedStatus: 'shared'
    }
  ]
}

async function readStore() {
  try { return JSON.parse(await fs.readFile(dataFile, 'utf8')) } catch { await fs.mkdir(dataDir, { recursive: true }); await fs.writeFile(dataFile, JSON.stringify(seed, null, 2)); return structuredClone(seed) }
}
let writeQueue = Promise.resolve()
async function writeStore(store) { writeQueue = writeQueue.then(async () => { await fs.mkdir(dataDir, { recursive: true }); await fs.writeFile(dataFile, JSON.stringify(store, null, 2)) }); return writeQueue }
function requireUser(req, res) { const id = req.header('x-user-id') || req.query.userId; if (!id) { res.status(401).json({ error: 'UNAUTHENTICATED', message: '请先登录 Novelverse' }); return null } return id }
function now() { return new Date().toISOString() }

app.get('/api/me', (req, res) => res.json({ user: demoUser }))
app.get('/api/projects', async (req, res) => { const userId = requireUser(req, res); if (!userId) return; const store = await readStore(); res.json({ projects: store.projects.filter(p => p.ownerId === userId) }) })
app.post('/api/projects', async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return
  const { title, description = '', visibility = 'private', cover = null } = req.body || {}
  const cleanTitle = String(title || '').trim(); if (!cleanTitle) return res.status(400).json({ error: 'TITLE_REQUIRED', message: '请填写项目标题' })
  const store = await readStore(); if (store.projects.some(p => p.ownerId === userId && p.title.toLowerCase() === cleanTitle.toLowerCase())) return res.status(409).json({ error: 'DUPLICATE_PROJECT', message: '已经有同名项目了' })
  const projectId = `proj-${crypto.randomUUID()}`; const draftId = `draft-${crypto.randomUUID()}`; const timestamp = now()
  const project = { id: projectId, title: cleanTitle, description: String(description).trim(), visibility: visibility === 'shared' ? 'shared' : 'private', cover, ownerId: userId, createdAt: timestamp, updatedAt: timestamp, draft: { id: draftId, content: '', version: 0, updatedAt: timestamp }, sharedStatus: visibility === 'shared' ? 'shared' : 'private' }
  store.projects.unshift(project); await writeStore(store); res.status(201).json({ project })
})
app.patch('/api/projects/:id', async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return; const store = await readStore(); const project = store.projects.find(p => p.id === req.params.id && p.ownerId === userId); if (!project) return res.status(404).json({ error: 'NOT_FOUND', message: '项目不存在' })
  const { title, description, visibility, cover } = req.body || {}; if (title !== undefined) project.title = String(title).trim(); if (description !== undefined) project.description = String(description).trim(); if (visibility !== undefined) project.visibility = visibility === 'shared' ? 'shared' : 'private'; if (cover !== undefined) project.cover = cover; project.updatedAt = now(); project.sharedStatus = project.visibility; await writeStore(store); res.json({ project })
})
app.get('/api/projects/:id/draft', async (req, res) => { const userId = requireUser(req, res); if (!userId) return; const store = await readStore(); const project = store.projects.find(p => p.id === req.params.id && p.ownerId === userId); if (!project) return res.status(404).json({ error: 'NOT_FOUND', message: '草稿不存在' }); res.json({ draft: project.draft }) })
app.put('/api/projects/:id/draft', async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return; const store = await readStore(); const project = store.projects.find(p => p.id === req.params.id && p.ownerId === userId); if (!project) return res.status(404).json({ error: 'NOT_FOUND', message: '项目不存在' })
  const { content = '', baseVersion = 0 } = req.body || {}; if (Number(baseVersion) !== Number(project.draft.version)) return res.status(409).json({ error: 'DRAFT_CONFLICT', message: '这份草稿在另一台设备上有更新', serverDraft: project.draft })
  const draft = { ...project.draft, content: String(content), version: Number(project.draft.version) + 1, updatedAt: now() }; project.draft = draft; project.updatedAt = draft.updatedAt; await writeStore(store); res.json({ draft })
})
app.post('/api/projects/:id/share', async (req, res) => { const userId = requireUser(req, res); if (!userId) return; const store = await readStore(); const project = store.projects.find(p => p.id === req.params.id && p.ownerId === userId); if (!project) return res.status(404).json({ error: 'NOT_FOUND', message: '项目不存在' }); project.visibility = project.visibility === 'shared' ? 'private' : 'shared'; project.sharedStatus = project.visibility; project.updatedAt = now(); await writeStore(store); res.json({ project }) })

// ---------- 文学史事件时间轴 ----------
const timelineFile = path.join(dataDir, 'timeline-events.json')
const EVENT_TYPES = ['movement', 'author', 'publication', 'social']
const EVENT_PRECISIONS = ['exact', 'year', 'circa', 'decade', 'range', 'unknown']
const timelineSeed = {
  events: [
    { id: 'evt-genji', title: '《源氏物语》成书', type: 'publication', precision: 'circa', year: 1008, location: '日本京都', summary: '紫式部创作的长篇小说，通常被视为世界上最早的长篇小说之一，具体成书年份已不可考。', sources: [{ title: '《日本文学史》', url: 'https://zh.wikipedia.org/wiki/源氏物语' }], status: 'verified' },
    { id: 'evt-caoxueqin-death', title: '曹雪芹逝世', type: 'author', precision: 'circa', year: 1763, location: '北京', summary: '《红楼梦》作者曹雪芹病逝于北京西郊，卒年有壬午、癸未两说。', sources: [{ title: '《曹雪芹传》' }], status: 'verified' },
    { id: 'evt-hongloumeng-print', title: '《红楼梦》程甲本刊行', type: 'publication', precision: 'year', year: 1791, location: '北京', summary: '程伟元、高鹗整理刊行一百二十回本《红楼梦》，是为程甲本。', sources: [{ title: '《红楼梦版本研究》' }], status: 'verified' },
    { id: 'evt-romanticism', title: '欧洲浪漫主义文学运动', type: 'movement', precision: 'range', year: 1798, endYear: 1832, location: '欧洲', summary: '从《抒情歌谣集》出版到歌德逝世，浪漫主义强调情感、想象与自然，席卷欧洲文坛。', sources: [{ title: '《欧洲文学史》' }], status: 'verified' },
    { id: 'evt-frankenstein', title: '《弗兰肯斯坦》出版', type: 'publication', precision: 'year', year: 1818, location: '伦敦', summary: '玛丽·雪莱匿名出版《弗兰肯斯坦》，被视为科幻小说的开端。', sources: [{ title: '《英国文学简史》' }], status: 'verified' },
    { id: 'evt-realism', title: '现实主义文学兴盛', type: 'movement', precision: 'range', year: 1830, endYear: 1890, location: '欧洲', summary: '司汤达、巴尔扎克、福楼拜、托尔斯泰等作家以冷静写实笔法描绘社会百态。', sources: [{ title: '《西方文学史》' }], status: 'verified' },
    { id: 'evt-jane-eyre', title: '《简·爱》出版', type: 'publication', precision: 'year', year: 1847, location: '伦敦', summary: '夏洛蒂·勃朗特以笔名柯勒·贝尔出版《简·爱》，轰动英国文坛。', sources: [{ title: '《勃朗特姐妹评传》' }], status: 'verified' },
    { id: 'evt-wuthering', title: '《呼啸山庄》出版', type: 'publication', precision: 'year', year: 1847, location: '伦敦', summary: '艾米莉·勃朗特唯一的长篇小说，初版时评价两极，后被奉为经典。', sources: [{ title: '《勃朗特姐妹评传》' }], status: 'verified' },
    { id: 'evt-bovary', title: '《包法利夫人》出版', type: 'publication', precision: 'year', year: 1857, location: '巴黎', summary: '福楼拜出版《包法利夫人》，因"有伤风化"被控上法庭后判无罪。', sources: [{ title: '《法国文学史》' }], status: 'verified' },
    { id: 'evt-crime', title: '《罪与罚》出版', type: 'publication', precision: 'year', year: 1866, location: '圣彼得堡', summary: '陀思妥耶夫斯基出版《罪与罚》，深入剖析罪责与救赎。', sources: [{ title: '《俄国文学史》' }], status: 'verified' },
    { id: 'evt-war-peace', title: '《战争与和平》出版', type: 'publication', precision: 'year', year: 1869, location: '莫斯科', summary: '托尔斯泰史诗巨著全卷出版，描绘拿破仑战争时期的俄国社会。', sources: [{ title: '《托尔斯泰传》' }], status: 'verified' },
    { id: 'evt-kafka-born', title: '卡夫卡出生', type: 'author', precision: 'exact', year: 1883, date: '1883-07-03', location: '布拉格', summary: '弗兰兹·卡夫卡出生于布拉格一个犹太商人家庭，生前默默无闻。', sources: [{ title: '《卡夫卡传》' }], status: 'verified' },
    { id: 'evt-proust', title: '《追忆逝水年华》首卷出版', type: 'publication', precision: 'year', year: 1913, location: '巴黎', summary: '普鲁斯特自费出版《在斯万家那边》，意识流巨著由此启程。', sources: [{ title: '《普鲁斯特评传》' }], status: 'verified' },
    { id: 'evt-ww1', title: '第一次世界大战', type: 'social', precision: 'range', year: 1914, endYear: 1918, location: '欧洲', summary: '战争深刻改变了欧洲文学的气质，"迷惘的一代"由此登上文坛。', sources: [{ title: '《二十世纪世界史》' }], status: 'verified' },
    { id: 'evt-new-youth', title: '《新青年》创刊 · 新文化运动兴起', type: 'movement', precision: 'year', year: 1915, location: '上海', summary: '陈独秀创办《青年杂志》（后改名《新青年》），新文化运动由此发端。', sources: [{ title: '《中国现代文学史》' }], status: 'verified' },
    { id: 'evt-literary-revolution', title: '文学革命发端', type: 'movement', precision: 'year', year: 1917, location: '北京', summary: '胡适发表《文学改良刍议》，陈独秀发表《文学革命论》，白话文运动全面展开。', sources: [{ title: '《中国现代文学史》' }], status: 'verified' },
    { id: 'evt-kuangren', title: '《狂人日记》发表', type: 'publication', precision: 'year', year: 1918, location: '北京', summary: '鲁迅在《新青年》发表中国第一篇现代白话小说《狂人日记》。', sources: [{ title: '《鲁迅全集》', url: 'https://zh.wikipedia.org/wiki/狂人日记' }], status: 'verified' },
    { id: 'evt-may4', title: '五四运动', type: 'social', precision: 'exact', year: 1919, date: '1919-05-04', location: '北京', summary: '五四运动爆发，新文学运动随之进入高潮，文学研究会、创造社相继成立。', sources: [{ title: '《中国现代史》' }], status: 'verified' },
    { id: 'evt-aq', title: '《阿Q正传》发表', type: 'publication', precision: 'year', year: 1921, location: '北京', summary: '鲁迅《阿Q正传》在《晨报副刊》连载，成为中国现代文学的经典。', sources: [{ title: '《鲁迅全集》' }], status: 'verified' },
    { id: 'evt-ulysses', title: '《尤利西斯》出版', type: 'publication', precision: 'year', year: 1922, location: '巴黎', summary: '乔伊斯《尤利西斯》由巴黎莎士比亚书店出版，意识流手法臻于极致。', sources: [{ title: '莎士比亚书店出版档案' }], status: 'verified' },
    { id: 'evt-ulysses-alt', title: '《尤利西斯》出版', type: 'publication', precision: 'year', year: 1922, location: '巴黎', summary: '乔伊斯代表作在巴黎首版，此后长期被英美列为禁书。', sources: [{ title: '《乔伊斯传》' }], status: 'pending' },
    { id: 'evt-wasteland', title: '《荒原》发表', type: 'publication', precision: 'year', year: 1922, location: '伦敦', summary: 'T.S.艾略特长诗《荒原》发表，成为现代主义诗歌的里程碑。', sources: [{ title: '《二十世纪英美文学》' }], status: 'verified' },
    { id: 'evt-modernism', title: '现代主义文学高潮', type: 'movement', precision: 'decade', year: 1920, location: '欧美', summary: '二十世纪二十年代，乔伊斯、伍尔夫、卡夫卡、艾略特等人的作品将现代主义推向高峰。', sources: [{ title: '《现代主义文学研究》' }], status: 'verified' },
    { id: 'evt-gatsby', title: '《了不起的盖茨比》出版', type: 'publication', precision: 'year', year: 1925, location: '纽约', summary: '菲茨杰拉德出版《了不起的盖茨比》，写尽爵士时代的幻梦。', sources: [{ title: '《美国文学史》' }], status: 'verified' },
    { id: 'evt-faulkner', title: '《喧哗与骚动》出版', type: 'publication', precision: 'year', year: 1929, location: '纽约', summary: '福克纳出版《喧哗与骚动》，约克纳帕塔法世系渐成气候。', sources: [{ title: '《福克纳评传》' }], status: 'verified' },
    { id: 'evt-biancheng', title: '《边城》出版', type: 'publication', precision: 'year', year: 1934, location: '北京', summary: '沈从文《边城》出版，湘西世界的牧歌情调成为京派文学的标志。', sources: [{ title: '《沈从文传》' }], status: 'verified' },
    { id: 'evt-xiangzi', title: '《骆驼祥子》出版', type: 'publication', precision: 'year', year: 1936, location: '北京', summary: '老舍《骆驼祥子》出版，写尽北平人力车夫的悲欢。', sources: [{ title: '《老舍评传》' }], status: 'verified' },
    { id: 'evt-luxun-death', title: '鲁迅逝世', type: 'author', precision: 'exact', year: 1936, date: '1936-10-19', location: '上海', summary: '鲁迅病逝于上海，享年五十五岁，万人送葬。', sources: [{ title: '《鲁迅年谱》' }], status: 'verified' },
    { id: 'evt-war-china', title: '全面抗战爆发', type: 'social', precision: 'year', year: 1937, location: '中国', summary: '七七事变后全面抗战爆发，文学转入救亡与流亡的书写。', sources: [{ title: '《中国现代史》' }], status: 'verified' },
    { id: 'evt-ww2', title: '第二次世界大战', type: 'social', precision: 'range', year: 1939, endYear: 1945, location: '全球', summary: '二战深刻塑造了二十世纪中期的世界文学，反战与流亡成为重要主题。', sources: [{ title: '《二十世纪世界史》' }], status: 'verified' },
    { id: 'evt-qingcheng', title: '《倾城之恋》发表', type: 'publication', precision: 'year', year: 1943, location: '上海', summary: '张爱玲发表《倾城之恋》，同年《金锁记》问世，名动上海文坛。', sources: [{ title: '《张爱玲评传》' }], status: 'verified' },
    { id: 'evt-weicheng', title: '《围城》出版', type: 'publication', precision: 'year', year: 1947, location: '上海', summary: '钱锺书《围城》出版，被誉为"新儒林外史"。', sources: [{ title: '《钱锺书传》' }], status: 'verified' },
    { id: 'evt-prc', title: '中华人民共和国成立', type: 'social', precision: 'exact', year: 1949, date: '1949-10-01', location: '北京', summary: '新中国成立，当代文学格局由此展开。', sources: [{ title: '《中国现代史》' }], status: 'verified' },
    { id: 'evt-catcher', title: '《麦田里的守望者》出版', type: 'publication', precision: 'year', year: 1951, location: '纽约', summary: '塞林格出版《麦田里的守望者》，成为战后美国青年的精神肖像。', sources: [{ title: '《美国文学史》' }], status: 'verified' },
    { id: 'evt-hemingway-nobel', title: '海明威获诺贝尔文学奖', type: 'author', precision: 'year', year: 1954, location: '斯德哥尔摩', summary: '海明威因《老人与海》等作品获诺贝尔文学奖。', sources: [{ title: '诺贝尔文学奖官网', url: 'https://www.nobelprize.org/prizes/literature/1954/summary/' }], status: 'verified' },
    { id: 'evt-lolita', title: '《洛丽塔》出版', type: 'publication', precision: 'year', year: 1955, location: '巴黎', summary: '纳博科夫《洛丽塔》在巴黎出版，引发巨大争议。', sources: [{ title: '《纳博科夫传》' }], status: 'verified' },
    { id: 'evt-on-the-road', title: '《在路上》出版', type: 'publication', precision: 'year', year: 1957, location: '纽约', summary: '凯鲁亚克《在路上》出版，"垮掉的一代"由此得名。', sources: [{ title: '《垮掉的一代研究》' }], status: 'verified' },
    { id: 'evt-magic-realism', title: '魔幻现实主义繁荣', type: 'movement', precision: 'decade', year: 1960, location: '拉丁美洲', summary: '二十世纪六七十年代，马尔克斯、博尔赫斯、略萨等掀起"文学爆炸"。', sources: [{ title: '《拉丁美洲文学史》' }], status: 'verified' },
    { id: 'evt-cultural-start', title: '文化大革命开始', type: 'social', precision: 'year', year: 1966, location: '中国', summary: '文革开始，文学创作陷入低谷，大量作家被迫停笔。', sources: [{ title: '《中国当代文学史》' }], status: 'verified' },
    { id: 'evt-hundred-years', title: '《百年孤独》出版', type: 'publication', precision: 'year', year: 1967, location: '布宜诺斯艾利斯', summary: '马尔克斯《百年孤独》出版，魔幻现实主义由此风靡世界。', sources: [{ title: '《马尔克斯传》', url: 'https://zh.wikipedia.org/wiki/百年孤独' }], status: 'verified' },
    { id: 'evt-cultural-end', title: '文化大革命结束', type: 'social', precision: 'year', year: 1976, location: '中国', summary: '文革结束，伤痕文学、反思文学随后兴起。', sources: [{ title: '《中国当代文学史》' }], status: 'verified' },
    { id: 'evt-reform', title: '改革开放 · 新时期文学开端', type: 'social', precision: 'year', year: 1978, location: '北京', summary: '十一届三中全会召开，伤痕文学、朦胧诗、寻根文学相继涌现。', sources: [{ title: '《中国当代文学史》' }], status: 'verified' },
    { id: 'evt-misty-poets', title: '朦胧诗派兴起', type: 'movement', precision: 'circa', year: 1978, location: '北京', summary: '北岛、顾城、舒婷等围绕《今天》杂志形成朦胧诗派，确切起点说法不一。', sources: [{ title: '《朦胧诗论争集》' }], status: 'verified' },
    { id: 'evt-marquez-nobel', title: '马尔克斯获诺贝尔文学奖', type: 'author', precision: 'year', year: 1982, location: '斯德哥尔摩', summary: '马尔克斯因《百年孤独》等作品获诺贝尔文学奖。', sources: [{ title: '诺贝尔文学奖官网', url: 'https://www.nobelprize.org/prizes/literature/1982/summary/' }], status: 'verified' },
    { id: 'evt-red-sorghum', title: '《红高粱》发表', type: 'publication', precision: 'year', year: 1986, location: '北京', summary: '莫言《红高粱》发表，次年改编电影获柏林金熊奖。', sources: [{ title: '《莫言评传》' }], status: 'verified' },
    { id: 'evt-huozhe', title: '《活着》出版', type: 'publication', precision: 'year', year: 1993, location: '北京', summary: '余华《活着》出版，讲述福贵一生的苦难与坚韧。', sources: [{ title: '《余华评传》' }], status: 'verified' },
    { id: 'evt-bailuyuan', title: '《白鹿原》出版', type: 'publication', precision: 'year', year: 1993, location: '北京', summary: '陈忠实《白鹿原》出版，后获茅盾文学奖。', sources: [{ title: '《陈忠实评传》' }], status: 'verified' },
    { id: 'evt-zhang-death', title: '张爱玲逝世', type: 'author', precision: 'year', year: 1995, location: '洛杉矶', summary: '张爱玲在洛杉矶寓所逝世，数日后才被发现。', sources: [], status: 'pending' },
    { id: 'evt-gao-nobel', title: '高行健获诺贝尔文学奖', type: 'author', precision: 'year', year: 2000, location: '斯德哥尔摩', summary: '高行健成为首位获得诺贝尔文学奖的华语作家。', sources: [{ title: '诺贝尔文学奖官网', url: 'https://www.nobelprize.org/prizes/literature/2000/summary/' }], status: 'verified' },
    { id: 'evt-moyan-nobel', title: '莫言获诺贝尔文学奖', type: 'author', precision: 'year', year: 2012, location: '斯德哥尔摩', summary: '莫言获诺贝尔文学奖，评委会称其作品融合民间故事与当代现实。', sources: [{ title: '诺贝尔文学奖官网', url: 'https://www.nobelprize.org/prizes/literature/2012/summary/' }], status: 'verified' },
    { id: 'evt-zhiping-circulate', title: '《红楼梦》脂评本开始流传', type: 'publication', precision: 'unknown', year: null, location: '', summary: '带有脂砚斋批语的抄本开始在小范围内传阅，具体起始年份学界尚无定论。', sources: [], status: 'pending' }
  ]
}

async function readTimeline() {
  try { return JSON.parse(await fs.readFile(timelineFile, 'utf8')) } catch { await fs.mkdir(dataDir, { recursive: true }); await fs.writeFile(timelineFile, JSON.stringify(timelineSeed, null, 2)); return structuredClone(timelineSeed) }
}
let timelineQueue = Promise.resolve()
async function writeTimeline(data) { timelineQueue = timelineQueue.then(async () => { await fs.mkdir(dataDir, { recursive: true }); await fs.writeFile(timelineFile, JSON.stringify(data, null, 2)) }); return timelineQueue }

// 规范化单条事件：宽容地修正可修复的字段，无法修复时抛出带行级信息的错误
function normalizeTimelineEvent(raw = {}) {
  const title = String(raw.title ?? '').trim()
  if (!title) throw new Error('缺少事件标题')
  if (!EVENT_TYPES.includes(raw.type)) throw new Error(`类型无效（需为 ${EVENT_TYPES.join(' / ')}）`)
  let year = raw.year
  if (typeof year === 'string') { const m = year.match(/\d{3,4}/); if (!m && year.trim()) throw new Error(`年份无法识别：${JSON.stringify(raw.year)}`); year = m ? Number(m[0]) : null }
  if (year != null) { if (!Number.isFinite(year) || year < 0 || year > 2100) throw new Error(`年份无法识别：${JSON.stringify(raw.year)}`); year = Math.round(year) }
  let endYear = raw.endYear
  if (typeof endYear === 'string') { const m = endYear.match(/\d{3,4}/); endYear = m ? Number(m[0]) : null }
  if (endYear != null && (!Number.isFinite(endYear) || endYear > 2100 || (year != null && endYear < year))) endYear = null
  let precision = EVENT_PRECISIONS.includes(raw.precision) ? raw.precision : null
  if (!precision) precision = year == null ? 'unknown' : endYear ? 'range' : 'year'
  if (precision === 'range' && (year == null || endYear == null)) precision = year == null ? 'unknown' : 'year'
  if (precision !== 'unknown' && year == null) throw new Error('缺少年份（仅 precision 为 unknown 时可缺省）')
  let date = null
  if (precision === 'exact' && raw.date) { const d = new Date(raw.date); if (!Number.isNaN(d.getTime())) date = d.toISOString().slice(0, 10) }
  const sources = Array.isArray(raw.sources) ? raw.sources.map(s => { if (typeof s === 'string') return { title: s.trim() }; if (s && typeof s === 'object') return { title: String(s.title || '').trim(), url: typeof s.url === 'string' && /^https?:\/\//.test(s.url.trim()) ? s.url.trim() : undefined }; return null }).filter(s => s && s.title) : []
  const status = sources.length === 0 ? 'incomplete' : (raw.status === 'verified' ? 'verified' : 'pending')
  const sortYear = year == null ? null : precision === 'decade' ? year + 5 : precision === 'range' && endYear ? Math.round((year + endYear) / 2) : year
  return { id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `evt-${crypto.randomUUID()}`, title, type: raw.type, precision, year, endYear: precision === 'range' ? endYear : null, date, sortYear, location: String(raw.location ?? '').trim(), summary: String(raw.summary ?? '').trim(), sources, status }
}

function displayDateOf(e) {
  switch (e.precision) {
    case 'exact': if (e.date) return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(e.date)); return `${e.year} 年`
    case 'year': return `${e.year} 年`
    case 'circa': return `约 ${e.year} 年`
    case 'decade': return `${e.year} 年代`
    case 'range': return `${e.year}–${e.endYear} 年`
    default: return '时间待定'
  }
}

// 合并重复事件（同类型 + 同排序年 + 规范化标题相同），汇总来源并保留最佳审核状态
function processTimeline(events) {
  const map = new Map(); let merged = 0
  for (const e of events) {
    const key = `${e.type}|${e.sortYear ?? 'na'}|${e.title.replace(/[\s《》〈〉"''·、]/g, '').toLowerCase()}`
    const hit = map.get(key)
    if (hit) {
      merged++; hit.mergedCount = (hit.mergedCount || 1) + 1
      const known = new Set(hit.sources.map(s => s.title))
      for (const s of e.sources) if (!known.has(s.title)) { hit.sources.push(s); known.add(s.title) }
      if (hit.sources.length && hit.status === 'incomplete') hit.status = 'pending'
      if (e.status === 'verified') hit.status = 'verified'
      if (!hit.summary && e.summary) hit.summary = e.summary
      if (!hit.location && e.location) hit.location = e.location
    } else map.set(key, { ...e })
  }
  const list = [...map.values()].map(e => ({ ...e, displayDate: displayDateOf(e) })).sort((a, b) => (a.sortYear ?? 1e9) - (b.sortYear ?? 1e9) || a.title.localeCompare(b.title, 'zh-Hans-CN'))
  const stats = { total: list.length, merged, incomplete: list.filter(e => e.status === 'incomplete').length, pending: list.filter(e => e.status === 'pending').length, unknownTime: list.filter(e => e.sortYear == null).length }
  return { events: list, stats }
}

app.get('/api/timeline/events', async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return
  const store = await readTimeline()
  const valid = []; let skipped = 0
  for (const raw of store.events) { try { valid.push(normalizeTimelineEvent(raw)) } catch { skipped++ } }
  res.json({ ...processTimeline(valid), skipped })
})

app.post('/api/timeline/import', async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return
  const list = req.body?.events
  if (!Array.isArray(list) || list.length === 0) return res.status(400).json({ error: 'EMPTY_IMPORT', message: '没有可导入的事件数据' })
  if (list.length > 500) return res.status(400).json({ error: 'TOO_LARGE', message: '单次最多导入 500 条事件' })
  const store = await readTimeline()
  const valid = []; const errors = []
  list.forEach((raw, i) => { try { valid.push(normalizeTimelineEvent(raw)) } catch (err) { errors.push({ index: i + 1, title: typeof raw?.title === 'string' ? raw.title : '', message: err.message }) } })
  if (valid.length) { store.events = store.events.concat(valid); await writeTimeline(store) }
  const all = []; let skipped = 0
  for (const raw of store.events) { try { all.push(normalizeTimelineEvent(raw)) } catch { skipped++ } }
  const payload = { imported: valid.length, errors, skipped, ...processTimeline(all) }
  res.status(valid.length === 0 ? 400 : 200).json(valid.length === 0 ? { ...payload, error: 'IMPORT_FAILED', message: '没有事件通过校验，请根据提示修正后重试' } : payload)
})

app.use(express.static(path.join(__dirname, 'dist')))
app.get(/.*/, (req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(path.join(__dirname, 'dist', 'index.html')))
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'SERVER_ERROR', message: '服务器暂时开小差了' }) })
app.listen(PORT, () => console.log(`Novelverse API running at http://localhost:${PORT}`))
