-- Classroom star chart: unowned shared board (auth off).
-- Writes are gated by a teacher PIN / unlock token, not by user accounts.

create table if not exists settings (
  id integer primary key check (id = 1),
  class_name text not null default '陽光班',
  pin_salt text not null,
  pin_hash text not null,
  unlock_token text,
  token_expires_at timestamptz
);

create table if not exists students (
  id serial primary key,
  name text not null,
  hue integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists awards (
  id serial primary key,
  student_id integer not null references students(id) on delete cascade,
  category text not null check (category in ('exercise', 'dictation', 'conduct')),
  stars integer not null default 1 check (stars > 0 and stars <= 20),
  created_at timestamptz not null default now()
);

create index if not exists awards_student_id_idx on awards (student_id);
create index if not exists awards_created_at_idx on awards (created_at desc);

-- Default teacher PIN is 2468 (hashed with the stored salt).
insert into settings (id, class_name, pin_salt, pin_hash)
values (
  1,
  '陽光班',
  's7c9k2m4n8p1q5r3',
  '24ec5e52ef17d82304a34b0daf00961ed4740908b72fe2de7de478c3c26ce972'
)
on conflict (id) do nothing;

insert into students (name, hue) values
  ('陳嘉怡', 0),
  ('黃子軒', 1),
  ('李樂澄', 2),
  ('張曉晴', 3),
  ('林俊晾', 4),
  ('王詩涵', 5),
  ('周梓朗', 0),
  ('吳詠琳', 1);

insert into awards (student_id, category, stars, created_at)
select s.id, v.category, v.stars, now() - v.ago
from students s
join (
  values
    ('陳嘉怡', 'exercise', 18, interval '6 days'),
    ('陳嘉怡', 'dictation', 14, interval '3 days'),
    ('陳嘉怡', 'conduct', 15, interval '5 hours'),
    ('黃子軒', 'exercise', 14, interval '5 days'),
    ('黃子軒', 'dictation', 10, interval '2 days'),
    ('黃子軒', 'conduct', 8, interval '8 hours'),
    ('李樂澄', 'exercise', 12, interval '4 days'),
    ('李樂澄', 'dictation', 9, interval '26 hours'),
    ('李樂澄', 'conduct', 7, interval '3 hours'),
    ('張曉晴', 'exercise', 8, interval '3 days'),
    ('張曉晴', 'dictation', 7, interval '20 hours'),
    ('張曉晴', 'conduct', 6, interval '12 hours'),
    ('林俊晾', 'exercise', 7, interval '2 days'),
    ('林俊晾', 'dictation', 4, interval '18 hours'),
    ('林俊晾', 'conduct', 4, interval '9 hours'),
    ('王詩涵', 'exercise', 5, interval '30 hours'),
    ('王詩涵', 'dictation', 4, interval '16 hours'),
    ('王詩涵', 'conduct', 3, interval '6 hours'),
    ('周梓朗', 'exercise', 4, interval '22 hours'),
    ('周梓朗', 'dictation', 3, interval '11 hours'),
    ('周梓朗', 'conduct', 2, interval '4 hours'),
    ('吳詠琳', 'exercise', 2, interval '14 hours'),
    ('吳詠琳', 'dictation', 1, interval '7 hours'),
    ('吳詠琳', 'conduct', 1, interval '2 hours')
) as v(name, category, stars, ago)
  on s.name = v.name;
