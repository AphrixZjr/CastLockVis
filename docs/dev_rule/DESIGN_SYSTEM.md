# DESIGN SYSTEM — CastLock-Vis

> 视效设计分两阶段推进。**第一阶段**只定组件风格与视图框架，保持简洁但具备良好可扩展性；
> **第二阶段**给出完备视觉方案（设计关键词、配色、版式、字体字号等）。
> 所有 token 以 CSS 自定义属性承载，第一阶段先占位、第二阶段填值，二者无缝衔接。
> 配色与技术栈见 `docs/dev_rule/ARCHITECTURE.md`，分析语义见 `docs/overall_design/proposal.md`。

---

## 第一阶段 · 组件风格与视图框架（Skeleton）

目标：在不锁死最终视觉的前提下，先搭出**可运行、可联动、可替换皮肤**的骨架。
阶段一全程使用中性灰 + 少量功能色，把注意力放在结构与交互上。

### 1.1 设计 token（CSS 变量）

所有视觉常量集中在 `src/styles/tokens.css` 的 `:root`，组件只引用变量、不写死数值。
> **现状**：阶段二（S6）已把 Cinemetrics 皮肤定稿值回填到此处，下方代码块即 `tokens.css` 的实际内容；
> 第一阶段的中性占位值已被替换。换肤仍只改这一份 token（+ `fonts.css` / `ViewPanel` 样式），不动视图逻辑。
> 完整色值/字体说明见下方 §2.2 / §2.4。

```css
:root {
  /* 间距标尺 (4px 基准) */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-6: 24px; --space-8: 32px;

  /* 布局尺寸（最小可用宽度 / 面板与图表最小高度，供响应式与重排使用） */
  --app-min-width: 720px;        --panel-min-width: 520px;
  --chart-min-height: 220px;     --chart-mobile-min-height: 260px;
  --panel-state-min-height: 120px;   --panel-toolbar-min-height: 20px;
  --panel-legend-min-height: 26px;   --panel-mobile-row-min-height: 360px;

  /* 圆角 / 边框 / 浮层阴影 */
  --radius-sm: 1px; --radius-md: 2px;
  --border: 1.5px solid var(--color-border);
  --shadow-panel: 0 18px 48px rgba(0, 0, 0, 0.5);

  /* 皮肤色（Cinemetrics：红 / 黑 / 胶片纸金，详见 §2.2） */
  --color-bg: #10100e;          --color-surface: #171715;
  --color-surface-raised: #1c1c1c;
  --color-border: #f1dfba;      --color-border-subtle: #d7c08e;
  --color-text: #f2ead9;        --color-text-dim: #d7c8a9;
  --color-paper: #eed5af;       --color-paper-deep: #d6c29e;
  --color-paper-text: #191815;  --color-paper-dim: #695941;
  --color-ui-accent: #a43718;   --color-ui-accent-strong: #8d2a11;
  --color-ui-accent-dark: #681c0d;
  --color-ui-rail: #151515;     --color-ui-rail-soft: #222222;

  /* 通用交互/选择高亮：统一用胶片米金色（与下方数据语义色解耦） */
  --color-accent: #eed5af;
  --color-control-fill: #d6c29e;  --color-control-hover: #f4deb8;
  --color-chart-bg: #111210;      --color-chart-grid: #302e29;
  --color-chart-axis: #7d735c;    --color-entropy-line: #e6e8ea;

  /* 数据语义色（与皮肤/交互高亮解耦） */
  --color-markov-cell: #4c8bf5;   --color-markov-diag: #e0564f;
  --color-river-other: #6f91a0;
  --color-success: #3fb27f;       /* 成功转型「多维演化区」 */
  --color-snapback:#e0564f;       /* 被弹回「重新固化区」 */

  /* 类型分类色 ×15（低饱和胶片染料感，见 §2.2.2） */
  --genre-1:#a94f3d; --genre-2:#c08a3c; --genre-3:#9b8f4a; /* ...至 --genre-15 */

  /* Cluster 分类色 ×7（独立维度，复古宝石色，见 §2.2.3） */
  --cluster-0:#b95f3e; /* ...至 --cluster-6 */

  /* 字体（本地内嵌 Alata + Playfair Display，见 §2.4 与 fonts.css） */
  --font-sans:    'Alata', 'Avenir Next', 'Trebuchet MS', 'Gill Sans', sans-serif;
  --font-display: 'Playfair Display', Georgia, 'Times New Roman', serif;
  --font-label:   'Alata', 'Avenir Next', 'Trebuchet MS', 'Gill Sans', sans-serif;
  --font-mono:    'DIN Alternate', 'Roboto Mono', 'SF Mono', ui-monospace, monospace;
  --fs-sm: 12px; --fs-md: 14px; --fs-lg: 18px;
}
```

