# Open vragen van de kennisbank Topografie (plan T2b §3.4 en §3.5)

Gegevens die niet goed genoeg onderbouwd zijn, of die afwijken van een controlebron, ter beslissing voor Dick en GPT.
Een controlebron levert nooit een waarde; een verschil staat hier, met een status.

Statussen: onderzocht, bevestigd verschil, nog onbeslist, gecorrigeerd.
Vorm van een regel: "- id | status | uitleg". De id komt uit AFWIJKINGEN in afgeleid/randen.js; tools/topo/test-randen.mjs
controleert dat elke afwijking hier staat met een geldige status, en dat hier geen verouderde id staat.

## Randen: grenst-aan en landlocked (T2b-1, t = 0,5 km)

### Beslist (GPT, 17-11-2026)

- conventie-SOL-SOM | gecorrigeerd | Somaliland (Natural Earth SOL, een eigen vlak, de facto) is samengevoegd met Somalie (SOM), omdat de 194 op de VN-lijst rusten. Een bewuste afwijking van de bron, in bereken-randen.mjs (SAMENVOEGINGEN) en in BRON.samenvoegingen; toegepast op de geometrie, de buren en de vergelijking met WC. Gevolg: Djibouti grenst aan Somalie (64,4 km), Ethiopie-Somalie wordt 1.619,8 km
- buren-alleen-ne-BRA-FRA | bevestigd verschil | Frankrijk omvat alle eenheden met ADM0_A3 FRA, dus ook Frans-Guyana. Frankrijk grenst daardoor aan Brazilie (517,7 km). WC telt Frans-Guyana apart
- buren-overzees-BRA-FRA | bevestigd verschil | Dezelfde grens loopt alleen via een overzees deel (Frans-Guyana). Zo bedoeld (beslissing 17-11-2026)
- buren-alleen-ne-FRA-SUR | bevestigd verschil | Frankrijk grenst via Frans-Guyana aan Suriname (421,9 km). WC telt Frans-Guyana apart
- buren-overzees-FRA-SUR | bevestigd verschil | Dezelfde grens loopt alleen via een overzees deel (Frans-Guyana). Zo bedoeld (beslissing 17-11-2026)
- buren-wc-buiten-BRA | bevestigd verschil | WC noemt Frans-Guyana (GUF) als aparte buur van Brazilie; hier hoort het bij Frankrijk. Daarnaast grenst Brazilie in de geometrie 1,2 km aan het Braziliaanse eiland (BRI, betwist met Uruguay)
- buren-wc-buiten-SUR | bevestigd verschil | WC noemt Frans-Guyana (GUF) als buur van Suriname; hier hoort het bij Frankrijk
- buren-alleen-wc-BWA-ZMB | bevestigd verschil | WC: Botswana grenst aan Zambia (Kazungula). In de gebruikte geometrie delen ze geen rand, dus geen automatische relatie en geen vraag over deze relatie. De bijzonderheid bij Kazungula blijft hier vermeld; de werkelijke lengte van die grens is niet met een bron vastgesteld
- buren-binnenwater-COD-TZA | onderzocht | Congo (DRC) en Tanzania zijn buren via binnenwater: 475,7 km gedeelde grens door het Tanganyikameer, ruim boven de drempel van 1 km. Kwalificatie via: binnenwater

### Onderzocht of bevestigd

- buren-alleen-wc-IND-LKA | bevestigd verschil | WC noemt India als buur van Sri Lanka. Er is geen landgrens; een zeegrens telt niet (§3.4). De geometrie heeft gelijk voor de definitie van deze app
- buren-enclave-ITA-VAT | onderzocht | Vaticaanstad is in de bron een klein vlak; de gedeelde rand met Italie is 0,4 km. De relatie volgt uit de enclaveregel van §3.4 (een enclave is buurland van het land eromheen)
- code-SDS | onderzocht | Natural Earth gebruikt SDS voor Zuid-Soedan, ISO 3166-1 en WC gebruiken SSD. De id in de kennisbank wordt de ISO-code (§3.2), vast te leggen met de ISO-bron in de volgende stap
- onbekende-rand-EGY | onderzocht | 271 km onbekende rand rond de Halaib-driehoek en Bir Tawil (22-23 graden N): de vlakken van Egypte, Soedan en Bir Tawil sluiten niet op elkaar aan. Geen gevolg: Egypte heeft kust aan zee
- onbekende-rand-SDN | onderzocht | 32,2 km onbekende rand bij Bir Tawil. Geen gevolg: Soedan heeft kust aan zee
- onbekende-rand-FJI | onderzocht | 55,4 km onbekende rand op de naad van de datumgrens (lengte 180 graden), geen kust. Geen gevolg: Fiji heeft kust aan zee
- onbekende-rand-RUS | onderzocht | 991,1 km onbekende rand (gecorrigeerde waarde; het meetrapport noemde 665 km), alles op de naad van de datumgrens (Tsjoekotka), geen kust. Geen gevolg: Rusland heeft kust aan zee

