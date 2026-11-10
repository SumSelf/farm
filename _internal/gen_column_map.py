#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为 API 目录补齐「返回列」并生成表列 → API 反向索引。
依据唯一 schema.sql 按 tables 自动推导，避免两处口径漂移。
复跑：python3 gen_column_map.py  → 更新 db/api_catalog.json 的 columns 字段、生成 db/column_api_index.json
"""
import os, re, json, collections

ROOT = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(ROOT) == '_internal':
    ROOT = os.path.dirname(ROOT)
schema = open(os.path.join(ROOT, '_internal', "db", "schema.sql"), encoding="utf-8").read()
tables = {}
for m in re.finditer(r"CREATE TABLE\s+`(\w+)`\s*\(([\s\S]*?)\)\s*ENGINE=", schema, re.I):
    tables[m.group(1)] = re.findall(r"^\s*`(\w+)`\s+", m.group(2), re.M)

cat_path = os.path.join(ROOT, '_internal', "db", "api_catalog.json")
CAT = json.load(open(cat_path, encoding="utf-8"))

# 每条 API 明确列出返回列（按关联表从 schema 取，后台按此实现 SELECT 字段）
for a in CAT:
    a["columns"] = {t: list(tables[t]) for t in a.get("tables", []) if t in tables}

# 反向索引：表.列 → 读它的 API / 按它筛选或写入的 API
index = collections.defaultdict(lambda: {"returned_by": [], "arg_of": []})
for a in CAT:
    for t, cols in a["columns"].items():
        for c in cols:
            index["%s.%s" % (t, c)]["returned_by"].append(a["name"])
    for arg in a.get("args", []):
        for k in (arg.get("fields") or {}):
            for t in a.get("tables", []):
                if t in tables and k in tables[t]:
                    index["%s.%s" % (t, k)]["arg_of"].append(a["name"])

out = {"表数": len(tables), "接口数": len(CAT),
       "列总数": sum(len(v) for v in tables.values()),
       "索引": {k: {"returned_by": sorted(set(v["returned_by"])),
                    "arg_of": sorted(set(v["arg_of"]))} for k, v in sorted(index.items())}}
open(os.path.join(ROOT, '_internal', "db", "column_api_index.json"), "w", encoding="utf-8").write(
    json.dumps(out, ensure_ascii=False, indent=2))
open(cat_path, "w", encoding="utf-8").write(json.dumps(CAT, ensure_ascii=False, indent=2))
print("已为 %d 条 API 补 columns，生成 %d 个表列反向索引项（列总数 %d）" %
      (len(CAT), len(out["索引"]), out["列总数"]))
