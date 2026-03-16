-- Mantener insumo_stock en sync con insumo_movimientos
-- Fuente de verdad: insumo_movimientos. insumo_stock es solo un cache derivado.

create or replace function public.update_insumo_stock_from_movimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta numeric;
begin
  -- Calcular delta según tipo de movimiento
  if new.tipo = 'ingreso' then
    v_delta := coalesce(new.cantidad, 0);
  elsif new.tipo = 'egreso' then
    v_delta := -coalesce(new.cantidad, 0);
  else
    v_delta := 0;
  end if;

  -- Actualizar/crear fila en insumo_stock
  insert into insumo_stock (insumo_id, cantidad, updated_at)
  values (new.insumo_id, greatest(v_delta, 0), now())
  on conflict (insumo_id)
  do update set
    cantidad   = greatest(insumo_stock.cantidad + v_delta, 0),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_insumo_movimientos_update_stock on insumo_movimientos;

create trigger trg_insumo_movimientos_update_stock
after insert on insumo_movimientos
for each row
execute function public.update_insumo_stock_from_movimiento();

