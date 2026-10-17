# Picture descriptions, written to the rules in the story-authoring playbook:
# outfit pinned on every page, recurring characters pinned, no writing anywhere,
# adults reduced to hands where the outfit matters, reference photo scoped to the face.
NOTEXT = ('CRITICAL: there is NO writing of any kind in this picture — no Arabic script, no Latin letters, no numbers; '
          'NO signs, NO posters, NO labels and NO lettered pictures on the walls — not blank ones either. Never a white panel or an empty sign.')
FRAME = 'The picture fills the entire tall portrait frame edge to edge, no letterbox'
FACE = ('Take ONLY the face, hair and skin tone from the reference photograph; the clothing AND ANY HAT OR CAP in the reference '
        'photograph must be ignored completely — the child wears NO cap and NO hat unless this scene names one')
ALONE = 'the child is the ONLY person in the picture — no adults, no other faces, not even blurred in the background.'
TEITA = ('the grandmother is ALWAYS the same woman: silver hair under a white headscarf, a long black thobe with red cross-stitch '
         'embroidery across the chest, warm crinkled eyes — never a different woman.')
GRANDPA = ('the grandfather is ALWAYS the same man: short neat white beard, kind wrinkled eyes, a grey wool waistcoat over a white '
           'shirt — never a different man.')

def page(action, *blocks, outfit):
    return ' '.join([action.rstrip('.') + '.', *blocks, NOTEXT, FRAME + ',', outfit + '.', FACE])

# ---------- good_night ----------
PJ = ('wearing soft pale-blue cotton PYJAMAS printed with small yellow stars (long sleeves, long trousers) and bare feet — the SAME '
      'pyjamas on every page; the child is NOT wearing day clothes, NOT a t-shirt, NOT jeans')
TEDDY = 'the teddy is ALWAYS the same small honey-brown teddy bear with a red ribbon bow at its neck — never a different toy.'
BOAT = ('the moon boat is ALWAYS the same small silver CRESCENT-shaped boat that glows softly from within, just big enough for the '
        'child to sit in — never a sailing ship, never a rocket.')
NIGHT = ('a peaceful Palestinian hillside village at night: pale stone houses with flat roofs, olive trees, a few warm golden '
         'windows, a deep-blue sky full of stars and a huge bright full moon; soft silver moonlight, a gentle dreamy mood, photographic.')
ROOM = ('a cosy child\'s bedroom at night lit by a small warm bedside lamp and silver moonlight through a wide window; plain painted walls.')
GN = {
 'coverScene': page('the CHILD sitting in the glowing moon boat with the teddy on their lap, floating above the starry village, smiling straight at the camera, the huge full moon behind', BOAT, TEDDY, NIGHT, ALONE, outfit=PJ),
 'portraitScene': page('a warm head-and-shoulders portrait of the child smiling at the camera against a soft plain deep-blue night background with a few tiny stars, the teddy hugged beside their face', TEDDY, ALONE, outfit=PJ),
 'pageScenes': [
  page('the CHILD large and centred kneeling on the bed at a wide-open window at dusk, gazing at a huge round full moon rising over dark hills; a mother\'s HAND rests on the child\'s shoulder from the edge of the frame — she is not otherwise shown', ROOM, outfit=PJ),
  page('the CHILD large and centred in a small bathroom with plain tiles, brushing teeth with a little toothbrush and grinning at the camera through the foam', ALONE, outfit=PJ),
  page('the CHILD tucked under a soft blanket in bed hugging the teddy close, whispering toward the moon in the window, face clearly visible and lit by the lamp', TEDDY, ROOM, ALONE, outfit=PJ),
  page('the moon boat hovering just outside the open bedroom window, glowing silver; the CHILD kneels on the bed reaching one hand toward it in wonder, the teddy under the other arm', BOAT, TEDDY, ROOM, ALONE, outfit=PJ),
  page('the CHILD sitting in the moon boat with the teddy on their lap, floating gently above the flat rooftops of the sleeping village, looking down at the little golden windows with a delighted smile', BOAT, TEDDY, NIGHT, ALONE, outfit=PJ),
  page('the moon boat drifting beside a leafy tree; in a nest on a branch close to the CHILD, three small birds sleep with their heads tucked under their wings, and the child waves to them softly', BOAT, TEDDY, NIGHT, ALONE, outfit=PJ),
  page('the moon boat floating low over a moonlit field of sheep asleep in the grass; in the NEAR FOREGROUND one LITTLE WHITE LAMB stands wide awake looking straight up at the child, large and unmistakable; the child leans over the side smiling at it', BOAT, TEDDY, NIGHT, ALONE, outfit=PJ),
  page('the moon boat resting beside an enormous ancient gnarled olive tree with silver-green leaves; the CHILD reaches out and gently touches a leaf, eyes half closed, smiling', BOAT, TEDDY, NIGHT, ALONE, outfit=PJ),
  page('the moon boat floating above a calm sea glittering with moonlight; small fish rise to the surface blowing little bubbles, and the CHILD leans over the side delighted', BOAT, TEDDY, NIGHT, ALONE, outfit=PJ),
  page('the moon boat beside the lit window of a small stone house; inside the window the grandmother waves and blows a kiss, and the CHILD waves back from the boat', BOAT, TEDDY, TEITA, NIGHT, outfit=PJ),
  page('the moon boat high among countless twinkling stars; the CHILD gives a huge sleepy yawn, the teddy already asleep on their lap', BOAT, TEDDY, ALONE, outfit=PJ),
  page('back in bed, the CHILD tucked under the blanket giving a sleepy wave; only the PARENTS\' arms and hands enter the frame, tucking the blanket in — their faces are not shown, the child\'s is the only face; the moon boat glows faintly outside the window', BOAT, ROOM, outfit=PJ),
  page('the CHILD fast asleep in bed hugging the teddy, eyes closed and a peaceful smile, face clearly visible; silver moonlight falls across the blanket from the window where the full moon shines', TEDDY, ROOM, ALONE, outfit=PJ),
 ],
}

