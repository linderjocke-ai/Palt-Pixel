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
