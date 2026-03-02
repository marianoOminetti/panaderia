import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || "https://clgxrxlccjjqxzvapfav.supabase.co",
  process.env.REACT_APP_SUPABASE_ANON_KEY || "sb_publishable__Kgzp453lSnVoHc7A_ZEhg_CvZ6Mo2D"
);

// ─── INSUMOS INICIALES (del Excel) ───────────────────────────────────────────
const INSUMOS_SEED = [
  { nombre: "Premezcla (casera)", categoria: "Harinas", presentacion: "x kg", precio: 1680, cantidad_presentacion: 1000, unidad: "g" },
  { nombre: "Almidón/Harina de Mandioca", categoria: "Harinas", presentacion: "x 10kg", precio: 23100, cantidad_presentacion: 10000, unidad: "g" },
  { nombre: "Almidón de Maíz", categoria: "Harinas", presentacion: "x 10kg", precio: 14875, cantidad_presentacion: 10000, unidad: "g" },
  { nombre: "Harina de Arroz", categoria: "Harinas", presentacion: "x 25kg", precio: 25000, cantidad_presentacion: 25000, unidad: "g" },
  { nombre: "Harina de Almendras", categoria: "Harinas", presentacion: "x kg", precio: 21500, cantidad_presentacion: 1000, unidad: "g" },
  { nombre: "Harina de Coco", categoria: "Harinas", presentacion: "x kg", precio: 5063.4, cantidad_presentacion: 1000, unidad: "g" },
  { nombre: "Goma Xántica", categoria: "Harinas", presentacion: "x kg", precio: 11000, cantidad_presentacion: 1000, unidad: "g" },
  { nombre: "Polenta (Harina de Maíz)", categoria: "Harinas", presentacion: "x 730g", precio: 2200, cantidad_presentacion: 730, unidad: "g" },
  { nombre: "Puré de Papas Maggi", categoria: "Harinas", presentacion: "x 200g", precio: 2200, cantidad_presentacion: 200, unidad: "g" },
  { nombre: "Manteca", categoria: "Lácteos", presentacion: "x 2.5kg", precio: 29485, cantidad_presentacion: 2500, unidad: "g" },
  { nombre: "Crema Ledevit", categoria: "Lácteos", presentacion: "x 4.7l", precio: 35750, cantidad_presentacion: 4700, unidad: "ml" },
  { nombre: "Queso Tybo", categoria: "Lácteos", presentacion: "x kg", precio: 8676, cantidad_presentacion: 1000, unidad: "g" },
  { nombre: "Queso Mantecoso", categoria: "Lácteos", presentacion: "x kg", precio: 6000, cantidad_presentacion: 1000, unidad: "g" },
  { nombre: "Queso Cremoso", categoria: "Lácteos", presentacion: "x kg", precio: 5900, cantidad_presentacion: 1000, unidad: "g" },
  { nombre: "Huevos", categoria: "Lácteos", presentacion: "x 30 u", precio: 4500, cantidad_presentacion: 30, unidad: "u" },
  { nombre: "Azúcar", categoria: "Azúcares", presentacion: "x kg", precio: 1030, cantidad_presentacion: 1000, unidad: "g" },
  { nombre: "Azúcar Mascabo", categoria: "Azúcares", presentacion: "x kg", precio: 1300, cantidad_presentacion: 1000, unidad: "g" },
  { nombre: "Sacarina", categoria: "Azúcares", presentacion: "x sobre", precio: 10, cantidad_presentacion: 1, unidad: "u" },
  { nombre: "Merengue en Polvo", categoria: "Azúcares", presentacion: "x kg", precio: 8000, cantidad_presentacion: 1000, unidad: "g" },
  { nombre: "Chocolate Semiamargo Coverlux", categoria: "Chocolates", presentacion: "x 800g", precio: 10600, cantidad_presentacion: 800, unidad: "g" },
  { nombre: "Chocolate s/azúcar", categoria: "Chocolates", presentacion: "x 800g", precio: 13000, cantidad_presentacion: 800, unidad: "g" },
  { nombre: "Dulce de Leche", categoria: "Rellenos", presentacion: "x 10kg", precio: 14625, cantidad_presentacion: 10000, unidad: "g" },
  { nombre: "Dulce de Leche s/azúcar", categoria: "Rellenos", presentacion: "x 10kg", precio: 18000, cantidad_presentacion: 10000, unidad: "g" },
  { nombre: "Membrillo", categoria: "Rellenos", presentacion: "x 5kg", precio: 14875, cantidad_presentacion: 5000, unidad: "g" },
  { nombre: "Pollo", categoria: "Proteínas", presentacion: "x kg", precio: 9000, cantidad_presentacion: 1000, unidad: "g" },
  { nombre: "Jamón", categoria: "Proteínas", presentacion: "x kg", precio: 6298.1, cantidad_presentacion: 1000, unidad: "g" },
  { nombre: "Aceite", categoria: "Condimentos", presentacion: "x 1.5l", precio: 4860, cantidad_presentacion: 1500, unidad: "ml" },
  { nombre: "Levadura", categoria: "Condimentos", presentacion: "x 500g", precio: 3200, cantidad_presentacion: 500, unidad: "g" },
  { nombre: "Polvo de Hornear", categoria: "Condimentos", presentacion: "x kg", precio: 10000, cantidad_presentacion: 1000, unidad: "g" },
  { nombre: "Esencia de Vainilla", categoria: "Condimentos", presentacion: "x 2l", precio: 5800, cantidad_presentacion: 2000, unidad: "ml" },
  { nombre: "Coco Rallado", categoria: "Condimentos", presentacion: "x kg", precio: 11333, cantidad_presentacion: 1000, unidad: "g" },
  { nombre: "Puré de Tomate", categoria: "Condimentos", presentacion: "x u", precio: 501.8, cantidad_presentacion: 1, unidad: "u" },
  { nombre: "Vinagre de Manzana", categoria: "Condimentos", presentacion: "x 500ml", precio: 1360, cantidad_presentacion: 500, unidad: "ml" },
  { nombre: "Oreo S/G", categoria: "Condimentos", presentacion: "x u", precio: 280, cantidad_presentacion: 1, unidad: "u" },
  { nombre: "Caja Plástica 1500cc", categoria: "Packaging", presentacion: "x u", precio: 400, cantidad_presentacion: 1, unidad: "u" },
  { nombre: "Bandeja N°13 Cartón", categoria: "Packaging", presentacion: "x u", precio: 350, cantidad_presentacion: 1, unidad: "u" },
  { nombre: "Cartón para Torta", categoria: "Packaging", presentacion: "x u", precio: 500, cantidad_presentacion: 1, unidad: "u" },
  { nombre: "Bolsa Camiseta", categoria: "Packaging", presentacion: "x u", precio: 7, cantidad_presentacion: 1, unidad: "u" },
  { nombre: "Papel Manteca", categoria: "Packaging", presentacion: "x u", precio: 50, cantidad_presentacion: 1, unidad: "u" },
];

