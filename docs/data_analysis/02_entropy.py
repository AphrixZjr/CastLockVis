"""View B / 类型锁定：香农熵曲线的"硬化"与转型窗口期。

口径：entropy.json 的 curve = EMA 香农熵随片序 n（变长，n=1..filmCount）。
本脚本只在 n=1..30 窗口内按"有该 n 的演员"求均值（不外推、不补齐）。

产出：
  · figures/02_entropy_curves.png   — 全体 + 分簇平均熵曲线（n=1..30）
  · figures/02_t0_hist.png          — t0Index 分布（标注地板 n=6）
  · stats.json["entropy"]           — 早/末段斜率、硬化幅度、t0 分布
"""
import numpy as np

import common as C

N_MAX = 30  # View B 横轴上限


def mean_curve(entropy_list, ids=None):
    """对给定 actorId 集合，逐 n（1..N_MAX）求平均熵；返回 (xs, means, counts)。"""
    sums = np.zeros(N_MAX); cnts = np.zeros(N_MAX)
    idset = set(ids) if ids is not None else None
    for e in entropy_list:
        if idset is not None and e["actorId"] not in idset:
            continue
        for p in e["curve"]:
            n = p["n"]
            if 1 <= n <= N_MAX:
                sums[n - 1] += p["entropy"]; cnts[n - 1] += 1
    means = np.divide(sums, cnts, out=np.full(N_MAX, np.nan), where=cnts > 0)
    return np.arange(1, N_MAX + 1), means, cnts


def main():
    D = C.load_all()
    actors, entropy = D["actors"], D["entropy"]
    K = C.n_clusters(actors)
    by_cluster = {k: [a["id"] for a in actors if a["clusterId"] == k] for k in range(K)}
    cl_label = {}  # 复用 01 的标签口径（top2 早期类型）
    for k in range(K):
        vecs = np.mean([a["earlyGenreVector"] for a in actors if a["clusterId"] == k], axis=0)
        top = np.argsort(vecs)[::-1][:2]
        cl_label[k] = "/".join(D["genres"][i] for i in top)

    xs, all_means, _ = mean_curve(entropy)

    # ---- 硬化度量：早段(n1->n5) vs 末段(n25->n30) 斜率 ----
    def slope(means, a, b):
        seg = means[a - 1:b]
        xseg = np.arange(a, b + 1)
        ok = ~np.isnan(seg)
        if ok.sum() < 2:
            return float("nan")
        return float(np.polyfit(xseg[ok], seg[ok], 1)[0])

    early_slope = slope(all_means, 1, 5)
    late_slope = slope(all_means, 25, 30)
    peak_val = float(np.nanmax(all_means))
    end_val = float(all_means[N_MAX - 1])
    print("== 全体平均熵曲线 ==")
    print(f"  n=1 熵={all_means[0]:.3f}  峰值={peak_val:.3f}  n=30={end_val:.3f}")
    print(f"  早段斜率(1->5)={early_slope:+.4f}/片   末段斜率(25->30)={late_slope:+.4f}/片  → 末段趋平=硬化")

    # ---- 分簇硬化 ----
    per_cluster = {}
    for k in range(K):
        _, m, _ = mean_curve(entropy, by_cluster[k])
        per_cluster[k] = {
            "label": cl_label[k],
            "earlySlope": round(slope(m, 1, 5), 4),
            "lateSlope": round(slope(m, 25, 30), 4),
            "peak": round(float(np.nanmax(m)), 3),
            "n30": round(float(m[N_MAX - 1]), 3),
        }

    # ---- t0Index 分布 ----
    t0s = [a["t0Index"] for a in actors]
    onset = [t for t in t0s if t >= 0]
    floor = sum(1 for t in onset if t == C.T0_ONSET_MIN_N)
    print("== 转型窗口期 t0Index ==")
    print(f"  触发 onset 的演员 {len(onset)}/{len(actors)} ({len(onset)/len(actors):.0%})；"
          f"其中 t0=6（地板）{floor} 人 ({floor/max(1,len(onset)):.0%})")

    # ---- 图1：熵曲线 ----
    fig, ax = C.plt.subplots(figsize=(10, 6))
    cmap = C.plt.get_cmap("tab10")
    for k in range(K):
        _, m, _ = mean_curve(entropy, by_cluster[k])
        ax.plot(xs, m, color=cmap(k), alpha=0.65, lw=1.4, label=f"簇{k} {cl_label[k]}")
    ax.plot(xs, all_means, color="black", lw=2.6, label="全体均值")
    ax.set_xlabel("片序 n"); ax.set_ylabel("平均香农熵 (EMA)")
    ax.set_title("类型多样性的硬化：平均熵曲线（n=1..30）")
    ax.legend(fontsize=7, ncol=2)
    C.savefig(fig, "02_entropy_curves.png")

    # ---- 图2：t0 直方图 ----
    fig, ax = C.plt.subplots(figsize=(9, 5))
    ax.hist(onset, bins=range(C.T0_ONSET_MIN_N, max(onset) + 2), color="#3b6ea5",
            edgecolor="white", align="left")
    ax.axvline(C.T0_ONSET_MIN_N, color="#d2492a", ls="--", lw=1.5,
               label=f"地板 n={C.T0_ONSET_MIN_N}（前5部为早期画像，第6部起才判转型）")
    ax.set_xlabel("t0Index（熵 onset 变点的片序）"); ax.set_ylabel("演员数")
    ax.set_title("转型窗口期起点 t0 的分布")
    ax.legend(fontsize=8)
    C.savefig(fig, "02_t0_hist.png")

    C.update_stats("entropy", {
        "nMax": N_MAX,
        "overall": {"n1": round(float(all_means[0]), 3), "peak": round(peak_val, 3),
                    "n30": round(end_val, 3),
                    "earlySlope": round(early_slope, 4), "lateSlope": round(late_slope, 4)},
        "perCluster": per_cluster,
        "t0": {"onsetActors": len(onset), "totalActors": len(actors),
               "onsetRate": round(len(onset) / len(actors), 3),
               "atFloor6": floor, "floorShare": round(floor / max(1, len(onset)), 3),
               "median": int(np.median(onset)) if onset else None,
               "max": int(max(onset)) if onset else None},
    })


if __name__ == "__main__":
    main()
