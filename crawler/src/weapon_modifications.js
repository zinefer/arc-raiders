import { 
  fetchHTML, 
  extractItemLinks, 
  parseComponents,
  getItemNameFromURL,
  DELAY_BETWEEN_REQUESTS
} from './utils.js';
import chalk from 'chalk';
import inquirer from 'inquirer';

const WEAPON_MODS_URL = 'https://arcraiders.wiki/wiki/Weapon_Modifications';

/**
 * Extract modification recipes from the main table
 */
function extractModificationRecipes(document, debug = false) {
  const modifications = new Map();
  
  // Find all wikitable tables
  const tables = document.querySelectorAll('table.wikitable');
  
  if (debug) {
    console.log(chalk.magenta(`  [DEBUG] Found ${tables.length} tables with class 'wikitable'`));
  }
  
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    
    if (debug) {
      console.log(chalk.magenta(`  [DEBUG] Processing table ${i}`));
    }
    
    // Check if this is a modification table by looking for the headers
    // Try multiple selectors since JSDOM might parse differently than browsers
    let headerRow = table.querySelector('thead tr');
    if (!headerRow) {
      // Try to find first row with th elements
      const rows = table.querySelectorAll('tr');
      for (const row of rows) {
        if (row.querySelectorAll('th').length > 0) {
          headerRow = row;
          break;
        }
      }
    }
    
    if (!headerRow) {
      if (debug) {
        console.log(chalk.magenta(`  [DEBUG]   No header row found in table ${i}`));
      }
      continue;
    }
    
    const headers = Array.from(headerRow.querySelectorAll('th')).map(th => th.textContent.trim());
    
    if (debug) {
      console.log(chalk.magenta(`  [DEBUG]   Headers: ${JSON.stringify(headers)}`));
    }
    
    // Look for tables with "Name", "Required Materials to Craft" columns
    const hasNameColumn = headers.some(h => h === 'Name');
    const hasMaterialsColumn = headers.some(h => h.includes('Required Materials'));
    
    if (debug) {
      console.log(chalk.magenta(`  [DEBUG]   hasNameColumn: ${hasNameColumn}, hasMaterialsColumn: ${hasMaterialsColumn}`));
    }
    
    if (!hasNameColumn || !hasMaterialsColumn) continue;
    
    // Find the column indices
    const nameColumnIndex = headers.findIndex(h => h === 'Name');
    const materialsColumnIndex = headers.findIndex(h => h.includes('Required Materials'));
    
    if (debug) {
      console.log(chalk.magenta(`  [DEBUG]   nameColumnIndex: ${nameColumnIndex}, materialsColumnIndex: ${materialsColumnIndex}`));
    }
    
    // Process each row in tbody, or all tr elements if tbody doesn't exist
    let rows = table.querySelectorAll('tbody tr');
    if (rows.length === 0) {
      // Fallback: get all tr elements and skip the header row
      rows = Array.from(table.querySelectorAll('tr')).filter(row => {
        return row.querySelectorAll('th').length === 0; // Skip rows with th elements
      });
    }
    
    if (debug) {
      console.log(chalk.magenta(`  [DEBUG]   Found ${rows.length} data rows`));
    }
    
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      
      if (cells.length < Math.max(nameColumnIndex, materialsColumnIndex) + 1) continue;
      
      // Get the modification name
      const nameCell = cells[nameColumnIndex];
      const nameLink = nameCell.querySelector('a');
      if (!nameLink) continue;
      
      const modName = nameLink.textContent.trim();
      const modUrl = nameLink.getAttribute('href');
      
      // Get the required materials
      const materialsCell = cells[materialsColumnIndex];
      const materialsCellText = materialsCell.textContent.trim();
      const components = parseComponents(materialsCell);
      
      // Check if materials are unknown or missing
      if (Object.keys(components).length === 0 || materialsCellText === '?' || materialsCellText.includes('?')) {
        if (debug) {
          console.log(chalk.yellow(`  [DEBUG]   ⚠️  ${modName} has unknown/missing materials: "${materialsCellText}"`));
        }
        // Store with empty components to mark as not craftable
        modifications.set(modName, {
          name: modName,
          url: modUrl,
          components: {},
          notCraftable: true
        });
        continue;
      }
      
      modifications.set(modName, {
        name: modName,
        url: modUrl,
        components: components
      });
    }
  }
  
  return modifications;
}

/**
 * Extract compatible weapons from a modification detail page
 */
