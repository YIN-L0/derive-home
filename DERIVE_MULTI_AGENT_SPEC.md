# Dérive Multi-Agent Hackathon Spec

## 1. 项目目标

Dérive 是一个 spatial memory layer。

它把地点中的 people、objects、stories、movement、time 组织成一个 spatial-temporal graph。

当前项目已经存在：

- 3D apartment scene
- timeline / year switching
- memory objects
- 用户通过自然语言告诉 AI memory object，然后系统将其加入 3D scene

不要重写以上已有功能。本次任务是在现有项目上增加明确分工的 multi-agent architecture。

核心原则：Each agent owns one bounded responsibility. If one agent can do the task, do not call another agent. 不要为了 "multi-agent" 人为拆分同一个任务。

---

## 2. Agent Architecture

### Agent A — Memory Capture Agent

唯一职责：把自然语言 memory 转换成 structured spatial memory。

Example input: "There was a camera on the desk. My grandfather used it to photograph family dinners."

```json
{ "object": "camera", "person": "grandfather", "event": "photographing family dinners", "location": "desk", "year": null }
```

不负责：采访用户、比较年份、historical linking、导入文学作品、voice conversation。

这个 Agent 已经部分实现，尽量复用现有代码。

### Agent B — Voice Interview Agent

唯一职责：针对已经存在但信息不完整的 memory，通过对话补全缺失字段。

Trigger：用户选中一个 memory object，然后点击 `Talk about this memory`。

需要补全的字段：person、approximate year、event、location、relationship。每次只问一个问题。

```json
{ "person": "grandmother", "year": "~1998" }
```

重要：如果用户不知道，返回 unknown/null。不要编造。

不负责：创建新 object、分析 timeline、连接不同 memory、处理文学作品。

### Agent C — Historian Agent

唯一职责：分析已经存在的 memory nodes，寻找跨时间关系。

```json
{
  "entity": "book",
  "relationship": "same_object_across_time",
  "timeline": [
    { "year": 1998, "person": "grandmother", "location": "window" },
    { "year": 2018, "person": "tenant", "location": "sofa" },
    { "year": 2026, "person": "current resident", "location": "moving box" }
  ],
  "confidence": 0.9
}
```

只允许这些关系：same_object、moved、inherited、shared、left_behind、same_person、possible_conflict。

如果不确定：不要 merge。

不负责：采访、创建 memory、voice、导入文学作品、比较整个 era。

### Agent D — Literature Import Agent

唯一职责：将用户提供的文学文本转换成 spatial story graph。

Trigger：`Import a Story`。第一版只支持 pasted text、TXT、built-in demo text。不要先做 EPUB。

提取：characters、explicit places、important objects、events、movement、temporal order。

```json
{
  "title": "Story Title",
  "characters": [],
  "places": [],
  "objects": [],
  "scenes": [
    { "order": 1, "place": "Cafe", "characters": ["A", "B"], "objects": ["Book"], "eventSummary": "They meet", "placeType": "explicit", "confidence": 0.95 }
  ]
}
```

规则：不要编造地点；explicit / inferred 要区分；不要生成不存在的 quote；不要下载整本版权作品；优先处理 user-provided 或 public-domain text。

导入后创建独立 layer `LITERATURE`，可以 ON/OFF。

### Agent E — Temporal Compare Agent

唯一职责：比较同一个地点的两个时间状态。

Trigger：`Compare Eras`。Input：Year A、Year B。

```json
{
  "movedObjects": [], "persistentObjects": [], "newObjects": [], "removedObjects": [],
  "changedOwnership": [], "changedSpatialUse": [], "movementChanges": [], "summary": ""
}
```

Example：1998 → 2026。Dining table: family meals → remote workspace。Book: bookshelf → moving box。Plant: unchanged。

不负责：判断两个 memory 是否是同一个 object、创建 memory、采访、处理 literature。

Historian 应该先处理 identity linking，Compare Agent 只比较两个已结构化的 scene states。

---

## 3. Routing

不要先做复杂 autonomous router。使用 deterministic UI routing：

| 用户操作 | Agent |
|---|---|
| Add Memory | Memory Capture |
| Talk About This Memory | Voice Interview |
| Save/Update Memory | Historian |
| Import a Story | Literature Import |
| Compare Eras | Temporal Compare |

如果未来接入 fast routing model，再作为 Phase 3。

---

## 4. Multi-Model Strategy

不要让所有 agent 都只是同一个大模型换 system prompt。

- Fast / cheap model：structured extraction、simple classification、Memory Capture
- Strong reasoning model：Historian、ambiguity、temporal relationship reasoning
- Voice / speech model：Voice Interview Agent
- Long-context model：Literature Import Agent

如果当前项目没有多个 provider，先创建统一 provider interface，不要破坏现有功能。

---

## 5. UI Requirements

需要一个明显的 `AGENT ACTIVITY` panel，逐个列出每个 agent 的状态和最近一次结果。

评委必须能看到哪个 agent 在工作。不要把所有 agent 隐藏在后台。

---

## 6. Agent Status Model

每个 agent 支持：idle、running、success、error。

每次运行记录：agent name、input summary、output summary、latency if easy to measure。

不要保存或展示敏感 token。

---

## 7. Phase 1 — 必须先完成

只实现：1. Voice Interview Agent　2. Historian Agent　3. Agent Activity panel。

不要先做 Literature Import 和 Temporal Compare。完成后 run project、test、fix TypeScript errors、fix runtime errors。只有 Phase 1 working 才进入 Phase 2。

## 8. Phase 2

实现：4. Literature Import Agent　5. Temporal Compare Agent。先做最小可运行版本。

Literature：pasted text → structured scenes。Compare：year A + year B → structured diff。不要过度设计 UI。

## 9. Phase 3 — Only if time remains

fast intent router、richer voice UI、agent latency display、model/provider labels、literary routes in 3D。不要在 Phase 1 前做这些。

---

## 10. Existing Code Protection

- 不重写现有 3D scene
- 不替换现有 working memory insertion
- 不大规模重构
- 不改变已有数据结构，除非必要
- 优先增加 adapter / helper
- 每完成一个 agent 就测试

如果新功能导致已有功能坏掉：恢复到最后一个 working state。

---

## 11. Success Criteria

1. Existing 3D experience still works
2. Existing AI memory object insertion still works
3. User can select a memory and start an interview
4. Interview can update missing fields
5. Historian can connect memories across time
6. Agent Activity UI clearly shows agent execution
7. Literature Import can parse one pasted story
8. Temporal Compare can compare two eras
9. No blank screen
10. Demo is stable enough to record

---

## 12. Demo Flow

1. Open 3D place
2. Add one memory using existing Memory Capture Agent
3. Select that object
4. Click Talk About This Memory
5. Voice Interview fills missing person/year
6. Historian links it to an older/newer memory
7. Show object trajectory
8. Click Import a Story
9. Import one short literary passage
10. Show literary layer
11. Compare 1998 vs 2026
12. Show Agent Activity panel throughout

---

## 13. Final Output Required

完成后明确说明：改了哪些文件；每个 agent 在哪个文件；每个 agent 使用哪个 model/provider；Agent Activity UI 在哪里；怎么测试 Voice Interview、Historian、Literature Import、Temporal Compare；哪些功能仍然是 mock；当前最稳定的 demo path 是什么。

## 14. Development Rule

Do not implement everything at once. Implement Phase 1 first. Run it. Verify it. Then continue.
