# Arc Raiders WIKI Crawler

This is a Javascript-based web crawler designed to extract and organize information from the Arc Raiders WIKI. The crawler focuses on gathering data about items (equipment and weapons), quests, and crafting recipes, structuring this information into easily accessible JSON formats.

This document provides an overview of the desired output data structures and the sentinel values used to identify relevant sections of the WIKI pages and how to process and extract the necessary information.

The main use case for the data is to assist players in managing their limited inventory space by identifying which items are essential for quests and crafting, and which can be safely recycled.

The crawler will be a CLI tool that can be run in a Node.js environment. It will display it's progress in the console and interactively ask the user about any ambiguities encountered during the crawling process. It will include generous wait times between requests to avoid overloading the WIKI server.

## Output Data Structures

### Equipment Crafting Recipes (equipment.json)

```json
[
    {
      "item": "Item Name",
      "components": {
        "Component 1": quantity,
        "Component 2": quantity,
        ...
      },
      "repairs": {
        "components": {
          "Component 1": quantity,
          "Component 2": quantity,
          ...
        }
      }
    },
    ...
]
```

### Weapon Crafting Recipes (weapons.json)

https://arcraiders.wiki/wiki/Weapons

```json
[
    {
      "item": "Item Name",
      "components": {
        "Component 1": quantity,
        "Component 2": quantity,
        ...
      },
      "upgrades": [
        { // Upgrade to level 2
            "components": {
                "Component 1": quantity,
                "Component 2": quantity,
                ...
            }
        },
        { // Upgrade to level 3
            "components": {
                "Component 1": quantity,
                "Component 2": quantity,
                ...
            }
        }
        ...
      ],
      "repairs": [
        { // Repairs for level 1
            "components": {
                "Component 1": quantity,
                "Component 2": quantity,
                ...
            }
        },
        ...
      ]
    },
    ...
]
```

### Weapon Modification Crafting Recipes (weapon_modifications.json)

```json
[
    {
      "item": "Modification Name",
      "components": {
        "Component 1": quantity,
        "Component 2": quantity,
        ...
      },
      "compatible": [
        "Weapon 1",
        "Weapon 2",
        ...
      ]
    },
    ...
]
```

### Loot

```json
[
    {
      "item": "Loot Name",
    },
    ...
]
```

## Crawling Information

### Equipment

#### URLs

- https://arcraiders.wiki/wiki/Augments
- https://arcraiders.wiki/wiki/Shields
- https://arcraiders.wiki/wiki/Healing
- https://arcraiders.wiki/wiki/Quick_Use
- https://arcraiders.wiki/wiki/Grenades
- https://arcraiders.wiki/wiki/Traps

#### Top level Equipment Sentinels

- Page sections are inside divs with id "citizen-section-{number}".
- Inside each section, we are looking for tables with class "wikitable".
- Each table row that does not contain a header cell (<th>) represents an item.
- Collect all unique item links from the first cell of each of these rows.

#### Item Detail Sentinels

- Page sections are inside divs with id "citizen-section-{number}".
- Inside each section, we are looking for tables with class "wikitable".
- Look for headers with text "Recipe", "Blueprint", or "Repair".
- The crawler finds the "Craft" column header to identify which column contains the crafted item name.
- Recipe tables are validated by checking if the item name appears in the "Craft" column (sanity check to avoid false positives from tables showing recipes where the item is used as an ingredient).
- Example recipe table:
```
<table class="wikitable" style="text-align:center; font-weight: bold;">
    <tbody>
        <tr>
            <td><b>Recipe</b></td>
            <td></td>
            <td><b>Workshop</b></td>
            <td></td>
            <td><b>Craft</b></td>
        </tr>
        <tr>
            <td>
                <b>6x <a href="/wiki/Rubber_Parts" title="Rubber Parts">Rubber Parts</a><br>+<br>6x <a href="/wiki/Plastic_Parts" title="Plastic Parts">Plastic Parts</a></b>
            </td>
            <td><b>→</b></td>
            <td><b>Workbench 1<br>Or<br>Gear Bench 1</b></td>
            <td><b>→</b></td>
            <td><b>1x Looting Mk. 1</b></td>
        </tr>
    </tbody>
</table>
```
- Sometimes an item is not craftable, in which case there will be no recipe table. The crawler will alert the user and add the item to the output with empty components (`components: {}`).
- Sometimes there are duplicate rows in the recipe table. Ignore duplicates.
- Some tables may have additional columns like "Blueprint Locked" after the "Craft" column. The crawler handles this by specifically looking for the "Craft" column header.

