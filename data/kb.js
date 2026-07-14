'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   EMBER KNOWLEDGE BASE — bundled offline. General-purpose survival & practical
   reference. This is educational reference, NOT a substitute for hands-on
   training or professional medical care — seek trained help whenever it exists.
   Each entry: { id, cat, title, tags:[], html }
   ═══════════════════════════════════════════════════════════════════════════ */
const KB_CATS = ['Priorities','Water','Fire','Shelter','First Aid','Food','Navigation','Signaling','Weather','Security','Repair','Sanitation','Mindset'];

const KB = [
{ id:'rule3', cat:'Priorities', title:'The Rule of 3s — what kills you first', tags:['priority','triage','order'], html:`
<p>Survival is a triage problem. You die in roughly this order, so spend effort in this order:</p>
<ul>
<li><strong>3 minutes</strong> without air (or with severe bleeding).</li>
<li><strong>3 hours</strong> without shelter in a harsh environment (cold, wet, or extreme heat).</li>
<li><strong>3 days</strong> without water.</li>
<li><strong>3 weeks</strong> without food.</li>
</ul>
<h4>First 60 minutes (S.T.O.P.)</h4>
<ol><li><strong>Stop</strong> — don't act on panic. Sit. Breathe.</li>
<li><strong>Think</strong> — what's the real threat right now?</li>
<li><strong>Observe</strong> — inventory yourself, gear, surroundings, weather, light left.</li>
<li><strong>Plan</strong> — protect core temperature, secure water, signal/be findable, then food.</li></ol>
<p class="warn">Most survival deaths are from exposure, not starvation. Shelter and staying dry usually matter more than food.</p>` },

{ id:'priorities-day1', cat:'Priorities', title:'Grid-down: first 24 hours checklist', tags:['blackout','checklist','power'], html:`
<h4>Immediate</h4>
<ul><li>Confirm household safety; account for everyone; treat injuries.</li>
<li>Kill gas/utilities if you smell a leak or see damage.</li>
<li>Fill every container, bathtub, and pot with water NOW while pressure/pumps may still hold.</li>
<li>Move perishable food to coldest spot; keep freezer/fridge shut (a full freezer holds ~48h).</li></ul>
<h4>Set up</h4>
<ul><li>Establish one warm room; block drafts; plan to heat/cool one space, not the house.</li>
<li>Set light discipline for night (a lit house is a beacon — decide if that's good or bad for you).</li>
<li>Charge phones/radios/lights off the solar generator during peak sun; run laptops only as needed.</li>
<li>Write a plan and a log. Note water/food/fuel on hand and daily ration. Check the Log module.</li></ul>` },

{ id:'water-purify', cat:'Water', title:'Making water safe to drink', tags:['water','boil','filter','purify','disinfect'], html:`
<p>Clear water can still carry pathogens. Two problems: <strong>particles/turbidity</strong> and <strong>microbes</strong>. Filter first, then disinfect.</p>
<h4>1 · Pre-filter (removes dirt, not germs)</h4>
<p>Pour through a cloth, coffee filter, or sand/charcoal/gravel column. Let cloudy water settle first and draw from the top.</p>
<h4>2 · Disinfect (kills germs) — pick one</h4>
<ul>
<li><strong>Boiling (best):</strong> a rolling boil for <strong>1 minute</strong> — <strong>3 minutes above ~2,000 m / 6,500 ft</strong>. Cover it; let it cool.</li>
<li><strong>Household bleach</strong> (unscented, 5–9% sodium hypochlorite): <strong>2 drops per litre / quart</strong> (4 drops if cloudy or cold). Stir, wait <strong>30 min</strong>. It should smell faintly of chlorine; if not, repeat once.</li>
<li><strong>Iodine 2% tincture:</strong> 5 drops per litre (10 if cloudy), wait 30 min. Not for pregnancy or thyroid issues; avoid long-term use.</li>
<li><strong>SODIS (solar):</strong> fill a clear PET plastic bottle, lay on its side in <strong>full sun ≥6 hours</strong> (2 days if overcast). UV disinfects. Works only with reasonably clear water and clear bottles.</li>
</ul>
<p class="warn">Boiling/chemicals/UV kill microbes but do NOT remove chemical pollutants, heavy metals, or salt. Don't drink flood, industrial, or salt water even after boiling — distill it instead.</p>` },

{ id:'water-find', cat:'Water', title:'Finding & collecting water', tags:['water','rain','dew','condensation'], html:`
<ul>
<li><strong>Rain</strong> is the safest source — rig a tarp/sheet funnel into clean containers.</li>
<li><strong>Dew:</strong> at dawn, drag an absorbent cloth over grass, then wring into a container. Surprising yields.</li>
<li><strong>Follow terrain</strong> downhill; look for green vegetation, animal trails converging, and insect swarms — all point to water.</li>
<li><strong>Dig</strong> in a dry streambed at the outer bend / lowest point; water may seep in. Let it clear.</li>
<li><strong>Transpiration bag:</strong> tie a clear bag over a leafy non-toxic branch in sun; collects clean condensation over hours.</li>
<li><strong>Snow/ice:</strong> MELT it first — eating snow drops your core temperature and costs more water than it gives. Melt ice over snow (denser).</li>
</ul>
<p class="warn">Avoid stagnant water with no life, foam, or strong smell. Treat everything (see purification). Coconut water, fresh fruit, and cactus flesh (some species) provide hydration.</p>` },

{ id:'water-distill', cat:'Water', title:'Distilling salt or foul water', tags:['water','salt','distill','desalinate'], html:`
<p>Distillation removes salt, most chemicals, and microbes by boiling water and condensing only the steam.</p>
<ol>
<li>Boil the bad water in a covered pot.</li>
<li>Angle the lid so condensation runs to one edge and drips off into a clean catch cup, or run steam through a tube into a cool container.</li>
<li>The drips are pure distilled water; the salt/junk stays behind.</li>
</ol>
<p><strong>Solar still:</strong> dig a pit, put a container in the centre, add green vegetation or foul water around it, cover the pit with clear plastic weighted with a stone over the cup. Sun evaporates moisture; it condenses on the plastic and drips into the cup. Low yield but hands-off.</p>` },

{ id:'fire-build', cat:'Fire', title:'Building a fire that actually lights', tags:['fire','tinder','kindling'], html:`
<p>Fire needs <strong>tinder → kindling → fuel</strong>, plus oxygen. Gather triple what you think you need before striking anything.</p>
<h4>Tinder (catches a spark)</h4>
<p>Dry grass, birch bark, cattail fluff, char cloth, cotton ball + petroleum jelly, dryer lint, fine wood shavings, dead pine needles. Must be bone dry and fluffy.</p>
<h4>Kindling (pencil → thumb thickness)</h4>
<p>Small dry twigs, split wood feather-sticks. Dead branches still on the tree are drier than those on wet ground.</p>
<h4>Method</h4>
<ol><li>Build a <strong>teepee</strong> or <strong>lean-to</strong> of kindling around/over the tinder with a gap to feed air and light it.</li>
<li>Light the tinder low and upwind; shield from wind; blow gently at the base to feed oxygen.</li>
<li>Add kindling small-to-large as it catches. Don't smother it — fire needs air.</li></ol>
<h4>Ignition without a lighter</h4>
<ul><li><strong>Ferro rod:</strong> scrape hard onto tinder — showers 3,000°C sparks, works wet.</li>
<li><strong>Battery + steel wool:</strong> rub fine steel wool across a 9V (or AA) terminals; it glows and ignites tinder.</li>
<li><strong>Lens:</strong> magnifying glass, eyeglasses, or a clear water-filled bag focuses sun onto tinder.</li>
<li><strong>Friction (bow drill)</strong> works but is hard, slow, and a last resort.</li></ul>` },

{ id:'fire-keep', cat:'Fire', title:'Keeping & using fire', tags:['fire','coals','banking'], html:`
<ul>
<li><strong>Bank it overnight:</strong> cover hot coals with ash and a little dry earth to hold embers till morning; uncover and feed tinder to revive.</li>
<li><strong>Reflect heat:</strong> build a log/rock wall behind the fire to bounce warmth toward your shelter.</li>
<li><strong>Cook & boil</strong> on a flat rock or with a stick tripod. Never heat sealed cans or airtight containers — they burst.</li>
<li><strong>Rock warning:</strong> avoid river rocks and slate — trapped moisture can make them explode. Use dry, solid stone.</li>
<li>Keep fire small ("Indian fire") — it uses less fuel and you can sit close. Big fires waste wood and keep you at a distance.</li>
</ul>` },

{ id:'shelter-basics', cat:'Shelter', title:'Shelter: stay dry, stay off the ground', tags:['shelter','insulation','cold'], html:`
<p>The ground steals more heat than the air. <strong>Insulation under you matters as much as over you.</strong></p>
<h4>Priorities</h4>
<ol><li><strong>Get off wet/cold ground</strong> — pile 15–30 cm of dry leaves, grass, pine boughs, or gear to lie on.</li>
<li><strong>Block wind and rain</strong> — a lean-to, tarp, or debris wall on the windward side.</li>
<li><strong>Keep the space small</strong> — your body heats a small space; a big one drains you.</li>
<li><strong>Cover your head</strong> — huge heat loss through the head and neck.</li></ol>
<h4>Fast debris shelter (no gear)</h4>
<p>Prop a ridgepole between a stump and the ground. Lean sticks along both sides. Pile 60+ cm of leaves/debris over the frame for insulation. Crawl in feet-first; plug the entrance with a debris pile. It should feel snug.</p>
<h4>Heat / sun</h4>
<p>In heat, do the opposite: shade above AND below you, stay off hot ground, ventilate, rest in the day, move at dawn/dusk.</p>` },

{ id:'shelter-warm', cat:'Shelter', title:'Staying warm without a heater', tags:['cold','layers','hypothermia'], html:`
<ul>
<li><strong>Layer:</strong> wicking base, insulating middle (wool/down/fleece), wind/waterproof shell. <strong>Cotton kills</strong> when wet — it loses insulation and chills you.</li>
<li><strong>Stay dry</strong> — wet clothing costs you ~25× the heat of dry. Shed layers before you sweat, add them before you cool.</li>
<li><strong>Trap air</strong> — stuff dry leaves/paper/insulation between layers. Loose = warm; tight = cold (cuts circulation).</li>
<li><strong>Fuel the furnace</strong> — eat and drink warm fluids; shivering burns calories to make heat.</li>
<li><strong>Buddy up</strong> — shared body heat in one insulated space beats two cold ones.</li>
<li>One candle in a small enclosed space raises the temperature noticeably. Ventilate a crack to avoid CO buildup.</li>
</ul>` },

// ── FIRST AID ──────────────────────────────────────────────────────────────
{ id:'fa-bleed', cat:'First Aid', title:'Severe bleeding — stop it fast', tags:['bleeding','wound','tourniquet','hemorrhage'], html:`
<p class="warn">Life-threatening bleeding kills in minutes. Act immediately; call for real medical help the instant it's available.</p>
<ol>
<li><strong>Direct pressure:</strong> press hard on the wound with a cloth/gauze and your full weight. Don't peek — keep pressing for 10+ minutes.</li>
<li><strong>Pack deep wounds:</strong> stuff clean gauze/cloth INTO the wound and keep firm pressure.</li>
<li><strong>Won't stop on a limb → tourniquet:</strong> place 5–7 cm above the wound (not on a joint), tighten until bleeding STOPS, secure it, and <strong>write the time</strong> on the person. It will hurt — that's expected. Do not loosen it.</li>
<li>Keep the person warm and lying down; elevate legs if no spinal/leg injury (treat for shock).</li>
</ol>
<p>Improvised tourniquet: a wide strap/cloth + a sturdy stick (windlass) twisted to tighten, then locked in place. Narrow cord can cause damage — use something wide.</p>` },

{ id:'fa-cpr', cat:'First Aid', title:'CPR & choking', tags:['cpr','cardiac','choking','airway'], html:`
<h4>Unresponsive & not breathing normally → CPR</h4>
<ol>
<li>Check response and breathing (≤10 s). If none, start compressions.</li>
<li><strong>Push hard and fast</strong> on the centre of the chest: depth ~5 cm (2 in), rate <strong>100–120/min</strong> (to the beat of "Stayin' Alive"). Let the chest fully recoil.</li>
<li>Compressions-only is fine if untrained in breaths. If trained: 30 compressions : 2 breaths.</li>
<li>Don't stop — swap rescuers every ~2 min if possible. Continue until they recover or you physically cannot.</li>
</ol>
<h4>Choking (adult/child) — can't cough/speak/breathe</h4>
<ol><li>5 back blows between the shoulder blades with the heel of your hand.</li>
<li>5 abdominal thrusts (Heimlich): fist above the navel, sharp inward-and-up pulls.</li>
<li>Alternate until the object clears or they go unconscious → begin CPR.</li></ol>` },

{ id:'fa-shock-burn', cat:'First Aid', title:'Shock, burns & fractures', tags:['shock','burn','fracture','splint'], html:`
<h4>Shock (pale, cold, clammy, rapid weak pulse, confused)</h4>
<p>Lay them flat, elevate the legs ~30 cm (unless head/spine/leg injury), keep them <strong>warm</strong>, reassure, nothing to eat/drink. Control any bleeding first.</p>
<h4>Burns</h4>
<ol><li>Cool with clean cool (not ice-cold) running water for <strong>20 minutes</strong>.</li>
<li>Remove jewellery/tight items before swelling; do NOT peel stuck clothing.</li>
<li>Cover loosely with clean non-stick material or cling film. <strong>No butter, no popping blisters.</strong></li>
<li>Large, deep, facial, or airway (soot/hoarse voice) burns are emergencies.</li></ol>
<h4>Fractures / sprains (R.I.C.E. + splint)</h4>
<p>Immobilise the joint above and below with a rigid splint padded with cloth; keep circulation (check the fingers/toes stay warm/pink). Don't try to straighten a badly deformed limb. Rest, Ice, Compression, Elevation for sprains.</p>` },

{ id:'fa-temp', cat:'First Aid', title:'Hypothermia & heat illness', tags:['hypothermia','heatstroke','exposure'], html:`
<h4>Hypothermia (shivering, clumsiness, slurred speech, confusion)</h4>
<ul><li>Get out of wind/wet; remove wet clothes; insulate from the ground; wrap in dry layers/blankets, cover the head.</li>
<li>Warm the core (torso, neck, armpits, groin) — not the limbs first. Warm sweet drinks if fully alert.</li>
<li>Handle gently; severe cases can arrest. <strong>"Not dead until warm and dead"</strong> — keep resuscitating.</li></ul>
<h4>Heat exhaustion → heat stroke</h4>
<ul><li><strong>Exhaustion:</strong> heavy sweat, weak, dizzy, nauseous → move to shade, cool, sip water + a pinch of salt, rest.</li>
<li><strong>Heat stroke (EMERGENCY):</strong> hot skin, may STOP sweating, confused/collapsing → cool aggressively NOW: water, wet cloths, fan, shade, ice at neck/armpits/groin. This is life-threatening.</li></ul>` },

{ id:'fa-wound-infection', cat:'First Aid', title:'Wound care & infection', tags:['wound','infection','clean','antiseptic'], html:`
<ul>
<li><strong>Clean it:</strong> irrigate with lots of clean/boiled-then-cooled water (or drinkable water) under pressure to flush debris. Remove obvious dirt.</li>
<li><strong>Close small clean cuts</strong> with butterfly strips/tape; leave dirty or animal-bite wounds open to drain.</li>
<li><strong>Cover</strong> with a clean dressing; change daily and whenever wet/dirty.</li>
<li><strong>Watch for infection:</strong> spreading redness, heat, swelling, pus, red streaks up the limb, fever. Infection can turn deadly without antibiotics — prioritise getting real care.</li>
<li>Honey (real, raw) and a clean environment aid healing when nothing else exists.</li>
</ul>
<p class="warn">Keep any tetanus and rabies risk in mind — deep/dirty wounds and animal bites need medical follow-up as soon as possible.</p>` },

{ id:'fa-triage', cat:'First Aid', title:'Mass-casualty triage (START)', tags:['triage','start','mass casualty','sort','disaster'], html:`
<p>When there are more injured than you can help at once, <strong>triage</strong> sorts who gets help first so you save the most lives. Spend ≤60 seconds per person; do only two things while sorting — open an airway and stop major bleeding.</p>
<h4>START — walk each casualty through this</h4>
<ol>
<li><strong>Can they walk?</strong> "If you can hear me, walk to that spot." Those who walk → <strong class="warn">GREEN (minor)</strong>. Move on.</li>
<li><strong>Breathing?</strong> If not, open the airway (tilt head/lift chin). Still not breathing → <strong>BLACK (deceased / expectant)</strong>. Breathing only after you open the airway → <strong style="color:#F87171">RED (immediate)</strong>.</li>
<li><strong>Breathing rate:</strong> faster than <strong>30/min</strong> → <strong style="color:#F87171">RED</strong>. Otherwise continue.</li>
<li><strong>Circulation:</strong> no wrist (radial) pulse, OR nail-bed colour takes longer than <strong>2 seconds</strong> to return after pressing → <strong style="color:#F87171">RED</strong>. Control major bleeding now. Otherwise continue.</li>
<li><strong>Mental status:</strong> can't follow a simple command ("squeeze my hand") → <strong style="color:#F87171">RED</strong>. Can follow → <strong style="color:#FBBF24">YELLOW (delayed)</strong>.</li>
</ol>
<h4>The four tags</h4>
<ul>
<li><strong style="color:#F87171">RED — Immediate:</strong> life threat you can fix; treat and move first.</li>
<li><strong style="color:#FBBF24">YELLOW — Delayed:</strong> serious but can wait a while.</li>
<li><strong class="warn">GREEN — Minor:</strong> walking wounded; can help others.</li>
<li><strong>BLACK — Deceased/expectant:</strong> no breathing after airway opened, or injuries beyond your means. Heartbreaking, but focus saves others.</li>
</ul>
<p class="warn">Re-check everyone as time allows — people move between categories. Triage is about the greatest good with limited hands; it is not the same as normal one-patient care.</p>` },

// ── FOOD ───────────────────────────────────────────────────────────────────
{ id:'food-edible', cat:'Food', title:'Is it safe to eat? (last-resort test)', tags:['forage','edible','plants','poison'], html:`
<p class="warn">Only ~1 in 4 wild plants is edible; misidentification kills. If you can identify a known-safe plant, eat that and skip this. The Universal Edibility Test is slow and a LAST resort, one plant part at a time.</p>
<h4>Avoid outright</h4>
<ul><li>Milky/discoloured sap, "almond" smell (cyanide), three-leaf clusters, umbrella-shaped flower clusters, beans/bulbs/seeds in pods, shiny leaves, fine hairs/spines, bitter or soapy taste.</li>
<li>Any mushroom you can't 100% identify — many deadly ones look edible and there's no reliable field test.</li></ul>
<h4>Universal Edibility Test (per plant part, ~24h)</h4>
<ol><li>Separate leaves/stems/roots/flowers — test one part at a time.</li>
<li>Smell for strong/acrid odours (bad sign).</li>
<li>Skin test: rub on inner elbow/wrist, wait 15 min for burning/itching/bumps.</li>
<li>Touch to the lip 3 min, then tongue 15 min — burning/tingling = stop.</li>
<li>Chew a small piece, hold in mouth 15 min without swallowing — any bad reaction, spit and rinse.</li>
<li>Swallow a small amount; wait 8 hours (eat nothing else). If no cramps/nausea/vomiting, eat a bit more; wait 8 hours again. Then it's likely safe in that form.</li></ol>` },

{ id:'food-protein', cat:'Food', title:'Easy calories: bugs, fish, traps', tags:['protein','fishing','trapping','insects'], html:`
<ul>
<li><strong>Insects</strong> are the fastest protein: grasshoppers, crickets, grubs, ants, termites. Cook them (kills parasites). Avoid brightly coloured, hairy, or foul-smelling bugs, and anything that bites/stings.</li>
<li><strong>Fishing</strong> beats hunting for calories-per-effort: improvised hooks (thorns, bone, pins), line from cordage, bait with insects/guts. Set multiple lines and check periodically.</li>
<li><strong>Traps/snares</strong> work while you sleep — set many along animal trails and funnels. A simple wire loop snare on a run catches small game. Legality/ethics aside in true emergency.</li>
<li><strong>Shellfish/molluscs</strong> near water are easy but risky if water is polluted or during algal blooms; cook well.</li>
<li>Prioritise fat and protein; pure lean rabbit alone ("rabbit starvation") can't sustain you — combine with fat sources.</li>
</ul>` },

{ id:'food-preserve', cat:'Food', title:'Preserving food without a fridge', tags:['preserve','drying','jerky','salt','smoke','storage'], html:`
<p>With the grid down, refrigeration is gone. Preserve while food is still good — spoiled food wastes calories and can make you too sick to function.</p>
<h4>Drying (simplest, most reliable)</h4>
<ul><li><strong>Jerky:</strong> slice lean meat thin against the grain, salt it, hang in dry moving air or over low smoke/heat (below ~70°C so it dries, not cooks) until brittle and it snaps. Removes the water bacteria need. Keeps weeks to months if kept dry.</li>
<li><strong>Fruit/veg:</strong> slice thin, dry in sun on racks or near (not on) the fire. Done when leathery with no soft/moist spots.</li></ul>
<h4>Salting & brining</h4>
<p>Heavy salt draws out water and preserves meat/fish: pack in dry salt or a strong brine (salt water that floats a potato/egg). Rinse and soak before eating to cut the salt.</p>
<h4>Smoking</h4>
<p>Cool smoke (a slow, smoky fire, meat well above the flames) both dries and coats food with preservative compounds. Combine with salting for the best result.</p>
<h4>Keeping things cool without power</h4>
<ul><li><strong>Evaporative cooler ("zeer/pot fridge"):</strong> a pot inside a larger pot with wet sand between them, in shade with airflow — evaporation keeps the inner pot cool.</li>
<li><strong>Running water / spring / deep shaded hole:</strong> sink sealed containers in cold water or dig into shaded earth. Cellars and north-facing shade stay coolest.</li></ul>` },

{ id:'food-storage', cat:'Food', title:'Making your supplies last — storage & rotation', tags:['storage','rotation','pests','rationing','stockpile'], html:`
<h4>Keep the enemies out: moisture, heat, light, air, pests</h4>
<ul><li>Store dry staples (rice, beans, flour, oats) in <strong>airtight, opaque, rodent-proof</strong> containers — jars, sealed buckets, tins. Add a moisture absorber (dry rice, silica) if you have one.</li>
<li>Cool, dark, and dry roughly <strong>doubles</strong> shelf life vs. warm and bright. A shaded closet or below-ground spot beats a sunny shelf.</li></ul>
<h4>Rotate: first in, first out</h4>
<p>Eat oldest stock first; put new supplies at the back. Label everything with the date you stored it. Check periodically for bulging cans, mould, chew marks, or off smells and cull before it spoils the rest.</p>
<h4>Stretch the calories</h4>
<ul><li>Ration <em>before</em> you're desperate — see the <strong>Log → Rationing</strong> planner to see how many days you truly have.</li>
<li>Cook once, eat twice: a covered pot of beans/grains feeds several meals and saves fuel.</li>
<li>Waste nothing — bones and scraps make broth (calories + salt + morale); fat is precious.</li></ul>` },

{ id:'food-cook', cat:'Food', title:'Cooking & boiling without a stove', tags:['cook','boil','fire','rock boiling','fuel'], html:`
<p>Cooking kills parasites and bacteria, unlocks calories, and makes tough or questionable food safer. You don't need a stove.</p>
<h4>No pot? Rock-boiling</h4>
<ol><li>Heat clean, <strong>dry</strong> stones in a fire (river rocks can explode from trapped water — use dry stone from high ground).</li>
<li>Drop the hot rocks into a water-filled container of wood, bark, hide, or a hole lined with a poncho. The water boils. Swap rocks as they cool.</li></ol>
<h4>Direct methods</h4>
<ul><li><strong>Coals, not flames:</strong> steady embers cook evenly; flames just char the outside. Rake a bed of coals to the side.</li>
<li><strong>Ash-baking / hot rock griddle:</strong> a flat hot stone is a frying pan; dough and roots bake in the ashes.</li>
<li><strong>Skewers/spit:</strong> thread meat or fish on green (non-toxic) sticks over coals.</li>
<li><strong>Foil or a can</strong> becomes a pot; a car hubcap or metal sheet becomes a griddle.</li></ul>
<h4>Fuel economy</h4>
<p>Keep a lid on, cut food small, and shelter the fire from wind so heat isn't wasted. A small tight fire under a pot cooks with far less wood than a big open blaze.</p>` },

{ id:'food-safe', cat:'Food', title:'Is stored or found food still safe?', tags:['spoilage','botulism','food safety','cans','poison'], html:`
<p class="warn">When help and medicine are gone, food poisoning can be deadly. When genuinely unsure, cook it hard — or don't eat it.</p>
<h4>Canned & packaged food</h4>
<ul><li><strong>Throw out</strong> any can that is <strong>bulging, leaking, badly rusted, or spurts/foams</strong> when opened, or food that smells off — this can be <strong>botulism</strong>, which is odourless-to-mild and can kill. When in doubt, boil the contents 10 minutes to destroy the toxin, or discard.</li>
<li>Small dents are usually fine; dents on a seam are not. Sealed dry goods past their date are often still edible if they look, smell, and taste normal.</li></ul>
<h4>Meat, fish, eggs</h4>
<ul><li>Slimy, sticky, grey/green, or sour/ammonia-smelling = spoiled. Cook fresh meat to steaming-hot all the way through.</li>
<li>Fresh egg test: it should <strong>sink</strong> in water; one that floats is old — crack separately and smell first.</li></ul>
<h4>General rules</h4>
<ul><li>"When in doubt, throw it out" — but weigh it against starvation; borderline food cooked thoroughly is safer than raw.</li>
<li>Anything touched by floodwater, sewage, or chemicals is contaminated unless it's in a sealed, washable can.</li>
<li>Keep raw and cooked food and their surfaces separate; wash hands and blades — cross-contamination is a top cause of illness.</li></ul>` },

{ id:'food-forage', cat:'Food', title:'Reliable wild foods (and how to prep them)', tags:['forage','wild food','plants','acorns','cattail','seasons'], html:`
<p>A few widespread, hard-to-mistake foods are worth knowing. Always cross-check against the <strong>Field Guide</strong> and never eat anything you can't identify with certainty.</p>
<h4>Widespread & recognisable</h4>
<ul><li><strong>Cattail</strong> (freshwater margins): peeled young shoots, and the starchy roots pounded and rinsed for flour. A reliable calorie source.</li>
<li><strong>Dandelion</strong>: whole plant edible; bitter leaves best young, roots can be roasted.</li>
<li><strong>Pine</strong> (true pines): inner bark is edible cooked; needles steeped make a vitamin-C tea. Avoid yew and other lookalikes.</li>
<li><strong>Acorns</strong>: high-calorie but must be <strong>leached</strong> — shell, chop, and soak/boil in several changes of water until no longer bitter (removes tannins), then dry and grind to flour.</li>
<li><strong>Seaweed</strong> (from clean water): most non-slimy seaweeds are edible; rinse and dry or add to soups.</li>
<li><strong>Berries rule of thumb:</strong> most <strong>aggregate</strong> berries (raspberry/blackberry type) are safe; be very cautious with white and yellow berries, and single shiny berries. Identify before eating.</li></ul>
<h4>Prep that unlocks safe calories</h4>
<p>Boiling, leaching, and roasting turn many marginal foods (acorns, some roots, tough greens) into safe, digestible calories. Cook wild foods by default.</p>` },

// ── NAVIGATION ─────────────────────────────────────────────────────────────
{ id:'nav-sun', cat:'Navigation', title:'Finding direction without a compass', tags:['navigation','sun','stars','direction'], html:`
<h4>By day — shadow-stick method</h4>
<ol><li>Put a straight stick upright in level ground; mark the shadow tip with a stone (mark 1 = <strong>West</strong>).</li>
<li>Wait 15–20 min; mark the new tip (mark 2 = <strong>East</strong>).</li>
<li>The line between the two marks runs roughly <strong>West → East</strong>. Stand with mark 1 (west) on your left; you face <strong>North</strong> (in the Northern Hemisphere).</li></ol>
<p>Rough check: the sun rises in the east, sets in the west, and at local noon sits due south (N. Hemisphere) / due north (S. Hemisphere).</p>
<h4>By night</h4>
<ul><li><strong>North (N. Hemisphere): Polaris.</strong> Find the Big Dipper; the two stars at the end of its "cup" point to Polaris (the North Star), which sits above true north and barely moves.</li>
<li><strong>South (S. Hemisphere): Southern Cross.</strong> Extend the long axis ~4.5× its length; drop straight down to the horizon = roughly south.</li>
<li><strong>Moon:</strong> if it rises before sunset, its lit side faces west; after midnight, lit side faces east.</li></ul>` },

{ id:'nav-move', cat:'Navigation', title:'Moving smart & not getting lost', tags:['navigation','route','pace'], html:`
<ul>
<li><strong>Decide: stay or go.</strong> If you told someone your plan, or the vehicle/shelter is your best asset, <strong>staying put</strong> usually makes you easier to find. Move only with a clear destination and the resources to reach it.</li>
<li><strong>Downhill + downstream</strong> generally leads to water, then trails, then people.</li>
<li><strong>Pick a distant landmark</strong> and walk to it, then pick the next — this keeps a straight line without a compass.</li>
<li><strong>Mark your trail</strong> (arrows, cairns, cut marks) so you can backtrack and rescuers can follow.</li>
<li><strong>Pace count:</strong> know your steps per 100 m to estimate distance. Rest 10 min/hour; don't sweat (see cold section).</li>
<li>Use the <strong>Navigate</strong> module to compute distance, bearing, and realistic walking time between coordinates.</li>
</ul>` },

// ── SIGNALING ──────────────────────────────────────────────────────────────
{ id:'signal', cat:'Signaling', title:'Being seen & rescued', tags:['signal','rescue','sos','mirror'], html:`
<h4>The universal distress signals</h4>
<ul><li><strong>Three of anything</strong> = distress: 3 fires in a triangle, 3 whistle blasts, 3 flashes.</li>
<li><strong>SOS:</strong> ··· ––– ··· (three short, three long, three short) by light, whistle, or sound.</li>
<li><strong>Ground-to-air:</strong> a large <strong>V</strong> = need assistance; <strong>X</strong> = need medical help. Make them huge (rocks, logs, stamped in snow) with high contrast.</li></ul>
<h4>What actually gets noticed</h4>
<ul><li><strong>Signal mirror / any reflective surface</strong> — a flash is visible for kilometres. Aim by making a V with your fingers over the target and flashing across it.</li>
<li><strong>Whistle</strong> carries far and costs no energy — 3 blasts, pause, repeat. Far better than shouting.</li>
<li><strong>Fire by night, smoke by day</strong> — add green vegetation/rubber for thick smoke; keep contrast with the background.</li>
<li><strong>Bright colour + movement</strong> against a plain background. Stay in the open where you can be seen from above.</li></ul>` },

// ── WEATHER ────────────────────────────────────────────────────────────────
{ id:'weather', cat:'Weather', title:'Reading the sky', tags:['weather','forecast','storm'], html:`
<ul>
<li><strong>"Red sky at night, sailors' delight; red sky at morning, sailors take warning."</strong> Reddish sunset → fair weather likely; reddish sunrise → a system may be approaching.</li>
<li><strong>High thin clouds thickening and lowering</strong> = a front/rain within ~24h. Fast-building tall anvil clouds = thunderstorms; take cover, avoid high ground, lone trees, and water.</li>
<li><strong>Sudden calm, greenish sky, or a temperature drop</strong> can precede severe storms.</li>
<li><strong>Halo around sun/moon</strong> (ice crystals) often precedes rain within a day.</li>
<li>Falling pressure (headache, aches, still air) = worsening; rising = improving.</li>
<li>Dew or frost in the morning usually means the night stayed clear → fair day ahead.</li>
</ul>
<p>Lightning distance: count seconds between flash and thunder ÷ 3 = km (÷ 5 = miles). Under 30 s → you're in strike range; shelter now.</p>` },

{ id:'weather-clouds', cat:'Weather', title:'Cloud types & what they forecast', tags:['weather','clouds','forecast','rain'], html:`
<p>Clouds are a free forecast. Watch how they change over hours, not just what's overhead now.</p>
<h4>Fair / stable</h4>
<ul><li><strong>Cirrus</strong> — high, thin, wispy "mare's tails." Alone = fair, but if they thicken and lower, a warm front and rain may arrive in ~12–24h.</li>
<li><strong>Cumulus</strong> — small, white, puffy, flat-bottomed, well-spaced. Fair-weather clouds on a normal day.</li></ul>
<h4>Deteriorating</h4>
<ul><li><strong>Stratus</strong> — low, flat grey sheet covering the sky = drizzle/overcast, damp settled weather.</li>
<li><strong>Nimbostratus</strong> — thick dark grey layer = steady rain or snow for hours.</li>
<li><strong>Cumulus growing tall and cauliflower-like</strong> through the day = building instability; thunder possible by afternoon.</li></ul>
<h4>Danger</h4>
<p><strong>Cumulonimbus</strong> — towering, dark-based, with a flat "anvil" top spreading downwind = thunderstorm now or imminent: lightning, hail, gusts, possible tornado. Get to solid shelter, off high ground, away from lone trees and water.</p>
<p>Lowering, thickening, darkening clouds = worsening. Rising, thinning, breaking clouds = improving.</p>` },

{ id:'weather-storm', cat:'Weather', title:'Severe storms, tornadoes & flash floods', tags:['weather','tornado','flood','storm','shelter'], html:`
<p class="warn">Warning signs: a sudden wind shift then calm, a greenish-black sky, hail, a wall of dark cloud, a roaring/freight-train sound, or a fast-rising creek.</p>
<h4>Tornado / violent wind</h4>
<ul><li>Get to the <strong>lowest floor, innermost room</strong> (basement, interior bathroom/closet) — put walls between you and the outside. Cover your head and neck; get under something sturdy.</li>
<li>Avoid windows, large-roof rooms, and vehicles. If caught outside with no shelter, lie flat in a ditch/low spot and cover your head — but not under an overpass (wind accelerates there).</li></ul>
<h4>Flash flood</h4>
<ul><li><strong>Move to higher ground immediately</strong> — don't wait to see the water. Flash floods arrive as a wall and rise in minutes.</li>
<li><strong>Never walk or drive into moving water.</strong> Ankle-deep water can knock you down; ~30 cm (1 ft) floats most cars. "Turn around, don't drown."</li>
<li>Avoid canyons, dry washes, and low crossings during heavy rain, even if it's raining upstream, not on you.</li></ul>
<h4>After</h4>
<p>Watch for downed lines, gas leaks, and contaminated water. Assume floodwater is polluted; treat all of it before any contact with food or wounds.</p>` },

{ id:'weather-cold', cat:'Weather', title:'Cold snaps — staying warm, avoiding hypothermia', tags:['weather','cold','hypothermia','frostbite','winter'], html:`
<p>Cold kills quietly. The goal is to stay <strong>dry</strong>, block <strong>wind</strong>, and trap <strong>air</strong>.</p>
<h4>Dress in layers (C-O-L-D)</h4>
<ul><li><strong>C — Clean/loose:</strong> dirty, tight clothing loses insulation and cuts circulation.</li>
<li><strong>O — Overheating:</strong> avoid sweating; vent or shed a layer before you soak your clothes (wet = deadly).</li>
<li><strong>L — Layers:</strong> wicking base, insulating mid (wool/fleece/down), windproof shell. Cover head, neck, hands.</li>
<li><strong>D — Dry:</strong> change out of wet clothes fast; wet loses ~25× the heat of dry.</li></ul>
<h4>Hypothermia</h4>
<p>Signs: uncontrollable shivering → then <strong>stopping</strong> shivering, slurred speech, clumsiness, confusion, drowsiness ("umbles"). Warm the person: dry them, insulate from the ground, add layers, share body heat, give warm sweet drinks if fully alert. Handle gently — rough movement can stop a very cold heart.</p>
<h4>Frostbite</h4>
<p>White/waxy, numb skin (fingers, toes, ears, nose). Rewarm in warm — not hot — water; never rub, and don't rewarm if it might refreeze (that's worse). Get medical help when possible.</p>` },

{ id:'weather-heat', cat:'Weather', title:'Heat waves — avoiding heatstroke', tags:['weather','heat','dehydration','heatstroke'], html:`
<p>In extreme heat, work with the sun, not against it — and drink before you're thirsty.</p>
<h4>Stay ahead of it</h4>
<ul><li>Rest in shade during the hottest hours (roughly 11:00–16:00); do hard work at dawn/dusk.</li>
<li>Drink water steadily; add a pinch of salt or electrolytes if sweating heavily (water alone over many hours can cause dangerous low sodium).</li>
<li>Loose, light-coloured, breathable clothing and a wide hat. Wet a cloth for your neck. Stay low and ventilated; heat rises.</li></ul>
<h4>Heat exhaustion → heatstroke</h4>
<ul><li><strong>Heat exhaustion:</strong> heavy sweat, cool/clammy pale skin, weakness, nausea, headache, dizziness. Stop, move to shade, cool down, sip water with salt, elevate legs.</li>
<li><strong>Heatstroke (emergency):</strong> hot skin, sweating may STOP, body temp soaring, confusion, collapse, seizures. <strong>Cool aggressively now</strong> — shade, remove clothing, douse/fan, ice or cold water to neck/armpits/groin. It can kill in minutes.</li></ul>` },

// ── SECURITY ───────────────────────────────────────────────────────────────
{ id:'security', cat:'Security', title:'Personal & home security when help isn\'t coming', tags:['security','defense','opsec'], html:`
<ul>
<li><strong>Grey man:</strong> don't look like you have resources. A house that's obviously lit, warm, and stocked draws attention when others have nothing.</li>
<li><strong>Harden the perimeter:</strong> lock/brace doors, reinforce weak points, remove hiding spots near entries, use noise (gravel, bells, cans on string) as early warning.</li>
<li><strong>Light discipline at night</strong> — blackout curtains; a single lit window is visible for a long way.</li>
<li><strong>Groups are safer</strong> than individuals — trusted neighbours watching in shifts beats one exhausted person.</li>
<li><strong>De-escalate first.</strong> Most confrontations are about resources or fear — distance, calm, and not appearing a threat resolve more than force.</li>
<li>Keep a plan: rally point, comms method, and what you'll do if you must leave (see Repair/Go-bag).</li>
</ul>
<p class="warn">Know local law. This is general preparedness, not legal or tactical advice — force is a last resort with real consequences.</p>` },

{ id:'security-opsec', cat:'Security', title:'OPSEC — not becoming a target', tags:['security','opsec','privacy','grey man'], html:`
<p>The best fight is the one that never starts. Most of security is simply not advertising that you have anything worth taking.</p>
<h4>Control the signals you give off</h4>
<ul><li><strong>Smell & sound:</strong> cooking food, a running generator, and voices carry far when everything else is silent. Cook at off hours, muffle machines, keep noise down after dark.</li>
<li><strong>Light:</strong> one lit window or a head-torch seen through curtains marks you. Blackout first, then use light.</li>
<li><strong>Smoke & tracks:</strong> a chimney plume or a worn path to your water source is a map to your door. Vary routes; burn dry wood high and hot to cut smoke.</li>
<li><strong>Talk:</strong> don't tell strangers what or how much you have. "We're getting by like everyone else" is the whole script.</li></ul>
<h4>Trash & routine</h4>
<p>Empty cans and packaging in your bin tell people what you're eating and that you're stocked. Crush, bury, or burn waste. Avoid rigid, predictable routines that let someone plan around you.</p>` },

{ id:'security-watch', cat:'Security', title:'Standing watch & early warning', tags:['security','watch','alarm','perimeter'], html:`
<h4>Layered early warning</h4>
<ul><li><strong>Outer trip-lines:</strong> fishing line or paracord at shin height with cans/bells strung on it around approaches — cheap, silent to set, loud to trip.</li>
<li><strong>Gravel, dry leaves, or branches</strong> on paths crunch underfoot; keep the ground under windows noisy on purpose.</li>
<li><strong>A dog</strong> is the best alarm system there is — hearing and smell far beyond yours.</li></ul>
<h4>Watch rotations</h4>
<ul><li>In a group, never all sleep at once — set 2–4 hour watch shifts. Two on watch is far better than one (one stays alert, drowsiness is caught).</li>
<li>Watch keeps a light-free position with the widest view of approaches, a way to wake others quietly (tug line, radio click), and something warm to stay alert.</li>
<li>Agree a simple challenge/password so returning members aren't mistaken for intruders in the dark.</li></ul>
<p class="warn">Fatigue is the real enemy of a small group. Rotate honestly and let people sleep — an exhausted defender makes bad, dangerous decisions.</p>` },

{ id:'security-conflict', cat:'Security', title:'De-escalation & avoiding confrontation', tags:['security','deescalation','conflict','defense'], html:`
<p>Nearly every encounter is about fear or resources, not malice. Your goals, in order: <strong>avoid, de-escalate, escape</strong> — force is the last option, with lasting consequences.</p>
<h4>Avoid</h4>
<ul><li>Don't go to crowds, chokepoints, or contested resources (fuel, water, food distribution) unless you must. Time movements for low-traffic hours.</li>
<li>Trust unease — if a place or person feels wrong, leave before it develops. Keep your exits in mind everywhere you go.</li></ul>
<h4>De-escalate</h4>
<ul><li>Keep <strong>distance</strong> and open space; hands visible; calm, low voice; non-threatening posture. Don't crowd or corner the other person either.</li>
<li>Give them an <strong>out</strong> — a way to walk away without losing face. Humiliated or cornered people escalate.</li>
<li>Don't flash weapons or wealth; both invite escalation and mark you as a target later.</li></ul>
<h4>Escape</h4>
<p>Break contact and move to your rally point by an indirect route so you're not followed home. A defended, prepared position beats a fight in the open — but a fight avoided beats both.</p>` },

// ── REPAIR / GEAR ──────────────────────────────────────────────────────────
{ id:'gobag', cat:'Repair', title:'Go-bag & everyday carry essentials', tags:['gear','gobag','kit','edc'], html:`
<h4>On you (EDC)</h4>
<p>Knife/multitool, lighter + ferro rod, small flashlight/headlamp, whistle, paracord, phone + cash, water purification tablets, a bit of tinder.</p>
<h4>Go-bag (72h)</h4>
<ul><li><strong>Water:</strong> filter/tablets + a hard bottle + metal cup (for boiling).</li>
<li><strong>Shelter:</strong> tarp/bivvy, emergency blanket, dry socks, warm layer, poncho.</li>
<li><strong>Fire:</strong> lighters, ferro rod, waterproof matches, tinder.</li>
<li><strong>First aid:</strong> tourniquet, gauze/pressure dressing, tape, meds, gloves, painkillers, any prescriptions.</li>
<li><strong>Tools:</strong> knife, multitool, cordage, duct tape, sewing kit, work gloves.</li>
<li><strong>Light/comms:</strong> headlamp + spare batteries, hand-crank/solar radio, printed contacts & maps.</li>
<li><strong>Food:</strong> 3 days of no-cook calorie-dense food.</li>
<li><strong>Docs/cash:</strong> ID copies, cash in small bills, local paper map.</li></ul>` },

{ id:'repair-fixes', cat:'Repair', title:'Field fixes & useful materials', tags:['repair','duct tape','improvise'], html:`
<ul>
<li><strong>Duct tape / gorilla tape:</strong> patches, splints, blister prevention, cordage, waterproofing. Wrap some around a bottle to carry.</li>
<li><strong>Paracord:</strong> inner strands = fishing line/sewing thread; outer sheath = lashing/snares.</li>
<li><strong>Trash bags / plastic sheeting:</strong> rain gear, shelter, water collection, ground cover, flotation.</li>
<li><strong>Wire / zip ties:</strong> snares, repairs, securing loads.</li>
<li><strong>Char cloth</strong> (cotton cooked in a low-oxygen tin) catches a spark instantly — make some now.</li>
<li>Sharpen a dull knife on a flat stone at ~15–20°, consistent angle, edge trailing; strop on leather/cardboard to finish.</li>
</ul>` },

// ── SANITATION ─────────────────────────────────────────────────────────────
{ id:'sanitation', cat:'Sanitation', title:'Hygiene & waste — the silent killer', tags:['sanitation','hygiene','disease','latrine'], html:`
<p class="warn">In a collapse, disease from poor sanitation kills more people than violence or starvation. This is not optional.</p>
<ul>
<li><strong>Separate:</strong> keep human waste, food prep, and water sources far apart. Latrine <strong>≥60 m downhill and downstream</strong> from any water and camp.</li>
<li><strong>Hand hygiene:</strong> wash with soap after waste and before food. No soap? Ash + water scrubs surprisingly well. A "tippy-tap" (hands-free water jug on a stick) saves water.</li>
<li><strong>Cat-hole / trench latrine:</strong> dig ~30 cm deep, cover each use with soil; it composts. For groups, a deeper trench + lime/ash + a lid reduces flies and smell.</li>
<li><strong>Flies = disease</strong> — cover food and waste; they carry pathogens between them.</li>
<li>Keep wounds clean and covered; boil eating utensils if illness appears; isolate the sick if you can.</li>
</ul>` },

// ── MINDSET ────────────────────────────────────────────────────────────────
{ id:'mindset', cat:'Mindset', title:'The will to survive', tags:['mindset','psychology','morale'], html:`
<p>Skills keep you alive; mindset decides whether you use them. Panic and despair kill capable people.</p>
<ul>
<li><strong>Control the controllable.</strong> Break the overwhelming into the next small task: get warm, get water, get found. Do one, then the next.</li>
<li><strong>Routine and purpose</strong> hold morale — set a daily rhythm (water, camp, signal, rest), keep a log, mark days.</li>
<li><strong>Positive self-talk is a survival tool.</strong> Rehearse "I can handle the next hour." People who believe they'll make it, make it more often.</li>
<li><strong>Sleep and rest</strong> are force multipliers — exhaustion causes bad decisions and hypothermia. Protect them.</li>
<li><strong>Hope with a reason:</strong> a person to get back to, a plan for tomorrow. Give yourself something to survive <em>for</em>.</li>
</ul>` },
];
