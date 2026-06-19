# DESIGN SYSTEM — CastLock-Vis

> 视效设计分两阶段推进。**第一阶段**只定组件风格与视图框架，保持简洁但具备良好可扩展性；
> **第二阶段**给出完备视觉方案（设计关键词、配色、版式、字体字号等）。
> 所有 token 以 CSS 自定义属性承载，第一阶段先占位、第二阶段填值，二者无缝衔接。
> 配色与技术栈见 `docs/dev_rule/ARCHITECTURE.md`，分析语义见 `docs/overall_design/proposal.md`。

---

## 第一阶段 · 组件风格与视图框架（Skeleton）

目标：在不锁死最终视觉的前提下，先搭出**可运行、可联动、可替换皮肤**的骨架。
阶段一全程使用中性灰 + 少量功能色，把注意力放在结构与交互上。

### 1.1 设计 token（占位，CSS 变量）

所有视觉常量集中在 `:root`，组件只引用变量、不写死数值。第二阶段改这里即可整体换肤。

```css
:root {
  /* 间距标尺 (4px 基准) */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-6: 24px; --space-8: 32px;

  /* 圆角 / 边框 */
  --radius-sm: 4px; --radius-md: 8px;
  --border: 1px solid var(--color-border);

  /* 颜色角色 (阶段一：中性占位值) */
  --color-bg:      #1a1c1f;   /* 应用背景（暗色，呼应白色熵线/红黑对角线） */
  --color-surface: #232629;   /* 面板表面 */
  --color-border:  #34383d;
  --color-text:    #e6e8ea;
  --color-text-dim:#9aa0a6;
  --color-accent:  #4c8bf5;   /* 选中/交互高亮（占位） */

  /* 分叉语义色（视图 C，proposal 明确要求绿/红） */
  --color-success: #3fb27f;   /* 成功转型“多维演化区” */
  --color-snapback:#e0564f;   /* 被弹回“重新固化区” */

  /* 类型分类色：阶段一先用占位序列，第二阶段定稿 */
  --genre-1:#888; --genre-2:#888; --genre-3:#888; /* ... */

  /* 字体（阶段一用系统栈，第二阶段定稿） */
  --font-sans: system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, monospace;
  --fs-sm: 12px; --fs-md: 14px; --fs-lg: 18px;
}
```

### 1.2 布局框架

四视图采用 **2×2 面板栅格**，顶部为全局 Header，承载标题与全局控制（如视图 D 阶段切换、
视图 C 控制变量滑块入口）。详情面板 (details-on-demand) 以浮层/侧栏形式出现，不占用栅格。

```
┌──────────────────────────────────────────────┐
│ Header  CastLock-Vis  · 全局控制                │
├───────────────────────┬──────────────────────┤
│ A  Genre-Space Cluster │ B  Career River       │
├───────────────────────┼──────────────────────┤
│ D  Markov Gate         │ C  Transformation     │
└───────────────────────┴──────────────────────┘
        （DetailsPanel 作为浮层叠加）
```

> 栅格用 CSS Grid，单元格可在阶段二按需调整比例（如 A 与 B 加宽）。布局尺寸全部走 token，便于响应式与重排。

### 1.3 组件清单（阶段一只做骨架，统一外观）

| 组件 | 职责 | 阶段一形态 |
| --- | --- | --- |
| `ViewPanel` | 每个视图的统一外框：标题栏 + 工具条 + 图例位 + 内容区 + 空/加载态 | 灰底卡片，`--radius-md`，统一内边距 |
| `DetailsPanel` | details-on-demand 微观数据展开 | 简单浮层，键值列表 |
| `Legend` | 类型/语义色图例 | 色块 + 文字，占位色 |
| `Tooltip` | 悬停信息 | 暗底小卡片 |
| `controls/Slider` | 控制变量过滤（视图 C）、阈值 | 原生风格 + token 描边 |
| `controls/Toggle` | 阶段切换（视图 D early/mid/late） | 分段按钮 |
| `controls/BrushLayer` | 视图 A 框选（D3 brush 封装） | 半透明选框 |

组件风格基调：**扁平、低饱和、信息优先**——边框轻、留白足、不用阴影堆叠，让数据图形成为视觉主体。

### 1.4 可扩展性约定

- 所有视觉常量必走 CSS 变量，组件内禁止硬编码颜色/间距。
- 分类色与语义色解耦：类型色 (`--genre-*`) 用于数据编码，功能色 (`--color-accent/success/snapback`) 用于交互/结论，二者第二阶段可独立调整。
- `ViewPanel` 统一外框，使四视图在阶段二换肤时保持一致；新视觉只改 token 与 `ViewPanel` 样式，不动视图内部逻辑。

---

## 第二阶段 · 完备视觉方案（Full Visual Scheme）

> 阶段二在阶段一骨架上填充最终视觉。以下为完备方案的内容框架与定稿位；
> 具体取值在进入阶段二时敲定并替换第一阶段占位值。

### 2.1 设计关键词

`Analyst Console`（分析师控制台）· `Cinematic Dark`（影院暗场）·
`Data-Ink First`（数据墨水优先）· `Quiet Precision`（克制精确）。
基调：暗色专业、低饱和中性面、用色彩只标注**结论**（锁定 / 转型成功 / 被弹回），
呼应 proposal 的“白色熵线、红黑对角线、绿色多维区、红色固化区”意象。

