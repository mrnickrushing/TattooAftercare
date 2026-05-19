export const STAGES = [
  {
    key: 'fresh',
    name: 'Fresh Tattoo',
    timeframe: 'Days 1–3',
    color: '#E05252',
    description:
      'Your tattoo is an open wound right now. The primary focus is preventing infection and keeping the area clean. Your artist may have applied a protective wrap — follow their specific instructions above all else.',
    doList: [
      'Keep the initial wrap on for the time your artist specified (2–24 hours)',
      'Wash gently with unscented, antibacterial soap 2 times per day',
      'Pat completely dry with a clean paper towel after washing',
      'Apply a very thin layer of unscented moisturizer after washing',
      'Wear loose, breathable clothing over the tattoo',
      'Keep the tattoo elevated if possible to reduce swelling',
    ],
    dontList: [
      'Do NOT touch the tattoo with unwashed hands',
      'Do NOT re-wrap with plastic wrap after the first wrap comes off (unless artist directed)',
      'Do NOT submerge in water — no baths, pools, or hot tubs',
      'Do NOT expose to direct sunlight',
      'Do NOT apply any scented lotions, Vaseline, or petroleum jelly',
      'Do NOT let pets near the fresh tattoo',
    ],
    tips: [
      'Use lukewarm water — never hot — when washing. Hot water opens pores and can cause ink loss.',
      'If you see plasma (clear/yellow fluid) weeping, that is completely normal for the first day or two. Gently clean it off.',
      'A good soap to look for: fragrance-free, dye-free foam or liquid soap. Avoid bar soaps.',
      'Light redness and swelling around the tattoo for the first 24–48 hours is normal.',
    ],
  },
  {
    key: 'early',
    name: 'Early Healing',
    timeframe: 'Days 4–7',
    color: '#E09452',
    description:
      'The outer wound is closing and your skin is working hard to rebuild. Moisturizing consistently is critical during this phase to prevent cracking, which can pull ink out and distort lines.',
    doList: [
      'Continue washing gently with unscented soap 2 times per day',
      'Apply unscented moisturizer 3–4 times daily — whenever the tattoo feels tight or dry',
      'Keep the tattoo out of direct sunlight',
      'Stay hydrated — drinking water helps your skin heal from the inside',
      'Wear loose clothing to prevent friction on the tattoo',
    ],
    dontList: [
      'Do NOT pick at any scabs or raised areas that may be forming',
      'Do NOT scratch even if it itches — pat gently instead',
      'Do NOT submerge in any body of water',
      'Do NOT exercise intensely in ways that stretch the tattooed skin',
      'Do NOT over-moisturize — a thin layer is enough. Too much clogs the skin.',
    ],
    tips: [
      'The tattoo may start to look a bit dull or cloudy — this is the outer skin healing over the ink. The color returns later.',
      'Itching usually starts around day 4–5. This is a sign of healing. Resist scratching.',
      'Apply moisturizer with clean fingertips only. Never directly from a tube that has touched other surfaces.',
      'If you must exercise, keep the area clean and moisturized immediately after.',
    ],
  },
  {
    key: 'peeling',
    name: 'Peeling Phase',
    timeframe: 'Days 8–14',
    color: '#C8A951',
    description:
      'This is the most tempting phase, but also the most critical. Your skin will flake and peel like a sunburn — this is completely normal and a sign your body is rebuilding. The flakes contain some ink, so let them fall naturally.',
    doList: [
      'Continue the twice-daily gentle washing routine',
      'Moisturize 2–3 times daily, focusing on dry and peeling areas',
      'Let peeling skin fall off on its own — it will happen naturally',
      'Keep the tattoo out of direct sunlight',
      'Pat dry gently after washing',
    ],
    dontList: [
      'Do NOT pick, peel, or pull off any flaking skin — ever',
      'Do NOT scratch, even vigorously, even with a tool',
      'Do NOT soak in baths, pools, oceans, lakes, or hot tubs',
      'Do NOT use exfoliating products anywhere near the tattoo',
      'Do NOT shave over the tattooed area',
      'Do NOT apply sunscreen directly — avoid sun exposure entirely still',
    ],
    tips: [
      'Peeling looks alarming but is totally normal. The final ink is locked deeper in the dermis, not the surface layer that peels.',
      'If a flap of skin is hanging but attached, leave it alone. It will fall when ready.',
      'Coconut oil, shea butter, or any unscented basic lotion works well during this phase.',
      'The tattoo may look patchy or faded during peeling — this usually resolves within a few weeks.',
    ],
  },
  {
    key: 'settling',
    name: 'Settling In',
    timeframe: 'Days 15–28',
    color: '#52C07A',
    description:
      'The surface skin has mostly healed. Your tattoo is now locked in, though the deeper layers of skin are still finishing up. Colors will start to look more true. Now is when sun protection becomes your biggest long-term concern.',
    doList: [
      'Apply SPF 50+ broad-spectrum sunscreen whenever the tattoo will be exposed to sun',
      'Continue moisturizing once or twice daily',
      'Continue avoiding harsh soaps or exfoliants on the area',
      'Watch for any concerning signs: unexpected redness, warmth, or swelling',
    ],
    dontList: [
      'Do NOT expose the tattoo to prolonged sunlight without SPF 50+',
      'Do NOT get a spray tan over the tattoo',
      'Do NOT undergo any chemical peels or laser treatments near the area',
      'Do NOT use tanning beds',
    ],
    tips: [
      'UV radiation is the #1 cause of tattoo fading over time. Sun protection now pays dividends for years.',
      'The tattoo may still look slightly milky or have a slight sheen — this is the skin still settling. Give it time.',
      'If colors look duller than expected, this is often temporary. Full vibrancy typically returns by week 4–6.',
      'Now is a good time to start thinking about photos of the healed result for your portfolio.',
    ],
  },
  {
    key: 'healed',
    name: 'Fully Healed',
    timeframe: 'Day 29+',
    color: '#5292C0',
    description:
      'Congratulations — your tattoo is healed! The surface and deeper skin layers have fully regenerated around the ink. Now it is all about long-term care to keep the tattoo looking vibrant for decades to come.',
    doList: [
      'Apply SPF 50+ sunscreen whenever the tattoo is exposed to the sun, year-round',
      'Moisturize regularly as part of your skincare routine',
      'Schedule a touch-up appointment at 3 months if any areas need refreshing',
      'Stay hydrated and maintain healthy skin overall',
      'Get annual photos to track long-term healing',
    ],
    dontList: [
      'Do NOT neglect sun protection — UV is the primary cause of fading',
      'Do NOT use tanning beds',
      'Do NOT use harsh exfoliants or chemical peels directly on the tattoo without consulting your artist',
    ],
    tips: [
      'A high-quality, mineral-based SPF (zinc oxide or titanium dioxide) sits on top of skin and is less likely to cause reactions.',
      'Weight changes, skin stretching, and sun exposure are the top three factors that change how a tattoo looks over time.',
      'If you notice any patchiness that concerns you, consult your tattoo artist before going back for a touch-up — they want to see it healed first.',
      'Some artists offer a free first touch-up within 3–6 months — check with yours.',
    ],
  },
];

