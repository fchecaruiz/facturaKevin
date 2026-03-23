// 1. CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDbDypH0jS5Oo-0FZgzh-nySHu1u2-oCwg",
  authDomain: "facturakevin-34ff5.firebaseapp.com",
  projectId: "facturakevin-34ff5",
  storageBucket: "facturakevin-34ff5.firebasestorage.app",
  messagingSenderId: "704590785841",
  appId: "1:704590785841:web:7dd27c576a955031151410"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* --- UTILIDADES --- */
function showToast(message, type = "blue") {
  const toast = document.getElementById("toast");
  if(!toast) return;
  toast.textContent = message;
  toast.style.background = type === "red" ? "#ef4444" : "#3b82f6";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function formatoEuro(v) { return (Number(v) || 0).toFixed(2).replace(".", ",") + " €"; }
function obtenerNumero(id) { return Number(document.getElementById(id).value) || 0; }
function obtenerTexto(id) { return document.getElementById(id).value || ""; }

/* --- CÁLCULOS --- */
function recalcularTotales() {
  const cantidad = obtenerNumero("cantidad");
  const importe = obtenerNumero("importe");
  let base = cantidad * importe;

  if (!document.getElementById("desplazamientoIncluido").checked) base += obtenerNumero("desplazamientoImporte");
  if (!document.getElementById("alojamientoIncluido").checked) base += obtenerNumero("alojamientoImporte");

  const ret = base * obtenerNumero("ivaRetenido") / 100;
  const iva = base * obtenerNumero("ivaAplicado") / 100;

  document.getElementById("subtotal").textContent = formatoEuro(base);
  document.getElementById("ivaRetenidoImporte").textContent = formatoEuro(ret);
  document.getElementById("ivaImporte").textContent = formatoEuro(iva);
  document.getElementById("total").textContent = formatoEuro(base - ret + iva);
}

/* --- LÓGICA DE CLIENTES (TIEMPO REAL) --- */
function escucharClientes() {
  db.collection("clientes").orderBy("nombre").onSnapshot((snapshot) => {
    const select = document.getElementById("clientesGuardados");
    select.innerHTML = '<option value="">Seleccionar cliente...</option>';
    snapshot.forEach((doc) => {
      const c = doc.data();
      const opt = document.createElement("option");
      opt.value = doc.id;
      opt.textContent = c.nombre;
      select.appendChild(opt);
    });
  });
}

async function guardarCliente() {
  const nombre = document.getElementById("clienteNombre").value.trim();
  if (!nombre) return showToast("Nombre requerido", "red");

  const clienteData = {
    nombre, 
    email: obtenerTexto("clienteEmail"), 
    direccion: obtenerTexto("clienteDireccion"),
    cp: obtenerTexto("clienteCP"), 
    localidad: obtenerTexto("clienteLocalidad"),
    provincia: obtenerTexto("clienteProvincia"), 
    telefono: obtenerTexto("clienteTelefono"),
    tipoDoc: obtenerTexto("clienteTipoDoc"), 
    doc: obtenerTexto("clienteDoc"),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection("clientes").doc(nombre).set(clienteData);
    showToast("Cliente sincronizado en la nube");
  } catch (error) {
    showToast("Error al guardar en la nube", "red");
  }
}

async function eliminarCliente() {
  const id = document.getElementById("clientesGuardados").value;
  if (!id) return showToast("Selecciona un cliente", "red");
  if (confirm("¿Eliminar este cliente de la nube?")) {
    await db.collection("clientes").doc(id).delete();
    showToast("Cliente eliminado");
    document.querySelectorAll(".card input:not([id^='emisor']), textarea").forEach(i => i.value = "");
  }
}

async function rellenarCliente() {
  const id = document.getElementById("clientesGuardados").value;
  if (!id) return;
  const doc = await db.collection("clientes").doc(id).get();
  if (doc.exists) {
    const c = doc.data();
    document.getElementById("clienteNombre").value = c.nombre;
    document.getElementById("clienteEmail").value = c.email;
    document.getElementById("clienteDireccion").value = c.direccion;
    document.getElementById("clienteCP").value = c.cp;
    document.getElementById("clienteLocalidad").value = c.localidad;
    document.getElementById("clienteProvincia").value = c.provincia;
    document.getElementById("clienteTelefono").value = c.telefono;
    document.getElementById("clienteTipoDoc").value = c.tipoDoc;
    document.getElementById("clienteDoc").value = c.doc;
    recalcularTotales();
  }
}

/* --- LÓGICA DE CUENTAS (TIEMPO REAL) --- */
function escucharCuentas() {
  db.collection("cuentas").onSnapshot((snapshot) => {
    const select = document.getElementById("cuentasGuardadas");
    select.innerHTML = '<option value="">Seleccionar cuenta...</option>';
    snapshot.forEach((doc) => {
      const opt = document.createElement("option");
      opt.value = doc.data().iban;
      opt.textContent = doc.data().iban;
      select.appendChild(opt);
    });
  });
}

async function guardarCuenta() {
  const iban = obtenerTexto("cuentaActual").trim();
  if(!iban) return showToast("IBAN vacío", "red");
  await db.collection("cuentas").doc(iban).set({ iban });
  showToast("Cuenta guardada en la nube");
}

async function eliminarCuenta() {
  const iban = document.getElementById("cuentasGuardadas").value;
  if(!iban) return showToast("Selecciona una cuenta", "red");
  await db.collection("cuentas").doc(iban).delete();
  document.getElementById("cuentaActual").value = "";
  showToast("Cuenta eliminada");
}

/* --- HISTORIAL DE FACTURAS --- */
async function guardarFacturaEnHistorial() {
  const factura = {
    numero: obtenerTexto("numeroFactura"),
    fecha: obtenerTexto("fechaFactura"),
    cliente: obtenerTexto("clienteNombre"),
    total: document.getElementById("total").textContent,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  await db.collection("historial").add(factura);
}

async function mostrarHistorial() {
  const lista = document.getElementById("listaHistorial");
  const snapshot = await db.collection("historial").orderBy("createdAt", "desc").limit(20).get();
  lista.innerHTML = snapshot.empty ? "Historial vacío" : "";
  snapshot.forEach(doc => {
    const f = doc.data();
    const div = document.createElement("div");
    div.style.borderBottom = "1px solid #444";
    div.style.padding = "10px";
    div.innerHTML = `<strong>${f.numero}</strong> - ${f.fecha}<br>${f.cliente} | <span style="color:#f97316">${f.total}</span>`;
    lista.appendChild(div);
  });
  document.getElementById("modalHistorial").classList.add("show");
}

/* --- IMPRESIÓN PDF --- */
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
        <div><div class="print-label">NOMBRE</div><div class="print-value">${obtenerTexto("emisorNombre")}</div></div>
        <div><div class="print-label">NIF</div><div class="print-value">${obtenerTexto("emisorNif")}</div></div>
      </div>
      <div class="print-grid-3">
        <div><div class="print-label">DIRECCIÓN</div><div class="print-value">${obtenerTexto("emisorDireccion")}</div></div>
        <div><div class="print-label">LOCALIDAD</div><div class="print-value">${obtenerTexto("emisorLocalidad")}</div></div>
        <div><div class="print-label">PROVINCIA</div><div class="print-value">${obtenerTexto("emisorProvincia")}</div></div>
      </div>
      <div class="print-grid-3">
        <div><div class="print-label">C.P.</div><div class="print-value">${obtenerTexto("emisorCP")}</div></div>
        <div><div class="print-label">EMAIL</div><div class="print-value">${obtenerTexto("emisorEmail")}</div></div>
        <div><div class="print-label">FECHA</div><div class="print-value">${obtenerTexto("fechaFactura")}</div></div>
      </div>
      <div><div class="print-label">Nº FACTURA</div><div class="print-value">${obtenerTexto("numeroFactura")}</div></div>
    </div>
    <div class="print-card">
      <div class="print-section-title">DATOS DEL CLIENTE</div>
      <div class="print-grid-2">
        <div><div class="print-label">CLIENTE</div><div class="print-value">${obtenerTexto("clienteNombre")}</div></div>
        <div><div class="print-label">EMAIL</div><div class="print-value">${obtenerTexto("clienteEmail")}</div></div>
      </div>
      <div class="print-grid-3">
        <div><div class="print-label">DIRECCIÓN</div><div class="print-value">${obtenerTexto("clienteDireccion")}</div></div>
        <div><div class="print-label">C.P.</div><div class="print-value">${obtenerTexto("clienteCP")}</div></div>
        <div><div class="print-label">LOCALIDAD</div><div class="print-value">${obtenerTexto("clienteLocalidad")}</div></div>
      </div>
      <div class="print-grid-2">
        <div><div class="print-label">PROVINCIA</div><div class="print-value">${obtenerTexto("clienteProvincia")}</div></div>
        <div><div class="print-label">DOC</div><div class="print-value">${obtenerTexto("clienteTipoDoc")}: ${obtenerTexto("clienteDoc")}</div></div>
      </div>
    </div>
    <div class="print-card">
      <div class="print-section-title">DETALLES DEL SERVICIO</div>
      <div class="print-value" style="min-height:40px;">${obtenerTexto("descripcionSesion")}</div>
      <div class="print-grid-3">
        <div><div class="print-label">CANTIDAD</div><div class="print-value">${obtenerTexto("cantidad")}</div></div>
        <div><div class="print-label">PRECIO UNIDAD</div><div class="print-value">${formatoEuro(obtenerNumero("importe"))}</div></div>
        <div><div class="print-label">DÍA SESIÓN</div><div class="print-value">${obtenerTexto("diaSesion")}</div></div>
      </div>
      <div class="print-totales">
        <div class="print-total-row"><span>Subtotal:</span><span>${document.getElementById("subtotal").textContent}</span></div>
        <div class="print-total-row"><span>IVA Retenido (${obtenerTexto("ivaRetenido")}%):</span><span>${document.getElementById("ivaRetenidoImporte").textContent}</span></div>
        <div class="print-total-row"><span>IVA (${obtenerTexto("ivaAplicado")}%):</span><span>${document.getElementById("ivaImporte").textContent}</span></div>
        <div class="print-total-row print-total-final"><span>TOTAL:</span><span>${document.getElementById("total").textContent}</span></div>
      </div>
    </div>
    <div class="print-card">
      <div class="print-section-title">PAGO</div>
      <div class="print-label">IBAN</div>
      <div class="print-value" style="font-weight:bold;">${obtenerTexto("cuentaActual")}</div>
    </div>
    <div class="print-footer">¡GRACIAS POR TU CONFIANZA!</div>
  `;
  guardarFacturaEnHistorial();
  window.print();
}

/* --- INICIALIZACIÓN --- */
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("fechaFactura").value = new Date().toISOString().slice(0, 10);
  escucharClientes();
  escucharCuentas();
  
  document.getElementById("btnNuevaFactura").onclick = () => {
    document.querySelectorAll(".card input:not([id^='emisor']), textarea").forEach(i => i.value = "");
    document.getElementById("clienteNombre").focus();
    recalcularTotales();
    showToast("Nueva factura lista");
  };

  document.getElementById("btnPDF").onclick = prepararImpresion;
  document.getElementById("btnGuardarCliente").onclick = guardarCliente;
  document.getElementById("btnEliminarCliente").onclick = eliminarCliente;
  document.getElementById("clientesGuardados").onchange = rellenarCliente;
  document.getElementById("btnGuardarCuenta").onclick = guardarCuenta;
  document.getElementById("btnEliminarCuenta").onclick = eliminarCuenta;
  document.getElementById("cuentasGuardadas").onchange = (e) => document.getElementById("cuentaActual").value = e.target.value;
  document.getElementById("btnVerHistorial").onclick = mostrarHistorial;
  document.getElementById("btnCerrarHistorial").onclick = () => document.getElementById("modalHistorial").classList.remove("show");

  document.querySelectorAll("input, select, textarea").forEach(el => el.oninput = recalcularTotales);
  recalcularTotales();
});