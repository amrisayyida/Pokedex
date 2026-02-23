# Panduan Migrasi Pokedex ke Nordcraft (Toddle)

**TANTANGAN:** API PokeAPI standar (`/pokemon`) **TIDAK** memuat info "Evolution Stage", "Generation", atau "Types" secara lengkap di list awal.

## Strategi Migrasi (Pilih Salah Satu)

| Fitur | 1. Static DB (Full) | 2. Realtime Fetch | 3. Lazy Loading | 4. Hybrid (Recommended) | **5. Realtime Hybrid (Extreme)** |
|---|---|---|---|---|---|
| **Loading Awal** | ⚡ Cepat | 🐢 Lambat (30s) | ⚡ Cepat | ⚡ Cepat | 🐢 **Lambat (2-3 menit)** |
| **Akurasi Stage** | ✅ Akurat | ⚠️ Tidak Akurat | ❌ Tidak Bisa | ✅ Akurat | ✅ **Akurat** |
| **Logic** | Script Local | Script Browser | Script Browser | Script Local | **Script Browser** |

---

## Update: Logic Filter dengan "Game Version" 🎮

Setelah Anda update database dengan field `games`, berikut cara menambahkan filternya di Nordcraft.

### 1. Update Variable Filter
Tambahkan variable baru: 
- `filterGame` (String, default empty).
- `filterSort` (String, default "id_asc").

### 2. Update Formula `FilterPokemonList`
Edit formula yang sudah ada. Tambahkan argument baru dan update scriptnya:

| Nama Argument | Tipe (Pilih di Dropdown) |
|---|---|
| `List` | **List** |
| `Search` | **String** |
| `Type` | **String** |
| `Stage` | **String** |
| `Gen` | **String** |
| `Game` | **String** |
| `Sort` | **String** (BARU!) |

**Code JavaScript Terbaru (Filter + Sort):**

```javascript
/**
 * @param {Args} args
 * @param {Ctx} ctx
 */
/**
 * @param {Args} args
 * @param {Ctx} ctx
 */
function FilterPokemonList (args, ctx) {
  const list = args.List || [];
  const search = (args.Search || "").toLowerCase().trim();
  const type = args.Type || "";
  const stage = args.Stage || "";
  const gen = args.Gen || "";
  const game = args.Game || "";
  const sort = args.Sort || "id_asc";
  
  // Ambil data pengecualian dari variabel Nordcraft
  // Format: { "red": [1, 2], "blue": [3] }
  const runExclusions = args.Exclusions || {}; 
  
  // 1. Jalankan Filter
  const filtered = list.filter(p => {
    // Cek pengecualian versi game
    const gameExclusions = runExclusions[game] || [];
    if (game && gameExclusions.includes(p.id)) return false;

    const matchSearch = !search || 
      (p && p.name && p.name.toLowerCase().includes(search)) || 
      (p && String(p.id) === search);
    const matchType = !type || (p && p.types && p.types.includes(type));
    const matchStage = !stage || (p && p.stage === stage);
    const matchGen = !gen || (p && String(p.gen) === String(gen));
    const matchGame = !game || (p && p.games && p.games.includes(game));
    
    return matchSearch && matchType && matchStage && matchGen && matchGame;
  });

  // 2. Jalankan Sort (Chaining)
  return filtered.sort((a, b) => {
    switch (sort) {
      case "id_asc": return a.id - b.id;
      case "id_desc": return b.id - a.id;
      case "name_asc": return a.name.localeCompare(b.name);
      case "name_desc": return b.name.localeCompare(a.name);
      default: return a.id - b.id;
    }
  });
}

```

### 3. Update Binding di UI
Jangan lupa update pemanggilan formula di element Repeat:
- Input `Game` -> Bind ke variable `filterGame`.
- Input `Sort` -> Bind ke variable `filterSort`.

### 4. Membuat Dropdown Game & Sorting

**Dropdown Game:**
1. Action (On Load): Fetch `https://pokeapi.co/api/v2/version?limit=40`.
2. On Success -> Set Variable `allGames` = `Action.Response.results`.
3. Gunakan `allGames` sebagai source Dropdown.

**Dropdown Sorting (Manual Options):**
Buat elemen `<select>` baru dengan opsi manual:
- Value: `id_asc` | Text: "Number (Low to High)"
- Value: `id_desc` | Text: "Number (High to Low)"
- Value: `name_asc` | Text: "Name (A-Z)"
- Value: `name_desc` | Text: "Name (Z-A)"

---

## Update: Menambahkan Evolution Chain (Metode DB Terpisah) 🧬

Jika Anda ingin data evolusi tersedia secara instan di Detail Page tanpa memperbesar file database utama, gunakan **Evolution Database** terpisah.

### 1. Jalankan Script Generator Baru
Saya telah membuatkan file `create_evolution_db.js` di project Anda.

