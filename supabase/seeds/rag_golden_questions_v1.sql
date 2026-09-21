-- REPO: kisanshaktiai/kisan-command-center-nexus   (admin panel / control plane)
-- PATH: supabase/seeds/rag_golden_questions_v1.sql
-- Golden set v1 — REVIEW BEFORE APPLYING. Not a migration: apply once, by hand, after
-- migration 20260921120100_rag_golden_set.sql. Real General-chat questions only (origin=farmer).

-- =====================================================================================
-- rag_golden_questions seed  (REVIEW BEFORE APPLYING - NOT APPLIED)
-- Generated 2026-09-21 from public.ai_chat_messages (role='user',
-- metadata->>'chat_mode' IN ('general_llm_v1','general_rag_v1')) on project qfklkkzxemsbeniyugiz.
--
-- Source counts
--   raw user messages in General chat ............ 62
--   distinct after lower(trim(content)) .......... 35
--   kept as golden questions ..................... 33
--   dropped .......................................  2
--       "hi"                       - greeting, not a question
--       "majha kolhapur jilha aahe" - bare district statement, not a question
--   of the 33 kept:
--       answerable from the corpus (non-empty expected_document_ids) ... 29
--       no-answer / out-of-corpus (expected_document_ids = '{}') ........  4
--           (wheat seed rate, wheat variety, fig pruning, apple cultivation - no such document)
--       rows carrying identifiers ................................... 4  (kds 726 / kds)
--       rows carrying expected_chunk_ids ............................ 4  (same rows)
--
-- source_message_id = id of the FIRST (earliest) message with that normalised text.
-- language = script of the text, NOT the UI language from metadata (UI language is 'mr'
--            for nearly every row, including plain-English questions).
--
-- Corpus (public.rag_documents, 7 rows) for the reviewer:
--   a73ece1e-5e49-4973-b437-b3479320f0dd  CRRIs varieties 1968 2024                (faq, rice, 64 chunks)
--   a71df452-c9e1-4597-8306-4767d7406f22  manage icar iisr climate smart soybean   (package_of_practices, soybean, 341 chunks) - ICAR IISR e-book, most complete
--   327db5c1-ed3b-4def-be90-ac1273653e24  MPKV rahur oilseed                       (package_of_practices, soybean+oilseeds, MH, 11 chunks) - has Phule Sangam (KDS 726) entry
--   2b7dd138-9ab7-49d8-93a1-fe898069954f  Rice (1)                                 (package_of_practices, rice, 14 chunks)
--   5cbe147f-85f1-49e1-b3ef-7b81028f3e23  Soyabean Cultivation Practices           (package_of_practices, soybean, MH, 41 chunks)
--   36fda809-1bee-4626-bc7d-ed0cabf4673c  Soyabin inter jouranl                    (other, soybean, MH, 27 chunks) - trial paper comparing KDS-726 vs KDS-753
--   8efd6f98-16c2-46f4-8b01-2931f8993144  SUGARCANE VARIETIES IDENTIFIED AICRP(S)  (faq, sugarcane, 246 chunks)
--
-- Chunk ids used (verified with ILIKE on rag_chunks.chunk_text):
--   KDS 726 exact mentions: journal 205a33f6 (p1), f8fb5efd (p2), 87538aef (p2), 807634bf (p3),
--                           8b9941e6 (p3), 4ebdeb06 (p4), 7ae916f8 (p4); MPKV 5c18770e (p19, "Phule Sangam (KDS 726)")
--   other KDS codes:        MPKV cbb4d88e (p21, "Phule Durva (KDS 992)"), ICAR 21c9f0a6 (p21, variety list incl. KDS 344)
-- =====================================================================================

INSERT INTO public.rag_golden_questions
  (question_text, language, origin, source_message_id, expected_document_ids, expected_chunk_ids,
   identifiers, crop_codes, state_codes, topic_codes, notes)
