"""
generate_embeddings.py — Build script for Semant word vectors.
Generates embeddings.js from GloVe pre-trained vectors.

Usage:
    python generate_embeddings.py

This script downloads GloVe 50d vectors via gensim and extracts
~1000 curated, common English words. The output is a JS file with
pre-normalized vectors (unit length) so cosine similarity = dot product.

Fallback: If gensim is unavailable, it uses a built-in word list and
generates synthetic but semantically-structured embeddings.
"""

import json
import math
import os
import sys
import hashlib
import random

# ─── Configuration ───────────────────────────────────────────
NUM_WORDS = 1000
VECTOR_DIM = 50
OUTPUT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "embeddings.js")

# Stopwords to skip (common function words that aren't fun to guess)
STOPWORDS = set("""
a an the and or but if then else when while for to from by with at in on of
is am are was were be been being have has had do does did will would shall
should can could may might must need dare ought this that these those it its
he she him her his they them their we us our you your i me my mine not no
nor so as than too very also just only even still already yet again ever
never always often sometimes usually the about above after before between
into through during over under around among along across behind beside
beyond near upon within without however therefore moreover furthermore
meanwhile although because since unless until whereas while other another
each every both few many much some any all such more most less least own
same different new old good bad big small great little long short high low
up down out off away back here there now today tomorrow yesterday ago
""".split())

# Additional words to exclude (too obscure, offensive, or not guessable)
EXCLUDE = set("""
www http https com org net edu gov etc vs mr mrs ms dr jr sr inc ltd
""".split())

