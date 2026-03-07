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

export async function shareViaWhatsApp(imageBlob, filename = "ticket.png") {
  const file = new File([imageBlob], filename, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "Ticket Panadería SG",
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
