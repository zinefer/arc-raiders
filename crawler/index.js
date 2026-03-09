#!/usr/bin/env node

import { crawlEquipment } from './src/equipment.js';
import { crawlWeapons } from './src/weapons.js';
import { crawlWeaponModifications } from './src/weapon_modifications.js';
import { crawlLoot } from './src/loot.js';
import { crawlQuests } from './src/quests.js';
import { writeJSON } from './src/utils.js';
import chalk from 'chalk';
import ora from 'ora';

const OUTPUT_DIR = '../www/';
const DELAY_BETWEEN_CATEGORIES = 2000; // 2 seconds between major categories

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    debug: false,
    help: false,
    crawler: null // null means run all crawlers
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--debug') {
      options.debug = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (!arg.startsWith('--')) {
      // Any non-flag argument is treated as the crawler name
      options.crawler = arg;
    }
  }

  return options;
}

function showHelp() {
  console.log(chalk.blue.bold('\n🎮 Arc Raiders WIKI Crawler\n'));
  console.log(chalk.white('Usage:'), 'node index.js [options] [crawler]\n');
  console.log(chalk.white('Options:'));
  console.log('  --debug          Enable debug output');
  console.log('  --help, -h       Show this help message\n');
  console.log(chalk.white('Crawlers:'));
  console.log('  equipment        Crawl equipment only');
  console.log('  weapons          Crawl weapons only');
  console.log('  modifications    Crawl weapon modifications only');
  console.log('  loot             Crawl loot only');
  console.log('  quests           Crawl quests only');
  console.log('  (none)           Run all crawlers (default)\n');
  console.log(chalk.white('Examples:'));
  console.log('  node index.js                    # Run all crawlers');
  console.log('  node index.js equipment          # Run equipment crawler only');
  console.log('  node index.js --debug weapons    # Run weapons crawler with debug output');
  console.log('  node index.js loot               # Run loot crawler only');
  console.log('  node index.js quests             # Run quest crawler only\n');
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (options.debug) {
    console.log(chalk.yellow('Debug mode enabled'));
    console.log(chalk.gray('Options:'), options, '\n');
  }
  console.log(chalk.blue.bold('\n🎮 Arc Raiders WIKI Crawler\n'));
  console.log(chalk.gray('This crawler will extract crafting recipes and repair costs from the Arc Raiders WIKI.'));
  console.log(chalk.gray('Progress will be displayed, and you may be asked about ambiguities.\n'));

  const validCrawlers = ['equipment', 'weapons', 'modifications', 'loot', 'quests'];
  const shouldRun = (crawler) => !options.crawler || options.crawler === crawler;

  // Validate crawler name if provided
  if (options.crawler && !validCrawlers.includes(options.crawler)) {
    console.error(chalk.red(`\n❌ Invalid crawler: ${options.crawler}`));
    console.error(chalk.gray(`Valid crawlers: ${validCrawlers.join(', ')}\n`));
    process.exit(1);
  }

  try {
    let totalItems = 0;

    // Crawl Equipment
    if (shouldRun('equipment')) {
      const equipmentSpinner = ora('Starting equipment crawl...').start();
      const equipment = await crawlEquipment(equipmentSpinner, options.debug);
      equipmentSpinner.succeed(chalk.green(`Equipment crawl complete: ${equipment.length} items found`));
      
      await writeJSON(`${OUTPUT_DIR}equipment.json`, equipment);
      console.log(chalk.gray(`✓ Saved to equipment.json\n`));
      totalItems += equipment.length;

      if (options.debug) {
        console.log(chalk.gray('Equipment sample:'), equipment.slice(0, 2), '\n');
      }

      // Wait between categories if more crawlers will run
      if (shouldRun('weapons') || shouldRun('modifications') || shouldRun('loot') || shouldRun('quests')) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CATEGORIES));
      }
    }

    // Crawl Weapons
    if (shouldRun('weapons')) {
      const weaponsSpinner = ora('Starting weapons crawl...').start();
      const weapons = await crawlWeapons(weaponsSpinner, options.debug);
      weaponsSpinner.succeed(chalk.green(`Weapons crawl complete: ${weapons.length} items found`));
      
      await writeJSON(`${OUTPUT_DIR}weapons.json`, weapons);
      console.log(chalk.gray(`✓ Saved to weapons.json\n`));
      totalItems += weapons.length;

      if (options.debug) {
        console.log(chalk.gray('Weapons sample:'), weapons.slice(0, 2), '\n');
      }

      // Wait between categories if more crawlers will run
      if (shouldRun('modifications') || shouldRun('loot') || shouldRun('quests')) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CATEGORIES));
      }
    }

    // Crawl Weapon Modifications
    if (shouldRun('modifications')) {
      const modsSpinner = ora('Starting weapon modifications crawl...').start();
      const weaponMods = await crawlWeaponModifications(modsSpinner, options.debug);
      modsSpinner.succeed(chalk.green(`Weapon modifications crawl complete: ${weaponMods.length} items found`));
      
      await writeJSON(`${OUTPUT_DIR}weapon_modifications.json`, weaponMods);
      console.log(chalk.gray(`✓ Saved to weapon_modifications.json\n`));
      totalItems += weaponMods.length;

      if (options.debug) {
        console.log(chalk.gray('Modifications sample:'), weaponMods.slice(0, 2), '\n');
      }

      // Wait between categories if more crawlers will run
      if (shouldRun('loot') || shouldRun('quests')) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CATEGORIES));
      }
    }

    // Crawl Loot
    if (shouldRun('loot')) {
      const lootSpinner = ora('Starting loot crawl...').start();
      const loot = await crawlLoot(lootSpinner, options.debug);
      lootSpinner.succeed(chalk.green(`Loot crawl complete: ${loot.length} items found`));
      
      await writeJSON(`${OUTPUT_DIR}loot.json`, loot);
      console.log(chalk.gray(`✓ Saved to loot.json\n`));
      totalItems += loot.length;

      if (options.debug) {
        console.log(chalk.gray('Loot sample:'), loot.slice(0, 2), '\n');
      }

      // Wait between categories if more crawlers will run
      if (shouldRun('quests')) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CATEGORIES));
      }
    }

    // Crawl Quests
    if (shouldRun('quests')) {
      const questsSpinner = ora('Starting quest crawl...').start();
      const quests = await crawlQuests(questsSpinner, options.debug);
      const questCount = Object.values(quests).reduce((total, trader) => total + trader.quests.length, 0);
      questsSpinner.succeed(chalk.green(`Quest crawl complete: ${questCount} quests found`));
      
      await writeJSON(`${OUTPUT_DIR}quests.json`, quests);
      console.log(chalk.gray(`✓ Saved to quests.json\n`));
      totalItems += questCount;

      if (options.debug) {
        const firstTrader = Object.keys(quests)[0];
        if (firstTrader) {
          console.log(chalk.gray('Quest sample:'), quests[firstTrader].quests.slice(0, 1), '\n');
        }
      }
    }

    // Update last-update timestamp
    const timestamp = new Date().toISOString();
    await writeJSON(`${OUTPUT_DIR}last-update.json`, { lastUpdate: timestamp });
    console.log(chalk.gray(`✓ Updated last-update timestamp: ${timestamp}\n`));

    console.log(chalk.green.bold('✅ Crawling complete!\n'));
    console.log(chalk.gray(`Total items processed: ${totalItems}`));

  } catch (error) {
    console.error(chalk.red.bold('\n❌ Error during crawling:'));
    console.error(chalk.red(error.message));
    console.error(error.stack);
    process.exit(1);
  }
}

main();
