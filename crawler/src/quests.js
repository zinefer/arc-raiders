import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

const QUEST_DATA_PATH = '/mnt/code/github.com/RaidTheory/arcraiders-data/quests/';
const EXISTING_QUESTS_PATH = '../www/quests.json';

/**
 * Read existing trader order from the current quests.json file
 */
async function getExistingTraderOrder(debug = false) {
  try {
    const existingContent = await fs.readFile(EXISTING_QUESTS_PATH, 'utf-8');
    const existingData = JSON.parse(existingContent);
    const existingOrder = Object.keys(existingData);
    
    if (debug) {
      console.log(chalk.magenta(`    [DEBUG] Existing trader order: ${existingOrder.join(', ')}`));
    }
    
    return existingData; // Return full data, not just keys
  } catch (error) {
    if (debug) {
      console.log(chalk.magenta(`    [DEBUG] Could not read existing quests.json (${error.message}), using default order`));
    }
    // Return empty object if file doesn't exist or can't be read
    return {};
  }
}

/**
 * Get existing quest order for a specific trader
 */
function getExistingQuestOrder(existingData, trader, debug = false) {
  if (existingData[trader] && existingData[trader].quests) {
    const questNames = existingData[trader].quests.map(q => q.quest);
    if (debug) {
      console.log(chalk.magenta(`    [DEBUG] Existing quest order for ${trader}: ${questNames.slice(0, 3).join(', ')}...`));
    }
    return questNames;
  }
  return [];
}

/**
 * Sort traders to match existing order, with new traders at the end
 */
function sortTradersByExistingOrder(traderQuests, existingData, debug = false) {
  const existingOrder = Object.keys(existingData);
  const allTraders = Object.keys(traderQuests);
  const sortedTraders = [];
  
  // First, add traders in the existing order
  for (const trader of existingOrder) {
    if (allTraders.includes(trader)) {
      sortedTraders.push(trader);
    }
  }
  
  // Then add any new traders not in the existing order
  for (const trader of allTraders) {
    if (!existingOrder.includes(trader)) {
      sortedTraders.push(trader);
      if (debug) {
        console.log(chalk.magenta(`    [DEBUG] New trader found: ${trader}`));
      }
    }
  }
  
  // Create new object with sorted order and preserve quest order within each trader
  const sortedTraderQuests = {};
  for (const trader of sortedTraders) {
    const existingQuestOrder = getExistingQuestOrder(existingData, trader, debug);
    const newQuests = traderQuests[trader].quests;
    
    // Sort quests to match existing order
    const sortedQuests = [];
    const questByName = {};
    
    // Create lookup for new quests
    newQuests.forEach(quest => {
      questByName[quest.quest] = quest;
    });
    
    // First add quests in existing order
    for (const questName of existingQuestOrder) {
      if (questByName[questName]) {
        sortedQuests.push(questByName[questName]);
        delete questByName[questName]; // Remove so we don't add it again
      }
    }
    
    // Then add any new quests (keep them in whatever order they come from the source data)
    const remainingQuests = Object.values(questByName);
    sortedQuests.push(...remainingQuests);
    
    if (debug && remainingQuests.length > 0) {
      console.log(chalk.magenta(`    [DEBUG] New quests for ${trader}: ${remainingQuests.map(q => q.quest).join(', ')}`));
    }
    
    sortedTraderQuests[trader] = { quests: sortedQuests };
  }
  
  if (debug) {
    console.log(chalk.magenta(`    [DEBUG] Final trader order: ${sortedTraders.join(', ')}`));
  }
  
  return sortedTraderQuests;
}

/**
 * Format item ID into readable name
 * Example: "metal_parts" -> "Metal Parts"
 */
