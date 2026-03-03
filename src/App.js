import { useState, useEffect, useCallback, useRef } from "react";
import { reportError, getErrorLog } from "./utils/errorReport";
import { fmt, pctFmt } from "./lib/format";
import { aGramos, convertirAUnidadInsumo } from "./lib/units";
import { getSemanaInicioISO, hoyLocalISO } from "./lib/dates";
import { supabase, SUPABASE_CONFIG_OK } from "./lib/supabaseClient";
import {
  INSUMOS_SEED,
  CATEGORIAS,
  CAT_COLORS,
  METRICAS_VENTANA_DIAS,
  DIAS_ALERTA_ROJA,
  DIAS_ALERTA_AMARILLA,
  DIAS_OBJETIVO_PRODUCCION,
} from "./config/appConfig";
import {
  saveVentaPendiente,
  getVentasPendientes,
  deleteVentaPendiente,
} from "./lib/offlineVentas";

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
  .nav-btn .nav-label { font-size: 9px; letter-spacing: 0.8px; text-transform: uppercase; font-family: 'Plus Jakarta Sans', sans-serif; color: inherit; display: inline-flex; align-items: center; gap: 4px; }
  .nav-badge-stock { background: var(--danger); color: white; font-size: 9px; font-weight: 600; padding: 2px 6px; border-radius: 999px; }

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

  /* Analytics */
  .analytics-section { display: flex; flex-direction: column; gap: 12px; }
  .analytics-kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 4px; }
  .analytics-kpi-card { background: var(--surface); border-radius: 14px; padding: 12px; box-shadow: var(--shadow); border: 1px solid var(--border); }
  .analytics-kpi-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .analytics-kpi-value { font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 600; color: var(--purple-dark); }
  .analytics-kpi-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
  .analytics-trend { font-size: 11px; font-weight: 600; margin-left: 4px; }
  .analytics-trend.up { color: var(--green); }
  .analytics-trend.down { color: var(--danger); }
  .analytics-trend.flat { color: var(--text-muted); }

  .analytics-list { display: flex; flex-direction: column; gap: 8px; }
  .analytics-item { display: flex; align-items: center; gap: 10px; }
  .analytics-item-main { flex: 1; min-width: 0; }
  .analytics-item-title { font-size: 13px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .analytics-item-sub { font-size: 11px; color: var(--text-muted); }
  .analytics-item-badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--cream); border: 1px solid var(--border); }

  .bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 90px; }
  .bar-chart-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .bar-chart-bar { width: 100%; max-width: 20px; border-radius: 8px 8px 4px 4px; background: linear-gradient(180deg, var(--purple) 0%, var(--purple-dark) 100%); transition: height 0.2s; }
  .bar-chart-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; }
  .bar-chart-value { font-size: 10px; color: var(--text-muted); }

  .pie-chart { display: flex; align-items: center; gap: 12px; }
  .pie-chart-figure { position: relative; width: 110px; height: 110px; border-radius: 50%; box-shadow: var(--shadow); border: 1px solid var(--border); background: var(--cream); flex-shrink: 0; }
  .pie-chart-figure::after { content: ""; position: absolute; inset: 20px; border-radius: 50%; background: var(--surface); }
  .pie-chart-legend { flex: 1; display: flex; flex-direction: column; gap: 6px; }
  .pie-chart-legend-item { display: flex; align-items: center; gap: 8px; font-size: 11px; }
  .pie-chart-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .pie-chart-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pie-chart-pct { font-weight: 600; color: var(--purple-dark); }

  .analytics-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .analytics-chip { font-size: 11px; padding: 4px 10px; border-radius: 999px; background: var(--cream); border: 1px solid var(--border); }

  /* Offline banner */
  .offline-banner {
    background: #FDF3C4;
    color: #8B6B1F;
    font-size: 12px;
    padding: 8px 16px;
    text-align: center;
    border-bottom: 1px solid #F0E0A0;
  }
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

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
/** Contact Picker API - helpers, unidades y fechas ahora viven en lib/format, lib/units y lib/dates */

/** Calcula cuántos insumos se necesitan para una lista de recetas y cantidades.
 * Devuelve [{ insumo_id, insumo, cantidad }] donde cantidad está en la unidad del insumo. */
function calcularRequerimientoInsumosParaItems(items, recetaIngredientes, insumos, insumoComposicion) {
  if (!items?.length || !recetaIngredientes?.length || !insumos?.length) return [];
  const composicionPorInsumo = {};
  for (const c of insumoComposicion || []) {
    if (!composicionPorInsumo[c.insumo_id]) composicionPorInsumo[c.insumo_id] = [];
    composicionPorInsumo[c.insumo_id].push(c);
  }
  const requeridos = {};
  for (const { receta, cantidad } of items) {
    if (!receta?.id || !receta.rinde || !cantidad || cantidad <= 0) continue;
    const ings = (recetaIngredientes || []).filter(i => i.receta_id === receta.id && i.insumo_id);
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
          if (!requeridos[insumoHijo.id]) requeridos[insumoHijo.id] = { insumo_id: insumoHijo.id, insumo: insumoHijo, cantidad: 0 };
          requeridos[insumoHijo.id].cantidad += cantHijo;
        }
      } else {
        const cantEnUnidad = convertirAUnidadInsumo(cantTotalIng, ing.unidad || "g", insumo.unidad || "g");
        if (!requeridos[insumo.id]) requeridos[insumo.id] = { insumo_id: insumo.id, insumo, cantidad: 0 };
        requeridos[insumo.id].cantidad += cantEnUnidad;
      }
    }
  }
  return Object.values(requeridos);
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

