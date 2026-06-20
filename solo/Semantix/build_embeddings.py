import urllib.request
import os
import json
import math

URL = "https://huggingface.co/datasets/Jay-Mayekar/glove-vectors/resolve/main/glove.6B.50d.txt"
OUTPUT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "embeddings.js")

STOPWORDS = set("""
a an the and or but if then else when while for to from by with at in on of
is am are was were be been being have has had do does did will would shall
should can could may might must need dare ought this that these those it its
he she him her his they them their we us our you your i me my mine not no
nor so as than too very also just only even still already yet again ever
never always often sometimes usually about above after before between
into through during over under around among along across behind beside
beyond near upon within without however therefore moreover furthermore
meanwhile although because since unless until whereas other another
each every both few many much some any all such more most less least own
same different
""".split())

EXCLUDE = set("www http https com org net edu gov etc vs mr mrs ms dr jr sr inc ltd".split())

CURATED_WORDS_RAW = """
time year people way day man woman child world life hand part place case
week company system program question work government number night point
home water room mother area money story fact month lot right study book
eye job word business issue side kind head house service friend father
body family power hour game line end member law car city community name
president team minute idea kid parent face others result level office door
health person art war history party future morning girl boy market center
food king queen doctor teacher student judge fish bird cat dog horse cow
animal plant tree flower sun moon star sky cloud rain snow wind fire earth
rock mountain river lake ocean sea island beach forest garden park street
bridge building church school hospital library museum theater bank shop
restaurant hotel airport station factory tower castle wall window floor
roof kitchen bedroom bathroom table chair bed desk lamp phone camera
television radio clock watch mirror picture glass bottle cup plate bowl
knife fork spoon brush pen pencil paper bag hat coat shirt pants shoe
sock ring chain heart brain blood bone skin hair teeth smile nose mouth
ear arm finger leg foot knee shoulder neck chest stomach muscle nerve lung
breath memory dream sleep wake walk run jump climb swim fly drive ride sit
stand fall push pull throw catch hold carry lift drop break build cut open
close start stop begin turn move speak talk sing read write draw paint play
fight dance laugh cry born die grow eat drink cook clean wash dress wear
think feel love hate want need try help give take make find know see hear
watch look listen touch taste smell remember forget learn teach show tell
ask answer call send receive wait expect hope wish pray believe trust doubt
fear win lose save spend sell buy pay trade share join leave stay return
visit travel cross enter sign mark count measure test check search follow
lead guide create destroy protect attack king queen prince princess knight
soldier warrior hero villain monster ghost angel devil dragon snake wolf
bear tiger lion eagle hawk whale shark spider rabbit deer fox monkey
elephant penguin seal dolphin gorilla chimpanzee giraffe zebra hippo rhino
buffalo bison camel donkey mule pony stallion mare colt kitten puppy cub
fawn lamb calf chick duckling parrot flamingo swan goose crow
raven sparrow robin pigeon dove seagull pelican stork woodpecker bat mouse
rat hamster squirrel chipmunk beaver otter walrus moose elk turtle frog
toad lizard crocodile alligator lobster crab shrimp clam oyster snail ant
bee wasp mosquito butterfly moth scorpion beetle caterpillar worm salmon
tuna trout cod herring sardine squid octopus jellyfish starfish seahorse
falcon owl vulture peacock rooster hen ram bull doe stag panther leopard
cheetah jaguar cougar bobcat hyena jackal coyote mongoose weasel mink
badger porcupine hedgehog armadillo koala platypus kangaroo sloth tapir
robot army weapon sword shield throne crown jewel treasure gold silver
diamond iron steel crystal pearl ruby emerald sapphire granite marble sand
gravel clay chalk copper bronze brass aluminum chrome mercury helium oxygen
hydrogen nitrogen carbon sulfur calcium sodium potassium music song dance
rhythm beat drum guitar piano violin flute horn trumpet choir orchestra
symphony concert album studio portrait landscape sketch blueprint diagram
chart graph index journal diary memoir essay poem novel fiction fantasy
romance horror comedy tragedy drama opera ballet circus carnival festival
parade march rally protest debate lecture workshop conference summit forum
jury verdict sentence penalty prison guard patrol detective spy agent mission
target suspect witness victim rescue surgery therapy diagnosis symptom
vaccine virus bacteria infection fever cough injury wound scar bandage
vitamin protein fiber mineral enzyme hormone insulin adrenaline neuron
synapse reflex instinct emotion mood attitude character trait virtue dignity
courage patience wisdom knowledge genius talent vision insight imagination
creativity innovation strategy discipline endurance stamina agility
flexibility balance coordination precision accuracy harmony proportion
symmetry contrast texture pattern fabric weave cotton velvet denim leather
suede canvas linen ribbon tape glue cement mortar plaster tile mosaic mural
fresco collage fog mist dew frost ice steam dust smoke ash flame blaze
ember spark torch candle lantern beacon lighthouse bonfire firework
explosion thunder lightning earthquake volcano tornado hurricane tsunami
flood drought glacier iceberg coral fossil fuel engine battery circuit
network signal frequency antenna radar sonar telescope microscope laser
screen keyboard button switch lever pedal brake throttle compass gauge
meter panel card token ticket stamp badge medal trophy prize reward bonus
gift talent skill craft hobby puzzle maze riddle mystery clue hint trick
trap secret code password lock fence gate entrance exit passage tunnel
ladder stairs elevator platform stage arena stadium court track field
course pool cage den nest cave shelter tent cabin cottage lodge manor
mansion estate ranch farm barn mill dock crane flag banner stripe symbol
logo brand seal signature stamp nail screw bolt clip pin thread needle
zipper pocket collar sleeve belt buckle lace strap hook handle grip knob
dial spring hinge joint link bond knot loop spiral coil twist bend fold
wrap layer shell hull frame skeleton scaffold pillar column beam arch dome
vault ceiling rainbow sunset horizon summit peak ridge slope canyon gorge
waterfall peninsula cape reef continent prairie meadow grove orchard
vineyard harvest grain wheat corn rice bean potato tomato pepper onion
garlic herb spice sugar salt flour butter cheese yogurt cream sauce soup
stew bread cake cookie pie candy chocolate vanilla cinnamon ginger lemon
lime cherry grape melon peach plum pear banana mango coconut almond walnut
peanut cashew olive avocado mushroom spinach carrot broccoli celery
cucumber lettuce cabbage squash pumpkin berry strawberry blueberry
raspberry cranberry seed pollen bloom petal stem thorn vine moss fern
bamboo oak maple pine cedar palm willow ivy cactus coral amber jade
crystal glass mirror shadow light dark color red blue green yellow orange
purple pink black white brown gray bright warm cool cold hot fresh sweet
bitter sour sharp soft hard smooth rough heavy thick thin tall short wide
narrow deep shallow empty full rich poor strong weak fast slow quick quiet
loud clear clean dirty safe dangerous easy simple complex true false real
fake wrong right fair free alive dead young old beautiful ugly happy sad
angry calm brave afraid tired hungry thirsty healthy sick lucky magic
water ice frost steam mist dew mud clay sand gravel pebble dust ash soot
charcoal chalk limestone sandstone slate obsidian quartz amber jade opal
turquoise agate jasper garnet topaz amethyst aquamarine pearl coral ivory
atom molecule cell tissue organ membrane fiber thread strand wire cable
rope chain string band belt ring hoop coil tube pipe rod bar shaft pole
beam column pillar arch bridge tunnel dam canal dock pier wharf harbor
port marina airport runway hangar depot warehouse factory plant mill forge
furnace kiln oven stove grill burner heater cooler freezer fridge pantry
closet drawer cabinet shelf rack hook peg nail screw bolt nut rivet weld
solder glue paste cement mortar concrete asphalt gravel granite basalt
slate shale clay loam silt sediment fossil mineral crystal gem stone
planet earth mars venus jupiter saturn neptune mercury uranus pluto orbit
comet asteroid meteor galaxy universe nebula constellation satellite rocket
shuttle capsule probe rover telescope observatory planetarium astronaut
cosmonaut gravity vacuum radiation spectrum wavelength photon electron
proton neutron nucleus isotope element compound mixture solution acid base
catalyst reaction combustion fusion fission decay erosion corrosion
oxidation reduction precipitation evaporation condensation sublimation
diffusion osmosis entropy momentum velocity acceleration friction tension
compression expansion contraction vibration oscillation resonance harmonic
amplitude phase period cycle wave particle field force pressure volume
density mass weight temperature energy heat thermal kinetic potential
elastic magnetic electric static dynamic quantum nuclear atomic molecular
cellular genetic organic synthetic natural artificial manual automatic
digital analog mechanical electronic optical acoustic thermal solar lunar
stellar cosmic terrestrial aquatic marine arctic tropical polar equatorial
urban rural suburban industrial commercial residential domestic foreign
native immigrant refugee citizen resident tourist traveler pilgrim nomad
settler pioneer explorer adventurer navigator captain commander admiral
general colonel major sergeant corporal private recruit veteran champion
master expert novice amateur professional volunteer intern apprentice
mentor coach trainer referee judge critic analyst adviser counselor
consultant architect designer engineer programmer developer scientist
researcher professor scholar academic intellectual philosopher theologian
historian archaeologist anthropologist psychologist sociologist economist
politician diplomat ambassador mayor governor senator congressman
representative delegate speaker minister pastor priest monk nun pope bishop
cardinal prophet apostle disciple pilgrim saint martyr angel demon spirit
phantom specter wraith zombie vampire werewolf ogre troll goblin dwarf
giant wizard witch sorcerer enchantress fairy pixie sprite elf gnome
hobbit centaur unicorn phoenix griffin hydra kraken mermaid minotaur satyr
nymph titan oracle prophet seer mystic sage elder chief king queen emperor
empress duke duchess baron count marquis knight squire page herald jester
bard minstrel troubadour poet playwright author writer novelist essayist
journalist reporter editor publisher printer librarian archivist curator
collector dealer merchant trader broker banker investor accountant auditor
cashier clerk secretary receptionist manager director executive officer
chief boss supervisor foreman overseer coordinator administrator
organizer planner strategist tactician commander leader ruler monarch
sovereign dictator tyrant rebel revolutionary patriot nationalist
loyalist conservative liberal radical moderate centrist activist advocate
campaigner lobbyist reformer pioneer innovator inventor creator founder
builder architect craftsman artisan carpenter mason plumber electrician
mechanic technician operator driver pilot captain navigator sailor fisherman
farmer rancher miner logger hunter trapper gardener florist landscaper
chef baker butcher grocer vendor supplier distributor manufacturer producer
contractor developer builder painter sculptor potter weaver tailor seamstress
cobbler blacksmith goldsmith silversmith jeweler watchmaker clockmaker
locksmith gunsmith swordsmith glassblower beekeeper birdwatcher
nap siesta slumber snore snooze doze drowse yawn stretch relax unwind
meditate contemplate ponder reflect consider evaluate assess analyze
examine inspect investigate probe explore survey scan monitor observe
record document archive catalog classify sort organize arrange assemble
construct fabricate manufacture produce generate create design plan draft
sketch outline compose write author publish print distribute deliver
ship transport carry haul drag tow push pull lift hoist raise lower drop
dump pour spill scatter spread cover wrap pack bundle box crate load
unload store shelve stock supply equip furnish install mount attach fasten
secure anchor moor dock park land arrive depart leave exit escape flee
retreat withdraw advance approach enter invade occupy capture seize grab
snatch steal rob plunder loot pillage ransack raid ambush assault storm
siege blockade surround encircle trap corner catch chase pursue hunt
stalk track trail shadow monitor spy patrol scout guard defend protect
shield shelter cover conceal disguise camouflage mask hide reveal expose
uncover discover detect spot notice observe witness testify confess admit
deny reject refuse decline resist oppose challenge confront face tackle
address handle manage cope deal negotiate mediate arbitrate settle resolve
solve crack decode decipher interpret translate transcribe dictate recite
chant pray worship praise honor celebrate commemorate remember recall
recollect recognize identify distinguish differentiate compare contrast
match pair link connect join unite merge blend mix combine integrate
incorporate absorb assimilate adapt adjust modify alter change transform
convert reform reshape restructure reorganize rearrange redistribute
reallocate reassign transfer shift redirect divert channel funnel route
steer navigate pilot guide escort accompany assist support aid help serve
supply provide offer present deliver contribute donate sponsor fund
finance invest speculate gamble bet wager risk venture dare challenge
compete rival contest dispute argue debate discuss confer consult advise
recommend suggest propose nominate elect appoint assign delegate authorize
approve endorse certify verify confirm validate authenticate establish
institute found launch inaugurate initiate trigger activate enable
umbrella parasol canopy awning tent pavilion gazebo pergola trellis arbor
fence hedge wall barrier gate portal threshold doorway archway hallway
corridor passage aisle walkway path trail road highway avenue boulevard
street lane alley drive circle loop plaza square courtyard patio terrace
balcony deck porch veranda attic basement cellar dungeon vault crypt tomb
grave cemetery memorial monument statue fountain garden greenhouse nursery
orchard vineyard plantation grove woodland clearing glade marsh swamp bog
wetland delta estuary lagoon bay cove inlet strait channel fjord gulf
peninsula cape headland cliff bluff ledge precipice chasm ravine gully
ditch trench moat dam weir levee embankment wharf quay jetty breakwater
lighthouse beacon buoy anchor mooring rope cable wire mesh net grid
lattice matrix array stack queue heap pile mound cluster batch group
set collection assortment variety range spectrum palette gradient shade
tint hue tone pigment dye stain ink paint lacquer varnish glaze enamel
coat layer film membrane screen filter lens prism crystal mirror window
pane panel board plank beam rafter joist truss brace strut girder frame
chassis hull deck keel mast sail rudder propeller engine motor pump
turbine generator transformer capacitor resistor transistor diode chip
processor memory storage drive disk tape card chip sensor detector scanner
printer monitor display projector speaker microphone headphone earphone
amplifier receiver transmitter broadcast antenna satellite dish cable fiber
optic digital signal data byte code algorithm program software hardware
firmware interface protocol standard format file folder directory path
domain server client host node hub switch router gateway firewall proxy
cache buffer queue stream channel port socket address table database
query search index sort filter parse render compile execute debug test
deploy scale balance load distribute replicate synchronize backup restore
archive compress encrypt decrypt hash sign verify validate authorize
authenticate login logout register subscribe follow bookmark share post
comment reply forward delete archive trash spam block mute report flag
tag label category genre type class kind sort rank grade rate score
point credit debit balance budget expense income profit loss revenue
margin cost price value worth asset equity debt loan mortgage interest
dividend yield return gain appreciation depreciation inflation deflation
recession boom bubble crash correction rally recovery growth decline
stagnation prosperity abundance scarcity shortage surplus deficit reserve
stock bond fund trust estate portfolio investment savings pension
retirement insurance premium coverage claim benefit compensation salary
wage tip commission royalty fee toll tax duty tariff subsidy grant
scholarship fellowship stipend allowance bonus incentive reward prize
trophy medal certificate diploma degree license permit passport visa
citizenship membership subscription enrollment registration admission
ticket pass voucher coupon discount sale bargain deal offer bid auction
tender contract agreement lease rental pledge promise vow oath commitment
obligation duty responsibility role function purpose mission vision goal
objective target milestone benchmark standard norm criterion threshold
limit boundary border edge margin rim fringe periphery outskirt suburb
district zone sector region territory domain realm kingdom empire state
province county parish borough township village hamlet settlement colony
outpost garrison fortress citadel bastion stronghold headquarters campus
compound complex facility institute academy seminary monastery convent
cathedral shrine temple mosque synagogue chapel sanctuary altar pulpit
podium stage platform runway catwalk bridge deck balcony gallery loft
attic mezzanine penthouse suite apartment flat studio loft condo villa
bungalow chalet hut shack shanty hovel den lair hideout refuge asylum
haven sanctuary oasis paradise utopia nirvana heaven bliss joy delight
pleasure ecstasy euphoria rapture elation excitement thrill rush surge
boost impulse spark ignition catalyst trigger stimulus incentive motive
reason cause basis foundation ground root source origin genesis dawn
birth creation inception beginning onset start launch opening premiere
debut introduction entry arrival advent emergence appearance rise ascent
climb elevation promotion advancement progression development evolution
revolution transformation metamorphosis mutation adaptation adjustment
accommodation compromise concession sacrifice surrender capitulation
defeat failure collapse breakdown crisis emergency disaster catastrophe
calamity tragedy misfortune setback obstacle hurdle barrier blockage
bottleneck deadlock stalemate standoff impasse dilemma predicament
quandary puzzle enigma mystery paradox contradiction irony satire parody
sarcasm humor wit joke prank gag hoax bluff scam fraud scheme plot
conspiracy intrigue scandal controversy dispute conflict confrontation
tension friction rivalry competition tournament championship league
season round quarter half match fixture event occasion ceremony ritual
tradition custom convention protocol procedure process method technique
approach style manner fashion trend fad craze mania obsession addiction
habit routine practice exercise drill rehearsal training preparation
arrangement setup configuration layout format structure framework
blueprint template model prototype sample specimen example
instance case scenario situation circumstance condition environment
atmosphere climate weather forecast prediction prophecy destiny fate
fortune luck chance probability odds risk danger hazard threat menace
peril jeopardy vulnerability weakness flaw defect fault error mistake
blunder gaffe oversight omission neglect ignorance confusion disorder
chaos turmoil upheaval disruption disturbance interference obstruction
interruption pause break interval gap opening hole crack split tear rip
scratch dent chip nick notch groove slot slit crack fracture rupture
breach gap void vacuum space room clearance margin leeway latitude
freedom liberty independence autonomy sovereignty authority dominion
supremacy mastery control command influence leverage advantage edge
benefit merit value quality caliber excellence greatness brilliance
splendor magnificence glory honor prestige reputation fame celebrity
status standing position rank title name brand image identity character
personality temperament disposition nature essence soul spirit
consciousness awareness perception intuition sensation feeling emotion
sentiment passion desire longing yearning craving appetite hunger thirst
greed ambition aspiration dream fantasy illusion delusion hallucination
vision revelation epiphany breakthrough discovery invention innovation
progress achievement accomplishment feat triumph victory success
prosperity wealth fortune treasure bounty abundance plenty surplus excess
waste luxury comfort convenience ease simplicity elegance grace charm
beauty appeal attraction magnetism charisma allure fascination wonder
amazement astonishment bewilderment perplexity complexity sophistication
refinement polish finesse subtlety nuance detail intricacy depth breadth
scope range extent magnitude scale proportion dimension measurement
calculation estimation approximation guess speculation theory hypothesis
assumption premise conclusion inference deduction reasoning logic argument
evidence proof demonstration illustration explanation clarification
definition description narration interpretation analysis synthesis
evaluation judgment assessment appraisal review critique commentary
observation remark comment note annotation footnote reference citation
source document record file report summary overview outline abstract
digest excerpt extract passage paragraph sentence phrase clause word term
expression idiom proverb saying quote motto slogan headline title caption
label sign symbol icon emblem logo badge insignia crest coat banner
flag pennant ribbon streamer poster flyer brochure pamphlet leaflet
newsletter magazine newspaper tabloid journal bulletin circular memo
letter email message text note card invitation announcement declaration
proclamation edict decree mandate directive order command instruction
guideline rule regulation policy principle standard specification
requirement qualification condition prerequisite criterion benchmark
goal target objective aim purpose intention plan strategy scheme design
concept notion idea thought opinion belief conviction faith creed doctrine
philosophy ideology theory principle value ethic moral virtue integrity
honesty sincerity authenticity transparency accountability reliability
consistency stability security safety protection defense immunity
resistance resilience endurance durability strength toughness hardness
firmness rigidity flexibility elasticity plasticity fluidity liquidity
viscosity density opacity transparency clarity purity cleanliness hygiene
sanitation sterilization preservation conservation sustainability
ecology environment habitat ecosystem biodiversity species genus family
order class phylum kingdom domain bacteria archaea eukaryote protist
fungus alga plankton microbe pathogen parasite host symbiont predator
prey herbivore carnivore omnivore scavenger decomposer producer consumer
"""

