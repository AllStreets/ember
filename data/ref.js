'use strict';
/* Reference data — bundled offline. Morse, phonetic, knots, radio, conversions. */

const MORSE = {
  A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',
  M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',
  '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.',
  '.':'.-.-.-',',':'--..--','?':'..--..','/':'-..-.','@':'.--.-.','-':'-....-',"'":'.----.',':':'---...',';':'-.-.-.',
  '(':'-.--.',')':'-.--.-','=':'-...-','+':'.-.-.','!':'-.-.--',' ':'/'
};

const PHONETIC = [
  ['A','Alpha'],['B','Bravo'],['C','Charlie'],['D','Delta'],['E','Echo'],['F','Foxtrot'],['G','Golf'],['H','Hotel'],
  ['I','India'],['J','Juliett'],['K','Kilo'],['L','Lima'],['M','Mike'],['N','November'],['O','Oscar'],['P','Papa'],
  ['Q','Quebec'],['R','Romeo'],['S','Sierra'],['T','Tango'],['U','Uniform'],['V','Victor'],['W','Whiskey'],['X','X-ray'],
  ['Y','Yankee'],['Z','Zulu'],
  ['0','Zero'],['1','One'],['2','Two'],['3','Tree'],['4','Fower'],['5','Fife'],['6','Six'],['7','Seven'],['8','Ait'],['9','Niner']
];

/* schematic knot diagrams (SVG) — the rope (amber) against any anchor/post (grey).
   Diagrams are stylised aids; follow the steps to tie correctly. */
