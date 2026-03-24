// 1. CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDbDypH0jS5Oo-0FZgzh-nySHu1u2-oCwg",
  authDomain: "facturakevin-34ff5.firebaseapp.com",
  projectId: "facturakevin-34ff5",
  storageBucket: "facturakevin-34ff5.firebasestorage.app",
  messagingSenderId: "704590785841",
  appId: "1:704590785841:web:7dd27c576a955031151410"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

window._facturaEditandoId = null;

function getFacturaEditandoId() {
  const val = document.getElementById("facturaEditandoIdHidden")?.value;
  return val && val.trim() !== "" ? val.trim() : null;
}

function setFacturaEditandoId(id) {
  window._facturaEditandoId = id;
  const el = document.getElementById("facturaEditandoIdHidden");
  if (el) el.value = id || "";
}

/* --- BLOQUEO NÚMERO FACTURA --- */
function bloquearNumeroFactura() {
  const el = document.getElementById("numeroFactura");
  el.readOnly = true;
  el.style.opacity = "0.6";
  el.style.cursor = "not-allowed";
}

function desbloquearNumeroFactura() {
  const el = document.getElementById("numeroFactura");
  el.readOnly = false;
  el.style.opacity = "1";
  el.style.cursor = "text";
}

/* --- UTILIDADES --- */
function showToast(message, type = "blue") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.background = type === "red" ? "#ef4444" : "#3b82f6";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function confirmarToast(mensaje) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirmOverlay");
    const msg = document.getElementById("confirmMsg");
    msg.textContent = mensaje;
    overlay.classList.add("show");

    document.getElementById("confirmSi").onclick = () => {
      overlay.classList.remove("show");
      resolve(true);
    };
    document.getElementById("confirmNo").onclick = () => {
      overlay.classList.remove("show");
      resolve(false);
    };
  });
}

function formatoEuro(v) {
  return (Number(v) || 0).toFixed(2).replace(".", ",") + " €";
}

function obtenerNumero(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  return Number(el.value) || 0;
}

function obtenerTexto(id) {
  return document.getElementById(id)?.value || "";
}

function setValor(id, valor) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = valor ?? "";
  if (el.tagName === "SELECT" && el.value !== String(valor)) {
    el.selectedIndex = 0;
  }
}

function setChecked(id, valor) {
  const el = document.getElementById(id);
  if (!el) return;
  el.checked = !!valor;
}

/* --- CÁLCULOS --- */
function recalcularTotales() {
  const cantidad = obtenerNumero("cantidad");
  const importe = obtenerNumero("importe");
  let base = cantidad * importe;

  const despIncluido = document.getElementById("desplazamientoIncluido").checked;
  const alojaIncluido = document.getElementById("alojamientoIncluido").checked;

  document.getElementById("desplazamientoFields").style.display = despIncluido ? "grid" : "none";
  document.getElementById("alojamientoFields").style.display = alojaIncluido ? "block" : "none";

  if (despIncluido) {
    const km = obtenerNumero("kmDesplazamiento");
    const pxkm = obtenerNumero("precioPorKm") || 0.19;
    base += km * pxkm;
  }
  if (alojaIncluido) {
    base += obtenerNumero("costoAlojamiento");
  }

  const pctRetenido = obtenerNumero("ivaRetenido") / 100;
  const pctAplicado = obtenerNumero("ivaAplicado") / 100;
  const retenido = base * pctRetenido;
  const aplicado = base * pctAplicado;
  const total = base - retenido + aplicado;

  document.getElementById("subtotal").textContent = formatoEuro(base);
  document.getElementById("ivaRetenidoImporte").textContent = "- " + formatoEuro(retenido);
  document.getElementById("ivaImporte").textContent = "+ " + formatoEuro(aplicado);
  document.getElementById("total").textContent = formatoEuro(total);
}

