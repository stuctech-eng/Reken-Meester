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

## Landen: namen, hoofdsteden, codes en werelddelen (T2b-1, plan §1.3 A)

Bronnen: TU (namen, hoofdsteden, ISO-codes), M49 (werelddeel en groep), UN (de lijst). WC is alleen controle.

### Beslist (GPT, 17-11-2026)

- iso-LBY | gecorrigeerd | de TU-pagina van Libie geeft geen ISO-codes. Alpha-3 komt voor alle 194 uniform uit M49: LBY. Alpha-2 en numeriek komen uit de TU en blijven voor Libie leeg
- iso-NRU | gecorrigeerd | de TU-pagina van Naoero geeft als alpha-3 NRO (letterlijk zo). Alpha-3 komt voor alle 194 uniform uit M49: NRU; de TU-waarde is alleen controle
- naam-dubbel-COG-COD | gecorrigeerd | de TU noemt beide landen Congo. Getoond worden Congo-Brazzaville en Congo-Kinshasa, de namen ter onderscheiding uit de TU-opmerking; Congo blijft bij beide een variant. De ids COG en COD staan daar los van
- naam-voorkeur-BLR | gecorrigeerd | Wit-Rusland als voorkeursnaam (volgens de TU de meest gebruikte vorm buiten officiele teksten), Belarus als variant; beide gelden als goed antwoord
- naam-voorkeur-GBR | gecorrigeerd | Verenigd Koninkrijk als voorkeursnaam (de landnaam; Groot-Brittannie is ook het eiland), Groot-Brittannie als variant
- naam-voorkeur-SAU | gecorrigeerd | Saoedi-Arabie als voorkeursnaam (de titel van de TU-pagina), Saudi-Arabie als variant
- naam-wc-BLR | gecorrigeerd | na het besluit bij naam-voorkeur-BLR is de voorkeursnaam gelijk aan WC (Wit-Rusland); geen verschil meer
- naam-wc-GBR | gecorrigeerd | na het besluit bij naam-voorkeur-GBR is de voorkeursnaam gelijk aan WC (Verenigd Koninkrijk); geen verschil meer

### De 12 bijzondere gevallen (T1 §3.6): rollen vastgesteld met OV (besluiten GPT 17-11-2026, ronden 1 en 2)

De rollen, bronnen en bronnotities staan in tools/topo/ov-rollen.json. 9 rollen met een vraag; een open rol of een bronnotitie levert geen vraag op. Telling blijft 12 + 182.

