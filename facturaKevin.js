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

// ✅ CLAVE: null = nueva factura | string = ID de factura que estamos editando
let facturaEditandoId = null;

/* --- UTILIDADES --- */
function showToast(message, type = "blue") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.background = type === "red" ? "#ef4444" : "#3b82f6";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function formatoEuro(v) {
  return (Number(v) || 0).toFixed(2).replace(".", ",") + " €";
}
function obtenerNumero(id) {
  return Number(document.getElementById(id).value) || 0;
}
function obtenerTexto(id) {
  return document.getElementById(id).value || "";
}
function setValor(id, valor) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = valor ?? "";
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

  if (!document.getElementById("desplazamientoIncluido").checked) {
    base += obtenerNumero("desplazamientoImporte");
  }
  if (!document.getElementById("alojamientoIncluido").checked) {
    base += obtenerNumero("alojamientoImporte");
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
    showToast("Cliente sincronizado en la nube");
  } catch (error) {
    console.error(error);
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
    select.innerHTML = '<option value="">Seleccionar cuenta...</option>';
    snapshot.forEach((doc) => {
      const data = doc.data() || {};
      const iban = data.iban || doc.id;
      const opt = document.createElement("option");
      opt.value = iban;
      opt.textContent = iban;
      select.appendChild(opt);
    });
  });
}

async function guardarCuenta() {
  const iban = obtenerTexto("cuentaActual").trim();
  if (!iban) return showToast("IBAN vacío", "red");
  await db.collection("cuentas").doc(iban).set({ iban });
  showToast("Cuenta guardada en la nube");
}

