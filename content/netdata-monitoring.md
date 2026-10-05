---
title: 80.6k Star！零配置 AI 监控神器，服务器抖一下都逃不掉
date: 2026-09-30
category: 工具链
tags: [Netdata, 监控, Linux, Docker, Prometheus, 告警, 运维]
source: 小知
source_url: "https://mp.weixin.qq.com/s/8ZUCdaQVmlxypNgr3yk1-w"
repo_url: "https://github.com/netdata/netdata"
repo_name: "github.com/netdata/netdata"
skills_note: "安装：curl https://get.netdata.cloud/kickstart.sh > /tmp/netdata-kickstart.sh && sh /tmp/netdata-kickstart.sh --stable-channel --disable-telemetry　|　Docker：docker run -d --name=netdata -p 19999:19999 netdata/netdata　|　面板：http://服务器IP:19999"
summary: Netdata 是零配置的秒级实时监控工具，装完即出图，自动发现 800+ 种服务集成，内置机器学习异常检测与数百条现成告警，替代"Prometheus+Grafana 半天起步"的监控工作流。
---

## 一句话

**Netdata**（GitHub 80.6k Star，GPL-3.0）是装完就能看的秒级实时监控系统：自带 Web 面板（默认端口 19999）、数据只存本机、不写采集配置，CPU/内存/磁盘/网络的图自动就出来了，连容器和数据库都会一起画。

## 它解决什么问题

搭 Prometheus + Grafana 要写采集配置、接数据源、调仪表盘，一个下午就没了。Netdata 反过来：**机器上跑一个 Agent 就行**，默认按秒采集（很多监控工具默认 15 秒甚至 1 分钟），几秒钟的卡顿、瞬时打满的磁盘 IO 都能完整画出尖峰并定位到进程，低频率采集下这些尖峰会直接被抹平成一条光滑的线。

## 核心知识点

**1. 自动发现，不用写采集配置**

官方支持 800+ 种集成（Nginx、MySQL、Redis、PostgreSQL、Docker、Kubernetes 全在列）。不用告诉它装了哪些服务，自己扫；机器上加了新服务，监控自动跟着加。

**2. 机器学习异常检测**

每个指标后台都跑 ML 模型：先学正常基线，再实时算异常率，图表上方有 AR（Anomaly Rate）指示。专抓"没超阈值但比平时明显不对"的问题——比平时高一点、数值不夸张，但历史对比已经异常。排查时先看哪几个指标异常率飙了。

**3. 告警开箱即用**

内置几百条现成规则（CPU 持续过高、磁盘快满、内存不够等），装完即生效。触发后支持邮件、Slack、Telegram、ntfy 等通知渠道，配置文件里填参数即可；自写规则只需说明查哪个指标、看多长窗口、超过多少告警。

**4. 自带日志查看**

面板 Logs 标签页可直接翻 systemd journal，按服务/时间过滤。图表发现异常后顺手翻到对应时间段的日志，不用另开终端敲 journalctl。

**5. 多机汇总：父子节点 vs Netdata Cloud**

多台机器的数据可以流式汇总到一台父节点统一看，配置里填父节点地址 + 密钥即可。官方还有 Netdata Cloud 云端汇总服务，但**指标数据会出网**——数据不出网的环境用自托管父子节点方案。

**6. 资源开销与存储定位**

实测 CPU 约 1%，内存 100~300MB（取决于指标数量）；1G/2G 小机器跑满服务要掂量或降低采集频率。默认优先保高精度实时数据，**历史存储有限**——看现在、看刚才很合适，跨月跨年容量趋势得换工具。

**7. 与 Prometheus + Grafana 的分工**

不是二选一：Netdata 管机器当前状态与实时排查，Prometheus + Grafana 管长期存储与复杂告警。可以双跑，Netdata 提供 Prometheus 格式接口让 Prometheus 直接采它的数据，两边打通。

## 快速开始

方式一：官方一行脚本

```bash
curl https://get.netdata.cloud/kickstart.sh > /tmp/netdata-kickstart.sh
sh /tmp/netdata-kickstart.sh --stable-channel --disable-telemetry
```

方式二：Docker

```bash
docker run -d --name=netdata -p 19999:19999 \
-v netdata_config:/etc/netdata \
-v netdata_lib:/var/lib/netdata \
-v netdata_cache:/var/cache/netdata \
--restart=unless-stopped \
--cap-add SYS_PTRACE \
--security-opt apparmor=unconfined \
netdata/netdata
```

跑起后浏览器打开 `http://服务器IP:19999` 即见面板；调告警/加集成改 `/etc/netdata` 下配置。

## 注意事项

- **19999 端口不要直接暴露公网**，正式使用套反向代理 + 认证，或只允许内网访问。
- 想存长期数据：配置分层存储或导出到外部时序数据库。

## 适用范围

每台还没装监控的 Linux 机器：一个 Agent + 浏览器面板，秒级实时排查够用；长期趋势与复杂告警规则交给 Prometheus + Grafana，两套互补。

开源地址：<https://github.com/netdata/netdata>