# ─── Curated word list (1200+ candidates, we'll use top 1000 after filtering) ──
CURATED_WORDS = """
time year people way day man woman child world life hand part place case
week company system program question work government number night point
home water room mother area money story fact month lot right study book
eye job word business issue side kind head house service friend father
body family power hour game line end member law car city community name
president team minute idea kid body back parent face others result level
office door health person art war history party future morning girl boy
market center food store period field event moment stage plan state nature
thing hope talk address voice half nation population education music road
food king queen doctor teacher student judge fish bird cat dog horse cow
animal plant tree flower sun moon star sky cloud rain snow wind fire
earth rock mountain river lake ocean sea island beach forest garden park
street bridge building church school hospital library museum theater bank
shop restaurant hotel airport station factory market office tower castle
wall door window floor roof kitchen bedroom bathroom table chair bed
desk lamp phone camera television radio clock watch mirror picture frame
glass bottle cup plate bowl knife fork spoon brush comb pen pencil paper
book bag hat coat shirt pants shoe sock ring chain heart brain blood bone
skin hair teeth smile face eye nose mouth ear arm hand finger leg foot
knee shoulder neck chest stomach muscle nerve lung breath memory dream
sleep wake walk run jump climb swim fly drive ride sit stand fall push
pull throw catch hold carry lift drop break build cut open close start
stop begin turn move speak talk sing read write draw paint play work
fight dance laugh cry born die grow eat drink cook clean wash dress wear
drive think feel love hate want need try help give take make find know
see hear watch look listen touch taste smell remember forget learn teach
show tell ask answer call send receive wait expect hope wish pray believe
trust doubt fear fight win lose save spend sell buy pay trade share join
leave stay return visit travel cross enter sign mark count measure test
check search follow lead guide save spend create destroy protect attack
king queen prince princess knight soldier warrior hero villain monster ghost
angel devil dragon snake wolf bear tiger lion eagle hawk fish whale shark
dragon robot army weapon sword shield castle throne crown jewel treasure
gold silver diamond iron steel crystal glass mirror shadow light dark
color red blue green yellow orange purple pink black white brown gray
bright warm cool cold hot fresh sweet bitter sour sharp soft hard smooth
rough heavy light thick thin tall short wide narrow deep shallow empty
full rich poor strong weak fast slow quick quiet loud clear bright clean
dirty safe dangerous easy hard simple complex true false real fake wrong
right fair free open closed alive dead young old beautiful ugly happy sad
angry calm brave afraid tired hungry thirsty healthy sick lucky magic
music song dance rhythm beat drum guitar piano violin flute horn trumpet
art painting sculpture drawing design pattern shape circle square line
point edge corner curve angle wave spiral arrow target map border limit
distance space direction north south east west center middle surface
edge bottom height depth length width size weight speed force energy
power strength pressure temperature weather storm thunder lightning
earthquake volcano desert jungle swamp valley plain hill cliff coast
harbor port dock ship boat sail anchor rope chain net web thread wire
cable pipe tube wheel gear engine motor fuel gas oil coal steel iron
copper aluminum plastic rubber fabric cotton wool silk leather paper
wood stone brick metal bone shell horn wing feather scale tail claw
tooth fang paw hoof stripe spot patch glow shine sparkle flash beam
shadow shade ghost spirit soul mind brain heart nerve pulse breath
voice echo silence noise crash bang ring buzz hum whisper scream shout
spring summer autumn winter dawn sunrise sunset dusk midnight noon
morning evening tonight weekday weekend holiday season century decade
moment second minute future present ancient modern recent early late
sudden gradual rapid steady constant final initial primary total
complete partial direct central common special local national global
royal solar lunar urban rural remote central digital virtual social
private public official human natural physical mental moral visual
final round match race contest battle challenge quest journey mission
adventure voyage expedition trip flight path trail route bridge
tunnel highway railway airport harbor castle fortress temple palace
congress parliament senate cabinet election campaign debate speech
treaty alliance union empire republic kingdom colony province region
district zone territory domain planet satellite orbit gravity magnetic
electric nuclear atomic chemical crystal mineral organic fossil fuel
engine battery circuit network signal frequency antenna radar sonar
telescope microscope laser camera screen keyboard mouse button switch
lever wheel pedal brake throttle compass gauge meter dial panel board
card token ticket stamp badge medal trophy prize reward bonus gift
talent skill craft hobby puzzle maze riddle mystery clue hint trick
trap secret code password lock chain fence gate entrance exit passage
tunnel bridge ladder stairs elevator platform stage arena stadium court
track field course ring pool cage den nest burrow cave shelter tent
cabin cottage lodge manor mansion estate ranch farm barn mill forge
dock crane tower antenna mast pole flag banner stripe cross symbol
mark logo brand stamp seal signature medal crown shield sword spear
arrow bow blade knife hammer wrench drill saw nail screw bolt clip
pin thread needle button zipper pocket collar sleeve belt buckle lace
strap hook clasp handle grip knob dial lever spring hinge joint link
bond knot loop spiral coil twist bend fold wrap layer coat shell hull
frame skeleton scaffold pillar column beam arch dome vault ceiling
rainbow sunset horizon summit peak ridge slope canyon gorge waterfall
glacier iceberg continent peninsula cape marsh reef coral volcano
crater basin plateau prairie meadow grove orchard vineyard harvest
grain wheat corn rice bean potato tomato pepper onion garlic herb
spice sugar salt flour butter cheese yogurt cream sauce soup stew
bread cake cookie pie candy chocolate vanilla cinnamon ginger lemon
lime cherry grape melon peach plum pear banana mango coconut almond
walnut peanut cashew olive avocado mushroom spinach carrot broccoli
celery cucumber lettuce cabbage squash pumpkin berry strawberry
blueberry raspberry cranberry seed pollen bloom petal stem thorn
vine moss fern bamboo oak maple pine cedar palm willow ivy cactus
coral fossil amber jade pearl ruby emerald sapphire granite marble
sand gravel clay chalk copper bronze brass pewter chrome mercury
helium oxygen hydrogen nitrogen carbon sulfur calcium sodium potassium
rhythm melody harmony chord tempo volume pitch tone note beat pulse
groove bass treble choir orchestra symphony concert album studio
portrait landscape sketch blueprint diagram chart graph table index
catalog journal diary memoir essay poem novel fiction fantasy romance
horror comedy tragedy drama opera ballet circus carnival festival
parade march rally protest debate lecture seminar workshop conference
summit forum panel jury verdict sentence penalty prison guard patrol
detective spy agent mission target suspect witness victim rescue
surgery therapy diagnosis symptom vaccine virus bacteria infection
fever cough injury wound scar bruise bandage cast crutch wheelchair
vitamin protein fiber mineral enzyme hormone insulin adrenaline cortisol
neuron synapse reflex instinct emotion mood attitude character trait
virtue dignity courage patience wisdom knowledge genius talent vision
insight memory recall imagination creativity innovation strategy
discipline patience endurance stamina agility flexibility balance
coordination precision accuracy rhythm harmony proportion symmetry
contrast texture pattern fabric weave knit stitch thread yarn cotton
velvet denim leather suede canvas linen mesh lace ribbon tape glue
cement mortar plaster stucco tile mosaic mural fresco collage montage
""".strip().split()

