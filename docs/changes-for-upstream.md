# dsh-local-usage 功能增强清单（Zeraphyms）

基于 upstream/main（15e2a96，release 0.9.2），共 2 个提交、24 个文件、+1279/−154 行。
lib/ 构建产物随提交更新，未改动 cordis.patch.yml / package.json / README.md / pnpm-lock.yaml。

## 1. 统计页新增「按会话」表

- 「按模型」「按项目」之下新增第三张表，格式与另两张一致（会话 / 总 tokens / 花费 / 调用次数）。
- 行显示会话标题（无标题显示「未命名会话」），下方以小字附工作目录与会话 id。
- 数据来自报告已有的 sessions 数组（title 由 foldSessionTitle 折叠并持久化于 fold-cache），聚合层零改动。
- **行可点击**：点击打开调用明细页并自动按该会话过滤。

## 2. 调用明细：搜索框替换为「会话」「项目」两个精确下拉

- 移除自由文本搜索。原因：标题含同一关键词的多个会话会被合并计数，精确选择消除歧义。
- 「会话」下拉：选项 = 会话标题（附调用次数），值 = 会话 id，查询走已有的 session 参数（精确 id）。
- 「项目」下拉：选项 = 工作目录短名，值 = 完整路径；查询协议新增 project 参数（按 cwd 精确匹配，URL 参数上限 400 字符）。
- 两个下拉与「模型」下拉同规则：**facets 描述时间窗口而非当前筛选**，所以筛选不会收窄可选列表。
- 报告新增 sessionFacets / projectFacets 字段（每会话/每目录的 calls 与 cost，按花费降序），wire 层对旧宿主有空数组兜底。

## 3. 统计范围调整

- 移除「本季度」（自定义范围跨约 3 个月时波形仍按周分桶，内部能力保留）。
- 新增「近24小时」：时钟边界（now-24h → 今天结束），不是两个日历日；波形复用 144 个北京钟点切片并抽稀到每小时一个点——跨两天的同一钟点花费相加，如实反映"一天里何时花钱"。
- 新增「全部」：无界窗口（from=0）。波形单独分支按月聚合，只绘制有数据的月份（避免按天画两万个空点）；日历热力图仍固定 52 周，不受影响。

## 4. 计价页新增「新增模型」表单

- 为窗口中尚未出现过的模型预写价卡：匹配规则 + 四桶价格 + 可选「按高峰计价」展开第二组价格。
- 校验：匹配规则非空且不与已有卡片重复（重复时提示去上方列表编辑）；价格为非负数字，至少填一项。
- 走现有 UsagePricingUpdate 协议写入 pricing.json；pricingOptions 对配置外的新 match 本就会升格为独立卡片（"price a model that ships without a card"），本 UI 是这条既有能力的入口。
- 空窗口（无可编辑行）时同样可用，可添加第一张卡。

## 5. 测试

- 新增用例：h24 / all 的区间边界、两种波形分桶、会话 facet 夹具。
- calls.host(10) + stats-tables(4) + wire-calls(2) + range + wave + locales 等纯逻辑套件全绿（118 断言）。
- 全量 173 断言 0 失败；11 个套件文件在本机因缺 harness checkout 无法加载（缺 @deepseek-ai/* 宿主包链接），其失败集合与 main 基线完全一致（git stash 对照验证），与本次改动无关。

## 文件清单

src/calls.ts, src/types.ts, src/host/http-routes.ts,
src/client/{StatsTables,CallsPage,UsagePanel,AddRateCard,useCallsQuery,wire-calls,range,wave,classes,locales}.tsx/ts,
src/client/styles/{summary,wave}.ts,
tests/{range,wave,calls-page.interaction,stats-tables,usage-panel.interaction}.client.spec.ts,
lib/{index.js,client.js,client.js.map}
