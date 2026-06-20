"""CastLock-Vis EDA 共享工具：数据加载、常量与 matplotlib 样式。

所有分析脚本（01_..05_）都从这里导入，确保口径一致：
  · 只读 ../../public/data/*.json（数据契约），绝不重算统计量；
  · genres 顺序以 genres.json 为准（= earlyGenreVector / markov.matrix 的列序）；
  · outcome ∈ {success, snapback, none}；clusterId ∈ 0..6；
  · alignment.points 为 tau∈[-3,+5]，每点带 entropy 与 dist；none 的 covariatesAtT0 为空。

运行：在 docs/data_analysis/ 目录下 `python 0x_xxx.py`，图落 figures/，统计累加进 stats.json。
"""
from __future__ import annotations

import json
from collections import OrderedDict
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # 无显示环境后端
import matplotlib.pyplot as plt
from matplotlib import font_manager

# ---- 路径 ----
HERE = Path(__file__).resolve().parent                 # docs/data_analysis/
ROOT = HERE.parents[1]                                  # 仓库根 (.../CastLockVis)
DATA = ROOT / "public" / "data"
FIG = HERE / "figures"
FIG.mkdir(exist_ok=True)
STATS_PATH = HERE / "stats.json"

# ---- 中文字体（matplotlib 默认不带中文，尽量挂一个系统中文字体，缺失则回退）----
_CJK_CANDIDATES = ["Microsoft YaHei", "SimHei", "Microsoft JhengHei", "SimSun", "DengXian"]
_available = {f.name for f in font_manager.fontManager.ttflist}
for _name in _CJK_CANDIDATES:
    if _name in _available:
        plt.rcParams["font.sans-serif"] = [_name]
        break
plt.rcParams["axes.unicode_minus"] = False
plt.rcParams["figure.dpi"] = 120
plt.rcParams["savefig.bbox"] = "tight"
plt.rcParams["axes.grid"] = True
plt.rcParams["grid.alpha"] = 0.25

# ---- 常量 ----
OUTCOMES = ["success", "snapback", "none"]
# 与前端 View C 一致：success 绿 / snapback 红 / none 灰
OUTCOME_COLOR = {"success": "#2e9e5b", "snapback": "#d2492a", "none": "#9aa0a6"}
OUTCOME_LABEL_CN = {"success": "转型成功", "snapback": "回弹失败", "none": "从未转型"}
# 流水线参数（仅用于解读，见 pipeline_json_expert.py）
T0_ONSET_MIN_N = 6
SNAPBACK_RETRACE = 0.50
SNAPBACK_SLOPE_MAX = 0.01


def _load(name: str):
    with open(DATA / name, "r", encoding="utf-8") as f:
        return json.load(f)


def load_all():
    """返回 (genres, actors, films, entropy, markov, alignment) 及若干索引 dict。"""
    genres = _load("genres.json")
    actors = _load("actors.json")
    films = _load("films.json")
    entropy = _load("entropy.json")
    markov = _load("markov.json")
    alignment = _load("alignment.json")
    return {
        "genres": genres,
        "actors": actors,
        "films": films,
        "entropy": entropy,
        "markov": markov,
        "alignment": alignment,
        "actor_by_id": {a["id"]: a for a in actors},
        "entropy_by_id": {e["actorId"]: e for e in entropy},
        "align_by_id": {a["actorId"]: a for a in alignment},
        "markov_by_key": {(m["cohortId"], m["stage"]): m for m in markov},
    }


def films_by_actor(films):
    """actorId -> 按 seqIndex 升序的影片列表。"""
    by = {}
    for f in films:
        by.setdefault(f["actorId"], []).append(f)
    for fl in by.values():
        fl.sort(key=lambda x: x["seqIndex"])
    return by


def n_clusters(actors):
    return max(a["clusterId"] for a in actors) + 1


def savefig(fig, name: str):
    out = FIG / name
    fig.savefig(out)
    plt.close(fig)
    print(f"   [figure] {out.relative_to(HERE)}")
    return str(out.relative_to(HERE))


def update_stats(section: str, payload: dict):
    """把某脚本的统计结果并入 stats.json 的一个 section（保持其它 section 不变）。"""
    data = OrderedDict()
    if STATS_PATH.exists():
        with open(STATS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f, object_pairs_hook=OrderedDict)
    data[section] = payload
    with open(STATS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"   [stats] section '{section}' 写入 {STATS_PATH.name}")
