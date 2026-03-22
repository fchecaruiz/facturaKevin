/* ============================================================
   TOAST NORMAL (AZUL / ROJO)
============================================================ */
function showToast(message, type = "blue") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast show " + (type === "red" ? "toast-red" : "toast-blue");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

/* ============================================================
   TOAST DE CONFIRMACIÓN CON BOTONES
============================================================ */
let confirmAction = null;

function showConfirmToast(message, callback) {
  const box = document.getElementById("toastConfirm");
  const text = document.getElementById("toastConfirmText");
  text.textContent = message;
  confirmAction = callback;
  box.classList.add("show");
}

function hideConfirmToast() {
  const box = document.getElementById("toastConfirm");
  box.classList.remove("show");
  confirmAction = null;
}

document.getElementById("toastBtnYes").addEventListener("click", () => {
  if (confirmAction) confirmAction();
  hideConfirmToast();
});

document.getElementById("toastBtnNo").addEventListener("click", () => {
  hideConfirmToast();
  showToast("Operación cancelada", "blue");
});

/* ============================================================
   FORMATO Y UTILIDADES
============================================================ */
function formatoEuro(v) {
  return (Number(v) || 0).toFixed(2).replace(".", ",") + " €";
}

function obtenerNumero(id) {
  return Number(document.getElementById(id).value) || 0;
}

/* ============================================================
   PREPARAR ÁREA DE IMPRESIÓN (Mantiene valores de inputs)
============================================================ */
function prepararImpresion() {
  const printArea = document.getElementById("print-area");
  const appContainer = document.querySelector(".app-container");
  
  // Clonar el contenido
  printArea.innerHTML = appContainer.innerHTML;
  
  // Sincronizar valores de inputs/selects/textareas manualmente
  const originalInputs = appContainer.querySelectorAll("input, select, textarea");
  const clonedInputs = printArea.querySelectorAll("input, select, textarea");
  
  originalInputs.forEach((input, index) => {
    if (input.type === "checkbox") {
      clonedInputs[index].checked = input.checked;
    } else {
      clonedInputs[index].value = input.value;
    }
  });

  // Sincronizar los textos de los totales (que no son inputs)
  const IDsTotales = ["subtotal", "ivaRetenidoImporte", "ivaImporte", "total"];
  IDsTotales.forEach(id => {
    const original = document.getElementById(id).textContent;
    printArea.querySelector(`#${id}`).textContent = original;
  });

  window.print();
}

/* ============================================================
   INICIO DE LA APP
============================================================ */
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("fechaFactura").value = new Date().toISOString().slice(0, 10);

  generarNumeroFactura();
  cargarCuentasGuardadas();
  cargarClientesGuardados();
  limpiarCamposFactura();

  document.getElementById("btnRecalcular").onclick = recalcularTotales;
  document.getElementById("btnPDF").onclick = prepararImpresion;

  document.getElementById("btnGuardarCuenta").onclick = guardarCuenta;
  document.getElementById("btnEliminarCuenta").onclick = eliminarCuenta;
  document.getElementById("btnGuardarCliente").onclick = guardarCliente;
  document.getElementById("btnEliminarCliente").onclick = eliminarCliente;
  document.getElementById("clientesGuardados").onchange = rellenarClienteSeleccionado;

  [
    "cantidad", "importe", "desplazamientoImporte", "alojamientoImporte",
    "desplazamientoIncluido", "alojamientoIncluido",
    "ivaRetenido", "ivaAplicado"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", recalcularTotales);
  });

  document.getElementById("desplazamientoIncluido").addEventListener("change", () => {
    const input = document.getElementById("desplazamientoImporte");
    input.disabled = document.getElementById("desplazamientoIncluido").checked;
    if (input.disabled) input.value = 0;
    recalcularTotales();
  });

  document.getElementById("alojamientoIncluido").addEventListener("change", () => {
    const input = document.getElementById("alojamientoImporte");
    input.disabled = document.getElementById("alojamientoIncluido").checked;
    if (input.disabled) input.value = 0;
    recalcularTotales();
  });

  recalcularTotales();
});

/* ============================================================
   LIMPIAR CAMPOS
============================================================ */
function limpiarCamposFactura() {
  const campos = [
    "clienteNombre", "clienteEmail", "clienteDireccion", "clienteCP",
    "clienteLocalidad", "clienteProvincia", "clienteTelefono",
    "clienteDoc", "descripcionSesion", "importe", "cantidad",
    "desplazamientoImporte", "alojamientoImporte", "observaciones"
  ];
  campos.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("clienteTipoDoc").value = "DNI";
  document.getElementById("ivaRetenido").value = "0";
  document.getElementById("ivaAplicado").value = "21";
  document.getElementById("desplazamientoIncluido").checked = false;
  document.getElementById("alojamientoIncluido").checked = false;
  document.getElementById("desplazamientoImporte").disabled = false;
  document.getElementById("alojamientoImporte").disabled = false;
  recalcularTotales();
}