### 1.2 布局框架

四视图采用 **2×2 面板栅格**，顶部为全局 Header。详情面板 (details-on-demand) 以浮层形式出现，不占用栅格。
实现上拆成**上、下两行各自独立的 grid**（`App.css`），以便上下两行的列宽比例分别调参；列宽与行高全部走
`--layout-*` 变量（见下），改这些 token 即可重排空间分配，不动视图。

```
┌──────────────────────────────────────────────┐
│ Header  CastLock-Vis  · Genre Color Map / 状态  │
├───────────────────────┬──────────────────────┤
│ A  Genre-Space Cluster │ B  Career River       │   ← 上行 grid（cluster | river）
├───────────────────────┼──────────────────────┤
│ C  Transformation      │ D  Markov Gate        │   ← 下行 grid（alignment | markov）
└───────────────────────┴──────────────────────┘
        （DetailsPanel 作为浮层叠加，可拖动）
```

> 注意 C/D 位置：当前下行为 **C(alignment) 在左、D(markov) 在右**（C 较宽以容纳对齐分叉，D 较窄）。
> 可调 token（`App.css`，默认值）：
> 行高 `--layout-top-row: 0.92fr` / `--layout-bottom-row: 1.08fr`；
> 列宽 `--layout-cluster-column / --layout-river-column: 1fr`、`--layout-alignment-column: 1.25fr`、
> `--layout-markov-column: 0.75fr`，并各带 `*-column-min` 最小宽度。响应式在中宽降为单列、窄屏纵向堆叠。

### 1.3 组件清单（阶段一只做骨架，统一外观）

> 实现位置：通用展示件在 `src/components/common/`，控件在 `src/components/controls/`，
> 面板级组件在 `src/components/`。下表为实际落地组件（名称已对齐代码）。

| 组件 | 职责 | 实际形态 |
| --- | --- | --- |
| `ViewPanel` | 每个视图的统一外框：标题栏 + 工具条 + 图例位 + 内容区 + 空/加载/错误态；支持命名 grid `area` | 胶片纸描边卡片，`--radius-md`，统一内边距 |
| `DetailsPanel` | details-on-demand 微观数据展开（转型窗口 `[sel±2]` + 评分↑/票房↓方向标记） | 可拖动浮层（Pointer Events，标题栏拖动、关闭键不参与），方向键无障碍后备 |
| `InteractionGuide` | 联动状态条 + Genre/Cluster 色图例（默认折叠），三条链路实时状态与触发提示，ARIA live | Header 下方状态栏 |
| `common/ChartLegend` / `GenreColorLegend` | 类型/语义色图例，四视图复用 | 色块 + 文字 |
| `common/ChartTooltip` | 悬停信息（数字 `tabular-nums` 对齐） | 暗底小卡片 |
| `controls/RangeSlider` | 控制变量过滤（视图 C，支持线性/对数刻度）、阈值 | 双滑块 + token 描边，store 无关 |
| `controls/Toggle` | 阶段切换（视图 D early/mid/late）、视图 C y 轴切换 | 分段按钮 |
| `controls/BrushLayer` | 视图 A 框选（D3 brush 封装，store 无关） | 半透明选框 |