def normalize(vec):
    """Normalize vector to unit length."""
    magnitude = math.sqrt(sum(x * x for x in vec))
    if magnitude == 0:
        return vec
    return [x / magnitude for x in vec]

def word_to_seed(word):
    """Deterministic seed from word."""
    return int(hashlib.md5(word.encode()).hexdigest(), 16) % (2**31)

# ─── Semantic categories with related dimensions ──────────────
CATEGORIES = {
    # category_name: (primary_dims, words_in_category)
    "animal": [0, 1],
    "body": [2, 3],
    "food": [4, 5],
    "nature": [6, 7],
    "weather": [8],
    "building": [9, 10],
    "tool": [11, 12],
    "emotion": [13, 14],
    "action_physical": [15, 16],
    "action_mental": [17, 18],
    "color": [19],
    "material": [20, 21],
    "music": [22, 23],
    "science": [24, 25],
    "social": [26, 27],
    "time": [28],
    "space": [29, 30],
    "plant": [31, 32],
    "water": [33],
    "art": [34, 35],
    "clothing": [36],
    "furniture": [37],
    "vehicle": [38],
    "medicine": [39],
    "military": [40],
    "politics": [41],
    "sport": [42],
    "cooking": [43],
    "mineral": [44],
    "geometry": [45],
    "light": [46],
    "sound": [47],
    "size": [48],
    "quality": [49],
}

