// Curated city -> IANA timezone map so the timezone picker supports a broad
// city search (e.g. "New Orleans" -> America/Chicago), not just the city names
// that happen to appear in IANA zone ids. Kept dependency-free and focused on
// well-known cities; the IANA zone list still backs everything else.
//
// Keys are lowercased, whitespace/punctuation-stripped city names. Multiple
// spellings (e.g. "saintlouis"/"stlouis") can map to the same zone.

export interface CityZone {
  /** Display name for the city/region (e.g. "Karachi, Pakistan", "New Orleans, USA"). */
  city: string
  /** IANA timezone ID (e.g. "Asia/Karachi"). */
  tz: string
  /** Country or territory name for enhanced search and display. */
  country?: string
  /** Extra search aliases and alternate names. */
  aliases?: string[]
}

type RawZoneEntry = [string, string, string?, string[]?]

const RAW: RawZoneEntry[] = [
  // ── Asia / Pacific ──
  [
    "Karachi, Pakistan",
    "Asia/Karachi",
    "Pakistan",
    [
      "paki",
      "pk",
      "lahore",
      "islamabad",
      "rawalpindi",
      "faisalabad",
      "peshawar",
      "quetta",
    ],
  ],
  [
    "Kolkata, India",
    "Asia/Kolkata",
    "India",
    [
      "bharat",
      "hindustan",
      "delhi",
      "new delhi",
      "mumbai",
      "bangalore",
      "bengaluru",
      "hyderabad",
      "chennai",
      "ahmedabad",
      "pune",
    ],
  ],
  [
    "Tokyo, Japan",
    "Asia/Tokyo",
    "Japan",
    [
      "jp",
      "nippon",
      "nihon",
      "osaka",
      "kyoto",
      "yokohama",
      "nagoya",
      "sapporo",
    ],
  ],
  [
    "Seoul, South Korea",
    "Asia/Seoul",
    "South Korea",
    ["kr", "korea", "s korea", "rok", "busan", "incheon"],
  ],
  [
    "Beijing / Shanghai, China",
    "Asia/Shanghai",
    "China",
    [
      "cn",
      "prc",
      "zhongguo",
      "beijing",
      "shanghai",
      "shenzhen",
      "guangzhou",
      "chengdu",
      "wuhan",
      "hangzhou",
    ],
  ],
  ["Taipei, Taiwan", "Asia/Taipei", "Taiwan", ["tw", "kaohsiung"]],
  ["Hong Kong", "Asia/Hong_Kong", "Hong Kong", ["hk"]],
  ["Singapore", "Asia/Singapore", "Singapore", ["sg", "spore"]],
  ["Bangkok, Thailand", "Asia/Bangkok", "Thailand", ["th", "chiang mai"]],
  [
    "Jakarta, Indonesia",
    "Asia/Jakarta",
    "Indonesia",
    ["id", "surabaya", "bali"],
  ],
  ["Kuala Lumpur, Malaysia", "Asia/Kuala_Lumpur", "Malaysia", ["my", "penang"]],
  ["Manila, Philippines", "Asia/Manila", "Philippines", ["ph", "cebu"]],
  [
    "Ho Chi Minh City, Vietnam",
    "Asia/Ho_Chi_Minh",
    "Vietnam",
    ["vn", "saigon", "hanoi"],
  ],
  ["Dhaka, Bangladesh", "Asia/Dhaka", "Bangladesh", ["bd", "chittagong"]],
  ["Colombo, Sri Lanka", "Asia/Colombo", "Sri Lanka", ["lk"]],
  ["Kathmandu, Nepal", "Asia/Kathmandu", "Nepal", ["np"]],
  [
    "Sydney, Australia",
    "Australia/Sydney",
    "Australia",
    ["au", "aussie", "canberra", "nsw"],
  ],
  [
    "Melbourne, Australia",
    "Australia/Melbourne",
    "Australia",
    ["au", "aussie", "vic"],
  ],
  ["Brisbane, Australia", "Australia/Brisbane", "Australia", ["au", "qld"]],
  ["Perth, Australia", "Australia/Perth", "Australia", ["au", "wa"]],
  ["Adelaide, Australia", "Australia/Adelaide", "Australia", ["au", "sa"]],
  [
    "Auckland, New Zealand",
    "Pacific/Auckland",
    "New Zealand",
    ["nz", "aotearoa", "wellington", "christchurch"],
  ],

  // ── Middle East & Africa ──
  [
    "Dubai, UAE",
    "Asia/Dubai",
    "United Arab Emirates",
    ["uae", "emirates", "abu dhabi"],
  ],
  [
    "Riyadh, Saudi Arabia",
    "Asia/Riyadh",
    "Saudi Arabia",
    ["ksa", "saudi", "jeddah", "mecca"],
  ],
  ["Doha, Qatar", "Asia/Qatar", "Qatar", ["qa"]],
  [
    "Tel Aviv / Jerusalem, Israel",
    "Asia/Jerusalem",
    "Israel",
    ["il", "tel aviv", "jerusalem"],
  ],
  ["Cairo, Egypt", "Africa/Cairo", "Egypt", ["eg", "alexandria"]],
  [
    "Casablanca, Morocco",
    "Africa/Casablanca",
    "Morocco",
    ["ma", "marrakech", "rabat"],
  ],
  ["Lagos, Nigeria", "Africa/Lagos", "Nigeria", ["ng", "abuja"]],
  ["Nairobi, Kenya", "Africa/Nairobi", "Kenya", ["ke"]],
  [
    "Johannesburg, South Africa",
    "Africa/Johannesburg",
    "South Africa",
    ["za", "s africa", "cape town", "durban", "pretoria"],
  ],

  // ── United States ──
  [
    "New York, USA",
    "America/New_York",
    "United States",
    [
      "us",
      "usa",
      "america",
      "nyc",
      "manhattan",
      "brooklyn",
      "queens",
      "bronx",
      "boston",
      "philadelphia",
      "washington",
      "dc",
      "atlanta",
      "miami",
      "orlando",
      "tampa",
      "charlotte",
      "raleigh",
      "pittsburgh",
      "cleveland",
      "columbus",
      "cincinnati",
      "buffalo",
      "baltimore",
      "richmond",
      "newark",
      "hartford",
      "providence",
    ],
  ],
  [
    "Chicago, USA",
    "America/Chicago",
    "United States",
    [
      "us",
      "usa",
      "america",
      "new orleans",
      "houston",
      "san antonio",
      "dallas",
      "austin",
      "fort worth",
      "memphis",
      "nashville",
      "milwaukee",
      "kansas city",
      "st louis",
      "saint louis",
      "minneapolis",
      "st paul",
      "saint paul",
      "oklahoma city",
      "tulsa",
      "omaha",
      "madison",
      "baton rouge",
      "birmingham",
      "little rock",
      "des moines",
      "jackson",
    ],
  ],
  [
    "Denver, USA",
    "America/Denver",
    "United States",
    [
      "us",
      "usa",
      "america",
      "boulder",
      "colorado springs",
      "albuquerque",
      "santa fe",
      "salt lake city",
      "slc",
      "cheyenne",
      "billings",
      "el paso",
    ],
  ],
  [
    "Phoenix, USA",
    "America/Phoenix",
    "United States",
    ["us", "usa", "america", "arizona", "tucson", "mesa", "scottsdale"],
  ],
  [
    "Los Angeles, USA",
    "America/Los_Angeles",
    "United States",
    [
      "us",
      "usa",
      "america",
      "la",
      "sf",
      "san francisco",
      "bay area",
      "san diego",
      "san jose",
      "sacramento",
      "oakland",
      "fresno",
      "long beach",
      "seattle",
      "portland",
      "las vegas",
      "reno",
      "spokane",
      "tacoma",
    ],
  ],
  [
    "Detroit, USA",
    "America/Detroit",
    "United States",
    ["us", "usa", "michigan"],
  ],
  [
    "Indianapolis, USA",
    "America/Indiana/Indianapolis",
    "United States",
    ["us", "usa", "indiana"],
  ],
  [
    "Anchorage, USA",
    "America/Anchorage",
    "United States",
    ["us", "usa", "alaska"],
  ],
  [
    "Honolulu, USA",
    "Pacific/Honolulu",
    "United States",
    ["us", "usa", "hawaii"],
  ],

  // ── Canada & Latin America ──
  [
    "Toronto, Canada",
    "America/Toronto",
    "Canada",
    ["ca", "canada", "ottawa", "montreal", "quebec"],
  ],
  [
    "Vancouver, Canada",
    "America/Vancouver",
    "Canada",
    ["ca", "canada", "victoria"],
  ],
  [
    "Calgary, Canada",
    "America/Edmonton",
    "Canada",
    ["ca", "canada", "edmonton"],
  ],
  ["Winnipeg, Canada", "America/Winnipeg", "Canada", ["ca", "canada"]],
  ["Halifax, Canada", "America/Halifax", "Canada", ["ca", "canada"]],
  [
    "Mexico City, Mexico",
    "America/Mexico_City",
    "Mexico",
    ["mx", "mexico", "guadalajara", "monterrey", "puebla", "cancun"],
  ],
  [
    "São Paulo, Brazil",
    "America/Sao_Paulo",
    "Brazil",
    ["br", "brasil", "rio", "rio de janeiro", "brasilia"],
  ],
  [
    "Buenos Aires, Argentina",
    "America/Argentina/Buenos_Aires",
    "Argentina",
    ["ar"],
  ],
  ["Bogotá, Colombia", "America/Bogota", "Colombia", ["co"]],
  ["Lima, Peru", "America/Lima", "Peru", ["pe"]],
  ["Santiago, Chile", "America/Santiago", "Chile", ["cl"]],

  // ── Europe ──
  [
    "London, United Kingdom",
    "Europe/London",
    "United Kingdom",
    [
      "uk",
      "britain",
      "great britain",
      "england",
      "scotland",
      "wales",
      "manchester",
      "birmingham",
      "edinburgh",
      "glasgow",
      "belfast",
    ],
  ],
  ["Dublin, Ireland", "Europe/Dublin", "Ireland", ["ie"]],
  [
    "Paris, France",
    "Europe/Paris",
    "France",
    ["fr", "marseille", "lyon", "toulouse", "nice"],
  ],
  [
    "Berlin, Germany",
    "Europe/Berlin",
    "Germany",
    [
      "de",
      "deutschland",
      "munich",
      "hamburg",
      "frankfurt",
      "cologne",
      "stuttgart",
      "dusseldorf",
    ],
  ],
  [
    "Madrid, Spain",
    "Europe/Madrid",
    "Spain",
    ["es", "espana", "barcelona", "valencia", "seville"],
  ],
  ["Lisbon, Portugal", "Europe/Lisbon", "Portugal", ["pt", "porto"]],
  [
    "Rome, Italy",
    "Europe/Rome",
    "Italy",
    ["it", "italia", "milan", "naples", "turin", "florence"],
  ],
  [
    "Amsterdam, Netherlands",
    "Europe/Amsterdam",
    "Netherlands",
    ["nl", "holland", "rotterdam", "the hague", "utrecht"],
  ],
  ["Brussels, Belgium", "Europe/Brussels", "Belgium", ["be", "antwerp"]],
  [
    "Zurich, Switzerland",
    "Europe/Zurich",
    "Switzerland",
    ["ch", "geneva", "basel", "bern"],
  ],
  ["Vienna, Austria", "Europe/Vienna", "Austria", ["at", "salzburg"]],
  ["Copenhagen, Denmark", "Europe/Copenhagen", "Denmark", ["dk"]],
  ["Stockholm, Sweden", "Europe/Stockholm", "Sweden", ["se", "gothenburg"]],
  ["Oslo, Norway", "Europe/Oslo", "Norway", ["no", "bergen"]],
  ["Helsinki, Finland", "Europe/Helsinki", "Finland", ["fi", "espoo"]],
  ["Warsaw, Poland", "Europe/Warsaw", "Poland", ["pl", "krakow", "gdansk"]],
  [
    "Prague, Czech Republic",
    "Europe/Prague",
    "Czech Republic",
    ["cz", "czechia", "brno"],
  ],
  ["Budapest, Hungary", "Europe/Budapest", "Hungary", ["hu"]],
  ["Athens, Greece", "Europe/Athens", "Greece", ["gr", "thessaloniki"]],
  [
    "Istanbul, Turkey",
    "Europe/Istanbul",
    "Turkey",
    ["tr", "turkiye", "ankara", "izmir"],
  ],
  ["Moscow, Russia", "Europe/Moscow", "Russia", ["ru", "saint petersburg"]],
  ["Kyiv, Ukraine", "Europe/Kyiv", "Ukraine", ["ua", "kiev", "lviv", "odesa"]],
  ["Bucharest, Romania", "Europe/Bucharest", "Romania", ["ro"]],
]

