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

type CountryRecordInput = Omit<Country, 'subregionId'>

export const COUNTRY_RECORDS: CountryRecordInput[] = [
  { id: 'IS', country: "Iceland", capital: "Reykjavík", continent: "Europe", subregion: "Northern Europe" },
  { id: 'NO', country: "Norway", capital: "Oslo", continent: "Europe", subregion: "Northern Europe" },
  { id: 'SE', country: "Sweden", capital: "Stockholm", continent: "Europe", subregion: "Northern Europe" },
  { id: 'FI', country: "Finland", capital: "Helsinki", continent: "Europe", subregion: "Northern Europe" },
  { id: 'EE', country: "Estonia", capital: "Tallinn", continent: "Europe", subregion: "Northern Europe" },
  { id: 'LV', country: "Latvia", capital: "Riga", continent: "Europe", subregion: "Northern Europe" },
  { id: 'LT', country: "Lithuania", capital: "Vilnius", continent: "Europe", subregion: "Northern Europe" },
  { id: 'DK', country: "Denmark", capital: "Copenhagen", continent: "Europe", subregion: "Northern Europe" },
  { id: 'GB', country: "United Kingdom", capital: "London", continent: "Europe", subregion: "Northern Europe", aliases: ["England", "Northern_Ireland", "Scotland", "Wales"] },
  { id: 'IE', country: "Ireland", capital: "Dublin", continent: "Europe", subregion: "Northern Europe" },
  { id: 'RU', country: "Russia", capital: "Moscow", continent: "Europe", subregion: "Eastern Europe" },
  { id: 'BY', country: "Belarus", capital: "Minsk", continent: "Europe", subregion: "Eastern Europe" },
  { id: 'UA', country: "Ukraine", capital: "Kyiv", continent: "Europe", subregion: "Eastern Europe" },
  { id: 'MD', country: "Moldova", capital: "Chișinău", continent: "Europe", subregion: "Eastern Europe" },
  { id: 'RO', country: "Romania", capital: "Bucharest", continent: "Europe", subregion: "Eastern Europe" },
  { id: 'HR', country: "Croatia", capital: "Zagreb", continent: "Europe", subregion: "Balkans" },
  { id: 'BA', country: "Bosnia and Herzegovina", capital: "Sarajevo", continent: "Europe", subregion: "Balkans", aliases: ["Bosnia_and_Herzegovina"] },
  { id: 'RS', country: "Serbia", capital: "Belgrade", continent: "Europe", subregion: "Balkans" },
  { id: 'ME', country: "Montenegro", capital: "Podgorica", continent: "Europe", subregion: "Balkans" },
  { id: 'AL', country: "Albania", capital: "Tirana", continent: "Europe", subregion: "Balkans" },
  { id: 'XK', country: "Kosovo", capital: "Pristina", continent: "Europe", subregion: "Balkans" },
  { id: 'MK', country: "North Macedonia", capital: "Skopje", continent: "Europe", subregion: "Balkans", aliases: ["North_Macedonia"] },
  { id: 'BG', country: "Bulgaria", capital: "Sofia", continent: "Europe", subregion: "Balkans" },
  { id: 'DE', country: "Germany", capital: "Berlin", continent: "Europe", subregion: "Central Europe" },
  { id: 'PL', country: "Poland", capital: "Warsaw", continent: "Europe", subregion: "Central Europe" },
  { id: 'CZ', country: "Czechia", capital: "Prague", continent: "Europe", subregion: "Central Europe" },
  { id: 'SK', country: "Slovakia", capital: "Bratislava", continent: "Europe", subregion: "Central Europe" },
  { id: 'HU', country: "Hungary", capital: "Budapest", continent: "Europe", subregion: "Central Europe" },
  { id: 'SI', country: "Slovenia", capital: "Ljubljana", continent: "Europe", subregion: "Central Europe" },
  { id: 'AT', country: "Austria", capital: "Vienna", continent: "Europe", subregion: "Central Europe" },
  { id: 'LI', country: "Liechtenstein", capital: "Vaduz", continent: "Europe", subregion: "Central Europe" },
  { id: 'CH', country: "Switzerland", capital: "Bern", continent: "Europe", subregion: "Central Europe" },
  { id: 'NL', country: "Netherlands", capital: "Amsterdam", continent: "Europe", subregion: "Western Europe" },
  { id: 'BE', country: "Belgium", capital: "Brussels", continent: "Europe", subregion: "Western Europe" },
  { id: 'LU', country: "Luxembourg", capital: "Luxembourg", continent: "Europe", subregion: "Western Europe" },
  { id: 'FR', country: "France", capital: "Paris", continent: "Europe", subregion: "Western Europe" },
  { id: 'MC', country: "Monaco", capital: "Monaco", continent: "Europe", subregion: "Western Europe" },
  { id: 'PT', country: "Portugal", capital: "Lisbon", continent: "Europe", subregion: "Southern Europe" },
  { id: 'ES', country: "Spain", capital: "Madrid", continent: "Europe", subregion: "Southern Europe" },
  { id: 'AD', country: "Andorra", capital: "Andorra la Vella", continent: "Europe", subregion: "Southern Europe" },
  { id: 'IT', country: "Italy", capital: "Rome", continent: "Europe", subregion: "Southern Europe" },
  { id: 'SM', country: "San Marino", capital: "San Marino", continent: "Europe", subregion: "Southern Europe", aliases: ["San_Marino"] },
  { id: 'VA', country: "Vatican City", capital: "Vatican City", continent: "Europe", subregion: "Southern Europe", aliases: ["Vatican_City"] },
  { id: 'MT', country: "Malta", capital: "Valletta", continent: "Europe", subregion: "Southern Europe" },
  { id: 'GR', country: "Greece", capital: "Athens", continent: "Europe", subregion: "Southern Europe" },
  { id: 'CY', country: "Cyprus", capital: "Nicosia", continent: "Europe", subregion: "Southern Europe", unM49Subregion: "Western Asia" },
  { id: 'TR', country: "Türkiye", capital: "Ankara", continent: "Asia", subregion: "West Asia" },
  { id: 'SY', country: "Syria", capital: "Damascus", continent: "Asia", subregion: "West Asia" },
  { id: 'LB', country: "Lebanon", capital: "Beirut", continent: "Asia", subregion: "West Asia" },
  { id: 'IL', country: "Israel", capital: "Jerusalem", continent: "Asia", subregion: "West Asia" },
  { id: 'PS', country: "Palestine", capital: "East Jerusalem", continent: "Asia", subregion: "West Asia" },
  { id: 'JO', country: "Jordan", capital: "Amman", continent: "Asia", subregion: "West Asia" },
  { id: 'SA', country: "Saudi Arabia", capital: "Riyadh", continent: "Asia", subregion: "West Asia" },
  { id: 'YE', country: "Yemen", capital: "Sana'a", continent: "Asia", subregion: "West Asia" },
  { id: 'OM', country: "Oman", capital: "Muscat", continent: "Asia", subregion: "West Asia" },
  { id: 'AE', country: "United Arab Emirates", capital: "Abu Dhabi", continent: "Asia", subregion: "West Asia" },
  { id: 'QA', country: "Qatar", capital: "Doha", continent: "Asia", subregion: "West Asia" },
  { id: 'BH', country: "Bahrain", capital: "Manama", continent: "Asia", subregion: "West Asia" },
  { id: 'KW', country: "Kuwait", capital: "Kuwait City", continent: "Asia", subregion: "West Asia" },
  { id: 'IQ', country: "Iraq", capital: "Baghdad", continent: "Asia", subregion: "West Asia" },
  { id: 'IR', country: "Iran", capital: "Tehran", continent: "Asia", subregion: "West Asia" },
  { id: 'GE', country: "Georgia", capital: "Tbilisi", continent: "Asia", subregion: "Caucasus" },
  { id: 'AM', country: "Armenia", capital: "Yerevan", continent: "Asia", subregion: "Caucasus" },
  { id: 'AZ', country: "Azerbaijan", capital: "Baku", continent: "Asia", subregion: "Caucasus" },
  { id: 'KZ', country: "Kazakhstan", capital: "Astana", continent: "Asia", subregion: "Central Asia" },
  { id: 'TM', country: "Turkmenistan", capital: "Ashgabat", continent: "Asia", subregion: "Central Asia" },
  { id: 'UZ', country: "Uzbekistan", capital: "Tashkent", continent: "Asia", subregion: "Central Asia" },
  { id: 'KG', country: "Kyrgyzstan", capital: "Bishkek", continent: "Asia", subregion: "Central Asia" },
  { id: 'TJ', country: "Tajikistan", capital: "Dushanbe", continent: "Asia", subregion: "Central Asia" },
  { id: 'MN', country: "Mongolia", capital: "Ulaanbaatar", continent: "Asia", subregion: "East Asia" },
  { id: 'CN', country: "China", capital: "Beijing", continent: "Asia", subregion: "East Asia" },
  { id: 'KP', country: "North Korea", capital: "Pyongyang", continent: "Asia", subregion: "East Asia" },
  { id: 'KR', country: "South Korea", capital: "Seoul", continent: "Asia", subregion: "East Asia" },
  { id: 'JP', country: "Japan", capital: "Tokyo", continent: "Asia", subregion: "East Asia" },
  { id: 'TW', country: "Taiwan", capital: "Taipei", continent: "Asia", subregion: "East Asia" },
  { id: 'AF', country: "Afghanistan", capital: "Kabul", continent: "Asia", subregion: "South Asia" },
  { id: 'PK', country: "Pakistan", capital: "Islamabad", continent: "Asia", subregion: "South Asia" },
  { id: 'IN', country: "India", capital: "New Delhi", continent: "Asia", subregion: "South Asia" },
  { id: 'NP', country: "Nepal", capital: "Kathmandu", continent: "Asia", subregion: "South Asia" },
  { id: 'BT', country: "Bhutan", capital: "Thimphu", continent: "Asia", subregion: "South Asia" },
  { id: 'BD', country: "Bangladesh", capital: "Dhaka", continent: "Asia", subregion: "South Asia" },
  { id: 'LK', country: "Sri Lanka", capital: "Sri Jayawardenepura Kotte", continent: "Asia", subregion: "South Asia" },
  { id: 'MV', country: "Maldives", capital: "Malé", continent: "Asia", subregion: "South Asia" },
  { id: 'MM', country: "Myanmar", capital: "Naypyidaw", continent: "Asia", subregion: "Southeast Asia" },
  { id: 'LA', country: "Laos", capital: "Vientiane", continent: "Asia", subregion: "Southeast Asia" },
  { id: 'VN', country: "Vietnam", capital: "Hanoi", continent: "Asia", subregion: "Southeast Asia" },
  { id: 'KH', country: "Cambodia", capital: "Phnom Penh", continent: "Asia", subregion: "Southeast Asia" },
  { id: 'TH', country: "Thailand", capital: "Bangkok", continent: "Asia", subregion: "Southeast Asia" },
  { id: 'MY', country: "Malaysia", capital: "Kuala Lumpur", continent: "Asia", subregion: "Southeast Asia" },
  { id: 'SG', country: "Singapore", capital: "Singapore", continent: "Asia", subregion: "Southeast Asia" },
  { id: 'BN', country: "Brunei", capital: "Bandar Seri Begawan", continent: "Asia", subregion: "Southeast Asia" },
  { id: 'PH', country: "Philippines", capital: "Manila", continent: "Asia", subregion: "Southeast Asia" },
  { id: 'ID', country: "Indonesia", capital: "Jakarta", continent: "Asia", subregion: "Southeast Asia" },
  { id: 'TL', country: "Timor-Leste", capital: "Dili", continent: "Asia", subregion: "Southeast Asia" },
  { id: 'AU', country: "Australia", capital: "Canberra", continent: "Oceania", subregion: "Australia & New Zealand" },
  { id: 'NZ', country: "New Zealand", capital: "Wellington", continent: "Oceania", subregion: "Australia & New Zealand" },
  { id: 'PW', country: "Palau", capital: "Ngerulmud", continent: "Oceania", subregion: "Micronesia" },
  { id: 'FM', country: "Micronesia", capital: "Palikir", continent: "Oceania", subregion: "Micronesia" },
  { id: 'NR', country: "Nauru", capital: "Yaren", continent: "Oceania", subregion: "Micronesia" },
  { id: 'MH', country: "Marshall Islands", capital: "Majuro", continent: "Oceania", subregion: "Micronesia" },
  { id: 'KI', country: "Kiribati", capital: "South Tarawa", continent: "Oceania", subregion: "Micronesia" },
  { id: 'PG', country: "Papua New Guinea", capital: "Port Moresby", continent: "Oceania", subregion: "Melanesia" },
  { id: 'SB', country: "Solomon Islands", capital: "Honiara", continent: "Oceania", subregion: "Melanesia" },
  { id: 'VU', country: "Vanuatu", capital: "Port Vila", continent: "Oceania", subregion: "Melanesia" },
  { id: 'FJ', country: "Fiji", capital: "Suva", continent: "Oceania", subregion: "Melanesia" },
  { id: 'CK', country: "Cook Islands", capital: "Avarua", continent: "Oceania", subregion: "Polynesia", unM49Subregion: "Polynesia" },
  { id: 'NU', country: "Niue", capital: "Alofi", continent: "Oceania", subregion: "Polynesia", unM49Subregion: "Polynesia" },
  { id: 'TV', country: "Tuvalu", capital: "Funafuti", continent: "Oceania", subregion: "Polynesia" },
  { id: 'WS', country: "Samoa", capital: "Apia", continent: "Oceania", subregion: "Polynesia" },
  { id: 'TO', country: "Tonga", capital: "Nuku'alofa", continent: "Oceania", subregion: "Polynesia" },
  { id: 'MA', country: "Morocco", capital: "Rabat", continent: "Africa", subregion: "North Africa" },
  { id: 'DZ', country: "Algeria", capital: "Algiers", continent: "Africa", subregion: "North Africa" },
  { id: 'TN', country: "Tunisia", capital: "Tunis", continent: "Africa", subregion: "North Africa" },
  { id: 'LY', country: "Libya", capital: "Tripoli", continent: "Africa", subregion: "North Africa" },
  { id: 'EG', country: "Egypt", capital: "Cairo", continent: "Africa", subregion: "North Africa" },
  { id: 'SD', country: "Sudan", capital: "Khartoum", continent: "Africa", subregion: "North Africa" },
  { id: 'TG', country: "Togo", capital: "Lomé", continent: "Africa", subregion: "West Africa" },
  { id: 'BJ', country: "Benin", capital: "Porto-Novo", continent: "Africa", subregion: "West Africa" },
  { id: 'CV', country: "Cabo Verde", capital: "Praia", continent: "Africa", subregion: "West Africa" },
  { id: 'GM', country: "Gambia", capital: "Banjul", continent: "Africa", subregion: "West Africa" },
  { id: 'GW', country: "Guinea-Bissau", capital: "Bissau", continent: "Africa", subregion: "West Africa" },
  { id: 'MR', country: "Mauritania", capital: "Nouakchott", continent: "Africa", subregion: "West Africa" },
  { id: 'LR', country: "Liberia", capital: "Monrovia", continent: "Africa", subregion: "West Africa" },
  { id: 'GN', country: "Guinea", capital: "Conakry", continent: "Africa", subregion: "West Africa" },
  { id: 'SL', country: "Sierra Leone", capital: "Freetown", continent: "Africa", subregion: "West Africa" },
  { id: 'CI', country: "Côte d'Ivoire", capital: "Yamoussoukro", continent: "Africa", subregion: "West Africa" },
  { id: 'SN', country: "Senegal", capital: "Dakar", continent: "Africa", subregion: "West Africa" },
  { id: 'ML', country: "Mali", capital: "Bamako", continent: "Africa", subregion: "West Africa" },
  { id: 'GH', country: "Ghana", capital: "Accra", continent: "Africa", subregion: "West Africa" },
  { id: 'BF', country: "Burkina Faso", capital: "Ouagadougou", continent: "Africa", subregion: "West Africa" },
  { id: 'NG', country: "Nigeria", capital: "Abuja", continent: "Africa", subregion: "West Africa" },
  { id: 'NE', country: "Niger", capital: "Niamey", continent: "Africa", subregion: "West Africa" },
  { id: 'TD', country: "Chad", capital: "N'Djamena", continent: "Africa", subregion: "Central Africa" },
  { id: 'CM', country: "Cameroon", capital: "Yaoundé", continent: "Africa", subregion: "Central Africa" },
  { id: 'CF', country: "Central African Republic", capital: "Bangui", continent: "Africa", subregion: "Central Africa" },
  { id: 'CD', country: "Democratic Republic of the Congo", capital: "Kinshasa", continent: "Africa", subregion: "Central Africa" },
  { id: 'CG', country: "Republic of the Congo", capital: "Brazzaville", continent: "Africa", subregion: "Central Africa" },
  { id: 'GA', country: "Gabon", capital: "Libreville", continent: "Africa", subregion: "Central Africa" },
  { id: 'GQ', country: "Equatorial Guinea", capital: "Ciudad de la Paz", continent: "Africa", subregion: "Central Africa" },
  { id: 'ST', country: "São Tomé and Príncipe", capital: "São Tomé", continent: "Africa", subregion: "Central Africa" },
  { id: 'ER', country: "Eritrea", capital: "Asmara", continent: "Africa", subregion: "East Africa" },
  { id: 'DJ', country: "Djibouti", capital: "Djibouti", continent: "Africa", subregion: "East Africa" },
  { id: 'SO', country: "Somalia", capital: "Mogadishu", continent: "Africa", subregion: "East Africa" },
  { id: 'ET', country: "Ethiopia", capital: "Addis Ababa", continent: "Africa", subregion: "East Africa" },
  { id: 'SS', country: "South Sudan", capital: "Juba", continent: "Africa", subregion: "East Africa" },
  { id: 'UG', country: "Uganda", capital: "Kampala", continent: "Africa", subregion: "East Africa" },
  { id: 'KE', country: "Kenya", capital: "Nairobi", continent: "Africa", subregion: "East Africa" },
  { id: 'TZ', country: "Tanzania", capital: "Dodoma", continent: "Africa", subregion: "East Africa" },
  { id: 'BI', country: "Burundi", capital: "Gitega", continent: "Africa", subregion: "East Africa" },
  { id: 'RW', country: "Rwanda", capital: "Kigali", continent: "Africa", subregion: "East Africa" },
  { id: 'AO', country: "Angola", capital: "Luanda", continent: "Africa", subregion: "Southern Africa" },
  { id: 'ZM', country: "Zambia", capital: "Lusaka", continent: "Africa", subregion: "Southern Africa" },
  { id: 'MW', country: "Malawi", capital: "Lilongwe", continent: "Africa", subregion: "Southern Africa" },
  { id: 'MZ', country: "Mozambique", capital: "Maputo", continent: "Africa", subregion: "Southern Africa" },
  { id: 'ZW', country: "Zimbabwe", capital: "Harare", continent: "Africa", subregion: "Southern Africa" },
  { id: 'BW', country: "Botswana", capital: "Gaborone", continent: "Africa", subregion: "Southern Africa" },
  { id: 'NA', country: "Namibia", capital: "Windhoek", continent: "Africa", subregion: "Southern Africa" },
  { id: 'ZA', country: "South Africa", capital: "Pretoria", continent: "Africa", subregion: "Southern Africa" },
  { id: 'SZ', country: "Eswatini", capital: "Mbabane", continent: "Africa", subregion: "Southern Africa" },
  { id: 'LS', country: "Lesotho", capital: "Maseru", continent: "Africa", subregion: "Southern Africa" },
  { id: 'KM', country: "Comoros", capital: "Moroni", continent: "Africa", subregion: "Indian Ocean" },
  { id: 'MG', country: "Madagascar", capital: "Antananarivo", continent: "Africa", subregion: "Indian Ocean" },
  { id: 'SC', country: "Seychelles", capital: "Victoria", continent: "Africa", subregion: "Indian Ocean" },
  { id: 'MU', country: "Mauritius", capital: "Port Louis", continent: "Africa", subregion: "Indian Ocean" },
  { id: 'CA', country: "Canada", capital: "Ottawa", continent: "North America", subregion: "Northern America" },
  { id: 'GL', country: "Greenland", capital: "Nuuk", continent: "North America", subregion: "Northern America", unM49Subregion: "Northern America" },
  { id: 'US', country: "United States", capital: "Washington, D.C.", continent: "North America", subregion: "Northern America" },
  { id: 'MX', country: "Mexico", capital: "Mexico City", continent: "North America", subregion: "Northern America" },
  { id: 'BZ', country: "Belize", capital: "Belmopan", continent: "North America", subregion: "Central America" },
  { id: 'GT', country: "Guatemala", capital: "Guatemala City", continent: "North America", subregion: "Central America" },
  { id: 'SV', country: "El Salvador", capital: "San Salvador", continent: "North America", subregion: "Central America" },
  { id: 'HN', country: "Honduras", capital: "Tegucigalpa", continent: "North America", subregion: "Central America" },
  { id: 'NI', country: "Nicaragua", capital: "Managua", continent: "North America", subregion: "Central America" },
  { id: 'CR', country: "Costa Rica", capital: "San José", continent: "North America", subregion: "Central America" },
  { id: 'PA', country: "Panama", capital: "Panama City", continent: "North America", subregion: "Central America" },
  { id: 'CU', country: "Cuba", capital: "Havana", continent: "North America", subregion: "Caribbean" },
  { id: 'JM', country: "Jamaica", capital: "Kingston", continent: "North America", subregion: "Caribbean" },
  { id: 'BS', country: "Bahamas", capital: "Nassau", continent: "North America", subregion: "Caribbean" },
  { id: 'HT', country: "Haiti", capital: "Port-au-Prince", continent: "North America", subregion: "Caribbean" },
  { id: 'DO', country: "Dominican Republic", capital: "Santo Domingo", continent: "North America", subregion: "Caribbean" },
  { id: 'KN', country: "Saint Kitts and Nevis", capital: "Basseterre", continent: "North America", subregion: "Caribbean" },
  { id: 'AG', country: "Antigua and Barbuda", capital: "Saint John's", continent: "North America", subregion: "Caribbean" },
  { id: 'DM', country: "Dominica", capital: "Roseau", continent: "North America", subregion: "Caribbean" },
  { id: 'LC', country: "Saint Lucia", capital: "Castries", continent: "North America", subregion: "Caribbean" },
  { id: 'BB', country: "Barbados", capital: "Bridgetown", continent: "North America", subregion: "Caribbean" },
  { id: 'VC', country: "Saint Vincent and the Grenadines", capital: "Kingstown", continent: "North America", subregion: "Caribbean" },
  { id: 'GD', country: "Grenada", capital: "Saint George's", continent: "North America", subregion: "Caribbean" },
  { id: 'TT', country: "Trinidad and Tobago", capital: "Port of Spain", continent: "North America", subregion: "Caribbean" },
  { id: 'CO', country: "Colombia", capital: "Bogotá", continent: "South America", subregion: "Northern South America" },
  { id: 'VE', country: "Venezuela", capital: "Caracas", continent: "South America", subregion: "Northern South America" },
  { id: 'GY', country: "Guyana", capital: "Georgetown", continent: "South America", subregion: "Northern South America" },
  { id: 'SR', country: "Suriname", capital: "Paramaribo", continent: "South America", subregion: "Northern South America" },
  { id: 'EC', country: "Ecuador", capital: "Quito", continent: "South America", subregion: "Andean Countries" },
  { id: 'PE', country: "Peru", capital: "Lima", continent: "South America", subregion: "Andean Countries" },
  { id: 'BO', country: "Bolivia", capital: "Sucre", continent: "South America", subregion: "Andean Countries" },
  { id: 'BR', country: "Brazil", capital: "Brasília", continent: "South America", subregion: "Eastern South America" },
  { id: 'CL', country: "Chile", capital: "Santiago", continent: "South America", subregion: "Southern Cone" },
  { id: 'AR', country: "Argentina", capital: "Buenos Aires", continent: "South America", subregion: "Southern Cone" },
  { id: 'PY', country: "Paraguay", capital: "Asunción", continent: "South America", subregion: "Southern Cone" },
  { id: 'UY', country: "Uruguay", capital: "Montevideo", continent: "South America", subregion: "Southern Cone" },
];

export const countries: Country[] = COUNTRY_RECORDS.map(entry => {
  const subregionId = getSubregionIdForLabel(entry.subregion)
  if (!subregionId) throw new Error(`Unknown country Subregion label: ${entry.subregion}`)
  if (getSubregionDefinition(subregionId).continent !== entry.continent) {
    throw new Error(`Country ${entry.country} has an inconsistent Continent/Subregion pair`)
  }
  return { ...entry, subregionId }
})

/** Return canonical Country membership without applying user-authored order. */
export function getCanonicalCountryIdsForSubregion(subregionId: SubregionId): CountryId[] {
  return countries
    .filter(country => country.subregionId === subregionId)
    .map(country => country.id)
}

export default countries;
