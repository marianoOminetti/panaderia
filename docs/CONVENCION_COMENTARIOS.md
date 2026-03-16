# Convención de comentarios para contexto (agentes y humanos)

**Objetivo:** Que quien lea el código (desarrollador o agente IA) entienda rápido el propósito, las fronteras y las dependencias de cada archivo y bloque. Se aplica **en cada bloque de refactor** al tocar un archivo.

**Referencia:** [PLAN_EJECUCION_POR_IMPACTO.md](./PLAN_EJECUCION_POR_IMPACTO.md) — los comentarios son parte de las etapas de cada bloque.

---

## Qué comentar

### 1. Archivos nuevos (hooks, componentes, lib)

- **Cabecera del archivo (JSDoc o bloque de comentario):**
  - **Qué hace:** una frase (ej. "Estado y handlers del carrito de nueva venta en Ventas").
  - **Quién lo usa:** componente o pantalla que lo consume (ej. "Usado por Ventas.jsx").
  - **Contrato:** si es un hook, qué recibe (params) y qué devuelve (objeto con estado/handlers); si es un componente, qué props espera.

**Ejemplo (hook):**
```js
/**
 * Estado y handlers del carrito de nueva venta (ítems, cantidades, precios, total).
 * Usado por Ventas.jsx. No incluye flujo de cobro ni edición de ventas existentes.
 * @param {{ recetas: Array }} - recetas para resolver nombres en el carrito
 * @returns {{ cartItems, addToCart, updateCartQuantity, removeFromCart, cartTotal, ... }}
 */
export function useVentasCart({ recetas }) { ... }
```

**Ejemplo (componente):**
```jsx
/**
 * Modal de alta/edición de receta: formulario, ingredientes (insumos/precursoras/costo fijo) y panel de costo.
 * Recibe estado y handlers del padre (useRecetasForm); no persiste por sí mismo.
 */
export default function RecetaModal({ form, setForm, ingredientes, ... }) { ... }
```

### 2. Archivos modificados (componentes que quedan como orquestadores)

- **Cabecera o primer comentario:** actualizar si cambió el rol del archivo (ej. "Solo orquesta: usa useX y useY; delega lista a XList y modal a XModal").
- **Secciones largas:** marcar con un comentario de bloque antes de cada zona (ej. `// --- Lista de recetas ---`, `// --- Modal nueva/editar ---`). Así un agente sabe dónde está cada flujo.

### 3. Lógica no obvia

- **Por qué, no qué:** comentar la intención o la regla de negocio cuando el código no se explica solo (ej. "Rinde 0 o vacío se normaliza a 1 para no dividir por cero", "Lunes como inicio de semana para alinear con plan semanal").
- **Fórmulas o umbrales:** si hay números mágicos que vienen de negocio, una línea (ej. "Margen < 50% se considera bajo para alertas").

### 4. Lo que NO hace falta comentar

- Código autodescriptivo (nombres claros de variables/funciones).
- Cada `useState` o cada prop; solo el contrato del hook/componente en bloque.

---

## Dónde poner los comentarios

| Lugar | Formato sugerido |
|-------|-------------------|
| Inicio de archivo (hook/componente/lib) | JSDoc `/** ... */` o `// ...` de 1–4 líneas |
| Secciones dentro de un archivo largo | `// --- Nombre de la sección ---` |
| Regla de negocio o "why" | `// ...` en la línea anterior o al final de la línea |
| Parámetros/retorno de hook | JSDoc `@param` y `@returns` si ayuda (opcional pero útil para agentes) |

---

## Integración con el plan por impacto

En **cada bloque** (F, G, H, …), al cerrar una etapa que crea o modifica archivos:

1. **Archivos nuevos:** agregar cabecera con propósito, quién lo usa y contrato (params/return o props).
2. **Archivos que pasan a ser orquestadores:** actualizar el comentario de cabecera; opcionalmente marcar secciones con `// --- ... ---`.
3. **Lógica movida que tenga reglas de negocio:** dejar un comentario "why" en el lugar donde vive esa lógica (hook o lib).

Así los agentes que lean el código en bloques posteriores tendrán contexto claro sin depender solo del nombre del archivo.
