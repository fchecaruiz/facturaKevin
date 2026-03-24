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
  const despInput = document.getElementById("desplazamientoImporte");
  const alojaInput = document.getElementById("alojamientoImporte");

  if (despIncluido) {
    despInput.value = "";
    despInput.disabled = true;
    despInput.placeholder = "Incluido en el precio";
  } else {
    despInput.disabled = false;
    despInput.placeholder = "Importe desplazamiento";
    base += Number(despInput.value) || 0;
  }

  if (alojaIncluido) {
    alojaInput.value = "";
    alojaInput.disabled = true;
    alojaInput.placeholder = "Incluido en el precio";
  } else {
    alojaInput.disabled = false;
    alojaInput.placeholder = "Importe alojamiento";
    base += Number(alojaInput.value) || 0;
  }

  const ret = base * obtenerNumero("ivaRetenido") / 100;
  const iva = base * obtenerNumero("ivaAplicado") / 100;

  document.getElementById("subtotal").textContent = formatoEuro(base);
  document.getElementById("ivaRetenidoImporte").textContent = formatoEuro(ret);
  document.getElementById("ivaImporte").textContent = formatoEuro(iva);
  document.getElementById("total").textContent = formatoEuro(base - ret + iva);
}

/* --- AUTONUMERACIÓN --- */
async function obtenerSiguienteNumeroFactura() {
  const anio = new Date().getFullYear();
  const contadorRef = db.collection("contadores").doc(`facturas_${anio}`);

  const nuevoNumero = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(contadorRef);
    let siguiente;
    if (!snap.exists) {
      siguiente = anio === 2026 ? 10 : 1;
    } else {
      siguiente = (Number(snap.data().ultimo) || 0) + 1;
    }
    transaction.set(contadorRef, { ultimo: siguiente, anio }, { merge: true });
    return siguiente;
  });

  return `${nuevoNumero}-${anio}`;
}

async function asignarNumeroFactura() {
  try {
    const numero = await obtenerSiguienteNumeroFactura();
    setValor("numeroFactura", numero);
    return numero;
  } catch (e) {
    console.error(e);
    showToast("Error generando nº factura", "red");
    return "";
  }
}

/* --- CLIENTES --- */
function escucharClientes() {
  db.collection("clientes").orderBy("nombre").onSnapshot((snapshot) => {
    const select = document.getElementById("clientesGuardados");
    if (!select) return;
    select.innerHTML = '<option value="">Seleccionar cliente...</option>';
    snapshot.forEach((doc) => {
      const c = doc.data() || {};
      const opt = document.createElement("option");
      opt.value = doc.id;
      opt.textContent = c.nombre || doc.id;
      select.appendChild(opt);
    });
  });
}

async function guardarCliente() {
  const nombre = document.getElementById("clienteNombre").value.trim();
  if (!nombre) return showToast("Nombre requerido", "red");
  try {
    await db.collection("clientes").doc(nombre).set({
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
    });
    showToast("Cliente sincronizado en la nube ☁️");
  } catch (error) {
    console.error(error);
    showToast("Error al guardar en la nube", "red");
  }
}

async function eliminarCliente() {
  const id = document.getElementById("clientesGuardados").value;
  if (!id) return showToast("Selecciona un cliente", "red");
  const ok = await confirmarToast("¿Eliminar este cliente?");
  if (ok) {
    await db.collection("clientes").doc(id).delete();
    showToast("Cliente eliminado", "red");
    document.querySelectorAll(".card input:not([id^='emisor']), .card textarea:not([id^='emisor'])").forEach(i => i.value = "");
  }
}

async function rellenarCliente() {
  const id = document.getElementById("clientesGuardados").value;
  if (!id) return;
  const doc = await db.collection("clientes").doc(id).get();
  if (doc.exists) {
    const c = doc.data() || {};
    setValor("clienteNombre", c.nombre);
    setValor("clienteEmail", c.email);
    setValor("clienteDireccion", c.direccion);
    setValor("clienteCP", c.cp);
    setValor("clienteLocalidad", c.localidad);
    setValor("clienteProvincia", c.provincia);
    setValor("clienteTelefono", c.telefono);
    setValor("clienteTipoDoc", c.tipoDoc || "DNI");
    setValor("clienteDoc", c.doc);
    recalcularTotales();
  }
}