1.  Jalankan perintah ini di terminal:
    ```bash
    node create_evolution_db.js
    ```
2.  Script akan menghasilkan file `evolution_db.json`.
3.  Upload file ini ke Nordcraft sebagai variable baru bernama `evolutionData`.

### 2. Implementasi di Nordcraft

Database ini berbentuk **Mapping ID**, sehingga lookup-nya sangat cepat. format datanya:
`{ "1": { "stage": "basic", "chain": [...] }, "2": ... }`

**Cara Menampilkan di Detail Page:**
1.  ** Ambil Data Evolusi**: Buat formula baru (atau gunakan binding langsung) untuk mengambil data berdasarkan ID Pokemon yang sedang dipilih:
    *   Formula: `evolutionData[selectedPokemon.id]`
2.  **Tampilkan List Evolusi**:
    *   Tambahkan element **Repeat**.
    *   Bind source ke `evolutionData[selectedPokemon.id].chain`.
3.  **Binding Item**:
    *   `Image source` -> `item.image`
    *   `Text` -> `item.name`
4.  **Highlight Current**: Tambahkan class atau style jika `item.id === selectedPokemon.id`.

> [!NOTE]
> Dengan metode ini, Detail Page Anda tidak hanya menampilkan stage evolusi, tapi juga bisa langsung menampilkan gambar semua evolusi yang terkait.
---

## Update: Membuat Halaman Admin di Nordcraft (Opsi 3) 🛠️

Agar client bisa mengelola pengecualian langsung di dalam Nordcraft tanpa menyentuh code, ikuti langkah ini:

### 1. Siapkan Variabel Penyimpanan
Buat Variable baru di Nordcraft bernama `gameExclusions` (Tipe: **Object**).
Isi awalnya bisa kosong: `{}`.

### 2. Buat Halaman Admin (`/admin`)
1.  Buat Page baru.
2.  Tambahkan **Repeat Element** yang berisi list semua game (ambil dari variable `allGames`).
3.  Di dalam Repeat tersebut, tambahkan:
    *   **Label**: Bind ke `item.name`.
    *   **Textarea/Input**: Tempat client mengetik ID (misal: "1, 23, 44").
4.  **Binding Value**: Bind value textarea ke formulir sementara atau langsung ke field di `gameExclusions[item.id]`.

### 3. Buat Tombol Simpan
Tambahkan Button "Save Exclusions".
1.  **Action**: Gunakan `Set Variable` untuk mengupdate `gameExclusions`.
2.  **Logic**: Ubah teks string dari textarea menjadi Array Numbers.
    *   Formula: `Value.split(",").map(n => parseInt(n.trim()))`

### 4. Hubungkan ke Formula Filter
Di halaman utama Pokedex (Repeat list), pastikan formula `FilterPokemonList` mempassing variabel ini:
- Bind argument `Exclusions` -> ke variable `gameExclusions`.

> [!TIP]
> Dengan cara ini, client Anda bisa login ke Nordcraft, buka halaman Admin, ketik ID Pokemon yang ingin dihilangkan, dan hasilnya langsung terlihat secara realtime di Pokedex tanpa perlu deploy ulang!

---

## Update: Menambahkan Alternate Forms (Bentuk Alternatif) 🎭

Beberapa Pokemon punya form alternatif (Pikachu → Rock Star, Belle, Cosplay, dll). Data ini disimpan di **static JSON** terpisah.

### 1. Jalankan Script Generator Baru

```bash
node create_forms_db.js
```

Akan menghasilkan file `forms_db.json`. Format:
```json
{
  "25": [
    { "id": 10080, "name": "Rock Star", "image": "https://...10080.png" },
    { "id": 10081, "name": "Belle", "image": "https://...10081.png" }
  ]
}
```
> Hanya Pokemon dengan 2+ variasi yang masuk.

### 2. Upload ke Nordcraft
Upload `forms_db.json` sebagai variable baru: **`formsData`** (Tipe: Object).

### 3. Implementasi di Detail Page

1. **Cek apakah Pokemon punya forms**: Gunakan kondisi `formsData[selectedPokemon.id]` untuk menampilkan/menyembunyikan section.
2. **Tampilkan Grid Forms**: Tambahkan element **Repeat**.
   - Source: `formsData[String(selectedPokemon.id)]`
3. **Binding per Item**:
   - `Image source` → `item.image`
   - `Text` → `item.name`
4. **Styling**: Gunakan grid layout dengan circular sprite container.

---

## Update: Menambahkan Strengths & Weaknesses (Efektivitas Tipe) 🛡️

Chart efektivitas tipe defensif — menunjukkan tipe apa yang Weak/Resistant/Immune terhadap Pokemon tersebut.

### 1. Jalankan Script Generator Baru

```bash
node create_type_effectiveness_db.js
```

