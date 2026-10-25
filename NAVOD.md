# Úlohozor — stránka na zadávanie úloh

## Čo už stránka vie
- Žiak zadá 12-miestny kód. Nemusí sa prihlasovať ani vyberať tému.
- Učiteľ sa prihlási cez Supabase Auth; oprávnenie navyše overuje tabuľka uz_admins.
- Import témy a úloh z JSON alebo z textu oddeleného riadkami ---.
- Editor vytvorí prenosný JSON bez ručného písania jeho štruktúry.
- Každá úloha dostane náhodný globálne jedinečný kód. Pomlčky ani veľkosť písmen pri zadávaní neprekážajú.
- Jednotlivé aj hromadné losovanie s krátkou animáciou kolesa. Výsledok sa uloží pred zobrazením animácie, takže pri zatvorení okna sa nestratí.
- Vyvážené priraďovanie (najmenej používané úlohy v skupine), bez opakovania, alebo náhodne s opakovaním.
- História podľa témy a skupiny, export CSV, stiahnutie pôvodných úloh aj s riešeniami.
- Skrytie témy zneplatní prístup cez jej kódy do opätovného sprístupnenia.
- Tlač zadania / uloženie do PDF cez prehliadač.

## 1. Supabase
Odporúčanie: vytvorte samostatný projekt pre školské zadania. Pri použití existujúceho projektu majú tabuľky prefix uz_, aby nekolidovali s inými aplikáciami.
1. V SQL Editore spustite celý supabase.sql. Opätovné spustenie nemaže dáta.
2. Authentication → Users: vytvorte učiteľský účet s e-mailom a heslom a potvrdeným e-mailom. Ak nepotrebujete verejnú registráciu, vypnite ju v nastaveniach Auth.
3. Skopírujte UUID tohto používateľa a v SQL Editore spustite:
   insert into public.uz_admins(user_id) values ('UUID-UCTU') on conflict do nothing;
4. Z nastavení projektu získajte Project URL a publishable key (alebo starší anon key).
5. V nastavení stránky ich môžete najprv skúšobne zadať. Skúšobná konfigurácia je uložená len v sessionStorage aktuálnej karty. Odhlási sa pri zrušení tejto skúšobnej konfigurácie.
6. Prihláste sa, importujte vzor, priraďte skúšobnému menu úlohu. V anonymnom okne overte otvorenie zadania kódom po nastavení trvalej konfigurácie.

NIKDY nevkladajte service_role ani sb_secret_ kľúč do webovej stránky. Verejný kľúč je určený na použitie v prehliadači; ochranu vykonávajú databázové oprávnenia.

## 2. Verejná stránka (napríklad GitHub Pages)
1. Rozbaľte ulohozor.zip.
2. V config.js vyplňte URL a verejný kľúč, alebo ho stiahnite cez formulár Nastavenie.
3. Nahrajte index.html, style.css, app.js, config.js a pomocné súbory do priečinka publikovaného cez GitHub Pages. Žiadny build netreba.
4. Žiakom dajte adresu stránky. Pre administráciu použite tú istú adresu s #admin.
5. Súkromný náhľad v ChatGPT nie je žiacka verejná adresa. Na používanie s triedou treba verejný hosting a pripojený Supabase projekt.

Balík obsahuje všeobecné SQL a dokumentáciu, nie heslá ani údaje žiakov. Na hostingu môžete pomocné súbory ponechať alebo odstrániť, ale pri odstránení nebudú fungovať ich odkazy v nastavení.

## 3. Import a tvorba
JSON má tvar:
```json
{
  "topic": "Newtonove zákony",
  "subject": "Fyzika",
  "tasks": [
    {"title": "Vozík", "body": "Na vozík s hmotnosťou 4 kg pôsobí sila 12 N. Určte zrýchlenie.", "solution": "3 m/s²"}
  ]
}
```
Môžete požiadať ChatGPT: „Vytvor mi JSON pre Úlohozor: topic, subject, tasks; každá úloha má title, body, solution. Riešenia patria iba do solution.“

