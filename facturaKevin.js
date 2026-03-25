// facturaKevin.js - Completo con Firebase, UI, multi-líneas y generación PDF (fallback si popup bloqueado)
// Nota: TITULO siempre "FACTURA". Aviso de reserva eliminado del encabezado; si reserva marcada, se añade en OBSERVACIONES en rojo vivo.

// ===== FIREBASE CONFIG =====
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
  if (!el) return;
  el.readOnly = true;
  el.style.opacity = "0.6";
  el.style.cursor = "not-allowed";
}

function desbloquearNumeroFactura() {
  const el = document.getElementById("numeroFactura");
  if (!el) return;
  el.readOnly = false;
  el.style.opacity = "1";
  el.style.cursor = "text";
}

/* --- UTILIDADES UI --- */
function showToast(message, type = "blue", duration = 2200) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.background = type === "red" ? "#ef4444" : "#6366f1";
  toast.classList.add("show");
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove("show"), duration);
}

function confirmarToast(mensaje) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirmOverlay");
    const msg = document.getElementById("confirmMsg");
    const btnSi = document.getElementById("confirmSi");
    const btnNo = document.getElementById("confirmNo");
    btnSi.className = "btn-red";
    btnNo.className = "btn-blue";
    msg.textContent = mensaje;
    overlay.classList.add("show");
    btnSi.onclick = () => { overlay.classList.remove("show"); resolve(true); };
    btnNo.onclick = () => { overlay.classList.remove("show"); resolve(false); };
  });
}

function promptAddSession(mensaje = "¿Añadir otra sesión?") {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirmOverlay");
    const msg = document.getElementById("confirmMsg");
    const btnSi = document.getElementById("confirmSi");
    const btnNo = document.getElementById("confirmNo");
    btnSi.className = "btn-blue";
    btnNo.className = "btn-red";
    msg.textContent = mensaje;
    overlay.classList.add("show");
    btnSi.onclick = () => { overlay.classList.remove("show"); btnSi.className = "btn-red"; btnNo.className = "btn-blue"; resolve(true); };
    btnNo.onclick = () => { overlay.classList.remove("show"); btnSi.className = "btn-red"; btnNo.className = "btn-blue"; resolve(false); };
  });
}