export const CITY_ZONES: CityZone[] = RAW.map(
  ([city, tz, country, aliases]) => ({
    city,
    tz,
    country,
    aliases,
  }),
)

function normalizeString(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // keep letters, numbers, spaces
    .trim()
}

const SHORT_COUNTRY: Record<string, string> = {
  "United States": "USA",
  "United Kingdom": "UK",
  "United Arab Emirates": "UAE",
}

const SKIP_ALIAS_FORMAT = new Set([
  "us",
  "usa",
  "america",
  "uk",
  "britain",
  "great britain",
  "england",
  "scotland",
  "wales",
  "uae",
  "emirates",
  "ksa",
  "saudi",
  "ca",
  "canada",
  "mx",
  "mexico",
  "br",
  "brasil",
  "ar",
  "co",
  "pe",
  "cl",
  "ie",
  "fr",
  "de",
  "deutschland",
  "es",
  "espana",
  "pt",
  "it",
  "italia",
  "nl",
  "holland",
  "be",
  "ch",
  "at",
  "dk",
  "se",
  "no",
  "fi",
  "pl",
  "cz",
  "czechia",
  "hu",
  "gr",
  "tr",
  "turkiye",
  "ru",
  "ua",
  "ro",
  "pk",
  "paki",
  "in",
  "bharat",
  "hindustan",
  "jp",
  "nippon",
  "nihon",
  "kr",
  "korea",
  "s korea",
  "rok",
  "cn",
  "prc",
  "zhongguo",
  "tw",
  "hk",
  "sg",
  "spore",
  "th",
  "id",
  "my",
  "ph",
  "vn",
  "bd",
  "lk",
  "np",
  "au",
  "aussie",
  "nz",
  "aotearoa",
  "eg",
  "ma",
  "ng",
  "ke",
  "za",
  "s africa",
])