VALUES
-- 1. Rice blast definition. Rice (1) POP p8 has "Symptoms of Blast in rice" + fungicide management. CRRI only lists blast *resistance* per variety, so it is not an answer to "what is".
('What is rice blast?', 'en', 'farmer', 'e5966320-4f3d-4c3a-a071-a319c79010fe',
 ARRAY['2b7dd138-9ab7-49d8-93a1-fe898069954f']::uuid[], '{}'::uuid[],
 NULL, ARRAY['rice'], NULL, ARRAY['disease_management'],
 'Asked 2x. Rice POP (Rice (1)) has blast symptoms and control on p8. CRRI varieties doc mentions blast only as a resistance trait; not included.'),

-- 2. "I want to grow rice" - Romanised Marathi statement of intent; kept as an implicit request for the rice package of practices. REVIEWER: borderline (statement, not a question).
('mala rice pik gyache aahe', 'mr', 'farmer', '77bee1fa-2b9c-4efc-8f74-1f58720e97dc',
 ARRAY['2b7dd138-9ab7-49d8-93a1-fe898069954f']::uuid[], '{}'::uuid[],
 NULL, ARRAY['rice'], NULL, ARRAY['crop_production'],
 'UNSURE: this is a statement of intent ("I want to take the rice crop"), not a literal question. Kept because it is an agricultural request for guidance; drop if the set should hold only explicit questions. Romanised Marathi -> mr.'),

-- 3. "How many days is the rice crop?" - crop duration. CRRI lists duration (days) per variety; Rice (1) mentions duration a few times.
('rice pik kiti divasche aahe', 'mr', 'farmer', 'dd72b8c8-fd43-4bc5-8b70-6581559d8e87',
 ARRAY['a73ece1e-5e49-4973-b437-b3479320f0dd','2b7dd138-9ab7-49d8-93a1-fe898069954f']::uuid[], '{}'::uuid[],
 NULL, ARRAY['rice'], NULL, ARRAY['seeds','crop_production'],
 'Romanised Marathi -> mr. Duration is variety-specific; CRRI catalogue is the primary source, Rice POP secondary.'),

-- 4. Soybean seed rate (Marathi). All three soybean POPs give seed rate (ICAR e-book, Krishi Jagran POP p5 "20-30 kg seed per hectare", MPKV per-variety "Seed Rate (Per acre)").
('सोयाबीनसाठी बियाणे किती लागते?', 'mr', 'farmer', '2b55e03b-89cd-4ba6-b90d-0f642e2f218b',
 ARRAY['a71df452-c9e1-4597-8306-4767d7406f22','5cbe147f-85f1-49e1-b3ef-7b81028f3e23','327db5c1-ed3b-4def-be90-ac1273653e24']::uuid[], '{}'::uuid[],
 NULL, ARRAY['soybean'], NULL, ARRAY['seeds','crop_production'],
 'Asked 3x. Devanagari with Marathi markers (साठी, लागते) -> mr.'),

-- 5. Soybean seed rate and spacing (English). Same three soybean POPs; Krishi Jagran POP p5 has row/plant spacing explicitly.
('soybean seed rate and spacing', 'en', 'farmer', 'e7d8ce2e-f288-4e54-828d-250ca7f3a4b8',
 ARRAY['a71df452-c9e1-4597-8306-4767d7406f22','5cbe147f-85f1-49e1-b3ef-7b81028f3e23','327db5c1-ed3b-4def-be90-ac1273653e24']::uuid[], '{}'::uuid[],
 NULL, ARRAY['soybean'], NULL, ARRAY['seeds','crop_production'],
 'Asked 4x. English text although UI language was mr.'),

-- 6. Soybean seed rate per hectare + sowing time (English). Same three POPs (all give planting period / sowing window).
('What is the seed rate for soybean per hectare and the best sowing time?', 'en', 'farmer', '5303deaa-4efd-436b-9590-66dda2e759a3',
 ARRAY['a71df452-c9e1-4597-8306-4767d7406f22','5cbe147f-85f1-49e1-b3ef-7b81028f3e23','327db5c1-ed3b-4def-be90-ac1273653e24']::uuid[], '{}'::uuid[],
 NULL, ARRAY['soybean'], NULL, ARRAY['seeds','crop_production'],
 'Asked 4x. English text although UI language was mr.'),