export const FAQS = [
  {
    question: 'Can I work out after getting a tattoo?',
    answer:
      'It is best to avoid intense exercise for the first 3–5 days. Sweating introduces bacteria to the fresh wound and can cause infection. Stretching and movement over the tattooed area can also warp healing skin and distort ink placement. Light walking is generally fine, but anything that makes you sweat heavily — gym sessions, runs, sports — should wait until the tattoo has closed over (roughly days 4–7). After that, keep the area clean and moisturized right after any workout.',
  },
  {
    question: 'Can I swim after getting a tattoo?',
    answer:
      'No swimming for at least 2–3 weeks, and ideally until fully healed (day 29+). This includes pools, oceans, lakes, rivers, and hot tubs. Pool chlorine is highly irritating to healing skin and can leach ink. Ocean water contains bacteria that can cause serious infections in open wounds. Hot tubs are the worst — the warm, bacteria-laden water is a major infection risk. Even after the surface heals, soaking can still affect the deeper layers still knitting together.',
  },
  {
    question: 'Is it normal for my tattoo to peel?',
    answer:
      'Yes, completely normal. Peeling typically starts around days 7–10 and can continue through day 14. Your skin is replacing the top layer (epidermis) that was damaged by the tattooing process. The peeling looks exactly like a sunburn peel — thin, translucent flakes, sometimes with faint color in them. The ink is not leaving with the peeling skin; it is anchored deeper in the dermis. Resist the urge to pick or pull the flaking skin. Let it shed naturally.',
  },
  {
    question: 'How do I know if my tattoo is infected?',
    answer:
      'Some redness, swelling, and warmth in the first 24–48 hours is normal. Signs that may indicate infection include: redness that is spreading (not shrinking) after day 3, significant swelling that is getting worse instead of better, yellow or green discharge (not clear plasma), an unpleasant odor, a fever or feeling generally unwell, and red streaks radiating out from the tattoo. If you experience any of these, see a doctor promptly. Do not wait to see if it improves on its own. Untreated tattoo infections can become serious.',
  },
  {
    question: 'When can I go in the sun after getting a tattoo?',
    answer:
      'Avoid direct sun exposure for at least 3–4 weeks. In the first two weeks, even brief sun exposure on a fresh tattoo can cause UV damage, prolonged redness, and ink degradation. Once healed (day 29+), you can expose the tattoo to sun but must apply SPF 50+ broad-spectrum sunscreen every time. Unprotected sun exposure is the single biggest cause of tattoo fading and color distortion over time. Make sunscreen a permanent part of your routine wherever the tattoo is located.',
  },
  {
    question: 'How long does a tattoo take to fully heal?',
    answer:
      'The surface of the skin typically heals within 2–4 weeks. However, the deeper layers of skin (dermis) where the ink actually lives can take 3–6 months to fully settle. This is why tattoos often look their best at the 3-month mark — the skin has fully regenerated and the ink has settled. During the deeper healing phase, the tattoo may look milky, slightly raised, or have uneven sheen. This usually resolves on its own without any intervention.',
  },
  {
    question: 'Why does my tattoo itch so much?',
    answer:
      'Itching is a completely normal and healthy sign of healing. As your skin regenerates new cells and nerve endings reconnect, the sensation of itching is produced. It typically peaks around days 5–10 during active healing. The absolute rule is: do not scratch. Scratching can introduce bacteria, pull out ink from peeling skin, and cause scarring. Instead, gently pat the area through clothing, apply a thin layer of moisturizer, or hold a cool (not cold) damp cloth against it briefly for relief.',
  },
  {
    question: 'What soap should I use on my tattoo?',
    answer:
      'Use a fragrance-free, dye-free, unscented liquid soap. You are looking for something with minimal ingredients — a gentle cleanser that kills bacteria without irritating healing skin. Avoid bar soaps (they harbor bacteria), anything with added fragrances or essential oils, and anything marketed as exfoliating. Popular choices include fragrance-free foam cleansers and gentle baby wash. When in doubt, ask your tattoo artist — most have a specific recommendation they trust.',
  },
  {
    question: 'Can I scratch my tattoo if it itches?',
    answer:
      'No. Scratching a healing tattoo is one of the most damaging things you can do. Your fingernails carry bacteria that can cause infection in still-healing skin. Scratching also physically disrupts the skin as it is knitting back together, which can remove ink from areas that are peeling, create scarring, and cause patchiness in the final healed result. For itch relief: pat gently over clothing, apply a thin layer of moisturizer, or hold a cool damp cloth against the area. The itch phase passes — permanent damage from scratching does not.',
  },
  {
    question: 'When will I see the final result of my tattoo?',
    answer:
      'You will get a good preview of the final result once peeling is complete, around weeks 2–3. However, the true final result is typically visible at the 3-month mark. In the first few weeks, a milky or cloudy overlay from the healing outer skin can make colors look dull and lines look slightly soft. Once the deeper skin fully heals and that overlay disappears, the true vibrancy of the ink shows through. If you are considering a touch-up, most artists recommend waiting 3 months minimum before assessing what needs refreshing.',
  },
];