/* --- CLIENTES FIREBASE --- */
function escucharClientes() {
  db.collection("clientes").orderBy("nombre").onSnapshot(snapshot => {
    const sel = document.getElementById("clientesGuardados");
    const valorActual = sel.value;
    sel.innerHTML = '<option value="">Seleccionar cliente...</option>';
    snapshot.forEach(doc => {
      const d = doc.data();
      const opt = document.createElement("option");
      opt.value = doc.id;
      opt.textContent = d.nombre;
      sel.appendChild(opt);
    });
    if (valorActual) sel.value = valorActual;
  });
}

function rellenarCliente() {
  const sel = document.getElementById("clientesGuardados");
  const id = sel.value;
  if (!id) return;
  db.collection("clientes").doc(id).get().then(doc => {
    if (!doc.exists) return;
    const d = doc.data();
    setValor("clienteNombre", d.nombre);
    setValor("clienteEmail", d.email);
    setValor("clienteDireccion", d.direccion);
    setValor("clienteCP", d.cp);
    setValor("clienteLocalidad", d.localidad);
    setValor("clienteProvincia", d.provincia);
    setValor("clienteTelefono", d.telefono);
    setValor("clienteTipoDoc", d.tipoDoc);
    setValor("clienteDoc", d.doc);
  });
}

async function guardarCliente() {
  const nombre = obtenerTexto("clienteNombre").trim();
  if (!nombre) { showToast("Escribe el nombre del cliente", "red"); return; }

  const datos = {
    nombre,
    email: obtenerTexto("clienteEmail"),
    direccion: obtenerTexto("clienteDireccion"),
    cp: obtenerTexto("clienteCP"),
    localidad: obtenerTexto("clienteLocalidad"),
    provincia: obtenerTexto("clienteProvincia"),
    telefono: obtenerTexto("clienteTelefono"),
    tipoDoc: obtenerTexto("clienteTipoDoc"),
    doc: obtenerTexto("clienteDoc"),
  };

  const sel = document.getElementById("clientesGuardados");
  const idExistente = sel.value;

  if (idExistente) {
    await db.collection("clientes").doc(idExistente).set(datos);
    showToast("Cliente actualizado ✅");
  } else {
    const ref = await db.collection("clientes").add(datos);
    sel.value = ref.id;
    showToast("Cliente guardado ✅");
  }
}

async function eliminarCliente() {
  const sel = document.getElementById("clientesGuardados");
  const id = sel.value;
  if (!id) { showToast("Selecciona un cliente", "red"); return; }
  const ok = await confirmarToast("¿Eliminar este cliente?");
  if (!ok) return;
  await db.collection("clientes").doc(id).delete();
  sel.value = "";
  ["clienteNombre","clienteEmail","clienteDireccion","clienteCP","clienteLocalidad","clienteProvincia","clienteTelefono","clienteDoc"].forEach(i => setValor(i, ""));
  showToast("Cliente eliminado 🗑️", "red");
}

/* --- CUENTAS FIREBASE --- */
function escucharCuentas() {
  db.collection("cuentas").onSnapshot(snapshot => {
    const sel = document.getElementById("cuentasGuardadas");
    const valorActual = sel.value;
    sel.innerHTML = '<option value="">Seleccionar cuenta...</option>';
    snapshot.forEach(doc => {
      const opt = document.createElement("option");
      opt.value = doc.data().iban;
      opt.textContent = doc.data().iban;
      sel.appendChild(opt);
    });
    if (valorActual) sel.value = valorActual;
  });
}

async function guardarCuenta() {
  const iban = obtenerTexto("cuentaActual").trim();
  if (!iban) { showToast("Escribe un IBAN", "red"); return; }
  await db.collection("cuentas").add({ iban });
  showToast("Cuenta guardada ✅");
}

async function eliminarCuenta() {
  const iban = obtenerTexto("cuentaActual").trim();
  if (!iban) { showToast("Selecciona una cuenta", "red"); return; }
  const ok = await confirmarToast("¿Eliminar esta cuenta?");
  if (!ok) return;
  const snap = await db.collection("cuentas").where("iban", "==", iban).get();
  snap.forEach(doc => doc.ref.delete());
  showToast("Cuenta eliminada 🗑️", "red");
}

