# Veckopalten

Familjens skolvecka på ett ställe: prov, läxor, träningar, lov, instuderingsmaterial, resultat och schema.

Appen är en vanlig webbsida (HTML, CSS och JavaScript utan byggsteg) som kan läggas på hemskärmen. Data och inloggning ligger i Supabase.

## Det här finns nu

- **Inloggning:** vuxna loggar in med Google, Microsoft eller en länk via e-post. Barn loggar in med familjekod och egen PIN-kod.
- **Roller:** föräldrar styr allt. Barn ser bara sina egna saker, kan lägga till och ändra, men inte ta bort. Reglerna ligger i databasen.
- **Idag:** dagens lektioner (passerade lektioner stryks, pågående lektion markeras) och *På gång* med närmaste datum först.
- **Kalender:** veckovy och månadsvy som väggkalender, med veckonummer, lov och filter på barn och typ.
- **Händelser:** prov, läxa, träning (kan upprepas varje vecka), lov och övrigt.
- **Instuderingsmaterial:** länk, text, bild eller dokument direkt på händelsen.
- **Resultat:** poäng, maxpoäng och kommentar på prov och läxor.
- **Schema:** lektioner per barn och veckodag, inlagda för hand.
- **Utseenden:** Soluppgång (standard), Kickflip och Setter.
- **Demoläge:** utan Supabase-uppgifter körs appen med exempeldata i webbläsaren.

## Kommer i senare etapper

- Lunch från Mateomeny per skola
- Schema från bild, PDF eller Skola24-länk
- *Läs in*: AI läser veckobrev, länkar, filer och foton och föreslår händelser
- Påminnelser som pushnotiser och föräldrarnas påminnelseknappar
- Flytt av data från gamla Plugglistan i Lovable

## Sätta upp Supabase

Samma Supabase-projekt som Palt & pixel kan användas.

1. **SQL Editor → New query:** klistra in hela `supabase/schema.sql` och kör. Filen går att köra flera gånger.
2. **Authentication → URL Configuration:** se till att `https://paltpixel.se/**` finns under *Redirect URLs* (täcker även `/veckopalten/`).
3. **Authentication → Sign In / Providers:**
   - Slå på **Google** och **Azure** (Microsoft) med nycklar från Google Cloud och Microsoft Entra.
   - Slå på **Email**.
   - Slå på **Allow anonymous sign-ins**. Det behövs för barnens inloggning med familjekod och PIN.
4. **Project Settings → API:** kopiera *Project URL* och *anon/publishable key* till `js/konfig.js`. Lägg aldrig in `service_role`-nyckeln.

## Publicering

Appen ligger i mappen `veckopalten/` i repot palt-pixel och publiceras automatiskt av Vercel på **https://paltpixel.se/veckopalten/**.

## Filer

| Fil | Innehåll |
| --- | --- |
| `index.html` | Skalet som laddar allt |
| `css/app.css` | Stilar och de tre utseendena |
| `js/app.js` | Alla skärmar och knappar |
| `js/data.js` | Datalager för Supabase och demoläget |
| `js/datum.js` | Datum, veckonummer och upprepningar |
| `js/konfig.js` | Supabase-adress och publik nyckel |
| `supabase/schema.sql` | Tabeller, behörigheter och funktioner |
