// Open-Meteo Wetterintegration + Standortverwaltung
const Wetter = (() => {
  const STORAGE_KEY = 'beetplaner_standort';

  function ladeStandort() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch { return null; }
  }

  function speichereStandort(standort) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(standort));
  }

  // Koordinaten für deutschen Ort per Open-Meteo Geocoding API ermitteln
  async function geocodeOrt(ortOderPlz) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ortOderPlz)}&count=5&language=de&format=json`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Geocoding fehlgeschlagen');
    const data = await resp.json();
    if (!data.results || data.results.length === 0) return null;
    // Deutschland bevorzugen
    const deResult = data.results.find(r => r.country_code === 'DE') || data.results[0];
    return {
      name: deResult.name,
      bundesland: deResult.admin1 || '',
      lat: deResult.latitude,
      lon: deResult.longitude,
      plz: ortOderPlz.match(/^\d{5}$/) ? ortOderPlz : null
    };
  }

  // 7-Tage-Vorhersage von Open-Meteo
  async function ladeWettervorhersage(lat, lon) {
    const params = [
      'temperature_2m_max', 'temperature_2m_min',
      'precipitation_sum', 'weathercode',
      'soil_temperature_0_to_7cm_mean'
    ].join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=${params}&timezone=Europe%2FBerlin&forecast_days=7`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Wetterdaten konnten nicht geladen werden');
    return resp.json();
  }

  // WMO-Wettercode → lesbare Beschreibung
  function wettercodeZuText(code) {
    if (code === 0) return 'Sonnig';
    if (code <= 2) return 'Überwiegend sonnig';
    if (code === 3) return 'Bewölkt';
    if (code <= 49) return 'Nebel';
    if (code <= 59) return 'Nieselregen';
    if (code <= 69) return 'Regen';
    if (code <= 79) return 'Schneefall';
    if (code <= 82) return 'Regenschauer';
    if (code <= 86) return 'Schneeschauer';
    if (code <= 99) return 'Gewitter';
    return 'Unbekannt';
  }

  // WMO-Code → Emoji
  function wettercodeZuEmoji(code) {
    if (code === 0) return '☀️';
    if (code <= 2) return '⛅';
    if (code === 3) return '☁️';
    if (code <= 49) return '🌫️';
    if (code <= 69) return '🌧️';
    if (code <= 79) return '❄️';
    if (code <= 86) return '🌨️';
    if (code <= 99) return '⛈️';
    return '🌡️';
  }

  // Frostwarnung für nächste Tage prüfen
  function pruefeFrostwarnung(vorhersage) {
    const warnungen = [];
    if (!vorhersage?.daily) return warnungen;
    const { time, temperature_2m_min } = vorhersage.daily;
    for (let i = 0; i < time.length; i++) {
      if (temperature_2m_min[i] !== null && temperature_2m_min[i] <= 2) {
        warnungen.push({
          datum: time[i],
          minTemp: temperature_2m_min[i],
          text: `Frost möglich: Min. ${temperature_2m_min[i]}°C am ${new Date(time[i]).toLocaleDateString('de-DE')}`
        });
      }
    }
    return warnungen;
  }

  // Bodentemperatur für Aussaat-Eignung
  function pruefeBodentemperatur(vorhersage, schwellwertGrad = 10) {
    if (!vorhersage?.daily?.soil_temperature_0_to_7cm_mean) return null;
    const heute = vorhersage.daily.soil_temperature_0_to_7cm_mean[0];
    return {
      temperatur: heute,
      geeignet: heute >= schwellwertGrad,
      text: heute >= schwellwertGrad
        ? `Bodentemperatur ${heute?.toFixed(1)}°C – Aussaat im Freien möglich`
        : `Bodentemperatur nur ${heute?.toFixed(1)}°C – Aussaat draußen noch zu früh (< ${schwellwertGrad}°C)`
    };
  }

  return {
    ladeStandort, speichereStandort, geocodeOrt,
    ladeWettervorhersage, wettercodeZuText, wettercodeZuEmoji,
    pruefeFrostwarnung, pruefeBodentemperatur
  };
})();
