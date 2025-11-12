(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };
  const { useState, useMemo, useEffect } = React;
  function findAllPrerequisites(questName, questGraph, visited = /* @__PURE__ */ new Set()) {
    const quest = questGraph[questName];
    if (!quest) return visited;
    for (const prereq of quest.prerequisites) {
      if (!visited.has(prereq)) {
        visited.add(prereq);
        findAllPrerequisites(prereq, questGraph, visited);
      }
    }
    return visited;
  }
  function getCompletedQuests(questsData, unlockedQuests) {
    if (!questsData) return { completed: /* @__PURE__ */ new Set(), questGraph: {} };
    const questGraph = {};
    for (const trader in questsData) {
      const quests = questsData[trader].quests;
      for (const questData of quests) {
        const questName = questData.quest;
        questGraph[questName] = {
          trader,
          nextQuests: questData.nextQuests || [],
          prerequisites: [],
          objective: questData.objective
        };
      }
    }
    for (const questName in questGraph) {
      const nextQuests = questGraph[questName].nextQuests;
      for (const nextQuest of nextQuests) {
        if (questGraph[nextQuest]) {
          questGraph[nextQuest].prerequisites.push(questName);
        }
      }
    }
    const completed = /* @__PURE__ */ new Set();
    for (const unlockedQuest of unlockedQuests) {
      if (questGraph[unlockedQuest]) {
        findAllPrerequisites(unlockedQuest, questGraph, completed);
      }
    }
    const unlockedSet = new Set(unlockedQuests);
    let changesOccurred = true;
    while (changesOccurred) {
      changesOccurred = false;
      for (const questName in questGraph) {
        if (!unlockedSet.has(questName) && !completed.has(questName)) {
          const quest = questGraph[questName];
          const allPrereqsComplete = quest.prerequisites.length === 0 || quest.prerequisites.every((prereq) => completed.has(prereq));
          if (allPrereqsComplete) {
            completed.add(questName);
            changesOccurred = true;
          }
        }
      }
    }
    return { completed, questGraph };
  }
  function fuzzySearch(searchTerm, items) {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.map((item) => {
      const itemName = (typeof item === "string" ? item : item.name).toLowerCase();
      let score = 0;
      if (itemName === term) {
        score = 1e3;
      } else if (itemName.startsWith(term)) {
        score = 500;
      } else if (itemName.includes(term)) {
        score = 250;
      } else {
        let termIndex = 0;
        let lastFoundIndex = -1;
        for (let i = 0; i < itemName.length && termIndex < term.length; i++) {
          if (itemName[i] === term[termIndex]) {
            score += 10;
            if (i === lastFoundIndex + 1) {
              score += 5;
            }
            lastFoundIndex = i;
            termIndex++;
          }
        }
        if (termIndex < term.length) {
          score = 0;
        }
      }
      return { item, score };
    }).filter((result) => result.score > 0).sort((a, b) => b.score - a.score).map((result) => result.item);
  }
  function WorkshopModal({ workshopLevels, setWorkshopLevels, onClose, tablesData }) {
    const workshops = tablesData ? Object.keys(tablesData) : [];
    const handleReset = () => {
      if (window.confirm("Are you sure you want to reset all workshop levels to base level?")) {
        const resetLevels = {};
        workshops.forEach((workshop) => {
          resetLevels[workshop] = 0;
        });
        setWorkshopLevels(resetLevels);
      }
    };
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h3", { className: "modal-title" }, "\u{1F527} Workshop Levels"), /* @__PURE__ */ React.createElement("p", { style: { color: "var(--text-secondary)", marginBottom: "20px" } }, "Set your current level for each crafting station. Items needed are for levels AFTER your current level."), /* @__PURE__ */ React.createElement("div", { className: "workshop-grid" }, workshops.map((workshop) => {
      const maxLevel = tablesData[workshop].length;
      return /* @__PURE__ */ React.createElement("div", { key: workshop, className: "workshop-card" }, /* @__PURE__ */ React.createElement("div", { className: "workshop-name" }, workshop), /* @__PURE__ */ React.createElement("div", { className: "level-selector" }, /* @__PURE__ */ React.createElement("label", null, "Current Level:"), /* @__PURE__ */ React.createElement(
        "select",
        {
          value: workshopLevels[workshop] || 0,
          onChange: (e) => setWorkshopLevels(__spreadProps(__spreadValues({}, workshopLevels), {
            [workshop]: parseInt(e.target.value)
          }))
        },
        Array.from({ length: maxLevel + 1 }, (_, i) => i).map((level) => /* @__PURE__ */ React.createElement("option", { key: level, value: level }, "Level ", level + 1))
      )));
    })), /* @__PURE__ */ React.createElement("div", { className: "button-group" }, /* @__PURE__ */ React.createElement("button", { className: "reset-btn", onClick: handleReset }, "Reset Workshops"), /* @__PURE__ */ React.createElement("button", { className: "modal-close", onClick: onClose }, "Close")));
  }
  function QuestsModal({ selectedQuests, setSelectedQuests, onClose, questsData }) {
    const [showSearch, setShowSearch] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const allQuests = useMemo(() => {
      if (!questsData) return [];
      const quests = [];
      for (const trader in questsData) {
        questsData[trader].quests.forEach((q) => {
          quests.push({ name: q.quest, trader });
        });
      }
      return quests;
    }, [questsData]);
    const questProgress = useMemo(() => {
      if (!questsData) return { completed: 0, total: 0, percentage: 0 };
      const { completed } = getCompletedQuests(questsData, selectedQuests);
      let total = 0;
      for (const trader in questsData) {
        total += questsData[trader].quests.length;
      }
      return {
        completed: completed.size,
        total,
        percentage: total > 0 ? Math.round(completed.size / total * 100) : 0
      };
    }, [questsData, selectedQuests]);
    const filteredQuests = useMemo(() => {
      return fuzzySearch(searchTerm, allQuests);
    }, [searchTerm, allQuests]);
    const addQuest = (quest) => {
      const questName = typeof quest === "string" ? quest : quest.name;
      if (!selectedQuests.includes(questName)) {
        setSelectedQuests([...selectedQuests, questName]);
      }
      setShowSearch(false);
      setSearchTerm("");
    };
    const removeQuest = (questName) => {
      setSelectedQuests(selectedQuests.filter((q) => q !== questName));
    };
    const completeQuest = (questName) => {
      const newSelected = selectedQuests.filter((q) => q !== questName);
      for (const trader in questsData) {
        const quest = questsData[trader].quests.find((q) => q.quest === questName);
        if (quest && quest.nextQuests) {
          quest.nextQuests.forEach((nextQuest) => {
            if (!newSelected.includes(nextQuest)) {
              newSelected.push(nextQuest);
            }
          });
        }
      }
      setSelectedQuests(newSelected);
    };
    const handleReset = () => {
      if (window.confirm("Are you sure you want to clear all active quests?")) {
        setSelectedQuests([]);
      }
    };
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h3", { className: "modal-title" }, "\u{1F4CB} Active Quests"), /* @__PURE__ */ React.createElement("p", { style: { color: "var(--text-secondary)", marginBottom: "10px" } }, "Select your unlocked but not yet completed quests"), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "20px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "0.9em" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "var(--text-secondary)" } }, "Overall Progress"), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--text-primary)", fontWeight: "bold" } }, questProgress.completed, " / ", questProgress.total, " (", questProgress.percentage, "%)")), /* @__PURE__ */ React.createElement("div", { style: {
      width: "100%",
      height: "20px",
      backgroundColor: "var(--bg-secondary)",
      borderRadius: "10px",
      overflow: "hidden"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: `${questProgress.percentage}%`,
      height: "100%",
      backgroundColor: "#4caf50",
      transition: "width 0.3s ease"
    } }))), !showSearch ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "add-button", onClick: () => setShowSearch(true) }, "+ Add Quest"), /* @__PURE__ */ React.createElement("div", { className: "quest-list" }, selectedQuests.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "no-results" }, "No quests selected") : selectedQuests.map((questName) => {
      let trader = "";
      for (const t in questsData) {
        if (questsData[t].quests.find((q) => q.quest === questName)) {
          trader = t;
          break;
        }
      }
      return /* @__PURE__ */ React.createElement("div", { key: questName, className: "list-item" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "list-item-name" }, questName), trader && /* @__PURE__ */ React.createElement("span", { style: { color: "var(--text-secondary)", fontSize: "0.9em", marginLeft: "8px" } }, "(", trader, ")")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "complete-btn",
          onClick: () => completeQuest(questName),
          style: { marginRight: "8px" }
        },
        "\u2713 Complete"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "remove-btn",
          onClick: () => removeQuest(questName)
        },
        "Remove"
      )));
    })), /* @__PURE__ */ React.createElement("div", { className: "button-group" }, /* @__PURE__ */ React.createElement("button", { className: "reset-btn", onClick: handleReset }, "Reset Quests"), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "modal-close",
        onClick: () => window.open("quests.html", "_blank"),
        style: {
          background: "var(--nav-active)",
          marginRight: "10px"
        }
      },
      "\u{1F5FA}\uFE0F View Quest Map"
    ), /* @__PURE__ */ React.createElement("button", { className: "modal-close", onClick: onClose }, "Close"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "search-box" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "search-input",
        placeholder: "Search quests...",
        value: searchTerm,
        onChange: (e) => setSearchTerm(e.target.value),
        autoFocus: true
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "quest-list" }, filteredQuests.map((quest) => {
      const questName = typeof quest === "string" ? quest : quest.name;
      const trader = typeof quest === "object" ? quest.trader : "";
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: questName,
          className: "list-item",
          style: { cursor: "pointer" },
          onClick: () => addQuest(quest)
        },
        /* @__PURE__ */ React.createElement("span", { className: "list-item-name" }, questName),
        trader && /* @__PURE__ */ React.createElement("span", { style: { color: "var(--text-secondary)", fontSize: "0.9em", marginLeft: "8px" } }, "(", trader, ")")
      );
    })), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "modal-close",
        onClick: () => {
          setShowSearch(false);
          setSearchTerm("");
        }
      },
      "Back to Quests"
    )));
  }
  function CraftingModal({ selectedCraftables, setSelectedCraftables, onClose, weaponsData, equipmentData, weaponModsData }) {
    const [showSearch, setShowSearch] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedLevel, setSelectedLevel] = useState(1);
    const allCraftables = useMemo(() => {
      const items = [];
      if (weaponsData) {
        weaponsData.forEach((w) => {
          var _a;
          items.push({ name: w.item, levels: ((_a = w.upgrades) == null ? void 0 : _a.length) ? Array.from({ length: w.upgrades.length + 1 }, (_, i) => i + 1) : [1], type: "weapon" });
        });
      }
      if (equipmentData) {
        equipmentData.forEach((e) => {
          if (e.components && Object.keys(e.components).length > 0) {
            items.push({ name: e.item, levels: null, type: "equipment" });
          }
        });
      }
      if (weaponModsData) {
        weaponModsData.forEach((m) => {
          if (m.components && Object.keys(m.components).length > 0) {
            items.push({ name: m.item, levels: null, type: "mod" });
          }
        });
      }
      return items;
    }, [weaponsData, equipmentData, weaponModsData]);
    const filteredCraftables = useMemo(() => {
      return fuzzySearch(searchTerm, allCraftables);
    }, [searchTerm, allCraftables]);
    const addCraftable = () => {
      const craftable = {
        name: selectedItem.name,
        level: selectedItem.levels ? selectedLevel : null
      };
      const exists = selectedCraftables.find(
        (c) => c.name === craftable.name && c.level === craftable.level
      );
      if (!exists) {
        setSelectedCraftables([...selectedCraftables, craftable]);
      }
      setShowSearch(false);
      setSearchTerm("");
      setSelectedItem(null);
      setSelectedLevel(1);
    };
    const removeCraftable = (craftable) => {
      setSelectedCraftables(
        selectedCraftables.filter(
          (c) => !(c.name === craftable.name && c.level === craftable.level)
        )
      );
    };
    const handleReset = () => {
      if (window.confirm("Are you sure you want to clear all crafting goals?")) {
        setSelectedCraftables([]);
      }
    };
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h3", { className: "modal-title" }, "\u{1F528} Crafting Goals"), /* @__PURE__ */ React.createElement("p", { style: { color: "var(--text-secondary)", marginBottom: "20px" } }, "Tag items you want to craft"), !showSearch ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "add-button", onClick: () => setShowSearch(true) }, "+ Add Craftable"), /* @__PURE__ */ React.createElement("div", { className: "crafting-list" }, selectedCraftables.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "no-results" }, "No craftables selected") : selectedCraftables.map((craftable, index) => /* @__PURE__ */ React.createElement("div", { key: index, className: "list-item" }, /* @__PURE__ */ React.createElement("span", { className: "list-item-name" }, craftable.name, craftable.level && ` (Level ${craftable.level})`), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "remove-btn",
        onClick: () => removeCraftable(craftable)
      },
      "Remove"
    )))), /* @__PURE__ */ React.createElement("div", { className: "button-group" }, /* @__PURE__ */ React.createElement("button", { className: "reset-btn", onClick: handleReset }, "Reset Crafting"), /* @__PURE__ */ React.createElement("button", { className: "modal-close", onClick: onClose }, "Close"))) : selectedItem ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h4", { style: { marginBottom: "15px", color: "var(--text-primary)" } }, selectedItem.name), selectedItem.levels && selectedItem.levels.length > 1 && /* @__PURE__ */ React.createElement("div", { className: "level-selector", style: { marginBottom: "20px" } }, /* @__PURE__ */ React.createElement("label", null, "Craft Level:"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: selectedLevel,
        onChange: (e) => setSelectedLevel(parseInt(e.target.value))
      },
      selectedItem.levels.map((level) => /* @__PURE__ */ React.createElement("option", { key: level, value: level }, "Level ", level))
    )), /* @__PURE__ */ React.createElement("button", { className: "add-button", onClick: addCraftable }, "Add to Crafting Goals"), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "modal-close",
        onClick: () => {
          setSelectedItem(null);
          setSelectedLevel(1);
        }
      },
      "Back"
    )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "search-box" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "search-input",
        placeholder: "Search craftables...",
        value: searchTerm,
        onChange: (e) => setSearchTerm(e.target.value),
        autoFocus: true
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "quest-list" }, filteredCraftables.map((craftable) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: craftable.name,
        className: "list-item",
        style: { cursor: "pointer" },
        onClick: () => setSelectedItem(craftable)
      },
      /* @__PURE__ */ React.createElement("span", { className: "list-item-name" }, craftable.name)
    ))), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "modal-close",
        onClick: () => {
          setShowSearch(false);
          setSearchTerm("");
        }
      },
      "Back to Crafting Goals"
    )));
  }
  function ProjectsModal({ projectsEnabled, setProjectsEnabled, currentProjectLevel, setCurrentProjectLevel, onClose, projectsData }) {
    const projectSegments = useMemo(() => {
      if (!projectsData) return [];
      return Object.keys(projectsData);
    }, [projectsData]);
    const handleReset = () => {
      if (window.confirm("Are you sure you want to reset project configuration?")) {
        setProjectsEnabled(false);
        setCurrentProjectLevel("");
      }
    };
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h3", { className: "modal-title" }, "\u{1F3D7}\uFE0F Projects"), /* @__PURE__ */ React.createElement("p", { style: { color: "var(--text-secondary)", marginBottom: "20px" } }, "Enable projects and select which segment you're currently on"), /* @__PURE__ */ React.createElement("div", { className: "project-list" }, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" } }, /* @__PURE__ */ React.createElement("label", { className: "toggle-switch" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: projectsEnabled,
        onChange: (e) => setProjectsEnabled(e.target.checked)
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "toggle-slider" })), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--text-primary)", fontWeight: "bold" } }, projectsEnabled ? "Projects Enabled" : "Projects Disabled")), projectsEnabled && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "level-selector", style: { marginBottom: "20px" } }, /* @__PURE__ */ React.createElement("label", null, "Current Project Segment:"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: currentProjectLevel,
        onChange: (e) => setCurrentProjectLevel(e.target.value)
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Select segment..."),
      projectSegments.map((segment) => /* @__PURE__ */ React.createElement("option", { key: segment, value: segment }, segment))
    )), currentProjectLevel && projectsData && projectsData[currentProjectLevel] && /* @__PURE__ */ React.createElement("div", { style: { backgroundColor: "var(--bg-secondary)", padding: "15px", borderRadius: "8px" } }, /* @__PURE__ */ React.createElement("h4", { style: { marginBottom: "10px", color: "var(--text-primary)" } }, "Current Segment Requirements:"), /* @__PURE__ */ React.createElement("div", { style: { color: "var(--text-secondary)" } }, Object.keys(projectsData[currentProjectLevel]).length === 0 ? /* @__PURE__ */ React.createElement("div", null, "No requirements for this segment") : Object.entries(projectsData[currentProjectLevel]).map(([item, amount]) => /* @__PURE__ */ React.createElement("div", { key: item, style: { marginBottom: "5px" } }, item, ": ", amount)))))), /* @__PURE__ */ React.createElement("div", { className: "button-group" }, /* @__PURE__ */ React.createElement("button", { className: "reset-btn", onClick: handleReset }, "Reset Projects"), /* @__PURE__ */ React.createElement("button", { className: "modal-close", onClick: onClose }, "Close")));
  }
  function App() {
    const [theme, setTheme] = useState("dark");
    const [activeModal, setActiveModal] = useState(null);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [workshopLevels, setWorkshopLevels] = useState({});
    const [selectedQuests, setSelectedQuests] = useState([]);
    const [selectedCraftables, setSelectedCraftables] = useState([]);
    const [currentProjectLevel, setCurrentProjectLevel] = useState("");
    const [questsData, setQuestsData] = useState(null);
    const [projectsData, setProjectsData] = useState(null);
    const [tablesData, setTablesData] = useState(null);
    const [weaponsData, setWeaponsData] = useState(null);
    const [equipmentData, setEquipmentData] = useState(null);
    const [lootData, setLootData] = useState(null);
    const [weaponModsData, setWeaponModsData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [projectsEnabled, setProjectsEnabled] = useState(false);
    useEffect(() => {
      function loadData() {
        return __async(this, null, function* () {
          try {
            const [quests, projects, tables, weapons, equipment, loot, weaponMods] = yield Promise.all([
              fetch("quests.json").then((r) => r.json()),
              fetch("projects.json").then((r) => r.json()),
              fetch("tables.json").then((r) => r.json()),
              fetch("weapons.json").then((r) => r.json()),
              fetch("equipment.json").then((r) => r.json()),
              fetch("loot.json").then((r) => r.json()),
              fetch("weapon_modifications.json").then((r) => r.json())
            ]);
            setQuestsData(quests);
            setProjectsData(projects);
            setTablesData(tables);
            setWeaponsData(weapons);
            setEquipmentData(equipment);
            setLootData(loot);
            setWeaponModsData(weaponMods);
            const initialWorkshopLevels = {};
            Object.keys(tables).forEach((workshop) => {
              initialWorkshopLevels[workshop] = 0;
            });
            const savedConfig = localStorage.getItem("arcRaidersConfig");
            if (savedConfig) {
              try {
                const config = JSON.parse(savedConfig);
                setWorkshopLevels(config.workshopLevels || initialWorkshopLevels);
                setSelectedQuests(config.selectedQuests || []);
                setSelectedCraftables(config.selectedCraftables || []);
                setCurrentProjectLevel(config.currentProjectLevel || "");
                setProjectsEnabled(config.projectsEnabled || false);
              } catch (e) {
                console.error("Error loading saved config:", e);
                setWorkshopLevels(initialWorkshopLevels);
              }
            } else {
              setWorkshopLevels(initialWorkshopLevels);
            }
            setIsLoading(false);
          } catch (error) {
            console.error("Error loading data:", error);
            setIsLoading(false);
          }
        });
      }
      loadData();
    }, []);
    useEffect(() => {
      if (!isLoading && tablesData) {
        const config = {
          workshopLevels,
          selectedQuests,
          selectedCraftables,
          currentProjectLevel,
          projectsEnabled
        };
        localStorage.setItem("arcRaidersConfig", JSON.stringify(config));
      }
    }, [workshopLevels, selectedQuests, selectedCraftables, currentProjectLevel, projectsEnabled, isLoading, tablesData]);
    useEffect(() => {
      document.documentElement.className = theme;
    }, [theme]);
    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.key === "Escape" && activeModal) {
          closeModal();
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [activeModal]);
    const toggleTheme = () => {
      setTheme(theme === "dark" ? "light" : "dark");
    };
    const allItems = useMemo(() => {
      if (!questsData || !projectsData || !tablesData || !weaponsData || !equipmentData || !lootData) {
        return [];
      }
      const itemsMap = /* @__PURE__ */ new Map();
      const { completed: completedQuests, questGraph } = getCompletedQuests(questsData, selectedQuests);
      for (const questName in questGraph) {
        if (!completedQuests.has(questName)) {
          const quest = questGraph[questName];
          const objective = quest.objective;
          if (objective && objective.items) {
            Object.entries(objective.items).forEach(([item, amount]) => {
              const key = item;
              if (!itemsMap.has(key)) {
                itemsMap.set(key, {
                  name: item,
                  uses: []
                });
              }
              itemsMap.get(key).uses.push({
                type: "quest",
                detail: questName,
                trader: quest.trader,
                amount
              });
            });
          }
        }
      }
      if (projectsEnabled && currentProjectLevel && projectsData[currentProjectLevel]) {
        const projectSegments = Object.keys(projectsData);
        const currentIndex = projectSegments.indexOf(currentProjectLevel);
        for (let i = currentIndex; i < projectSegments.length; i++) {
          const segment = projectSegments[i];
          Object.entries(projectsData[segment]).forEach(([item, amount]) => {
            const key = item;
            if (!itemsMap.has(key)) {
              itemsMap.set(key, {
                name: item,
                uses: []
              });
            }
            itemsMap.get(key).uses.push({
              type: "project",
              detail: segment,
              amount
            });
          });
        }
      }
      Object.entries(workshopLevels).forEach(([workshop, currentLevel]) => {
        if (tablesData[workshop]) {
          for (let i = currentLevel; i < tablesData[workshop].length; i++) {
            const levelItems = tablesData[workshop][i];
            Object.entries(levelItems).forEach(([item, amount]) => {
              const key = item;
              if (!itemsMap.has(key)) {
                itemsMap.set(key, {
                  name: item,
                  uses: []
                });
              }
              itemsMap.get(key).uses.push({
                type: "workshop",
                detail: workshop,
                level: i + 1,
                amount
              });
            });
          }
        }
      });
      selectedCraftables.forEach((craftable) => {
        let itemData = null;
        if (weaponsData) {
          itemData = weaponsData.find((w) => w.item === craftable.name);
        }
        if (!itemData && equipmentData) {
          itemData = equipmentData.find((e) => e.item === craftable.name);
        }
        if (!itemData && weaponModsData) {
          itemData = weaponModsData.find((m) => m.item === craftable.name);
        }
        if (itemData) {
          if (itemData.components) {
            Object.entries(itemData.components).forEach(([item, amount]) => {
              const key = item;
              if (!itemsMap.has(key)) {
                itemsMap.set(key, {
                  name: item,
                  uses: []
                });
              }
              itemsMap.get(key).uses.push({
                type: "craft",
                detail: craftable.name,
                level: 1,
                amount
              });
            });
          }
          if (craftable.level && craftable.level > 1 && itemData.upgrades) {
            for (let i = 0; i < craftable.level - 1 && i < itemData.upgrades.length; i++) {
              const upgradeComponents = itemData.upgrades[i].components;
              Object.entries(upgradeComponents).forEach(([item, amount]) => {
                const key = item;
                if (!itemsMap.has(key)) {
                  itemsMap.set(key, {
                    name: item,
                    uses: []
                  });
                }
                itemsMap.get(key).uses.push({
                  type: "craft",
                  detail: craftable.name,
                  level: i + 2,
                  amount
                });
              });
            }
          }
        }
      });
      const items = Array.from(itemsMap.values()).map((item) => {
        const hasQuest = item.uses.some((u) => u.type === "quest");
        const hasProject = item.uses.some((u) => u.type === "project");
        const hasWorkshop = item.uses.some((u) => u.type === "workshop");
        const hasCraft = item.uses.some((u) => u.type === "craft");
        let category = "";
        let type = "";
        if (hasQuest) {
          category = "Quest Item";
          type = "keep-quest";
        } else if (hasProject) {
          category = "Project Item";
          type = "keep-project";
        } else if (hasWorkshop) {
          category = "Workshop Item";
          type = "workshop";
        } else if (hasCraft) {
          category = "Crafting Material";
          type = "craft";
        }
        return __spreadProps(__spreadValues({}, item), {
          category,
          type
        });
      });
      lootData.forEach((lootItem) => {
        if (!itemsMap.has(lootItem.item)) {
          items.push({
            name: lootItem.item,
            category: "Safe to Recycle",
            type: "safe-recycle",
            uses: []
          });
        }
      });
      return items;
    }, [questsData, projectsData, tablesData, weaponsData, equipmentData, lootData, weaponModsData, selectedQuests, projectsEnabled, currentProjectLevel, workshopLevels, selectedCraftables]);
    const filteredItems = useMemo(() => {
      return fuzzySearch(searchTerm, allItems);
    }, [searchTerm, allItems]);
    const openModal = (modalType) => {
      setActiveModal(modalType);
      setMobileDrawerOpen(false);
    };
    const closeModal = () => {
      setActiveModal(null);
    };
    const getConfigBadgeText = (type) => {
      switch (type) {
        case "workshop":
          const nonBaseCount = Object.values(workshopLevels).filter((l) => l > 0).length;
          return nonBaseCount > 0 ? `${nonBaseCount} upgraded` : "all at level 1";
        case "quests":
          return selectedQuests.length > 0 ? `${selectedQuests.length} active` : null;
        case "crafting":
          return selectedCraftables.length > 0 ? `${selectedCraftables.length} tracked` : null;
        case "projects":
          return projectsEnabled ? currentProjectLevel || "enabled" : null;
        default:
          return null;
      }
    };
    const configOptions = [
      {
        id: "workshop",
        icon: "\u{1F527}",
        title: "Workshop",
        description: "Set crafting station levels"
      },
      {
        id: "quests",
        icon: "\u{1F4CB}",
        title: "Quests",
        description: "Track active quests"
      },
      {
        id: "crafting",
        icon: "\u{1F528}",
        title: "Crafting",
        description: "Set crafting goals"
      },
      {
        id: "projects",
        icon: "\u{1F3D7}\uFE0F",
        title: "Projects",
        description: "Set current segment"
      }
    ];
    if (isLoading) {
      return /* @__PURE__ */ React.createElement("div", { className: "app-container" }, /* @__PURE__ */ React.createElement("div", { className: "header" }, /* @__PURE__ */ React.createElement("div", { className: "header-left" }, /* @__PURE__ */ React.createElement("h1", null, "\u{1F50E} ARC Raiders Tools - Item Search"))), /* @__PURE__ */ React.createElement("div", { className: "main-content" }, /* @__PURE__ */ React.createElement("div", { className: "container" }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "50px", color: "var(--text-secondary)" } }, "Loading data..."))));
    }
    return /* @__PURE__ */ React.createElement("div", { className: "app-container" }, /* @__PURE__ */ React.createElement("div", { className: "header" }, /* @__PURE__ */ React.createElement("div", { className: "header-left" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "hamburger-menu",
        onClick: () => setMobileDrawerOpen(true)
      },
      "\u2630"
    ), /* @__PURE__ */ React.createElement("h1", null, "\u{1F50E} ARC Raiders Tools: Item Search")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "15px" } }, /* @__PURE__ */ React.createElement(
      "a",
      {
        href: "https://github.com/zinefer/arc-raiders",
        target: "_blank",
        rel: "noopener noreferrer",
        style: {
          color: "var(--text-secondary)",
          textDecoration: "none",
          fontSize: "0.9em",
          transition: "color 0.3s",
          textAlign: "center"
        },
        onMouseOver: (e) => e.currentTarget.style.color = "var(--text-primary)",
        onMouseOut: (e) => e.currentTarget.style.color = "var(--text-secondary)"
      },
      /* @__PURE__ */ React.createElement("span", { style: { whiteSpace: "nowrap" } }, "Made with"),
      /* @__PURE__ */ React.createElement("span", { style: { whiteSpace: "nowrap" } }, "\u{1F9E1} by Zinefer")
    ), /* @__PURE__ */ React.createElement("button", { className: "theme-toggle", onClick: toggleTheme }, theme === "dark" ? "\u2600\uFE0F" : "\u{1F319}"))), /* @__PURE__ */ React.createElement("div", { className: `drawer-overlay ${mobileDrawerOpen ? "visible" : ""}`, onClick: () => setMobileDrawerOpen(false) }), /* @__PURE__ */ React.createElement("div", { className: `mobile-drawer ${mobileDrawerOpen ? "open" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "mobile-drawer-header" }, /* @__PURE__ */ React.createElement("div", { className: "mobile-drawer-title" }, "Configuration"), /* @__PURE__ */ React.createElement("button", { className: "mobile-drawer-close", onClick: () => setMobileDrawerOpen(false) }, "\xD7")), configOptions.map((option) => /* @__PURE__ */ React.createElement("div", { key: option.id, className: "mobile-drawer-item", onClick: () => openModal(option.id) }, /* @__PURE__ */ React.createElement("div", { className: "mobile-drawer-icon" }, option.icon), /* @__PURE__ */ React.createElement("div", { className: "mobile-drawer-content" }, /* @__PURE__ */ React.createElement("div", { className: "mobile-drawer-label" }, option.title), /* @__PURE__ */ React.createElement("div", { className: "mobile-drawer-desc" }, option.description), getConfigBadgeText(option.id) && /* @__PURE__ */ React.createElement("div", { className: "config-box-badge" }, getConfigBadgeText(option.id)))))), /* @__PURE__ */ React.createElement("div", { className: "main-content" }, /* @__PURE__ */ React.createElement("div", { className: "container" }, /* @__PURE__ */ React.createElement("p", { className: "section-description" }, "Search for any item to find out if you should keep or recycle/sell it"), /* @__PURE__ */ React.createElement("div", { className: "config-boxes" }, configOptions.map((option) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: option.id,
        className: "config-box",
        onClick: () => openModal(option.id)
      },
      /* @__PURE__ */ React.createElement("div", { className: "config-box-icon" }, option.icon),
      /* @__PURE__ */ React.createElement("div", { className: "config-box-title" }, option.title),
      /* @__PURE__ */ React.createElement("div", { className: "config-box-description" }, option.description),
      getConfigBadgeText(option.id) && /* @__PURE__ */ React.createElement("div", { className: "config-box-badge" }, getConfigBadgeText(option.id))
    ))), /* @__PURE__ */ React.createElement("div", { className: "search-box" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "search-input",
        placeholder: "Type to search items (e.g., 'metal parts', 'wire', 'battery')...",
        value: searchTerm,
        onChange: (e) => setSearchTerm(e.target.value)
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "results-container" }, filteredItems.length > 0 ? filteredItems.map((item, index) => /* @__PURE__ */ React.createElement("div", { key: index, className: `result-item ${item.type}` }, /* @__PURE__ */ React.createElement("div", { className: "item-name" }, item.name), /* @__PURE__ */ React.createElement("div", { className: "item-category" }, item.category), item.uses && item.uses.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "item-uses" }, item.uses.map((use, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, style: { fontSize: "0.85em", color: "var(--text-secondary)", marginTop: "4px" } }, use.type === "quest" && `\u2192 Quest: ${use.detail} (${use.trader}) - Need: ${use.amount}`, use.type === "project" && `\u2192 Project: ${use.detail} - Need: ${use.amount}`, use.type === "workshop" && `\u2192 ${use.detail} (Level ${use.level + 1}) - Need: ${use.amount}`, use.type === "craft" && `\u2192 Craft: ${use.detail} (Level ${use.level}) - Need: ${use.amount}`))))) : searchTerm ? /* @__PURE__ */ React.createElement("div", { className: "no-results" }, 'No items found matching "', searchTerm, '"') : /* @__PURE__ */ React.createElement("div", { className: "no-results" }, "Start typing to search for items...")))), activeModal && /* @__PURE__ */ React.createElement("div", { className: "modal-backdrop", onClick: closeModal }), activeModal === "workshop" && /* @__PURE__ */ React.createElement("div", { className: "modal-content", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
      WorkshopModal,
      {
        workshopLevels,
        setWorkshopLevels,
        onClose: closeModal,
        tablesData
      }
    )), activeModal === "quests" && /* @__PURE__ */ React.createElement("div", { className: "modal-content", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
      QuestsModal,
      {
        selectedQuests,
        setSelectedQuests,
        onClose: closeModal,
        questsData
      }
    )), activeModal === "crafting" && /* @__PURE__ */ React.createElement("div", { className: "modal-content", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
      CraftingModal,
      {
        selectedCraftables,
        setSelectedCraftables,
        onClose: closeModal,
        weaponsData,
        equipmentData,
        weaponModsData
      }
    )), activeModal === "projects" && /* @__PURE__ */ React.createElement("div", { className: "modal-content", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
      ProjectsModal,
      {
        projectsEnabled,
        setProjectsEnabled,
        currentProjectLevel,
        setCurrentProjectLevel,
        onClose: closeModal,
        projectsData
      }
    )));
  }
  ReactDOM.render(/* @__PURE__ */ React.createElement(App, null), document.getElementById("root"));
})();
