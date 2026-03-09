import { 
  fetchHTML, 
  extractItemLinks, 
  getItemNameFromURL
} from './utils.js';
import chalk from 'chalk';

const LOOT_URL = 'https://arcraiders.wiki/wiki/Loot';

/**
 * Crawl the loot page and extract all loot items
 */
export async function crawlLoot(spinner, debug = false) {
  const allItems = [];
  
  // Step 1: Fetch the loot page
  if (spinner) spinner.text = 'Collecting loot items...';
  console.log(chalk.cyan('  Collecting loot items...'));
  
  if (debug) console.log(chalk.magenta(`    [DEBUG] Fetching loot page: ${LOOT_URL}`));
  
  const document = await fetchHTML(LOOT_URL);
  
  // Step 2: Extract item links from the loot table
  const links = extractItemLinks(document, debug);
  
  console.log(chalk.gray(`    Found ${links.length} loot items`));
  
  if (debug && links.length > 0) {
    console.log(chalk.magenta(`    [DEBUG] First item link: ${links[0]}`));
  }
  
  // Step 3: Convert links to simple item objects
  for (const itemUrl of links) {
    const itemName = getItemNameFromURL(itemUrl);
    
    if (debug) {
      console.log(chalk.gray(`      Processing: ${itemName}`));
    }
    
    allItems.push({
      item: itemName
    });
  }
  
  console.log(chalk.cyan(`\n  Total loot items collected: ${allItems.length}\n`));
  
  return allItems;
}
