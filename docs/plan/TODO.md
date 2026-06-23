# TODO — CastLock-Vis 开发待办（as-built 日志）

> **状态：项目已完成并稳定交付，S0–S6 全部落地。** 本文档现作为「实际交付（as-built）」记录保留；
> 下列里程碑反映最终交付状态，设计与范围决策已冻结。
>
> 本待办把 [`FEATURE_LIST.md`](./FEATURE_LIST.md) 的功能模块排成**可执行顺序**。
> 编号 `Fx.y` 直接对应 FEATURE_LIST 的功能项。
>
> **两阶段视觉兼容（关键约束）**：里程碑 S0–S5 全程处于 DESIGN_SYSTEM **第一阶段（骨架）**，
> 一律使用中性占位 token，专注「结构 + 交互 + 联动」；视觉只到「能区分、可读」为止。
> **第二阶段（完备视觉）= S6**，原则是**只改 `tokens.css` 与 `ViewPanel` 样式，不动任何视图逻辑**。
> 因此 S0–S5 的每个组件都必须满足「禁止硬编码颜色/间距，一律引用 CSS 变量」，否则 S6 无法无缝换肤。
>
> 进度标记：`[ ]` 未开始 · `[~]` 进行中 · `[x]` 完成 · `[-]` 经评估不纳入最终交付（范围决策，非待办）。

---

## 排序原则

1. **先骨架后视图，先静态后联动**：搭好壳与数据脊柱 → 各视图先用**全量数据**独立渲染 → 最后接联动。
2. **联动是评分核心**：联动链路（S4）优先级高于单视图的视觉精度；任何视图在 S2/S3 完成时就必须已保留联动所需标识符（actorId / seqIndex / tau / clusterId）。
3. **由简到繁排视图**：A（散点）、D（矩阵）结构简单先做并打通「最短联动闭环（A→D）」；B（流图+熵线）、C（对齐分叉）较复杂随后。
4. **粒度**：每个 checkbox 约为 0.5–1 天可验收的工作量；带 **(P1/P2)** 者为非阻塞增强，可延后。

---

## S0 · 开发环境（前置，已由配置任务交付）

> 详见 [`docs/contribution/config.md`](../contribution/config.md)。此里程碑为后续一切工作的前提。

- [x] 前端工程脚手架：Vite + React 18 + TS（`npm install` / `npm run dev` / `npm run build` 可跑通）
- [x] 代码质量基线：ESLint + Prettier + TS `strict`（F10.3）
- [x] 仓库 `.gitignore`（node_modules / dist / 原始 IMDb 数据 / Python 缓存）
- [x] 流水线复现说明与依赖（`pipeline/requirements.txt`）

## S1 · 应用骨架 + 数据脊柱（框架，P0 · 第一阶段）

> 目标：一个能启动、能加载全部数据、能渲染空白四面板栅格的可运行壳。

- [x] **F1.3** `styles/tokens.css`：照搬 DESIGN_SYSTEM §1.1 占位变量到 `:root`
- [x] **F1.2 / F1.4** `App.tsx` 布局壳 + `ViewPanel` 统一外框（标题/工具条位/图例位/内容/空·加载·错误态）
- [x] **F2.1** `data/types.ts`：6 份契约的 TS 类型（对齐已生成 JSON 的实际字段，见 FEATURE_LIST F0.8–F0.10）
- [x] **F2.2** `data/loadData.ts`：启动一次性 fetch 6 JSON + 轻量形状校验
- [x] **F2.3** 数据索引：`actorsById` / `filmsByActor` / `markovBy(cluster,stage)` / `alignmentByActor`
- [x] **F1.5** 全局加载/错误边界（`DataProvider` + `ViewPanel` 的 loading/empty/error 态）
- [x] **F2.4** `store/useVizStore.ts`：交互状态字段 + actions（brush/选择/stage/过滤器/详情）
- [x] **F2.5 / F2.6** `store/selectors.ts` + `lib/aggregate.ts`：派生数据脚手架（cohort 成员 / cohort 平均熵 / 过滤矩阵 / 重分层）

