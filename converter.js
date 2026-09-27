/*
    BAXL Converter
    ---------------
    File <-> BAXL

    The BAXL alphabet is:

    U+0020 - U+007E
    U+00A1 - U+00FF
    U+0100 - U+0141

    This gives us a reversible text representation of
    arbitrary binary data.
*/


// ---------------------------------------------------------
// BAXL ALPHABET
// ---------------------------------------------------------

const alphabet = [];

for (let i = 0x0020; i <= 0x007E; i++) {
    alphabet.push(String.fromCharCode(i));
}

for (let i = 0x00A1; i <= 0x00FF; i++) {
    alphabet.push(String.fromCharCode(i));
}

for (let i = 0x0100; i <= 0x0141; i++) {
    alphabet.push(String.fromCharCode(i));
}


// ---------------------------------------------------------
// CREATE REVERSE LOOKUP
// ---------------------------------------------------------

const reverseAlphabet = new Map();

alphabet.forEach((character, index) => {
    reverseAlphabet.set(character, index);
});


// ---------------------------------------------------------
// ENCODE BINARY → BAXL
// ---------------------------------------------------------

function encodeBAXL(bytes) {

    let output = "";

    for (const byte of bytes) {

        output += alphabet[byte];

    }

    return output;
}


// ---------------------------------------------------------
// DECODE BAXL → BINARY
// ---------------------------------------------------------

function decodeBAXL(text) {

    const bytes = new Uint8Array(text.length);

    for (let i = 0; i < text.length; i++) {

        const character = text[i];

        const value = reverseAlphabet.get(character);

        if (value === undefined) {
            throw new Error(
                `Invalid BAXL character at position ${i}: ${character}`
            );
        }

        bytes[i] = value;
    }

    return bytes;
}


// ---------------------------------------------------------
// DOWNLOAD BLOB
// ---------------------------------------------------------

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


// ---------------------------------------------------------
// FILE → BAXL
// ---------------------------------------------------------

document
    .getElementById("encodeButton")
    .addEventListener("click", async () => {

        const input =
            document.getElementById("encodeFile");

        const file = input.files[0];

        if (!file) {
            alert("Choose a file first.");
            return;
        }

        try {

            const buffer =
                await file.arrayBuffer();

            const bytes =
                new Uint8Array(buffer);

            const baxl =
                encodeBAXL(bytes);

            const blob =
                new Blob([baxl], {
                    type: "text/plain;charset=utf-8"
                });

            const filename =
                file.name + ".baxl";

            downloadBlob(blob, filename);

        } catch (error) {

            console.error(error);

            alert(
                "Something went wrong while creating the BAXL file."
            );
        }
    });


// ---------------------------------------------------------
// IMAGE TYPE DETECTION
// ---------------------------------------------------------

function detectImageType(bytes) {

    // JPEG
    if (
        bytes.length >= 3 &&
        bytes[0] === 0xFF &&
        bytes[1] === 0xD8 &&
        bytes[2] === 0xFF
    ) {
        return "image/jpeg";
    }


    // PNG
    if (
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
        return "image/png";
    }


    // GIF
    if (
        bytes.length >= 6 &&
        bytes[0] === 0x47 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x38
    ) {
        return "image/gif";
    }


    return null;
}


// ---------------------------------------------------------
// BAXL → ORIGINAL FILE
// ---------------------------------------------------------

document
    .getElementById("decodeButton")
    .addEventListener("click", async () => {

        const input =
            document.getElementById("decodeFile");

        const file = input.files[0];

        const status =
            document.getElementById("status");

        const preview =
            document.getElementById("preview");


        if (!file) {

            alert("Choose a .baxl file first.");

            return;
        }


        try {

            status.textContent =
                "Reading BAXL file...";


            /*
                IMPORTANT:

                Read as text without trimming it.

                Spaces are valid BAXL characters,
                so trim() must NOT be used.
            */

            const text =
                await file.text();


            status.textContent =
                "Decoding BAXL...";


            const bytes =
                decodeBAXL(text);


            const imageType =
                detectImageType(bytes);


            let outputType =
                imageType || "application/octet-stream";


            let originalName =
                file.name.replace(/\.baxl$/i, "");


            const blob =
                new Blob([bytes], {
                    type: outputType
                });


            // -------------------------------------------------
            // IMAGE PREVIEW
            // -------------------------------------------------

            if (imageType) {

                const imageURL =
                    URL.createObjectURL(blob);

                preview.src = imageURL;

                preview.style.display = "block";

                status.textContent =
                    "Image successfully recovered.";

            } else {

                preview.style.display = "none";

                status.textContent =
                    "File successfully recovered.";
            }


            // -------------------------------------------------
            // DOWNLOAD
            // -------------------------------------------------

            downloadBlob(
                blob,
                originalName
            );


        } catch (error) {

            console.error(error);

            preview.style.display = "none";

            status.textContent =
                "Error: " + error.message;
        }
    });
