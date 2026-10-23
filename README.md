# Tibo Reset 重置日历

静态 HTML、CSS 与 ES modules，无框架、构建步骤、外部字体或 CDN。面向 GitHub Pages；本次仅提供本地实现，不表示已经发布或接入线上数据。

## 本地检查

需要 Node.js 22 或更新版本，测试使用 Node 内建测试器：

```sh
node --test tests/model.test.mjs tests/validate-public.test.mjs
node scripts/validate-public.mjs
python -m http.server 8000
```

浏览器打开 `http://localhost:8000/`。不要直接双击 HTML：模块与公开 JSON 需通过 HTTP 加载。

## 公开数据边界

页面只读取 `./data/calendar.json`，格式为 `calendar_schema_version: 1`。当前文件包含已批准的历史公开导出：18 篇来源、6 组事件或承诺、16 篇完整原文与 2 篇单独标注的摘要。公告发布时间用于历史浏览，实际执行日期均未知，不计入已确认 Reset 次数或发生日期。后续更新由私有邮件处理端完成核实、公开审批与白名单导出，再经校验原子替换此文件；前端不直接读取邮箱。`tests/fixtures/calendar_public_v1.json` 是合成契约夹具，只用于离线测试，不能替代生产数据。

私有处理端必须先完成核实、原文公开审批、逐字段白名单导出与安全校验，再原子替换公开 JSON。这里不保存核实映射、邮件正文、账号、凭据、私有日志或部署配置。前端再次验证精确字段、来源身份、日期精度、关联外键和安全 URL；网络、解析或校验失败显示“数据暂不可用”，不伪装成空记录。

URL 还会按 query 与带赋值的 OAuth/路由 fragment 参数名阻断 access_token 等明确凭据及 AWS/Google 签名凭据。检查支持参数名大小写、下划线/连字符/空格、多层 percent 编码和 &、;、? 分隔，与 Python 公开出口一致；仅检查解码副本，绝不删参数或改写原链接。普通安全 query 与无赋值锚点保持原样。原文为 null 也不能跳过 URL 门；模型入口、DOM 链接入口与 Pages 仓库/包验证共用该规则。

## 推文日历与展示

页面按来源的 `published_at` 展示推文，不把它作为执行日期。初次载入打开最近的已有推文日期；月历、全年概览、月份切换和返回本月保留。日期上的数量只表示收录推文数量。

详情仅显示发布时间、默认展开的原文及原帖链接。两篇没有完整原文的来源显示单独标注的“摘要”与链接，不把摘要伪装为原文。页面不显示事件类型、完成状态、核实字段、执行次数统计、状态筛选或待核实列表。底层公开数据、验证规则与执行日期统计函数保留不变，界面精简不会把未知值变为已知。

文本使用 `textContent`，不注入 HTML；原帖链接经过安全验证，并使用 `noopener noreferrer` 隔离新窗口。

## 发布

仓库目标为 `skommando/reset-notice-page`，发布分支为 `main`。`.github/workflows/pages.yml` 只在 main 推送或人工触发后运行：先执行 Node 契约/包验证测试与仓库白名单检查，再将明确的 `index.html`、`assets/`、`data/`、`CNAME` 复制到独立临时目录，并再次按站点包白名单验证。上传只指向该临时目录，绝不上传仓库根、tests、README 或验证脚本。站点包仅含 6 个固定文件，新增资产须同步更新白名单并评审。

仓库校验命令默认为本检出目录；站点包可用 `node scripts/validate-public.mjs --artifact /path/to/site-package` 复验。额外目录/文件、软硬链接、错误域名、非法 UTF-8/JSON、schema 或敏感公开字段均阻断，错误不会打印敏感值。合成契约夹具只存在于测试目录，不能进入站点包。

工作流所有直接引用使用实施时通过官方仓库只读查询核实的完整提交 SHA：checkout v5.1.0、setup-node v6.1.0、configure-pages v5.0.0、upload-pages-artifact v4.0.0、deploy-pages v4.0.5。构建只有 contents:read 与读取现有 Pages 配置所需的 pages:read；部署单独取得 pages:write 与 id-token:write，使用 github-pages 环境与 main 分支门。checkout 不保存凭据，不安装应用依赖或配置新的持久访问令牌。

`CNAME` 内容为 `reset.amm907.com`，作为兼容声明保留。[GitHub 官方自定义域名说明](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)明确：使用自定义 Actions workflow 时 GitHub 不要求 CNAME，也忽略已有 CNAME；仓库 Settings → Pages 的 Custom domain 才是域名配置依据。CNAME 不能证明 DNS 或 HTTPS 已正确。必须另行核对 Pages 发布源为 GitHub Actions、域名检查和 Enforce HTTPS。