**验收**：`npm run dev` 显示 Header + 2×2 空面板；控制台确认 6 份 JSON 全部加载且类型校验通过。

## S2 · 静态视图 A 与 D + 最短联动闭环（视图，P0 · 第一阶段）

> 先做结构最简的两视图，并打通第一条联动（A→D），尽早验证「联动脊柱」可用。

- [x] **F3.1 / F3.2** ClusterView 静态散点：`projection` 坐标 + `dominantEarlyGenre` 着色 + 悬停 Tooltip（已增强：簇图标 + 凸包）
- [x] **F6.1 / F6.2 / F6.5** MarkovView 静态热力矩阵：色阶 + 行列标签 + 单元格 Tooltip + 对角线强调
- [x] **F6.3** MarkovView 阶段切换 Toggle（early/mid/late，写 `markovStage`）
- [x] **F3.3 / F3.4** ClusterView `BrushLayer` 框选 → 写 `brushedActorIds` + 选中/降明度视觉态（指针拖框矩形，空白点击清除）
- [x] **F8.1（A→D 部分）/ F6.4** 联动：selectors（`getDominantClusterId`→`getMarkovMatrixForCohort`）+ App 接线就绪，brush 触发端落地后 A→D 全闭环

**验收**：在 A 框选一个群落，D 立即切换为该群落矩阵；切换阶段 Toggle 矩阵随之更新；清除选区回到全局态。

## S3 · 静态视图 B 与 C（视图，P0 · 第一阶段）

> 两个定制图表，最耗时。完成后四视图均可独立渲染。

- [x] **F4.1** RiverView Streamgraph：横轴=作品序列 1..N、流厚度=滑动窗口类型比例
- [x] **F4.2** RiverView 叠加白色香农熵折线（`entropy.json`）
- [x] **F4.3** RiverView 每部电影圆点：评分/票数编码（位置或大小）
- [x] **F4.6** RiverView 单演员/群落两模式切换 + 空态：brush 空=单演员态、brush 非空=群落平均态（平均熵线 + 群落平均流带）
- [x] **F5.1** AlignmentView 对齐坐标系：`tau` 横轴 + T=0 竖轴标记（`alignment.json`）
- [x] **F5.2 / F5.5** AlignmentView 左侧低熵窄束 + 右侧绿/红分叉区（按 `outcome`）

**验收**：B 能渲染单演员河流+熵线、也能渲染群落平均态；C 能把全部对齐演员按 τ 对齐并按 outcome 分绿/红。

## S4 · 完整联动链路（联动，P0 · 第一阶段 · 评分核心）

> 把四视图焊成一个分析闭环。本里程碑权重最高。

- [x] **F4.4** 链路 1 消费端：RiverView 响应 `brushedActorIds` 渲染**群落平均叠加态**熵衰减（新增 `averageCohortGenreBands`/`getCohortGenreBands` 聚合，仅汇总 `dominantGenre` 占比）
- [x] **F8.1** 链路 1 完整收口：A.brush → B（平均态）+ D（cohort×stage）同步联动
- [x] **F4.5** 链路 2 触发：RiverView 作品圆点可点击 → 写 `selectedActorId + selectedFilmIndex`（再次点击/点空白取消）
- [x] **F5.3** 链路 2 消费：AlignmentView 单分类器（selected/peer/context）高亮该演员 + **同 clusterId 同侪**（按 outcome 分绿/红）+ 选中 τ 辅助线；亦可由 A 单击演员触发
- [x] **F7.1** 链路 2 详情：`DetailsPanel` 展开转型窗口 `[sel±2]` 微观数据（相对 T=0 前基线的评分↑/票房↓ 方向标记）
- [x] **F5.4** 链路 3：AlignmentView 全局控制变量过滤器（导演异质性/票房/评分，`RangeSlider`）动态重分层（in-filter 绿/红、out-of-filter 淡灰）
- [x] **F8.4** 联动一致性：跨视图统一用 `--color-accent` 高亮；A 空白清 brush、B 空白/再点清选择、C 重置滤镜，各自回全局态

