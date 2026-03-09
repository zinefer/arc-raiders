import { readFileSync } from "fs";

function convertQuestFormat(inputData) {
  // First pass: Build the structure and create a mapping of quest IDs to names
  const questIdToName = {};
  const traderQuests = {};
  
  // Build ID mappings
  for (const category in inputData) {
    for (const questId in inputData[category]) {
      const quest = inputData[category][questId];
      questIdToName[questId] = quest.name.en;
    }
  }
  
  // Second pass: Convert the data
  for (const category in inputData) {
    for (const questId in inputData[category]) {
      const quest = inputData[category][questId];
      const trader = quest.trader;
      
      // Initialize trader array if it doesn't exist
      if (!traderQuests[trader]) {
        traderQuests[trader] = { quests: [] };
      }
      
      // Build objectives text (with safety check)
      const objectivesText = quest.objectives && quest.objectives.length > 0
        ? quest.objectives.map(obj => obj.en).join('\n')
        : '';
      
      // Build objective items (from requiredItemIds)
      const objectiveItems = {};
      if (quest.requiredItemIds && quest.requiredItemIds.length > 0) {
        quest.requiredItemIds.forEach(item => {
          // Convert itemId to readable name
          const itemName = formatItemName(item.itemId);
          objectiveItems[itemName] = item.quantity;
        });
      }
      
      // Build reward text (with safety check)
      const rewardText = quest.rewardItemIds && quest.rewardItemIds.length > 0
        ? quest.rewardItemIds.map(item => `${item.quantity}x ${formatItemName(item.itemId)}`).join('\n')
        : '';
      
      // Process next quests
      let nextQuests = null;
      if (quest.nextQuestIds && quest.nextQuestIds.length > 0) {
        nextQuests = [];
        for (const nextQuestId of quest.nextQuestIds) {
          if (questIdToName[nextQuestId]) {
            nextQuests.push(questIdToName[nextQuestId]);
          } else {
            console.warn(`Warning: Quest ID "${nextQuestId}" referenced but not found in data`);
          }
        }
      }
      
      // Build the quest object
      const convertedQuest = {
        quest: quest.name.en,
        objective: {
          text: objectivesText,
          items: Object.keys(objectiveItems).length > 0 ? objectiveItems : []
        },
        reward: rewardText
      };
      
      // Add map if it exists in your data
      if (quest.map) {
        convertedQuest.map = quest.map;
      }
      
      // Add nextQuests if they exist
      if (nextQuests && nextQuests.length > 0) {
        convertedQuest.nextQuests = nextQuests;
      }
      
      traderQuests[trader].quests.push(convertedQuest);
    }
  }
  
  return traderQuests;
}

// Helper function to format item IDs into readable names
function formatItemName(itemId) {
  // Replace underscores with spaces and capitalize each word
  return itemId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Usage example:
const inputData = readFileSync('clean.json', 'utf-8');
const jsonData = JSON.parse(inputData);

const result = convertQuestFormat(jsonData);
console.log(JSON.stringify(result, null, 2));