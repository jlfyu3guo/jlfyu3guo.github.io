---
title: 把 3000 个 API 打包进 CLI，Cloudflare 这个赛博菩萨进化得有点猛
date: 2026-09-30
category: AI Agent
tags: [Cloudflare, cf CLI, Agent 基建, Serverless, D1, Tunnels, MCP]
source: 艾康在路上
source_url: "https://mp.weixin.qq.com/s/B3f7gA_FdKbbzV0yDDizhA"
repo_url: "https://github.com/cloudflare/cf"
repo_name: "github.com/cloudflare/cf"
skills_note: "安装：npm i -g cf　|　登录：cf auth login（设备码授权，免手找 API Token）　|　前置：Cloudflare 账号（免费注册）+ Node.js v20/v22+"
summary: Cloudflare 官方全量上线 CLI「cf」，把 3000+ 个 API 操作打包成一个命令行工具，且按 Agent 一等公民设计——一条命令装好即可让 Agent 自己查命令、建库、部署上线，免买服务器、免配证书。
---

## 一句话

**cf** 是 Cloudflare 官方的全新命令行工具，把涵盖计算、存储、网络、AI、安全在内的 **3000+ 个 API 操作**全打包进一个 CLI，并且把 AI Agent 当一等公民设计——你装好、登录好，Agent 自己就能查命令、建数据库、部署上线，无需再去网页控制台翻菜单。

## 前置：安装与登录（零门槛）

- 前置：一个 Cloudflare 账号（官网 1 分钟免费注册，无需信用卡）+ 本机 Node.js（建议 v20/v22+）。
- 一行安装：`npm i -g cf`，装完 `cf --version` 能出小橙子小云朵图标即成功。
- 登录用**设备码流程**，不再需要去后台手找 API Token 再粘贴：

```bash
cf auth login     # 终端打印验证链接并自动打开浏览器授权页
cf auth whoami    # 列出当前已授权账号的全部权限
```

- 隐私洁癖：CF 默认匿名上报命令频次与 search 词，在 `~/.zshrc`/`~/.bashrc` 加 `export DO_NOT_TRACK=1` 即可关闭遥测。

## 核心知识点（5 个可直接上手的玩法）

**1. Tunnels：一行命令把本地服务临时变成公网网站**

```bash
cf tunnels quick-start http://localhost:4000
```

Cloudflare 在公网与你本地端口之间临时架一条加密管道，输出一个 `https://xxx.trycloudflare.com` 临时域名，手机/朋友秒开。代码 100% 仍跑在你电脑上，**免买域名、免配 SSL、免租云服务器**；`Ctrl+C` 即销毁、无安全残留。首次运行会稍等（后台静默下载穿透组件）属正常。

**2. 静态页/前端秒上线，关机也在线**

```bash
cf init my-site     # 官方脚手架初始化 + 自动装依赖，选 npm 回车即可
# 把你的单页（简历/数据大屏/活动页）改名 index.html 放进 my-site/
cd my-site && cf deploy
```

首次部署 Worker 时会提示注册一个 `xxx.workers.dev` 免费子域名（每账号仅一次）。几十秒内页面推到边缘网络，自带免费 HTTPS + CDN 加速，**个人项目完全免费，电脑关机仍 24h 在线**。

**3. 意图搜索：不用记命令，搜你的"意图"**

```bash
cf cli search "create database"
```

毫秒级返回匹配度最高的前 5 个命令及用法摘要。注意：底层 MiniSearch 索引的是 Cloudflare 官方**英文**文档，输入中文（如"创建数据库"）会返回空 `[]`——所以实际是让 Agent 替你搜并执行，英文不好也没关系。

**4. 全球边缘 Serverless 数据库 D1（底层 SQLite）**

```bash
cf d1 create --name my-db                       # 秒级建库，返回专属 uuid
cf d1 query <数据库UUID> --sql "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);"
cf d1 query <数据库UUID> --sql "INSERT INTO users (name) VALUES ('KK');"
cf d1 query <数据库UUID> --sql "SELECT * FROM users;"   # 结果以 JSON 整齐输出
```

无需 Navicat/DBeaver，终端直接对云端库建表、读写；免费额度对个人开发者充裕，解决"云 DB 太贵、本地 SQLite 没法持久化"的痛点。

**5. 给 Agent 装上"基础设施全套外挂"**

- cf 把全平台 3000 个命令转成一套符合 **MCP 标准**的工具描述 JSON，Agent 可直接调用。
- 新体系里项目配置统一为带类型检查的 TypeScript（`cloudflare.config.ts`）：Agent 生成/改配置若拼错字段，**类型检查当场拦截报错**，Agent 后台即可自动纠错，不用等到部署失败才发现。
- 典型甩手掌柜指令：「我已装好 cf 并登录，请帮我查怎么建 D1，建一个 my-notes 库，写好配置，再 cf deploy 上线。」

## 为什么值得关注（一组数据）

Cloudflare 官方披露：Agent 对传统 CLI 的调用占比从 **2025 年初的个位数 → 2026 年 3 月的 25% → 新 CLI 发布前一周达 48%**；Agent 每天调用的不同命令种类是人类的 **2 倍**，连续执行 6 个以上复杂指令的概率是人类的 **4 倍**。基础设施的使用门槛，正在被 AI 全面重塑。

## 现状与适配范围

- 适合：给前端/独立开发做临时演示、静态站部署、个人记账/博客需要边缘库、以及让 AI Agent 自己操基础建设。
- 不适合/注意：需要长期可控的生产级数据库、或离线/无 Cloudflare 账号场景；Tunnels 是临时通道，关掉即失效，别当正式部署用。
