---
title: 局域网 LLM 模型库：地址、密钥获取与选型
date: 2026-10-07
category: 模型库
tags: [LLM, 本地推理, Qwen, DeepSeek, RAG, llama.cpp, Ollama, 运维]
source: 知栈自维护
source_url: "https://www.jstock.cc"
skills_note: "直连三件套：地址 + 模型 + key。key 文件在工作站 ~/.config/xiaoma-ai/api-keys.txt（3 个：群晖 / 飞牛 / itassistant），按客户端前缀取自己的行，值不外传"
summary: 局域网 LLM 服务清单（实时探测）：工作站 Qwen3.8-27B :8000、两台 NAS 的 SenseNova 代理 :18080，附 key 获取方式、ctx 限制与模型切换规则，接一条命令直连。
---

## 一句话

局域网跑着三组 LLM 端点：**工作站 192.168.1.115 :8000（Qwen3.8-27B 本地推理）**、**群晖 :18080 / 飞牛 :18080（商汤 SenseNova 代理，12 Key 轮转）**。全部 OpenAI 兼容接口，拿 `地址 + 模型名 + key` 三件套即可直连，不走公网。

## 服务清单（2026-10-07 实时探测）

| 端点 | 模型 | 状态 | 说明 |
|---|---|---|---|
| `http://192.168.1.115:8000/v1` | xiaoma-qwen3.8-27b | ✅ 在线 | 工作站 RTX 4070TiS 16GB，UD-Q3_K_XL 量化 |
| `http://192.168.1.115:8001/v1` | （切换后启用） | ⬚ 当前未起 | 备用端口，模型切换时启用 |
| `http://192.168.1.5:18080/v1` | deepseek-v4-flash（默认） | ✅ 在线 | 群晖 sensenova-proxy 容器，12 Key 轮转 |
| `http://192.168.1.190:18080/v1` | deepseek-v4-flash（默认） | ✅ 在线 | 飞牛 sensenova-proxy 容器，独立 12 Key |
| `http://192.168.1.115:8080` | 旧中转 | ❌ 已下线 | 仅作兜底记忆，不要再配 |

## 密钥获取（key 值不公开，按需自取）

- key 文件：工作站 `~/.config/xiaoma-ai/api-keys.txt`，3 行：
  `synology-<key>`、`fnos-<key>`、`hermes-itassistant-<key>`
- 按你跑的客户端取对应行的 key 值，作为 `Authorization: Bearer`
- **key 值不入任何记忆、不回话、不上公开站点**；泄露即轮换

## 最小直连示例

```bash
# 本地 Qwen 27B（工作站）
curl http://192.168.1.115:8000/v1/chat/completions \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"xiaoma-qwen3.8-27b","messages":[{"role":"user","content":"ping"}]}'

# SenseNova 代理（NAS，默认 deepseek-v4-flash）
curl http://192.168.1.5:18080/v1/chat/completions \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4-flash","messages":[{"role":"user","content":"ping"}]}'
```

## 使用限制与规则

1. **ctx 49152**：Qwen 27B 当前上下文 49152 token，不到 64K；超长输入要自己分段（workaround 已做在服务端）。
2. **不支持双模型同跑**：工作站 `switch-model.sh` 切换 Qwen3.8-27B ⇄ DeepSeek-R1-14B（停旧 → 启新 → 同步群晖/fnOS 配置 → 重启容器），切完要 `/new` 开新会话。
3. **分工**：日常运维/聊天默认 Qwen；开发推理走 R1-14B；PS/动画生成时 ComfyUI 独占 16GB 显存（方案 B），此时 LLM 暂停。
4. **优先级**：NAS 本地 18080 代理 → TokenRhythm → 工作站 8000/8001 → 旧 8080 兜底。
5. **数据不出网**：本地推理全在局域网；只有 SenseNova 上游出网。

## 适用范围

- 所有 Hermes 客户端（两台 NAS + 本机）配模型 fallback 时，直接抄上表的"三件套"
- 新增 key 需真实计费调用激活（鉴权 200 不算数），按预算控制
