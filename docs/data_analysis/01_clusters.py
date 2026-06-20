"""View A / 舒适圈：7 个类型部落的画像与转型成败结构。

产出：
  · figures/01_cluster_genre_heatmap.png  — 7×15 簇-早期类型画像热力图
  · figures/01_cluster_outcome_bar.png    — 各簇 outcome 占比堆叠柱
  · figures/01_cluster_projection.png     — PaCMAP 投影散点（按簇着色，复刻 View A）
  · stats.json["clusters"]                — 簇规模、画像 top 类型、outcome 占比
"""
import numpy as np

import common as C


def main():
    D = C.load_all()
    actors, genres = D["actors"], D["genres"]
    K = C.n_clusters(actors)
    G = len(genres)

    # ---- 各簇早期类型画像（earlyGenreVector 均值）与 outcome 占比 ----
    profiles = np.zeros((K, G))
    counts = np.zeros(K, dtype=int)
    outcome_counts = {k: {o: 0 for o in C.OUTCOMES} for k in range(K)}
    for a in actors:
        k = a["clusterId"]
        profiles[k] += np.array(a["earlyGenreVector"])
        counts[k] += 1
        outcome_counts[k][a["outcome"]] += 1
    profiles /= counts[:, None]

    # 为每个簇取早期画像里权重最高的 3 个类型作为"部落"标签
    cluster_info = []
    for k in range(K):
        top_idx = np.argsort(profiles[k])[::-1][:3]
        top = [(genres[i], round(float(profiles[k][i]), 3)) for i in top_idx]
        oc = outcome_counts[k]
        n = counts[k]
        cluster_info.append({
            "clusterId": k,
            "size": int(n),
            "topGenres": top,
            "label": "/".join(g for g, _ in top[:2]),
            "outcomePct": {o: round(oc[o] / n, 3) for o in C.OUTCOMES},
            "successRate": round(oc["success"] / n, 3),
            "snapbackRate": round(oc["snapback"] / n, 3),
            "noneRate": round(oc["none"] / n, 3),
        })

    print("== 7 个类型部落画像 ==")
    for ci in cluster_info:
        print(f"  簇{ci['clusterId']} (n={ci['size']:>3}) {ci['label']:<22} "
              f"成功 {ci['successRate']:.0%} 回弹 {ci['snapbackRate']:.0%} 未转型 {ci['noneRate']:.0%}")

    # ---- 图1：簇-类型画像热力图 ----
    fig, ax = C.plt.subplots(figsize=(11, 5.5))
    im = ax.imshow(profiles, aspect="auto", cmap="magma")
    ax.set_xticks(range(G)); ax.set_xticklabels(genres, rotation=45, ha="right")
    ax.set_yticks(range(K))
    ax.set_yticklabels([f"簇{ci['clusterId']} ({ci['label']}, n={ci['size']})" for ci in cluster_info])
    ax.set_title("各类型部落的早期画像（earlyGenreVector 均值，IDF 加权）")
    fig.colorbar(im, ax=ax, label="平均权重")
    C.savefig(fig, "01_cluster_genre_heatmap.png")

    # ---- 图2：各簇 outcome 占比堆叠柱 ----
    fig, ax = C.plt.subplots(figsize=(9, 5))
    bottoms = np.zeros(K)
    xs = np.arange(K)
    for o in C.OUTCOMES:
        vals = np.array([cluster_info[k]["outcomePct"][o] for k in range(K)])
        ax.bar(xs, vals, bottom=bottoms, color=C.OUTCOME_COLOR[o], label=C.OUTCOME_LABEL_CN[o])
        bottoms += vals
    ax.set_xticks(xs)
    ax.set_xticklabels([f"簇{ci['clusterId']}\n{ci['label']}\nn={ci['size']}" for ci in cluster_info], fontsize=8)
    ax.set_ylabel("占比"); ax.set_ylim(0, 1)
    ax.set_title("各类型部落的转型成败结构", pad=28)
    ax.legend(ncol=3, loc="lower center", bbox_to_anchor=(0.5, 1.06))
    C.savefig(fig, "01_cluster_outcome_bar.png")

    # ---- 图3：PaCMAP 投影散点（复刻 View A）----
    fig, ax = C.plt.subplots(figsize=(8, 7))
    cmap = C.plt.get_cmap("tab10")
    for k in range(K):
        pts = np.array([a["projection"] for a in actors if a["clusterId"] == k])
        ax.scatter(pts[:, 0], pts[:, 1], s=10, alpha=0.6, color=cmap(k),
                   label=f"簇{k} {cluster_info[k]['label']}")
    ax.set_title("View A 复刻：早期类型画像的 PaCMAP 投影（按簇着色）")
    ax.set_xlabel("dim 1"); ax.set_ylabel("dim 2")
    ax.legend(fontsize=7, loc="best")
    C.savefig(fig, "01_cluster_projection.png")

    C.update_stats("clusters", {
        "k": K,
        "totalActors": len(actors),
        "perCluster": cluster_info,
    })


if __name__ == "__main__":
    main()