-- 7. Yellow mosaic virus symptoms in soybean. ICAR e-book (36 YMV chunks) and Krishi Jagran POP (8 YMV chunks). MPKV and journal do not cover YMV.
('What are the symptoms of yellow mosaic virus in soybean?', 'en', 'farmer', 'ea583761-9328-4c0b-8105-166cca0c7ea0',
 ARRAY['a71df452-c9e1-4597-8306-4767d7406f22','5cbe147f-85f1-49e1-b3ef-7b81028f3e23']::uuid[], '{}'::uuid[],
 NULL, ARRAY['soybean'], NULL, ARRAY['disease_management'],
 'English text although UI language was mr.'),

-- 8. Soybean seed treatment. ICAR e-book (33 seed-treatment chunks, p78-80) and Krishi Jagran POP p5 (Thiram / Captan+Thiram, Rhizobium).
('How do I do seed dressing / seed treatment for soybean?', 'en', 'farmer', '2db11ae3-ffdb-4894-a61e-1ef4fc781ec0',
 ARRAY['a71df452-c9e1-4597-8306-4767d7406f22','5cbe147f-85f1-49e1-b3ef-7b81028f3e23']::uuid[], '{}'::uuid[],
 NULL, ARRAY['soybean'], NULL, ARRAY['seeds','disease_management'],
 'English text although UI language was mr. MPKV doc has no seed-treatment text.'),

-- 9. Soybean seed rate per hectare + sowing time (Marathi). Same mapping as row 6.
('सोयाबीनसाठी हेक्टरी बियाणे दर किती आणि पेरणी कधी करावी?', 'mr', 'farmer', 'f52863e4-1284-415c-91dd-4b2535edab35',
 ARRAY['a71df452-c9e1-4597-8306-4767d7406f22','5cbe147f-85f1-49e1-b3ef-7b81028f3e23','327db5c1-ed3b-4def-be90-ac1273653e24']::uuid[], '{}'::uuid[],
 NULL, ARRAY['soybean'], NULL, ARRAY['seeds','crop_production'],
 'Devanagari with Marathi markers (साठी, करावी) -> mr.'),

-- 10. Soybean variety maturing ~97 days, central zone. Only the ICAR e-book has the zone-wise variety table ("Central zone 95-97 days", p11).
('Which soybean variety matures in about 97 days for the central zone?', 'en', 'farmer', '047947e0-d841-4b1c-9d47-bc116c4c4619',
 ARRAY['a71df452-c9e1-4597-8306-4767d7406f22']::uuid[], '{}'::uuid[],
 NULL, ARRAY['soybean'], NULL, ARRAY['seeds'],
 'Asked 2x. Answer is in ICAR IISR e-book variety table p11 (95-97 days, Central zone).'),

-- 11. Power sprayer and spray timing for beneficial insects. Only the ICAR e-book (p60) covers this. Question names no crop, so crop_codes is NULL.
('Why should I use a power sprayer and when should I spray to protect beneficial insects?', 'en', 'farmer', '70e0dcd8-7253-47f0-adc4-51672781e315',
 ARRAY['a71df452-c9e1-4597-8306-4767d7406f22']::uuid[], '{}'::uuid[],
 NULL, NULL, NULL, ARRAY['pest_management','insecticides'],
 'Asked 3x. Crop not named in the question (content is in the soybean e-book, p60). crop_codes left NULL on purpose.'),

-- 12. Sub-soiler for soybean. Only the ICAR e-book (p110, p117, p120) covers sub-soilers.
('What is a sub-soiler and why is it recommended for soybean?', 'en', 'farmer', 'f1a80f7f-8588-4d89-b038-bf6a4fa9d0a3',
 ARRAY['a71df452-c9e1-4597-8306-4767d7406f22']::uuid[], '{}'::uuid[],
 NULL, ARRAY['soybean'], NULL, ARRAY['machinery','soil_health'],
 'Asked 2x. ICAR e-book only (6 sub-soiler chunks).'),

