// Beetplaner – Haupt-App-Logik
'use strict';

const App = (() => {
  let aktiverBereich = 'dashboard';
  let aktiveBeetId = null;
  let wunschliste = [];
  let wetterDaten = null;
  const AKTUELLESJAHR = new Date().getFullYear();

  // ─── Navigation ──────────────────────────────────────────────────────────────
  function zeigeBereich(bereich) {
    document.querySelectorAll('.bereich').forEach(el => el.classList.remove('aktiv'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('aktiv'));
    const el = document.getElementById(`bereich-${bereich}`);
    if (el) el.classList.add('aktiv');
    const btn = document.querySelector(`[data-bereich="${bereich}"]`);
    if (btn) btn.classList.add('aktiv');
    aktiverBereich = bereich;

    if (bereich === 'dashboard') renderdDashboard();
    else if (bereich === 'beete') renderBeeteliste();
    else if (bereich === 'planung') renderPlanung();
    else if (bereich === 'timeline') renderTimeline();
    else if (bereich === 'wetter') renderWetterBereich();
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────────
  async function renderdDashboard() {
    const beete = BeetManager.ladeBeete();
    const naechste = Timeline.naechsteTermine(beete, AKTUELLESJAHR, 14);
    const standort = Wetter.ladeStandort();

    // Wetterwarnung updaten
    let frostwarnungHTML = '';
    if (standort && wetterDaten) {
      const warnungen = Wetter.pruefeFrostwarnung(wetterDaten);
      const boden = Wetter.pruefeBodentemperatur(wetterDaten);
      if (warnungen.length > 0) {
        const betroffeneBeete = beete.filter(b =>
          b.historie.some(h => h.jahr === AKTUELLESJAHR &&
            Timeline.istFrostempfindlich(h.kultur)));
        frostwarnungHTML = `
          <div class="warnung-karte frost">
            <strong>🧊 Frostwarnung!</strong>
            ${warnungen.map(w => `<div>${w.text}</div>`).join('')}
            ${betroffeneBeete.length > 0
              ? `<div class="frost-beete">Betroffene Beete: ${betroffeneBeete.map(b => b.name).join(', ')} – Abdecken empfohlen!</div>`
              : ''}
          </div>`;
      }
      if (boden && !boden.geeignet) {
        frostwarnungHTML += `<div class="warnung-karte boden"><strong>🌡️ Bodentemperatur:</strong> ${boden.text}</div>`;
      }
    }

    document.getElementById('dashboard-warnungen').innerHTML = frostwarnungHTML;

    // Nächste 14 Tage
    const terminHTML = naechste.length === 0
      ? '<p class="leer">Keine Termine in den nächsten 14 Tagen.</p>'
      : naechste.map(t => `
          <div class="termin-karte" style="border-left: 4px solid ${t.farbe}">
            <div class="termin-datum">${t.start.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</div>
            <div class="termin-info">
              <strong>${t.label}</strong>
              <span class="termin-beet">${t.beetName}</span>
            </div>
          </div>`).join('');
    document.getElementById('dashboard-termine').innerHTML = terminHTML;

    // Gartenplan-Grid
    renderGartenplanGrid(beete);
  }

  function renderGartenplanGrid(beete) {
    const container = document.getElementById('gartenplan-grid');
    if (beete.length === 0) {
      container.innerHTML = '<div class="leer-grid">Noch keine Beete angelegt. <button class="btn-link" onclick="App.neuesBeetDialog()">Beet anlegen →</button></div>';
      return;
    }
    container.innerHTML = beete.map(b => {
      const aktuelle = b.historie.filter(h => h.jahr === AKTUELLESJAHR);
      const klasse = `beet-karte ausrichtung-${b.ausrichtung}`;
      return `
        <div class="${klasse}" onclick="App.zeigeBeetDetail('${b.id}')" title="${b.name}">
          <div class="beet-name">${b.name}</div>
          <div class="beet-ausrichtung">${ausrichtungEmoji(b.ausrichtung)} ${b.ausrichtung}</div>
          ${b.groesseQm ? `<div class="beet-groesse">${b.groesseQm} m²</div>` : ''}
          <div class="beet-kulturen">
            ${aktuelle.length > 0
              ? aktuelle.map(h => `<span class="kultur-chip">${h.kultur}</span>`).join('')
              : '<span class="leer-chip">Leer</span>'}
          </div>
        </div>`;
    }).join('');
  }

  function ausrichtungEmoji(a) {
    return a === 'sonnig' ? '☀️' : a === 'halbschattig' ? '⛅' : '🌑';
  }

  // ─── Beetliste ───────────────────────────────────────────────────────────────
  function renderBeeteliste() {
    const beete = BeetManager.ladeBeete();
    const container = document.getElementById('beeteliste-container');
    if (beete.length === 0) {
      container.innerHTML = '<p class="leer">Noch keine Beete angelegt.</p>';
      return;
    }
    container.innerHTML = beete.map(b => `
      <div class="beet-liste-item ausrichtung-${b.ausrichtung}" onclick="App.zeigeBeetDetail('${b.id}')">
        <div class="beet-liste-info">
          <strong>${b.name}</strong>
          <span>${ausrichtungEmoji(b.ausrichtung)} ${b.ausrichtung}${b.groesseQm ? ' · ' + b.groesseQm + ' m²' : ''}</span>
        </div>
        <div class="beet-liste-historie">
          ${b.historie.slice(0, 3).map(h => `<span class="historie-chip">${h.jahr}: ${h.kultur}</span>`).join('')}
          ${b.historie.length > 3 ? `<span class="mehr">+${b.historie.length - 3} weitere</span>` : ''}
        </div>
        <div class="beet-liste-aktionen">
          <button class="btn-icon" onclick="event.stopPropagation(); App.beetBearbeitenDialog('${b.id}')" title="Bearbeiten">✏️</button>
          <button class="btn-icon btn-gefahr" onclick="event.stopPropagation(); App.beetLoeschenBestaetigen('${b.id}')" title="Löschen">🗑️</button>
        </div>
      </div>`).join('');
  }

  // ─── Beet-Detail ─────────────────────────────────────────────────────────────
  function zeigeBeetDetail(beetId) {
    aktiveBeetId = beetId;
    const beet = BeetManager.getBeet(beetId);
    if (!beet) return;

    zeigeModal('modal-beet-detail');
    document.getElementById('beet-detail-titel').textContent = beet.name;
    renderBeetHistorie(beet);
    renderFruchtfolgeHinweise(beet);
    renderMischkulturBereich(beet);
  }

  function renderBeetHistorie(beet) {
    const container = document.getElementById('beet-historie-inhalt');
    const aktuelle = beet.historie.sort((a, b) => b.jahr - a.jahr);

    if (aktuelle.length === 0) {
      container.innerHTML = '<p class="leer">Noch keine Einträge.</p>';
    } else {
      container.innerHTML = aktuelle.map(h => `
        <div class="historie-eintrag">
          <div class="historie-header">
            <span class="historie-jahr">${h.jahr}</span>
            <span class="kultur-badge">${h.kultur}</span>
            <span class="familie-badge">${h.pflanzenfamilie}</span>
            <div class="historie-aktionen">
              <button class="btn-sm" onclick="App.duengungHinzufuegenDialog('${beet.id}', '${h.id}')">+ Düngung</button>
              <button class="btn-sm btn-gefahr" onclick="App.historieEintragLoeschen('${beet.id}', '${h.id}')">✕</button>
            </div>
          </div>
          <div class="duengung-liste">
            ${h.duengung.length === 0
              ? '<span class="leer-klein">Keine Düngung erfasst</span>'
              : h.duengung.map(d => {
                const info = DUENGER_DB.find(db => db.typ === d.typ);
                return `<span class="duengung-chip" title="${info ? info.beschreibung : ''}">🌿 ${d.typ} (${d.datum})<button class="btn-tiny" onclick="App.duengungLoeschen('${beet.id}','${h.id}','${d.id}')">✕</button></span>`;
              }).join('')}
          </div>
        </div>`).join('');
    }
  }

  function renderFruchtfolgeHinweise(beet) {
    const container = document.getElementById('beet-fruchtfolge-hinweise');
    // Top-3 Empfehlungen aus der Kulturdatenbank
    const scores = KULTUREN_DB.map(k => ({
      ...Fruchtfolge.berechneScore(beet, k.name, AKTUELLESJAHR),
      kulturName: k.name
    })).sort((a, b) => b.score - a.score).slice(0, 5);

    container.innerHTML = `
      <h4>Fruchtfolge-Empfehlungen für ${AKTUELLESJAHR}</h4>
      ${scores.map(s => `
        <div class="empfehlung-karte score-${s.score >= 120 ? 'gut' : s.score >= 90 ? 'mittel' : 'schlecht'}">
          <div class="empfehlung-header">
            <strong>${s.kulturName}</strong>
            <span class="score-badge">${s.score} Pkt.</span>
          </div>
          ${s.warnungen.map(w => `<div class="hinweis-warnung">⚠️ ${w}</div>`).join('')}
          ${s.gruende.map(g => `<div class="hinweis-info">${g.typ === 'bonus' ? '✅' : 'ℹ️'} ${g.text}</div>`).join('')}
        </div>`).join('')}`;
  }

  function renderMischkulturBereich(beet) {
    const container = document.getElementById('beet-mischkultur-inhalt');
    const aktuelleKulturen = beet.historie
      .filter(h => h.jahr === AKTUELLESJAHR)
      .map(h => h.kultur);

    if (aktuelleKulturen.length === 0) {
      container.innerHTML = '<p class="leer">Trage Kulturen für dieses Jahr ein, um Mischkultur-Analysen zu sehen.</p>';
      return;
    }

    const analyse = Fruchtfolge.analysiereMischkultur(aktuelleKulturen);
    const nachbarn = aktuelleKulturen.flatMap(k =>
      Fruchtfolge.schlageNachbarnVor(k, aktuelleKulturen, wunschliste)
    ).filter((v, i, a) => a.findIndex(x => x.name === v.name) === i).slice(0, 6);

    container.innerHTML = `
      <div class="mischkultur-score">Mischkultur-Score: <strong>${analyse.mischkulturScore >= 0 ? '+' : ''}${analyse.mischkulturScore}</strong></div>
      ${analyse.schlechte.map(s => `<div class="warnung-mischkultur">⚠️ ${s.text}</div>`).join('')}
      ${analyse.gute.map(g => `<div class="gut-mischkultur">✅ ${g.text}</div>`).join('')}
      ${nachbarn.length > 0 ? `
        <h5>Empfohlene Beetnachbarn:</h5>
        <div class="nachbarn-liste">
          ${nachbarn.map(n => `
            <span class="nachbar-chip ${n.inWunschliste ? 'in-wunschliste' : ''}">${n.name}
              ${n.inWunschliste ? ' ★' : ''}</span>`).join('')}
        </div>` : ''}`;
  }

  // ─── Dialoge / Modals ────────────────────────────────────────────────────────
  function zeigeModal(id) {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('sichtbar'));
    const m = document.getElementById(id);
    if (m) m.classList.add('sichtbar');
    document.getElementById('modal-overlay').classList.add('sichtbar');
  }

  function schliesseModal() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('sichtbar'));
    document.getElementById('modal-overlay').classList.remove('sichtbar');
  }

  function neuesBeetDialog() {
    document.getElementById('form-beet-name').value = '';
    document.getElementById('form-beet-ausrichtung').value = 'sonnig';
    document.getElementById('form-beet-groesse').value = '';
    document.getElementById('form-beet-id').value = '';
    document.getElementById('modal-beet-titel').textContent = 'Neues Beet anlegen';
    zeigeModal('modal-beet-form');
  }

  function beetBearbeitenDialog(beetId) {
    const beet = BeetManager.getBeet(beetId);
    if (!beet) return;
    document.getElementById('form-beet-name').value = beet.name;
    document.getElementById('form-beet-ausrichtung').value = beet.ausrichtung;
    document.getElementById('form-beet-groesse').value = beet.groesseQm || '';
    document.getElementById('form-beet-id').value = beetId;
    document.getElementById('modal-beet-titel').textContent = 'Beet bearbeiten';
    zeigeModal('modal-beet-form');
  }

  function beetFormSpeichern() {
    const name = document.getElementById('form-beet-name').value.trim();
    const ausrichtung = document.getElementById('form-beet-ausrichtung').value;
    const groesse = parseFloat(document.getElementById('form-beet-groesse').value) || null;
    const id = document.getElementById('form-beet-id').value;

    if (!name) { alert('Bitte einen Namen eingeben.'); return; }

    if (id) {
      BeetManager.beetAktualisieren(id, { name, ausrichtung, groesseQm: groesse });
    } else {
      BeetManager.neuesBeet(name, ausrichtung, groesse);
    }
    schliesseModal();
    if (aktiverBereich === 'dashboard') renderdDashboard();
    else if (aktiverBereich === 'beete') renderBeeteliste();
  }

  function beetLoeschenBestaetigen(beetId) {
    const beet = BeetManager.getBeet(beetId);
    if (!beet) return;
    if (confirm(`Beet "${beet.name}" wirklich löschen? Alle Einträge gehen verloren.`)) {
      BeetManager.beetLoeschen(beetId);
      renderBeeteliste();
    }
  }

  function historieHinzufuegenDialog() {
    const beet = BeetManager.getBeet(aktiveBeetId);
    if (!beet) return;
    document.getElementById('form-historie-beet').textContent = beet.name;
    document.getElementById('form-historie-jahr').value = AKTUELLESJAHR;
    document.getElementById('form-historie-kultur').value = '';
    // Autocomplete-Liste befüllen
    const datalist = document.getElementById('kulturen-liste');
    datalist.innerHTML = KULTUREN_DB.map(k => `<option value="${k.name}">`).join('');
    zeigeModal('modal-historie-form');
  }

  function historieFormSpeichern() {
    const jahr = parseInt(document.getElementById('form-historie-jahr').value);
    const kulturName = document.getElementById('form-historie-kultur').value.trim();
    if (!kulturName || !jahr) { alert('Bitte Jahr und Kultur angeben.'); return; }

    const kulturaInfo = KULTUREN_DB.find(k => k.name === kulturName);
    const familie = kulturaInfo ? kulturaInfo.familie : 'Unbekannt';

    BeetManager.historieEintragHinzufuegen(aktiveBeetId, jahr, kulturName, familie);
    schliesseModal();
    const beet = BeetManager.getBeet(aktiveBeetId);
    if (beet) {
      renderBeetHistorie(beet);
      renderFruchtfolgeHinweise(beet);
      renderMischkulturBereich(beet);
    }
  }

  function historieEintragLoeschen(beetId, eintragId) {
    if (!confirm('Eintrag löschen?')) return;
    BeetManager.historieEintragLoeschen(beetId, eintragId);
    const beet = BeetManager.getBeet(beetId);
    if (beet) { renderBeetHistorie(beet); renderFruchtfolgeHinweise(beet); renderMischkulturBereich(beet); }
  }

  function duengungHinzufuegenDialog(beetId, eintragId) {
    document.getElementById('form-duengung-beet-id').value = beetId;
    document.getElementById('form-duengung-eintrag-id').value = eintragId;
    document.getElementById('form-duengung-typ').value = '';
    document.getElementById('form-duengung-datum').value = new Date().toISOString().split('T')[0];
    // Datalist befüllen
    const datalist = document.getElementById('duenger-liste');
    datalist.innerHTML = DUENGER_DB.map(d => `<option value="${d.typ}" data-info="${d.beschreibung}">`).join('');
    zeigeModal('modal-duengung-form');
  }

  function duengungFormSpeichern() {
    const beetId = document.getElementById('form-duengung-beet-id').value;
    const eintragId = document.getElementById('form-duengung-eintrag-id').value;
    const typ = document.getElementById('form-duengung-typ').value.trim();
    const datum = document.getElementById('form-duengung-datum').value;
    if (!typ || !datum) { alert('Bitte Typ und Datum angeben.'); return; }

    BeetManager.duengungHinzufuegen(beetId, eintragId, typ, datum);
    schliesseModal();
    aktiveBeetId = beetId;
    const beet = BeetManager.getBeet(beetId);
    if (beet) renderBeetHistorie(beet);
  }

  function duengungLoeschen(beetId, eintragId, duengungId) {
    if (!confirm('Düngungs-Eintrag löschen?')) return;
    BeetManager.duengungLoeschen(beetId, eintragId, duengungId);
    const beet = BeetManager.getBeet(beetId);
    if (beet) renderBeetHistorie(beet);
  }

  // ─── Saisonplanung ───────────────────────────────────────────────────────────
  function renderPlanung() {
    renderWunschliste();
  }

  function renderWunschliste() {
    const container = document.getElementById('wunschliste-chips');
    const datalist = document.getElementById('kulturen-liste-planung');
    datalist.innerHTML = KULTUREN_DB.map(k => `<option value="${k.name}">`).join('');

    container.innerHTML = wunschliste.length === 0
      ? '<span class="leer-klein">Noch keine Kulturen hinzugefügt</span>'
      : wunschliste.map((k, i) => `
          <span class="wunsch-chip">
            ${k}
            <button class="btn-tiny" onclick="App.wunschlisteEntfernen(${i})">✕</button>
          </span>`).join('');
  }

  function wunschlisteHinzufuegen() {
    const input = document.getElementById('wunsch-input');
    const val = input.value.trim();
    if (!val || wunschliste.includes(val)) { input.value = ''; return; }
    wunschliste.push(val);
    input.value = '';
    renderWunschliste();
  }

  function wunschlisteEntfernen(idx) {
    wunschliste.splice(idx, 1);
    renderWunschliste();
    document.getElementById('planung-ergebnis').innerHTML = '';
  }

  function berechnePlanung() {
    if (wunschliste.length === 0) { alert('Bitte mindestens eine Kultur zur Wunschliste hinzufügen.'); return; }
    const beete = BeetManager.ladeBeete();
    if (beete.length === 0) { alert('Bitte zuerst Beete anlegen.'); return; }

    const { zuteilung, nichtZugeteilt } = Fruchtfolge.berechneZuteilung(beete, wunschliste, AKTUELLESJAHR);
    renderPlanungsErgebnis(zuteilung, nichtZugeteilt);
  }

  function renderPlanungsErgebnis(zuteilung, nichtZugeteilt) {
    const container = document.getElementById('planung-ergebnis');
    let html = '<h3>Planungsvorschlag</h3>';

    if (zuteilung.length === 0) {
      html += '<p class="leer">Keine Zuteilung möglich.</p>';
    } else {
      html += '<div class="zuteilung-liste">';
      html += zuteilung.map(z => `
        <div class="zuteilung-karte score-${z.score >= 120 ? 'gut' : z.score >= 90 ? 'mittel' : 'schlecht'}">
          <div class="zuteilung-header">
            <span class="zuteilung-beet">${z.beet.name}</span>
            <span class="pfeil">→</span>
            <span class="zuteilung-kultur">${z.kulturName}</span>
            <span class="score-badge">${z.score} Pkt.</span>
          </div>
          ${z.warnungen.map(w => `<div class="hinweis-warnung">⚠️ ${w}</div>`).join('')}
          ${z.gruende.map(g => `<div class="hinweis-info">${g.typ === 'bonus' ? '✅' : 'ℹ️'} ${g.text}</div>`).join('')}
          <button class="btn-sm btn-uebernehmen" onclick="App.planungUebernehmen('${z.beet.id}', '${z.kulturName}')">
            In Beet-Historie übernehmen
          </button>
        </div>`).join('');
      html += '</div>';
    }

    if (nichtZugeteilt.length > 0) {
      html += `
        <div class="nicht-zugeteilt">
          <strong>Nicht zugeteilt</strong> (zu wenige Beete):
          ${nichtZugeteilt.map(k => `<span class="wunsch-chip">${k}</span>`).join('')}
        </div>`;
    }

    container.innerHTML = html;
  }

  function planungUebernehmen(beetId, kulturName) {
    const kulturaInfo = KULTUREN_DB.find(k => k.name === kulturName);
    const familie = kulturaInfo ? kulturaInfo.familie : 'Unbekannt';
    BeetManager.historieEintragHinzufuegen(beetId, AKTUELLESJAHR, kulturName, familie);
    alert(`"${kulturName}" wurde in die Historie von "${BeetManager.getBeet(beetId)?.name}" eingetragen.`);
  }

  // ─── Timeline ────────────────────────────────────────────────────────────────
  function renderTimeline() {
    const beete = BeetManager.ladeBeete();
    const monate = Timeline.erzeugeMonatsbalken(1, 12, AKTUELLESJAHR);
    const container = document.getElementById('timeline-container');

    if (beete.length === 0) {
      container.innerHTML = '<p class="leer">Noch keine Beete angelegt.</p>';
      return;
    }

    // Header-Monate
    const monatsBreite = 100 / monate.length;
    let html = `
      <div class="timeline-header">
        <div class="timeline-beet-col"></div>
        ${monate.map(m => `<div class="timeline-monat" style="width:${monatsBreite}%">${m.name.slice(0, 3)}</div>`).join('')}
      </div>`;

    const alleTermine = Timeline.berechneTermine(beete, AKTUELLESJAHR);
    const jahresStart = new Date(AKTUELLESJAHR, 0, 1);
    const jahresEnde = new Date(AKTUELLESJAHR, 11, 31);
    const jahresDauer = jahresEnde - jahresStart;

    for (const beet of beete) {
      const beetTermine = alleTermine.filter(t => t.beetId === beet.id);
      html += `
        <div class="timeline-zeile">
          <div class="timeline-beet-col" onclick="App.zeigeBeetDetail('${beet.id}')" title="${beet.name}">
            <span class="ausrichtung-${beet.ausrichtung}">●</span> ${beet.name}
          </div>
          <div class="timeline-balken-bereich">
            ${beetTermine.map(t => {
              const links = Math.max(0, (t.start - jahresStart) / jahresDauer * 100);
              const breite = Math.min(100 - links, (t.ende - t.start) / jahresDauer * 100 + 0.5);
              return `<div class="timeline-balken" style="left:${links.toFixed(2)}%;width:${breite.toFixed(2)}%;background:${t.farbe}" title="${t.label}"></div>`;
            }).join('')}
          </div>
        </div>`;
    }

    // Legende
    html += `
      <div class="timeline-legende">
        <span style="border-left:4px solid #4CAF50">Aussaat</span>
        <span style="border-left:4px solid #2196F3">Pflanzung</span>
        <span style="border-left:4px solid #FF9800">Ernte</span>
        <span style="border-left:4px solid #9C27B0">Düngecheck</span>
      </div>`;

    container.innerHTML = html;
    markiereHeuteInTimeline();
  }

  function markiereHeuteInTimeline() {
    const heute = new Date();
    const jahresStart = new Date(AKTUELLESJAHR, 0, 1);
    const jahresEnde = new Date(AKTUELLESJAHR, 11, 31);
    if (heute < jahresStart || heute > jahresEnde) return;
    const pos = (heute - jahresStart) / (jahresEnde - jahresStart) * 100;
    const bereich = document.querySelector('.timeline-balken-bereich');
    if (!bereich) return;
    document.querySelectorAll('.timeline-balken-bereich').forEach(el => {
      const linie = document.createElement('div');
      linie.className = 'heute-linie';
      linie.style.left = `${pos.toFixed(2)}%`;
      el.appendChild(linie);
    });
  }

  // ─── Wetter-Bereich ──────────────────────────────────────────────────────────
  async function renderWetterBereich() {
    const standort = Wetter.ladeStandort();
    const container = document.getElementById('wetter-container');

    if (!standort) {
      container.innerHTML = `
        <div class="standort-eingabe">
          <h3>Standort einrichten</h3>
          <p>Gib deinen Ort oder deine PLZ ein, um Wetterdaten und Klimazonen-Infos zu erhalten.</p>
          <div class="eingabe-zeile">
            <input type="text" id="standort-input" placeholder="z.B. München oder 80331" />
            <button class="btn-primary" onclick="App.standortSpeichern()">Speichern</button>
          </div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="standort-info">
        <strong>📍 ${standort.name}${standort.bundesland ? ', ' + standort.bundesland : ''}</strong>
        <button class="btn-sm" onclick="App.standortAendern()">Ändern</button>
      </div>
      <div id="wetter-inhalt"><div class="loading">Wetterdaten werden geladen…</div></div>`;

    try {
      wetterDaten = await Wetter.ladeWettervorhersage(standort.lat, standort.lon);
      renderWetterVorhersage(wetterDaten, standort);
    } catch (e) {
      document.getElementById('wetter-inhalt').innerHTML =
        `<div class="fehler">Wetterdaten konnten nicht geladen werden: ${e.message}</div>`;
    }
  }

  function renderWetterVorhersage(daten, standort) {
    const { daily } = daten;
    const frostwarnungen = Wetter.pruefeFrostwarnung(daten);
    const boden = Wetter.pruefeBodentemperatur(daten);
    const klimazone = getKlimazone(standort.plz || standort.name);

    let html = '';

    // Frostwarnungen
    if (frostwarnungen.length > 0) {
      html += `<div class="warnung-karte frost"><strong>🧊 Frostwarnung!</strong>
        ${frostwarnungen.map(w => `<div>${w.text}</div>`).join('')}</div>`;
    }

    // Bodentemperatur
    if (boden) {
      html += `<div class="warnung-karte ${boden.geeignet ? 'info' : 'boden'}"><strong>🌡️ Boden:</strong> ${boden.text}</div>`;
    }

    // Klimazone
    html += `
      <div class="klimazone-karte">
        <strong>🗺️ Klimazone:</strong> ${klimazone.region} (Härtezone ${klimazone.zoneHaertegrad})
        · Letzter Frost ca. ${new Date(`${AKTUELLESJAHR}-${klimazone.letzterFrostFruehjahr}`).toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })}
      </div>`;

    // 7-Tage-Vorhersage
    html += '<div class="wetter-grid">';
    for (let i = 0; i < daily.time.length; i++) {
      const datum = new Date(daily.time[i]);
      html += `
        <div class="wetter-tag">
          <div class="wetter-datum">${datum.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })}</div>
          <div class="wetter-icon">${Wetter.wettercodeZuEmoji(daily.weathercode[i])}</div>
          <div class="wetter-temp">
            <span class="temp-max">${Math.round(daily.temperature_2m_max[i])}°</span>
            <span class="temp-min">${Math.round(daily.temperature_2m_min[i])}°</span>
          </div>
          ${daily.precipitation_sum[i] > 0
            ? `<div class="wetter-regen">💧 ${daily.precipitation_sum[i].toFixed(1)} mm</div>` : ''}
        </div>`;
    }
    html += '</div>';

    document.getElementById('wetter-inhalt').innerHTML = html;
  }

  async function standortSpeichern() {
    const input = document.getElementById('standort-input').value.trim();
    if (!input) return;
    const statusEl = document.getElementById('wetter-container');
    statusEl.innerHTML += '<div class="loading">Ort wird gesucht…</div>';
    try {
      const ergebnis = await Wetter.geocodeOrt(input);
      if (!ergebnis) { alert('Ort nicht gefunden. Bitte PLZ oder deutschen Ortsnamen eingeben.'); return; }
      // PLZ speichern falls eingegeben
      if (input.match(/^\d{5}$/)) ergebnis.plz = input;
      Wetter.speichereStandort(ergebnis);
      renderWetterBereich();
    } catch (e) {
      alert('Fehler beim Suchen: ' + e.message);
    }
  }

  function standortAendern() {
    Wetter.speichereStandort(null);
    renderWetterBereich();
  }

  // ─── Export / Import ─────────────────────────────────────────────────────────
  function exportiereJSON() {
    const json = BeetManager.exportiereJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beetplaner-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importiereJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          BeetManager.importiereJSON(ev.target.result);
          alert('Daten erfolgreich importiert!');
          zeigeBereich(aktiverBereich);
        } catch (err) {
          alert('Fehler beim Importieren: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ─── Duenger-Info anzeigen ──────────────────────────────────────────────────
  function zeigeDuengerInfo() {
    const typ = document.getElementById('form-duengung-typ').value;
    const info = DUENGER_DB.find(d => d.typ === typ);
    const infoEl = document.getElementById('duengung-info');
    if (info && infoEl) {
      infoEl.textContent = info.beschreibung;
      infoEl.style.display = 'block';
    } else if (infoEl) {
      infoEl.style.display = 'none';
    }
  }

  // ─── Init ───────────────────────────────────────────────────────────────────
  async function init() {
    // Event-Listener für Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => zeigeBereich(btn.dataset.bereich));
    });
    document.getElementById('modal-overlay').addEventListener('click', schliesseModal);

    // Vorhandenen Standort laden und Wetter im Hintergrund holen
    const standort = Wetter.ladeStandort();
    if (standort) {
      try {
        wetterDaten = await Wetter.ladeWettervorhersage(standort.lat, standort.lon);
      } catch (_) { /* Wetterfehler sind nicht kritisch */ }
    }

    zeigeBereich('dashboard');
  }

  return {
    init, zeigeBereich, zeigeBeetDetail, schliesseModal,
    neuesBeetDialog, beetBearbeitenDialog, beetFormSpeichern, beetLoeschenBestaetigen,
    historieHinzufuegenDialog, historieFormSpeichern, historieEintragLoeschen,
    duengungHinzufuegenDialog, duengungFormSpeichern, duengungLoeschen, zeigeDuengerInfo,
    wunschlisteHinzufuegen, wunschlisteEntfernen, berechnePlanung, planungUebernehmen,
    standortSpeichern, standortAendern,
    exportiereJSON, importiereJSON
  };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
