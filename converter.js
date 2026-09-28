/*
===========================================================
BAXL FILE / BAXL CONVERTER
===========================================================

BAXL stores:

    - Format identifier
    - Format version
    - Original filename
    - Original MIME type
    - Original file bytes

The decoder does NOT need to identify the file type
from its binary signature.

The metadata is part of the BAXL data itself.
===========================================================
*/


/*
===========================================================
BAXL ALPHABET
===========================================================
*/

const alphabet = [
  ...Array.from(
    {
      length: 0x007E - 0x0020 + 1
    },
    (_, i) => String.fromCodePoint(0x0020 + i)
  ),

  ...Array.from(
    {
      length: 0x00FF - 0x00A1 + 1
    },
    (_, i) => String.fromCodePoint(0x00A1 + i)
  ),

  ...Array.from(
    {
      length: 0x0141 - 0x0100 + 1
    },
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
ENCODE BINARY → BAXL
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
DECODE BAXL → BINARY
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
BINARY WRITING HELPERS
===========================================================
*/

function writeUint32(view, offset, value) {

  view.setUint32(
    offset,
    value,
    true
  );

}


/*
===========================================================
BINARY READING HELPERS
===========================================================
*/

function readUint32(view, offset) {

  return view.getUint32(
    offset,
    true
  );

}


/*
===========================================================
CREATE BAXL CONTAINER
===========================================================

Layout:

Offset  Size
------  ----
0       4       "BAXL"
4       1       Version
5       4       Filename byte length
9       4       MIME byte length
13      N       Filename UTF-8
...     N       MIME UTF-8
...     N       Original file bytes

All integers are little-endian.
===========================================================
*/

function createBAXLContainer(
  fileBytes,
  filename,
  mimeType
) {

  const encoder = new TextEncoder();

  const filenameBytes =
    encoder.encode(filename);

  const mimeBytes =
    encoder.encode(mimeType || "");


  const HEADER_SIZE = 13;


  const totalSize =
    HEADER_SIZE +
    filenameBytes.length +
    mimeBytes.length +
    fileBytes.length;


  const container =
    new Uint8Array(totalSize);


  const view =
    new DataView(container.buffer);


  /*
  Magic
  */

  container[0] = 0x42; // B
  container[1] = 0x41; // A
  container[2] = 0x58; // X
  container[3] = 0x4C; // L


  /*
  Version
  */

  container[4] = 1;


  /*
  Filename length
  */

  writeUint32(
    view,
    5,
    filenameBytes.length
  );


  /*
  MIME type length
  */

  writeUint32(
    view,
    9,
    mimeBytes.length
  );


  /*
  Filename
  */

  let offset = HEADER_SIZE;

  container.set(
    filenameBytes,
    offset
  );

  offset += filenameBytes.length;


  /*
  MIME type
  */

  container.set(
    mimeBytes,
    offset
  );

  offset += mimeBytes.length;


  /*
  Original file data
  */

  container.set(
    fileBytes,
    offset
  );


  return container;
}


/*
===========================================================
READ BAXL CONTAINER
===========================================================
*/

function readBAXLContainer(container) {

  const HEADER_SIZE = 13;


  if (container.length < HEADER_SIZE) {

    throw new Error(
      "BAXL container is too small."
    );

  }


  /*
  Check magic
  */

  if (
    container[0] !== 0x42 ||
    container[1] !== 0x41 ||
    container[2] !== 0x58 ||
    container[3] !== 0x4C
  ) {

    throw new Error(
      "Invalid BAXL file: missing BAXL header."
    );

  }


  /*
  Version
  */

  const version =
    container[4];


  if (version !== 1) {

    throw new Error(
      `Unsupported BAXL version: ${version}`
    );

  }


  const view =
    new DataView(
      container.buffer,
      container.byteOffset,
      container.byteLength
    );


  /*
  Read metadata lengths
  */

  const filenameLength =
    readUint32(view, 5);


  const mimeLength =
    readUint32(view, 9);


  /*
  Calculate positions
  */

  const filenameStart =
    HEADER_SIZE;

  const mimeStart =
    filenameStart +
    filenameLength;

  const dataStart =
    mimeStart +
    mimeLength;


  /*
  Validate container
  */

  if (dataStart > container.length) {

    throw new Error(
      "Invalid BAXL file: metadata extends beyond the file."
    );

  }


  /*
  Decode metadata
  */

  const decoder =
    new TextDecoder("utf-8", {
      fatal: true
    });


  const filename =
    decoder.decode(
      container.slice(
        filenameStart,
        mimeStart
      )
    );


  const mimeType =
    decoder.decode(
      container.slice(
        mimeStart,
        dataStart
      )
    );


  /*
  Extract original file
  */

  const fileBytes =
    container.slice(dataStart);


  return {
    version,
    filename,
    mimeType,
    bytes: fileBytes
  };

}


/*
===========================================================
DOWNLOAD HELPER
===========================================================
*/

function downloadBlob(blob, filename) {

  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");


  link.href = url;

  link.download = filename;


  document.body.appendChild(link);

  link.click();

  link.remove();


  /*
  Give the browser a moment before
  releasing the object URL.
  */

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

}


/*
===========================================================
ENCODE BUTTON
===========================================================
*/

document
  .getElementById("encodeButton")
  .addEventListener(
    "click",
    async () => {

      const input =
        document.getElementById("encodeFile");


      if (!input.files.length) {

        alert(
          "Choose a file first."
        );

        return;
      }


      const file =
        input.files[0];


      try {

        /*
        Read original file.
        */

        const buffer =
          await file.arrayBuffer();


        const fileBytes =
          new Uint8Array(buffer);


        /*
        Get metadata directly from
        the File object.
        */

        const filename =
          file.name;


        const mimeType =
          file.type || "";


        /*
        Build BAXL container.
        */

        const container =
          createBAXLContainer(
            fileBytes,
            filename,
            mimeType
          );


        /*
        Convert container to BAXL text.
        */

        const baxl =
          encodeBAXL(container);


        /*
        UTF-8 encode the BAXL text.
        */

        const output =
          new TextEncoder().encode(baxl);


        const blob =
          new Blob(
            [output],
            {
              type:
                "text/plain;charset=utf-8"
            }
          );


        /*
        Download.
        */

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

    }
  );


/*
===========================================================
DECODE BUTTON
===========================================================
*/

document
  .getElementById("decodeButton")
  .addEventListener(
    "click",
    async () => {

      const input =
        document.getElementById("decodeFile");


      const status =
        document.getElementById("status");


      const preview =
        document.getElementById("preview");


      if (!input.files.length) {

        alert(
          "Choose a .baxl file first."
        );

        return;
      }


      const file =
        input.files[0];


      try {

        status.textContent =
          "Reading BAXL...";


        /*
        Read exact Unicode BAXL text.
        */

        const text =
          await file.text();


        status.textContent =
          "Decoding BAXL...";


        /*
        BAXL → container bytes.
        */

        const container =
          decodeBAXL(text);


        /*
        Read the metadata and original
        file bytes from the container.
        */

        const result =
          readBAXLContainer(container);


        const outputName =
          result.filename ||
          "recovered-file";


        const mime =
          result.mimeType ||
          "application/octet-stream";


        /*
        Reconstruct original file.
        */

        const blob =
          new Blob(
            [result.bytes],
            {
              type: mime
            }
          );


        /*
        Download reconstructed file.
        */

        downloadBlob(
          blob,
          outputName
        );


        /*
        Preview based ONLY on the
        MIME metadata stored inside BAXL.

        No file-signature detection.
        */

        if (
          mime.startsWith("image/")
        ) {

          const imageURL =
            URL.createObjectURL(blob);


          preview.src =
            imageURL;


          preview.style.display =
            "block";


        } else {

          preview.removeAttribute("src");

          preview.style.display =
            "none";

        }


        /*
        Status.
        */

        status.textContent =
          "Decoded successfully!\n\n" +

          "BAXL characters: " +
          text.length.toLocaleString() +

          "\n" +

          "Recovered bytes: " +
          result.bytes.length.toLocaleString() +

          "\n" +

          "Filename: " +
          outputName +

          "\n" +

          "MIME type: " +
          (
            mime ||
            "(none)"
          ) +

          "\n" +

          "BAXL version: " +
          result.version;


      } catch (error) {

        console.error(error);


        preview.style.display =
          "none";


        status.textContent =
          "DECODING ERROR\n\n" +
          error.message;

      }

    }
  );