-- 13. Salicylic acid for soybean under drought/heat. Only the ICAR e-book (p107, p123) mentions salicylic acid.
('Can salicylic acid help soybean under drought or high temperature?', 'en', 'farmer', '51badc35-aee3-4bdf-8fb9-2bf0a8165427',
 ARRAY['a71df452-c9e1-4597-8306-4767d7406f22']::uuid[], '{}'::uuid[],
 NULL, ARRAY['soybean'], NULL, ARRAY['biostimulants','climate_weather'],
 'Asked 3x. ICAR e-book only (7 salicylic-acid chunks).'),

-- 14. Yellow mosaic symptoms in soybean (Hindi). Same mapping as row 7.
('सोयाबीन में पीला मोज़ेक रोग के लक्षण क्या हैं?', 'hi', 'farmer', 'c1d2c656-7876-47ce-a9d4-123470054104',
 ARRAY['a71df452-c9e1-4597-8306-4767d7406f22','5cbe147f-85f1-49e1-b3ef-7b81028f3e23']::uuid[], '{}'::uuid[],
 NULL, ARRAY['soybean'], NULL, ARRAY['disease_management'],
 'Devanagari with Hindi markers (में, के, क्या, हैं) -> hi even though UI language was mr.'),

-- 15. Wheat seed rate - NO wheat document in the corpus; expected result is no evidence.
('What is the seed rate for wheat?', 'en', 'farmer', '377c9d81-776e-4a6c-af1c-0dac31391e4e',
 '{}'::uuid[], '{}'::uuid[],
 NULL, ARRAY['wheat'], NULL, ARRAY['seeds','crop_production'],
 'Asked 5x. NO-ANSWER case: corpus has no wheat document; retrieval should return no evidence. (ICAR soybean e-book mentions wheat only in rotation context.)'),

-- 16. Fig pruning - NO fig / horticulture document; expected no evidence.
('How do I prune a fig tree?', 'en', 'farmer', 'c27388b6-69d9-474c-8c70-15be6582aa86',
 '{}'::uuid[], '{}'::uuid[],
 NULL, ARRAY['fig'], NULL, ARRAY['crop_production'],
 'Asked 4x. NO-ANSWER case: corpus has no fig or fruit-crop document.'),

-- 17. "Which rice will do well in our area?" - rice variety choice. CRRI catalogue lists varieties with recommended states.
('aamchya bhagat konata tandul changala yeil', 'mr', 'farmer', 'b6758c8a-eb8c-449b-a531-53b2f36bd131',
 ARRAY['a73ece1e-5e49-4973-b437-b3479320f0dd']::uuid[], '{}'::uuid[],
 NULL, ARRAY['rice'], NULL, ARRAY['seeds'],
 'Romanised Marathi -> mr. Area not named; CRRI catalogue is the only variety source. Rice (1) POP is not a variety list, so not included.'),

-- 18. "Which rice variety should I choose?" - same mapping as row 17.
('mi konata tandul van nivadu', 'mr', 'farmer', 'ca1c7b19-af67-450c-ac26-fd6c4dceaaed',
 ARRAY['a73ece1e-5e49-4973-b437-b3479320f0dd']::uuid[], '{}'::uuid[],
 NULL, ARRAY['rice'], NULL, ARRAY['seeds'],
 'Romanised Marathi -> mr ("van" = वाण, variety).'),

-- 19. "But I live in Maharashtra? How will I get Bihar rice?" - follow-up about a Bihar-recommended variety. CRRI catalogue lists which varieties are released for Maharashtra/Bihar, so it partially answers; seed procurement itself is not in the corpus.
('pn mi maharashtra madhye rahato? mala bhihar cha tandul kasa milel', 'mr', 'farmer', '43d95f9a-4353-4093-9e0c-dc8b68c08eb3',
 ARRAY['a73ece1e-5e49-4973-b437-b3479320f0dd']::uuid[], '{}'::uuid[],
 NULL, ARRAY['rice'], ARRAY['MH','BR'], ARRAY['seeds'],
 'UNSURE: follow-up to a prior answer. The "how do I get the seed" part is not in the corpus; CRRI catalogue answers only the suitability-by-state part (it names MH and Bihar releases). Reviewer may prefer ''{}''. Romanised Marathi -> mr.'),