function formatoEuro(v) {
  return (Number(v) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function formatDateForPrint(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  const day = dt.toLocaleDateString('es-ES', { day: '2-digit' });
  const month = dt.toLocaleDateString('es-ES', { month: 'long' });
  const year = dt.getFullYear();
  return `${day}-${month}-${year}`;
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

/* --- SESSIONS MANAGEMENT --- */
let sessionContainer = null;
let sessionCounter = 0;

function createSessionLine(data = {}, focus = false) {
  sessionCounter++;
  if (data && data.default) {
    const el = document.querySelector('.session-line[data-default="true"]');
    if (el) el.dataset._tracked = "true";
    return el;
  }

  const div = document.createElement("div");
  div.className = "session-line";
  div.dataset._id = `session-${sessionCounter}`;

  div.innerHTML = `
    <div class="inline-4">
      <label>Cantidad
        <select class="session-cantidad">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
          <option value="7">7</option>
          <option value="8">8</option>
          <option value="9">9</option>
          <option value="10">10</option>
        </select>
      </label>
      <label>Importe Unitario (€)
        <input type="number" class="session-importe" step="0.01" placeholder="0.00">
      </label>
      <label>Día Sesión
        <input type="date" class="session-dia">
      </label>
      <label>Sala / Evento
        <input type="text" class="session-sala" placeholder="Ej: Pub, Discoteca...">
      </label>
    </div>
    <button type="button" class="remove-session" title="Eliminar sesión">✖</button>
  `;
  if (data.cantidad) div.querySelector('.session-cantidad').value = data.cantidad;
  if (data.importe) div.querySelector('.session-importe').value = data.importe;
  if (data.dia) div.querySelector('.session-dia').value = data.dia;
  if (data.sala) div.querySelector('.session-sala').value = data.sala;

  const inputs = div.querySelectorAll('input, select');
  inputs.forEach(i => {
    i.addEventListener('input', () => {
      recalcularTotales();
      checkAndPromptForNewLine(div);
    });
    // ensure editable
    i.disabled = false;
    i.readOnly = false;
  });

  div.querySelector('.remove-session').addEventListener('click', () => {
    div.remove();
    recalcularTotales();
  });

  sessionContainer.appendChild(div);
  if (focus) setTimeout(() => div.querySelector('.session-importe')?.focus(), 80);
  return div;
}

function getAllSessionLines() {
  const arr = [];
  const defaultEl = document.querySelector('.session-line[data-default="true"]');
  if (defaultEl) {
    const cantidad = Number(document.getElementById('cantidad')?.value) || 0;
    const importe = Number(document.getElementById('importe')?.value) || 0;
    const dia = document.getElementById('diaSesion')?.value || '';
    const sala = document.getElementById('sala')?.value || '';
    arr.push({ cantidad, importe, dia, sala, _source: 'default' });
  }
  document.querySelectorAll('#sessionLines .session-line').forEach(el => {
    if (el.dataset.default === "true") return;
    const cantidad = Number(el.querySelector('.session-cantidad')?.value) || 0;
    const importe = Number(el.querySelector('.session-importe')?.value) || 0;
    const dia = el.querySelector('.session-dia')?.value || '';
    const sala = el.querySelector('.session-sala')?.value || '';
    arr.push({ cantidad, importe, dia, sala, _source: el.dataset._id || '' });
  });
  return arr;
}

async function checkAndPromptForNewLine(lineEl) {
  const lines = Array.from(document.querySelectorAll('#sessionLines .session-line'));
  if (!lines.length || lines[lines.length - 1] !== lineEl) return;
  let importe = 0, dia = '';
  if (lineEl.dataset.default === "true") {
    importe = Number(document.getElementById('importe')?.value) || 0;
    dia = document.getElementById('diaSesion')?.value || '';
  } else {
    importe = Number(lineEl.querySelector('.session-importe')?.value) || 0;
    dia = lineEl.querySelector('.session-dia')?.value || '';
  }
  if (lineEl.dataset._prompted === "true") return;
  if (importe > 0 && dia) {
    lineEl.dataset._prompted = "true";
    if (await promptAddSession("¿Añadir otra sesión?")) createSessionLine({}, true);
  }
}

/* --- CÁLCULOS --- */
function recalcularTotales() {
  const sessions = getAllSessionLines();
  let baseTotalSesiones = 0;
  
  // Sumamos el total de TODAS las sesiones (Cantidad * Importe)
  sessions.forEach(s => {
    baseTotalSesiones += (Number(s.cantidad) || 0) * (Number(s.importe) || 0);
  });

  let baseFinal = baseTotalSesiones;

  const despIncluido = document.getElementById("desplazamientoIncluido").checked;
  const alojaIncluido = document.getElementById("alojamientoIncluido").checked;
  const esReserva = document.getElementById("reserva50").checked;

  // Mostrar/Ocultar campos extras
  const despFields = document.getElementById("desplazamientoFields");
  if (despFields) despFields.style.display = despIncluido ? "grid" : "none";
  const alojFields = document.getElementById("alojamientoFields");
  if (alojFields) alojFields.style.display = alojaIncluido ? "block" : "none";

  // Sumar extras a la base si existen
  if (despIncluido) {
    baseFinal += obtenerNumero("kmDesplazamiento") * (obtenerNumero("precioPorKm") || 0.19);
  }
  if (alojaIncluido) {
    baseFinal += obtenerNumero("costoAlojamiento");
  }

  // APLICAR RESERVA 50% SOBRE EL TOTAL DE LA BASE (Sesiones + Extras)
  if (esReserva) {
    baseFinal = baseFinal / 2;
  }

  const pctRetenido = obtenerNumero("ivaRetenido") / 100;
  const pctAplicado = obtenerNumero("ivaAplicado") / 100;
  
  const retenido = baseFinal * pctRetenido;
  const aplicado = baseFinal * pctAplicado;
  const total = baseFinal - retenido + aplicado;

  // Actualizar la interfaz
  const subtotalEl = document.getElementById("subtotal");
  if (subtotalEl) subtotalEl.textContent = formatoEuro(baseFinal);
  const ivaRetEl = document.getElementById("ivaRetenidoImporte");
  if (ivaRetEl) ivaRetEl.textContent = "- " + formatoEuro(retenido);
  const ivaImpEl = document.getElementById("ivaImporte");
  if (ivaImpEl) ivaImpEl.textContent = "+ " + formatoEuro(aplicado);
  const totalEl = document.getElementById("total");
  if (totalEl) totalEl.textContent = formatoEuro(total);
}

/* --- FIRESTORE: CLIENTES & CUENTAS --- */
function escucharClientes() {
  db.collection("clientes").orderBy("nombre").onSnapshot(snapshot => {
    const sel = document.getElementById("clientesGuardados");
    if (!sel) return;
    const valorActual = sel.value;
    sel.innerHTML = '<option value="">Seleccionar cliente...</option>';
    snapshot.forEach(doc => {
      const opt = document.createElement("option");
      opt.value = doc.id; opt.textContent = doc.data().nombre;
      sel.appendChild(opt);
    });
    if (valorActual) sel.value = valorActual;
  });
}

function rellenarCliente() {
  const id = document.getElementById("clientesGuardados").value;
  if (!id) return;
  db.collection("clientes").doc(id).get().then(doc => {
    if (!doc.exists) return;
    const d = doc.data();
    setValor("clienteNombre", d.nombre); setValor("clienteEmail", d.email);
    setValor("clienteDireccion", d.direccion); setValor("clienteCP", d.cp);
    setValor("clienteLocalidad", d.localidad); setValor("clienteProvincia", d.provincia);
    setValor("clienteTelefono", d.telefono); setValor("clienteTipoDoc", d.tipoDoc);
    setValor("clienteDoc", d.doc);
    // Ensure recalculation after loading
    setTimeout(recalcularTotales, 60);
  });
}

async function guardarCliente() {
  const nombre = obtenerTexto("clienteNombre").trim();
  if (!nombre) { showToast("Escribe el nombre del cliente", "red"); return; }
  const datos = {
    nombre, email: obtenerTexto("clienteEmail"), direccion: obtenerTexto("clienteDireccion"),
    cp: obtenerTexto("clienteCP"), localidad: obtenerTexto("clienteLocalidad"),
    provincia: obtenerTexto("clienteProvincia"), telefono: obtenerTexto("clienteTelefono"),
    tipoDoc: obtenerTexto("clienteTipoDoc"), doc: obtenerTexto("clienteDoc")
  };
  const sel = document.getElementById("clientesGuardados");
  try {
    if (sel && sel.value) { await db.collection("clientes").doc(sel.value).set(datos); showToast("Cliente actualizado ✅"); }
    else { const ref = await db.collection("clientes").add(datos); if (sel) sel.value = ref.id; showToast("Cliente guardado ✅"); }
  } catch (e) { showToast("Error al guardar cliente", "red"); }
}

async function eliminarCliente() {
  const sel = document.getElementById("clientesGuardados");
  if (!sel || !sel.value) { showToast("Selecciona un cliente", "red"); return; }
  if (!await confirmarToast("¿Eliminar este cliente?")) return;
  await db.collection("clientes").doc(sel.value).delete();
  sel.value = "";
  ["clienteNombre", "clienteEmail", "clienteDireccion", "clienteCP", "clienteLocalidad", "clienteProvincia", "clienteTelefono", "clienteDoc"].forEach(i => setValor(i, ""));
  showToast("Cliente eliminado 🗑️", "red");
}

function escucharCuentas() {
  db.collection("cuentas").onSnapshot(snapshot => {
    const sel = document.getElementById("cuentasGuardadas");
    if (!sel) return;
    const valorActual = sel.value;
    sel.innerHTML = '<option value="">Seleccionar cuenta...</option>';
    snapshot.forEach(doc => {
      const opt = document.createElement("option");
      opt.value = doc.data().iban; opt.textContent = doc.data().iban;
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
  if (!await confirmarToast("¿Eliminar esta cuenta?")) return;
  const snap = await db.collection("cuentas").where("iban", "==", iban).get();
  snap.forEach(doc => doc.ref.delete());
  showToast("Cuenta eliminada 🗑️", "red");
}

/* --- NUMERACIÓN DE FACTURAS --- */
async function asignarNumeroFactura() {
  try {
    const snap = await db.collection("facturas").orderBy("timestamp", "desc").limit(1).get();
    let siguiente = 6;
    if (!snap.empty) {
      const ultimo = snap.docs[0].data().numero || "0";
      const numStr = String(ultimo).split("-")[0];
      const num = parseInt(numStr);
      if (!isNaN(num)) siguiente = num + 1;
    }
    setValor("numeroFactura", `${siguiente}-${new Date().getFullYear()}`);
    bloquearNumeroFactura();
  } catch (e) {
    setValor("numeroFactura", `6-${new Date().getFullYear()}`);
    bloquearNumeroFactura();
  }
}

/* --- HISTORIAL DE FACTURAS --- */
async function guardarOActualizarHistorial() {
  const numero = obtenerTexto("numeroFactura").trim();
  const cliente = obtenerTexto("clienteNombre").trim();
  if (!numero || !cliente) { showToast("Completa nº factura y cliente", "red"); return; }

  const sessions = getAllSessionLines().map(s => ({ cantidad: s.cantidad, importe: s.importe, dia: s.dia, sala: s.sala }));
  const datos = {
    numero, cliente, total: document.getElementById("total").textContent,
    fecha: obtenerTexto("fechaFactura"), nif: obtenerTexto("emisorNif"),
    email: obtenerTexto("clienteEmail"), direccion: obtenerTexto("clienteDireccion"),
    cp: obtenerTexto("clienteCP"), localidad: obtenerTexto("clienteLocalidad"),
    provincia: obtenerTexto("clienteProvincia"), telefono: obtenerTexto("clienteTelefono"),
    tipoDoc: obtenerTexto("clienteTipoDoc"), doc: obtenerTexto("clienteDoc"),
    descripcion: obtenerTexto("descripcionSesion"), ivaRetenido: obtenerNumero("ivaRetenido"),
    ivaAplicado: obtenerNumero("ivaAplicado"), desplazamiento: document.getElementById("desplazamientoIncluido").checked,
    reserva50: document.getElementById("reserva50").checked,
    km: obtenerNumero("kmDesplazamiento"), precioPorKm: obtenerNumero("precioPorKm"),
    alojamiento: document.getElementById("alojamientoIncluido").checked,
    costoAlojamiento: obtenerNumero("costoAlojamiento"), cuenta: obtenerTexto("cuentaActual"),
    observaciones: obtenerTexto("observaciones"), sessions,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    const editId = getFacturaEditandoId();
    if (editId) { await db.collection("facturas").doc(editId).set(datos); showToast("Factura actualizada ✅"); }
    else { await db.collection("facturas").add(datos); showToast("Factura guardada ✅"); await asignarNumeroFactura(); }
  } catch (e) { showToast("Error al guardar factura", "red"); }
}

async function mostrarHistorial() {
  const modal = document.getElementById("modalHistorial");
  if (!modal) return;
  modal.classList.add("show");
  const lista = document.getElementById("listaHistorial");
  lista.innerHTML = "<p style='color:#94a3b8;text-align:center;padding:20px;'>Cargando historial...</p>";
  const snap = await db.collection("facturas").orderBy("timestamp", "desc").get();
  if (snap.empty) { lista.innerHTML = "<p style='color:#94a3b8;text-align:center;padding:20px;'>No hay facturas</p>"; return; }
  lista.innerHTML = "";
  snap.forEach(doc => {
    const d = doc.data();
    const item = document.createElement("div");
    item.className = "historial-item";
    item.innerHTML = `
      <div class="historial-info"><strong>Factura ${d.numero} — ${d.cliente}</strong><span class="historial-total">${d.total}</span></div>
      <div class="historial-btns">
        <button class="btn-cargar-factura" title="Cargar">👁️</button>
        <button class="btn-duplicar-factura" title="Duplicar">📋</button>
        <button class="btn-borrar-factura btn-cerrar" title="Borrar">✖</button>
      </div>`;
    item.querySelector(".btn-cargar-factura").onclick = () => { cargarFactura(doc.id, d); modal.classList.remove("show"); };
    item.querySelector(".btn-duplicar-factura").onclick = () => { cargarFactura(null, d); modal.classList.remove("show"); };
    item.querySelector(".btn-borrar-factura").onclick = async () => {
      if (await confirmarToast(`¿Borrar factura ${d.numero}?`)) {
        await db.collection("facturas").doc(doc.id).delete();
        mostrarHistorial();
      }
    };
    lista.appendChild(item);
  });
}

/* --- Helpers to ensure fields are editable and listeners attached --- */

function enableAllFormFields(keepNumeroBlockedIfEditing = true) {
  // habilita TODOS los inputs/selects/textarea dentro de .card
  document.querySelectorAll(".card input, .card textarea, .card select").forEach(el => {
    if (!el) return;
    // quitar atributos que puedan bloquear
    el.disabled = false;
    el.readOnly = false;
    el.removeAttribute('readonly');
    el.removeAttribute('disabled');
  });
  // si estamos editando y queremos bloquear número, aplicar bloqueo al final
  const editId = getFacturaEditandoId();
  if (keepNumeroBlockedIfEditing && editId) {
    bloquearNumeroFactura();
  } else {
    desbloquearNumeroFactura();
  }
}

function attachListenersToDefaultRow(defaultWrapper) {
  if (!defaultWrapper) return;
  const inputs = defaultWrapper.querySelectorAll('input, select');
  inputs.forEach(i => {
    // remove duplicates by cloning (safe approach)
    const newEl = i.cloneNode(true);
    i.parentNode.replaceChild(newEl, i);
  });
  // re-query
  const reInputs = defaultWrapper.querySelectorAll('input, select');
  reInputs.forEach(i => {
    i.disabled = false;
    i.readOnly = false;
    i.addEventListener('input', () => {
      recalcularTotales();
      checkAndPromptForNewLine(defaultWrapper);
    });
  });
}

/* --- CARGAR FACTURA (editable) --- */
function cargarFactura(id, d) {
  setFacturaEditandoId(id);
  // Reset session counter to avoid duplicados de IDs
  sessionCounter = 0;

  // Habilitar todos los campos primero (dejaremos número bloqueado si corresponde)
  enableAllFormFields(true);

  // Bloquear número si estamos editando (mantener comportamiento deseado)
  if (id) bloquearNumeroFactura(); else desbloquearNumeroFactura();

  // Poner valores básicos
  setValor("numeroFactura", d.numero); setValor("fechaFactura", d.fecha || new Date().toISOString().slice(0,10));
  setValor("clienteNombre", d.cliente); setValor("clienteEmail", d.email);
  setValor("clienteDireccion", d.direccion); setValor("clienteCP", d.cp);
  setValor("clienteLocalidad", d.localidad); setValor("clienteProvincia", d.provincia);
  setValor("clienteTelefono", d.telefono); setValor("clienteTipoDoc", d.tipoDoc);
  setValor("clienteDoc", d.doc); setValor("descripcionSesion", d.descripcion || "");
  setChecked("desplazamientoIncluido", d.desplazamiento || false);
  setChecked("reserva50", d.reserva50 || false);
  setValor("kmDesplazamiento", d.km || ""); setValor("precioPorKm", d.precioPorKm || "");
  setChecked("alojamientoIncluido", d.alojamiento || false);
  setValor("costoAlojamiento", d.costoAlojamiento || "");
  setValor("cuentaActual", d.cuenta || ""); setValor("observaciones", d.observaciones || "");

  // Reconstruir líneas: limpiamos contenedor y añadimos fila default y resto de líneas
  if (sessionContainer) sessionContainer.innerHTML = '';

  // Default row (IDs: cantidad, importe, diaSesion, sala)
  const defaultWrapper = document.createElement('div');
  defaultWrapper.className = 'session-line';
  defaultWrapper.dataset.default = "true";
  defaultWrapper.innerHTML = `<div class="inline-4">
    <label>Cantidad<select id="cantidad"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option><option value="10">10</option></select></label>
    <label>Importe Unitario (€)<input type="number" id="importe" step="0.01" placeholder="0.00"></label>
    <label>Día Sesión<input type="date" id="diaSesion"></label>
    <label>Sala / Evento<input type="text" id="sala" placeholder="Ej: Pub, Discoteca..."></label>
  </div>`;
  sessionContainer.appendChild(defaultWrapper);
  // Attach listeners + ensure editable
  attachListenersToDefaultRow(defaultWrapper);

  // setear valores de la primera línea si existen
  if (d.sessions && d.sessions.length) {
    const first = d.sessions[0];
    setTimeout(() => {
      setValor('cantidad', first.cantidad || 1);
      setValor('importe', first.importe || '');
      setValor('diaSesion', first.dia || '');
      setValor('sala', first.sala || '');
      recalcularTotales();
    }, 30);
    // agregar el resto de líneas como session-line editables
    for (let i = 1; i < d.sessions.length; i++) {
      // createSessionLine ya añade listeners y deja editables
      createSessionLine(d.sessions[i]);
    }
  } else {
    // no hay sesiones guardadas -> dejar default vacía
    setTimeout(recalcularTotales, 30);
  }

  // Asegurarse que todos los inputs están habilitados tras reconstruir DOM
  enableAllFormFields(true);

  // re-attach event listeners comunes (por si los IDs se han recreado)
  ['cantidad','importe','diaSesion','sala'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      // remove duplicates by cloning then add
      const clone = el.cloneNode(true);
      el.parentNode.replaceChild(clone, el);
      clone.addEventListener('input', recalcularTotales);
    }
  });

  setValor("ivaRetenido", d.ivaRetenido || 0); setValor("ivaAplicado", d.ivaAplicado || 10);

  // recalc totals and focus client section
  recalcularTotales();

  // Scroll y focus en nombre cliente
  const seccion = document.getElementById("seccionCliente");
  if (seccion) {
    seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      const clienteNombre = document.getElementById("clienteNombre");
      if (clienteNombre) clienteNombre.focus();
    }, 600);
  }
}

/* --- IMPRESIÓN PDF (A4) - sin aviso superior; TITULO siempre 'FACTURA' --- */
function prepararImpresion() {
  try {
    const esReserva = document.getElementById("reserva50").checked;
    const titulo = "FACTURA"; // siempre FACTURA, sin texto reserva arriba

    const sessions = getAllSessionLines();
    let sessionsHtml = '';
    sessions.forEach(s => {
      sessionsHtml += `<tr>
        <td style="padding:6px;border:1px solid #e6e6e6;">${formatDateForPrint(s.dia)}</td>
        <td style="padding:6px;border:1px solid #e6e6e6;">${s.sala || ''}</td>
        <td style="padding:6px;border:1px solid #e6e6e6;text-align:right;">${s.cantidad}</td>
        <td style="padding:6px;border:1px solid #e6e6e6;text-align:right;">${formatoEuro(s.importe)}</td>
        <td style="padding:6px;border:1px solid #e6e6e6;text-align:right;">${formatoEuro(s.cantidad * s.importe)}</td>
      </tr>`;
    });

    // Observaciones: añadir texto de reserva en rojo vivo si está marcada
    const observacionesOriginal = obtenerTexto("observaciones");
    const observacionesReserva = esReserva ? `<span style="color:#ff0000; font-weight:bold;">⚠️ FACTURA DE RESERVA - 50% ADELANTO.</span> ` : "";
    const observacionesFinal = observacionesReserva + observacionesOriginal;

    const contenido = `
      <div class="print-header">
        <div>
          <h1 style="margin:0;font-size:22px;color:#1e40af;letter-spacing:1px;">KEVIN CHECA</h1>
          <div style="font-weight:800;margin-top:4px;font-size:16px;color:#1e293b;">${titulo}</div>
        </div>
        <img src="${document.querySelector(".logo-kevin")?.src || ''}" class="print-logo" alt="logo">
      </div>

      <div class="print-card">
        <div class="print-section-title">DATOS DEL EMISOR</div>
        <div class="print-grid-3">
          <div><div class="print-label">NOMBRE</div><div class="print-value">${obtenerTexto("emisorNombre")}</div></div>
          <div><div class="print-label">NIF</div><div class="print-value">${obtenerTexto("emisorNif")}</div></div>
          <div><div class="print-label">C.P.</div><div class="print-value">${obtenerTexto("emisorCP")}</div></div>
        </div>
        <div style="margin-top:8px; display:flex; gap:20px;">
          <div><div class="print-label">Nº FACTURA</div><div class="print-value" style="font-weight:800; color:#1e40af;">${obtenerTexto("numeroFactura")}</div></div>
          <div><div class="print-label">FECHA EMISIÓN</div><div class="print-value">${formatDateForPrint(obtenerTexto("fechaFactura"))}</div></div>
        </div>
      </div>

      <div class="print-card">
        <div class="print-section-title">DATOS DEL CLIENTE</div>
        <div class="print-grid-2">
          <div><div class="print-label">NOMBRE / RAZÓN SOCIAL</div><div class="print-value" style="font-weight:700;">${obtenerTexto("clienteNombre")}</div></div>
          <div><div class="print-label">EMAIL</div><div class="print-value">${obtenerTexto("clienteEmail")}</div></div>
        </div>
        <div style="margin-top:8px;"><div class="print-label">DIRECCIÓN Y LOCALIDAD</div><div class="print-value">${obtenerTexto("clienteDireccion")} - ${obtenerTexto("clienteLocalidad")} (${obtenerTexto("clienteCP")})</div></div>
        <div style="margin-top:8px;"><div class="print-label">${obtenerTexto("clienteTipoDoc")}</div><div class="print-value">${obtenerTexto("clienteDoc")}</div></div>
      </div>

      <div class="print-card">
        <div class="print-section-title">DETALLES DEL SERVICIO</div>
        <div class="print-value" style="white-space:pre-wrap; margin-bottom:10px; font-style:italic; color:#475569;">${obtenerTexto("descripcionSesion")}</div>
        <table style="width:100%; border-collapse: collapse; font-size:11px;">
          <thead><tr style="background:#f1f5f9;">
            <th style="text-align:left;padding:8px;border:1px solid #cbd5e1;">DÍA</th>
            <th style="text-align:left;padding:8px;border:1px solid #cbd5e1;">SALA / EVENTO</th>
            <th style="text-align:right;padding:8px;border:1px solid #cbd5e1;">CANT.</th>
            <th style="text-align:right;padding:8px;border:1px solid #cbd5e1;">PRECIO U.</th>
            <th style="text-align:right;padding:8px;border:1px solid #cbd5e1;">TOTAL LÍNEA</th>
          </tr></thead>
          <tbody>${sessionsHtml}</tbody>
        </table>

        <div class="print-totales" style="margin-top:10px;">
          <div class="print-total-row"><span>Subtotal:</span><span>${document.getElementById("subtotal").textContent}</span></div>
          <div class="print-total-row"><span>IVA Retenido (${obtenerNumero("ivaRetenido")}%):</span><span>${document.getElementById("ivaRetenidoImporte").textContent}</span></div>
          <div class="print-total-row"><span>IVA (${obtenerNumero("ivaAplicado")}%):</span><span>${document.getElementById("ivaImporte").textContent}</span></div>
          <div class="print-total-row print-total-final" style="margin-top:6px;"><span>TOTAL A PAGAR:</span><span>${document.getElementById("total").textContent}</span></div>
        </div>
      </div>

      <div class="print-card">
        <div class="print-section-title">DATOS DE PAGO</div>
        <div class="print-label">IBAN</div>
        <div class="print-value" style="font-weight:800;">${obtenerTexto("cuentaActual")}</div>
        <div style="margin-top:8px;" class="print-label">OBSERVACIONES</div>
        <div class="print-value">${observacionesFinal}</div>
      </div>

      <div class="print-footer">¡GRACIAS POR TU CONFIANZA!</div>
    `;

    const html = `
      <html>
        <head>
          <title>Factura ${obtenerTexto("numeroFactura")}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <style>
            @page { size: A4; margin: 0; }
            html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; background: white; }
            body { display:flex; align-items:flex-start; justify-content:center; }
            .factura-wrapper {
              width: 210mm;
              height: 297mm;
              padding: 12mm;
              box-sizing: border-box;
              background: #ffffff;
              color: #1e293b;
              font-family: Arial, Helvetica, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #3b82f6; padding-bottom:8px; margin-bottom:10px; }
            .print-logo { width:60px; height:60px; border-radius:50%; object-fit:cover; border:2px solid #3b82f6; }
            .print-card { background:#f8fafc; border:1px solid #e2e8f0; padding:10px; margin-bottom:8px; border-radius:6px; }
            .print-section-title { font-size:10px; font-weight:800; color:#1e40af; margin-bottom:6px; }
            .print-grid-2 { display:grid; grid-template-columns: 1fr 1fr; gap:8px; }
            .print-grid-3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; }
            .print-label { font-size:9px; color:#64748b; text-transform:uppercase; }
            .print-value { font-size:12px; margin-top:2px; color:#0f172a; }
            .print-totales { background:#f1f5f9; padding:8px; border-radius:4px; margin-top:8px; }
            .print-total-row { display:flex; justify-content:space-between; font-size:11px; padding:2px 0; color:#475569; }
            .print-total-final { border-top:2px solid #3b82f6; font-size:13px; font-weight:800; color:#f97316; padding-top:6px; margin-top:6px; }
            table { width:100%; border-collapse:collapse; font-size:12px; }
            th, td { border:1px solid #e6e6e6; padding:6px; }
            .print-footer { text-align:center; font-size:10px; color:#64748b; margin-top:8px; border-top:1px solid #e2e8f0; padding-top:8px; }
            @media print {
              html,body { width:210mm; height:297mm; }
              .factura-wrapper { box-shadow:none; margin:0; }
            }
          </style>
        </head>
        <body>
          <div class="factura-wrapper">${contenido}</div>
          <script>
            window.addEventListener('load', function() {
              setTimeout(function() {
                try { window.print(); } catch (e) { console.warn(e); }
              }, 400);
            });
            window.onafterprint = function() { setTimeout(function(){ window.close(); }, 300); };
          <\/script>
        </body>
      </html>
    `;

    // Intentar abrir ventana normal
    let ventana = null;
    try {
      ventana = window.open("", "_blank");
    } catch (e) {
      ventana = null;
    }

    if (ventana && ventana.document) {
      // Escribimos directamente
      ventana.document.open();
      ventana.document.write(html);
      ventana.document.close();
      showToast("Abriendo vista de impresión...", "blue", 3000);
    } else {
      // Fallback si popup bloqueado: crear blob y abrir su URL
      try {
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        showToast("Popup bloqueado. Abriendo en nueva pestaña (fallback).", "red", 4000);
      } catch (e) {
        showToast("No se pudo abrir la vista de impresión. Revisa bloqueo de popups.", "red", 5000);
        console.error("Error al abrir fallback de impresión:", e);
      }
    }
  } catch (err) {
    console.error("Error prepararImpresion:", err);
    showToast("Error al preparar impresión. Revisa consola.", "red", 4000);
  }
}

/* --- INICIALIZACIÓN Y EVENTOS --- */
window.addEventListener("DOMContentLoaded", async () => {
  sessionContainer = document.getElementById("sessionLines");
  document.getElementById("fechaFactura").value = new Date().toISOString().slice(0, 10);

  // listeners Firestore
  escucharClientes(); escucharCuentas();
  await asignarNumeroFactura();

  // btn editar número
  const btnEditarNumero = document.getElementById("btnEditarNumero");
  if (btnEditarNumero) {
    btnEditarNumero.onclick = () => {
      const num = document.getElementById("numeroFactura");
      if (num.readOnly) { desbloquearNumeroFactura(); num.focus(); } else bloquearNumeroFactura();
    };
  }

  // crear línea por defecto si no existe
  if (!document.querySelector('.session-line[data-default="true"]')) {
    const defaultWrapper = document.createElement('div');
    defaultWrapper.className = 'session-line';
    defaultWrapper.dataset.default = "true";
    defaultWrapper.innerHTML = `<div class="inline-4">
      <label>Cantidad<select id="cantidad"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option><option value="10">10</option></select></label>
      <label>Importe Unitario (€)<input type="number" id="importe" step="0.01" placeholder="0.00"></label>
      <label>Día Sesión<input type="date" id="diaSesion"></label>
      <label>Sala / Evento<input type="text" id="sala" placeholder="Ej: Pub, Discoteca..."></label>
    </div>`;
    sessionContainer.appendChild(defaultWrapper);
    // attach listeners to default row inputs
    attachListenersToDefaultRow(defaultWrapper);
  }

  // eventos principales
  const btnAgregar = document.getElementById('btnAgregarSesionManual');
  if (btnAgregar) btnAgregar.onclick = () => createSessionLine({}, true);

  ['cantidad','importe','diaSesion','sala'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalcularTotales);
  });

  const nuevaBtn = document.getElementById("btnNuevaFacturaFixed");
  if (nuevaBtn) {
    nuevaBtn.onclick = async () => {
      setFacturaEditandoId(null); desbloquearNumeroFactura();
      // limpiar inputs no emisores
      document.querySelectorAll(".card input:not([id^='emisor']), .card textarea:not([id^='emisor']), .card select:not([id^='emisor'])").forEach(i => {
        if (i.type === 'checkbox') i.checked = false;
        else i.value = "";
        i.disabled = false;
        i.readOnly = false;
        i.removeAttribute('disabled');
        i.removeAttribute('readonly');
      });
      // reset sesiones
      if (sessionContainer) { sessionContainer.innerHTML = ''; 
        sessionCounter = 0;
        const defaultWrapper = document.createElement('div');
        defaultWrapper.className = 'session-line'; defaultWrapper.dataset.default = "true";
        defaultWrapper.innerHTML = `<div class="inline-4">
          <label>Cantidad<select id="cantidad"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option><option value="10">10</option></select></label>
          <label>Importe Unitario (€)<input type="number" id="importe" step="0.01" placeholder="0.00"></label>
          <label>Día Sesión<input type="date" id="diaSesion"></label>
          <label>Sala / Evento<input type="text" id="sala" placeholder="Ej: Pub, Discoteca..."></label>
        </div>`;
        sessionContainer.appendChild(defaultWrapper);
        // attach listeners
        attachListenersToDefaultRow(defaultWrapper);
      }
      recalcularTotales(); await asignarNumeroFactura();
      const seccion = document.getElementById("seccionCliente");
      if (seccion) { seccion.scrollIntoView({ behavior: 'smooth' }); setTimeout(() => document.getElementById("clienteNombre").focus(), 600); }
    };
  }

  const btnGuardarFactura = document.getElementById("btnGuardarFactura");
  if (btnGuardarFactura) btnGuardarFactura.onclick = guardarOActualizarHistorial;

  const btnPDF = document.getElementById("btnPDF");
  if (btnPDF) btnPDF.onclick = prepararImpresion;

  const btnGuardarCliente = document.getElementById("btnGuardarCliente");
  if (btnGuardarCliente) btnGuardarCliente.onclick = guardarCliente;

  const btnEliminarCliente = document.getElementById("btnEliminarCliente");
  if (btnEliminarCliente) btnEliminarCliente.onclick = eliminarCliente;

  const selClientes = document.getElementById("clientesGuardados");
  if (selClientes) selClientes.onchange = rellenarCliente;

  const btnGuardarCuenta = document.getElementById("btnGuardarCuenta");
  if (btnGuardarCuenta) btnGuardarCuenta.onclick = guardarCuenta;

  const btnEliminarCuenta = document.getElementById("btnEliminarCuenta");
  if (btnEliminarCuenta) btnEliminarCuenta.onclick = eliminarCuenta;

  const selCuentas = document.getElementById("cuentasGuardadas");
  if (selCuentas) selCuentas.onchange = (e) => setValor("cuentaActual", e.target.value);

  const btnVerHistorial = document.getElementById("btnVerHistorial");
  if (btnVerHistorial) btnVerHistorial.onclick = mostrarHistorial;

  const btnCerrarHistorial = document.getElementById("btnCerrarHistorial");
  if (btnCerrarHistorial) btnCerrarHistorial.onclick = () => document.getElementById("modalHistorial").classList.remove("show");

  const despEl = document.getElementById("desplazamientoIncluido");
  if (despEl) despEl.onchange = recalcularTotales;
  const alojEl = document.getElementById("alojamientoIncluido");
  if (alojEl) alojEl.onchange = recalcularTotales;
  const reservaEl = document.getElementById("reserva50");
  if (reservaEl) reservaEl.onchange = recalcularTotales;
  ['ivaRetenido','ivaAplicado','kmDesplazamiento','precioPorKm','costoAlojamiento'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalcularTotales);
  });

  recalcularTotales();
});