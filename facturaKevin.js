function formatoEuro(v) {
  return (Number(v) || 0).toFixed(2).replace(".", ",") + " €";
}

function obtenerNumero(id) {
  return Number(document.getElementById(id).value) || 0;
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("fechaFactura").value =
    new Date().toISOString().slice(0, 10);

  generarNumeroFactura();
  cargarCuentasGuardadas();

  document.getElementById("btnRecalcular").onclick = recalcularTotales;
  document.getElementById("btnPDF").onclick = () => window.print();
  document.getElementById("btnGuardarCuenta").onclick = guardarCuenta;

  [
    "cantidad", "importe", "desplazamientoImporte", "alojamientoImporte",
    "desplazamientoIncluido", "alojamientoIncluido",
    "ivaRetenido", "ivaAplicado"
  ].forEach(id => {
    document.getElementById(id).addEventListener("input", recalcularTotales);
  });

  // 🔥 NUEVO: bloquear importes si se marca "incluido"
  document.getElementById("desplazamientoIncluido").addEventListener("change", () => {
    const input = document.getElementById("desplazamientoImporte");
    if (document.getElementById("desplazamientoIncluido").checked) {
      input.value = 0;
      input.disabled = true;
    } else {
      input.disabled = false;
    }
    recalcularTotales();
  });

  document.getElementById("alojamientoIncluido").addEventListener("change", () => {
    const input = document.getElementById("alojamientoImporte");
    if (document.getElementById("alojamientoIncluido").checked) {
      input.value = 0;
      input.disabled = true;
    } else {
      input.disabled = false;
    }
    recalcularTotales();
  });

  recalcularTotales();
});

function generarNumeroFactura() {
  const año = new Date().getFullYear();
  let contador = Number(localStorage.getItem("contadorFacturasKevin") || 1);

  const numero = `${contador}-${año}`;
  document.getElementById("numeroFactura").value = numero;

  localStorage.setItem("contadorFacturasKevin", contador + 1);
}

function recalcularTotales() {
  const cantidad = obtenerNumero("cantidad");
  const importe = obtenerNumero("importe");
  const desplazamiento = obtenerNumero("desplazamientoImporte");
  const alojamiento = obtenerNumero("alojamientoImporte");

  const ivaRet = obtenerNumero("ivaRetenido");
  const ivaApl = obtenerNumero("ivaAplicado");

  let base = cantidad * importe;

  if (document.getElementById("desplazamientoIncluido").checked)
    base += 0;
  else
    base += desplazamiento;

  if (document.getElementById("alojamientoIncluido").checked)
    base += 0;
  else
    base += alojamiento;

  const subtotal = base;
  const ivaRetImporte = subtotal * ivaRet / 100;
  const ivaImporte = subtotal * ivaApl / 100;
  const total = subtotal - ivaRetImporte + ivaImporte;

  document.getElementById("subtotal").textContent = formatoEuro(subtotal);
  document.getElementById("ivaRetenidoImporte").textContent = formatoEuro(ivaRetImporte);
  document.getElementById("ivaImporte").textContent = formatoEuro(ivaImporte);
  document.getElementById("total").textContent = formatoEuro(total);
}

function cargarCuentasGuardadas() {
  const select = document.getElementById("cuentasGuardadas");
  select.innerHTML = "";

  const cuentas = JSON.parse(localStorage.getItem("cuentasKevinDJ") || "[]");

  if (cuentas.length === 0) {
    select.innerHTML = `<option value="">Sin cuentas guardadas</option>`;
    return;
  }

  cuentas.forEach((iban, i) => {
    const opt = document.createElement("option");
    opt.value = iban;
    opt.textContent = `${i + 1} - ${iban}`;
    select.appendChild(opt);
  });

  select.selectedIndex = 0;
  document.getElementById("cuentaActual").value = cuentas[0];

  select.onchange = () => {
    document.getElementById("cuentaActual").value = select.value;
  };
}

function guardarCuenta() {
  const iban = document.getElementById("cuentaActual").value.trim();
  if (!iban) return alert("Introduce un IBAN válido.");

  let cuentas = JSON.parse(localStorage.getItem("cuentasKevinDJ") || "[]");

  if (!cuentas.includes(iban)) cuentas.push(iban);

  localStorage.setItem("cuentasKevinDJ", JSON.stringify(cuentas));
  cargarCuentasGuardadas();
  alert("Cuenta guardada correctamente.");
}