function extractCompatibleWeapons(document) {
  const compatible = [];
  
  // Look for the infobox in section 0
  const section = document.querySelector('#citizen-section-0, [id="citizen-section-0"]');
  if (!section) return compatible;
  
  const infobox = section.querySelector('table.infobox');
  if (!infobox) return compatible;
  
  // Find the row with "Compatible with:" text
  const rows = infobox.querySelectorAll('tr');
  
  for (const row of rows) {
    const textContent = row.textContent;
    
    if (textContent.includes('Compatible with:')) {
      // Extract all weapon links from this row
      const links = row.querySelectorAll('a');
      
      for (const link of links) {
        const weaponName = link.textContent.trim();
        if (weaponName) {
          compatible.push(weaponName);
        }
      }
      
      break;
    }
  }
  
  return compatible;
}

/**
 * Crawl all weapon modifications
 */
export async function crawlWeaponModifications(spinner, debug = false) {
  const allItems = [];
  
  // Step 1: Fetch main weapon modifications page
  if (spinner) spinner.text = 'Fetching weapon modifications page...';
  console.log(chalk.cyan('  Fetching weapon modifications page...'));
  
  if (debug) console.log(chalk.magenta(`  [DEBUG] Fetching: ${WEAPON_MODS_URL}`));
  
  const mainDocument = await fetchHTML(WEAPON_MODS_URL);
  
  // Step 2: Extract modification recipes from main page
  if (spinner) spinner.text = 'Extracting modification recipes...';
  console.log(chalk.cyan('  Extracting modification recipes...'));
  
  const modifications = extractModificationRecipes(mainDocument, debug);
  
  console.log(chalk.cyan(`\n  Total weapon modifications found: ${modifications.size}`));
  
  // Check for non-craftable items and ask user
  const notCraftableItems = Array.from(modifications.entries())
    .filter(([_, data]) => data.notCraftable)
    .map(([name, _]) => name);
  
  if (notCraftableItems.length > 0) {
    console.log(chalk.yellow(`\n  ⚠️  Found ${notCraftableItems.length} modifications with unknown/missing materials:`));
    notCraftableItems.forEach(name => {
      console.log(chalk.yellow(`    - ${name}`));
    });
    
    // Stop spinner before prompting
    if (spinner) spinner.stop();
    
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: 'Continue crawling anyway? (non-craftable items will be included with empty components)',
        default: true
      }
    ]);
    
    // Restart spinner after prompt
    if (spinner) spinner.start();
    
    if (!answer.continue) {
      console.log(chalk.red('\n  Crawl cancelled by user.'));
      return [];
    }
  }
  
  console.log(chalk.cyan('  Fetching compatible weapons for each modification...\n'));
  
  if (debug && modifications.size > 0) {
    const firstMod = Array.from(modifications.keys())[0];
    console.log(chalk.magenta(`  [DEBUG] First modification: ${firstMod}\n`));
  }
  
  // Step 3: Visit each modification page to get compatible weapons
  let processedCount = 0;
  
  for (const [modName, modData] of modifications) {
    processedCount++;
    
    console.log(chalk.gray(`    [${processedCount}/${modifications.size}] Processing: ${modName}`));
    
    try {
      const modUrl = 'https://arcraiders.wiki' + modData.url;
      
      if (debug) {
        console.log(chalk.magenta(`      [DEBUG] Fetching: ${modUrl}`));
        console.log(chalk.magenta(`      [DEBUG] Components:`, Object.keys(modData.components).length));
      }
      
      const modDocument = await fetchHTML(modUrl);
      
      const compatible = extractCompatibleWeapons(modDocument);
      
      if (debug) {
        console.log(chalk.magenta(`      [DEBUG] Compatible weapons:`, compatible.length));
      }
      
      const modItem = {
        item: modName,
        components: modData.components,
        compatible: compatible
      };
      
      allItems.push(modItem);
      console.log(chalk.gray(`      ✓ Added ${modName} (${compatible.length} compatible weapons)\n`));
      
    } catch (error) {
      console.error(chalk.red(`      ❌ Error processing ${modName}: ${error.message}`));
      
      // Stop spinner before prompting
      if (spinner) spinner.stop();
      
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: 'Continue with remaining modifications?',
          default: true
        }
      ]);
      
      // Restart spinner after prompt
      if (spinner) spinner.start();
      
      if (!answer.continue) {
        throw error;
      }
      
      // Add the mod with what we have (without compatible weapons)
      const modItem = {
        item: modName,
        components: modData.components,
        compatible: []
      };
      
      allItems.push(modItem);
      console.log(chalk.yellow(`      ⚠️  Added ${modName} without compatible weapons data\n`));
    }
  }
  
  return allItems;
}
