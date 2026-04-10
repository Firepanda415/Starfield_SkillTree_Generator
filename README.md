# 星空技能代码生成器 / Starfield Skill Command Generator

离线版《星空》技能规划网页。直接双击 `index.html` 即可在本地浏览器中打开，不需要 Python 服务。

Offline Starfield skill planner. Double-click `index.html` to open it locally in your browser with no web server required.

## 中文说明

### 功能

- 按五大技能树手动设置每个技能的目标等级
- 选择一个背景，并给对应的 3 个起始技能自动标记 `+1`
- 实时计算最低所需人物等级
- 模拟游戏里的技能树层级解锁规则
- 悬停技能时，在底部信息框显示技能名、简介和 4 个等级效果
- 下载 `sf-skills.txt` 和 `sf-remove-skills.txt`
- 支持英文 / 简体中文界面切换
- 支持读取之前生成的技能文件并恢复到当前表格

### 使用方法

1. 双击打开 `index.html`。
2. 选择界面语言。
3. 选择背景，或保持 `None / 无`。
4. 调整每个技能的目标等级。
5. 需要导出时，点击：
   - `Generate sf-skills.txt`
   - `Generate sf-remove-skills.txt`
6. 需要读回之前生成的技能文件时：
   - 先把背景选择成和该文件相同的背景
   - 再点击 `Load skill file`

### 洗点 / 加点 / 导入逻辑

- `sf-remove-skills.txt` 会对全部技能执行 4 次 `player.removeperk`
- 如果当前选择了具体背景，`sf-remove-skills.txt` 会在最后把该背景的 3 个起始技能各补回 1 次
- `sf-skills.txt` 只会写入“剩余需要补的等级”
- 读取 `sf-skills.txt` 时，页面会把当前所选背景视为这份文件对应的背景，并把背景送的那 1 级补回到表格
- 所以这三步是互通的，但前提是导入前要先选对背景

### 文件输出

- 浏览器会下载文本文件，而不是直接写入项目根目录
- 当前固定文件名：
  - `sf-skills.txt`
  - `sf-remove-skills.txt`

### 数据来源

- 技能英文名与技能摘要：
  [Nukes & Dragons Skills](https://nukesdragons.com/starfield/db/skills)
- 背景英文名与背景信息：
  [Nukes & Dragons Backgrounds](https://nukesdragons.com/starfield/db/backgrounds)
- `perk ID` 与技能等级效果：
  [Game8 Starfield Perk ID List](https://game8.co/games/Starfield/archives/423662)

### 中文数据说明

- Bethesda 官方已确认《星空》支持简体中文界面/文本：
  [Bethesda Support](https://help.bethesda.net/app/answers/detail/a_id/60444/~/what-languages-does-starfield-support%3F)
- 但目前没有找到一套公开、完整、可直接抓取的官方中文技能 / 背景页面
- 因此仓库内置了一份本地简体中文翻译数据，用于技能名、背景名、技能简介和等级效果显示

### 重建本地数据

如需重新抓取英文数据并重新合并本地中文翻译：

```bash
python3 scripts/build_dataset.py
```

这会重建：

- `data/data.json`
- `data/data.js`

中文翻译源文件在：

- `data/translations_zh.json`

## English

### Features

- Set a target rank for every skill across all five Starfield skill trees
- Select one background and automatically apply `+1` to its three starter skills
- Recalculate the minimum required character level in real time
- Simulate the in-game 4 / 8 / 12 point tier unlock rules
- Show localized skill info and all four rank effects in the bottom info dock on hover
- Download `sf-skills.txt` and `sf-remove-skills.txt`
- Switch the UI between English and Simplified Chinese
- Load a previously generated skill file back into the planner

### Usage

1. Double-click `index.html`.
2. Choose a UI language.
3. Select a background, or keep `None`.
4. Set the target rank for each skill.
5. Export files with:
   - `Generate sf-skills.txt`
   - `Generate sf-remove-skills.txt`
6. To load a previously generated skill file:
   - Select the same background used by that file first
   - Then click `Load skill file`

### Remove / Add / Import Workflow

- `sf-remove-skills.txt` writes four `player.removeperk` lines for every skill
- If a background is selected, `sf-remove-skills.txt` also re-adds that background's three starter skills once at the end
- `sf-skills.txt` only writes the remaining `player.addperk` commands needed beyond the background bonus
- When you load `sf-skills.txt`, the planner assumes the currently selected background matches the file and adds that free background rank back into the table
- The workflow stays consistent as long as you select the correct background before importing

### Output Files

- The browser downloads the text files instead of writing directly into the project root
- Current filenames:
  - `sf-skills.txt`
  - `sf-remove-skills.txt`

### Data Sources

- English skill names and skill summaries:
  [Nukes & Dragons Skills](https://nukesdragons.com/starfield/db/skills)
- English background names and background summaries:
  [Nukes & Dragons Backgrounds](https://nukesdragons.com/starfield/db/backgrounds)
- `perk IDs` and skill rank effects:
  [Game8 Starfield Perk ID List](https://game8.co/games/Starfield/archives/423662)

### Chinese Localization Notes

- Bethesda officially lists Simplified Chinese as a supported interface/text language for Starfield:
  [Bethesda Support](https://help.bethesda.net/app/answers/detail/a_id/60444/~/what-languages-does-starfield-support%3F)
- A complete public, scrape-friendly official Chinese skills/background dataset was not found
- This repository therefore ships with a local Simplified Chinese translation layer for skill names, background names, summaries, and rank effects

### Rebuild Offline Data

To refresh the English source data and merge the local Chinese translations again:

```bash
python3 scripts/build_dataset.py
```

This regenerates:

- `data/data.json`
- `data/data.js`

The local Chinese translation source lives in:

- `data/translations_zh.json`