- bijzonder-BDI | nog onbeslist | geen rol met een vraag: politieke hoofdstad Gitega is gedeeltelijk bewezen (zie rol-open-BDI-hoofdstad). TU: Gitega
- bijzonder-BEN | onderzocht | 1 rol: officiële hoofdstad Porto-Novo (Grondwet art. 1). Cotonou: regeringszetel niet aangetoond met OV, maar ook niet afwezig verklaard; alleen uitleg. TU: Porto-Novo (De regering zetelt in Cotonou.)
- bijzonder-BOL | onderzocht | 2 rollen: grondwettelijke hoofdstad Sucre (CPE art. 6.I); regeringszetel La Paz (Declaracion Camaral 386/2022-2023 van de Senaat, "Sede de Gobierno"; beperking: considerando van een eerbetoonverklaring, scan deels slecht leesbaar)
- bijzonder-CIV | onderzocht | 1 rol: politieke hoofdstad Yamoussoukro (Direction Generale de l'Economie, "Political capital"); niet omzetten naar een algemene of bestuurlijke hoofdstad. Abidjan: economische hoofdstad, alleen uitleg
- bijzonder-IDN | nog onbeslist | geen rol met een vraag: Jakarta blijft onzeker (zie rol-open-IDN-hoofdstad). TU: Jakarta
- bijzonder-ISR | onderzocht | geen gevraagde rol (T1 §3.6); de hoofdstad is omstreden, alleen uitleg volgens [bron]
- bijzonder-LKA | nog onbeslist | geen rol met een vraag. Bronnotitie: parlement gevestigd in Sri Jayewardenepura Kotte (parliament.lk, How to Get Here); dat is geen hoofdstadrol (zie rol-open-LKA-hoofdstad)
- bijzonder-MYS | nog onbeslist | 1 rol: bestuurlijke hoofdstad Putrajaya met het label federaal bestuurscentrum (Jabatan Audit Negara 2021, "Federal Government Administrative Centre"; de bron zegt niet letterlijk administratieve hoofdstad). Kuala Lumpur gedeeltelijk bewezen (zie rol-open-MYS-hoofdstad)
- bijzonder-NLD | nog onbeslist | 1 rol: hoofdstad Amsterdam (Grondwet art. 32). Regeringszetel Den Haag niet aangetoond (zie rol-open-NLD-regeringszetel)
- bijzonder-NRU | nog onbeslist | geen rol met een vraag: regeringszetel Yaren niet aangetoond (zie rol-open-NRU-regeringszetel)
- bijzonder-SWZ | nog onbeslist | geen rol met een vraag. Bronnotitie: parlement gevestigd in Lobamba (parliament.gov.sz); dat is geen hoofdstadrol. Mbabane niet aangetoond (zie rol-open-SWZ-bestuurlijkehoofdstad en rol-open-SWZ-wetgevendehoofdstad)
- bijzonder-ZAF | onderzocht | 3 rollen: bestuurlijke hoofdstad Pretoria, wetgevende hoofdstad Kaapstad, gerechtelijke hoofdstad Bloemfontein (DIRCO, South Africa in brief, met de letterlijke termen; aanvullend Grondwet s. 42(6) en Superior Courts Act s. 5(1)(b)). Johannesburg (Constitutional Court): alleen uitleg

### Open rollen van de bijzondere gevallen (optie A: geen vraag zolang de rol niet officieel aantoonbaar is)

- rol-open-BDI-hoofdstad | nog onbeslist | politieke hoofdstad Gitega gedeeltelijk: Loi n°1/04 du 04 fevrier 2019 alleen genoemd in een organieke wet uit 2020 (FAOLEX); de wettekst zelf is niet gevonden
- rol-open-IDN-hoofdstad | nog onbeslist | Jakarta onzeker op de peildatum: MK-uitspraak mei 2026 (Jakarta tot de Keppres verschijnt); mkri.id niet leesbaar, geen Keppres gevonden. Vlag onzeker
- rol-open-LKA-hoofdstad | nog onbeslist | officiële hoofdstad Sri Jayewardenepura Kotte niet aangetoond: de officiële bron noemt alleen de zetel van het parlement; parlementszetel staat niet in de vaste rollenlijst
- rol-open-MYS-hoofdstad | nog onbeslist | Kuala Lumpur gedeeltelijk: Federal Capital Act 1960 (Act 190) staat in de wetgevingslijst van DBKL, de tekst is niet gelezen; alleen het wetsontwerp noemt KL de Federal Capital
- rol-open-NLD-regeringszetel | nog onbeslist | Den Haag niet aangetoond als regeringszetel: geen wet en geen officiële publicatie met die term gevonden (optie A)
- rol-open-NRU-regeringszetel | nog onbeslist | Yaren niet aangetoond: geen officiële Nauruaanse publicatie gevonden (optie A)
- rol-open-SWZ-bestuurlijkehoofdstad | nog onbeslist | Mbabane niet aangetoond: gov.sz Vital Statistics niet leesbaar (robots), geen andere officiële tekst (optie A)
- rol-open-SWZ-wetgevendehoofdstad | nog onbeslist | Lobamba niet aangetoond als wetgevende hoofdstad: de officiële bron noemt alleen de zetel van het parlement

### Onderzocht of bevestigd

- ingekort-hoofdstad-CHN | onderzocht | de leesfunctie gaf de opmerking bij Peking ingekort (over het gebruik van Beijing). De hoofdstad zelf is niet onzeker; de volledige opmerking volgt bij de uitleg
- ingekort-hoofdstad-ISR | onderzocht | de opmerking over de omstreden status van Jeruzalem is ingekort; Israel is een bijzonder geval zonder gevraagde rol (T1 §3.6)
- ingekort-naam-FSM | onderzocht | de opmerking bij Micronesie (verwarring met de eilandengroep) is ingekort; de naam zelf is niet onzeker
- naam-wc-BHS | onderzocht | alleen het teken van de apostrof verschilt (TU recht, WC gekruld)
- naam-wc-COD | onderzocht | WC: Congo (DRC); getoond wordt Congo-Kinshasa (besluit bij naam-dubbel-COG-COD)
- naam-wc-COG | onderzocht | WC: Congo; getoond wordt Congo-Brazzaville (besluit bij naam-dubbel-COG-COD)
- naam-wc-MDV | bevestigd verschil | WC: Maldiven; TU noemt Malediven de meest gebruikte vorm. TU is primair
- naam-wc-NRU | bevestigd verschil | WC: Nauru; de Nederlandse naam volgens de TU is Naoero. TU is primair
- werelddeel-wc-CYP | bevestigd verschil | WC zet Cyprus bij Europa, M49 bij Azie (West-Azie). M49 is primair (plan §0.2); Cyprus komt ook in de modus Europa
- hoofdstad-wc-GNQ | bevestigd verschil | TU: Ciudad de la Paz; WC: Malabo. Ciudad de la Paz is bij decreet van januari 2026 tot hoofdstad verklaard (nieuwsberichten, o.a. africanews 5-1-2026); de verplaatsing van de overheidsdiensten mocht nog tot een jaar duren. Besluit GPT 17-11-2026: blijft voorlopig een gewone TU-hoofdstad (telt mee bij de 182) met de markering teVerifieren; wettelijke hoofdstad en feitelijke regeringszetel worden nagekeken met OV in de deelstap van de bijzondere gevallen. Ronde 2 (17-11-2026): geen officiële tekst van de decreet-wet gevonden, alleen nieuws (EFE: nueva capital administrativa); feitelijke regeringszetel onbekend. Ciudad de la Paz en teVerifieren blijven; geen 13e bijzonder geval

### Hoofdsteden: WC geeft de Engelse schrijfwijze (zelfde stad)

- hoofdstad-wc-ARM | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Yerevan), de TU de Nederlandse (Jerevan)
- hoofdstad-wc-AUT | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Vienna), de TU de Nederlandse (Wenen)
- hoofdstad-wc-AZE | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Baku), de TU de Nederlandse (Bakoe)
- hoofdstad-wc-BEL | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Brussels), de TU de Nederlandse (Brussel)
- hoofdstad-wc-CHN | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Beijing), de TU de Nederlandse (Peking)
- hoofdstad-wc-CZE | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Prague), de TU de Nederlandse (Praag)
- hoofdstad-wc-DEU | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Berlin), de TU de Nederlandse (Berlijn)
- hoofdstad-wc-DNK | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Copenhagen), de TU de Nederlandse (Kopenhagen)
- hoofdstad-wc-ETH | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Addis Ababa), de TU de Nederlandse (Addis Abeba)
- hoofdstad-wc-FRA | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Paris), de TU de Nederlandse (Parijs)
- hoofdstad-wc-GBR | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (London), de TU de Nederlandse (Londen)
- hoofdstad-wc-GRC | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Athens), de TU de Nederlandse (Athene)
- hoofdstad-wc-GRD | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (St. George's), de TU de Nederlandse (Saint George's)
- hoofdstad-wc-GTM | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Guatemala City), de TU de Nederlandse (Guatemala-Stad)
- hoofdstad-wc-HUN | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Budapest), de TU de Nederlandse (Boedapest)
- hoofdstad-wc-IRN | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Tehran), de TU de Nederlandse (Teheran)
- hoofdstad-wc-IRQ | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Baghdad), de TU de Nederlandse (Bagdad)
- hoofdstad-wc-JPN | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Tokyo), de TU de Nederlandse (Tokio)
- hoofdstad-wc-KGZ | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Bishkek), de TU de Nederlandse (Bisjkek)
- hoofdstad-wc-KIR | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (South Tarawa), de TU de Nederlandse (Tarawa)
- hoofdstad-wc-KWT | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Kuwait City), de TU de Nederlandse (Koeweit)
- hoofdstad-wc-LBN | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Beirut), de TU de Nederlandse (Beiroet)
- hoofdstad-wc-LUX | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Luxembourg), de TU de Nederlandse (Luxemburg)
- hoofdstad-wc-MEX | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Mexico City), de TU de Nederlandse (Mexico-Stad)
- hoofdstad-wc-MNG | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Ulan Bator), de TU de Nederlandse (Ulaanbaatar)
- hoofdstad-wc-PAN | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Panama City), de TU de Nederlandse (Panama-Stad)
- hoofdstad-wc-PHL | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Manila), de TU de Nederlandse (Manilla)
- hoofdstad-wc-POL | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Warsaw), de TU de Nederlandse (Warschau)
- hoofdstad-wc-PRT | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Lisbon), de TU de Nederlandse (Lissabon)
- hoofdstad-wc-ROU | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Bucharest), de TU de Nederlandse (Boekarest)
- hoofdstad-wc-RUS | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Moscow), de TU de Nederlandse (Moskou)
- hoofdstad-wc-SAU | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Riyadh), de TU de Nederlandse (Riyad)
- hoofdstad-wc-SDN | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Khartoum), de TU de Nederlandse (Khartoem)
- hoofdstad-wc-SMR | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (City of San Marino), de TU de Nederlandse (San Marino)
- hoofdstad-wc-SRB | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Belgrade), de TU de Nederlandse (Belgrado)
- hoofdstad-wc-TJK | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Dushanbe), de TU de Nederlandse (Doesjanbe)
- hoofdstad-wc-TKM | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Ashgabat), de TU de Nederlandse (Asjchabad)
- hoofdstad-wc-USA | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Washington D.C.), de TU de Nederlandse (Washington)
- hoofdstad-wc-UZB | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Tashkent), de TU de Nederlandse (Tasjkent)
- hoofdstad-wc-VAT | onderzocht | zelfde stad; WC geeft de Engelse schrijfwijze (Vatican City), de TU de Nederlandse (Vaticaanstad)

