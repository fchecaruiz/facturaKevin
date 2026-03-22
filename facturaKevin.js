/* TOASTS */
function showToast(message, type = "blue") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast show " + (type === "red" ? "toast-red" : "toast-blue");
  setTimeout(() => { toast.classList.remove("show"); }, 2500);
}

let confirmAction = null;
function showConfirmToast(message, callback) {
  const box = document.getElementById("toastConfirm");
  document.getElementById("toastConfirmText").textContent = message;
  confirmAction = callback;
  box.classList.add("show");
}
function hideConfirmToast() { document.getElementById("toastConfirm").classList.remove("show"); }

document.getElementById("toastBtnYes").onclick = () => { if (confirmAction) confirmAction(); hideConfirmToast(); };
document.getElementById("toastBtnNo").onclick = () => { hideConfirmToast(); showToast("Cancelado", "blue"); };

/* UTILIDADES */
function formatoEuro(v) { return (Number(v) || 0).toFixed(2).replace(".", ",") + " €"; }
function obtenerNumero(id) { return Number(document.getElementById(id).value) || 0; }

/* IMPRESIÓN */
function prepararImpresion() {
  const area = document.getElementById("print-area");
  const original = document.querySelector(".app-container");
  
  area.innerHTML = ""; 
  area.innerHTML = original.innerHTML; 
  
  const inputsOrig = original.querySelectorAll("input, select, textarea");
  const inputsClon = area.querySelectorAll("input, select, textarea");
  
  inputsOrig.forEach((inp, i) => {
    if (inp.type === "checkbox") inputsClon[i].checked = inp.checked;
    else inputsClon[i].value = inp.value;
  });

  window.print();
  
  setTimeout(() => { area.innerHTML = ""; }, 500);
}

/* LÓGICA DE LA APP */
function generarNumeroFactura() {
  const año = new Date().getFullYear();
  let contador = Number(localStorage.getItem("contadorFacturasKevin") || 1);
  document.getElementById("numeroFactura").value = `${contador}-${año}`;
}

function recalcularTotales() {
  const cantidad = obtenerNumero("cantidad");
  const importe = obtenerNumero("importe");
  const desplazamiento = obtenerNumero("desplazamientoImporte");
  const alojamiento = obtenerNumero("alojamientoImporte");

  let base = cantidad * importe;
  if (!document.getElementById("desplazamientoIncluido").checked) base += desplazamiento;
  if (!document.getElementById("alojamientoIncluido").checked) base += alojamiento;

  const ivaRetImporte = base * obtenerNumero("ivaRetenido") / 100;
  const ivaImporte = base * obtenerNumero("ivaAplicado") / 100;
  const total = base - ivaRetImporte + ivaImporte;

  document.getElementById("subtotal").textContent = formatoEuro(base);
  document.getElementById("ivaRetenidoImporte").textContent = formatoEuro(ivaRetImporte);
  document.getElementById("ivaImporte").textContent = formatoEuro(ivaImporte);
  document.getElementById("total").textContent = formatoEuro(total);
}

/* CUENTAS */
function cargarCuentasGuardadas() {
  const select = document.getElementById("cuentasGuardadas");
  const cuentas = JSON.parse(localStorage.getItem("cuentasKevinDJ") || "[]");
  select.innerHTML = cuentas.length ? "" : '<option value="">Sin cuentas</option>';
  cuentas.forEach(iban => {
    const opt = document.createElement("option");
    opt.value = iban; opt.textContent = iban;
    select.appendChild(opt);
  });
  if (cuentas.length) document.getElementById("cuentaActual").value = cuentas[0];
  select.onchange = () => { document.getElementById("cuentaActual").value = select.value; };
}

function guardarCuenta() {
  const iban = document.getElementById("cuentaActual").value.trim();
  if (!iban) return showToast("IBAN vacío", "red");
  let cuentas = JSON.parse(localStorage.getItem("cuentasKevinDJ") || "[]");
  if (!cuentas.includes(iban)) cuentas.push(iban);
  localStorage.setItem("cuentasKevinDJ", JSON.stringify(cuentas));
  cargarCuentasGuardadas(); showToast("Cuenta guardada");
}

