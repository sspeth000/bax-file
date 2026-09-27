/*
===========================================================
BAXL ALPHABET
===========================================================

Byte 00 -> U+0020
Byte 01 -> U+0021
...
Byte 5E -> U+007E

Byte 5F -> U+00A1
...
Byte BD -> U+00FF

Byte BE -> U+0100
...
Byte FF -> U+0141
*/

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


if (alphabet.length !== 256) {
  throw new Error(
    "BAXL alphabet must contain exactly 256 characters."
  );
}


/*
===========================================================
CREATE REVERSE LOOKUP TABLE
===========================================================
*/

const reverseAlphabet = new Map();

for (let i = 0; i < alphabet.length; i++) {
  reverseAlphabet.set(alphabet[i], i);
}


/*
===========================================================
ENCODER
===========================================================
*/

function encodeBAXL(bytes) {

  let output = "";

  for (const byte of bytes) {
    output += alphabet[byte];
  }

  return output;
}


/*
===========================================================
DECODER
===========================================================
*/

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


/*
===========================================================
DOWNLOAD HELPER
===========================================================
*/

function downloadBlob(blob, filename) {

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}


/*
===========================================================
ENCODE BUTTON
===========================================================
*/

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

      const buffer = await file.arrayBuffer();

      const bytes = new Uint8Array(buffer);

      const baxl = encodeBAXL(bytes);

      /*
       * UTF-8 encoding.
       */
      const output = new TextEncoder().encode(baxl);

      const blob = new Blob(
        [output],
        {
          type: "text/plain;charset=utf-8"
        }
      );

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


/*
===========================================================
DECODE BUTTON
===========================================================
*/

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


      /*
       * Read the exact Unicode text.
       */
      const text = await file.text();


      status.textContent = "Decoding BAXL...";


      const bytes = decodeBAXL(text);


      /*
       * Remove .baxl from the filename.
       */
      let outputName = file.name;

      if (outputName.toLowerCase().endsWith(".baxl")) {

        outputName =
          outputName.slice(0, -5);

      }


      /*
       * Guess the original file type.
       */
      let mime = "application/octet-stream";


      if (bytes[0] === 0xFF && bytes[1] === 0xD8) {

        mime = "image/jpeg";

        if (!outputName.match(/\.(jpg|jpeg)$/i)) {
          outputName += ".jpg";
        }

      }

      else if (
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4E &&
        bytes[3] === 0x47
      ) {

        mime = "image/png";

        if (!outputName.match(/\.png$/i)) {
          outputName += ".png";
        }

      }

      else if (
        bytes[0] === 0x47 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46
      ) {

        mime = "image/gif";

        if (!outputName.match(/\.gif$/i)) {
          outputName += ".gif";
        }

      }


      const blob = new Blob(
        [bytes],
        { type: mime }
      );


      /*
       * Download reconstructed file.
       */

      downloadBlob(
        blob,
        outputName
      );


      /*
       * Image preview.
       */

      if (mime.startsWith("image/")) {

        const imageURL =
          URL.createObjectURL(blob);

        preview.src = imageURL;

        preview.style.display = "block";

      }


      status.textContent =
        "Decoded successfully!\n\n" +
        "BAXL characters: " +
        text.length.toLocaleString() +
        "\n" +
        "Recovered bytes: " +
        bytes.length.toLocaleString() +
        "\n" +
        "Detected type: " +
        mime;


    } catch (error) {

      console.error(error);

      preview.style.display = "none";

      status.textContent =
        "DECODING ERROR\n\n" +
        error.message;

    }

  });
