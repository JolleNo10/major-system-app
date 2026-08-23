export type Continent =
  | "Africa"
  | "Asia"
  | "Europe"
  | "North America"
  | "South America"
  | "Oceania";

import { getSubregionDefinition, getSubregionIdForLabel, type SubregionId } from './subregions'

export type { SubregionId } from './subregions'

export type CountryId = string

/** The bundled map reference associated with each geography Continent. */
export const CONTINENT_MAP_IDS: Readonly<Record<Continent, string>> = {
  Africa: 'africa',
  Asia: 'asia',
  Europe: 'europe',
  'North America': 'america',
  'South America': 'america',
  Oceania: 'oceania',
}

export interface Country {
  /** Stable ISO-like code used by persisted learning and mnemonic records. */
  id: CountryId;
  country: string;
  capital: string;
  continent: Continent;
  /** Stable canonical Subregion identity. */
  subregionId: SubregionId;
  /** Display label for the canonical Subregion. */
  subregion: string;
  /** UN M49 subregion retained when the app's learning geography differs. */
  unM49Subregion?: string;
  aliases?: readonly string[];
}

type CountryRecordInput = Omit<Country, 'id' | 'subregionId'>

const COUNTRY_CODES = [
  'IS', 'NO', 'SE', 'FI', 'EE', 'LV', 'LT', 'DK', 'GB', 'IE', 'RU', 'BY',
  'UA', 'MD', 'RO', 'HR', 'BA', 'RS', 'ME', 'AL', 'XK', 'MK', 'BG', 'DE',
  'PL', 'CZ', 'SK', 'HU', 'SI', 'AT', 'LI', 'CH', 'NL', 'BE', 'LU', 'FR',
  'MC', 'PT', 'ES', 'AD', 'IT', 'SM', 'VA', 'MT', 'GR', 'CY', 'TR', 'SY',
  'LB', 'IL', 'PS', 'JO', 'SA', 'YE', 'OM', 'AE', 'QA', 'BH', 'KW', 'IQ',
  'IR', 'GE', 'AM', 'AZ', 'KZ', 'TM', 'UZ', 'KG', 'TJ', 'MN', 'CN', 'KP',
  'KR', 'JP', 'TW', 'AF', 'PK', 'IN', 'NP', 'BT', 'BD', 'LK', 'MV', 'MM',
  'LA', 'VN', 'KH', 'TH', 'MY', 'SG', 'BN', 'PH', 'ID', 'TL', 'AU', 'NZ',
  'PW', 'FM', 'NR', 'MH', 'KI', 'PG', 'SB', 'VU', 'FJ', 'CK', 'NU', 'TV',
  'WS', 'TO', 'MA', 'DZ', 'TN', 'LY', 'EG', 'SD', 'TG', 'BJ', 'CV', 'GM',
  'GW', 'MR', 'LR', 'GN', 'SL', 'CI', 'SN', 'ML', 'GH', 'BF', 'NG', 'NE',
  'TD', 'CM', 'CF', 'CD', 'CG', 'GA', 'GQ', 'ST', 'ER', 'DJ', 'SO', 'ET',
  'SS', 'UG', 'KE', 'TZ', 'BI', 'RW', 'AO', 'ZM', 'MW', 'MZ', 'ZW', 'BW',
  'NA', 'ZA', 'SZ', 'LS', 'KM', 'MG', 'SC', 'MU', 'CA', 'GL', 'US', 'MX',
  'BZ', 'GT', 'SV', 'HN', 'NI', 'CR', 'PA', 'CU', 'JM', 'BS', 'HT', 'DO',
  'KN', 'AG', 'DM', 'LC', 'BB', 'VC', 'GD', 'TT', 'CO', 'VE', 'GY', 'SR',
  'EC', 'PE', 'BO', 'BR', 'CL', 'AR', 'PY', 'UY',
] as const