CURATED_WORDS = set(CURATED_WORDS_RAW.strip().split())

def normalize(vec):
    magnitude = math.sqrt(sum(x * x for x in vec))
    if magnitude == 0:
        return vec
    return [x / magnitude for x in vec]

def main():
    print("[*] Fetching GloVe embeddings dataset...")
    # Fetch first 12MB of GloVe 50d (about 26,000 lines of data)
    req = urllib.request.Request(URL)
    req.add_header("Range", "bytes=0-12000000")
    
    try:
        with urllib.request.urlopen(req) as response:
            content = response.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"[!] Network error: {e}")
        return

    lines = content.splitlines()
    print(f"[OK] Fetched {len(content)} bytes, parsed {len(lines)} lines.")

    embeddings = {}
    target_words = []
    
    # Process lines
    for line in lines:
        parts = line.strip().split()
        if not parts:
            continue
        word = parts[0].lower()
        
        # Filter out punctuation, numbers, stopwords, etc.
        if not re_is_alpha(word):
            continue
        if len(word) < 3:
            continue
        if word in STOPWORDS or word in EXCLUDE:
            continue
        
        # Verify vector shape
        vec_parts = parts[1:]
        if len(vec_parts) != 50:
            continue
            
        try:
            vec = [float(x) for x in vec_parts]
        except ValueError:
            continue
            
        # Store normalized vector
        embeddings[word] = normalize(vec)
        
        # If this word is in the curated pool, mark as target candidate
        if word in CURATED_WORDS:
            target_words.append(word)

    # Let's check how many total words we got
    print(f"[OK] Extracted {len(embeddings)} valid words.")
    print(f"[OK] Found {len(target_words)} valid target words.")

    # Write embeddings.js
    write_js(embeddings, target_words, OUTPUT_FILE)

def re_is_alpha(s):
    # Pure alphabet check
    for c in s:
        if not ('a' <= c <= 'z'):
            return False
    return True

def write_js(embeddings, target_words, output_path):
    # Round vectors to 4 decimals to keep file sizes clean
    rounded = {}
    for word, vec in embeddings.items():
        rounded[word] = [round(v, 4) for v in vec]
        
    js = "// Auto-generated by build_embeddings.py\n"
    js += f"// {len(rounded)} words x 50d vectors, {len(target_words)} target words\n"
    js += "const WORD_VECTORS = " + json.dumps(rounded, separators=(',', ':')) + ";\n"
    js += "const TARGET_WORDS = " + json.dumps(target_words, separators=(',', ':')) + ";\n"

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(js)

    size_kb = os.path.getsize(output_path) / 1024
    print(f"[OK] Written embeddings.js ({size_kb:.1f} KB)")

if __name__ == "__main__":
    main()