**验收**：能完整复现 proposal §3 的三个联动场景（群落基线探查 / 转型窗口期微观审计 / 控制变量生存审计）。

## S5 · 通用控件、打磨与部署（P0–P1 · 第一阶段收尾）

- [x] **F7.2 / F7.3** `Legend` + `Tooltip` 统一组件，各视图复用：新增 `components/common/ChartLegend`、`GenreColorLegend`、`ChartTooltip`；四视图图例与底部 hover/状态提示均改为通用组件承载
- [x] **F7.4 / F7.5 / F7.6** `controls/Slider` `controls/Toggle` `controls/BrushLayer` 抽成通用控件：`controls/Toggle` + `controls/RangeSlider` + `controls/BrushLayer` 均已抽成通用件；ClusterView 改为引用 `BrushLayer`（store 接线留在视图层，控件本身 store 无关）
- [x] **F1.6** 响应式与最小可用宽度：新增全局最小宽度与布局尺寸 token；桌面双列、中宽单列、窄屏保持 `--app-min-width` 横向可滚动；面板标题/图例/tooltip/过滤器/详情面板均补充换行、最小高度与小屏布局规则
- [x] **F8.5 (P1)** 联动可发现性：新增 `InteractionGuide` 联动状态条，实时显示 A→B/D cohort 队列、A/B→C 选中演员/详情状态、C 控制变量过滤状态，并给出每条链路的触发入口提示
- [x] **F3.5 (P1)** ClusterView 群落 hull / 密度底纹（已做凸包 hull + 每簇图标；密度底纹未做）
- [x] **F10.1** `vite.config.ts` 设 `base`，确认 `dist/` 含 `data/*.json`
- [x] **F10.2** GitHub Actions：新增 Pages workflow，push main / 手动触发后执行 `npm ci` → `npm run build` → upload `dist/` → deploy-pages
- [x] **F0.8 / F0.9 (P1)** `clean_expert.py` 已引入 `primaryTitle`，pipeline 优先写可读 `films.title`（`tconst` 存 `films.titleId`）；`films.json` 新增逐片 `directorName` + `directorHeterogeneity`，详情面板展示可读片名与当前作品局部导演异质性；流水线已重跑落盘

**验收**：Pages 部署成功，子路径下静态资源与数据可达，三联动在线可用。

## S5.5 · 交互与布局前置改造（P0–P1 · S6 前置）

> 目标：在进入 S6 视觉定稿前，收口会妨碍视觉换肤与后续调参的交互、布局和语义问题；允许少量视图逻辑 / 布局接线改造，但保持既有数据流与三条联动主语义不变。

- [x] **DetailsPanel 鼠标拖动替代方向按钮**：标题栏支持 Pointer Events 拖动，关闭按钮不参与拖动；方向键作为无障碍后备保留，方向按钮不再作为主交互暴露。
- [x] **四视图空间重新分配 + 参数化布局**：`ViewPanel` 支持命名 area，顶层 grid 改为可通过集中 CSS 变量调整 A/B/C/D 空间比例。
- [x] **视图 A 增加 cluster composition 摘要图 + 点击柱子选择 cluster**：A 内新增 cluster 构成柱状摘要，点击柱子进入该 cluster cohort，并可查看该 cluster 内 dominantEarlyGenre 构成后返回总览。
- [x] **视图 A 单选 / 圈选交互状态修复**：统一 active selection 规则，单选与圈选互相覆盖；清空圈选时回退 cached 单选，视觉高亮与写入 store 的 actor/cohort 保持一致。
- [x] **视图 B cohort 模式语义修正 + B→C 联动保留**：cohort 模式只做群体概览，不再显示可点击峰值 / 打开详情；单演员模式下作品点与峰值仍可触发 B→C 与详情联动。
- [x] **Markov 矩阵仅在单 cluster 语义下显示**：D 只在单演员或单 cluster cohort 下显示矩阵，多 cluster cohort 显示明确空态，不再隐式选多数 cluster。

