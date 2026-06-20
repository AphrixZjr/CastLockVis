"""一键执行全部 EDA 脚本（01..05），重建 figures/ 与 stats.json。

用法：在 docs/data_analysis/ 下 `python run_all.py`
"""
import importlib

MODULES = ["01_clusters", "02_entropy", "03_markov", "04_outcome", "05_cases"]

if __name__ == "__main__":
    for name in MODULES:
        print(f"\n{'='*60}\n[run] {name}\n{'='*60}")
        importlib.import_module(name).main()
    print("\n[done] 全部分析脚本执行完毕，figures/ 与 stats.json 已更新。")