# ---------- first_tooth ----------
TOOTH_OUTFIT = ('wearing a mustard-yellow knitted jumper, {navy trousers|a navy skirt with white tights} and white trainers — the SAME '
                'outfit on every page')
HOME = 'a warm Palestinian family home in daylight: pale stone walls, wooden furniture, a woven rug, potted red geraniums on the windowsill.'
ROOF = ('a flat stone rooftop of a village house with low parapet walls and potted plants, bright blue sky with a few white clouds, '
        'the village and green hills beyond.')
GAP = 'the child\'s smile shows a small GAP where one lower front baby tooth is missing.'
FT = {
 'coverScene': page('the CHILD on a sunny rooftop holding a tiny white baby tooth up between finger and thumb toward a bright sun, beaming at the camera', GAP, ROOF, ALONE, outfit=TOOTH_OUTFIT),
 'portraitScene': page('a warm head-and-shoulders portrait of the child smiling widely at the camera against a soft plain sunny-yellow background', GAP, ALONE, outfit=TOOTH_OUTFIT),
 'pageScenes': [
  page('at the breakfast table, the CHILD large and centred holding a round piece of za\'atar flatbread with one bite missing, the other hand touching their mouth, eyes wide in surprise', HOME, ALONE, outfit=TOOTH_OUTFIT),
  page('the CHILD sitting on a kitchen chair with mouth open while a mother\'s HANDS gently check the wobbly tooth — she is not otherwise shown; the child looks up hopeful', HOME, outfit=TOOTH_OUTFIT),
  page('the CHILD sitting on the rug pushing a wobbly front tooth with the tip of the tongue, half laughing and half worried, a funny face', HOME, ALONE, outfit=TOOTH_OUTFIT),
  page('the CHILD standing between TWO clear choices: on the LEFT a bowl of shiny red crunchy apples on a wooden table, on the RIGHT a big cosy armchair with a soft cushion for waiting patiently; the grandfather sits further back smiling; the child looks from one to the other deciding', GRANDPA, HOME, outfit=TOOTH_OUTFIT),
  page('the CHILD holding a bitten red apple in one hand and, in the open palm of the other, a TINY WHITE baby tooth held up to the camera, mouth open in an amazed smile', GAP, HOME, ALONE, outfit=TOOTH_OUTFIT),
  page('the CHILD in front of a plain wooden-framed mirror grinning wide and laughing, the reflection showing the same child', GAP, HOME, ALONE, outfit=TOOTH_OUTFIT),
  page('in the courtyard, the CHILD beside the grandmother looking up at the sky where a big white cloud hides the SUN, which peeks bright and unmistakable from behind the cloud\'s edge in the upper part of the frame', GAP, TEITA, outfit=TOOTH_OUTFIT),
  page('the CHILD and the grandmother arriving on the rooftop at noon as the sun bursts out from behind a cloud; the child holds a closed fist with the tooth inside', GAP, TEITA, ROOF, outfit=TOOTH_OUTFIT),
  page('the CHILD on the rooftop holding the tiny tooth up high toward the sun between finger and thumb, singing with mouth open, the grandmother beside clapping along', GAP, TEITA, ROOF, outfit=TOOTH_OUTFIT),
  page('the CHILD on the rooftop caught mid-throw, one arm stretched high toward the bright sun, a tiny white sparkle flying up into the sunlight', GAP, ROOF, ALONE, outfit=TOOTH_OUTFIT),
  page('in the evening, the CHILD sitting on the living-room sofa in warm lamp light asking a question with a curious face; only the father\'s HAND rests on the sofa back — he is not otherwise shown', GAP, HOME, outfit=TOOTH_OUTFIT),
  page('the CHILD close to the camera grinning to show a TINY NEW WHITE TOOTH just peeking up through the gap in the front teeth, jumping with joy', HOME, ALONE, outfit=TOOTH_OUTFIT),
  page('the CHILD at a bathroom sink brushing teeth with a small toothbrush and smiling at the camera, the new little tooth visible', ALONE, outfit=TOOTH_OUTFIT),
 ],
}