Limity: 300 úloh na import, súbor do 5 MB, zadanie do 30 000 znakov. Text je obyčajný text so zachovanými novými riadkami a znakmi ako ², π, √. LaTeX, HTML, obrázky, prílohy a automatické delenie PDF/Word nie sú v tejto verzii implementované. Obsah PDF je potrebné previesť do JSON alebo vložiť do textového editora.

Každý import tvorí novú tému s novými kódmi. Existujúce zadania sú nemenné, aby sa po rozdaní kódov nezmenilo ich znenie. Na novú verziu importujte novú tému a starú podľa potreby skryte.

## 4. Priraďovanie
- Každé meno vložte na samostatný riadok. Z Excelu môžete vložiť jeden stĺpec.
- Názov skupiny môže byť napríklad „2.B – október“. Názov je súčasťou identity priradenia.
- Rovnaké meno v tej istej téme a skupine si zachová pôvodné priradenie. Pre novú sériu použite nový názov skupiny.
- Mená sa porovnávajú presne po odstránení okrajových medzier, vrátane veľkosti písmen. Menovcov rozlíšte dodatkom.
- Jedna úloha má jeden kód. Pri opakovaní úlohy dostanú viacerí žiaci rovnaký kód, ako pri rovnakom variante písomky.
- Koleso je krátka animácia k losovaniu celej skupiny, neukazuje jednotlivé mená na výsekoch. Výsledok vyberá databáza a zobrazí sa v tabuľke.
- Pri nedostatku úloh v režime bez opakovania sa celá požiadavka zruší, čiže nevznikne čiastočne priradená trieda.
- CSV obsahuje mená. Uchovávajte ho spolu s ostatnou školskou dokumentáciou.

## 5. Údaje a prístup
Všetci učitelia uvedení v uz_admins majú spoločnú knižnicu, vidia všetky priradenia a môžu sprístupňovať/skryť témy. Ak chcete oddelené dáta učiteľov, treba doplniť vlastníctvo a politiky prístupu.

Anonymný používateľ nemôže čítať tabuľky. Má len funkciu uz_lookup, ktorá pri presnom kóde vráti názov témy, názov úlohy, zadanie a kód. Nevracia mená ani riešenia. Kto má kód, vie zobraziť zadanie a môže ho preposlať. Kód preto nie je overenie totožnosti žiaka.

Funkcie na zápis overujú administrátora na serveri. Losovanie aj import sú transakčné. UUID náhodné kódy majú kontrolu unikátnosti a import prípadnú kolíziu zopakuje. Na anonymné vyhľadávanie zatiaľ nie je aplikačný limit počtu pokusov; ak bude stránka veľmi verejne propagovaná, pridajte serverovú ochranu proti automatizovanému skúšaniu.

Ukážkový režim používa localStorage jedného prehliadača. Je určený na skúšanie, nie na zadávanie skutočným žiakom. Nemieša sa so Supabase dátami ani sa doň automaticky neprenesie.

Zabudnuté heslo môže správca upraviť v Supabase; samoobslužný reset hesla táto verzia neobsahuje. Odpovede žiakov sa neodovzdávajú ani nehodnotia.

## Overenie pri nasadení
- Neprihlásený návštevník cez kód vidí zadanie, nie solution ani student_name.
- Priamy anonymný prístup k uz_assignments a uz_tasks je odmietnutý.
- Prihlásený účet bez uz_admins nevidí údaje a nemôže importovať ani priraďovať.
- Rovnaké priraďovanie zopakované dvakrát nezmení pôvodné kódy.
- Skrytá téma nevydáva zadanie cez kód.

SQL návrh vychádza z dokumentácie Supabase:
https://supabase.com/docs/guides/database/functions
https://supabase.com/docs/guides/database/postgres/row-level-security
