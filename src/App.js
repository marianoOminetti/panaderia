import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { reportError, getErrorLog } from "./utils/errorReport";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_CONFIG_OK = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Importante: sin fallbacks hardcodeados. Si faltan envs, mostramos pantalla de configuración.
const supabase = createClient(SUPABASE_URL || "", SUPABASE_ANON_KEY || "");

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
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cream: #F8F5FC;
    --warm-white: #FFFFFF;
    --purple-dark: #7B5BA8;
    --purple: #A98ED2;
    --purple-light: #C4B0E0;
    --accent: #8B6BB8;
    --accent-soft: #B89DD4;
    --danger: #D64545;
    --green: #4A7C59;
    --surface: #FFFFFF;
    --border: #E8E0F0;
    --text: #2C1A0E;
    --text-muted: #6B5B7B;
    --shadow: 0 2px 12px rgba(123,91,168,0.08);
    --shadow-lg: 0 8px 32px rgba(123,91,168,0.12);
  }

  body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--cream); color: var(--text); }

  .app { max-width: 430px; margin: 0 auto; min-height: 100vh; background: var(--cream); position: relative; padding-bottom: 80px; }

  /* Header */
  .header { background: var(--purple-dark); padding: 16px 20px 14px; position: sticky; top: 0; z-index: 100; }
  .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .header h1 { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 600; color: white; letter-spacing: -0.5px; }
  .header-subtitle { font-size: 11px; color: var(--purple-light); letter-spacing: 1.5px; }
  .header-badge { background: white; color: var(--purple-dark); font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px; letter-spacing: 0.5px; }
  .header-contact { font-size: 11px; color: white; display: flex; align-items: center; gap: 6px; margin-top: 4px; }
  .header-contact a { color: white; text-decoration: none; }

  /* Nav */
  .nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 430px; background: var(--purple-dark); display: flex; border-top: 1px solid rgba(196,176,224,0.3); z-index: 100; }
  .nav-btn { flex: 1; padding: 10px 4px 12px; display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.7); transition: color 0.2s; }
  .nav-btn.active { color: var(--purple-light); }
  .nav-btn .nav-icon { font-size: 20px; }
  .nav-btn .nav-label { font-size: 9px; letter-spacing: 0.8px; text-transform: uppercase; font-family: 'Plus Jakarta Sans', sans-serif; color: inherit; }

  /* Content */
  .content { padding: 16px; }

  /* Page title */
  .page-title { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 600; color: var(--purple-dark); margin-bottom: 4px; }
  .page-subtitle { font-size: 13px; color: var(--text-muted); margin-bottom: 20px; }

  /* Cards */
  .card { background: var(--surface); border-radius: 16px; padding: 16px; margin-bottom: 12px; box-shadow: var(--shadow); border: 1px solid var(--border); }
  .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .card-title { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 600; color: var(--purple-dark); }

  /* Stats row */
  .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
  .stat-card { background: var(--surface); border-radius: 14px; padding: 14px; box-shadow: var(--shadow); border: 1px solid var(--border); }
  .dashboard-metrics { background: linear-gradient(135deg, var(--purple-dark) 0%, var(--purple) 100%); border-radius: 16px; padding: 20px; margin-bottom: 16px; color: white; }
  .dashboard-metric-main { margin-bottom: 12px; }
  .dashboard-metric-label { font-size: 11px; opacity: 0.8; letter-spacing: 1px; text-transform: uppercase; }
  .dashboard-metric-value { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 700; }
  .dashboard-metric-row { display: flex; gap: 20px; }
  .dashboard-metric-mini { display: flex; flex-direction: column; gap: 2px; }
  .dashboard-metric-mini-val { font-weight: 600; font-size: 15px; }
  .dashboard-metric-mini-lbl { font-size: 11px; opacity: 0.8; }
  .dashboard-quick-grid { display: flex; flex-direction: column; gap: 8px; }
  .dashboard-quick { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: var(--cream); border: 1px solid var(--border); border-radius: 12px; width: 100%; text-align: left; cursor: pointer; transition: background 0.2s; }
  .dashboard-quick:hover { background: var(--surface); }
  .dashboard-quick-icon { font-size: 28px; }
  .dashboard-quick-text { flex: 1; }
  .dashboard-quick-label { font-weight: 600; font-size: 15px; color: var(--purple-dark); display: block; }
  .dashboard-quick-sub { font-size: 12px; color: var(--text-muted); }
  .dashboard-quick-badge { background: var(--purple); color: white; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; }
  .dashboard-alert { border-left: 4px solid var(--accent); cursor: pointer; }
  .card-link { background: none; border: none; font-size: 12px; color: var(--accent); cursor: pointer; padding: 0; font-family: inherit; }
  .stat-label { font-size: 10px; color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
  .stat-value { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 600; color: var(--purple-dark); }
  .stat-value.accent { color: var(--accent); }
  .stat-value.green { color: var(--green); }
  .stat-value.rojo { color: var(--danger); }
  .stat-value.yellow { color: #D9A400; }

  /* Search */
  .search-bar { position: relative; margin-bottom: 16px; }
  .search-bar input { width: 100%; padding: 12px 16px 12px 40px; border: 1px solid var(--border); border-radius: 12px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; background: var(--surface); color: var(--text); outline: none; transition: border-color 0.2s; }
  .search-bar input:focus { border-color: var(--purple); }
  .search-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); font-size: 16px; }

  /* Category tabs */
  .cat-tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 16px; scrollbar-width: none; }
  .cat-tabs::-webkit-scrollbar { display: none; }
  .cat-tab { flex-shrink: 0; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; border: none; cursor: pointer; transition: all 0.2s; background: var(--surface); color: var(--text-muted); border: 1px solid var(--border); }
  .cat-tab.active { background: var(--purple-dark); color: white; border-color: var(--purple-dark); }

  /* Insumo item */
  .insumo-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
  .insumo-item:last-child { border-bottom: none; }
  .insumo-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .insumo-info { flex: 1; min-width: 0; }
  .insumo-nombre { font-size: 14px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .insumo-detalle { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
  .insumo-precio { text-align: right; flex-shrink: 0; }
  .insumo-precio-value { font-family: 'Outfit', sans-serif; font-size: 15px; color: var(--purple-dark); }
  .insumo-precio-unit { font-size: 10px; color: var(--text-muted); }
  .edit-btn { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 5px 8px; font-size: 12px; cursor: pointer; color: var(--text-muted); transition: all 0.2s; }
  .edit-btn:hover { border-color: var(--purple); color: var(--purple-dark); }

  /* FAB */
  .fab { position: fixed; bottom: 90px; right: 20px; width: 52px; height: 52px; border-radius: 50%; background: var(--purple); border: none; color: white; font-size: 24px; cursor: pointer; box-shadow: 0 4px 20px rgba(169,142,210,0.4); display: flex; align-items: center; justify-content: center; transition: transform 0.2s; z-index: 99; }
  .fab:active { transform: scale(0.95); }
  .fab-receta { padding: 0 20px; width: auto; border-radius: 26px; gap: 8px; font-size: 14px; font-weight: 500; font-family: 'Plus Jakarta Sans', sans-serif; }

  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: rgba(123,91,168,0.4); z-index: 200; display: flex; align-items: flex-end; }
  .modal { background: var(--surface); border-radius: 24px 24px 0 0; padding: 24px; width: 100%; max-height: 85vh; overflow-y: auto; }
  .screen-overlay { position: fixed; inset: 0; background: var(--cream); z-index: 200; display: flex; flex-direction: column; overflow: hidden; }
  .screen-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: var(--surface); border-bottom: 1px solid var(--border); }
  .screen-back { background: none; border: none; font-size: 15px; cursor: pointer; color: var(--purple-dark); padding: 4px 0; font-family: inherit; }
  .screen-title { font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 600; color: var(--purple-dark); }
  .screen-content { flex: 1; overflow-y: auto; padding: 16px; }
  .modal-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 600; color: var(--purple-dark); margin-bottom: 20px; }
  .modal-close { float: right; background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text-muted); }

  /* Form */
  .form-group { margin-bottom: 14px; }
  .form-label { font-size: 11px; color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; display: block; }
  .form-input { width: 100%; padding: 11px 14px; border: 1px solid var(--border); border-radius: 10px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; color: var(--text); background: var(--cream); outline: none; transition: border-color 0.2s; }
  .form-input:focus { border-color: var(--purple); background: white; }
  .form-select { width: 100%; padding: 11px 14px; border: 1px solid var(--border); border-radius: 10px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; color: var(--text); background: var(--cream); outline: none; }
  .form-row { display: flex; flex-direction: column; gap: 10px; }

  /* Buttons */
  .btn-primary { width: 100%; padding: 14px; background: var(--purple-dark); color: white; border: none; border-radius: 12px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
  .btn-primary:hover { background: var(--purple); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary { width: 100%; padding: 12px; background: transparent; color: var(--text-muted); border: 1px solid var(--border); border-radius: 12px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; cursor: pointer; margin-top: 8px; }
  .btn-danger { width: 100%; padding: 12px; background: transparent; color: var(--danger); border: 1px solid var(--danger); border-radius: 12px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; cursor: pointer; margin-top: 8px; }

  /* Receta card */
  .receta-card { background: var(--surface); border-radius: 16px; padding: 16px; margin-bottom: 10px; box-shadow: var(--shadow); border: 1px solid var(--border); cursor: pointer; transition: transform 0.15s; }
  .receta-card:active { transform: scale(0.99); }
  .receta-top { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .receta-emoji { font-size: 28px; }
  .receta-nombre { font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 600; color: var(--purple-dark); }
  .receta-rinde { font-size: 12px; color: var(--text-muted); }
  .receta-stats { display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid var(--border); }
  .receta-stat { text-align: center; }
  .receta-stat-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; }
  .receta-stat-value { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 600; color: var(--purple-dark); margin-top: 2px; }
  .receta-stat-value.verde { color: var(--green); }
  .receta-stat-value.rojo { color: var(--danger); }

  /* Toast */
  .toast { position: fixed; top: 80px; left: 50%; transform: translateX(-50%); background: var(--purple-dark); color: white; padding: 10px 20px; border-radius: 20px; font-size: 13px; z-index: 300; animation: slideDown 0.3s ease; }
  @keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

  /* Native-style confirm dialog */
  .confirm-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 400; display: flex; align-items: center; justify-content: center; padding: 20px; animation: confirmFadeIn 0.2s ease; }
  .confirm-dialog { background: var(--surface); border-radius: 14px; width: 100%; max-width: 300px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2); animation: confirmSlideIn 0.25s ease; }
  .confirm-body { padding: 20px 20px 8px; text-align: center; }
  .confirm-message { font-size: 15px; line-height: 1.4; color: var(--text); }
  .confirm-actions { display: flex; flex-direction: column; margin-top: 16px; }
  .confirm-btn { padding: 14px; font-size: 17px; font-weight: 600; background: none; border: none; cursor: pointer; font-family: inherit; color: var(--purple-dark); border-top: 1px solid var(--border); }
  .confirm-btn:first-of-type { border-top: none; }
  .confirm-btn.destructive { color: var(--danger); }
  .confirm-btn.cancel { color: var(--text-muted); font-weight: 500; }
  @keyframes confirmFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes confirmSlideIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

  /* Loading */
  .loading { display: flex; align-items: center; justify-content: center; padding: 40px; gap: 8px; color: var(--text-muted); font-size: 14px; }
  .spinner { width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--purple); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Auth */
  .auth-screen { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; background: linear-gradient(180deg, var(--purple-dark) 0%, var(--cream) 40%); }
  .auth-card { background: var(--surface); border-radius: 20px; padding: 28px; width: 100%; max-width: 360px; box-shadow: var(--shadow-lg); border: 1px solid var(--border); }
  .auth-title { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 600; color: var(--purple-dark); margin-bottom: 8px; text-align: center; }
  .auth-subtitle { font-size: 13px; color: var(--text-muted); text-align: center; margin-bottom: 24px; }
  .auth-form input { width: 100%; padding: 12px 16px; border: 1px solid var(--border); border-radius: 12px; font-size: 14px; font-family: inherit; margin-bottom: 12px; box-sizing: border-box; }
  .auth-form input:focus { outline: none; border-color: var(--purple); }
  .auth-form input::placeholder { color: var(--text-muted); }
  .auth-btn { width: 100%; padding: 14px; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; margin-top: 8px; }
  .auth-btn-primary { background: var(--purple-dark); color: white; }
  .auth-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  .auth-error { font-size: 12px; color: var(--danger); margin-top: 8px; text-align: center; }
  .auth-logout { background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.4); padding: 6px 12px; border-radius: 8px; font-size: 11px; cursor: pointer; margin-left: 8px; }
  .auth-logout:hover { background: rgba(255,255,255,0.3); }

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
  .venta-grupo-total { font-family: 'Outfit', sans-serif; font-size: 15px; color: var(--purple-dark); font-weight: 600; text-align: right; margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border); }
  .venta-grupo-actions { display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end; }
  .btn-venta-action { font-size: 12px; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--cream); color: var(--text-muted); cursor: pointer; }
  .btn-venta-action:hover { background: var(--border); }
  .btn-venta-delete { color: var(--danger); border-color: rgba(214,69,69,0.4); }
  .venta-emoji { font-size: 22px; }
  .venta-info { flex: 1; }
  .venta-nombre { font-size: 14px; font-weight: 500; }
  .venta-hora { font-size: 11px; color: var(--text-muted); }
  .venta-monto { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 600; color: var(--green); }

  /* QR scanner placeholder */
  .qr-area { background: var(--purple-dark); border-radius: 20px; padding: 40px 20px; text-align: center; margin-bottom: 16px; }
  .qr-icon { font-size: 56px; margin-bottom: 12px; }
  .qr-text { color: var(--purple-light); font-size: 14px; }
  .qr-btn { background: var(--purple); color: white; border: none; border-radius: 12px; padding: 14px 32px; font-size: 16px; font-weight: 500; cursor: pointer; margin-top: 16px; font-family: 'Plus Jakarta Sans', sans-serif; }

  /* Voice input */
  .voice-row { display: flex; gap: 12px; align-items: stretch; margin-bottom: 16px; }
  .voice-area { flex: 1; background: var(--purple-dark); border-radius: 20px; padding: 24px 20px; text-align: center; }
  .voice-icon { font-size: 40px; margin-bottom: 8px; }
  .voice-text { color: var(--purple-light); font-size: 13px; }
  .voice-btn { background: var(--purple); color: white; border: none; border-radius: 12px; padding: 14px 24px; font-size: 15px; font-weight: 500; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap; }
  .voice-btn.listening { background: var(--green); animation: pulse 1.5s ease infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }
  .voice-transcript { font-size: 12px; color: var(--text-muted); margin-top: 8px; font-style: italic; max-height: 40px; overflow: hidden; text-overflow: ellipsis; }
  .voice-parsed-list { margin: 12px 0; text-align: left; }
  .voice-parsed-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); }
  .voice-parsed-item:last-child { border-bottom: none; }
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