Akan menghasilkan file `type_effectiveness_db.json`. Format (Compressed):
```json
{
  "electric": {
    "normal": "",
    "fire": "",
    "water": "",
    "electric": "resistant",
    "grass": "",
    "ice": "",
    "fighting": "",
    "poison": "",
    "ground": "weak",
    "flying": "resistant",
    ... (total 18 tipe)
  },
  "grass,poison": {
    "normal": "",
    "fire": "weak",
    "water": "resistant",
    "electric": "resistant",
    ... (total 18 tipe)
  }
}
```
> **PENTING**: Versi ini hanya menyimpan kombinasi tipe unik (~171 baris). Ini jauh lebih kecil daripada menyimpan 1025 baris data yang sama berulang-ulang, sehingga pasti muat di variabel Nordcraft.

### 2. Upload ke Nordcraft
Upload `type_effectiveness_db.json` sebagai variable baru: **`typeEffectivenessData`** (Tipe: Object).

### 3. Buat Formula Lookup di Detail Page

Karena Keys di JSON adalah kombinasi tipe (misal: `"grass,poison"`), kita perlu formula untuk melakukan lookup berdasarkan `SelectedPokemon.types`.

Buat formula baru **`GetEffectivenessData`**:

| Nama Argument | Tipe |
|---|---|
| `Types` | **List** (tipe dari pokemon terpilih) |
| `DB` | **Object** (variabel `typeEffectivenessData`) |

**Code Javascript:**
```javascript
function GetEffectivenessData(args, ctx) {
  const types = args.Types || [];
  const db = args.DB || {};
  
  // 1. Urutkan tipe agar sesuai dengan Key di JSON
  const key = [...types].sort().join(",");
  
  // 2. Ambil data (output berupa object 18 tipe)
  return db[key] || {}; 
}
```

### 4. Implementasi di UI

1.  **Panggil Formula**: Pastikan element di Detail Page mengambil hasil dari formula di atas.
2.  **Tampilkan Icon**:
    *   Gunakan element **Repeat** pada list tipe yang mau ditampilkan (misal: List 18 tipe standar).
    *   Untuk menentukan icon/warna, cek valuenya: `EffectivenessData[item.type]`.
    *   Jika valuenya `"weak"`, tampilkan icon Weak. Jika `"resistant"`, tampilkan icon Resistant, dan seterusnya.

> [!TIP]
> Dengan cara ini, data yang diketik di dalam Nordcraft tetap bersih dan mudah dikelola tanpa risiko "Memory Limit" pada variabel.

---

## Update: Menambahkan Gender Ratio (Rasio Jenis Kelamin) 🚻

### 1. Jalankan Script Generator Baru

```bash
node create_gender_db.js
```

Akan menghasilkan file `gender_db.json`. Format:
```json
{
  "1": { "genderless": false, "male": "87.5%", "female": "12.5%" },
  "100": { "genderless": true, "male": "0%", "female": "0%" }
}
```

### 2. Upload ke Nordcraft
Upload `gender_db.json` sebagai variable baru: **`genderData`** (Tipe: Object).

### 3. Logika Implementasi di Nordcraft

Karena data sudah jadi (String %), Anda tinggal melakukan binding langsung:

1.  **Cek Genderless**: Gunakan `genderData[selectedPokemon.id].genderless` (Boolean).
2.  **Tampilkan Teks**:
    *   Male: `genderData[selectedPokemon.id].male` (Hasilnya langsung: "87.5%")
    *   Female: `genderData[selectedPokemon.id].female` (Hasilnya langsung: "12.5%")
3.  **Visual (Width Progress Bar)**:
    *   Karena Nordcraft butuh angka untuk width, Anda bisa gunakan formula `ParseInt` atau string manipulation jika diperlukan, tapi untuk label teks sudah langsung bisa dipakai.

---

## Update: Menambahkan Catch Rate (Tingkat Tangkapan) 🎯

### 1. Jalankan Script Generator Baru

```bash
node create_catch_rate_db.js
```

Akan menghasilkan file `catch_rate_db.json`. Format:
```json
{
  "25": 190,
  "1": 45
}
```
> Nilai adalah capture rate dasar (1-255).

### 2. Upload ke Nordcraft
Upload `catch_rate_db.json` sebagai variable baru: **`catchRateData`** (Tipe: Object).

### 3. Logika Implementasi di Nordcraft

1.  **Ambil Nilai**: `catchRateData[selectedPokemon.id]`.
2.  **Hitung Probabilitas (Opsional)**:
    *   Formula sederhana untuk Poke Ball (Full HP): `(catchRateData[selectedPokemon.id] / 765) * 100`.
3.  **Visual**:
    *   Tampilkan angka Catch Rate (lebi tinggi = lebih mudah ditangkap).
    *   Tampilkan progress bar dengan max 255.