WORD_CATEGORIES = {
    "dog": ["animal"], "cat": ["animal"], "bird": ["animal"], "fish": ["animal", "water"],
    "horse": ["animal"], "cow": ["animal"], "bear": ["animal"], "wolf": ["animal"],
    "tiger": ["animal"], "lion": ["animal"], "eagle": ["animal"], "hawk": ["animal"],
    "whale": ["animal", "water"], "shark": ["animal", "water"], "snake": ["animal"],
    "dragon": ["animal", "military"], "spider": ["animal"],
    "hand": ["body"], "arm": ["body"], "leg": ["body"], "foot": ["body"],
    "eye": ["body"], "face": ["body"], "head": ["body"], "heart": ["body", "emotion"],
    "brain": ["body", "action_mental"], "blood": ["body", "medicine"],
    "bone": ["body"], "skin": ["body"], "teeth": ["body"], "finger": ["body"],
    "knee": ["body"], "shoulder": ["body"], "neck": ["body"], "chest": ["body"],
    "stomach": ["body"], "muscle": ["body"], "lung": ["body"], "nerve": ["body", "medicine"],
    "hair": ["body"], "smile": ["body", "emotion"], "nose": ["body"], "mouth": ["body"],
    "ear": ["body"], "apple": ["food", "plant"], "bread": ["food", "cooking"],
    "cheese": ["food", "cooking"], "cake": ["food", "cooking"], "sugar": ["food", "cooking"],
    "salt": ["food", "cooking"], "butter": ["food", "cooking"], "cream": ["food", "cooking"],
    "soup": ["food", "cooking"], "rice": ["food", "cooking"], "corn": ["food", "plant"],
    "wheat": ["food", "plant"], "meat": ["food", "cooking"],
    "tree": ["nature", "plant"], "flower": ["nature", "plant"], "forest": ["nature", "plant"],
    "mountain": ["nature", "space"], "river": ["nature", "water"], "lake": ["nature", "water"],
    "ocean": ["nature", "water"], "sea": ["nature", "water"], "island": ["nature", "water"],
    "beach": ["nature", "water"], "garden": ["nature", "plant"], "park": ["nature", "space"],
    "valley": ["nature", "space"], "desert": ["nature", "weather"],
    "sun": ["nature", "light"], "moon": ["nature", "light", "time"],
    "star": ["nature", "light", "space"], "sky": ["nature", "space"],
    "cloud": ["nature", "weather"], "rain": ["nature", "weather", "water"],
    "snow": ["nature", "weather"], "wind": ["nature", "weather"],
    "fire": ["nature", "light"], "earth": ["nature", "space"],
    "rock": ["nature", "mineral"], "storm": ["nature", "weather"],
    "thunder": ["nature", "weather", "sound"], "lightning": ["nature", "weather", "light"],
    "rainbow": ["nature", "light", "color"],
    "house": ["building"], "school": ["building", "social"],
    "church": ["building", "social"], "hospital": ["building", "medicine"],
    "library": ["building", "art"], "museum": ["building", "art"],
    "theater": ["building", "art"], "castle": ["building", "military"],
    "tower": ["building"], "bridge": ["building", "space"],
    "wall": ["building"], "door": ["building"], "window": ["building"],
    "floor": ["building"], "roof": ["building"],
    "hammer": ["tool"], "knife": ["tool", "cooking"], "sword": ["tool", "military"],
    "shield": ["tool", "military"], "wheel": ["tool", "vehicle"],
    "pen": ["tool", "art"], "brush": ["tool", "art"],
    "happy": ["emotion", "quality"], "sad": ["emotion", "quality"],
    "angry": ["emotion", "quality"], "calm": ["emotion", "quality"],
    "brave": ["emotion", "quality"], "afraid": ["emotion", "quality"],
    "love": ["emotion", "action_mental"], "hate": ["emotion", "action_mental"],
    "hope": ["emotion", "action_mental"], "fear": ["emotion", "action_mental"],
    "joy": ["emotion"],
    "walk": ["action_physical"], "run": ["action_physical", "sport"],
    "jump": ["action_physical", "sport"], "swim": ["action_physical", "water", "sport"],
    "fly": ["action_physical", "space"], "climb": ["action_physical"],
    "dance": ["action_physical", "music"], "fight": ["action_physical", "military"],
    "throw": ["action_physical", "sport"], "catch": ["action_physical", "sport"],
    "push": ["action_physical"], "pull": ["action_physical"],
    "think": ["action_mental"], "feel": ["action_mental", "emotion"],
    "learn": ["action_mental", "social"], "teach": ["action_mental", "social"],
    "read": ["action_mental", "art"], "write": ["action_mental", "art"],
    "speak": ["action_mental", "sound"], "listen": ["action_mental", "sound"],
    "remember": ["action_mental", "time"], "forget": ["action_mental", "time"],
    "dream": ["action_mental", "time"], "believe": ["action_mental", "emotion"],
    "red": ["color", "light"], "blue": ["color", "light"], "green": ["color", "light", "nature"],
    "yellow": ["color", "light"], "orange": ["color", "light"],
    "purple": ["color", "light"], "pink": ["color", "light"],
    "black": ["color", "light"], "white": ["color", "light"],
    "brown": ["color", "light"], "gray": ["color"],
    "gold": ["mineral", "color"], "silver": ["mineral", "color"],
    "iron": ["mineral", "material"], "steel": ["mineral", "material"],
    "copper": ["mineral", "material"], "diamond": ["mineral"],
    "crystal": ["mineral", "light"], "glass": ["material", "light"],
    "wood": ["material", "plant"], "stone": ["material", "nature"],
    "leather": ["material", "clothing"], "cotton": ["material", "clothing", "plant"],
    "plastic": ["material"], "rubber": ["material"],
    "music": ["music", "art", "sound"], "song": ["music", "sound"],
    "rhythm": ["music"], "melody": ["music", "sound"],
    "drum": ["music", "sound"], "guitar": ["music", "sound"],
    "piano": ["music", "sound"], "violin": ["music", "sound"],
    "concert": ["music", "social"], "orchestra": ["music", "social"],
    "paint": ["art", "color"], "drawing": ["art"], "sculpture": ["art", "material"],
    "poem": ["art", "action_mental"], "novel": ["art", "action_mental"],
    "story": ["art", "action_mental"], "drama": ["art", "emotion"],
    "comedy": ["art", "emotion"],
    "car": ["vehicle"], "bus": ["vehicle", "social"], "train": ["vehicle"],
    "ship": ["vehicle", "water"], "boat": ["vehicle", "water"],
    "flight": ["vehicle", "space"], "truck": ["vehicle"],
    "shirt": ["clothing"], "coat": ["clothing"], "hat": ["clothing"],
    "shoe": ["clothing"], "dress": ["clothing"], "belt": ["clothing"],
    "ring": ["clothing", "mineral"], "crown": ["clothing", "politics"],
    "table": ["furniture", "building"], "chair": ["furniture", "building"],
    "bed": ["furniture"], "desk": ["furniture"], "lamp": ["furniture", "light"],
    "mirror": ["furniture", "light"],
    "doctor": ["medicine", "social"], "nurse": ["medicine", "social"],
    "surgery": ["medicine"], "vaccine": ["medicine", "science"],
    "fever": ["medicine", "body"], "injury": ["medicine", "body"],
    "pill": ["medicine"],
    "soldier": ["military", "social"], "warrior": ["military"],
    "weapon": ["military", "tool"], "battle": ["military", "action_physical"],
    "army": ["military", "social"], "war": ["military", "social"],
    "king": ["politics", "social"], "queen": ["politics", "social"],
    "prince": ["politics", "social"], "princess": ["politics", "social"],
    "president": ["politics", "social"], "judge": ["politics", "social"],
    "election": ["politics", "social"],
    "morning": ["time"], "evening": ["time"], "night": ["time"],
    "midnight": ["time"], "dawn": ["time", "light"], "sunset": ["time", "light"],
    "spring": ["time", "nature"], "summer": ["time", "weather"],
    "autumn": ["time", "nature"], "winter": ["time", "weather"],
    "ancient": ["time"], "modern": ["time"],
    "circle": ["geometry"], "square": ["geometry"], "line": ["geometry"],
    "point": ["geometry", "space"], "curve": ["geometry"],
    "wave": ["geometry", "water", "sound"],
    "light": ["light", "quality"], "dark": ["light", "quality"],
    "bright": ["light", "quality"], "shadow": ["light"],
    "glow": ["light"], "shine": ["light"],
    "silence": ["sound"], "noise": ["sound"],
    "whisper": ["sound", "action_mental"], "shout": ["sound", "action_physical"],
    "echo": ["sound", "space"],
    "giant": ["size", "quality"], "tiny": ["size", "quality"],
    "huge": ["size", "quality"], "vast": ["size", "space"],
    "deep": ["size", "space", "water"],
    "strong": ["quality", "body"], "weak": ["quality", "body"],
    "fast": ["quality", "action_physical"], "slow": ["quality", "action_physical"],
    "beautiful": ["quality", "emotion"], "ugly": ["quality"],
    "rich": ["quality", "social"], "poor": ["quality", "social"],
    "clean": ["quality"], "dirty": ["quality"],
    "safe": ["quality"], "dangerous": ["quality"],
    "magic": ["quality", "art"],
    "water": ["water", "nature"], "ice": ["water", "weather"],
    "steam": ["water", "science"],
    "planet": ["science", "space"], "gravity": ["science", "space"],
    "energy": ["science"], "atom": ["science"],
    "electric": ["science", "light"], "magnetic": ["science"],
    "chemical": ["science"],
    "family": ["social"], "friend": ["social", "emotion"],
    "teacher": ["social", "action_mental"], "student": ["social", "action_mental"],
    "mother": ["social", "emotion"], "father": ["social", "emotion"],
    "baby": ["social", "body"], "child": ["social"],
    "hero": ["social", "military", "quality"], "villain": ["social", "military"],
    "seed": ["plant", "nature"], "vine": ["plant", "nature"],
    "root": ["plant", "nature"], "leaf": ["plant", "nature"],
    "bloom": ["plant", "nature", "light"],
    "pepper": ["food", "cooking"], "onion": ["food", "cooking"],
    "garlic": ["food", "cooking"], "herb": ["food", "plant"],
    "spice": ["food", "cooking"],
    "chocolate": ["food"], "vanilla": ["food"],
    "cherry": ["food", "plant", "color"], "grape": ["food", "plant"],
    "banana": ["food", "plant"], "lemon": ["food", "plant"],
    "mushroom": ["food", "plant", "nature"],
    "wolf": ["animal", "nature"], "rabbit": ["animal"],
    "deer": ["animal", "nature"], "fox": ["animal"],
    "monkey": ["animal"], "elephant": ["animal", "size"],
    "penguin": ["animal", "water"],
    "night": ["time", "light"], "day": ["time", "light"],
    "week": ["time"], "month": ["time"], "year": ["time"],
    "century": ["time"],
    "prison": ["building", "social"], "fortress": ["building", "military"],
    "temple": ["building", "social"], "palace": ["building", "politics"],
    "barn": ["building", "nature"], "cabin": ["building", "nature"],
    "tent": ["building"],
    "oxygen": ["science", "nature"], "carbon": ["science", "nature"],
    "hydrogen": ["science", "nature"],
    "telescope": ["science", "light", "space"], "microscope": ["science", "light"],
    "camera": ["tool", "light", "art"],
    "clock": ["tool", "time"], "compass": ["tool", "space"],
    "key": ["tool"],
    "rope": ["tool", "material"], "chain": ["tool", "material"],
    "net": ["tool"],
    "flag": ["material", "politics"], "banner": ["material", "politics"],
    "medal": ["mineral", "military", "sport"],
    "trophy": ["sport", "mineral"],
    "puzzle": ["action_mental", "art"], "maze": ["action_mental", "space"],
    "mystery": ["action_mental", "art"], "secret": ["action_mental"],
    "treasure": ["mineral", "emotion"],
    "journey": ["action_physical", "space", "time"],
    "adventure": ["action_physical", "emotion"],
    "ghost": ["emotion", "light"], "spirit": ["emotion", "action_mental"],
    "angel": ["emotion", "light"], "devil": ["emotion"],
    "monster": ["emotion", "animal"],
    "dream": ["action_mental", "time", "emotion"],
    "sleep": ["body", "time"], "wake": ["body", "time"],
    "born": ["body", "time"], "die": ["body", "time"],
    "grow": ["body", "plant", "time"], "age": ["body", "time"],
    "cook": ["cooking", "action_physical"],
    "bake": ["cooking"], "boil": ["cooking", "water"],
    "freeze": ["cooking", "weather"], "melt": ["cooking", "weather"],
    "mix": ["cooking", "action_physical"],
    "sing": ["music", "sound", "action_physical"],
    "play": ["music", "action_physical", "sport"],
    "record": ["music", "time"],
    "photo": ["art", "light"],
    "screen": ["tool", "light"],
    "phone": ["tool", "social"],
    "computer": ["tool", "science"],
    "robot": ["tool", "science"],
    "machine": ["tool", "science"],
    "engine": ["tool", "vehicle"],
    "fuel": ["science", "vehicle"],
    "smoke": ["nature", "light"],
    "dust": ["nature", "material"],
    "sand": ["nature", "material", "mineral"],
    "clay": ["nature", "material", "mineral"],
    "mud": ["nature", "water", "material"],
    "fog": ["weather", "water", "light"],
    "frost": ["weather", "water"],
    "dew": ["weather", "water", "nature"],
    "flood": ["weather", "water", "nature"],
    "drought": ["weather", "nature"],
    "earthquake": ["nature"],
    "volcano": ["nature", "mineral"],
    "glacier": ["nature", "water"],
    "coral": ["nature", "water", "animal"],
    "fossil": ["nature", "mineral", "time"],
    "cave": ["nature", "space", "building"],
    "cliff": ["nature", "space"],
    "coast": ["nature", "water", "space"],
    "harbor": ["water", "building", "vehicle"],
    "dock": ["water", "building", "vehicle"],
    "sail": ["vehicle", "water"],
    "anchor": ["vehicle", "water", "tool"],
    "wing": ["animal", "vehicle", "body"],
    "feather": ["animal", "body", "light"],
    "claw": ["animal", "body", "tool"],
    "tail": ["animal", "body"],
    "horn": ["animal", "body", "sound"],
    "scale": ["animal", "body", "geometry"],
    "nest": ["animal", "building"],
    "cage": ["building", "animal"],
    "hunting": ["action_physical", "animal", "nature"],
    "fishing": ["action_physical", "animal", "water"],
    "farming": ["action_physical", "plant", "nature"],
    "planting": ["action_physical", "plant", "nature"],
    "harvest": ["plant", "nature", "time"],
    "market": ["social", "building"],
    "trade": ["social", "action_mental"],
    "money": ["social"],
    "wealth": ["social", "quality"],
    "value": ["social", "action_mental"],
    "price": ["social"],
    "debt": ["social"],
    "tax": ["social", "politics"],
    "law": ["social", "politics"],
    "crime": ["social"],
    "justice": ["social", "politics", "emotion"],
    "freedom": ["social", "politics", "emotion"],
    "peace": ["social", "emotion"],
    "power": ["social", "politics", "science"],
    "truth": ["action_mental", "quality"],
    "wisdom": ["action_mental", "quality"],
    "knowledge": ["action_mental", "social"],
    "genius": ["action_mental", "quality"],
    "talent": ["action_mental", "quality"],
    "courage": ["emotion", "quality"],
    "patience": ["emotion", "quality"],
    "pride": ["emotion"],
    "shame": ["emotion"],
    "guilt": ["emotion"],
    "mercy": ["emotion", "social"],
    "revenge": ["emotion", "action_physical"],
    "jealousy": ["emotion"],
    "loneliness": ["emotion"],
    "faith": ["emotion", "action_mental"],
    "luck": ["emotion", "quality"],
    "fate": ["emotion", "time"],
    "destiny": ["emotion", "time"],
}