async function eliminarCuenta() {
  const iban = document.getElementById("cuentasGuardadas").value;
  if (!iban) return showToast("Selecciona una cuenta", "red");
  await db.collection("cuentas").doc(iban).delete();
  setValor("cuentaActual", "");
  showToast("Cuenta eliminada");
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

// ✅ FUNCIÓN CLAVE: crea nueva O actualiza la existente
async function guardarOActualizarHistorial() {
  const factura = construirFacturaCompletaParaHistorial();

  if (!factura.numero) {
    showToast("Falta Nº factura", "red");
    return;
  }

  if (facturaEditandoId) {
    // ✅ EDITAR: actualiza el documento existente, conserva createdAt
    await db.collection("historial").doc(facturaEditandoId).set(
      { ...factura, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    showToast("Factura actualizada ✅");
  } else {
    // ✅ NUEVA: crea documento nuevo con createdAt
    factura.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    const ref = await db.collection("historial").add(factura);
    facturaEditandoId = ref.id; // ✅ guardamos ID para que reimprimir actualice
    showToast("Factura guardada ✅");
  }
}

async function cargarFacturaHistorial(id) {
  try {
    const snap = await db.collection("historial").doc(id).get();
    if (!snap.exists) return;
    const f = snap.data() || {};

    if (!f.emisor || !f.cliente || !f.servicio) {
      showToast("Esta factura es antigua y no se puede abrir completa", "red");
      return;
    }

    // ✅ CLAVE: guardar el ID para que al generar PDF actualice en vez de duplicar
    facturaEditandoId = id;

    setValor("numeroFactura", f.numero);
    setValor("fechaFactura", f.fecha);

    setValor("emisorNombre", f.emisor.nombre);
    setValor("emisorNif", f.emisor.nif);
    setValor("emisorDireccion", f.emisor.direccion);
    setValor("emisorLocalidad", f.emisor.localidad);
    setValor("emisorProvincia", f.emisor.provincia);
    setValor("emisorCP", f.emisor.cp);
    setValor("emisorEmail", f.emisor.email);

    setValor("clienteNombre", f.cliente.nombre);
    setValor("clienteEmail", f.cliente.email);
    setValor("clienteDireccion", f.cliente.direccion);
    setValor("clienteCP", f.cliente.cp);
    setValor("clienteLocalidad", f.cliente.localidad);
    setValor("clienteProvincia", f.cliente.provincia);
    setValor("clienteTelefono", f.cliente.telefono);
    setValor("clienteTipoDoc", f.cliente.tipoDoc || "DNI");
    setValor("clienteDoc", f.cliente.doc);

    setValor("descripcionSesion", f.servicio.descripcion);
    setValor("cantidad", f.servicio.cantidad);
    setValor("importe", f.servicio.importeUnitario);
    setValor("diaSesion", f.servicio.diaSesion);
    setChecked("desplazamientoIncluido", f.servicio.desplazamientoIncluido);
    setValor("desplazamientoImporte", f.servicio.desplazamientoImporte);
    setChecked("alojamientoIncluido", f.servicio.alojamientoIncluido);
    setValor("alojamientoImporte", f.servicio.alojamientoImporte);

    setValor("ivaRetenido", f.impuestos.ivaRetenido);
    setValor("ivaAplicado", f.impuestos.ivaAplicado);
    setValor("cuentaActual", f.pago.iban);
    setValor("observaciones", f.pago.observaciones);

    recalcularTotales();
    document.getElementById("modalHistorial").classList.remove("show");
    showToast("Factura cargada — modifica y genera PDF para actualizar");
  } catch (e) {
    console.error(e);
    showToast("Error al abrir factura", "red");
  }
}

async function eliminarFacturaHistorial(id) {
  if (!confirm("¿Borrar esta factura del historial?")) return;
  try {
    await db.collection("historial").doc(id).delete();
    // Si borramos la que estábamos editando, resetear
    if (facturaEditandoId === id) facturaEditandoId = null;
    showToast("Factura eliminada", "red");
    await mostrarHistorial();
  } catch (e) {
    console.error(e);
    showToast("Error al borrar", "red");
  }
}

async function mostrarHistorial() {
  const lista = document.getElementById("listaHistorial");
  const snapshot = await db.collection("historial").orderBy("createdAt", "desc").limit(50).get();

  lista.innerHTML = snapshot.empty
    ? "<p style='text-align:center; padding:20px;'>Historial vacío</p>"
    : "";

  snapshot.forEach(doc => {
    const f = doc.data() || {};
    const esActual = facturaEditandoId === doc.id;
    const puedeAbrir = !!(f.emisor && f.cliente && f.servicio);

    const clienteNombre = (f.cliente && f.cliente.nombre) ? f.cliente.nombre : (f.cliente || "");
    const total = f.totalTexto || f.total || "";
    const fecha = f.fecha || "";
    const numero = f.numero || "(sin nº)";

    const div = document.createElement("div");
    div.style.cssText = `
      border-bottom: 1px solid #334155;
      padding: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      ${esActual ? "background: #1e3a5f;" : ""}
    `;

    div.innerHTML = `
      <div style="flex:1; min-width:0;">
        <div style="font-weight:bold; color:${esActual ? "#f97316" : "#22c55e"}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${numero}
          ${esActual ? '<span style="font-size:0.75rem; background:#f97316; color:#fff; padding:1px 6px; border-radius:4px; margin-left:6px;">EDITANDO</span>' : ""}
          <span style="color:#94a3b8; font-weight:normal; font-size:0.8rem;">(${fecha})</span>
        </div>
        <div style="font-size:0.9rem; color:#e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${clienteNombre || "-"}
        </div>
        <div style="color:#f97316; font-weight:bold;">${total}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button
          onclick="cargarFacturaHistorial('${doc.id}')"
          title="${puedeAbrir ? "Ver y editar" : "No disponible (antigua)"}"
          ${puedeAbrir ? "" : "disabled"}
          style="width:38px; height:38px; background:${puedeAbrir ? "#3b82f6" : "#475569"}; border-radius:8px; padding:0; cursor:${puedeAbrir ? "pointer" : "not-allowed"};">
          👁️
        </button>
        <button
          onclick="eliminarFacturaHistorial('${doc.id}')"
          title="Borrar"
          style="width:38px; height:38px; background:#ef4444; border-radius:8px; padding:0; cursor:pointer;">
          🗑️
        </button>
      </div>
    `;
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

  // ✅ async/await para que window.print() espere a Firebase
  (async () => {
    try {
      await guardarOActualizarHistorial();
    } catch (e) {
      console.error("Error guardando historial:", e);
      showToast("Aviso: no se pudo guardar en historial", "red");
    }
    window.print();
  })();
}

/* --- INICIALIZACIÓN --- */
window.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("fechaFactura").value = new Date().toISOString().slice(0, 10);

  escucharClientes();
  escucharCuentas();
  await asignarNumeroFactura();

  document.getElementById("btnNuevaFactura").onclick = async () => {
    // ✅ Resetear modo edición al crear nueva factura
    facturaEditandoId = null;
    document.querySelectorAll(".card input:not([id^='emisor']), textarea").forEach(i => i.value = "");
    recalcularTotales();
    await asignarNumeroFactura();
    document.getElementById("clienteNombre").focus();
    showToast("Nueva factura lista");
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

  document.querySelectorAll("input, select, textarea").forEach(el => el.oninput = recalcularTotales);
  recalcularTotales();
});

// Globales para botones inline del historial
window.cargarFacturaHistorial = cargarFacturaHistorial;
window.eliminarFacturaHistorial = eliminarFacturaHistorial;