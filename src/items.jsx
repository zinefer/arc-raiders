const { useState, useMemo, useEffect } = React;

// Helper function to find all prerequisites recursively
function findAllPrerequisites(questName, questGraph, visited = new Set()) {
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
// Helper function to get completed quests based on unlocked quests
function getCompletedQuests(questsData, unlockedQuests) {
  if (!questsData) return { completed: new Set(), questGraph: {} };
  
  const questGraph = {};
  
  // Build quest graph
  for (const trader in questsData) {
    const quests = questsData[trader].quests;
    for (const questData of quests) {
      const questName = questData.quest;
      questGraph[questName] = {
        trader: trader,
        nextQuests: questData.nextQuests || [],
        prerequisites: [],
        objective: questData.objective
      };
    }
  }
  
  // Build prerequisites
  for (const questName in questGraph) {
    const nextQuests = questGraph[questName].nextQuests;
    for (const nextQuest of nextQuests) {
      if (questGraph[nextQuest]) {
        questGraph[nextQuest].prerequisites.push(questName);
      }
    }
  }
  
  // Find completed quests - includes all prerequisites of selected quests
  const completed = new Set();
  for (const unlockedQuest of unlockedQuests) {
    if (questGraph[unlockedQuest]) {
      findAllPrerequisites(unlockedQuest, questGraph, completed);
    }
  }
  
  // Additionally, mark as completed any quest that:
  // 1. Is not in the unlocked list
  // 2. Has no prerequisites OR all prerequisites are completed
  // This needs to run iteratively since completing one quest unlocks others
  const unlockedSet = new Set(unlockedQuests);
  
  let changesOccurred = true;
  while (changesOccurred) {
    changesOccurred = false;
    
    for (const questName in questGraph) {
      if (!unlockedSet.has(questName) && !completed.has(questName)) {
        const quest = questGraph[questName];
        
        // Check if all prerequisites are completed (or has no prerequisites)
        const allPrereqsComplete = quest.prerequisites.length === 0 || 
          quest.prerequisites.every(prereq => completed.has(prereq));
        
        if (allPrereqsComplete) {
          // This quest is unlocked but not selected, so assume it's completed
          completed.add(questName);
          changesOccurred = true;
        }
      }
    }
  }
  
  return { completed, questGraph };
}
// Fuzzy search function
function fuzzySearch(searchTerm, items) {
  if (!searchTerm) return items;
  const term = searchTerm.toLowerCase();
  return items
    .map((item) => {
      const itemName = (typeof item === 'string' ? item : item.name).toLowerCase();
      let score = 0;
      if (itemName === term) {
        score = 1000;
      } else if (itemName.startsWith(term)) {
        score = 500;
      } else if (itemName.includes(term)) {
        score = 250;
      } else {
        let termIndex = 0;
        let lastFoundIndex = -1;
        for (
          let i = 0;
          i < itemName.length && termIndex < term.length;
          i++
        ) {
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
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((result) => result.item);
}
function WorkshopModal({ workshopLevels, setWorkshopLevels, onClose, tablesData }) {
  const workshops = tablesData ? Object.keys(tablesData) : [];
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all workshop levels to base level?')) {
      const resetLevels = {};
      workshops.forEach(workshop => {
        resetLevels[workshop] = 0;
      });
      setWorkshopLevels(resetLevels);
    }
  };
  return (
    <>
      <h3 className="modal-title">🔧 Workshop Levels</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Set your current level for each crafting station. Items needed are for levels AFTER your current level.
      </p>
      <div className="workshop-grid">
        {workshops.map((workshop) => {
          // JSON has upgrade levels only. Total levels = JSON length + 1 (for base level 0)
          const maxLevel = tablesData[workshop].length;
          return (
            <div key={workshop} className="workshop-card">
              <div className="workshop-name">{workshop}</div>
              <div className="level-selector">
                <label>Current Level:</label>
                <select
                  value={workshopLevels[workshop] || 0}
                  onChange={(e) =>
                    setWorkshopLevels({
                      ...workshopLevels,
                      [workshop]: parseInt(e.target.value),
                    })
                  }
                >
                  {Array.from({ length: maxLevel + 1 }, (_, i) => i).map((level) => (
                    <option key={level} value={level}>
                      Level {level + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
      <div className="button-group">
        <button className="reset-btn" onClick={handleReset}>
          Reset Workshops
        </button>
        <button className="modal-close" onClick={onClose}>
          Close
        </button>
      </div>
    </>
  );
}
function QuestsModal({ selectedQuests, setSelectedQuests, onClose, questsData }) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const allQuests = useMemo(() => {
    if (!questsData) return [];
    const quests = [];
    for (const trader in questsData) {
      questsData[trader].quests.forEach(q => {
        quests.push({ name: q.quest, trader });
      });
    }
    return quests;
  }, [questsData]);
  // Calculate quest progress
  const questProgress = useMemo(() => {
    if (!questsData) return { completed: 0, total: 0, percentage: 0 };
    
    const { completed } = getCompletedQuests(questsData, selectedQuests);
    let total = 0;
    for (const trader in questsData) {
      total += questsData[trader].quests.length;
    }
    
    return {
      completed: completed.size,
      total: total,
      percentage: total > 0 ? Math.round((completed.size / total) * 100) : 0
    };
  }, [questsData, selectedQuests]);
  const filteredQuests = useMemo(() => {
    return fuzzySearch(searchTerm, allQuests);
  }, [searchTerm, allQuests]);
  const addQuest = (quest) => {
    const questName = typeof quest === 'string' ? quest : quest.name;
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
    // Remove the quest from selected
    const newSelected = selectedQuests.filter((q) => q !== questName);
    
    // Find and add newly unlocked quests
    for (const trader in questsData) {
      const quest = questsData[trader].quests.find(q => q.quest === questName);
      if (quest && quest.nextQuests) {
        quest.nextQuests.forEach(nextQuest => {
          if (!newSelected.includes(nextQuest)) {
            newSelected.push(nextQuest);
          }
        });
      }
    }
    
    setSelectedQuests(newSelected);
  };
  const handleReset = () => {
    if (window.confirm('Are you sure you want to clear all active quests?')) {
      setSelectedQuests([]);
    }
  };
  return (
    <>
      <h3 className="modal-title">📋 Active Quests</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
        Select your unlocked but not yet completed quests
      </p>
      
      {/* Progress Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9em' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Overall Progress</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
            {questProgress.completed} / {questProgress.total} ({questProgress.percentage}%)
          </span>
        </div>
        <div style={{ 
          width: '100%', 
          height: '20px', 
          backgroundColor: 'var(--bg-secondary)', 
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${questProgress.percentage}%`,
            height: '100%',
            backgroundColor: '#4caf50',
            transition: 'width 0.3s ease'
          }}></div>
        </div>
      </div>
      {!showSearch ? (
        <>
          <button className="add-button" onClick={() => setShowSearch(true)}>
            + Add Quest
          </button>
          <div className="quest-list">
            {selectedQuests.length === 0 ? (
              <div className="no-results">No quests selected</div>
            ) : (
              selectedQuests.map((questName) => {
                let trader = '';
                for (const t in questsData) {
                  if (questsData[t].quests.find(q => q.quest === questName)) {
                    trader = t;
                    break;
                  }
                }
                return (
                  <div key={questName} className="list-item">
                    <div>
                      <span className="list-item-name">{questName}</span>
                      {trader && <span style={{color: 'var(--text-secondary)', fontSize: '0.9em', marginLeft: '8px'}}>({trader})</span>}
                    </div>
                    <div>
                      <button
                        className="complete-btn"
                        onClick={() => completeQuest(questName)}
                        style={{marginRight: '8px'}}
                      >
                        ✓ Complete
                      </button>
                      <button
                        className="remove-btn"
                        onClick={() => removeQuest(questName)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="button-group">
            <button className="reset-btn" onClick={handleReset}>
              Reset Quests
            </button>
            <button 
              className="modal-close" 
              onClick={() => window.open('quests.html', '_blank')}
              style={{
                background: 'var(--nav-active)',
                marginRight: '10px'
              }}
            >
              🗺️ View Quest Map
            </button>
            <button className="modal-close" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="Search quests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          <div className="quest-list">
            {filteredQuests.map((quest) => {
              const questName = typeof quest === 'string' ? quest : quest.name;
              const trader = typeof quest === 'object' ? quest.trader : '';
              return (
                <div
                  key={questName}
                  className="list-item"
                  style={{ cursor: "pointer" }}
                  onClick={() => addQuest(quest)}
                >
                  <span className="list-item-name">{questName}</span>
                  {trader && <span style={{color: 'var(--text-secondary)', fontSize: '0.9em', marginLeft: '8px'}}>({trader})</span>}
                </div>
              );
            })}
          </div>
          <button
            className="modal-close"
            onClick={() => {
              setShowSearch(false);
              setSearchTerm("");
            }}
          >
            Back to Quests
          </button>
        </>
      )}
    </>
  );
}
function CraftingModal({ selectedCraftables, setSelectedCraftables, onClose, weaponsData, equipmentData, weaponModsData }) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const allCraftables = useMemo(() => {
    const items = [];
    if (weaponsData) {
      weaponsData.forEach(w => {
        items.push({ name: w.item, levels: w.upgrades?.length ? Array.from({length: w.upgrades.length + 1}, (_, i) => i + 1) : [1], type: 'weapon' });
      });
    }
    if (equipmentData) {
      equipmentData.forEach(e => {
        if (e.components && Object.keys(e.components).length > 0) {
          items.push({ name: e.item, levels: null, type: 'equipment' });
        }
      });
    }
    if (weaponModsData) {
      weaponModsData.forEach(m => {
        if (m.components && Object.keys(m.components).length > 0) {
          items.push({ name: m.item, levels: null, type: 'mod' });
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
      level: selectedItem.levels ? selectedLevel : null,
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
    if (window.confirm('Are you sure you want to clear all crafting goals?')) {
      setSelectedCraftables([]);
    }
  };
  return (
    <>
      <h3 className="modal-title">🔨 Crafting Goals</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Tag items you want to craft
      </p>
      {!showSearch ? (
        <>
          <button className="add-button" onClick={() => setShowSearch(true)}>
            + Add Craftable
          </button>
          <div className="crafting-list">
            {selectedCraftables.length === 0 ? (
              <div className="no-results">No craftables selected</div>
            ) : (
              selectedCraftables.map((craftable, index) => (
                <div key={index} className="list-item">
                  <span className="list-item-name">
                    {craftable.name}
                    {craftable.level && ` (Level ${craftable.level})`}
                  </span>
                  <button
                    className="remove-btn"
                    onClick={() => removeCraftable(craftable)}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="button-group">
            <button className="reset-btn" onClick={handleReset}>
              Reset Crafting
            </button>
            <button className="modal-close" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      ) : selectedItem ? (
        <>
          <h4 style={{ marginBottom: "15px", color: "var(--text-primary)" }}>
            {selectedItem.name}
          </h4>
          {selectedItem.levels && selectedItem.levels.length > 1 && (
            <div className="level-selector" style={{ marginBottom: "20px" }}>
              <label>Craft Level:</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(parseInt(e.target.value))}
              >
                {selectedItem.levels.map((level) => (
                  <option key={level} value={level}>
                    Level {level}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button className="add-button" onClick={addCraftable}>
            Add to Crafting Goals
          </button>
          <button
            className="modal-close"
            onClick={() => {
              setSelectedItem(null);
              setSelectedLevel(1);
            }}
          >
            Back
          </button>
        </>
      ) : (
        <>
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="Search craftables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          <div className="quest-list">
            {filteredCraftables.map((craftable) => (
              <div
                key={craftable.name}
                className="list-item"
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedItem(craftable)}
              >
                <span className="list-item-name">{craftable.name}</span>
              </div>
            ))}
          </div>
          <button
            className="modal-close"
            onClick={() => {
              setShowSearch(false);
              setSearchTerm("");
            }}
          >
            Back to Crafting Goals
          </button>
        </>
      )}
    </>
  );
}
function ProjectsModal({ projectsEnabled, setProjectsEnabled, currentProjectLevel, setCurrentProjectLevel, onClose, projectsData }) {
  const projectSegments = useMemo(() => {
    if (!projectsData) return [];
    return Object.keys(projectsData);
  }, [projectsData]);
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset project configuration?')) {
      setProjectsEnabled(false);
      setCurrentProjectLevel("");
    }
  };
  return (
    <>
      <h3 className="modal-title">🏗️ Projects</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Enable projects and select which segment you're currently on
      </p>
      <div className="project-list">
        <div style={{ marginBottom: "20px", display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={projectsEnabled}
              onChange={(e) => setProjectsEnabled(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
          <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
            {projectsEnabled ? 'Projects Enabled' : 'Projects Disabled'}
          </span>
        </div>
        {projectsEnabled && (
          <>
            <div className="level-selector" style={{ marginBottom: "20px" }}>
              <label>Current Project Segment:</label>
              <select
                value={currentProjectLevel}
                onChange={(e) => setCurrentProjectLevel(e.target.value)}
              >
                <option value="">Select segment...</option>
                {projectSegments.map((segment) => (
                  <option key={segment} value={segment}>
                    {segment}
                  </option>
                ))}
              </select>
            </div>
            {currentProjectLevel && projectsData && projectsData[currentProjectLevel] && (
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '15px', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '10px', color: 'var(--text-primary)' }}>
                  Current Segment Requirements:
                </h4>
                <div style={{ color: 'var(--text-secondary)' }}>
                  {Object.keys(projectsData[currentProjectLevel]).length === 0 ? (
                    <div>No requirements for this segment</div>
                  ) : (
                    Object.entries(projectsData[currentProjectLevel]).map(([item, amount]) => (
                      <div key={item} style={{ marginBottom: '5px' }}>
                        {item}: {amount}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="button-group">
        <button className="reset-btn" onClick={handleReset}>
          Reset Projects
        </button>
        <button className="modal-close" onClick={onClose}>
          Close
        </button>
      </div>
    </>
  );
}
function App() {
  const [theme, setTheme] = useState('dark');
  const [activeModal, setActiveModal] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [workshopLevels, setWorkshopLevels] = useState({});
  const [selectedQuests, setSelectedQuests] = useState([]);
  const [selectedCraftables, setSelectedCraftables] = useState([]);
  const [currentProjectLevel, setCurrentProjectLevel] = useState("");
  // Data states
  const [questsData, setQuestsData] = useState(null);
  const [projectsData, setProjectsData] = useState(null);
  const [tablesData, setTablesData] = useState(null);
  const [weaponsData, setWeaponsData] = useState(null);
  const [equipmentData, setEquipmentData] = useState(null);
  const [lootData, setLootData] = useState(null);
  const [weaponModsData, setWeaponModsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projectsEnabled, setProjectsEnabled] = useState(false);
  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [quests, projects, tables, weapons, equipment, loot, weaponMods] = await Promise.all([
          fetch('quests.json').then(r => r.json()),
          fetch('projects.json').then(r => r.json()),
          fetch('tables.json').then(r => r.json()),
          fetch('weapons.json').then(r => r.json()),
          fetch('equipment.json').then(r => r.json()),
          fetch('loot.json').then(r => r.json()),
          fetch('weapon_modifications.json').then(r => r.json())
        ]);
        setQuestsData(quests);
        setProjectsData(projects);
        setTablesData(tables);
        setWeaponsData(weapons);
        setEquipmentData(equipment);
        setLootData(loot);
        setWeaponModsData(weaponMods);
        // Initialize workshop levels to 0 (base level)
        const initialWorkshopLevels = {};
        Object.keys(tables).forEach(workshop => {
          initialWorkshopLevels[workshop] = 0;
        });
        // Load saved configuration from localStorage
        const savedConfig = localStorage.getItem('arcRaidersConfig');
        if (savedConfig) {
          try {
            const config = JSON.parse(savedConfig);
            setWorkshopLevels(config.workshopLevels || initialWorkshopLevels);
            setSelectedQuests(config.selectedQuests || []);
            setSelectedCraftables(config.selectedCraftables || []);
            setCurrentProjectLevel(config.currentProjectLevel || "");
            setProjectsEnabled(config.projectsEnabled || false);
          } catch (e) {
            console.error('Error loading saved config:', e);
            setWorkshopLevels(initialWorkshopLevels);
          }
        } else {
          setWorkshopLevels(initialWorkshopLevels);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setIsLoading(false);
      }
    }
    loadData();
  }, []);
  // Save configuration to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading && tablesData) {
      const config = {
        workshopLevels,
        selectedQuests,
        selectedCraftables,
        currentProjectLevel,
        projectsEnabled
      };
      localStorage.setItem('arcRaidersConfig', JSON.stringify(config));
    }
  }, [workshopLevels, selectedQuests, selectedCraftables, currentProjectLevel, projectsEnabled, isLoading, tablesData]);
  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);
  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeModal) {
        closeModal();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeModal]);
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  // Calculate all items needed
  const allItems = useMemo(() => {
    if (!questsData || !projectsData || !tablesData || !weaponsData || !equipmentData || !lootData) {
      return [];
    }
    const itemsMap = new Map();
    // Get completed quests
    const { completed: completedQuests, questGraph } = getCompletedQuests(questsData, selectedQuests);
    // Add quest items for all quests that are NOT completed (includes active quests AND all quests after them)
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
              type: 'quest',
              detail: questName,
              trader: quest.trader,
              amount: amount
            });
          });
        }
      }
    }
    // Add project items (only if projects enabled and current segment selected)
    if (projectsEnabled && currentProjectLevel && projectsData[currentProjectLevel]) {
      const projectSegments = Object.keys(projectsData);
      const currentIndex = projectSegments.indexOf(currentProjectLevel);
      
      // Only add items for current and future segments
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
            type: 'project',
            detail: segment,
            amount: amount
          });
        });
      }
    }
    // Add workshop items (only for levels AFTER current level)
    Object.entries(workshopLevels).forEach(([workshop, currentLevel]) => {
      if (tablesData[workshop]) {
        // JSON array index 0 = level 1, index 1 = level 2, etc.
        // If currentLevel is 1, we need items for levels 2+ (JSON indices 1+)
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
              type: 'workshop',
              detail: workshop,
              level: i + 1,
              amount: amount
            });
          });
        }
      }
    });
    // Add crafting items
    selectedCraftables.forEach(craftable => {
      let itemData = null;
      
      // Find in weapons
      if (weaponsData) {
        itemData = weaponsData.find(w => w.item === craftable.name);
      }
      
      // Find in equipment if not found in weapons
      if (!itemData && equipmentData) {
        itemData = equipmentData.find(e => e.item === craftable.name);
      }
      // Find in weapon mods if not found yet
      if (!itemData && weaponModsData) {
        itemData = weaponModsData.find(m => m.item === craftable.name);
      }
      if (itemData) {
        // Add base components
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
              type: 'craft',
              detail: craftable.name,
              level: 1,
              amount: amount
            });
          });
        }
        // Add upgrade components if level specified (for level N, add upgrades 1 through N-1)
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
                type: 'craft',
                detail: craftable.name,
                level: i + 2,
                amount: amount
              });
            });
          }
        }
      }
    });
    // Convert map to array and categorize
    const items = Array.from(itemsMap.values()).map(item => {
      const hasQuest = item.uses.some(u => u.type === 'quest');
      const hasProject = item.uses.some(u => u.type === 'project');
      const hasWorkshop = item.uses.some(u => u.type === 'workshop');
      const hasCraft = item.uses.some(u => u.type === 'craft');
      let category = '';
      let type = '';
      
      if (hasQuest) {
        category = 'Quest Item';
        type = 'keep-quest';
      } else if (hasProject) {
        category = 'Project Item';
        type = 'keep-project';
      } else if (hasWorkshop) {
        category = 'Workshop Item';
        type = 'workshop';
      } else if (hasCraft) {
        category = 'Crafting Material';
        type = 'craft';
      }
      return {
        ...item,
        category,
        type
      };
    });
    // Add all loot items as safe to recycle if not in our needs
    lootData.forEach(lootItem => {
      if (!itemsMap.has(lootItem.item)) {
        items.push({
          name: lootItem.item,
          category: 'Safe to Recycle',
          type: 'safe-recycle',
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
    switch(type) {
      case 'workshop':
        const nonBaseCount = Object.values(workshopLevels).filter(l => l > 0).length;
        return nonBaseCount > 0 ? `${nonBaseCount} upgraded` : 'all at level 1';
      case 'quests':
        return selectedQuests.length > 0 ? `${selectedQuests.length} active` : null;
      case 'crafting':
        return selectedCraftables.length > 0 ? `${selectedCraftables.length} tracked` : null;
      case 'projects':
        return projectsEnabled ? (currentProjectLevel || 'enabled') : null;
      default:
        return null;
    }
  };
  const configOptions = [
    {
      id: 'workshop',
      icon: '🔧',
      title: 'Workshop',
      description: 'Set crafting station levels'
    },
    {
      id: 'quests',
      icon: '📋',
      title: 'Quests',
      description: 'Track active quests'
    },
    {
      id: 'crafting',
      icon: '🔨',
      title: 'Crafting',
      description: 'Set crafting goals'
    },
    {
      id: 'projects',
      icon: '🏗️',
      title: 'Projects',
      description: 'Set current segment'
    }
  ];
  if (isLoading) {
    return (
      <div className="app-container">
        <div className="header">
          <div className="header-left">
            <h1>🔎 ARC Raiders Tools - Item Search</h1>
          </div>
        </div>
        <div className="main-content">
          <div className="container">
            <div style={{textAlign: 'center', padding: '50px', color: 'var(--text-secondary)'}}>
              Loading data...
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="app-container">
      <div className="header">
        <div className="header-left">
          <button 
            className="hamburger-menu" 
            onClick={() => setMobileDrawerOpen(true)}
          >
            ☰
          </button>
          <h1>🔎 ARC Raiders Tools: Item Search</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <a 
            href="https://github.com/zinefer/arc-raiders" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: 'var(--text-secondary)', 
              textDecoration: 'none',
              fontSize: '0.9em',
              transition: 'color 0.3s',
              textAlign: 'center'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <span style={{ whiteSpace: 'nowrap' }}>Made with</span>
            <span style={{ whiteSpace: 'nowrap' }}>🧡 by Zinefer</span>
          </a>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      {/* Mobile Drawer */}
      <div className={`drawer-overlay ${mobileDrawerOpen ? 'visible' : ''}`} onClick={() => setMobileDrawerOpen(false)} />
      <div className={`mobile-drawer ${mobileDrawerOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-header">
          <div className="mobile-drawer-title">Configuration</div>
          <button className="mobile-drawer-close" onClick={() => setMobileDrawerOpen(false)}>×</button>
        </div>
        {configOptions.map(option => (
          <div key={option.id} className="mobile-drawer-item" onClick={() => openModal(option.id)}>
            <div className="mobile-drawer-icon">{option.icon}</div>
            <div className="mobile-drawer-content">
              <div className="mobile-drawer-label">{option.title}</div>
              <div className="mobile-drawer-desc">{option.description}</div>
              {getConfigBadgeText(option.id) && (
                <div className="config-box-badge">{getConfigBadgeText(option.id)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="main-content">
        <div className="container">
          <p className="section-description">
            Search for any item to find out if you should keep or recycle/sell it
          </p>
          {/* Configuration Boxes - Desktop Only */}
          <div className="config-boxes">
            {configOptions.map(option => (
              <div 
                key={option.id} 
                className="config-box"
                onClick={() => openModal(option.id)}
              >
                <div className="config-box-icon">{option.icon}</div>
                <div className="config-box-title">{option.title}</div>
                <div className="config-box-description">{option.description}</div>
                {getConfigBadgeText(option.id) && (
                  <div className="config-box-badge">{getConfigBadgeText(option.id)}</div>
                )}
              </div>
            ))}
          </div>
          {/* Search Section */}
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="Type to search items (e.g., 'metal parts', 'wire', 'battery')..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="results-container">
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) => (
                <div key={index} className={`result-item ${item.type}`}>
                  <div className="item-name">{item.name}</div>
                  <div className="item-category">{item.category}</div>
                  {item.uses && item.uses.length > 0 && (
                    <div className="item-uses">
                      {item.uses.map((use, idx) => (
                        <div key={idx} style={{fontSize: '0.85em', color: 'var(--text-secondary)', marginTop: '4px'}}>
                          {use.type === 'quest' && `→ Quest: ${use.detail} (${use.trader}) - Need: ${use.amount}`}
                          {use.type === 'project' && `→ Project: ${use.detail} - Need: ${use.amount}`}
                          {use.type === 'workshop' && `→ ${use.detail} (Level ${use.level + 1}) - Need: ${use.amount}`}
                          {use.type === 'craft' && `→ Craft: ${use.detail} (Level ${use.level}) - Need: ${use.amount}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : searchTerm ? (
              <div className="no-results">
                No items found matching "{searchTerm}"
              </div>
            ) : (
              <div className="no-results">
                Start typing to search for items...
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Modals */}
      {activeModal && <div className="modal-backdrop" onClick={closeModal} />}
      
      {activeModal === 'workshop' && (
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <WorkshopModal 
            workshopLevels={workshopLevels}
            setWorkshopLevels={setWorkshopLevels}
            onClose={closeModal}
            tablesData={tablesData}
          />
        </div>
      )}
      {activeModal === 'quests' && (
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <QuestsModal 
            selectedQuests={selectedQuests}
            setSelectedQuests={setSelectedQuests}
            onClose={closeModal}
            questsData={questsData}
          />
        </div>
      )}
      {activeModal === 'crafting' && (
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <CraftingModal 
            selectedCraftables={selectedCraftables}
            setSelectedCraftables={setSelectedCraftables}
            onClose={closeModal}
            weaponsData={weaponsData}
            equipmentData={equipmentData}
            weaponModsData={weaponModsData}
          />
        </div>
      )}
      {activeModal === 'projects' && (
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <ProjectsModal 
            projectsEnabled={projectsEnabled}
            setProjectsEnabled={setProjectsEnabled}
            currentProjectLevel={currentProjectLevel}
            setCurrentProjectLevel={setCurrentProjectLevel}
            onClose={closeModal}
            projectsData={projectsData}
          />
        </div>
      )}
    </div>
  );
}
ReactDOM.render(<App />, document.getElementById("root"));