# ---------- winter_rain ----------
INDOOR = ('wearing a cream knitted jumper, {navy trousers|navy leggings} and thick woolly socks — the SAME clothes on every page')
OUTDOOR = ('wearing a bright RED hooded RAINCOAT over a cream knitted jumper, {navy trousers|navy leggings} and yellow rubber '
           'boots — the SAME outfit on every outdoor page')
WHOME = ('a warm Palestinian village home in winter: pale stone walls, a woven rug, steamy windows, cosy lamp light, and a '
         'traditional round SOBA heater — a cylindrical kerosene stove with a flat round metal top and a small glowing window — standing in the room.')
YARD = ('a stone-walled courtyard of a village house on a grey rainy morning: wet stone paving, olive trees, distant green hills under low clouds.')
WR = {
 'coverScene': page('the CHILD jumping in a big puddle in the courtyard, a big splash all around the boots, laughing at the camera, light rain falling and a rainbow beginning over the hills', YARD, ALONE, outfit=OUTDOOR),
 'portraitScene': page('a warm head-and-shoulders portrait of the child smiling at the camera with the raincoat hood down, against a soft plain rainy blue-grey background with a few raindrops', ALONE, outfit=OUTDOOR),
 'pageScenes': [
  page('the CHILD sitting up in bed wrapped in a thick blanket, face clearly visible, looking with delight at raindrops streaming down the window glass beside the bed', WHOME, ALONE, outfit=INDOOR),
  page('the CHILD at an open window breathing in deeply with eyes closed and a smile, rain falling on the olive trees and dark wet earth outside', WHOME, ALONE, outfit=INDOOR),
  page('the CHILD in the open front doorway pulling on yellow rubber boots, already in the red raincoat; a father\'s HANDS hold the door open — he is not otherwise shown', YARD, outfit=OUTDOOR),
  page('the CHILD standing in the courtyard between TWO puddles: on the LEFT a small round puddle, on the RIGHT a very big wide puddle reflecting the sky; the child looks from one to the other, ready to jump', YARD, ALONE, outfit=OUTDOOR),
  page('the CHILD landing in the big puddle mid-jump, a huge splash of water flying up all around, laughing; only a father\'s legs and one hand show at the edge of the frame — he is not otherwise shown', YARD, outfit=OUTDOOR),
  page('the CHILD crouching close to an old wet stone wall, counting three snails crawling along it, pointing at them one by one', YARD, ALONE, outfit=OUTDOOR),
  page('the CHILD in the courtyard looking up as the sun breaks through the clouds; a big bright RAINBOW arcs over the green hill behind, large and unmistakable', YARD, ALONE, outfit=OUTDOOR),
  page('the CHILD, hair still wet, sitting cross-legged on the rug close to the soba heater, holding both hands out to warm them; the red raincoat hangs dripping by the door', WHOME, ALONE, outfit=INDOOR),
  page('the grandmother placing sweet potatoes and chestnuts on the flat metal top of the soba heater while the CHILD watches eagerly beside her', TEITA, WHOME, outfit=INDOOR),
  page('the CHILD sitting by the soba heater holding a cup of hot creamy sahlab sprinkled with cinnamon in both hands, blowing on it, steam rising', WHOME, ALONE, outfit=INDOOR),
  page('the CHILD snuggled under a big woollen blanket on the sofa beside the grandfather, who tells a story with his hands; the child listens wide-eyed', GRANDPA, WHOME, outfit=INDOOR),
  page('the CHILD drawing a little snowman with one finger on a fogged-up window pane, rain outside, smiling at the drawing; the drawing is simple lines in the mist, no letters', WHOME, ALONE, outfit=INDOOR),
  page('the CHILD asleep in bed under a thick blanket with only the head on the pillow showing, a peaceful smile, rain streaks on the dark window and a small warm lamp glowing', WHOME, ALONE, outfit=INDOOR),
 ],
}
SCENES = {'good_night': GN, 'first_tooth': FT, 'winter_rain': WR}