- Example repair table:
```
<table class="wikitable" style="text-align:center; font-weight: bold;">
    <tbody>
        <tr>
            <td></td>
            <td><b>Repair Cost</b></td>
            <td>Durability</td>
        </tr>
        <tr>
            <td><b>1x Looting Mk. 1</b></td>
            <td>
                <b>3x <a href="/wiki/Plastic_Parts" title="Plastic Parts">Plastic Parts</a><br>+<br>3x <a href="/wiki/Rubber_Parts" title="Rubber Parts">Rubber Parts</a></b>
            </td>
            <td>+50</td>
        </tr>
    </tbody>
</table>
```

### Weapons

Top level URL: https://arcraiders.wiki/wiki/Weapons

This page contains links to individual weapon items.

- Using the same link collection method as for Equipment, gather all unique weapon item links from the first cell of each row in the weapon tables.

#### Weapon Detail Sentinels

- Weapon recipe table structure is the same as equipment recipe table structure.
- Recipe tables support both "Recipe" and "Blueprint" headers.
- The "Craft" column is located by header name to handle tables with variable column counts.
- Example upgrade table:
```
<table class="wikitable" style="text-align:center; font-weight: bold;">
    <tbody>
        <tr>
            <td><b>Recipe</b></td>
            <td></td>
            <td><b>Workshop</b></td>
            <td></td>
            <td><b>Craft</b></td>
            <td>Upgrade Perks</td>
        </tr>
        <tr>
            <td>
                <b>Kettle I<br>8x <a href="/wiki/Metal_Parts" title="Metal Parts">Metal Parts</a><br>10x <a href="/wiki/Plastic_Parts" title="Plastic Parts">Plastic Parts</a></b>
            </td>
            <td><b>→</b></td>
            <td><b>Gunsmith 1</b></td>
            <td><b>→</b></td>
            <td><b>Kettle II</b></td>
            <td style="text-align:left;">25% Increased Bullet Velocity<br>13% Reduced Reload Time<br>+10 Durability</td>
        </tr>
        <tr>
            <td>
                <b>Kettle II<br>10x <a href="/wiki/Metal_Parts" title="Metal Parts">Metal Parts</a><br>1x <a href="/wiki/Simple_Gun_Parts" title="Simple Gun Parts">Simple Gun Parts</a></b>
            </td>
            <td><b>→</b></td>
            <td><b>Gunsmith 1</b></td>
            <td><b>→</b></td>
            <td><b>Kettle III</b></td>
            <td style="text-align:left;">50% Increased Bullet Velocity<br>26% Reduced Reload Time<br>+20 Durability</td>
        </tr>
        <tr>
            <td>
                <b>Kettle III<br>3x <a href="/wiki/Mechanical_Components" title="Mechanical Components">Mechanical Components</a><br>1x <a href="/wiki/Simple_Gun_Parts" title="Simple Gun Parts">Simple Gun Parts</a></b>
            </td>
            <td><b>→</b></td>
            <td><b>Gunsmith 1</b></td>
            <td><b>→</b></td>
            <td><b>Kettle IV</b></td>
            <td style="text-align:left;">75% Increased Bullet Velocity<br>40% Reduced Reload Time<br>+30 Durability</td>
        </tr>
    </tbody>
</table>
```
- Example repair table:
```
<table class="wikitable" style="text-align:center; font-weight: bold;">
    <tbody>
        <tr>
            <td></td>
            <td>Repair Cost</td>
            <td>Durability</td>
        </tr>
        <tr>
            <td>Kettle I</td>
            <td>3x <a href="/wiki/Metal_Parts" title="Metal Parts">Metal Parts</a><br>2x <a href="/wiki/Rubber_Parts" title="Rubber Parts">Rubber Parts</a></td>
            <td>+50</td>
        </tr>
        <tr>
            <td>Kettle II</td>
            <td>6x <a href="/wiki/Metal_Parts" title="Metal Parts">Metal Parts</a><br>6x <a href="/wiki/Rubber_Parts" title="Rubber Parts">Rubber Parts</a></td>
            <td>+55</td>
        </tr>
        <tr>
            <td>Kettle III</td>
            <td>12x <a href="/wiki/Metal_Parts" title="Metal Parts">Metal Parts</a><br>2x <a href="/wiki/Simple_Gun_Parts" title="Simple Gun Parts">Simple Gun Parts</a></td>
            <td>+60</td>
        </tr>
        <tr>
            <td>Kettle IV</td>
            <td>2x <a href="/wiki/Mechanical_Components" title="Mechanical Components">Mechanical Components</a><br>2x <a href="/wiki/Simple_Gun_Parts" title="Simple Gun Parts">Simple Gun Parts</a></td>
            <td>+65</td>
        </tr>
    </tbody>
</table>
```

#### Weapon Modification Detail Sentinels

Top level URL: https://arcraiders.wiki/wiki/Weapon_Modifications

