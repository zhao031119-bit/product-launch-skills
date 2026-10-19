---
name: ai-video-prompt
description: 给"复刻爆款视频/梗"的 AI 视频生成写提示词：先逐帧拆原片和音频节拍，再按秒写动作、说话人、口型；参考照片和原声的写法；场景选项怎么选；长度上限；测试方法。适用于 Seedance 2.0 等多模态参考模型。Use when writing or reviewing a video generation prompt, lip-sync, reference audio, scenes, or "提示词 / 口型对不上 / 原声 / 换场景".
---

# AI 视频提示词

## 1. 先拆原片，别凭印象
- [ ] 数剪辑：逐帧比较画面差异。最大差值很小 = 一镜到底，提示词写 "no cuts"。
- [ ] 量台词：看音频波形，标出每句话的起止秒数（保留一位小数）。
- [ ] 记动作：每段谁在动、手机在哪、看哪里、什么表情。
- [ ] 写成时间轴表。例：

| 时间 | 谁说话 | 动作 | 嘴 |
|---|---|---|---|
| 0–0.4s | 无 | 低头看手机 | 闭 |
| 0.4–4.1s | 主角提问 | 手机放嘴边，像发语音 | 动 |
| 4.4–5.1s | 手机回答 | 主角愣住 | 闭 |
| 5.1–6.6s | 主角嘟囔 | 打字 | 微动 |
| 6.9–8.3s | 主角吐槽 | 抬眼看镜头 | 动 |
| 8.7–12.0s | 主角再问 | 手机回到嘴边 | 动 |
| 12–13s | 无 | 抿嘴等待 | 闭 |

## 2. 提示词结构
1. 开头一句：格式（竖屏 9:16）、一镜到底、机位和景别、地点。
2. 主角：来自 `@Image1`，保留脸或特征、肤色或毛色、发型、衣服、风格；宠物用后腿站立、爪子拿手机。
3. 时间轴：每行 `起-止s, 说话人 (动作, 情绪): "原台词"`，没人说话的段写 "mouth closed"。
4. 声音：参考音频的角色写清楚。例：`@Audio1 is the whole soundtrack, unchanged from 0 to 13 s; no music, no added words.`
5. 口型：`lips move only on their own lines … mouth closed while the phone talks and in the pauses`。
6. 收尾：别人不说话、背景的人虚化不张嘴、无字幕、手要真实。

## 3. 让口型对得上
- 景别用腰部以上，别用头到大腿：嘴在画面里要够大。
- 说话时脸朝镜头，少转头；机位稳，只轻微晃动。
- 脸要亮：暗场景（夜店、彩灯房间）嘴看不清，口型就乱。
- 每句台词标明说话人（主角 / 手机），其他人一律闭嘴。

## 4. 原声（参考音频）
- 参考音频能锁住节奏和声音，但模型（如 Seedance 2.0）不保证原样播放。
- 第一条测试视频一定要听：是不是原声，有没有多出的词或音乐。
- 想保证 100% 原声：生成后把视频的音轨直接换成原声文件。时间轴和原声同一个时钟，嘴型基本对得上。
- 原声版权属于原作者，商用有风险：能拿授权最好；准备好一键换成模型配音。

## 5. 场景选项
- 只换地点那一句，动作和时间轴不变。
- 只留安静、明亮、和原声不冲突的场景。
  - 删掉：夜店（原声没音乐很怪，灯太暗）。
  - 改亮：深夜房间写 "face brightly lit by the monitor and a desk lamp"。
- 有背景人物的场景加一句："anyone in the background stays out of focus and never talks"。
- 默认用原版场景，大多数人不改默认。

## 6. 安全和长度
- 提示词在服务端按 ID 拼出来；浏览器只传场景 ID、清晰度，不传自由文本。
- 不写名人、换脸、deepfake 一类词。
- 写单元测试：每个场景 × 有无原声，长度都在上限内（例：自家接口限 2000 字符）。快到上限时，加一句就要删一句。

## 7. 测试
- [ ] 每个场景至少一条；主体覆盖：人、狗、猫、卡通。
- [ ] 逐条看：像不像照片里的主体、口型、节拍、原声、手、字幕。
- [ ] 失败率高的场景，先改提示词，不行就删场景。

## 模板（英文，替换 <…>）
```text
Vertical 9:16 <genre> skit, one continuous handheld phone take by a friend about 1 m away, no cuts: medium shot from the waist up, steady with a slight sway, the lead's face well lit and fully visible, in <place>. The lead is the main subject of @Image1 (a person, a pet or a cartoon character), with their face or features, skin or fur, hair, outfit and style recognizable in every frame; a pet stands upright on its hind legs. One <prop>.
0-0.4s: <action>, mouth closed.
0.4-4.1s, Lead (<action>, <emotion>): "<line 1>"
4.4-5.1s, <Other speaker> (<how it sounds>): "<line 2>" The lead freezes, mouth shut.
…
Sound: @Audio1 is the whole soundtrack, unchanged from 0 to <T> s; no music, no added words or effects. The lead's lips move only on their own lines, in time with @Audio1, with clear mouth shapes; mouth closed while <other speaker> talks and in the pauses. The friend stays silent and off camera; anyone in the background stays out of focus and never talks. No subtitles or on-screen text. Realistic hands.
```