const CATEGORIAS = ["Harinas", "Lácteos", "Azúcares", "Chocolates", "Rellenos", "Proteínas", "Condimentos", "Packaging"];
const CAT_COLORS = {
  "Harinas": "#C8A97E", "Lácteos": "#A8D5E2", "Azúcares": "#F4A8C0",
  "Chocolates": "#8B6040", "Rellenos": "#D4A843", "Proteínas": "#E8907A",
  "Condimentos": "#9BC18C", "Packaging": "#B0A8C8"
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cream: #FAF7F2;
    --warm-white: #FFFFFF;
    --brown-dark: #2C1A0E;
    --brown-mid: #6B3F1F;
    --brown-light: #C8A97E;
    --accent: #E8562A;
    --accent-soft: #F5906A;
    --green: #4A7C59;
    --surface: #FFFFFF;
    --border: #EDE8E0;
    --text: #2C1A0E;
    --text-muted: #8B7355;
    --shadow: 0 2px 12px rgba(44,26,14,0.08);
    --shadow-lg: 0 8px 32px rgba(44,26,14,0.12);
  }

  body { font-family: 'DM Sans', sans-serif; background: var(--cream); color: var(--text); }

  .app { max-width: 430px; margin: 0 auto; min-height: 100vh; background: var(--cream); position: relative; padding-bottom: 80px; }

  /* Header */
  .header { background: var(--brown-dark); padding: 20px 20px 16px; position: sticky; top: 0; z-index: 100; }
  .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
  .header h1 { font-family: 'Fraunces', serif; font-size: 22px; color: var(--cream); letter-spacing: -0.5px; }
  .header-subtitle { font-size: 11px; color: var(--brown-light); letter-spacing: 2px; text-transform: uppercase; }
  .header-badge { background: var(--accent); color: white; font-size: 10px; font-weight: 500; padding: 3px 8px; border-radius: 20px; letter-spacing: 0.5px; }

  /* Nav */
  .nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 430px; background: var(--brown-dark); display: flex; border-top: 1px solid rgba(200,169,126,0.2); z-index: 100; }
  .nav-btn { flex: 1; padding: 10px 4px 12px; display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: none; cursor: pointer; color: var(--text-muted); transition: color 0.2s; }
  .nav-btn.active { color: var(--brown-light); }
  .nav-btn .nav-icon { font-size: 20px; }
  .nav-btn .nav-label { font-size: 9px; letter-spacing: 0.8px; text-transform: uppercase; font-family: 'DM Sans', sans-serif; color: inherit; }

  /* Content */
  .content { padding: 16px; }

  /* Page title */
  .page-title { font-family: 'Fraunces', serif; font-size: 26px; color: var(--brown-dark); margin-bottom: 4px; }
  .page-subtitle { font-size: 13px; color: var(--text-muted); margin-bottom: 20px; }

  /* Cards */
  .card { background: var(--surface); border-radius: 16px; padding: 16px; margin-bottom: 12px; box-shadow: var(--shadow); border: 1px solid var(--border); }
  .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .card-title { font-family: 'Fraunces', serif; font-size: 16px; color: var(--brown-dark); }

  /* Stats row */
  .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
  .stat-card { background: var(--surface); border-radius: 14px; padding: 14px; box-shadow: var(--shadow); border: 1px solid var(--border); }
  .dashboard-metrics { background: linear-gradient(135deg, var(--brown-dark) 0%, var(--brown-mid) 100%); border-radius: 16px; padding: 20px; margin-bottom: 16px; color: var(--cream); }
  .dashboard-metric-main { margin-bottom: 12px; }
  .dashboard-metric-label { font-size: 11px; opacity: 0.8; letter-spacing: 1px; text-transform: uppercase; }
  .dashboard-metric-value { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 700; }
  .dashboard-metric-row { display: flex; gap: 20px; }
  .dashboard-metric-mini { display: flex; flex-direction: column; gap: 2px; }
  .dashboard-metric-mini-val { font-weight: 600; font-size: 15px; }
  .dashboard-metric-mini-lbl { font-size: 11px; opacity: 0.8; }
  .dashboard-quick-grid { display: flex; flex-direction: column; gap: 8px; }
  .dashboard-quick { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: var(--cream); border: 1px solid var(--border); border-radius: 12px; width: 100%; text-align: left; cursor: pointer; transition: background 0.2s; }
  .dashboard-quick:hover { background: var(--surface); }
  .dashboard-quick-icon { font-size: 28px; }
  .dashboard-quick-text { flex: 1; }
  .dashboard-quick-label { font-weight: 600; font-size: 15px; color: var(--brown-dark); display: block; }
  .dashboard-quick-sub { font-size: 12px; color: var(--text-muted); }
  .dashboard-quick-badge { background: var(--accent); color: white; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; }
  .dashboard-alert { border-left: 4px solid var(--accent); cursor: pointer; }
  .card-link { background: none; border: none; font-size: 12px; color: var(--accent); cursor: pointer; padding: 0; font-family: inherit; }
  .stat-label { font-size: 10px; color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
  .stat-value { font-family: 'Fraunces', serif; font-size: 22px; color: var(--brown-dark); }
  .stat-value.accent { color: var(--accent); }
  .stat-value.green { color: var(--green); }

  /* Search */
  .search-bar { position: relative; margin-bottom: 16px; }
  .search-bar input { width: 100%; padding: 12px 16px 12px 40px; border: 1px solid var(--border); border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; background: var(--surface); color: var(--text); outline: none; transition: border-color 0.2s; }
  .search-bar input:focus { border-color: var(--brown-light); }
  .search-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); font-size: 16px; }

  /* Category tabs */
  .cat-tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 16px; scrollbar-width: none; }
  .cat-tabs::-webkit-scrollbar { display: none; }
  .cat-tab { flex-shrink: 0; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; border: none; cursor: pointer; transition: all 0.2s; background: var(--surface); color: var(--text-muted); border: 1px solid var(--border); }
  .cat-tab.active { background: var(--brown-dark); color: var(--cream); border-color: var(--brown-dark); }

  /* Insumo item */
  .insumo-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
  .insumo-item:last-child { border-bottom: none; }
  .insumo-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .insumo-info { flex: 1; min-width: 0; }
  .insumo-nombre { font-size: 14px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .insumo-detalle { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
  .insumo-precio { text-align: right; flex-shrink: 0; }
  .insumo-precio-value { font-family: 'Fraunces', serif; font-size: 15px; color: var(--brown-dark); }
  .insumo-precio-unit { font-size: 10px; color: var(--text-muted); }
  .edit-btn { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 5px 8px; font-size: 12px; cursor: pointer; color: var(--text-muted); transition: all 0.2s; }
  .edit-btn:hover { border-color: var(--brown-light); color: var(--brown-mid); }

  /* FAB */
  .fab { position: fixed; bottom: 90px; right: 20px; width: 52px; height: 52px; border-radius: 50%; background: var(--accent); border: none; color: white; font-size: 24px; cursor: pointer; box-shadow: 0 4px 20px rgba(232,86,42,0.4); display: flex; align-items: center; justify-content: center; transition: transform 0.2s; z-index: 99; }
  .fab:active { transform: scale(0.95); }
  .fab-receta { padding: 0 20px; width: auto; border-radius: 26px; gap: 8px; font-size: 14px; font-weight: 500; font-family: 'DM Sans', sans-serif; }

  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: rgba(44,26,14,0.5); z-index: 200; display: flex; align-items: flex-end; }
  .modal { background: var(--surface); border-radius: 24px 24px 0 0; padding: 24px; width: 100%; max-height: 85vh; overflow-y: auto; }
  .screen-overlay { position: fixed; inset: 0; background: var(--cream); z-index: 200; display: flex; flex-direction: column; overflow: hidden; }
  .screen-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: var(--surface); border-bottom: 1px solid var(--border); }
  .screen-back { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--brown-dark); padding: 4px; }
  .screen-title { font-family: 'Fraunces', serif; font-size: 18px; color: var(--brown-dark); }
  .screen-content { flex: 1; overflow-y: auto; padding: 16px; }
  .modal-title { font-family: 'Fraunces', serif; font-size: 20px; color: var(--brown-dark); margin-bottom: 20px; }
  .modal-close { float: right; background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text-muted); }

  /* Form */
  .form-group { margin-bottom: 14px; }
  .form-label { font-size: 11px; color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; display: block; }
  .form-input { width: 100%; padding: 11px 14px; border: 1px solid var(--border); border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--text); background: var(--cream); outline: none; transition: border-color 0.2s; }
  .form-input:focus { border-color: var(--brown-light); background: white; }
  .form-select { width: 100%; padding: 11px 14px; border: 1px solid var(--border); border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--text); background: var(--cream); outline: none; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

  /* Buttons */
  .btn-primary { width: 100%; padding: 14px; background: var(--brown-dark); color: var(--cream); border: none; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
  .btn-primary:hover { background: var(--brown-mid); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary { width: 100%; padding: 12px; background: transparent; color: var(--text-muted); border: 1px solid var(--border); border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; cursor: pointer; margin-top: 8px; }
  .btn-danger { width: 100%; padding: 12px; background: transparent; color: var(--accent); border: 1px solid var(--accent); border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; cursor: pointer; margin-top: 8px; }

  /* Receta card */
  .receta-card { background: var(--surface); border-radius: 16px; padding: 16px; margin-bottom: 10px; box-shadow: var(--shadow); border: 1px solid var(--border); cursor: pointer; transition: transform 0.15s; }
  .receta-card:active { transform: scale(0.99); }
  .receta-top { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .receta-emoji { font-size: 28px; }
  .receta-nombre { font-family: 'Fraunces', serif; font-size: 17px; color: var(--brown-dark); }
  .receta-rinde { font-size: 12px; color: var(--text-muted); }
  .receta-stats { display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid var(--border); }
  .receta-stat { text-align: center; }
  .receta-stat-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; }
  .receta-stat-value { font-family: 'Fraunces', serif; font-size: 15px; color: var(--brown-dark); margin-top: 2px; }
  .receta-stat-value.verde { color: var(--green); }
  .receta-stat-value.rojo { color: var(--accent); }

  /* Toast */
  .toast { position: fixed; top: 80px; left: 50%; transform: translateX(-50%); background: var(--brown-dark); color: var(--cream); padding: 10px 20px; border-radius: 20px; font-size: 13px; z-index: 300; animation: slideDown 0.3s ease; }
  @keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

  /* Loading */
  .loading { display: flex; align-items: center; justify-content: center; padding: 40px; gap: 8px; color: var(--text-muted); font-size: 14px; }
  .spinner { width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--brown-light); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Empty state */
  .empty { text-align: center; padding: 40px 20px; color: var(--text-muted); }
  .empty-icon { font-size: 40px; margin-bottom: 12px; }
  .empty p { font-size: 14px; }

  /* Precio per unit chip */
  .chip { display: inline-flex; align-items: center; gap: 4px; background: var(--cream); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px; font-size: 11px; color: var(--text-muted); }

  /* Ventas */
  .venta-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
  .venta-item:last-child { border-bottom: none; }
  .venta-item-simple { padding: 6px 0; }
  .venta-nombre-simple { font-size: 14px; color: var(--text); }
  .venta-grupo-cliente { font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; }
  .venta-card { margin-bottom: 12px; }
  .venta-card:last-child { margin-bottom: 0; }
  .venta-grupo-total { font-family: 'Fraunces', serif; font-size: 15px; color: var(--brown-dark); font-weight: 600; text-align: right; margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border); }
  .venta-grupo-actions { display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end; }
  .btn-venta-action { font-size: 12px; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--cream); color: var(--text-muted); cursor: pointer; }
  .btn-venta-action:hover { background: var(--border); }
  .btn-venta-delete { color: var(--accent); border-color: rgba(232,86,42,0.3); }
  .venta-emoji { font-size: 22px; }
  .venta-info { flex: 1; }
  .venta-nombre { font-size: 14px; font-weight: 500; }
  .venta-hora { font-size: 11px; color: var(--text-muted); }
  .venta-monto { font-family: 'Fraunces', serif; font-size: 16px; color: var(--green); }

  /* QR scanner placeholder */
  .qr-area { background: var(--brown-dark); border-radius: 20px; padding: 40px 20px; text-align: center; margin-bottom: 16px; }
  .qr-icon { font-size: 56px; margin-bottom: 12px; }
  .qr-text { color: var(--brown-light); font-size: 14px; }
  .qr-btn { background: var(--accent); color: white; border: none; border-radius: 12px; padding: 14px 32px; font-size: 16px; font-weight: 500; cursor: pointer; margin-top: 16px; font-family: 'DM Sans', sans-serif; }

  /* Voice input */
  .voice-row { display: flex; gap: 12px; align-items: stretch; margin-bottom: 16px; }
  .voice-area { flex: 1; background: var(--brown-dark); border-radius: 20px; padding: 24px 20px; text-align: center; }
  .voice-icon { font-size: 40px; margin-bottom: 8px; }
  .voice-text { color: var(--brown-light); font-size: 13px; }
  .voice-btn { background: var(--accent); color: white; border: none; border-radius: 12px; padding: 14px 24px; font-size: 15px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; white-space: nowrap; }
  .voice-btn.listening { background: var(--green); animation: pulse 1.5s ease infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }
  .voice-transcript { font-size: 12px; color: var(--text-muted); margin-top: 8px; font-style: italic; max-height: 40px; overflow: hidden; text-overflow: ellipsis; }
  .voice-parsed-list { margin: 12px 0; text-align: left; }
  .voice-parsed-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); }
  .voice-parsed-item:last-child { border-bottom: none; }
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

/** Contact Picker API - selecciona contacto del celular (Chrome Android con HTTPS) */
async function selectContactFromPhone() {
  if (!navigator.contacts?.select) return { error: "no-support" };
  try {
    const props = ["name", "tel"];
    const contacts = await navigator.contacts.select(props, { multiple: false });
    if (!contacts?.length) return { error: "cancelled" };
    const c = contacts[0];
    const name = c.name?.[0] ?? "";
    const tel = c.tel?.[0] ?? "";
    return { name, tel };
  } catch {
    return { error: "cancelled" };
  }
}
const pctFmt = (n) => `${Math.round(n * 100)}%`;

/** Convierte cantidad de una unidad a la unidad del insumo para el cálculo de costo */
function convertirAUnidadInsumo(cantidad, desdeUnidad, haciaUnidad) {
  const desde = (desdeUnidad || "g").toLowerCase();
  const hacia = (haciaUnidad || "g").toLowerCase();
  if (hacia === "g" || hacia === "kg") {
    const gramos = desde === "kg" ? cantidad * 1000 : cantidad;
    return hacia === "kg" ? gramos / 1000 : gramos;
  }
  if (hacia === "ml" || hacia === "l") {
    const ml = desde === "l" ? cantidad * 1000 : cantidad;
    return hacia === "l" ? ml / 1000 : ml;
  }
  return cantidad; // u
}