/** Contact Picker API - selecciona un contacto del celular (Chrome Android con HTTPS) */
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

/** Contact Picker API - selecciona varios contactos del celular (Chrome Android con HTTPS) */
async function selectContactsFromPhoneMultiple() {
  if (!navigator.contacts?.select) return { error: "no-support", contacts: [] };
  try {
    const props = ["name", "tel"];
    const contacts = await navigator.contacts.select(props, { multiple: true });
    if (!contacts?.length) return { error: "cancelled", contacts: [] };
    return {
      contacts: contacts.map((c) => ({
        name: (c.name?.[0] ?? "").trim(),
        tel: (c.tel?.[0] ?? "").trim()
      })).filter((c) => c.name || c.tel)
    };
  } catch {
    return { error: "cancelled", contacts: [] };
  }
}
const pctFmt = (n) => `${Math.round(n * 100)}%`;

/** Convierte cantidad a gramos (para composición de insumos) */
function aGramos(cantidad, unidad) {
  const u = (unidad || "g").toLowerCase();
  if (u === "g") return cantidad;
  if (u === "kg") return cantidad * 1000;
  if (u === "ml" || u === "l") return cantidad * (u === "l" ? 1000 : 1);
  return cantidad;
}

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

/** Devuelve insumos con stock 0 que se consumirían al cargar stock de las recetas dadas.
 * Incluye: ingredientes directos y componentes (si el insumo tiene composición). */