- The weapon modifications page contains links to individual weapon modification items but the top level url already contains the recipe tables for all modifications. We still need the individual item links for the "compatible" weapons list.
- There are multiple tables on the page
- Example modification table (only one item shown here):
```
<table class="wikitable wikitable--border sortable jquery-tablesorter" style="text-align:center;">
    <thead>
        <tr>
            <th class="headerSort" tabindex="0" role="columnheader button" title="Sort ascending">Name</th>
            <th class="headerSort" tabindex="0" role="columnheader button" title="Sort ascending">Image</th>
            <th class="headerSort" tabindex="0" role="columnheader button" title="Sort ascending">Required Materials to Craft</th>
            <th class="headerSort" tabindex="0" role="columnheader button" title="Sort ascending">Function</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><a href="/wiki/Compensator_I" title="Compensator I">Compensator I</a></td>
            <td><span typeof="mw:File"><a href="/wiki/Compensator_I" title="Compensator I"><img src="/w/images/thumb/5/5f/Compensator_I.png/128px-Compensator_I.png.webp" decoding="async" loading="lazy" width="128" height="128" class="mw-file-element" srcset="/w/images/thumb/5/5f/Compensator_I.png/192px-Compensator_I.png.webp 1.5x, /w/images/thumb/5/5f/Compensator_I.png/256px-Compensator_I.png.webp 2x" data-file-width="512" data-file-height="512"></a></span></td>
            <td>6x <a href="/wiki/Metal_Parts" title="Metal Parts">Metal Parts</a><br>1x <a href="/wiki/Wires" title="Wires">Wires</a></td>
            <td>25% Reduced Per-Shot Dispersion</td>
        </tr>
    </tbody>
    <tfoot></tfoot>
</table>
```
- On the details page for each modification, there is a list of compatible weapons under the "Compatible Weapons" section that can be found inside a div with id "citizen-section-0". Example:
```
<section id="citizen-section-0" class="citizen-section">
    <table class="infobox floatright">
        <tbody>
            <tr class="infobox-image gradient-uncommon">
                <td colspan="2"><span typeof="mw:File"><a href="/wiki/File:Compensator_II.png" class="mw-file-description"><img src="/w/images/0/0a/Compensator_II.png" decoding="async" loading="lazy" width="348" height="348" class="mw-file-element" data-file-width="256" data-file-height="256"></a></span></td>
            </tr>
            <tr class="data-tag icon data-tag-uncommon">
                <td colspan="2"><span typeof="mw:File"><span><img src="/w/images/thumb/4/4b/Mods_Muzzle.png/20px-Mods_Muzzle.png.webp" decoding="async" loading="lazy" width="20" height="20" class="mw-file-element" srcset="/w/images/thumb/4/4b/Mods_Muzzle.png/30px-Mods_Muzzle.png.webp 1.5x, /w/images/thumb/4/4b/Mods_Muzzle.png/40px-Mods_Muzzle.png.webp 2x" data-file-width="256" data-file-height="256"></span></span></td>
            </tr>
            <tr class="data-tag data-tag-uncommon">
                <td colspan="2">Modification</td>
            </tr>
            <tr class="data-tag data-tag-uncommon">
                <td colspan="2">Uncommon</td>
            </tr>
            <tr class="infobox-title">
                <th colspan="2">Compensator II</th>
            </tr>
            <tr class="data-attachquote infobox-quote infobox-col1">
                <td colspan="2">Moderately reduces per-shot dispersion</td>
            </tr>
            <tr class="data-warning infobox-data infobox-col1">
                <td colspan="2">ⓘ Compatible with: <a href="/wiki/Ferro" title="Ferro">Ferro</a>, <a href="/wiki/Kettle" title="Kettle">Kettle</a>, <a href="/wiki/Rattler" title="Rattler">Rattler</a>, <a href="/wiki/Stitcher" title="Stitcher">Stitcher</a>, <a href="/wiki/Anvil" title="Anvil">Anvil</a>, <a href="/wiki/Arpeggio" title="Arpeggio">Arpeggio</a>, <a href="/wiki/Burletta" title="Burletta">Burletta</a>, <a href="/wiki/Osprey" title="Osprey">Osprey</a>, <a href="/wiki/Renegade" title="Renegade">Renegade</a>, <a href="/wiki/Torrente" title="Torrente">Torrente</a>, <a href="/wiki/Venator" title="Venator">Venator</a>, <a href="/wiki/Bettina" title="Bettina">Bettina</a>, <a href="/wiki/Bobcat" title="Bobcat">Bobcat</a>, <a href="/wiki/Tempest" title="Tempest">Tempest</a></td>
            </tr>
            <tr class="data-fun1 infobox-data infobox-col1">
                <td colspan="2">40% Reduced Per-Shot Dispersion</td>
            </tr>
            <tr class="data-fun2 infobox-data infobox-col1">
                <td colspan="2">20% Reduced Max Shot Dispersion</td>
            </tr>
            <tr class="infobox-header">
                <th colspan="2">General Data</th>
            </tr>
            <tr class="data-recipe infobox-data infobox-col1">
                <th scope="row">Blueprint Locked</th>
                <td>Yes</td>
            </tr>
            <tr class="data-weight infobox-data infobox-col1">
                <th scope="row">Weight</th>
                <td>0.5</td>
            </tr>
            <tr class="data-sellprice infobox-data infobox-col1">
                <th scope="row">Sell Price</th>
                <td>
                    <div class="template-price"><span typeof="mw:File"><span><img src="/w/images/thumb/8/82/RaiderCredits.png/22px-RaiderCredits.png.webp" decoding="async" loading="lazy" width="22" height="22" class="mw-file-element" srcset="/w/images/thumb/8/82/RaiderCredits.png/33px-RaiderCredits.png.webp 1.5x, /w/images/thumb/8/82/RaiderCredits.png/44px-RaiderCredits.png.webp 2x" data-file-width="256" data-file-height="256"></span></span>2,000</div>
                </td>
            </tr>
        </tbody>
    </table>
</section>
```