组件风格基调：**扁平、信息优先**——胶片纸金描边、黑场底、不堆叠阴影，让数据图形成为视觉主体。

### 1.4 可扩展性约定

- 所有视觉常量必走 CSS 变量，组件内禁止硬编码颜色/间距。
- 分类色与语义色解耦：类型色 (`--genre-*`) 用于数据编码，功能色 (`--color-accent/success/snapback`) 用于交互/结论，二者第二阶段可独立调整。
- `ViewPanel` 统一外框，使四视图在阶段二换肤时保持一致；新视觉只改 token 与 `ViewPanel` 样式，不动视图内部逻辑。

---

## 第二阶段 · 完备视觉方案（Full Visual Scheme）

> 阶段二在阶段一骨架上填充最终视觉。以下为完备方案的内容框架与定稿位；
> 具体取值在进入阶段二时敲定并替换第一阶段占位值。

### 2.1 设计关键词

`Cinemetrics`（电影计量资料库）· `Film-Paper on Black`（胶片纸 / 黑场）·
`Cinema Red Accent`（影院红强调）· `Data-Ink First`（数据墨水优先）。
皮肤参考 `docs/references/`（Cinemetrics 数据库 + `ref_style.jpg`）：近黑底（`#10100e`）配暖胶片纸金
文字与描边（`#f2ead9` / `#f1dfba` / `#eed5af`），影院红（`#a43718`）作 UI 强调；标题用 Playfair Display 衬线，
正文/标签/数字用 Alata / mono。**皮肤色与数据语义色解耦**：色彩在数据层只标注**结论**（锁定 / 转型成功 / 被弹回），
呼应 proposal 的「白色熵线、红黑对角线、绿色多维区、红色固化区」意象。

### 2.2 配色方案（已回填，对齐 `tokens.css` 实际值）

基调为 `Cinemetrics / Film-Paper on Black`：近黑暖底、胶片纸金为主、影院红强调。分类色只承担数据编码，功能色承担交互与分析结论；通用交互高亮统一为胶片米金色 `--color-accent`，Markov、River Other、success/snapback 等数据语义色均与皮肤/交互高亮**解耦**。

#### 2.2.1 基础与功能 token

| Token | Hex | 用途 |
| --- | --- | --- |
| `--color-bg` | `#10100e` | 应用背景（黑场） |
| `--color-surface` / `--color-surface-raised` | `#171715` / `#1c1c1c` | 面板表面 / 抬升表面 |
| `--color-border` / `--color-border-subtle` | `#f1dfba` / `#d7c08e` | 胶片纸金描边 / 弱描边 |
| `--color-text` / `--color-text-dim` | `#f2ead9` / `#d7c8a9` | 正文主标签 / 次要文字 |
| `--color-paper` / `--color-paper-deep` | `#eed5af` / `#d6c29e` | 胶片纸面 / 深纸面 |
| `--color-paper-text` / `--color-paper-dim` | `#191815` / `#695941` | 纸面上的暗字 / 纸面弱字 |
| `--color-ui-accent` / `-strong` / `-dark` | `#a43718` / `#8d2a11` / `#681c0d` | 影院红 UI 强调（Header / 工具条等皮肤态） |
| `--color-ui-rail` / `-soft` | `#151515` / `#222222` | 轨道 / 分隔底 |
| `--color-chart-bg` | `#111210` | 图表背景 |
| `--color-chart-grid` | `#302e29` | 图表网格线 |
| `--color-chart-axis` | `#7d735c` | 坐标轴 |
| `--color-entropy-line` | `#e6e8ea` | B/C 白色香农熵线 |
| `--color-accent` | `#eed5af` | hover / focus / selected 通用交互高亮（胶片米金） |
| `--color-control-fill` / `--color-control-hover` | `#d6c29e` / `#f4deb8` | slider thumb / stage tab 等控件填充与悬停态 |
| `--color-success` | `#3fb27f` | C 视图 success / 多维演化 |
| `--color-snapback` | `#e0564f` | C 视图 snapback / 重新固化 |
| `--color-markov-cell` | `#4c8bf5` | D 视图 Markov 非对角线顺序色阶基色 |
| `--color-markov-diag` | `#e0564f` | D 视图 Markov 对角线锁定色 |
| `--color-river-other` | `#6f91a0` | B 视图 top 6 外类型聚合流带 |

