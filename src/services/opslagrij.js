// Opslagrij per gebruiker (plan IN, fase IN-1, §3e): de volgende opslag pas als de vorige klaar is.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Elke opslag neemt alle openstaande bewerkingen mee (de transactie herbouwt uit de wachtrijen), dus een
// verzoek dat binnenkomt terwijl er een opslag loopt, wordt samengevoegd: er volgt nog precies één ronde.
// Na een geslaagde ronde ruimt de eigen plek op wat de server bevestigd heeft.

// opties: { slaOp(uid) -> Promise<stand>, plek, naOpslag(stand), naFout(fout) }
export function maakOpslagrij(opties) {
  var rijen = {};

  function rij(uid) {
    if (!rijen[uid]) rijen[uid] = { loopt: null, nogEens: false };
    return rijen[uid];
  }

  // Een fout melden; een fout in de melding zelf mag de rij niet blokkeren
  function meld(uid, fout) {
    try { opties.naFout(uid, fout); } catch (e) {}
  }

  function ronde(uid) {
    var r = rij(uid);
    r.nogEens = false;
    // Altijd aan het eind van een ronde, wat er ook misging: de rij vrijgeven
    function klaar(ok) {
      r.loopt = null;
      // Kwam er tijdens deze ronde een nieuw verzoek, dan nog één ronde (ook na een fout: er is nieuw werk)
      if (r.nogEens) return ronde(uid);
      return ok;
    }
    r.loopt = Promise.resolve()
      .then(function() { return opties.slaOp(uid); })
      .then(function(stand) {
        // De opslag is gelukt; mislukt daarna het opruimen of de afhandeling (bijvoorbeeld setItem), dan
        // blokkeert dat de rij niet. De server kent de bewerkingen al (toegepastTot), dus een volgende ronde
        // telt niets dubbel en ruimt alsnog op.
        try {
          opties.plek.ruimOp((stand.toegepastTot && stand.toegepastTot[opties.plek.schrijver()]) || 0);
        } catch (e) {
          meld(uid, e);
        }
        try {
          opties.naOpslag(uid, stand);
        } catch (e2) {
          meld(uid, e2);
        }
        return true;
      }, function(fout) {
        meld(uid, fout);
        return false;
      })
      .then(klaar, function() { return klaar(false); });
    return r.loopt;
  }

  // Een opslag aanvragen; geeft een belofte die klaar is als de rij voor deze uid leeg is
  function vraag(uid) {
    var r = rij(uid);
    if (r.loopt) { r.nogEens = true; return r.loopt; }
    return ronde(uid);
  }

  return { vraag: vraag };
}
