import { 
  fetchHTML, 
  extractItemLinks, 
  findRecipeTable,
  findRepairTable,
  parseComponents,
  getItemNameFromURL,
  DELAY_BETWEEN_REQUESTS
} from './utils.js';
import chalk from 'chalk';
import inquirer from 'inquirer';

const WEAPONS_URL = 'https://arcraiders.wiki/wiki/Weapons';

/**
 * Extract weapon recipe (initial crafting)
 */
function extractWeaponRecipe(document, weaponName) {
  const recipeTable = findRecipeTable(document, weaponName);
  
  if (!recipeTable) {
    return null;
  }
  
  const rows = recipeTable.querySelectorAll('tr');
  
  // First data row (skip header) contains initial recipe
  if (rows.length > 1) {
    const firstDataRow = rows[1];
    const cells = firstDataRow.querySelectorAll('td');
    
    if (cells.length >= 1) {
      const componentsCell = cells[0];
      const components = parseComponents(componentsCell);
      
      if (Object.keys(components).length > 0) {
        return components;
      }
    }
  }
  
  return null;
}

/**
 * Find the upgrade table for a weapon
 * Looks for tables with "Upgrade Perks" header
 */
function findUpgradeTable(document) {
  const tables = document.querySelectorAll('table.wikitable');
  
  for (const table of tables) {
    const headerRow = table.querySelector('tr');
    if (headerRow) {
      // Normalize whitespace (including &nbsp;) to regular spaces
      const normalizedText = headerRow.textContent.replace(/\s+/g, ' ');
      if (normalizedText.includes('Upgrade Perks') || normalizedText.includes('Upgrade Materials')) {
        return table;
      }
    }
  }
  
  return null;
}

/**
 * Extract weapon upgrades
 */
function extractWeaponUpgrades(document, weaponName) {
  const upgradeTable = findUpgradeTable(document);
  
  if (!upgradeTable) {
    return [];
  }
  
  const upgrades = [];
  const rows = upgradeTable.querySelectorAll('tr');
  
  // Process each upgrade row (skip header)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.querySelectorAll('td');
    
    if (cells.length >= 1) {
      const componentsCell = cells[0];
      
      // The first cell contains both weapon name with tier and components
      // e.g., "Kettle I 8x Metal Parts 10x Plastic Parts"
      // We need to extract only the components part
      
      // Clone the cell to manipulate it
      const clonedCell = componentsCell.cloneNode(true);
      
      // Get the text content to find where components start
      const cellText = clonedCell.textContent;
      
      // Find the first occurrence of a number followed by 'x'
      const componentStartMatch = cellText.match(/(\d+x)/);
      
      if (componentStartMatch) {
        const componentsStartIndex = cellText.indexOf(componentStartMatch[0]);
        
        // Walk through child nodes and remove text before the components
        let currentLength = 0;
        const nodesToRemove = [];
        
        for (const node of clonedCell.childNodes) {
          if (node.nodeType === 3) { // Text node
            const nodeText = node.textContent;
            const nodeEndIndex = currentLength + nodeText.length;
            
            if (nodeEndIndex <= componentsStartIndex) {
              // This entire node is before components, mark for removal
              nodesToRemove.push(node);
            } else if (currentLength < componentsStartIndex) {
              // This node spans the boundary, trim it
              const trimAmount = componentsStartIndex - currentLength;
              node.textContent = nodeText.substring(trimAmount);
            }
            
            currentLength = nodeEndIndex;
          } else {
            // For element nodes, check if they're entirely before the start
            const nodeText = node.textContent;
            const nodeEndIndex = currentLength + nodeText.length;
            
            if (nodeEndIndex <= componentsStartIndex) {
              nodesToRemove.push(node);
            }
            
            currentLength = nodeEndIndex;
          }
        }
        
        // Remove marked nodes
        nodesToRemove.forEach(node => node.remove());
        
        // Now parse components from the cleaned cell
        const components = parseComponents(clonedCell);
        
        if (Object.keys(components).length > 0) {
          upgrades.push({ components });
        }
      }
    }
  }
  
  return upgrades;
}

/**
 * Extract weapon repairs (for all levels)
 */
