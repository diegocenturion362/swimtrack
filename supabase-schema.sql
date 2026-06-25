-- ════════════════════════════════════════════════════════════════════════════
-- SwimTrack — esquema de base de datos para Supabase
-- Pegá TODO esto en: Supabase → tu proyecto → SQL Editor → New query → Run
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Tablas (cada fila guarda el objeto completo en una columna jsonb `data`)
create table if not exists swimmers (
  id   text primary key,
  data jsonb not null
);
create table if not exists sessions (
  id         text primary key,
  swimmer_id text,
  data       jsonb not null
);
create table if not exists sets (
  id         text primary key,
  session_id text,
  swimmer_id text,
  data       jsonb not null
);
create table if not exists competitions (
  id         text primary key,
  swimmer_id text,
  data       jsonb not null
);
create table if not exists personal_bests (
  id         text primary key,
  swimmer_id text,
  data       jsonb not null
);

-- 2) Permisos: app sin login, acceso con la anon key (entre vos y Renan).
alter table swimmers       enable row level security;
alter table sessions       enable row level security;
alter table sets           enable row level security;
alter table competitions   enable row level security;
alter table personal_bests enable row level security;

create policy "acceso publico" on swimmers       for all using (true) with check (true);
create policy "acceso publico" on sessions       for all using (true) with check (true);
create policy "acceso publico" on sets           for all using (true) with check (true);
create policy "acceso publico" on competitions   for all using (true) with check (true);
create policy "acceso publico" on personal_bests for all using (true) with check (true);

-- 3) Realtime: que los cambios aparezcan al instante en el otro dispositivo.
alter publication supabase_realtime add table swimmers, sessions, sets, competitions, personal_bests;

-- 4) Nadador inicial (Diego). Ajustá los datos si querés.
insert into swimmers (id, data) values (
  'diego',
  '{"id":"diego","nombre":"Diego Centurión","edad":35,"sexo":"masculino","categoria":"Másters","especialidad":"libre","pruebaPrincipal":"50m Libre","piletaHabitual":"25m","marcaObjetivo":30,"objetivoTemporada":"Mejorar marcas en categoría Másters","entrenadorId":"renan"}'::jsonb
) on conflict (id) do nothing;
