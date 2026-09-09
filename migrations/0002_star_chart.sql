-- Classroom star chart
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

insert into settings (id, class_name, pin_salt, pin_hash)
values (
  1,
  '陽光班',
  's7c9k2m4n8p1q5r3',
  '24ec5e52ef17d82304a34b0daf00961ed4740908b72fe2de7de478c3c26ce972'
)
on conflict (id) do nothing;
