(function () {
  const data = window.STARFIELD_DATA;

  if (!data || !Array.isArray(data.skills) || !Array.isArray(data.backgrounds)) {
    throw new Error("STARFIELD_DATA is missing or invalid.");
  }

  const CATEGORY_ORDER = ["Physical", "Social", "Combat", "Science", "Tech"];
  const CATEGORY_POINTS_REQUIRED = { 1: 0, 2: 4, 3: 8, 4: 12 };
  const TIER_ORDER = [1, 2, 3, 4];

  const uiText = {
    en: {
      appTitle: "Starfield Skill Command Generator",
      appSubtitle:
        "Build your skill setup locally, then download ready-to-use perk command files. Workflow: run sf-remove-skills.txt first, then sf-skills.txt. The remove file adds the selected background skills back once, the skill file adds only the remaining ranks, and loading a skill file assumes you already selected the same background.",
      minLevel: "Minimum Level",
      spentPoints: "Spent Skill Points",
      language: "Language",
      background: "Background",
      noBackgroundSummary: "No background bonuses applied.",
      generateSkills: "Generate sf-skills.txt",
      generateRemove: "Generate sf-remove-skills.txt",
      loadSkills: "Load skill file",
      loadSkillsNote: "Select the same background first",
      skillIntel: "Skill Intel",
      hoverTitle: "Hover over a skill",
      hoverText:
        "Move the pointer over any skill row to inspect its localized description before you export commands.",
      status: "Status",
      ready: "Ready.",
      tierLabels: {
        1: "Novice",
        2: "Advanced",
        3: "Expert",
        4: "Master",
      },
      noBonusShort: "No bonus",
      treeMeta: "{spent} planned points · minimum {minimum}",
      statusSkillsDownloaded: "Downloaded sf-skills.txt with {count} commands.",
      statusRemoveDownloaded: "Downloaded sf-remove-skills.txt with {count} commands.",
      statusImportedUsingCurrent:
        "Loaded {file} using background {background}. Background bonus was added back during import.",
      statusImportedNoCommands: "Could not find any player.addperk commands in {file}.",
      statusImportedError: "Could not read {file}.",
      statusHovered: "{name} · {category} · {tier}",
      readdSuffix: "Background",
      rankLabel: "Rank {rank}",
      tierLockedHint: "Requires {points} points in the {tree} tree.",
    },
    zh: {
      appTitle: "Starfield 技能代码生成器",
      appSubtitle:
        "本地规划技能配置，并直接下载可用的控制台命令文件。流程说明：先运行 sf-remove-skills.txt 洗点，再运行 sf-skills.txt。洗点文件会把所选背景技能补回 1 级，加点文件只补剩余等级；读取技能文件时，也要先选和文件相同的背景。",
      minLevel: "最低所需等级",
      spentPoints: "已消耗技能点",
      language: "语言",
      background: "出身背景",
      noBackgroundSummary: "不启用任何背景加成。",
      generateSkills: "生成 sf-skills.txt",
      generateRemove: "生成 sf-remove-skills.txt",
      loadSkills: "读取技能文件",
      loadSkillsNote: "先选和文件相同的背景",
      skillIntel: "技能信息",
      hoverTitle: "把鼠标移到技能上",
      hoverText: "悬停任意技能行即可查看当前语言下的技能说明，再决定是否导出命令。",
      status: "状态",
      ready: "准备就绪。",
      tierLabels: {
        1: "新手",
        2: "进阶",
        3: "专家",
        4: "大师",
      },
      noBonusShort: "无加成",
      treeMeta: "计划投入 {spent} 点 · 最低需要 {minimum}",
      statusSkillsDownloaded: "已下载 sf-skills.txt，共 {count} 条命令。",
      statusRemoveDownloaded: "已下载 sf-remove-skills.txt，共 {count} 条命令。",
      statusImportedUsingCurrent:
        "已读取 {file}，并按背景 {background} 补回背景技能等级。",
      statusImportedNoCommands: "在 {file} 中没有找到 player.addperk 命令。",
      statusImportedError: "无法读取 {file}。",
      statusHovered: "{name} · {category} · {tier}",
      readdSuffix: "背景",
      rankLabel: "{rank} 级",
      tierLockedHint: "{tree} 技能树需要先累计 {points} 点。",
    },
  };

  const categoryNames = {
    en: {
      Physical: "Physical",
      Social: "Social",
      Combat: "Combat",
      Science: "Science",
      Tech: "Tech",
    },
    zh: {
      Physical: "体能",
      Social: "社交",
      Combat: "战斗",
      Science: "科学",
      Tech: "技术",
    },
  };

  const state = {
    locale: navigator.language && navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en",
    selectedBackgroundId: "none",
    targetRanks: Object.fromEntries(data.skills.map((skill) => [skill.id, 0])),
    autoBoostedSkills: new Set(),
    hoveredSkillId: null,
    statusMessage: "",
  };

  const skillsById = Object.fromEntries(data.skills.map((skill) => [skill.id, skill]));
  const backgroundsById = Object.fromEntries(
    data.backgrounds.map((background) => [background.id, background])
  );
  const skillOrder = data.skills.map((skill) => skill.id);

  const elements = {
    title: document.getElementById("app-title"),
    subtitle: document.getElementById("app-subtitle"),
    appShell: document.querySelector(".app-shell"),
    minLevelLabel: document.getElementById("min-level-label"),
    minLevelValue: document.getElementById("min-level-value"),
    spentPointsLabel: document.getElementById("spent-points-label"),
    spentPointsValue: document.getElementById("spent-points-value"),
    languageLabel: document.getElementById("language-label"),
    languageToggle: document.getElementById("language-toggle"),
    backgroundLabel: document.getElementById("background-label"),
    backgroundSelect: document.getElementById("background-select"),
    backgroundSummary: document.getElementById("background-summary"),
    loadSkillsButton: document.getElementById("load-skills-button"),
    loadSkillsNote: document.getElementById("load-skills-note"),
    loadSkillsInput: document.getElementById("load-skills-input"),
    downloadSkillsButton: document.getElementById("download-skills-button"),
    downloadRemoveButton: document.getElementById("download-remove-button"),
    trees: document.getElementById("skill-trees"),
    infoLabel: document.getElementById("info-label"),
    infoDock: document.getElementById("info-dock"),
    infoTitle: document.getElementById("info-title"),
    infoText: document.getElementById("info-text"),
    infoRanks: document.getElementById("info-ranks"),
    statusLabel: document.getElementById("status-label"),
    statusMessage: document.getElementById("status-message"),
  };

  function t(key) {
    return uiText[state.locale][key];
  }

  function format(template, values) {
    return template.replace(/\{(\w+)\}/g, function (_, key) {
      return String(values[key] ?? "");
    });
  }

  function getSelectedBackground() {
    return backgroundsById[state.selectedBackgroundId] || backgroundsById.none;
  }

  function getLocalizedValue(record, zhKey, enKey) {
    if (!record) {
      return "";
    }
    const zhValue = record[zhKey];
    const enValue = record[enKey];
    if (state.locale === "zh" && zhValue) {
      return zhValue;
    }
    return enValue || zhValue || "";
  }

  function getSkillDisplayName(skillId) {
    const skill = skillsById[skillId];
    return skill ? getLocalizedValue(skill, "name_zh", "name_en") : skillId;
  }

  function getBackgroundSkillIds() {
    return new Set(getSelectedBackground().starter_skill_ids);
  }

  function getBackgroundDisplayName(backgroundId) {
    const background = backgroundsById[backgroundId] || backgroundsById.none;
    return getLocalizedValue(background, "name_zh", "name_en");
  }

  function getBackgroundSummary(background) {
    return getLocalizedValue(background, "summary_zh", "summary_en");
  }

  function getSkillSummary(skill) {
    return getLocalizedValue(skill, "summary_zh", "summary_en");
  }

  function getSkillRankEffects(skill) {
    if (state.locale === "zh" && Array.isArray(skill.rank_effects_zh) && skill.rank_effects_zh.length) {
      return skill.rank_effects_zh;
    }
    return Array.isArray(skill.rank_effects_en) ? skill.rank_effects_en : [];
  }

  function getBackgroundBonus(skillId) {
    return getBackgroundSkillIds().has(skillId) ? 1 : 0;
  }

  function getEffectiveRank(skillId) {
    return Math.max(state.targetRanks[skillId] || 0, getBackgroundBonus(skillId));
  }

  function getInvestedPoints(skillId) {
    return Math.max(0, getEffectiveRank(skillId) - getBackgroundBonus(skillId));
  }

  function computeEffectiveRanks() {
    return Object.fromEntries(data.skills.map((skill) => [skill.id, getEffectiveRank(skill.id)]));
  }

  function computeSpentPoints() {
    return data.skills.reduce((sum, skill) => sum + getInvestedPoints(skill.id), 0);
  }

  function computeCategoryMinSpent(category) {
    const progress = computeCategoryProgress(category);
    return progress.minimumSpent;
  }

  function computeCategoryProgress(category) {
    const categorySkills = data.skills.filter((skill) => skill.category === category);
    const spentByTier = { 1: 0, 2: 0, 3: 0, 4: 0 };

    categorySkills.forEach((skill) => {
      spentByTier[skill.tier] += getInvestedPoints(skill.id);
    });

    const unlockedTiers = {
      1: true,
      2: spentByTier[1] >= CATEGORY_POINTS_REQUIRED[2],
      3: false,
      4: false,
    };

    const eligibleForTier3 = spentByTier[1] + (unlockedTiers[2] ? spentByTier[2] : 0);
    unlockedTiers[3] = eligibleForTier3 >= CATEGORY_POINTS_REQUIRED[3];

    const eligibleForTier4 = eligibleForTier3 + (unlockedTiers[3] ? spentByTier[3] : 0);
    unlockedTiers[4] = eligibleForTier4 >= CATEGORY_POINTS_REQUIRED[4];

    let minimumSpent = 0;
    let running = 0;
    for (let index = TIER_ORDER.length - 1; index >= 0; index -= 1) {
      const tier = TIER_ORDER[index];
      running += spentByTier[tier];
      if (running > 0) {
        minimumSpent = Math.max(minimumSpent, CATEGORY_POINTS_REQUIRED[tier] + running);
      }
    }

    return {
      spentByTier,
      unlockedTiers,
      minimumSpent,
    };
  }

  function enforceTierRequirements() {
    CATEGORY_ORDER.forEach((category) => {
      const progress = computeCategoryProgress(category);
      data.skills
        .filter((skill) => skill.category === category)
        .forEach((skill) => {
          if (skill.tier === 1 || progress.unlockedTiers[skill.tier]) {
            return;
          }

          const minimumRank = getBackgroundBonus(skill.id);
          if ((state.targetRanks[skill.id] || 0) > minimumRank) {
            state.targetRanks[skill.id] = minimumRank;
          }
        });
    });
  }

  function computeMinLevel() {
    const totalCategoryMinimum = CATEGORY_ORDER.reduce(
      (sum, category) => sum + computeCategoryMinSpent(category),
      0
    );
    return 1 + totalCategoryMinimum;
  }

  function generateAddperkLines() {
    const lines = [];
    skillOrder.forEach((skillId) => {
      const skill = skillsById[skillId];
      const repeatCount = Math.max(
        0,
        (state.targetRanks[skillId] || 0) - getBackgroundBonus(skillId)
      );
      for (let count = 0; count < repeatCount; count += 1) {
        lines.push(`player.addperk ${skill.perk_id} ; ${skill.name_en}`);
      }
    });
    return lines;
  }

  function buildSkillsDownloadLines(commands) {
    return [
      "; Starfield Skill Command Generator",
      "; Format: sf-skills-v2",
      `; Background ID: ${state.selectedBackgroundId}`,
      ...commands,
    ];
  }

  function generateRemoveperkLines() {
    const lines = [];
    skillOrder.forEach((skillId) => {
      const skill = skillsById[skillId];
      for (let count = 0; count < 4; count += 1) {
        lines.push(`player.removeperk ${skill.perk_id} ; ${skill.name_en}`);
      }
    });

    const background = getSelectedBackground();
    if (background.id !== "none") {
      background.starter_skill_ids.forEach((skillId) => {
        const skill = skillsById[skillId];
        lines.push(`player.addperk ${skill.perk_id} ; ${skill.name_en} (${t("readdSuffix")})`);
      });
    }

    return lines;
  }

  function downloadTextFile(filename, lines) {
    const blob = new Blob([lines.join("\n") + "\n"], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function setStatus(message) {
    state.statusMessage = message;
    elements.statusMessage.textContent = message;
  }

  function normalizeInfoText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[.。!！?？]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getDisplaySummary(skill) {
    const summary = getSkillSummary(skill);
    const rankOne = getSkillRankEffects(skill)[0] || "";
    if (normalizeInfoText(summary) === normalizeInfoText(rankOne)) {
      return "";
    }
    return summary;
  }

  function formatBackgroundOption(background) {
    if (!background.starter_skill_ids.length) {
      const noneLabel =
        state.locale === "zh" && background.name_zh ? background.name_zh : background.name_en;
      return `${noneLabel} (${t("noBonusShort")})`;
    }

    const label =
      state.locale === "zh" && background.name_zh ? background.name_zh : background.name_en;
    const skills = background.starter_skill_ids.map((skillId) => `+1 ${getSkillDisplayName(skillId)}`);
    return `${label} (${skills.join(" / ")})`;
  }

  function updateHoverInfo(skillId) {
    state.hoveredSkillId = skillId;
    const skill = skillId ? skillsById[skillId] : null;

    if (!skill) {
      elements.infoTitle.textContent = t("hoverTitle");
      elements.infoText.textContent = t("hoverText");
      elements.infoText.hidden = false;
      elements.infoRanks.innerHTML = "";
      return;
    }

    elements.infoTitle.textContent = getSkillDisplayName(skill.id);
    const displaySummary = getDisplaySummary(skill);
    elements.infoText.textContent = displaySummary;
    elements.infoText.hidden = !displaySummary;
    renderInfoRanks(skill);
    setStatus(
      format(t("statusHovered"), {
        name: getSkillDisplayName(skill.id),
        category: categoryNames[state.locale][skill.category],
        tier: t("tierLabels")[skill.tier],
      })
    );
  }

  function renderInfoRanks(skill) {
    elements.infoRanks.innerHTML = "";

    getSkillRankEffects(skill).forEach((effect, index) => {
      const item = document.createElement("div");
      item.className = "rank-line";

      const label = document.createElement("span");
      label.className = "rank-label";
      label.textContent = `${format(t("rankLabel"), { rank: index + 1 })}:`;

      const text = document.createElement("span");
      text.className = "rank-effect";
      text.textContent = effect;

      item.append(label, text);
      elements.infoRanks.appendChild(item);
    });
  }

  function populateBackgroundSelect() {
    elements.backgroundSelect.innerHTML = "";
    data.backgrounds.forEach((background) => {
      const option = document.createElement("option");
      option.value = background.id;
      option.textContent = formatBackgroundOption(background);
      elements.backgroundSelect.appendChild(option);
    });
    elements.backgroundSelect.value = state.selectedBackgroundId;
  }

  function updateDockOffset() {
    if (!elements.appShell || !elements.infoDock) {
      return;
    }
    const dockHeight = Math.ceil(elements.infoDock.getBoundingClientRect().height);
    elements.appShell.style.setProperty("--dock-offset", `${dockHeight + 48}px`);
  }

  function parseAddperkCounts(text) {
    const counts = Object.fromEntries(data.skills.map((skill) => [skill.id, 0]));
    const perkToSkillId = Object.fromEntries(
      data.skills.map((skill) => [skill.perk_id.toUpperCase(), skill.id])
    );
    const regex = /player\.addperk\s+([0-9a-f]{6,8})/gi;
    let match = regex.exec(text);
    let total = 0;

    while (match) {
      const perkId = match[1].toUpperCase();
      const skillId = perkToSkillId[perkId];
      if (skillId) {
        counts[skillId] += 1;
        total += 1;
      }
      match = regex.exec(text);
    }

    return { counts, total };
  }

  function restoreStateFromCounts(counts, backgroundId) {
    const targetRanks = Object.fromEntries(data.skills.map((skill) => [skill.id, 0]));
    const autoBoosted = new Set();
    const backgroundSkillIds = new Set(
      (backgroundsById[backgroundId] || backgroundsById.none).starter_skill_ids
    );

    data.skills.forEach((skill) => {
      const commandCount = counts[skill.id] || 0;
      const bonus = backgroundSkillIds.has(skill.id) ? 1 : 0;
      targetRanks[skill.id] = Math.min(4, commandCount + bonus);
      if (bonus > 0 && commandCount === 0) {
        autoBoosted.add(skill.id);
      }
    });

    state.selectedBackgroundId = backgroundId;
    state.targetRanks = targetRanks;
    state.autoBoostedSkills = autoBoosted;
  }

  function loadSkillFile(file) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = function () {
      try {
        const text = String(reader.result || "");
        const parsed = parseAddperkCounts(text);

        if (!parsed.total) {
          setStatus(format(t("statusImportedNoCommands"), { file: file.name }));
          return;
        }

        const selectedBackgroundId = state.selectedBackgroundId;
        restoreStateFromCounts(parsed.counts, selectedBackgroundId);
        render();
        setStatus(
          format(t("statusImportedUsingCurrent"), {
            file: file.name,
            background: getBackgroundDisplayName(selectedBackgroundId),
          })
        );
      } catch (error) {
        setStatus(format(t("statusImportedError"), { file: file.name }));
      }
    };

    reader.onerror = function () {
      setStatus(format(t("statusImportedError"), { file: file.name }));
    };

    reader.readAsText(file, "utf-8");
  }

  function updateBackgroundSummary() {
    const background = getSelectedBackground();
    elements.backgroundSummary.textContent =
      state.locale === "zh" && background.id === "none"
        ? t("noBackgroundSummary")
        : getBackgroundSummary(background) || t("noBackgroundSummary");
  }

  function createSkillSelect(skillId) {
    const select = document.createElement("select");
    select.className = "skill-select";
    select.dataset.skillId = skillId;

    for (let rank = 0; rank <= 4; rank += 1) {
      const option = document.createElement("option");
      option.value = String(rank);
      option.textContent = String(rank);
      select.appendChild(option);
    }

    select.value = String(state.targetRanks[skillId] || 0);
    select.addEventListener("change", function (event) {
      state.autoBoostedSkills.delete(skillId);
      const minimumRank = getBackgroundBonus(skillId);
      const nextRank = Math.max(Number(event.target.value), minimumRank);
      state.targetRanks[skillId] = nextRank;
      event.target.value = String(nextRank);
      setStatus(t("ready"));
      render();
    });

    select.addEventListener("focus", function () {
      updateHoverInfo(skillId);
    });

    return select;
  }

  function applyBackgroundSelection(nextBackgroundId) {
    const previousAuto = new Set(state.autoBoostedSkills);

    state.selectedBackgroundId = nextBackgroundId;
    const nextBackgroundIds = getBackgroundSkillIds();
    const nextAuto = new Set();

    previousAuto.forEach((skillId) => {
      if (!nextBackgroundIds.has(skillId) && state.targetRanks[skillId] === 1) {
        state.targetRanks[skillId] = 0;
      }
    });

    nextBackgroundIds.forEach((skillId) => {
      if ((state.targetRanks[skillId] || 0) < 1) {
        state.targetRanks[skillId] = 1;
        nextAuto.add(skillId);
      } else if (previousAuto.has(skillId) && state.targetRanks[skillId] === 1) {
        nextAuto.add(skillId);
      }
    });

    state.autoBoostedSkills = nextAuto;
  }

  function renderTree(skillTree, categoryProgress) {
    const card = document.createElement("section");
    card.className = "tree-card";
    card.style.setProperty("--tree-color", skillTree.color);

    const treeHeader = document.createElement("div");
    treeHeader.className = "tree-header";

    const title = document.createElement("h2");
    title.className = "tree-title";
    title.textContent = categoryNames[state.locale][skillTree.category];

    const spentInTree = skillTree.skills.reduce((sum, skill) => sum + getInvestedPoints(skill.id), 0);
    const meta = document.createElement("p");
    meta.className = "tree-meta";
    meta.textContent = format(t("treeMeta"), {
      spent: spentInTree,
      minimum: computeCategoryMinSpent(skillTree.category),
    });

    treeHeader.append(title, meta);
    card.appendChild(treeHeader);

    const tierGrid = document.createElement("div");
    tierGrid.className = "tier-grid";

    TIER_ORDER.forEach((tier) => {
      const tierColumn = document.createElement("section");
      tierColumn.className = "tier-column";
      const tierUnlocked = tier === 1 || categoryProgress.unlockedTiers[tier];
      tierColumn.classList.toggle("is-locked", !tierUnlocked);

      const tierHeader = document.createElement("div");
      tierHeader.className = "tier-header";
      const tierLabel = document.createElement("span");
      tierLabel.className = "tier-label";
      tierLabel.textContent = t("tierLabels")[tier];
      tierHeader.appendChild(tierLabel);
      tierColumn.appendChild(tierHeader);

      const skillList = document.createElement("div");
      skillList.className = "skill-list";

      skillTree.skills
        .filter((skill) => skill.tier === tier)
        .forEach((skill) => {
          const row = document.createElement("article");
          row.className = "skill-row";
          const isLocked = skill.tier > 1 && !categoryProgress.unlockedTiers[skill.tier];
          row.classList.toggle("is-locked", isLocked);
          if (isLocked) {
            row.title = format(t("tierLockedHint"), {
              points: CATEGORY_POINTS_REQUIRED[skill.tier],
              tree: categoryNames[state.locale][skill.category],
            });
          }
          row.tabIndex = 0;
          row.addEventListener("mouseenter", function () {
            updateHoverInfo(skill.id);
          });
          row.addEventListener("focusin", function () {
            updateHoverInfo(skill.id);
          });

          const header = document.createElement("div");
          header.className = "skill-header";

          const skillMain = document.createElement("div");
          skillMain.className = "skill-main";

          const name = document.createElement("div");
          name.className = "skill-name";
          name.textContent = getSkillDisplayName(skill.id);
          skillMain.appendChild(name);

          if (getBackgroundBonus(skill.id) > 0) {
            const bonusBadge = document.createElement("span");
            bonusBadge.className = "badge bonus";
            bonusBadge.textContent = "+1";
            skillMain.appendChild(bonusBadge);
          }

          const effectiveBadge = document.createElement("span");
          effectiveBadge.className = "badge effective";
          effectiveBadge.textContent = String(getEffectiveRank(skill.id));

          const select = createSkillSelect(skill.id);
          select.classList.add("skill-rank-select");
          select.disabled = isLocked;

          skillMain.appendChild(effectiveBadge);
          header.append(skillMain, select);

          row.append(header);
          skillList.appendChild(row);
        });

      tierColumn.appendChild(skillList);
      tierGrid.appendChild(tierColumn);
    });

    card.appendChild(tierGrid);
    return card;
  }

  function renderTrees() {
    elements.trees.innerHTML = "";

    CATEGORY_ORDER.forEach((category) => {
      const skills = data.skills.filter((skill) => skill.category === category);
      const categoryProgress = computeCategoryProgress(category);
      const skillTree = {
        category,
        color: skills[0] ? skills[0].category_color : "#9be7ff",
        skills,
      };
      elements.trees.appendChild(renderTree(skillTree, categoryProgress));
    });
  }

  function renderStaticText() {
    elements.title.textContent = t("appTitle");
    elements.subtitle.textContent = t("appSubtitle");
    elements.minLevelLabel.textContent = t("minLevel");
    elements.spentPointsLabel.textContent = t("spentPoints");
    elements.languageLabel.textContent = t("language");
    elements.backgroundLabel.textContent = t("background");
    elements.downloadSkillsButton.textContent = t("generateSkills");
    elements.downloadRemoveButton.textContent = t("generateRemove");
    elements.loadSkillsButton.textContent = t("loadSkills");
    elements.loadSkillsNote.textContent = t("loadSkillsNote");
    elements.infoLabel.textContent = t("skillIntel");
    elements.statusLabel.textContent = t("status");

    const segments = elements.languageToggle.querySelectorAll(".segment");
    segments.forEach((segment) => {
      segment.classList.toggle("is-active", segment.dataset.locale === state.locale);
    });

    if (!state.hoveredSkillId) {
      elements.infoTitle.textContent = t("hoverTitle");
      elements.infoText.textContent = t("hoverText");
      elements.infoText.hidden = false;
    } else {
      updateHoverInfo(state.hoveredSkillId);
    }
  }

  function renderStats() {
    computeEffectiveRanks();
    elements.minLevelValue.textContent = String(computeMinLevel());
    elements.spentPointsValue.textContent = String(computeSpentPoints());
  }

  function render() {
    enforceTierRequirements();
    populateBackgroundSelect();
    updateBackgroundSummary();
    renderStaticText();
    renderStats();
    renderTrees();
    updateDockOffset();
    if (!state.statusMessage) {
      setStatus(t("ready"));
    } else {
      elements.statusMessage.textContent = state.statusMessage;
    }
  }

  elements.languageToggle.addEventListener("click", function (event) {
    const target = event.target.closest("[data-locale]");
    if (!target) {
      return;
    }
    state.locale = target.dataset.locale;
    if (!state.hoveredSkillId) {
      setStatus(t("ready"));
    }
    render();
  });

  elements.backgroundSelect.addEventListener("change", function (event) {
    applyBackgroundSelection(event.target.value);
    setStatus(t("ready"));
    render();
  });

  elements.downloadSkillsButton.addEventListener("click", function () {
    const commands = generateAddperkLines();
    const lines = buildSkillsDownloadLines(commands);
    downloadTextFile("sf-skills.txt", lines);
    setStatus(format(t("statusSkillsDownloaded"), { count: commands.length }));
  });

  elements.downloadRemoveButton.addEventListener("click", function () {
    const lines = generateRemoveperkLines();
    downloadTextFile("sf-remove-skills.txt", lines);
    setStatus(format(t("statusRemoveDownloaded"), { count: lines.length }));
  });

  elements.loadSkillsButton.addEventListener("click", function () {
    elements.loadSkillsInput.click();
  });

  elements.loadSkillsInput.addEventListener("change", function (event) {
    const [file] = event.target.files || [];
    loadSkillFile(file);
    event.target.value = "";
  });

  if ("ResizeObserver" in window && elements.infoDock) {
    const dockObserver = new ResizeObserver(function () {
      updateDockOffset();
    });
    dockObserver.observe(elements.infoDock);
  }

  window.addEventListener("resize", updateDockOffset);

  render();
})();