const COUNTRY_RECORDS: CountryRecordInput[] = [
  { country: "Iceland", capital: "Reykjavík", continent: "Europe", subregion: "Northern Europe" },
  { country: "Norway", capital: "Oslo", continent: "Europe", subregion: "Northern Europe" },
  { country: "Sweden", capital: "Stockholm", continent: "Europe", subregion: "Northern Europe" },
  { country: "Finland", capital: "Helsinki", continent: "Europe", subregion: "Northern Europe" },
  { country: "Estonia", capital: "Tallinn", continent: "Europe", subregion: "Northern Europe" },
  { country: "Latvia", capital: "Riga", continent: "Europe", subregion: "Northern Europe" },
  { country: "Lithuania", capital: "Vilnius", continent: "Europe", subregion: "Northern Europe" },
  { country: "Denmark", capital: "Copenhagen", continent: "Europe", subregion: "Northern Europe" },
  { country: "United Kingdom", capital: "London", continent: "Europe", subregion: "Northern Europe", aliases: ["England", "Northern_Ireland", "Scotland", "Wales"] },
  { country: "Ireland", capital: "Dublin", continent: "Europe", subregion: "Northern Europe" },
  { country: "Russia", capital: "Moscow", continent: "Europe", subregion: "Eastern Europe" },
  { country: "Belarus", capital: "Minsk", continent: "Europe", subregion: "Eastern Europe" },
  { country: "Ukraine", capital: "Kyiv", continent: "Europe", subregion: "Eastern Europe" },
  { country: "Moldova", capital: "Chișinău", continent: "Europe", subregion: "Eastern Europe" },
  { country: "Romania", capital: "Bucharest", continent: "Europe", subregion: "Eastern Europe" },
  { country: "Croatia", capital: "Zagreb", continent: "Europe", subregion: "Balkans" },
  { country: "Bosnia and Herzegovina", capital: "Sarajevo", continent: "Europe", subregion: "Balkans", aliases: ["Bosnia_and_Herzegovina"] },
  { country: "Serbia", capital: "Belgrade", continent: "Europe", subregion: "Balkans" },
  { country: "Montenegro", capital: "Podgorica", continent: "Europe", subregion: "Balkans" },
  { country: "Albania", capital: "Tirana", continent: "Europe", subregion: "Balkans" },
  { country: "Kosovo", capital: "Pristina", continent: "Europe", subregion: "Balkans" },
  { country: "North Macedonia", capital: "Skopje", continent: "Europe", subregion: "Balkans", aliases: ["North_Macedonia"] },
  { country: "Bulgaria", capital: "Sofia", continent: "Europe", subregion: "Balkans" },
  { country: "Germany", capital: "Berlin", continent: "Europe", subregion: "Central Europe" },
  { country: "Poland", capital: "Warsaw", continent: "Europe", subregion: "Central Europe" },
  { country: "Czechia", capital: "Prague", continent: "Europe", subregion: "Central Europe" },
  { country: "Slovakia", capital: "Bratislava", continent: "Europe", subregion: "Central Europe" },
  { country: "Hungary", capital: "Budapest", continent: "Europe", subregion: "Central Europe" },
  { country: "Slovenia", capital: "Ljubljana", continent: "Europe", subregion: "Central Europe" },
  { country: "Austria", capital: "Vienna", continent: "Europe", subregion: "Central Europe" },
  { country: "Liechtenstein", capital: "Vaduz", continent: "Europe", subregion: "Central Europe" },
  { country: "Switzerland", capital: "Bern", continent: "Europe", subregion: "Central Europe" },
  { country: "Netherlands", capital: "Amsterdam", continent: "Europe", subregion: "Western Europe" },
  { country: "Belgium", capital: "Brussels", continent: "Europe", subregion: "Western Europe" },
  { country: "Luxembourg", capital: "Luxembourg", continent: "Europe", subregion: "Western Europe" },
  { country: "France", capital: "Paris", continent: "Europe", subregion: "Western Europe" },
  { country: "Monaco", capital: "Monaco", continent: "Europe", subregion: "Western Europe" },
  { country: "Portugal", capital: "Lisbon", continent: "Europe", subregion: "Southern Europe" },
  { country: "Spain", capital: "Madrid", continent: "Europe", subregion: "Southern Europe" },
  { country: "Andorra", capital: "Andorra la Vella", continent: "Europe", subregion: "Southern Europe" },
  { country: "Italy", capital: "Rome", continent: "Europe", subregion: "Southern Europe" },
  { country: "San Marino", capital: "San Marino", continent: "Europe", subregion: "Southern Europe", aliases: ["San_Marino"] },
  { country: "Vatican City", capital: "Vatican City", continent: "Europe", subregion: "Southern Europe", aliases: ["Vatican_City"] },
  { country: "Malta", capital: "Valletta", continent: "Europe", subregion: "Southern Europe" },
  { country: "Greece", capital: "Athens", continent: "Europe", subregion: "Southern Europe" },
  { country: "Cyprus", capital: "Nicosia", continent: "Europe", subregion: "Southern Europe", unM49Subregion: "Western Asia" },
  { country: "Türkiye", capital: "Ankara", continent: "Asia", subregion: "West Asia" },
  { country: "Syria", capital: "Damascus", continent: "Asia", subregion: "West Asia" },
  { country: "Lebanon", capital: "Beirut", continent: "Asia", subregion: "West Asia" },
  { country: "Israel", capital: "Jerusalem", continent: "Asia", subregion: "West Asia" },
  { country: "Palestine", capital: "East Jerusalem", continent: "Asia", subregion: "West Asia" },
  { country: "Jordan", capital: "Amman", continent: "Asia", subregion: "West Asia" },
  { country: "Saudi Arabia", capital: "Riyadh", continent: "Asia", subregion: "West Asia" },
  { country: "Yemen", capital: "Sana'a", continent: "Asia", subregion: "West Asia" },
  { country: "Oman", capital: "Muscat", continent: "Asia", subregion: "West Asia" },
  { country: "United Arab Emirates", capital: "Abu Dhabi", continent: "Asia", subregion: "West Asia" },
  { country: "Qatar", capital: "Doha", continent: "Asia", subregion: "West Asia" },
  { country: "Bahrain", capital: "Manama", continent: "Asia", subregion: "West Asia" },
  { country: "Kuwait", capital: "Kuwait City", continent: "Asia", subregion: "West Asia" },
  { country: "Iraq", capital: "Baghdad", continent: "Asia", subregion: "West Asia" },
  { country: "Iran", capital: "Tehran", continent: "Asia", subregion: "West Asia" },
  { country: "Georgia", capital: "Tbilisi", continent: "Asia", subregion: "Caucasus" },
  { country: "Armenia", capital: "Yerevan", continent: "Asia", subregion: "Caucasus" },
  { country: "Azerbaijan", capital: "Baku", continent: "Asia", subregion: "Caucasus" },
  { country: "Kazakhstan", capital: "Astana", continent: "Asia", subregion: "Central Asia" },
  { country: "Turkmenistan", capital: "Ashgabat", continent: "Asia", subregion: "Central Asia" },
  { country: "Uzbekistan", capital: "Tashkent", continent: "Asia", subregion: "Central Asia" },
  { country: "Kyrgyzstan", capital: "Bishkek", continent: "Asia", subregion: "Central Asia" },
  { country: "Tajikistan", capital: "Dushanbe", continent: "Asia", subregion: "Central Asia" },
  { country: "Mongolia", capital: "Ulaanbaatar", continent: "Asia", subregion: "East Asia" },
  { country: "China", capital: "Beijing", continent: "Asia", subregion: "East Asia" },
  { country: "North Korea", capital: "Pyongyang", continent: "Asia", subregion: "East Asia" },
  { country: "South Korea", capital: "Seoul", continent: "Asia", subregion: "East Asia" },
  { country: "Japan", capital: "Tokyo", continent: "Asia", subregion: "East Asia" },
  { country: "Taiwan", capital: "Taipei", continent: "Asia", subregion: "East Asia" },
  { country: "Afghanistan", capital: "Kabul", continent: "Asia", subregion: "South Asia" },
  { country: "Pakistan", capital: "Islamabad", continent: "Asia", subregion: "South Asia" },
  { country: "India", capital: "New Delhi", continent: "Asia", subregion: "South Asia" },
  { country: "Nepal", capital: "Kathmandu", continent: "Asia", subregion: "South Asia" },
  { country: "Bhutan", capital: "Thimphu", continent: "Asia", subregion: "South Asia" },
  { country: "Bangladesh", capital: "Dhaka", continent: "Asia", subregion: "South Asia" },
  { country: "Sri Lanka", capital: "Sri Jayawardenepura Kotte", continent: "Asia", subregion: "South Asia" },
  { country: "Maldives", capital: "Malé", continent: "Asia", subregion: "South Asia" },
  { country: "Myanmar", capital: "Naypyidaw", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Laos", capital: "Vientiane", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Vietnam", capital: "Hanoi", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Cambodia", capital: "Phnom Penh", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Thailand", capital: "Bangkok", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Malaysia", capital: "Kuala Lumpur", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Singapore", capital: "Singapore", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Brunei", capital: "Bandar Seri Begawan", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Philippines", capital: "Manila", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Indonesia", capital: "Jakarta", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Timor-Leste", capital: "Dili", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Australia", capital: "Canberra", continent: "Oceania", subregion: "Australia & New Zealand" },
  { country: "New Zealand", capital: "Wellington", continent: "Oceania", subregion: "Australia & New Zealand" },
  { country: "Palau", capital: "Ngerulmud", continent: "Oceania", subregion: "Micronesia" },
  { country: "Micronesia", capital: "Palikir", continent: "Oceania", subregion: "Micronesia" },
  { country: "Nauru", capital: "Yaren", continent: "Oceania", subregion: "Micronesia" },
  { country: "Marshall Islands", capital: "Majuro", continent: "Oceania", subregion: "Micronesia" },
  { country: "Kiribati", capital: "South Tarawa", continent: "Oceania", subregion: "Micronesia" },
  { country: "Papua New Guinea", capital: "Port Moresby", continent: "Oceania", subregion: "Melanesia" },
  { country: "Solomon Islands", capital: "Honiara", continent: "Oceania", subregion: "Melanesia" },
  { country: "Vanuatu", capital: "Port Vila", continent: "Oceania", subregion: "Melanesia" },
  { country: "Fiji", capital: "Suva", continent: "Oceania", subregion: "Melanesia" },
  { country: "Cook Islands", capital: "Avarua", continent: "Oceania", subregion: "Polynesia", unM49Subregion: "Polynesia" },
  { country: "Niue", capital: "Alofi", continent: "Oceania", subregion: "Polynesia", unM49Subregion: "Polynesia" },
  { country: "Tuvalu", capital: "Funafuti", continent: "Oceania", subregion: "Polynesia" },
  { country: "Samoa", capital: "Apia", continent: "Oceania", subregion: "Polynesia" },
  { country: "Tonga", capital: "Nuku'alofa", continent: "Oceania", subregion: "Polynesia" },
  { country: "Morocco", capital: "Rabat", continent: "Africa", subregion: "North Africa" },
  { country: "Algeria", capital: "Algiers", continent: "Africa", subregion: "North Africa" },
  { country: "Tunisia", capital: "Tunis", continent: "Africa", subregion: "North Africa" },
  { country: "Libya", capital: "Tripoli", continent: "Africa", subregion: "North Africa" },
  { country: "Egypt", capital: "Cairo", continent: "Africa", subregion: "North Africa" },
  { country: "Sudan", capital: "Khartoum", continent: "Africa", subregion: "North Africa" },
  { country: "Togo", capital: "Lomé", continent: "Africa", subregion: "West Africa" },
  { country: "Benin", capital: "Porto-Novo", continent: "Africa", subregion: "West Africa" },
  { country: "Cabo Verde", capital: "Praia", continent: "Africa", subregion: "West Africa" },
  { country: "Gambia", capital: "Banjul", continent: "Africa", subregion: "West Africa" },
  { country: "Guinea-Bissau", capital: "Bissau", continent: "Africa", subregion: "West Africa" },
  { country: "Mauritania", capital: "Nouakchott", continent: "Africa", subregion: "West Africa" },
  { country: "Liberia", capital: "Monrovia", continent: "Africa", subregion: "West Africa" },
  { country: "Guinea", capital: "Conakry", continent: "Africa", subregion: "West Africa" },
  { country: "Sierra Leone", capital: "Freetown", continent: "Africa", subregion: "West Africa" },
  { country: "Côte d'Ivoire", capital: "Yamoussoukro", continent: "Africa", subregion: "West Africa" },
  { country: "Senegal", capital: "Dakar", continent: "Africa", subregion: "West Africa" },
  { country: "Mali", capital: "Bamako", continent: "Africa", subregion: "West Africa" },
  { country: "Ghana", capital: "Accra", continent: "Africa", subregion: "West Africa" },
  { country: "Burkina Faso", capital: "Ouagadougou", continent: "Africa", subregion: "West Africa" },
  { country: "Nigeria", capital: "Abuja", continent: "Africa", subregion: "West Africa" },
  { country: "Niger", capital: "Niamey", continent: "Africa", subregion: "West Africa" },
  { country: "Chad", capital: "N'Djamena", continent: "Africa", subregion: "Central Africa" },
  { country: "Cameroon", capital: "Yaoundé", continent: "Africa", subregion: "Central Africa" },
  { country: "Central African Republic", capital: "Bangui", continent: "Africa", subregion: "Central Africa" },
  { country: "Democratic Republic of the Congo", capital: "Kinshasa", continent: "Africa", subregion: "Central Africa" },
  { country: "Republic of the Congo", capital: "Brazzaville", continent: "Africa", subregion: "Central Africa" },
  { country: "Gabon", capital: "Libreville", continent: "Africa", subregion: "Central Africa" },
  { country: "Equatorial Guinea", capital: "Ciudad de la Paz", continent: "Africa", subregion: "Central Africa" },
  { country: "São Tomé and Príncipe", capital: "São Tomé", continent: "Africa", subregion: "Central Africa" },
  { country: "Eritrea", capital: "Asmara", continent: "Africa", subregion: "East Africa" },
  { country: "Djibouti", capital: "Djibouti", continent: "Africa", subregion: "East Africa" },
  { country: "Somalia", capital: "Mogadishu", continent: "Africa", subregion: "East Africa" },
  { country: "Ethiopia", capital: "Addis Ababa", continent: "Africa", subregion: "East Africa" },
  { country: "South Sudan", capital: "Juba", continent: "Africa", subregion: "East Africa" },
  { country: "Uganda", capital: "Kampala", continent: "Africa", subregion: "East Africa" },
  { country: "Kenya", capital: "Nairobi", continent: "Africa", subregion: "East Africa" },
  { country: "Tanzania", capital: "Dodoma", continent: "Africa", subregion: "East Africa" },
  { country: "Burundi", capital: "Gitega", continent: "Africa", subregion: "East Africa" },
  { country: "Rwanda", capital: "Kigali", continent: "Africa", subregion: "East Africa" },
  { country: "Angola", capital: "Luanda", continent: "Africa", subregion: "Southern Africa" },
  { country: "Zambia", capital: "Lusaka", continent: "Africa", subregion: "Southern Africa" },
  { country: "Malawi", capital: "Lilongwe", continent: "Africa", subregion: "Southern Africa" },
  { country: "Mozambique", capital: "Maputo", continent: "Africa", subregion: "Southern Africa" },
  { country: "Zimbabwe", capital: "Harare", continent: "Africa", subregion: "Southern Africa" },
  { country: "Botswana", capital: "Gaborone", continent: "Africa", subregion: "Southern Africa" },
  { country: "Namibia", capital: "Windhoek", continent: "Africa", subregion: "Southern Africa" },
  { country: "South Africa", capital: "Pretoria", continent: "Africa", subregion: "Southern Africa" },
  { country: "Eswatini", capital: "Mbabane", continent: "Africa", subregion: "Southern Africa" },
  { country: "Lesotho", capital: "Maseru", continent: "Africa", subregion: "Southern Africa" },
  { country: "Comoros", capital: "Moroni", continent: "Africa", subregion: "Indian Ocean" },
  { country: "Madagascar", capital: "Antananarivo", continent: "Africa", subregion: "Indian Ocean" },
  { country: "Seychelles", capital: "Victoria", continent: "Africa", subregion: "Indian Ocean" },
  { country: "Mauritius", capital: "Port Louis", continent: "Africa", subregion: "Indian Ocean" },
  { country: "Canada", capital: "Ottawa", continent: "North America", subregion: "Northern America" },
  { country: "Greenland", capital: "Nuuk", continent: "North America", subregion: "Northern America", unM49Subregion: "Northern America" },
  { country: "United States", capital: "Washington, D.C.", continent: "North America", subregion: "Northern America" },
  { country: "Mexico", capital: "Mexico City", continent: "North America", subregion: "Northern America" },
  { country: "Belize", capital: "Belmopan", continent: "North America", subregion: "Central America" },
  { country: "Guatemala", capital: "Guatemala City", continent: "North America", subregion: "Central America" },
  { country: "El Salvador", capital: "San Salvador", continent: "North America", subregion: "Central America" },
  { country: "Honduras", capital: "Tegucigalpa", continent: "North America", subregion: "Central America" },
  { country: "Nicaragua", capital: "Managua", continent: "North America", subregion: "Central America" },
  { country: "Costa Rica", capital: "San José", continent: "North America", subregion: "Central America" },
  { country: "Panama", capital: "Panama City", continent: "North America", subregion: "Central America" },
  { country: "Cuba", capital: "Havana", continent: "North America", subregion: "Caribbean" },
  { country: "Jamaica", capital: "Kingston", continent: "North America", subregion: "Caribbean" },
  { country: "Bahamas", capital: "Nassau", continent: "North America", subregion: "Caribbean" },
  { country: "Haiti", capital: "Port-au-Prince", continent: "North America", subregion: "Caribbean" },
  { country: "Dominican Republic", capital: "Santo Domingo", continent: "North America", subregion: "Caribbean" },
  { country: "Saint Kitts and Nevis", capital: "Basseterre", continent: "North America", subregion: "Caribbean" },
  { country: "Antigua and Barbuda", capital: "Saint John's", continent: "North America", subregion: "Caribbean" },
  { country: "Dominica", capital: "Roseau", continent: "North America", subregion: "Caribbean" },
  { country: "Saint Lucia", capital: "Castries", continent: "North America", subregion: "Caribbean" },
  { country: "Barbados", capital: "Bridgetown", continent: "North America", subregion: "Caribbean" },
  { country: "Saint Vincent and the Grenadines", capital: "Kingstown", continent: "North America", subregion: "Caribbean" },
  { country: "Grenada", capital: "Saint George's", continent: "North America", subregion: "Caribbean" },
  { country: "Trinidad and Tobago", capital: "Port of Spain", continent: "North America", subregion: "Caribbean" },
  { country: "Colombia", capital: "Bogotá", continent: "South America", subregion: "Northern South America" },
  { country: "Venezuela", capital: "Caracas", continent: "South America", subregion: "Northern South America" },
  { country: "Guyana", capital: "Georgetown", continent: "South America", subregion: "Northern South America" },
  { country: "Suriname", capital: "Paramaribo", continent: "South America", subregion: "Northern South America" },
  { country: "Ecuador", capital: "Quito", continent: "South America", subregion: "Andean Countries" },
  { country: "Peru", capital: "Lima", continent: "South America", subregion: "Andean Countries" },
  { country: "Bolivia", capital: "Sucre", continent: "South America", subregion: "Andean Countries" },
  { country: "Brazil", capital: "Brasília", continent: "South America", subregion: "Eastern South America" },
  { country: "Chile", capital: "Santiago", continent: "South America", subregion: "Southern Cone" },
  { country: "Argentina", capital: "Buenos Aires", continent: "South America", subregion: "Southern Cone" },
  { country: "Paraguay", capital: "Asunción", continent: "South America", subregion: "Southern Cone" },
  { country: "Uruguay", capital: "Montevideo", continent: "South America", subregion: "Southern Cone" },
];

if (COUNTRY_CODES.length !== COUNTRY_RECORDS.length) {
  throw new Error('Country codes and Country records must have matching lengths')
}

// Temporary branch containment: these positional arrays must remain in the same
// canonical order until the main-branch identity fix removes this coupling.
export const countries: Country[] = COUNTRY_RECORDS.map((entry, index) => {
  const subregionId = getSubregionIdForLabel(entry.subregion)
  if (!subregionId) throw new Error(`Unknown country Subregion label: ${entry.subregion}`)
  if (getSubregionDefinition(subregionId).continent !== entry.continent) {
    throw new Error(`Country ${entry.country} has an inconsistent Continent/Subregion pair`)
  }
  return { ...entry, id: COUNTRY_CODES[index], subregionId }
})

/** Return canonical Country membership without applying user-authored order. */
export function getCanonicalCountryIdsForSubregion(subregionId: SubregionId): CountryId[] {
  return countries
    .filter(country => country.subregionId === subregionId)
    .map(country => country.id)
}

export default countries;
