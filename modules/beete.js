// Beet-Verwaltung: CRUD, Historie, Düngung
const BeetManager = (() => {
  const STORAGE_KEY = 'beetplaner_beete';

  function ladeBeete() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  }

  function speichereBeete(beete) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(beete));
  }

  function neuesBeet(name, ausrichtung, groesseQm) {
    const beete = ladeBeete();
    const beet = {
      id: 'beet-' + Date.now(),
      name: name || 'Neues Beet',
      ausrichtung: ausrichtung || 'sonnig',
      groesseQm: groesseQm || null,
      historie: []
    };
    beete.push(beet);
    speichereBeete(beete);
    return beet;
  }

  function beetAktualisieren(id, updates) {
    const beete = ladeBeete();
    const idx = beete.findIndex(b => b.id === id);
    if (idx === -1) return null;
    beete[idx] = { ...beete[idx], ...updates };
    speichereBeete(beete);
    return beete[idx];
  }

  function beetLoeschen(id) {
    const beete = ladeBeete().filter(b => b.id !== id);
    speichereBeete(beete);
  }

  function getBeet(id) {
    return ladeBeete().find(b => b.id === id) || null;
  }

  function historieEintragHinzufuegen(beetId, jahr, kultur, familie) {
    const beete = ladeBeete();
    const beet = beete.find(b => b.id === beetId);
    if (!beet) return null;
    const eintrag = { id: 'he-' + Date.now(), jahr, kultur, pflanzenfamilie: familie, duengung: [] };
    beet.historie.push(eintrag);
    beet.historie.sort((a, b) => b.jahr - a.jahr);
    speichereBeete(beete);
    return eintrag;
  }

  function historieEintragAktualisieren(beetId, eintragId, updates) {
    const beete = ladeBeete();
    const beet = beete.find(b => b.id === beetId);
    if (!beet) return null;
    const eintrag = beet.historie.find(e => e.id === eintragId);
    if (!eintrag) return null;
    Object.assign(eintrag, updates);
    speichereBeete(beete);
    return eintrag;
  }

  function historieEintragLoeschen(beetId, eintragId) {
    const beete = ladeBeete();
    const beet = beete.find(b => b.id === beetId);
    if (!beet) return;
    beet.historie = beet.historie.filter(e => e.id !== eintragId);
    speichereBeete(beete);
  }

  function duengungHinzufuegen(beetId, eintragId, typ, datum) {
    const beete = ladeBeete();
    const beet = beete.find(b => b.id === beetId);
    if (!beet) return null;
    const eintrag = beet.historie.find(e => e.id === eintragId);
    if (!eintrag) return null;
    const duengung = { id: 'd-' + Date.now(), typ, datum };
    eintrag.duengung.push(duengung);
    speichereBeete(beete);
    return duengung;
  }

  function duengungLoeschen(beetId, eintragId, duengungId) {
    const beete = ladeBeete();
    const beet = beete.find(b => b.id === beetId);
    if (!beet) return;
    const eintrag = beet.historie.find(e => e.id === eintragId);
    if (!eintrag) return;
    eintrag.duengung = eintrag.duengung.filter(d => d.id !== duengungId);
    speichereBeete(beete);
  }

  function exportiereJSON() {
    const data = {
      version: 1,
      exportDatum: new Date().toISOString(),
      beete: ladeBeete()
    };
    return JSON.stringify(data, null, 2);
  }

  function importiereJSON(jsonString) {
    const data = JSON.parse(jsonString);
    if (!data.beete || !Array.isArray(data.beete)) throw new Error('Ungültiges Format');
    speichereBeete(data.beete);
    return data.beete;
  }

  return {
    ladeBeete, neuesBeet, beetAktualisieren, beetLoeschen, getBeet,
    historieEintragHinzufuegen, historieEintragAktualisieren, historieEintragLoeschen,
    duengungHinzufuegen, duengungLoeschen,
    exportiereJSON, importiereJSON
  };
})();
