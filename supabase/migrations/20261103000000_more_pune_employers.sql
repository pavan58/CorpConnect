-- More Pune employers (requested: NICE, Perforce, Jio) + other large Pune tech/BFSI/engineering offices.
-- Idempotent: safe to re-run.
with c(slug, name, campus, domains) as (values
  ('nice',           'NICE',                      'Magarpatta / Kharadi',        array['nice.com']),
  ('perforce',       'Perforce Software',         'Baner / Kharadi',             array['perforce.com']),
  ('jio',            'Jio Platforms',             'Pune',                        array['jio.com']),
  ('reliance',       'Reliance Industries',       'Pune',                        array['ril.com']),
  ('siemens',        'Siemens',                   'Kalwa / Baner',               array['siemens.com']),
  ('citi',           'Citi',                      'Kharadi (EON / WTC)',         array['citi.com']),
  ('bajaj-finserv',  'Bajaj Finserv',             'Viman Nagar / Yerwada',       array['bajajfinserv.in']),
  ('eaton',          'Eaton',                     'Magarpatta / Kharadi',        array['eaton.com']),
  ('john-deere',     'John Deere',                'Magarpatta / Hadapsar',       array['johndeere.com']),
  ('honeywell',      'Honeywell',                 'Hadapsar / Kharadi',          array['honeywell.com']),
  ('fiserv',         'Fiserv',                    'Kharadi / Hinjawadi',         array['fiserv.com']),
  ('mphasis',        'Mphasis',                   'Hinjawadi / Kharadi',         array['mphasis.com']),
  ('emerson',        'Emerson',                   'Hinjawadi / Pimpri',          array['emerson.com']),
  ('veritas',        'Veritas Technologies',      'Baner',                       array['veritas.com']),
  ('druva',          'Druva',                     'Baner',                       array['druva.com']),
  ('pubmatic',       'PubMatic',                  'Kalyani Nagar / Baner',       array['pubmatic.com']),
  ('icertis',        'Icertis',                   'Baner / Kharadi',             array['icertis.com']),
  ('sas',            'SAS',                       'Magarpatta',                  array['sas.com']),
  ('xoriant',        'Xoriant',                   'Hinjawadi / Kharadi',         array['xoriant.com']),
  ('globant',        'Globant',                   'Hinjawadi / Baner',           array['globant.com']),
  ('deloitte',       'Deloitte',                  'Yerwada / Kharadi',           array['deloitte.com']),
  ('ey',             'EY',                        'Kharadi / Yerwada',           array['ey.com']),
  ('kpmg',           'KPMG',                      'Yerwada / Kharadi',           array['kpmg.com']),
  ('pwc',            'PwC',                       'Yerwada / Kharadi',           array['pwc.com'])
), ins as (
  insert into public.companies (slug, name, pune_campus)
  select slug, name, campus from c
  on conflict (slug) do update set name = excluded.name
  returning id, slug
)
insert into public.company_domains (domain, company_id)
select d, ins.id from c join ins using (slug), unnest(c.domains) as d
on conflict (domain) do nothing;
