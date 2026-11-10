#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""反向走查整改：把页面真实选项补进 API 参数范围、统一枚举值域、补流程备注，
并把唯一 db/api_catalog.json 幂等回灌到 request.js 内嵌 CATALOG（两处不漂移）。
复跑：python3 patch_catalog.py
"""
import os, json, re

ROOT = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(ROOT) == '_internal':
    ROOT = os.path.dirname(ROOT)
CAT_P = os.path.join(ROOT, '_internal', "db", "api_catalog.json")
REQ_P = os.path.join(ROOT, "assets", "js", "request.js")
CAT = json.load(open(CAT_P, encoding="utf-8"))
BY = {a["name"]: a for a in CAT}
log = []

def fields(name, arg_index=0):
    a = BY[name]
    while len(a["args"]) <= arg_index:
        a["args"].append({"name": "body", "type": "object", "fields": {}})
    ar = a["args"][arg_index]
    ar.setdefault("type", "object")
    ar.setdefault("fields", {})
    return ar["fields"]

def put(name, key, spec, arg_index=0):
    f = fields(name, arg_index)
    if key not in f:
        f[key] = spec; log.append("%s.%s" % (name, key))

S = lambda zh, mx=64: {"type": "string", "min": 0, "max": mx, "zh": zh}
E = lambda vals, zh: {"type": "enum", "values": vals, "zh": zh}

# ---------- 1. 角色值域统一：页面注册下拉 grower/research ↔ 数据库 farmer/expert ----------
ROLES = ["consumer", "merchant", "grower", "research", "admin", ""]
for a in CAT:
    for ar in a["args"]:
        r = (ar.get("fields") or {}).get("role")
        if isinstance(r, dict) and r.get("type") == "enum":
            r["values"] = ROLES
            r["zh"] = "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
log.append("role 值域统一为 consumer/merchant/grower/research/admin（%d 处）" %
           sum(1 for a in CAT for ar in a["args"] if isinstance((ar.get("fields") or {}).get("role"), dict)))

# ---------- 2. 按田建单页的全部选项（新建 / 重发共用同一 payload） ----------
BY["reissueWorkorder"]["summaryZh"] = "新建工单（无原单号时）或按原单重新发起；页面表单字段与本接口一一对应"
BY["reissueWorkorder"]["flowZh"] = ("① 个人田园「远程创建工单」/ 按田建单页逐项填写 → 本接口（原单号为空即新建）"
                                    " → ② listWorkorders / getWorkorder 看状态 → ③ acceptJob 承接"
                                    " → ④ cancelWorkorder / amendWorkorder / applyRefund 售后")
f = fields("reissueWorkorder", 1)
for k, sp in {
    "priority": E(["常规", "优先", "紧急"], "优先级，与页面下拉一致"),
    "qualification": S("承接资质要求（页面下拉二选一）", 128),
    "settle": E(["验收通过后平台结算", "按阶段结算", "月度汇总结算"], "结算方式，与页面下拉一致"),
    "budget": S("预算（元），提交前按价格公示复算", 32),
    "safety": S("安全与注意事项", 256),
    "materials": S("物料与用量", 256),
    "acceptance": S("验收标准", 256),
    "window": S("作业时间窗", 128),
    "due": S("期望完成日期", 32),
    "note": S("备注与变更约定", 256),
    "plotNo": S("挂靠田园编号（软引用 farm_plot.plot_no）", 32),
    "photo": S("回执照片路径（只存路径）", 512),
}.items():
    put("reissueWorkorder", k, sp, 1)

# ---------- 3. 田园档案 / 活动 / 论坛 / 合同 等表单字段补齐 ----------
for k, sp in {
    "title": S("田园名称"), "region": S("所在地区"), "area": S("面积（亩）", 32),
    "soil": S("土壤类型"), "leaseType": S("承包类型"), "leaseStart": S("租期起"), "leaseEnd": S("租期止"),
    "rent": S("租金（元/季）", 32), "deposit": S("押金", 32), "price": S("公示单价", 32),
    "currentCrops": S("当前作物", 128), "pastCrops": S("历史作物", 128), "facilities": S("配套设施", 128),
    "readings": S("四季温湿度读数", 128), "descZh": S("中文简介", 512), "nameZh": S("中文名"),
    "nameEn": S("英文名"), "photos": S("图集路径（只存路径）", 512), "water": S("水源条件"),
    "use": S("用途"), "years": S("承包年限", 32),
}.items():
    put("saveFarm", k, sp, 1)

for k, sp in {
    "slot": E(["全天", "半天", "过夜"], "活动时段，与页面下拉一致"),
    "guests": S("预计人数", 32), "price": S("活动价目", 32),
    "descZh": S("活动简介", 512), "content": S("活动详情", 512),
    "photos": S("活动图集路径（只存路径）", 512), "field": E(["土壤与施肥", "病虫害防治", "育种与育苗", "采后与溯源"], "专家领域，与页面下拉一致"),
    "address": S("场地地址"), "contact": S("联系方式"), "phone": S("联系电话", 32),
    "org": S("主办村集体 / 商家"), "team": S("服务团队"),
}.items():
    put("publishActivity", k, sp, 0)
    put("updateActivity", k, sp, 1)

for k, sp in {
    "board": S("论坛版块"), "bodyZh": S("中文正文", 1024), "bodyEn": S("英文正文", 1024),
    "title": S("帖子标题"), "name": S("署名"),
}.items():
    put("saveTopic", k, sp, 1)

for k, sp in {
    "copyFrom": S("复制自哪版合同编号", 32), "effective": S("生效日期", 32),
    "remark": S("修订备注", 256), "dispute": S("争议处理约定", 256),
}.items():
    put("saveContract", k, sp, 0)

for k, sp in {
    "advice": S("技术建议", 512), "conclusion": S("技术结论", 512),
    "basis": S("数据依据", 256), "actual": S("实测读数", 128),
    "estimate": S("估算值", 128), "readings": S("多维读数", 256),
}.items():
    put("saveRegulation", k, sp, 0)

for k, sp in {
    "amount": S("金额（元），提交前换算为 amountCents（分）", 32),
    "payer": S("付款方"), "repeat": S("重复口令确认，仅前端校验"), "confirm": S("二次确认标记，仅前端"),
}.items():
    put("applyRefund", k, sp, 0)

# ---------- 4. 枚举值域：页面实际选项 ↔ API ----------
BY["applyRefund"]["args"][0]["fields"]["method"] = E(
    ["原支付渠道", "平台余额", "平台担保支付", "村集体统一结算", "线下转账",
     "original", "balance", "bank"],
    "退款去向：页面中文展示值与后端机器码等价，后端归一 original / balance / bank")
for n in ("reviewRefund", "reviewWithdrawal"):
    BY[n]["args"][1]["fields"]["decision"] = E(
        ["核对通过", "已驳回", "转复审", "待补材料", "复核通过", "驳回"],
        "管控结论：页面中文值与机器码等价；转复审进入 stepAudit 下一级，驳回写回台账")
log.append("method / decision 值域与页面下拉统一")

# ---------- 5. upload 流程备注补关联接口 ----------
BY["upload"]["flowZh"] = ("① 表单选文件 → 本接口（只写 attachment.file_path，不写二进制）"
                          " → ② saveFarm / reissueWorkorder / sendChat 等业务接口带 attach_no"
                          " → ③ getFarm / getWorkorder / listChats 回显路径")
log.append("upload 流程备注补 3 条关联接口")

# ---------- 6. 统计页下拉：维度别名与表格临时字段 ----------
f = fields("expertStats", 0)
for k, sp in {
    "plot": S("对比/筛选的田园编号，可多选取首块", 32),
    "field": E(["土壤与施肥", "病虫害防治", "育种与育苗", "采后与溯源"], "专家领域，归一到 dimension"),
    "table": S("统计表名（前端标识，按白名单映射）", 32),
    "h1": S("表头列 1（前端展示字段）", 32), "h2": S("表头列 2", 32),
    "t1": S("对比列 1", 32), "t2": S("对比列 2", 32),
    "t3": S("对比列 3", 32), "t4": S("对比列 4", 32),
    "new": S("变更后值", 128), "old": S("变更前值", 128),
    "msg": S("对话/备注内容", 256), "message": S("留言内容", 256),
    "job": S("关联工单号", 32), "jobId": S("关联工单号别名", 32),
    "activity": S("关联活动编号", 32), "activityId": S("关联活动编号别名", 32),
    "produce": S("关联农产品编号", 32), "farm": S("关联田园编号别名", 32),
    "farm-switch": S("田园下拉选中值 → farmId", 32),
    "count": S("数量（前端汇总，服务端按明细复算）", 32),
    "qty": S("数量（组装进 lines / items）", 32),
}.items():
    put("expertStats", k, sp, 0)

# ---------- 6b. 安全整改：会话注入字段标注 ----------
# 这些字段只能由服务端从签名会话解析，前端传值一律忽略；
# 标注进目录供后端开发者照抄路由时看到，避免水平/垂直越权。
SESSION_SRC = {
    "withdrawFunds": ["userId"],
    "acceptJob": ["assigneeId"],
    "stepAudit": ["level", "result"],
    "reviewRefund": ["decision"],
    "reviewWithdrawal": ["decision"],
}
for nm, ks in SESSION_SRC.items():
    for ar in BY[nm]["args"]:
        for k in ks:
            if k in (ar.get("fields") or {}):
                ar["fields"][k]["source"] = "session"
                ar["fields"][k]["zh"] = (ar["fields"][k].get("zh", "") +
                    "；【安全】服务端从会话注入，忽略前端传值，useMock=false 时前端携带即 403").strip()
log.append("会话注入字段标注 %d 个" % sum(len(v) for v in SESSION_SRC.values()))

# ---------- 7. 回灌 request.js 内嵌 CATALOG，保持两处一致 ----------
json.dump(CAT, open(CAT_P, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
req = open(REQ_P, encoding="utf-8").read()
i = req.find("var CATALOG = ")
j = req.find(";\n  var SAMPLE_ARGS = ", i)
assert i >= 0 and j > i, "request.js 内嵌 CATALOG 边界未命中"
body = json.dumps(CAT, ensure_ascii=False, indent=1)
body = "\n".join(" " + ln for ln in body.splitlines())
req = req[:i] + "var CATALOG = " + body + req[j:]
open(REQ_P, "w", encoding="utf-8").write(req)

print("== 目录补齐完成 ==")
print("接口条数", len(CAT), "| 参数字段总数", len({k for a in CAT for ar in a["args"] for k in (ar.get("fields") or {})}))
print("改动登记", len(log), "项")
for x in log[:12]: print("  ", x)
