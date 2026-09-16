---
title: Hermes Agent 遇上 book-to-skill：把技术书编译成 Agent 技能
date: 2026-07-29
category: AI Agent
tags: [book-to-skill, Hermes Agent, Agent Skills, 知识管理, 开源项目]
source: 昕科技
source_url: "https://mp.weixin.qq.com/s/FvNZvM8ymi_g1UZsRfU0kw"
summary: book-to-skill 把技术书编译成 AI Agent 可直接加载的技能——按需懒加载章节，比全书注入上下文省 24~51 倍 token，并给出集成到 Hermes Agent 的三步操作实测。
---

> PDF 扔给它，比你读完了记得还牢。把技术书变成 Agent 技能，边写代码边"调用"书里的知识。

## 为什么需要"技能编译器"

你买过多少本技术书，读了一遍，三个月后连第七章讲过啥都记不起来？每次写代码遇到似曾相识的问题，隐约记得某本书里讲过，翻 PDF 搜关键词——搜出一堆页码，没有答案。问 AI 吧，它要么编个答案糊弄你，要么说"我没有这本书的内容"。

市面上不缺知识管理工具。Notion、Obsidian、各种笔记应用，各有各的好。但一个写代码的 AI Agent 面临的问题不太一样——它需要的是"能直接调用的知识"，不是"能搜索的笔记"。

一本好书之所以好，是因为作者花了很多年构建了一套框架——命名了概念、总结了原则、区分了正反面模式。读书的时候你觉得懂了，但三个月后这些东西在脑子里就是一团浆糊。你想让 AI Agent 替你记着这些框架，但 Agent 要么没有这本书的内容，要么自己翻 PDF 翻到超 budget 也找不到答案。

**book-to-skill** 就是解决这个问题的开源工具——一个把技术书变成 AI Agent 技能的"技能编译器"。

## 01 它不是笔记工具，是"技能编译器"

book-to-skill 做的事很直接：**把一本书变成 AI Agent 能直接加载的"技能"**。

不是把 PDF 丢给 Agent 让它慢慢翻页，而是像编译器一样，提前把书里的框架、原则、反模式、决策规则提取出来，组织成 Agent 能直接"调用"的结构。

一个典型的输出长这样：

```text
~/.agents/skills/designing-data-intensive-apps/
├── SKILL.md　　# 核心心智模型 + 章节索引（~4K tokens）
├── chapters/
│　├── ch01-replication.md　　# 按需加载，每章 ~1K tokens
│　├── ch02-partitioning.md
│　└── ...
├── glossary.md　　# 关键词术语表
├── patterns.md　　# 所有技术/算法/设计模式
└── cheatsheet.md　# 决策表 + 速查规则
```

关键设计在于：**章节文件是懒加载的**。你不问那章，它就不占 token 预算。这和直接把 PDF 塞进上下文的区别有多大？用作者提供的测试工具跑出来的对比：

| 方式 | Token 消耗/问题 | vs book-to-skill |
|---|---|---|
| 全书注入上下文 | 119K–256K | 24×–51× |
| Agent 自己翻页搜索 | 12K–78K | 2.4×–15.6× |
| **book-to-skill** | **~5,000** | — |

数字会说话。不是一点点省，是几十倍省。而且全文注入的成本**每轮对话都要付**，skill 只付一次提取成本（大约一本书 $1），之后的每次查询只加载几千 token。

## 02 但它的真正价值不是省 token

省 token 只是附带的好事。book-to-skill 和 RAG 有本质区别：

- **RAG** 做的事是"找相似段落"——你把书切碎、向量化，用户问问题，找出最相似的 chunk 塞给模型。它在回答"**哪里提到了 X**"。
- **book-to-skill** 做的是另一件事：**提取作者构建的框架**。一本好书之所以好，不是因为句子漂亮，而是因为作者花了很多年构建了一套框架。它提取的是这些东西，不是句子。所以当 Agent 加载了一个 skill，它不是在翻书，而是在**用作者的框架思考**。

> RAG 回答"找到相似段落"，skill 回答"这里有 12 个框架，拿去用"

## 03 问题：Hermes Agent 能用吗？

book-to-skill 遵循开放的 Agent Skills 标准，GitHub Copilot CLI、Claude Code、Amp 都原生支持。那日常用的 **Hermes Agent** 呢？

Hermes Agent 是 Nous Research 开源的 AI 编程代理（11.6k stars、支持任何 LLM、可以跑在终端/桌面/IDE/Telegram/Discord…）。它的技能系统就在 `~/.hermes/skills/` 下，同样兼容 Agent Skills 标准。所以把 book-to-skill 生成的书技能搬到 Hermes 上，只需要三步。

## 04 三步集成到 Hermes Agent

### STEP 01 安装 book-to-skill

```bash
# 从 GitHub 直接安装
pip install git+https://github.com/virgiliojr94/book-to-skill.git

# 检查提取器状态
book-to-skill --check
```

### STEP 02 把书转成技能

```bash
book-to-skill ~/books/技术书.pdf 技能名

# 多文件合成一个技能
book-to-skill ~/papers/paper1.pdf ~/notes/export.txt unified-research
```

### STEP 03 让 Hermes 加载它

```bash
# 直接复制
cp -r ~/.agents/skills/技能名/ ~/.hermes/skills/技能名/

# 或者建个软链，后续更新不用再复制
ln -s ~/.agents/skills/技能名 ~/.hermes/skills/技能名
```

然后就可以在 Hermes 中直接引用了：

```text
@skill:技能名 讲一下这个框架的核心原则
@skill:技能名/ch03 加载第三章的内容
```

## 05 实测：我自己跑了一遍

作者拿自己写的一篇关于"单人开发者方法论"的短文做了测试。519 个词、3 章内容，提取器瞬间完成：

```text
Extracting text document: test-knowledge.md
Extraction complete:
　 Sources : 1 processed
　 Words　 : 519
　 Chapters: 2 detected overall
　 Tokens　: ~0K
```

提取完的纯文本保存在工作目录，然后传给 LLM 分析结构、生成章节摘要、构建整个技能文件。整个过程就是把一份文档变成了 Hermes 可以随时加载的技能。

这就意味着：下次写代码时想到"等等，那本书里好像讲过这个模式"——不用翻 PDF、不用搜索、不用凭记忆猜——直接让 Agent 加载技能，它就能用书里的框架帮你做决策。

## 06 不只是技术书

book-to-skill 的名字叫"书转技能"，但输入不限于书。架构决策记录、runbook、品牌指南、RFC、论文合集——任何你频繁翻阅的文档，都可以变成一个技能。

> 如果你有一个文档，频繁到你觉得"要是我背下来就好了"——那它就是候选者。

## 写在题外

这个项目两个月前才开始，现在 11.6k stars、1.3k forks，趋势榜上有名。星数说明了一件事：**这个痛点是真的痛**。

技术书几百块一本，读一遍花几十个小时，但真正能"用"在每天工作里的有多少？book-to-skill 给出的答案不是"更好地记笔记"，而是**让 AI 替你记**——以它能直接理解的方式。

在 AI Agent 越来越普及的今天，"你掌握了哪些知识"和"你的 Agent 掌握了哪些知识"之间的差距，可能就是你和平庸团队的差距。

---

*测试环境：WSL2 + Python 3.13，book-to-skill v1.2.0（GitHub 安装），Hermes Agent（Nous Research）*

*原文链接：[mp.weixin.qq.com/s/FvNZvM8ymi_g1UZsRfU0kw](https://mp.weixin.qq.com/s/FvNZvM8ymi_g1UZsRfU0kw)*
