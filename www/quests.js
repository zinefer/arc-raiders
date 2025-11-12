(() => {
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
  const { useState, useMemo, useEffect, useCallback, useRef } = React;
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
    })), /* @__PURE__ */ React.createElement("div", { className: "button-group" }, /* @__PURE__ */ React.createElement("button", { className: "reset-btn", onClick: handleReset }, "Reset Quests"), /* @__PURE__ */ React.createElement("button", { className: "modal-close", onClick: onClose }, "Close"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "search-box" }, /* @__PURE__ */ React.createElement(
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
  function App() {
    const [theme, setTheme] = useState("dark");
    const [showModal, setShowModal] = useState(false);
    const [selectedQuests, setSelectedQuests] = useState([]);
    const [questsData, setQuestsData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const chartWrapperRef = useRef(null);
    const mermaidContainerRef = useRef(null);
    const zoomLevelRef = useRef(zoomLevel);
    const mermaidIdRef = useRef(0);
    const lastTouchDistance = useRef(null);
    const lastTouchCenter = useRef(null);
    const hasInitiallycentered = useRef(false);
    useEffect(() => {
      zoomLevelRef.current = zoomLevel;
    }, [zoomLevel]);
    useEffect(() => {
      function loadData() {
        return __async(this, null, function* () {
          try {
            const quests = yield fetch("quests.json").then((r) => r.json());
            setQuestsData(quests);
            const savedConfig = localStorage.getItem("arcRaidersConfig");
            if (savedConfig) {
              try {
                const config = JSON.parse(savedConfig);
                setSelectedQuests(config.selectedQuests || []);
              } catch (e) {
                console.error("Error loading saved config:", e);
              }
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
      if (!isLoading && questsData) {
        const savedConfig = localStorage.getItem("arcRaidersConfig");
        const config = savedConfig ? JSON.parse(savedConfig) : {};
        config.selectedQuests = selectedQuests;
        localStorage.setItem("arcRaidersConfig", JSON.stringify(config));
      }
    }, [selectedQuests, isLoading, questsData]);
    useEffect(() => {
      document.documentElement.className = theme;
    }, [theme]);
    const toggleTheme = () => {
      setTheme(theme === "dark" ? "light" : "dark");
    };
    const mermaidCode = useMemo(() => {
      if (!questsData) return "";
      const { completed, questGraph } = getCompletedQuests(questsData, selectedQuests);
      const unlockedSet = new Set(selectedQuests);
      const traderColors = {
        "Shani": "#e74c3c",
        // Brighter red
        "Tian Wen": "#16a085",
        // Teal (distinct from Lance)
        "Lance": "#3498db",
        // True blue
        "Celeste": "#f39c12",
        // Orange (better contrast than yellow)
        "Apollo": "#9b59b6"
        // Purple
      };
      const questToId = {};
      let idCounter = 0;
      for (const trader in questsData) {
        const quests = questsData[trader].quests;
        for (const questData of quests) {
          questToId[questData.quest] = `q${idCounter++}`;
        }
      }
      let diagram = "graph TD\n\n";
      for (const trader in questsData) {
        const quests = questsData[trader].quests;
        const color = traderColors[trader] || "#95a5a6";
        for (const questData of quests) {
          const questName = questData.quest;
          const questId = questToId[questName];
          const escapedName = questName.replace(/"/g, "#quot;");
          const escapedTrader = trader.replace(/"/g, "#quot;");
          diagram += `    ${questId}["${escapedName}<br/><i>(${escapedTrader})</i>"]
`;
          let strokeColor = "#333";
          let strokeWidth = "2px";
          if (completed.has(questName)) {
            strokeColor = "#10b981";
            strokeWidth = "8px";
          } else if (unlockedSet.has(questName)) {
            strokeColor = "#f59e0b";
            strokeWidth = "8px";
          }
          diagram += `    style ${questId} fill:${color},stroke:${strokeColor},stroke-width:${strokeWidth},color:#fff
`;
        }
      }
      diagram += "\n";
      for (const trader in questsData) {
        const quests = questsData[trader].quests;
        for (const questData of quests) {
          const questName = questData.quest;
          const questId = questToId[questName];
          if (questData.nextQuests && questData.nextQuests.length > 0) {
            for (const nextQuest of questData.nextQuests) {
              const nextQuestId = questToId[nextQuest];
              if (nextQuestId) {
                diagram += `    ${questId} --> ${nextQuestId}
`;
              }
            }
          }
        }
      }
      return diagram;
    }, [questsData, selectedQuests]);
    const applyNodeClasses = useCallback(() => {
      if (!mermaidContainerRef.current || !questsData) return;
      const { completed } = getCompletedQuests(questsData, selectedQuests);
      const unlockedSet = new Set(selectedQuests);
      const nodes = mermaidContainerRef.current.querySelectorAll(".node");
      nodes.forEach((node) => {
        const textElement = node.querySelector("span");
        if (!textElement) return;
        const fullText = textElement.textContent;
        const questName = fullText.split("(")[0].trim();
        node.classList.remove("completed", "active");
        if (completed.has(questName)) {
          node.classList.add("completed");
        } else if (unlockedSet.has(questName)) {
          node.classList.add("active");
        }
      });
    }, [questsData, selectedQuests]);
    useEffect(() => {
      if (mermaidCode && mermaidContainerRef.current && !isLoading) {
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === "dark" ? "dark" : "default",
          securityLevel: "loose",
          flowchart: {
            useMaxWidth: false,
            htmlLabels: true,
            curve: "basis"
          }
        });
        const renderDiagram = () => __async(null, null, function* () {
          try {
            mermaidContainerRef.current.innerHTML = "";
            const uniqueId = `mermaid-diagram-${mermaidIdRef.current++}`;
            const { svg } = yield mermaid.render(uniqueId, mermaidCode);
            if (mermaidContainerRef.current) {
              mermaidContainerRef.current.innerHTML = svg;
              applyNodeClasses();
              if (!hasInitiallycentered.current && chartWrapperRef.current) {
                setTimeout(() => {
                  if (mermaidContainerRef.current && chartWrapperRef.current) {
                    const svgElement = mermaidContainerRef.current.querySelector("svg");
                    if (svgElement) {
                      const wrapperRect = chartWrapperRef.current.getBoundingClientRect();
                      const svgRect = svgElement.getBoundingClientRect();
                      const centerX = (wrapperRect.width - svgRect.width) / 2;
                      setPanOffset({ x: centerX, y: 0 });
                      hasInitiallycentered.current = true;
                    }
                  }
                }, 100);
              }
            }
          } catch (error) {
            console.error("Error rendering diagram:", error);
            if (mermaidContainerRef.current) {
              mermaidContainerRef.current.innerHTML = '<p style="color: var(--text-secondary); padding: 20px;">Error rendering quest tree. Please try refreshing the page.</p>';
            }
          }
        });
        renderDiagram();
      }
    }, [mermaidCode, theme, isLoading]);
    useEffect(() => {
      if (mermaidContainerRef.current) {
        mermaidContainerRef.current.style.transform = `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`;
      }
    }, [zoomLevel, panOffset]);
    const handleMouseDown = (e) => {
      if (e.button === 0) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
        e.preventDefault();
      }
    };
    const handleMouseMove = (e) => {
      if (isPanning) {
        setPanOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y
        });
      }
    };
    const handleMouseUp = () => {
      setIsPanning(false);
    };
    const handleMouseLeave = () => {
      setIsPanning(false);
    };
    const getTouchDistance = (touch1, touch2) => {
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };
    const getTouchCenter = (touch1, touch2) => {
      return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
    };
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        setIsPanning(true);
        setPanStart({
          x: e.touches[0].clientX - panOffset.x,
          y: e.touches[0].clientY - panOffset.y
        });
      } else if (e.touches.length === 2) {
        e.preventDefault();
        setIsPanning(false);
        lastTouchDistance.current = getTouchDistance(e.touches[0], e.touches[1]);
        lastTouchCenter.current = getTouchCenter(e.touches[0], e.touches[1]);
      }
    };
    const handleTouchMove = (e) => {
      if (e.touches.length === 1 && isPanning) {
        setPanOffset({
          x: e.touches[0].clientX - panStart.x,
          y: e.touches[0].clientY - panStart.y
        });
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const newDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const newCenter = getTouchCenter(e.touches[0], e.touches[1]);
        if (lastTouchDistance.current && lastTouchCenter.current) {
          const distanceRatio = newDistance / lastTouchDistance.current;
          const newZoom = Math.min(Math.max(0.3, zoomLevelRef.current * distanceRatio), 3);
          const centerDeltaX = newCenter.x - lastTouchCenter.current.x;
          const centerDeltaY = newCenter.y - lastTouchCenter.current.y;
          setZoomLevel(newZoom);
          setPanOffset((prev) => ({
            x: prev.x + centerDeltaX,
            y: prev.y + centerDeltaY
          }));
          lastTouchDistance.current = newDistance;
          lastTouchCenter.current = newCenter;
        }
      }
    };
    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        lastTouchDistance.current = null;
        lastTouchCenter.current = null;
      }
      if (e.touches.length === 0) {
        setIsPanning(false);
      }
    };
    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY * -1e-3;
      const newZoom = Math.min(Math.max(0.3, zoomLevelRef.current + delta), 3);
      setZoomLevel(newZoom);
    };
    useEffect(() => {
      const wrapper = chartWrapperRef.current;
      if (wrapper) {
        wrapper.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
          wrapper.removeEventListener("wheel", handleWheel);
        };
      }
    }, [isLoading]);
    if (isLoading) {
      return /* @__PURE__ */ React.createElement("div", { className: "app-container" }, /* @__PURE__ */ React.createElement("div", { className: "header" }, /* @__PURE__ */ React.createElement("div", { className: "header-left" }, /* @__PURE__ */ React.createElement("h1", null, "\u{1F5FA}\uFE0F ARC Raiders Tools - Quest Tree"))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "50px", color: "var(--text-secondary)" } }, "Loading quest data..."));
    }
    return /* @__PURE__ */ React.createElement("div", { className: "app-container" }, /* @__PURE__ */ React.createElement("div", { className: "header" }, /* @__PURE__ */ React.createElement("div", { className: "header-left" }, /* @__PURE__ */ React.createElement("h1", null, "\u{1F5FA}\uFE0F ARC Raiders Tools: Quest Tree")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "15px" } }, /* @__PURE__ */ React.createElement(
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
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "theme-toggle",
        onClick: () => setShowModal(true),
        title: "Manage Quests"
      },
      "\u{1F4CB}"
    ), /* @__PURE__ */ React.createElement("button", { className: "theme-toggle", onClick: toggleTheme }, theme === "dark" ? "\u2600\uFE0F" : "\u{1F319}"))), /* @__PURE__ */ React.createElement("div", { className: "quest-map-container" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: `chart-wrapper ${isPanning ? "panning" : ""}`,
        ref: chartWrapperRef,
        onMouseDown: handleMouseDown,
        onMouseMove: handleMouseMove,
        onMouseUp: handleMouseUp,
        onMouseLeave: handleMouseLeave,
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd
      },
      /* @__PURE__ */ React.createElement("div", { className: "mermaid-container", ref: mermaidContainerRef }),
      /* @__PURE__ */ React.createElement("div", { className: "legend" }, /* @__PURE__ */ React.createElement("div", { className: "legend-title" }, "Traders"), /* @__PURE__ */ React.createElement("div", { className: "legend-item" }, /* @__PURE__ */ React.createElement("div", { className: "legend-box shani" }), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--text-primary)" } }, "Shani")), /* @__PURE__ */ React.createElement("div", { className: "legend-item" }, /* @__PURE__ */ React.createElement("div", { className: "legend-box tianwen" }), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--text-primary)" } }, "Tian Wen")), /* @__PURE__ */ React.createElement("div", { className: "legend-item" }, /* @__PURE__ */ React.createElement("div", { className: "legend-box lance" }), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--text-primary)" } }, "Lance")), /* @__PURE__ */ React.createElement("div", { className: "legend-item" }, /* @__PURE__ */ React.createElement("div", { className: "legend-box celeste" }), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--text-primary)" } }, "Celeste")), /* @__PURE__ */ React.createElement("div", { className: "legend-item" }, /* @__PURE__ */ React.createElement("div", { className: "legend-box apollo" }), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--text-primary)" } }, "Apollo")), /* @__PURE__ */ React.createElement("div", { className: "legend-separator" }), /* @__PURE__ */ React.createElement("div", { className: "legend-title" }, "Status"), /* @__PURE__ */ React.createElement("div", { className: "legend-item" }, /* @__PURE__ */ React.createElement("div", { className: "legend-outline completed" }), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--text-primary)" } }, "Completed")), /* @__PURE__ */ React.createElement("div", { className: "legend-item" }, /* @__PURE__ */ React.createElement("div", { className: "legend-outline active" }), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--text-primary)" } }, "Active")))
    )), showModal && /* @__PURE__ */ React.createElement("div", { className: "modal-backdrop", onClick: () => setShowModal(false) }), showModal && /* @__PURE__ */ React.createElement("div", { className: "modal-content", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
      QuestsModal,
      {
        selectedQuests,
        setSelectedQuests,
        onClose: () => setShowModal(false),
        questsData
      }
    )));
  }
  ReactDOM.render(/* @__PURE__ */ React.createElement(App, null), document.getElementById("root"));
})();
