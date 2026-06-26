// Deutsche Klimazonen-Lookup: PLZ-Präfix → durchschnittliche Frostdaten
// Basierend auf Erfahrungswerten für die wichtigsten deutschen Regionen
const KLIMAZONEN = [
  // Norddeutschland (küstennahe Regionen, milde Winter)
  { plzPrefix: ["20","21","22","23","24","25","26","27","28","29"], region: "Norddeutsches Tiefland / Küste", letzterFrostFruehjahr: "03-31", ersterFrostHerbst: "11-15", zoneHaertegrad: 8 },
  { plzPrefix: ["18","17"], region: "Mecklenburg / Vorpommern Küste", letzterFrostFruehjahr: "04-10", ersterFrostHerbst: "11-01", zoneHaertegrad: 7 },
  { plzPrefix: ["19","15","16","14","13","12","10","12"], region: "Brandenburg / Berlin", letzterFrostFruehjahr: "04-15", ersterFrostHerbst: "10-20", zoneHaertegrad: 7 },
  // Norddeutschland Inland
  { plzPrefix: ["30","31","32","33","34","37","38","39"], region: "Niedersachsen / Ostfalen Inland", letzterFrostFruehjahr: "04-20", ersterFrostHerbst: "10-25", zoneHaertegrad: 7 },
  { plzPrefix: ["40","41","42","44","45","46","47","48","49"], region: "NRW / Ruhrgebiet", letzterFrostFruehjahr: "04-10", ersterFrostHerbst: "11-01", zoneHaertegrad: 8 },
  // Mittelgebirge und mittleres Deutschland
  { plzPrefix: ["50","51","52","53","54","55","56","57"], region: "Rheinland / Eifel", letzterFrostFruehjahr: "04-15", ersterFrostHerbst: "10-25", zoneHaertegrad: 7 },
  { plzPrefix: ["58","59","60","61","62","63","64","65","66","67","68","69"], region: "Hessen / Rhein-Main / Pfalz", letzterFrostFruehjahr: "04-15", ersterFrostHerbst: "10-25", zoneHaertegrad: 7 },
  // Süddeutschland
  { plzPrefix: ["70","71","72","73","74","75","76","77","78","79"], region: "Baden-Württemberg", letzterFrostFruehjahr: "04-20", ersterFrostHerbst: "10-20", zoneHaertegrad: 7 },
  { plzPrefix: ["80","81","82","83","84","85","86","87","88","89"], region: "Bayern (Flachland / Alpenvorland)", letzterFrostFruehjahr: "05-01", ersterFrostHerbst: "10-10", zoneHaertegrad: 6 },
  { plzPrefix: ["90","91","92","93","94","95","96","97","98","99"], region: "Franken / Fichtelgebirge / Thüringen", letzterFrostFruehjahr: "04-25", ersterFrostHerbst: "10-15", zoneHaertegrad: 6 },
  // Sachsen / Sachsen-Anhalt / Thüringen
  { plzPrefix: ["01","02","03","04","06","07","08","09"], region: "Sachsen / Erzgebirge", letzterFrostFruehjahr: "04-30", ersterFrostHerbst: "10-10", zoneHaertegrad: 6 },
  // Alpen / Hochlagen (Fallback)
  { plzPrefix: [], region: "Mitteldeutschland (Standard)", letzterFrostFruehjahr: "04-15", ersterFrostHerbst: "10-25", zoneHaertegrad: 7 }
];

function getKlimazone(plzOderOrt) {
  if (!plzOderOrt) return KLIMAZONEN[KLIMAZONEN.length - 1];
  const input = plzOderOrt.trim();
  // Versuche PLZ-Match (2-stelliger Präfix)
  for (const zone of KLIMAZONEN) {
    for (const prefix of zone.plzPrefix) {
      if (input.startsWith(prefix)) return zone;
    }
  }
  // Fallback: Standard-Mitteldeutschland
  return KLIMAZONEN[KLIMAZONEN.length - 1];
}

if (typeof module !== 'undefined') { module.exports = { KLIMAZONEN, getKlimazone }; }
