// Fruchtfolge-Bewertung, Mischkultur-Analyse, Greedy-Zuteilung
const Fruchtfolge = (() => {

  // Berechnet Score für Beet × Kultur-Kombination
  function berechneScore(beet, kulturName, aktuellesJahr) {
    const kultur = KULTUREN_DB.find(k => k.name === kulturName);
    if (!kultur) return { score: 0, gruende: [], warnungen: [] };

    let score = 100;
    const gruende = [];
    const warnungen = [];

    // 1. Sonnenbedarf-Match
    if (kultur.sonnenbedarf === beet.ausrichtung) {
      score += 15;
      gruende.push({ typ: 'bonus', text: `Sonnenbedarf passt zur Beet-Ausrichtung (${beet.ausrichtung})` });
    } else if (
      (kultur.sonnenbedarf === 'sonnig' && beet.ausrichtung === 'schattig') ||
      (kultur.sonnenbedarf === 'schattig' && beet.ausrichtung === 'sonnig')
    ) {
      score -= 25;
      warnungen.push(`Sonnenbedarf passt nicht: Kultur braucht "${kultur.sonnenbedarf}", Beet ist "${beet.ausrichtung}"`);
    } else {
      score -= 5;
      gruende.push({ typ: 'neutral', text: `Sonnenbedarf: Kultur braucht "${kultur.sonnenbedarf}", Beet ist "${beet.ausrichtung}" – akzeptabel` });
    }

    // 2. Familien-Abstand prüfen (letzten N Jahre)
    const pruefjahre = aktuellesJahr - (kultur.mindestabstandJahreGleicheFamilie || 3);
    const vorjahreGleicheFamilie = beet.historie.filter(h =>
      h.jahr >= pruefjahre && h.jahr < aktuellesJahr &&
      h.pflanzenfamilie === kultur.familie
    );

    if (vorjahreGleicheFamilie.length > 0) {
      const letztes = Math.max(...vorjahreGleicheFamilie.map(h => h.jahr));
      const abstand = aktuellesJahr - letztes;
      score -= 40;
      warnungen.push(`Achtung: ${kultur.familie} war vor ${abstand} Jahr${abstand !== 1 ? 'en' : ''} im Beet (Mindestabstand: ${kultur.mindestabstandJahreGleicheFamilie} Jahre)`);
    } else if (beet.historie.length > 0) {
      score += 10;
      gruende.push({ typ: 'bonus', text: `Kein ${kultur.familie}-Anbau in den letzten ${kultur.mindestabstandJahreGleicheFamilie} Jahren` });
    }

    // 3. Vorkultur-Analyse
    const letzterEintrag = beet.historie
      .filter(h => h.jahr < aktuellesJahr)
      .sort((a, b) => b.jahr - a.jahr)[0];

    if (letzterEintrag) {
      if (kultur.guteVorkultur.includes(letzterEintrag.kultur)) {
        score += 20;
        gruende.push({ typ: 'bonus', text: `${letzterEintrag.kultur} (${letzterEintrag.jahr}) ist eine gute Vorkultur` });
      } else if (kultur.schlechteVorkultur.includes(letzterEintrag.kultur)) {
        score -= 30;
        warnungen.push(`${letzterEintrag.kultur} (${letzterEintrag.jahr}) ist eine schlechte Vorkultur für ${kultur.name}`);
      }

      // 4. Zehrer-Sequenz
      const vorKultur = KULTUREN_DB.find(k => k.name === letzterEintrag.kultur);
      if (vorKultur) {
        if (vorKultur.zehrertyp === 'Schwachzehrer' && kultur.zehrertyp === 'Starkzehrer') {
          score += 15;
          gruende.push({ typ: 'bonus', text: `Gute Zehrer-Sequenz: ${vorKultur.zehrertyp} → ${kultur.zehrertyp}` });
        } else if (vorKultur.zehrertyp === 'Starkzehrer' && kultur.zehrertyp === 'Starkzehrer') {
          score -= 20;
          warnungen.push(`Zwei Starkzehrer hintereinander (Bodennährstoffe werden stark beansprucht)`);
        } else if (
          (vorKultur.familie === 'Hülsenfrüchtler') &&
          kultur.zehrertyp === 'Starkzehrer'
        ) {
          score += 20;
          gruende.push({ typ: 'bonus', text: `Leguminosen als Vorkultur verbessern Bodenstickstoff für Starkzehrer` });
        }
      }
    } else {
      gruende.push({ typ: 'neutral', text: 'Kein Vorkultureintrag vorhanden' });
    }

    return { score: Math.max(0, score), gruende, warnungen, kultur };
  }

  // Greedy-Zuteilung: Wunschliste auf Beete verteilen
  function berechneZuteilung(beete, wunschliste, aktuellesJahr) {
    // Alle möglichen Kombinationen mit Scores
    const kombinationen = [];
    for (const beet of beete) {
      for (const kulturName of wunschliste) {
        const ergebnis = berechneScore(beet, kulturName, aktuellesJahr);
        kombinationen.push({ beet, kulturName, ...ergebnis });
      }
    }

    // Absteigend nach Score sortieren
    kombinationen.sort((a, b) => b.score - a.score);

    const zugeteilteBeete = new Set();
    const zugeteilteKulturen = new Set();
    const zuteilung = [];
    const nichtZugeteilt = [];

    for (const kombi of kombinationen) {
      if (!zugeteilteBeete.has(kombi.beet.id) && !zugeteilteKulturen.has(kombi.kulturName)) {
        zugeteilteBeete.add(kombi.beet.id);
        zugeteilteKulturen.add(kombi.kulturName);
        zuteilung.push(kombi);
      }
    }

    // Nicht zugeteilte Kulturen sammeln
    for (const kultur of wunschliste) {
      if (!zugeteilteKulturen.has(kultur)) {
        nichtZugeteilt.push(kultur);
      }
    }

    return { zuteilung, nichtZugeteilt };
  }

  // Mischkultur-Analyse für ein Beet mit mehreren Kulturen
  function analysiereMischkultur(kulturenImBeet) {
    const gute = [];
    const schlechte = [];

    for (let i = 0; i < kulturenImBeet.length; i++) {
      for (let j = i + 1; j < kulturenImBeet.length; j++) {
        const k1 = KULTUREN_DB.find(k => k.name === kulturenImBeet[i]);
        const k2 = KULTUREN_DB.find(k => k.name === kulturenImBeet[j]);
        if (!k1 || !k2) continue;

        if (k1.guteNachbarn.includes(k2.name) || k2.guteNachbarn.includes(k1.name)) {
          gute.push({ paar: [k1.name, k2.name], text: `${k1.name} + ${k2.name} vertragen sich gut` });
        }
        if (k1.schlechteNachbarn.includes(k2.name) || k2.schlechteNachbarn.includes(k1.name)) {
          schlechte.push({ paar: [k1.name, k2.name], text: `${k1.name} und ${k2.name} vertragen sich NICHT` });
        }
      }
    }

    const mischkulturScore = gute.length * 10 - schlechte.length * 20;
    return { gute, schlechte, mischkulturScore };
  }

  // Gute Nachbarn vorschlagen für eine Hauptkultur
  function schlageNachbarnVor(hauptKulturName, bereitsImBeet, wunschliste) {
    const hauptKultur = KULTUREN_DB.find(k => k.name === hauptKulturName);
    if (!hauptKultur) return [];

    return hauptKultur.guteNachbarn
      .filter(n => !bereitsImBeet.includes(n))
      .map(n => {
        const inWunschliste = wunschliste.includes(n);
        return { name: n, inWunschliste, empfehlung: inWunschliste ? 'Auf Wunschliste' : 'Allgemeine Empfehlung' };
      });
  }

  return { berechneScore, berechneZuteilung, analysiereMischkultur, schlageNachbarnVor };
})();
