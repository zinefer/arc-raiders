const { useState, useMemo, useEffect, useCallback, useRef } = React;

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
  
  // Find completed quests
  const completed = new Set();
  for (const unlockedQuest of unlockedQuests) {
    if (questGraph[unlockedQuest]) {
      findAllPrerequisites(unlockedQuest, questGraph, completed);
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
    const newSelected = selectedQuests.filter((q) => q !== questName);
    
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
function App() {
  const [theme, setTheme] = useState('dark');
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
  // Keep ref in sync with state
  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);
  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const quests = await fetch('quests.json').then(r => r.json());
        setQuestsData(quests);
        // Load saved configuration from localStorage
        const savedConfig = localStorage.getItem('arcRaidersConfig');
        if (savedConfig) {
          try {
            const config = JSON.parse(savedConfig);
            setSelectedQuests(config.selectedQuests || []);
          } catch (e) {
            console.error('Error loading saved config:', e);
          }
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
    if (!isLoading && questsData) {
      const savedConfig = localStorage.getItem('arcRaidersConfig');
      const config = savedConfig ? JSON.parse(savedConfig) : {};
      config.selectedQuests = selectedQuests;
      localStorage.setItem('arcRaidersConfig', JSON.stringify(config));
    }
  }, [selectedQuests, isLoading, questsData]);
  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  // Generate Mermaid diagram
  const mermaidCode = useMemo(() => {
    if (!questsData) return '';
    const { completed, questGraph } = getCompletedQuests(questsData, selectedQuests);
    const unlockedSet = new Set(selectedQuests);
    // Trader colors matching maps.js
    const traderColors = {
      'Shani': '#e74c3c',      // Brighter red
      'Tian Wen': '#16a085',   // Teal (distinct from Lance)
      'Lance': '#3498db',      // True blue
      'Celeste': '#f39c12',    // Orange (better contrast than yellow)
      'Apollo': '#9b59b6'      // Purple
    };
    // Generate unique node IDs
    const questToId = {};
    let idCounter = 0;
    // First pass: Create IDs for all quests
    for (const trader in questsData) {
      const quests = questsData[trader].quests;
      for (const questData of quests) {
        questToId[questData.quest] = `q${idCounter++}`;
      }
    }
    let diagram = 'graph TD\n\n';
    // Second pass: Define nodes with trader colors and styling
    for (const trader in questsData) {
      const quests = questsData[trader].quests;
      const color = traderColors[trader] || '#95a5a6';
      
      for (const questData of quests) {
        const questName = questData.quest;
        const questId = questToId[questName];
        
        // Escape special characters
        const escapedName = questName.replace(/"/g, '#quot;');
        const escapedTrader = trader.replace(/"/g, '#quot;');
        
        // Add node with trader info
        diagram += `    ${questId}["${escapedName}<br/><i>(${escapedTrader})</i>"]\n`;
        
        // Determine stroke styling based on quest state
        let strokeColor = '#333';
        let strokeWidth = '2px';
        
        if (completed.has(questName)) {
          strokeColor = '#10b981'; // Green for completed
          strokeWidth = '8px';
        } else if (unlockedSet.has(questName)) {
          strokeColor = '#f59e0b'; // Orange for active
          strokeWidth = '8px';
        }
        
        diagram += `    style ${questId} fill:${color},stroke:${strokeColor},stroke-width:${strokeWidth},color:#fff\n`;
      }
    }
    diagram += '\n';
    // Third pass: Create connections
    for (const trader in questsData) {
      const quests = questsData[trader].quests;
      
      for (const questData of quests) {
        const questName = questData.quest;
        const questId = questToId[questName];
        
        if (questData.nextQuests && questData.nextQuests.length > 0) {
          for (const nextQuest of questData.nextQuests) {
            const nextQuestId = questToId[nextQuest];
            if (nextQuestId) {
              diagram += `    ${questId} --> ${nextQuestId}\n`;
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
    // Find all node elements in the rendered SVG
    const nodes = mermaidContainerRef.current.querySelectorAll('.node');
    
    nodes.forEach(node => {
      const textElement = node.querySelector('span');
      if (!textElement) return;
      
      // Get the quest name from the node text (before the trader name in parentheses)
      const fullText = textElement.textContent;
      const questName = fullText.split('(')[0].trim();
      
      // Remove existing classes
      node.classList.remove('completed', 'active');
      
      // Apply appropriate class
      if (completed.has(questName)) {
        node.classList.add('completed');
      } else if (unlockedSet.has(questName)) {
        node.classList.add('active');
      }
    });
  }, [questsData, selectedQuests]);
  // Render Mermaid diagram
  useEffect(() => {
    if (mermaidCode && mermaidContainerRef.current && !isLoading) {
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
        flowchart: {
          useMaxWidth: false,
          htmlLabels: true,
          curve: 'basis'
        }
      });
      const renderDiagram = async () => {
        try {
          // Clear previous diagram to force re-render
          mermaidContainerRef.current.innerHTML = '';
          // Use unique ID to avoid conflicts
          const uniqueId = `mermaid-diagram-${mermaidIdRef.current++}`;
          const { svg } = await mermaid.render(uniqueId, mermaidCode);
          if (mermaidContainerRef.current) { // Check again in case component unmounted
            mermaidContainerRef.current.innerHTML = svg;
            // Apply custom node classes for completed/active quests
            applyNodeClasses();
            
            // Center the diagram horizontally on first load
            if (!hasInitiallycentered.current && chartWrapperRef.current) {
              // Wait a bit for the SVG to be fully rendered
              setTimeout(() => {
                if (mermaidContainerRef.current && chartWrapperRef.current) {
                  const svgElement = mermaidContainerRef.current.querySelector('svg');
                  if (svgElement) {
                    const wrapperRect = chartWrapperRef.current.getBoundingClientRect();
                    const svgRect = svgElement.getBoundingClientRect();
                    
                    // Calculate center offset (horizontal only)
                    const centerX = (wrapperRect.width - svgRect.width) / 2;
                    
                    setPanOffset({ x: centerX, y: 0 });
                    hasInitiallycentered.current = true;
                  }
                }
              }, 100);
            }
          }
        } catch (error) {
          console.error('Error rendering diagram:', error);
          if (mermaidContainerRef.current) {
            mermaidContainerRef.current.innerHTML = '<p style="color: var(--text-secondary); padding: 20px;">Error rendering quest tree. Please try refreshing the page.</p>';
          }
        }
      };
      renderDiagram();
    }
  }, [mermaidCode, theme, isLoading]);
  // Apply zoom and pan
  useEffect(() => {
    if (mermaidContainerRef.current) {
      mermaidContainerRef.current.style.transform = 
        `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`;
    }
  }, [zoomLevel, panOffset]);
  // Mouse panning handlers
  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left mouse button
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
  // Touch panning and pinch-zoom handlers
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
      // Single touch - panning
      setIsPanning(true);
      setPanStart({ 
        x: e.touches[0].clientX - panOffset.x, 
        y: e.touches[0].clientY - panOffset.y 
      });
    } else if (e.touches.length === 2) {
      // Two touches - pinch zoom
      e.preventDefault();
      setIsPanning(false);
      lastTouchDistance.current = getTouchDistance(e.touches[0], e.touches[1]);
      lastTouchCenter.current = getTouchCenter(e.touches[0], e.touches[1]);
    }
  };
  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isPanning) {
      // Single touch panning
      setPanOffset({
        x: e.touches[0].clientX - panStart.x,
        y: e.touches[0].clientY - panStart.y
      });
    } else if (e.touches.length === 2) {
      // Pinch zoom
      e.preventDefault();
      const newDistance = getTouchDistance(e.touches[0], e.touches[1]);
      const newCenter = getTouchCenter(e.touches[0], e.touches[1]);
      
      if (lastTouchDistance.current && lastTouchCenter.current) {
        // Calculate zoom change
        const distanceRatio = newDistance / lastTouchDistance.current;
        const newZoom = Math.min(Math.max(0.3, zoomLevelRef.current * distanceRatio), 3);
        
        // Calculate pan adjustment to zoom towards touch center
        const centerDeltaX = newCenter.x - lastTouchCenter.current.x;
        const centerDeltaY = newCenter.y - lastTouchCenter.current.y;
        
        setZoomLevel(newZoom);
        setPanOffset(prev => ({
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
  // Wheel zoom handler
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(0.3, zoomLevelRef.current + delta), 3);
    setZoomLevel(newZoom);
  };
  // Add event listeners for panning and zooming
  useEffect(() => {
    const wrapper = chartWrapperRef.current;
    if (wrapper) {
      wrapper.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        wrapper.removeEventListener('wheel', handleWheel);
      };
    }
  }, [isLoading]);
  if (isLoading) {
    return (
      <div className="app-container">
        <div className="header">
          <div className="header-left">
            <h1>🗺️ ARC Raiders Tools - Quest Tree</h1>
          </div>
        </div>
        <div style={{textAlign: 'center', padding: '50px', color: 'var(--text-secondary)'}}>
          Loading quest data...
        </div>
      </div>
    );
  }
  return (
    <div className="app-container">
      <div className="header">
        <div className="header-left">
          <h1>
            🗺️ ARC Raiders Tools: Quest Tree
          </h1>
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
          <button 
            className="theme-toggle" 
            onClick={() => setShowModal(true)}
            title="Manage Quests"
          >
            📋
          </button>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      <div className="quest-map-container">
        <div 
          className={`chart-wrapper ${isPanning ? 'panning' : ''}`} 
          ref={chartWrapperRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="mermaid-container" ref={mermaidContainerRef}>
            {/* Mermaid diagram will be rendered here */}
          </div>
          <div className="legend">
            <div className="legend-title">Traders</div>
            <div className="legend-item">
              <div className="legend-box shani"></div>
              <span style={{ color: 'var(--text-primary)' }}>Shani</span>
            </div>
            <div className="legend-item">
              <div className="legend-box tianwen"></div>
              <span style={{ color: 'var(--text-primary)' }}>Tian Wen</span>
            </div>
            <div className="legend-item">
              <div className="legend-box lance"></div>
              <span style={{ color: 'var(--text-primary)' }}>Lance</span>
            </div>
            <div className="legend-item">
              <div className="legend-box celeste"></div>
              <span style={{ color: 'var(--text-primary)' }}>Celeste</span>
            </div>
            <div className="legend-item">
              <div className="legend-box apollo"></div>
              <span style={{ color: 'var(--text-primary)' }}>Apollo</span>
            </div>
            
            <div className="legend-separator"></div>
            <div className="legend-title">Status</div>
            <div className="legend-item">
              <div className="legend-outline completed"></div>
              <span style={{ color: 'var(--text-primary)' }}>Completed</span>
            </div>
            <div className="legend-item">
              <div className="legend-outline active"></div>
              <span style={{ color: 'var(--text-primary)' }}>Active</span>
            </div>
          </div>
        </div>
      </div>
      {/* Modal */}
      {showModal && <div className="modal-backdrop" onClick={() => setShowModal(false)} />}
      
      {showModal && (
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <QuestsModal 
            selectedQuests={selectedQuests}
            setSelectedQuests={setSelectedQuests}
            onClose={() => setShowModal(false)}
            questsData={questsData}
          />
        </div>
      )}
    </div>
  );
}
ReactDOM.render(<App />, document.getElementById("root"));