def generate_synthetic_embeddings():
    """Generate semantically-structured embeddings using category assignments."""
    print("[*] Generating synthetic semantic embeddings...")
    
    # Collect all unique words from CURATED_WORDS and WORD_CATEGORIES
    all_words = set()
    for w in CURATED_WORDS:
        w = w.strip().lower()
        if w and len(w) >= 2 and w not in STOPWORDS and w not in EXCLUDE:
            all_words.add(w)
    for w in WORD_CATEGORIES:
        all_words.add(w)
    
    all_words = sorted(all_words)
    
    # Limit to NUM_WORDS
    # Prioritize words that have category assignments (better semantics)
    categorized = [w for w in all_words if w in WORD_CATEGORIES]
    uncategorized = [w for w in all_words if w not in WORD_CATEGORIES]
    
    # Take all categorized + fill remaining with uncategorized
    selected = categorized[:NUM_WORDS]
    remaining = NUM_WORDS - len(selected)
    if remaining > 0:
        selected += uncategorized[:remaining]
    
    selected = sorted(selected[:NUM_WORDS])
    
    print(f"[*] Selected {len(selected)} words ({len(categorized)} categorized)")
    
    embeddings = {}
    
    for word in selected:
        rng = random.Random(word_to_seed(word))
        vec = [rng.gauss(0, 0.1) for _ in range(VECTOR_DIM)]
        
        # Apply category signal
        cats = WORD_CATEGORIES.get(word, [])
        for cat_name in cats:
            dims = CATEGORIES.get(cat_name, [])
            for d in dims:
                if d < VECTOR_DIM:
                    # Strong signal for category membership
                    vec[d] += rng.uniform(0.5, 0.9)
        
        # If no categories, assign based on word hash to random dims
        if not cats:
            seed_dims = [word_to_seed(word + str(i)) % VECTOR_DIM for i in range(3)]
            for d in seed_dims:
                vec[d] += rng.uniform(0.3, 0.6)
        
        # Normalize to unit vector
        embeddings[word] = normalize(vec)
    
    return embeddings


