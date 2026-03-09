function createMermaidUnlockDiagram(traderQuests) {
  let mermaid = 'graph TD\n';
  
  // Create a map to store quest to ID mapping (for clean node IDs)
  const questToId = {};
  let idCounter = 0;
  
  // First pass: Create IDs for all quests
  for (const trader in traderQuests) {
    const quests = traderQuests[trader].quests;
    for (const questData of quests) {
      const questName = questData.quest;
      questToId[questName] = `q${idCounter++}`;
    }
  }
  
  // Second pass: Define nodes with trader grouping
  const traderColors = {
    'Shani': '#ff6b6b',
    'Tian Wen': '#4ecdc4',
    'Lance': '#45b7d1',
    'Celeste': '#f9ca24',
    'Apollo': '#6c5ce7'
  };
  
  for (const trader in traderQuests) {
    const quests = traderQuests[trader].quests;
    const color = traderColors[trader] || '#95a5a6';
    
    for (const questData of quests) {
      const questName = questData.quest;
      const questId = questToId[questName];
      
      // Add node with styling
      mermaid += `    ${questId}["${questName}<br/><i>(${trader})</i>"]\n`;
      mermaid += `    style ${questId} fill:${color},stroke:#333,stroke-width:2px\n`;
    }
  }
  
  mermaid += '\n';
  
  // Third pass: Create connections
  for (const trader in traderQuests) {
    const quests = traderQuests[trader].quests;
    
    for (const questData of quests) {
      const questName = questData.quest;
      const questId = questToId[questName];
      
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

// Alternative: Create separate diagrams per trader
function createMermaidPerTrader(traderQuests) {
  const diagrams = {};
  
  for (const trader in traderQuests) {
    let mermaid = `graph TD\n`;
    const quests = traderQuests[trader].quests;
    
    // Create quest to ID mapping for this trader
    const questToId = {};
    quests.forEach((questData, index) => {
      questToId[questData.quest] = `q${index}`;
    });
    
    // Define nodes
    for (const questData of quests) {
      const questName = questData.quest;
      const questId = questToId[questName];
      mermaid += `    ${questId}["${questName}"]\n`;
    }
    
    mermaid += '\n';
    
    // Create connections
    for (const questData of quests) {
      const questName = questData.quest;
      const questId = questToId[questName];
      
      if (questData.nextQuests && questData.nextQuests.length > 0) {
        for (const nextQuest of questData.nextQuests) {
          const nextQuestId = questToId[nextQuest];
          if (nextQuestId) {
            mermaid += `    ${questId} --> ${nextQuestId}\n`;
          }
        }
      }
    }
    
    diagrams[trader] = mermaid;
  }
  
  return diagrams;
}

// Usage
import fs from 'fs';

// Read the reformatted data
const data = JSON.parse(fs.readFileSync('reformat.json', 'utf8'));

// Create single combined diagram
const combinedDiagram = createMermaidUnlockDiagram(data);
fs.writeFileSync('quest-unlocks.mmd', combinedDiagram);
console.log('✓ Combined diagram saved to quest-unlocks.mmd');

// Create per-trader diagrams
const perTraderDiagrams = createMermaidPerTrader(data);
for (const trader in perTraderDiagrams) {
  const filename = `quest-unlocks-${trader.toLowerCase().replace(/[^a-z0-9]/g, '-')}.mmd`;
  fs.writeFileSync(filename, perTraderDiagrams[trader]);
  console.log(`✓ ${trader} diagram saved to ${filename}`);
}

// Also create a markdown file with all diagrams embedded
let markdown = '# Quest Unlock Diagrams\n\n';
markdown += '## All Quests Combined\n\n';
markdown += '```mermaid\n' + combinedDiagram + '```\n\n';

for (const trader in perTraderDiagrams) {
  markdown += `## ${trader} Quests\n\n`;
  markdown += '```mermaid\n' + perTraderDiagrams[trader] + '```\n\n';
}

fs.writeFileSync('quest-unlocks.md', markdown);
console.log('✓ Markdown file with embedded diagrams saved to quest-unlocks.md');