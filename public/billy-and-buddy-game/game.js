/* Billy & Buddy: Basket of Choices. A playable prototype of the Figma game.
   Part one: sort ten items into Needs and Wants in two minutes, with three lives.
   Part two: check out on a budget. Every need is required, wants only fit if
   there is money left, and what is left over is the score. */
(function () {
  'use strict';

  const A = '/billy-and-buddy-game/assets/';
  const PLAY_ICON = `<img class="btn-ico ico-play" src="${A}menu/play-icon.svg" alt="">`;
    // ?demo keeps the item order fixed, so recorded clips play the same every time
  const DEMO = new URLSearchParams(location.search).has('demo');
  const LIVES = 3;

  // Each item carries a hint Billy gives while it falls, which makes the child
  // think about the trip without naming the basket, and the reason she gives
  // once it lands, right or wrong
  const item = (id, name, kind, price, hint, why) => ({ id, name, kind, price, hint, why, src: `${A}items/${id}.svg` });

  const SCENARIOS = [
    {
      id: 'zoo',
      title: 'A Wild Day at the Zoo',
      // What Billy calls the shopping's purpose in her lines
      occasion: 'our zoo trip',
      card: `${A}menu/card-zoo.png`,
      backdrop: `${A}bg/zoo.jpg`,
      // zoo.jpg is the Level Intro frame, so its Play button is baked in. The
      // patch repaints that spot: the Figma gate layer down to its bottom rail
      // (stage y 848), then the ground colour below
      patch: `<div class="abs" style="left:600px;top:765px;width:312px;height:150px;background:#DDA582">
        <img class="abs" src="${A}bg/zoo-play-patch.png" alt="" style="left:0;top:0;width:312px;height:83px">
      </div>`,
      // The Level Intro rebuilt from its Figma layers, bottom to top, so the
      // animals can move: [file, left, top, width, height, motion, mirrored].
      // Mirrored layers are flipped in Figma; their SVGs come unflipped.
      scene: {
        bg: '#D1E1C4',
        layers: [
          ['elephant.svg', -86, 99, 375.33, 240.39, '', true],
          ['ground', -20, 844, 1581, 249],
          ['sign.svg', 464, 135, 246.48, 102.44, '', true],
          ['antelope.svg', 335, 18, 230.49, 272.73, 'graze', true],
          ['giraffe.svg', 103, 296, 354.05, 422.34, 'walk giraffe'],
          ['waterfall.svg', 1041.44, -16, 491.44, 414.95],
          ['crocodile-pack.svg', 983, 360.6, 300.68, 56.11, 'crawl'],
          ['plant-pond-pack.svg', 1395.85, 303.79, 160.55, 168.95, 'leaves'],
          ['gorilla.svg', 1188, 446, 224.16, 234, 'walk gorilla'],
          ['plant-right-pack.svg', 1286, 319, 329.82, 522.06, 'leaves'],
          ['cliff.png', 0, 492, 238, 347],
          ['tiger.svg', -165, 392, 351.75, 156.89, 'walk tiger'],
          ['gate.png', 0, 257, 1512, 628.5],
          ['parrot.svg', 1427, 99, 93.51, 182.01, 'perch'],
          ['pond.png', 667, 0, 440, 188.5],
        ],
      },
      budget: 20,
      story: [
        ['billy', 'We are going to the zoo. We need to buy supplies.'],
        ['buddy', 'Yay, we are going to the supermarket!', 'happy', 'yay'],
        ['billy', 'We will buy snacks, a cap, a water bottle and the other things we need.'],
        ['buddy', 'Ooh, I want candy, pleeease.', 'smirk', 'beg'],
      ],
      items: [
        item('water-bottle', 'Water bottle', 'need', 3, 'It gets hot at the zoo. What will we drink?', 'We need water so we do not get thirsty.'),
        item('hat', 'Hat', 'need', 4, 'The sun is out all day. What keeps it off your head?', 'A hat keeps the hot sun off us.'),
        item('backpack', 'Backpack', 'need', 5, 'How will we carry our things around the zoo?', 'We need a bag to carry everything.'),
        item('chips', 'Chips', 'need', 2, 'Our tummies will rumble by lunch. What will we eat?', 'We need a snack so we are not hungry.'),
        item('sunglasses', 'Sunglasses', 'need', 2, 'The sun is very bright. What helps our eyes?', 'Sunglasses keep the bright sun out of our eyes.'),
        item('lollipop', 'Lollipop', 'want', 2, 'Would our zoo day still be fine without it?', 'Candy is yummy, but we can have fun without it.'),
        item('balloon-dog', 'Balloon dog', 'want', 3, 'Is it for fun, or do we need it to see the animals?', 'A balloon is just for fun.'),
        item('binoculars', 'Binoculars', 'want', 9, 'Can we still see the animals with our own eyes?', 'We can see the animals without them.'),
        item('giraffe-toy', 'Giraffe toy', 'want', 5, 'We will see a real giraffe. Do we need a toy one too?', 'A toy is nice to have, but we do not need it.'),
        item('tiger-mask', 'Tiger mask', 'want', 4, 'Is this for dressing up, or for the trip?', 'A mask is for fun, not for the trip.'),
      ],
    },
    {
      id: 'party',
      title: 'Buddy’s Birthday Bash',
      occasion: 'Buddy’s party',
      card: `${A}menu/card-party.png`,
      // Buddy's party, from the Figma Level Intro frame; the story plays over
      // the same room without Buddy and the cake
      intro: `${A}bg/party-intro.jpg`,
      backdrop: `${A}bg/party-story.jpg`,
      budget: 20,
      story: [
        ['billy', 'It is Buddy’s birthday today! We need to get ready for the party.'],
        ['buddy', 'Yay, my party! Let’s go to the shop.', 'happy', 'yay'],
        ['billy', 'We will buy a cake, a present and treats for your friends.'],
        ['buddy', 'Ooh, can I get a big teddy bear too?', 'smirk', 'beg'],
      ],
      items: [
        item('dog-cake', 'Birthday cake', 'need', 6, 'Every birthday has one. What will Buddy blow the candle out on?', 'A birthday needs a cake, and this one is safe for dogs.'),
        item('gift', 'Gift', 'need', 4, 'What will Buddy get to open?', 'We need a present for Buddy.'),
        item('card', 'Birthday card', 'need', 2, 'How will we tell Buddy happy birthday?', 'A card says happy birthday to Buddy.'),
        item('wrapping-paper', 'Wrapping paper', 'need', 2, 'How will we keep Buddy’s present a surprise?', 'We need paper to wrap Buddy’s present.'),
        item('dog-treats', 'Dog treats', 'need', 2, 'Buddy’s dog friends are coming. What will they eat?', 'Buddy’s friends need something to eat at the party.'),
        item('party-hat', 'Party hat', 'want', 2, 'Can Buddy still have a party without a hat?', 'A party hat is fun, but Buddy can party without one.'),
        item('balloon', 'Balloon', 'want', 1, 'Is a balloon for playing, or for the party to happen?', 'A balloon is fun, but we do not need it.'),
        item('teddy-bear', 'Teddy bear', 'want', 6, 'Buddy already has a present. Is this one more?', 'A teddy is lovely, but it is a want.'),
        item('bow-tie', 'Bow tie', 'want', 3, 'Will the party still happen if Buddy is not dressed up?', 'A bow tie looks smart on Buddy, but it is a want.'),
        item('stickers', 'Stickers', 'want', 3, 'Will stickers help Buddy have a party?', 'Stickers are fun extras.'),
      ],
    },
    {
      id: 'hike',
      title: 'Waterfall Hike',
      occasion: 'our hike',
      card: `${A}menu/card-hike.png`,
      // The trail scene from the Figma hike frame. On the Level Intro, Billy
      // (the full-body rig) and Buddy stand side by side on the ridge, on one
      // ground line and clear of the Play button; the story plays over the
      // same scene.
      introCast: {
        billy: 'left:470px;top:295px;width:128px',
        buddy: ['left:598px;top:572px;width:210px;height:198px', 1.05],
      },
      backdrop: `${A}bg/hike.jpg`,
      budget: 20,
      story: [
        ['billy', 'We are hiking to the waterfall tomorrow. We need supplies.'],
        ['buddy', 'Yay, a trip to the supermarket first!', 'happy', 'yay'],
        ['billy', 'We will buy water, a trail map, sunscreen and the other things we need.'],
        ['buddy', 'Ooh, can we get a camera for the waterfall?', 'smirk', 'beg'],
      ],
      items: [
        item('water-bottle', 'Water bottle', 'need', 3, 'Hiking is thirsty work. What will we drink?', 'We need water on a long walk.'),
        item('backpack', 'Backpack', 'need', 5, 'Where will we put our things on the trail?', 'A bag carries what we need.'),
        item('map', 'Trail map', 'need', 2, 'How will we find the way to the waterfall?', 'A map stops us getting lost.'),
        item('sunscreen', 'Sunscreen', 'need', 3, 'We will be in the sun all day. What protects our skin?', 'Sunscreen stops a sunburn.'),
        item('first-aid', 'First aid kit', 'need', 3, 'What if someone scrapes a knee?', 'A first aid kit helps if we get hurt.'),
        item('camera', 'Camera', 'want', 9, 'Can we still see the waterfall without it?', 'A camera is nice, but we can enjoy it without one.'),
        item('binoculars', 'Binoculars', 'want', 8, 'Do we need these to walk the trail?', 'We can hike without them.'),
        item('lollipop', 'Candy', 'want', 2, 'Is it a treat, or something for the trail?', 'Candy is a treat, not a need.'),
        item('stickers', 'Stickers', 'want', 3, 'Will these help us on the hike?', 'Stickers are just for fun.'),
        item('teddy-bear', 'Cuddly toy', 'want', 5, 'Do we need it to get to the waterfall?', 'A cuddly toy is a want.'),
      ],
    },
  ];

  // A lost life: the same heart, cracked down the middle
  const BROKEN = '<svg class="heart broken" viewBox="0 0 50 50" aria-hidden="true"><path d="M25 44S5 31 5 17.5C5 10.6 10.4 6 16.3 6c3.9 0 6.9 2.1 8.7 5 1.8-2.9 4.8-5 8.7-5C39.6 6 45 10.6 45 17.5 45 31 25 44 25 44z" fill="#FC4F4F"/><path d="M25 10l-4 10 6 5-5 9 3 9" stroke="#fff" stroke-width="3.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  const HEART = '<svg class="heart" viewBox="0 0 50 50" aria-hidden="true"><path d="M25 44S5 31 5 17.5C5 10.6 10.4 6 16.3 6c3.9 0 6.9 2.1 8.7 5 1.8-2.9 4.8-5 8.7-5C39.6 6 45 10.6 45 17.5 45 31 25 44 25 44z" fill="#E35E54"/><path d="M13 14c2-3 6-3 8-1" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/></svg>';

  // ---- stage scaling -------------------------------------------------------
  const stage = document.getElementById('stage');
  function fit() {
    const s = Math.min(window.innerWidth / 1512, window.innerHeight / 982);
    stage.style.transform = `scale(${s}) translate(-50%, -50%)`;
  }
  window.addEventListener('resize', fit);
  fit();

  // ---- tiny helpers --------------------------------------------------------
  const h = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };
  const money = (n) => (n < 0 ? `-$${-n}` : `$${n}`);
  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const shuffle = (a) => {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };

  // ---- Billy and Buddy -----------------------------------------------------
  // Billy is put together from her Figma parts in three layers: her arms
  // (behind), her body, and her head, which is one of the eight faces. Each
  // layer is its own element, so turning a head or an arm only moves a
  // composited layer and never repaints the drawing. Boxes and shoulders are
  // in each drawing's own units.
  const FACES = ['smile', 'happy', 'talk', 'oh', 'smirk', 'pout', 'sad', 'cry'];
  const POSES = {
    'billy-wave': { head: 'Group_11', box: [176, 0, 268, 291], arms: [[['Group'], 262, 352]] },
    billy: { head: 'Group_10', box: [11, 0, 179, 194], arms: [[['Group_2', 'Group_3'], 30, 206], [['Group_4', 'Group_5'], 180, 206]] },
  };
  // The full-body rig from the Figma "Billy character rig" file: every part
  // is drawn on one shared 210x780 canvas, so each layer fills the same box
  // and turns about its joint. Joints nest, so a shoulder carries the elbow,
  // the elbow the wrist, a hip the knee and the knee the ankle.
  const RIG = { w: 210, h: 780, head: [11, 0, 179, 194] };
  const JOINTS = {
    shL: [31, 210], elL: [27, 342], wrL: [25, 468],
    shR: [179, 210], elR: [183, 342], wrR: [185, 468],
    hipL: [78, 439], kneeL: [78, 593], ankL: [78, 735],
    hipR: [132, 439], kneeR: [132, 593], ankR: [132, 735],
  };
  POSES.full = { rig: true };
  const drawings = {};
  const drawing = (pose) => (drawings[pose] = drawings[pose] || fetch(`${A}${pose}.svg`).then((r) => r.text()));
  Object.keys(POSES).filter((k) => !POSES[k].rig).forEach(drawing);
  FACES.forEach((f) => { new Image().src = `${A}billy/head-${f}.svg`; });
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const between = (a, b) => a + Math.random() * (b - a);

  // A line of speech as mouth shapes: one open mouth per vowel group, shut
  // briefly between syllables, longer between words and longest at a comma
  // or full stop, so the mouth keeps the rhythm of the words instead of a
  // steady flap. Each step is [mouth, ms, starts a word].
  function speech(text) {
    const steps = [];
    text.split(/\s+/).filter(Boolean).forEach((word) => {
      const vowels = word.toLowerCase().match(/[aeiouy]+/g) || ['a'];
      vowels.forEach((v, i) => {
        steps.push([/^[ou]/.test(v) ? 'oh' : 'talk', between(190, 250), i === 0]);
        if (i < vowels.length - 1) steps.push(['smile', between(90, 130), false]);
      });
      steps.push(['smile', /[.,!?]$/.test(word) ? between(380, 480) : between(140, 200), false]);
    });
    return steps;
  }
  const length = (steps) => steps.reduce((n, s) => n + s[1], 0);

  // One copy of the drawing per layer: `keep` leaves only those groups (an
  // arm), `drop` removes them (the body without its arms and head)
  function layer(text, { keep, drop }) {
    const svg = h(text);
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    const root = svg.querySelector('g');
    if (keep) {
      const wanted = keep.map((id) => svg.querySelector(`[id="${id}"]`));
      root.querySelectorAll('*').forEach((n) => {
        if (root.contains(n) && !wanted.some((k) => k === n || k.contains(n) || n.contains(k))) n.remove();
      });
      // An arm swings outside the frame's clip, so its layer is not clipped
      svg.querySelectorAll('[clip-path]').forEach((n) => n.removeAttribute('clip-path'));
    }
    (drop || []).forEach((id) => svg.querySelector(`[id="${id}"]`).remove());
    return svg;
  }

  function billy(pose, style) {
    const p = POSES[pose];
    const el = h(`<div class="billy pose-${pose} abs" role="img" aria-label="Billy" style="${style}"><div class="breath"></div></div>`);
    const faces = {};
    let head = null;
    let take = null;
    const arms = [];
    let rest = 'smile';
    let shown = null;
    let talking = 0;
    let z = 1;

    // The new face fades in on top of the old one, which is only hidden once
    // the fade has finished, so the hair never goes see-through halfway
    const show = (f, ms) => {
      if (!head || f === shown) return;
      shown = f;
      const next = faces[f];
      next.getAnimations().forEach((a) => a.cancel());
      next.style.zIndex = ++z;
      next.style.opacity = 1;
      const covered = () => {
        if (shown !== f) return;
        FACES.forEach((k) => {
          if (faces[k] === next) return;
          faces[k].getAnimations().forEach((a) => a.cancel());
          faces[k].style.opacity = 0;
        });
      };
      if (!ms) return covered();
      next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: 'ease' }).finished.then(covered, () => {});
    };
    // A small turn of the head, as people do when a feeling changes
    const react = () => {
      if (!take || still.matches) return;
      const tilt = between(2.5, 4) * (Math.random() < 0.5 ? -1 : 1);
      take.animate([
        { transform: 'none' },
        { transform: `rotate(${tilt}deg) translateY(-1.5%)`, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', offset: 0.35 },
        { transform: 'none', easing: 'cubic-bezier(0.77, 0, 0.175, 1)' },
      ], { duration: 800 });
    };

    const pct = (v, of) => `${(v / of) * 100}%`;
    const addHead = (breath, [x, y, w, ht], W, H) => {
      head = h(`<div class="head" style="left:${pct(x, W)};top:${pct(y, H)};width:${pct(w, W)};height:${pct(ht, H)}"><div class="take"></div></div>`);
      head.style.transformOrigin = '50% 85%';
      take = head.firstElementChild;
      take.style.transformOrigin = '50% 85%';
      FACES.forEach((f) => {
        faces[f] = h(`<img class="face" src="${A}billy/head-${f}.svg" alt="">`);
        take.append(faces[f]);
      });
      breath.append(head);
      show(rest, 0);
    };
    const J = {};
    if (p.rig) {
      const R = `${A}billy/rig/`;
      const joint = (name, ...kids) => {
        const [x, y] = JOINTS[name];
        const j = h(`<div class="j" style="transform-origin:${pct(x, RIG.w)} ${pct(y, RIG.h)}"></div>`);
        j.append(...kids);
        J[name] = j;
        return j;
      };
      const img = (n) => h(`<img src="${R}${n}.svg" alt="">`);
      const breath = el.firstElementChild;
      breath.append(
        joint('shL', img('arm-left-upper-arm'), joint('elL', img('arm-left-forearm'), joint('wrL', img('arm-left-hand')))),
        joint('shR', img('arm-right-upper-arm'), joint('elR', img('arm-right-forearm'), joint('wrR', img('arm-right-hand')))),
        joint('hipL', img('leg-left-thigh'), joint('kneeL', img('leg-left-shin'), joint('ankL', img('leg-left-shoe')))),
        joint('hipR', img('leg-right-thigh'), joint('kneeR', img('leg-right-shin'), joint('ankR', img('leg-right-shoe')))),
        img('shorts'),
        img('torso'),
      );
      addHead(breath, RIG.head, RIG.w, RIG.h);
    }
    if (!p.rig) drawing(pose).then((text) => {
      const vb = h(text).viewBox.baseVal;
      const breath = el.firstElementChild;
      p.arms.forEach(([ids, ax, ay], i) => {
        const arm = layer(text, { keep: ids });
        arm.classList.add('arm', `arm-${i}`);
        arm.style.transformOrigin = `${pct(ax, vb.width)} ${pct(ay, vb.height)}`;
        arms.push(arm);
        breath.append(arm);
      });
      breath.append(layer(text, { drop: [p.head, ...p.arms.flatMap(([ids]) => ids)] }));
      addHead(breath, p.box, vb.width, vb.height);
    });

    // Head and arm settle back once the line is over
    const settle = () => {
      if (head) head.style.transform = '';
      if (pose === 'billy-wave' && arms[0]) arms[0].style.transform = '';
      if (J.shR) J.shR.style.transform = '';
    };
    // Joint motion for the rig, always through transform on its own layer
    const run = (name, frames, opts) => (J[name] && !still.matches ? J[name].animate(frames, opts) : null);
    const ease = 'cubic-bezier(0.77, 0, 0.175, 1)';

    return {
      el,
      // The face she holds between lines, which she turns to with a small
      // turn of the head
      face(f) {
        if (f === rest && !talking) return;
        // A reaction cuts off whatever she was still saying
        rest = f;
        talking = 0;
        settle();
        show(f, 300);
        react();
      },
      // She says the line, word by word, then settles on a face. Returns how
      // long the line takes, so a scene can wait for it.
      say(text, then = rest) {
        const changed = then !== rest;
        rest = then;
        const steps = speech(text);
        const id = ++talking;
        let i = 0;
        const next = () => {
          if (id !== talking || !el.isConnected) return;
          if (i >= steps.length) {
            talking = 0;
            settle();
            show(rest, 300);
            if (changed) react();
            return;
          }
          const [mouth, ms, word] = steps[i++];
          show(still.matches ? 'talk' : mouth, 90);
          // Each new word nudges the head, and her free hand moves with it
          if (word && head && !still.matches) {
            head.style.transform = `rotate(${between(-2.5, 2.5)}deg)`;
            if (pose === 'billy-wave' && arms[0] && !el.classList.contains('wave')) arms[0].style.transform = `rotate(${between(-7, 1)}deg)`;
            // The rig talks with her free hand: a small lift of the right arm
            if (J.shR) J.shR.style.transform = `rotate(${between(-9, -1)}deg)`;
          }
          setTimeout(next, ms);
        };
        next();
        return length(steps);
      },
      // A one-off gesture: wave, cheer or droop
      act(name) {
        if (p.rig) {
          if (name === 'wave') {
            // The upper arm comes out to the side, the forearm points up, then
            // the wave is the forearm rocking at the elbow with a little flick
            // of the wrist. Raising and lowering ease; the waving is even.
            const ms = 2600;
            const up = 0.18;
            const down = 0.82;
            run('shL', [{ transform: 'rotate(0)' }, { transform: 'rotate(105deg)', offset: up, easing: 'linear' }, { transform: 'rotate(105deg)', offset: down, easing: ease }, { transform: 'rotate(0)' }], { duration: ms, easing: ease });
            const elbow = [{ transform: 'rotate(0)', easing: ease }, { transform: 'rotate(70deg)', offset: up, easing: 'ease-in-out' }];
            const wrist = [{ transform: 'rotate(0)' }, { transform: 'rotate(0)', offset: up, easing: 'ease-in-out' }];
            for (let i = 1; i <= 5; i++) {
              const at = up + (i / 6) * (down - up);
              elbow.push({ transform: `rotate(${i % 2 ? 52 : 82}deg)`, offset: at, easing: 'ease-in-out' });
              wrist.push({ transform: `rotate(${i % 2 ? -10 : 10}deg)`, offset: at, easing: 'ease-in-out' });
            }
            elbow.push({ transform: 'rotate(70deg)', offset: down, easing: ease }, { transform: 'rotate(0)' });
            wrist.push({ transform: 'rotate(0)', offset: down }, { transform: 'rotate(0)' });
            run('elL', elbow, { duration: ms });
            run('wrL', wrist, { duration: ms });
          } else if (name === 'cheer') {
            // A small squat with the feet planted (the body lowers while the
            // legs shorten), then arms up in a V and a hop
            const ms = 1000;
            const out = 'cubic-bezier(0.23, 1, 0.32, 1)';
            run('shL', [{ transform: 'rotate(0)' }, { transform: 'rotate(0)', offset: 0.18, easing: out }, { transform: 'rotate(140deg)', offset: 0.45, easing: ease }, { transform: 'rotate(140deg)', offset: 0.7, easing: ease }, { transform: 'rotate(0)' }], { duration: ms });
            run('shR', [{ transform: 'rotate(0)' }, { transform: 'rotate(0)', offset: 0.18, easing: out }, { transform: 'rotate(-140deg)', offset: 0.45, easing: ease }, { transform: 'rotate(-140deg)', offset: 0.7, easing: ease }, { transform: 'rotate(0)' }], { duration: ms });
            run('elL', [{ transform: 'rotate(0)' }, { transform: 'rotate(0)', offset: 0.18 }, { transform: 'rotate(25deg)', offset: 0.45 }, { transform: 'rotate(25deg)', offset: 0.7 }, { transform: 'rotate(0)' }], { duration: ms, easing: 'ease-in-out' });
            run('elR', [{ transform: 'rotate(0)' }, { transform: 'rotate(0)', offset: 0.18 }, { transform: 'rotate(-25deg)', offset: 0.45 }, { transform: 'rotate(-25deg)', offset: 0.7 }, { transform: 'rotate(0)' }], { duration: ms, easing: 'ease-in-out' });
            ['hipL', 'hipR'].forEach((k) => run(k, [{ transform: 'none' }, { transform: 'scaleY(0.955)', offset: 0.18, easing: out }, { transform: 'none', offset: 0.34 }, { transform: 'none', offset: 0.8 }, { transform: 'scaleY(0.97)', offset: 0.88, easing: out }, { transform: 'none' }], { duration: ms }));
            if (!still.matches) el.firstElementChild.animate([
              { transform: 'none' },
              { transform: 'translateY(1.4%)', offset: 0.18, easing: out },
              { transform: 'translateY(-4%)', offset: 0.48, easing: 'cubic-bezier(0.33, 0, 0.67, 1)' },
              { transform: 'none', offset: 0.8, easing: out },
              { transform: 'translateY(0.9%)', offset: 0.88, easing: out },
              { transform: 'none' },
            ], { duration: ms });
          } else if (name === 'droop') {
            run('shL', [{ transform: 'none' }, { transform: 'rotate(-6deg)', offset: 0.3 }, { transform: 'rotate(-6deg)', offset: 0.7 }, { transform: 'none' }], { duration: 1200, easing: ease });
            run('shR', [{ transform: 'none' }, { transform: 'rotate(6deg)', offset: 0.3 }, { transform: 'rotate(6deg)', offset: 0.7 }, { transform: 'none' }], { duration: 1200, easing: ease });
          }
          return;
        }
        el.classList.remove('wave', 'cheer', 'droop');
        void el.offsetWidth;
        el.classList.add(name);
        clearTimeout(el.acting);
        el.acting = setTimeout(() => el.classList.remove(name), 2200);
      },
      // The rig walks in from `from` px to her place: legs step in turn, arms
      // swing against them and the body bobs once a step. Resolves on arrival.
      walkIn(from, ms) {
        if (!p.rig || still.matches) return Promise.resolve();
        // A front-on walk: each foot lifts a little in turn, the body sways
        // from the feet toward the standing leg and bobs twice a cycle, and
        // the arms swing gently, mirrored and against the legs
        const step = 560;
        const n = Math.max(1, Math.round(ms / step));
        const o = { duration: step, iterations: n, easing: 'ease-in-out' };
        run('hipL', [{ transform: 'none' }, { transform: 'translateY(-1.6%) rotate(2deg)', offset: 0.25 }, { transform: 'none', offset: 0.5 }, { transform: 'none' }], o);
        run('hipR', [{ transform: 'none' }, { transform: 'none', offset: 0.5 }, { transform: 'translateY(-1.6%) rotate(-2deg)', offset: 0.75 }, { transform: 'none' }], o);
        run('shL', [{ transform: 'rotate(0)' }, { transform: 'rotate(-5deg)', offset: 0.25 }, { transform: 'rotate(0)', offset: 0.5 }, { transform: 'rotate(4deg)', offset: 0.75 }, { transform: 'rotate(0)' }], o);
        run('shR', [{ transform: 'rotate(0)' }, { transform: 'rotate(-4deg)', offset: 0.25 }, { transform: 'rotate(0)', offset: 0.5 }, { transform: 'rotate(5deg)', offset: 0.75 }, { transform: 'rotate(0)' }], o);
        el.firstElementChild.animate([
          { transform: 'none' },
          { transform: 'translateY(-0.8%) rotate(-1.2deg)', offset: 0.25 },
          { transform: 'none', offset: 0.5 },
          { transform: 'translateY(-0.8%) rotate(1.2deg)', offset: 0.75 },
          { transform: 'none' },
        ], o);
        // The travel eases out over the last step, so she arrives rather than stops
        return el.animate([{ transform: `translateX(${from}px)` }, { transform: 'none' }], { duration: n * step, easing: 'cubic-bezier(0.25, 0.1, 0.4, 1)' }).finished.then(() => {}, () => {});
      },
    };
  }

  // Buddy is drawn from the dog pack, one pose per mood: sitting, excited and
  // begging. Poses change at the bottom of a little squash, so the cut reads
  // as a hop rather than a jump cut. Sizes are in the pack's units.
  const BUDDY = { sit: [189, 188], yay: [163, 194], beg: [110, 227] };
  Object.keys(BUDDY).forEach((b) => { new Image().src = `${A}buddy/${b}.svg`; });

  function buddy(style, k = 2) {
    const el = h(`<div class="buddy abs" role="img" aria-label="Buddy" style="${style}">
      <div class="hopper"><div class="bob"><div class="breath">
        ${Object.entries(BUDDY).map(([b, [w]]) => `<img class="pose" data-p="${b}" src="${A}buddy/${b}.svg" alt="" style="width:${w * k}px">`).join('')}
      </div></div></div>
    </div>`);
    const hopper = el.querySelector('.hopper');
    const bob = el.querySelector('.bob');
    const poses = Object.fromEntries([...el.querySelectorAll('.pose')].map((i) => [i.dataset.p, i]));
    let cur = null;
    let talking = 0;
    const swap = (b) => Object.entries(poses).forEach(([n, i]) => { i.style.opacity = n === b ? 1 : 0; });

    const api = {
      el,
      pose(b) {
        if (b === cur) return;
        const first = cur === null;
        cur = b;
        if (first) return swap(b);
        if (still.matches) {
          Object.values(poses).forEach((i) => { i.style.transition = 'opacity 150ms ease'; });
          return swap(b);
        }
        hopper.animate([
          { transform: 'none' },
          { transform: 'scale(1.07, 0.9)', easing: 'cubic-bezier(0.23, 1, 0.32, 1)', offset: 0.28 },
          { transform: 'translateY(-7%) scale(0.97, 1.04)', easing: 'cubic-bezier(0.77, 0, 0.175, 1)', offset: 0.62 },
          { transform: 'none' },
        ], { duration: 480, easing: 'cubic-bezier(0.77, 0, 0.175, 1)' });
        setTimeout(() => swap(b), 480 * 0.28);
      },
      // His pose carries the face; while he talks he bobs once per word
      say(text) {
        const steps = speech(text);
        const id = ++talking;
        let t = 0;
        steps.forEach(([, ms, word]) => {
          if (word && !still.matches) setTimeout(() => {
            if (id !== talking || !el.isConnected) return;
            bob.animate([
              { transform: 'none' },
              { transform: `translateY(-2.5%) rotate(${between(-2, 2)}deg)`, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', offset: 0.4 },
              { transform: 'none' },
            ], { duration: 420, easing: 'cubic-bezier(0.77, 0, 0.175, 1)' });
          }, t);
          t += ms;
        });
        return length(steps);
      },
    };
    api.pose('sit');
    return api;
  }

  let timer = null;
  let keyHandler = null;
  function clearScreen() {
    clearInterval(timer);
    timer = null;
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
    sound.zooStop();
    stage.replaceChildren();
  }
  function onKey(fn) {
    keyHandler = fn;
    document.addEventListener('keydown', fn);
  }

  const store = {
    get(k, d) { try { const v = localStorage.getItem('bb:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('bb:' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };

  // Rigs that name their legs by shape (the pack's crocodile) take the
  // outlines from the SVG itself; until that has loaded the animal just
  // walks without its legs moving
  Object.entries(window.ZOO_RIG || {}).forEach(([name, rig]) => {
    if (!rig.legs.some((l) => l.paths)) return;
    fetch(`${A}zoo/${name}.svg`).then((r) => r.text()).then((text) => {
      const paths = new DOMParser().parseFromString(text, 'image/svg+xml').querySelectorAll('path');
      rig.legs.forEach((l) => { l.d = l.paths.map((i) => paths[i].getAttribute('d')).join(' '); });
    }).catch(() => {});
  });

  // ---- sound ---------------------------------------------------------------
  // Recorded CC0 sounds from Freesound (credits in assets/sounds/CREDITS.md),
  // played through Web Audio so the short UI sounds start without delay.
  // The zoo's Level Intro loops a zoo recording and drops in an animal
  // call every 7 to 14 seconds; the UI has a pop on card hover, a click on
  // buttons and a whoosh on the title's Play. One mute covers all of it and
  // is remembered.
  const sound = (() => {
    const SRC = `${A}sounds/`;
    // The button click is a short WAV; the rest are MP3
    const file = (name) => `${SRC}${name}.${name === 'click' ? 'wav' : 'mp3'}`;
    let ctx = null;
    const buffers = {};
    let bed = null;
    let timers = [];
    const rand = (a, b) => a + Math.random() * (b - a);
    const muted = () => store.get('muted', false);

    function audio() {
      if (!ctx) {
        try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function load(name) {
      if (!buffers[name]) {
        buffers[name] = fetch(file(name))
          .then((r) => r.arrayBuffer())
          .then((b) => audio().decodeAudioData(b))
          .catch(() => null);
      }
      return buffers[name];
    }
    // Starts a buffer at a volume; returns its gain so it can be faded
    async function play(name, vol, opts = {}) {
      if (muted() || !audio()) return null;
      const buf = await load(name);
      if (!buf || muted()) return null;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = !!opts.loop;
      const g = ctx.createGain();
      g.gain.value = opts.fadeIn ? 0 : vol;
      if (opts.fadeIn) g.gain.linearRampToValueAtTime(vol, ctx.currentTime + opts.fadeIn);
      src.connect(g).connect(ctx.destination);
      src.start();
      return { src, g };
    }
    // Short synthesised blips for the falling item: a soft tick per row and
    // a low thud when it drops into a basket
    function blip(freq, ms, vol, endFreq = freq) {
      if (muted() || !audio()) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(endFreq, t + ms / 1000);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + ms / 1000 + 0.02);
    }
    // Ambience for the levels without recordings, made here: the party is a
    // music-box "Happy Birthday" (public domain) with the odd party popper,
    // the hike is wind with birds calling now and then. Both run through one
    // gain, so they fade in and out as one.
    let amb = null;
    const note = (out, freq, at, len, vol) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(vol, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + len);
      o.connect(g).connect(out);
      o.start(at);
      o.stop(at + len + 0.05);
    };
    const noise = (sec) => {
      const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return b;
    };
    // Happy Birthday as [semitones from C5, beats]
    const TUNE = [[-5, .75], [-5, .25], [-3, 1], [-5, 1], [0, 1], [-1, 2], [-5, .75], [-5, .25], [-3, 1], [-5, 1], [2, 1], [0, 2],
      [-5, .75], [-5, .25], [7, 1], [4, 1], [0, 1], [-1, 1], [-3, 2], [5, .75], [5, .25], [4, 1], [0, 1], [2, 1], [0, 3]];
    const AMBIENCE = {
      party(out) {
        const beat = 0.42;
        const loop = () => {
          if (!amb) return;
          let t = ctx.currentTime + 0.1;
          TUNE.forEach(([n, b]) => {
            const f = 523.25 * 2 ** (n / 12);
            note(out, f, t, Math.min(1.2, b * beat * 1.6), 0.07);
            note(out, f * 2, t, 0.25, 0.015);
            t += b * beat;
          });
          timers.push(setTimeout(loop, (t - ctx.currentTime + 1.6) * 1000));
        };
        const pop = () => {
          if (!amb) return;
          const src = ctx.createBufferSource();
          src.buffer = noise(0.3);
          const f = ctx.createBiquadFilter();
          f.type = 'highpass';
          f.frequency.value = 1800;
          const g = ctx.createGain();
          const t = ctx.currentTime;
          g.gain.setValueAtTime(0.12, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
          src.connect(f).connect(g).connect(out);
          src.start(t);
          timers.push(setTimeout(pop, rand(6000, 11000)));
        };
        loop();
        timers.push(setTimeout(pop, rand(3000, 5000)));
      },
      // A mountain morning: a light, airy breeze that rises and falls, and
      // birds all around, some close and chirpy, some further off singing
      // longer warbles, with a two-note call echoing across the valley
      hike(out) {
        const src = ctx.createBufferSource();
        src.buffer = noise(4);
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 900;
        f.Q.value = 0.4;
        const g = ctx.createGain();
        g.gain.value = 0.025;
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        lfo.frequency.value = 0.08;
        depth.gain.value = 0.018;
        lfo.connect(depth).connect(g.gain);
        src.connect(f).connect(g).connect(out);
        src.start();
        lfo.start();
        amb.nodes.push(src, lfo);
        // One bird note: a quick sweep with its own loudness and pan
        const tweet = (t, from, to, len, vol, pan) => {
          const o = ctx.createOscillator();
          const e = ctx.createGain();
          const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
          o.type = 'sine';
          o.frequency.setValueAtTime(from, t);
          o.frequency.exponentialRampToValueAtTime(to, t + len * 0.8);
          e.gain.setValueAtTime(0, t);
          e.gain.linearRampToValueAtTime(vol, t + 0.012);
          e.gain.exponentialRampToValueAtTime(0.0001, t + len);
          if (p) { p.pan.value = pan; o.connect(e).connect(p).connect(out); } else o.connect(e).connect(out);
          o.start(t);
          o.stop(t + len + 0.03);
        };
        // A nearby bird: a burst of short bright chirps
        const chirps = () => {
          if (!amb) return;
          let t = ctx.currentTime + 0.05;
          const base = rand(2600, 3600);
          const pan = rand(-0.8, 0.8);
          for (let i = 0, n = 3 + Math.floor(Math.random() * 4); i < n; i++) {
            tweet(t, base, base * rand(1.3, 1.6), 0.08, 0.05, pan);
            t += rand(0.09, 0.15);
          }
          timers.push(setTimeout(chirps, rand(1800, 4200)));
        };
        // A bird further off: a softer rising and falling warble
        const song = () => {
          if (!amb) return;
          let t = ctx.currentTime + 0.05;
          const base = rand(1800, 2400);
          const pan = rand(-0.6, 0.6);
          for (let i = 0; i < 8; i++) {
            const up = i % 2 === 0;
            tweet(t, base * (up ? 1 : 1.35), base * (up ? 1.35 : 1.05), 0.13, 0.025, pan);
            t += 0.11;
          }
          timers.push(setTimeout(song, rand(5000, 9000)));
        };
        // A two-note call across the valley, answered more quietly
        const call = () => {
          if (!amb) return;
          const t = ctx.currentTime + 0.05;
          tweet(t, 1320, 1250, 0.35, 0.03, -0.5);
          tweet(t + 0.42, 1050, 990, 0.45, 0.03, -0.5);
          tweet(t + 1.3, 1320, 1250, 0.35, 0.012, 0.6);
          tweet(t + 1.72, 1050, 990, 0.45, 0.012, 0.6);
          timers.push(setTimeout(call, rand(9000, 15000)));
        };
        timers.push(setTimeout(chirps, 600), setTimeout(song, 2400), setTimeout(call, 4000));
      },
    };
    const CALLS = [['elephant', 0.5], ['parrot', 0.5], ['lion', 0.3]];
    function call() {
      const [name, vol] = CALLS[Math.floor(Math.random() * CALLS.length)];
      play(name, vol);
      timers.push(setTimeout(call, rand(7000, 14000)));
    }

    return {
      muted,
      file,
      ui(name) { play(name, name === 'whoosh' ? 0.6 : 0.5); },
      tick() { blip(900, 40, 0.05, 700); },
      thud() { blip(220, 180, 0.22, 70); },
      // Affordance sounds for a sort: right is a bright rising pair (a fifth
      // for a need, a third for a want, so the two baskets sound different);
      // wrong is a soft falling "bwomp", gentle rather than a buzzer
      right(kind) {
        const [a, b] = kind === 'need' ? [660, 990] : [660, 830];
        blip(a, 140, 0.16);
        setTimeout(() => blip(b, 260, 0.16), 110);
      },
      wrong() {
        blip(330, 220, 0.14, 250);
        setTimeout(() => blip(250, 320, 0.14, 160), 170);
      },
      async zooStart() {
        if (muted() || bed) return;
        bed = 'starting';
        const b = await play('zoo', 0.6, { loop: true, fadeIn: 1.2 });
        if (bed !== 'starting') { if (b) b.src.stop(); return; }
        bed = b;
        timers.push(setTimeout(call, rand(2500, 5000)));
        CALLS.forEach(([n]) => load(n));
      },
      // A level's ambience: the zoo's recordings, or one made here
      bedStart(id) {
        if (id === 'zoo') return this.zooStart();
        if (muted() || amb || !AMBIENCE[id] || !audio()) return;
        const out = ctx.createGain();
        out.gain.setValueAtTime(0, ctx.currentTime);
        out.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
        out.connect(ctx.destination);
        amb = { out, nodes: [] };
        AMBIENCE[id](out);
      },
      zooStop() {
        timers.forEach(clearTimeout);
        timers = [];
        if (amb) {
          const { out, nodes } = amb;
          out.gain.cancelScheduledValues(ctx.currentTime);
          out.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
          nodes.forEach((n) => n.stop(ctx.currentTime + 0.6));
          setTimeout(() => out.disconnect(), 800);
          amb = null;
        }
        if (bed && bed !== 'starting') {
          const { src, g } = bed;
          g.gain.cancelScheduledValues(ctx.currentTime);
          g.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
          src.stop(ctx.currentTime + 0.6);
        }
        bed = null;
      },
      toggle(level) {
        store.set('muted', !muted());
        if (muted()) this.zooStop(); else if (level) this.bedStart(level);
        return !muted();
      },
    };
  })();
  ['hover', 'click', 'whoosh'].forEach((n) => setTimeout(() => fetch(sound.file(n)), 0));
  // Every shared button clicks, wherever it is
  document.addEventListener('click', (e) => { if (e.target.closest('button.btn')) sound.ui('click'); });

  // Deep links let the case study open a screen directly: #menu, #play/zoo, #checkout/zoo
  function route() {
    const [screen, id] = location.hash.replace('#', '').split('/');
    const sc = SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];
    if (screen === 'menu') return menu();
    if (screen === 'story') return story(sc);
    if (screen === 'play') return sorting(sc);
    if (screen === 'checkout') return checkout(sc);
    intro();
  }

  // ---- screens -------------------------------------------------------------
  function intro() {
    clearScreen();
    // Built from the Figma Intro layers so each one can animate on its own:
    // the bushes rise, the logo spins in, the banner slides up, the play button
    // slides in from the right, then the bone wiggles until the player presses
    // play. The horizon bushes sit before the ground so it hides them as they rise.
    const I = `${A}intro/`;
    const el = h(`<section class="screen intro" aria-label="Title screen">
      <img class="abs" src="${I}sky.svg" alt="" style="left:0;top:0;width:1512px;height:979px">
      <img class="intro-bush far-left" src="${I}bush-far-left.svg" alt="" style="left:-141px;top:577px;width:344px;height:108px">
      <img class="intro-bush far-right" src="${I}bush-far-right.svg" alt="" style="left:992px;top:456px;width:718px;height:230px">
      <img class="abs" src="${I}ground.svg" alt="" style="left:-85px;top:684px;width:1656px;height:434px">
      <img class="intro-bush left" src="${I}bush-left.svg" alt="" style="left:-81px;top:752px;width:773px;height:232px">
      <img class="intro-bush right" src="${I}bush-right.svg" alt="" style="left:1144px;top:851px;width:592px;height:231px">
      <div class="intro-logo">
        <img src="${I}logo.svg" alt="Billy and Buddy">
        <img class="intro-bone" src="${I}bone.svg" alt="">
      </div>
      <img class="intro-banner" src="${I}banner.svg" alt="Basket of choices">
      <button class="intro-play" aria-label="Play"><img src="${I}play.svg" alt=""></button>
    </section>`);
    // Hold the sequence until every layer has decoded, so nothing pops in late
    Promise.all([...el.querySelectorAll('img')].map((img) => img.decode().catch(() => {})))
      .then(() => el.classList.add('ready'));
    // Shrink the title into the menu's logo, then fade the menu in over it
    let leaving = false;
    const start = () => {
      if (leaving) return;
      leaving = true;
      sound.ui('whoosh');
      el.classList.add('leaving');
      setTimeout(() => {
        menu();
        const next = stage.firstElementChild;
        // Re-inserting restarts CSS animations, so freeze it in its landed state first
        el.classList.add('gone');
        stage.prepend(el);
        next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease-out' })
          .finished.then(() => el.remove());
      }, 460);
    };
    el.querySelector('.intro-play').addEventListener('click', start);
    stage.append(el);
    onKey((e) => { if (e.key === 'Enter' || e.key === ' ') start(); });
  }

  function menu() {
    clearScreen();
    const done = store.get('done', {});
    const saved = store.get('saved', 0);
    const change = store.get('lastChange', null);
    store.set('lastChange', null);
    const I = `${A}intro/`;
    const M = `${A}menu/`;
    // The logo is the title screen's own layers at 0.0901 scale, which is where
    // the title's exit lands them, so the hand-off from the title is seamless
    const el = h(`<section class="screen" aria-label="Choose a scenario">
      <img class="bg" src="${A}bg/menu.jpg" alt="">
      <div class="menu-logo" role="img" aria-label="Billy and Buddy, Basket of choices">
        <img src="${I}logo.svg" alt="" style="left:0;top:0;width:754.68px;height:463.41px">
        <img src="${I}bone.svg" alt="" style="left:346px;top:284px;width:74px;height:112px">
        <img src="${I}banner.svg" alt="" style="left:67px;top:444.9px;width:623px;height:154.87px">
      </div>
      <div class="btn-row menu-ui" style="right:30px;top:30px">
        <span class="btn btn-sm wallet" title="Your money"><img class="btn-ico" src="${M}money.svg" alt=""><span class="amount">${money(change ? change.from : saved)}</span>${change && change.to !== change.from ? `<span class="delta ${change.to < change.from ? 'down' : ''}">${change.to > change.from ? '+' : '−'}${money(Math.abs(change.to - change.from))}</span>` : ''}</span>
        <span class="btn btn-sm" title="Not in this prototype"><img class="btn-ico" src="${M}cart.png" alt="">SHOP</span>
      </div>
      <span class="btn btn-sm abs menu-ui" title="Not in this prototype" style="left:30px;bottom:34px"><img class="btn-ico ico-settings" src="${M}settings.svg" alt="">SETTING</span>
      <span class="btn btn-sm abs menu-ui" title="Not in this prototype" style="right:30px;bottom:34px"><img class="btn-ico ico-person" src="${M}person.svg" alt="">PROFILE</span>
    </section>`);
    // Each card is a button: its face presses down and springs back when
    // clicked. Cards spawn one after another. A level unlocks once the one
    // before it is finished, as in the Main Menu frame.
    SCENARIOS.forEach((sc, i) => {
      const prev = SCENARIOS[i - 1];
      const locked = prev && !done[prev.id];
      const card = h(`<button class="menu-card${locked ? ' locked' : ''}" style="left:${[139, 575, 1012][i]}px;--i:${i}" aria-label="${locked ? `${sc.title}, locked. Finish ${prev.title} to unlock it.` : `Play ${sc.title}`}">
        <span class="face">
          <img class="art" src="${sc.card}" alt="">
          ${locked ? '<span class="veil"></span>' : ''}
          <span class="tag">${sc.title}</span>
          ${done[sc.id] ? `<span class="done" aria-label="Best: ${Math.min(done[sc.id], 3)} of 3 stars">${'★'.repeat(Math.min(done[sc.id], 3))}${'☆'.repeat(3 - Math.min(done[sc.id], 3))}</span>` : ''}
          <span class="play-pop"><span class="play btn btn-md btn-icon">${locked ? `<img class="btn-ico ico-lock" src="${A}menu/lock.svg" alt="">` : PLAY_ICON}</span></span>
        </span>
      </button>`);
      let going = false;
      // The pop plays only for a real mouse; a tap fires a hover too
      card.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !locked) sound.ui('hover'); });
      card.addEventListener('click', () => {
        // A locked card says no with a shake of its lock
        if (locked) {
          const lock = card.querySelector('.play');
          lock.getAnimations().forEach((a) => a.cancel());
          if (!still.matches) lock.animate([
            { transform: 'none' }, { transform: 'translateX(-6px) rotate(-8deg)' }, { transform: 'translateX(5px) rotate(6deg)' },
            { transform: 'translateX(-3px) rotate(-3deg)' }, { transform: 'none' },
          ], { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
          return;
        }
        if (going) return;
        going = true;
        sound.ui('click');
        card.classList.add('pressing');
        setTimeout(() => levelIntro(sc), 240);
      });
      el.append(card);
    });
    stage.append(el);
    // After a round the wallet counts from the old total to the new one
    if (change && change.to !== change.from) {
      const amount = el.querySelector('.wallet .amount');
      const t0 = performance.now() + 500;
      const ms = 700;
      const step = (now) => {
        if (!amount.isConnected) return;
        const k = Math.min(1, Math.max(0, (now - t0) / ms));
        amount.textContent = money(Math.round(change.from + (change.to - change.from) * (1 - (1 - k) ** 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }

  function levelIntro(sc) {
    clearScreen();
    // A scenario with a layered scene gets its animals and its ambience;
    // the others keep their flat backdrop
    const scene = sc.scene
      ? `<div class="scene" style="background:${sc.scene.bg}">${sc.scene.layers.map(([file, x, y, w, ht, motion, mirrored]) => {
        const box = `left:${x}px;top:${y}px;width:${w}px;height:${ht}px`;
        if (file === 'ground') return `<div class="abs" style="${box};background:#DDA582"></div>`;
        const src = `${A}zoo/${file}`;
        if (motion === 'leaves') return `<div class="layer leaves" style="${box}" data-leaves="${src}"></div>`;
        const rig = window.ZOO_RIG && window.ZOO_RIG[file.replace('.svg', '')];
        if (!rig || rig.legs.some((l) => !l.d)) return `<div class="layer ${motion || ''}" style="${box}"><img class="${mirrored ? 'mirrored' : ''}" src="${src}" alt=""></div>`;
        // A rigged animal: the body with its legs masked out, then one copy of
        // the drawing per leg, masked to it and swung from its hip.
        // Leg and hole share one outline, stroked a little wider than the leg
        // so neither a hairline of the old leg edge nor a gap is left behind.
        // The hole only starts just below the hip: above it the body stays
        // whole and the leg's top overlaps it, so the joint never opens.
        const ox = rig.x || 0;
        const oy = rig.y || 0;
        const k = w / rig.w; // drawing units to layer pixels
        const svg = (inner) => `url(&quot;data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ox} ${oy} ${rig.w} ${rig.h}" preserveAspectRatio="none">${inner}</svg>`)}&quot;)`;
        const outline = (l, colour) => `<path d="${l.d}" fill="${colour}" stroke="${colour}" stroke-width="2.5" stroke-linejoin="round"/>`;
        const below = rig.legs.map((l, i) => `<clipPath id="b${i}"><rect x="${ox - 10}" y="${l.at[1] + 6}" width="${rig.w + 20}" height="${rig.h}"/></clipPath>`).join('');
        const holes = rig.legs.map((l, i) => `<g clip-path="url(#b${i})">${outline(l, '#000')}</g>`).join('');
        const full = `x="${ox}" y="${oy}" width="${rig.w}" height="${rig.h}"`;
        const bodyMask = svg(`<defs>${below}<mask id="m" maskUnits="userSpaceOnUse" ${full}><rect ${full} fill="#fff"/>${holes}</mask></defs><rect ${full} mask="url(#m)"/>`);
        const legs = rig.legs.map((l) => `<img class="leg beat-${l.beat}" src="${src}" alt="" style="--mask:${svg(outline(l, '#000'))};transform-origin:${(l.at[0] - ox) * k}px ${(l.at[1] - oy) * k}px">`).join('');
        return `<div class="layer ${motion || ''}" style="${box}"><div class="stride${mirrored ? ' mirrored' : ''}">
          <img class="body" src="${src}" alt="" style="--mask:${bodyMask}">${legs}
        </div></div>`;
      }).join('')}</div>`
      : `<img class="bg" src="${sc.intro || sc.backdrop}" alt="">${sc.patch || ''}`;
    const el = h(`<section class="screen" aria-label="${sc.title}">
      ${scene}
      <button class="btn btn-sm btn-icon teal abs back" aria-label="Back to levels" style="left:30px;top:30px"><img class="btn-ico" src="${A}menu/back.svg" alt=""></button>
      <button class="btn btn-xl teal abs" style="left:620px;top:775px;width:272px">Play ${PLAY_ICON}</button>
      <button class="btn btn-sm btn-icon teal abs mute" style="right:30px;top:30px"></button>
    </section>`);
    if (sc.introCast) {
      const b = billy('full', sc.introCast.billy);
      const d = buddy(...sc.introCast.buddy);
      el.querySelector('.bg').after(b.el, d.el);
      setTimeout(() => b.act('wave'), 500);
    }
    el.querySelector('.btn-xl').addEventListener('click', () => story(sc));
    el.querySelector('.back').addEventListener('click', menu);
    const mute = el.querySelector('.mute');
    if (mute) {
      const show = (on) => {
        mute.innerHTML = `<img class="btn-ico" src="${A}menu/sound-${on ? 'on' : 'off'}.svg" alt="">`;
        mute.setAttribute('aria-label', on ? 'Mute sounds' : 'Turn sounds on');
      };
      show(!sound.muted());
      mute.addEventListener('click', () => show(sound.toggle(sc.id)));
      sound.bedStart(sc.id);
      if (sc.scene) el.querySelectorAll('[data-leaves]').forEach(growLeaves);
    }
    stage.append(el);
    el.querySelector('.btn-xl').focus();

  }


  // Lifts shapes out of an inline SVG onto their own small <svg> layers,
  // positioned over the original. Motion on shapes inside an SVG repaints the
  // whole drawing on the main thread every frame; a layer of its own moves on
  // the compositor. Each layer is cropped to its shape, keeps the shape's
  // ancestor transforms and the drawing's defs, and starts out where it was.
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function liftShapes(svg, nodes) {
    const vb = svg.viewBox.baseVal;
    const sr = svg.getBoundingClientRect();
    const kx = vb.width / sr.width;
    const ky = vb.height / sr.height;
    const defs = svg.querySelector('defs');
    const pad = 2;
    const boxes = nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return { x: vb.x + (r.left - sr.left) * kx - pad, y: vb.y + (r.top - sr.top) * ky - pad, w: r.width * kx + pad * 2, h: r.height * ky + pad * 2 };
    });
    return nodes.map((n, i) => {
      const { x, y, w, h: ht } = boxes[i];
      const layer = document.createElementNS(SVG_NS, 'svg');
      layer.setAttribute('viewBox', `${x} ${y} ${w} ${ht}`);
      layer.setAttribute('overflow', 'visible');
      layer.style.cssText = `position:absolute;left:${((x - vb.x) / vb.width) * 100}%;top:${((y - vb.y) / vb.height) * 100}%;width:${(w / vb.width) * 100}%;height:${(ht / vb.height) * 100}%`;
      if (defs) layer.append(defs.cloneNode(true));
      let parent = layer;
      const chain = [];
      for (let a = n.parentNode; a && a !== svg; a = a.parentNode) chain.unshift(a);
      chain.forEach((a) => {
        const c = a.cloneNode(false);
        c.removeAttribute('id');
        parent.append(c);
        parent = c;
      });
      parent.append(n.cloneNode(true));
      n.remove();
      layer.box = boxes[i];
      return layer;
    });
  }

  // A plant from the pack, with every leaf on a layer of its own so each can
  // sway about the point nearest the plant's root, at its own pace
  const svgText = {};
  async function growLeaves(box) {
    const src = box.dataset.leaves;
    svgText[src] = svgText[src] || fetch(src).then((r) => r.text());
    box.innerHTML = await svgText[src];
    const svg = box.querySelector('svg');
    if (!svg || !box.isConnected) return;
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    const vb = svg.viewBox.baseVal;
    const rootX = vb.x + vb.width / 2;
    const rootY = vb.y + vb.height;
    const leaves = liftShapes(svg, [...svg.querySelectorAll('path, polygon, ellipse, circle')]);
    leaves.forEach((l, i) => {
      const b = l.box;
      const fx = (Math.min(Math.max(rootX, b.x), b.x + b.w) - b.x) / (b.w || 1);
      const fy = (Math.min(Math.max(rootY, b.y), b.y + b.h) - b.y) / (b.h || 1);
      l.classList.add('leaf');
      l.style.transformOrigin = `${fx * 100}% ${fy * 100}%`;
      l.style.animationDuration = `${2.6 + ((i * 7) % 11) / 6}s`;
      l.style.animationDelay = `${-((i * 13) % 17) / 5}s`;
    });
    box.replaceChildren(...leaves);
  }

  // Four lines of story that play on their own, then the rules. Each line
  // stays up for about as long as it takes to read aloud. Nothing on the
  // screen advances it; the Skip button jumps straight to the rules.
  function story(sc) {
    clearScreen();
    let step = 0;
    let wait = null;
    const el = h(`<section class="screen" aria-label="Story">
      <img class="bg" src="${sc.backdrop}" alt="">
      ${sc.patch || ''}
      <div class="dim"></div>
      <div class="lines"></div>
      <button class="btn btn-sm teal abs skip" style="right:30px;top:30px">Skip</button>
    </section>`);
    const lines = el.querySelector('.lines');
    const b = billy('full', 'left:1200px;top:206px;width:205px');
    const d = buddy('left:10px;top:500px;width:400px;height:472px');
    lines.before(d.el, b.el);
    const next = () => {
      clearTimeout(wait);
      if (step && !el.isConnected) return;
      if (step >= sc.story.length) return rules(sc);
      const [who, text, face, pose] = sc.story[step];
      // Billy speaks from the right, Buddy from the left, as in the frames
      const pos = who === 'billy'
        ? (step < 2 ? 'left:684px;top:303px' : 'left:684px;top:240px')
        : (step < 2 ? 'left:400px;top:574px' : 'left:400px;top:540px');
      if (step === 2) lines.replaceChildren();
      lines.append(h(`<div class="bubble big" style="${pos};width:481px">${text}</div>`));
      let speak;
      if (who === 'billy') {
        // Buddy sits and listens while Billy talks
        d.pose('sit');
        speak = b.say(text, 'smile');
        if (step === 0) b.act('wave');
      } else {
        d.pose(pose || 'yay');
        speak = d.say(text);
        // Billy hears him first, then her face answers
        const at = step;
        setTimeout(() => { if (step === at + 1) b.face(face || 'happy'); }, 700);
      }
      step++;
      // Then a beat to finish reading before the next line
      wait = setTimeout(next, speak + 1300);
    };
    // Skip ends the whole conversation and goes to the rules
    const skip = el.querySelector('.skip');
    skip.addEventListener('click', () => {
      clearTimeout(wait);
      rules(sc);
    });
    onKey((e) => { if (e.key === 'Escape') skip.click(); });
    stage.append(el);
    // Billy walks in from off the right, then the first line starts
    b.walkIn(460, 1560).then(() => { if (!step && el.isConnected) next(); });
  }

  // The instructions come one phase at a time: the sorting rules before
  // sorting, the checkout rules only once the child gets there
  const PHASES = [
    {
      title: 'Sort the shopping',
      lines: (sc) => [
        'Steer each falling item with <b>←</b> and <b>→</b> into <b>Needs</b> or <b>Wants</b>.',
        'You have <b>3 lives</b>. A wrong basket costs a life.',
        '<b>Billy</b> will give you hints to help you choose.',
      ],
      bg: (sc) => `<img class="bg" src="${sc.backdrop}" alt="">${sc.patch || ''}`,
      go: (sc) => sorting(sc),
    },
    {
      title: 'Pay at the checkout',
      lines: (sc) => [
        `Put everything we <b>need</b> for ${sc.occasion} on the belt.`,
        `Drag items from the cart onto the belt. You have <b>${money(sc.budget)}</b> to spend.`,
        'Money you do not spend is <b>saved</b> for the shop.',
      ],
      bg: () => `<img class="bg" src="${A}bg/checkout.jpg" alt="">`,
      go: (sc) => checkout(sc),
    },
  ];
  function rules(sc, phase = 0) {
    clearScreen();
    const ph = PHASES[phase];
    const dots = ['var(--teal)', 'var(--yellow)', 'var(--red)'];
    const el = h(`<section class="screen" aria-label="${ph.title}">
      ${ph.bg(sc)}
      <div class="dim"></div>
      <div class="rule-card">
        <p class="phase">Part ${phase + 1} of ${PHASES.length}</p>
        <h2>${ph.title}</h2>
        <ul>
          ${ph.lines(sc).map((t, i) => `<li><span class="dot" style="background:${dots[i]}">${i + 1}</span><span>${t}</span></li>`).join('')}
        </ul>
        <button class="btn btn-lg teal" style="width:300px">Start ${PLAY_ICON}</button>
      </div>
    </section>`);
    el.querySelector('button').addEventListener('click', () => ph.go(sc));
    stage.append(el);
    el.querySelector('button').focus();
  }

  // ---- part one: sorting ---------------------------------------------------
  // One item at a time falls like a Tetris piece: it appears in a random
  // column along the top, drops a row at a time under gravity and moves one
  // column per press of ← or →. When it reaches the baskets it waits a
  // moment (the lock delay) so the child can still slide it, then drops into
  // whichever basket is under it: the left three columns are Needs, the right
  // three Wants. A wrong basket costs a life, but the item still goes in the
  // cart: the child has just been told the right answer, so it never repeats.
  // Each fall takes a random 5 to 9 seconds; this phase has no clock.
  const COLS = 6;
  const COL_W = 1092 / COLS;
  const ROWS = 12;
  const ROW_H = 46;
  const LOCK_DELAY = 600;
  const sideOf = (col) => (col < COLS / 2 ? 'need' : 'want');
  function sorting(sc) {
    clearScreen();
    // In demo order needs and wants alternate, so a clip shows both baskets
    const interleave = (a) => a.filter((x) => x.kind === 'need').flatMap((x, i) => [x, a.filter((y) => y.kind === 'want')[i]]).filter(Boolean);
    let queue = DEMO ? interleave(sc.items) : shuffle(sc.items);
    const cart = [];
    // Every item that went into a basket, right or wrong, for the result card
    const tried = [];
    const next = () => {
      if (lives <= 0) return finish('lives');
      if (cart.length === sc.items.length) return finish('win');
      show();
    };
    let lives = LIVES;
    let current = null;
    let col = 0;
    let row = 0;
    let tick = 0;
    let gravity = null;
    let soft = false;
    let nudge = null;
    let over = false;
    livesLost = 0;

    const el = h(`<section class="screen" aria-label="Sort the items">
      <div class="item-stage">
        <img class="bg" src="${A}bg/aisle.jpg" alt="Supermarket aisle">
        <div class="slot"></div>
      </div>
      <button class="basket need" aria-label="Move the item toward Needs">NEEDS<span class="key">steer with ←</span></button>
      <button class="basket want" aria-label="Move the item toward Wants">WANTS<span class="key">steer with →</span></button>
      <aside class="side">
        <div class="hearts" aria-label="Lives">${HEART.repeat(LIVES)}</div>
        <div class="talk talk-side" aria-live="polite"></div>
        <div class="cart">
          <h3><span>Items in Cart</span><span class="count">0/10</span></h3>
          <div class="cart-grid">${'<div class="cart-slot empty"></div>'.repeat(10)}</div>
          <div class="total"><span>Total:</span><span class="sum">$0</span></div>
        </div>
      </aside>
    </section>`);
    const $ = (s) => el.querySelector(s);
    const slot = $('.slot');
    const talk = $('.talk');
    const baskets = { need: $('.basket.need'), want: $('.basket.want') };
    const b = billy('billy', 'left:186px;top:270px;width:210px');
    $('.cart').before(b.el);

    // Billy's bubbles; the first line is the one she says
    const say = (...lines) => {
      talk.replaceChildren(...lines.map((t, i) =>
        h(`<div class="bubble${t.bad ? ' red' : ''}${t.good ? ' green' : ''}">${t.text || t}</div>`)));
    };

    const drawCart = () => {
      const slots = el.querySelectorAll('.cart-slot');
      // Only a slot whose item changed is rewritten, so only the new item
      // pops in; the ones already in the cart stay still
      slots.forEach((s, i) => {
        const it = cart[i];
        const id = it ? it.id + it.name : '';
        if (s.dataset.item === id) return;
        s.dataset.item = id;
        s.className = 'cart-slot' + (it ? '' : ' empty');
        s.innerHTML = it ? `<img src="${it.src}" alt="${it.name}"><span class="price ${it.kind}">${money(it.price)}</span>` : '';
      });
      $('.count').textContent = `${cart.length}/10`;
      $('.sum').textContent = money(cart.reduce((n, it) => n + it.price, 0));
    };

    // The piece snaps to its cell; the baskets stay plain while it falls
    const place = () => {
      const piece = slot.firstElementChild;
      if (!piece) return;
      piece.style.transform = `translate(${col * COL_W}px, ${row * ROW_H}px)`;
    };
    const move = (dx) => {
      if (!current || over) return;
      col = Math.max(0, Math.min(COLS - 1, col + dx));
      place();
    };

    // Gravity: one row per tick; on the last row the lock delay runs, and a
    // move during it still counts
    const fallStep = () => {
      if (!current || over || !el.isConnected) return;
      if (row < ROWS) {
        row++;
        place();
        sound.tick();
        gravity = setTimeout(fallStep, soft ? 45 : tick);
      } else {
        gravity = setTimeout(land, LOCK_DELAY);
      }
    };

    const show = () => {
      current = queue.shift();
      if (!current) return;
      col = Math.floor(Math.random() * COLS);
      row = 0;
      soft = false;
      const ms = DEMO ? 4500 : between(5000, 9000);
      tick = ms / ROWS;
      slot.replaceChildren(h(`<div class="piece" style="width:${COL_W}px">
        <img src="${current.src}" alt=""><span class="name">${current.name}</span>
      </div>`));
      // The first frame places it without sliding in from the corner
      slot.firstElementChild.style.transition = 'none';
      place();
      void slot.offsetWidth;
      slot.firstElementChild.style.transition = '';
      gravity = setTimeout(fallStep, tick);
      // Billy asks a question about the trip, never the answer
      say(current.hint);
      b.say(current.hint, 'smile');
      // Halfway down, if it is heading for the wrong basket, she nudges
      const it = current;
      clearTimeout(nudge);
      nudge = setTimeout(() => {
        if (current !== it || over || sideOf(col) === it.kind) return;
        const line = `Hmm, think about ${sc.occasion} again.`;
        say(line, it.hint);
        b.say(line, 'oh');
      }, ms * 0.5);
    };

    // The item falls all the way into the basket and out of sight; only
    // then does the basket answer, green for right and red for wrong, as in
    // the five bucket frames
    const light = (basket, state) => {
      basket.classList.remove('right', 'wrong');
      void basket.offsetWidth;
      basket.classList.add(state);
      setTimeout(() => basket.classList.remove(state), 1300);
    };
    const land = () => {
      if (!current || over || !el.isConnected) return;
      clearTimeout(nudge);
      const it = current;
      current = null;
      const kind = sideOf(col);
      const piece = slot.firstElementChild;
      const at = `translate(${col * COL_W}px, ${row * ROW_H}px)`;
      const basket = baskets[kind];
      const right = kind === it.kind;
      // It keeps falling under gravity, below the aisle's bottom edge
      piece.animate([
        { transform: at },
        { transform: `translate(${col * COL_W}px, ${row * ROW_H + 260}px)` },
      ], { duration: 320, easing: 'cubic-bezier(0.55, 0, 1, 0.45)', fill: 'forwards' }).finished.then(() => {
        if (!el.isConnected || over) return;
        piece.remove();
        sound.thud();
        light(basket, right ? 'right' : 'wrong');
        if (right) sound.right(kind);
        else sound.wrong();
        tried.push({ it, right });
        if (right) {
          say({ text: `Yes! ${it.why}`, good: true });
          b.say(`Yes! ${it.why}`, 'happy');
          b.act('cheer');
          cart.push(it);
          drawCart();
          setTimeout(next, 1500);
          return;
        }
        lives--;
        livesLost = LIVES - lives;
        el.querySelectorAll('.side .heart')[lives].outerHTML = BROKEN;
        const line = `Not quite. ${it.why}`;
        say({ text: line, bad: true }, 'It still goes in the cart. Now you know!');
        b.say(line, lives ? 'sad' : 'cry');
        b.act('droop');
        cart.push(it);
        drawCart();
        setTimeout(next, 2200);
      }, () => {});
    };

    const finish = (how) => {
      over = true;
      clearTimeout(nudge);
      clearTimeout(gravity);
      document.removeEventListener('keyup', release);
      baskets.need.disabled = baskets.want.disabled = true;
      if (how === 'win') livesLost = LIVES - lives;
      result(sc, how, { cart, lives, tried });
    };

    // Arrows steer one column; ↓ drops faster while held, space drops it
    // straight down. On a touch screen the baskets steer one column a tap.
    baskets.need.addEventListener('click', () => move(-1));
    baskets.want.addEventListener('click', () => move(1));
    // A tap steers without taking focus, so a later key press never draws a
    // focus ring round the basket (or presses it again)
    for (const k of ['need', 'want']) baskets[k].addEventListener('pointerdown', (e) => e.preventDefault());
    onKey((e) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') move(-1);
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') move(1);
      if (e.key === 'ArrowDown') { e.preventDefault(); soft = true; }
      if (e.key === ' ' && current && !over) {
        e.preventDefault();
        clearTimeout(gravity);
        row = ROWS;
        place();
        gravity = setTimeout(land, LOCK_DELAY);
      }
    });
    const release = (e) => { if (e.key === 'ArrowDown') soft = false; };
    document.addEventListener('keyup', release);

    stage.append(el);
    show();
  }

  // Win, out of lives, or out of time: the overlay from frames 13, 15 and 17
  // Win, out of lives, or out of time, from the result frames: the two
  // tilted word tags, every item that went into a basket (a red cross on the
  // wrong ones), Billy with what to do next, and the round's numbers
  function result(sc, how, { cart, left, lives = 0, tried = [] }) {
    const win = how === 'win';
    const msg = {
      win: ['You sorted everything! 🎉', 'Now let us pay for it at the checkout.'],
      lives: ['You have used all your lives 💔', 'You can try again, there is always a second chance 🤗'],
      time: ['Oh, it is a time out.', 'Better luck next time!'],
      needs: [`We forgot something we need for ${sc.occasion}.`, 'Let us try the checkout again. You can do it!'],
    }[how];
    const shown = tried.length ? tried : cart.map((it) => ({ it, right: true }));
    const hearts = HEART.repeat(lives) + BROKEN.repeat(LIVES - lives);
    const total = cart.reduce((n, it) => n + it.price, 0);
    const o = h(`<div class="overlay"><div class="result${win ? ' win' : ''}" role="dialog" aria-label="${win ? 'You win' : 'You lose'}">
      <div class="tag tag-1">YOU</div>
      <div class="tag tag-2">${win ? 'WIN' : 'LOSE'}</div>
      <ul class="tried" aria-label="Items sorted">
        ${shown.map(({ it, right }) => `<li${right ? '' : ' class="wrong"'}>
          <img src="${it.src}" alt="${it.name}${right ? '' : ', wrong basket'}">
          <span class="pill">${money(it.price)}${right ? '' : '<i aria-hidden="true"></i>'}</span>
        </li>`).join('')}
      </ul>
      <div class="bubble" style="left:282px;top:513px;width:372px">${msg[0]}</div>
      <div class="bubble" style="left:267px;top:588px;width:372px">${msg[1]}</div>
      <div class="stats">
        <div><span>Items in Cart:</span><b>${cart.length}/10</b></div>
        <div><span>${left === undefined ? 'Lives:' : clock(Math.max(0, left))}</span><b class="hearts-inline" aria-label="${lives} of ${LIVES} lives left">${hearts}</b></div>
        <div><span>Total:</span><b>${money(total)}</b></div>
      </div>
      <div class="actions"></div>
    </div></div>`);
    const actions = o.querySelector('.actions');
    const b = billy('billy', 'left:72px;top:494px;width:201px');
    o.querySelector('.bubble').before(b.el);
    b.say(msg[0], win ? 'happy' : 'sad');
    if (win) b.act('cheer');
    const btn = (label, cls, w, fn) => {
      const el = h(`<button class="btn btn-lg ${cls}" style="width:${w}px">${label}</button>`);
      el.addEventListener('click', fn);
      actions.append(el);
      return el;
    };
    let first;
    if (win) {
      first = btn('Go to checkout', 'teal', 651, () => rules(sc, 1));
    } else {
      first = btn('Play Again', 'red', 459, () => (how === 'needs' ? rules(sc, 1) : sorting(sc)));
      btn('Back', 'yellow', 168, menu);
    }
    stage.append(o);
    // Focus for the keyboard, without the ring a mouse or touch user never asked for
    first.focus({ focusVisible: false });
  }

  // ---- part two: checkout --------------------------------------------------
  // The Checkout frame: the cart on the left, the belt on the right with the
  // cashier at the far end. The child drags items from the cart onto the
  // belt, where each lands where it is dropped (or somewhere free, if tapped)
  // at a slight angle. Pay now runs the belt to the cashier. Billy only ever
  // hints, and stays kind when the belt costs more than the budget.
  const BELT = { left: 579, top: 150, right: 1512, bottom: 879 };
  function checkout(sc) {
    clearScreen();
    const chosen = new Map();
    const needs = sc.items.filter((it) => it.kind === 'need');
    let paying = false;

    const el = h(`<section class="screen co" aria-label="Checkout">
      <div class="co-belt"><div class="co-run"></div></div>
      <div class="belt-items" aria-label="On the belt"></div>
      <div class="co-band">
        <div class="co-till"><img src="${A}register.svg" alt="Till"></div>
      </div>
      <img class="co-cashier" src="${A}cashier.svg" alt="Cashier">
      <aside class="co-side">
        <div class="co-top">
          <h3><span>Budget</span><span>${money(sc.budget)}</span></h3>
          <ul class="shelf" aria-label="Your cart. Drag an item onto the belt."></ul>
          <h3 class="co-left"><span>Money left</span><span class="leftover">${money(sc.budget)}</span></h3>
        </div>
        <div class="talk talk-co" aria-live="polite"></div>
      </aside>
      <div class="co-foot">
        <div class="readout">
          <div><span>Item Count</span><span class="n">0</span></div>
          <div><span>Total:</span><span class="t">$0</span></div>
        </div>
        <button class="pay">Pay now</button>
      </div>
    </section>`);
    const $ = (s) => el.querySelector(s);
    const talk = $('.talk');
    const beltItems = $('.belt-items');
    const b = billy('billy', 'left:404px;top:739px;width:152px');
    $('.co-side').append(b.el);
    const say = (lines, face = 'smile') => {
      talk.replaceChildren(...lines.map((t) => h(`<div class="bubble">${t}</div>`)));
      b.say(lines[0], face);
    };
    const total = () => [...chosen.keys()].reduce((n, it) => n + it.price, 0);
    // Stage coordinates from a pointer, since the stage is scaled to fit
    const toStage = (e) => {
      const r = stage.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * 1512, y: ((e.clientY - r.top) / r.height) * 982 };
    };
    const onBelt = ({ x, y }) => x > BELT.left + 40 && x < BELT.right - 40 && y > BELT.top + 30 && y < BELT.bottom - 30;
    // A free spot on the belt, kept clear of what is already there
    const freeSpot = () => {
      let best = null;
      for (let i = 0; i < 30; i++) {
        const p = { x: between(BELT.left + 110, BELT.right - 110), y: between(BELT.top + 230, BELT.bottom - 110) };
        const gap = Math.min(Infinity, ...[...chosen.values()].map((q) => Math.hypot(q.x - p.x, q.y - p.y)));
        if (!best || gap > best.gap) best = { ...p, gap };
        if (gap > 190) break;
      }
      return best;
    };

    const draw = () => {
      const t = total();
      $('.n').textContent = chosen.size;
      $('.t').textContent = money(t);
      const left = sc.budget - t;
      $('.leftover').textContent = left < 0 ? `-${money(-left)}` : money(left);
      $('.co-left').classList.toggle('over', left < 0);
      el.querySelectorAll('.shelf li').forEach((li) => li.classList.toggle('in', chosen.has(li.item)));
    };

    // Billy's lines: questions about the occasion, never the answer
    const nudges = ['Good thinking!', `Think about ${sc.occasion}. What will we need?`, 'Is there anything else we need?'];
    let nudge = 0;
    const react = () => {
      const left = sc.budget - total();
      if (left < 0) return say([`Oops, that is ${money(-left)} more than we have.`, 'Could something go back in the cart for another day?'], 'oh');
      say([nudges[nudge++ % nudges.length], `We have ${money(left)} left.`]);
    };

    const place = (it, p) => {
      const spot = { x: p.x, y: p.y, turn: between(-30, 30) };
      chosen.set(it, spot);
      const node = h(`<button class="on-belt" aria-label="Take ${it.name} off the belt" style="left:${spot.x}px;top:${spot.y}px;--turn:${spot.turn}deg"><img src="${it.src}" alt=""></button>`);
      node.item = it;
      node.addEventListener('pointerdown', (e) => drag(e, it, node));
      beltItems.append(node);
      draw();
      react();
    };
    const lift = (it) => {
      chosen.delete(it);
      [...beltItems.children].find((n) => n.item === it)?.remove();
      draw();
      react();
    };

    // Drag from the cart to the belt, or from the belt back to the cart. A
    // tap without a drag does the same with a free spot.
    const drag = (e, it, from) => {
      if (paying) return;
      e.preventDefault();
      const start = toStage(e);
      const fromBelt = from.classList.contains('on-belt');
      // The ghost follows the pointer through the translate property, never
      // left/top, so a drag never re-runs layout. Translate applies before the
      // over-the-belt scale, so the scale never shifts it off the pointer.
      const ghost = h(`<img class="co-ghost" src="${it.src}" alt="" style="translate:${start.x}px ${start.y}px">`);
      let moved = false;
      const move = (ev) => {
        const p = toStage(ev);
        if (!moved && Math.hypot(p.x - start.x, p.y - start.y) > 8) {
          moved = true;
          el.append(ghost);
          from.classList.add('lifting');
        }
        if (moved) {
          ghost.style.translate = `${p.x}px ${p.y}px`;
          ghost.classList.toggle('over-belt', onBelt(p));
        }
      };
      const up = (ev) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        ghost.remove();
        from.classList.remove('lifting');
        const p = toStage(ev);
        if (!moved) return fromBelt ? lift(it) : chosen.has(it) ? lift(it) : place(it, freeSpot());
        if (fromBelt) {
          if (onBelt(p)) {
            // Moved along the belt
            const spot = chosen.get(it);
            spot.x = p.x;
            spot.y = p.y;
            from.style.left = `${p.x}px`;
            from.style.top = `${p.y}px`;
          } else lift(it);
          return;
        }
        if (onBelt(p) && !chosen.has(it)) place(it, p);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    };

    // The cart in a random order that never bunches one kind together: each
    // row of five holds two or three of each, no three of a kind sit side by
    // side, and no two-by-two block is all one kind. The pill colour matches
    // the basket each item was sorted into.
    const mixed = () => {
      for (let tries = 0; tries < 500; tries++) {
        const a = shuffle(sc.items);
        const k = (i) => a[i].kind;
        const rows = [a.slice(0, 5), a.slice(5)];
        if (rows.some((r) => { const n = r.filter((it) => it.kind === 'need').length; return n < 2 || n > 3; })) continue;
        let ok = true;
        for (let r = 0; r < 2 && ok; r++) for (let c = 0; c < 3; c++) if (k(r * 5 + c) === k(r * 5 + c + 1) && k(r * 5 + c) === k(r * 5 + c + 2)) ok = false;
        for (let c = 0; c < 4 && ok; c++) if (k(c) === k(c + 1) && k(c) === k(c + 5) && k(c) === k(c + 6)) ok = false;
        if (ok) return a;
      }
      return shuffle(sc.items);
    };
    mixed().forEach((it) => {
      const li = h(`<li><button aria-label="${it.name}, a ${it.kind}, ${money(it.price)}. Drag onto the belt."><img src="${it.src}" alt=""></button><span class="pill ${it.kind}">${money(it.price)}</span></li>`);
      li.item = it;
      li.querySelector('button').addEventListener('pointerdown', (e) => drag(e, it, li));
      $('.shelf').append(li);
    });

    $('.pay').addEventListener('click', () => {
      if (paying) return;
      const left = sc.budget - total();
      const missing = needs.filter((n) => !chosen.has(n));
      if (!chosen.size) return say(['Our belt is empty.', 'Drag what we need from the cart onto the belt.']);
      paying = true;
      $('.pay').disabled = true;
      // Paying always goes through. A missing need still gets a hint, never
      // its name, and ends the round; going over the budget is borrowed money.
      if (missing.length) say(['Hmm, I think we forgot something.', missing[Math.floor(Math.random() * missing.length)].hint], 'oh');
      else if (left < 0) say([`We spent ${money(-left)} more than we had.`, `We will borrow ${money(-left)} and pay it back.`], 'oh');
      else {
        say(['Thank you! Here we go.'], 'happy');
        b.act('cheer');
      }
      // The belt runs sideways and carries the items off the right of the
      // screen. Its texture moves two lane widths, so the lines land where
      // they started; it starts shifted left so it still covers the belt.
      // A gentle sine ease with no overshoot, so it reads as a belt starting
      // and stopping rather than a spring; the items fade out as they go.
      const ms = 2000;
      const ease = 'cubic-bezier(0.37, 0, 0.63, 1)';
      // With reduced motion the belt stays put and the items just fade
      if (!still.matches) $('.co-run').animate([{ transform: 'translateX(-1016px)' }, { transform: 'translateX(0)' }], { duration: ms, easing: ease, fill: 'forwards' });
      // Each item moves rather than the layer, so the layer's clip stays put.
      // It moves through `translate`, which comes before its tilt, so it rides
      // straight along with the belt instead of along its own tilted axis.
      [...beltItems.children].forEach((n) => {
        if (!still.matches) n.animate([{ translate: '-50% -50%' }, { translate: 'calc(-50% + 1016px) -50%' }], { duration: ms, easing: ease, fill: 'forwards' });
        n.animate([{ opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
      });
      const bought = [...chosen.keys()];
      setTimeout(() => (missing.length
        ? result(sc, 'needs', { cart: bought, lives: LIVES - (livesLost || 0), tried: bought.map((it) => ({ it, right: true })) })
        : victory(sc, { spent: total() })), ms + 900);
    });

    stage.append(el);
    say([`Let us put what we need for ${sc.occasion} on the belt.`, `We have ${money(sc.budget)} to spend.`]);
    draw();
  }

  // Three stars, earned separately; a win always has the first:
  //   bought every need        (missing one is a loss, not a win)
  //   sorted with at most one heart lost
  //   spent no more than the budget; going over is borrowed, and comes off
  //   the money saved for the shop, which can go below zero
  // They fill in from the left by count. Buddy only joins all three.
  // Opening the checkout straight from a link skips sorting; a recorded clip
  // counts that as no mistakes
  let livesLost = DEMO ? 0 : null;
  function victory(sc, { spent }) {
    const saved = sc.budget - spent;
    const checks = [
      ['Bought all the needs', true],
      [livesLost === null ? 'Sorted with one mistake or fewer' : livesLost ? `Sorted with ${livesLost} mistake${livesLost > 1 ? 's' : ''}` : 'Sorted with no mistakes', livesLost !== null && livesLost <= 1],
      [saved >= 0 ? `Stayed within ${money(sc.budget)}` : `Went ${money(-saved)} over, and borrowed it`, saved >= 0],
    ];
    const stars = checks.filter(([, ok]) => ok).length;
    const done = store.get('done', {});
    done[sc.id] = Math.max(Math.min(done[sc.id] || 0, 3), stars);
    store.set('done', done);
    // The money carries over between rounds, debt included. The change is
    // shown here and again on the menu, so the total never moves unexplained.
    const before = store.get('saved', 0);
    const after = before + saved;
    store.set('saved', after);
    store.set('lastChange', { from: before, to: after });

    clearScreen();
    const next = SCENARIOS[(SCENARIOS.indexOf(sc) + 1) % SCENARIOS.length];
    const el = h(`<section class="screen" aria-label="Victory, ${stars} of 3 stars" style="background:var(--teal)">
      <div class="abs" style="left:76px;top:177px;width:1360px;height:629px;background:var(--teal-wash);border-radius:28px"></div>
      <div class="victory-art abs" style="left:136px;top:237px;width:550px" role="img" aria-label="${stars} of 3 stars"></div>
      <ul class="result-stats abs" style="left:726px;top:262px;width:650px">
        ${checks.map(([label, ok]) => `<li class="${ok ? 'got' : 'miss'}"><span class="mark" aria-hidden="true"></span><span>${label}</span><span class="tag">${ok ? '+1 star' : 'no star'}</span></li>`).join('')}
      </ul>
      <div class="money-line abs" style="left:726px;top:520px;width:650px">
        <span>${saved > 0 ? `You saved <b>${money(saved)}</b>` : saved < 0 ? `You borrowed <b>${money(-saved)}</b>` : 'You spent it all'}</span>
        <span>Your money <b>${money(before)}</b> → <b class="${after < 0 ? 'neg' : ''}">${money(after)}</b></span>
      </div>
      <button class="btn btn-lg teal abs" style="left:408px;top:649px;width:224px">Replay</button>
      <button class="btn btn-lg yellow abs" style="left:644px;top:649px;width:224px">Menu</button>
      <button class="btn btn-lg red abs" style="left:880px;top:649px;width:224px">Next</button>
    </section>`);
    // The Figma art, split so each star and Buddy can come in on their own
    fetch(`${A}victory.svg`).then((r) => r.text()).then((text) => {
      const svg = h(text);
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      const art = el.querySelector('.victory-art');
      if (!art.isConnected) return;
      art.append(svg);
      if (stars < 3) svg.querySelector('[id="dog 1"]').remove();
      svg.querySelector('[id="Frame 50"]').classList.add('v-banner');
      // The stars and Buddy animate, so each moves on a layer of its own
      const ids = ['Star 1', 'Star 2', 'Star 3', ...(stars === 3 ? ['dog 1'] : [])];
      const layers = liftShapes(svg, ids.map((id) => svg.querySelector(`[id="${id}"]`)));
      layers.forEach((l, i) => {
        if (i < 3) {
          l.classList.add('v-star', i < stars ? 'earned' : 'empty');
          l.style.setProperty('--i', i);
        } else l.classList.add('v-dog');
      });
      // Buddy sits in front of the stars, as in the art
      art.append(...layers);
    });
    const [replay, home, nxt] = el.querySelectorAll('button');
    replay.addEventListener('click', () => sorting(sc));
    home.addEventListener('click', menu);
    nxt.addEventListener('click', () => levelIntro(next));
    stage.append(el);
    nxt.focus({ focusVisible: false });
  }

  window.addEventListener('hashchange', route);
  route();
})();
