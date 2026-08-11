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
  'AF', 'AL', 'DZ', 'AD', 'AO', 'AG', 'AR', 'AM', 'AU', 'AT', 'AZ', 'BS', 'BH', 'BD', 'BB',
  'BY', 'BE', 'BZ', 'BJ', 'BT', 'BO', 'BA', 'BW', 'BR', 'BN', 'BG', 'BF', 'BI', 'CV', 'KH',
  'CM', 'CA', 'CF', 'TD', 'CL', 'CN', 'CO', 'CK', 'KM', 'CR', 'CI', 'HR', 'CU', 'CY', 'CZ', 'CD',
  'DK', 'DJ', 'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET', 'FJ', 'FI', 'FR',
  'GA', 'GM', 'GE', 'DE', 'GH', 'GR', 'GL', 'GD', 'GT', 'GN', 'GW', 'GY', 'HT', 'HN', 'HU', 'IS',
  'IN', 'ID', 'IR', 'IQ', 'IE', 'IL', 'IT', 'JM', 'JP', 'JO', 'KZ', 'KE', 'KI', 'XK', 'KW',
  'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU', 'MG', 'MW', 'MY', 'MV', 'ML',
  'MT', 'MH', 'MR', 'MU', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME', 'MA', 'MZ', 'MM', 'NA', 'NR',
  'NP', 'NL', 'NZ', 'NI', 'NE', 'NG', 'NU', 'KP', 'MK', 'NO', 'OM', 'PK', 'PW', 'PS', 'PA', 'PG',
  'PY', 'PE', 'PH', 'PL', 'PT', 'QA', 'CG', 'RO', 'RU', 'RW', 'KN', 'LC', 'VC', 'WS', 'SM',
  'ST', 'SA', 'SN', 'RS', 'SC', 'SL', 'SG', 'SK', 'SI', 'SB', 'SO', 'ZA', 'KR', 'SS', 'ES',
  'LK', 'SD', 'SR', 'SE', 'CH', 'SY', 'TW', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TO', 'TT', 'TN',
  'TR', 'TM', 'TV', 'UG', 'UA', 'AE', 'GB', 'US', 'UY', 'UZ', 'VU', 'VA', 'VE', 'VN', 'YE',
  'ZM', 'ZW',
] as const