/* --- CUENTAS --- */
function escucharCuentas() {
  db.collection("cuentas").onSnapshot((snapshot) => {
    const select = document.getElementById("cuentasGuardadas");
    if (!select) return;
    const cuentaActualInput = document.getElementById("cuentaActual");
    select.innerHTML = '<option value="">Seleccionar cuenta...</option>';
    let primera = null;
    snapshot.forEach((doc) => {
      const data = doc.data() || {};
      const iban = data.iban || doc.id;
      if (!primera) primera = iban;
      const opt = document.createElement("option");
      opt.value = iban;
      opt.textContent = iban;
      select.appendChild(opt);
    });
    if (primera && !cuentaActualInput.value) {
      select.value = primera;
      cuentaActualInput.value = primera;
    }
  });
}

async function guardarCuenta() {
  const iban = obtenerTexto("cuentaActual").trim();
  if (!iban) return showToast("IBAN vacío", "red");
  await db.collection("cuentas").doc(iban).set({ iban });
  showToast("Cuenta guardada en la nube ☁️");
}

async function eliminarCuenta() {
  const iban = document.getElementById("cuentasGuardadas").value;
  if (!iban) return showToast("Selecciona una cuenta", "red");
  const ok = await confirmarToast("¿Eliminar esta cuenta?");
  if (ok) {
    await db.collection("cuentas").doc(iban).delete();
    setValor("cuentaActual", "");
    showToast("Cuenta eliminada", "red");
  }
}