## Nederlandse steden (T2b-1 D6; CBS Bevolkingskernen 2021, peildatum 1-1-2021)

De ids komen uit AFWIJKINGEN_STEDEN in items/steden-nl.js; tools/topo/test-steden-nl.mjs controleert ze. Besluiten GPT 17-11-2026 (D6-a, D6-c, D6-d, D6-e tot D6-h).

- steden-beperking-inwoners | onderzocht | het inwonertal is dat van de CBS-bevolkingskern (aaneengesloten bebouwd gebied met woongebied), niet dat van de gemeente of van een woonplaats; afgerond op vijftallen. Bij elke stad vastgelegd
- steden-grootkernen | onderzocht | 15 Groot-kernen: de kern omvat meerdere plaatsen; inwonertal en vlak gelden voor de hele kern. Weergavenaam = de hoofdplaats uit de CBS-naam (Sittard-Geleen: beide), met de vlag grootKern; CBS-naam en kernnummer bewaard. Samenstelling alleen met een officiele bron (nu alleen Den Haag)
- steden-niet-als-kern | onderzocht | Delft, Schiedam, Amstelveen en Zaandam komen niet als kernnaam voor. Alleen voor Delft noemt de CBS-toelichting de kern (Groot - 's-Gravenhage); voor de andere is dat niet aangetoond. Geen eigen record, geen geografische aanname op basis van de naam
- steden-naam-almere | onderzocht | weergavenaam Almere (Claude 24-11-2026, T3, wijzigt D6-d): de naam van de woonplaats; de CBS-kern Almere-Stad/Almere-Buiten is het grootste deel ervan, Almere-Haven is een aparte kern; de CBS-naam blijft in cbsNaam
- steden-naam-ijmond | onderzocht | weergavenaam = CBS-naam IJmond, een regionaam; geen hoofdplaats verzonnen (besluit D6-d). Claude 24-11-2026 (T3): geen woonplaats, dus niet gevraagd in nb06; blijft als stip op de kaart
- steden-naam-sittard-geleen | onderzocht | Groot - Sittard-Geleen: weergavenaam Sittard-Geleen, beide plaatsen behouden (besluit D6-d)
- steden-naam-lelystad | onderzocht | weergavenaam Lelystad; CBS-naam Lelystad-Kern bewaard (besluit D6-d)
- steden-naam-middelburg | onderzocht | weergavenaam Middelburg; CBS-naam Middelburg (Z.) bewaard (besluit D6-d)
- steden-notitie-arnhem | onderzocht | Arnhem-Zuid (BK01057, 77.110 inwoners) is een aparte CBS-kern: geen eigen record, alleen een bronnotitie bij Arnhem. 113.565 is dus niet het inwonertal van de stad Arnhem (besluit D6-d)
- steden-provinciehoofdstad-geen-rol | nog onbeslist | provinciehoofdstad is hier alleen een selectiereden (lijst T1 §2.1), geen bewezen rol. De relatie provinciehoofdstad-van, met een bron per feit, komt in een latere stap (besluit D6-g)
- steden-bestandsdatum | onderzocht | het GeoPackage heeft als bestands- of wijzigingsdatum 25-08-2025 (gpkg_contents.last_change), later dan de toelichting (21-3-2024) en het erratum (3-6-2024); wat toen veranderde, staat niet in de bron. De peildatum blijft 1-1-2021
- steden-onderdrukt | onderzocht | 3 kernen met de onderdrukte waarde -99997 (BK02922, BK02958, BK02998), niet als inwonertal gebruikt; alle drie buiten de selectie

## Nederland en België, basisgegevens (T2b-2 fase 6.2, deel 1)

- nlbe-refnis-2019 | onderzocht | Statbel REFNIS: de laatste wijziging in het bestand is van 2019-01-01; de fusies van Vlaamse gemeenten op 1-1-2025 staan er niet in (581 gemeenten geldig op 1-1-2026 volgens het bestand). Gebruikt op 2026-01-01; geen gevolg voor de 3 gewesten, de 10 provincies en de 11 steden
- nlbe-sectoren-2022 | onderzocht | Statbel, statistische sectoren: situatie 2024-01-01, gemeentegrenzen 2022 (A3: de peildatum van het eigen bronbestand)
- nlbe-provincie-gegeneraliseerd | onderzocht | CBS Gebiedsindelingen 2026: de provincielaag bestaat alleen gegeneraliseerd; de gemeentelaag ook niet gegeneraliseerd; de provincievlakken zijn de officiele gegeneraliseerde laag
- nlbe-peildata-h1 | onderzocht | H1: de provincie van een hoofdstad komt uit de CBS-kern (2021-01-01) en is gecontroleerd tegen het provincievlak van CBS Gebiedsindelingen 2026 (A3: beide versies in de afleiding); alle 12 komen overeen
- nlbe-r2-regeringszetel-nl | onderzocht | R2 Den Haag, regeringszetel van Nederland: niet aangetoond; geen wet en geen officiele publicatie gevonden (T2b-1, ongewijzigd). Geen relatie, geen vraag
- nlbe-r8-hoofdstad-bhg | onderzocht | R8 hoofdstad van het Brussels Hoofdstedelijk Gewest: niet aangetoond; geen handeling gevonden die het Brussels Hoofdstedelijk Gewest een hoofdstad geeft (A6 R8). Geen relatie, geen vraag
- nlbe-r7-vlaamse-gemeenschap | onderzocht | R7 Brussel, hoofdstad van de Vlaamse Gemeenschap: bewezen (Vlaamse overheid), GPT 18-11-2026 K1 c: bewezen, maar zonder item en relatie in fase 6.2; volgt in 6.4 met de gemeenschappen. Brussel ligt niet in het Vlaamse Gewest (H2 a)
- nlbe-naam-limburg | nog onbeslist | Twee provincies met de voorkeursnaam Limburg (prov-be-70000, prov-nl-pv31): de namen zijn uniek per soort en land, niet per soort alleen (plan v2 par. 5.7); te beslissen hoe een vraag ze onderscheidt
- nlbe-ne-kenmerken-hasselt | bevestigd verschil | Natural Earth (ne_id 1159120339): de kenmerken longitude/latitude (5.483998, 50.964003) liggen 10.9 km van de geometrie (5.338536, 50.928838); de geometrie is leidend (GPT 18-11-2026)

## Nederland en België, basisgegevens (T2b-2 fase 6.2, deel 2)

- nlbe-w1-noordzee-waddenzee | onderzocht | W1: de grens met de Waddenzee is niet betrouwbaar; het vlak omvat mogelijk water dat geografisch tot de Waddenzee behoort. Geen aanwijsvraag voordat de waterronde (6.4) die grens met een officiele bron vastlegt. Gemeten: het NE-vlak North Sea omvat het water bij Lauwersoog en voor de Groninger kust; het NE-vlak Waddenzee houdt op bij lengte 6,09 (bouwplan v2 par. 7)
- nlbe-w2-ne-rivieren | nog onbeslist | W2, geconstateerd en nog nader te onderzoeken: Natural Earth knipt de rivieren anders dan de Nederlandse indeling; het stuk Rhine loopt tot lengte 4,99 (bij Gorinchem), het stuk Waal begint daar. Vastgesteld in de brondata (omhullende), nog niet op een kaart nagekeken; aandachtspunt voor 6.3 en 6.4
- nlbe-namen-woordenlijst | onderzocht | D1 b: Waal, Nederrijn, Lek, IJssel, Maas en Waddeneilanden staan niet bij de Taalunie (die noemt alleen exoniemen) en hebben de naam als besluit (T1 par. 2.1); de Woordenlijst was niet toegankelijk vanuit de bouwomgeving, dus niet vastgesteld of ze daar staan. Rijn en Noordzee: Taalunie, Overige namen (Europa)
- nlbe-eilanden-kleine-delen | onderzocht | Waddeneilanden: het eilandvlak is het grootste component van de CBS-gemeente; de kleinere delen (Texel 12, Vlieland 4, Terschelling 11, Ameland 3, Schiermonnikoog 2, onder andere Griend en Noorderhaaks) horen niet bij het eiland en volgen eventueel in Gevorderd

## Nederland en België, kaarten (T2b-2 fase 6.3)

- nlbe-grens-zandvliet-berendrecht | bevestigd verschil | G1 b (GPT 18-11-2026): CBS (gemeentegrens, ook niet gegeneraliseerd) en Statbel (sectoren 2024) leggen de grens NL-BE bij Zandvliet en Berendrecht tot 1,15 km uit elkaar (gemeten om de 10 m; mediaan elders 0,2 m). Welke bron de officiele grens volgt, is niet vastgesteld; geen verdrag gevonden. Zone 4,200-4,275 O en 51,345-51,390 N (tools/topo/kaarten/nlbe.json, grensMelden): de afstand NL-BE wordt daar gemeld, niet getoetst
- nlbe-grens-zwin | bevestigd verschil | CBS (gemeente, niet gegeneraliseerd; de gegeneraliseerde provincie ligt gelijk) en Statbel leggen de grens NL-BE langs het Zwin anders: tot 0,6 km bij de geul en de monding, tot 220 m 1,5 km landinwaarts, daartussen rond 51 m (V3 a en b; de zuidelijke uitloop was een randeffect, de kust telt niet). Een aaneengesloten grensstuk, dus een zone: 3,36-3,38 O en 51,345-51,38 N (tools/topo/kaarten/nlbe.json, grensMelden); de afstand wordt daar gemeld, niet getoetst; overlap en gaten per stuk blijven getoetst
- nlbe-grens-vaals | bevestigd verschil | CBS (provincie gegeneraliseerd en gemeente niet gegeneraliseerd liggen gelijk) en Statbel leggen de grens NL-BE bij Vaals, vlak bij het Drielandenpunt, 187 tot 221 m uit elkaar. Zone 6,01-6,03 O en 50,745-50,765 N (tools/topo/kaarten/nlbe.json, grensMelden); de afstand wordt daar gemeld, niet getoetst
- kaarten-t2a-code-herhaling | onderzocht | maak-kaarten.mjs herhaalt de projectie, de afronding en het pad van maak-proefkaarten.mjs (T2a): dat bestand exporteert niets, draait bij het importeren en mag niet wijzigen. Dezelfde regels, per kaart de tolerantie en afronding uit de configuratie
- kaarten-methode-6-3 | onderzocht | Afwijkingen van de T2a-methode in 6.3: het gewicht van de vereenvoudiging per boog (niet een gewicht per kaart); punten bij de grens NL-BE niet vereenvoudigd, alleen afgerond (grensBehoud, 2 px bij x8); de naaldregel na een merge (exact heen en terug, geen tolerantie; op de bronnen van nlbe 0 naalden); de vlakbewerkingen van de grensmeting met Clipper (clipper-lib 6.4.2, gehele honderdsten, gelijk-oneven) in plaats van polygon-clipping, dat op deze geometrie vastliep; geen ring weglaten na het afronden (een samengevallen ring blijft als afgeronde oorspronkelijke ring, zonder oppervlakte; op nlbe 141 dunne strookjes uit de samenvoeging van de CBS-gemeenten)
- nlbe-omvang | nog onbeslist | nlbe is 2,9 MB, gzip 628 kB, boven het projectdoel van 40 kB (T2 par. 5, B11 a): de niet-gegeneraliseerde CBS-gemeenten (V4 b) en de Statbel-sectoren bij 0,5 px bij x8 (optie a). Gemeld met een voorstel in het bouwrapport van 6.3. T3a (20-11-2026): het bestand met gedeelde bogen (elke grens een keer; uitgepakt byte-gelijk) is 1,55 MB, gzip 388 kB; nog steeds boven het doel
- europa-regiokaarten | onderzocht | Op de overzichtskaart Europa waren 19 van de 50 landen niet binnen x4 tikbaar op 428 px. Eerst regiokaarten (6.3 deel 2); na de iPhone-proef (Dick, 19-11-2026: niet overzichtelijk) een kaart Europa met alle 50 landen en vier startbeelden (west, zuidoost, noordoost, Kaukasus): een doel met een startbeeld opent daar ingezoomd en is vanaf dat beeld binnen x4 tikbaar (alle 50 gemeten, 428 px). Tolerantie 0,5 px bij x4 (dieper zoomen), bewuste afwijking van T2a; de meting per startbeeld met een beeldhoogte van 560 px en alleen de doelen die in beeld kunnen komen

## Nederland en België, T5b

- nlbe-grens-gm1979 | nog onbeslist | Eemsdelta (GM1979): 8850 m buitengrens binnen de zoekafstand van Duitsland, niet opgenomen. Claude 25-11-2026: de buitengrens van Eemsdelta bij Duitsland ligt alleen in het water van de Eems; daar hebben Nederland en Duitsland de grens niet vastgelegd (Eems-Dollardverdrag 1960). Geen landgrens, dus geen grensgemeente; een onzeker gegeven komt niet in een vraag (T1 par. 1.3). Open punt