def try_gensim_embeddings():
    """Try to load embeddings using gensim (best quality)."""
    try:
        import gensim.downloader as api
        print("[*] Loading GloVe 50d via gensim (this may take a minute on first run)...")
        model = api.load("glove-wiki-gigaword-50")
        print(f"[*] Loaded model with {len(model.key_to_index)} words")
        
        # Get words: filter stopwords and select common ones
        candidates = []
        for word in model.key_to_index:
            if word in STOPWORDS or word in EXCLUDE:
                continue
            if not word.isalpha():
                continue
            if len(word) < 3 or len(word) > 12:
                continue
            candidates.append(word)
            if len(candidates) >= NUM_WORDS * 2:  # Get extras to filter
                break
        
        # Select final words
        selected = candidates[:NUM_WORDS]
        
        embeddings = {}
        for word in selected:
            vec = model[word].tolist()
            embeddings[word] = normalize(vec)
        
        print(f"[*] Extracted {len(embeddings)} word vectors from GloVe")
        return embeddings
    
    except ImportError:
        print("[!] gensim not available, falling back to synthetic embeddings")
        return None
    except Exception as e:
        print(f"[!] gensim error: {e}, falling back to synthetic embeddings")
        return None


def write_js(embeddings, output_path):
    """Write embeddings as a JS file."""
    # Round vectors to 4 decimal places to save space
    rounded = {}
    for word, vec in embeddings.items():
        rounded[word] = [round(v, 4) for v in vec]
    
    js_content = "// Auto-generated by generate_embeddings.py — DO NOT EDIT\n"
    js_content += f"// {len(rounded)} words × {VECTOR_DIM}d vectors (pre-normalized)\n"
    js_content += "const WORD_VECTORS = "
    js_content += json.dumps(rounded, separators=(',', ':'))
    js_content += ";\n"
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    size_kb = os.path.getsize(output_path) / 1024
    print(f"[OK] Written {output_path} ({size_kb:.1f} KB)")


def main():
    print(f"=== Semant Embeddings Generator ===")
    print(f"Target: {NUM_WORDS} words × {VECTOR_DIM} dimensions")
    print()
    
    # Try gensim first for best quality
    embeddings = try_gensim_embeddings()
    
    # Fallback to synthetic
    if embeddings is None:
        embeddings = generate_synthetic_embeddings()
    
    # Write output
    write_js(embeddings, OUTPUT_FILE)
    
    # Print some sample similarities for sanity check
    print("\n--- Sample similarities ---")
    test_pairs = [
        ("dog", "cat"), ("dog", "apple"), ("ocean", "sea"),
        ("happy", "sad"), ("king", "queen"), ("fire", "water"),
        ("music", "song"), ("run", "walk"),
    ]
    for w1, w2 in test_pairs:
        if w1 in embeddings and w2 in embeddings:
            v1 = embeddings[w1]
            v2 = embeddings[w2]
            sim = sum(a * b for a, b in zip(v1, v2))
            print(f"  {w1:>10} - {w2:<10} = {sim:.4f}")
    
    print("\n[OK] Done! Your game is ready.")


if __name__ == "__main__":
    main()
