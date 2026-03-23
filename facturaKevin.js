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

document.getElementById("toastBtnYes").addEventListener("click", () => { if (confirmAction) confirmAction(); hideConfirmToast(); });
document.getElementById("toastBtnNo").addEventListener("click", () => { hideConfirmToast(); showToast("Operación cancelada", "blue"); });

/* HELPERS */
function formatoEuro(v) { return (Number(v) || 0).toFixed(2).replace(".", ",") + " €"; }
function obtenerNumero(id) { return Number(document.getElementById(id).value) || 0; }
function obtenerTexto(id) { return document.getElementById(id).value || ""; }

/* CÁLCULOS */
function recalcularTotales() {
  const cantidad = obtenerNumero("cantidad");
  const importe = obtenerNumero("importe");
  const desplazamiento = obtenerNumero("desplazamientoImporte");
  const alojamiento = obtenerNumero("alojamientoImporte");

  let base = cantidad * importe;
  if (!document.getElementById("desplazamientoIncluido").checked) base += desplazamiento;
  if (!document.getElementById("alojamientoIncluido").checked) base += alojamiento;

  const ret = base * obtenerNumero("ivaRetenido") / 100;
  const iva = base * obtenerNumero("ivaAplicado") / 100;

  document.getElementById("subtotal").textContent = formatoEuro(base);
  document.getElementById("ivaRetenidoImporte").textContent = formatoEuro(ret);
  document.getElementById("ivaImporte").textContent = formatoEuro(iva);
  document.getElementById("total").textContent = formatoEuro(base - ret + iva);
}