const KNOTS = [
  { name:'Bowline', use:'A fixed loop that won\'t slip or jam — rescue, securing, hauling. "The king of knots."',
    svg:`<svg viewBox="0 0 150 100"><path class="r" d="M14 80h40"/><path class="r" d="M54 80c0-46 60-50 62-14 2 28-34 32-50 16"/><path class="r" d="M45 66a13 12 0 1 0 22 7"/><path class="r" d="M60 60l10-30 26 8"/></svg>`,
    steps:['Make a small loop ("the rabbit hole") in the standing line.','Pass the working end up through the hole ("rabbit out of the hole").','Around behind the standing line ("around the tree").','Back down through the hole ("into the hole"). Dress and tighten.'] },
  { name:'Square (Reef) knot', use:'Join two lines of equal thickness / tie off a bundle or bandage. Not for critical loads.',
    svg:`<svg viewBox="0 0 150 100"><path class="r" d="M12 40c34-4 40 40 66 20"/><path class="r" d="M138 60c-34 4-40-40-66-20"/><path class="r2" d="M12 60c34 4 40-40 66-20"/><path class="r2" d="M138 40c-34-4-40 40-66 20"/></svg>`,
    steps:['Right over left and under.','Then left over right and under.','Both ends exit the same side of their loop, or it\'s a slipping "granny" — redo it.'] },
  { name:'Clove hitch', use:'Quick attach a line to a post/pole — lashings, shelter ridgelines. Adjustable, can slip under swinging loads.',
    svg:`<svg viewBox="0 0 150 100"><path class="p" d="M60 6v88M90 6v88"/><path class="r" d="M20 74l70-30"/><path class="r" d="M20 44l86 12"/><path class="r" d="M60 60l50-18"/></svg>`,
    steps:['Wrap the working end around the post.','Cross over and wrap around again.','Tuck the end under the last wrap and pull tight.'] },
  { name:'Taut-line hitch', use:'An adjustable loop that grips under tension — tent guy-lines, ridgelines you need to tension.',
    svg:`<svg viewBox="0 0 150 100"><path class="p" d="M120 10v80"/><path class="r" d="M20 82l100-58"/><path class="r" d="M55 62c14-8 22 4 8 12M62 70c14-8 22 4 8 12M74 54c14-8 22 4 8 12"/></svg>`,
    steps:['Wrap around the anchor and back.','Two wraps INSIDE the loop (toward the anchor).','One wrap OUTSIDE, then tuck. Slide the hitch to tension; it holds under load.'] },
  { name:'Two half-hitches', use:'Secure a line to a ring, tree, or anchor — reliable general tie-off.',
    svg:`<svg viewBox="0 0 150 100"><circle class="p" cx="118" cy="50" r="16"/><path class="r" d="M16 50h86"/><path class="r" d="M70 50c-10 0-14 14 0 16s10-16 0-16"/><path class="r" d="M90 50c-10 0-14 14 0 16s10-16 0-16"/></svg>`,
    steps:['Pass the line around the anchor.','Tie a half-hitch around the standing line.','Tie a second identical half-hitch below it. Snug together.'] },
  { name:'Prusik', use:'A friction loop that grips a rope when loaded and slides when not — climbing/hauling, ascending a line.',
    svg:`<svg viewBox="0 0 150 100"><path class="p" d="M20 30h110"/><path class="r" d="M60 30c-16 0-16 16 0 16s16-16 0-16M75 30c-16 0-16 16 0 16s16-16 0-16M90 30c-16 0-16 16 0 16s16-16 0-16"/><path class="r" d="M75 46v30a12 12 0 0 0 0 0"/><ellipse class="r" cx="75" cy="82" rx="14" ry="10"/></svg>`,
    steps:['Make a closed loop of thinner cord.','Wrap it around the main rope 3 times through itself (a girth hitch, doubled).','Dress the wraps neatly. Loaded = grips; unloaded = slides.'] },
  { name:'Figure-8 (stopper)', use:'A bulky stopper that won\'t slip through a hole/pulley and won\'t jam like an overhand. Tie it "on a bight" for a strong, easily-untied loop.',
    svg:`<svg viewBox="0 0 150 100"><path class="r" d="M75 14a15 14 0 1 0 0 28 15 14 0 1 1 0 28 15 14 0 1 0 0-28 15 14 0 1 1 0-28"/><path class="r" d="M75 84v9"/></svg>`,
    steps:['Make a loop, then pass the working end BEHIND the standing line.','Bring it around the front and DOWN through the first loop.','Dress into a neat "8" and pull tight.','For a loop: fold the rope into a bight and tie the 8 with the doubled rope.'] },
  { name:'Sheet bend', use:'Joins two ropes — especially of DIFFERENT thickness or material — where a square knot would slip. The go-to bend.',
    svg:`<svg viewBox="0 0 150 100"><path class="p" d="M34 82V44a16 16 0 0 1 32 0v38"/><path class="r" d="M118 26c-34 4-40 26-40 34 0 9 12 10 13-2"/><path class="r" d="M78 60c0 13 16 13 24 4"/></svg>`,
    steps:['Make a bight (U-shape) in the THICKER rope.','Pass the thinner rope up through the bight.','Around behind both legs of the bight.','Tuck it under ITSELF (not through the bight) and tighten. Both tails should end on the same side.'] },
  { name:'Trucker\'s hitch', use:'A 3:1 pulley you can tie in the line to CINCH a load down hard — securing gear, ridgelines, cargo.',
    svg:`<svg viewBox="0 0 150 100"><path class="p" d="M18 90h18M116 90h20"/><path class="r" d="M28 84V52"/><path class="r" d="M28 40a12 11 0 1 0 .1 0"/><path class="r" d="M126 84V56"/><path class="r" d="M126 56l-88-8"/><path class="r" d="M30 50l96 40"/></svg>`,
    steps:['Anchor one end. Partway along the line, tie a loop (a slippery half-hitch or figure-8 on a bight) to act as a pulley.','Pass the working end around the far anchor, then back UP through the loop.','Pull down hard — you get ~3× tension.','Lock it off with two half-hitches around the taut line.'] },
  { name:'Timber hitch', use:'Grips a log, pole, or bundle to drag or lift it; the harder you pull, the tighter it bites. Unties instantly when slack.',
    svg:`<svg viewBox="0 0 150 100"><rect class="p" x="26" y="40" width="98" height="22" rx="11"/><path class="r" d="M16 51h74"/><path class="r" d="M90 51c0-15 20-15 20 1M98 42c0 16 15 16 15 0M103 60c0-13 13-13 13 1"/></svg>`,
    steps:['Pass the rope around the timber.','Take the working end around the STANDING line.','Then tuck it back around ITSELF 3–4 times (twisting along its own part).','Snug it to the wood; tension locks it, slack frees it. Add a half-hitch further along for dragging.'] },
];