/* --- HISTORIAL --- */
function construirFacturaCompletaParaHistorial() {
  return {
    version: 2,
    numero: obtenerTexto("numeroFactura"),
    fecha: obtenerTexto("fechaFactura"),
    emisor: {
      nombre: obtenerTexto("emisorNombre"),
      nif: obtenerTexto("emisorNif"),
      direccion: obtenerTexto("emisorDireccion"),
      localidad: obtenerTexto("emisorLocalidad"),
      provincia: obtenerTexto("emisorProvincia"),
      cp: obtenerTexto("emisorCP"),
      email: obtenerTexto("emisorEmail")
    },
    cliente: {
      nombre: obtenerTexto("clienteNombre"),
      email: obtenerTexto("clienteEmail"),
      direccion: obtenerTexto("clienteDireccion"),
      cp: obtenerTexto("clienteCP"),
      localidad: obtenerTexto("clienteLocalidad"),
      provincia: obtenerTexto("clienteProvincia"),
      telefono: obtenerTexto("clienteTelefono"),
      tipoDoc: obtenerTexto("clienteTipoDoc"),
      doc: obtenerTexto("clienteDoc")
    },
    servicio: {
      descripcion: obtenerTexto("descripcionSesion"),
      cantidad: obtenerNumero("cantidad"),
      importeUnitario: obtenerNumero("importe"),
      diaSesion: obtenerTexto("diaSesion"),
      desplazamientoIncluido: document.getElementById("desplazamientoIncluido").checked,
      desplazamientoImporte: obtenerNumero("desplazamientoImporte"),
      alojamientoIncluido: document.getElementById("alojamientoIncluido").checked,
      alojamientoImporte: obtenerNumero("alojamientoImporte")
    },
    impuestos: {
      ivaRetenido: obtenerNumero("ivaRetenido"),
      ivaAplicado: obtenerNumero("ivaAplicado")
    },
    pago: {
      iban: obtenerTexto("cuentaActual"),
      observaciones: obtenerTexto("observaciones")
    },
    totalTexto: document.getElementById("total").textContent,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
}

async function guardarOActualizarHistorial() {
  const idActual = window._facturaEditandoId || getFacturaEditandoId();

  const factura = construirFacturaCompletaParaHistorial();
  if (!factura.numero) return showToast("Nº de factura vacío", "red");
  if (!factura.cliente.nombre) return showToast("Añade un cliente antes de guardar", "red");

  try {
    if (idActual) {
      await db.collection("historial").doc(idActual).set(factura, { merge: true });
      showToast("Factura actualizada ✅");
    } else {
      factura.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const ref = await db.collection("historial").add(factura);
      setFacturaEditandoId(ref.id);
      bloquearNumeroFactura();
      showToast("Factura guardada ✅");
    }
  } catch (e) {
    console.error(e);
    showToast("Error al guardar factura", "red");
  }
}

async function cargarFacturaHistorial(id) {
  try {
    const snap = await db.collection("historial").doc(id).get();
    if (!snap.exists) return;
    const f = snap.data() || {};

    setFacturaEditandoId(id);

    setValor("numeroFactura", f.numero);
    setValor("fechaFactura", f.fecha);
    setValor("emisorNombre", f.emisor?.nombre);
    setValor("emisorNif", f.emisor?.nif);
    setValor("emisorDireccion", f.emisor?.direccion);
    setValor("emisorLocalidad", f.emisor?.localidad);
    setValor("emisorProvincia", f.emisor?.provincia);
    setValor("emisorCP", f.emisor?.cp);
    setValor("emisorEmail", f.emisor?.email);
    setValor("clienteNombre", f.cliente?.nombre);
    setValor("clienteEmail", f.cliente?.email);
    setValor("clienteDireccion", f.cliente?.direccion);
    setValor("clienteCP", f.cliente?.cp);
    setValor("clienteLocalidad", f.cliente?.localidad);
    setValor("clienteProvincia", f.cliente?.provincia);
    setValor("clienteTelefono", f.cliente?.telefono);
    setValor("clienteTipoDoc", f.cliente?.tipoDoc || "DNI");
    setValor("clienteDoc", f.cliente?.doc);
    setValor("descripcionSesion", f.servicio?.descripcion);
    setValor("cantidad", f.servicio?.cantidad);
    setValor("importe", f.servicio?.importeUnitario);
    setValor("diaSesion", f.servicio?.diaSesion);
    setChecked("desplazamientoIncluido", f.servicio?.desplazamientoIncluido);
    setValor("desplazamientoImporte", f.servicio?.desplazamientoImporte);
    setChecked("alojamientoIncluido", f.servicio?.alojamientoIncluido);
    setValor("alojamientoImporte", f.servicio?.alojamientoImporte);
    setValor("ivaRetenido", f.impuestos?.ivaRetenido);
    setValor("ivaAplicado", f.impuestos?.ivaAplicado);
    setValor("cuentaActual", f.pago?.iban);
    setValor("observaciones", f.pago?.observaciones);

    bloquearNumeroFactura();
    recalcularTotales();
    document.getElementById("modalHistorial").classList.remove("show");
    showToast("Factura cargada — modifica y pulsa 💾 GUARDAR ✅");
  } catch (e) {
    console.error(e);
    showToast("Error al abrir factura", "red");
  }
}

async function duplicarFacturaHistorial(id) {
  try {
    const snap = await db.collection("historial").doc(id).get();
    if (!snap.exists) return;
    const f = snap.data() || {};

    setValor("emisorNombre", f.emisor?.nombre);
    setValor("emisorNif", f.emisor?.nif);
    setValor("emisorDireccion", f.emisor?.direccion);
    setValor("emisorLocalidad", f.emisor?.localidad);
    setValor("emisorProvincia", f.emisor?.provincia);
    setValor("emisorCP", f.emisor?.cp);
    setValor("emisorEmail", f.emisor?.email);
    setValor("clienteNombre", f.cliente?.nombre);
    setValor("clienteEmail", f.cliente?.email);
    setValor("clienteDireccion", f.cliente?.direccion);
    setValor("clienteCP", f.cliente?.cp);
    setValor("clienteLocalidad", f.cliente?.localidad);
    setValor("clienteProvincia", f.cliente?.provincia);
    setValor("clienteTelefono", f.cliente?.telefono);
    setValor("clienteTipoDoc", f.cliente?.tipoDoc || "DNI");
    setValor("clienteDoc", f.cliente?.doc);
    setValor("descripcionSesion", f.servicio?.descripcion);
    setValor("cantidad", f.servicio?.cantidad);
    setValor("importe", f.servicio?.importeUnitario);
    setValor("diaSesion", f.servicio?.diaSesion);
    setChecked("desplazamientoIncluido", f.servicio?.desplazamientoIncluido);
    setValor("desplazamientoImporte", f.servicio?.desplazamientoImporte);
    setChecked("alojamientoIncluido", f.servicio?.alojamientoIncluido);
    setValor("alojamientoImporte", f.servicio?.alojamientoImporte);
    setValor("ivaRetenido", f.impuestos?.ivaRetenido);
    setValor("ivaAplicado", f.impuestos?.ivaAplicado);
    setValor("cuentaActual", f.pago?.iban);
    setValor("observaciones", f.pago?.observaciones);

    setFacturaEditandoId(null);
    await asignarNumeroFactura();
    document.getElementById("fechaFactura").value = new Date().toISOString().slice(0, 10);
    desbloquearNumeroFactura();

    recalcularTotales();
    document.getElementById("modalHistorial").classList.remove("show");
    showToast("Factura duplicada — revisa y pulsa 💾 GUARDAR 📑");
  } catch (e) {
    console.error(e);
    showToast("Error al duplicar factura", "red");
  }
}

async function eliminarFacturaHistorial(id) {
  const ok = await confirmarToast("¿Borrar esta factura del historial?");
  if (!ok) return;
  await db.collection("historial").doc(id).delete();
  if (getFacturaEditandoId() === id) setFacturaEditandoId(null);
  showToast("Factura eliminada", "red");
  await mostrarHistorial();
}

async function mostrarHistorial() {
  const lista = document.getElementById("listaHistorial");
  lista.innerHTML = "<p style='text-align:center; padding:20px; color:#94a3b8;'>Cargando...</p>";
  document.getElementById("modalHistorial").classList.add("show");

  try {
    const snapshot = await db.collection("historial").orderBy("createdAt", "desc").limit(50).get();

    if (snapshot.empty) {
      lista.innerHTML = "<p style='text-align:center; padding:20px; color:#94a3b8;'>Historial vacío</p>";
      return;
    }

    lista.innerHTML = "";
    snapshot.forEach(doc => {
      const f = doc.data() || {};
      const esActual = getFacturaEditandoId() === doc.id;
      const div = document.createElement("div");
      div.style.cssText = `border-bottom: 1px solid #334155; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; ${esActual ? "background: #1e3a5f;" : ""}`;

      div.innerHTML = `
        <div style="flex:1; min-width:0;">
          <div style="font-weight:bold; color:${esActual ? "#f97316" : "#60a5fa"};">
            ${f.numero || "-"} <span style="color:#64748b; font-size:0.78rem;">(${f.fecha || ""})</span>
          </div>
          <div style="font-size:0.88rem; color:#cbd5e1; margin-top:2px;">${f.cliente?.nombre || "-"}</div>
          <div style="color:#f97316; font-weight:bold; margin-top:2px;">${f.totalTexto || "0,00 €"}</div>
        </div>
        <div style="display:flex; gap:8px; flex-shrink:0;">
          <button data-id="${doc.id}" class="btn-cargar-factura" title="Cargar/Editar factura">👁️</button>
          <button data-id="${doc.id}" class="btn-duplicar-factura" title="Duplicar como nueva factura">📑</button>
          <button data-id="${doc.id}" class="btn-borrar-factura" title="Eliminar factura">🗑️</button>
        </div>
      `;
      lista.appendChild(div);
    });

    lista.querySelectorAll(".btn-cargar-factura").forEach(btn => {
      btn.addEventListener("click", () => cargarFacturaHistorial(btn.dataset.id));
    });
    lista.querySelectorAll(".btn-duplicar-factura").forEach(btn => {
      btn.addEventListener("click", () => duplicarFacturaHistorial(btn.dataset.id));
    });
    lista.querySelectorAll(".btn-borrar-factura").forEach(btn => {
      btn.addEventListener("click", () => eliminarFacturaHistorial(btn.dataset.id));
    });

  } catch (e) {
    console.error(e);
    lista.innerHTML = "<p style='text-align:center; color:#ef4444;'>Error al cargar historial</p>";
  }
}

/* --- IMPRESIÓN PDF --- */
function prepararImpresion() {
  const logoSrc = document.querySelector(".logo-kevin")?.src || "logo-kevin.png";
  const area = document.getElementById("print-area");

  area.innerHTML = `
    <div id="print-inner" style="
      width: 210mm;
      min-height: 297mm;
      padding: 14mm 16mm;
      box-sizing: border-box;
      background: white;
      color: #1e293b;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
    ">
      <div class="print-header">
        <div>
          <h1>KEVIN CHECA</h1>
          <div style="font-size:10px; color:#475569; letter-spacing:1px;">FACTURA PROFESIONAL</div>
        </div>
        <img src="${logoSrc}" class="print-logo" crossorigin="anonymous">
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
        <div>
          <div class="print-label">Nº FACTURA</div>
          <div class="print-value" style="font-size:14px; font-weight:800; color:#1e40af;">${obtenerTexto("numeroFactura")}</div>
        </div>
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
    </div>
  `;

  const inner = document.getElementById("print-inner");
  const scaleX = window.innerWidth / inner.scrollWidth;
  const scaleY = window.innerHeight / inner.scrollHeight;
  const scale = Math.min(scaleX, scaleY, 1);
  if (scale < 1) {
    inner.style.transform = `scale(${scale})`;
    inner.style.transformOrigin = "top left";
  }

  document.activeElement?.blur();
  document.body.focus();
  setTimeout(() => window.print(), 600);
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