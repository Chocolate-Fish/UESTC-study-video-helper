
# 刷课助手

自动解除在线学习平台的各种反人类限制，支持倍速播放 + 伪造心跳上报，让服务器以为你在正常 1 倍速观看。

> ⚠️ **仅供学习交流使用**。请遵守平台规则，理性使用。

---

## ✨ 功能

| 功能 | 说明 |
|------|------|
| 🚫 解除 5 分钟强制暂停 | 不再弹出"点击继续"打断你看视频 |
| 🚫 解除切标签页/最小化暂停 | 切出去干别的，视频后台继续播 |
| 🚫 解除右键和 F12 限制 | 恢复开发者工具正常使用 |
| ⚡ 倍速播放 | 本地 2.5 倍速（可自定义），平台检测永远显示 1 倍速 |
| 🎭 伪造心跳上报 | 每 30 秒上报的进度时间经过伪装，与正常 1 倍速完全一致 |

---

## 🚀 两种使用方式

---

### 方式一：书签小工具（以Chrome浏览器为例）

1. 地址栏输入 chrome://bookmarks/ 回车
2. 右上角 ⋮（三个点）→ "添加新书签"
3. 名称：刷课助手
<img width="2560" height="1400" alt="image" src="https://github.com/user-attachments/assets/bf613ed6-3f8d-4b81-8b4a-18eca1d4e2bf" />

4. 网址：积极分子粘贴 `jjfz-javascript:` 代码，发展对象粘贴 `fzdx-javascript:` 代码，具体倍速请修改代码中的const R=2.5，数字即为倍速
5. 保存

> ⚠️ 每次刷新页面或重新进入课程，需要再点一次书签。
<img width="2560" height="1400" alt="image" src="https://github.com/user-attachments/assets/5fe039f4-b66a-47d5-bbe7-105142e9f8e3" />

---

### 方式二：F12 控制台

1. 打开课程页面，按 `F12` 打开开发者工具
2. 切换到 **Console（控制台）** 标签
3. 积极分子粘贴 `src/jjfz-console.js` 里的代码，发展对象粘贴 `src/fzdx-console.js` 里的代码，回车，具体倍速请修改代码中的 const TARGET_RATE = 2.5，数字即为倍速
4. 看到 `✅ 已开启 x 倍速伪装` 即成功

> ⚠️ 刷新页面后失效，适合临时应急。
<img width="2560" height="1400" alt="image" src="https://github.com/user-attachments/assets/420fc051-56df-4ff8-bcdd-efc09c1fd03b" />

---

## 🔧 原理简述

### 1. 解除暂停限制
- 覆盖 `loop_pause` 函数为空函数
- 拦截 `setTimeout`，阻止平台注册暂停定时器
- 劫持 `document.visibilityState`，让平台始终认为页面在前台

### 2. 倍速伪装（核心）

平台检测倍速的代码：
```js
if (player.media.playbackRate != 1) {
    player.media.playbackRate = 1;  // 强制改回
}
```

**绕过方式**：劫持 `video.playbackRate` 的 getter，让平台读取时永远得到 `1`，但底层通过原生 setter 维持真实倍速播放。平台以为你在正常看，实际上你在飞。

### 3. 伪造心跳

平台每 30 秒发送一次进度心跳：
```js
$.ajax({
    url: "/jjfz/lesson/current_time",
    data: { time: video.currentTime }  // ← 这里上报真实时间
})
```

**绕过方式**：维护一套独立的"伪造时钟"：
- 本地视频以 2.5 倍速狂奔
- 但上报给服务器的 `time` = 按真实世界流逝的 1 倍速时间计算
- 服务器看到的进度曲线与正常学习者完全一致

---

## ⚠️ 已知风险

| 风险 | 说明 |
|------|------|
| 平台后端升级 | 如果服务器增加更复杂的异常检测（如鼠标轨迹、IP 分析等），前端脚本无法绕过 |
| 账号风控 | 频繁异常可能触发平台风控，但我个人目前实际体验良好 |

---

## 📝 适配说明

当前脚本针对以下特征的平台：
- 视频元素 ID 为 `video`
- 心跳接口路径包含 `/jjfz/lesson/current_time`或`/fzdx/lesson/current_time`
- 使用 jQuery `$.ajax` 或原生 `XMLHttpRequest` 发送心跳

**适配其他平台**：修改脚本中的 URL 匹配规则（搜索 `current_time` 替换为你平台的进度上报接口），以及视频元素选择器。

---

## 📜 License

MIT License - 仅供学习交流，使用者自行承担风险。
```
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
