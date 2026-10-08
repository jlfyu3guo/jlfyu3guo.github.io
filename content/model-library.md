---
title: 局域网 LLM 模型库：地址、密钥获取与选型
date: 2026-10-08
category: 模型库
tags: [LLM, 本地推理, Qwen, DeepSeek, GLM, Kimi, SenseNova, llama.cpp, 运维]
source: 知栈自维护
source_url: "https://www.jstock.cc"
skills_note: "直连三件套：地址 + 模型 + key。key 文件在工作站 ~/.config/xiaoma-ai/api-keys.txt（3 个：群晖 / 飞牛 / itassistant），按客户端前缀取自己的行，值不外传"
summary: 局域网 LLM 服务清单（实时探测）：工作站 Qwen3.8-27B :8000、两台 NAS 的 SenseNova 代理 :18080（5 模型：sensenova-6.8-flash-lite / deepseek-v4-flash / glm-5.2 / kimi-k3 / deepseek-v4-pro），附 key 获取方式、ctx 限制与模型切换规则，接一条命令直连。
---

## 一句话

局域网跑着三组 LLM 端点：**工作站 192.168.1.115 :8000（Qwen3.8-27B 本地推理）**、**群晖 :18080 / 飞牛 :18080（商汤 SenseNova 代理，12 Key 轮转，透传 token.sensenova.cn）**。全部 OpenAI 兼容接口，拿 `地址 + 模型名 + key` 三件套即可直连，不走公网。

## 服务清单（2026-10-08 实时探测）

| 端点 | 模型 | 状态 | 说明 |
|---|---|---|---|
| `http://192.168.1.115:8000/v1` | xiaoma-qwen3.8-27b | ✅ 在线 | 工作站 RTX 4070TiS 16GB，UD-Q3_K_XL 量化 |
| `http://192.168.1.115:8001/v1` | （切换后启用） | ⬚ 当前未起 | 备用端口，模型切换时启用 |
| `http://192.168.1.5:18080/v1` | 5 模型（见下表） | ✅ 在线 | 群晖 sensenova-proxy 容器，12 Key 轮转 |
| `http://192.168.1.190:18080/v1` | 5 模型（见下表） | ✅ 在线 | 飞牛 sensenova-proxy 容器，独立 12 Key |
| `http://192.168.1.115:8080` | 旧中转 | ❌ 已下线 | 仅作兜底记忆，不要再配 |

## SenseNova 代理可用模型（实测调用）

代理为纯透传轮转，模型名直接传给上游 `token.sensenova.cn`，不做模型名映射。

| 模型名 | 群晖 :18080 | 飞牛 :18080 | itassistant :18082 | 说明 |
|---|---|---|---|---|
| `sensenova-6.8-flash-lite` | ✅ 200 | ✅ 200 | ✅ 200 | 默认模型，最快 |
| `deepseek-v4-flash` | ✅ 200 | ✅ 200 | ✅ 200 | 日常 NAS 默认 |
| `glm-5.2` | ✅ 200 | ✅ 200 | ✅ 200 | 智谱 GLM，IT 助手当前使用 |
| `kimi-k3` | ✅ 200 | ✅ 200 | ✅ 200 | 月之暗面 Kimi |
| `deepseek-v4-pro` | ✅ 200 | ✅ 200 | ⚠️ 429 偶发 | 高性能版，高峰时限流 |

- 群晖与飞牛配置完全一致，两台 NAS 都在 config.yaml 的 `sensenova.models` 列表里注册了全部 5 个模型
- `deepseek-v4-pro` 首次探测返回 429（Key 限流），第二次 200 —— 高峰期偶发，非永久故障
- itassistant 本地 `:18082` 是同一套代理的本地端口，走 `SENSENOVA_IT_PROXY_KEY`

## Hermes 配置分布

| 位置 | 代理地址 | 环境变量 | 模型发现 |
|---|---|---|---|
| 群晖 hermes 容器 | `http://192.168.1.5:18080/v1` | `SENSENOVA_API_KEY` | 5 模型已注册 |
| 飞牛 hermes-fnos 容器 | `http://192.168.1.190:18080/v1` | `SENSENOVA_API_KEY` | 5 模型已注册 |
| 本机 default + 全部 profile | `http://127.0.0.1:18082/v1` | `SENSENOVA_IT_PROXY_KEY` | 5 模型 `models_discovered: true` |

- 本机 5 个 profile（itassistant / qimaochiefqc / qimaolayan / writtera8700 / xiaowriting）+ 全局 config 都配了 `sensenova-it` provider，模型清单一致
- 其他 profile（layan* / qimao*architect 等）通过 fallback 链间接使用

## 密钥获取（key 值不公开，按需自取）

- **NAS 端**：群晖和飞牛的 `SENSENOVA_API_KEY` 已注入容器环境，12 个商汤 Key 在代理脚本 `sensenova-keys.txt` 里轮转
- **本机端**：itassistant 走 `SENSENOVA_IT_PROXY_KEY` 环境变量
- **工作站 key 文件**：`~/.config/xiaoma-ai/api-keys.txt`，3 行：
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

# SenseNova 代理（NAS，默认 sensenova-6.8-flash-lite）
curl http://192.168.1.5:18080/v1/chat/completions \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"sensenova-6.8-flash-lite","messages":[{"role":"user","content":"ping"}]}'

# 切换模型只需改 model 字段（5 选 1）
# sensenova-6.8-flash-lite / deepseek-v4-flash / glm-5.2 / kimi-k3 / deepseek-v4-pro
```

## 使用限制与规则

1. **ctx 49152**：Qwen 27B 当前上下文 49152 token，不到 64K；超长输入要自己分段（workaround 已做在服务端）。SenseNova 代理 ctx 1048576（群晖 config 标注）。
2. **不支持双模型同跑**：工作站 `switch-model.sh` 切换 Qwen3.8-27B ⇄ DeepSeek-R1-14B（停旧 → 启新 → 同步群晖/fnOS 配置 → 重启容器），切完要 `/new` 开新会话。
3. **分工**：日常运维/聊天默认 Qwen；开发推理走 R1-14B；PS/动画生成时 ComfyUI 独占 16GB 显存（方案 B），此时 LLM 暂停。
4. **优先级**：NAS 本地 18080 代理 → TokenRhythm → 工作站 8000/8001 → 旧 8080 兜底。
5. **数据不出网**：本地推理全在局域网；只有 SenseNova 上游出网（token.sensenova.cn）。

## 适用范围

- 所有 Hermes 客户端（两台 NAS + 本机）配模型 fallback 时，直接抄上表的"三件套"
- 新增 key 需真实计费调用激活（鉴权 200 不算数），按预算控制
- 代理不支持 `/v1/models` 端点（返回 404），模型清单从 Hermes config 或本文档获取
