import fs from 'fs';

const BASE_URL = 'https://pokeapi.co/api/v2';

// Map version group names to a canonical gen key used in our frontend
const VERSION_GROUP_LABELS = {
  'red-blue': 'red-blue',
  'yellow': 'yellow',
  'gold-silver': 'gold-silver',
  'crystal': 'crystal',
  'ruby-sapphire': 'ruby-sapphire',
  'emerald': 'emerald',
  'firered-leafgreen': 'firered-leafgreen',
  'diamond-pearl': 'diamond-pearl',
  'platinum': 'platinum',
  'heartgold-soulsilver': 'heartgold-soulsilver',
  'black-white': 'black-white',
  'black-2-white-2': 'black-2-white-2',
  'x-y': 'x-y',
  'omega-ruby-alpha-sapphire': 'omega-ruby-alpha-sapphire',
  'sun-moon': 'sun-moon',
  'ultra-sun-ultra-moon': 'ultra-sun-ultra-moon',
  'lets-go-pikachu-lets-go-eevee': 'lets-go-pikachu-lets-go-eevee',
  'sword-shield': 'sword-shield',
  'brilliant-diamond-shining-pearl': 'brilliant-diamond-shining-pearl',
  'scarlet-violet': 'scarlet-violet',
};

async function generateMultiVersionTmDb() {
  console.log('🚀 Starting Multi-Version TM/HM Database Generation...');

  try {
    console.log('📦 Fetching all machines...');
    const res = await fetch(`${BASE_URL}/machine?limit=3000`);
    if (!res.ok) throw new Error('Failed to fetch machine list');
    const data = await res.json();
    const machineList = data.results;
    console.log(`📊 Total machines found: ${machineList.length}`);

    // Result: { "red-blue": { "cut": "HM 01", "thunderbolt": "TM 24" }, ... }
    const allVersions = {};
    const BATCH_SIZE = 50;

    for (let i = 0; i < machineList.length; i += BATCH_SIZE) {
      const batch = machineList.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (m) => {
        try {
          const machineRes = await fetch(m.url);
          if (!machineRes.ok) return;
          const machineData = await machineRes.json();

          const vg = machineData.version_group.name;
          if (!VERSION_GROUP_LABELS[vg]) return; // Skip version groups we don't care about

          const moveName = machineData.move.name;
          const itemName = machineData.item.name; // e.g., "tm01", "hm03"

          let labelType = itemName.startsWith('hm') ? 'HM' : 'TM';
          let number = itemName.match(/\d+/)?.[0] || '';
          const label = `${labelType} ${number}`;

          if (!allVersions[vg]) allVersions[vg] = {};
          allVersions[vg][moveName] = label;
        } catch (e) {
          // Silent fail
        }
      }));
      process.stdout.write(`\r   Processing: ${Math.min(i + BATCH_SIZE, machineList.length)}/${machineList.length}`);
    }

    console.log('\n');

    // Summary
    Object.entries(allVersions).forEach(([vg, moves]) => {
      const tmCount = Object.values(moves).filter(v => v.startsWith('TM')).length;
      const hmCount = Object.values(moves).filter(v => v.startsWith('HM')).length;
      console.log(`   ${vg}: ${tmCount} TMs + ${hmCount} HMs`);
    });

    fs.writeFileSync('tm_hm_db.json', JSON.stringify(allVersions));
    console.log('\n✨ Success! tm_hm_db.json generated (multi-version)');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

generateMultiVersionTmDb();