function formatItemName(itemId) {
  return itemId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Read and parse all quest files from the RaidTheory data directory
 */
async function loadQuestFiles(debug = false) {
  if (debug) {
    console.log(chalk.magenta(`    [DEBUG] Reading quest files from: ${QUEST_DATA_PATH}`));
  }

  const files = await fs.readdir(QUEST_DATA_PATH);
  const questFiles = files.filter(file => file.endsWith('.json'));
  
  if (debug) {
    console.log(chalk.magenta(`    [DEBUG] Found ${questFiles.length} quest files`));
  }

  const quests = [];
  
  for (const file of questFiles) {
    try {
      const filePath = path.join(QUEST_DATA_PATH, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const questData = JSON.parse(content);
      
      if (debug) {
        console.log(chalk.magenta(`    [DEBUG] Loaded quest: ${questData.id} - ${questData.name?.en}`));
      }
      
      quests.push(questData);
    } catch (error) {
      console.warn(chalk.yellow(`    [WARNING] Failed to parse ${file}: ${error.message}`));
    }
  }
  
  return quests;
}

/**
 * Convert quest format from RaidTheory to target format
 */
function convertQuestFormat(questData, questIdToName, debug = false) {
  if (debug) {
    console.log(chalk.magenta(`    [DEBUG] Converting quest: ${questData.name?.en}`));
  }

  // Build objectives text
  const objectivesText = questData.objectives && questData.objectives.length > 0
    ? questData.objectives.map(obj => obj.en).join('\n')
    : '';

  // Build objective items (from requiredItemIds)
  const objectiveItems = {};
  if (questData.requiredItemIds && questData.requiredItemIds.length > 0) {
    questData.requiredItemIds.forEach(item => {
      const itemName = formatItemName(item.itemId);
      objectiveItems[itemName] = item.quantity;
    });
  }

  // Build reward text
  const rewardText = questData.rewardItemIds && questData.rewardItemIds.length > 0
    ? questData.rewardItemIds.map(item => `${item.quantity}x ${formatItemName(item.itemId)}`).join('\n')
    : '';

  // Process next quests
  let nextQuests = null;
  if (questData.nextQuestIds && questData.nextQuestIds.length > 0) {
    nextQuests = [];
    for (const nextQuestId of questData.nextQuestIds) {
      if (questIdToName[nextQuestId]) {
        nextQuests.push(questIdToName[nextQuestId]);
      } else {
        if (debug) {
          console.warn(chalk.yellow(`    [WARNING] Quest ID "${nextQuestId}" referenced but not found in data`));
        }
      }
    }
  }

  // Build the quest object
  const convertedQuest = {
    quest: questData.name?.en || 'Unknown Quest',
    objective: {
      text: objectivesText,
      items: Object.keys(objectiveItems).length > 0 ? objectiveItems : []
    },
    reward: rewardText
  };

  // Add nextQuests if they exist
  if (nextQuests && nextQuests.length > 0) {
    convertedQuest.nextQuests = nextQuests;
  }

  // Add map if it exists (some quests might have map data)
  if (questData.map) {
    convertedQuest.map = questData.map;
  }

  return convertedQuest;
}

/**
 * Crawl quest data from RaidTheory files and convert to target format
 */
export async function crawlQuests(spinner, debug = false) {
  if (spinner) spinner.text = 'Reading existing quest data...';
  console.log(chalk.cyan('  Reading existing quest data...'));

  // Step 0: Get existing quest data (includes trader and quest order)
  const existingData = await getExistingTraderOrder(debug);

  if (spinner) spinner.text = 'Loading quest data files...';
  console.log(chalk.cyan('  Loading quest data files...'));

  // Step 1: Load all quest files
  const questsRawData = await loadQuestFiles(debug);
  console.log(chalk.gray(`    Found ${questsRawData.length} quest files`));

  if (spinner) spinner.text = 'Building quest ID mappings...';
  console.log(chalk.cyan('  Building quest ID mappings...'));

  // Step 2: Build quest ID to name mapping
  const questIdToName = {};
  for (const quest of questsRawData) {
    if (quest.id && quest.name?.en) {
      questIdToName[quest.id] = quest.name.en;
    }
  }

  if (debug) {
    console.log(chalk.magenta(`    [DEBUG] Created mappings for ${Object.keys(questIdToName).length} quests`));
  }

  if (spinner) spinner.text = 'Converting quest format...';
  console.log(chalk.cyan('  Converting quest format...'));

  // Step 3: Convert quests and group by trader
  const traderQuests = {};
  const allConvertedQuests = {}; // Keep a flat mapping of quest name to quest object
  let processedCount = 0;

  for (const questData of questsRawData) {
    if (!questData.trader) {
      if (debug) {
        console.warn(chalk.yellow(`    [WARNING] Quest ${questData.id} has no trader, skipping`));
      }
      continue;
    }

    const trader = questData.trader;
    
    // Initialize trader array if it doesn't exist
    if (!traderQuests[trader]) {
      traderQuests[trader] = { quests: [] };
    }

    // Convert quest to target format
    const convertedQuest = convertQuestFormat(questData, questIdToName, debug);
    traderQuests[trader].quests.push(convertedQuest);
    allConvertedQuests[convertedQuest.quest] = convertedQuest;
    processedCount++;

    if (debug && processedCount <= 3) {
      console.log(chalk.magenta(`    [DEBUG] Sample quest:`, JSON.stringify(convertedQuest, null, 2)));
    }
  }

  if (spinner) spinner.text = 'Processing previous quest relationships...';
  console.log(chalk.cyan('  Processing previous quest relationships...'));

  // Step 3.5: Use previousQuestIds to fill in missing nextQuests relationships
  for (const questData of questsRawData) {
    if (!questData.previousQuestIds || questData.previousQuestIds.length === 0) continue;
    
    const currentQuestName = questData.name?.en;
    if (!currentQuestName || !allConvertedQuests[currentQuestName]) continue;
    
    for (const prevQuestId of questData.previousQuestIds) {
      const prevQuestName = questIdToName[prevQuestId];
      if (!prevQuestName || !allConvertedQuests[prevQuestName]) {
        if (debug) {
          console.warn(chalk.yellow(`    [WARNING] Previous quest ID "${prevQuestId}" referenced but not found`));
        }
        continue;
      }
      
      // Add current quest to previous quest's nextQuests if not already there
      const prevQuest = allConvertedQuests[prevQuestName];
      if (!prevQuest.nextQuests) {
        prevQuest.nextQuests = [];
      }
      
      if (!prevQuest.nextQuests.includes(currentQuestName)) {
        prevQuest.nextQuests.push(currentQuestName);
        if (debug) {
          console.log(chalk.magenta(`    [DEBUG] Added "${currentQuestName}" to nextQuests of "${prevQuestName}"`));
        }
      }
    }
  }

  if (spinner) spinner.text = 'Sorting traders and quests by existing order...';
  console.log(chalk.cyan('  Sorting traders and quests by existing order...'));

  // Step 4: Sort traders and quests to match existing order
  const sortedTraderQuests = sortTradersByExistingOrder(traderQuests, existingData, debug);

  const traderCount = Object.keys(sortedTraderQuests).length;
  console.log(chalk.gray(`    Processed ${processedCount} quests across ${traderCount} traders`));

  if (debug) {
    const traders = Object.keys(sortedTraderQuests);
    console.log(chalk.magenta(`    [DEBUG] Final traders order: ${traders.join(', ')}`));
    for (const trader of traders) {
      console.log(chalk.magenta(`    [DEBUG] ${trader}: ${sortedTraderQuests[trader].quests.length} quests`));
    }
  }

  console.log(chalk.cyan(`\n  Total quests processed: ${processedCount}\n`));

  return sortedTraderQuests;
}