function eliminarCuenta() {
  const iban = document.getElementById("cuentasGuardadas").value;
  if (!iban) return;
  showConfirmToast("¿Eliminar cuenta?", () => {
    let cuentas = JSON.parse(localStorage.getItem("cuentasKevinDJ") || "[]");
    cuentas = cuentas.filter(c => c !== iban);
    localStorage.setItem("cuentasKevinDJ", JSON.stringify(cuentas));
    cargarCuentasGuardadas(); showToast("Eliminada", "red");
  });
}

/* CLIENTES */
function cargarClientesGuardados() {
  const select = document.getElementById("clientesGuardados");
  const clientes = JSON.parse(localStorage.getItem("clientesKevinDJ") || "[]");
  select.innerHTML = clientes.length ? "" : '<option value="">Sin clientes</option>';
  clientes.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.nombre; opt.textContent = c.nombre;
    select.appendChild(opt);
  });
}

function guardarCliente() {
  const nombre = document.getElementById("clienteNombre").value.trim();
  if (!nombre) return showToast("Nombre obligatorio", "red");
  const cliente = {
    nombre,
    email: document.getElementById("clienteEmail").value,
    direccion: document.getElementById("clienteDireccion").value,
    cp: document.getElementById("clienteCP").value,
    localidad: document.getElementById("clienteLocalidad").value,
    provincia: document.getElementById("clienteProvincia").value,
    telefono: document.getElementById("clienteTelefono").value,
    tipoDoc: document.getElementById("clienteTipoDoc").value,
    doc: document.getElementById("clienteDoc").value
  };
  let clientes = JSON.parse(localStorage.getItem("clientesKevinDJ") || "[]");
  const idx = clientes.findIndex(c => c.nombre === nombre);
  if (idx > -1) clientes[idx] = cliente; else clientes.push(cliente);
  localStorage.setItem("clientesKevinDJ", JSON.stringify(clientes));
  cargarClientesGuardados(); showToast("Cliente guardado");
}

function rellenarClienteSeleccionado() {
  const nombre = document.getElementById("clientesGuardados").value;
  const clientes = JSON.parse(localStorage.getItem("clientesKevinDJ") || "[]");
  const c = clientes.find(x => x.nombre === nombre);
  if (!c) return;
  document.getElementById("clienteNombre").value = c.nombre;
  document.getElementById("clienteEmail").value = c.email;
  document.getElementById("clienteDireccion").value = c.direccion;
  document.getElementById("clienteCP").value = c.cp;
  document.getElementById("clienteLocalidad").value = c.localidad;
  document.getElementById("clienteProvincia").value = c.provincia;
  document.getElementById("clienteTelefono").value = c.telefono;
  document.getElementById("clienteTipoDoc").value = c.tipoDoc;
  document.getElementById("clienteDoc").value = c.doc;
}

function eliminarCliente() {
  const nombre = document.getElementById("clientesGuardados").value;
  if (!nombre) return;
  showConfirmToast("¿Eliminar cliente?", () => {
    let clientes = JSON.parse(localStorage.getItem("clientesKevinDJ") || "[]");
    clientes = clientes.filter(c => c.nombre !== nombre);
    localStorage.setItem("clientesKevinDJ", JSON.stringify(clientes));
    cargarClientesGuardados(); showToast("Eliminado", "red");
  });
}

/* INICIO */
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("fechaFactura").value = new Date().toISOString().slice(0, 10);
  generarNumeroFactura();
  cargarCuentasGuardadas();
  cargarClientesGuardados();
  
  document.getElementById("btnRecalcular").onclick = recalcularTotales;
  document.getElementById("btnPDF").onclick = prepararImpresion;
  document.getElementById("btnGuardarCuenta").onclick = guardarCuenta;
  document.getElementById("btnEliminarCuenta").onclick = eliminarCuenta;
  document.getElementById("btnGuardarCliente").onclick = guardarCliente;
  document.getElementById("btnEliminarCliente").onclick = eliminarCliente;
  document.getElementById("clientesGuardados").onchange = rellenarClienteSeleccionado;

  ["cantidad", "importe", "ivaRetenido", "ivaAplicado", "desplazamientoImporte", "alojamientoImporte", "desplazamientoIncluido", "alojamientoIncluido"].forEach(id => {
    document.getElementById(id).addEventListener("input", recalcularTotales);
  });
  recalcularTotales();
});