-- 20. "Which sugarcane crop should I take? Which variety gives the most income?" - AICRP sugarcane varieties catalogue (yield, sucrose, maturity per variety).
('mi konta us pik ghevu? koanti jat jast income dete?', 'mr', 'farmer', '56a9b725-b7fe-4351-bb4b-00ed9bd7737f',
 ARRAY['8efd6f98-16c2-46f4-8b01-2931f8993144']::uuid[], '{}'::uuid[],
 NULL, ARRAY['sugarcane'], NULL, ARRAY['seeds','market_prices'],
 'Asked 3x. Romanised Marathi -> mr ("us" = ऊस, sugarcane; "jat" = जात, variety). Income is answered indirectly via yield/quality figures.'),

-- 21. Detailed schedule (crop calendar) for rice - Rice (1) package of practices.
('give me detailed schedule for rice', 'en', 'farmer', 'd89da83e-75c0-41fb-be33-0aa2fa69eba0',
 ARRAY['2b7dd138-9ab7-49d8-93a1-fe898069954f']::uuid[], '{}'::uuid[],
 NULL, ARRAY['rice'], NULL, ARRAY['crop_production'],
 'Rice POP covers land prep, nursery, transplanting, fertiliser, water, weed/pest/disease and harvest.'),

-- 22. "Which sugarcane should I plant?" (Romanised, typo "kanata") - AICRP sugarcane varieties.
('mi kanata us lavu', 'mr', 'farmer', '7a593c0f-2150-462b-8373-0befb4290beb',
 ARRAY['8efd6f98-16c2-46f4-8b01-2931f8993144']::uuid[], '{}'::uuid[],
 NULL, ARRAY['sugarcane'], NULL, ARRAY['seeds'],
 'Romanised Marathi -> mr. Same intent as rows 23 and 24.'),

-- 23. "Which sugarcane should I plant?" (Romanised, spelling "Uas laavu") - same mapping.
('MI konata Uas laavu', 'mr', 'farmer', 'd46a0c2d-8b37-4afc-9cc3-741ddde2689c',
 ARRAY['8efd6f98-16c2-46f4-8b01-2931f8993144']::uuid[], '{}'::uuid[],
 NULL, ARRAY['sugarcane'], NULL, ARRAY['seeds'],
 'Romanised Marathi -> mr. Kept the farmer''s original casing/spelling.'),

-- 24. "Which sugarcane should I plant?" (Devanagari) - same mapping. Asked 4x.
('मी कोणता उस लावू', 'mr', 'farmer', '384c975b-23ee-4f23-a61d-ac916346b65e',
 ARRAY['8efd6f98-16c2-46f4-8b01-2931f8993144']::uuid[], '{}'::uuid[],
 NULL, ARRAY['sugarcane'], NULL, ARRAY['seeds'],
 'Asked 4x. Marathi markers (मी, कोणता, लावू) -> mr.'),

-- 25. "I want to grow wheat, which variety is good?" - NO wheat document; expected no evidence.
('mala gahu pik ghyache aahe ani konta van chnagala aahe', 'mr', 'farmer', 'c4fcf9b6-b17c-4a62-b4f0-ca239b82c5e7',
 '{}'::uuid[], '{}'::uuid[],
 NULL, ARRAY['wheat'], NULL, ARRAY['seeds'],
 'NO-ANSWER case: corpus has no wheat document. Romanised Marathi -> mr ("gahu" = गहू, wheat).'),

