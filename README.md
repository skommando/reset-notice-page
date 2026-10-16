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

## 日期与统计

- 所有日期与时刻为 UTC+8，保留日期、分钟、秒精度。未知时间不补零点，发帖时间、来源核对时间不补执行日期。
- 已确认只用核实执行日期；预告用计划日期，延期用新计划或保留原计划，取消用原计划。来源所述日期单独标明性质待核实。
- 公告发布时间单独显示为信息记录；按来源去重，保留核实、状态 ID 推断或第三方镜像报告（非 X 核实）标记。初次载入优先打开最近的已有记录日期（仍可返回本月）。可按公告日期浏览原文与关联事件，但公告日期绝不代表执行日期。缺少发布时间时不使用邮件接收时间或核对时间补齐。公告层不增加待核实计数，也不改变原有统计卡口径。
- 当前月前三卡为去重的已确认 Reset 次数、执行日期天数、执行 / 计划 / 来源所述日期记录引用的唯一来源帖数（不含独立公告发布时间层）。修订、同事件跨帖、同帖跨事件均不会虚增来源数。
- 第四卡为全局未关联来源帖数与缺项事件数之和，并显示两项分量。事件的关联、类型、状态及适用日期各自核实；资格、原文、发帖时间缺项不会单独增加此卡。
- 类型未知仍可独立证明执行确认；整体 pending/conflict 不能代替关联、状态与执行时间三项的独立确认门。筛选只改变日历和详情，不改变统计卡。
- 月历有信息统一淡紫。全年紫色强度仅表示核实确认次数，其他信息另加轮廓。全年点选日期回到对应月份并更新统计。

公开数据生成时间、来源记录核对范围和覆盖限制在页面“数据覆盖与时间说明”中。核对范围不是监控最新运行时间，空数据也不是完整历史的证明。原文默认折叠，以纯文本显示，来源链接经二次验证并隔离新窗口访问。

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

来源可附带独立的 `summary_zh`：非空、最多 1000 个 Unicode 码点且无控制字符。它只显示为“摘要”，绝不填入原文或改变完整性。`publication_basis: "mirror_reported"` 表示第三方镜像报告，必须保留发布时间待核实字段，不能宣称 X 官方核实。旧版不含摘要的 schema v1 文件仍有效。
