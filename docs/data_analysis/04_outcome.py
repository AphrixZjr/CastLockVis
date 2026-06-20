"""View C / 对齐机制：成败分叉与 T=0 控制变量。

口径：alignment.json 每人 points=tau∈[-3,+5] 的 (entropy, dist)；dist=类型偏离度。
covariatesAtT0 仅转型者(success/snapback)有；none 为空 → 控制变量分析剔除 none。

产出：
  · figures/04_dist_by_tau.png       — 三类 outcome 的平均 dist 轨迹（绿升/红回弹/灰平）
  · figures/04_covariates.png        — success vs snapback 的 T0 控制变量对比
  · stats.json["outcome"]            — outcome 分布、dist-by-tau、Mann-Whitney+效应量
"""
import numpy as np
from scipy import stats

import common as C

TAUS = list(range(-3, 6))  # -3..+5


def mean_dist_by_tau(aligns, outcome):
    sums = {t: 0.0 for t in TAUS}; cnts = {t: 0 for t in TAUS}
    for a in aligns:
        if a["outcome"] != outcome:
            continue
        for p in a["points"]:
            if p["tau"] in sums:
                sums[p["tau"]] += p["dist"]; cnts[p["tau"]] += 1
    return [sums[t] / cnts[t] if cnts[t] else np.nan for t in TAUS]


def cliffs_delta(x, y):
    """Cliff's delta 效应量（非参，-1..1）；>0 表示 x 整体大于 y。"""
    x, y = np.asarray(x), np.asarray(y)
    gt = sum((xi > y).sum() for xi in x)
    lt = sum((xi < y).sum() for xi in x)
    return (gt - lt) / (len(x) * len(y))


def main():
    D = C.load_all()
    actors, aligns = D["actors"], D["alignment"]

    # ---- outcome 分布 ----
    from collections import Counter
    oc = Counter(a["outcome"] for a in actors)
    total = len(actors)
    print("== outcome 分布 ==", {o: f"{oc[o]} ({oc[o]/total:.1%})" for o in C.OUTCOMES})

    # ---- dist-by-tau 三曲线 ----
    curves = {o: mean_dist_by_tau(aligns, o) for o in C.OUTCOMES}
    print("== 平均类型偏离度 dist by tau ==")
    print("  tau:     " + " ".join(f"{t:>6}" for t in TAUS))
    for o in C.OUTCOMES:
        print(f"  {C.OUTCOME_LABEL_CN[o]}: " + " ".join(f"{v:6.3f}" for v in curves[o]))

    fig, ax = C.plt.subplots(figsize=(9, 6))
    for o in C.OUTCOMES:
        ax.plot(TAUS, curves[o], marker="o", color=C.OUTCOME_COLOR[o],
                lw=2.2, label=C.OUTCOME_LABEL_CN[o])
    ax.axvline(0, color="gray", ls=":", lw=1.2)
    ax.text(0.1, ax.get_ylim()[0], "T=0 转型起点", fontsize=8, color="gray")
    ax.set_xlabel("τ = 相对转型起点的片序偏移"); ax.set_ylabel("平均类型偏离度 dist")
    ax.set_title("对齐机制：成功(绿)持续偏离 / 回弹(红)冲高回落 / 未转型(灰)低位")
    ax.legend()
    C.savefig(fig, "04_dist_by_tau.png")

    # ---- T0 控制变量：success vs snapback ----
    def cov(outcome, key):
        return [a["covariatesAtT0"][key] for a in aligns
                if a["outcome"] == outcome and a.get("covariatesAtT0")]

    cov_stats = {}
    keys = [("directorHeterogeneity", "导演异质性"), ("rating", "IMDb 评分"), ("numVotes", "投票数(人气)")]
    print("== T=0 控制变量：转型成功 vs 回弹失败 ==")
    for key, label in keys:
        s = np.array(cov("success", key), dtype=float)
        b = np.array(cov("snapback", key), dtype=float)
        u, p = stats.mannwhitneyu(s, b, alternative="two-sided")
        delta = cliffs_delta(s, b)
        cov_stats[key] = {
            "label": label,
            "success": {"n": len(s), "median": round(float(np.median(s)), 3), "mean": round(float(s.mean()), 3)},
            "snapback": {"n": len(b), "median": round(float(np.median(b)), 3), "mean": round(float(b.mean()), 3)},
            "mannwhitney_p": float(p), "cliffs_delta": round(float(delta), 3),
        }
        sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else "ns"
        print(f"  {label:<12} 成功中位 {np.median(s):>10.2f} | 回弹中位 {np.median(b):>10.2f} | "
              f"p={p:.3g} {sig} | Cliff's δ={delta:+.3f}")

    # ---- "叫好不叫座"信号：高评分+低人气 是否更易 snapback ----
    trans = [a for a in aligns if a["outcome"] in ("success", "snapback") and a.get("covariatesAtT0")]
    ratings = np.array([a["covariatesAtT0"]["rating"] for a in trans])
    votes = np.array([a["covariatesAtT0"]["numVotes"] for a in trans])
    r_med, v_med = np.median(ratings), np.median(votes)
    base_snap = np.mean([a["outcome"] == "snapback" for a in trans])
    quadrants = {}
    for hi_r in (True, False):
        for hi_v in (True, False):
            grp = [a for a in trans
                   if (a["covariatesAtT0"]["rating"] >= r_med) == hi_r
                   and (a["covariatesAtT0"]["numVotes"] >= v_med) == hi_v]
            if grp:
                quadrants[f"{'高' if hi_r else '低'}评分_{'高' if hi_v else '低'}人气"] = {
                    "n": len(grp), "snapbackRate": round(np.mean([a["outcome"] == "snapback" for a in grp]), 3)}
    print(f"== '叫好不叫座'象限 snapback 率（基线 {base_snap:.1%}, 评分中位={r_med}, 人气中位={int(v_med)}）==")
    for q, v in quadrants.items():
        print(f"  {q:<14} n={v['n']:>4}  snapback率={v['snapbackRate']:.1%}")

    C.update_stats("outcome", {
        "distribution": {o: {"n": oc[o], "pct": round(oc[o] / total, 3)} for o in C.OUTCOMES},
        "distByTau": {"taus": TAUS, **{o: [round(v, 3) if not np.isnan(v) else None for v in curves[o]] for o in C.OUTCOMES}},
        "covariatesT0": cov_stats,
        "goodButUnpopular": {"baselineSnapback": round(float(base_snap), 3),
                             "ratingMedian": float(r_med), "votesMedian": float(v_med),
                             "quadrants": quadrants},
    })


if __name__ == "__main__":
    main()
