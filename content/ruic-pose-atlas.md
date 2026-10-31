---
title: RuiC-PoseAtlas：288 组人体姿势、1407 套服装、1499 张 AI 人像的本地参考图库
date: 2026-10-31
category: AI 工具
tags: [参考图库, 人体姿势, 服装图鉴, AI 人像, 静态站点, GitHub Pages, 三语搜索]
source: 大概是BUG
source_url: "https://mp.weixin.qq.com/s/N2_6bLe3PZdGPjyMQgYDZw"
repo_url: "https://github.com/HRuiCcc/RuiC-PoseAtlas"
repo_name: "github.com/HRuiCcc/RuiC-PoseAtlas"
skills_note: "本地跑：git clone 后 python3 -m http.server 8123 --bind 127.0.0.1；数据校验：npm run verify"
summary: 把 288 组多角度人体姿势、1407 套无人物服装、1499 张 AI 人像打包成一个纯静态站点，零依赖打开即用，支持中英日三语关键词搜索与深链接。
---

## 一句话

**RuiC-PoseAtlas** 把三种参考素材（姿势 / 服装 / 人像）打包成一个**纯静态站点**，打开即用、不用装任何依赖，面向画画、建模、AI 出图的人。

## 三个图鉴

### 姿势：288 组 × 4-5 视角 = 1439 张

- 每组姿态 4-5 个视角：正面、斜侧、侧面、俯视、仰视
- 全部是**去脸的人台线稿**，不受人脸干扰
- 两种浏览模式：**按组浏览**（对比同一姿势的不同角度）、**单张模式**（逐个挑）
- 大图快捷键：`←/→` 切角度、`↑/↓` 换姿势、`ESC` 关闭

### 服装：1407 套完整穿搭

- **没画人**的完整穿搭，8 个季节/场景分类：春夏秋冬、内衣、派对、泳装、性感
- 每套拆成 **8-10 个单品标签**：颜色、材质、版型、配饰都能搜
- 搜索例子：`黑色百褶裙` / `corset` / `レース` 都能命中
- 网格首屏只加载 72 张，滚动自动续，不会卡

### 人像：1499 张 AI 生成虚构人脸

| 分区 | 数量 | 用途 |
|---|---|---|
| 脸部 | 893 张 | 正面纯背景，适合**固定角色长相** |
| 造型 | 606 张 | 带服装和氛围，用来**扩展设定** |

- 按短发 / 中发 / 中长发 / 长发筛选
- 搜索同样支持三语

## 三语与深链接

- 三个页面**共用一套语言设置**，切页面不会丢
- URL 带 `?lang=zh|en|ja`，分享出去别人打开就是你选的语言
- 深链接支持直接定位到某组姿势的某个角度、某套衣服、某张人脸

## 怎么跑

```bash
git clone https://github.com/HRuiCcc/RuiC-PoseAtlas.git
cd RuiC-PoseAtlas
python3 -m http.server 8123 --bind 127.0.0.1
# 浏览器打开 127.0.0.1:8123
```

**别直接双击 HTML 文件**——会被浏览器的安全策略拦住。也可以 `npm start`，效果一样。

## 部署

- 仓库自带 GitHub Actions，推代码自动部署到 GitHub Pages
- 在线地址：`hruiccc.github.io/RuiC-PoseAtlas`，三个子页面分别是根目录、`/costume.html`、`/face.html`
- Cloudflare Pages：框架预设选 **None**，构建命令**留空**，输出目录填 **/**（`_headers` 已配好缓存策略）
- Netlify / Vercel / Nginx 直接挂目录，**没有构建步骤**

## 几个细节

- **人像原图 4.5GB 没进仓库**：线上看大图从原站加载；要离线原图跑 `npm run fetch-faces`
- **图片策略**：网格只加载缩略图，点开大图才请求原图，相邻图片空闲时预加载
- **校验脚本**：`npm run verify` 检查数据完整性、翻译是否齐全、图片尺寸对不对
- **代码是原生 JS，没框架**

## 现状

仓库 2026-10-28 建，两天多涨到 **671 stars**，在线版直接跑在 GitHub Pages 上（`hruiccc.github.io/RuiC-PoseAtlas`）。适合需要稳定角色姿态、服装搭配、固定人设长相的 AI 短剧 / 漫画 / 建模工作流——素材是本地静态文件，不依赖任何在线服务。
