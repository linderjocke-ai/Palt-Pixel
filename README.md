# Palt & pixel

Startsidan för paltpixel.se: ett bibliotek av sidoprojekt (spel, appar och små experiment) med ett pixelritat Piteå-landskap i sidhuvudet.

## Lägga till ett projekt

Lägg till en rad i `projects.json`. Rutan skapas automatiskt.

| Fält | Betydelse |
| --- | --- |
| `typ` | `spel` eller `app` |
| `kategori` | T.ex. `Strategi`, `Bygga och mysa`, `Sällskap`. Spelens kategorier blir filterknappar |
| `ikon` | `flagga`, `vagg`, `personer`, `timer`, `lista`, `spel`, `app` |
| `storlek` | `liten` (1×1), `bred` (2×1), `hog` (1×2) eller `stor` (2×2) |
| `farg` | `alvbla`, `smor`, `hjortron`, `flask` eller `tall` |
| `bild` | Miniatyr i `assets/img/`, helst WebP, tagen en bit in i spelet |
| `lank` | Adressen till projektet. Tom = rutan går inte att klicka på |

## Köra lokalt

```
python3 -m http.server 8000
```

Öppna sedan http://localhost:8000.

## Publicering

Repot kopplas till Vercel. Varje push till `main` publiceras automatiskt.

## Spelen

`vaggen/` och `frontlinjen/` är spelen. De laddar `assets/js/konto.js` i `<head>`, som sköter flytt från skolvy.se och sparning på kontot. Spelen själva vet inget om kontot: allt i localStorage som matchar `data-nycklar` följer med.

## Konto och sparning (Supabase)

1. Skapa ett gratis projekt på supabase.com.
2. SQL Editor: kör `supabase/schema.sql`.
3. Authentication → URL Configuration: Site URL `https://paltpixel.se`, Redirect URLs `https://paltpixel.se/**`.
4. Authentication → Providers: slå på Email, Google, Azure (Microsoft) och Apple. Google, Microsoft och Apple behöver var sin app hos respektive företag. Supabase visar exakt vilka uppgifter som behövs.
5. Fyll i `supabaseUrl` och `supabaseAnonKey` i `assets/js/konfig.js` (Project Settings → API). Ta bort inloggningssätt du inte slagit på från listan `inloggning`.

Så länge `konfig.js` är tom fungerar allt som förut, utan inloggning.

## Flytt från skolvy.se

Grenen `flytt-till-paltpixel` i skolvy-repot får de gamla adresserna att skicka vidare hit med spelarens sparning efter `#` i adressen. Slå ihop den först när paltpixel.se är live.