function getInsumosEnCeroParaRecetas(items, recetaIngredientes, insumos, insumoComposicion, insumoStock) {
  if (!items?.length || !insumos?.length) return [];
  const composicionPorInsumo = {};
  for (const c of insumoComposicion || []) {
    if (!composicionPorInsumo[c.insumo_id]) composicionPorInsumo[c.insumo_id] = [];
    composicionPorInsumo[c.insumo_id].push(c);
  }
  const idsEnCero = new Set();
  const insumosPorId = {};
  for (const { receta } of items) {
    if (!receta?.rinde) continue;
    const ings = (recetaIngredientes || []).filter(i => i.receta_id === receta.id && i.insumo_id);
    for (const ing of ings) {
      const insumo = insumos.find(x => x.id === ing.insumo_id);
      if (!insumo) continue;
      const componentes = composicionPorInsumo[ing.insumo_id];
      if (componentes && componentes.length > 0) {
        for (const comp of componentes) {
          const insumoHijo = insumos.find(x => x.id === comp.insumo_id_componente);
          if (insumoHijo && ((insumoStock || {})[insumoHijo.id] ?? 0) <= 0) {
            idsEnCero.add(insumoHijo.id);
            insumosPorId[insumoHijo.id] = insumoHijo;
          }
        }
      } else if (((insumoStock || {})[ing.insumo_id] ?? 0) <= 0) {
        idsEnCero.add(ing.insumo_id);
        insumosPorId[ing.insumo_id] = insumo;
      }
    }
  }
  return [...idsEnCero].map(id => ({ insumo_id: id, insumo: insumosPorId[id] })).filter(x => x.insumo);
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
      total: items.reduce(
        (s, i) =>
          s +
          (i.total_final != null
            ? i.total_final
            : (i.precio_unitario || 0) * (i.cantidad || 0)),
        0
      ),
      cliente_id: items[0]?.cliente_id
    };
  });
  for (const v of sueltas) {
    const totalLinea =
      v.total_final != null
        ? v.total_final
        : (v.precio_unitario || 0) * (v.cantidad || 0);
    grupos.push({
      key: v.id,
      items: [v],
      rawItems: [v],
      total: totalLinea,
      cliente_id: v.cliente_id,
    });
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

function ConfirmDialog({ message, destructive, onConfirm, onCancel }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);
  useEffect(() => { dialogRef.current?.focus(); }, []);
  return (
    <div className="confirm-backdrop" onClick={onCancel} role="presentation">
      <div
        ref={dialogRef}
        className="confirm-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-message"
        tabIndex={-1}
      >
        <div className="confirm-body">
          <p id="confirm-message" className="confirm-message">{message}</p>
          <div className="confirm-actions">
            <button type="button" className={`confirm-btn ${destructive ? "destructive" : ""}`} onClick={onConfirm}>
              {destructive ? "Eliminar" : "Aceptar"}
            </button>
            <button type="button" className="confirm-btn cancel" onClick={onCancel}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AUTH ─────────────────────────────────────────────────────────────────────
function ConfigMissing() {
  const [showLog, setShowLog] = useState(false);
  const log = showLog ? getErrorLog() : [];
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">🌾 Panadería SG</h1>
        <p className="auth-subtitle" style={{ marginBottom: 14 }}>
          Falta configuración de Supabase.
        </p>
        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45 }}>
          <div style={{ marginBottom: 10 }}>
            Definí estas variables de entorno y reiniciá el server:
          </div>
          <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace", fontSize: 12, background: "var(--cream)", border: "1px solid var(--border)", padding: 12, borderRadius: 12 }}>
            REACT_APP_SUPABASE_URL<br />
            REACT_APP_SUPABASE_ANON_KEY
          </div>
          <div style={{ marginTop: 12 }}>
            En local: usá <code>.env.development.local</code>. En hosting: configurá las env vars del proyecto.
          </div>
          <div style={{ marginTop: 16 }}>
            <button type="button" onClick={() => setShowLog(!showLog)} style={{ fontSize: 12, color: "var(--purple)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              {showLog ? "Ocultar" : "Ver"} log de errores recientes
            </button>
            {showLog && log.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 11, maxHeight: 120, overflow: "auto", background: "var(--cream)", padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}>
                {log.slice().reverse().map((e, i) => (
                  <div key={i} style={{ marginBottom: 6, wordBreak: "break-word" }}>
                    <span style={{ color: "var(--text-muted)" }}>{e.ts?.slice(11, 19)}</span> {e.action ? `[${e.action}] ` : ""}{e.message}
                  </div>
                ))}
              </div>
            )}
            {showLog && log.length === 0 && <p style={{ marginTop: 8, fontSize: 12 }}>No hay errores registrados.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) throw err;
    } catch (err) {
      setError(err?.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">🌾 Panadería SG</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
            {loading ? "..." : "Entrar"}
          </button>
        </form>
        {error && <p className="auth-error">{error}</p>}
      </div>
    </div>
  );
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ insumos, recetas, ventas, clientes, stock, onNavigate }) {
  const hoy = new Date().toISOString().split("T")[0];
  const ventasHoy = ventas.filter(v => v.fecha === hoy);
  const ingresoHoy = ventasHoy.reduce(
    (s, v) =>
      s +
      (v.total_final != null
        ? v.total_final
        : (v.precio_unitario || 0) * (v.cantidad || 0)),
    0
  );
  const unidadesHoy = ventasHoy.reduce((s, v) => s + v.cantidad, 0);
  const stockBajo = recetas.filter(r => (stock || {})[r.id] <= 0);
  const debeTotal = ventas
    .filter((v) => v.estado_pago === "debe")
    .reduce(
      (s, v) =>
        s +
        (v.total_final != null
          ? v.total_final
          : (v.precio_unitario || 0) * (v.cantidad || 0)),
      0
    );

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
          {agruparVentas(ventasHoy).slice(0, 5).map((grupo) => {
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
function Insumos({ insumos, insumoStock, insumoMovimientos, insumoComposicion, registrarMovimientoInsumo, onRefresh, showToast, confirm }) {
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
  const [detalleInsumo, setDetalleInsumo] = useState(null);
  const [compInsumoSel, setCompInsumoSel] = useState("");
  const [compFactor, setCompFactor] = useState("");
  const [compSaving, setCompSaving] = useState(false);

  const filtrados = insumos.filter(i => {
    const matchCat = catActiva === "Todos" || i.categoria === catActiva;
    const matchSearch = i.nombre.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const filtradosOrdenados = [...filtrados].slice().sort((a, b) => {
    const sa = (insumoStock || {})[a.id] ?? 0;
    const sb = (insumoStock || {})[b.id] ?? 0;
    if (sa !== sb) return sa - sb;
    return (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });
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
      onRefresh();
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
        ) : filtradosOrdenados.map(i => {
          const stock = (insumoStock || {})[i.id] ?? 0;
          const unidad = i.unidad || "g";
          const stockNegativo = Number(stock) < 0;
          return (
            <div
              key={i.id}
              className="insumo-item"
              onClick={() => setDetalleInsumo(i)}
              style={{ cursor: "pointer" }}
            >
              <div className="insumo-dot" style={{ background: CAT_COLORS[i.categoria] || "#ccc" }} />
              <div className="insumo-info" style={{ flex: 1 }}>
                <div className="insumo-nombre">{i.nombre}</div>
                <div className="insumo-detalle">
                  {i.presentacion} · <span className="chip">{precioPorU(i)}</span> · Stock:{" "}
                  <span
                    style={{
                      color: stockNegativo ? "var(--danger)" : undefined,
                      fontWeight: stockNegativo ? 600 : undefined
                    }}
                  >
                    {stock} {unidad}
                  </span>
                  {" · "}
                  <span style={{ textDecoration: "underline" }}>Tocar para ver</span>
                </div>
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
              <div key={m.id} className="insumo-item" style={{ borderLeft: esEgreso ? "4px solid var(--danger)" : "4px solid var(--green)", paddingLeft: 12 }}>
                <div style={{ flex: 1 }}>
                  <div className="insumo-nombre" style={{ color: esEgreso ? "var(--danger)" : "inherit" }}>
                    {esEgreso ? "−" : "+"}{m.cantidad} {ins?.nombre || "?"} {esEgreso ? "(egreso)" : "(ingreso)"}
                  </div>
                  <div className="insumo-detalle">
                    {new Date(m.created_at).toLocaleString("es-AR")}
                    {m.valor != null && m.valor > 0 && ` · ${fmt(m.valor)}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button className="fab" onClick={openNew}>+</button>

      {movModal && movInsumo && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button className="screen-back" onClick={() => setMovModal(false)}>← Volver</button>
            <span className="screen-title">{movTipo === "ingreso" ? "📥 Ingreso" : "📤 Egreso"} · {movInsumo.nombre}</span>
          </div>
          <div className="screen-content">
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
        <div className="screen-overlay">
          <div className="screen-header">
            <button className="screen-back" onClick={() => setModal(false)}>← Volver</button>
            <span className="screen-title">{editando ? "Editar insumo" : "Nuevo insumo"}</span>
          </div>
          <div className="screen-content">
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

      {detalleInsumo && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button className="screen-back" onClick={() => setDetalleInsumo(null)}>← Volver</button>
            <span className="screen-title">{detalleInsumo.nombre}</span>
          </div>
          <div className="screen-content">
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">Detalle</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
                <strong>Categoría:</strong> {detalleInsumo.categoria}
              </p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
                <strong>Presentación:</strong> {detalleInsumo.presentacion || "—"}
              </p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
                <strong>Precio:</strong> {fmt(detalleInsumo.precio || 0)} ({precioPorU(detalleInsumo)})
              </p>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                <strong>Stock:</strong>{" "}
                {(insumoStock || {})[detalleInsumo.id] ?? 0} {detalleInsumo.unidad || "g"}
              </p>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">Composición</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                Si este insumo es una mezcla de otros (ej. premezcla = harina + almidón), definí los componentes. Al cargar stock de productos que lo usan, se descontarán automáticamente.
              </p>
              {(insumoComposicion || []).filter(c => c.insumo_id === detalleInsumo.id).map((c) => {
                const hijo = insumos.find(i => i.id === c.insumo_id_componente);
                return (
                  <div key={c.insumo_id_componente} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <span>{hijo?.nombre || "?"} · {(parseFloat(c.factor) * 100).toFixed(0)}%</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!(await confirm(`¿Quitar ${hijo?.nombre} de la composición?`))) return;
                        const { error } = await supabase.from("insumo_composicion").delete().eq("insumo_id", detalleInsumo.id).eq("insumo_id_componente", c.insumo_id_componente);
                        if (error) showToast("⚠️ Error al quitar"); else { showToast("✅ Componente quitado"); onRefresh(); }
                      }}
                      style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 14 }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <select
                  className="form-input"
                  value={compInsumoSel}
                  onChange={e => setCompInsumoSel(e.target.value)}
                  style={{ flex: "1 1 120px", minWidth: 0 }}
                >
                  <option value="">— Agregar componente</option>
                  {insumos.filter(i => i.id !== detalleInsumo.id).map(i => (
                    <option key={i.id} value={i.id}>{i.nombre}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0.01"
                  max="1"
                  step="0.01"
                  placeholder="Factor (0.5 = 50%)"
                  value={compFactor}
                  onChange={e => setCompFactor(e.target.value)}
                  className="form-input"
                  style={{ width: 100 }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  disabled={compSaving || !compInsumoSel || !compFactor || parseFloat(compFactor) <= 0 || parseFloat(compFactor) > 1}
                  onClick={async () => {
                    const factor = parseFloat(compFactor);
                    if (!factor || factor <= 0 || factor > 1) return;
                    setCompSaving(true);
                    const { error } = await supabase.from("insumo_composicion").upsert(
                      { insumo_id: detalleInsumo.id, insumo_id_componente: compInsumoSel, factor },
                      { onConflict: "insumo_id,insumo_id_componente" }
                    );
                    setCompSaving(false);
                    if (error) showToast("⚠️ Error al guardar"); else { showToast("✅ Componente agregado"); setCompInsumoSel(""); setCompFactor(""); onRefresh(); }
                  }}
                >
                  {compSaving ? "…" : "Agregar"}
                </button>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={() => {
                setDetalleInsumo(null);
                openMov(detalleInsumo, "ingreso");
              }}
              style={{ marginBottom: 8 }}
            >
              📥 Registrar ingreso
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setDetalleInsumo(null);
                openMov(detalleInsumo, "egreso");
              }}
              style={{ marginBottom: 8 }}
            >
              📤 Registrar egreso
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setDetalleInsumo(null);
                openEdit(detalleInsumo);
              }}
              style={{ marginBottom: 8 }}
            >
              ✏️ Editar insumo
            </button>
            <button
              className="btn-danger"
              onClick={async () => {
                if (!(await confirm(`¿Eliminar el insumo "${detalleInsumo.nombre}"?`, { destructive: true }))) return;
                try {
                  const { error } = await supabase.from("insumos").delete().eq("id", detalleInsumo.id);
                  if (error) {
                    showToast("⚠️ No se pudo eliminar (en uso en recetas o movimientos)");
                  } else {
                    showToast("🗑️ Insumo eliminado");
                    setDetalleInsumo(null);
                    onRefresh();
                  }
                } catch {
                  showToast("⚠️ Error al eliminar insumo");
                }
              }}
            >
              Eliminar insumo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── RECETAS ──────────────────────────────────────────────────────────────────
function Recetas({ recetas, insumos, recetaIngredientes, showToast, onRefresh, confirm }) {
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", emoji: "🍞", rinde: "", unidad_rinde: "u", precio_venta: "" });
  const [ingredientes, setIngredientes] = useState([]);

  const recetasOrdenadas = [...recetas].slice().sort((a, b) =>
    (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" })
  );
  const insumosOrdenados = [...insumos].slice().sort((a, b) =>
    (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" })
  );

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
    const rindeNum = (() => { const v = parseFloat(form.rinde); return (isNaN(v) || v <= 0) ? 1 : v; })();
    const costoLote = costoDesdeIngredientes(ingredientes, insumos);
    const costoUnitario = rindeNum > 0 ? costoLote / rindeNum : 0;
    const payload = {
      nombre: form.nombre,
      emoji: form.emoji,
      rinde: rindeNum,
      unidad_rinde: form.unidad_rinde,
      precio_venta: parseFloat(form.precio_venta) || 0,
      costo_lote: costoLote,
      costo_unitario: costoUnitario
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
    if (!(await confirm(`¿Eliminar la receta "${editando.nombre}"?`, { destructive: true }))) return;
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
      ) : recetasOrdenadas.map(r => {
        const rindeNum = parseFloat(r.rinde) || 1;
        const costoLoteCalc = costoReceta(r.id, recetaIngredientes, insumos);
        const costoUnitarioCalc = rindeNum > 0 ? costoLoteCalc / rindeNum : null;
        const costoUnitario = (typeof r.costo_unitario === "number" && r.costo_unitario >= 0)
          ? r.costo_unitario
          : costoUnitarioCalc;
        const margenVal = rindeNum > 0 && r.precio_venta > 0 && costoUnitario != null
          ? (r.precio_venta - costoUnitario) / r.precio_venta
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
                <div className="receta-stat-value">{fmt(r.precio_venta || 0)}/{(r.unidad_rinde || "u").replace("porción", "porc.")}</div>
              </div>
              <div className="receta-stat">
                <div className="receta-stat-label">Costo/u</div>
                <div className="receta-stat-value">{tieneIngredientes && costoUnitario != null ? fmt(costoUnitario) : "—"}</div>
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
        <div className="screen-overlay">
          <div className="screen-header">
            <button className="screen-back" onClick={() => { setModal(false); setEditando(null); }}>← Volver</button>
            <span className="screen-title">{editando ? "Editar receta" : "Nueva receta"}</span>
          </div>
          <div className="screen-content">
            <div className="form-group">
              <label className="form-label">Emoji</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setForm({ ...form, emoji: e })}
                    style={{ fontSize: 20, background: form.emoji === e ? "var(--purple-dark)" : "var(--cream)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: form.emoji === e ? "white" : "inherit" }}>
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
                <input className="form-input" type="number" min="0.01" step="0.01" value={form.rinde} onChange={e => setForm({ ...form, rinde: e.target.value })} placeholder="4" />
              </div>
              <div className="form-group">
                <label className="form-label">Unidad</label>
                <select className="form-select" value={form.unidad_rinde} onChange={e => setForm({ ...form, unidad_rinde: e.target.value })}>
                  {["u", "kg", "porción", "pack"].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Precio de venta por {form.unidad_rinde || "u"} ($)</label>
              <input className="form-input" type="number" value={form.precio_venta} onChange={e => setForm({ ...form, precio_venta: e.target.value })} placeholder="6000" />
            </div>

            <div className="form-group">
              <label className="form-label">Ingredientes</label>
              {ingredientes.map((ing, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select className="form-select" style={{ flex: "2 1 120px" }} value={ing.insumo_id} onChange={e => updateIng(i, "insumo_id", e.target.value)}>
                    <option value="">Insumo o costo fijo...</option>
                    {insumosOrdenados.map(ins => <option key={ins.id} value={ins.id}>{ins.nombre}</option>)}
                  </select>
                  {ing.insumo_id ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flex: "1 1 100px" }}>
                        <input className="form-input" style={{ flex: 1, minWidth: 50 }} type="number" step="any" placeholder="Cant." value={ing.cantidad} onChange={e => updateIng(i, "cantidad", e.target.value)} />
                        <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>en</span>
                        <select className="form-select" style={{ flex: "0 0 56px" }} value={ing.unidad} onChange={e => updateIng(i, "unidad", e.target.value)} title="Unidad">
                          {["g", "ml", "u", "kg"].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
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
          {(() => {
            const costoTotal = costoDesdeIngredientes(ingredientes, insumos);
            const rindeNum = parseFloat(form.rinde) || 0;
            const costoPorUnidad = rindeNum > 0 ? costoTotal / rindeNum : null;
            const precioVenta = parseFloat(form.precio_venta) || 0;
            const margenVal = rindeNum > 0 && precioVenta > 0 && costoPorUnidad != null && costoPorUnidad >= 0
              ? (precioVenta - costoPorUnidad) / precioVenta
              : null;
            const unidadRinde = form.unidad_rinde || "u";
            const showPanel = costoTotal > 0 || ingredientes.some(i => i.insumo_id || i.costo_fijo) || precioVenta > 0;
            if (!showPanel) return null;
            let margenClass = "";
            if (margenVal != null) {
              if (margenVal < 0.4) margenClass = "rojo";
              else if (margenVal <= 0.6) margenClass = "yellow";
              else margenClass = "green";
            }
            const margenText = margenVal != null ? pctFmt(margenVal) : "—";
            return (
              <div className="receta-cost-panel" style={{ borderTop: "1px solid var(--border)", padding: "10px 16px 14px", background: "var(--surface)" }}>
                <div className="stats-row" style={{ marginBottom: 0 }}>
                  <div className="stat-card">
                    <div className="stat-label">Costo total lote</div>
                    <div className="stat-value">{fmt(costoTotal)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Costo por {unidadRinde}</div>
                    <div className="stat-value accent">{rindeNum > 0 ? fmt(costoPorUnidad) : "—"}</div>
                  </div>
                  <div className="stat-card" style={{ gridColumn: "1 / -1" }}>
                    <div className="stat-label">Margen</div>
                    <div className={`stat-value ${margenClass}`}>{margenText}</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── STOCK ─────────────────────────────────────────────────────────────────────
function Stock({ recetas, stock, actualizarStock, consumirInsumosPorStock, insumoStock, insumos, recetaIngredientes, insumoComposicion, registrarMovimientoInsumo, onRefresh, showToast }) {
  const [manualRecetaSel, setManualRecetaSel] = useState(null);
  const [manualCantidad, setManualCantidad] = useState(1);
  const [manualSaving, setManualSaving] = useState(false);
  const [voiceModal, setVoiceModal] = useState(false);
  const [manualScreenOpen, setManualScreenOpen] = useState(false);
  const [newStockModalOpen, setNewStockModalOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedStock, setParsedStock] = useState([]);
  const [savingVoice, setSavingVoice] = useState(false);
  const [insumosEnCeroModal, setInsumosEnCeroModal] = useState(null);
  const recRef = useRef(null);
  const transcriptRef = useRef("");

  const recetasOrdenadasPorStock = [...recetas].slice().sort((a, b) => {
    const sa = (stock || {})[a.id] ?? 0;
    const sb = (stock || {})[b.id] ?? 0;
    if (sa !== sb) return sa - sb;
    return (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });
  });

  const cargar = async (receta_id, cantidad) => {
    if (!cantidad || cantidad <= 0) return;
    const receta = recetas.find(r => r.id === receta_id);
    const insumosEnCero = getInsumosEnCeroParaRecetas(
      [{ receta, cantidad }], recetaIngredientes, insumos, insumoComposicion, insumoStock
    );
    if (insumosEnCero.length > 0 && registrarMovimientoInsumo) {
      setInsumosEnCeroModal({ insumos: insumosEnCero, cantidades: {}, pendingOp: { type: "manual", receta_id, cantidad } });
      return;
    }
    await ejecutarCargaManual(receta_id, cantidad);
  };

  const ejecutarCargaManual = async (receta_id, cantidad) => {
    await actualizarStock(receta_id, cantidad);
    if (consumirInsumosPorStock) await consumirInsumosPorStock(receta_id, cantidad);
    const r = recetas.find(x => x.id === receta_id);
    showToast(`✅ +${cantidad} ${r?.nombre || "producto"}`);
    setManualRecetaSel(null);
    setManualCantidad(1);
    onRefresh?.();
  };

  const ejecutarCargaVoz = async (items) => {
    for (const { receta, cantidad: cant } of items) {
      await actualizarStock(receta.id, cant);
      if (consumirInsumosPorStock) await consumirInsumosPorStock(receta.id, cant);
    }
    const total = items.reduce((s, v) => s + v.cantidad, 0);
    showToast(`✅ Stock cargado: +${total} unidades`);
    setVoiceModal(false);
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
    try { recRef.current?.abort?.(); } catch { /* ignore */ }
    try { recRef.current?.stop?.(); } catch { /* ignore */ }
    recRef.current = null;
    setListening(false);
  };

  const cargarStockVoz = async () => {
    if (parsedStock.length === 0) {
      showToast("No se detectaron productos. Probá de nuevo.");
      return;
    }
    const insumosEnCero = getInsumosEnCeroParaRecetas(
      parsedStock, recetaIngredientes, insumos, insumoComposicion, insumoStock
    );
    if (insumosEnCero.length > 0 && registrarMovimientoInsumo) {
      setInsumosEnCeroModal({ insumos: insumosEnCero, cantidades: {}, pendingOp: { type: "voice", items: [...parsedStock] } });
      return;
    }
    setSavingVoice(true);
    try {
      await ejecutarCargaVoz(parsedStock);
    } catch {
      showToast("⚠️ Error al cargar stock. Probá de nuevo.");
    } finally {
      setSavingVoice(false);
    }
  };

  const confirmarInsumosEnCero = async () => {
    const { insumos: lista, cantidades, pendingOp } = insumosEnCeroModal || {};
    if (!lista?.length || !pendingOp) return;
    setManualSaving(true);
    try {
      for (const { insumo_id } of lista) {
        const c = parseFloat(cantidades[insumo_id]);
        if (c > 0) await registrarMovimientoInsumo(insumo_id, "ingreso", c);
      }
      setInsumosEnCeroModal(null);
      if (pendingOp.type === "manual") {
        await ejecutarCargaManual(pendingOp.receta_id, pendingOp.cantidad);
      } else if (pendingOp.type === "voice") {
        setSavingVoice(true);
        try {
          await ejecutarCargaVoz(pendingOp.items);
        } catch {
          showToast("⚠️ Error al cargar stock. Probá de nuevo.");
        } finally {
          setSavingVoice(false);
        }
      }
    } catch {
      showToast("⚠️ Error al cargar insumos. Probá de nuevo.");
    } finally {
      setManualSaving(false);
    }
  };

  const omitirInsumosEnCero = async () => {
    const { pendingOp } = insumosEnCeroModal || {};
    if (!pendingOp) return;
    setInsumosEnCeroModal(null);
    setManualSaving(true);
    try {
      if (pendingOp.type === "manual") {
        await ejecutarCargaManual(pendingOp.receta_id, pendingOp.cantidad);
      } else if (pendingOp.type === "voice") {
        setSavingVoice(true);
        try {
          await ejecutarCargaVoz(pendingOp.items);
        } catch {
          showToast("⚠️ Error al cargar stock. Probá de nuevo.");
        } finally {
          setSavingVoice(false);
        }
      }
    } finally {
      setManualSaving(false);
    }
  };

  return (
    <div className="content">
      <p className="page-title">Stock</p>
      <p className="page-subtitle">Stock actual por producto · se descarga con cada venta</p>

      <div className="card">
        <div className="card-header"><span className="card-title">Productos</span></div>
        {recetasOrdenadasPorStock.map(r => {
          const cant = stock[r.id] ?? 0;
          const bajo = cant <= 0;
          return (
            <div key={r.id} className="insumo-item">
              <span style={{ fontSize: 22 }}>{r.emoji}</span>
              <div className="insumo-info" style={{ flex: 1 }}>
                <div className="insumo-nombre">{r.nombre}</div>
                <div className="insumo-detalle" style={{ color: bajo ? "var(--danger)" : "var(--text-muted)" }}>
                  {bajo ? "Sin stock" : `Stock: ${cant}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {voiceModal && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button className="screen-back" onClick={() => { detenerRecStock(); setVoiceModal(false); }}>← Volver</button>
            <span className="screen-title">🎤 Cargar stock por voz</span>
          </div>
          <div className="screen-content">
            <p className="voice-text" style={{ marginBottom: 12 }}>Decí por ejemplo: &quot;10 brownies, 5 panes lactales&quot;</p>
            {listening && (
              <button className="voice-btn listening" onClick={detenerRecStock} style={{ marginBottom: 16 }}>Detener</button>
            )}
            {listening && <p className="voice-transcript" style={{ color: "var(--purple-light)" }}>Escuchando…</p>}
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

      {manualScreenOpen && !voiceModal && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button className="screen-back" onClick={() => setManualScreenOpen(false)}>← Volver</button>
            <span className="screen-title">Cargar stock manualmente</span>
          </div>
          <div className="screen-content">
            <div className="card">
              <div className="card-header"><span className="card-title">Productos</span></div>
              {recetasOrdenadasPorStock.map(r => {
                const cant = stock[r.id] ?? 0;
                const bajo = cant <= 0;
                return (
                  <div
                    key={r.id}
                    className="insumo-item"
                    onClick={() => { setManualRecetaSel(r); setManualCantidad(1); }}
                    style={{ cursor: "pointer" }}
                  >
                    <span style={{ fontSize: 22 }}>{r.emoji}</span>
                    <div className="insumo-info" style={{ flex: 1 }}>
                      <div className="insumo-nombre">{r.nombre}</div>
                      <div className="insumo-detalle" style={{ color: bajo ? "var(--danger)" : "var(--text-muted)" }}>
                        {bajo ? "Sin stock" : `Stock: ${cant}`} · <span style={{ textDecoration: "underline" }}>Tocar para cargar</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {newStockModalOpen && (
        <div className="modal-overlay" onClick={() => setNewStockModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Cargar stock</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
              Elegí cómo querés cargar el stock.
            </p>
            <button
              className="btn-primary"
              style={{ marginBottom: 8 }}
              onClick={() => {
                setNewStockModalOpen(false);
                if (!SpeechRecognitionAPI) {
                  showToast("⚠️ Tu navegador no soporta reconocimiento de voz");
                  return;
                }
                setTranscript("");
                setParsedStock([]);
                transcriptRef.current = "";
                setVoiceModal(true);
              }}
            >
              🎤 Cargar por voz
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setNewStockModalOpen(false);
                setManualScreenOpen(true);
              }}
            >
              📝 Cargar manualmente
            </button>
          </div>
        </div>
      )}

      {!manualScreenOpen && !voiceModal && (
        <button className="fab fab-receta" onClick={() => setNewStockModalOpen(true)} title="Cargar stock">
          <span>+</span>
          <span>Cargar stock</span>
        </button>
      )}

      {manualRecetaSel && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => setManualRecetaSel(null)}
              disabled={manualSaving}
            >
              ← Volver
            </button>
            <span className="screen-title">Cargar stock · {manualRecetaSel.emoji} {manualRecetaSel.nombre}</span>
          </div>
          <div className="screen-content">
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Stock actual: {(stock || {})[manualRecetaSel.id] ?? 0}
            </div>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 13, color: "#8B7355", marginBottom: 16 }}>¿Cuántas unidades querés sumar?</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
                <button
                  onClick={() => setManualCantidad(Math.max(1, manualCantidad - 1))}
                  style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid #EDE8E0", background: "#FAF7F2", fontSize: 22, cursor: "pointer" }}
                  disabled={manualSaving}
                >
                  −
                </button>
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 42, color: "var(--purple-dark)", minWidth: 60, textAlign: "center" }}>
                  {manualCantidad}
                </span>
                <button
                  onClick={() => setManualCantidad(manualCantidad + 1)}
                  style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid #EDE8E0", background: "#FAF7F2", fontSize: 22, cursor: "pointer" }}
                  disabled={manualSaving}
                >
                  +
                </button>
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={async () => {
                if (!manualRecetaSel || manualCantidad <= 0) return;
                setManualSaving(true);
                try {
                  await cargar(manualRecetaSel.id, manualCantidad);
                } finally {
                  setManualSaving(false);
                }
              }}
              disabled={manualSaving || manualCantidad <= 0}
            >
              {manualSaving ? "Cargando…" : `Cargar +${manualCantidad}`}
            </button>
            <button
              className="btn-secondary"
              onClick={() => setManualRecetaSel(null)}
              disabled={manualSaving}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {insumosEnCeroModal && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => setInsumosEnCeroModal(null)}
              disabled={manualSaving}
            >
              ← Volver
            </button>
            <span className="screen-title">📦 Insumos en 0</span>
          </div>
          <div className="screen-content">
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
              Estos insumos tienen 0. Cargá cuánto tenés ahora para actualizar el stock:
            </p>
            <div className="card" style={{ marginBottom: 16 }}>
              {insumosEnCeroModal.insumos.map(({ insumo_id, insumo }, i) => (
                <div key={insumo_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < insumosEnCeroModal.insumos.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <span style={{ flex: 1, fontWeight: 500 }}>{insumo?.nombre || "Insumo"}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={insumosEnCeroModal.cantidades[insumo_id] ?? ""}
                    onChange={(e) => setInsumosEnCeroModal(prev => ({
                      ...prev,
                      cantidades: { ...prev.cantidades, [insumo_id]: e.target.value }
                    }))}
                    style={{ width: 80, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 14 }}
                  />
                  <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 24 }}>{insumo?.unidad || "g"}</span>
                </div>
              ))}
            </div>
            <button
              className="btn-primary"
              onClick={confirmarInsumosEnCero}
              disabled={manualSaving}
              style={{ marginBottom: 8 }}
            >
              {manualSaving ? "Cargando…" : "Cargar y continuar"}
            </button>
            <button className="btn-secondary" onClick={omitirInsumosEnCero} disabled={manualSaving}>
              Continuar sin cargar
            </button>
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
  const [importingMultiple, setImportingMultiple] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [search, setSearch] = useState("");
  const [detalleCliente, setDetalleCliente] = useState(null);
  const [cleaningDupes, setCleaningDupes] = useState(false);

  const getAvatarColor = (name) => {
    if (!name) return "#ccc";
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  const normalizedTelefono = (tel) => (tel ? tel.trim() : "");

  const telefonoExiste = (tel) => {
    const t = normalizedTelefono(tel);
    if (!t) return false;
    return (clientes || []).some((c) => normalizedTelefono(c.telefono) === t);
  };

  const getVentasDeCliente = (clienteId) =>
    ventas.filter((v) => v.cliente_id === clienteId);

  const clientesConGasto = clientes
    .map((c) => {
      const vs = getVentasDeCliente(c.id);
      const total = vs.reduce((s, v) => {
        const linea =
          v.total_final != null
            ? v.total_final
            : (v.precio_unitario || 0) * (v.cantidad || 0);
        return s + linea;
      }, 0);
      const unidades = vs.reduce((s, v) => s + v.cantidad, 0);
      return { ...c, total, unidades, ventas: vs.length };
    })
    .sort((a, b) => b.total - a.total);

  const searchValue = search.trim().toLowerCase();

  const clientesFiltrados = clientesConGasto.filter((c) => {
    if (!searchValue) return true;
    const nombre = (c.nombre || "").toLowerCase();
    const tel = (c.telefono || "").toLowerCase();
    return nombre.includes(searchValue) || tel.includes(searchValue);
  });

  const openNew = () => {
    setForm({ nombre: "", telefono: "" });
    setModal(true);
  };

  const save = async () => {
    if (!form.nombre.trim()) return;
    const telNorm = normalizedTelefono(form.telefono);
    if (telNorm && telefonoExiste(telNorm)) {
      showToast("Ya existe un cliente con ese teléfono");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("clientes")
      .insert({ nombre: form.nombre.trim(), telefono: telNorm || null });
    if (error) {
      reportError(error, { action: "saveCliente", form: { ...form } });
      showToast(
        `⚠️ Error al guardar: ${(error.message || "").slice(0, 50)}`
      );
      setSaving(false);
      return;
    }
    showToast("✅ Cliente agregado");
    setModal(false);
    await onRefresh();
    setSaving(false);
  };

  const importarVariosContactos = async () => {
    const r = await selectContactsFromPhoneMultiple();
    if (r.error === "no-support") {
      showToast("No disponible en este dispositivo");
      return;
    }
    if (r.error === "cancelled" || !r.contacts?.length) return;
    const list = r.contacts.filter((c) => c.name || c.tel);
    if (list.length === 0) {
      showToast("No hay contactos con nombre o teléfono");
      return;
    }
    setImportingMultiple(true);
    setImportProgress({ done: 0, total: list.length });
    let ok = 0;
    const existingPhones = new Set(
      (clientes || [])
        .map((c) => normalizedTelefono(c.telefono))
        .filter(Boolean)
    );
    const newPhones = new Set();
    for (let i = 0; i < list.length; i++) {
      const telNorm = normalizedTelefono(list[i].tel);
      if (telNorm && (existingPhones.has(telNorm) || newPhones.has(telNorm))) {
        setImportProgress({ done: i + 1, total: list.length });
        continue;
      }
      const { error } = await supabase.from("clientes").insert({
        nombre: list[i].name || "Sin nombre",
        telefono: telNorm || null,
      });
      if (!error) {
        ok++;
        if (telNorm) newPhones.add(telNorm);
      }
      setImportProgress({ done: i + 1, total: list.length });
    }
    setImportingMultiple(false);
    setImportProgress({ done: 0, total: 0 });
    showToast(`✅ ${ok} de ${list.length} cliente(s) importado(s)`);
    await onRefresh();
  };

  const eliminarDuplicados = async () => {
    if (cleaningDupes) return;
    setCleaningDupes(true);
    try {
      const porTelefono = new Map();
      (clientes || []).forEach((c) => {
        const tel = normalizedTelefono(c.telefono);
        if (!tel) return;
        const arr = porTelefono.get(tel) || [];
        arr.push(c);
        porTelefono.set(tel, arr);
      });

      let mergedCount = 0;

      for (const [, list] of porTelefono.entries()) {
        if (list.length <= 1) continue;
        const withStats = list.map((c) => {
          const vs = getVentasDeCliente(c.id);
          const total = vs.reduce((s, v) => {
            const linea =
              v.total_final != null
                ? v.total_final
                : (v.precio_unitario || 0) * (v.cantidad || 0);
            return s + linea;
          }, 0);
          return { cliente: c, ventasCount: vs.length, total };
        });
        withStats.sort(
          (a, b) =>
            b.ventasCount - a.ventasCount ||
            b.total - a.total ||
            (a.cliente.id || 0) - (b.cliente.id || 0)
        );
        const keep = withStats[0].cliente;
        const losers = withStats.slice(1).map((x) => x.cliente);

        for (const loser of losers) {
          const { error: updError } = await supabase
            .from("ventas")
            .update({ cliente_id: keep.id })
            .eq("cliente_id", loser.id);
          if (updError) {
            reportError(updError, {
              action: "mergeClienteVentas",
              from: loser.id,
              to: keep.id,
            });
            continue;
          }
          const { error: delError } = await supabase
            .from("clientes")
            .delete()
            .eq("id", loser.id);
          if (delError) {
            reportError(delError, {
              action: "deleteClienteDuplicado",
              id: loser.id,
            });
            continue;
          }
          mergedCount++;
        }
      }

      if (mergedCount === 0) {
        showToast("No se encontraron clientes duplicados por teléfono");
      } else {
        showToast(`✅ Se unificaron ${mergedCount} cliente(s) duplicado(s)`);
        await onRefresh();
      }
    } catch (err) {
      reportError(err, { action: "eliminarDuplicadosClientes" });
      showToast("⚠️ Error al eliminar duplicados");
    } finally {
      setCleaningDupes(false);
    }
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
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={eliminarDuplicados}
              disabled={cleaningDupes}
            >
              {cleaningDupes ? "Limpiando..." : "Eliminar duplicados"}
            </button>
            <button className="edit-btn" onClick={openNew}>
              + Cliente
            </button>
          </div>
        </div>
        <div style={{ margin: "8px 16px 12px" }}>
          <input
            className="form-input"
            placeholder="Buscar por nombre o teléfono"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {clientesConGasto.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👥</div>
            <p>
              No hay clientes registrados.<br />
              Agregá uno con el botón + Cliente.
            </p>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🔍</div>
            <p>No se encontraron clientes para esa búsqueda.</p>
          </div>
        ) : (
          clientesFiltrados.map((c) => {
            const conCompras = clientesConGasto.filter((x) => x.total > 0);
            const rank = conCompras.findIndex((x) => x.id === c.id) + 1;
            const initial =
              ((c.nombre || "").trim()[0] || "?").toUpperCase();
            return (
              <div
                key={c.id}
                className="venta-item"
                onClick={() => setDetalleCliente(c)}
                style={{ cursor: "pointer" }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    minWidth: 24,
                  }}
                >
                  {rank > 0 ? `#${rank}` : "—"}
                </span>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: getAvatarColor(c.nombre),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 600,
                    marginRight: 12,
                    flexShrink: 0,
                  }}
                >
                  {initial}
                </div>
                <div className="insumo-info" style={{ flex: 1 }}>
                  <div className="insumo-nombre">{c.nombre}</div>
                  <div className="insumo-detalle">
                    {c.telefono || "—"} · {c.ventas} compra(s)
                  </div>
                </div>
                <div className="insumo-precio">
                  <div
                    className="insumo-precio-value"
                    style={{
                      color:
                        c.total > 0
                          ? "var(--green)"
                          : "var(--text-muted)",
                    }}
                  >
                    {c.total > 0 ? fmt(c.total) : "—"}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <button className="fab" onClick={openNew}>+</button>

      {detalleCliente && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => setDetalleCliente(null)}
            >
              ← Volver
            </button>
            <span className="screen-title">{detalleCliente.nombre}</span>
          </div>
          <div className="screen-content">
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">Resumen</span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                }}
              >
                <strong>Teléfono:</strong>{" "}
                {detalleCliente.telefono || "—"}
              </p>
              {(() => {
                const vs = getVentasDeCliente(detalleCliente.id);
            const total = vs.reduce((s, v) => {
              const linea =
                v.total_final != null
                  ? v.total_final
                  : (v.precio_unitario || 0) * (v.cantidad || 0);
              return s + linea;
            }, 0);
                return (
                  <>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-muted)",
                        marginBottom: 6,
                      }}
                    >
                      <strong>Compras:</strong> {vs.length}
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-muted)",
                      }}
                    >
                      <strong>Total gastado:</strong> {fmt(total)}
                    </p>
                  </>
                );
              })()}
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">Historial de compras</span>
              </div>
              {(() => {
                const vs = getVentasDeCliente(detalleCliente.id).sort(
                  (a, b) =>
                    (a.fecha || "") > (b.fecha || "")
                      ? -1
                      : (a.fecha || "") < (b.fecha || "")
                      ? 1
                      : 0
                );
                if (vs.length === 0) {
                  return (
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-muted)",
                        padding: "12px 16px",
                      }}
                    >
                      No hay compras registradas para este cliente.
                    </p>
                  );
                }
                return vs.map((v) => {
                  const receta = recetas.find(
                    (r) => r.id === v.receta_id
                  );
                  const totalLinea =
                    v.total_final != null
                      ? v.total_final
                      : (v.precio_unitario || 0) * (v.cantidad || 0);
                  let fechaLabel = v.fecha;
                  try {
                    if (v.fecha) {
                      fechaLabel = new Date(
                        v.fecha
                      ).toLocaleDateString("es-AR");
                    }
                  } catch {
                    // ignore parse errors
                  }
                  return (
                    <div key={v.id} className="venta-item">
                      <div className="insumo-info" style={{ flex: 1 }}>
                        <div className="insumo-nombre">
                          {receta?.nombre || "Producto"}
                        </div>
                        <div className="insumo-detalle">
                          {fechaLabel} · {v.cantidad} u
                        </div>
                      </div>
                      <div className="insumo-precio">
                        <div className="insumo-precio-value">
                          {fmt(totalLinea)}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button className="screen-back" onClick={() => setModal(false)}>← Volver</button>
            <span className="screen-title">Nuevo cliente</span>
          </div>
          <div className="screen-content">
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: María García" />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="form-input" type="tel" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="+54 11 1234-5678" />
            </div>
            <div className="form-group">
              <label className="form-label">Tomar de contactos del celular</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  type="button"
                  onClick={async () => {
                    const r = await selectContactFromPhone();
                    if (r.error === "no-support") { showToast("No disponible en este dispositivo"); return; }
                    if (r.error === "cancelled") return;
                    setForm({ nombre: r.name, telefono: r.tel });
                  }}
                  disabled={importingMultiple}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "8px 12px",
                    fontSize: 13,
                    background: "var(--cream)",
                    cursor: importingMultiple ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6
                  }}
                >
                  <span style={{ fontSize: 16 }}>📇</span>
                  <span>Elegir contacto</span>
                </button>
                <button
                  type="button"
                  onClick={importarVariosContactos}
                  disabled={importingMultiple}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "8px 12px",
                    fontSize: 13,
                    background: "var(--cream)",
                    cursor: importingMultiple ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6
                  }}
                >
                  <span style={{ fontSize: 16 }}>📋</span>
                  <span>{importingMultiple ? "Importando…" : "Importar varios"}</span>
                </button>
              </div>
              {importingMultiple && importProgress.total > 0 && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                  {importProgress.done} / {importProgress.total} contactos…
                </p>
              )}
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                Funciona en Chrome Android con HTTPS. Elegí uno o varios contactos para crear clientes.
              </p>
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

function Ventas({ recetas, ventas, clientes, stock, actualizarStock, onRefresh, showToast, confirm }) {
  const [manualScreenOpen, setManualScreenOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [clienteSel, setClienteSel] = useState(null);
  const [medioPago, setMedioPago] = useState("efectivo");
  const [estadoPago, setEstadoPago] = useState("pagado");
  const [saving, setSaving] = useState(false);
  const [voiceModal, setVoiceModal] = useState(false);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [chargeTotalOverride, setChargeTotalOverride] = useState("");
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
  const ingresoHoy = ventasHoy.reduce(
    (s, v) =>
      s +
      (v.total_final != null
        ? v.total_final
        : (v.precio_unitario || 0) * (v.cantidad || 0)),
    0
  );
  const cartTotal = cartItems.reduce(
    (s, item) => s + (item.precio_unitario || 0) * (item.cantidad || 0),
    0
  );

  const addToCart = (receta, cantidad = 1) => {
    if (!receta) return;
    setCartItems((prev) => {
      const idx = prev.findIndex((it) => it.receta.id === receta.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], cantidad: copy[idx].cantidad + cantidad };
        return copy;
      }
      return [
        ...prev,
        { receta, cantidad, precio_unitario: receta.precio_venta || 0 }
      ];
    });
  };

  const updateCartQuantity = (recetaId, delta) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.receta.id === recetaId
          ? { ...item, cantidad: Math.max(1, item.cantidad + delta) }
          : item
      )
    );
  };

  const removeFromCart = (recetaId) => {
    setCartItems((prev) => prev.filter((item) => item.receta.id !== recetaId));
  };

  const updateCartPrice = (recetaId, value) => {
    const text = String(value).trim();
    // Permitir campo vacío en el input: se interpreta como 0 para cálculos
    if (text === "") {
      setCartItems((prev) =>
        prev.map((item) =>
          item.receta.id === recetaId ? { ...item, precio_unitario: "" } : item
        )
      );
      return;
    }
    const num = parseFloat(text.replace(",", "."));
    if (Number.isNaN(num) || num < 0) return;
    setCartItems((prev) =>
      prev.map((item) =>
        item.receta.id === recetaId ? { ...item, precio_unitario: num } : item
      )
    );
  };

  const resetNuevaVenta = () => {
    setManualScreenOpen(false);
    setCartItems([]);
    setClienteSel(null);
    setMedioPago("efectivo");
    setEstadoPago("pagado");
    setChargeTotalOverride("");
    setChargeModalOpen(false);
  };

  const closeManualScreen = () => {
    resetNuevaVenta();
  };

  const eliminarVenta = async (grupo) => {
    if (!(await confirm("¿Eliminar esta venta?", { destructive: true }))) return;
    const ids = grupo.rawItems.map((i) => i.id).filter(Boolean);
    if (ids.length === 0) {
      showToast("⚠️ No hay ventas para eliminar");
      return;
    }
    const key = grupo.key || ids[0];
    setDeletingId(key);
    try {
      const { error } = await supabase.from("ventas").delete().in("id", ids);
      if (error) throw error;
      if (actualizarStock) for (const v of grupo.rawItems) await actualizarStock(v.receta_id, v.cantidad);
      showToast("✅ Venta eliminada");
      onRefresh();
    } catch (err) {
      reportError(err, { action: "eliminarVenta", ids });
      const msg = (err?.message || err?.code || "Error desconocido").slice(0, 80);
      showToast(`⚠️ No se puede eliminar: ${msg}`);
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
        if (editCantidades[v.id] != null) {
          payload.cantidad = nuevaCant;
          const precio = v.precio_unitario || 0;
          const subtotal = precio * nuevaCant;
          const descuento = v.descuento != null ? v.descuento : 0;
          payload.subtotal = subtotal;
          payload.total_final = subtotal - descuento;
        }
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
        const rows = editItemsToAdd.map(({ receta_id, cantidad, receta }) => {
          const precio = receta.precio_venta || 0;
          const subtotal = precio * cantidad;
          const descuento = 0;
          const total_final = subtotal - descuento;
          return {
            receta_id,
            cantidad,
            precio_unitario: precio,
            subtotal,
            descuento,
            total_final,
            fecha: hoy,
            transaccion_id: transaccionId,
            cliente_id: editForm.cliente_id || null,
            medio_pago: editForm.medio_pago,
            estado_pago: editForm.estado_pago
          };
        });
        const { error } = await supabase.from("ventas").insert(rows);
        if (error) throw error;
        if (actualizarStock) for (const { receta_id, cantidad: cant } of editItemsToAdd) await actualizarStock(receta_id, -cant);
      }

      showToast("✅ Venta actualizada");
      setEditModalOpen(false);
      setEditGrupo(null);
      setEditItemsToAdd([]);
      onRefresh();
    } catch (err) {
      reportError(err, { action: "guardarEdicion", grupo: editGrupo?.key });
      showToast("⚠️ Error al actualizar venta");
    } finally {
      setEditSaving(false);
    }
  };

  const SelectorCliente = ({ value, onChange }) => (
    <div className="form-group">
      <label className="form-label">Cliente</label>
      <select
        className="form-input"
        value={value || ""}
        onChange={(e) => onChange(e.target.value ? e.target.value : null)}
      >
        <option value="">— Sin cliente</option>
        {(clientes || []).map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
            {c.telefono ? ` · ${c.telefono}` : ""}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn-secondary"
        style={{ marginTop: 8 }}
        title="Agregar desde contactos del celular"
        onClick={async () => {
          const r = await selectContactFromPhone();
          if (r.error === "no-support") {
            showToast("No disponible en este dispositivo");
            return;
          }
          if (r.error === "cancelled") return;
          if (!r.name?.trim()) return;
          const telNorm = r.tel?.trim() || "";
          if (
            telNorm &&
            (clientes || []).some(
              (c) => (c.telefono || "").trim() === telNorm
            )
          ) {
            showToast("Ya existe un cliente con ese teléfono");
            return;
          }
          const { data, error } = await supabase
            .from("clientes")
            .insert({ nombre: r.name.trim(), telefono: telNorm || null })
            .select("id")
            .single();
          if (error) {
            showToast("⚠️ Error al agregar cliente");
            return;
          }
          if (data) {
            await onRefresh();
            onChange(data.id);
            showToast(`✅ Cliente ${r.name} agregado`);
          }
        }}
      >
        📇 Elegir contacto
      </button>
    </div>
  );

  const SelectoresPago = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
      <div className="form-group">
        <label className="form-label">Medio</label>
        <select className="form-input" value={medioPago} onChange={e => setMedioPago(e.target.value)}>
        <option value="efectivo">💵 Efectivo</option>
        <option value="transferencia">📱 Transferencia</option>
        <option value="debito">💳 Débito</option>
        <option value="credito">💳 Crédito</option>
        </select>
      </div>
      <div className="form-group">
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
    setTranscript("");
    setParsedVentas([]);
    transcriptRef.current = "";
    setVoiceModal(true);
  };

  const agregarMasVoz = () => {
    if (!SpeechRecognitionAPI) return;
    iniciarRec(true);
  };

  const detenerVoz = () => {
    try { recRef.current?.abort?.(); } catch { /* ignore */ }
    try { recRef.current?.stop?.(); } catch { /* ignore */ }
    recRef.current = null;
    setListening(false);
  };

  const registrarVentasVoz = async () => {
    if (parsedVentas.length === 0) {
      showToast("No se detectaron productos. Probá de nuevo.");
      return;
    }
    setSavingVoice(true);
    try {
      setCartItems((prev) => {
        const merged = [...prev];
        for (const { receta, cantidad: cant } of parsedVentas) {
          if (!receta) continue;
          const idx = merged.findIndex((m) => m.receta.id === receta.id);
          if (idx >= 0) {
            merged[idx] = {
              ...merged[idx],
              cantidad: merged[idx].cantidad + cant
            };
          } else {
            merged.push({
              receta,
              cantidad: cant,
              precio_unitario: receta.precio_venta || 0
            });
          }
        }
        return merged;
      });
      const total = parsedVentas.reduce(
        (s, v) => s + (v.receta.precio_venta || 0) * v.cantidad,
        0
      );
      showToast(`✅ Productos agregados al carrito (${fmt(total)})`);
      setVoiceModal(false);
      setTranscript("");
      setParsedVentas([]);
    } finally {
      setSavingVoice(false);
    }
  };

  const abrirCobro = () => {
    if (cartItems.length === 0) return;
    setChargeTotalOverride("");
    setChargeModalOpen(true);
  };

  const registrarVentaCarrito = async () => {
    if (cartItems.length === 0) {
      showToast("Agregá productos al carrito primero.");
      return;
    }

    const sinStock = cartItems.filter(
      ({ receta, cantidad }) => ((stock || {})[receta.id] ?? 0) < cantidad
    );
    if (
      sinStock.length > 0 &&
      !(await confirm(
        `Stock insuficiente en ${sinStock
          .map((s) => s.receta.nombre)
          .join(", ")}. ¿Registrar venta igual?`
      ))
    ) {
      return;
    }

    setSaving(true);
    try {
      const hoy = new Date().toISOString().split("T")[0];
      const totalCarrito = cartItems.reduce(
        (s, it) => s + (it.precio_unitario || 0) * (it.cantidad || 0),
        0
      );
      const override = parseFloat(
        String(chargeTotalOverride || "").replace(",", ".")
      );
      const usarOverride =
        !Number.isNaN(override) &&
        override >= 0 &&
        override !== totalCarrito &&
        totalCarrito > 0;

      if (totalCarrito === 0 && !Number.isNaN(override) && override > 0) {
        showToast(
          "Para usar un total final distinto, asigná precios mayores a 0 en el carrito."
        );
        return;
      }

      let transaccionId = crypto.randomUUID?.() || `t-${Date.now()}`;
      const rows = cartItems.map(({ receta, cantidad, precio_unitario }) => {
        const precio = precio_unitario || 0;
        const subtotal = precio * (cantidad || 0);
        const descuento = 0;
        const total_final = subtotal - descuento;
        return {
          receta_id: receta.id,
          cantidad,
          precio_unitario: precio,
          subtotal,
          descuento,
          total_final,
          fecha: hoy,
          transaccion_id: transaccionId,
          cliente_id: clienteSel || null,
          medio_pago: medioPago,
          estado_pago: estadoPago
        };
      });

      if (usarOverride) {
        const factor = override / totalCarrito;
        let acumulado = 0;
        for (let i = 0; i < rows.length; i++) {
          const baseSubtotal = rows[i].subtotal || 0;
          let nuevoSubtotal =
            i === rows.length - 1
              ? override - acumulado
              : Math.round(baseSubtotal * factor);
          const nuevaPU =
            rows[i].cantidad > 0
              ? nuevoSubtotal / rows[i].cantidad
              : rows[i].precio_unitario;
          acumulado += nuevoSubtotal;
          rows[i].precio_unitario = nuevaPU;
          rows[i].subtotal = nuevoSubtotal;
          rows[i].descuento = 0;
          rows[i].total_final = nuevoSubtotal;
        }
      }

      let { error } = await supabase.from("ventas").insert(rows);
      const sinTransaccion =
        error &&
        (error.message?.includes("transaccion_id") || error.code === "42703");
      if (sinTransaccion) {
        const res = await supabase
          .from("ventas")
          .insert(rows.map(({ transaccion_id, ...r }) => r));
        error = res.error;
      }
      if (error) throw error;

      if (actualizarStock) {
        for (const { receta, cantidad } of cartItems) {
          await actualizarStock(receta.id, -cantidad);
        }
      }

      const totalFinal = usarOverride ? override : totalCarrito;
      showToast(`✅ Venta registrada: ${fmt(totalFinal)}`);
      resetNuevaVenta();
      onRefresh();
    } catch (err) {
      reportError(err, { action: "registrarVentaCarrito" });
      showToast("⚠️ Error al registrar venta");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content">
      <p className="page-title">Ventas</p>
      <p className="page-subtitle">Hoy: {fmt(ingresoHoy)}</p>

      {ventasHoy.length > 0 && (
        <>
          <div className="card-header" style={{ marginBottom: 8 }}><span className="card-title">Hoy</span></div>
          {agruparVentas(ventasHoy).map((grupo) => {
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
        <div className="screen-overlay">
          <div className="screen-header">
            <button className="screen-back" onClick={() => setEditModalOpen(false)}>← Volver</button>
            <span className="screen-title">Editar venta</span>
          </div>
          <div className="screen-content">
            <SelectorCliente value={editForm.cliente_id} onChange={v => setEditForm({ ...editForm, cliente_id: v })} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">Medio</label>
                <select className="form-input" value={editForm.medio_pago} onChange={e => setEditForm({ ...editForm, medio_pago: e.target.value })}>
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="transferencia">📱 Transferencia</option>
                  <option value="debito">💳 Débito</option>
                  <option value="credito">💳 Crédito</option>
                </select>
              </div>
              <div className="form-group">
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
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, minWidth: 40, textAlign: "center" }}>{editCantidades[editGrupo.rawItems[0].id] ?? editGrupo.rawItems[0].cantidad}</span>
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
              <select className="form-input" value={editRecetaToAdd} onChange={e => setEditRecetaToAdd(e.target.value)} style={{ marginBottom: 8 }}>
                <option value="">— Seleccionar</option>
                {recetas.map(r => (
                  <option key={r.id} value={r.id}>{r.emoji} {r.nombre} · {fmt(r.precio_venta || 0)}</option>
                ))}
              </select>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <label className="form-label" style={{ marginBottom: 0, flex: "0 0 auto" }}>Cantidad</label>
                <button onClick={() => setEditCantidadToAdd(Math.max(1, editCantidadToAdd - 1))} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border)", background: "var(--cream)", fontSize: 18, cursor: "pointer" }}>−</button>
                <span style={{ minWidth: 28, textAlign: "center", fontWeight: 500 }}>{editCantidadToAdd}</span>
                <button onClick={() => setEditCantidadToAdd(editCantidadToAdd + 1)} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border)", background: "var(--cream)", fontSize: 18, cursor: "pointer" }}>+</button>
                <button className="btn-primary" onClick={agregarProductoEnEdicion} disabled={!editRecetaToAdd} style={{ padding: "8px 16px", marginLeft: "auto" }}>Agregar</button>
              </div>
              {editItemsToAdd.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {editItemsToAdd.map((it, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ flex: 1 }}>{it.receta?.emoji} {it.receta?.nombre} x{it.cantidad}</span>
                      <span style={{ color: "var(--green)", fontWeight: 500 }}>{fmt((it.receta?.precio_venta || 0) * it.cantidad)}</span>
                      <button onClick={() => quitarProductoEnEdicion(idx)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 18 }} title="Quitar">✕</button>
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
        <div className="screen-overlay">
          <div className="screen-header">
            <button className="screen-back" onClick={() => { detenerVoz(); setVoiceModal(false); }}>← Volver</button>
            <span className="screen-title">🎤 Agregar por voz</span>
          </div>
          <div className="screen-content">
            <p className="voice-text" style={{ marginBottom: 12 }}>
              Decí por ejemplo: &quot;2 brownies y 1 pan lactal&quot;.
              <br />
              Vamos a agregar los productos al carrito.
            </p>
            {listening && (
              <button className="voice-btn listening" onClick={detenerVoz} style={{ marginBottom: 16 }}>
                Detener
              </button>
            )}
            {listening && <p className="voice-transcript" style={{ color: "var(--purple-light)" }}>Escuchando…</p>}
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
              {savingVoice
                ? "Agregando…"
                : `Agregar al carrito · ${fmt(
                    parsedVentas.reduce(
                      (s, v) => s + v.receta.precio_venta * v.cantidad,
                      0
                    )
                  )}`}
            </button>
            <button className="btn-secondary" onClick={() => { detenerVoz(); setVoiceModal(false); }}>Cancelar</button>
          </div>
        </div>
      )}

      {!manualScreenOpen && !voiceModal && (
        <button className="fab fab-receta" onClick={() => setManualScreenOpen(true)} title="Nueva venta">
          <span>+</span>
          <span>Nueva venta</span>
        </button>
      )}

      {manualScreenOpen && (
        <div className="screen-overlay">
          <div className="screen-header" style={{ alignItems: "flex-start" }}>
            <button className="screen-back" onClick={closeManualScreen}>← Volver</button>
            <div style={{ flex: 1, marginLeft: 8 }}>
              <div className="screen-title">Nueva venta</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Calculadora de venta</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Total</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, color: "var(--purple-dark)" }}>{fmt(cartTotal)}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="btn-secondary" onClick={iniciarVoz}>🎙️ Voz</button>
                <button type="button" className="btn-primary" onClick={abrirCobro} disabled={cartItems.length === 0}>✓ Cobrar</button>
              </div>
            </div>
          </div>
          <div className="screen-content">
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">Carrito</span>
              </div>
              {cartItems.length === 0 ? (
                <p style={{ padding: "12px 4px", fontSize: 14, color: "var(--text-muted)" }}>Agregá productos</p>
              ) : (
                <>
                  <div>
                    {cartItems.map((item) => (
                      <div key={item.receta.id} className="insumo-item" style={{ alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 22 }}>{item.receta.emoji}</span>
                        <div className="insumo-info" style={{ flex: 1 }}>
                          <div className="insumo-nombre">{item.receta.nombre}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(item.receta.id, -1)}
                                style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid var(--border)", background: "var(--cream)", fontSize: 18, cursor: "pointer" }}
                              >
                                −
                              </button>
                              <span style={{ minWidth: 24, textAlign: "center" }}>{item.cantidad}</span>
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(item.receta.id, 1)}
                                style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid var(--border)", background: "var(--cream)", fontSize: 18, cursor: "pointer" }}
                              >
                                +
                              </button>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
                              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>$</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                className="form-input"
                                value={item.precio_unitario === "" ? "" : item.precio_unitario}
                                onChange={(e) => updateCartPrice(item.receta.id, e.target.value)}
                                style={{ maxWidth: 90, padding: "6px 8px", fontSize: 14 }}
                              />
                            </div>
                            <div style={{ minWidth: 80, textAlign: "right", fontWeight: 500 }}>
                              {fmt((item.precio_unitario || 0) * (item.cantidad || 0))}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.receta.id)}
                              style={{ marginLeft: 4, background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 18 }}
                              title="Quitar"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--border)" }}>
                    <span style={{ fontWeight: 500 }}>Total</span>
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, color: "#4A7C59" }}>{fmt(cartTotal)}</span>
                  </div>
                </>
              )}
            </div>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Productos</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                {recetas.map(r => {
                  const st = (stock || {})[r.id] ?? 0;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => addToCart(r, 1)}
                      className="producto-card"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        cursor: "pointer",
                        transition: "transform 0.08s ease, box-shadow 0.08s ease"
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = "scale(0.97)";
                        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.06)";
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <span style={{ fontSize: 26, marginBottom: 4 }}>{r.emoji}</span>
                      <span style={{ fontSize: 14, fontWeight: 500, marginBottom: 2, textAlign: "left" }}>{r.nombre}</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {fmt(r.precio_venta || 0)}/{(r.unidad_rinde || "u").replace("porción", "porc.")}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Stock: {st}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {chargeModalOpen && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button className="screen-back" onClick={() => setChargeModalOpen(false)}>← Volver</button>
            <span className="screen-title">Cobro</span>
          </div>
          <div className="screen-content">
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">Resumen</span>
              </div>
              {cartItems.length === 0 ? (
                <p style={{ padding: "12px 4px", fontSize: 14, color: "var(--text-muted)" }}>No hay productos en el carrito.</p>
              ) : (
                <>
                  {cartItems.map((item) => (
                    <div key={item.receta.id} className="venta-item venta-item-simple">
                      <span className="venta-emoji">{item.receta.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{item.receta.nombre}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          x{item.cantidad} · {fmt(item.precio_unitario || 0)} c/u
                        </div>
                      </div>
                      <div style={{ fontWeight: 500 }}>
                        {fmt((item.precio_unitario || 0) * (item.cantidad || 0))}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--border)" }}>
                    <span style={{ fontWeight: 500 }}>Total carrito</span>
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18 }}>{fmt(cartTotal)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <SelectorCliente value={clienteSel} onChange={setClienteSel} />
              <SelectoresPago />
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Total final (editable)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>💰</span>
                  <input
                    className="form-input"
                    type="number"
                    value={chargeTotalOverride}
                    onChange={(e) => setChargeTotalOverride(e.target.value)}
                    placeholder={fmt(cartTotal)}
                    style={{ flex: 1 }}
                  />
                </div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  Dejalo vacío para usar el total del carrito. Usalo para descuentos o redondeos.
                </p>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={registrarVentaCarrito}
              disabled={saving || cartItems.length === 0}
            >
              {saving ? "Registrando..." : "Registrar venta"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => setChargeModalOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [insumos, setInsumos] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const confirmResolveRef = useRef(null);

  const showToast = (msg) => setToast(msg);
  const confirm = useCallback((message, { destructive = false } = {}) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmState({ message, destructive });
    });
  }, []);

  const handleConfirm = useCallback((ok) => {
    if (confirmResolveRef.current) confirmResolveRef.current(ok);
    confirmResolveRef.current = null;
    setConfirmState(null);
  }, []);

  const [recetaIngredientes, setRecetaIngredientes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [stock, setStock] = useState({});
  const [insumoStock, setInsumoStock] = useState({});
  const [insumoMovimientos, setInsumoMovimientos] = useState([]);
  const [insumoComposicion, setInsumoComposicion] = useState([]);
  const [errorLogOpen, setErrorLogOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

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
    const insCompPromise = supabase.from("insumo_composicion").select("insumo_id, insumo_id_componente, factor")
      .then(r => ({ ok: !r.error, data: r.data || [] }))
      .catch(() => ({ ok: false, data: [] }));
    const [insRes, recRes, venRes, riRes, cliRes, stRes, insStRes, insMovRes, insCompRes] = await Promise.all([
      supabase.from("insumos").select("*").order("categoria").order("nombre"),
      supabase.from("recetas").select("*").order("nombre"),
      supabase.from("ventas").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("receta_ingredientes").select("*"),
      supabase.from("clientes").select("*").order("nombre"),
      stPromise,
      insStPromise,
      insMovPromise,
      insCompPromise
    ]);
    const authErr = (e) => e && (e.status === 401 || e.status === 403);
    if ([insRes.error, recRes.error, venRes.error, riRes.error, cliRes.error].some(authErr)) {
      showToast("🔒 Sesión expirada o sin permisos. Volvé a iniciar sesión.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
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
    if (insCompRes.ok) {
      setInsumoComposicion(insCompRes.data || []);
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

  useEffect(() => {
    if (session) loadData();
    else setLoading(false);
  }, [session, loadData]);

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
    let previo;
    setInsumoStock(prev => {
      const actual = prev[insumo_id] ?? 0;
      previo = actual;
      nuevo = actual + delta;
      return { ...prev, [insumo_id]: nuevo };
    });
    const { error: errStock } = await supabase.from("insumo_stock").upsert({ insumo_id, cantidad: nuevo, updated_at: new Date().toISOString() }, { onConflict: "insumo_id" });
    if (errStock) {
      setInsumoStock(prev => ({ ...prev, [insumo_id]: (prev[insumo_id] ?? 0) - delta }));
      throw errStock;
    }
    const { data: mov, error: errMov } = await supabase.from("insumo_movimientos").insert({ insumo_id, tipo, cantidad, valor: valor || null }).select("id, insumo_id, tipo, cantidad, valor, created_at").single();
    if (errMov) {
      // Compensación: si falla el movimiento, revertimos el stock (estado + DB)
      setInsumoStock(prev => ({ ...prev, [insumo_id]: previo ?? (prev[insumo_id] ?? 0) - delta }));
      await supabase.from("insumo_stock").upsert({ insumo_id, cantidad: previo ?? 0, updated_at: new Date().toISOString() }, { onConflict: "insumo_id" });
      throw errMov;
    }
    if (mov) setInsumoMovimientos(prev => [mov, ...prev]);
  }, []);

  /** Consume insumos al cargar stock: si cargás +10 alfajores, descuenta los ingredientes (premezcla, etc.).
   * Si un insumo tiene composición (ej. premezcla = harina+almidón+mandioca), descuenta los componentes. */
  const consumirInsumosPorStock = useCallback(async (receta_id, cantidad) => {
    const receta = recetas.find(r => r.id === receta_id);
    if (!receta || !receta.rinde) return;
    const ings = recetaIngredientes.filter(i => i.receta_id === receta_id && i.insumo_id);
    const composicionPorInsumo = {};
    for (const c of insumoComposicion || []) {
      if (!composicionPorInsumo[c.insumo_id]) composicionPorInsumo[c.insumo_id] = [];
      composicionPorInsumo[c.insumo_id].push(c);
    }
    for (const ing of ings) {
      const insumo = insumos.find(x => x.id === ing.insumo_id);
      if (!insumo) continue;
      const cantPorUnidad = (parseFloat(ing.cantidad) || 0) / (receta.rinde || 1);
      const cantTotalIng = cantPorUnidad * cantidad;
      const cantGramos = aGramos(cantTotalIng, ing.unidad || "g");
      const componentes = composicionPorInsumo[ing.insumo_id];
      if (componentes && componentes.length > 0) {
        for (const comp of componentes) {
          const factor = parseFloat(comp.factor) || 0;
          if (factor <= 0) continue;
          const insumoHijo = insumos.find(x => x.id === comp.insumo_id_componente);
          if (!insumoHijo) continue;
          const cantHijoGramos = cantGramos * factor;
          const cantHijo = convertirAUnidadInsumo(cantHijoGramos, "g", insumoHijo.unidad || "g");
          if (cantHijo > 0) await registrarMovimientoInsumo(comp.insumo_id_componente, "egreso", cantHijo);
        }
      } else {
        const cantEnUnidad = convertirAUnidadInsumo(cantTotalIng, ing.unidad || "g", insumo.unidad || "g");
        if (cantEnUnidad > 0) await registrarMovimientoInsumo(ing.insumo_id, "egreso", cantEnUnidad);
      }
    }
  }, [recetas, recetaIngredientes, insumos, insumoComposicion, registrarMovimientoInsumo]);

  const TABS = [
    { id: "dashboard", icon: "📊", label: "Inicio" },
    { id: "ventas", icon: "💰", label: "Ventas" },
    { id: "stock", icon: "📥", label: "Stock" },
    { id: "clientes", icon: "👥", label: "Clientes" },
    { id: "insumos", icon: "📦", label: "Insumos" },
    { id: "recetas", icon: "📋", label: "Recetas" },
  ];

  if (!SUPABASE_CONFIG_OK) {
    return (
      <>
        <style>{styles}</style>
        <ConfigMissing />
      </>
    );
  }

  if (authLoading) {
    return (
      <>
        <style>{styles}</style>
        <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div className="loading"><div className="spinner" /><span>Cargando...</span></div>
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <style>{styles}</style>
        <AuthScreen />
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="header">
          <div className="header-top">
            <h1>🌾 Panadería SG</h1>
            <span className="header-badge">Gluten Free*</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {getErrorLog().length > 0 && (
                <button type="button" onClick={() => setErrorLogOpen(true)} title="Ver errores" style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, color: "white", cursor: "pointer" }}>
                  ⚠ {getErrorLog().length}
                </button>
              )}
              <button type="button" className="auth-logout" onClick={() => supabase.auth.signOut()} title="Cerrar sesión">Salir</button>
            </div>
          </div>
          <a href="/privacidad.html" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 6, display: "block" }}>Privacidad</a>
        </div>

        {errorLogOpen && (
          <div className="screen-overlay">
            <div className="screen-header">
              <button className="screen-back" onClick={() => setErrorLogOpen(false)}>← Cerrar</button>
              <span className="screen-title">Log de errores</span>
            </div>
            <div className="screen-content" style={{ fontSize: 12 }}>
              {getErrorLog().length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>No hay errores registrados.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {getErrorLog().slice().reverse().map((e, i) => (
                    <div key={i} style={{ padding: 12, background: "var(--cream)", borderRadius: 10, border: "1px solid var(--border)", wordBreak: "break-word" }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>{e.ts}</div>
                      {e.action && <span style={{ color: "var(--purple)" }}>[{e.action}] </span>}
                      {e.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading"><div className="spinner" /><span>Cargando...</span></div>
        ) : (
          <>
            {tab === "dashboard" && <Dashboard insumos={insumos} recetas={recetas} ventas={ventas} clientes={clientes} stock={stock} onNavigate={setTab} />}
            {tab === "insumos" && <Insumos insumos={insumos} insumoStock={insumoStock} insumoMovimientos={insumoMovimientos} insumoComposicion={insumoComposicion} registrarMovimientoInsumo={registrarMovimientoInsumo} onRefresh={loadData} showToast={showToast} confirm={confirm} />}
            {tab === "recetas" && <Recetas recetas={recetas} insumos={insumos} recetaIngredientes={recetaIngredientes} showToast={showToast} onRefresh={loadData} confirm={confirm} />}
            {tab === "ventas" && <Ventas recetas={recetas} ventas={ventas} clientes={clientes} stock={stock} actualizarStock={actualizarStock} onRefresh={loadData} showToast={showToast} confirm={confirm} />}
            {tab === "stock" && <Stock recetas={recetas} stock={stock} actualizarStock={actualizarStock} consumirInsumosPorStock={consumirInsumosPorStock} insumoStock={insumoStock} insumos={insumos} recetaIngredientes={recetaIngredientes} insumoComposicion={insumoComposicion} registrarMovimientoInsumo={registrarMovimientoInsumo} onRefresh={loadData} showToast={showToast} />}
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
        {confirmState && (
          <ConfirmDialog
            message={confirmState.message}
            destructive={confirmState.destructive}
            onConfirm={() => handleConfirm(true)}
            onCancel={() => handleConfirm(false)}
          />
        )}
      </div>
    </>
  );
}