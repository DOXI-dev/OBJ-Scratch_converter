let selectedObjFile = null;
let selectedMtlFile = null;
let generatedTxtContent = ""; 

const inputObj = document.getElementById("input-obj");
const inputMtl = document.getElementById("input-mtl");
const btnDownload = document.getElementById("btn-download");

inputObj.addEventListener("change", function(event) {
    if (event.target.files.length > 0) {
        selectedObjFile = event.target.files[0];
        document.getElementById("status-obj").innerText = selectedObjFile.name;
        checkAndConvertFiles();
    }
});

inputMtl.addEventListener("change", function(event) {
    if (event.target.files.length > 0) {
        selectedMtlFile = event.target.files[0];
        document.getElementById("status-mtl").innerText = selectedMtlFile.name;
        checkAndConvertFiles();
    }
});

function processAutomaticData(objString, mtlString) {
    try {
        generatedTxtContent = convertObjMtlToColumnTxt(objString, mtlString);
        if (btnDownload) {
            btnDownload.innerText = "Download TXT";
            btnDownload.disabled = false;
        }
    } catch (error) {
        console.error("Conversion failed:", error);
        if (btnDownload) {
            btnDownload.innerText = "Error during conversion";
            btnDownload.disabled = true;
        }
    }
}
function checkAndConvertFiles() {
    if (selectedObjFile && selectedMtlFile) {
        console.log("Both files detected! Starting automatic text extraction...");
        
        const readerObj = new FileReader();
        readerObj.onload = function(eventObj) {
            const rawTextObj = eventObj.target.result;
            
            const readerMtl = new FileReader();
            readerMtl.onload = function(eventMtl) {
                const rawTextMtl = eventMtl.target.result;
                processAutomaticData(rawTextObj, rawTextMtl);
            };
            readerMtl.readAsText(selectedMtlFile);
        };
        readerObj.readAsText(selectedObjFile);
    }
}

function downloadResultFile() {
    if (!generatedTxtContent) return;

    const blob = new Blob([generatedTxtContent], { type: "text/plain;charset=utf-8" });
    const fictionalLink = document.createElement("a");
    fictionalLink.href = URL.createObjectURL(blob);
    fictionalLink.download = "ASSET.txt";

    document.body.appendChild(fictionalLink);
    fictionalLink.click();
    document.body.removeChild(fictionalLink);
}

function hexToHsl(hex) {
  let r = parseInt(hex.substring(1, 3), 16) / 255;
  let g = parseInt(hex.substring(3, 5), 16) / 255;
  let b = parseInt(hex.substring(5, 7), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    saturation: Math.round(s * 100),
    brightness: Math.round(l * 100)
  };
}

function rgbToHex(r, g, b) {
  const toHex = (c) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function parseMTL(mtlText) {
  const materials = {};
  let currentMat = null;

  const lines = mtlText.split('\n');
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('newmtl ')) {
      currentMat = line.split(/\s+/)[1];
      materials[currentMat] = { hex: '#ffffff', saturation: 0, brightness: 100 };
    } else if (line.startsWith('Kd ') && currentMat) {
      const parts = line.split(/\s+/);
      const r = parseFloat(parts[1]);
      const g = parseFloat(parts[2]);
      const b = parseFloat(parts[3]);
      
      const hex = rgbToHex(r, g, b);
      const { saturation, brightness } = hexToHsl(hex);
      
      materials[currentMat] = { hex, saturation, brightness };
    }
  }
  return materials;
}

function convertObjMtlToColumnTxt(objText, mtlText) {
  const materials = parseMTL(mtlText);
  const vertices = [];
  const outputValues = [];
  let currentMaterial = { hex: '#ffffff', saturation: 0, brightness: 100 };

  const lines = objText.split('\n');

  for (let line of lines) {
    line = line.trim();

    if (line.startsWith('v ')) {
      const parts = line.split(/\s+/);
      vertices.push({
        x: parseFloat(parts[1]),
        y: parseFloat(parts[2]),
        z: parseFloat(parts[3])
      });
    } 
    else if (line.startsWith('usemtl ')) {
      const matName = line.split(/\s+/)[1];
      if (materials[matName]) {
        currentMaterial = materials[matName];
      }
    } 
    else if (line.startsWith('f ')) {
      const parts = line.split(/\s+/).slice(1);
      const vIndices = parts.map(p => parseInt(p.split('/')[0]) - 1);

      if (vIndices.length === 3) {
        const p1 = vertices[vIndices[0]];
        const p2 = vertices[vIndices[1]];
        const p3 = vertices[vIndices[2]];

        outputValues.push(
          p1.x, p1.y, p1.z,
          p2.x, p2.y, p2.z,
          p3.x, p3.y, p3.z,
          currentMaterial.hex,
          currentMaterial.saturation,
          currentMaterial.brightness
        );
      }
    }
  }

  return outputValues.join('\n');
}