/* PDF / IMPRESIÓN */
function prepararImpresion() {
  const area = document.getElementById("print-area");

  area.innerHTML = `
    <div class="print-header">
      <h1>KEVIN CHECA</h1>
      <img src="logo-kevin.png" class="print-logo">
    </div>

    <div class="print-card">
      <div class="print-section-title">DATOS DEL EMISOR</div>
      <div class="print-grid-2">
        <div><div class="print-label">Nombre / Razón Social</div><div class="print-value">${obtenerTexto("emisorNombre")}</div></div>
        <div><div class="print-label">NIF</div><div class="print-value">${obtenerTexto("emisorNif")}</div></div>
      </div>
      <div class="print-grid-3">
        <div><div class="print-label">Dirección</div><div class="print-value">${obtenerTexto("emisorDireccion")}</div></div>
        <div><div class="print-label">Localidad</div><div class="print-value">${obtenerTexto("emisorLocalidad")}</div></div>
        <div><div class="print-label">Provincia</div><div class="print-value">${obtenerTexto("emisorProvincia")}</div></div>
      </div>
      <div class="print-grid-3">
        <div><div class="print-label">Código Postal</div><div class="print-value">${obtenerTexto("emisorCP")}</div></div>
        <div><div class="print-label">Email</div><div class="print-value">${obtenerTexto("emisorEmail")}</div></div>
        <div><div class="print-label">Fecha Factura</div><div class="print-value">${obtenerTexto("fechaFactura")}</div></div>
      </div>
      <div><div class="print-label">Nº Factura</div><div class="print-value">${obtenerTexto("numeroFactura")}</div></div>
    </div>

    <div class="print-card">
      <div class="print-section-title">DATOS DEL CLIENTE</div>
      <div class="print-grid-2">
        <div><div class="print-label">Nombre / Razón Social</div><div class="print-value">${obtenerTexto("clienteNombre")}</div></div>
        <div><div class="print-label">Email</div><div class="print-value">${obtenerTexto("clienteEmail")}</div></div>
      </div>
      <div class="print-grid-3">
        <div><div class="print-label">Dirección</div><div class="print-value">${obtenerTexto("clienteDireccion")}</div></div>
        <div><div class="print-label">Código Postal</div><div class="print-value">${obtenerTexto("clienteCP")}</div></div>
        <div><div class="print-label">Localidad</div><div class="print-value">${obtenerTexto("clienteLocalidad")}</div></div>
      </div>
      <div class="print-grid-2">
        <div><div class="print-label">Provincia</div><div class="print-value">${obtenerTexto("clienteProvincia")}</div></div>
        <div><div class="print-label">Teléfono</div><div class="print-value">${obtenerTexto("clienteTelefono")}</div></div>
      </div>
      <div class="print-grid-2">
        <div><div class="print-label">Tipo Doc.</div><div class="print-value">${obtenerTexto("clienteTipoDoc")}</div></div>
        <div><div class="print-label">Nº Doc.</div><div class="print-value">${obtenerTexto("clienteDoc")}</div></div>
      </div>
    </div>

    <div class="print-card">
      <div class="print-section-title">DETALLES DEL SERVICIO</div>
      <div><div class="print-label">Descripción</div><div class="print-value">${obtenerTexto("descripcionSesion")}</div></div>

      <div class="print-grid-3">
        <div><div class="print-label">Cantidad</div><div class="print-value">${obtenerTexto("cantidad")}</div></div>
        <div><div class="print-label">Importe Unitario</div><div class="print-value">${formatoEuro(obtenerNumero("importe"))}</div></div>
        <div><div class="print-label">Día Sesión</div><div class="print-value">${obtenerTexto("diaSesion")}</div></div>
      </div>

      <div class="print-grid-2">
        <div><div class="print-label">Desplazamiento</div><div class="print-value">${document.getElementById("desplazamientoIncluido").checked ? "Incluido" : formatoEuro(obtenerNumero("desplazamientoImporte"))}</div></div>
        <div><div class="print-label">Alojamiento</div><div class="print-value">${document.getElementById("alojamientoIncluido").checked ? "Incluido" : formatoEuro(obtenerNumero("alojamientoImporte"))}</div></div>
      </div>

      <div class="print-totales">
        <div class="print-total-row"><span>Subtotal:</span> <span>${document.getElementById("subtotal").textContent}</span></div>
        <div class="print-total-row"><span>IVA Retenido (${obtenerTexto("ivaRetenido")}%):</span> <span>${document.getElementById("ivaRetenidoImporte").textContent}</span></div>
        <div class="print-total-row"><span>IVA (${obtenerTexto("ivaAplicado")}%):</span> <span>${document.getElementById("ivaImporte").textContent}</span></div>
        <div class="print-total-row print-total-final"><span>TOTAL:</span> <span>${document.getElementById("total").textContent}</span></div>
      </div>
    </div>

    <div class="print-grid-2">
      <div class="print-card">
        <div class="print-section-title">OBSERVACIONES</div>
        <div class="print-value" style="border:none; font-size:10px;">${obtenerTexto("observaciones")}</div>
      </div>
      <div class="print-card">
        <div class="print-section-title">CUENTA BANCARIA</div>
        <div class="print-label">IBAN</div>
        <div class="print-value" style="font-size:11px; font-weight:bold;">${obtenerTexto("cuentaActual")}</div>
      </div>
    </div>

    <div class="print-footer">¡KEVIN CHECA AGRADECE SU CONFIANZA!</div>
  `;

  guardarFacturaEnHistorial();
  window.print();

  let contador = parseInt(localStorage.getItem("contadorFacturasKevin") || "1");
  contador++;
  localStorage.setItem("contadorFacturasKevin", contador);
  document.getElementById("numeroFactura").value = `${contador}-${new Date().getFullYear()}`;
  showToast("Factura generada. Próximo número: " + contador, "blue");
}

/* LIMPIEZAS */
function limpiarFormularioCliente() {
  const campos = ["Nombre", "Email", "Direccion", "CP", "Localidad", "Provincia", "Telefono", "Doc"];
  campos.forEach(c => document.getElementById("cliente" + c).value = "");
  document.getElementById("clienteTipoDoc").value = "DNI";
}