> 说明：界面皮肤（红 / 黑 / 纸金 + `--color-ui-*`）与图表内的数据语义色（Markov、success/snapback、entropy、genre、cluster）刻意分离，换皮肤不会改动图表语义。

#### 2.2.2 Genre 分类色（key 对齐 `public/data/genres.json`）

| Genre | Token | Hex |
| --- | --- | --- |
| Crime | `--genre-1` | `#a94f3d` |
| Drama | `--genre-2` | `#c08a3c` |
| Mystery | `--genre-3` | `#9b8f4a` |
| Romance | `--genre-4` | `#b46a7c` |
| Western | `--genre-5` | `#a06f3a` |
| Horror | `--genre-6` | `#8f4e78` |
| Thriller | `--genre-7` | `#3f8a8e` |
| Comedy | `--genre-8` | `#82a84c` |
| Fantasy | `--genre-9` | `#7667a8` |
| Action | `--genre-10` | `#c15f34` |
| Adventure | `--genre-11` | `#669a5a` |
| Sci-Fi | `--genre-12` | `#4f7fa4` |
| Musical | `--genre-13` | `#b07aa0` |
| Music | `--genre-14` | `#5fa08d` |
| Documentary | `--genre-15` | `#8a8674` |

#### 2.2.3 Cluster 分类色（key 对齐 `actors[].clusterId`）

| Cluster | Token | Hex |
| --- | --- | --- |
| 0 | `--cluster-0` | `#b95f3e` |
| 1 | `--cluster-1` | `#b59a45` |
| 2 | `--cluster-2` | `#6b9b58` |
| 3 | `--cluster-3` | `#3e9188` |
| 4 | `--cluster-4` | `#557fa5` |
| 5 | `--cluster-5` | `#7b63a5` |
| 6 | `--cluster-6` | `#a25f7d` |

#### 2.2.4 色彩使用规则

- `--genre-*` 只用于类型 taxonomy 数据编码；B 视图的 `Other` 使用 `--color-river-other`，不复用任一 genre token。
- `--cluster-*` 只用于 A 视图 cluster hull / 图标 / composition 摘要；不要求与 genre 色板互相区分。
- `--color-accent` 保持较亮，用于 hover、focus、selected 边框与联动高亮；大面积控件填充使用更暗的 `--color-control-fill`。
- Markov 矩阵使用 `--color-markov-cell` / `--color-markov-diag`，不得直接耦合 `--color-accent` 或 `--color-snapback`。

### 2.3 版式风格

- **栅格与节奏**：沿用 4px 间距标尺；定义面板内边距、图表 margin（坐标轴留白）、图例与标题间距的标准值。
- **信息层级**：标题 > 视图副标题/指标 > 轴标签 > 数据标注 的明确层级。
- **密度**：高密度但有呼吸感——坐标轴用细线/低对比，网格线尽量省略，强调数据图形。
- **响应式**：以桌面大屏为主（可视分析场景），定义最小可用宽度与栅格降级策略。

### 2.4 字体与字号（已回填）

- **字体族（本地内嵌，见 `src/styles/fonts.css` + `src/assets/fonts/`，附 OFL 许可）**：
  - `--font-display`：`'Playfair Display'`（可变字重 400–900，衬线）——标题 / 主品牌字。
  - `--font-sans` / `--font-label`：`'Alata'`（无衬线）——正文 / UI 标签 / 图例（含原先用 mono 的标签，commit `441e851` 改为 label）。
  - `--font-mono`：`'DIN Alternate' → 'Roboto Mono' → 'SF Mono' → ui-monospace`——数字 / 坐标轴对齐（无本地内嵌，走系统回落）。
  - 两款内嵌字体均 `font-display: swap`，并带本地相近字体回落链。