### 2.2 配色方案（已回填）

色彩基调为 `Analyst Console / Cinematic Dark`：低饱和、偏冷、专业暗色界面，避免过亮或奶油色。分类色只承担数据编码，功能色承担交互与分析结论；Markov、River Other、控件填充均已与通用交互高亮解耦。

#### 2.2.1 基础与功能 token

| Token | Hex | 用途 |
| --- | --- | --- |
| `--color-bg` | `#1a1c1f` | 应用背景 |
| `--color-surface` | `#232629` | 面板表面 |
| `--color-border` | `#34383d` | 边框 / 分隔线 |
| `--color-text` | `#e6e8ea` | 正文与主标签 |
| `--color-text-dim` | `#9aa0a6` | 次要文字 |
| `--color-chart-bg` | `#202326` | 图表背景 |
| `--color-chart-grid` | `#2c3035` | 图表网格线 |
| `--color-chart-axis` | `#5f6872` | 坐标轴 |
| `--color-accent` | `#4c8bf5` | hover / focus / selected 高亮 |
| `--color-control-fill` | `#356fc8` | slider thumb / stage tab 等控件填充态 |
| `--color-success` | `#3fb27f` | C 视图 success / 多维演化 |
| `--color-snapback` | `#e0564f` | C 视图 snapback / 重新固化 |
| `--color-markov-cell` | `#4c8bf5` | D 视图 Markov 非对角线顺序色阶基色 |
| `--color-markov-diag` | `#e0564f` | D 视图 Markov 对角线锁定色 |
| `--color-river-other` | `#6f91a0` | B 视图 top 6 外类型聚合流带 |

#### 2.2.2 Genre 分类色（key 对齐 `public/data/genres.json`）

| Genre | Token | Hex |
| --- | --- | --- |
| Crime | `--genre-1` | `#6e8fb6` |
| Drama | `--genre-2` | `#9b7fa8` |
| Mystery | `--genre-3` | `#7b88c2` |
| Romance | `--genre-4` | `#b27a8f` |
| Western | `--genre-5` | `#a58a5a` |
| Horror | `--genre-6` | `#9a6a94` |
| Thriller | `--genre-7` | `#5fa0b8` |
| Comedy | `--genre-8` | `#86a86f` |
| Fantasy | `--genre-9` | `#8d7dcd` |
| Action | `--genre-10` | `#c07d62` |
| Adventure | `--genre-11` | `#8fa86a` |
| Sci-Fi | `--genre-12` | `#55aaa3` |
| Musical | `--genre-13` | `#b08bb0` |
| Music | `--genre-14` | `#6eaa91` |
| Documentary | `--genre-15` | `#9aa09a` |

#### 2.2.3 Cluster 分类色（key 对齐 `actors[].clusterId`）

| Cluster | Token | Hex |
| --- | --- | --- |
| 0 | `--cluster-0` | `#5f91b5` |
| 1 | `--cluster-1` | `#58a79b` |
| 2 | `--cluster-2` | `#788cc0` |
| 3 | `--cluster-3` | `#9a80b6` |
| 4 | `--cluster-4` | `#b07a8d` |
| 5 | `--cluster-5` | `#a18d61` |
| 6 | `--cluster-6` | `#74a06e` |

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

### 2.4 字体与字号

- **字体族**：正文/UI 用一款现代无衬线（定稿位，如 Inter / Source Han Sans 兼顾中英）；数字与坐标轴可用 `--font-mono` 强化对齐与可读。
- **字号阶（定稿位）**：在阶段一 `--fs-sm/md/lg` 基础上扩为完整 type scale（如 12 / 13 / 14 / 16 / 18 / 22 / 28），并定义对应行高与字重。
- **数字排版**：启用等宽数字 (`font-variant-numeric: tabular-nums`)，保证矩阵单元格、评分、票房等对齐。

### 2.5 图标与图示

- 极简线性图标（阶段/过滤/展开/帮助），统一描边宽度与尺寸。
- 图例、坐标轴箭头、对齐轴 (T=0) 的视觉标记规范。

### 2.6 动效

- 克制、信息导向：联动切换（cohort 重聚合、矩阵阶段切换、对齐重分层）用 150–250ms 过渡，强调“数据在变”而非装饰。
- 遵循 `prefers-reduced-motion`。

### 2.7 各视图视觉规范（定稿位）

- **A Genre-Space Cluster**：点大小/描边/选中态、群落 hull 或密度底纹、brush 选框样式。
- **B Career River Chronology**：流层堆叠顺序与配色、白色熵线粗细、每部电影圆点的尺寸/明度映射（评分 vs 票房）。
- **C Transformation Alignment**：T=0 竖轴标记、左侧低熵窄束的收拢样式、右侧绿/红分叉区底纹、线条粗细与透明度（叠加可读性）。
- **D Markov Transition Gate**：单元格色阶、对角线强调、阶段切换的过渡、行列标签排版。

> 视觉方案定稿后，将取值回填第一阶段的 CSS 变量并补全本节色值/字号表；后续视觉调整始终改 token，不改视图逻辑。
