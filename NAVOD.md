# Úlohozor – index.html a admin.html

Táto verzia je pripravená pre tvoj existujúci GitHub Pages a Supabase projekt.

## Nahratie na GitHub
1. Rozbaľ ZIP a nahraj všetky súbory z neho priamo do hlavného priečinka existujúceho repozitára. Nenahrávaj celý priečinok ani ZIP.
2. Potvrď nahradenie existujúcich súborov a Commit changes.
3. Počkaj na úspešné nasadenie GitHub Pages. Otvor stránku a obnov ju cez Ctrl + Shift + R.
4. Žiakom pošli základnú adresu stránky (alebo adresu končiacu /index.html).
5. Ty otvor rovnakú adresu s /admin.html na konci a prihlás sa svojím učiteľským účtom.

Príklad adries (nahraď svojim používateľom a repozitárom):
- Žiaci: https://POUZIVATEL.github.io/REPOZITAR/index.html
- Učiteľ: https://POUZIVATEL.github.io/REPOZITAR/admin.html

Dôležité súbory: index.html, student.js, admin.html, admin.js, style.css, config.js.
NAVOD.md je tento návod. supabase.sql je pôvodná inicializácia pre prípad úplne nového projektu.
Súbor .nojekyll zabezpečí jednoduché publikovanie statických súborov; na fungovanie týchto názvov súborov nie je nevyhnutný.
Pôvodný app.js sa už nenačítava. Môže zostať v repozitári, ale nová verzia ho nepoužíva. Staré ulohozor.zip a app.js môžeš neskôr odstrániť, aby nezostali na stiahnutie staré verzie.

## Supabase netreba nastavovať znovu
Pripojenie v config.js už smeruje na tvoj projekt. Používajú sa rovnaké tabuľky uz_topics, uz_tasks, uz_assignments a uz_admins aj rovnaké funkcie. Existujúce témy, úlohy, kódy, priradenia a učiteľské účty zostávajú zachované.
SQL netreba znovu spúšťať. Nevymazávaj tabuľky ani používateľov.

## Čo vidí žiak
Na index.html je iba zadanie kódu a samotná úloha. Nie je tam prihlasovanie, administrácia ani nastavenie Supabase. Žiak nepotrebuje účet. Stránka neposiela prihlasovací token a nečíta úložisko prehliadača. Rovnaký platný kód otvorí rovnaké zadanie na inom zariadení alebo v inkognite.
Pri chybnom kóde alebo skrytej téme sa zobrazí vysvetlenie. Pri výpadku internetu sa zobrazí chyba, nie nová ukážková databáza.

## Čo vidí učiteľ
Na admin.html sa prihlásiš e-mailom a heslom učiteľského účtu zo Supabase. Po prihlásení sa overí členstvo v uz_admins. Potom môžeš importovať témy, vytvárať JSON súbory, losovať a prezerať uložené priradenia.
Prihlásenie sa uchováva v aktuálnej karte prehliadača; v inkognite alebo novej nezávislej karte sa môžeš musieť prihlásiť znova. To sa týka iba učiteľa. Úlohy a priradenia sú vždy v Supabase, nie v sessionStorage.

## Import a losovanie
1. V administrácii otvor Importovať úlohy a vyber svoj JSON.
2. Skontroluj náhľad a klikni Importovať a vytvoriť kódy.
3. V téme zadaj názov skupiny a mená po riadkoch.
4. Vyber vyvážené rozdelenie, bez opakovania alebo úplnú náhodu.
5. Spusti losovanie. Najprv sa priradenia uložia do Supabase, potom prebehne krátka animácia.
6. Žiakom daj ich kódy. Zoznam môžeš exportovať do CSV.
Rovnaké meno v rovnakej téme a skupine ponechá pôvodné priradenie. Pre novú sériu použi nový názov skupiny. Pri menovcoch doplň rozlišovací údaj.

Formát importu sa nemení:
{"topic":"Názov témy","subject":"Matematika","tasks":[{"title":"Úloha 1","body":"Zadanie","solution":"Riešenie iba pre učiteľa"}]}

## Starý ukážkový režim
Nová verzia ukážkový režim vôbec nemá. Staré lokálne ukážkové údaje nevymazáva ani automaticky neimportuje. Ak si v starej verzii pracoval v ukážke, uchovaj si exporty pred zmenami alebo vymazaním údajov prehliadača. Kódy vytvorené iba lokálne sa v Supabase automaticky nenachádzajú; po importe úloh do Supabase vzniknú nové kódy.

## Prístup a súkromie
Samostatné stránky uľahčujú používanie. Ochranu údajov stále zabezpečuje Supabase: anonymná funkcia uz_lookup vracia iba zadanie podľa kódu, nie mená ani učiteľské riešenia. Priamy prístup k administrátorským tabuľkám a zápis vyžadujú administrátorský účet.
config.js obsahuje iba verejný publishable kľúč; nikdy doň nevkladaj service_role ani secret key.
Zadaním kódu sa neoveruje totožnosť žiaka; kto pozná kód, vie si zobraziť zadanie.
