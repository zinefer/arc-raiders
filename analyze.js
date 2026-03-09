function findCompletedQuests(traderQuests, unlockedQuests) {
  // Build the quest graph
  const questGraph = {};
  
  for (const trader in traderQuests) {
    const quests = traderQuests[trader].quests;
    for (const questData of quests) {
      const questName = questData.quest;
      
      questGraph[questName] = {
        trader: trader,
        nextQuests: questData.nextQuests || [],
        prerequisites: []
      };
    }
  }
  
  // Build prerequisites (reverse of nextQuests)
  for (const questName in questGraph) {
    const nextQuests = questGraph[questName].nextQuests;
    for (const nextQuest of nextQuests) {
      if (questGraph[nextQuest]) {
        questGraph[nextQuest].prerequisites.push(questName);
      }
    }
  }
  
  // Find all completed quests
  const completed = new Set();
  const unlockedSet = new Set(unlockedQuests);
  
  // For each unlocked quest, add all its prerequisites to completed set
  for (const unlockedQuest of unlockedQuests) {
    if (!questGraph[unlockedQuest]) {
      console.warn(`Warning: Quest "${unlockedQuest}" not found in database`);
      continue;
    }
    
    // Recursively find all prerequisites
    findAllPrerequisites(unlockedQuest, questGraph, completed);
  }
  
  // Organize by trader
  const completedByTrader = {};
  for (const questName of completed) {
    const trader = questGraph[questName].trader;
    if (!completedByTrader[trader]) {
      completedByTrader[trader] = [];
    }
    completedByTrader[trader].push(questName);
  }
  
  return {
    all: Array.from(completed),
    byTrader: completedByTrader,
    count: completed.size
  };
}

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

function analyzePlayerProgress(traderQuests, unlockedQuests) {
  const completed = findCompletedQuests(traderQuests, unlockedQuests);
  const unlockedSet = new Set(unlockedQuests);
  
  // Count total quests
  let totalQuests = 0;
  const questsByTrader = {};
  
  for (const trader in traderQuests) {
    const quests = traderQuests[trader].quests;
    totalQuests += quests.length;
    questsByTrader[trader] = quests.length;
  }
  
  // Calculate progress
  const progressPercentage = ((completed.count / totalQuests) * 100).toFixed(1);
  
  return {
    completed: completed,
    unlocked: {
      all: unlockedQuests,
      count: unlockedQuests.length
    },
    total: totalQuests,
    progressPercentage: progressPercentage,
    breakdown: calculateTraderBreakdown(traderQuests, completed.byTrader, unlockedSet)
  };
}

function calculateTraderBreakdown(traderQuests, completedByTrader, unlockedSet) {
  const breakdown = {};
  
  for (const trader in traderQuests) {
    const allQuests = traderQuests[trader].quests;
    const completedQuests = completedByTrader[trader] || [];
    const unlockedQuests = allQuests.filter(q => unlockedSet.has(q.quest));
    
    const total = allQuests.length;
    const completed = completedQuests.length;
    const unlocked = unlockedQuests.length;
    const locked = total - completed - unlocked;
    
    breakdown[trader] = {
      total: total,
      completed: completed,
      unlocked: unlocked,
      locked: locked,
      completedPercentage: ((completed / total) * 100).toFixed(1)
    };
  }
  
  return breakdown;
}

function visualizePlayerProgress(traderQuests, unlockedQuests) {
  const analysis = analyzePlayerProgress(traderQuests, unlockedQuests);
  
  console.log('=== PLAYER QUEST PROGRESS ===\n');
  console.log(`Overall Progress: ${analysis.completed.count}/${analysis.total} quests completed (${analysis.progressPercentage}%)`);
  console.log(`Unlocked (not yet completed): ${analysis.unlocked.count} quests\n`);
  
  console.log('=== COMPLETED QUESTS ===\n');
  for (const trader in analysis.completed.byTrader) {
    const quests = analysis.completed.byTrader[trader];
    console.log(`${trader} (${quests.length} completed):`);
    quests.forEach(quest => console.log(`  ✅ ${quest}`));
    console.log();
  }
  
  console.log('=== UNLOCKED BUT NOT COMPLETED ===\n');
  for (const quest of analysis.unlocked.all) {
    console.log(`  🔓 ${quest}`);
  }
  console.log();
  
  console.log('=== PROGRESS BY TRADER ===\n');
  for (const trader in analysis.breakdown) {
    const stats = analysis.breakdown[trader];
    console.log(`${trader}:`);
    console.log(`  Total: ${stats.total}`);
    console.log(`  ✅ Completed: ${stats.completed} (${stats.completedPercentage}%)`);
    console.log(`  🔓 Unlocked: ${stats.unlocked}`);
    console.log(`  🔒 Locked: ${stats.locked}`);
    console.log();
  }
  
  return analysis;
}