#### Loot Detail Sentinels

Top level URL: https://arcraiders.wiki/wiki/Loot

- All loot items are listed in a single table on the page.
- The first cell of each row contains the loot item name and link.
- Example loot table:
```
<table class="sortable wikitable jquery-tablesorter">
    <thead>
        <tr class="citizen-overflow-sticky-header">
            <th class="headerSort" tabindex="0" role="columnheader button" title="Sort ascending">Name</th>
            <th class="headerSort" tabindex="0" role="columnheader button" title="Sort ascending">Rarity</th>
            <th class="headerSort" tabindex="0" role="columnheader button" title="Sort ascending">Recycles To</th>
            <th class="headerSort" tabindex="0" role="columnheader button" title="Sort ascending">Sell Price</th>
            <th class="headerSort" tabindex="0" role="columnheader button" title="Sort ascending">Category</th>
            <th class="headerSort" tabindex="0" role="columnheader button" title="Sort ascending">Keep for Quests/Workshop</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><a href="/wiki/Advanced_ARC_Powercell" title="Advanced ARC Powercell">Advanced ARC Powercell</a></td>
            <td>Rare</td>
            <td>2x <a href="/wiki/ARC_Powercell" title="ARC Powercell">ARC Powercell</a></td>
            <td>640</td>
            <td>Misc</td>
            <td></td>
        </tr>
        <tr>
            <td>
                <a href="/wiki/Advanced_Electrical_Components" title="Advanced Electrical Components">Advanced Electrical Components</a>
            </td>
            <td>Rare</td>
            <td>1x <a href="/wiki/Electrical_Components" title="Electrical Components">Electrical Components</a><br>1x <a href="/wiki/Wires" title="Wires">Wires</a></td>
            <td>1,750</td>
            <td>Advanced Material</td>
            <td>5x Workshop<br>5x Expedition</td>
        </tr>
    </tbody>
    <tfoot></tfoot>
</table>
```

## Implementation Details

### Architecture

The crawler is organized into modular components:

- **index.js** - Main entry point, orchestrates the crawling process
- **src/utils.js** - Shared utilities for fetching HTML, parsing components, and finding tables
- **src/equipment.js** - Equipment-specific crawling logic
- **src/weapons.js** - Weapon-specific crawling logic
- **src/weapon_modifications.js** - Weapon modification-specific crawling logic

### Key Features

- **Polite Crawling**: 1.5 second delays between page requests, 2 second delays between major categories
- **Interactive Prompts**: Uses `inquirer` to ask the user about non-craftable items and errors
- **Progress Display**: Uses `ora` spinners and `chalk` colored output for clear progress indication
- **Smart Table Detection**: 
  - Supports both "Recipe" and "Blueprint" table headers
  - Validates tables by checking if the item name appears in the "Craft" column
  - Handles tables with variable column counts (e.g., extra "Blueprint Locked" columns)
  - Filters out false positives where items are used as ingredients rather than being crafted
- **Error Handling**: Catches errors gracefully and asks if crawling should continue
- **Non-Craftable Items**: Items without recipes are still included in output with empty components

### Setup

```bash
npm install jsdom chalk ora inquirer
```

### Running

```bash
node index.js
```

### Output

- **equipment.json** - All equipment items with their crafting recipes and repair costs
- **weapons.json** - All weapons with their crafting recipes, upgrades, and repair costs
- **weapon_modifications.json** - All weapon modifications with their crafting recipes and compatible weapons
- **loot.json** - All loot items from the game

Non-craftable items are included with `components: {}` to provide a complete item database.