/** Parsea texto de voz a ventas: "2 panes lactales, 2 brownies" → [{ receta, cantidad }] */
function parsearVozAVentas(texto, recetas) {
  if (!texto || !recetas?.length) return [];
  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const NUMEROS_ES = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };
  const separadores = /[,;]|\s+y\s+|\s+también\s+|\s+(?=\d+\s|uno\s|dos\s|tres\s|cuatro\s|cinco\s|seis\s|siete\s|ocho\s|nueve\s|diez\s|un\s)/i;
  const segmentos = texto.split(separadores).map((s) => s.trim()).filter(Boolean);
  const resultado = [];

  const parsearCantidad = (t) => {
    const n = parseInt(t, 10);
    if (!isNaN(n)) return n;
    return NUMEROS_ES[t.toLowerCase()] ?? 1;
  };

  const matchReceta = (busqueda) => {
    const b = norm(busqueda);
    const palabras = b.split(/\s+/).filter(Boolean);
    let mejor = null;
    let mejorPuntos = 0;
    for (const r of recetas) {
      const rn = norm(r.nombre);
      let puntos = 0;
      for (const p of palabras) {
        const pSingular = p.replace(/es$/, "").replace(/s$/, "");
        if (rn.includes(p) || rn.includes(pSingular) || rn.split(/\s+/).some((w) => w.startsWith(p) || w.startsWith(pSingular))) puntos++;
      }
      if (puntos > 0 && puntos >= palabras.length * 0.4 && puntos > mejorPuntos) {
        mejorPuntos = puntos;
        mejor = r;
      }
    }
    if (!mejor) {
      for (const r of recetas) {
        if (norm(r.nombre).includes(b) || b.includes(norm(r.nombre))) return r;
      }
    }
    return mejor;
  };

  for (const seg of segmentos) {
    const numInicio = seg.match(/^(\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|un)\s+/i);
    const numFinal = seg.match(/\s+(\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)$/i);
    let cantidad = 1;
    let textoProd = seg;
    if (numInicio) {
      cantidad = parsearCantidad(numInicio[1]);
      textoProd = seg.slice(numInicio[0].length).trim();
    } else if (numFinal) {
      cantidad = parsearCantidad(numFinal[1]);
      textoProd = seg.slice(0, -numFinal[0].length).trim();
    }
    if (!textoProd) continue;
    const receta = matchReceta(textoProd);
    if (receta) resultado.push({ receta, cantidad });
  }
  return resultado;
}

/** Calcula el costo total desde ingredientes del formulario (antes de guardar) */
function costoDesdeIngredientes(ingredientes, insumos) {
  let total = 0;
  for (const ing of ingredientes || []) {
    if (ing.costo_fijo != null && ing.costo_fijo !== "" && parseFloat(ing.costo_fijo) > 0) {
      total += parseFloat(ing.costo_fijo);
      continue;
    }
    if (!ing.insumo_id) continue;
    const insumo = insumos.find((x) => x.id === ing.insumo_id);
    if (!insumo || !insumo.cantidad_presentacion) continue;
    const cant = parseFloat(ing.cantidad) || 0;
    if (cant <= 0) continue;
    const cantConvertida = convertirAUnidadInsumo(cant, ing.unidad || "g", insumo.unidad);
    const precioUnitario = insumo.precio / insumo.cantidad_presentacion;
    total += precioUnitario * cantConvertida;
  }
  return total;
}

/** Agrupa ventas por transaccion_id (1 venta por voz) o individuales */
function agruparVentas(ventas) {
  const porTransaccion = {};
  const sueltas = [];
  for (const v of ventas) {
    const tid = v.transaccion_id;
    if (tid) {
      if (!porTransaccion[tid]) porTransaccion[tid] = [];
      porTransaccion[tid].push(v);
    } else {
      sueltas.push(v);
    }
  }
  const grupos = Object.entries(porTransaccion).map(([tid, items]) => {
    const agregados = agregarItemsPorReceta(items);
    return {
      key: tid,
      items: agregados.length > 0 ? agregados : items,
      rawItems: items,
      total: items.reduce((s, i) => s + (i.precio_unitario || 0) * (i.cantidad || 0), 0),
      cliente_id: items[0]?.cliente_id
    };
  });
  for (const v of sueltas) {
    grupos.push({ key: v.id, items: [v], rawItems: [v], total: v.precio_unitario * v.cantidad, cliente_id: v.cliente_id });
  }
  return grupos.sort((a, b) => {
    const aTime = a.items[0]?.created_at || "";
    const bTime = b.items[0]?.created_at || "";
    return bTime.localeCompare(aTime);
  });
}

/** Agrupa ítems de una transacción por receta (suma cantidades) */
function agregarItemsPorReceta(items) {
  if (!items || items.length === 0) return [];
  const porReceta = {};
  for (const v of items) {
    if (!v || v.receta_id == null) continue;
    const rid = v.receta_id;
    if (!porReceta[rid]) {
      porReceta[rid] = { ...v, cantidad: 0, id: v.id };
    }
    porReceta[rid].cantidad += Number(v.cantidad) || 0;
    if (v.estado_pago === "debe") porReceta[rid].estado_pago = "debe";
  }
  return Object.values(porReceta);
}