本次只在本地实现工作流，未执行真实推送、Pages 部署、DNS 修改或线上 HTTPS 验证。推送成功只表示提交送达；需再核对[官方自定义工作流要求](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、实际 workflow 结果、HTTPS 页面、线上 JSON 摘要及部署版本，才可报告上线。失败时保留上次成功版本。

## Unicode 契约一致性

公开文本、URL 空白、ASCII 忽略大小写匹配及词边界使用与生成端相同的 Python Unicode 15.0 明确谓词。原始字符串不做清洗或正规化。词字符范围为完整的 Unicode 字母/数字集合与 ASCII 下划线，不依赖不同浏览器自己的 Unicode 版本。tests/fixtures/unicode_public_predicates.json 是生成端验证过的 100 个合成回归向量。

全年小格保留概览；手机可点按高度至少 44px 的月份标题进入更大的月历，再选择具体日期。

## 可选公开摘要与镜像时间

来源可附带独立的 `summary_zh`：非空、最多 1000 个 Unicode 码点且无控制字符。它只显示为“摘要”，绝不填入原文或改变完整性。`publication_basis: "mirror_reported"` 在数据层表示第三方镜像报告，必须保留发布时间待核实字段；推文界面不显示这些元数据，也不宣称 X 官方核实。旧版不含摘要的 schema v1 文件仍有效。

## 28 天挑战与经过小时

主分支仍为原来的 13 个公开仓库文件、6 个站点文件，邮箱协议与 `data/calendar.json` 不变。挑战数据单独存于同仓库 `challenge-data` 分支的 `data/challenge.json`；固定读取地址为 https://raw.githubusercontent.com/skommando/reset-notice-page/refs/heads/challenge-data/data/challenge.json 。该分支不会触发仅监听 main 的 Pages workflow，也不进入 VPS 日历发布器检出。

`assets/model.mjs` 内保存经过同一校验器验证的初始公开快照。浏览器立即显示快照，最多等待远端 6 秒；失败、错误结构、过旧版本或未来版本退回有日期标注的快照。远端不能提供任意地址或代码，所有内容使用 `textContent`。更新日期表示资料核对时刻，不是执行时间。浏览器按分钟更新经过小时，可见时每分钟重新读取挑战数据，恢复可见时立即重算并重新读取。数据更新后统一派生最近完成重置与经过小时，不保存会过期的时长。并发刷新合并为一次请求；远端失败、校验失败或版本回退保留上次有效资料并标记更新不可用，不用初始快照覆盖已成功读取的新资料。未来锚点不显示为零。

读取器兼容挑战契约版本 1 与 2，根字段严格固定为 `schema_version, updated_at, pledge_url, days`。时间为 UTC 毫秒 ISO 格式；日期有真实日历校验。days 按显式 Day 编号递增，不得重复或超出 1–28；缺少的编号只显示“待发布”，不推算日期或改进。每一天包含 title_zh、summary_zh、improvements、sources、reset；改进与完成事实必须关联同一天的来源，链接仅允许作者的规范 X 状态 URL。source 的 time_basis 保留 mirror_reported / id_inferred / verified，role 为 announcement / completion / execution。reset 为 null，或包含 kind、status、completion_source_url、executed_at、execution_source_url 的完整对象；无执行时间时后二者必须均为 null。completed 必须对应 completion 来源；新增实际执行时间必须先核实原帖明确陈述了该时间及精度，单有合法 JSON 不代表事实已经核实。

经过小时先按完成公告时刻选取最近一轮已完成的用量重置，再优先使用该轮有证据的实际执行时间，否则按完成公告计算。预存重置发放不进入此计时。界面明确展示所选完成轮次与计算依据；没有明确截止时间或尚未到期的较新 Day 重置预告不重启计时。按用户指定的展示规则，v2 中有作者来源的明确截止时间一旦到达，较新轮次可显示“推定已执行”，以该截止时间估算经过小时，并明确“未经执行确认”。这不是已核实完成或实际执行时间；同一轮出现完成证据后优先使用完成证据，新一轮到期推定可以替代较旧已完成轮次。实际执行时间未知时始终标注“按完成公告计算”，不将其写成执行时间。

后续维护：既有助手任务确认 reset 通知邮件 SENT 后核对公开资料，仅在该数据分支提交经过 validateChallenge / parseCalendarJSON 校验的 JSON；不改变通知判定、NOTICE_DATA_V1 或把任意邮件 JSON 直接公开。发布时先重读数据分支当前 HEAD，以固定父提交普通更新，冲突时重新核对；不强推。每次 main 前端代码上线都需受控同步 VPS 日历发布检出，此后数据分支更新不需同步。日历发布器要求远端 main 与本地 HEAD 一致，只 fetch 而不自动快进；未经同步直接发布前端会使后续日历发布返回 conflict。上线前须确认发布检出干净且无待发送成品，以现有锁协调暂停写入、普通快进同步并复核；脏检出或待处理状态须停止并人工处理，不强推、不覆盖日历内容。

独立数据文件校验（路径按实际文件替换）：

```sh
node --input-type=module -e "import {readFileSync} from 'node:fs'; import {validateChallenge,parseCalendarJSON} from './assets/model.mjs'; validateChallenge(parseCalendarJSON(readFileSync(process.argv[1],'utf8'))); console.log('Challenge data validated.');" /path/to/challenge.json
```

### v2 计划截止时间与迁移

v2 的每个非 null reset 对象必须另有 planned_deadline_at 与 planned_deadline_source_url，两者同时为 null 或都有值。时间仍为 UTC 毫秒 ISO 格式，关联同 Day 的 announcement 来源，且不能早于该来源发布时间。该值仅记录作者明确的计划截止时间，不能从摘要自由解析或从第三方跟踪推定，也不是实际执行时间。banked_reset_grant 始终排除在计时外；status 和 executed_at 保留证据语义，不写入推定结果。时间流逝本身可触发页面推定，无需手动改 JSON 或重新加载。

发布顺序必须为：新前端上线且验证 v1 正常 → 重读 challenge-data HEAD，合并迁移为 v2 → 校验、普通提交并核对远端读取。旧前端不支持 v2，会拒绝并退回旧快照，所以不能提前提交数据升级。迁移时保留全部历史和资料核对时间；先只增加已核实的明确计划截止及原帖关联。v2 前端仍兼容原 v1 数据，无计划字段的旧记录不自动推算。

事实来源验证、实际浏览器跨域读取及 Pages 上线验证独立于离线模型测试，不以单元测试代替。
