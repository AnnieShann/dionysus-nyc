import fs from 'node:fs';

// name, cat, tags[], addr, web, hours, phone, lat, lng, blurb, [rating, ratingCount]
const D = [
// --- existing seeded landmarks (keep exact names + coords) ---
["Macy's Herald Square","shopping",["Shopping","Landmark","Restrooms"],"151 W 34th St, New York, NY 10001","https://www.macys.com/stores/ny/new-york/herald-square_2.html","Mon–Sat 10am–9pm, Sun 11am–8pm","+1 212-695-4400",40.7509,-73.9890,"Flagship department store — 11 floors of everything, since 1902.",4.3,18211],
["Empire State Building","landmark",["Landmark","Observatory","Tickets"],"20 W 34th St, New York, NY 10118","https://www.esbnyc.com","Daily 8am–2am","+1 212-736-3100",40.7484,-73.9857,"Art-deco icon with 86th & 102nd floor observation decks.",4.7,98342],
["Koreatown (32nd St)","nightlife",["Neighborhood","Food","Nightlife"],"W 32nd St, New York, NY 10001","https://www.explorektownnyc.com","24/7 (varies by venue)","+1 212-290-2460",40.7476,-73.9866,'Neon "K-Town" — Korean BBQ, karaoke and 24-hour eats.'],
["Madison Square Garden","venue",["Arena","Entertainment","Sports"],"4 Pennsylvania Plaza, New York, NY 10001","https://www.msg.com/madison-square-garden","Event days only (varies)","+1 212-465-6741",40.7505,-73.9934,"The Garden — Knicks, Rangers and arena shows above Penn."],
["Penn Station","transit",["Transit","Trains","Restrooms"],"8th Ave & W 31st St, New York, NY 10001","https://www.amtrak.com/stations/nyp","24/7","+1 212-630-6400",40.7506,-73.9935,"Busiest transit hub in the hemisphere — LIRR, NJ Transit, Amtrak."],
["Bryant Park","park",["Park","Free Wi-Fi","Events"],"41st to 42nd St, 5th to 6th Ave, New York, NY 10018","https://bryantpark.org","Daily 7am–10pm (seasonal)","+1 212-768-4242",40.7536,-73.9832,"Midtown lawn behind the library — seasonal market & ice rink.",4.7,45120],
["NY Public Library","landmark",["Library","Landmark","Free"],"476 5th Ave, New York, NY 10018","https://www.nypl.org","Mon–Thu 10am–8pm, Fri–Sat 10am–6pm, Sun 1pm–5pm","+1 917-275-6975",40.7532,-73.9822,"The Stephen A. Schwarzman Building and its Rose Reading Room.",4.8,27640],
["Times Square","landmark",["Landmark","Entertainment","Open 24h"],"Broadway & 7th Ave, New York, NY 10036","https://www.timessquarenyc.org","24/7","+1 212-768-1560",40.7580,-73.9855,"The Crossroads of the World — billboards, theaters, crowds.",4.7,212003],
["Madison Square Park","park",["Park","Dog run","Art"],"11 Madison Ave, New York, NY 10010","https://madisonsquarepark.org","Daily 6am–11pm","+1 212-538-3860",40.7423,-73.9879,"Leafy Flatiron square and the original Shake Shack."],
["Eataly NYC Flatiron","food",["Italian","Market","Rooftop"],"200 5th Ave, New York, NY 10010","https://www.eataly.com/us_en/stores/nyc-flatiron","Daily 9am–11pm","+1 212-229-2560",40.7421,-73.9897,"Sprawling Italian market, counters and rooftop beer garden.",4.5,12044],
["Flatiron Building","landmark",["Landmark","Photo spot"],"175 5th Ave, New York, NY 10010","https://www.flatirondistrict.nyc","Exterior 24/7","+1 212-826-2980",40.7411,-73.9897,"1902 Beaux-Arts wedge where Broadway meets Fifth.",4.6,9032],
["Shake Shack (Madison Sq)","food",["Burgers","Outdoor seating"],"Madison Ave & E 23rd St, New York, NY 10010","https://www.shakeshack.com","Daily 11am–11pm","+1 212-889-6600",40.7417,-73.9882,"The original Shake Shack kiosk in Madison Square Park.",4.5,6210],
["The Morgan Library","museum",["Museum","Café"],"225 Madison Ave, New York, NY 10016","https://www.themorgan.org","Tue–Thu 10:30am–5pm, Fri 10:30am–9pm, Sat 10am–6pm, Sun 11am–6pm","+1 212-685-0008",40.7491,-73.9815,"J.P. Morgan's library turned museum of manuscripts & art.",4.7,3890],
["Greeley Square","park",["Park","Seating"],"W 32nd St & Broadway, New York, NY 10001","https://www.nycgovparks.org/parks/greeley-square","24/7","+1 212-768-3838",40.7484,-73.9883,"Pocket park across from Herald Square with café tables."],
["Manhattan Mall","shopping",["Shopping","Food court"],"100 W 33rd St, New York, NY 10001","https://www.manhattanmallny.com","Mon–Sat 10am–9pm, Sun 11am–8pm","+1 212-465-0500",40.7497,-73.9889,"Vertical mall at 33rd & 6th above the subway."],
["The Pennsy Food Hall","food",["Food hall","Takeout"],"2 Penn Plaza, New York, NY 10121","https://www.thepennsyny.com","Mon–Fri 7am–10pm, Sat–Sun 8am–10pm","+1 212-239-6200",40.7505,-73.9920,"Upscale food hall atop Penn Station."],
["Ace Hotel Lobby","nightlife",["Cocktails","Coffee","Wi-Fi"],"20 W 29th St, New York, NY 10001","https://acehotel.com/new-york","24/7","+1 212-679-2222",40.7459,-73.9886,"Buzzy lobby-as-living-room with coffee and cocktails."],
["Grand Central Terminal","transit",["Transit","Landmark","Dining"],"89 E 42nd St, New York, NY 10017","https://www.grandcentralterminal.com","Daily 5:30am–2am","+1 212-340-2583",40.7527,-73.9772,"Beaux-Arts rail cathedral with the celestial ceiling.",4.8,72004],
["Rockefeller Center","landmark",["Landmark","Observation","Shops"],"45 Rockefeller Plaza, New York, NY 10111","https://www.rockefellercenter.com","Daily 8am–12am","+1 212-332-6868",40.7587,-73.9787,"Plaza, Top of the Rock, and the seasonal skating rink.",4.7,84221],
["St. Patrick’s Cathedral","landmark",["Landmark","Free","Historic"],"5th Ave, New York, NY 10022","https://saintpatrickscathedral.org","Daily 6:30am–8:45pm","+1 212-753-2261",40.7585,-73.9760,"Neo-Gothic Catholic cathedral on Fifth Avenue."],
["Union Square","park",["Park","Greenmarket","Transit"],"201 Park Ave S, New York, NY 10003","https://www.nycgovparks.org/parks/union-square-park","24/7","+1 212-460-1200",40.7359,-73.9911,"Greenmarket, statues and the city's favorite meeting steps.",4.6,21002],
["Chelsea Market","food",["Food hall","Shopping"],"75 9th Ave, New York, NY 10011","https://www.chelseamarket.com","Mon–Sat 7am–9pm, Sun 8am–8pm","+1 212-652-2110",40.7424,-74.0061,"Former Nabisco factory turned food hall and shops.",4.6,68110],
["Hudson Yards (Vessel)","shopping",["Shopping","Landmark","Dining"],"20 Hudson Yards, New York, NY 10001","https://www.hudsonyardsnewyork.com","Daily 10am–9pm","+1 332-204-8500",40.7538,-74.0021,"Shops, restaurants and the honeycomb Vessel sculpture."],
["The High Line (W 14th)","park",["Park","Free","Walk"],"W 14th St & Washington St, New York, NY 10014","https://www.thehighline.org","Daily 7am–10pm","+1 212-500-6035",40.7480,-74.0048,"Elevated rail-to-park promenade over the West Side."],
["Korilla / K-Town BBQ Row","food",["Korean","BBQ"],"32nd St between 5th & Broadway, New York, NY 10001","https://www.korillabbq.com","Daily 11am–2am","+1 646-429-6385",40.7472,-73.9862,"Korean BBQ and quick Korean eats along 32nd Street."],
// --- new spots from the spreadsheet ---
["Jongro BBQ","food",["Restaurant","Korean BBQ"],"22 W 32nd St, 2nd Fl, New York, NY 10001","https://www.jongrobbq.com","Daily 11:30am–11pm","",40.7475,-73.9869,"K-Town favorite for charcoal-grilled Korean BBQ.",4.5,4200],
["Kang Ho Dong Baekjeong","food",["Restaurant","Korean BBQ"],"1 E 32nd St, New York, NY 10016","https://www.baekjeongnyc.com","Daily 11:30am–12am","+1 212-966-9839",40.7472,-73.9849,"Buzzy tabletop Korean BBQ from a wrestling legend.",4.5,6100],
["BCD Tofu House","food",["Restaurant","Korean","Soft Tofu"],"5 W 32nd St, New York, NY 10001","https://www.bcdtofuhouse.com","Daily 10:30am–1am","+1 212-967-1900",40.7474,-73.9861,"Bubbling soondubu (soft tofu stew) day and night.",4.4,5300],
["Cho Dang Gol","food",["Restaurant","Korean","Tofu"],"55 W 35th St, New York, NY 10001","https://www.chodanggolnyc.com","Mon–Sun 12pm–2:30pm, 5pm–9:30pm","",40.7515,-73.9882,"Handmade tofu and homestyle Korean classics."],
["Her Name Is Han","food",["Restaurant","Korean","Modern"],"17 E 31st St, New York, NY 10016","https://www.hernameishan.com","Mon–Fri 11:30am–3pm & 5–10:30pm; Sat–Sun 11:30am–10:30pm","",40.7458,-73.9836,"Modern Korean comfort food in a cozy room.",4.6,3100],
["miss KOREA BBQ","food",["Restaurant","Korean BBQ","24hr"],"10 W 32nd St, New York, NY 10001","https://www.misskoreabbq.com","Open 24 hours","",40.7475,-73.9863,"Three floors of Korean BBQ, open around the clock.",4.4,4800],
["New Wonjo","food",["Restaurant","Korean BBQ"],"23 W 32nd St, New York, NY 10001","","Open 24 hours","",40.7476,-73.9871,"24-hour charcoal Korean BBQ stalwart."],
["Gaonnuri","food",["Restaurant","Korean","Fine Dining"],"1250 Broadway, 39th Fl, New York, NY 10001","https://www.gaonnuri.com","Mon–Sun 11:30am–3pm, 5–10pm","",40.7480,-73.9881,"Upscale Korean dining with sweeping skyline views.",4.5,1900],
["Pocha 32","nightlife",["Bar","Korean","Pojangmacha"],"15 W 32nd St, 2nd Fl, New York, NY 10001","","Daily 5pm–4am","",40.7475,-73.9866,"Tented K-Town pojangmacha for soju and late-night bites.",4.3,2200],
["Woorijip","food",["Restaurant","Korean","Casual"],"12 W 32nd St, New York, NY 10001","https://www.woorijipnyc.com","Daily 8am–11pm","",40.7475,-73.9863,"Grab-and-go Korean banchan bar and quick meals.",4.3,3000],
["Mandoo Bar","food",["Restaurant","Korean","Dumplings"],"2 W 32nd St, New York, NY 10001","","Daily 11:30am–10pm","",40.7474,-73.9858,"Handmade dumplings folded in the front window.",4.4,2600],
["Dons Bogam","food",["Restaurant","Korean BBQ","Wine"],"17 E 32nd St, New York, NY 10016","https://www.donsbogam.com","Daily 11:30am–11pm","",40.7472,-73.9837,"Korean BBQ and wine in a polished setting."],
["Hangawi","food",["Restaurant","Korean","Vegetarian"],"12 E 32nd St, New York, NY 10016","https://www.hangawirestaurant.com","Mon–Sun 12pm–3pm, 5–10pm","+1 212-213-0077",40.7472,-73.9842,"Serene shoes-off temple of Korean vegetarian cuisine.",4.6,2400],
["Kunjip","food",["Restaurant","Korean","Casual"],"9 W 32nd St, New York, NY 10001","https://www.kunjip.net","Daily 11am–12am","",40.7474,-73.9862,"All-day Korean comfort classics in the heart of K-Town.",4.3,4100],
["Hojokban","food",["Restaurant","Korean","Comfort Food"],"7 W 32nd St, 3rd Fl, New York, NY 10001","https://hojokban.com/new-york/home","Daily 11:30am–11pm","",40.7474,-73.9861,"Modern Korean comfort food and soju upstairs."],
["Soju Haus","nightlife",["Bar","Korean","Soju"],"315 5th Ave, 2nd Fl, New York, NY 10016","","Daily 4pm–2am","",40.7470,-73.9856,"Soju, anju and K-pop energy above Fifth Avenue."],
["Joo Ok","food",["Restaurant","Korean","Tasting Menu"],"22 W 32nd St, 16th Fl, New York, NY 10001","https://www.joo-ok.com","Tue–Sat seatings 5:30pm–9pm (by reservation)","",40.7475,-73.9869,"Refined Korean tasting menu high above K-Town.",4.6,420],
["Turntable Chicken Jazz","food",["Korean Fried Chicken","Bar"],"20 W 33rd St, New York, NY 10001","https://turntablenyc.com","Daily 11:30am–12am","",40.7483,-73.9874,"Korean fried chicken and beer with a vinyl-jazz soundtrack.",4.3,1500],
["Little Ned","nightlife",["Bar","Cocktails","Lounge"],"7 E 27th St, New York, NY 10016","","Daily 4pm–2am","",40.7441,-73.9845,"Plush NoMad cocktail lounge for a low-lit night.",4.4,300],
["Patent Pending","nightlife",["Bar","Cocktails","Speakeasy"],"49 W 27th St, New York, NY 10001","https://www.patentpendingnyc.com","Tue–Sat 5pm–12am","",40.7448,-73.9893,"Speakeasy behind a coffee shop in Tesla's old workshop.",4.6,1200],
["The Ivory Peacock","nightlife",["Bar","Cocktails","Gin"],"45 W 29th St, New York, NY 10001","","Mon–Sat 5pm–12am","",40.7460,-73.9889,"Art-nouveau cocktail parlor heavy on the gin.",4.5,260],
["Nubeluz by Jose Andres","nightlife",["Bar","Cocktails","Rooftop"],"25 W 28th St, 50th Fl, New York, NY 10001","https://www.nubeluznyc.com","Wed–Sun 5pm–1am","",40.7452,-73.9885,"José Andrés' sky-high rooftop cocktail salon.",4.4,900],
["Brass","food",["Restaurant","Bar","Seafood"],"1185 Broadway, New York, NY 10001","","Daily 4pm–12am","",40.7445,-73.9886,"Buzzy NoMad seafood brasserie and raw bar.",4.4,800],
["Koloman","food",["Restaurant","Bar","Austrian/French"],"16 W 29th St, New York, NY 10001","https://www.kolomanrestaurant.com","Daily 5pm–11pm","",40.7457,-73.9882,"Elegant Austrian-French dining off Fifth Avenue.",4.5,650],
["Oscar Wilde","nightlife",["Bar","Cocktails","Historic"],"45 W 27th St, New York, NY 10001","https://www.oscarwildenyc.com","Daily 11:30am–2am","",40.7447,-73.9886,"Opulent 100-ft bar dripping in Victorian decor.",4.5,4300],
["Swingers NoMad","nightlife",["Bar","Mini Golf","Cocktails"],"35 W 29th St, New York, NY 10001","https://swingers.club","Mon–Sun 12pm–12am (21+ evenings)","",40.7459,-73.9884,"Crazy-golf bar with cocktails and street food.",4.4,1100],
["The Portrait Bar","nightlife",["Bar","Cocktails","Hotel"],"250 5th Ave, New York, NY 10001","https://www.thefifthavenuehotel.com","Daily 4pm–1am","",40.7449,-73.9874,"Jewel-box hotel bar at The Fifth Avenue Hotel.",4.5,420],
["K32 Rooftop Bar","nightlife",["Bar","Rooftop","Korean"],"22 W 32nd St, Rooftop, New York, NY 10001","","Daily 5pm–2am","",40.7476,-73.9869,"Open-air rooftop over K-Town for soju cocktails."],
["Mustang Harry's","nightlife",["Bar","Sports Bar","Irish Pub"],"352 7th Ave, New York, NY 10001","https://www.mustangharrys.com","Daily 11am–2am","+1 212-268-8930",40.7487,-73.9912,"Cavernous Irish sports bar near the Garden.",4.3,1700],
["The Liberty NYC","nightlife",["Bar","Cocktails"],"29 W 35th St, New York, NY 10001","https://www.thelibertynyc.com","Daily 4pm–2am","",40.7510,-73.9874,"Neighborhood cocktail bar near Herald Square.",4.4,500],
["The Ragtrader","food",["Restaurant","Bar","American"],"70 W 36th St, New York, NY 10018","https://www.theragtrader.com","Daily 7am–11pm","",40.7515,-73.9882,"Garment-district restaurant and bar in a former school.",4.3,700],
["Stout NYC","nightlife",["Bar","Irish Pub","Gastropub"],"133 W 33rd St, New York, NY 10001","https://www.stoutnyc.com","Daily 11am–4am","",40.7497,-73.9901,"Huge Irish gastropub steps from the Garden.",4.2,1400],
["Grace Street Coffee & Desserts","food",["Dessert","Café","Bingsu"],"17 W 32nd St, New York, NY 10001","","Daily 12pm–12am","",40.7475,-73.9866,"K-Town café for honey toast, bingsu and lattes.",4.5,2600],
["Angelina Bakery Herald Square","food",["Dessert","Bakery","Italian"],"1283 Broadway, New York, NY 10001","https://angelinabakery.com","Daily 7am–10pm","",40.7490,-73.9879,"Italian bakery famous for cronut-style pastries.",4.4,1500],
["Tous Les Jours","food",["Dessert","Bakery","Korean-French"],"4 W 32nd St, New York, NY 10001","https://www.tlj.com","Daily 7am–10pm","",40.7474,-73.9859,"Korean-French bakery-café with cakes and buns.",4.3,1100],
["Paris Baguette","food",["Dessert","Bakery","Café"],"6 W 32nd St, New York, NY 10001","https://www.parisbaguette.com","Daily 7am–10pm","",40.7474,-73.9860,"Pastries, cakes and coffee in the heart of K-Town.",4.3,1300],
["Zaro's Family Bakery (Macy's)","food",["Dessert","Bakery"],"151 W 34th St, 6th Fl, New York, NY 10001","https://www.zaro.com","Mon–Fri 10am–9pm, Sat–Sun 10am–8pm","",40.7507,-73.9893,"NYC family bakery counter inside Macy's."],
["Carvel (Macy's Herald Square)","food",["Dessert","Ice Cream"],"151 W 34th St, 7th Fl, New York, NY 10001","https://www.carvel.com","Mon–Sat 10am–9pm, Sun 11am–8pm","",40.7507,-73.9892,"Soft-serve and ice-cream cakes inside Macy's."],
["NY Bakery and Desserts","food",["Dessert","Bakery","Café"],"1204 Broadway, New York, NY 10001","","Daily 8am–10pm","",40.7458,-73.9889,"Cozy NoMad spot for cakes, coffee and pastries."],
["Maman","food",["Dessert","Bakery","Café"],"162 5th Ave, New York, NY 10010","https://www.mamannyc.com","Daily 7am–7pm","",40.7398,-73.9905,"French-inspired café known for the nutty chocolate cookie.",4.5,2100],
["Keens Steakhouse","food",["Steakhouse","Historic"],"72 W 36th St, New York, NY 10018","https://www.keens.com","Mon–Fri 11:45am–10:30pm, Sat–Sun 5pm–10:30pm","+1 212-947-3636",40.7515,-73.9884,"1885 chophouse famous for mutton chops and pipes.",4.7,5200],
["Stella 34 Trattoria","food",["Italian"],"151 W 34th St, 6th Fl (Macy's), New York, NY 10001","https://www.stella34.com","Daily 11:30am–9pm","",40.7509,-73.9890,"Italian trattoria with Empire State views inside Macy's.",4.4,3200],
["The Smith NoMad","food",["American","Brasserie"],"1150 Broadway, New York, NY 10001","https://www.thesmithrestaurant.com","Daily 8am–11pm","",40.7443,-73.9889,"Bustling all-day American brasserie.",4.5,4600],
["Friedman's Herald Square","food",["American","Gluten-Free"],"138 W 31st St, New York, NY 10001","https://www.friedmansrestaurant.com","Daily 9am–10pm","",40.7489,-73.9901,"Comfort-food American spot with big GF menu.",4.4,2300],
["Ai Fiori","food",["Italian","Fine Dining"],"400 5th Ave, 2nd Fl, New York, NY 10018","https://www.aifiorinyc.com","Mon–Sat 12pm–2:30pm, 5–10pm","",40.7510,-73.9839,"Michelin-starred Italian-Riviera fine dining.",4.6,1900],
["Wolfgang's Steakhouse (Park Ave)","food",["Steakhouse"],"4 Park Ave, New York, NY 10016","https://www.wolfgangssteakhouse.net","Daily 12pm–10:30pm","",40.7459,-73.9799,"Dry-aged porterhouse in a landmarked Park Ave room.",4.5,2700],
["Hill Country Barbecue Market","food",["BBQ","Texan"],"30 W 26th St, New York, NY 10010","https://www.hillcountry.com","Daily 11:30am–10pm","",40.7443,-73.9905,"Central-Texas BBQ by the pound with live music.",4.4,3100],
["Marta","food",["Italian","Roman Pizza"],"29 E 29th St, New York, NY 10016","https://www.martamanhattan.com","Daily 11:30am–11pm","",40.7449,-73.9836,"Wood-fired Roman-style thin-crust pizza.",4.5,2500],
["Scarpetta","food",["Italian","Fine Dining"],"88 Madison Ave, New York, NY 10016","https://www.scarpettarestaurants.com","Daily 5pm–10:30pm","",40.7449,-73.9847,"Polished Italian known for its silky spaghetti.",4.5,2900],
["La Pecora Bianca NoMad","food",["Italian"],"1133 Broadway, New York, NY 10010","https://www.lapecorabianca.com","Daily 8am–10pm","",40.7440,-73.9890,"Sunny market-driven Italian in NoMad.",4.4,1800],
["Zaytinya by Jose Andres","food",["Mediterranean","Mezze"],"1185 Broadway, New York, NY 10001","https://www.zaytinya.com","Daily 11:30am–10pm","",40.7445,-73.9886,"José Andrés' Greek-Turkish-Lebanese mezze.",4.5,1600],
["The Clocktower","food",["British","Fine Dining"],"5 Madison Ave, 2nd Fl, New York, NY 10010","https://www.theclocktowernyc.com","Daily 7am–10:30pm","",40.7416,-73.9874,"Michelin-starred British dining in the clocktower.",4.5,2000],
["Eleven Madison Park","food",["Fine Dining","Tasting Menu"],"11 Madison Ave, New York, NY 10010","https://www.elevenmadisonpark.com","Wed–Sun seatings (by reservation)","+1 212-889-0905",40.7416,-73.9871,"World-renowned plant-based tasting menu.",4.6,5400],
];

