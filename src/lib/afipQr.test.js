import { buildAfipQrUrl, AFIP_QR_BASE_URL } from "./afipQr";

describe("buildAfipQrUrl", () => {
  test("genera URL con base64 según especificación AFIP", () => {
    const url = buildAfipQrUrl({
      fecha: "2026-06-04",
      cuitEmisor: "20123456786",
      ptoVta: 2,
      tipoCmp: 11,
      nroCmp: 150,
      importe: 70000,
      tipoDocRec: 80,
      nroDocRec: 20123456786,
      cae: "70417054367476",
    });
    expect(url).toMatch(new RegExp(`^${AFIP_QR_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\?p=`));
    const b64 = url.split("?p=")[1];
    const json = JSON.parse(atob(b64));
    expect(json.ver).toBe(1);
    expect(json.tipoCmp).toBe(11);
    expect(json.tipoCodAut).toBe("E");
    expect(json.codAut).toBe(70417054367476);
    expect(json.importe).toBe(70000);
  });

  test("null si falta CAE", () => {
    expect(
      buildAfipQrUrl({
        fecha: "2026-06-04",
        cuitEmisor: "20123456786",
        ptoVta: 1,
        nroCmp: 1,
        importe: 100,
        cae: null,
      }),
    ).toBeNull();
  });
});