/* Radiation & fallout reference — general civil-defence guidance, not a substitute
   for official instructions or a real dosimeter. Doses in sieverts (Sv); acute
   (short-term whole-body) exposure. Background is ~2–3 mSv PER YEAR for scale. */
const RADIATION = {
  mantra: '"Get Inside, Stay Inside, Stay Informed." The first 24–48 hours sheltered are what save you.',
  decay: 'RULE OF 7-10: for every 7× increase in time after a blast, the fallout dose rate drops about 10×. So the rate at 7 h ≈ 1/10 of the 1 h rate; at ~2 days ≈ 1/100; at ~2 weeks ≈ 1/1000. Fallout is most dangerous in the first hours — shelter is everything early.',
  doses: [
    ['< 0.1 Sv (100 mSv)', 'No immediate symptoms. Slightly raised long-term cancer risk.', 'go'],
    ['0.1 – 0.5 Sv', 'Usually no acute symptoms; temporary drop in blood cells possible.', 'go'],
    ['0.5 – 1 Sv', 'Mild radiation sickness in some: nausea, fatigue within hours. Recover with rest.', 'warn'],
    ['1 – 2 Sv', 'Radiation sickness: nausea/vomiting hours after, tiredness, low immunity ~weeks. Survivable with care.', 'warn'],
    ['2 – 4 Sv', 'Serious: vomiting, hair loss, high infection/bleeding risk. Needs medical care; deaths without it.', 'danger'],
    ['4 – 6 Sv', 'Severe. LD50 ≈ 4.5 Sv — about half die within weeks even with treatment.', 'danger'],
    ['6 – 10 Sv', 'Usually fatal within days to weeks.', 'danger'],
    ['> 10 Sv', 'Fatal within days. Focus on comfort.', 'danger'],
  ],
  rateScale: [
    ['Normal background', '~0.1 – 0.3 µSv/h', 'go'],
    ['Elevated / watch', '1 – 10 µSv/h', 'warn'],
    ['Leave / seek shelter', '10 – 100 µSv/h', 'warn'],
    ['Dangerous — minimise time', '> 100 µSv/h (0.1 mSv/h)', 'danger'],
    ['Acutely hazardous', '> 10 mSv/h', 'danger'],
  ],
  tds: [
    ['Time', 'Radiation dose adds up with time. Fallout decays fast early (rule of 7-10) — stay sheltered, limit any time outside to minutes.'],
    ['Distance', 'Dose falls with the square of distance from a source: double the distance ≈ one-quarter the dose. Get away from and stay off contaminated surfaces.'],
    ['Shielding', 'Mass stops gamma rays. "Halving thicknesses" (each cuts dose ~50%): ≈ 9 cm packed earth, 6 cm concrete, 2 cm steel, 12 cm water/books. Stack them — a basement corner or the centre of a large building is best.'],
  ],
  shelter: [
    'Go to the middle floor of a sturdy building, or a basement — as much concrete/earth/mass as possible between you and the roof and outside walls (fallout settles on roofs and the ground).',
    'Seal off the room from outside air where practical; turn off ventilation/AC that draws outside air.',
    'Stay in for at least 24 h; 48 h to two weeks is far safer as fallout decays. Come out only briefly if forced.',
  ],
  decon: [
    'Remove your outermost clothing before coming inside — this removes up to ~90% of fallout on you. Bag it and set it far from people.',
    'Wash exposed skin and hair with soap and lukewarm water; do NOT scrub raw. Blow your nose, wipe eyes/ears.',
    'Do NOT use hair conditioner — it binds radioactive particles to your hair.',
    'Keep contaminated items and yourself separate until washed.',
  ],
  ki: 'Potassium iodide (KI) ONLY protects the thyroid from radioactive IODINE — it does nothing for other radiation. Take it only if officials or credible information confirm a radioiodine release. Typical adult dose ~130 mg once daily as directed; children less. Avoid with iodine allergy or certain thyroid conditions. It is not an all-purpose "anti-radiation pill".',
};

