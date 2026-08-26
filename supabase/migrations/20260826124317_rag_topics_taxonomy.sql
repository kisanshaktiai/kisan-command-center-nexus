-- ============================================================================
-- RAG topic taxonomy (category of knowledge: seeds, fertilizer, weed control…)
--
-- Why a separate dimension:
--   authority_tier = WHO published (ranking)         — rag_source_registry
--   doc_type       = WHAT FORM the document takes    — scheme / PoP / advisory…
--   crop_codes     = WHICH CROP                      — crops.value
--   topic_codes    = WHAT SUBJECT (this migration)   — rag_topics.code
--
-- topic_codes is denormalised onto rag_chunks like crop_codes so both search
-- RPCs can filter at chunk level without an extra join.
-- ============================================================================

-- 1. SSOT table --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rag_topics (
  code         text PRIMARY KEY CHECK (code ~ '^[a-z][a-z0-9_]{2,40}$'),
  label        text NOT NULL,
  topic_group  text NOT NULL,            -- inputs | protection | agronomy | economics | other
  storage_dir  text NOT NULL UNIQUE      -- folder segment used in the rag-documents bucket
               CHECK (storage_dir ~ '^[a-z0-9-]{2,40}$'),
  aliases      text[] NOT NULL DEFAULT '{}',  -- keywords for auto-suggest from file name / title
  description  text,
  sort_order   integer NOT NULL DEFAULT 100,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rag_topics IS
  'Subject taxonomy for the RAG corpus. Every rag_documents.topic_codes value must exist here.';

INSERT INTO public.rag_topics (code, label, topic_group, storage_dir, aliases, sort_order) VALUES
  ('seeds',            'Seeds & Varieties',            'inputs',     'seeds',          '{seed,seeds,variety,varieties,hybrid,germination,sowing,beej,bij}', 10),
  ('fertilizer',       'Fertilizer & Nutrition',       'inputs',     'fertilizer',     '{fertilizer,fertiliser,npk,urea,dap,potash,micronutrient,nutrient,manure,khad,khat}', 20),
  ('soil_health',      'Soil Health & Amendments',     'inputs',     'soil',           '{soil,ph,lime,gypsum,compost,vermicompost,organic matter,soil test}', 30),
  ('biostimulants',    'Bio-stimulants & Biofertilizers','inputs',   'biostimulants',  '{biostimulant,biofertilizer,rhizobium,azotobacter,psb,mycorrhiza,seaweed,humic}', 40),
  ('weed_control',     'Weed Control',                 'protection', 'weed-control',   '{weed,weeds,weeding,weed management,tan,khurpi}', 50),
  ('herbicides',       'Herbicides',                   'protection', 'herbicides',     '{herbicide,herbicides,glyphosate,2,4-d,pendimethalin,atrazine,pre-emergence,post-emergence}', 60),
  ('pest_management',  'Pest Management (IPM)',        'protection', 'pest-management','{pest,pests,ipm,integrated pest,borer,aphid,whitefly,thrips,keed,kida}', 70),
  ('insecticides',     'Insecticides',                 'protection', 'insecticides',   '{insecticide,insecticides,pesticide,pesticides,imidacloprid,chlorpyrifos,spray schedule}', 80),
  ('disease_management','Disease Management',          'protection', 'disease',        '{disease,diseases,blight,rust,wilt,rot,mildew,rog}', 90),
  ('fungicides',       'Fungicides & Bactericides',    'protection', 'fungicides',     '{fungicide,fungicides,bactericide,mancozeb,carbendazim,copper oxychloride}', 100),
  ('crop_production',  'Crop Production & Package of Practices','agronomy','crop-production','{cultivation,package of practices,pop,agronomy,production technology,lagwad}', 110),
  ('irrigation',       'Irrigation & Water',           'agronomy',   'irrigation',     '{irrigation,water,drip,sprinkler,fertigation,pani,sinchan}', 120),
  ('harvest_postharvest','Harvest & Post-harvest',     'agronomy',   'post-harvest',   '{harvest,harvesting,post-harvest,storage,grading,drying,threshing,kapni}', 130),
  ('machinery',        'Farm Machinery & Equipment',   'agronomy',   'machinery',      '{machinery,equipment,tractor,implement,sprayer,drone,mechanization}', 140),
  ('organic_natural',  'Organic & Natural Farming',    'agronomy',   'organic',        '{organic,natural farming,zbnf,jeevamrut,beejamrut,panchagavya,sendriya}', 150),
  ('climate_weather',  'Climate & Weather Advisory',   'agronomy',   'climate',        '{weather,climate,rainfall,monsoon,frost,heat wave,agromet,hawaman}', 160),
  ('livestock',        'Livestock & Dairy',            'agronomy',   'livestock',      '{livestock,dairy,cattle,goat,poultry,fodder,pashu}', 170),
  ('schemes_subsidy',  'Schemes, Subsidies & Insurance','economics', 'schemes',        '{scheme,subsidy,yojana,pm-kisan,pmfby,insurance,loan,kcc}', 180),
  ('market_prices',    'Markets & Prices',             'economics',  'markets',        '{market,mandi,price,msp,procurement,enam,bhav}', 190),
  ('general',          'General / Uncategorised',      'other',      'general',        '{}', 999)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.rag_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rag_topics_read ON public.rag_topics;
CREATE POLICY rag_topics_read ON public.rag_topics
  FOR SELECT TO authenticated USING (true);
-- writes: service role only (managed from rag-admin / migrations)

-- 2. Columns + indexes -------------------------------------------------------
ALTER TABLE public.rag_documents ADD COLUMN IF NOT EXISTS topic_codes text[];
ALTER TABLE public.rag_chunks    ADD COLUMN IF NOT EXISTS topic_codes text[];

CREATE INDEX IF NOT EXISTS rag_documents_topic_codes_gin ON public.rag_documents USING gin (topic_codes);
CREATE INDEX IF NOT EXISTS rag_chunks_topic_codes_gin    ON public.rag_chunks    USING gin (topic_codes);

-- 3. Validate topic_codes ⊂ rag_topics.code (mirrors how crop codes are checked)
CREATE OR REPLACE FUNCTION public.rag_validate_topic_codes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE v_bad text[];
BEGIN
  IF NEW.topic_codes IS NULL OR array_length(NEW.topic_codes, 1) IS NULL THEN
    NEW.topic_codes := NULL;
    RETURN NEW;
  END IF;
  SELECT array_agg(t) INTO v_bad
  FROM unnest(NEW.topic_codes) AS t
  WHERE NOT EXISTS (SELECT 1 FROM public.rag_topics r WHERE r.code = t AND r.is_active);
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Unknown or inactive topic codes: %', array_to_string(v_bad, ', ')
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_rag_documents_topic_codes ON public.rag_documents;
CREATE TRIGGER trg_rag_documents_topic_codes
  BEFORE INSERT OR UPDATE OF topic_codes ON public.rag_documents
  FOR EACH ROW EXECUTE FUNCTION public.rag_validate_topic_codes();

-- 4. Search RPCs: add p_topics (appended with DEFAULT so existing callers keep
--    working). DROP first — CREATE OR REPLACE with a new arg list would create
--    an overload and make calls with fewer args ambiguous.
DROP FUNCTION IF EXISTS public.rag_search_vector(vector, integer, text[], text[], text[], uuid);
CREATE FUNCTION public.rag_search_vector(
  p_embedding vector,
  p_limit integer DEFAULT 20,
  p_states text[] DEFAULT NULL,
  p_crops text[] DEFAULT NULL,
  p_doc_types text[] DEFAULT NULL,
  p_tenant uuid DEFAULT NULL,
  p_topics text[] DEFAULT NULL
)
RETURNS TABLE(chunk_id uuid, document_id uuid, chunk_text text, section_path text, page_number integer,
              language character varying, score double precision, title text, publisher text,
              authority_tier text, doc_type text, doc_version text, topic_codes text[])
LANGUAGE sql STABLE
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT c.id, c.document_id, c.chunk_text, c.section_path,
         c.page_number, c.language,
         (1 - (c.embedding OPERATOR(extensions.<=>) p_embedding))::double precision AS score,
         d.title, r.publisher, r.authority_tier, d.doc_type, d.doc_version,
         COALESCE(c.topic_codes, d.topic_codes) AS topic_codes
  FROM rag_chunks c
  JOIN rag_documents d ON d.id = c.document_id
  JOIN rag_source_registry r ON r.id = d.source_id
  WHERE c.is_active AND d.is_active AND r.is_active
    AND c.embedding IS NOT NULL
    AND (d.tenant_id IS NULL OR d.tenant_id = p_tenant)
    AND (p_states IS NULL OR d.state_codes IS NULL OR d.state_codes && p_states)
    AND (p_doc_types IS NULL OR d.doc_type = ANY(p_doc_types))
    AND (p_crops IS NULL OR c.crop_codes && p_crops OR d.crop_codes && p_crops
         OR (c.crop_codes IS NULL AND d.crop_codes IS NULL))
    AND (p_topics IS NULL OR c.topic_codes && p_topics OR d.topic_codes && p_topics
         OR (c.topic_codes IS NULL AND d.topic_codes IS NULL))
  ORDER BY c.embedding OPERATOR(extensions.<=>) p_embedding
  LIMIT p_limit;
$function$;

DROP FUNCTION IF EXISTS public.rag_search_fulltext(text, integer, text[], text[], text[], uuid);
CREATE FUNCTION public.rag_search_fulltext(
  p_query text,
  p_limit integer DEFAULT 20,
  p_states text[] DEFAULT NULL,
  p_crops text[] DEFAULT NULL,
  p_doc_types text[] DEFAULT NULL,
  p_tenant uuid DEFAULT NULL,
  p_topics text[] DEFAULT NULL
)
RETURNS TABLE(chunk_id uuid, document_id uuid, chunk_text text, section_path text, page_number integer,
              language character varying, score double precision, title text, publisher text,
              authority_tier text, doc_type text, doc_version text, topic_codes text[])
LANGUAGE plpgsql STABLE
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_terms text[];
  v_groonga_query text;
BEGIN
  SELECT array_agg(extensions.pgroonga_query_escape(w))
  INTO v_terms
  FROM (
    SELECT w FROM unnest(
      regexp_split_to_array(trim(p_query), '[\s,;:!?()"''।]+')
    ) AS w
    WHERE length(w) >= 2
    LIMIT 10
  ) t;

  IF v_terms IS NULL OR array_length(v_terms,1) = 0 THEN
    v_groonga_query := extensions.pgroonga_query_escape(trim(p_query));
  ELSE
    v_groonga_query := array_to_string(v_terms, ' OR ');
  END IF;

  RETURN QUERY
  SELECT c.id, c.document_id, c.chunk_text, c.section_path,
         c.page_number, c.language,
         pgroonga_score(c.tableoid, c.ctid)::double precision AS score,
         d.title, r.publisher, r.authority_tier, d.doc_type, d.doc_version,
         COALESCE(c.topic_codes, d.topic_codes) AS topic_codes
  FROM rag_chunks c
  JOIN rag_documents d ON d.id = c.document_id
  JOIN rag_source_registry r ON r.id = d.source_id
  WHERE c.is_active AND d.is_active AND r.is_active
    AND c.chunk_text &@~ v_groonga_query
    AND (d.tenant_id IS NULL OR d.tenant_id = p_tenant)
    AND (p_states IS NULL OR d.state_codes IS NULL OR d.state_codes && p_states)
    AND (p_doc_types IS NULL OR d.doc_type = ANY(p_doc_types))
    AND (p_crops IS NULL OR c.crop_codes && p_crops OR d.crop_codes && p_crops
         OR (c.crop_codes IS NULL AND d.crop_codes IS NULL))
    AND (p_topics IS NULL OR c.topic_codes && p_topics OR d.topic_codes && p_topics
         OR (c.topic_codes IS NULL AND d.topic_codes IS NULL))
  ORDER BY score DESC
  LIMIT p_limit;
END $function$;

-- 5. Optional back-fill for documents ingested before this migration.
--    The one live PoP is a cultivation guide:
UPDATE public.rag_documents SET topic_codes = '{crop_production}'
  WHERE topic_codes IS NULL AND doc_type = 'package_of_practices';
UPDATE public.rag_chunks c SET topic_codes = d.topic_codes
  FROM public.rag_documents d
  WHERE c.document_id = d.id AND c.topic_codes IS NULL AND d.topic_codes IS NOT NULL;