**验收**：
1. `DetailsPanel` 可拖动且关闭正常；四视图使用命名 grid area，默认布局下 D/C 空间分配合理，并可通过集中变量继续调参。
2. A 同时支持自由框选和 cluster 摘要柱选择 cohort，摘要可在全局 cluster composition 与单 cluster 类型构成之间切换。
3. A/B/C/D 遵循同一 active selection 规则：圈选优先、清空圈选回退 cached 单选，视觉高亮与联动数据一致。
4. B 的 cohort 模式不产生单点详情联动；单演员模式下 B→C / DetailsPanel 联动保持可用。
5. D 仅在单点或单 cluster cohort 下显示 Markov 矩阵；多 cluster cohort 不再隐式选择多数 cluster。

## S6 · 第二阶段完备视觉（视觉，P2 · 第二阶段）

> **唯一规则：只改 `tokens.css` 与 `ViewPanel`/视图样式表，不改视图逻辑与数据流。**
> 进入本阶段的前提：S1–S5.5 全部组件已无硬编码颜色/间距，且前述交互/布局前置改造已收口。

- [x] **F9.1** 配色定稿并回填 token：定稿为 Cinemetrics 红/黑/胶片纸金皮肤；中性阶、15 个 genre 分类色、7 个 cluster 分类色、矩阵顺序色阶、绿/红分叉色、交互态与控件填充色均已集中到 `tokens.css`，皮肤色与数据语义色解耦
- [x] **F9.2 / F9.3** 版式与字体字号：本地内嵌 Alata + Playfair Display（`fonts.css`/`src/assets/fonts`，附 OFL），`--font-display/sans/label/mono` 角色就位、原 mono 标签改 label；沿用 4px 节奏；`tabular-nums` 用于 ChartTooltip/RangeSlider 等数字位。**最终交付范围**：字号定为 sm/md/lg 三档（经评估对当前信息密度已足够），不扩为完整 type scale、不额外铺行高/字重 token。
- [x] **F9.4 / F9.5** 图标·坐标轴·T=0 标记 + 克制动效：簇符号图标、坐标轴/网格、C 的 T=0 竖虚线均已规范；hover/单元格过渡 140–180ms、B 熵线入场动画已落地。**最终交付范围**：过渡时长内联于各样式表、不另抽集中 token；未接入 `prefers-reduced-motion`（动效已足够克制，作为最终范围边界）。
- [x] **F9.6** 各视图视觉规范回填：A 点态/hull/簇图标/composition 摘要、B 流配色与白熵线/尖峰环、C 绿/红/灰分叉与滤镜降明度、D 单元格色阶与对角线锁定均已换肤落地（A 密度底纹仍属 F3.5 P1 增强）
- [x] **F9.7** 把定稿色值/字体写回 DESIGN_SYSTEM §1.1/§2 色值与字体表，token 与文档同步（本次对齐）
- [-] **F10.4 (P2)** `films.json`（~4MB）按需懒加载或精简字段 —— **不纳入最终交付**：启动时与其余 5 份契约一同一次性 fetch（`loadData.ts` 的 `Promise.all`），对当前体积与静态部署可接受；保留为已知范围边界。

**验收（已达成）**：换肤后四视图视觉统一、达成「Cinemetrics / Film-Paper on Black」基调，交互逻辑零回归。

---

## 关键路径与并行建议

- **关键路径**：S0 → S1 → S2(联动脊柱验证) → S3 → **S4(联动)** → S5 → **S5.5(交互/布局前置改造)** → S6。
- **可并行**：S2 完成后，B（S3 前两项）与 C（S3 后两项）可由不同人并行；`Legend/Tooltip/控件`（S5）可在 S2 期间随手抽取。
- **风险点**：① B 的 streamgraph 横轴语义（序列号非年份）易做错；② C 的 T=0 对齐（x 轴）须严格按 `alignment.json` 的 `tau`；**同侪界定改用 `clusterId`**（tau/t0 因窗口固定 + t0 高度集中而失效，见 F5.3）；③ A→D 联动的群落粒度（F0.10）不要误做成实时重算。
