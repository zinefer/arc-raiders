import fs from 'fs/promises';
import { JSDOM } from 'jsdom';
import chalk from 'chalk';

export const DELAY_BETWEEN_REQUESTS = 1500; // 1.5 seconds between requests
export const BASE_URL = 'https://arcraiders.wiki';

/**
 * Fetch and parse HTML from a URL
 */
export async function fetchHTML(url) {
  console.log(chalk.gray(`  Fetching: ${url}`));
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  
  const html = await response.text();
  const dom = new JSDOM(html);
  
  // Add delay after fetch
  await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
  
  return dom.window.document;
}

/**
 * Extract item links from wikitable rows
 */
export function extractItemLinks(document, debug = false) {
  const links = new Set();
  const sections = document.querySelectorAll('[id^="citizen-section-"]');
  
  if (debug) {
    console.log(chalk.yellow(`    DEBUG: Found ${sections.length} sections with id starting with "citizen-section-"`));
  }
  
  sections.forEach((section, sectionIndex) => {
    const tables = section.querySelectorAll('table.wikitable');
    
    if (debug) {
      console.log(chalk.yellow(`    DEBUG: Section ${sectionIndex} has ${tables.length} tables with class "wikitable"`));
    }
    
    tables.forEach((table, tableIndex) => {
      const rows = table.querySelectorAll('tr');
      
      if (debug) {
        console.log(chalk.yellow(`    DEBUG: Table ${tableIndex} has ${rows.length} rows`));
      }
      
      rows.forEach((row, rowIndex) => {
        // Skip rows with header cells
        if (row.querySelector('th')) {
          if (debug) {
            console.log(chalk.yellow(`    DEBUG: Row ${rowIndex} skipped (has <th> header)`));
          }
          return;
        }
        
        // Get the first cell
        const firstCell = row.querySelector('td');
        if (!firstCell) {
          if (debug) {
            console.log(chalk.yellow(`    DEBUG: Row ${rowIndex} has no <td> cells`));
          }
          return;
        }
        
        // Find links in the first cell
        const link = firstCell.querySelector('a');
        if (link) {
          const href = link.getAttribute('href');
          if (debug) {
            console.log(chalk.yellow(`    DEBUG: Row ${rowIndex} link href: ${href}`));
          }
          if (href && href.startsWith('/wiki/')) {
            links.add(BASE_URL + href);
            if (debug) {
              console.log(chalk.green(`    DEBUG: ✓ Added link: ${BASE_URL + href}`));
            }
          }
        } else {
          if (debug) {
            console.log(chalk.yellow(`    DEBUG: Row ${rowIndex} first cell has no <a> link`));
          }
        }
      });
    });
  });
  
  return Array.from(links);
}

/**
 * Parse component strings from table cells
 * Example: "6x Rubber Parts + 6x Plastic Parts"
 */
export function parseComponents(cellContent) {
  const components = {};
  
  // Get all links (component names) and their quantities
  const links = cellContent.querySelectorAll('a');
  
  links.forEach(link => {
    const componentName = link.textContent.trim();
    
    // Look for quantity before the link in the preceding text node
    // Pattern: "6x <a>Component</a>"
    
    // Find the text node immediately before this link
    let prevNode = link.previousSibling;
    
    // Walk backwards through siblings to find a text node with a quantity
    while (prevNode) {
      if (prevNode.nodeType === 3) { // Text node
        const text = prevNode.textContent;
        // Look for number followed by 'x' at the end of the text
        const match = text.match(/(\d+)x\s*$/);
        if (match) {
          const quantity = parseInt(match[1], 10);
          components[componentName] = quantity;
          break;
        }
      }
      prevNode = prevNode.previousSibling;
    }
    
    // If no quantity found in siblings, check parent's previous sibling
    if (!components[componentName]) {
      const parent = link.parentElement;
      let prevParentNode = parent.previousSibling;
      
      while (prevParentNode) {
        if (prevParentNode.nodeType === 3) { // Text node
          const text = prevParentNode.textContent;
          const match = text.match(/(\d+)x\s*$/);
          if (match) {
            const quantity = parseInt(match[1], 10);
            components[componentName] = quantity;
            break;
          }
        }
        prevParentNode = prevParentNode.previousSibling;
      }
    }
    
    // Default to 1 if no quantity found
    if (!components[componentName]) {
      components[componentName] = 1;
    }
  });
  
  // If no links found, try to parse the entire text content
  if (Object.keys(components).length === 0) {
    const text = cellContent.textContent;
    const matches = text.matchAll(/(\d+)x\s+([^+\n]+)/g);
    
    for (const match of matches) {
      const quantity = parseInt(match[1], 10);
      const componentName = match[2].trim();
      if (componentName) {
        components[componentName] = quantity;
      }
    }
  }
  
  return components;
}

/**
 * Find recipe table in the document
 * Also looks for "Blueprint" in addition to "Recipe"
 */
