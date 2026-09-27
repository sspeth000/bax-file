const baxlFile = document.getElementById("baxlFile");
const outputImage = document.getElementById("outputImage");

baxlFile.addEventListener("change", async () => {
    const file = baxlFile.files[0];

    if (!file) return;

    try {
        // Read the .baxl file as text
        const text = await file.text();

        // Convert the text back into hex
        const hex = textToHex(text);

        // Convert hex into image bytes
        const bytes = hexToBytes(hex);

        // Create an image from those bytes
        const blob = new Blob([bytes], {
            type: detectImageType(bytes)
        });

        // Display the recovered image
        outputImage.src = URL.createObjectURL(blob);

    } catch (error) {
        console.error("BAXL conversion failed:", error);
        alert("Could not convert this BAXL file.");
    }
});


function textToHex(text) {
    let hex = "";

    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);

        hex += code.toString(16).padStart(2, "0");
    }

    return hex;
}


function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);

    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }

    return bytes;
}


function detectImageType(bytes) {
    // JPEG
    if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
        return "image/jpeg";
    }

    // PNG
    if (
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4E &&
        bytes[3] === 0x47
    ) {
        return "image/png";
    }

    // GIF
    if (
        bytes[0] === 0x47 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46
    ) {
        return "image/gif";
    }

    return "application/octet-stream";
}