/* --- NÚMERO DE FACTURA --- */
async function asignarNumeroFactura() {
  const snap = await db.collection("facturas").orderBy("numero", "desc").limit(1).get();
  let siguiente = 1;
  if (!snap.empty) {
    const ultimo = snap.docs[0].data().numero || "0";
    const num = parseInt(ultimo.toString().split("-")[0]);
    if (!isNaN(num)) siguiente = num + 1;
  }
  const año = new Date().getFullYear();
  setValor("numeroFactura", `${siguiente}-${año}`);
  bloquearNumeroFactura();
}

/* --- HISTORIAL FIREBASE --- */
async function guardarOActualizarHistorial() {
  const numero = obtenerTexto("numeroFactura").trim();
  const cliente = obtenerTexto("clienteNombre").trim();
  const total = document.getElementById("total").textContent;

  if (!numero || !cliente) {
    showToast("Completa nº factura y cliente", "red");
    return;
  }

  const datos = {
    numero,
    cliente,
    total,
    fecha: obtenerTexto("fechaFactura"),
    nif: obtenerTexto("emisorNif"),
    email: obtenerTexto("clienteEmail"),
    direccion: obtenerTexto("clienteDireccion"),
    cp: obtenerTexto("clienteCP"),
    localidad: obtenerTexto("clienteLocalidad"),
    provincia: obtenerTexto("clienteProvincia"),
    telefono: obtenerTexto("clienteTelefono"),
    tipoDoc: obtenerTexto("clienteTipoDoc"),
    doc: obtenerTexto("clienteDoc"),
    descripcion: obtenerTexto("descripcionSesion"),
    cantidad: obtenerNumero("cantidad"),
    importe: obtenerNumero("importe"),
    diaSesion: obtenerTexto("diaSesion"),
    ivaRetenido: obtenerNumero("ivaRetenido"),
    ivaAplicado: obtenerNumero("ivaAplicado"),
    desplazamiento: document.getElementById("desplazamientoIncluido").checked,
    km: obtenerNumero("kmDesplazamiento"),
    precioPorKm: obtenerNumero("precioPorKm"),
    alojamiento: document.getElementById("alojamientoIncluido").checked,
    costoAlojamiento: obtenerNumero("costoAlojamiento"),
    cuenta: obtenerTexto("cuentaActual"),
    observaciones: obtenerTexto("observaciones"),
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };

  const editandoId = getFacturaEditandoId();
  if (editandoId) {
    await db.collection("facturas").doc(editandoId).set(datos);
    showToast("Factura actualizada ✅");
  } else {
    await db.collection("facturas").add(datos);
    showToast("Factura guardada ✅");
    await asignarNumeroFactura();
  }
}

async function mostrarHistorial() {
  document.getElementById("modalHistorial").classList.add("show");
  const lista = document.getElementById("listaHistorial");
  lista.innerHTML = "<p style='color:#64748b;text-align:center;'>Cargando...</p>";
  try {
    const snap = await db.collection("facturas").orderBy("timestamp", "desc").get();
    if (snap.empty) {
      lista.innerHTML = "<p style='color:#64748b;text-align:center;'>No hay facturas guardadas</p>";
      return;
    }
    lista.innerHTML = "";
    snap.forEach(doc => {
      const d = doc.data();
      const item = document.createElement("div");
      item.className = "historial-item";
      item.innerHTML = `
        <div class="historial-info">
          <strong>Factura ${d.numero} — ${d.cliente}</strong>
          <span class="historial-total">${d.total}</span>
        </div>
        <div class="historial-btns">
          <button class="btn-cargar-factura" title="Ver/Cargar">👁️</button>
          <button class="btn-duplicar-factura" title="Duplicar">📋</button>
          <button class="btn-borrar-factura" title="Borrar">🗑️</button>
        </div>
      `;

      item.querySelector(".btn-cargar-factura").onclick = () => {
        cargarFactura(doc.id, d);
        document.getElementById("modalHistorial").classList.remove("show");
      };
      item.querySelector(".btn-duplicar-factura").onclick = () => {
        cargarFactura(null, d);
        document.getElementById("modalHistorial").classList.remove("show");
      };
      item.querySelector(".btn-borrar-factura").onclick = async () => {
        const ok = await confirmarToast(`¿Borrar factura ${d.numero}?`);
        if (ok) {
          await db.collection("facturas").doc(doc.id).delete();
          showToast("Factura borrada 🗑️", "red");
          mostrarHistorial();
        }
      };

      lista.appendChild(item);
    });
  } catch (e) {
    lista.innerHTML = "<p style='text-align:center; color:#ef4444;'>Error al cargar historial</p>";
  }
}