-- 26. "How do I grow soybean and which high-yielding seed?" - all three soybean POPs (cultivation) plus MPKV per-variety productivity; the journal shows KDS 726 out-yielding KDS 753, so it plausibly answers the "which seed" half.
('मी सोयाबीन पिक कसे घेवू आणू जास्त उत्पन्न देणारे बी कोणते', 'mr', 'farmer', '34468f78-e5fb-41b3-899f-3abf3612349c',
 ARRAY['a71df452-c9e1-4597-8306-4767d7406f22','5cbe147f-85f1-49e1-b3ef-7b81028f3e23','327db5c1-ed3b-4def-be90-ac1273653e24','36fda809-1bee-4626-bc7d-ed0cabf4673c']::uuid[], '{}'::uuid[],
 NULL, ARRAY['soybean'], NULL, ARRAY['crop_production','seeds'],
 'UNSURE about including the journal (36fda809): it is a trial paper, not a POP, but it does compare variety yields. Drop it if the reviewer wants POPs only. Marathi markers (मी, कोणते) -> mr.'),

-- 27. "Can I grow apple on my farm?" - NO apple / fruit document; expected no evidence.
('majya shetata me safarchnad lagvad karu shakto ka?', 'mr', 'farmer', '9cda714c-bc91-4883-a981-ed5f364f7755',
 '{}'::uuid[], '{}'::uuid[],
 NULL, ARRAY['apple'], NULL, ARRAY['crop_production'],
 'NO-ANSWER case: corpus has no apple document. Romanised Marathi -> mr ("safarchnad" = सफरचंद, apple).'),

-- 28. "Which rice crop is short-duration and needs less water?" - CRRI catalogue lists duration and drought-tolerant / aerobic / upland varieties (e.g. 90-95 day drought-tolerant lines).
('कमी कालावधी व  कमी पाण्याचा भात पिक कोणते', 'mr', 'farmer', 'f4263a71-b4ab-42ca-84a8-f77e2ac0ab17',
 ARRAY['a73ece1e-5e49-4973-b437-b3479320f0dd']::uuid[], '{}'::uuid[],
 NULL, ARRAY['rice'], NULL, ARRAY['seeds','irrigation'],
 'Marathi markers (कोणते, पाण्याचा) -> mr. Kept the farmer''s double space.'),

-- 29. "What to do for higher sugarcane yield, want a complete plan" - the only sugarcane doc is the AICRP varieties catalogue, which answers only the variety-choice part of a full plan.
('जास्त उस उत्पादन साठी काय करावे, संपूर्ण नियोजन हवे', 'mr', 'farmer', '6c7573f6-5284-4bcd-9885-dcf0ed3a7edb',
 ARRAY['8efd6f98-16c2-46f4-8b01-2931f8993144']::uuid[], '{}'::uuid[],
 NULL, ARRAY['sugarcane'], NULL, ARRAY['crop_production','seeds'],
 'UNSURE: corpus has no sugarcane package of practices, so a "complete plan" is only partially answerable (variety selection). Mapped to the AICRP varieties doc as the only sugarcane evidence; reviewer may prefer ''{}''. Marathi markers (साठी, काय, करावे, हवे) -> mr.'),

-- 30. Bare variety code "kds 726" (Phule Sangam soybean). Journal has 7 chunks naming KDS 726; MPKV chunk 5c18770e is the "Phule Sangam (KDS 726)" POP entry.
('kds 726', 'mr', 'farmer', 'dc21bd5f-962d-4910-a0a2-199116bcc0da',
 ARRAY['36fda809-1bee-4626-bc7d-ed0cabf4673c','327db5c1-ed3b-4def-be90-ac1273653e24']::uuid[],
 ARRAY['5c18770e-7739-49ec-becc-abd5bf6db538','205a33f6-9cfc-4cad-8f0e-283a900f4b75','f8fb5efd-0f41-4321-850a-5845830b68ea','87538aef-b043-4638-82b3-3e18cf347799','807634bf-b787-4cda-ba23-6024dfd29ae8','8b9941e6-d589-4a9f-9c5e-2f20aa64f934','4ebdeb06-71f9-47ed-b21d-65d0f670463b','7ae916f8-a52f-462e-a996-54d53d5bc6dd']::uuid[],
 ARRAY['kds 726'], ARRAY['soybean'], NULL, ARRAY['seeds'],
 'Identifier-only query (no question words). Kept because it is a variety lookup, not a place name. Language set to mr because the text has no language and the same conversation continued in Marathi; reviewer may change. KDS 726 = Phule Sangam (MPKV).'),

