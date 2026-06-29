import {
  parseVCard,
  parsePastedVCard,
  isVCardText,
  findClienteByTelefono,
  normalizeTelefonoForDedup,
} from "./contactImport";

describe("contactImport", () => {
  const sampleVCard = `BEGIN:VCARD
VERSION:3.0
FN:María García
TEL;TYPE=CELL:+54 9 11 1234-5678
END:VCARD`;

  test("isVCardText detecta vCard", () => {
    expect(isVCardText(sampleVCard)).toBe(true);
    expect(isVCardText("11 5555-1234")).toBe(false);
  });

  test("parseVCard extrae nombre y teléfono", () => {
    expect(parseVCard(sampleVCard)).toEqual({
      nombre: "María García",
      telefono: "+54 9 11 1234-5678",
    });
  });

  test("parseVCard despliega líneas plegadas", () => {
    const folded = `BEGIN:VCARD
FN:Ana Rod
 ríguez
TEL:1155551234
END:VCARD`;
    expect(parseVCard(folded)).toEqual({
      nombre: "Ana Rodríguez",
      telefono: "1155551234",
    });
  });

  test("parsePastedVCard rechaza texto plano", () => {
    expect(parsePastedVCard("+54 9 11 5555-1234")).toBeNull();
  });

  test("parsePastedVCard acepta vCard", () => {
    expect(parsePastedVCard(sampleVCard)?.nombre).toBe("María García");
  });

  test("normalizeTelefonoForDedup unifica formatos AR", () => {
    expect(normalizeTelefonoForDedup("11 15-1234-5678")).toBe("5491112345678");
    expect(normalizeTelefonoForDedup("+54 9 11 1234-5678")).toBe(
      "5491112345678",
    );
  });

  test("findClienteByTelefono encuentra por distintos formatos", () => {
    const clientes = [
      { id: "a", nombre: "María", telefono: "+54 9 11 1234-5678" },
    ];
    expect(findClienteByTelefono(clientes, "11 1234-5678")?.id).toBe("a");
  });
});