const COUNTRY_RECORDS: CountryRecordInput[] = [
  { country: "Afghanistan", capital: "Kabul", continent: "Asia", subregion: "South Asia" },
  { country: "Albania", capital: "Tirana", continent: "Europe", subregion: "Balkans" },
  { country: "Algeria", capital: "Algiers", continent: "Africa", subregion: "North Africa" },
  { country: "Andorra", capital: "Andorra la Vella", continent: "Europe", subregion: "Southern Europe" },
  { country: "Angola", capital: "Luanda", continent: "Africa", subregion: "Southern Africa" },
  { country: "Antigua and Barbuda", capital: "Saint John's", continent: "North America", subregion: "Caribbean" },
  { country: "Argentina", capital: "Buenos Aires", continent: "South America", subregion: "Southern Cone" },
  { country: "Armenia", capital: "Yerevan", continent: "Asia", subregion: "Caucasus" },
  { country: "Australia", capital: "Canberra", continent: "Oceania", subregion: "Australia & New Zealand" },
  { country: "Austria", capital: "Vienna", continent: "Europe", subregion: "Central Europe" },
  { country: "Azerbaijan", capital: "Baku", continent: "Asia", subregion: "Caucasus" },
  { country: "Bahamas", capital: "Nassau", continent: "North America", subregion: "Caribbean" },
  { country: "Bahrain", capital: "Manama", continent: "Asia", subregion: "West Asia" },
  { country: "Bangladesh", capital: "Dhaka", continent: "Asia", subregion: "South Asia" },
  { country: "Barbados", capital: "Bridgetown", continent: "North America", subregion: "Caribbean" },
  { country: "Belarus", capital: "Minsk", continent: "Europe", subregion: "Eastern Europe" },
  { country: "Belgium", capital: "Brussels", continent: "Europe", subregion: "Western Europe" },
  { country: "Belize", capital: "Belmopan", continent: "North America", subregion: "Central America" },
  { country: "Benin", capital: "Porto-Novo", continent: "Africa", subregion: "West Africa" },
  { country: "Bhutan", capital: "Thimphu", continent: "Asia", subregion: "South Asia" },
  { country: "Bolivia", capital: "Sucre", continent: "South America", subregion: "Andean Countries" },
  { country: "Bosnia and Herzegovina", capital: "Sarajevo", continent: "Europe", subregion: "Balkans", aliases: ["Bosnia_and_Herzegovina"] },
  { country: "Botswana", capital: "Gaborone", continent: "Africa", subregion: "Southern Africa" },
  { country: "Brazil", capital: "Brasília", continent: "South America", subregion: "Eastern South America" },
  { country: "Brunei", capital: "Bandar Seri Begawan", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Bulgaria", capital: "Sofia", continent: "Europe", subregion: "Balkans" },
  { country: "Burkina Faso", capital: "Ouagadougou", continent: "Africa", subregion: "West Africa" },
  { country: "Burundi", capital: "Gitega", continent: "Africa", subregion: "East Africa" },
  { country: "Cabo Verde", capital: "Praia", continent: "Africa", subregion: "West Africa" },
  { country: "Cambodia", capital: "Phnom Penh", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Cameroon", capital: "Yaoundé", continent: "Africa", subregion: "Central Africa" },
  { country: "Canada", capital: "Ottawa", continent: "North America", subregion: "Northern America" },
  { country: "Central African Republic", capital: "Bangui", continent: "Africa", subregion: "Central Africa" },
  { country: "Chad", capital: "N'Djamena", continent: "Africa", subregion: "Central Africa" },
  { country: "Chile", capital: "Santiago", continent: "South America", subregion: "Southern Cone" },
  { country: "China", capital: "Beijing", continent: "Asia", subregion: "East Asia" },
  { country: "Colombia", capital: "Bogotá", continent: "South America", subregion: "Northern South America" },
  { country: "Cook Islands", capital: "Avarua", continent: "Oceania", subregion: "Polynesia", unM49Subregion: "Polynesia" },
  { country: "Comoros", capital: "Moroni", continent: "Africa", subregion: "Indian Ocean" },
  { country: "Costa Rica", capital: "San José", continent: "North America", subregion: "Central America" },
  { country: "Côte d'Ivoire", capital: "Yamoussoukro", continent: "Africa", subregion: "West Africa" },
  { country: "Croatia", capital: "Zagreb", continent: "Europe", subregion: "Balkans" },
  { country: "Cuba", capital: "Havana", continent: "North America", subregion: "Caribbean" },
  { country: "Cyprus", capital: "Nicosia", continent: "Europe", subregion: "Southern Europe", unM49Subregion: "Western Asia" },
  { country: "Czechia", capital: "Prague", continent: "Europe", subregion: "Central Europe" },
  { country: "Democratic Republic of the Congo", capital: "Kinshasa", continent: "Africa", subregion: "Central Africa" },
  { country: "Denmark", capital: "Copenhagen", continent: "Europe", subregion: "Northern Europe" },
  { country: "Djibouti", capital: "Djibouti", continent: "Africa", subregion: "East Africa" },
  { country: "Dominica", capital: "Roseau", continent: "North America", subregion: "Caribbean" },
  { country: "Dominican Republic", capital: "Santo Domingo", continent: "North America", subregion: "Caribbean" },
  { country: "Ecuador", capital: "Quito", continent: "South America", subregion: "Andean Countries" },
  { country: "Egypt", capital: "Cairo", continent: "Africa", subregion: "North Africa" },
  { country: "El Salvador", capital: "San Salvador", continent: "North America", subregion: "Central America" },
  { country: "Equatorial Guinea", capital: "Ciudad de la Paz", continent: "Africa", subregion: "Central Africa" },
  { country: "Eritrea", capital: "Asmara", continent: "Africa", subregion: "East Africa" },
  { country: "Estonia", capital: "Tallinn", continent: "Europe", subregion: "Northern Europe" },
  { country: "Eswatini", capital: "Mbabane", continent: "Africa", subregion: "Southern Africa" },
  { country: "Ethiopia", capital: "Addis Ababa", continent: "Africa", subregion: "East Africa" },
  { country: "Fiji", capital: "Suva", continent: "Oceania", subregion: "Melanesia" },
  { country: "Finland", capital: "Helsinki", continent: "Europe", subregion: "Northern Europe" },
  { country: "France", capital: "Paris", continent: "Europe", subregion: "Western Europe" },
  { country: "Gabon", capital: "Libreville", continent: "Africa", subregion: "Central Africa" },
  { country: "Gambia", capital: "Banjul", continent: "Africa", subregion: "West Africa" },
  { country: "Georgia", capital: "Tbilisi", continent: "Asia", subregion: "Caucasus" },
  { country: "Germany", capital: "Berlin", continent: "Europe", subregion: "Central Europe" },
  { country: "Ghana", capital: "Accra", continent: "Africa", subregion: "West Africa" },
  { country: "Greece", capital: "Athens", continent: "Europe", subregion: "Southern Europe" },
  { country: "Greenland", capital: "Nuuk", continent: "North America", subregion: "Northern America", unM49Subregion: "Northern America" },
  { country: "Grenada", capital: "Saint George's", continent: "North America", subregion: "Caribbean" },
  { country: "Guatemala", capital: "Guatemala City", continent: "North America", subregion: "Central America" },
  { country: "Guinea", capital: "Conakry", continent: "Africa", subregion: "West Africa" },
  { country: "Guinea-Bissau", capital: "Bissau", continent: "Africa", subregion: "West Africa" },
  { country: "Guyana", capital: "Georgetown", continent: "South America", subregion: "Northern South America" },
  { country: "Haiti", capital: "Port-au-Prince", continent: "North America", subregion: "Caribbean" },
  { country: "Honduras", capital: "Tegucigalpa", continent: "North America", subregion: "Central America" },
  { country: "Hungary", capital: "Budapest", continent: "Europe", subregion: "Central Europe" },
  { country: "Iceland", capital: "Reykjavík", continent: "Europe", subregion: "Northern Europe" },
  { country: "India", capital: "New Delhi", continent: "Asia", subregion: "South Asia" },
  { country: "Indonesia", capital: "Jakarta", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Iran", capital: "Tehran", continent: "Asia", subregion: "West Asia" },
  { country: "Iraq", capital: "Baghdad", continent: "Asia", subregion: "West Asia" },
  { country: "Ireland", capital: "Dublin", continent: "Europe", subregion: "Northern Europe" },
  { country: "Israel", capital: "Jerusalem", continent: "Asia", subregion: "West Asia" },
  { country: "Italy", capital: "Rome", continent: "Europe", subregion: "Southern Europe" },
  { country: "Jamaica", capital: "Kingston", continent: "North America", subregion: "Caribbean" },
  { country: "Japan", capital: "Tokyo", continent: "Asia", subregion: "East Asia" },
  { country: "Jordan", capital: "Amman", continent: "Asia", subregion: "West Asia" },
  { country: "Kazakhstan", capital: "Astana", continent: "Asia", subregion: "Central Asia" },
  { country: "Kenya", capital: "Nairobi", continent: "Africa", subregion: "East Africa" },
  { country: "Kiribati", capital: "South Tarawa", continent: "Oceania", subregion: "Micronesia" },
  { country: "Kosovo", capital: "Pristina", continent: "Europe", subregion: "Balkans" },
  { country: "Kuwait", capital: "Kuwait City", continent: "Asia", subregion: "West Asia" },
  { country: "Kyrgyzstan", capital: "Bishkek", continent: "Asia", subregion: "Central Asia" },
  { country: "Laos", capital: "Vientiane", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Latvia", capital: "Riga", continent: "Europe", subregion: "Northern Europe" },
  { country: "Lebanon", capital: "Beirut", continent: "Asia", subregion: "West Asia" },
  { country: "Lesotho", capital: "Maseru", continent: "Africa", subregion: "Southern Africa" },
  { country: "Liberia", capital: "Monrovia", continent: "Africa", subregion: "West Africa" },
  { country: "Libya", capital: "Tripoli", continent: "Africa", subregion: "North Africa" },
  { country: "Liechtenstein", capital: "Vaduz", continent: "Europe", subregion: "Central Europe" },
  { country: "Lithuania", capital: "Vilnius", continent: "Europe", subregion: "Northern Europe" },
  { country: "Luxembourg", capital: "Luxembourg", continent: "Europe", subregion: "Western Europe" },
  { country: "Madagascar", capital: "Antananarivo", continent: "Africa", subregion: "Indian Ocean" },
  { country: "Malawi", capital: "Lilongwe", continent: "Africa", subregion: "Southern Africa" },
  { country: "Malaysia", capital: "Kuala Lumpur", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Maldives", capital: "Malé", continent: "Asia", subregion: "South Asia" },
  { country: "Mali", capital: "Bamako", continent: "Africa", subregion: "West Africa" },
  { country: "Malta", capital: "Valletta", continent: "Europe", subregion: "Southern Europe" },
  { country: "Marshall Islands", capital: "Majuro", continent: "Oceania", subregion: "Micronesia" },
  { country: "Mauritania", capital: "Nouakchott", continent: "Africa", subregion: "West Africa" },
  { country: "Mauritius", capital: "Port Louis", continent: "Africa", subregion: "Indian Ocean" },
  { country: "Mexico", capital: "Mexico City", continent: "North America", subregion: "Northern America" },
  { country: "Micronesia", capital: "Palikir", continent: "Oceania", subregion: "Micronesia" },
  { country: "Moldova", capital: "Chișinău", continent: "Europe", subregion: "Eastern Europe" },
  { country: "Monaco", capital: "Monaco", continent: "Europe", subregion: "Western Europe" },
  { country: "Mongolia", capital: "Ulaanbaatar", continent: "Asia", subregion: "East Asia" },
  { country: "Montenegro", capital: "Podgorica", continent: "Europe", subregion: "Balkans" },
  { country: "Morocco", capital: "Rabat", continent: "Africa", subregion: "North Africa" },
  { country: "Mozambique", capital: "Maputo", continent: "Africa", subregion: "Southern Africa" },
  { country: "Myanmar", capital: "Naypyidaw", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Namibia", capital: "Windhoek", continent: "Africa", subregion: "Southern Africa" },
  { country: "Nauru", capital: "Yaren", continent: "Oceania", subregion: "Micronesia" },
  { country: "Nepal", capital: "Kathmandu", continent: "Asia", subregion: "South Asia" },
  { country: "Netherlands", capital: "Amsterdam", continent: "Europe", subregion: "Western Europe" },
  { country: "New Zealand", capital: "Wellington", continent: "Oceania", subregion: "Australia & New Zealand" },
  { country: "Nicaragua", capital: "Managua", continent: "North America", subregion: "Central America" },
  { country: "Niger", capital: "Niamey", continent: "Africa", subregion: "West Africa" },
  { country: "Nigeria", capital: "Abuja", continent: "Africa", subregion: "West Africa" },
  { country: "Niue", capital: "Alofi", continent: "Oceania", subregion: "Polynesia", unM49Subregion: "Polynesia" },
  { country: "North Korea", capital: "Pyongyang", continent: "Asia", subregion: "East Asia" },
  { country: "North Macedonia", capital: "Skopje", continent: "Europe", subregion: "Balkans", aliases: ["North_Macedonia"] },
  { country: "Norway", capital: "Oslo", continent: "Europe", subregion: "Northern Europe" },
  { country: "Oman", capital: "Muscat", continent: "Asia", subregion: "West Asia" },
  { country: "Pakistan", capital: "Islamabad", continent: "Asia", subregion: "South Asia" },
  { country: "Palau", capital: "Ngerulmud", continent: "Oceania", subregion: "Micronesia" },
  { country: "Palestine", capital: "East Jerusalem", continent: "Asia", subregion: "West Asia" },
  { country: "Panama", capital: "Panama City", continent: "North America", subregion: "Central America" },
  { country: "Papua New Guinea", capital: "Port Moresby", continent: "Oceania", subregion: "Melanesia" },
  { country: "Paraguay", capital: "Asunción", continent: "South America", subregion: "Southern Cone" },
  { country: "Peru", capital: "Lima", continent: "South America", subregion: "Andean Countries" },
  { country: "Philippines", capital: "Manila", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Poland", capital: "Warsaw", continent: "Europe", subregion: "Central Europe" },
  { country: "Portugal", capital: "Lisbon", continent: "Europe", subregion: "Southern Europe" },
  { country: "Qatar", capital: "Doha", continent: "Asia", subregion: "West Asia" },
  { country: "Republic of the Congo", capital: "Brazzaville", continent: "Africa", subregion: "Central Africa" },
  { country: "Romania", capital: "Bucharest", continent: "Europe", subregion: "Eastern Europe" },
  { country: "Russia", capital: "Moscow", continent: "Europe", subregion: "Eastern Europe" },
  { country: "Rwanda", capital: "Kigali", continent: "Africa", subregion: "East Africa" },
  { country: "Saint Kitts and Nevis", capital: "Basseterre", continent: "North America", subregion: "Caribbean" },
  { country: "Saint Lucia", capital: "Castries", continent: "North America", subregion: "Caribbean" },
  { country: "Saint Vincent and the Grenadines", capital: "Kingstown", continent: "North America", subregion: "Caribbean" },
  { country: "Samoa", capital: "Apia", continent: "Oceania", subregion: "Polynesia" },
  { country: "San Marino", capital: "San Marino", continent: "Europe", subregion: "Southern Europe", aliases: ["San_Marino"] },
  { country: "São Tomé and Príncipe", capital: "São Tomé", continent: "Africa", subregion: "Central Africa" },
  { country: "Saudi Arabia", capital: "Riyadh", continent: "Asia", subregion: "West Asia" },
  { country: "Senegal", capital: "Dakar", continent: "Africa", subregion: "West Africa" },
  { country: "Serbia", capital: "Belgrade", continent: "Europe", subregion: "Balkans" },
  { country: "Seychelles", capital: "Victoria", continent: "Africa", subregion: "Indian Ocean" },
  { country: "Sierra Leone", capital: "Freetown", continent: "Africa", subregion: "West Africa" },
  { country: "Singapore", capital: "Singapore", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Slovakia", capital: "Bratislava", continent: "Europe", subregion: "Central Europe" },
  { country: "Slovenia", capital: "Ljubljana", continent: "Europe", subregion: "Central Europe" },
  { country: "Solomon Islands", capital: "Honiara", continent: "Oceania", subregion: "Melanesia" },
  { country: "Somalia", capital: "Mogadishu", continent: "Africa", subregion: "East Africa" },
  { country: "South Africa", capital: "Pretoria", continent: "Africa", subregion: "Southern Africa" },
  { country: "South Korea", capital: "Seoul", continent: "Asia", subregion: "East Asia" },
  { country: "South Sudan", capital: "Juba", continent: "Africa", subregion: "East Africa" },
  { country: "Spain", capital: "Madrid", continent: "Europe", subregion: "Southern Europe" },
  { country: "Sri Lanka", capital: "Sri Jayawardenepura Kotte", continent: "Asia", subregion: "South Asia" },
  { country: "Sudan", capital: "Khartoum", continent: "Africa", subregion: "North Africa" },
  { country: "Suriname", capital: "Paramaribo", continent: "South America", subregion: "Northern South America" },
  { country: "Sweden", capital: "Stockholm", continent: "Europe", subregion: "Northern Europe" },
  { country: "Switzerland", capital: "Bern", continent: "Europe", subregion: "Central Europe" },
  { country: "Syria", capital: "Damascus", continent: "Asia", subregion: "West Asia" },
  { country: "Taiwan", capital: "Taipei", continent: "Asia", subregion: "East Asia" },
  { country: "Tajikistan", capital: "Dushanbe", continent: "Asia", subregion: "Central Asia" },
  { country: "Tanzania", capital: "Dodoma", continent: "Africa", subregion: "East Africa" },
  { country: "Thailand", capital: "Bangkok", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Timor-Leste", capital: "Dili", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Togo", capital: "Lomé", continent: "Africa", subregion: "West Africa" },
  { country: "Tonga", capital: "Nuku'alofa", continent: "Oceania", subregion: "Polynesia" },
  { country: "Trinidad and Tobago", capital: "Port of Spain", continent: "North America", subregion: "Caribbean" },
  { country: "Tunisia", capital: "Tunis", continent: "Africa", subregion: "North Africa" },
  { country: "Türkiye", capital: "Ankara", continent: "Asia", subregion: "West Asia" },
  { country: "Turkmenistan", capital: "Ashgabat", continent: "Asia", subregion: "Central Asia" },
  { country: "Tuvalu", capital: "Funafuti", continent: "Oceania", subregion: "Polynesia" },
  { country: "Uganda", capital: "Kampala", continent: "Africa", subregion: "East Africa" },
  { country: "Ukraine", capital: "Kyiv", continent: "Europe", subregion: "Eastern Europe" },
  { country: "United Arab Emirates", capital: "Abu Dhabi", continent: "Asia", subregion: "West Asia" },
  { country: "United Kingdom", capital: "London", continent: "Europe", subregion: "Northern Europe", aliases: ["England", "Northern_Ireland", "Scotland", "Wales"] },
  { country: "United States", capital: "Washington, D.C.", continent: "North America", subregion: "Northern America" },
  { country: "Uruguay", capital: "Montevideo", continent: "South America", subregion: "Southern Cone" },
  { country: "Uzbekistan", capital: "Tashkent", continent: "Asia", subregion: "Central Asia" },
  { country: "Vanuatu", capital: "Port Vila", continent: "Oceania", subregion: "Melanesia" },
  { country: "Vatican City", capital: "Vatican City", continent: "Europe", subregion: "Southern Europe", aliases: ["Vatican_City"] },
  { country: "Venezuela", capital: "Caracas", continent: "South America", subregion: "Northern South America" },
  { country: "Vietnam", capital: "Hanoi", continent: "Asia", subregion: "Southeast Asia" },
  { country: "Yemen", capital: "Sana'a", continent: "Asia", subregion: "West Asia" },
  { country: "Zambia", capital: "Lusaka", continent: "Africa", subregion: "Southern Africa" },
  { country: "Zimbabwe", capital: "Harare", continent: "Africa", subregion: "Southern Africa" },
];

if (COUNTRY_CODES.length !== COUNTRY_RECORDS.length) {
  throw new Error('Country codes and Country records must have matching lengths')
}

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