function formatAliasCity(alias: string, entry: CityZone): string {
  const lowerAlias = alias.toLowerCase()
  if (SKIP_ALIAS_FORMAT.has(lowerAlias)) return entry.city

  const cityName = lowerAlias
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

  const country = entry.country
    ? (SHORT_COUNTRY[entry.country] ?? entry.country)
    : ""
  return country ? `${cityName}, ${country}` : cityName
}

/**
 * Return city matches for a free-text query (multi-tier exact, prefix, tokenized,
 * and substring search). Deduped by city name. Capped for UI.
 */
export function lookupCities(query: string, limit = 12): CityZone[] {
  const normQuery = normalizeString(query)
  if (!normQuery) return []
  const compactQuery = normQuery.replace(/\s+/g, "")

  const exactMatches: CityZone[] = []
  const prefixMatches: CityZone[] = []
  const tokenMatches: CityZone[] = []
  const substringMatches: CityZone[] = []

  const seenCity = new Set<string>()

  for (const entry of CITY_ZONES) {
    const cityNorm = normalizeString(entry.city)
    const cityCompact = cityNorm.replace(/\s+/g, "")
    const countryNorm = entry.country ? normalizeString(entry.country) : ""
    const countryCompact = countryNorm.replace(/\s+/g, "")
    const tzNorm = normalizeString(entry.tz)
    const tzCompact = tzNorm.replace(/\s+/g, "")

    // 1) Primary city, country name, or IANA tz match
    if (
      cityCompact === compactQuery ||
      countryCompact === compactQuery ||
      tzCompact === compactQuery
    ) {
      if (!seenCity.has(entry.city)) {
        exactMatches.push(entry)
        seenCity.add(entry.city)
      }
    } else if (
      cityCompact.startsWith(compactQuery) ||
      countryCompact.startsWith(compactQuery) ||
      tzCompact.startsWith(compactQuery)
    ) {
      if (!seenCity.has(entry.city)) {
        prefixMatches.push(entry)
        seenCity.add(entry.city)
      }
    } else if (
      cityCompact.includes(compactQuery) ||
      countryCompact.includes(compactQuery) ||
      tzCompact.includes(compactQuery)
    ) {
      if (!seenCity.has(entry.city)) {
        substringMatches.push(entry)
        seenCity.add(entry.city)
      }
    }

    // 2) Alias matches
    for (const alias of entry.aliases ?? []) {
      const aliasNorm = normalizeString(alias)
      const aliasCompact = aliasNorm.replace(/\s+/g, "")
      if (!aliasCompact) continue

      if (
        aliasCompact.startsWith(compactQuery) ||
        (compactQuery.length >= 3 && aliasCompact.includes(compactQuery))
      ) {
        const displayCity = formatAliasCity(alias, entry)
        if (!seenCity.has(displayCity)) {
          const matchedItem: CityZone = { ...entry, city: displayCity }
          if (aliasCompact === compactQuery) {
            exactMatches.push(matchedItem)
          } else if (aliasCompact.startsWith(compactQuery)) {
            prefixMatches.push(matchedItem)
          } else {
            substringMatches.push(matchedItem)
          }
          seenCity.add(displayCity)
        }
      }
    }
  }

  return [
    ...exactMatches,
    ...prefixMatches,
    ...tokenMatches,
    ...substringMatches,
  ].slice(0, limit)
}