function limpiarFormularioCompleto() {
  limpiarFormularioCliente();
  document.getElementById("descripcionSesion").value = "";
  document.getElementById("cantidad").value = "1";
  document.getElementById("importe").value = "";
  document.getElementById("diaSesion").value = "";
  document.getElementById("desplazamientoIncluido").checked = false;
  document.getElementById("desplazamientoImporte").value = "";
  document.getElementById("alojamientoIncluido").checked = false;
  document.getElementById("alojamientoImporte").value = "";
  document.getElementById("ivaRetenido").value = "0";
  document.getElementById("ivaAplicado").value = "21";
  document.getElementById("observaciones").value = "";
  document.getElementById("fechaFactura").value = new Date().toISOString().slice(0, 10);

  recalcularTotales();
  showToast("Formulario limpiado", "blue");

  // Cursor al nombre del cliente
  document.getElementById("clienteNombre").focus();
}

/* CUENTAS */
function cargarCuentas() {
  const select = document.getElementById("cuentasGuardadas");
  const cuentas = JSON.parse(localStorage.getItem("cuentasKevinDJ") || "[]");
  select.innerHTML = '<option value="">Seleccionar cuenta...</option>';
  cuentas.forEach(iban => {
    const opt = document.createElement("option");
    opt.value = iban;
    opt.textContent = iban;
    select.appendChild(opt);
  });
  if (cuentas.length) document.getElementById("cuentaActual").value = cuentas[0];
}

function guardarCuenta() {
  const iban = document.getElementById("cuentaActual").value.trim();
  if (!iban) return showToast("IBAN requerido", "red");
  let cuentas = JSON.parse(localStorage.getItem("cuentasKevinDJ") || "[]");
  if (!cuentas.includes(iban)) cuentas.push(iban);
  localStorage.setItem("cuentasKevinDJ", JSON.stringify(cuentas));
  document.getElementById("cuentaActual").value = "";
  cargarCuentas();
  showToast("Cuenta guardada", "blue");
}

function eliminarCuenta() {
  const iban = document.getElementById("cuentasGuardadas").value;
  if (!iban) return;
  showConfirmToast("¿Eliminar esta cuenta?", () => {
    let cuentas = JSON.parse(localStorage.getItem("cuentasKevinDJ") || "[]").filter(c => c !== iban);
    localStorage.setItem("cuentasKevinDJ", JSON.stringify(cuentas));
    document.getElementById("cuentaActual").value = "";
    cargarCuentas();
    showToast("Cuenta eliminada", "red");
  });
}

/* CLIENTES */
function cargarClientes() {
  const select = document.getElementById("clientesGuardados");
  const clientes = JSON.parse(localStorage.getItem("clientesKevinDJ") || "[]");
  select.innerHTML = '<option value="">Seleccionar cliente...</option>';
  clientes.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.nombre;
    opt.textContent = c.nombre;
    select.appendChild(opt);
  });
}

function guardarCliente() {
  const nombre = document.getElementById("clienteNombre").value.trim();
  if (!nombre) return showToast("Nombre requerido", "red");

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
  if (idx > -1) clientes[idx] = cliente;
  else clientes.push(cliente);

  localStorage.setItem("clientesKevinDJ", JSON.stringify(clientes));

  cargarClientes();
  showToast("Cliente guardado", "blue");
}

function rellenarCliente() {
  const nombre = document.getElementById("clientesGuardados").value;
  if (!nombre) {
    limpiarFormularioCliente();
    return;
  }

  const clientes = JSON.parse(localStorage.getItem("clientesKevinDJ") || "[]");
  const c = clientes.find(x => x.nombre === nombre);
  if (!c) return;

  document.getElementById("clienteNombre").value = c.nombre || "";
  document.getElementById("clienteEmail").value = c.email || "";
  document.getElementById("clienteDireccion").value = c.direccion || "";
  document.getElementById("clienteCP").value = c.cp || "";
  document.getElementById("clienteLocalidad").value = c.localidad || "";
  document.getElementById("clienteProvincia").value = c.provincia || "";
  document.getElementById("clienteTelefono").value = c.telefono || "";
  document.getElementById("clienteTipoDoc").value = c.tipoDoc || "DNI";
  document.getElementById("clienteDoc").value = c.doc || "";
}