export function findRecipeTable(document, itemName, debug = false) {
  const tables = document.querySelectorAll('table.wikitable');
  
  if (debug) {
    console.log(chalk.magenta(`    [DEBUG findRecipeTable] Found ${tables.length} wikitable tables`));
  }
  
  for (let tableIdx = 0; tableIdx < tables.length; tableIdx++) {
    const table = tables[tableIdx];
    
    if (debug) {
      console.log(chalk.magenta(`    [DEBUG findRecipeTable] Checking table ${tableIdx}`));
    }
    
    const headers = table.querySelectorAll('th, td b, td');
    let hasRecipeOrBlueprint = false;
    
    for (const header of headers) {
      const text = header.textContent;
      if (text.includes('Recipe') || text.includes('Blueprint')) {
        hasRecipeOrBlueprint = true;
        break;
      }
    }
    
    if (debug) {
      console.log(chalk.magenta(`    [DEBUG findRecipeTable]   Has Recipe/Blueprint: ${hasRecipeOrBlueprint}`));
    }
    
    if (!hasRecipeOrBlueprint) continue;
    
    // Sanity check: verify this table produces the item we're looking for
    // Find the "Craft" column by looking at the header row
    if (itemName) {
      const rows = table.querySelectorAll('tr');
      
      if (debug) {
        console.log(chalk.magenta(`    [DEBUG findRecipeTable]   Rows in table: ${rows.length}`));
      }
      
      if (rows.length < 2) continue;
      
      // Find which column index contains "Craft"
      const headerRow = rows[0];
      const headerCells = headerRow.querySelectorAll('th, td');
      let craftColumnIndex = -1;
      
      if (debug) {
        const headerTexts = Array.from(headerCells).map(c => c.textContent.trim());
        console.log(chalk.magenta(`    [DEBUG findRecipeTable]   Headers: ${JSON.stringify(headerTexts)}`));
      }
      
      for (let i = 0; i < headerCells.length; i++) {
        if (headerCells[i].textContent.trim() === 'Craft') {
          craftColumnIndex = i;
          break;
        }
      }
      
      // If no "Craft" column found, fall back to checking last column
      if (craftColumnIndex === -1) {
        craftColumnIndex = headerCells.length - 1;
      }
      
      if (debug) {
        console.log(chalk.magenta(`    [DEBUG findRecipeTable]   Craft column index: ${craftColumnIndex}`));
      }
      
      // Check if item name appears in the Craft column
      let foundItemInOutput = false;
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');
        
        if (cells.length > craftColumnIndex) {
          const craftCell = cells[craftColumnIndex];
          const craftCellText = craftCell.textContent;
          
          // Normalize both strings for comparison (remove extra spaces, case-insensitive)
          const normalizedItemName = itemName.toLowerCase().trim();
          const normalizedCellText = craftCellText.toLowerCase().trim();
          
          if (debug) {
            console.log(chalk.magenta(`    [DEBUG findRecipeTable]   Row ${i} craft cell: "${craftCellText.trim()}"`));
            console.log(chalk.magenta(`    [DEBUG findRecipeTable]   Looking for: "${itemName}"`));
            console.log(chalk.magenta(`    [DEBUG findRecipeTable]   Match: ${normalizedCellText.includes(normalizedItemName)}`));
          }
          
          if (normalizedCellText.includes(normalizedItemName)) {
            foundItemInOutput = true;
            break;
          }
        }
      }
      
      if (debug) {
        console.log(chalk.magenta(`    [DEBUG findRecipeTable]   Found item in output: ${foundItemInOutput}`));
      }
      
      // If we found recipe/blueprint header but item name is not in output, skip this table
      if (!foundItemInOutput) {
        continue;
      }
    }
    
    return table;
  }
  
  return null;
}

/**
 * Find repair table in the document
 */
export function findRepairTable(document) {
  const tables = document.querySelectorAll('table.wikitable');
  
  for (const table of tables) {
    const headers = table.querySelectorAll('th, td b, td');
    for (const header of headers) {
      if (header.textContent.includes('Repair')) {
        return table;
      }
    }
  }
  
  return null;
}

/**
 * Extract recipe from equipment item page
 */
export function extractEquipmentRecipe(document, itemName, debug = false) {
  const recipeTable = findRecipeTable(document, itemName, debug);
  
  if (!recipeTable) {
    return null;
  }
  
  const rows = recipeTable.querySelectorAll('tr');
  
  // Skip header row, process data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.querySelectorAll('td');
    
    if (cells.length >= 3) {
      // First cell contains components
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
 * Extract repair costs from equipment item page
 */
export function extractEquipmentRepairs(document) {
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
 * Write JSON file
 */
export async function writeJSON(filename, data) {
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(filename, json, 'utf-8');
}

/**
 * Get item name from URL
 */
export function getItemNameFromURL(url) {
  const parts = url.split('/');
  const lastPart = parts[parts.length - 1];
  // Decode URL-encoded characters (like %27 -> ') and replace underscores with spaces
  return decodeURIComponent(lastPart).replace(/_/g, ' ');
}