- **字号阶（最终交付）**：定为 `--fs-sm 12 / --fs-md 14 / --fs-lg 18` 三档；经评估对当前信息密度已足够，**不扩为完整 type scale，也不另定义行高/字重 token**（最终范围决策）。
- **数字排版（最终交付）**：在 `ChartTooltip` / `RangeSlider` 等数字位启用 `font-variant-numeric: tabular-nums`；不强制全局铺到每一处数字（最终范围决策）。

### 2.5 图标与图示

- 极简线性图标（阶段/过滤/展开/帮助），统一描边宽度与尺寸。
- 图例、坐标轴箭头、对齐轴 (T=0) 的视觉标记规范。

### 2.6 动效

- 克制、信息导向：联动切换（cohort 重聚合、矩阵阶段切换、对齐重分层）用 150–250ms 过渡，强调“数据在变”而非装饰。
- **最终交付**：已落地点/轨迹 hover、Markov 单元格等 140–180ms 过渡，B 熵线有 `entropy-glow` 入场动画；过渡时长内联于各样式表、不另抽集中 token，且**未接入 `prefers-reduced-motion`**（动效已足够克制，作为最终范围边界）。

### 2.7 S6 / TODO 回填核对

- `F9.1`：色值、分类色、语义色、交互色已回填至 §1.1 / §2.2。
- `F9.2 / F9.3`：版式与字体角色已回填至 §2.3 / §2.4；未完成项仍按 TODO 保留为 type scale、行高/字重 token、数字位全局 `tabular-nums`。
- `F9.4 / F9.5`：图标/坐标轴/T=0 与现有动效已回填至 §2.5 / §2.6 / §2.8；未完成项仍按 TODO 保留为 motion token 与 `prefers-reduced-motion`。
- `F9.6 / F9.7`：四视图视觉规范与 token/字体文档同步见 §2.8 与本文件色值表。

### 2.8 各视图视觉规范（已落地）

- **A Genre-Space Cluster**：点按 `dominantEarlyGenre` 着色、hover 放大 + `--color-accent` 描边、brush 选区外降明度；每簇凸包 hull（85 分位裁离群、最小半径保小簇可见）+ 簇符号图标；下方 cluster composition 摘要柱（点击柱进入该 cluster cohort，可下钻该簇 dominantEarlyGenre 构成）。**最终交付范围**：以凸包 hull + 簇图标表达群落，未叠加密度底纹（F3.5，经评估非必要）。
- **B Career River Chronology**：滑窗（3 片）类型占比堆叠流，top 6 genre + `--color-river-other` 聚合带；白色 `--color-entropy-line` 熵线 + 入场动画；每部电影圆点按评分（y）/票数（半径）编码、可点击触发 B→C；熵尖峰环（最多 5 个）。
- **C Transformation Alignment**：τ 横轴 + T=0 竖虚线；y 轴 `dist`（默认）/`entropy` 可切；按 outcome 绿（success）/红（snapback）/灰（none 上下文 25% 透明）；选中演员 `--color-accent` 加粗描边、同 cluster 同侪加粗，滤镜外轨迹降至 12% 透明。
- **D Markov Transition Gate**：单元格按概率映射不透明度、`--color-markov-cell` 基色 + `--color-markov-diag` 对角线锁定色；行列 genre 标签、hover tooltip、early/mid/late 阶段切换；仅在单演员或单 cluster cohort 显示矩阵，多 cluster 显示空态。

> 视觉已按上表回填到 `tokens.css` / `fonts.css` / 各视图样式并定稿；后续视觉调整始终改 token，不改视图逻辑。视觉系统按既定范围交付：sm/md/lg 三档字号、无 `prefers-reduced-motion`、无密度底纹、`films.json` 不懒加载——均为最终范围决策（见 `docs/plan/TODO.md` 标记 `[-]` 项），非待办。
