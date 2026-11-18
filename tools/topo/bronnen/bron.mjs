// De gemeenschappelijke bronlaag (bouwplan T2b-2 fase 6.1 v1.9, par. 5.4). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
// - een bronbestand openen en de SHA-256 controleren tegen het register in bronnen.json (niets aanvullen);
// - de vaste CRS-definities;
// - de lezers per formaat staan in eigen bestanden (nu alleen lees-gpkg.mjs) en geven de genormaliseerde vorm
//   { crs, records: [{ kenmerken, geom of delen }] }, zodat een maak-script nooit van een bestandsformaat afhangt.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "..", "bronnen.json"), "utf8"));

// EPSG:28992 (Amersfoort / RD New) met de 7-parametertransformatie naar WGS84, zoals EPSG die publiceert
export var CRS = {
  "EPSG:28992": "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs",
  "EPSG:4326": "EPSG:4326"
};

export function sha256(buf) { return crypto.createHash("sha256").update(buf).digest("hex"); }

// opent een bronbestand; bronId en bestand moeten in het register staan, met dezelfde SHA-256
export function openBron(pad, bronId, bestand) {
  var r = BRONNEN.register && BRONNEN.register.ids[bronId];
  if (!r) throw new Error("bron-id niet in het register: " + bronId);
  var verwacht = r.bestanden[bestand];
  if (!verwacht) throw new Error("bestand niet in het register bij " + bronId + ": " + bestand);
  var buf = fs.readFileSync(pad);
  if (sha256(buf) !== verwacht) throw new Error("SHA-256 klopt niet voor " + pad);
  return { buf: buf, sha256: verwacht, bronId: bronId, bestand: bestand };
}
