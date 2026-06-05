// Curated city -> IANA timezone map so the timezone picker supports a broad
// city search (e.g. "New Orleans" -> America/Chicago), not just the city names
// that happen to appear in IANA zone ids. Kept dependency-free and focused on
// well-known cities; the IANA zone list still backs everything else.
//
// Keys are lowercased, whitespace/punctuation-stripped city names. Multiple
// spellings (e.g. "saintlouis"/"stlouis") can map to the same zone.

export interface CityZone {
  /** Display name for the city. */
  city: string
  /** IANA timezone id. */
  tz: string
}

const RAW: Array<[string, string]> = [
  // ── United States (cities whose zone id does NOT contain the city name) ──
  ["New Orleans", "America/Chicago"],
  ["Houston", "America/Chicago"],
  ["San Antonio", "America/Chicago"],
  ["Dallas", "America/Chicago"],
  ["Austin", "America/Chicago"],
  ["Fort Worth", "America/Chicago"],
  ["Memphis", "America/Chicago"],
  ["Nashville", "America/Chicago"],
  ["Milwaukee", "America/Chicago"],
  ["Kansas City", "America/Chicago"],
  ["Saint Louis", "America/Chicago"],
  ["St Louis", "America/Chicago"],
  ["Minneapolis", "America/Chicago"],
  ["Saint Paul", "America/Chicago"],
  ["Oklahoma City", "America/Chicago"],
  ["Tulsa", "America/Chicago"],
  ["Omaha", "America/Chicago"],
  ["Madison", "America/Chicago"],
  ["Baton Rouge", "America/Chicago"],
  ["Birmingham", "America/Chicago"],
  ["Little Rock", "America/Chicago"],
  ["Des Moines", "America/Chicago"],
  ["Jackson", "America/Chicago"],
  ["New York", "America/New_York"],
  ["New York City", "America/New_York"],
  ["Brooklyn", "America/New_York"],
  ["Manhattan", "America/New_York"],
  ["Boston", "America/New_York"],
  ["Philadelphia", "America/New_York"],
  ["Washington", "America/New_York"],
  ["Washington DC", "America/New_York"],
  ["Atlanta", "America/New_York"],
  ["Miami", "America/New_York"],
  ["Orlando", "America/New_York"],
  ["Tampa", "America/New_York"],
  ["Jacksonville", "America/New_York"],
  ["Charlotte", "America/New_York"],
  ["Raleigh", "America/New_York"],
  ["Pittsburgh", "America/New_York"],
  ["Cleveland", "America/New_York"],
  ["Columbus", "America/New_York"],
  ["Cincinnati", "America/New_York"],
  ["Buffalo", "America/New_York"],
  ["Baltimore", "America/New_York"],
  ["Richmond", "America/New_York"],
  ["Virginia Beach", "America/New_York"],
  ["Newark", "America/New_York"],
  ["Providence", "America/New_York"],
  ["Hartford", "America/New_York"],
  ["Portland Maine", "America/New_York"],
  ["Tallahassee", "America/New_York"],
  ["Savannah", "America/New_York"],
  ["Denver", "America/Denver"],
  ["Boulder", "America/Denver"],
  ["Colorado Springs", "America/Denver"],
  ["Albuquerque", "America/Denver"],
  ["Santa Fe", "America/Denver"],
  ["Salt Lake City", "America/Denver"],
  ["Cheyenne", "America/Denver"],
  ["Billings", "America/Denver"],
  ["El Paso", "America/Denver"],
  ["Phoenix", "America/Phoenix"],
  ["Tucson", "America/Phoenix"],
  ["Mesa", "America/Phoenix"],
  ["Scottsdale", "America/Phoenix"],
  ["Los Angeles", "America/Los_Angeles"],
  ["San Francisco", "America/Los_Angeles"],
  ["San Diego", "America/Los_Angeles"],
  ["San Jose", "America/Los_Angeles"],
  ["Sacramento", "America/Los_Angeles"],
  ["Oakland", "America/Los_Angeles"],
  ["Fresno", "America/Los_Angeles"],
  ["Long Beach", "America/Los_Angeles"],
  ["Seattle", "America/Los_Angeles"],
  ["Portland", "America/Los_Angeles"],
  ["Portland Oregon", "America/Los_Angeles"],
  ["Las Vegas", "America/Los_Angeles"],
  ["Reno", "America/Los_Angeles"],
  ["Spokane", "America/Los_Angeles"],
  ["Tacoma", "America/Los_Angeles"],
  ["Anchorage", "America/Anchorage"],
  ["Honolulu", "Pacific/Honolulu"],
  ["Detroit", "America/Detroit"],
  ["Indianapolis", "America/Indiana/Indianapolis"],

  // ── Canada ──
  ["Toronto", "America/Toronto"],
  ["Ottawa", "America/Toronto"],
  ["Montreal", "America/Toronto"],
  ["Quebec City", "America/Toronto"],
  ["Vancouver", "America/Vancouver"],
  ["Victoria", "America/Vancouver"],
  ["Calgary", "America/Edmonton"],
  ["Edmonton", "America/Edmonton"],
  ["Winnipeg", "America/Winnipeg"],
  ["Halifax", "America/Halifax"],

  // ── Latin America ──
  ["Mexico City", "America/Mexico_City"],
  ["Guadalajara", "America/Mexico_City"],
  ["Monterrey", "America/Monterrey"],
  ["Bogota", "America/Bogota"],
  ["Lima", "America/Lima"],
  ["Santiago", "America/Santiago"],
  ["Buenos Aires", "America/Argentina/Buenos_Aires"],
  ["Sao Paulo", "America/Sao_Paulo"],
  ["Rio de Janeiro", "America/Sao_Paulo"],
  ["Brasilia", "America/Sao_Paulo"],

  // ── Europe ──
  ["London", "Europe/London"],
  ["Manchester", "Europe/London"],
  ["Birmingham UK", "Europe/London"],
  ["Edinburgh", "Europe/London"],
  ["Glasgow", "Europe/London"],
  ["Dublin", "Europe/Dublin"],
  ["Paris", "Europe/Paris"],
  ["Marseille", "Europe/Paris"],
  ["Lyon", "Europe/Paris"],
  ["Madrid", "Europe/Madrid"],
  ["Barcelona", "Europe/Madrid"],
  ["Lisbon", "Europe/Lisbon"],
  ["Porto", "Europe/Lisbon"],
  ["Berlin", "Europe/Berlin"],
  ["Munich", "Europe/Berlin"],
  ["Hamburg", "Europe/Berlin"],
  ["Frankfurt", "Europe/Berlin"],
  ["Cologne", "Europe/Berlin"],
  ["Amsterdam", "Europe/Amsterdam"],
  ["Rotterdam", "Europe/Amsterdam"],
  ["Brussels", "Europe/Brussels"],
  ["Zurich", "Europe/Zurich"],
  ["Geneva", "Europe/Zurich"],
  ["Vienna", "Europe/Vienna"],
  ["Rome", "Europe/Rome"],
  ["Milan", "Europe/Rome"],
  ["Naples", "Europe/Rome"],
  ["Copenhagen", "Europe/Copenhagen"],
  ["Stockholm", "Europe/Stockholm"],
  ["Oslo", "Europe/Oslo"],
  ["Helsinki", "Europe/Helsinki"],
  ["Warsaw", "Europe/Warsaw"],
  ["Prague", "Europe/Prague"],
  ["Budapest", "Europe/Budapest"],
  ["Athens", "Europe/Athens"],
  ["Istanbul", "Europe/Istanbul"],
  ["Moscow", "Europe/Moscow"],
  ["Kyiv", "Europe/Kyiv"],
  ["Kiev", "Europe/Kyiv"],

  // ── Middle East / Africa ──
  ["Dubai", "Asia/Dubai"],
  ["Abu Dhabi", "Asia/Dubai"],
  ["Tel Aviv", "Asia/Jerusalem"],
  ["Jerusalem", "Asia/Jerusalem"],
  ["Riyadh", "Asia/Riyadh"],
  ["Doha", "Asia/Qatar"],
  ["Cairo", "Africa/Cairo"],
  ["Lagos", "Africa/Lagos"],
  ["Nairobi", "Africa/Nairobi"],
  ["Johannesburg", "Africa/Johannesburg"],
  ["Cape Town", "Africa/Johannesburg"],
  ["Casablanca", "Africa/Casablanca"],

  // ── Asia / Pacific ──
  ["Mumbai", "Asia/Kolkata"],
  ["Delhi", "Asia/Kolkata"],
  ["New Delhi", "Asia/Kolkata"],
  ["Bangalore", "Asia/Kolkata"],
  ["Bengaluru", "Asia/Kolkata"],
  ["Hyderabad", "Asia/Kolkata"],
  ["Chennai", "Asia/Kolkata"],
  ["Kolkata", "Asia/Kolkata"],
  ["Karachi", "Asia/Karachi"],
  ["Lahore", "Asia/Karachi"],
  ["Dhaka", "Asia/Dhaka"],
  ["Bangkok", "Asia/Bangkok"],
  ["Jakarta", "Asia/Jakarta"],
  ["Singapore", "Asia/Singapore"],
  ["Kuala Lumpur", "Asia/Kuala_Lumpur"],
  ["Manila", "Asia/Manila"],
  ["Hong Kong", "Asia/Hong_Kong"],
  ["Shanghai", "Asia/Shanghai"],
  ["Beijing", "Asia/Shanghai"],
  ["Shenzhen", "Asia/Shanghai"],
  ["Guangzhou", "Asia/Shanghai"],
  ["Taipei", "Asia/Taipei"],
  ["Seoul", "Asia/Seoul"],
  ["Tokyo", "Asia/Tokyo"],
  ["Osaka", "Asia/Tokyo"],
  ["Kyoto", "Asia/Tokyo"],
  ["Sydney", "Australia/Sydney"],
  ["Melbourne", "Australia/Melbourne"],
  ["Brisbane", "Australia/Brisbane"],
  ["Perth", "Australia/Perth"],
  ["Adelaide", "Australia/Adelaide"],
  ["Auckland", "Pacific/Auckland"],
  ["Wellington", "Pacific/Auckland"],
]

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics: "são" -> "sao"
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

export const CITY_ZONES: CityZone[] = RAW.map(([city, tz]) => ({ city, tz }))

const CITY_INDEX: Array<{ key: string; city: string; tz: string }> = RAW.map(
  ([city, tz]) => ({ key: normalize(city), city, tz }),
)

/**
 * Return city matches for a free-text query (prefix/substring match on the
 * normalized city name). Deduped by tz+city. Capped for UI.
 */
export function lookupCities(query: string, limit = 8): CityZone[] {
  const q = normalize(query)
  if (q.length < 2) return []
  const starts: CityZone[] = []
  const contains: CityZone[] = []
  for (const { key, city, tz } of CITY_INDEX) {
    if (key.startsWith(q)) starts.push({ city, tz })
    else if (key.includes(q)) contains.push({ city, tz })
  }
  return [...starts, ...contains].slice(0, limit)
}
