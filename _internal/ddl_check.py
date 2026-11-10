#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""数据库 DDL 自校验：括号/逗号、外键引用列、一维关联、二进制列、路径列，并用 SQLite 转译实际执行。
复跑：python3 ddl_check.py  → 输出 ddl_check.json
"""
import os, re, json, sqlite3, collections

ROOT = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(ROOT) == '_internal':
    ROOT = os.path.dirname(ROOT)
s = open(os.path.join(ROOT, '_internal', "db", "schema.sql"), encoding="utf-8").read()

# 每张表体
blocks = []
for m in re.finditer(r"CREATE TABLE\s+`(\w+)`\s*\(([\s\S]*?)\)\s*ENGINE=", s, re.I):
    body = m.group(2)
    cols = re.findall(r"^\s*`(\w+)`\s+([A-Za-z]+(?:\([^)]*\))?)", body, re.M)
    blocks.append((m.group(1), body, [c[0] for c in cols]))
tables = {b[0]: b[2] for b in blocks}

errors, warns = [], []
if len(blocks) != 55:
    errors.append("表数 %d ≠ 55" % len(blocks))

# 1. 括号平衡 / 重复逗号 / 尾逗号
if s.count("(") != s.count(")"):
    errors.append("全库括号不平衡 ( %d / ) %d" % (s.count("("), s.count(")")))
for name, body, cols in blocks:
    if re.search(r",\s*,", body): errors.append("%s 存在重复逗号" % name)
    if re.search(r",\s*$", body.strip()): errors.append("%s 定义末尾悬空逗号" % name)
    dup = [k for k, v in collections.Counter(cols).items() if v > 1]
    if dup: errors.append("%s 存在重复列 %s，违反「无重复数据列」" % (name, dup))
    if len(re.findall(r"FOREIGN KEY", body, re.I)) > 1:
        errors.append("%s 外键数 > 1，违反一维关联" % name)
    if re.search(r"\b(BLOB|BYTEA|VARBINARY|BASE64|LONGBLOB|MEDIUMBLOB)\b", body, re.I):
        errors.append("%s 含二进制列" % name)

# 2. 外键：本地列存在、引用表存在、引用列存在
fk_count = 0
for m in re.finditer(r"CONSTRAINT\s+`(\w+)`\s+FOREIGN KEY\s*\(`(\w+)`\)\s*REFERENCES\s*`(\w+)`\s*\(`(\w+)`\)", s, re.I):
    fk, local, rt, rc = m.groups(); fk_count += 1
    owner = next((n for n, b, c in blocks if fk in b), None)
    if local not in tables.get(owner, []): errors.append("%s 外键本地列 %s 不存在" % (owner, local))
    if rt not in tables: errors.append("%s 引用表 %s 不存在" % (fk, rt))
    elif rc not in tables[rt]: errors.append("%s 引用列 %s.%s 不存在" % (fk, rt, rc))
if fk_count != 44:
    errors.append("外键数 %d ≠ 44" % fk_count)

# 3. SQLite 转译后实际执行（语法级，MySQL 专有语法已映射）
def to_sqlite(sql):
    sql = re.sub(r"SET NAMES[^;]*;", "", sql, flags=re.I)
    sql = re.sub(r"^\s*--.*$", "", sql, flags=re.M)
    sql = re.sub(r"DROP TABLE IF EXISTS", "DROP TABLE IF EXISTS", sql, flags=re.I)
    # 列注释
    sql = re.sub(r"\s+COMMENT\s+'[^']*'", "", sql, flags=re.I)
    # 表尾 ENGINE/CHARSET/COLLATE/COMMENT
    sql = re.sub(r"\)\s*ENGINE=[^;]+;", ");", sql, flags=re.I)
    # 索引语法
    sql = re.sub(r"\bUNIQUE KEY\s+`(\w+)`\s*\(([^)]*)\)", r"CONSTRAINT `\1` UNIQUE (\2)", sql, flags=re.I)
    sql = re.sub(r"^\s*KEY\s+`\w+`\s*\([^)]*\),?\s*$", "", sql, flags=re.M | re.I)
    # 移除普通索引行后可能留下悬空逗号（SQLite 不接受 `, )`）
    sql = re.sub(r",\s*\)", "\n)", sql)
    # 类型
    sql = re.sub(r"(?<![A-Za-z_])(?:BIGINT UNSIGNED|BIGINT|INT UNSIGNED|INT|TINYINT)(?![A-Za-z_])", "INTEGER", sql, flags=re.I)
    sql = re.sub(r"DECIMAL\([^)]*\)", "REAL", sql, flags=re.I)
    sql = re.sub(r"(?<![A-Za-z_])(?:VARCHAR\(\d+\)|CHAR\(\d+\)|TEXT|JSON|DATETIME|DATE)(?![A-Za-z_])", "TEXT", sql, flags=re.I)
    sql = re.sub(r"NOT NULL", "NOT NULL", sql, flags=re.I)
    return sql

sqlite_err = ""
try:
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript(to_sqlite(s))
    got = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")]
    if len(got) != 55: sqlite_err = "SQLite 实际建表 %d 张 ≠ 55" % len(got)
    conn.close()
except Exception as e:
    sqlite_err = "SQLite 转译执行失败：%s" % str(e)[:200]
if sqlite_err: errors.append(sqlite_err)

res = {"表数": len(blocks), "外键数": fk_count, "错误数": len(errors), "错误": errors,
       "SQLite转译执行": "通过（55 张表全部建成）" if not sqlite_err else sqlite_err}
open(os.path.join(ROOT, "_internal/ddl_check.json"), "w", encoding="utf-8").write(json.dumps(res, ensure_ascii=False, indent=2))
print("== DDL 自校验：表 %d / 外键 %d / 错误 %d ==" % (len(blocks), fk_count, len(errors)))
for e in errors[:15]: print("  ", e)
print("SQLite:", res["SQLite转译执行"])
raise SystemExit(1 if errors else 0)