/** Calcula el costo total de una receta según sus ingredientes e insumos */
function costoReceta(recetaId, recetaIngredientes, insumos) {
  const ings = recetaIngredientes.filter((i) => i.receta_id === recetaId);
  let total = 0;
  for (const ing of ings) {
    if (ing.costo_fijo != null && ing.costo_fijo > 0) {
      total += ing.costo_fijo;
      continue;
    }
    if (!ing.insumo_id) continue;
    const insumo = insumos.find((x) => x.id === ing.insumo_id);
    if (!insumo || !insumo.cantidad_presentacion) continue;
    const cantConvertida = convertirAUnidadInsumo(
      parseFloat(ing.cantidad) || 0,
      ing.unidad,
      insumo.unidad
    );
    const precioUnitario = insumo.precio / insumo.cantidad_presentacion;
    total += precioUnitario * cantConvertida;
  }
  return total;
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return <div className="toast">{msg}</div>;
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ insumos, recetas, ventas, clientes, stock, onNavigate }) {
  const hoy = new Date().toISOString().split("T")[0];
  const ventasHoy = ventas.filter(v => v.fecha === hoy);
  const ingresoHoy = ventasHoy.reduce((s, v) => s + v.precio_unitario * v.cantidad, 0);
  const unidadesHoy = ventasHoy.reduce((s, v) => s + v.cantidad, 0);
  const stockBajo = recetas.filter(r => (stock || {})[r.id] <= 0);
  const debeTotal = ventas.filter(v => v.estado_pago === "debe").reduce((s, v) => s + v.precio_unitario * v.cantidad, 0);

  const QuickAction = ({ icon, label, sub, tab, alert }) => (
    <button className="dashboard-quick" onClick={() => onNavigate?.(tab)}>
      <span className="dashboard-quick-icon">{icon}</span>
      <div className="dashboard-quick-text">
        <span className="dashboard-quick-label">{label}</span>
        <span className="dashboard-quick-sub">{sub}</span>
      </div>
      {alert && <span className="dashboard-quick-badge">{alert}</span>}
    </button>
  );

  return (
    <div className="content">
      <p className="page-title">Hola 👋</p>
      <p className="page-subtitle">{new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</p>

      <div className="dashboard-metrics">
        <div className="dashboard-metric-main">
          <div className="dashboard-metric-label">Ventas hoy</div>
          <div className="dashboard-metric-value">{fmt(ingresoHoy)}</div>
        </div>
        <div className="dashboard-metric-row">
          <div className="dashboard-metric-mini">
            <span className="dashboard-metric-mini-val">{unidadesHoy}</span>
            <span className="dashboard-metric-mini-lbl">unidades</span>
          </div>
          {debeTotal > 0 && (
            <div className="dashboard-metric-mini" style={{ color: "var(--accent)" }}>
              <span className="dashboard-metric-mini-val">{fmt(debeTotal)}</span>
              <span className="dashboard-metric-mini-lbl">por cobrar</span>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Acceso rápido</span></div>
        <div className="dashboard-quick-grid">
          <QuickAction icon="💰" label="Registrar venta" sub="Manual o por voz" tab="ventas" />
          <QuickAction icon="📥" label="Cargar stock" sub={stockBajo.length > 0 ? `${stockBajo.length} sin stock` : "Por voz o manual"} tab="stock" alert={stockBajo.length > 0 ? stockBajo.length : null} />
          <QuickAction icon="👥" label="Clientes" sub={`${clientes?.length || 0} registrados`} tab="clientes" />
          <QuickAction icon="📦" label="Insumos" sub={`${insumos?.length || 0} productos`} tab="insumos" />
          <QuickAction icon="📋" label="Recetas" sub={`${recetas?.length || 0} recetas`} tab="recetas" />
        </div>
      </div>

      {stockBajo.length > 0 && (
        <div className="card dashboard-alert" onClick={() => onNavigate?.("stock")}>
          <div className="card-header"><span className="card-title">⚠️ Stock bajo</span><span className="card-link" style={{ cursor: "pointer" }}>Ir a Stock →</span></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {stockBajo.slice(0, 6).map(r => (
              <span key={r.id} style={{ fontSize: 12, padding: "4px 10px", background: "var(--surface)", borderRadius: 20, border: "1px solid var(--border)" }}>{r.emoji} {r.nombre}</span>
            ))}
            {stockBajo.length > 6 && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>+{stockBajo.length - 6} más</span>}
          </div>
        </div>
      )}

      {ventasHoy.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">Últimas ventas hoy</span><button type="button" className="card-link" onClick={() => onNavigate?.("ventas")}>Ver todas →</button></div>
          {agruparVentas(ventasHoy).slice(-5).reverse().map((grupo) => {
            const cliente = (clientes || []).find(c => c.id === grupo.cliente_id);
            return (
              <div key={grupo.key} className="venta-item venta-item-simple" style={{ padding: "10px 0" }}>
                <span className="venta-emoji">{(recetas.find(r => r.id === grupo.items[0]?.receta_id))?.emoji || "🍞"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>Cliente: {cliente?.nombre || "—"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{grupo.items.map(v => {
                    const r = recetas.find(r => r.id === v.receta_id);
                    return `${r?.nombre || "—"} x${v.cantidad}`;
                  }).join(", ")}</div>
                </div>
                <div style={{ fontWeight: 600, color: "var(--green)" }}>{fmt(grupo.total)}</div>
              </div>
            );
          })}
        </div>
      )}

      {ventasHoy.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🥐</div>
          <p>No hay ventas hoy.<br />Tocá <strong>Registrar venta</strong> para empezar.</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => onNavigate?.("ventas")}>Ir a Ventas</button>
        </div>
      )}
    </div>
  );
}

// ── INSUMOS ──────────────────────────────────────────────────────────────────
function Insumos({ insumos, insumoStock, insumoMovimientos, registrarMovimientoInsumo, onRefresh, showToast }) {
  const [search, setSearch] = useState("");
  const [catActiva, setCatActiva] = useState("Todos");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", categoria: "Harinas", presentacion: "", precio: "", cantidad_presentacion: "", unidad: "g" });
  const [movModal, setMovModal] = useState(false);
  const [movInsumo, setMovInsumo] = useState(null);
  const [movTipo, setMovTipo] = useState("ingreso");
  const [movCantidad, setMovCantidad] = useState("");
  const [movValor, setMovValor] = useState("");
  const [movSaving, setMovSaving] = useState(false);

  const filtrados = insumos.filter(i => {
    const matchCat = catActiva === "Todos" || i.categoria === catActiva;
    const matchSearch = i.nombre.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openNew = () => { setEditando(null); setForm({ nombre: "", categoria: "Harinas", presentacion: "", precio: "", cantidad_presentacion: "", unidad: "g" }); setModal(true); };
  const openEdit = (i) => { setEditando(i); setForm({ nombre: i.nombre, categoria: i.categoria, presentacion: i.presentacion || "", precio: i.precio, cantidad_presentacion: i.cantidad_presentacion, unidad: i.unidad }); setModal(true); };
  const openMov = (i, tipo) => { setMovInsumo(i); setMovTipo(tipo); setMovCantidad(""); setMovValor(""); setMovModal(true); };

  const save = async () => {
    const precio = parseFloat(form.precio);
    const cantidad_presentacion = parseFloat(form.cantidad_presentacion) || 0;
    if (isNaN(precio) || precio <= 0) {
      showToast("⚠️ Precio inválido");
      return;
    }
    setSaving(true);
    const data = { nombre: form.nombre, categoria: form.categoria, presentacion: form.presentacion, precio, cantidad_presentacion, unidad: form.unidad };
    const { error } = editando
      ? await supabase.from("insumos").update(data).eq("id", editando.id)
      : await supabase.from("insumos").insert(data);
    if (error) {
      showToast("⚠️ Error al guardar");
      setSaving(false);
      return;
    }
    showToast(editando ? "✅ Precio actualizado" : "✅ Insumo agregado");
    setSaving(false);
    setModal(false);
    onRefresh();
  };

  const guardarMovimiento = async () => {
    const cant = parseFloat(movCantidad);
    if (!movInsumo || !cant || cant <= 0) return;
    setMovSaving(true);
    try {
      await registrarMovimientoInsumo(movInsumo.id, movTipo, cant, movValor ? parseFloat(movValor) : null);
      showToast(movTipo === "ingreso" ? `✅ +${cant} ${movInsumo.nombre}` : `✅ Egreso: -${cant} ${movInsumo.nombre}`);
      setMovModal(false);
    } catch {
      showToast("⚠️ Error al registrar movimiento");
    } finally {
      setMovSaving(false);
    }
  };

  const precioPorU = (i) => {
    const den = i.cantidad_presentacion > 0 ? i.cantidad_presentacion : 1;
    const p = (i.precio || 0) / den;
    return i.unidad === "u" ? `${fmt(p)}/u` : `${fmt(p)}/${i.unidad || "g"}`;
  };

  const insumosMap = Object.fromEntries(insumos.map(i => [i.id, i]));

  return (
    <div className="content">
      <p className="page-title">Insumos</p>
      <p className="page-subtitle">{insumos.length} materias primas · ingresos y egresos para calcular ganancia</p>

      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input placeholder="Buscar insumo..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="cat-tabs">
        {["Todos", ...CATEGORIAS].map(c => (
          <button key={c} className={`cat-tab ${catActiva === c ? "active" : ""}`} onClick={() => setCatActiva(c)}>{c}</button>
        ))}
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Stock y precios</span></div>
        {filtrados.length === 0 ? (
          <div className="empty"><div className="empty-icon">📦</div><p>Sin resultados</p></div>
        ) : filtrados.map(i => {
          const stock = (insumoStock || {})[i.id] ?? 0;
          const unidad = i.unidad || "g";
          return (
            <div key={i.id} className="insumo-item">
              <div className="insumo-dot" style={{ background: CAT_COLORS[i.categoria] || "#ccc" }} />
              <div className="insumo-info" style={{ flex: 1 }}>
                <div className="insumo-nombre">{i.nombre}</div>
                <div className="insumo-detalle">{i.presentacion} · <span className="chip">{precioPorU(i)}</span> · Stock: {stock} {unidad}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button className="edit-btn" onClick={() => openMov(i, "ingreso")} title="Ingreso">+</button>
                <button className="edit-btn" onClick={() => openMov(i, "egreso")} title="Egreso" style={{ color: "var(--accent)" }}>−</button>
                <button className="edit-btn" onClick={() => openEdit(i)}>✏️</button>
              </div>
              <div className="insumo-precio" style={{ marginLeft: 8 }}>
                <div className="insumo-precio-value">{fmt(i.precio)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {insumoMovimientos && insumoMovimientos.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">Últimos movimientos</span></div>
          {insumoMovimientos.slice(0, 20).map(m => {
            const ins = insumosMap[m.insumo_id];
            const esEgreso = m.tipo === "egreso";
            return (
              <div key={m.id} className="insumo-item" style={{ borderLeft: esEgreso ? "4px solid var(--accent)" : "4px solid var(--green)", paddingLeft: 12 }}>
                <div style={{ flex: 1 }}>
                  <div className="insumo-nombre" style={{ color: esEgreso ? "var(--accent)" : "inherit" }}>
                    {esEgreso ? "−" : "+"}{m.cantidad} {ins?.nombre || "?"} {esEgreso ? "(egreso)" : "(ingreso)"}
                  </div>
                  <div className="insumo-detalle">
                    {new Date(m.created_at).toLocaleString("es-AR")}
                    {m.valor != null && m.valor > 0 && ` · $${fmt(m.valor)}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button className="fab" onClick={openNew}>+</button>

      {movModal && movInsumo && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setMovModal(false)}>
          <div className="modal">
            <button className="modal-close" onClick={() => setMovModal(false)}>✕</button>
            <h2 className="modal-title">{movTipo === "ingreso" ? "📥 Ingreso" : "📤 Egreso"} · {movInsumo.nombre}</h2>
            <div className="form-group">
              <label className="form-label">Cantidad ({movInsumo.unidad || "g"})</label>
              <input className="form-input" type="number" min="0" step="any" value={movCantidad} onChange={e => setMovCantidad(e.target.value)} placeholder="Ej: 500" />
            </div>
            <div className="form-group">
              <label className="form-label">Valor $ (opcional)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={movValor} onChange={e => setMovValor(e.target.value)} placeholder="Costo o valor del movimiento" />
            </div>
            <button className="btn-primary" onClick={guardarMovimiento} disabled={movSaving || !movCantidad || parseFloat(movCantidad) <= 0}>
              {movSaving ? "Guardando..." : movTipo === "ingreso" ? "Registrar ingreso" : "Registrar egreso"}
            </button>
            <button className="btn-secondary" onClick={() => setMovModal(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            <h2 className="modal-title">{editando ? "Editar insumo" : "Nuevo insumo"}</h2>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Harina de almendras" />
            </div>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select className="form-select" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Precio ($)</label>
                <input className="form-input" type="number" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} placeholder="4500" />
              </div>
              <div className="form-group">
                <label className="form-label">Presentación</label>
                <input className="form-input" value={form.presentacion} onChange={e => setForm({ ...form, presentacion: e.target.value })} placeholder="x 30 u" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cantidad</label>
                <input className="form-input" type="number" value={form.cantidad_presentacion} onChange={e => setForm({ ...form, cantidad_presentacion: e.target.value })} placeholder="30" />
              </div>
              <div className="form-group">
                <label className="form-label">Unidad</label>
                <select className="form-select" value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })}>
                  {["g", "ml", "u", "kg", "l"].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-primary" onClick={save} disabled={saving || !form.nombre || !form.precio}>
              {saving ? "Guardando..." : editando ? "Guardar cambios" : "Agregar insumo"}
            </button>
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── RECETAS ──────────────────────────────────────────────────────────────────
function Recetas({ recetas, insumos, recetaIngredientes, showToast, onRefresh }) {
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", emoji: "🍞", rinde: "", unidad_rinde: "u", precio_venta: "" });
  const [ingredientes, setIngredientes] = useState([]);

  const openNew = () => {
    setEditando(null);
    setForm({ nombre: "", emoji: "🍞", rinde: "", unidad_rinde: "u", precio_venta: "" });
    setIngredientes([{ insumo_id: "", cantidad: "", unidad: "g", costo_fijo: "" }]);
    setModal(true);
  };

  const openEdit = (r) => {
    setEditando(r);
    setForm({
      nombre: r.nombre,
      emoji: r.emoji || "🍞",
      rinde: String(r.rinde || ""),
      unidad_rinde: r.unidad_rinde || "u",
      precio_venta: String(r.precio_venta || "")
    });
    const ings = recetaIngredientes
      .filter((i) => i.receta_id === r.id)
      .map((i) => ({
        insumo_id: i.insumo_id || "",
        cantidad: i.cantidad ? String(i.cantidad) : "",
        unidad: i.unidad || "g",
        costo_fijo: i.costo_fijo != null ? String(i.costo_fijo) : ""
      }));
    setIngredientes(ings.length > 0 ? ings : [{ insumo_id: "", cantidad: "", unidad: "g", costo_fijo: "" }]);
    setModal(true);
  };

  const addIng = () => setIngredientes([...ingredientes, { insumo_id: "", cantidad: "", unidad: "g", costo_fijo: "" }]);
  const removeIng = (i) => setIngredientes(ingredientes.filter((_, idx) => idx !== i));
  const updateIng = (i, field, val) => setIngredientes(ingredientes.map((ing, idx) => idx === i ? { ...ing, [field]: val } : ing));

  const save = async () => {
    setSaving(true);
    const payload = {
      nombre: form.nombre,
      emoji: form.emoji,
      rinde: parseInt(form.rinde, 10) || 1,
      unidad_rinde: form.unidad_rinde,
      precio_venta: parseFloat(form.precio_venta) || 0
    };
    let recId = editando?.id;

    if (editando) {
      const { error: errUp } = await supabase.from("recetas").update(payload).eq("id", editando.id);
      if (errUp) { showToast("⚠️ Error al actualizar"); setSaving(false); return; }
      await supabase.from("receta_ingredientes").delete().eq("receta_id", editando.id);
    } else {
      const { data: rec, error: errIns } = await supabase.from("recetas").insert(payload).select().single();
      if (errIns || !rec) { showToast("⚠️ Error al guardar"); setSaving(false); return; }
      recId = rec.id;
    }

    if (recId) {
      const ings = ingredientes.filter(i => i.insumo_id || i.costo_fijo).map(i => ({
        receta_id: recId,
        insumo_id: i.insumo_id || null,
        cantidad: parseFloat(i.cantidad) || 0,
        unidad: i.unidad,
        costo_fijo: i.costo_fijo ? parseFloat(i.costo_fijo) : null
      }));
      if (ings.length > 0) {
        const { error: errIng } = await supabase.from("receta_ingredientes").insert(ings);
        if (errIng) { showToast("⚠️ Error al guardar ingredientes"); setSaving(false); return; }
      }
    }
    showToast(editando ? "✅ Receta actualizada" : "✅ Receta guardada");
    setSaving(false);
    setModal(false);
    setEditando(null);
    onRefresh();
  };

  const eliminar = async () => {
    if (!editando) return;
    if (!window.confirm(`¿Eliminar la receta "${editando.nombre}"?`)) return;
    setSaving(true);
    await supabase.from("receta_ingredientes").delete().eq("receta_id", editando.id);
    const { error } = await supabase.from("recetas").delete().eq("id", editando.id);
    if (error) {
      showToast("⚠️ No se pudo eliminar (hay ventas vinculadas)");
    } else {
      showToast("🗑️ Receta eliminada");
    }
    setSaving(false);
    setModal(false);
    setEditando(null);
    onRefresh();
  };

  const EMOJIS = ["🍞", "🥐", "🍕", "🍫", "🍪", "🥧", "🍰", "🧁", "🫔", "🥬", "🍗", "🍔", "🎂", "🧇", "🥨"];

  return (
    <div className="content">
      <p className="page-title">Recetas</p>
      <p className="page-subtitle">{recetas.length} recetas cargadas</p>

      {recetas.length === 0 ? (
        <div className="empty"><div className="empty-icon">📋</div><p>No hay recetas todavía.<br />Tocá + para agregar.</p></div>
      ) : recetas.map(r => {
        const costo = costoReceta(r.id, recetaIngredientes, insumos);
        const margenVal = r.precio_venta > 0 && costo >= 0
          ? (r.precio_venta - costo) / r.precio_venta
          : null;
        const margen = margenVal != null ? pctFmt(margenVal) : "—";
        const margenNegativo = margenVal != null && margenVal < 0;
        const tieneIngredientes = recetaIngredientes.some((i) => i.receta_id === r.id);
        return (
          <div key={r.id} className="receta-card" onClick={() => openEdit(r)} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && openEdit(r)}>
            <div className="receta-top">
              <span className="receta-emoji">{r.emoji}</span>
              <div>
                <div className="receta-nombre">{r.nombre}</div>
                <div className="receta-rinde">Rinde {r.rinde} {r.unidad_rinde}</div>
              </div>
            </div>
            <div className="receta-stats">
              <div className="receta-stat">
                <div className="receta-stat-label">Precio venta</div>
                <div className="receta-stat-value">{fmt(r.precio_venta || 0)}</div>
              </div>
              <div className="receta-stat">
                <div className="receta-stat-label">Costo</div>
                <div className="receta-stat-value">{tieneIngredientes ? fmt(costo) : "—"}</div>
              </div>
              <div className="receta-stat">
                <div className="receta-stat-label">Margen</div>
                <div className={`receta-stat-value ${margenNegativo ? "rojo" : margenVal != null ? "verde" : ""}`}>{margen}</div>
              </div>
            </div>
          </div>
        );
      })}

      <button className="fab fab-receta" onClick={openNew} title="Nueva receta">
        <span>+</span>
        <span>Nueva receta</span>
      </button>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && (setModal(false), setEditando(null))}>
          <div className="modal">
            <button className="modal-close" onClick={() => { setModal(false); setEditando(null); }}>✕</button>
            <h2 className="modal-title">{editando ? "Editar receta" : "Nueva receta"}</h2>

            <div className="form-group">
              <label className="form-label">Emoji</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setForm({ ...form, emoji: e })}
                    style={{ fontSize: 20, background: form.emoji === e ? "#2C1A0E" : "#FAF7F2", border: "1px solid #EDE8E0", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Pan de Molde" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Rinde (unidades que salen)</label>
                <input className="form-input" type="number" min="1" value={form.rinde} onChange={e => setForm({ ...form, rinde: e.target.value })} placeholder="4" />
              </div>
              <div className="form-group">
                <label className="form-label">Unidad</label>
                <select className="form-select" value={form.unidad_rinde} onChange={e => setForm({ ...form, unidad_rinde: e.target.value })}>
                  {["u", "kg", "porción", "pack"].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>

            {(() => {
              const costoTotal = costoDesdeIngredientes(ingredientes, insumos);
              const rindeNum = parseInt(form.rinde, 10) || 0;
              const costoPorUnidad = rindeNum > 0 ? costoTotal / rindeNum : 0;
              return (costoTotal > 0 || ingredientes.some(i => i.insumo_id || i.costo_fijo)) ? (
                <div className="stats-row" style={{ marginBottom: 16 }}>
                  <div className="stat-card">
                    <div className="stat-label">Costo total</div>
                    <div className="stat-value">{fmt(costoTotal)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Costo por unidad</div>
                    <div className="stat-value accent">{rindeNum > 0 ? fmt(costoPorUnidad) : "—"}</div>
                  </div>
                </div>
              ) : null;
            })()}

            <div className="form-group">
              <label className="form-label">Precio de venta ($)</label>
              <input className="form-input" type="number" value={form.precio_venta} onChange={e => setForm({ ...form, precio_venta: e.target.value })} placeholder="6000" />
            </div>

            <div className="form-group">
              <label className="form-label">Ingredientes</label>
              {ingredientes.map((ing, i) => (
                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select className="form-select" style={{ flex: "2 1 120px" }} value={ing.insumo_id} onChange={e => updateIng(i, "insumo_id", e.target.value)}>
                    <option value="">Insumo o costo fijo...</option>
                    {insumos.map(ins => <option key={ins.id} value={ins.id}>{ins.nombre}</option>)}
                  </select>
                  {ing.insumo_id ? (
                    <>
                      <input className="form-input" style={{ flex: "1 1 60px", minWidth: 50 }} type="number" step="any" placeholder="Cant." value={ing.cantidad} onChange={e => updateIng(i, "cantidad", e.target.value)} />
                      <select className="form-select" style={{ flex: "0 0 48px" }} value={ing.unidad} onChange={e => updateIng(i, "unidad", e.target.value)}>
                        {["g", "ml", "u", "kg"].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </>
                  ) : (
                    <input className="form-input" style={{ flex: "1 1 100px" }} type="number" step="any" placeholder="Costo fijo $" value={ing.costo_fijo} onChange={e => updateIng(i, "costo_fijo", e.target.value)} />
                  )}
                  <button onClick={() => removeIng(i)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#999" }}>✕</button>
                </div>
              ))}
              <button onClick={addIng} style={{ background: "none", border: "1px dashed #C8A97E", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#6B3F1F", cursor: "pointer", width: "100%", marginTop: 4 }}>
                + Agregar ingrediente
              </button>
            </div>

            <button className="btn-primary" onClick={save} disabled={saving || !form.nombre || !form.rinde}>
              {saving ? "Guardando..." : editando ? "Guardar cambios" : "Guardar receta"}
            </button>
            {editando && (
              <button className="btn-danger" onClick={eliminar} disabled={saving}>
                Eliminar receta
              </button>
            )}
            <button className="btn-secondary" onClick={() => { setModal(false); setEditando(null); }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── STOCK ─────────────────────────────────────────────────────────────────────
function Stock({ recetas, stock, actualizarStock, onRefresh, showToast }) {
  const [cargando, setCargando] = useState(null);
  const [cantidadCargar, setCantidadCargar] = useState({});
  const [voiceModal, setVoiceModal] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedStock, setParsedStock] = useState([]);
  const [savingVoice, setSavingVoice] = useState(false);
  const recRef = useRef(null);
  const transcriptRef = useRef("");

  const cargar = async (receta_id, cantidad) => {
    if (!cantidad || cantidad <= 0) return;
    setCargando(receta_id);
    await actualizarStock(receta_id, cantidad);
    setCantidadCargar(prev => ({ ...prev, [receta_id]: 0 }));
    const r = recetas.find(r => r.id === receta_id);
    showToast(`✅ +${cantidad} ${r?.nombre || "producto"}`);
    setCargando(null);
  };

  const iniciarRecStock = (append) => {
    if (!append) {
      setTranscript("");
      setParsedStock([]);
      transcriptRef.current = "";
    }
    const rec = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recRef.current = rec;
    rec.lang = "es-AR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          transcriptRef.current += (transcriptRef.current ? " " : "") + res[0].transcript;
          setTranscript(transcriptRef.current);
        }
      }
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      const items = parsearVozAVentas(transcriptRef.current, recetas);
      if (append) {
        setParsedStock(prev => {
          const merged = [...prev];
          for (const it of items) {
            const idx = merged.findIndex(m => m.receta.id === it.receta.id);
            if (idx >= 0) merged[idx] = { ...merged[idx], cantidad: merged[idx].cantidad + it.cantidad };
            else merged.push(it);
          }
          return merged;
        });
      } else {
        setParsedStock(items);
      }
    };
    rec.start();
    setListening(true);
  };

  const detenerRecStock = () => {
    if (recRef.current) recRef.current.stop();
  };

  const cargarStockVoz = async () => {
    if (parsedStock.length === 0) {
      showToast("No se detectaron productos. Probá de nuevo.");
      return;
    }
    setSavingVoice(true);
    try {
      for (const { receta, cantidad: cant } of parsedStock) {
        await actualizarStock(receta.id, cant);
      }
      const total = parsedStock.reduce((s, v) => s + v.cantidad, 0);
      showToast(`✅ Stock cargado: +${total} unidades`);
      setVoiceModal(false);
    } catch {
      showToast("⚠️ Error al cargar stock. Probá de nuevo.");
    } finally {
      setSavingVoice(false);
    }
  };

  return (
    <div className="content">
      <p className="page-title">Stock</p>
      <p className="page-subtitle">Stock actual por producto · se descarga con cada venta</p>

      <div className="voice-row">
        <div className="voice-area" style={{ flex: 1 }}>
          <div className="voice-icon">🎤</div>
          <div className="voice-text">Cargar stock por voz</div>
          <button className={`voice-btn ${listening ? "listening" : ""}`} onClick={listening ? detenerRecStock : () => {
            if (!SpeechRecognitionAPI) { showToast("⚠️ Tu navegador no soporta reconocimiento de voz"); return; }
            setVoiceModal(true);
            iniciarRecStock(false);
          }}>
            {listening ? "Detener" : "Hablar"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Productos</span></div>
        {recetas.map(r => {
          const cant = stock[r.id] ?? 0;
          const inputVal = cantidadCargar[r.id] ?? 0;
          const bajo = cant <= 0;
          return (
            <div key={r.id} className="insumo-item">
              <span style={{ fontSize: 22 }}>{r.emoji}</span>
              <div className="insumo-info" style={{ flex: 1 }}>
                <div className="insumo-nombre">{r.nombre}</div>
                <div className="insumo-detalle" style={{ color: bajo ? "var(--accent)" : "var(--text-muted)" }}>
                  Stock: {cant} {bajo && "· Sin stock"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="number" min="0" step="1" value={inputVal || ""} onChange={e => setCantidadCargar(prev => ({ ...prev, [r.id]: parseInt(e.target.value, 10) || 0 }))} placeholder="+" style={{ width: 56, padding: "8px 8px", borderRadius: 8, border: "1px solid var(--border)", textAlign: "center", fontSize: 14 }} />
                <button className="btn-primary" onClick={() => cargar(r.id, inputVal)} disabled={cargando === r.id || !inputVal || inputVal <= 0} style={{ padding: "8px 14px", fontSize: 13 }}>
                  {cargando === r.id ? "…" : "Cargar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {voiceModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && (detenerRecStock(), setVoiceModal(false))}>
          <div className="modal">
            <button className="modal-close" onClick={() => { detenerRecStock(); setVoiceModal(false); }}>✕</button>
            <h2 className="modal-title">🎤 Cargar stock por voz</h2>
            <p className="voice-text" style={{ marginBottom: 12 }}>Decí por ejemplo: &quot;10 brownies, 5 panes lactales&quot;</p>
            {listening && (
              <button className="voice-btn listening" onClick={detenerRecStock} style={{ marginBottom: 16 }}>Detener</button>
            )}
            {listening && <p className="voice-transcript" style={{ color: "var(--brown-light)" }}>Escuchando…</p>}
            {transcript && <p className="voice-transcript">&quot;{transcript}&quot;</p>}
            {parsedStock.length > 0 && (
              <div className="voice-parsed-list" style={{ marginTop: 12 }}>
                {parsedStock.map((v, i) => (
                  <div key={i} className="voice-parsed-item">
                    <span style={{ fontSize: 22 }}>{v.receta.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{v.receta.nombre}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>+{v.cantidad} unidades</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!listening && parsedStock.length === 0 && transcript && (
              <>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>No se encontraron productos. Probá con nombres más específicos.</p>
                <button className="voice-btn" onClick={() => iniciarRecStock(false)} style={{ marginTop: 12 }}>
                  🎤 Hablar de nuevo
                </button>
              </>
            )}
            {!listening && parsedStock.length === 0 && !transcript && (
              <button className="voice-btn" onClick={() => iniciarRecStock(false)} style={{ marginTop: 12 }}>
                🎤 Hablar
              </button>
            )}
            {!listening && parsedStock.length > 0 && (
              <button className="voice-btn" onClick={() => iniciarRecStock(true)} style={{ marginBottom: 12 }}>
                🎤 Agregar más
              </button>
            )}
            <button className="btn-primary" onClick={cargarStockVoz} disabled={savingVoice || parsedStock.length === 0} style={{ marginTop: 16 }}>
              {savingVoice ? "Cargando…" : `Cargar +${parsedStock.reduce((s, v) => s + v.cantidad, 0)} unidades`}
            </button>
            <button className="btn-secondary" onClick={() => { detenerRecStock(); setVoiceModal(false); }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CLIENTES ──────────────────────────────────────────────────────────────────
function Clientes({ ventas, clientes, recetas, onRefresh, showToast }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", telefono: "" });
  const [saving, setSaving] = useState(false);

  const clientesConGasto = clientes.map((c) => {
    const vs = ventas.filter((v) => v.cliente_id === c.id);
    const total = vs.reduce((s, v) => s + v.precio_unitario * v.cantidad, 0);
    const unidades = vs.reduce((s, v) => s + v.cantidad, 0);
    return { ...c, total, unidades, ventas: vs.length };
  }).sort((a, b) => b.total - a.total);

  const openNew = () => {
    setForm({ nombre: "", telefono: "" });
    setModal(true);
  };

  const save = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("clientes").insert({ nombre: form.nombre.trim(), telefono: form.telefono.trim() || null });
    if (error) { showToast("⚠️ Error al guardar"); setSaving(false); return; }
    showToast("✅ Cliente agregado");
    setModal(false);
    await onRefresh();
    setSaving(false);
  };

  return (
    <div className="content">
      <p className="page-title">Clientes</p>
      <p className="page-subtitle">Mejores clientes por gasto total</p>

      <div className="stats-row" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-label">Clientes</div>
          <div className="stat-value">{clientes.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Con compras</div>
          <div className="stat-value accent">{clientesConGasto.filter(c => c.total > 0).length}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Todos los clientes</span>
          <button className="edit-btn" onClick={openNew}>+ Cliente</button>
        </div>
        {clientesConGasto.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👥</div>
            <p>No hay clientes registrados.<br />Agregá uno con el botón + Cliente.</p>
          </div>
        ) : clientesConGasto.map((c) => {
          const conCompras = clientesConGasto.filter(x => x.total > 0);
          const rank = conCompras.findIndex(x => x.id === c.id) + 1;
          return (
          <div key={c.id} className="venta-item">
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-muted)", minWidth: 24 }}>{rank > 0 ? `#${rank}` : "—"}</span>
            <div className="insumo-info" style={{ flex: 1 }}>
              <div className="insumo-nombre">{c.nombre}</div>
              <div className="insumo-detalle">{c.telefono || "—"} · {c.ventas} compra(s)</div>
            </div>
            <div className="insumo-precio">
              <div className="insumo-precio-value" style={{ color: c.total > 0 ? "var(--green)" : "var(--text-muted)" }}>{c.total > 0 ? fmt(c.total) : "—"}</div>
            </div>
          </div>
          );
        })}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            <h2 className="modal-title">Nuevo cliente</h2>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="form-input" style={{ flex: 1 }} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: María García" />
                <button type="button" className="btn-secondary" style={{ whiteSpace: "nowrap" }} onClick={async () => {
                  const r = await selectContactFromPhone();
                  if (r.error === "no-support") { showToast("No disponible en este dispositivo"); return; }
                  if (r.error === "cancelled") return;
                  setForm({ nombre: r.name, telefono: r.tel });
                }} title="Elegir de contactos del celular">📇</button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="form-input" type="tel" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="+54 11 1234-5678" />
            </div>
            <button className="btn-primary" onClick={save} disabled={saving || !form.nombre.trim()}>
              {saving ? "Guardando…" : "Agregar cliente"}
            </button>
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── VENTAS ──────────────────────────────────────────────────────────────────
const SpeechRecognitionAPI = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

function Ventas({ recetas, ventas, clientes, stock, actualizarStock, onRefresh, showToast }) {
  const [manualScreenOpen, setManualScreenOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [recetaSel, setRecetaSel] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [clienteSel, setClienteSel] = useState(null);
  const [medioPago, setMedioPago] = useState("efectivo");
  const [estadoPago, setEstadoPago] = useState("pagado");
  const [saving, setSaving] = useState(false);
  const [voiceModal, setVoiceModal] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedVentas, setParsedVentas] = useState([]);
  const [savingVoice, setSavingVoice] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editGrupo, setEditGrupo] = useState(null);
  const [editForm, setEditForm] = useState({ cliente_id: null, medio_pago: "efectivo", estado_pago: "pagado" });
  const [editCantidades, setEditCantidades] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editItemsToAdd, setEditItemsToAdd] = useState([]);
  const [editRecetaToAdd, setEditRecetaToAdd] = useState("");
  const [editCantidadToAdd, setEditCantidadToAdd] = useState(1);
  const recRef = useRef(null);
  const transcriptRef = useRef("");
  const appendModeRef = useRef(false);

  const hoy = new Date().toISOString().split("T")[0];
  const ventasHoy = ventas.filter(v => v.fecha === hoy);
  const ingresoHoy = ventasHoy.reduce((s, v) => s + v.precio_unitario * v.cantidad, 0);

  const registrar = async () => {
    if (!recetaSel) return;
    const st = (stock || {})[recetaSel.id] ?? 0;
    if (st < cantidad && !window.confirm(`Stock: ${st}. ¿Vender ${cantidad} igual?`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("ventas").insert({
        receta_id: recetaSel.id,
        cantidad: cantidad,
        precio_unitario: recetaSel.precio_venta,
        fecha: hoy,
        cliente_id: clienteSel || null,
        medio_pago: medioPago,
        estado_pago: estadoPago
      });
      if (error) throw error;
      if (actualizarStock) await actualizarStock(recetaSel.id, -cantidad);
      showToast(`✅ Venta registrada: ${cantidad}x ${recetaSel.nombre}`);
      setModal(false);
      onRefresh();
    } catch {
      showToast("⚠️ Error al registrar venta");
    } finally {
      setSaving(false);
    }
  };

  const closeManualScreen = () => {
    setManualScreenOpen(false);
    setModal(false);
  };

  const eliminarVenta = async (grupo) => {
    if (!window.confirm("¿Eliminar esta venta?")) return;
    const ids = grupo.rawItems.map((i) => i.id);
    const key = grupo.key || ids[0];
    setDeletingId(key);
    try {
      const { error } = await supabase.from("ventas").delete().in("id", ids);
      if (error) throw error;
      if (actualizarStock) for (const v of grupo.rawItems) await actualizarStock(v.receta_id, v.cantidad);
      showToast("✅ Venta eliminada");
      onRefresh();
    } catch {
      showToast("⚠️ Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  const abrirEditar = (grupo) => {
    setEditGrupo(grupo);
    setEditForm({
      cliente_id: grupo.cliente_id || null,
      medio_pago: grupo.rawItems[0]?.medio_pago || "efectivo",
      estado_pago: grupo.rawItems[0]?.estado_pago || "pagado"
    });
    const cant = {};
    for (const v of grupo.rawItems) cant[v.id] = v.cantidad;
    setEditCantidades(cant);
    setEditItemsToAdd([]);
    setEditRecetaToAdd("");
    setEditCantidadToAdd(1);
    setEditModalOpen(true);
  };

  const agregarProductoEnEdicion = () => {
    if (!editRecetaToAdd) return;
    const receta = recetas.find(r => r.id === editRecetaToAdd);
    if (!receta) return;
    setEditItemsToAdd(prev => [...prev, { receta_id: receta.id, cantidad: editCantidadToAdd, receta }]);
    setEditRecetaToAdd("");
    setEditCantidadToAdd(1);
  };

  const quitarProductoEnEdicion = (idx) => {
    setEditItemsToAdd(prev => prev.filter((_, i) => i !== idx));
  };

  const guardarEdicion = async () => {
    if (!editGrupo) return;
    setEditSaving(true);
    const hoy = new Date().toISOString().split("T")[0];
    let transaccionId = editGrupo.rawItems[0]?.transaccion_id;
    try {
      for (const v of editGrupo.rawItems) {
        const payload = {
          cliente_id: editForm.cliente_id || null,
          medio_pago: editForm.medio_pago,
          estado_pago: editForm.estado_pago
        };
        const nuevaCant = editCantidades[v.id] ?? v.cantidad;
        if (editCantidades[v.id] != null) payload.cantidad = nuevaCant;
        if (editItemsToAdd.length > 0 && !transaccionId) {
          transaccionId = crypto.randomUUID?.() || `t-${Date.now()}`;
          payload.transaccion_id = transaccionId;
        }
        const { error } = await supabase.from("ventas").update(payload).eq("id", v.id);
        if (error) throw error;
        const deltaCant = nuevaCant - v.cantidad;
        if (actualizarStock && deltaCant !== 0) await actualizarStock(v.receta_id, -deltaCant);
      }

      if (editItemsToAdd.length > 0) {
        if (!transaccionId) transaccionId = crypto.randomUUID?.() || `t-${Date.now()}`;
        const rows = editItemsToAdd.map(({ receta_id, cantidad, receta }) => ({
          receta_id,
          cantidad,
          precio_unitario: receta.precio_venta,
          fecha: hoy,
          transaccion_id: transaccionId,
          cliente_id: editForm.cliente_id || null,
          medio_pago: editForm.medio_pago,
          estado_pago: editForm.estado_pago
        }));
        const { error } = await supabase.from("ventas").insert(rows);
        if (error) throw error;
        if (actualizarStock) for (const { receta_id, cantidad: cant } of editItemsToAdd) await actualizarStock(receta_id, -cant);
      }

      showToast("✅ Venta actualizada");
      setEditModalOpen(false);
      setEditGrupo(null);
      setEditItemsToAdd([]);
      onRefresh();
    } catch {
      showToast("⚠️ Error al actualizar venta");
    } finally {
      setEditSaving(false);
    }
  };

  const openManualReceta = (receta) => {
    setRecetaSel(receta);
    setCantidad(1);
    setModal(true);
  };

  const SelectorCliente = ({ value, onChange }) => (
    <div className="form-group">
      <label className="form-label">Cliente</label>
      <div style={{ display: "flex", gap: 8 }}>
        <select className="form-input" style={{ flex: 1 }} value={value || ""} onChange={e => onChange(e.target.value ? e.target.value : null)}>
          <option value="">— Sin cliente</option>
          {(clientes || []).map(c => (
            <option key={c.id} value={c.id}>{c.nombre}{c.telefono ? ` · ${c.telefono}` : ""}</option>
          ))}
        </select>
        <button type="button" className="btn-secondary" style={{ whiteSpace: "nowrap" }} title="Agregar desde contactos del celular" onClick={async () => {
          const r = await selectContactFromPhone();
          if (r.error === "no-support") { showToast("No disponible en este dispositivo"); return; }
          if (r.error === "cancelled") return;
          if (!r.name?.trim()) return;
          const { data, error } = await supabase.from("clientes").insert({ nombre: r.name.trim(), telefono: r.tel?.trim() || null }).select("id").single();
          if (error) { showToast("⚠️ Error al agregar cliente"); return; }
          if (data) { await onRefresh(); onChange(data.id); showToast(`✅ Cliente ${r.name} agregado`); }
        }}>📇</button>
      </div>
    </div>
  );

  const SelectoresPago = () => (
    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
      <div className="form-group" style={{ flex: 1 }}>
        <label className="form-label">Medio</label>
        <select className="form-input" value={medioPago} onChange={e => setMedioPago(e.target.value)}>
          <option value="efectivo">💵 Efectivo</option>
          <option value="transferencia">📱 Transferencia</option>
        </select>
      </div>
      <div className="form-group" style={{ flex: 1 }}>
        <label className="form-label">Estado</label>
        <select className="form-input" value={estadoPago} onChange={e => setEstadoPago(e.target.value)}>
          <option value="pagado">✅ Pagado</option>
          <option value="debe">⏳ Debe</option>
        </select>
      </div>
    </div>
  );

  const iniciarRec = (append) => {
    appendModeRef.current = append;
    if (!append) {
      setTranscript("");
      setParsedVentas([]);
      transcriptRef.current = "";
    } else {
      setTranscript("");
      transcriptRef.current = "";
    }
    const rec = new SpeechRecognitionAPI();
    recRef.current = rec;
    rec.lang = "es-AR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          transcriptRef.current += (transcriptRef.current ? " " : "") + res[0].transcript;
          setTranscript(transcriptRef.current);
        }
      }
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      const items = parsearVozAVentas(transcriptRef.current, recetas);
      if (appendModeRef.current) {
        setParsedVentas((prev) => {
          const merged = [...prev];
          for (const it of items) {
            const idx = merged.findIndex((m) => m.receta.id === it.receta.id);
            if (idx >= 0) merged[idx] = { ...merged[idx], cantidad: merged[idx].cantidad + it.cantidad };
            else merged.push(it);
          }
          return merged;
        });
      } else {
        setParsedVentas(items);
      }
    };
    rec.start();
    setListening(true);
  };

  const iniciarVoz = () => {
    if (!SpeechRecognitionAPI) {
      showToast("⚠️ Tu navegador no soporta reconocimiento de voz");
      return;
    }
    setVoiceModal(true);
    iniciarRec(false);
  };

  const agregarMasVoz = () => {
    if (!SpeechRecognitionAPI) return;
    iniciarRec(true);
  };

  const detenerVoz = () => {
    if (recRef.current) {
      recRef.current.stop();
    }
  };

  const registrarVentasVoz = async () => {
    if (parsedVentas.length === 0) {
      showToast("No se detectaron ventas. Probá de nuevo.");
      return;
    }
    const sinStock = parsedVentas.filter(({ receta, cantidad: cant }) => ((stock || {})[receta.id] ?? 0) < cant);
    if (sinStock.length > 0 && !window.confirm(`Stock insuficiente en ${sinStock.map(s => s.receta.nombre).join(", ")}. ¿Registrar venta igual?`)) return;
    setSavingVoice(true);
    try {
      const transaccionId = crypto.randomUUID?.() || `t-${Date.now()}`;
      const rows = parsedVentas.map(({ receta, cantidad: cant }) => ({
        receta_id: receta.id,
        cantidad: cant,
        precio_unitario: receta.precio_venta,
        fecha: hoy,
        transaccion_id: transaccionId,
        cliente_id: clienteSel || null,
        medio_pago: medioPago,
        estado_pago: estadoPago
      }));
      let { error } = await supabase.from("ventas").insert(rows);
      const sinTransaccion = error && (error.message?.includes("transaccion_id") || error.code === "42703");
      if (sinTransaccion) {
        const res = await supabase.from("ventas").insert(rows.map(({ transaccion_id, ...r }) => r));
        error = res.error;
      }
      if (error) throw error;
      if (actualizarStock) for (const { receta, cantidad: cant } of parsedVentas) await actualizarStock(receta.id, -cant);
      const total = parsedVentas.reduce((s, v) => s + v.receta.precio_venta * v.cantidad, 0);
      showToast(`✅ 1 venta registrada: ${fmt(total)}`);
      setVoiceModal(false);
      onRefresh();
    } catch {
      showToast("⚠️ Error al registrar");
    } finally {
      setSavingVoice(false);
    }
  };

  return (
    <div className="content">
      <p className="page-title">Ventas</p>
      <p className="page-subtitle">Hoy: {fmt(ingresoHoy)}</p>

      <div className="voice-row">
        <div className="voice-area" style={{ flex: 1 }}>
          <div className="voice-icon">🎤</div>
          <div className="voice-text">Decí la venta en voz alta</div>
          <button className={`voice-btn ${listening ? "listening" : ""}`} onClick={listening ? detenerVoz : iniciarVoz}>
            {listening ? "Detener" : "Hablar"}
          </button>
        </div>
      </div>

      {ventasHoy.length > 0 && (
        <>
          <div className="card-header" style={{ marginBottom: 8 }}><span className="card-title">Hoy</span></div>
          {agruparVentas(ventasHoy).slice().reverse().map((grupo) => {
            const cliente = (clientes || []).find(c => c.id === grupo.cliente_id);
            return (
              <div key={grupo.key} className="card venta-card">
                <div className="venta-grupo-cliente">
                  Cliente: {cliente?.nombre || "—"}
                </div>
                {grupo.items.map((v, vi) => {
                  const r = recetas.find(r => r.id === v.receta_id);
                  return (
                    <div key={v.id || `${grupo.key}-${v.receta_id}-${vi}`} className="venta-item venta-item-simple">
                      <span className="venta-emoji">{r?.emoji || "🍞"}</span>
                      <span className="venta-nombre-simple">{(r?.nombre || "—").toLowerCase()} x{v.cantidad}</span>
                    </div>
                  );
                })}
                <div className="venta-grupo-total">Total: {fmt(grupo.total)}</div>
                <div className="venta-grupo-actions">
                  <button className="btn-venta-action" onClick={() => abrirEditar(grupo)}>Editar</button>
                  <button className="btn-venta-action btn-venta-delete" onClick={() => eliminarVenta(grupo)} disabled={deletingId === (grupo.key || grupo.rawItems?.[0]?.id)}>{deletingId === (grupo.key || grupo.rawItems?.[0]?.id) ? "…" : "Eliminar"}</button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {editModalOpen && editGrupo && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditModalOpen(false)}>
          <div className="modal">
            <button className="modal-close" onClick={() => setEditModalOpen(false)}>✕</button>
            <h2 className="modal-title">Editar venta</h2>
            <SelectorCliente value={editForm.cliente_id} onChange={v => setEditForm({ ...editForm, cliente_id: v })} />
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Medio</label>
                <select className="form-input" value={editForm.medio_pago} onChange={e => setEditForm({ ...editForm, medio_pago: e.target.value })}>
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="transferencia">📱 Transferencia</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Estado</label>
                <select className="form-input" value={editForm.estado_pago} onChange={e => setEditForm({ ...editForm, estado_pago: e.target.value })}>
                  <option value="pagado">✅ Pagado</option>
                  <option value="debe">⏳ Debe</option>
                </select>
              </div>
            </div>
            {editGrupo.rawItems.length === 1 ? (
              <div className="form-group">
                <label className="form-label">Cantidad</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => setEditCantidades({ [editGrupo.rawItems[0].id]: Math.max(1, (editCantidades[editGrupo.rawItems[0].id] || 1) - 1) })} style={{ width: 40, height: 40, borderRadius: 8, border: "1px solid var(--border)", background: "var(--cream)", fontSize: 20, cursor: "pointer" }}>−</button>
                  <span style={{ fontFamily: "'Fraunces', serif", fontSize: 24, minWidth: 40, textAlign: "center" }}>{editCantidades[editGrupo.rawItems[0].id] ?? editGrupo.rawItems[0].cantidad}</span>
                  <button onClick={() => setEditCantidades({ [editGrupo.rawItems[0].id]: (editCantidades[editGrupo.rawItems[0].id] ?? editGrupo.rawItems[0].cantidad) + 1 })} style={{ width: 40, height: 40, borderRadius: 8, border: "1px solid var(--border)", background: "var(--cream)", fontSize: 20, cursor: "pointer" }}>+</button>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Cantidades</label>
                {editGrupo.rawItems.map(v => {
                  const r = recetas.find(r => r.id === v.receta_id);
                  return (
                    <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ flex: 1 }}>{r?.emoji} {r?.nombre}</span>
                      <button onClick={() => setEditCantidades(prev => ({ ...prev, [v.id]: Math.max(1, (prev[v.id] ?? v.cantidad) - 1) }))} style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid var(--border)", background: "var(--cream)", fontSize: 16, cursor: "pointer" }}>−</button>
                      <span style={{ minWidth: 24, textAlign: "center" }}>{editCantidades[v.id] ?? v.cantidad}</span>
                      <button onClick={() => setEditCantidades(prev => ({ ...prev, [v.id]: (prev[v.id] ?? v.cantidad) + 1 }))} style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid var(--border)", background: "var(--cream)", fontSize: 16, cursor: "pointer" }}>+</button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="form-group" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px dashed var(--border)" }}>
              <label className="form-label">Agregar producto</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <select className="form-input" value={editRecetaToAdd} onChange={e => setEditRecetaToAdd(e.target.value)} style={{ flex: 1 }}>
                  <option value="">— Seleccionar</option>
                  {recetas.map(r => (
                    <option key={r.id} value={r.id}>{r.emoji} {r.nombre} · {fmt(r.precio_venta || 0)}</option>
                  ))}
                </select>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button onClick={() => setEditCantidadToAdd(Math.max(1, editCantidadToAdd - 1))} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border)", background: "var(--cream)", fontSize: 18, cursor: "pointer" }}>−</button>
                  <span style={{ minWidth: 28, textAlign: "center", fontWeight: 500 }}>{editCantidadToAdd}</span>
                  <button onClick={() => setEditCantidadToAdd(editCantidadToAdd + 1)} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border)", background: "var(--cream)", fontSize: 18, cursor: "pointer" }}>+</button>
                </div>
                <button className="btn-primary" onClick={agregarProductoEnEdicion} disabled={!editRecetaToAdd} style={{ padding: "8px 16px" }}>+</button>
              </div>
              {editItemsToAdd.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {editItemsToAdd.map((it, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ flex: 1 }}>{it.receta?.emoji} {it.receta?.nombre} x{it.cantidad}</span>
                      <span style={{ color: "var(--green)", fontWeight: 500 }}>{fmt((it.receta?.precio_venta || 0) * it.cantidad)}</span>
                      <button onClick={() => quitarProductoEnEdicion(idx)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 18 }} title="Quitar">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="btn-primary" onClick={guardarEdicion} disabled={editSaving}>{editSaving ? "Guardando…" : "Guardar"}</button>
            <button className="btn-secondary" onClick={() => setEditModalOpen(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {voiceModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setVoiceModal(false)}>
          <div className="modal">
            <button className="modal-close" onClick={() => { detenerVoz(); setVoiceModal(false); }}>✕</button>
            <h2 className="modal-title">🎤 Venta por voz</h2>
            <SelectorCliente value={clienteSel} onChange={setClienteSel} />
            <SelectoresPago />
            <p className="voice-text" style={{ marginBottom: 12 }}>Decí por ejemplo: &quot;2 panes lactales, 2 brownies&quot;</p>
            {listening && (
              <button className="voice-btn listening" onClick={detenerVoz} style={{ marginBottom: 16 }}>
                Detener
              </button>
            )}
            {listening && <p className="voice-transcript" style={{ color: "var(--brown-light)" }}>Escuchando…</p>}
            {transcript && <p className="voice-transcript">&quot;{transcript}&quot;</p>}
            {parsedVentas.length > 0 && (
              <div className="voice-parsed-list">
                {parsedVentas.map((v, i) => (
                  <div key={i} className="voice-parsed-item">
                    <span style={{ fontSize: 22 }}>{v.receta.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{v.receta.nombre}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>x{v.cantidad} · {fmt(v.receta.precio_venta * v.cantidad)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!listening && parsedVentas.length === 0 && transcript && (
              <>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>No se encontraron productos. Probá con nombres más específicos.</p>
                <button className="voice-btn" onClick={() => iniciarRec(false)} style={{ marginTop: 12 }}>
                  🎤 Hablar de nuevo
                </button>
              </>
            )}
            {!listening && parsedVentas.length === 0 && !transcript && (
              <button className="voice-btn" onClick={() => iniciarRec(false)} style={{ marginTop: 12 }}>
                🎤 Hablar
              </button>
            )}
            {!listening && parsedVentas.length > 0 && (
              <button className="voice-btn" onClick={agregarMasVoz} style={{ marginBottom: 12 }}>
                🎤 Agregar más
              </button>
            )}
            <button className="btn-primary" onClick={registrarVentasVoz} disabled={savingVoice || parsedVentas.length === 0}>
              {savingVoice ? "Registrando…" : `Registrar 1 venta · ${fmt(parsedVentas.reduce((s, v) => s + v.receta.precio_venta * v.cantidad, 0))}`}
            </button>
            <button className="btn-secondary" onClick={() => { detenerVoz(); setVoiceModal(false); }}>Cancelar</button>
          </div>
        </div>
      )}

      {!manualScreenOpen && (
        <button className="fab fab-receta" onClick={() => setManualScreenOpen(true)} title="Registro manual">
          <span>+</span>
          <span>Registro manual</span>
        </button>
      )}

      {manualScreenOpen && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button className="screen-back" onClick={closeManualScreen}>←</button>
            <span className="screen-title">Registro manual</span>
          </div>
          <div className="screen-content">
            <div className="card" style={{ marginBottom: 16 }}>
              <SelectorCliente value={clienteSel} onChange={setClienteSel} />
              <SelectoresPago />
            </div>
            <div className="card">
              {recetas.map(r => {
                const st = (stock || {})[r.id] ?? 0;
                return (
                  <div key={r.id} className="insumo-item" style={{ cursor: "pointer" }} onClick={() => openManualReceta(r)}>
                    <span style={{ fontSize: 22 }}>{r.emoji}</span>
                    <div className="insumo-info">
                      <div className="insumo-nombre">{r.nombre}</div>
                      <div className="insumo-detalle">Rinde {r.rinde} {r.unidad_rinde} · Stock: {st}</div>
                    </div>
                    <div className="insumo-precio">
                      <div className="insumo-precio-value">{fmt(r.precio_venta || 0)}</div>
                      <div className="insumo-precio-unit">c/u</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {modal && recetaSel && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            <h2 className="modal-title">{recetaSel.emoji} {recetaSel.nombre}</h2>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Stock: {(stock || {})[recetaSel.id] ?? 0}</div>
            <SelectorCliente value={clienteSel} onChange={setClienteSel} />
            <SelectoresPago />
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 13, color: "#8B7355", marginBottom: 16 }}>¿Cuántas unidades?</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
                <button onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                  style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid #EDE8E0", background: "#FAF7F2", fontSize: 22, cursor: "pointer" }}>−</button>
                <span style={{ fontFamily: "'Fraunces', serif", fontSize: 42, color: "#2C1A0E", minWidth: 60, textAlign: "center" }}>{cantidad}</span>
                <button onClick={() => setCantidad(cantidad + 1)}
                  style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid #EDE8E0", background: "#FAF7F2", fontSize: 22, cursor: "pointer" }}>+</button>
              </div>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: "#4A7C59", marginTop: 16 }}>
                Total: {fmt(recetaSel.precio_venta * cantidad)}
              </div>
            </div>
            <button className="btn-primary" onClick={registrar} disabled={saving}>
              {saving ? "Registrando..." : "Registrar venta"}
            </button>
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [insumos, setInsumos] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => setToast(msg);

  const [recetaIngredientes, setRecetaIngredientes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [stock, setStock] = useState({});
  const [insumoStock, setInsumoStock] = useState({});
  const [insumoMovimientos, setInsumoMovimientos] = useState([]);

  const loadData = useCallback(async () => {
    const stPromise = supabase.from("stock").select("receta_id, cantidad")
      .then(r => ({ ok: !r.error, data: r.data || [] }))
      .catch(() => ({ ok: false, data: [] }));
    const insStPromise = supabase.from("insumo_stock").select("insumo_id, cantidad")
      .then(r => ({ ok: !r.error, data: r.data || [] }))
      .catch(() => ({ ok: false, data: [] }));
    const insMovPromise = supabase.from("insumo_movimientos").select("id, insumo_id, tipo, cantidad, valor, created_at")
      .order("created_at", { ascending: false }).limit(100)
      .then(r => ({ ok: !r.error, data: r.data || [] }))
      .catch(() => ({ ok: false, data: [] }));
    const [insRes, recRes, venRes, riRes, cliRes, stRes, insStRes, insMovRes] = await Promise.all([
      supabase.from("insumos").select("*").order("categoria").order("nombre"),
      supabase.from("recetas").select("*").order("nombre"),
      supabase.from("ventas").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("receta_ingredientes").select("*"),
      supabase.from("clientes").select("*").order("nombre"),
      stPromise,
      insStPromise,
      insMovPromise
    ]);
    if (insRes.error) showToast("⚠️ Error al cargar insumos");
    if (recRes.error) showToast("⚠️ Error al cargar recetas");
    if (venRes.error) showToast("⚠️ Error al cargar ventas");
    setInsumos(insRes.data || []);
    setRecetas(recRes.data || []);
    setVentas(venRes.data || []);
    setRecetaIngredientes(riRes.data || []);
    setClientes(cliRes.data || []);
    if (stRes.ok) {
      setStock(Object.fromEntries((stRes.data || []).map(s => [s.receta_id, Number(s.cantidad) || 0])));
    }
    if (insStRes.ok) {
      setInsumoStock(Object.fromEntries((insStRes.data || []).map(s => [s.insumo_id, Number(s.cantidad) || 0])));
    }
    if (insMovRes.ok) {
      setInsumoMovimientos(insMovRes.data || []);
    }
    setLoading(false);

    // Seed insumos if empty
    if (!seeded && insRes.data && insRes.data.length === 0) {
      try {
        const { error } = await supabase.from("insumos").insert(INSUMOS_SEED);
        if (error) throw error;
        setSeeded(true);
        const { data: fresh } = await supabase.from("insumos").select("*").order("categoria").order("nombre");
        setInsumos(fresh || []);
        showToast("✅ Insumos del Excel cargados automáticamente");
      } catch {
        showToast("⚠️ Error al cargar insumos iniciales");
      }
    } else if (insRes.data?.length > 0) {
      setSeeded(true);
    }
  }, [seeded]);

  useEffect(() => { loadData(); }, [loadData]);

  const actualizarStock = useCallback(async (receta_id, delta) => {
    let nuevo;
    setStock(prev => {
      const actual = prev[receta_id] ?? 0;
      nuevo = actual + delta;
      return { ...prev, [receta_id]: nuevo };
    });
    const { error } = await supabase.from("stock").upsert({ receta_id, cantidad: nuevo, updated_at: new Date().toISOString() }, { onConflict: "receta_id" });
    if (error) {
      setStock(prev => ({ ...prev, [receta_id]: (prev[receta_id] ?? 0) - delta }));
      throw error;
    }
  }, []);

  const registrarMovimientoInsumo = useCallback(async (insumo_id, tipo, cantidad, valor) => {
    const delta = tipo === "ingreso" ? cantidad : -cantidad;
    let nuevo;
    setInsumoStock(prev => {
      const actual = prev[insumo_id] ?? 0;
      nuevo = actual + delta;
      return { ...prev, [insumo_id]: nuevo };
    });
    const { error: errStock } = await supabase.from("insumo_stock").upsert({ insumo_id, cantidad: nuevo, updated_at: new Date().toISOString() }, { onConflict: "insumo_id" });
    if (errStock) {
      setInsumoStock(prev => ({ ...prev, [insumo_id]: (prev[insumo_id] ?? 0) - delta }));
      throw errStock;
    }
    const { data: mov, error: errMov } = await supabase.from("insumo_movimientos").insert({ insumo_id, tipo, cantidad, valor: valor || null }).select("id, insumo_id, tipo, cantidad, valor, created_at").single();
    if (errMov) throw errMov;
    if (mov) setInsumoMovimientos(prev => [mov, ...prev]);
  }, []);

  const TABS = [
    { id: "dashboard", icon: "📊", label: "Inicio" },
    { id: "ventas", icon: "💰", label: "Ventas" },
    { id: "stock", icon: "📥", label: "Stock" },
    { id: "clientes", icon: "👥", label: "Clientes" },
    { id: "insumos", icon: "📦", label: "Insumos" },
    { id: "recetas", icon: "📋", label: "Recetas" },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="header">
          <div className="header-top">
            <h1>🌾 Panadería SG</h1>
            <span className="header-badge">{process.env.REACT_APP_ENV === "staging" ? "STAGING" : process.env.REACT_APP_ENV === "development" ? "DEV" : "BETA"}</span>
          </div>
          <div className="header-subtitle">
            Sistema de gestión
            <a href="/privacidad.html" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, opacity: 0.7, marginLeft: 8 }}>Privacidad</a>
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /><span>Cargando...</span></div>
        ) : (
          <>
            {tab === "dashboard" && <Dashboard insumos={insumos} recetas={recetas} ventas={ventas} clientes={clientes} stock={stock} onNavigate={setTab} />}
            {tab === "insumos" && <Insumos insumos={insumos} insumoStock={insumoStock} insumoMovimientos={insumoMovimientos} registrarMovimientoInsumo={registrarMovimientoInsumo} onRefresh={loadData} showToast={showToast} />}
            {tab === "recetas" && <Recetas recetas={recetas} insumos={insumos} recetaIngredientes={recetaIngredientes} showToast={showToast} onRefresh={loadData} />}
            {tab === "ventas" && <Ventas recetas={recetas} ventas={ventas} clientes={clientes} stock={stock} actualizarStock={actualizarStock} onRefresh={loadData} showToast={showToast} />}
            {tab === "stock" && <Stock recetas={recetas} stock={stock} actualizarStock={actualizarStock} onRefresh={loadData} showToast={showToast} />}
            {tab === "clientes" && <Clientes ventas={ventas} clientes={clientes} recetas={recetas} onRefresh={loadData} showToast={showToast} />}
          </>
        )}

        <nav className="nav">
          {TABS.map(t => (
            <button key={t.id} className={`nav-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              <span className="nav-icon">{t.icon}</span>
              <span className="nav-label">{t.label}</span>
            </button>
          ))}
        </nav>

        {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      </div>
    </>
  );
}