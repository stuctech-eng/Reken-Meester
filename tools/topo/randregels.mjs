// Regels voor de indeling van randen (plan T2b §3.4 v1.3). Gebruikt door bereken-randen.mjs; los getest in test-randen.mjs.
// Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.

// Ligt elk punt van het lijnstuk ab binnen t van de rand? Alleen "ja" als dat bewezen is.
//
// Geometrie: een lijnstuk is een RECHTE lijn in lengte en breedte (zoals Natural Earth het bedoelt en de kaart het tekent),
// geparametriseerd als q(s) = a + s (b - a), 0 <= s <= 1. Halveren = s = 1/2, het rekenkundige midden; dat is precies het
// midden van deze parametrisering, dus beide helften zijn weer rechte lijnen van dezelfde soort.
// "Afstand" is de werkelijke afstand over het aardoppervlak tot de rand (de rand ook als rechte lijnen in lengte en breedte).
//
// Bewijs, met twee door de aanroeper geleverde grootheden:
// - lengteBoven(a, b) >= de snelheid |dq/ds| in km over het hele stuk (dus ook >= de werkelijke lengte van de lijn).
//   Een punt q(s) met s <= 1/2 ligt dan langs de lijn hoogstens s * lengteBoven <= lengteBoven / 2 van a; voor s >= 1/2 net
//   zo van b. De werkelijke afstand is 1-Lipschitz (driehoeksongelijkheid), dus voor ELK punt van het stuk:
//       d(q) <= max(d(a), d(b)) + lengteBoven / 2.
// - factor >= 1: de gemeten afstand afst(p) is hoogstens factor keer te klein: d(p) <= factor * afst(p).
// Samen: d(q) <= factor * max(da, db) + lengteBoven / 2 voor elk punt q. Dat is de bovengrens.
// - Bovengrens <= t: het hele (deel)stuk ligt bewezen binnen t.
// - Anders halveren; BEIDE helften moeten de bovengrens halen.
// - Gemeten middelpunt verder dan t: niet bewezen ("nee"; conservatief).
// - Deelstuk korter dan minStuk zonder dat de bovengrens geldt: niet bewezen ("nee").
// "nee" betekent voor de indeling altijd: geen kust, dus onbekende rand.
export function bewijsBinnen(afst, lengteBoven, a, b, da, db, t, minStuk, factor, tel) {
  var L = lengteBoven(a, b);
  if (factor * Math.max(da, db) + L / 2 <= t) { if (tel) tel.bewezenDeelstukken++; return true; }
  if (L < minStuk) { if (tel) tel.grensBereikt++; return false; }
  var m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], dm = afst(m);
  if (tel) tel.halveringen++;
  if (dm > t) { if (tel) tel.puntBuitenT++; return false; }
  return bewijsBinnen(afst, lengteBoven, a, m, da, dm, t, minStuk, factor, tel) && bewijsBinnen(afst, lengteBoven, m, b, dm, db, t, minStuk, factor, tel);
}

// Grootheden voor het bewijs op de aarde (lijnen recht in lengte en breedte; afstand over het aardoppervlak, WGS84).
// Een graad is hoogstens 111,70 km in noord-zuid (110,57 aan de evenaar, 111,69 aan de pool) en hoogstens 111,70 * cos(breedte)
// km in oost-west (111,32 * cos(breedte) / wortel(1 - e2 sin2(breedte)) <= 111,70 * cos(breedte)).
export var KM_GRAAD_MAX = 111.70;
// bovengrens voor de snelheid |dq/ds| langs de rechte lijn ab: de grootste schaal, op de laagste breedte van het stuk
// (langs een rechte lijn verloopt de breedte lineair, dus de laagste |breedte| ligt in een eindpunt, of is 0 bij de evenaar)
export function lengteBoven(a, b) {
  var laagste = (a[1] > 0) !== (b[1] > 0) ? 0 : Math.min(Math.abs(a[1]), Math.abs(b[1]));
  var dx = (b[0] - a[0]) * KM_GRAAD_MAX * Math.cos(laagste * Math.PI / 180), dy = (b[1] - a[1]) * KM_GRAAD_MAX;
  return Math.hypot(dx, dy);
}
// De gemeten afstand (bereken-randen.mjs, afstand) rekent met 111,32 * cos(breedte van p) en 110,57 km per graad naar het
// dichtstbijzijnde punt x van de rand. De werkelijke afstand is hoogstens de lengte van de rechte lijn p-x, en die is
// hoogstens 111,70 / 110,57 = 1,0102 keer de gemeten waarde in noord-zuid. In oost-west verandert de breedte over een gemeten
// afstand van hoogstens 0,5 km met hoogstens 0,5 / 110,57 = 0,00452 graad; tot 87 graden verandert cos daardoor hoogstens met
// een factor cos(87 - 0,00452) / cos(87) = 1,00151. Samen hoogstens 111,70 / 110,57 x 1,00151 = 1,01175 <= 1,012.
// Een rand die de zoekindex mist, maakt de meting alleen groter.
// Afgerond naar boven:
export var AFSTAND_FACTOR = 1.012;

// De soort van een niet-gedeeld lijnstuk, uit de twee bewijzen (wereldzee en Kaspische Zee).
export function randSoort(zeeBewezen, kaspBewezen) {
  if (zeeBewezen && !kaspBewezen) return "zee";
  if (kaspBewezen && !zeeBewezen) return "kaspisch";
  return "onbekend";
}

// landlocked uit de lengtes per randsoort (§3.4): kust aan zee wint; anders blokkeert een onbekende rand de uitspraak.
export function landlockedUitkomst(zeeKm, onbekendKm) {
  if (zeeKm > 0) return "niet";
  if (onbekendKm > 0) return "onbeslist";
  return "landlocked";
}
