// Opslagrij (plan IN, fase IN-1 §3e, fase IN-2 §22.4): de volgende opslag pas als de vorige klaar is.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Elke opslag neemt alle openstaande bewerkingen mee (de transactie herbouwt uit de wachtrijen), dus een
// verzoek dat binnenkomt terwijl er een opslag loopt, wordt samengevoegd: er volgt nog precies één ronde.
// Na een geslaagde ronde ruimt de eigen plek op wat de server bevestigd heeft.
//
// Een ronde heeft een vaste identiteit id = { u, sessie } (u = de uid, sessie = een teller in het geheugen van
// de app). Er is een rij per u + "#" + sessie. De identiteit gaat mee naar elke vervolgactie; die controleert
// zelf of hij nog geldt (opties.geldt(id)). De gegevens zelf staan in localStorage, per uid; de sessie staat
// daar nooit in.

// opties: { slaOp(id) -> Promise<stand>, plek, geldt(id) -> boolean, naOpslag(id, stand), naFout(id, fout) }
export function maakOpslagrij(opties) {
  var rijen = {};

  function sleutel(id) { return id.u + "#" + id.sessie; }
  function rij(id) {
    var k = sleutel(id);
    if (!rijen[k]) rijen[k] = { loopt: null, nogEens: false };
    return rijen[k];
  }

  // Een fout melden; een fout in de melding zelf mag de rij niet blokkeren
  function meld(id, fout) {
    try { opties.naFout(id, fout); } catch (e) {}
  }

  function ronde(id) {
    var r = rij(id);
    r.nogEens = false;
    // Altijd aan het eind van een ronde, wat er ook misging: de rij vrijgeven
    function klaar(ok) {
      r.loopt = null;
      // Kwam er tijdens deze ronde een nieuw verzoek, dan nog één ronde (ook na een fout: er is nieuw werk)
      if (r.nogEens) return ronde(id);
      return ok;
    }
    r.loopt = Promise.resolve()
      .then(function() { return opties.slaOp(id); })
      .then(function(stand) {
        // De opslag is gelukt; opruimen en afhandelen alleen als de identiteit nog geldt. Mislukt dat (bijvoorbeeld
        // setItem), dan blokkeert dat de rij niet: de server kent de bewerkingen al (toegepastTot).
        try {
          if (opties.geldt(id)) opties.plek.ruimOp(stand.toegepastTot || {}, id.u);
        } catch (e) {
          meld(id, e);
        }
        try {
          opties.naOpslag(id, stand);
        } catch (e2) {
          meld(id, e2);
        }
        return true;
      }, function(fout) {
        meld(id, fout);
        return false;
      })
      .then(klaar, function() { return klaar(false); });
    return r.loopt;
  }

  // Een opslag aanvragen; geeft een belofte die klaar is als de rij voor deze identiteit leeg is
  function vraag(id) {
    var r = rij(id);
    if (r.loopt) { r.nogEens = true; return r.loopt; }
    return ronde(id);
  }

  return { vraag: vraag };
}
