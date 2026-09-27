/*
===========================================================
BAXL FILE CONVERTER
===========================================================
BAXL files contain ONLY raw BAXL text.

Encoding:
    Original file bytes
        ↓
    BAXL characters
        ↓
    UTF-8 text
        ↓
    .baxl file

Decoding:
    .baxl text
        ↓
    BAXL characters
        ↓
    Original file bytes
===========================================================
*/


// =========================================================
// BAXL ALPHABET
// =========================================================

const alphabet = [
  ...Array.from(
    { length: 0x007E - 0x0020 + 1 },
    (_, i) => String.fromCodePoint(0x0020 + i)
  ),

  ...Array.from(
    { length: 0x00FF - 0x00A1 + 1 },
    (_, i) => String.fromCodePoint(0x00A1 + i)
  ),

  ...Array.from(
    { length: 0x0141 - 0x0100 + 1 },
    (_, i) => String.fromCodePoint(0x0100 + i)
  )
].join("");


// Make sure the alphabet has exactly 256 characters.
if (alphabet.length !== 256) {
  throw new Error("BAXL alphabet must contain exactly 256 characters.");
}


// Create reverse lookup table.
const reverseAlphabet = new Map();

for (let i = 0; i < alphabet.length; i++) {
  reverseAlphabet.set(alphabet[i], i);
}


// =========================================================
// BAXL ENCODING
// =========================================================

function encodeBAXL(bytes) {
  let output = "";

  for (const byte of bytes) {
    output += alphabet[byte];
  }

  return output;
}


// =========================================================
// BAXL DECODING
// =========================================================

function decodeBAXL(text) {
  const bytes = new Uint8Array(text.length);

  for (let i = 0; i < text.length; i++) {
    const character = text[i];

    const byte = reverseAlphabet.get(character);

    if (byte === undefined) {
      throw new Error(
        `Invalid BAXL character at position ${i}: ${JSON.stringify(character)}`
      );
    }

    bytes[i] = byte;
  }

  return bytes;
}


// =========================================================
// DOWNLOAD HELPER
// =========================================================

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  link.click();

  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}


// =========================================================
// ENCODE FILE → .BAXL
// =========================================================

document
  .getElementById("encodeButton")
  .addEventListener("click", async () => {

    const input = document.getElementById("encodeFile");

    if (!input.files.length) {
      alert("Choose a file first.");
      return;
    }

    const file = input.files[0];

    try {
      // Read the original file as raw bytes.
      const buffer = await file.arrayBuffer();

      const bytes = new Uint8Array(buffer);

      // Convert every byte into one BAXL character.
      const baxl = encodeBAXL(bytes);

      // Convert the BAXL text into UTF-8 bytes.
      const output = new TextEncoder().encode(baxl);

      // The .baxl file is simply a text file containing
      // the raw BAXL characters.
      const blob = new Blob(
        [output],
        {
          type: "text/plain;charset=utf-8"
        }
      );

      // Example:
      // photo.jpg → photo.jpg.baxl
      downloadBlob(
        blob,
        file.name + ".baxl"
      );

    } catch (error) {

      console.error(error);

      alert(
        "Encoding failed:\n" +
        error.message
      );
    }
  });


// =========================================================
// .BAXL → ORIGINAL FILE
// =========================================================

document
  .getElementById("decodeButton")
  .addEventListener("click", async () => {

    const input = document.getElementById("decodeFile");

    const status = document.getElementById("status");

    const preview = document.getElementById("preview");


    if (!input.files.length) {
      alert("Choose a .baxl file first.");
      return;
    }


    const file = input.files[0];


    try {

      status.textContent = "Reading BAXL...";


      // Read the .baxl file as plain text.
      const text = await file.text();


      status.textContent = "Decoding BAXL...";


      // Convert the BAXL characters back into bytes.
      const bytes = decodeBAXL(text);


      // -----------------------------------------------------
      // Try to determine the original file type.
      // -----------------------------------------------------

      let mime = "application/octet-stream";

      let extension = "";


      // JPEG
      if (
        bytes.length >= 3 &&
        bytes[0] === 0xFF &&
        bytes[1] === 0xD8 &&
        bytes[2] === 0xFF
      ) {
        mime = "image/jpeg";
        extension = ".jpg";
      }

      // PNG
      else if (
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4E &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0D &&
        bytes[5] === 0x0A &&
        bytes[6] === 0x1A &&
        bytes[7] === 0x0A
      ) {
        mime = "image/png";
        extension = ".png";
      }

      // GIF
      else if (
        bytes.length >= 6 &&
        bytes[0] === 0x47 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x38
      ) {
        mime = "image/gif";
        extension = ".gif";
      }

      // WEBP
      else if (
        bytes.length >= 12 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      ) {
        mime = "image/webp";
        extension = ".webp";
      }

      // PDF
      else if (
        bytes.length >= 5 &&
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46 &&
        bytes[4] === 0x2D
      ) {
        mime = "application/pdf";
        extension = ".pdf";
      }


      // -----------------------------------------------------
      // Create the recovered file.
      // -----------------------------------------------------

      const blob = new Blob(
        [bytes],
        {
          type: mime
        }
      );


      // Remove .baxl from the filename.
      let outputName = file.name;

      if (
        outputName.toLowerCase().endsWith(".baxl")
      ) {
        outputName = outputName.slice(
          0,
          -5
        );
      }


      // If the filename has no extension, use the
      // detected extension when possible.
      if (
        !outputName.includes(".") &&
        extension
      ) {
        outputName += extension;
      }


      // Download the recovered file.
      downloadBlob(
        blob,
        outputName
      );


      // -----------------------------------------------------
      // Image preview
      // -----------------------------------------------------

      if (mime.startsWith("image/")) {

        const imageURL =
          URL.createObjectURL(blob);

        preview.src = imageURL;

        preview.style.display = "block";

      } else {

        preview.removeAttribute("src");

        preview.style.display = "none";
      }


      // -----------------------------------------------------
      // Status
      // -----------------------------------------------------

      status.textContent =
        "Decoded successfully!\n\n" +

        "BAXL characters: " +
        text.length.toLocaleString() +

        "\nRecovered bytes: " +
        bytes.length.toLocaleString() +

        "\nFilename: " +
        outputName +

        "\nDetected type: " +
        mime;

    } catch (error) {

      console.error(error);

      preview.style.display = "none";

      status.textContent =
        "DECODING ERROR\n\n" +
        error.message;
    }
  });