/* ============================================================
   LÓGICA DE NEGOCIO (Factura, Totales, Storage)
============================================================ */
function generarNumeroFactura() {
  const año = new Date().getFullYear();
  let contador = Number(localStorage.getItem("contadorFacturasKevin") || 1);
  document.getElementById("numeroFactura").value = `${contador}-${año}`;
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
  if (!document.getElementById("desplazamientoIncluido").checked) base += desplazamiento;
  if (!document.getElementById("alojamientoIncluido").checked) base += alojamiento;

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
  if (!select) return;
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
  document.getElementById("cuentaActual").value = cuentas[0];
  select.onchange = () => { document.getElementById("cuentaActual").value = select.value; };
}

function guardarCuenta() {
  const iban = document.getElementById("cuentaActual").value.trim();
  if (!iban) return showToast("Introduce un IBAN válido", "red");
  let cuentas = JSON.parse(localStorage.getItem("cuentasKevinDJ") || "[]");
  if (!cuentas.includes(iban)) cuentas.push(iban);
  localStorage.setItem("cuentasKevinDJ", JSON.stringify(cuentas));
  cargarCuentasGuardadas();
  showToast("Cuenta guardada correctamente", "blue");
}

function eliminarCuenta() {
  const select = document.getElementById("cuentasGuardadas");
  const iban = select.value;
  if (!iban) return showToast("No hay ninguna cuenta seleccionada", "red");
  showConfirmToast("¿Eliminar esta cuenta bancaria?", () => {
    let cuentas = JSON.parse(localStorage.getItem("cuentasKevinDJ") || "[]");
    cuentas = cuentas.filter(c => c !== iban);
    localStorage.setItem("cuentasKevinDJ", JSON.stringify(cuentas));
    cargarCuentasGuardadas();
    document.getElementById("cuentaActual").value = "";
    showToast("Cuenta eliminada", "red");
  });
}

function guardarCliente() {
  const cliente = {
    nombre: document.getElementById("clienteNombre").value.trim(),
    email: document.getElementById("clienteEmail").value.trim(),
    direccion: document.getElementById("clienteDireccion").value.trim(),
    cp: document.getElementById("clienteCP").value.trim(),
    localidad: document.getElementById("clienteLocalidad").value.trim(),
    provincia: document.getElementById("clienteProvincia").value.trim(),
    telefono: document.getElementById("clienteTelefono").value.trim(),
    tipoDoc: document.getElementById("clienteTipoDoc").value,
    doc: document.getElementById("clienteDoc").value.trim()
  };
  if (!cliente.nombre) return showToast("El cliente debe tener un nombre", "red");
  let clientes = JSON.parse(localStorage.getItem("clientesKevinDJ") || "[]");
  const existe = clientes.find(c => c.nombre === cliente.nombre);
  if (existe) Object.assign(existe, cliente);
  else clientes.push(cliente);
  localStorage.setItem("clientesKevinDJ", JSON.stringify(clientes));
  cargarClientesGuardados();
  showToast("Cliente guardado correctamente", "blue");
}

function cargarClientesGuardados() {
  const select = document.getElementById("clientesGuardados");
  if (!select) return;
  select.innerHTML = "";
  const clientes = JSON.parse(localStorage.getItem("clientesKevinDJ") || "[]");
  if (clientes.length === 0) {
    select.innerHTML = `<option value="">Sin clientes guardados</option>`;
    return;
  }
  clientes.forEach((c, i) => {
    const opt = document.createElement("option");
    opt.value = c.nombre;
    opt.textContent = `${i + 1} - ${c.nombre}`;
    select.appendChild(opt);
  });
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
  if (!nombre) return showToast("No hay ningún cliente seleccionado", "red");
  showConfirmToast("¿Eliminar este cliente?", () => {
    let clientes = JSON.parse(localStorage.getItem("clientesKevinDJ") || "[]");
    clientes = clientes.filter(c => c.nombre !== nombre);
    localStorage.setItem("clientesKevinDJ", JSON.stringify(clientes));
    cargarClientesGuardados();
    limpiarCamposFactura();
    showToast("Cliente eliminado", "red");
  });
}