function eliminarCliente() {
  const nombre = document.getElementById("clientesGuardados").value;
  if (!nombre) return;
  showConfirmToast("¿Eliminar este cliente?", () => {
    let clientes = JSON.parse(localStorage.getItem("clientesKevinDJ") || "[]").filter(c => c.nombre !== nombre);
    localStorage.setItem("clientesKevinDJ", JSON.stringify(clientes));
    limpiarFormularioCliente();
    cargarClientes();
    showToast("Cliente eliminado", "red");
  });
}

/* HISTORIAL */
function guardarFacturaEnHistorial() {
  const factura = {
    numero: obtenerTexto("numeroFactura"),
    fecha: obtenerTexto("fechaFactura"),
    cliente: obtenerTexto("clienteNombre"),
    total: document.getElementById("total").textContent,
    descripcion: obtenerTexto("descripcionSesion"),
    diaSesion: obtenerTexto("diaSesion"),
    timestamp: new Date().toISOString()
  };
  let historial = JSON.parse(localStorage.getItem("historialFacturasKevin") || "[]");
  historial.push(factura);
  localStorage.setItem("historialFacturasKevin", JSON.stringify(historial));
}

function mostrarHistorial() {
  const modal = document.getElementById("modalHistorial");
  const lista = document.getElementById("listaHistorial");
  const historial = JSON.parse(localStorage.getItem("historialFacturasKevin") || "[]");

  if (historial.length === 0) {
    lista.innerHTML = '<div class="historial-vacio">No hay facturas en el historial</div>';
  } else {
    lista.innerHTML = historial.slice().reverse().map(f => `
      <div class="factura-item">
        <div class="factura-header">
          <span class="factura-numero">Factura ${f.numero}</span>
          <span class="factura-fecha">${f.fecha}</span>
        </div>
        <div class="factura-info">
          <div class="factura-campo"><strong>Cliente:</strong> ${f.cliente || "Sin especificar"}</div>
          <div class="factura-campo"><strong>Descripción:</strong> ${f.descripcion || "Sin descripción"}</div>
        </div>
        <div class="factura-total">Total: ${f.total}</div>
      </div>
    `).join("");
  }
  modal.classList.add("show");
}

function cerrarHistorial() {
  document.getElementById("modalHistorial").classList.remove("show");
}

/* INIT */
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("fechaFactura").value = new Date().toISOString().slice(0, 10);

  cargarCuentas();
  cargarClientes();

  const contador = localStorage.getItem("contadorFacturasKevin") || 1;
  document.getElementById("numeroFactura").value = `${contador}-${new Date().getFullYear()}`;

  document.getElementById("btnNuevaFactura").onclick = limpiarFormularioCompleto;
  document.getElementById("btnPDF").onclick = prepararImpresion;

  document.getElementById("btnGuardarCuenta").onclick = guardarCuenta;
  document.getElementById("btnEliminarCuenta").onclick = eliminarCuenta;

  document.getElementById("btnGuardarCliente").onclick = guardarCliente;
  document.getElementById("btnEliminarCliente").onclick = eliminarCliente;

  // Relleno inmediato al seleccionar
  document.getElementById("clientesGuardados").addEventListener("change", rellenarCliente);

  // Cambiar cuenta seleccionada -> input
  document.getElementById("cuentasGuardadas").addEventListener("change", function () {
    document.getElementById("cuentaActual").value = this.value;
  });

  document.getElementById("btnVerHistorial").onclick = mostrarHistorial;
  document.getElementById("btnCerrarHistorial").onclick = cerrarHistorial;

  document.getElementById("modalHistorial").onclick = function (e) {
    if (e.target === this) cerrarHistorial();
  };

  document.querySelectorAll("input, select, textarea").forEach(el => {
    el.addEventListener("input", recalcularTotales);
  });

  recalcularTotales();
});