/** Parsea texto de voz a compras de insumos: "compré 2kg de harina de almendras a 43000 pesos y 500g de levadura" */
function parsearVozAComprasInsumos(texto, insumos) {
  if (!texto || !insumos?.length) return [];
  const norm = (s) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const txt = norm(texto).replace(/compr[eé]/g, "compre");
  const segmentos = txt
    .split(/[,y]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const matchInsumo = (nombreBuscado) => {
    const nb = norm(nombreBuscado);
    if (!nb) return null;
    let mejor = null;
    let mejorScore = 0;
    for (const ins of insumos) {
      const ni = norm(ins.nombre);
      if (!ni) continue;
      if (ni.includes(nb) || nb.includes(ni)) {
        const score = Math.min(ni.length, nb.length);
        if (score > mejorScore) {
          mejor = ins;
          mejorScore = score;
        }
      }
    }
    return mejor;
  };

  const parseNumero = (s) => {
    if (!s) return NaN;
    const n = parseFloat(String(s).replace(",", "."));
    return Number.isNaN(n) ? NaN : n;
  };

  const unidadesKg = ["kg", "kilo", "kilos"];
  const unidadesG = ["g", "gramo", "gramos"];
  const unidadesMl = ["ml", "mililitro", "mililitros"];
  const unidadesL = ["l", "litro", "litros"];
  const unidadesU = ["u", "unidad", "unidades"];

  const resultado = [];

  for (const seg of segmentos) {
    if (!seg) continue;
    // Ej: "2kg de harina de almendras a 43000 pesos"
    const m = seg.match(
      /(\d+(?:[.,]\d+)?)\s*(kg|kilo|kilos|g|gramos?|ml|mililitros?|l|litros?|u|unidad(?:es)?)?\s*(?:de)?\s+(.+)/
    );
    if (!m) continue;
    const cantidad = parseNumero(m[1]);
    if (!cantidad || cantidad <= 0) continue;
    const unidadFrase = (m[2] || "").trim();
    const resto = (m[3] || "").trim();

    let nombreParte = resto;
    let precioParte = "";
    const splitPrecio = resto.split(/\sa\s+/);
    if (splitPrecio.length >= 2) {
      nombreParte = splitPrecio[0].trim();
      precioParte = splitPrecio.slice(1).join(" a ").trim();
    }

    const insumo = matchInsumo(nombreParte);
    if (!insumo) continue;

    let precioPresentacion = null;
    if (precioParte) {
      const mPrecio = precioParte.match(/(\d+(?:[.,]\d+)?)/);
      if (mPrecio) {
        const p = parseNumero(mPrecio[1]);
        if (p > 0) precioPresentacion = p;
      }
    }

    const uFrase = unidadFrase.toLowerCase();
    const uInsumo = (insumo.unidad || "g").toLowerCase();
    const cantPres = Number(insumo.cantidad_presentacion) || 1;

    let presentaciones = cantidad;

    const es = (lista) => lista.includes(uFrase);

    if (unidadFrase) {
      // Convertir a presentaciones en base a unidad del insumo
      if (es(unidadesKg) && uInsumo === "g") {
        presentaciones = (cantidad * 1000) / cantPres;
      } else if (es(unidadesG) && uInsumo === "g") {
        presentaciones = cantidad / cantPres;
      } else if (es(unidadesL) && uInsumo === "ml") {
        presentaciones = (cantidad * 1000) / cantPres;
      } else if (es(unidadesMl) && uInsumo === "ml") {
        presentaciones = cantidad / cantPres;
      } else if (es(unidadesU) && uInsumo === "u") {
        presentaciones = cantidad / cantPres;
      } else {
        // Unidad no compatible: usar cantidad como número de presentaciones
        presentaciones = cantidad;
      }
    }

    if (!Number.isFinite(presentaciones) || presentaciones <= 0) continue;

    resultado.push({
      insumo,
      presentaciones,
      precioPresentacion:
        precioPresentacion != null
          ? precioPresentacion
          : typeof insumo.precio === "number"
          ? insumo.precio
          : Number(insumo.precio) || 0,
    });
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

/** Normaliza gastos fijos a valores diarios y semanales */
function calcularGastosFijosNormalizados(gastos) {
  let dia = 0;
  let semana = 0;
  for (const g of gastos || []) {
    if (g.activo === false) continue;
    const monto = Number(g.monto) || 0;
    if (!monto) continue;
    const freq = (g.frecuencia || "").toLowerCase();
    if (freq === "diario") {
      dia += monto;
      semana += monto * 7;
    } else if (freq === "semanal") {
      semana += monto;
      dia += monto / 7;
    } else if (freq === "mensual") {
      const porDia = monto / 30; // aproximación simple
      dia += porDia;
      semana += porDia * 7;
    }
  }
  return { dia, semana };
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

/** Agrupa pedidos futuros por pedido_id y resume totales */
function agruparPedidos(pedidos) {
  if (!pedidos || pedidos.length === 0) return [];
  const porPedido = {};
  for (const p of pedidos) {
    if (!p) continue;
    const pid = p.pedido_id || p.id;
    if (!pid) continue;
    if (!porPedido[pid]) porPedido[pid] = [];
    porPedido[pid].push(p);
  }
  const grupos = Object.entries(porPedido).map(([pid, items]) => {
    const agregados = agregarItemsPorReceta(items);
    const base = items[0] || {};
    const total = items.reduce(
      (s, i) => s + (i.precio_unitario || 0) * (i.cantidad || 0),
      0
    );
    const senia = base.senia || 0;
    return {
      key: pid,
      items: agregados.length > 0 ? agregados : items,
      rawItems: items,
      total,
      senia,
      estado: base.estado || "pendiente",
      fecha_entrega: base.fecha_entrega || null,
      cliente_id: base.cliente_id,
    };
  });
  return grupos.sort((a, b) => {
    const aDate = a.fecha_entrega || "";
    const bDate = b.fecha_entrega || "";
    return aDate.localeCompare(bDate);
  });
}

/** Calcula promedio diario de ventas y días de stock restante por receta usando una ventana de N días. */
function calcularMetricasVentasYStock(recetas, ventas, stock, diasVentana = METRICAS_VENTANA_DIAS) {
  if (!recetas?.length || !ventas?.length || diasVentana <= 0) return {};
  const hoy = new Date();
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  const cantidadesPorReceta = {};

  for (const v of ventas) {
    if (!v || v.receta_id == null || !v.fecha) continue;
    const fechaVenta = new Date(v.fecha);
    if (Number.isNaN(fechaVenta.getTime())) continue;
    const diffDias = (hoy - fechaVenta) / MS_POR_DIA;
    if (diffDias < 0 || diffDias >= diasVentana) continue;
    const rid = v.receta_id;
    cantidadesPorReceta[rid] = (cantidadesPorReceta[rid] || 0) + (Number(v.cantidad) || 0);
  }

  const resultado = {};
  for (const r of recetas) {
    const totalVentana = cantidadesPorReceta[r.id] || 0;
    const promedioDiario = totalVentana / diasVentana;
    const stockActual = (stock || {})[r.id] ?? 0;
    const stockClamped = Math.max(0, stockActual);
    const diasRestantes = promedioDiario > 0 ? stockClamped / promedioDiario : null;
    resultado[r.id] = { promedioDiario, diasRestantes, totalVentana, stockActual };
  }
  return resultado;
}

function formatearDiasStock(d) {
  if (d == null) return "—";
  if (d < 0.5) return "<0.5";
  if (Math.abs(d - 1) < 0.01) return "1";
  return d.toFixed(1);
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

// ── MÁS (menú secundario) ────────────────────────────────────────────────────
function MoreMenuScreen({ items, onNavigate }) {
  return (
    <div className="content">
      <p className="page-title">Más</p>
      <p className="page-subtitle">Acceso rápido al resto de la app</p>
      <div className="dashboard-quick-grid">
        {items.map(({ id, icon, label, sub }) => (
          <button
            key={id}
            type="button"
            className="dashboard-quick"
            onClick={() => onNavigate?.(id)}
          >
            <span className="dashboard-quick-icon">{icon}</span>
            <div className="dashboard-quick-text">
              <span className="dashboard-quick-label">{label}</span>
              <span className="dashboard-quick-sub">{sub}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ insumos, recetas, ventas, clientes, stock, pedidos, resumenPlanSemanal, onNavigate }) {
  const hoyStr = hoyLocalISO();
  const hoyDate = new Date(hoyStr);
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  const ventasHoy = ventas.filter(v => v.fecha === hoyStr);
  const ingresoHoy = ventasHoy.reduce(
    (s, v) =>
      s +
      (v.total_final != null
        ? v.total_final
        : (v.precio_unitario || 0) * (v.cantidad || 0)),
    0
  );
  const unidadesHoy = ventasHoy.reduce((s, v) => s + v.cantidad, 0);
  const stockBajo = recetas.filter(r => ((stock || {})[r.id] ?? 0) <= 0);
  const recetasMargenBajo = (recetas || []).filter((r) => {
    const precio = Number(r.precio_venta) || 0;
    const costoUnit = typeof r.costo_unitario === "number" ? Number(r.costo_unitario) : null;
    if (!precio || costoUnit == null || !isFinite(costoUnit)) return false;
    const margenVal = (precio - costoUnit) / precio;
    return margenVal < 0.5;
  });
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

  const metricasStock = calcularMetricasVentasYStock(recetas, ventas, stock, METRICAS_VENTANA_DIAS);
  const alertaRoja = recetas.filter((r) => {
    const m = metricasStock[r.id];
    return m && m.diasRestantes != null && m.diasRestantes < DIAS_ALERTA_ROJA;
  });
  const alertaAmarilla = recetas.filter((r) => {
    const m = metricasStock[r.id];
    return m && m.diasRestantes != null && m.diasRestantes >= DIAS_ALERTA_ROJA && m.diasRestantes < DIAS_ALERTA_AMARILLA;
  });

  const pedidosList = pedidos || [];
  const pedidosConFecha = pedidosList.filter((p) => p && p.fecha_entrega);
  const pedidosNormalizados = pedidosConFecha
    .map((p) => {
      try {
        const fechaDate = new Date(p.fecha_entrega);
        if (Number.isNaN(fechaDate.getTime())) return null;
        return { ...p, _fechaDate: fechaDate };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const pedidosProximos = pedidosNormalizados.filter((p) => {
    if (p.estado === "entregado") return false;
    const diffDias = Math.floor((p._fechaDate.getTime() - hoyDate.getTime()) / MS_POR_DIA);
    return diffDias >= 0 && diffDias <= 2; // hoy y próximos 2 días
  });

  const pedidosAgrupadosProximos = agruparPedidos(pedidosProximos);

  const pedidosPorDia = { 0: 0, 1: 0, 2: 0 };
  for (const p of pedidosProximos) {
    const diffDias = Math.floor((p._fechaDate.getTime() - hoyDate.getTime()) / MS_POR_DIA);
    if (diffDias >= 0 && diffDias <= 2) {
      pedidosPorDia[diffDias] = (pedidosPorDia[diffDias] || 0) + 1;
    }
  }
  const pedidosHoyCount = pedidosPorDia[0] || 0;
  const pedidosManianaCountResumen = pedidosPorDia[1] || 0;
  const pedidosPasadoCount = pedidosPorDia[2] || 0;

  const pedidosManiana = pedidosNormalizados.filter((p) => {
    if (p.estado === "entregado") return false;
    const diffDias = Math.floor((p._fechaDate.getTime() - hoyDate.getTime()) / MS_POR_DIA);
    return diffDias === 1;
  });

  const pedidosManianaPorReceta = {};
  for (const p of pedidosManiana) {
    const rid = p.receta_id;
    if (rid == null) continue;
    pedidosManianaPorReceta[rid] = (pedidosManianaPorReceta[rid] || 0) + (p.cantidad || 0);
  }

  const alertasPedidosManiana = recetas.filter((r) => {
    const pedidosCant = pedidosManianaPorReceta[r.id] || 0;
    if (!pedidosCant) return false;
    const stockActual = (stock || {})[r.id] ?? 0;
    return stockActual < pedidosCant;
  });

  const clientesConDeudaSet = new Set(
    (ventas || [])
      .filter((v) => v.estado_pago === "debe" && v.cliente_id != null)
      .map((v) => v.cliente_id)
  );
  const clientesConDeudaCount = clientesConDeudaSet.size;

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
        {resumenPlanSemanal && (
          <div className="dashboard-metric-plan" style={{ marginTop: 12, fontSize: 13 }}>
            <div className="dashboard-metric-label" style={{ marginBottom: 4 }}>
              Plan de producción semanal
            </div>
            <div>
              {resumenPlanSemanal.totalUnidades > 0 ? (
                <>
                  Esta semana producís <strong>{resumenPlanSemanal.totalUnidades}</strong> u, necesitás comprar{" "}
                  <strong>{fmt(resumenPlanSemanal.totalCompra || 0)}</strong> en insumos.
                </>
              ) : (
                "Todavía no cargaste un plan de producción para esta semana."
              )}
            </div>
          </div>
        )}
      </div>

      {(pedidosHoyCount > 0 || pedidosManianaCountResumen > 0 || stockBajo.length > 0 || clientesConDeudaCount > 0) && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Pendientes de hoy</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            {pedidosHoyCount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>📦 Pedidos para hoy: <strong>{pedidosHoyCount}</strong></span>
                <button
                  type="button"
                  className="card-link"
                  onClick={() => onNavigate?.("plan")}
                >
                  Ver pedidos →
                </button>
              </div>
            )}
            {pedidosManianaCountResumen > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>📆 Pedidos para mañana: <strong>{pedidosManianaCountResumen}</strong></span>
                <button
                  type="button"
                  className="card-link"
                  onClick={() => onNavigate?.("plan")}
                >
                  Ver pedidos →
                </button>
              </div>
            )}
            {stockBajo.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>🥐 Productos sin stock: <strong>{stockBajo.length}</strong></span>
                <button
                  type="button"
                  className="card-link"
                  onClick={() => onNavigate?.("stock")}
                >
                  Ir a Stock →
                </button>
              </div>
            )}
            {clientesConDeudaCount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>💸 Clientes con deuda: <strong>{clientesConDeudaCount}</strong></span>
                <button
                  type="button"
                  className="card-link"
                  onClick={() => onNavigate?.("ventas")}
                >
                  Ver deudas →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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

      {recetasMargenBajo.length > 0 && (
        <div className="card dashboard-alert" onClick={() => onNavigate?.("recetas")}>
          <div className="card-header">
            <span className="card-title">⚠️ Margen bajo</span>
            <span className="card-link" style={{ cursor: "pointer" }}>Ver recetas →</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {recetasMargenBajo.slice(0, 6).map(r => {
              const precio = Number(r.precio_venta) || 0;
              const costoUnit = typeof r.costo_unitario === "number" ? Number(r.costo_unitario) : null;
              const margenVal = precio && costoUnit != null ? (precio - costoUnit) / precio : null;
              const margenTxt = margenVal != null ? pctFmt(margenVal) : "—";
              return (
                <span
                  key={r.id}
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    background: "var(--surface)",
                    borderRadius: 20,
                    border: "1px solid var(--border)"
                  }}
                >
                  {r.emoji || "🍞"} {r.nombre} · {margenTxt}
                </span>
              );
            })}
            {recetasMargenBajo.length > 6 && (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>+{recetasMargenBajo.length - 6} más</span>
            )}
          </div>
        </div>
      )}

      {(alertaRoja.length > 0 || alertaAmarilla.length > 0) && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Alertas de stock por ventas (últimos {METRICAS_VENTANA_DIAS} días)</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {alertaRoja.slice(0, 5).map((r) => {
              const m = metricasStock[r.id];
              const diasTxt = formatearDiasStock(m?.diasRestantes);
              return (
                <div
                  key={r.id}
                  style={{
                    fontSize: 13,
                    color: "var(--danger)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <span>⚠️ {r.nombre}: stock para {diasTxt} día{diasTxt === "1" ? "" : "s"}</span>
                  <button
                    type="button"
                    className="card-link"
                    onClick={() => onNavigate?.("stock")}
                  >
                    Ver
                  </button>
                </div>
              );
            })}
            {alertaAmarilla.slice(0, 5).map((r) => {
              const m = metricasStock[r.id];
              const diasTxt = formatearDiasStock(m?.diasRestantes);
              return (
                <div
                  key={r.id}
                  style={{
                    fontSize: 13,
                    color: "#C48F00",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <span>🟡 {r.nombre}: stock para {diasTxt} día{diasTxt === "1" ? "" : "s"}</span>
                  <button
                    type="button"
                    className="card-link"
                    onClick={() => onNavigate?.("stock")}
                  >
                    Ver
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pedidosAgrupadosProximos.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Pedidos próximos 3 días</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "0 16px 8px", fontSize: 12, color: "var(--text-muted)" }}>
            <div>
              <div style={{ fontWeight: 600 }}>Hoy</div>
              <div>{pedidosHoyCount} pedido(s)</div>
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Mañana</div>
              <div>{pedidosManianaCountResumen} pedido(s)</div>
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Pasado</div>
              <div>{pedidosPasadoCount} pedido(s)</div>
            </div>
          </div>
          <div>
            {pedidosAgrupadosProximos.slice(0, 5).map((grupo) => {
              const cliente = (clientes || []).find((c) => c.id === grupo.cliente_id);
              let fechaLabel = grupo.fecha_entrega || "";
              try {
                if (grupo.fecha_entrega) {
                  fechaLabel = new Date(grupo.fecha_entrega).toLocaleDateString("es-AR");
                }
              } catch {
                // ignore
              }
              const unidades = (grupo.items || []).reduce(
                (s, it) => s + (it.cantidad || 0),
                0
              );
              const estado = grupo.estado || "pendiente";
              const estadoLabel =
                estado === "en_preparacion"
                  ? "En preparación"
                  : estado === "listo"
                  ? "Listo"
                  : estado === "entregado"
                  ? "Entregado"
                  : "Pendiente";
              return (
                <div
                  key={grupo.key}
                  className="venta-item venta-item-simple"
                  style={{ padding: "10px 16px" }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>
                      {fechaLabel} · {cliente?.nombre || "Cliente sin nombre"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {unidades} u · {estadoLabel}
                    </div>
                  </div>
                </div>
              );
            })}
            {pedidosAgrupadosProximos.length > 5 && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", padding: "0 16px 8px" }}>
                +{pedidosAgrupadosProximos.length - 5} pedido(s) más
              </p>
            )}
          </div>
        </div>
      )}

      {pedidosAgrupadosProximos.length === 0 && pedidosList.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Pedidos próximos 3 días</span>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              padding: "12px 16px",
            }}
          >
            No hay pedidos para los próximos 3 días.
          </p>
        </div>
      )}

      {alertasPedidosManiana.length > 0 && (
        <div className="card dashboard-alert" onClick={() => onNavigate?.("stock")}>
          <div className="card-header">
            <span className="card-title">⚠️ Pedidos de mañana sin stock</span>
            <span className="card-link" style={{ cursor: "pointer" }}>Ver en Stock →</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {alertasPedidosManiana.slice(0, 6).map((r) => {
              const pedidosCant = pedidosManianaPorReceta[r.id] || 0;
              const stockActual = (stock || {})[r.id] ?? 0;
              return (
                <span
                  key={r.id}
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    background: "var(--surface)",
                    borderRadius: 20,
                    border: "1px solid var(--border)"
                  }}
                >
                  {(r.emoji || "🥐")} {r.nombre} · pedidos {pedidosCant} · stock {stockActual}
                </span>
              );
            })}
            {alertasPedidosManiana.length > 6 && (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                +{alertasPedidosManiana.length - 6} más
              </span>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><span className="card-title">Accesos rápidos</span></div>
        <div className="dashboard-quick-grid">
          <QuickAction icon="💰" label="Registrar venta" sub="Manual o por voz" tab="ventas" />
          <QuickAction icon="📥" label="Cargar stock" sub={stockBajo.length > 0 ? `${stockBajo.length} sin stock` : "Por voz o manual"} tab="stock" alert={stockBajo.length > 0 ? stockBajo.length : null} />
          <QuickAction icon="📆" label="Plan y pedidos" sub="Semana y pedidos futuros" tab="plan" />
          <QuickAction icon="👥" label="Clientes" sub={`${clientes?.length || 0} registrados`} tab="clientes" />
          <QuickAction icon="📦" label="Insumos" sub={`${insumos?.length || 0} productos`} tab="insumos" />
          <QuickAction
            icon="📋"
            label="Recetas"
            sub={`${recetas?.length || 0} recetas`}
            tab="recetas"
            alert={recetasMargenBajo.length > 0 ? recetasMargenBajo.length : null}
          />
        </div>
      </div>

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
function Insumos({
  insumos,
  insumoStock,
  insumoMovimientos,
  insumoComposicion,
  registrarMovimientoInsumo,
  recetas,
  recetaIngredientes,
  onRefresh,
  showToast,
  confirm,
  onVerRecetasAfectadas,
  precioHistorial
}) {
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
  const [compraScreenOpen, setCompraScreenOpen] = useState(false);
  const [compraCart, setCompraCart] = useState([]);
  const [compraSaving, setCompraSaving] = useState(false);
  const [precioDecisionModal, setPrecioDecisionModal] = useState(null);
  const [compraResultado, setCompraResultado] = useState(null);
  const [compraListening, setCompraListening] = useState(false);
  const [compraTranscript, setCompraTranscript] = useState("");
  const compraRecRef = useRef(null);
  const compraTranscriptRef = useRef("");

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

  const agregarAlCarritoCompra = (insumo) => {
    if (!insumo) return;
    setCompraCart((prev) => {
      const idx = prev.findIndex((it) => it.insumo.id === insumo.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], presentaciones: copy[idx].presentaciones + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          insumo,
          presentaciones: 1,
          precioPresentacion: typeof insumo.precio === "number" ? insumo.precio : Number(insumo.precio) || 0,
          precioOriginal: typeof insumo.precio === "number" ? insumo.precio : Number(insumo.precio) || 0
        }
      ];
    });
  };

  const actualizarCantidadCarrito = (insumoId, delta) => {
    setCompraCart((prev) =>
      prev
        .map((item) =>
          item.insumo.id === insumoId
            ? { ...item, presentaciones: Math.max(1, (item.presentaciones || 1) + delta) }
            : item
        )
        .filter((item) => (item.presentaciones || 0) > 0)
    );
  };

  const eliminarDeCarritoCompra = (insumoId) => {
    setCompraCart((prev) => prev.filter((item) => item.insumo.id !== insumoId));
  };

  const actualizarPrecioCarrito = (insumoId, value) => {
    const text = String(value).trim();
    if (text === "") {
      setCompraCart((prev) =>
        prev.map((item) =>
          item.insumo.id === insumoId ? { ...item, precioPresentacion: "" } : item
        )
      );
      return;
    }
    const num = parseFloat(text.replace(",", "."));
    if (Number.isNaN(num) || num < 0) return;
    setCompraCart((prev) =>
      prev.map((item) =>
        item.insumo.id === insumoId ? { ...item, precioPresentacion: num } : item
      )
    );
  };

  const totalCompra = compraCart.reduce((s, item) => {
    const precio =
      typeof item.precioPresentacion === "number"
        ? item.precioPresentacion
        : Number(item.precioPresentacion) || 0;
    return s + precio * (item.presentaciones || 0);
  }, 0);

  const construirDecisionesPrecio = () => {
    if (!compraCart.length) return null;
    const items = [];
    const originalPrices = {};
    for (const item of compraCart) {
      const ins = item.insumo;
      const anterior = Number(ins.precio) || 0;
      const nuevoValRaw =
        typeof item.precioPresentacion === "number"
          ? item.precioPresentacion
          : Number(item.precioPresentacion) || 0;
      originalPrices[ins.id] = anterior;
      if (!anterior || !nuevoValRaw) continue;
      const diffAbs = Math.abs(nuevoValRaw - anterior);
      if (diffAbs < 0.01) continue;
      const diffPct = anterior ? (nuevoValRaw - anterior) / anterior : null;
      items.push({
        insumoId: ins.id,
        nombre: ins.nombre,
        precioAnterior: anterior,
        precioNuevo: nuevoValRaw,
        diffPct,
        accion: "update"
      });
    }
    if (!items.length) return null;
    return {
      items,
      originalPrices,
      applyToAll: false
    };
  };

  const registrarCompraSoloStock = async () => {
    if (!compraCart.length) return;
    setCompraSaving(true);
    try {
      for (const item of compraCart) {
        const ins = item.insumo;
        const presentaciones = item.presentaciones || 0;
        if (!ins.id || presentaciones <= 0) continue;
        const unidadCantidad = Number(ins.cantidad_presentacion) || 1;
        const cantidadTotal = presentaciones * unidadCantidad;
        const precio =
          typeof item.precioPresentacion === "number"
            ? item.precioPresentacion
            : Number(item.precioPresentacion) || 0;
        const valorMovimiento = precio > 0 ? precio * presentaciones : null;
        await registrarMovimientoInsumo(ins.id, "ingreso", cantidadTotal, valorMovimiento);
      }
      showToast("✅ Compra de stock registrada");
      setCompraCart([]);
      setCompraScreenOpen(false);
      onRefresh();
    } catch (err) {
      reportError(err, { action: "registrarCompraStock" });
      showToast("⚠️ Error al registrar compra");
    } finally {
      setCompraSaving(false);
    }
  };

  const confirmarCompra = async () => {
    if (!compraCart.length || compraSaving) return;
    const tienePrecioInvalido = compraCart.some((item) => {
      const precio =
        typeof item.precioPresentacion === "number"
          ? item.precioPresentacion
          : Number(item.precioPresentacion) || 0;
      return precio <= 0;
    });
    if (tienePrecioInvalido) {
      showToast("⚠️ Completá el precio de todos los insumos (mayor a 0)");
      return;
    }
    const decisiones = construirDecisionesPrecio();
    if (!decisiones) {
      await registrarCompraSoloStock();
      return;
    }
    setPrecioDecisionModal(decisiones);
  };

  const aplicarDecisionesPrecio = async () => {
    if (!precioDecisionModal || !compraCart.length) return;
    const { items } = precioDecisionModal;
    const cambiosAplicar = items.filter((it) => it.accion === "update");
    if (!cambiosAplicar.length) {
      await registrarCompraSoloStock();
      setPrecioDecisionModal(null);
      return;
    }
    setCompraSaving(true);
    try {
      // 1) Registrar movimientos de stock (ingresos)
      for (const item of compraCart) {
        const ins = item.insumo;
        const presentaciones = item.presentaciones || 0;
        if (!ins.id || presentaciones <= 0) continue;
        const unidadCantidad = Number(ins.cantidad_presentacion) || 1;
        const cantidadTotal = presentaciones * unidadCantidad;
        const precio =
          typeof item.precioPresentacion === "number"
            ? item.precioPresentacion
            : Number(item.precioPresentacion) || 0;
        const valorMovimiento = precio > 0 ? precio * presentaciones : null;
        await registrarMovimientoInsumo(ins.id, "ingreso", cantidadTotal, valorMovimiento);
      }

      // 2) Actualizar precios de insumos
      const preciosOriginales = {};
      const preciosNuevos = {};
      for (const cambio of cambiosAplicar) {
        preciosOriginales[cambio.insumoId] = cambio.precioAnterior;
        preciosNuevos[cambio.insumoId] = cambio.precioNuevo;
        const { error } = await supabase
          .from("insumos")
          .update({ precio: cambio.precioNuevo })
          .eq("id", cambio.insumoId);
        if (error) throw error;
        try {
          await supabase.from("precio_historial").insert({
            insumo_id: cambio.insumoId,
            precio_anterior: cambio.precioAnterior,
            precio_nuevo: cambio.precioNuevo,
            motivo: "compra_stock"
          });
        } catch (err) {
          reportError(err, { action: "precioHistorialCompraStock", insumo_id: cambio.insumoId });
        }
      }

      // 3) Recalcular costos y márgenes de recetas afectadas
      const recetasPorId = Object.fromEntries((recetas || []).map((r) => [r.id, r]));
      const recetasAfectadasIds = new Set();
      for (const cambio of cambiosAplicar) {
        const recsIds = (recetaIngredientes || [])
          .filter((ri) => ri.insumo_id === cambio.insumoId)
          .map((ri) => ri.receta_id);
        for (const id of recsIds) {
          if (id) recetasAfectadasIds.add(id);
        }
      }

      const insumosById = Object.fromEntries((insumos || []).map((i) => [i.id, i]));
      const insumosBefore = Object.values(insumosById).map((i) => ({
        ...i,
        precio: preciosOriginales[i.id] != null ? preciosOriginales[i.id] : i.precio
      }));
      const insumosAfter = Object.values(insumosById).map((i) => ({
        ...i,
        precio: preciosNuevos[i.id] != null ? preciosNuevos[i.id] : i.precio
      }));

      const recetasAfectadas = [];
      for (const recId of recetasAfectadasIds) {
        const receta = recetasPorId[recId];
        if (!receta) continue;
        const rindeNum = Number(receta.rinde) || 1;
        const costoAntes = costoReceta(recId, recetaIngredientes || [], insumosBefore);
        const costoDespues = costoReceta(recId, recetaIngredientes || [], insumosAfter);
        const costoUnitAntes = rindeNum > 0 ? costoAntes / rindeNum : 0;
        const costoUnitDespues = rindeNum > 0 ? costoDespues / rindeNum : 0;
        const precioVenta = Number(receta.precio_venta) || 0;
        const margenAntes =
          precioVenta > 0 ? (precioVenta - costoUnitAntes) / precioVenta : null;
        const margenDespues =
          precioVenta > 0 ? (precioVenta - costoUnitDespues) / precioVenta : null;

        // Guardar nuevos costos en DB
        const { error } = await supabase
          .from("recetas")
          .update({ costo_lote: costoDespues, costo_unitario: costoUnitDespues })
          .eq("id", recId);
        if (error) throw error;

        recetasAfectadas.push({
          id: recId,
          nombre: receta.nombre,
          emoji: receta.emoji || "🍞",
          margenAntes,
          margenDespues
        });
      }

      setCompraResultado({
        preciosActualizados: cambiosAplicar.length,
        recetasAfectadas
      });
      showToast("✅ Compra registrada y costos actualizados");
      setPrecioDecisionModal(null);
      setCompraCart([]);
      onRefresh();
    } catch (err) {
      reportError(err, { action: "actualizarPreciosPorCompra" });
      showToast("⚠️ Error al actualizar precios y costos");
    } finally {
      setCompraSaving(false);
    }
  };

  const iniciarRecCompra = () => {
    if (compraListening) return;
    const API =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!API) {
      showToast("⚠️ Tu navegador no soporta reconocimiento de voz");
      return;
    }
    setCompraTranscript("");
    compraTranscriptRef.current = "";
    try {
      const rec = new API();
      compraRecRef.current = rec;
      rec.lang = "es-AR";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) {
            compraTranscriptRef.current +=
              (compraTranscriptRef.current ? " " : "") + res[0].transcript;
            setCompraTranscript(compraTranscriptRef.current);
          }
        }
      };
      rec.onend = () => {
        setCompraListening(false);
        compraRecRef.current = null;
        const texto = compraTranscriptRef.current;
        if (!texto) return;
        const items = parsearVozAComprasInsumos(texto, insumos);
        if (!items.length) {
          showToast("No se detectaron insumos. Probá con nombres más específicos.");
          return;
        }
        setCompraCart((prev) => {
          const merged = [...prev];
          for (const it of items) {
            const ins = it.insumo;
            const idx = merged.findIndex((m) => m.insumo.id === ins.id);
            if (idx >= 0) {
              const base = merged[idx];
              const presBase = base.presentaciones || 0;
              merged[idx] = {
                ...base,
                presentaciones: presBase + (it.presentaciones || 0),
                precioPresentacion:
                  it.precioPresentacion != null
                    ? it.precioPresentacion
                    : base.precioPresentacion,
              };
            } else {
              merged.push({
                insumo: ins,
                presentaciones: it.presentaciones || 1,
                precioPresentacion:
                  it.precioPresentacion != null
                    ? it.precioPresentacion
                    : typeof ins.precio === "number"
                    ? ins.precio
                    : Number(ins.precio) || 0,
                precioOriginal:
                  typeof ins.precio === "number"
                    ? ins.precio
                    : Number(ins.precio) || 0,
              });
            }
          }
          return merged;
        });
        showToast(`✅ Compra por voz: ${items.length} insumo(s) agregados`);
      };
      rec.start();
      setCompraListening(true);
    } catch {
      setCompraListening(false);
      compraRecRef.current = null;
      showToast("⚠️ No se pudo iniciar el reconocimiento de voz");
    }
  };

  const detenerRecCompra = () => {
    try {
      compraRecRef.current?.abort?.();
    } catch {
      // ignore
    }
    try {
      compraRecRef.current?.stop?.();
    } catch {
      // ignore
    }
    compraRecRef.current = null;
    setCompraListening(false);
  };

  const save = async () => {
    const precio = parseFloat(form.precio);
    const cantidad_presentacion = parseFloat(form.cantidad_presentacion) || 0;
    if (isNaN(precio) || precio <= 0) {
      showToast("⚠️ Precio inválido");
      return;
    }
    setSaving(true);
    const data = {
      nombre: form.nombre,
      categoria: form.categoria,
      presentacion: form.presentacion,
      precio,
      cantidad_presentacion,
      unidad: form.unidad
    };
    const isUpdate = Boolean(editando);
    const precioAnterior =
      isUpdate && editando
        ? (typeof editando.precio === "number"
            ? editando.precio
            : Number(editando.precio) || 0)
        : null;
    const { error } = isUpdate
      ? await supabase
          .from("insumos")
          .update(data)
          .eq("id", editando.id)
          .select("id, precio")
      : await supabase
          .from("insumos")
          .insert(data)
          .select("id, precio");
    if (error) {
      showToast("⚠️ Error al guardar");
      setSaving(false);
      return;
    }
    if (isUpdate && precioAnterior != null && Math.abs(precio - precioAnterior) >= 0.01) {
      const insumoId = editando.id;
      try {
        await supabase.from("precio_historial").insert({
          insumo_id: insumoId,
          precio_anterior: precioAnterior,
          precio_nuevo: precio,
          motivo: "edicion_manual"
        });
      } catch (err) {
        reportError(err, { action: "precioHistorialEdicionManual", insumo_id: insumoId });
      }
    }
    showToast(isUpdate ? "✅ Precio actualizado" : "✅ Insumo agregado");
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

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <span className="card-title">Compras de stock</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>
          Registrá en un solo paso lo que compraste y cuánto pagaste. Ideal cuando volvés del súper.
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setCompraScreenOpen(true);
          }}
        >
          📥 Registrar compra de stock
        </button>
      </div>

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

      {compraScreenOpen && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => {
                if (compraSaving) return;
                setCompraScreenOpen(false);
              }}
              disabled={compraSaving}
            >
              ← Volver
            </button>
            <span className="screen-title">Registrar compra de stock</span>
          </div>
          <div className="screen-content">
            <div className="voice-row" style={{ marginBottom: 16 }}>
              <div className="voice-area">
                <div className="voice-icon">🎤</div>
                <div className="voice-text" style={{ marginBottom: 8 }}>
                  Dictá por ejemplo: "compré 2kg de harina de almendras a 43000 pesos y 500g de levadura".
                </div>
                <button
                  type="button"
                  className={`voice-btn ${compraListening ? "listening" : ""}`}
                  onClick={compraListening ? detenerRecCompra : iniciarRecCompra}
                  disabled={compraSaving}
                  style={{ marginBottom: 8 }}
                >
                  {compraListening ? "Detener" : "Hablar"}
                </button>
                {compraTranscript && (
                  <p className="voice-transcript">“{compraTranscript}”</p>
                )}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">Carrito de compra</span>
              </div>
              {compraCart.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Tocá un insumo de la lista de abajo para agregarlo al carrito.
                </p>
              ) : (
                <>
                  {compraCart.map((item) => {
                    const ins = item.insumo;
                    const unidad = ins.unidad || "g";
                    const cantPorPres = Number(ins.cantidad_presentacion) || 1;
                    const cantidadTotal = (item.presentaciones || 0) * cantPorPres;
                    const precio =
                      typeof item.precioPresentacion === "number"
                        ? item.precioPresentacion
                        : Number(item.precioPresentacion) || 0;
                    const subtotal = precio * (item.presentaciones || 0);
                    const precioOriginal =
                      typeof ins.precio === "number" ? ins.precio : Number(ins.precio) || 0;
                    const cambioPrecio =
                      precioOriginal > 0 && Math.abs(precio - precioOriginal) >= 0.01;
                    const diffPct =
                      cambioPrecio && precioOriginal
                        ? (precio - precioOriginal) / precioOriginal
                        : null;
                    return (
                      <div
                        key={ins.id}
                        className="insumo-item"
                        style={{ alignItems: "flex-start", padding: "10px 0" }}
                      >
                        <div className="insumo-info" style={{ flex: 1 }}>
                          <div className="insumo-nombre">{ins.nombre}</div>
                          <div className="insumo-detalle" style={{ marginTop: 4 }}>
                            Cantidad:{" "}
                            <strong>
                              {cantidadTotal} {unidad}
                            </strong>{" "}
                            ({item.presentaciones || 0} × {cantPorPres} {unidad})
                          </div>
                          <div className="insumo-detalle" style={{ marginTop: 4 }}>
                            Precio por presentación:{" "}
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.precioPresentacion}
                              onChange={(e) => actualizarPrecioCarrito(ins.id, e.target.value)}
                              style={{
                                width: 110,
                                padding: "6px 8px",
                                borderRadius: 8,
                                border: "1px solid var(--border)",
                                fontSize: 13
                              }}
                            />{" "}
                            {cambioPrecio && (
                              <span style={{ fontSize: 11, color: "var(--danger)", marginLeft: 4 }}>
                                antes {fmt(precioOriginal)}
                                {diffPct != null && ` · ${pctFmt(diffPct)}`}
                              </span>
                            )}
                          </div>
                          <div className="insumo-detalle" style={{ marginTop: 4 }}>
                            Subtotal: <strong>{fmt(subtotal || 0)}</strong>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 6
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => actualizarCantidadCarrito(ins.id, -1)}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                border: "1px solid var(--border)",
                                background: "var(--cream)",
                                cursor: "pointer"
                              }}
                              disabled={compraSaving}
                            >
                              −
                            </button>
                            <span style={{ minWidth: 20, textAlign: "center", fontSize: 14 }}>
                              {item.presentaciones || 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => actualizarCantidadCarrito(ins.id, 1)}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                border: "1px solid var(--border)",
                                background: "var(--cream)",
                                cursor: "pointer"
                              }}
                              disabled={compraSaving}
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => eliminarDeCarritoCompra(ins.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--danger)",
                              fontSize: 18,
                              cursor: "pointer"
                            }}
                            disabled={compraSaving}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 12,
                      borderTop: "1px dashed var(--border)",
                      paddingTop: 8
                    }}
                  >
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      Total de la compra
                    </span>
                    <span
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: 18,
                        fontWeight: 600
                      }}
                    >
                      {fmt(totalCompra)}
                    </span>
                  </div>
                  <button
                    className="btn-primary"
                    style={{ marginTop: 12 }}
                    onClick={confirmarCompra}
                    disabled={compraSaving || compraCart.length === 0}
                  >
                    {compraSaving ? "Guardando…" : "✓ Registrar compra"}
                  </button>
                </>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">Insumos</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                Tocá un insumo para agregar 1 presentación al carrito.
              </p>
              {filtrados.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">📦</div>
                  <p>Sin resultados</p>
                </div>
              ) : (
                filtradosOrdenados.map((i) => {
                  const stockActual = (insumoStock || {})[i.id] ?? 0;
                  const unidad = i.unidad || "g";
                  return (
                    <div
                      key={i.id}
                      className="insumo-item"
                      onClick={() => {
                        agregarAlCarritoCompra(i);
                        showToast(`➕ ${i.nombre} agregado al carrito`);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <div
                        className="insumo-dot"
                        style={{ background: CAT_COLORS[i.categoria] || "#ccc" }}
                      />
                      <div className="insumo-info" style={{ flex: 1 }}>
                        <div className="insumo-nombre">{i.nombre}</div>
                        <div className="insumo-detalle">
                          {i.presentacion} · <span className="chip">{precioPorU(i)}</span> · Stock:{" "}
                          {stockActual} {unidad}
                        </div>
                      </div>
                      <div className="insumo-precio" style={{ marginLeft: 8 }}>
                        <div className="insumo-precio-value">{fmt(i.precio)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

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

      {precioDecisionModal && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => setPrecioDecisionModal(null)}
              disabled={compraSaving}
            >
              ← Volver
            </button>
            <span className="screen-title">Precios actualizados</span>
          </div>
          <div className="screen-content">
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
              Algunos insumos tienen un precio distinto al registrado. Elegí qué hacer con
              cada uno:
            </p>
            <div className="card" style={{ marginBottom: 16 }}>
              {(precioDecisionModal.items || []).map((item) => (
                <div
                  key={item.insumoId}
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 13
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.nombre}</div>
                  <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>
                    Precio anterior: <strong>{fmt(item.precioAnterior)}</strong>
                    <br />
                    Precio nuevo: <strong>{fmt(item.precioNuevo)}</strong>
                    {item.diffPct != null && (
                      <>
                        <br />
                        Diferencia:{" "}
                        <strong
                          style={{
                            color: item.diffPct > 0 ? "var(--danger)" : "var(--green)"
                          }}
                        >
                          {pctFmt(item.diffPct)}
                        </strong>
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        fontSize: 12,
                        borderRadius: 10
                      }}
                      onClick={() =>
                        setPrecioDecisionModal((prev) => ({
                          ...prev,
                          items: (prev.items || []).map((it) =>
                            it.insumoId === item.insumoId
                              ? { ...it, accion: "update" }
                              : it
                          )
                        }))
                      }
                      disabled={compraSaving}
                    >
                      ✅ Actualizar precio
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        fontSize: 12,
                        borderRadius: 10
                      }}
                      onClick={() =>
                        setPrecioDecisionModal((prev) => ({
                          ...prev,
                          items: (prev.items || []).map((it) =>
                            it.insumoId === item.insumoId
                              ? { ...it, accion: "keep" }
                              : it
                          )
                        }))
                      }
                      disabled={compraSaving}
                    >
                      🕓 Mantener precio anterior
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="btn-primary"
              onClick={aplicarDecisionesPrecio}
              disabled={compraSaving}
              style={{ marginBottom: 8 }}
            >
              {compraSaving ? "Aplicando…" : "Aplicar y registrar compra"}
            </button>
            <button
              className="btn-secondary"
              onClick={async () => {
                setPrecioDecisionModal(null);
                await registrarCompraSoloStock();
              }}
              disabled={compraSaving}
            >
              Registrar solo el stock
            </button>
          </div>
        </div>
      )}

      {compraResultado && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => setCompraResultado(null)}
            >
              ← Cerrar
            </button>
            <span className="screen-title">Resumen de actualización</span>
          </div>
          <div className="screen-content">
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">
                  Se actualizaron {compraResultado.preciosActualizados} precios
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Estos cambios impactaron en las recetas y sus márgenes:
              </p>
            </div>
            {compraResultado.recetasAfectadas &&
              compraResultado.recetasAfectadas.length > 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-header">
                    <span className="card-title">Recetas afectadas</span>
                  </div>
                  {compraResultado.recetasAfectadas.map((r) => {
                    const margenAntesTxt =
                      r.margenAntes != null ? pctFmt(r.margenAntes) : "—";
                    const margenDespuesTxt =
                      r.margenDespues != null ? pctFmt(r.margenDespues) : "—";
                    const empeoro =
                      r.margenAntes != null &&
                      r.margenDespues != null &&
                      r.margenDespues < r.margenAntes;
                    return (
                      <div
                        key={r.id}
                        className="insumo-item"
                        style={{ padding: "8px 0" }}
                      >
                        <div className="insumo-info" style={{ flex: 1 }}>
                          <div className="insumo-nombre">
                            {r.emoji} {r.nombre}
                          </div>
                          <div className="insumo-detalle">
                            Margen:{" "}
                            <strong>{margenAntesTxt}</strong> →{" "}
                            <strong
                              style={{
                                color: empeoro ? "var(--danger)" : "var(--green)"
                              }}
                            >
                              {margenDespuesTxt}
                            </strong>{" "}
                            {empeoro ? "↓" : "↑"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Revisá si necesitás ajustar precios de venta.
            </p>
            {compraResultado.recetasAfectadas &&
              compraResultado.recetasAfectadas.length > 0 && onVerRecetasAfectadas && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    const ids = compraResultado.recetasAfectadas.map((r) => r.id);
                    onVerRecetasAfectadas(ids);
                    setCompraResultado(null);
                  }}
                  style={{ marginBottom: 8 }}
                >
                  Ver recetas afectadas
                </button>
              )}
            <button
              className="btn-secondary"
              onClick={() => setCompraResultado(null)}
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── RECETAS ──────────────────────────────────────────────────────────────────
function Recetas({ recetas, insumos, recetaIngredientes, showToast, onRefresh, confirm, filterRecetasIds, onClearFilter }) {
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", emoji: "🍞", rinde: "", unidad_rinde: "u", precio_venta: "" });
  const [ingredientes, setIngredientes] = useState([]);

  const aplicaFiltro = Array.isArray(filterRecetasIds) && filterRecetasIds.length > 0;
  const recetasFuente = aplicaFiltro
    ? recetas.filter((r) => filterRecetasIds.includes(r.id))
    : recetas;

  const recetasOrdenadas = [...recetasFuente].slice().sort((a, b) =>
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
      <p className="page-subtitle">
        {recetasFuente.length} recetas cargadas
        {aplicaFiltro && " · filtradas por últimas actualizaciones"}
      </p>
      {aplicaFiltro && onClearFilter && (
        <button
          type="button"
          className="btn-secondary"
          onClick={onClearFilter}
          style={{ marginBottom: 12 }}
        >
          Ver todas las recetas
        </button>
      )}

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
function Stock({ recetas, stock, actualizarStock, consumirInsumosPorStock, insumoStock, insumos, recetaIngredientes, insumoComposicion, registrarMovimientoInsumo, onRefresh, showToast, ventas, pedidos }) {
  const [manualSaving, setManualSaving] = useState(false);
  const [voiceModal, setVoiceModal] = useState(false);
  const [manualScreenOpen, setManualScreenOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedStock, setParsedStock] = useState([]);
  const [savingVoice, setSavingVoice] = useState(false);
  const [insumosEnCeroModal, setInsumosEnCeroModal] = useState(null);
  const recRef = useRef(null);
  const transcriptRef = useRef("");
  const [stockCart, setStockCart] = useState([]);

  const metricasStock = calcularMetricasVentasYStock(recetas, ventas || [], stock, METRICAS_VENTANA_DIAS);

  const pedidosPendientesSemana = {};
  if (pedidos && pedidos.length > 0) {
    const hoy = new Date();
    const diaSemana = hoy.getDay(); // 0 domingo, 1 lunes...
    const diffLunes = (diaSemana + 6) % 7;
    const lunes = new Date(hoy);
    lunes.setHours(0, 0, 0, 0);
    lunes.setDate(hoy.getDate() - diffLunes);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    domingo.setHours(23, 59, 59, 999);
    for (const p of pedidos) {
      if (!p || !p.fecha_entrega || p.estado === "entregado") continue;
      let fecha;
      try {
        fecha = new Date(p.fecha_entrega);
      } catch {
        continue;
      }
      if (Number.isNaN(fecha.getTime())) continue;
      if (fecha < lunes || fecha > domingo) continue;
      const rid = p.receta_id;
      if (rid == null) continue;
      pedidosPendientesSemana[rid] = (pedidosPendientesSemana[rid] || 0) + (p.cantidad || 0);
    }
  }

  const recetasOrdenadasPorStock = [...recetas].slice().sort((a, b) => {
    const sa = (stock || {})[a.id] ?? 0;
    const sb = (stock || {})[b.id] ?? 0;
    if (sa !== sb) return sa - sb;
    return (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });
  });

  const sinStockCount = recetas.filter(
    (r) => ((stock || {})[r.id] ?? 0) <= 0
  ).length;
  const bajo2Count = recetas.filter((r) => {
    const m = metricasStock[r.id];
    return m && m.diasRestantes != null && m.diasRestantes < DIAS_ALERTA_ROJA;
  }).length;
  const pedidosSemanaTotal = Object.values(pedidosPendientesSemana).reduce(
    (s, v) => s + (v || 0),
    0
  );

  const prioridadesProduccion = [...recetas]
    .map((r) => {
      const cant = (stock || {})[r.id] ?? 0;
      const m = metricasStock[r.id];
      const dias = m?.diasRestantes ?? Number.POSITIVE_INFINITY;
      const pedidosSemana = pedidosPendientesSemana[r.id] || 0;
      const faltaPedidos = Math.max(0, pedidosSemana - cant);
      const prioridadScore =
        (cant <= 0 ? 2 : 0) +
        (faltaPedidos > 0 ? 1.5 : 0) +
        (Number.isFinite(dias) ? 1 / (dias + 0.1) : 0);
      return {
        receta: r,
        stockActual: cant,
        metrica: m,
        diasRestantes: dias,
        pedidosSemana,
        faltaPedidos,
        prioridadScore,
      };
    })
    .filter(
      (p) =>
        p.stockActual <= 0 ||
        p.faltaPedidos > 0 ||
        (Number.isFinite(p.diasRestantes) && p.diasRestantes < DIAS_ALERTA_AMARILLA)
    )
    .sort((a, b) => b.prioridadScore - a.prioridadScore)
    .slice(0, 6);

  const addToStockCart = (receta, delta = 1) => {
    if (!receta) return;
    setStockCart((prev) => {
      const idx = prev.findIndex((it) => it.receta.id === receta.id);
      if (idx >= 0) {
        const copy = [...prev];
        const nuevaCant = Math.max(0, (copy[idx].cantidad || 0) + delta);
        if (nuevaCant === 0) {
          copy.splice(idx, 1);
          return copy;
        }
        copy[idx] = { ...copy[idx], cantidad: nuevaCant };
        return copy;
      }
      if (delta <= 0) return prev;
      return [...prev, { receta, cantidad: delta }];
    });
  };

  const totalCartUnidades = stockCart.reduce((s, it) => s + (it.cantidad || 0), 0);
  const iniciarVozStock = () => {
    if (!SpeechRecognitionAPI) {
      showToast("⚠️ Tu navegador no soporta reconocimiento de voz");
      return;
    }
    setTranscript("");
    setParsedStock([]);
    transcriptRef.current = "";
    setVoiceModal(true);
  };

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

  const cargarStockCarrito = async () => {
    if (!stockCart.length) {
      showToast("Agregá productos al carrito para cargar stock.");
      return;
    }
    const items = stockCart.map((it) => ({
      receta: it.receta,
      cantidad: it.cantidad || 0
    })).filter((it) => it.receta && it.cantidad > 0);
    if (!items.length) {
      showToast("No hay cantidades válidas en el carrito.");
      return;
    }
    const insumosEnCero = getInsumosEnCeroParaRecetas(
      items,
      recetaIngredientes,
      insumos,
      insumoComposicion,
      insumoStock
    );
    if (insumosEnCero.length > 0 && registrarMovimientoInsumo) {
      setInsumosEnCeroModal({
        insumos: insumosEnCero,
        cantidades: {},
        pendingOp: { type: "voice", items: items }
      });
      return;
    }
    setManualSaving(true);
    try {
      await ejecutarCargaVoz(items);
      setStockCart([]);
    } catch {
      showToast("⚠️ Error al cargar stock. Probá de nuevo.");
    } finally {
      setManualSaving(false);
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

      <div className="analytics-kpi-grid" style={{ marginBottom: 12 }}>
        <div className="analytics-kpi-card">
          <div className="analytics-kpi-label">Sin stock</div>
          <div className="analytics-kpi-value accent">{sinStockCount}</div>
          <div className="analytics-kpi-sub">productos en 0</div>
        </div>
        <div className="analytics-kpi-card">
          <div className="analytics-kpi-label">Críticos (&lt; {DIAS_ALERTA_ROJA} días)</div>
          <div className="analytics-kpi-value" style={{ color: "var(--danger)" }}>
            {bajo2Count}
          </div>
          <div className="analytics-kpi-sub">según ritmo de ventas</div>
        </div>
        <div className="analytics-kpi-card">
          <div className="analytics-kpi-label">Pedidos semana</div>
          <div className="analytics-kpi-value">{pedidosSemanaTotal}</div>
          <div className="analytics-kpi-sub">unidades pedidas</div>
        </div>
      </div>

      {prioridadesProduccion.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header">
            <span className="card-title">Prioridades de producción</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
            Ordenado por urgencia (sin stock, pedidos y ventas).
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {prioridadesProduccion.map((p) => {
              const { receta: r, stockActual, metrica, diasRestantes, pedidosSemana, faltaPedidos } = p;
              const diasTexto =
                diasRestantes != null && Number.isFinite(diasRestantes)
                  ? formatearDiasStock(diasRestantes)
                  : null;
              const enCarrito = stockCart.find((it) => it.receta.id === r.id);
              return (
                <div
                  key={r.id}
                  className="insumo-item"
                  style={{ alignItems: "center", padding: "6px 0" }}
                >
                  <span style={{ fontSize: 22, marginRight: 8 }}>{r.emoji}</span>
                  <div className="insumo-info" style={{ flex: 1 }}>
                    <div className="insumo-nombre">{r.nombre}</div>
                    <div className="insumo-detalle" style={{ fontSize: 12 }}>
                      {stockActual <= 0 ? "Sin stock" : `Stock: ${stockActual}`}{" "}
                      {metrica && metrica.promedioDiario > 0 && (
                        <>
                          · prom. {metrica.promedioDiario.toFixed(1)} u/día ·{" "}
                          {diasTexto ? `≈ ${diasTexto} días` : "sin estimación"}
                        </>
                      )}
                      {pedidosSemana > 0 && (
                        <> · pedidos semana: {pedidosSemana} u</>
                      )}
                      {faltaPedidos > 0 && (
                        <> · faltan {faltaPedidos} u para cubrir pedidos</>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {enCarrito && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          minWidth: 40,
                          textAlign: "right",
                        }}
                      >
                        +{enCarrito.cantidad} u
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => addToStockCart(r, 1)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid var(--border)",
                        background: "var(--cream)",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      + Carrito
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Todos los productos</span>
        </div>
        {recetasOrdenadasPorStock.map((r) => {
          const cant = stock[r.id] ?? 0;
          const bajo = cant <= 0;
          const metrica = metricasStock[r.id];
          const diasRestantes = metrica?.diasRestantes;
          const diasTexto =
            diasRestantes != null && Number.isFinite(diasRestantes)
              ? formatearDiasStock(diasRestantes)
              : null;
          const sugeridoProducir =
            metrica && metrica.promedioDiario > 0
              ? Math.max(
                  0,
                  Math.ceil(metrica.promedioDiario * DIAS_OBJETIVO_PRODUCCION - cant)
                )
              : null;
          const pedidosSemana = pedidosPendientesSemana[r.id] || 0;
          const enCarrito = stockCart.find((it) => it.receta.id === r.id);
          return (
            <div key={r.id} className="insumo-item">
              <span style={{ fontSize: 22 }}>{r.emoji}</span>
              <div className="insumo-info" style={{ flex: 1 }}>
                <div className="insumo-nombre">{r.nombre}</div>
                <div
                  className="insumo-detalle"
                  style={{ color: bajo ? "var(--danger)" : "var(--text-muted)" }}
                >
                  {bajo ? "Sin stock" : `Stock: ${cant}`}
                  {enCarrito && (
                    <> · en carrito: +{enCarrito.cantidad} u</>
                  )}
                </div>
                {metrica && metrica.promedioDiario > 0 && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    Prom. últimos {METRICAS_VENTANA_DIAS} días:{" "}
                    {metrica.promedioDiario.toFixed(1)} u/día · stock ≈{" "}
                    {diasTexto || "—"} día{diasTexto === "1" ? "" : "s"}
                    {sugeridoProducir > 0 && (
                      <> · sugerido producir: {sugeridoProducir}</>
                    )}
                  </div>
                )}
                {!metrica?.promedioDiario && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    Sin ventas en los últimos {METRICAS_VENTANA_DIAS} días
                  </div>
                )}
                {pedidosSemana > 0 && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    Pedidos semana: {pedidosSemana} u
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => addToStockCart(r, -1)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "1px solid var(--border)",
                    background: "var(--cream)",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                  disabled={manualSaving || !enCarrito}
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => addToStockCart(r, 1)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "1px solid var(--border)",
                    background: "var(--cream)",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                  disabled={manualSaving}
                >
                  +
                </button>
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
            <div style={{ flex: 1, marginLeft: 8 }}>
              <div className="screen-title">Cargar stock</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Carrito de producción</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Total</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, color: "var(--purple-dark)" }}>
                +{totalCartUnidades} u
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={iniciarVozStock}
                >
                  🎙️ Voz
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={cargarStockCarrito}
                  disabled={stockCart.length === 0 || manualSaving}
                >
                  {manualSaving ? "Cargando…" : "✓ Cargar"}
                </button>
              </div>
            </div>
          </div>
          <div className="screen-content">
            <div className="card">
              <div className="card-header"><span className="card-title">Productos</span></div>
              {recetasOrdenadasPorStock.map(r => {
                const cant = stock[r.id] ?? 0;
                const bajo = cant <= 0;
                const itemCart = stockCart.find((it) => it.receta.id === r.id);
                return (
                  <div
                    key={r.id}
                    className="insumo-item"
                    style={{ cursor: "pointer" }}
                  >
                    <span style={{ fontSize: 22 }}>{r.emoji}</span>
                    <div className="insumo-info" style={{ flex: 1 }}>
                      <div className="insumo-nombre">{r.nombre}</div>
                      <div className="insumo-detalle" style={{ color: bajo ? "var(--danger)" : "var(--text-muted)" }}>
                        {bajo ? "Sin stock" : `Stock: ${cant}`}{" "}
                        {itemCart && (
                          <>· En carrito: <strong>+{itemCart.cantidad}</strong></>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => addToStockCart(r, -1)}
                        style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--cream)", cursor: "pointer", fontSize: 16 }}
                        disabled={manualSaving || !itemCart}
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => addToStockCart(r, 1)}
                        style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--cream)", cursor: "pointer", fontSize: 16 }}
                        disabled={manualSaving}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header">
                <span className="card-title">Carrito de stock</span>
              </div>
              {stockCart.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)", padding: "8px 0 4px" }}>
                  Tocá + en los productos para agregarlos al carrito.
                </p>
              ) : (
                <>
                  {stockCart.map((item) => (
                    <div key={item.receta.id} className="insumo-item" style={{ padding: "6px 0" }}>
                      <span style={{ fontSize: 20, marginRight: 8 }}>{item.receta.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div className="insumo-nombre">{item.receta.nombre}</div>
                        <div className="insumo-detalle" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          +{item.cantidad} unidades
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      Total a cargar: <strong>{totalCartUnidades}</strong> u
                    </span>
                    <button
                      type="button"
                      className="card-link"
                      onClick={() => setStockCart([])}
                      disabled={manualSaving}
                    >
                      Vaciar carrito
                    </button>
                  </div>
                  <button
                    className="btn-primary"
                    style={{ marginTop: 12 }}
                    onClick={cargarStockCarrito}
                    disabled={manualSaving || stockCart.length === 0}
                  >
                    {manualSaving ? "Cargando…" : `Cargar carrito (+${totalCartUnidades})`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {!manualScreenOpen && !voiceModal && (
        <button className="fab fab-receta" onClick={() => setManualScreenOpen(true)} title="Cargar stock">
          <span>+</span>
          <span>Cargar stock</span>
        </button>
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

// ── PLAN SEMANAL ──────────────────────────────────────────────────────────────
function PlanSemanal({ recetas, recetaIngredientes, insumos, insumoComposicion, insumoStock, actualizarStock, consumirInsumosPorStock, showToast, onRefresh, onPlanChanged }) {
  const [weekStart, setWeekStart] = useState(() => getSemanaInicioISO());
  const [planRows, setPlanRows] = useState([]);
  const [cartPlanItems, setCartPlanItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const loadingErrorShownRef = useRef(false);
  const weekStartRef = useRef(weekStart);

  useEffect(() => {
    weekStartRef.current = weekStart;
  }, [weekStart]);

  const cargarPlan = useCallback(async (semanaInicio) => {
    setLoading(true);
    const requested = semanaInicio;
    try {
      const { data, error } = await supabase
        .from("plan_semanal")
        .select("id, semana_inicio, receta_id, cantidad_planificada, cantidad_realizada")
        .eq("semana_inicio", semanaInicio);
      if (error) {
        if (!loadingErrorShownRef.current) {
          showToast("⚠️ Error al cargar el plan semanal");
          loadingErrorShownRef.current = true;
        }
        if (weekStartRef.current === requested) {
          setPlanRows([]);
          setCartPlanItems([]);
        }
        return;
      }
      if (weekStartRef.current !== requested) return;
      setPlanRows(data || []);
      const items = (data || [])
        .filter((row) => (row.cantidad_planificada || 0) > 0)
        .map((row) => {
          const receta = recetas.find((r) => r.id === row.receta_id);
          return receta ? { receta, cantidad: Number(row.cantidad_planificada) || 0 } : null;
        })
        .filter(Boolean);
      setCartPlanItems(items);
    } catch {
      if (!loadingErrorShownRef.current) {
        showToast("⚠️ Error al cargar el plan semanal");
        loadingErrorShownRef.current = true;
      }
      if (weekStartRef.current === requested) {
        setPlanRows([]);
        setCartPlanItems([]);
      }
    } finally {
      if (weekStartRef.current === requested) setLoading(false);
    }
  }, [showToast, recetas]);

  useEffect(() => {
    cargarPlan(weekStart);
  }, [weekStart, cargarPlan]);

  const addToPlanCart = (receta, cantidad = 1) => {
    if (!receta) return;
    setCartPlanItems((prev) => {
      const idx = prev.findIndex((it) => it.receta.id === receta.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], cantidad: copy[idx].cantidad + cantidad };
        return copy;
      }
      return [...prev, { receta, cantidad }];
    });
  };

  const updatePlanCartQuantity = (recetaId, delta) => {
    setCartPlanItems((prev) =>
      prev
        .map((item) =>
          item.receta.id === recetaId
            ? { ...item, cantidad: Math.max(0, item.cantidad + delta) }
            : item
        )
        .filter((item) => item.cantidad > 0)
    );
  };

  const removeFromPlanCart = (recetaId) => {
    setCartPlanItems((prev) => prev.filter((item) => item.receta.id !== recetaId));
  };

  const guardarPlan = async () => {
    setSaving(true);
    try {
      const existingByReceta = {};
      for (const pr of planRows || []) {
        if (pr.receta_id && pr.semana_inicio === weekStart) existingByReceta[pr.receta_id] = pr;
      }
      for (const { receta, cantidad } of cartPlanItems) {
        const existente = existingByReceta[receta.id];
        if (existente) {
          if (cantidad <= 0) {
            await supabase.from("plan_semanal").delete().eq("id", existente.id);
          } else {
            await supabase.from("plan_semanal").update({ cantidad_planificada: cantidad }).eq("id", existente.id);
          }
        } else if (cantidad > 0) {
          await supabase.from("plan_semanal").insert({
            semana_inicio: weekStart,
            receta_id: receta.id,
            cantidad_planificada: cantidad,
            cantidad_realizada: 0
          });
        }
      }
      const cartRecetaIds = new Set(cartPlanItems.map((it) => it.receta.id));
      for (const pr of planRows || []) {
        if (pr.semana_inicio === weekStart && !cartRecetaIds.has(pr.receta_id)) {
          await supabase.from("plan_semanal").delete().eq("id", pr.id);
        }
      }
      showToast("✅ Plan semanal guardado");
      const { data } = await supabase.from("plan_semanal").select("id, semana_inicio, receta_id, cantidad_planificada, cantidad_realizada").eq("semana_inicio", weekStart);
      if (weekStartRef.current === weekStart && data) {
        setPlanRows(data);
        const items = data
          .filter((row) => (row.cantidad_planificada || 0) > 0)
          .map((row) => {
            const receta = recetas.find((r) => r.id === row.receta_id) || { id: row.receta_id, nombre: "Receta", emoji: "🍞", unidad_rinde: "u" };
            return { receta, cantidad: Number(row.cantidad_planificada) || 0 };
          });
        setCartPlanItems(items);
      }
      onPlanChanged?.();
    } catch {
      showToast("⚠️ Error al guardar el plan semanal");
    } finally {
      setSaving(false);
    }
  };

  const itemsPendientes = cartPlanItems
    .map(({ receta, cantidad: plan }) => {
      const existente = (planRows || []).find((pr) => pr.receta_id === receta.id && pr.semana_inicio === weekStart);
      const realizado = Number(existente?.cantidad_realizada || 0);
      const pendiente = Math.max(plan - realizado, 0);
      return pendiente > 0 ? { receta, cantidad: pendiente } : null;
    })
    .filter(Boolean);

  const requerimientos = calcularRequerimientoInsumosParaItems(
    itemsPendientes,
    recetaIngredientes,
    insumos,
    insumoComposicion
  );

  const insumosCompra = (requerimientos || []).map(req => {
    const insumo = req.insumo;
    const stockActual = (insumoStock || {})[req.insumo_id] ?? 0;
    const faltante = Math.max(0, (req.cantidad || 0) - stockActual);
    let costo = 0;
    if (faltante > 0 && insumo && insumo.cantidad_presentacion > 0 && insumo.precio != null) {
      const precioUnitario = insumo.precio / insumo.cantidad_presentacion;
      costo = precioUnitario * faltante;
    }
    return { insumo_id: req.insumo_id, insumo, faltante, costo };
  }).filter(x => x.faltante > 0);

  const totalCompra = insumosCompra.reduce((s, x) => s + (x.costo || 0), 0);
  const totalPlanificadas = cartPlanItems.reduce((s, it) => s + (it.cantidad || 0), 0);

  const semanaTitulo = () => {
    const inicio = new Date(weekStart);
    const fin = new Date(weekStart);
    fin.setDate(fin.getDate() + 6);
    return `${inicio.toLocaleDateString("es-AR")} al ${fin.toLocaleDateString("es-AR")}`;
  };

  const cambiarSemana = (delta) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d.toISOString().split("T")[0]);
  };

  const buildWhatsAppText = () => {
    const inicio = new Date(weekStart);
    const fin = new Date(weekStart);
    fin.setDate(fin.getDate() + 6);
    let text = `Plan de producción semanal\n${inicio.toLocaleDateString("es-AR")} al ${fin.toLocaleDateString("es-AR")}`;
    if (totalPlanificadas > 0) {
      text += `\n\nEsta semana producís ${totalPlanificadas} unidades.`;
    }
    if (totalCompra > 0) {
      text += `\nNecesitás comprar aproximadamente ${fmt(totalCompra)} en insumos.`;
    }
    if (insumosCompra.length > 0) {
      const porProveedor = {};
      for (const item of insumosCompra) {
        const proveedor = (item.insumo?.proveedor || "Sin proveedor");
        if (!porProveedor[proveedor]) porProveedor[proveedor] = [];
        porProveedor[proveedor].push(item);
      }
      text += `\n\nLista de compras:`;
      Object.entries(porProveedor).forEach(([prov, items]) => {
        text += `\n\nProveedor: ${prov}`;
        items.forEach(({ insumo, faltante, costo }) => {
          const unidad = insumo?.unidad || "u";
          const costoTxt = costo > 0 ? ` (~${fmt(costo)})` : "";
          text += `\n- ${insumo?.nombre || "Insumo"}: ${faltante.toFixed(2)} ${unidad}${costoTxt}`;
        });
      });
    }
    return text;
  };

  const handleProducir = async (item) => {
    const { receta, cantidad: plan } = item;
    const existente = (planRows || []).find((pr) => pr.receta_id === receta.id && pr.semana_inicio === weekStart);
    const realizado = Number(existente?.cantidad_realizada || 0);
    if (!plan || plan <= 0) {
      showToast("Agregá cantidad al plan primero.");
      return;
    }
    if (realizado >= plan) {
      showToast("Ya alcanzaste o superaste el plan para esta receta.");
      return;
    }
    const cantidad = plan - realizado;
    try {
      await actualizarStock(receta.id, cantidad);
      if (consumirInsumosPorStock) await consumirInsumosPorStock(receta.id, cantidad);
      const nuevaRealizada = realizado + cantidad;
      await supabase.from("plan_semanal").upsert(
        { semana_inicio: weekStart, receta_id: receta.id, cantidad_planificada: plan, cantidad_realizada: nuevaRealizada },
        { onConflict: "semana_inicio,receta_id" }
      );
      showToast(`✅ Producción registrada: +${cantidad} ${receta.nombre}`);
      const { data } = await supabase.from("plan_semanal").select("id, semana_inicio, receta_id, cantidad_planificada, cantidad_realizada").eq("semana_inicio", weekStart);
      if (weekStartRef.current === weekStart && data) setPlanRows(data);
      onRefresh?.();
      onPlanChanged?.();
    } catch {
      showToast("⚠️ Error al registrar la producción");
    }
  };

  const waText = buildWhatsAppText();
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;

  return (
    <div className="content">
      <p className="page-title">Plan semanal</p>
      <p className="page-subtitle">Definí qué vas a producir y generá la lista de compras.</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Semana</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" className="btn-secondary" style={{ width: "auto", padding: "6px 10px" }} onClick={() => cambiarSemana(-1)}>
            ← Anterior
          </button>
          <div style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 500 }}>{semanaTitulo()}</div>
          <button type="button" className="btn-secondary" style={{ width: "auto", padding: "6px 10px" }} onClick={() => cambiarSemana(1)}>
            Siguiente →
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Resumen</span>
        </div>
        <p style={{ fontSize: 13, marginBottom: 4 }}>
          Esta semana producís <strong>{totalPlanificadas}</strong> unidades.
        </p>
        <p style={{ fontSize: 13 }}>
          Necesitás comprar aproximadamente <strong>{fmt(totalCompra || 0)}</strong> en insumos.
        </p>
      </div>

      {loading ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="loading"><div className="spinner" /><span>Cargando plan...</span></div>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <span className="card-title">Agregar al plan</span>
            </div>
            {recetas.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📋</div>
                <p>No hay recetas todavía.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                {recetas.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => addToPlanCart(r, 1)}
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
                    onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.97)"; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    <span style={{ fontSize: 26, marginBottom: 4 }}>{r.emoji}</span>
                    <span style={{ fontSize: 14, fontWeight: 500, textAlign: "left" }}>{r.nombre}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Tocá para sumar</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <span className="card-title">Tu plan esta semana</span>
            </div>
            {cartPlanItems.length === 0 ? (
              <p style={{ padding: "12px 4px", fontSize: 14, color: "var(--text-muted)" }}>Agregá productos arriba. Después guardá el plan.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cartPlanItems.map((item) => {
                  const existente = (planRows || []).find((pr) => pr.receta_id === item.receta.id && pr.semana_inicio === weekStart);
                  const realizado = Number(existente?.cantidad_realizada || 0);
                  const pendiente = Math.max((item.cantidad || 0) - realizado, 0);
                  const unidad = item.receta.unidad_rinde || "u";
                  return (
                    <div key={item.receta.id} className="insumo-item" style={{ alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 22 }}>{item.receta.emoji}</span>
                      <div className="insumo-info" style={{ flex: 1, minWidth: 0 }}>
                        <div className="insumo-nombre">{item.receta.nombre}</div>
                        <div className="insumo-detalle" style={{ fontSize: 12 }}>
                          Plan: {item.cantidad} {unidad}
                          {realizado > 0 && (
                            <span style={{ marginLeft: 8, color: "var(--green)" }}>
                              · Realizado: {realizado} {unidad}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => updatePlanCartQuantity(item.receta.id, -1)}
                          style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--cream)", fontSize: 16, cursor: "pointer", lineHeight: 1 }}
                        >
                          −
                        </button>
                        <span style={{ minWidth: 28, textAlign: "center", fontWeight: 500 }}>{item.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => updatePlanCartQuantity(item.receta.id, 1)}
                          style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--cream)", fontSize: 16, cursor: "pointer", lineHeight: 1 }}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromPlanCart(item.receta.id)}
                          style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: 4, fontSize: 18 }}
                          title="Quitar"
                        >
                          ✕
                        </button>
                        {pendiente > 0 && (
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ width: "auto", padding: "6px 10px", fontSize: 12 }}
                            onClick={() => handleProducir(item)}
                            disabled={saving}
                          >
                            Producir ahora
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button
              className="btn-primary"
              onClick={guardarPlan}
              disabled={saving || loading || cartPlanItems.length === 0}
              style={{ marginTop: 12 }}
            >
              {saving ? "Guardando..." : "Guardar plan semanal"}
            </button>
          </div>
        </>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Lista de compras</span>
        </div>
        {insumosCompra.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            No hay faltantes para esta semana con el plan actual.
          </p>
        ) : (
          <>
            {Object.entries(insumosCompra.reduce((acc, item) => {
              const proveedor = (item.insumo?.proveedor || "Sin proveedor");
              if (!acc[proveedor]) acc[proveedor] = [];
              acc[proveedor].push(item);
              return acc;
            }, {})).map(([proveedor, items]) => (
              <div key={proveedor} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Proveedor: {proveedor}
                </div>
                {items.map(({ insumo_id, insumo, faltante, costo }) => (
                  <div key={insumo_id} className="insumo-item" style={{ padding: "6px 0" }}>
                    <div className="insumo-info" style={{ flex: 1 }}>
                      <div className="insumo-nombre">{insumo?.nombre || "Insumo"}</div>
                      <div className="insumo-detalle">
                        Faltan {faltante.toFixed(2)} {insumo?.unidad || "u"}
                      </div>
                    </div>
                    {costo > 0 && (
                      <div className="insumo-precio">
                        <div className="insumo-precio-value">{fmt(costo)}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ display: "inline-block", marginTop: 8, textAlign: "center" }}
            >
              Compartir por WhatsApp
            </a>
          </>
        )}
      </div>
    </div>
  );
}

// ── GASTOS FIJOS ──────────────────────────────────────────────────────────────
function GastosFijos({ gastos, onRefresh, showToast }) {
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    monto: "",
    frecuencia: "mensual",
    activo: true,
  });

  const openNew = () => {
    setEditando(null);
    setForm({ nombre: "", monto: "", frecuencia: "mensual", activo: true });
    setModal(true);
  };

  const openEdit = (g) => {
    setEditando(g);
    setForm({
      nombre: g.nombre,
      monto: String(g.monto ?? ""),
      frecuencia: g.frecuencia || "mensual",
      activo: g.activo !== false,
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.nombre.trim()) {
      showToast("⚠️ Nombre requerido");
      return;
    }
    const monto = parseFloat(String(form.monto).replace(",", "."));
    if (!monto || monto <= 0) {
      showToast("⚠️ Monto inválido");
      return;
    }
    setSaving(true);
    const payload = {
      nombre: form.nombre.trim(),
      monto,
      frecuencia: form.frecuencia,
      activo: form.activo,
    };
    try {
      if (editando) {
        const { error } = await supabase
          .from("gastos_fijos")
          .update(payload)
          .eq("id", editando.id);
        if (error) throw error;
        showToast("✅ Gasto fijo actualizado");
      } else {
        const { error } = await supabase.from("gastos_fijos").insert(payload);
        if (error) throw error;
        showToast("✅ Gasto fijo agregado");
      }
      setModal(false);
      await onRefresh();
    } catch (err) {
      reportError(err, { action: "saveGastoFijo" });
      showToast("⚠️ Error al guardar gasto fijo");
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (g) => {
    try {
      const { error } = await supabase
        .from("gastos_fijos")
        .update({ activo: !g.activo })
        .eq("id", g.id);
      if (error) throw error;
      await onRefresh();
    } catch (err) {
      reportError(err, { action: "toggleGastoFijo", id: g.id });
      showToast("⚠️ Error al actualizar");
    }
  };

  const eliminar = async (g) => {
    if (!window.confirm(`¿Eliminar el gasto fijo "${g.nombre}"?`)) return;
    try {
      const { error } = await supabase
        .from("gastos_fijos")
        .delete()
        .eq("id", g.id);
      if (error) throw error;
      showToast("🗑️ Gasto fijo eliminado");
      await onRefresh();
    } catch (err) {
      reportError(err, { action: "deleteGastoFijo", id: g.id });
      showToast("⚠️ Error al eliminar gasto fijo");
    }
  };

  const { dia, semana } = calcularGastosFijosNormalizados(gastos);

  const gastosOrdenados = [...(gastos || [])].sort((a, b) =>
    (a.nombre || "").localeCompare(b.nombre || "", "es", {
      sensitivity: "base",
    })
  );

  return (
    <div className="content">
      <p className="page-title">Gastos fijos</p>
      <p className="page-subtitle">
        Alquiler, servicios, sueldos · se prorratean para ver la ganancia neta
      </p>

      <div className="stats-row" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-label">Gasto fijo diario</div>
          <div className="stat-value rojo">{fmt(dia || 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Gasto fijo semanal</div>
          <div className="stat-value rojo">{fmt(semana || 0)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Lista de gastos fijos</span>
          <button
            type="button"
            className="edit-btn"
            onClick={openNew}
          >
            + Agregar
          </button>
        </div>
        {gastosOrdenados.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">💸</div>
            <p>No configuraste gastos fijos todavía.</p>
          </div>
        ) : (
          gastosOrdenados.map((g) => {
            const freqLabel =
              g.frecuencia === "diario"
                ? "Diario"
                : g.frecuencia === "semanal"
                ? "Semanal"
                : "Mensual";
            return (
              <div
                key={g.id}
                className="insumo-item"
                style={{ padding: "10px 0" }}
              >
                <div className="insumo-info" style={{ flex: 1 }}>
                  <div className="insumo-nombre">{g.nombre}</div>
                  <div className="insumo-detalle">
                    {fmt(g.monto)} · {freqLabel} ·{" "}
                    {g.activo ? "Activo" : "Inactivo"}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <button
                    type="button"
                    className="edit-btn"
                    onClick={() => openEdit(g)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="edit-btn"
                    onClick={() => toggleActivo(g)}
                    style={{
                      borderColor: g.activo
                        ? "var(--danger)"
                        : "var(--green)",
                      color: g.activo ? "var(--danger)" : "var(--green)",
                    }}
                  >
                    {g.activo ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    className="edit-btn"
                    onClick={() => eliminar(g)}
                    style={{ color: "var(--danger)" }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <button className="fab" onClick={openNew}>
        +
      </button>

      {modal && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => setModal(false)}
              disabled={saving}
            >
              ← Volver
            </button>
            <span className="screen-title">
              {editando ? "Editar gasto fijo" : "Nuevo gasto fijo"}
            </span>
          </div>
          <div className="screen-content">
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input
                className="form-input"
                value={form.nombre}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nombre: e.target.value }))
                }
                placeholder="Ej: Alquiler, Luz, Sueldos"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Monto</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monto}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, monto: e.target.value }))
                  }
                  placeholder="Ej: 300000"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Frecuencia</label>
                <select
                  className="form-select"
                  value={form.frecuencia}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, frecuencia: e.target.value }))
                  }
                >
                  <option value="diario">Diario</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={form.activo ? "activo" : "inactivo"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    activo: e.target.value === "activo",
                  }))
                }
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            <button
              className="btn-primary"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => setModal(false)}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CLIENTES ──────────────────────────────────────────────────────────────────
function Clientes({ ventas, clientes, recetas, pedidos, onRefresh, showToast, actualizarStock, confirm }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", telefono: "" });
  const [saving, setSaving] = useState(false);
  const [importingMultiple, setImportingMultiple] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [search, setSearch] = useState("");
  const [detalleCliente, setDetalleCliente] = useState(null);
  const [cleaningDupes, setCleaningDupes] = useState(false);
  const [nuevoPedidoAbierto, setNuevoPedidoAbierto] = useState(false);
  const [pedidoFechaEntrega, setPedidoFechaEntrega] = useState("");
  const [pedidoRecetaSel, setPedidoRecetaSel] = useState("");
  const [pedidoCantidad, setPedidoCantidad] = useState(1);
  const [pedidoPrecio, setPedidoPrecio] = useState("");
  const [pedidoItems, setPedidoItems] = useState([]);
  const [pedidoSenia, setPedidoSenia] = useState("");
  const [pedidoEstado, setPedidoEstado] = useState("pendiente");
  const [savingPedido, setSavingPedido] = useState(false);

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

  const resetFormularioPedido = () => {
    setPedidoFechaEntrega("");
    setPedidoRecetaSel("");
    setPedidoCantidad(1);
    setPedidoPrecio("");
    setPedidoItems([]);
    setPedidoSenia("");
    setPedidoEstado("pendiente");
  };

  const addPedidoItem = () => {
    if (!pedidoRecetaSel) return;
    const receta = recetas.find((r) => String(r.id) === String(pedidoRecetaSel));
    if (!receta) return;
    const cantidadNum = Number(pedidoCantidad) || 0;
    if (cantidadNum <= 0) return;
    const precioNum =
      pedidoPrecio !== ""
        ? Number(String(pedidoPrecio).replace(",", "."))
        : Number(receta.precio_venta || 0);
    if (Number.isNaN(precioNum) || precioNum < 0) return;
    setPedidoItems((prev) => {
      const idx = prev.findIndex((it) => it.receta.id === receta.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          cantidad: copy[idx].cantidad + cantidadNum,
          precio_unitario: precioNum,
        };
        return copy;
      }
      return [...prev, { receta, cantidad: cantidadNum, precio_unitario: precioNum }];
    });
    setPedidoRecetaSel("");
    setPedidoCantidad(1);
    setPedidoPrecio("");
  };

  const quitarPedidoItem = (recetaId) => {
    setPedidoItems((prev) => prev.filter((it) => it.receta.id !== recetaId));
  };

  const guardarPedido = async () => {
    if (!detalleCliente) {
      showToast("Primero elegí un cliente");
      return;
    }
    if (!pedidoFechaEntrega) {
      showToast("Elegí una fecha de entrega");
      return;
    }
    if (pedidoItems.length === 0) {
      showToast("Agregá al menos un producto");
      return;
    }
    setSavingPedido(true);
    try {
      const pedidoId = crypto.randomUUID?.() || `p-${Date.now()}`;
      const seniaNum = parseFloat(String(pedidoSenia || "").replace(",", ".")) || 0;
      const rows = pedidoItems.map((item) => {
        const precio = parseFloat(String(item.precio_unitario).replace(",", ".")) || 0;
        const cantidad = Number(item.cantidad) || 0;
        return {
          pedido_id: pedidoId,
          cliente_id: detalleCliente.id,
          receta_id: item.receta.id,
          cantidad,
          precio_unitario: precio,
          senia: seniaNum,
          estado: pedidoEstado,
          fecha_entrega: pedidoFechaEntrega,
        };
      });
      const { error } = await supabase.from("pedidos").insert(rows);
      if (error) {
        reportError(error, { action: "guardarPedidoCliente", cliente_id: detalleCliente.id });
        showToast("⚠️ Error al guardar pedido");
        return;
      }
      showToast("✅ Pedido guardado");
      resetFormularioPedido();
      setNuevoPedidoAbierto(false);
      await onRefresh();
    } catch (err) {
      reportError(err, { action: "guardarPedidoCliente", cliente_id: detalleCliente?.id });
      showToast("⚠️ Error al guardar pedido");
    } finally {
      setSavingPedido(false);
    }
  };

  const actualizarEstadoPedido = async (grupo, nuevoEstado) => {
    if (!grupo || !nuevoEstado || grupo.estado === nuevoEstado) return;
    try {
      const { error } = await supabase
        .from("pedidos")
        .update({ estado: nuevoEstado })
        .eq("pedido_id", grupo.key);
      if (error) throw error;
      await onRefresh();
    } catch (err) {
      reportError(err, { action: "actualizarEstadoPedido", pedido_id: grupo?.key });
      showToast("⚠️ Error al actualizar estado del pedido");
    }
  };

  const marcarPedidoEntregado = async (grupo) => {
    if (!grupo || !grupo.rawItems?.length) return;
    const ok = await confirm("¿Marcar este pedido como entregado? Se registrará la venta y se descontará el stock.", { destructive: false });
    if (!ok) return;
    setSavingPedido(true);
    try {
      const hoy = hoyLocalISO();
      const transaccionId = crypto.randomUUID?.() || `p-${grupo.key}`;
      const rows = grupo.rawItems.map((p) => {
        const precio = p.precio_unitario || 0;
        const cantidad = p.cantidad || 0;
        const subtotal = precio * cantidad;
        const descuento = 0;
        const total_final = subtotal - descuento;
        return {
          receta_id: p.receta_id,
          cantidad,
          precio_unitario: precio,
          subtotal,
          descuento,
          total_final,
          fecha: hoy,
          transaccion_id: transaccionId,
          cliente_id: p.cliente_id || null,
          medio_pago: "efectivo",
          estado_pago: "pagado",
        };
      });
      const { error: ventaError } = await supabase.from("ventas").insert(rows);
      if (ventaError) throw ventaError;
      if (actualizarStock) {
        for (const p of grupo.rawItems) {
          const cant = p.cantidad || 0;
          if (!p.receta_id || cant <= 0) continue;
          await actualizarStock(p.receta_id, -cant);
        }
      }
      const { error: pedError } = await supabase
        .from("pedidos")
        .update({ estado: "entregado" })
        .eq("pedido_id", grupo.key);
      if (pedError) throw pedError;
      showToast("✅ Pedido entregado registrado como venta");
      await onRefresh();
    } catch (err) {
      reportError(err, { action: "marcarPedidoEntregado", pedido_id: grupo?.key });
      showToast("⚠️ No se pudo marcar el pedido como entregado");
    } finally {
      setSavingPedido(false);
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
              onClick={() => {
                setDetalleCliente(null);
                setNuevoPedidoAbierto(false);
                resetFormularioPedido();
              }}
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

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">Pedidos futuros</span>
                <button
                  type="button"
                  className="card-link"
                  onClick={() => setNuevoPedidoAbierto((prev) => !prev)}
                >
                  {nuevoPedidoAbierto ? "Cerrar" : "+ Nuevo pedido"}
                </button>
              </div>
              {(() => {
                const pedidosCliente = agruparPedidos(
                  (pedidos || []).filter((p) => p.cliente_id === detalleCliente.id)
                );
                const hoyStr = hoyLocalISO();
                const pendientes = pedidosCliente.filter((g) => {
                  if (!g.fecha_entrega) return g.estado !== "entregado";
                  return g.fecha_entrega >= hoyStr && g.estado !== "entregado";
                });
                const formatFecha = (value) => {
                  if (!value) return "Sin fecha";
                  try {
                    return new Date(value).toLocaleDateString("es-AR");
                  } catch {
                    return value;
                  }
                };
                const estadoLabel = (estado) => {
                  if (estado === "en_preparacion") return "En preparación";
                  if (estado === "listo") return "Listo";
                  if (estado === "entregado") return "Entregado";
                  return "Pendiente";
                };
                if (!nuevoPedidoAbierto && pendientes.length === 0) {
                  return (
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-muted)",
                        padding: "12px 16px",
                      }}
                    >
                      No hay pedidos futuros para este cliente.
                    </p>
                  );
                }
                return (
                  <>
                    {nuevoPedidoAbierto && (
                      <div style={{ padding: "12px 16px", borderTop: pendientes.length > 0 ? "1px solid var(--border)" : "none" }}>
                        <div className="form-group">
                          <label className="form-label">Fecha de entrega</label>
                          <input
                            className="form-input"
                            type="date"
                            value={pedidoFechaEntrega}
                            min={hoyLocalISO()}
                            onChange={(e) => setPedidoFechaEntrega(e.target.value)}
                          />
                        </div>
                        <div className="form-row">
                          <div className="form-group" style={{ flex: 2 }}>
                            <label className="form-label">Producto</label>
                            <select
                              className="form-select"
                              value={pedidoRecetaSel}
                              onChange={(e) => setPedidoRecetaSel(e.target.value)}
                            >
                              <option value="">Elegí un producto</option>
                              {recetas.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Cantidad</label>
                            <input
                              className="form-input"
                              type="number"
                              min="1"
                              value={pedidoCantidad}
                              onChange={(e) => setPedidoCantidad(Number(e.target.value) || 1)}
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Precio acordado por unidad ($)</label>
                          <input
                            className="form-input"
                            type="number"
                            value={pedidoPrecio}
                            onChange={(e) => setPedidoPrecio(e.target.value)}
                            placeholder="Dejar vacío para usar precio de lista"
                          />
                        </div>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={addPedidoItem}
                          style={{ marginBottom: 8 }}
                        >
                          Agregar ítem
                        </button>
                        {pedidoItems.length > 0 && (
                          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
                            {pedidoItems.map((it) => (
                              <div
                                key={it.receta.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 8,
                                  padding: "4px 0",
                                }}
                              >
                                <span>
                                  {it.cantidad}x {it.receta.nombre}
                                </span>
                                <span>{fmt((it.precio_unitario || 0) * (it.cantidad || 0))}</span>
                                <button
                                  type="button"
                                  onClick={() => quitarPedidoItem(it.receta.id)}
                                  style={{
                                    border: "none",
                                    background: "none",
                                    color: "#999",
                                    cursor: "pointer",
                                    fontSize: 14,
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="form-row">
                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Seña / adelanto ($)</label>
                            <input
                              className="form-input"
                              type="number"
                              value={pedidoSenia}
                              onChange={(e) => setPedidoSenia(e.target.value)}
                              placeholder="0"
                            />
                          </div>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Estado inicial</label>
                            <select
                              className="form-select"
                              value={pedidoEstado}
                              onChange={(e) => setPedidoEstado(e.target.value)}
                            >
                              <option value="pendiente">Pendiente</option>
                              <option value="en_preparacion">En preparación</option>
                              <option value="listo">Listo</option>
                            </select>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={guardarPedido}
                          disabled={savingPedido || pedidoItems.length === 0 || !pedidoFechaEntrega}
                        >
                          {savingPedido ? "Guardando…" : "Guardar pedido"}
                        </button>
                      </div>
                    )}
                    {pendientes.length > 0 && (
                      <div>
                        {pendientes.map((g) => {
                          const unidades = (g.items || []).reduce(
                            (s, it) => s + (it.cantidad || 0),
                            0
                          );
                          return (
                            <div
                              key={g.key}
                              className="venta-item venta-item-simple"
                              style={{ padding: "10px 16px" }}
                            >
                              <div className="insumo-info" style={{ flex: 1 }}>
                                <div className="insumo-nombre">
                                  {formatFecha(g.fecha_entrega)} · {estadoLabel(g.estado)}
                                </div>
                                <div className="insumo-detalle" style={{ fontSize: 12 }}>
                                  {unidades} u ·{" "}
                                  {(g.items || [])
                                    .map((it) => {
                                      const receta = recetas.find((r) => r.id === it.receta_id);
                                      return `${it.cantidad || 0}x ${receta?.nombre || "Producto"}`;
                                    })
                                    .join(" · ")}
                                </div>
                              </div>
                              <div className="insumo-precio" style={{ minWidth: 120 }}>
                                <div className="insumo-precio-value">
                                  {fmt(g.total)}
                                </div>
                                {g.senia > 0 && (
                                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                    Seña {fmt(g.senia)}
                                  </div>
                                )}
                                <select
                                  className="form-input"
                                  value={g.estado || "pendiente"}
                                  onChange={(e) => actualizarEstadoPedido(g, e.target.value)}
                                  style={{ marginTop: 6, fontSize: 11, padding: "4px 6px" }}
                                >
                                  <option value="pendiente">Pendiente</option>
                                  <option value="en_preparacion">En preparación</option>
                                  <option value="listo">Listo</option>
                                </select>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{ marginTop: 6, fontSize: 11, padding: "4px 8px" }}
                                  onClick={() => marcarPedidoEntregado(g)}
                                  disabled={savingPedido}
                                >
                                  Marcar entregado
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
function Analytics({ ventas, recetas, clientes, recetaIngredientes, insumos, gastosFijos }) {
  const hoy = new Date();

  const parseISODate = (d) => {
    if (!d) return null;
    const parts = String(d).split("-");
    if (parts.length === 3) {
      const [y, m, day] = parts.map((x) => parseInt(x, 10));
      if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(day)) {
        return new Date(y, m - 1, day);
      }
    }
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const startOfWeek = (date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // lunes como inicio
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const endOfWeek = (start) => {
    const d = new Date(start);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const thisWeekStart = startOfWeek(hoy);
  const thisWeekEnd = endOfWeek(thisWeekStart);
  const prevWeekEnd = new Date(thisWeekStart.getTime() - 1);
  const prevWeekStart = startOfWeek(prevWeekEnd);

  const isBetween = (date, from, to) =>
    date && date.getTime() >= from.getTime() && date.getTime() <= to.getTime();

  const montoVenta = (v) =>
    v.total_final != null
      ? v.total_final
      : (v.precio_unitario || 0) * (v.cantidad || 0);

  const costoUnitarioPorReceta = (() => {
    const map = {};
    for (const r of recetas || []) {
      const rindeNum = parseFloat(r.rinde) || 1;
      const costoLoteCalc = costoReceta(r.id, recetaIngredientes, insumos);
      const costoUnitarioCalc =
        rindeNum > 0 ? costoLoteCalc / rindeNum : null;
      const costoUnitario =
        typeof r.costo_unitario === "number" && r.costo_unitario >= 0
          ? r.costo_unitario
          : costoUnitarioCalc;
      if (costoUnitario != null && !Number.isNaN(costoUnitario)) {
        map[r.id] = costoUnitario;
      }
    }
    return map;
  })();

  const getCostoLinea = (v) => {
    const cu = costoUnitarioPorReceta[v.receta_id];
    if (cu == null) return 0;
    const cant = Number(v.cantidad) || 0;
    return cu * cant;
  };

  const ventasConFecha = (ventas || []).map((v) => {
    const fecha = parseISODate(v.fecha || v.created_at);
    const created = v.created_at ? new Date(v.created_at) : fecha;
    return { ...v, _fecha: fecha, _created: created };
  });

  const ventasSemanaActual = ventasConFecha.filter((v) =>
    isBetween(v._fecha, thisWeekStart, thisWeekEnd)
  );
  const ventasSemanaAnterior = ventasConFecha.filter((v) =>
    isBetween(v._fecha, prevWeekStart, prevWeekEnd)
  );

  const sumMetric = (arr, fn) =>
    arr.reduce((s, v) => s + (fn ? fn(v) : montoVenta(v)), 0);

  const ingresoSemanaActual = sumMetric(ventasSemanaActual);
  const ingresoSemanaAnterior = sumMetric(ventasSemanaAnterior);
  const costoSemanaActual = sumMetric(ventasSemanaActual, getCostoLinea);
  const costoSemanaAnterior = sumMetric(ventasSemanaAnterior, getCostoLinea);
  const gananciaSemanaBrutaActual = ingresoSemanaActual - costoSemanaActual;
  const gananciaSemanaBrutaAnterior = ingresoSemanaAnterior - costoSemanaAnterior;

  const { semana: gastosFijosSemana } = calcularGastosFijosNormalizados(gastosFijos);
  const gananciaSemanaNetaActual = gananciaSemanaBrutaActual - (gastosFijosSemana || 0);
  const gananciaSemanaNetaAnterior = gananciaSemanaBrutaAnterior - (gastosFijosSemana || 0);
  const gananciaSemanaActual = gananciaSemanaNetaActual;
  const gananciaSemanaAnterior = gananciaSemanaNetaAnterior;
  const margenSemanaActual =
    ingresoSemanaActual > 0
      ? gananciaSemanaBrutaActual / ingresoSemanaActual
      : null;
  const margenSemanaAnterior =
    ingresoSemanaAnterior > 0
      ? gananciaSemanaBrutaAnterior / ingresoSemanaAnterior
      : null;

  const trendInfo = (actual, anterior, isPercent = false) => {
    if (anterior === 0 && actual === 0) {
      return { dir: "flat", label: "—" };
    }
    if (anterior === 0) {
      return { dir: "up", label: "nuevo" };
    }
    if (anterior == null || Number.isNaN(anterior)) {
      return { dir: "flat", label: "—" };
    }
    const diff = actual - anterior;
    const pct = anterior !== 0 ? diff / anterior : 0;
    const dir = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
    if (isPercent) {
      return { dir, label: pctFmt(pct) };
    }
    return { dir, label: pctFmt(pct) };
  };

  const trendIngreso = trendInfo(
    ingresoSemanaActual,
    ingresoSemanaAnterior
  );
  const trendCosto = trendInfo(costoSemanaActual, costoSemanaAnterior);
  const trendGanancia = trendInfo(
    gananciaSemanaNetaActual,
    gananciaSemanaNetaAnterior
  );
  const trendMargen = trendInfo(
    margenSemanaActual ?? 0,
    margenSemanaAnterior ?? 0,
    true
  );

  const topBy = (ventasLista) => {
    const porReceta = new Map();
    for (const v of ventasLista) {
      if (v.receta_id == null) continue;
      const prev = porReceta.get(v.receta_id) || {
        receta_id: v.receta_id,
        unidades: 0,
        ingreso: 0,
        costo: 0,
      };
      prev.unidades += Number(v.cantidad) || 0;
      const ingreso = montoVenta(v);
      prev.ingreso += ingreso;
      prev.costo += getCostoLinea(v);
      porReceta.set(v.receta_id, prev);
    }
    return Array.from(porReceta.values());
  };

  const semActPorReceta = topBy(ventasSemanaActual);
  const semAntPorReceta = topBy(ventasSemanaAnterior);
  const mapSemAnt = new Map(
    semAntPorReceta.map((r) => [r.receta_id, r])
  );

  const topMasVendidos = semActPorReceta
    .slice()
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 5)
    .map((row) => {
      const rec = recetas.find((r) => r.id === row.receta_id) || {};
      const prev = mapSemAnt.get(row.receta_id) || {
        unidades: 0,
        ingreso: 0,
      };
      const t = trendInfo(row.unidades, prev.unidades);
      return { ...row, receta: rec, trend: t };
    });

  const ahora = new Date();
  const hace30dias = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate() - 30
  );
  const ventas30dias = ventasConFecha.filter(
    (v) => v._fecha && v._fecha.getTime() >= hace30dias.getTime()
  );

  const porReceta30 = topBy(ventas30dias);
  const topMasRentables = porReceta30
    .map((row) => ({
      ...row,
      ganancia: row.ingreso - row.costo,
    }))
    .filter((row) => row.ganancia > 0)
    .sort((a, b) => b.ganancia - a.ganancia)
    .slice(0, 5)
    .map((row) => {
      const rec = recetas.find((r) => r.id === row.receta_id) || {};
      return { ...row, receta: rec };
    });

  const hace7dias = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate() - 6
  );
  hace7dias.setHours(0, 0, 0, 0);
  const ventas7dias = ventasConFecha.filter(
    (v) => v._fecha && v._fecha.getTime() >= hace7dias.getTime()
  );

  const recetasConVenta7 = new Set(
    ventas7dias
      .map((v) => v.receta_id)
      .filter((id) => id != null)
  );
  const recetasSinVenta7 = (recetas || []).filter(
    (r) => !recetasConVenta7.has(r.id)
  );

  const ventas30diasForPeak = ventasConFecha.filter(
    (v) => v._fecha && v._fecha.getTime() >= hace30dias.getTime()
  );

  const diasSemana = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const diasSemanaCorto = ["D", "L", "M", "X", "J", "V", "S"];

  const ingresoPorDia = Array(7).fill(0);
  const ingresoPorHora = Array(24).fill(0);
  for (const v of ventas30diasForPeak) {
    const f = v._fecha;
    if (!f) continue;
    const monto = montoVenta(v);
    const dow = f.getDay();
    ingresoPorDia[dow] += monto;
    const h = v._created ? v._created.getHours() : 0;
    ingresoPorHora[h] += monto;
  }

  const diaPicoIdx = ingresoPorDia.reduce(
    (bestIdx, val, idx, arr) => (val > arr[bestIdx] ? idx : bestIdx),
    0
  );
  const horaPicoIdx = ingresoPorHora.reduce(
    (bestIdx, val, idx, arr) => (val > arr[bestIdx] ? idx : bestIdx),
    0
  );

  const diaPicoLabel =
    ingresoPorDia[diaPicoIdx] > 0 ? diasSemana[diaPicoIdx] : "—";
  const horaPicoLabel =
    ingresoPorHora[horaPicoIdx] > 0
      ? `${horaPicoIdx.toString().padStart(2, "0")}:00`
      : "—";

  const year = hoy.getFullYear();
  const month = hoy.getMonth();
  const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const ventasMes = ventasConFecha.filter(
    (v) => v._fecha && isBetween(v._fecha, startOfMonth, endOfMonth)
  );

  const ingresoMes = sumMetric(ventasMes);
  const costoMes = sumMetric(ventasMes, getCostoLinea);
  const gananciaMesBruta = ingresoMes - costoMes;

  const totalDiasMes = endOfMonth.getDate();
  const { dia: gastosFijosDia } = calcularGastosFijosNormalizados(gastosFijos);
  const gastosFijosMes = (gastosFijosDia || 0) * totalDiasMes;
  const gananciaMesNeta = gananciaMesBruta - gastosFijosMes;

  const diasTranscurridos = hoy.getDate();
  const factorProy = diasTranscurridos > 0 ? totalDiasMes / diasTranscurridos : 0;
  const proyIngresoMes = ingresoMes * factorProy;
  const proyGananciaMesNeta = gananciaMesNeta * factorProy;

  const gastoPorClienteMes = new Map();
  for (const v of ventasMes) {
    if (v.cliente_id == null) continue;
    const prev = gastoPorClienteMes.get(v.cliente_id) || 0;
    gastoPorClienteMes.set(v.cliente_id, prev + montoVenta(v));
  }
  let mejorCliente = null;
  let mejorClienteTotal = 0;
  for (const [id, total] of gastoPorClienteMes.entries()) {
    if (total > mejorClienteTotal) {
      mejorClienteTotal = total;
      mejorCliente = clientes.find((c) => c.id === id) || null;
    }
  }

  const ultimo7diasFechas = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate() - i
    );
    d.setHours(0, 0, 0, 0);
    ultimo7diasFechas.push(d);
  }

  const ingresoPorDia7 = ultimo7diasFechas.map((dia) => {
    const next = new Date(dia);
    next.setDate(next.getDate() + 1);
    const total = ventasConFecha
      .filter(
        (v) =>
          v._fecha &&
          v._fecha.getTime() >= dia.getTime() &&
          v._fecha.getTime() < next.getTime()
      )
      .reduce((s, v) => s + montoVenta(v), 0);
    return total;
  });
  const maxIngreso7 = ingresoPorDia7.reduce(
    (m, v) => (v > m ? v : m),
    0
  );

  const ventas7PorReceta = topBy(ventas7dias);
  const totalIngresos7 = ventas7PorReceta.reduce(
    (s, r) => s + r.ingreso,
    0
  );
  const slices = ventas7PorReceta
    .slice()
    .sort((a, b) => b.ingreso - a.ingreso);
  const maxSlices = 5;
  const topSlices = slices.slice(0, maxSlices);
  const otherSlices = slices.slice(maxSlices);
  const otrosIngreso = otherSlices.reduce((s, r) => s + r.ingreso, 0);
  const pieData = [];
  for (const s of topSlices) {
    const rec = recetas.find((r) => r.id === s.receta_id) || {};
    const pct =
      totalIngresos7 > 0 ? s.ingreso / totalIngresos7 : 0;
    pieData.push({ ...s, receta: rec, pct });
  }
  if (otrosIngreso > 0 && totalIngresos7 > 0) {
    pieData.push({
      receta: { nombre: "Otros" },
      ingreso: otrosIngreso,
      pct: otrosIngreso / totalIngresos7,
      receta_id: "otros",
    });
  }

  let acum = 0;
  const pieGradient = pieData
    .map((s, idx) => {
      const color =
        CATEGORIAS.includes(s.receta?.categoria) && CAT_COLORS[s.receta.categoria]
          ? CAT_COLORS[s.receta.categoria]
          : ["#A98ED2", "#4A7C59", "#D64545", "#D4A843", "#8B6040"][idx % 5];
      const start = acum * 360;
      const end = (acum + s.pct) * 360;
      acum += s.pct;
      return `${color} ${start}deg ${end}deg`;
    })
    .join(", ");

  const arrow = (dir) =>
    dir === "up" ? "↑" : dir === "down" ? "↓" : "→";

  return (
    <div className="content">
      <p className="page-title">Analytics</p>
      <p className="page-subtitle">
        Semana vs semana anterior · picos de venta y rentabilidad
      </p>

      <div className="analytics-section">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Comparativo semanal</span>
          </div>
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Ingreso</div>
              <div className="analytics-kpi-value">
                {fmt(ingresoSemanaActual)}
                <span
                  className={`analytics-trend analytics-trend-${trendIngreso.dir}`}
                >
                  {arrow(trendIngreso.dir)} {trendIngreso.label}
                </span>
              </div>
              <div className="analytics-kpi-sub">
                Sem. anterior: {fmt(ingresoSemanaAnterior)}
              </div>
            </div>
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Costo</div>
              <div className="analytics-kpi-value">
                {fmt(costoSemanaActual)}
                <span
                  className={`analytics-trend analytics-trend-${trendCosto.dir}`}
                >
                  {arrow(trendCosto.dir)} {trendCosto.label}
                </span>
              </div>
              <div className="analytics-kpi-sub">
                Sem. anterior: {fmt(costoSemanaAnterior)}
              </div>
            </div>
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Ganancia</div>
              <div className="analytics-kpi-value">
                {fmt(gananciaSemanaActual)}
                <span
                  className={`analytics-trend analytics-trend-${trendGanancia.dir}`}
                >
                  {arrow(trendGanancia.dir)} {trendGanancia.label}
                </span>
              </div>
              <div className="analytics-kpi-sub">
                Sem. anterior: {fmt(gananciaSemanaAnterior)}
              </div>
            </div>
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Margen</div>
              <div className="analytics-kpi-value">
                {margenSemanaActual != null
                  ? pctFmt(margenSemanaActual)
                  : "—"}
                <span
                  className={`analytics-trend analytics-trend-${trendMargen.dir}`}
                >
                  {arrow(trendMargen.dir)} {trendMargen.label}
                </span>
              </div>
              <div className="analytics-kpi-sub">
                Sobre ingreso semanal
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">
              TOP 5 productos más vendidos (semana)
            </span>
          </div>
          {topMasVendidos.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🥐</div>
              <p>No hay ventas esta semana.</p>
            </div>
          ) : (
            <div className="analytics-list">
              {topMasVendidos.map((row) => (
                <div key={row.receta_id} className="analytics-item">
                  <span className="venta-emoji">
                    {row.receta.emoji || "🍞"}
                  </span>
                  <div className="analytics-item-main">
                    <div className="analytics-item-title">
                      {row.receta.nombre || "Sin nombre"}
                    </div>
                    <div className="analytics-item-sub">
                      {row.unidades} u · {fmt(row.ingreso)}
                    </div>
                  </div>
                  <span
                    className={`analytics-item-badge analytics-trend-${row.trend.dir}`}
                  >
                    {arrow(row.trend.dir)} {row.trend.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">
              TOP 5 productos más rentables (30 días)
            </span>
          </div>
          {topMasRentables.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">💸</div>
              <p>Todavía no hay datos de ganancia.</p>
            </div>
          ) : (
            <div className="analytics-list">
              {topMasRentables.map((row) => (
                <div key={row.receta_id} className="analytics-item">
                  <span className="venta-emoji">
                    {row.receta.emoji || "🍞"}
                  </span>
                  <div className="analytics-item-main">
                    <div className="analytics-item-title">
                      {row.receta.nombre || "Sin nombre"}
                    </div>
                    <div className="analytics-item-sub">
                      Ganancia: {fmt(row.ganancia)} · Ingreso:{" "}
                      {fmt(row.ingreso)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">
              Ventas por día (últimos 7 días)
            </span>
          </div>
          {maxIngreso7 === 0 ? (
            <div className="empty">
              <div className="empty-icon">📊</div>
              <p>No hay ventas en los últimos 7 días.</p>
            </div>
          ) : (
            <div className="bar-chart">
              {ultimo7diasFechas.map((d, idx) => {
                const total = ingresoPorDia7[idx];
                const pct =
                  maxIngreso7 > 0 ? (total / maxIngreso7) * 100 : 0;
                const label =
                  diasSemanaCorto[d.getDay()] || "";
                return (
                  <div key={idx} className="bar-chart-col">
                    <div className="bar-chart-value">
                      {total > 0 ? Math.round(total / 1000) + "k" : ""}
                    </div>
                    <div
                      className="bar-chart-bar"
                      style={{ height: `${Math.max(pct, 8)}%` }}
                    />
                    <div className="bar-chart-label">{label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">
              Distribución de productos (últimos 7 días)
            </span>
          </div>
          {totalIngresos7 === 0 ? (
            <div className="empty">
              <div className="empty-icon">🥧</div>
              <p>No hay ventas en los últimos 7 días.</p>
            </div>
          ) : (
            <div className="pie-chart">
              <div
                className="pie-chart-figure"
                style={{
                  background:
                    pieGradient || "conic-gradient(#A98ED2 0deg 360deg)",
                }}
              />
              <div className="pie-chart-legend">
                {pieData.map((s) => {
                  const rec = s.receta || {};
                  const color =
                    CATEGORIAS.includes(rec.categoria) &&
                    CAT_COLORS[rec.categoria]
                      ? CAT_COLORS[rec.categoria]
                      : "#A98ED2";
                  return (
                    <div
                      key={s.receta_id}
                      className="pie-chart-legend-item"
                    >
                      <span
                        className="pie-chart-dot"
                        style={{ backgroundColor: color }}
                      />
                      <span className="pie-chart-label">
                        {rec.nombre}
                      </span>
                      <span className="pie-chart-pct">
                        {pctFmt(s.pct)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">
              Pico de ventas y cliente del mes
            </span>
          </div>
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Día y hora con más ventas</div>
              <div className="analytics-kpi-value">
                {diaPicoLabel}
              </div>
              <div className="analytics-kpi-sub">
                Horario pico: {horaPicoLabel}
              </div>
            </div>
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">
                Cliente que más compró este mes
              </div>
              <div className="analytics-kpi-value">
                {mejorCliente ? mejorCliente.nombre : "—"}
              </div>
              <div className="analytics-kpi-sub">
                {mejorCliente
                  ? `Total: ${fmt(mejorClienteTotal)}`
                  : "Todavía no hay compras este mes"}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Proyección del mes</span>
          </div>
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Ingreso proyectado</div>
              <div className="analytics-kpi-value">
                {fmt(proyIngresoMes || 0)}
              </div>
              <div className="analytics-kpi-sub">
                Acumulado: {fmt(ingresoMes)} en {diasTranscurridos} día(s)
              </div>
            </div>
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Ganancia neta proyectada</div>
              <div className="analytics-kpi-value">
                {fmt(proyGananciaMesNeta || 0)}
              </div>
              <div className="analytics-kpi-sub">
                Acumulado neto: {fmt(gananciaMesNeta)}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">
              Productos sin ventas en los últimos 7 días
            </span>
          </div>
          {recetasSinVenta7.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">✅</div>
              <p>Todos los productos tuvieron al menos una venta.</p>
            </div>
          ) : (
            <>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 8,
                }}
              >
                Revisá si siguen teniendo sentido en la carta.
              </p>
              <div className="analytics-chips">
                {recetasSinVenta7.slice(0, 10).map((r) => (
                  <span key={r.id} className="analytics-chip">
                    {r.emoji || "🍞"} {r.nombre}
                  </span>
                ))}
                {recetasSinVenta7.length > 10 && (
                  <span
                    className="analytics-chip"
                    style={{ color: "var(--text-muted)" }}
                  >
                    +{recetasSinVenta7.length - 10} más
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
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

  const hoy = hoyLocalISO();
  const hoyDate = new Date(hoy);
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

  const ventasConDeuda = (ventas || []).filter((v) => v.estado_pago === "debe");
  const deudaPorCliente = new Map();
  for (const v of ventasConDeuda) {
    const clienteId = v.cliente_id || "__sin_cliente__";
    const prev =
      deudaPorCliente.get(clienteId) || {
        cliente_id: v.cliente_id,
        total: 0,
        ultimaFecha: null,
      };
    const monto =
      v.total_final != null
        ? v.total_final
        : (v.precio_unitario || 0) * (v.cantidad || 0);
    prev.total += monto;
    const refFecha = v.fecha || v.created_at;
    if (refFecha) {
      const d = new Date(refFecha);
      if (!Number.isNaN(d.getTime())) {
        if (!prev.ultimaFecha || d > prev.ultimaFecha) prev.ultimaFecha = d;
      }
    }
    deudaPorCliente.set(clienteId, prev);
  }
  const clientesDeuda = Array.from(deudaPorCliente.values())
    .filter((c) => c.total > 0.01)
    .sort((a, b) => b.total - a.total);
  const totalDeuda = clientesDeuda.reduce((s, c) => s + c.total, 0);

  const formatRelDia = (d) => {
    if (!d || Number.isNaN(d.getTime())) return "";
    const diffMs = hoyDate.getTime() - d.getTime();
    const dias = Math.round(diffMs / (24 * 60 * 60 * 1000));
    if (dias <= 0) return "hoy";
    if (dias === 1) return "ayer";
    if (dias <= 7) return `hace ${dias} días`;
    return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  };

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

  const registrarVentaEnSupabase = async (rows) => {
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
      for (const v of rows) {
        const cant = v.cantidad || 0;
        if (!v.receta_id || cant <= 0) continue;
        await actualizarStock(v.receta_id, -cant);
      }
    }
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
    const hoy = hoyLocalISO();
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
      const hoy = hoyLocalISO();
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
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await saveVentaPendiente(rows);
        const totalFinalOffline = usarOverride ? override : totalCarrito;
        showToast(`✅ Venta guardada offline: ${fmt(totalFinalOffline)}. Se sincronizará cuando vuelva la conexión.`);
      } else {
        await registrarVentaEnSupabase(rows);
        const totalFinal = usarOverride ? override : totalCarrito;
        showToast(`✅ Venta registrada: ${fmt(totalFinal)}`);
      }

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

      {clientesDeuda.length > 0 && (
        <div className="card dashboard-alert" style={{ marginBottom: 12 }}>
          <div className="card-header">
            <span className="card-title">⚠️ Clientes con deuda</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
            {clientesDeuda.length} cliente{clientesDeuda.length > 1 ? "s" : ""} ·{" "}
            <strong style={{ color: "var(--accent)" }}>{fmt(totalDeuda)}</strong> por cobrar
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {clientesDeuda.slice(0, 3).map((cd) => {
              const cli =
                (clientes || []).find((c) => c.id === cd.cliente_id) || null;
              const nombre = cli?.nombre || "Cliente sin nombre";
              const rel = formatRelDia(cd.ultimaFecha);
              return (
                <div
                  key={cd.cliente_id || "__sin_cliente__"}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{nombre}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Última venta {rel || ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "var(--accent)",
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      {fmt(cd.total)}
                    </div>
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: 2,
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 10,
                        background: "rgba(214,69,69,0.08)",
                        color: "var(--danger)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      DEBE
                    </span>
                  </div>
                </div>
              );
            })}
            {clientesDeuda.length > 3 && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                +{clientesDeuda.length - 3} cliente
                {clientesDeuda.length - 3 > 1 ? "s" : ""} más con deuda
              </div>
            )}
          </div>
        </div>
      )}

      {ventasHoy.length > 0 && (
        <>
          <div className="card-header" style={{ marginBottom: 8 }}>
            <span className="card-title">Hoy</span>
          </div>
          {agruparVentas(ventasHoy).map((grupo) => {
            const cliente = (clientes || []).find(
              (c) => c.id === grupo.cliente_id
            );
            const ejemplo = (grupo.rawItems && grupo.rawItems[0]) || grupo.items[0];
            let fechaHoraTxt = "";
            let horaTxt = "";
            if (ejemplo) {
              const fechaBase =
                ejemplo.created_at || (ejemplo.fecha && `${ejemplo.fecha}T00:00:00`);
              if (fechaBase) {
                const d = new Date(fechaBase);
                if (!Number.isNaN(d.getTime())) {
                  const esHoy = ejemplo.fecha === hoy;
                  const hora = d.toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  horaTxt = `${hora} hs`;
                  const diaTxt = esHoy
                    ? "Hoy"
                    : d.toLocaleDateString("es-AR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      });
                  fechaHoraTxt = `${diaTxt} · ${horaTxt}`;
                }
              }
            }
            const medio = ejemplo?.medio_pago || "efectivo";
            const estado = ejemplo?.estado_pago || "pagado";
            const medioTxt =
              medio === "transferencia"
                ? "Transferencia"
                : medio === "debito"
                ? "Débito"
                : medio === "credito"
                ? "Crédito"
                : "Efectivo";

            return (
              <div key={grupo.key} className="card venta-card">
                <div className="venta-grupo-cliente">
                  Cliente: {cliente?.nombre || "—"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <span>{fechaHoraTxt || horaTxt}</span>
                  <span>
                    <span style={{ marginRight: 8 }}>{medioTxt}</span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 10,
                        background:
                          estado === "debe"
                            ? "rgba(214,69,69,0.08)"
                            : "rgba(74,124,89,0.08)",
                        color:
                          estado === "debe"
                            ? "var(--danger)"
                            : "var(--green)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      {estado === "debe" ? "DEBE" : "Pagado"}
                    </span>
                  </span>
                </div>
                {grupo.items.map((v, vi) => {
                  const r = recetas.find((r) => r.id === v.receta_id);
                  return (
                    <div
                      key={v.id || `${grupo.key}-${v.receta_id}-${vi}`}
                      className="venta-item venta-item-simple"
                    >
                      <span className="venta-emoji">{r?.emoji || "🍞"}</span>
                      <span className="venta-nombre-simple">
                        {(r?.nombre || "—").toLowerCase()} x{v.cantidad}
                      </span>
                    </div>
                  );
                })}
                <div className="venta-grupo-total">Total: {fmt(grupo.total)}</div>
                <div className="venta-grupo-actions">
                  <button
                    className="btn-venta-action"
                    onClick={() => abrirEditar(grupo)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn-venta-action btn-venta-delete"
                    onClick={() => eliminarVenta(grupo)}
                    disabled={
                      deletingId === (grupo.key || grupo.rawItems?.[0]?.id)
                    }
                  >
                    {deletingId === (grupo.key || grupo.rawItems?.[0]?.id)
                      ? "…"
                      : "Eliminar"}
                  </button>
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
  const [pedidos, setPedidos] = useState([]);
  const [stock, setStock] = useState({});
  const [insumoStock, setInsumoStock] = useState({});
  const [insumoMovimientos, setInsumoMovimientos] = useState([]);
  const [insumoComposicion, setInsumoComposicion] = useState([]);
  const [precioHistorial, setPrecioHistorial] = useState([]);
  const [errorLogOpen, setErrorLogOpen] = useState(false);
  const [recetasFilterIds, setRecetasFilterIds] = useState([]);
  const [resumenPlanSemanal, setResumenPlanSemanal] = useState(null);
  const [planSemanalVersion, setPlanSemanalVersion] = useState(0);
  const [gastosFijos, setGastosFijos] = useState([]);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

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

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
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
    const precioHistPromise = supabase
      .from("precio_historial")
      .select("id, insumo_id, precio_anterior, precio_nuevo, fecha, motivo")
      .order("fecha", { ascending: true })
      .limit(5000)
      .then((r) => ({ ok: !r.error, data: r.data || [] }))
      .catch(() => ({ ok: false, data: [] }));
    const pedidosPromise = supabase
      .from("pedidos")
      .select("*")
      .order("fecha_entrega", { ascending: true })
      .limit(1000);
    const gastosPromise = supabase.from("gastos_fijos").select("*").order("nombre");
    const [insRes, recRes, venRes, riRes, cliRes, pedRes, stRes, insStRes, insMovRes, insCompRes, gastosRes, precioHistRes] = await Promise.all([
      supabase.from("insumos").select("*").order("categoria").order("nombre"),
      supabase.from("recetas").select("*").order("nombre"),
      supabase.from("ventas").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("receta_ingredientes").select("*"),
      supabase.from("clientes").select("*").order("nombre"),
      pedidosPromise,
      stPromise,
      insStPromise,
      insMovPromise,
      insCompPromise,
      gastosPromise,
      precioHistPromise
    ]);
    const authErr = (e) => e && (e.status === 401 || e.status === 403);
    if ([insRes.error, recRes.error, venRes.error, riRes.error, cliRes.error, pedRes?.error, gastosRes?.error].some(authErr)) {
      showToast("🔒 Sesión expirada o sin permisos. Volvé a iniciar sesión.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    if (insRes.error) {
      reportError(insRes.error, { action: "loadData", source: "insumos", code: insRes.error?.code });
      showToast("⚠️ Error al cargar insumos");
    }
    if (recRes.error) {
      reportError(recRes.error, { action: "loadData", source: "recetas", code: recRes.error?.code });
      showToast("⚠️ Error al cargar recetas");
    }
    if (venRes.error) {
      reportError(venRes.error, { action: "loadData", source: "ventas", code: venRes.error?.code });
      showToast("⚠️ Error al cargar ventas");
    }
    if (pedRes && pedRes.error) {
      reportError(pedRes.error, {
        action: "loadData",
        source: "pedidos",
        code: pedRes.error.code,
        message: pedRes.error.message,
        details: pedRes.error.details
      });
      if (pedRes.error.code === "42P01") {
        showToast("ℹ️ Configurá la tabla 'pedidos' en Supabase para usar pedidos futuros");
      } else {
        showToast("⚠️ Error al cargar pedidos");
      }
    }
    if (gastosRes && gastosRes.error) {
      reportError(gastosRes.error, { action: "loadData", source: "gastos_fijos", code: gastosRes.error?.code });
      showToast("⚠️ Error al cargar gastos fijos");
    }
    setInsumos(insRes.data || []);
    setRecetas(recRes.data || []);
    setVentas(venRes.data || []);
    setRecetaIngredientes(riRes.data || []);
    setClientes(cliRes.data || []);
    if (pedRes && pedRes.data) {
      setPedidos(pedRes.data || []);
    } else {
      setPedidos([]);
    }
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
    if (precioHistRes.ok) {
      setPrecioHistorial(precioHistRes.data || []);
    }
    setGastosFijos(gastosRes?.data || []);
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

  useEffect(() => {
    let cancelled = false;
    const cargarResumen = async () => {
      if (!recetas.length) {
        if (!cancelled) setResumenPlanSemanal(null);
        return;
      }
      const semanaInicio = getSemanaInicioISO();
      try {
        const { data, error } = await supabase
          .from("plan_semanal")
          .select("receta_id, cantidad_planificada, cantidad_realizada")
          .eq("semana_inicio", semanaInicio);
        if (error) {
          if (!cancelled) setResumenPlanSemanal(null);
          return;
        }
        let totalPlanificadas = 0;
        const itemsPendientes = [];
        for (const row of data || []) {
          const receta = recetas.find((r) => r.id === row.receta_id);
          if (!receta) continue;
          const plan = Number(row.cantidad_planificada || 0);
          const realizado = Number(row.cantidad_realizada || 0);
          if (plan > 0) totalPlanificadas += plan;
          const pendiente = Math.max(plan - realizado, 0);
          if (pendiente > 0) {
            itemsPendientes.push({ receta, cantidad: pendiente });
          }
        }
        if (!itemsPendientes.length) {
          if (!cancelled) setResumenPlanSemanal({ totalUnidades: totalPlanificadas, totalCompra: 0 });
          return;
        }
        const requerimientos = calcularRequerimientoInsumosParaItems(
          itemsPendientes,
          recetaIngredientes,
          insumos,
          insumoComposicion
        );
        let totalCompra = 0;
        for (const req of requerimientos) {
          const stockActual = (insumoStock || {})[req.insumo_id] ?? 0;
          const faltante = Math.max(0, (req.cantidad || 0) - stockActual);
          const insumo = req.insumo;
          if (faltante > 0 && insumo && insumo.cantidad_presentacion > 0 && insumo.precio != null) {
            const precioUnitario = insumo.precio / insumo.cantidad_presentacion;
            totalCompra += precioUnitario * faltante;
          }
        }
        if (!cancelled) setResumenPlanSemanal({ totalUnidades: totalPlanificadas, totalCompra });
      } catch {
        if (!cancelled) setResumenPlanSemanal(null);
      }
    };
    cargarResumen();
    return () => {
      cancelled = true;
    };
  }, [recetas, recetaIngredientes, insumos, insumoComposicion, insumoStock, planSemanalVersion]);

  const actualizarStock = useCallback(async (receta_id, delta) => {
    let nuevo;
    let anterior;
    setStock(prev => {
      const actual = prev[receta_id] ?? 0;
      anterior = actual;
      nuevo = actual + delta;
      return { ...prev, [receta_id]: nuevo };
    });
    const { error } = await supabase.from("stock").upsert(
      { receta_id, cantidad: nuevo, updated_at: new Date().toISOString() },
      { onConflict: "receta_id" }
    );
    if (error) {
      setStock(prev => ({ ...prev, [receta_id]: (prev[receta_id] ?? 0) - delta }));
      throw error;
    }
    if (anterior > 0 && nuevo <= 0) {
      const receta = recetas.find(r => r.id === receta_id);
      const nombre = receta?.nombre || "producto";
      showToast(`⚠️ ${nombre}: sin stock`);
      if (typeof window !== "undefined" && typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification("Stock agotado", { body: `${nombre} se quedó sin stock.` });
        } catch {
          // ignorar errores de notificación
        }
      }
    }
  }, [recetas]);

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

  const syncVentasPendientes = useCallback(async () => {
    if (!supabase || !isOnline) return;
    try {
      const pendientes = await getVentasPendientes();
      if (!pendientes || pendientes.length === 0) return;
      let totalLineasSincronizadas = 0;
      for (const item of pendientes) {
        const rows = Array.isArray(item.rows) ? item.rows : [];
        if (rows.length === 0) {
          await deleteVentaPendiente(item.id);
          continue;
        }
        try {
          let { error } = await supabase.from("ventas").insert(rows);
          const sinTransaccion =
            error &&
            (error.message?.includes("transaccion_id") ||
              error.code === "42703");
          if (sinTransaccion) {
            const res = await supabase
              .from("ventas")
              .insert(rows.map(({ transaccion_id, ...r }) => r));
            error = res.error;
          }
          if (error) throw error;
          if (actualizarStock) {
            for (const v of rows) {
              const cant = v.cantidad || 0;
              if (!v.receta_id || cant <= 0) continue;
              await actualizarStock(v.receta_id, -cant);
            }
          }
          await deleteVentaPendiente(item.id);
          totalLineasSincronizadas += rows.length;
        } catch (err) {
          reportError(err, {
            action: "syncVentasPendientes.item",
            id: item.id,
          });
        }
      }
      if (totalLineasSincronizadas > 0) {
        showToast(`✅ Se sincronizaron ${totalLineasSincronizadas} ventas`);
        await loadData();
      }
    } catch (err) {
      reportError(err, { action: "syncVentasPendientes" });
    }
  }, [isOnline, actualizarStock, loadData]);

  useEffect(() => {
    if (session && isOnline) {
      syncVentasPendientes();
    }
  }, [session, isOnline, syncVentasPendientes]);

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

  const NAV_TABS = [
    { id: "dashboard", icon: "📊", label: "Inicio" },
    { id: "ventas", icon: "💰", label: "Ventas" },
    { id: "stock", icon: "📥", label: "Stock" },
    { id: "more", icon: "☰", label: "Más" },
  ];

  const MORE_MENU_ITEMS = [
    { id: "analytics", icon: "📈", label: "Analytics", sub: "Gráficos y proyecciones" },
    { id: "plan", icon: "📆", label: "Plan semanal", sub: "Producción y pedidos" },
    { id: "clientes", icon: "👥", label: "Clientes", sub: "Contactos y ventas" },
    { id: "insumos", icon: "📦", label: "Insumos", sub: "Materias primas y stock" },
    { id: "recetas", icon: "📋", label: "Recetas", sub: "Productos y costos" },
  ];

  const isMoreSection = ["analytics", "plan", "clientes", "insumos", "recetas"].includes(tab);
  const sinStockCount = recetas.filter(r => (stock[r.id] ?? 0) <= 0).length;

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
            <h1>🌾 Gluten Free</h1>
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
            {tab === "dashboard" && (
              <Dashboard
                insumos={insumos}
                recetas={recetas}
                recetaIngredientes={recetaIngredientes}
                ventas={ventas}
                clientes={clientes}
                stock={stock}
                pedidos={pedidos}
                gastosFijos={gastosFijos}
                resumenPlanSemanal={resumenPlanSemanal}
                onNavigate={setTab}
              />
            )}
            {tab === "more" && (
              <MoreMenuScreen items={MORE_MENU_ITEMS} onNavigate={setTab} />
            )}
            {tab === "analytics" && (
              <Analytics
                ventas={ventas}
                recetas={recetas}
                clientes={clientes}
                recetaIngredientes={recetaIngredientes}
                insumos={insumos}
                gastosFijos={gastosFijos}
              />
            )}
            {tab === "insumos" && (
              <Insumos
                insumos={insumos}
                insumoStock={insumoStock}
                insumoMovimientos={insumoMovimientos}
                insumoComposicion={insumoComposicion}
                registrarMovimientoInsumo={registrarMovimientoInsumo}
                recetas={recetas}
                recetaIngredientes={recetaIngredientes}
                precioHistorial={precioHistorial}
                onRefresh={loadData}
                showToast={showToast}
                confirm={confirm}
                onVerRecetasAfectadas={(ids) => {
                  setRecetasFilterIds(ids || []);
                  setTab("recetas");
                }}
              />
            )}
            {tab === "recetas" && (
              <Recetas
                recetas={recetas}
                insumos={insumos}
                recetaIngredientes={recetaIngredientes}
                showToast={showToast}
                onRefresh={loadData}
                confirm={confirm}
                filterRecetasIds={recetasFilterIds}
                onClearFilter={() => setRecetasFilterIds([])}
              />
            )}
            {tab === "ventas" && (
              <Ventas
                recetas={recetas}
                ventas={ventas}
                clientes={clientes}
                stock={stock}
                actualizarStock={actualizarStock}
                onRefresh={loadData}
                showToast={showToast}
                confirm={confirm}
              />
            )}
            {tab === "stock" && (
              <Stock
                recetas={recetas}
                stock={stock}
                actualizarStock={actualizarStock}
                consumirInsumosPorStock={consumirInsumosPorStock}
                insumoStock={insumoStock}
                insumos={insumos}
                recetaIngredientes={recetaIngredientes}
                insumoComposicion={insumoComposicion}
                registrarMovimientoInsumo={registrarMovimientoInsumo}
                onRefresh={loadData}
                showToast={showToast}
                ventas={ventas}
                pedidos={pedidos}
              />
            )}
            {tab === "plan" && (
              <PlanSemanal
                recetas={recetas}
                recetaIngredientes={recetaIngredientes}
                insumos={insumos}
                insumoComposicion={insumoComposicion}
                insumoStock={insumoStock}
                actualizarStock={actualizarStock}
                consumirInsumosPorStock={consumirInsumosPorStock}
                showToast={showToast}
                onRefresh={loadData}
                onPlanChanged={() => setPlanSemanalVersion(v => v + 1)}
              />
            )}
            {tab === "clientes" && (
              <Clientes
                ventas={ventas}
                clientes={clientes}
                recetas={recetas}
                pedidos={pedidos}
                onRefresh={loadData}
                showToast={showToast}
                actualizarStock={actualizarStock}
                confirm={confirm}
              />
            )}
            {tab === "gastos" && (
              <GastosFijos
                gastos={gastosFijos}
                onRefresh={loadData}
                showToast={showToast}
              />
            )}
          </>
        )}

        <nav className="nav">
          {NAV_TABS.map(t => {
            const isActive = t.id === "more" ? isMoreSection : tab === t.id;
            return (
              <button
                key={t.id}
                className={`nav-btn ${isActive ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <span className="nav-icon">{t.icon}</span>
                <span className="nav-label">
                  {t.label}
                  {t.id === "stock" && sinStockCount > 0 && (
                    <span className="nav-badge-stock">{sinStockCount}</span>
                  )}
                </span>
              </button>
            );
          })}
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