// Reference only — always verify local regulations; most bands require a licence.
const FREQS = [
  { band:'Emergency', rows:[
    ['Intl distress (marine VHF)','Ch 16 · 156.800 MHz','Hailing & distress at sea'],
    ['Aviation emergency','121.500 MHz','"Guard" — monitored emergency'],
    ['NOAA weather (US)','162.400–162.550 MHz','Continuous weather broadcast'],
  ]},
  { band:'FRS / GMRS (US, no licence for FRS)', rows:[
    ['FRS/GMRS Ch 1','462.5625 MHz','Common simple radios'],
    ['GMRS "prepper" call Ch 3','462.6125 MHz','Often used as a meetup channel'],
    ['MURS Ch (licence-free VHF)','151.820–154.600 MHz','Short-range, no licence (US)'],
  ]},
  { band:'CB (no licence)', rows:[
    ['CB Ch 9','27.065 MHz','Emergency/traveller assistance'],
    ['CB Ch 19','27.185 MHz','Highway/trucker channel — news travels here'],
  ]},
  { band:'Amateur (Ham — licence required)', rows:[
    ['2 m calling','146.520 MHz','FM simplex calling frequency'],
    ['70 cm calling','446.000 MHz','FM simplex calling frequency'],
    ['40 m / 20 m HF','7.0–7.3 / 14.0–14.35 MHz','Long-distance when the grid is down'],
  ]},
];

// factor to convert FROM the unit TO the base unit
const CONV = {
  length:{ base:'m', units:{ mm:0.001, cm:0.01, m:1, km:1000, in:0.0254, ft:0.3048, yd:0.9144, mi:1609.344, nmi:1852 } },
  mass:{ base:'kg', units:{ mg:1e-6, g:0.001, kg:1, oz:0.0283495, lb:0.453592, st:6.35029, ton:1000 } },
  volume:{ base:'L', units:{ mL:0.001, L:1, tsp:0.00492892, tbsp:0.0147868, cup:0.24, pt:0.473176, qt:0.946353, gal:3.78541 } },
  area:{ base:'m2', units:{ 'm²':1, 'km²':1e6, 'ft²':0.092903, acre:4046.86, hectare:10000 } },
  speed:{ base:'m/s', units:{ 'm/s':1, 'km/h':0.277778, mph:0.44704, knot:0.514444 } },
  temperature:'special', // handled in code
  energy:{ base:'J', units:{ J:1, kJ:1000, cal:4.184, kcal:4184, Wh:3600, kWh:3.6e6 } },
  pressure:{ base:'Pa', units:{ Pa:1, kPa:1000, bar:1e5, atm:101325, psi:6894.76, mmHg:133.322 } },
};

const CONSTANTS = [
  ['Walking speed (flat, loaded)','~4–5 km/h (2.5–3 mph)'],
  ['Naismith\'s rule','+1 hour per 600 m (2,000 ft) of ascent'],
  ['Water need (rest, temperate)','~2–3 L/person/day (much more in heat/exertion)'],
  ['Minimum survival water','~1 L/day short-term; dehydration impairs judgment first'],
  ['Body core temp','37 °C / 98.6 °F — defend it above all'],
  ['Freezing / boiling (sea level)','0 °C / 32 °F · 100 °C / 212 °F'],
  ['Bleach for water','2 drops (5–9%) per litre, wait 30 min'],
  ['Rule of 3s','3 min air · 3 hrs shelter · 3 days water · 3 weeks food'],
];