function extractWeaponRepairs(document) {
  const repairTable = findRepairTable(document);
  
  if (!repairTable) {
    return [];
  }
  
  const repairs = [];
  const rows = repairTable.querySelectorAll('tr');
  
  // Skip header row, process data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.querySelectorAll('td');
    
    if (cells.length >= 2) {
      // Second cell contains repair costs
      const repairCell = cells[1];
      const components = parseComponents(repairCell);
      
      if (Object.keys(components).length > 0) {
        repairs.push({ components });
      }
    }
  }
  
  return repairs;
}

/**
 * Crawl all weapons
 */
export async function crawlWeapons(spinner, debug = false) {
  const allItems = [];
  
  // Step 1: Collect all weapon links from main weapons page
  if (spinner) spinner.text = 'Collecting weapon item links...';
  console.log(chalk.cyan('  Collecting weapon item links...'));
  
  if (debug) console.log(chalk.magenta(`  [DEBUG] Fetching weapons page: ${WEAPONS_URL}`));
  
  const document = await fetchHTML(WEAPONS_URL);
  const weaponLinks = extractItemLinks(document);
  
  console.log(chalk.cyan(`\n  Total unique weapons: ${weaponLinks.length}`));
  console.log(chalk.cyan('  Fetching weapon details...\n'));
  
  if (debug && weaponLinks.length > 0) {
    console.log(chalk.magenta(`  [DEBUG] First weapon link: ${weaponLinks[0]}\n`));
  }
  
  // Step 2: Fetch details for each weapon
  let processedCount = 0;
  
  for (const weaponUrl of weaponLinks) {
    processedCount++;
    const weaponName = getItemNameFromURL(weaponUrl);
    
    console.log(chalk.gray(`    [${processedCount}/${weaponLinks.length}] Processing: ${weaponName}`));
    
    try {
      if (debug) console.log(chalk.magenta(`      [DEBUG] Fetching: ${weaponUrl}`));
      
      const document = await fetchHTML(weaponUrl);
      
      const components = extractWeaponRecipe(document, weaponName);
      const upgrades = extractWeaponUpgrades(document, weaponName);
      const repairs = extractWeaponRepairs(document);
      
      if (debug) {
        console.log(chalk.magenta(`      [DEBUG] Components found:`, Object.keys(components || {}).length));
        console.log(chalk.magenta(`      [DEBUG] Upgrades found:`, upgrades.length));
        console.log(chalk.magenta(`      [DEBUG] Repair levels found:`, repairs.length));
      }
      
      // Check if weapon is craftable
      if (!components) {
        console.log(chalk.yellow(`      ⚠️  No recipe found for ${weaponName} (not craftable)`));
        
        // Stop spinner before prompting
        if (spinner) spinner.stop();
        
        const answer = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'acknowledge',
            message: `Acknowledged - ${weaponName} will be added with no components. Continue?`,
            default: true
          }
        ]);
        
        // Restart spinner after prompt
        if (spinner) spinner.start();
        
        if (!answer.acknowledge) {
          throw new Error('User cancelled crawl');
        }
      }
      
      // Check if weapon has upgrades (most weapons should have them)
      if (upgrades.length === 0) {
        console.log(chalk.yellow(`      ⚠️  No upgrades found for ${weaponName}`));
        
        // Stop spinner before prompting
        if (spinner) spinner.stop();
        
        const answer = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'acknowledge',
            message: `Acknowledged - ${weaponName} will be added with no upgrades. Continue?`,
            default: true
          }
        ]);
        
        // Restart spinner after prompt
        if (spinner) spinner.start();
        
        if (!answer.acknowledge) {
          throw new Error('User cancelled crawl');
        }
      }
      
      const weaponData = {
        item: weaponName,
        components: components || {},
        upgrades: upgrades,
        repairs: repairs
      };
      
      allItems.push(weaponData);
      console.log(chalk.gray(`      ✓ Added ${weaponName} (${upgrades.length} upgrades, ${repairs.length} repair levels)\n`));
      
    } catch (error) {
      console.error(chalk.red(`      ❌ Error processing ${weaponName}: ${error.message}`));
      
      // Stop spinner before prompting
      if (spinner) spinner.stop();
      
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: 'Continue with remaining weapons?',
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