function createProgressMermaidDiagram(traderQuests, unlockedQuests) {
  const completed = findCompletedQuests(traderQuests, unlockedQuests);
  const completedSet = new Set(completed.all);
  const unlockedSet = new Set(unlockedQuests);
  
  let mermaid = 'graph TD\n';
  
  const questToId = {};
  let idCounter = 0;
  
  // Create IDs
  for (const trader in traderQuests) {
    const quests = traderQuests[trader].quests;
    for (const questData of quests) {
      questToId[questData.quest] = `q${idCounter++}`;
    }
  }
  
  const traderColors = {
    'Shani': '#ff6b6b',
    'Celeste': '#95a5a6',
    'Tian Wen': '#4ecdc4',
    'Apollo': '#45b7d1',
    'Lance': '#f9ca24'
  };
  
  // Define nodes with different styles for completed/unlocked/locked
  for (const trader in traderQuests) {
    const quests = traderQuests[trader].quests;
    const color = traderColors[trader] || '#95a5a6';
    
    for (const questData of quests) {
      const questName = questData.quest;
      const questId = questToId[questName];
      
      if (completedSet.has(questName)) {
        // Completed - green with checkmark
        mermaid += `    ${questId}["✓ ${questName}<br/><i>(${trader})</i>"]\n`;
        mermaid += `    style ${questId} fill:#90EE90,stroke:#006400,stroke-width:3px\n`;
      } else if (unlockedSet.has(questName)) {
        // Unlocked but not completed - gold with star
        mermaid += `    ${questId}["⭐ ${questName}<br/><i>(${trader})</i>"]\n`;
        mermaid += `    style ${questId} fill:#ffd700,stroke:#ff0000,stroke-width:4px\n`;
      } else {
        // Locked - normal color, dashed border
        mermaid += `    ${questId}["${questName}<br/><i>(${trader})</i>"]\n`;
        mermaid += `    style ${questId} fill:${color},stroke:#333,stroke-width:2px,stroke-dasharray: 5 5\n`;
      }
    }
  }
  
  mermaid += '\n';
  
  // Create connections
  for (const trader in traderQuests) {
    const quests = traderQuests[trader].quests;
    for (const questData of quests) {
      const questId = questToId[questData.quest];
      if (questData.nextQuests && questData.nextQuests.length > 0) {
        for (const nextQuest of questData.nextQuests) {
          const nextQuestId = questToId[nextQuest];
          if (nextQuestId) {
            mermaid += `    ${questId} --> ${nextQuestId}\n`;
          }
        }
      }
    }
  }
  
  return mermaid;
}

// Usage
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('reformat.json', 'utf8'));

// Example: User's unlocked quests (not yet completed)
const myUnlockedQuests = [
  "Off The Radar"
];

// Visualize progress
const analysis = visualizePlayerProgress(data, myUnlockedQuests);

// Save detailed analysis
//fs.writeFileSync('player-progress.json', JSON.stringify(analysis, null, 2));
//console.log('✓ Player progress saved to player-progress.json');

// Create progress diagram
const progressDiagram = createProgressMermaidDiagram(data, myUnlockedQuests);
//fs.writeFileSync('player-progress.mmd', progressDiagram);
//console.log('✓ Progress diagram saved to player-progress.mmd');

// Create a simple completion list
const completionList = {
  completed: analysis.completed.all.sort(),
  unlocked: analysis.unlocked.all.sort(),
  summary: {
    totalCompleted: analysis.completed.count,
    totalUnlocked: analysis.unlocked.count,
    totalQuests: analysis.total,
    progressPercentage: analysis.progressPercentage
  }
};

//fs.writeFileSync('completion-list.json', JSON.stringify(completionList, null, 2));
//console.log('✓ Completion list saved to completion-list.json');