const esc = s => String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");

// seed array (server)
const seed = D.map(r => `  { name: '${esc(r[0])}', latitude: ${r[7]}, longitude: ${r[8]}, category: '${r[1]}' },`).join('\n');
fs.writeFileSync('/tmp/seed_spots.txt', seed);

// placeInfo (client)
let pi = `// Curated details for our NYC spots (no API key needed). Generated from the\n`;
pi += `// spreadsheet — see scripts/genspots.mjs.\n`;
pi += `export type PlaceInfo = {\n  blurb?: string;\n  website?: string;\n  price?: string;\n  tags?: string[];\n  rating?: number;\n  ratingCount?: number;\n  hours?: string;\n  address?: string;\n  phone?: string;\n};\n\n`;
pi += `export const PLACE_INFO: Record<string, PlaceInfo> = {\n`;
for (const r of D) {
  const [name,,tags,addr,web,hours,phone,,,blurb,rating,rc] = r;
  pi += `  '${esc(name)}': {\n`;
  pi += `    blurb: '${esc(blurb)}',\n`;
  if (web) pi += `    website: '${esc(web)}',\n`;
  pi += `    tags: [${tags.map(t=>`'${esc(t)}'`).join(', ')}],\n`;
  if (hours) pi += `    hours: '${esc(hours)}',\n`;
  pi += `    address: '${esc(addr)}',\n`;
  if (phone) pi += `    phone: '${esc(phone)}',\n`;
  if (rating != null) pi += `    rating: ${rating},\n    ratingCount: ${rc},\n`;
  pi += `  },\n`;
}
pi += `};\n\n`;
pi += `export function placeInfoFor(name: string): PlaceInfo {\n  return PLACE_INFO[name] ?? {};\n}\n\n`;
pi += `export function mapsSearchUrl(name: string): string {\n  return \`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(name + ', New York, NY')}\`;\n}\n`;
pi += `export function mapsDirectionsUrl(lat: number, lng: number): string {\n  return \`https://www.google.com/maps/dir/?api=1&destination=\${lat},\${lng}\`;\n}\n`;
fs.writeFileSync('src/placeInfo.ts', pi);
console.log('spots:', D.length, '| placeInfo.ts written | seed -> /tmp/seed_spots.txt');
