"""微观案例：用可复现评分挑选 success / snapback / none 的代表演员，
导出 T=0 前后影片序列与 dist 轨迹，供报告讲"类型迁移故事"。

口径：
  · success：tau∈[+3,+5] 末段偏离度高 + tail 斜率为正（持续脱离舒适圈）。
  · snapback：峰值偏离度高、末段大幅回吐（retrace 大），呈"冲高回落"。
  · none：无 onset(t0=-1)、整段偏离度低且平（锁死舒适圈）。
代表性优先：filmCount 适中偏多、有知名作品（按 numVotes 取窗口内最高片）。

产出：
  · figures/05_case_trajectories.png  — 入选案例的 dist-by-tau 轨迹（按 outcome 着色）
  · stats.json["cases"]               — 每个案例的元信息 + T0 邻域影片
"""
import numpy as np

import common as C

N_PER_GROUP = 3
TAUS = list(range(-3, 6))


def dist_at(points):
    return {p["tau"]: p["dist"] for p in points}


def tail_slope(points):
    pts = [(p["tau"], p["dist"]) for p in points if 1 <= p["tau"] <= 5]
    if len(pts) < 2:
        return 0.0
    xs = np.array([x for x, _ in pts]); ys = np.array([y for _, y in pts])
    return float(np.polyfit(xs, ys, 1)[0])


def film_brief(f):
    return {"seqIndex": f["seqIndex"], "title": f["title"], "year": f["year"],
            "genres": f["genres"], "dominantGenre": f["dominantGenre"],
            "rating": f["rating"], "numVotes": f["numVotes"],
            "directorName": f["directorName"], "directorHet": f["directorHeterogeneity"]}


def main():
    D = C.load_all()
    actors, aligns = D["actor_by_id"], D["align_by_id"]
    fba = C.films_by_actor(D["films"])
    cl_label = {}
    K = C.n_clusters(D["actors"])
    for k in range(K):
        vecs = np.mean([a["earlyGenreVector"] for a in D["actors"] if a["clusterId"] == k], axis=0)
        top = np.argsort(vecs)[::-1][:2]
        cl_label[k] = "/".join(D["genres"][i] for i in top)

    # ---- 评分挑选 ----
    scored = {"success": [], "snapback": [], "none": []}
    for aid, al in aligns.items():
        act = actors[aid]
        d = dist_at(al["points"])
        end = np.mean([d[t] for t in (3, 4, 5) if t in d]) if any(t in d for t in (3, 4, 5)) else 0
        peak = max(d.values()) if d else 0
        slope = tail_slope(al["points"])
        fc = act["filmCount"]
        # 知名度：演员任一片的最高 numVotes（取对数避免量纲爆炸）
        fame = max((f["numVotes"] for f in fba.get(aid, [])), default=1)
        oc = al["outcome"]
        if oc == "success":
            score = end + max(0, slope) * 5 + 0.05 * np.log10(fame)
        elif oc == "snapback":
            retrace = peak - end
            score = retrace * 2 + peak + 0.05 * np.log10(fame)
        else:  # none
            score = -peak + 0.05 * np.log10(fame)  # 偏离度越低越典型 + 越知名越好
        # 过滤过短生涯，保证 t0 前后都有片
        if fc >= 18:
            scored[oc].append((score, aid))

    cases = {o: [] for o in C.OUTCOMES}
    for o in C.OUTCOMES:
        scored[o].sort(reverse=True)
        for _, aid in scored[o][:N_PER_GROUP]:
            act = actors[aid]; al = aligns[aid]
            t0 = act["t0Index"]
            films = fba.get(aid, [])
            # T0 邻域影片：转型者用 seqIndex 在 [t0-2, t0+3]；none 取前 8 部看是否一直同类型
            if t0 and t0 > 0:
                nbhd = [film_brief(f) for f in films if t0 - 2 <= f["seqIndex"] <= t0 + 3]
            else:
                nbhd = [film_brief(f) for f in films[:8]]
            cases[o].append({
                "actorId": aid, "name": act["name"],
                "clusterId": act["clusterId"], "clusterLabel": cl_label[act["clusterId"]],
                "dominantEarlyGenre": act["dominantEarlyGenre"],
                "filmCount": act["filmCount"], "t0Index": t0, "outcome": o,
                "covariatesAtT0": al.get("covariatesAtT0", {}),
                "distByTau": {p["tau"]: p["dist"] for p in al["points"]},
                "neighborhoodFilms": nbhd,
            })

    # ---- 控制台摘要 ----
    for o in C.OUTCOMES:
        print(f"\n== {C.OUTCOME_LABEL_CN[o]} 代表案例 ==")
        for c in cases[o]:
            print(f"  {c['name']} (簇{c['clusterId']} {c['clusterLabel']}, 早期主类型={c['dominantEarlyGenre']}, "
                  f"filmCount={c['filmCount']}, t0={c['t0Index']})")
            if o != "none":
                cv = c["covariatesAtT0"]
                print(f"     T0协变量: 导演异质性={cv.get('directorHeterogeneity')} 评分={cv.get('rating')} 人气={cv.get('numVotes')}")
            traj = " ".join(f"{t:+d}:{c['distByTau'].get(t, float('nan')):.2f}"
                            for t in TAUS if t in c["distByTau"])
            print(f"     dist轨迹: {traj}")

    # ---- 图：入选案例 dist 轨迹 ----
    fig, ax = C.plt.subplots(figsize=(10, 6))
    for o in C.OUTCOMES:
        for i, c in enumerate(cases[o]):
            xs = [t for t in TAUS if t in c["distByTau"]]
            ys = [c["distByTau"][t] for t in xs]
            ax.plot(xs, ys, marker="o", color=C.OUTCOME_COLOR[o], alpha=0.8,
                    label=(C.OUTCOME_LABEL_CN[o] if i == 0 else None))
            ax.annotate(c["name"], (xs[-1], ys[-1]), fontsize=7, color=C.OUTCOME_COLOR[o])
    ax.axvline(0, color="gray", ls=":", lw=1)
    ax.set_xlabel("τ（相对转型起点/伪起点）"); ax.set_ylabel("类型偏离度 dist")
    ax.set_title("微观案例：成功(绿)持续偏离 / 回弹(红)冲高回落 / 未转型(灰)低平")
    ax.legend()
    C.savefig(fig, "05_case_trajectories.png")

    C.update_stats("cases", {"perGroup": N_PER_GROUP, **{o: cases[o] for o in C.OUTCOMES}})


if __name__ == "__main__":
    main()
