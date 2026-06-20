"""View D / 重力场：马尔科夫转移矩阵的"对角线加深"。

口径：markov.json = 7 簇 × 3 阶段(early/mid/late) 的 15×15 行归一化软转移矩阵。
对角占比 = 活跃行(行和≈1)上 matrix[i][i] 的均值，即"停留在同一类型"的平均概率。
对角占比越高 → 类型重力越强（越锁定）。验证它是否随 early→mid→late 单调加深。

产出：
  · figures/03_diag_progression.png  — 各簇对角占比随阶段变化的折线
  · figures/03_matrix_compare.png    — 代表簇 early vs late 矩阵热力对照
  · stats.json["markov"]             — 每簇每阶段对角占比、离对角密度
"""
import numpy as np

import common as C

STAGES = ["early", "mid", "late"]


def diag_share(matrix):
    """活跃行（行和>0.5）上对角元的均值。"""
    M = np.array(matrix)
    active = M.sum(axis=1) > 0.5
    if active.sum() == 0:
        return float("nan")
    return float(np.mean(np.diag(M)[active]))


def offdiag_density(matrix, thresh=0.05):
    """活跃行中非对角且 > thresh 的格子占全部非对角格子的比例（越高=跨类型流动越活跃）。"""
    M = np.array(matrix)
    active = np.where(M.sum(axis=1) > 0.5)[0]
    if active.size == 0:
        return float("nan")
    n = M.shape[1]
    cnt = tot = 0
    for i in active:
        for j in range(n):
            if j == i:
                continue
            tot += 1
            cnt += int(M[i, j] > thresh)
    return round(cnt / tot, 3) if tot else float("nan")


def main():
    D = C.load_all()
    actors, genres = D["actors"], D["genres"]
    K = C.n_clusters(actors)
    cl_label = {}
    for k in range(K):
        vecs = np.mean([a["earlyGenreVector"] for a in actors if a["clusterId"] == k], axis=0)
        top = np.argsort(vecs)[::-1][:2]
        cl_label[k] = "/".join(genres[i] for i in top)

    per_cluster = {}
    print("== 马尔科夫对角占比（停留同类型概率）随阶段变化 ==")
    print(f"  {'簇':<4}{'部落':<20}{'early':>8}{'mid':>8}{'late':>8}{'  早→晚加深'}")
    monotonic = 0
    for k in range(K):
        row = {}
        for stg in STAGES:
            m = D["markov_by_key"].get((k, stg))
            row[stg] = round(diag_share(m["matrix"]), 3) if m else None
            row[f"offdiag_{stg}"] = offdiag_density(m["matrix"]) if m else None
        deepen = row["late"] - row["early"]
        mono = row["early"] <= row["mid"] <= row["late"]
        monotonic += int(mono)
        per_cluster[k] = {"label": cl_label[k], **row, "deepenEarlyToLate": round(deepen, 3),
                          "monotonic": mono}
        print(f"  {k:<4}{cl_label[k]:<20}{row['early']:>8.3f}{row['mid']:>8.3f}{row['late']:>8.3f}"
              f"   {deepen:+.3f} {'(单调↑)' if mono else ''}")

    mean_by_stage = {stg: round(float(np.mean([per_cluster[k][stg] for k in range(K)])), 3) for stg in STAGES}
    print(f"  全簇均值: early={mean_by_stage['early']} mid={mean_by_stage['mid']} late={mean_by_stage['late']}"
          f"   单调加深的簇 {monotonic}/{K}")

    # ---- 图1：对角占比折线 ----
    fig, ax = C.plt.subplots(figsize=(9, 6))
    cmap = C.plt.get_cmap("tab10")
    xs = range(3)
    for k in range(K):
        ys = [per_cluster[k][s] for s in STAGES]
        ax.plot(xs, ys, marker="o", color=cmap(k), alpha=0.7, label=f"簇{k} {cl_label[k]}")
    ax.plot(xs, [mean_by_stage[s] for s in STAGES], color="black", lw=3, marker="s", label="全簇均值")
    ax.set_xticks(xs); ax.set_xticklabels(["early (片1-10)", "mid (11-20)", "late (21+)"])
    ax.set_ylabel("对角占比 = 平均同类型停留概率")
    ax.set_title("重力场：类型转移矩阵的对角线随生涯阶段加深")
    ax.legend(fontsize=7, ncol=2)
    C.savefig(fig, "03_diag_progression.png")

    # ---- 图2：代表簇 early vs late 矩阵热力对照 ----
    # 选"加深最明显"的簇
    rep = max(range(K), key=lambda k: per_cluster[k]["deepenEarlyToLate"])
    fig, axes = C.plt.subplots(1, 2, figsize=(14, 6))
    for ax, stg in zip(axes, ["early", "late"]):
        m = np.array(D["markov_by_key"][(rep, stg)]["matrix"])
        im = ax.imshow(m, cmap="viridis", vmin=0, vmax=max(0.3, np.max(m)))
        ax.set_xticks(range(len(genres))); ax.set_xticklabels(genres, rotation=90, fontsize=7)
        ax.set_yticks(range(len(genres))); ax.set_yticklabels(genres, fontsize=7)
        ax.set_title(f"簇{rep} {cl_label[rep]} · {stg}\n对角占比={per_cluster[rep][stg]:.3f}")
        ax.set_xlabel("下一部类型"); ax.set_ylabel("当前类型")
        fig.colorbar(im, ax=ax, fraction=0.046, label="转移概率")
    fig.suptitle("对角线加深示例：早期分散 → 晚期对角主导（类型锁定）", y=1.02)
    C.savefig(fig, "03_matrix_compare.png")

    C.update_stats("markov", {
        "stages": STAGES,
        "perCluster": per_cluster,
        "meanByStage": mean_by_stage,
        "monotonicClusters": monotonic, "k": K,
        "representativeCluster": rep,
    })


if __name__ == "__main__":
    main()