function cargarFactura(id, d) {
  setFacturaEditandoId(id);
  if (id) bloquearNumeroFactura(); else desbloquearNumeroFactura();

  setValor("numeroFactura", d.numero);
  setValor("fechaFactura", d.fecha);
  setValor("clienteNombre", d.cliente);
  setValor("clienteEmail", d.email);
  setValor("clienteDireccion", d.direccion);
  setValor("clienteCP", d.cp);
  setValor("clienteLocalidad", d.localidad);
  setValor("clienteProvincia", d.provincia);
  setValor("clienteTelefono", d.telefono);
  setValor("clienteTipoDoc", d.tipoDoc);
  setValor("clienteDoc", d.doc);
  setValor("descripcionSesion", d.descripcion);
  setValor("cantidad", d.cantidad);
  setValor("importe", d.importe);
  setValor("diaSesion", d.diaSesion);
  setValor("ivaRetenido", d.ivaRetenido);
  setValor("ivaAplicado", d.ivaAplicado);
  setChecked("desplazamientoIncluido", d.desplazamiento);
  setValor("kmDesplazamiento", d.km);
  setValor("precioPorKm", d.precioPorKm);
  setChecked("alojamientoIncluido", d.alojamiento);
  setValor("costoAlojamiento", d.costoAlojamiento);
  setValor("cuentaActual", d.cuenta);
  setValor("observaciones", d.observaciones);
  recalcularTotales();
  showToast(id ? "Factura cargada 👁️" : "Factura duplicada 📋");
}