-- 31. "Is this KDS a soybean variety, and which one?" - MPKV lists Phule Agrani (KDS 344), Phule Sangam (KDS 726), Phule Durva (KDS 992); journal is about KDS-726/753; ICAR e-book lists KDS 344 in a variety list.
('सोयाबीन मध्ये ही kds जात आहे का आणि कोणती आहे', 'mr', 'farmer', '6c4c844c-7722-4a63-810f-20ee6c61bdee',
 ARRAY['327db5c1-ed3b-4def-be90-ac1273653e24','36fda809-1bee-4626-bc7d-ed0cabf4673c','a71df452-c9e1-4597-8306-4767d7406f22']::uuid[],
 ARRAY['5c18770e-7739-49ec-becc-abd5bf6db538','cbb4d88e-11b5-4527-9642-1abcc283ca26','205a33f6-9cfc-4cad-8f0e-283a900f4b75','21c9f0a6-719a-4d12-859a-578658975714']::uuid[],
 ARRAY['kds'], ARRAY['soybean'], NULL, ARRAY['seeds'],
 'Marathi markers (आहे, कोणती, का) -> mr. "kds" is the identifier as written (lower case). Follow-up to row 30 in the same conversation.'),

-- 32. "What is KDS 726?" (Romanised Marathi, upper case) - same evidence as row 30.
('kds 726 HE KAY AAAHE?', 'mr', 'farmer', 'f2b81aed-6483-456f-84a0-e4bb64c4d882',
 ARRAY['36fda809-1bee-4626-bc7d-ed0cabf4673c','327db5c1-ed3b-4def-be90-ac1273653e24']::uuid[],
 ARRAY['5c18770e-7739-49ec-becc-abd5bf6db538','205a33f6-9cfc-4cad-8f0e-283a900f4b75','f8fb5efd-0f41-4321-850a-5845830b68ea','87538aef-b043-4638-82b3-3e18cf347799','807634bf-b787-4cda-ba23-6024dfd29ae8','8b9941e6-d589-4a9f-9c5e-2f20aa64f934','4ebdeb06-71f9-47ed-b21d-65d0f670463b','7ae916f8-a52f-462e-a996-54d53d5bc6dd']::uuid[],
 ARRAY['kds 726'], ARRAY['soybean'], NULL, ARRAY['seeds'],
 'Romanised Marathi ("he kay aahe" = हे काय आहे) -> mr. Farmer''s casing kept.'),

-- 33. "I want to grow KDS 726, give complete information" - MPKV Phule Sangam entry (soil, season, seed rate, productivity) + journal + the two general soybean POPs for full cultivation practice.
('MALA KDS 726   याचे पिक घ्यायचे आहे संपूर्ण माहिती दे', 'mr', 'farmer', 'cdab3598-c22a-49a0-96c5-a675df02f282',
 ARRAY['327db5c1-ed3b-4def-be90-ac1273653e24','36fda809-1bee-4626-bc7d-ed0cabf4673c','a71df452-c9e1-4597-8306-4767d7406f22','5cbe147f-85f1-49e1-b3ef-7b81028f3e23']::uuid[],
 ARRAY['5c18770e-7739-49ec-becc-abd5bf6db538','205a33f6-9cfc-4cad-8f0e-283a900f4b75','8b9941e6-d589-4a9f-9c5e-2f20aa64f934','7ae916f8-a52f-462e-a996-54d53d5bc6dd']::uuid[],
 ARRAY['KDS 726'], ARRAY['soybean'], NULL, ARRAY['seeds','crop_production'],
 'Mixed Romanised + Devanagari Marathi (आहे, माहिती दे) -> mr. Identifier kept in the farmer''s upper case. MPKV chunk 5c18770e is the primary hit (Phule Sangam (KDS 726) POP entry); general soybean POPs added for the "complete information" part.');
