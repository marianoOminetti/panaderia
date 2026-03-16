import html2canvas from "html2canvas";

export async function generateTicketImage(element) {
  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: 2,
    logging: false,
    useCORS: true,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("No se pudo generar la imagen"));
        }
      },
      "image/png",
      1.0
    );
  });
}

const MENSAJE_TRANSFERENCIA = `¡Hola! 😁 Te comparto mis datos para que puedas *enviarme pesos a través de Mercado Pago*👇 

Alias: micaela.mirabile.mp
CVU: 0000003100045676260750
Nombre: Micaela Mirabile

`;

export async function shareViaWhatsApp(
  imageBlob,
  filename = "ticket.png",
  messageText = ""
) {
  const file = new File([imageBlob], filename, { type: "image/png" });
  const text = messageText ? `${messageText}\n\n${MENSAJE_TRANSFERENCIA}` : MENSAJE_TRANSFERENCIA;

  if (navigator.canShare?.({ files: [file], text })) {
    try {
      await navigator.share({
        files: [file],
        text,
        title: "Ticket Gluten Free",
      });
      return { success: true, method: "share" };
    } catch (err) {
      if (err.name === "AbortError") {
        return { success: false, method: "cancelled" };
      }
    }
  }

  const url = URL.createObjectURL(imageBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, method: "download" };
}
