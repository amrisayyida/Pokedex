import fs from 'fs';

const BASE_URL = 'https://pokeapi.co/api/v2';

async function generateMovesDb() {
  console.log('🚀 Starting Moves Database Generation...');
  
  try {
    console.log('📦 Fetching move list...');
    const res = await fetch(`${BASE_URL}/move?limit=2000`); // Fetch 2000 to cover all current and future moves
    const data = await res.json();
    const moveList = data.results;
    
    const moveTypes = {};
    const BATCH_SIZE = 50;
    
    for (let i = 0; i < moveList.length; i += BATCH_SIZE) {
      const batch = moveList.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (m) => {
        try {
          const moveRes = await fetch(m.url);
          const moveData = await moveRes.json();
          moveTypes[m.name] = moveData.type.name;
        } catch (e) {
          console.error(`Failed to fetch move ${m.name}`);
        }
      }));
      console.log(`✅ Progress: ${Math.min(i + BATCH_SIZE, moveList.length)}/${moveList.length}`);
    }

    fs.writeFileSync('moves_db.json', JSON.stringify(moveTypes));
    console.log('✨ Success! moves_db.json generated (minified)');
  } catch (error) {
    console.error('❌ Failed to generate moves database:', error);
  }
}

generateMovesDb();