/* --- IMPRESIÓN PDF --- */
function prepararImpresion() {
  const logoSrc = document.querySelector(".logo-kevin")?.src || "logo-kevin.png";

  const contenido = `
    <div class="print-header">
      <div>
        <h1>KEVIN CHECA</h1>
        <div style="font-size:10px; color:#475569; letter-spacing:1px;">FACTURA PROFESIONAL</div>
      </div>
      <img src="${logoSrc}" class="print-logo" crossorigin="anonymous">
    </div>

    <div class="print-card">
      <div class="print-section-title">DATOS DEL EMISOR</div>
      <div class="print-grid-3">
        <div><div class="print-label">NOMBRE</div><div class="print-value">${obtenerTexto("emisorNombre")}</div></div>
        <div><div class="print-label">NIF</div><div class="print-value">${obtenerTexto("emisorNif")}</div></div>
        <div><div class="print-label">EMAIL</div><div class="print-value">${obtenerTexto("emisorEmail")}</div></div>
      </div>
      <div class="print-grid-3">
        <div><div class="print-label">DIRECCIÓN</div><div class="print-value">${obtenerTexto("emisorDireccion")}</div></div>
        <div><div class="print-label">LOCALIDAD</div><div class="print-value">${obtenerTexto("emisorLocalidad")}</div></div>
        <div><div class="print-label">PROVINCIA</div><div class="print-value">${obtenerTexto("emisorProvincia")}</div></div>
      </div>
      <div class="print-grid-2">
        <div><div class="print-label">C.P.</div><div class="print-value">${obtenerTexto("emisorCP")}</div></div>
        <div><div class="print-label">Nº FACTURA</div><div class="print-value">${obtenerTexto("numeroFactura")}</div></div>
      </div>
    </div>

    <div class="print-card">
      <div class="print-section-title">DATOS DEL CLIENTE</div>
      <div class="print-grid-2">
        <div><div class="print-label">NOMBRE</div><div class="print-value">${obtenerTexto("clienteNombre")}</div></div>
        <div><div class="print-label">EMAIL</div><div class="print-value">${obtenerTexto("clienteEmail")}</div></div>
      </div>
      <div class="print-grid-3">
        <div><div class="print-label">DIRECCIÓN</div><div class="print-value">${obtenerTexto("clienteDireccion")}</div></div>
        <div><div class="print-label">C.P.</div><div class="print-value">${obtenerTexto("clienteCP")}</div></div>
        <div><div class="print-label">LOCALIDAD</div><div class="print-value">${obtenerTexto("clienteLocalidad")}</div></div>
      </div>
      <div class="print-grid-2">
        <div><div class="print-label">PROVINCIA</div><div class="print-value">${obtenerTexto("clienteProvincia")}</div></div>
        <div><div class="print-label">${obtenerTexto("clienteTipoDoc")}</div><div class="print-value">${obtenerTexto("clienteDoc")}</div></div>
      </div>
    </div>

    <div class="print-card">
      <div class="print-section-title">DETALLES DEL SERVICIO</div>
      <div class="print-value" style="min-height:24px; white-space:pre-wrap; margin-bottom:8px;">${obtenerTexto("descripcionSesion")}</div>
      <div class="print-grid-3">
        <div><div class="print-label">CANTIDAD</div><div class="print-value">${obtenerNumero("cantidad")}</div></div>
        <div><div class="print-label">PRECIO UNIDAD</div><div class="print-value">${formatoEuro(obtenerNumero("importe"))}</div></div>
        <div><div class="print-label">DÍA SESIÓN</div><div class="print-value">${obtenerTexto("diaSesion")}</div></div>
      </div>
      <div class="print-totales">
        <div class="print-total-row"><span>Subtotal:</span><span>${document.getElementById("subtotal").textContent}</span></div>
        <div class="print-total-row"><span>IVA Retenido (${obtenerNumero("ivaRetenido")}%):</span><span>${document.getElementById("ivaRetenidoImporte").textContent}</span></div>
        <div class="print-total-row"><span>IVA (${obtenerNumero("ivaAplicado")}%):</span><span>${document.getElementById("ivaImporte").textContent}</span></div>
        <div class="print-total-row print-total-final"><span>TOTAL A PAGAR:</span><span>${document.getElementById("total").textContent}</span></div>
      </div>
    </div>

    <div class="print-card">
      <div class="print-section-title">DATOS DE PAGO</div>
      <div class="print-label">IBAN / CUENTA BANCARIA</div>
      <div class="print-value" style="font-weight:800; font-size:13px; letter-spacing:1px;">${obtenerTexto("cuentaActual")}</div>
      ${obtenerTexto("observaciones") ? `
        <div class="print-label" style="margin-top:8px;">OBSERVACIONES</div>
        <div class="print-value">${obtenerTexto("observaciones")}</div>
      ` : ""}
    </div>

    <div class="print-footer">¡GRACIAS POR TU CONFIANZA!</div>
  `;

  const ventana = window.open("", "_blank");
  ventana.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${obtenerTexto("numeroFactura")}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 portrait; margin: 0; }
    html, body {
      width: 100%;
      min-height: 100vh;
      background: #f1f5f9;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #1e293b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .btn-imprimir {
      display: block;
      width: 210mm;
      margin: 0 auto 16px auto;
      padding: 14px;
      background: #f97316;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      letter-spacing: 1px;
    }
    .btn-imprimir:hover { opacity: 0.88; }
    @media print {
      body { padding: 0; background: white; }
      .btn-imprimir { display: none !important; }
      .factura-wrapper {
        width: 210mm;
        min-height: 297mm;
        margin: 0;
        padding: 14mm 16mm;
        box-shadow: none;
        border-radius: 0;
      }
    }
    @media screen {
      body { padding: 20px 0; }
      .factura-wrapper {
        box-shadow: 0 4px 32px rgba(0,0,0,0.15);
        border-radius: 8px;
      }
    }
    .factura-wrapper {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: white;
      padding: 14mm 16mm;
      box-sizing: border-box;
    }
    @media screen and (max-width: 230mm) {
      .factura-wrapper { width: 100%; padding: 16px; min-height: unset; }
      .btn-imprimir { width: 100%; }
    }
    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 3px solid #3b82f6;
    }
    .print-header h1 { font-size: 22px; color: #1e40af; letter-spacing: 3px; }
    .print-header > div > div { font-size: 10px; color: #475569; letter-spacing: 1px; margin-top: 2px; }
    .print-logo {
      width: 64px; height: 64px;
      border-radius: 50%; object-fit: cover;
      border: 2px solid #3b82f6;
    }
    .print-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 10px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-section-title {
      font-size: 8px; font-weight: 800; color: #1e40af;
      letter-spacing: 2px; text-transform: uppercase;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px; margin-bottom: 8px;
    }
    .print-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 6px; }
    .print-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 6px; }
    .print-label { font-size: 7px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
    .print-value { font-size: 11px; color: #1e293b; font-weight: 500; margin-top: 2px; }
    .print-totales {
      background: #f1f5f9;
      border-radius: 6px; padding: 8px 12px; margin-top: 8px;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .print-total-row { display: flex; justify-content: space-between; font-size: 10px; color: #475569; padding: 2px 0; }
    .print-total-final {
      border-top: 2px solid #3b82f6; margin-top: 4px; padding-top: 4px;
      font-size: 14px !important; font-weight: 800; color: #f97316 !important;
    }
    .print-total-final span { color: #f97316 !important; }
    .print-footer {
      text-align: center; font-size: 9px; color: #64748b;
      margin-top: 10px; padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      letter-spacing: 2px; text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="factura-wrapper">
    ${contenido}
  </div>
  <script>
    window.onload = function() { window.print(); }
  <\/script>
</body>
</html>`);
  ventana.document.close();
}

/* --- INICIALIZACIÓN --- */
window.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("fechaFactura").value = new Date().toISOString().slice(0, 10);
  escucharClientes();
  escucharCuentas();
  await asignarNumeroFactura();

  document.getElementById("btnNuevaFactura").onclick = async () => {
    setFacturaEditandoId(null);
    desbloquearNumeroFactura();
    document.querySelectorAll(".card input:not([id^='emisor']), .card textarea:not([id^='emisor'])").forEach(i => i.value = "");
    document.getElementById("cantidad").selectedIndex = 0;
    document.getElementById("ivaRetenido").selectedIndex = 0;
    document.getElementById("ivaAplicado").selectedIndex = 2;
    document.getElementById("desplazamientoIncluido").checked = false;
    document.getElementById("alojamientoIncluido").checked = false;
    recalcularTotales();
    await asignarNumeroFactura();
    document.getElementById("clienteNombre").focus();
    showToast("Nueva factura lista 🆕");
  };

  document.getElementById("btnGuardarFactura").onclick = async () => {
    await guardarOActualizarHistorial();
  };

  document.getElementById("btnPDF").onclick = prepararImpresion;
  document.getElementById("btnGuardarCliente").onclick = guardarCliente;
  document.getElementById("btnEliminarCliente").onclick = eliminarCliente;
  document.getElementById("clientesGuardados").onchange = rellenarCliente;
  document.getElementById("btnGuardarCuenta").onclick = guardarCuenta;
  document.getElementById("btnEliminarCuenta").onclick = eliminarCuenta;
  document.getElementById("cuentasGuardadas").onchange = (e) => setValor("cuentaActual", e.target.value);
  document.getElementById("btnVerHistorial").onclick = mostrarHistorial;
  document.getElementById("btnCerrarHistorial").onclick = () => document.getElementById("modalHistorial").classList.remove("show");
  document.getElementById("desplazamientoIncluido").onchange = recalcularTotales;
  document.getElementById("alojamientoIncluido").onchange = recalcularTotales;

  document.querySelectorAll("input, select, textarea").forEach(el => el.oninput = recalcularTotales);
  recalcularTotales();
});