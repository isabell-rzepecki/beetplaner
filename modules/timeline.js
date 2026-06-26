// Timeline-Berechnung: Aussaat-, Pflanz-, Ernte-Fenster + Düngecheck-Erinnerungen
const Timeline = (() => {

  // Wandelt "MM-DD" + Jahr in Date-Objekt
  function mmDDzuDatum(mmDD, jahr) {
    const [monat, tag] = mmDD.split('-').map(Number);
    return new Date(jahr, monat - 1, tag);
  }

  // Gibt alle Termine für zugeteilte Kulturen zurück
  function berechneTermine(beete, aktuellesJahr) {
    const termine = [];

    for (const beet of beete) {
      // Aktuelle Kulturen (nur aktuelles Jahr)
      const aktuelleHistorie = beet.historie.filter(h => h.jahr === aktuellesJahr);

      for (const eintrag of aktuelleHistorie) {
        const kultur = KULTUREN_DB.find(k => k.name === eintrag.kultur);
        if (!kultur) continue;

        if (kultur.aussaatfenster) {
          termine.push({
            typ: 'aussaat', beetId: beet.id, beetName: beet.name, kultur: eintrag.kultur,
            start: mmDDzuDatum(kultur.aussaatfenster.start, aktuellesJahr),
            ende: mmDDzuDatum(kultur.aussaatfenster.ende, aktuellesJahr),
            label: `Aussaat ${eintrag.kultur}`, farbe: '#4CAF50'
          });
        }
        if (kultur.pflanzfenster) {
          termine.push({
            typ: 'pflanzung', beetId: beet.id, beetName: beet.name, kultur: eintrag.kultur,
            start: mmDDzuDatum(kultur.pflanzfenster.start, aktuellesJahr),
            ende: mmDDzuDatum(kultur.pflanzfenster.ende, aktuellesJahr),
            label: `Pflanzung ${eintrag.kultur}`, farbe: '#2196F3'
          });
        }
        if (kultur.erntefenster) {
          termine.push({
            typ: 'ernte', beetId: beet.id, beetName: beet.name, kultur: eintrag.kultur,
            start: mmDDzuDatum(kultur.erntefenster.start, aktuellesJahr),
            ende: mmDDzuDatum(kultur.erntefenster.ende, aktuellesJahr),
            label: `Ernte ${eintrag.kultur}`, farbe: '#FF9800'
          });
        }

        // Düngecheck: wann ist die Wirkung abgelaufen?
        for (const duengung of eintrag.duengung) {
          const duengerInfo = DUENGER_DB.find(d => d.typ === duengung.typ);
          if (!duengerInfo) continue;
          const duengDatum = new Date(duengung.datum);
          const wirkungsEnde = new Date(duengDatum);
          wirkungsEnde.setMonth(wirkungsEnde.getMonth() + duengerInfo.wirkungsdauerMonate);
          termine.push({
            typ: 'duengecheck', beetId: beet.id, beetName: beet.name, kultur: eintrag.kultur,
            start: wirkungsEnde, ende: wirkungsEnde,
            label: `Dünger ${duengung.typ} abgelaufen → Nachdüngung prüfen`,
            farbe: '#9C27B0', duengerTyp: duengung.typ
          });
        }
      }
    }

    return termine.sort((a, b) => a.start - b.start);
  }

  // Was steht in den nächsten N Tagen an?
  function naechsteTermine(beete, aktuellesJahr, tageVorausschau = 14) {
    const heute = new Date();
    heute.setHours(0, 0, 0, 0);
    const bis = new Date(heute);
    bis.setDate(bis.getDate() + tageVorausschau);

    const alle = berechneTermine(beete, aktuellesJahr);
    return alle.filter(t => t.start >= heute && t.start <= bis);
  }

  // Prüft ob eine Kultur frostempfindlich ist (anhand Pflanzfenster nach Eisheiligen)
  function istFrostempfindlich(kulturName) {
    const kultur = KULTUREN_DB.find(k => k.name === kulturName);
    if (!kultur || !kultur.pflanzfenster) return false;
    const [monat] = kultur.pflanzfenster.start.split('-').map(Number);
    return monat >= 5; // Kulturen die erst ab Mai gepflanzt werden
  }

  // Monate-Array für Timeline-Darstellung
  function erzeugeMonatsbalken(startMonat, endMonat, aktuellesJahr) {
    const monate = [];
    for (let m = startMonat; m <= endMonat; m++) {
      monate.push({
        monat: m,
        name: new Date(aktuellesJahr, m - 1, 1).toLocaleString('de-DE', { month: 'long' }),
        tage: new Date(aktuellesJahr, m, 0).getDate()
      });
    }
    return monate;
  }

  return { berechneTermine, naechsteTermine, istFrostempfindlich, erzeugeMonatsbalken, mmDDzuDatum };
})();