### Buren buiten de 194 (geen eigen item; ter informatie)

- buren-ne-buiten-ARG | onderzocht | Argentinie grenst in de geometrie ook aan het Braziliaanse eiland (BRI, 3,5 km) en het Zuid-Patagonische ijsveld (SPI, 71 km, betwist met Chili). De grens met Chili blijft daarnaast bestaan
- buren-ne-buiten-CHL | onderzocht | Chili grenst in de geometrie ook aan het Zuid-Patagonische ijsveld (SPI, 86,6 km)
- buren-ne-buiten-URY | onderzocht | Uruguay grenst in de geometrie ook aan het Braziliaanse eiland (BRI, 3,8 km)
- buren-ne-buiten-CUB | onderzocht | Cuba grenst aan Guantanamo Bay (USG, 25,2 km), een Amerikaans gebied zonder eigen item
- buren-ne-buiten-CYP | onderzocht | Cyprus grenst aan de VN-bufferzone (CNM) en de Britse bases Akrotiri (WSB) en Dhekelia (ESB). Noord-Cyprus (CYN) deelt in de bron geen rand met Cyprus: de bufferzone ligt ertussen
- buren-ne-buiten-IND | onderzocht | India grenst aan de Siachen-gletsjer (KAS, 80,5 km), een betwist gebied met een eigen vlak
- buren-ne-buiten-PAK | onderzocht | Pakistan grenst aan de Siachen-gletsjer (KAS, 64,5 km)
- buren-ne-buiten-KAZ | onderzocht | Kazachstan grenst aan Bajkonoer (KAB, 285,6 km), een door Rusland gepacht gebied met een eigen vlak
- buren-ne-buiten-SDN | onderzocht | Soedan grenst aan Bir Tawil (BRT, 90,8 km)
- buren-wc-buiten-ALB | onderzocht | Albanie grenst aan Kosovo (WC: UNK, Natural Earth: KOS); Kosovo is geen item van de 194
- buren-wc-buiten-MKD | onderzocht | Noord-Macedonie grenst aan Kosovo; geen item van de 194
- buren-wc-buiten-MNE | onderzocht | Montenegro grenst aan Kosovo; geen item van de 194
- buren-wc-buiten-SRB | onderzocht | Servie grenst aan Kosovo; geen item van de 194
- buren-wc-buiten-CHN | onderzocht | China grenst aan Hongkong en Macau (WC). In de geometrie grenst China aan Hongkong en aan de Siachen-gletsjer (KAS); Macau deelt in Natural Earth geen rand met China (alleen water). Hongkong en Macau zijn geen items van de 194
- buren-wc-buiten-DZA | onderzocht | Algerije grenst aan de Westelijke Sahara (WC: ESH, Natural Earth: SAH); geen item van de 194
- buren-wc-buiten-MAR | onderzocht | Marokko grenst aan de Westelijke Sahara; geen item van de 194 (zie ook de atlasconventie uit T2a)
- buren-wc-buiten-MRT | onderzocht | Mauritanie grenst aan de Westelijke Sahara; geen item van de 194
- buren-wc-buiten-EGY | onderzocht | Egypte grenst aan Palestina (Gaza; WC: PSE, Natural Earth: PSX) en in de geometrie aan Bir Tawil (BRT); geen items van de 194
- buren-wc-buiten-ISR | onderzocht | Israel grenst aan Palestina (PSX); geen item van de 194
- buren-wc-buiten-JOR | onderzocht | Jordanie grenst aan Palestina (Westelijke Jordaanoever, PSX); geen item van de 194
- buren-wc-buiten-ESP | onderzocht | Spanje grenst aan Gibraltar (1,8 km, in WC en in de geometrie); geen item van de 194
