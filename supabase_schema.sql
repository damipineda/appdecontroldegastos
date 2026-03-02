-- 1. Habilitar UUIDs (si no está habilitado)
create extension if not exists "uuid-ossp";

-- 2. Tabla de CATEGORÍAS
create table categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  nombre text not null,
  emoji text,
  color text,
  tipo text check (tipo in ('gasto', 'ingreso')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS para Categorías
alter table categories enable row level security;
create policy "Usuarios pueden ver sus propias categorias" on categories for select using (auth.uid() = user_id);
create policy "Usuarios pueden insertar sus propias categorias" on categories for insert with check (auth.uid() = user_id);
create policy "Usuarios pueden actualizar sus propias categorias" on categories for update using (auth.uid() = user_id);
create policy "Usuarios pueden eliminar sus propias categorias" on categories for delete using (auth.uid() = user_id);


-- 3. Tabla de TRANSACCIONES (Gastos e Ingresos)
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  concepto text not null,
  monto numeric not null,
  category_id uuid references categories(id),
  fecha date not null,
  hora time,
  tipo text check (tipo in ('gasto', 'ingreso')),
  metodo_pago text,
  recurrente boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS para Transacciones
alter table transactions enable row level security;
create policy "Usuarios pueden ver sus transacciones" on transactions for select using (auth.uid() = user_id);
create policy "Usuarios pueden insertar sus transacciones" on transactions for insert with check (auth.uid() = user_id);
create policy "Usuarios pueden actualizar sus transacciones" on transactions for update using (auth.uid() = user_id);
create policy "Usuarios pueden eliminar sus transacciones" on transactions for delete using (auth.uid() = user_id);


-- 4. Tabla de PRESUPUESTOS
create table budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  category_id uuid references categories(id),
  monto numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, category_id)
);

-- RLS para Presupuestos
alter table budgets enable row level security;
create policy "Usuarios pueden ver sus presupuestos" on budgets for select using (auth.uid() = user_id);
create policy "Usuarios pueden insertar sus presupuestos" on budgets for insert with check (auth.uid() = user_id);
create policy "Usuarios pueden actualizar sus presupuestos" on budgets for update using (auth.uid() = user_id);
create policy "Usuarios pueden eliminar sus presupuestos" on budgets for delete using (auth.uid() = user_id);


-- 5. Tabla de PLANTILLAS RECURRENTES (Luz, Agua, Netflix...)
create table recurrent_templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  concepto text not null,
  monto numeric, 
  emoji text, -- Nuevo campo
  category_id uuid references categories(id),
  dia_vencimiento integer check (dia_vencimiento between 1 and 31),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table recurrent_templates enable row level security;
create policy "Usuarios ver templates" on recurrent_templates for select using (auth.uid() = user_id);
create policy "Usuarios insertar templates" on recurrent_templates for insert with check (auth.uid() = user_id);
create policy "Usuarios actualizar templates" on recurrent_templates for update using (auth.uid() = user_id);
create policy "Usuarios eliminar templates" on recurrent_templates for delete using (auth.uid() = user_id);


-- 6. Tabla de DEUDAS (Tarjetas, Préstamos)
create table debts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  concepto text not null,
  emoji text, -- Nuevo campo
  monto_total numeric not null,
  cuota_monto numeric, -- Nuevo: Monto mensual aproximado
  total_cuotas integer not null default 1,
  cuotas_pagadas integer not null default 0,
  fecha_inicio date, -- Nuevo: Cuándo empezó
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table debts enable row level security;
create policy "Usuarios ver deudas" on debts for select using (auth.uid() = user_id);
create policy "Usuarios insertar deudas" on debts for insert with check (auth.uid() = user_id);
create policy "Usuarios actualizar deudas" on debts for update using (auth.uid() = user_id);
create policy "Usuarios eliminar deudas" on debts for delete using (auth.uid() = user_id);


-- 7. Actualizar Transacciones para vincular Deudas
alter table transactions add column debt_id uuid references debts(id);
