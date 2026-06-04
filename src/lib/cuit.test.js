import { isValidCuit, normalizeCuitInput, maskCuit } from "./cuit";

test("normalizeCuitInput strips non-digits", () => {
  expect(normalizeCuitInput("20-12345678-9")).toBe("20123456789");
});

test("maskCuit hides middle digits", () => {
  expect(maskCuit("20123456789")).toBe("***-***-6789");
});

test("isValidCuit rejects short input", () => {
  expect(isValidCuit("2012345678")).toBe(false);
});
