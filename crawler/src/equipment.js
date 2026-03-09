import { 
  fetchHTML, 
  extractItemLinks, 
  extractEquipmentRecipe, 
  extractEquipmentRepairs,
  getItemNameFromURL,
  DELAY_BETWEEN_REQUESTS
} from './utils.js';
import chalk from 'chalk';
import inquirer from 'inquirer';

const EQUIPMENT_URLS = [
  'https://arcraiders.wiki/wiki/Augments',
  'https://arcraiders.wiki/wiki/Shields',
  'https://arcraiders.wiki/wiki/Healing',
  'https://arcraiders.wiki/wiki/Quick_Use',
  'https://arcraiders.wiki/wiki/Grenades',
  'https://arcraiders.wiki/wiki/Traps',
];

/**
 * Crawl all equipment pages
 */
export async function crawlEquipment(spinner, debug = false) {
  const allItems = [];
  const allItemLinks = new Set();
  
  // Step 1: Collect all item links from equipment category pages
  if (spinner) spinner.text = 'Collecting equipment item links...';
  console.log(chalk.cyan('  Collecting equipment item links...'));
  
  for (const url of EQUIPMENT_URLS) {
    if (debug) console.log(chalk.magenta(`    [DEBUG] Fetching category page: ${url}`));
    
    const document = await fetchHTML(url);
    
    const links = extractItemLinks(document);
    
    console.log(chalk.gray(`    Found ${links.length} items in ${url.split('/').pop()}`));
    
    if (debug && links.length > 0) {
      console.log(chalk.magenta(`    [DEBUG] First item link: ${links[0]}`));
    }
    
    links.forEach(link => allItemLinks.add(link));
  }
  
  console.log(chalk.cyan(`\n  Total unique equipment items: ${allItemLinks.size}`));
  console.log(chalk.cyan('  Fetching item details...\n'));
  
  // Step 2: Fetch details for each item
  let processedCount = 0;
  
  for (const itemUrl of allItemLinks) {
    processedCount++;
    const itemName = getItemNameFromURL(itemUrl);
    
    console.log(chalk.gray(`    [${processedCount}/${allItemLinks.size}] Processing: ${itemName}`));
    
    try {
      if (debug) console.log(chalk.magenta(`      [DEBUG] Fetching: ${itemUrl}`));
      
      const document = await fetchHTML(itemUrl);
      
      const components = extractEquipmentRecipe(document, itemName, debug);
      const repairs = extractEquipmentRepairs(document);
      
      if (debug) {
        console.log(chalk.magenta(`      [DEBUG] Components found:`, Object.keys(components || {}).length));
        console.log(chalk.magenta(`      [DEBUG] Repair levels found:`, repairs.length));
      }
      
      // Check if item is craftable
      if (!components) {
        console.log(chalk.yellow(`      ⚠️  No recipe found for ${itemName} (not craftable)`));
        
        // Stop spinner before prompting
        if (spinner) spinner.stop();
        
        const answer = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'acknowledge',
            message: `Acknowledged - ${itemName} will be added with no components. Continue?`,
            default: true
          }
        ]);
        
        // Restart spinner after prompt
        if (spinner) spinner.start();
        
        if (!answer.acknowledge) {
          throw new Error('User cancelled crawl');
        }
      }
      
      const itemData = {
        item: itemName,
        components: components || {},
        repairs: repairs
      };
      
      allItems.push(itemData);
      console.log(chalk.gray(`      ✓ Added ${itemName}\n`));
      
    } catch (error) {
      console.error(chalk.red(`      ❌ Error processing ${itemName}: ${error.message}`));
      
      // Stop spinner before prompting
      if (spinner) spinner.stop();
      
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: 'Continue with remaining items?',
          default: true
        }
      ]);
      
      // Restart spinner after prompt
      if (spinner) spinner.start();
      
      if (!answer.continue) {
        throw error;
      }
    }
  }
  
  return allItems;
}
