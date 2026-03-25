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
function showToast(message, type = "blue", duration = 2200) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.background = type === "red" ? "#ef4444" : "#6366f1";
  toast.classList.add("show");
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove("show"), duration);
}

// confirmarToast (ya existía) - mantiene funcionalidad borrado, etc.
function confirmarToast(mensaje) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirmOverlay");
    const msg = document.getElementById("confirmMsg");
    const btnSi = document.getElementById("confirmSi");
    const btnNo = document.getElementById("confirmNo");
    // Restaurar clases por defecto para usos generales (Si = rojo, No = azul)
    btnSi.className = "btn-red";
    btnNo.className = "btn-blue";

    msg.textContent = mensaje;
    overlay.classList.add("show");

    btnSi.onclick = () => {
      overlay.classList.remove("show");
      resolve(true);
    };
    btnNo.onclick = () => {
      overlay.classList.remove("show");
      resolve(false);
    };
  });
}

// prompt específico para "Añadir otra sesión?" (Sí azul, No rojo)
function promptAddSession(mensaje = "¿Añadir otra sesión?") {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirmOverlay");
    const msg = document.getElementById("confirmMsg");
    const btnSi = document.getElementById("confirmSi");
    const btnNo = document.getElementById("confirmNo");
    // Invertimos colores para esta pregunta concreta (Si = azul, No = rojo)
    btnSi.className = "btn-blue";
    btnNo.className = "btn-red";

    msg.textContent = mensaje;
    overlay.classList.add("show");

    btnSi.onclick = () => {
      overlay.classList.remove("show");
      // Restauramos clases por defecto para siguientes usos
      btnSi.className = "btn-red";
      btnNo.className = "btn-blue";
      resolve(true);
    };
    btnNo.onclick = () => {
      overlay.classList.remove("show");
      btnSi.className = "btn-red";
      btnNo.className = "btn-blue";
      resolve(false);
    };
  });
}

function formatoEuro(v) {
  return (Number(v) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
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

/* --- SESSIONS MANAGEMENT (multi-line) --- */
const sessionContainer = document.getElementById ? document.getElementById("sessionLines") : null;
let sessionCounter = 0;

function createSessionLine(data = {}, focus = false) {
  // data: { cantidad, importe, dia }
  sessionCounter++;
  // If data.default === true, we use the existing inputs (they already exist in DOM)
  if (data && data.default) {
    // mark default as 'tracked' by returning an object mapping to existing IDs
    const el = document.querySelector('.session-line[data-default="true"]');
    if (el) {
      el.dataset._tracked = "true";
    }
    return el;
  }

  // Build a new line (no duplicate IDs)
  const div = document.createElement("div");
  div.className = "session-line";
  div.dataset._id = `session-${sessionCounter}`;

  div.innerHTML = `
    <div class="inline-3">
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
    </div>
    <button type="button" class="remove-session" title="Eliminar sesión">✖</button>
  `;
  // set provided values if any
  if (data.cantidad) div.querySelector('.session-cantidad').value = data.cantidad;
  if (data.importe) div.querySelector('.session-importe').value = data.importe;
  if (data.dia) div.querySelector('.session-dia').value = data.dia;

  // listeners to recalc and to prompt when filled
  const cantidadEl = div.querySelector('.session-cantidad');
  const importeEl = div.querySelector('.session-importe');
  const diaEl = div.querySelector('.session-dia');
  const inputs = [cantidadEl, importeEl, diaEl];
  inputs.forEach(i => {
    i.addEventListener('input', () => {
      recalcularTotales();
      checkAndPromptForNewLine(div);
    });
  });

  // remove behavior
  div.querySelector('.remove-session').addEventListener('click', () => {
    div.remove();
    recalcularTotales();
  });

  sessionContainer.appendChild(div);

  if (focus) {
    setTimeout(() => {
      const imp = div.querySelector('.session-importe');
      if (imp) imp.focus();
    }, 80);
  }

  return div;
}

// returns array of session objects derived from DOM (both default line and extra ones)
function getAllSessionLines() {
  const arr = [];

  // default (original) line
  const defaultEl = document.querySelector('.session-line[data-default="true"]');
  if (defaultEl) {
    const cantidad = Number(document.getElementById('cantidad')?.value) || 0;
    const importe = Number(document.getElementById('importe')?.value) || 0;
    const dia = document.getElementById('diaSesion')?.value || '';
    arr.push({ cantidad, importe, dia, _source: 'default' });
  }

  // other dynamically added lines
  (document.querySelectorAll('#sessionLines .session-line') || []).forEach(el => {
    if (el.dataset.default === "true") return; // skip default
    const cantidad = Number(el.querySelector('.session-cantidad')?.value) || 0;
    const importe = Number(el.querySelector('.session-importe')?.value) || 0;
    const dia = el.querySelector('.session-dia')?.value || '';
    arr.push({ cantidad, importe, dia, _source: el.dataset._id || '' });
  });

  return arr;
}

// helper: if this line is the last one and becomes filled, prompt to add another
async function checkAndPromptForNewLine(lineEl) {
  // only prompt if this is the last line in the container
  const lines = Array.from(document.querySelectorAll('#sessionLines .session-line'));
  if (!lines.length) return;
  const last = lines[lines.length - 1];
  if (last !== lineEl) return;

  // check if filled: importe > 0 and dia not empty
  let importe = 0;
  let dia = '';
  if (lineEl.dataset.default === "true") {
    importe = Number(document.getElementById('importe')?.value) || 0;
    dia = document.getElementById('diaSesion')?.value || '';
  } else {
    importe = Number(lineEl.querySelector('.session-importe')?.value) || 0;
    dia = lineEl.querySelector('.session-dia')?.value || '';
  }

  // If already prompted for this line, don't reprompt
  if (lineEl.dataset._prompted === "true") return;

  if (importe > 0 && dia) {
    // mark as prompted to avoid duplicate prompts
    lineEl.dataset._prompted = "true";
    const quiere = await promptAddSession("¿Añadir otra sesión?");
    if (quiere) {
      createSessionLine({}, true);
    }
  }
}

/* --- CÁLCULOS --- */
function recalcularTotales() {
  // Sum over all session lines
  const sessions = getAllSessionLines();
  let base = 0;
  sessions.forEach(s => {
    const lineBase = (Number(s.cantidad) || 0) * (Number(s.importe) || 0);
    base += lineBase;
  });

  // Añadir desplazamiento y alojamiento (aplican a toda factura)
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

  try {
    if (idExistente) {
      await db.collection("clientes").doc(idExistente).set(datos);
      showToast("Cliente actualizado ✅");
    } else {
      const ref = await db.collection("clientes").add(datos);
      sel.value = ref.id;
      showToast("Cliente guardado ✅");
    }
  } catch (e) {
    showToast("Error al guardar cliente", "red");
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
  ["clienteNombre", "clienteEmail", "clienteDireccion", "clienteCP", "clienteLocalidad", "clienteProvincia", "clienteTelefono", "clienteDoc"].forEach(i => setValor(i, ""));
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

  // gather sessions array
  const sessions = getAllSessionLines().map(s => ({
    cantidad: s.cantidad,
    importe: s.importe,
    dia: s.dia
  }));

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
    // antiguas propiedades (compatibilidad)
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
    sessions, // NUEVO: array con todas las sesiones
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };

  const editandoId = getFacturaEditandoId();
  try {
    if (editandoId) {
      await db.collection("facturas").doc(editandoId).set(datos);
      showToast("Factura actualizada ✅");
    } else {
      await db.collection("facturas").add(datos);
      showToast("Factura guardada ✅");
      await asignarNumeroFactura();
    }
  } catch (e) {
    showToast("Error al guardar factura", "red");
  }
}

async function mostrarHistorial() {
  document.getElementById("modalHistorial").classList.add("show");
  const lista = document.getElementById("listaHistorial");
  lista.innerHTML = "<p style='color:#94a3b8;text-align:center;padding:20px;'>Cargando historial...</p>";
  try {
    const snap = await db.collection("facturas").orderBy("timestamp", "desc").get();
    if (snap.empty) {
      lista.innerHTML = "<p style='color:#94a3b8;text-align:center;padding:20px;'>No hay facturas guardadas</p>";
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
    lista.innerHTML = "<p style='text-align:center; color:#ef4444;padding:20px;'>Error al cargar historial</p>";
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
  setValor("descripcionSesion", d.descripcion || "");
  setChecked("desplazamientoIncluido", d.desplazamiento || false);
  setValor("kmDesplazamiento", d.km || "");
  setValor("precioPorKm", d.precioPorKm || "");
  setChecked("alojamientoIncluido", d.alojamiento || false);
  setValor("costoAlojamiento", d.costoAlojamiento || "");
  setValor("cuentaActual", d.cuenta || "");
  setValor("observaciones", d.observaciones || "");

  // Clear existing lines and recreate
  if (sessionContainer) sessionContainer.innerHTML = '';
  // recreate default line (use original inputs)
  const defaultWrapper = document.createElement('div');
  defaultWrapper.className = 'session-line';
  defaultWrapper.dataset.default = "true";
  defaultWrapper.innerHTML = `
    <div class="inline-3">
      <label>Cantidad
        <select id="cantidad">
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
        <input type="number" id="importe" step="0.01" placeholder="0.00">
      </label>
      <label>Día Sesión
        <input type="date" id="diaSesion">
      </label>
    </div>
  `;
  // append default wrapper and set values
  sessionContainer.appendChild(defaultWrapper);
  // set default values from doc (if sessions exist, load first session into default)
  if (d.sessions && Array.isArray(d.sessions) && d.sessions.length) {
    const first = d.sessions[0];
    setTimeout(() => {
      setValor('cantidad', first.cantidad || 1);
      setValor('importe', first.importe || '');
      setValor('diaSesion', first.dia || '');
    }, 30);
    // add the rest sessions
    for (let i = 1; i < d.sessions.length; i++) {
      createSessionLine({ cantidad: d.sessions[i].cantidad, importe: d.sessions[i].importe, dia: d.sessions[i].dia });
    }
  } else {
    // legacy fields (single session)
    setTimeout(() => {
      setValor('cantidad', d.cantidad || 1);
      setValor('importe', d.importe || '');
      setValor('diaSesion', d.diaSesion || '');
    }, 30);
  }

  // set IVA selects
  setValor("ivaRetenido", d.ivaRetenido || 0);
  setValor("ivaAplicado", d.ivaAplicado || 10);
  recalcularTotales();
  showToast(id ? "Factura cargada 👁️" : "Factura duplicada 📋");

  // Desplazamiento suave al inicio de la sección cliente
  const seccion = document.getElementById("seccionCliente");
  if (seccion) {
    seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      document.getElementById("clienteNombre").focus();
    }, 600);
  }
}

/* --- IMPRESIÓN PDF --- */
function prepararImpresion() {
  const logoSrc = document.querySelector(".logo-kevin")?.src || "logo-kevin.png";

  // Build sessions rows for print
  const sessions = getAllSessionLines();
  let sessionsHtml = '';
  sessions.forEach(s => {
    const cantidad = s.cantidad || 0;
    const importe = (Number(s.importe) || 0).toFixed(2) + ' €';
    const importeTotal = ((Number(s.cantidad)||0) * (Number(s.importe)||0)).toFixed(2) + ' €';
    const dia = s.dia || '';
    sessionsHtml += `
      <tr>
        <td style="padding:8px;border:1px solid #e6e6e6;">${dia}</td>
        <td style="padding:8px;border:1px solid #e6e6e6;text-align:right;">${cantidad}</td>
        <td style="padding:8px;border:1px solid #e6e6e6;text-align:right;">${importe}</td>
        <td style="padding:8px;border:1px solid #e6e6e6;text-align:right;">${importeTotal}</td>
      </tr>
    `;
  });

  const contenido = `
    <div class="print-header">
      <div>
        <h1>KEVIN CHECA</h1>
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

      <table style="width:100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px;border:1px solid #e6e6e6;">DÍA</th>
            <th style="padding:8px;border:1px solid #e6e6e6;">CANT.</th>
            <th style="padding:8px;border:1px solid #e6e6e6;">P.U.</th>
            <th style="padding:8px;border:1px solid #e6e6e6;">IMPORTE</th>
          </tr>
        </thead>
        <tbody>
          ${sessionsHtml}
        </tbody>
      </table>

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

  // Initialize session container and default line
  // Ensure sessionContainer is the element we expect
  if (!sessionContainer) return;

  // bind manual add session button
  document.getElementById('btnAgregarSesionManual').addEventListener('click', () => {
    createSessionLine({}, true);
  });

  // make default line "tracked" and add listeners to its inputs
  const defaultLine = document.querySelector('.session-line[data-default="true"]');
  if (defaultLine) {
    // attach events to existing IDs
    ['cantidad','importe','diaSesion'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          recalcularTotales();
          checkAndPromptForNewLine(defaultLine);
        });
      }
    });
  }

  // Botón fijo de Nueva Factura con desplazamiento suave
  document.getElementById("btnNuevaFacturaFixed").onclick = async () => {
    setFacturaEditandoId(null);
    desbloquearNumeroFactura();
    // Clear all card inputs except emisor fields
    document.querySelectorAll(".card input:not([id^='emisor']), .card textarea:not([id^='emisor'])").forEach(i => i.value = "");
    // reset selects
    document.getElementById("cantidad").selectedIndex = 0;
    document.getElementById("ivaRetenido").selectedIndex = 0;
    document.getElementById("ivaAplicado").selectedIndex = 2;
    document.getElementById("desplazamientoIncluido").checked = false;
    document.getElementById("alojamientoIncluido").checked = false;

    // Reset session lines to single default
    if (sessionContainer) {
      sessionContainer.innerHTML = '';
      // recreate default original inputs
      const defaultWrapper = document.createElement('div');
      defaultWrapper.className = 'session-line';
      defaultWrapper.dataset.default = "true";
      defaultWrapper.innerHTML = `
        <div class="inline-3">
          <label>Cantidad
            <select id="cantidad">
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
            <input type="number" id="importe" step="0.01" placeholder="0.00">
          </label>
          <label>Día Sesión
            <input type="date" id="diaSesion">
          </label>
        </div>
      `;
      sessionContainer.appendChild(defaultWrapper);
      // reattach listeners
      ['cantidad','importe','diaSesion'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => {
          recalcularTotales();
          checkAndPromptForNewLine(defaultWrapper);
        });
      });
    }

    recalcularTotales();
    await asignarNumeroFactura();

    showToast("Nueva factura lista 🆕");

    // Desplazamiento suave a la sección de cliente
    const seccion = document.getElementById("seccionCliente");
    if (seccion) {
      seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Esperamos un poco a que termine el scroll para poner el foco
      setTimeout(() => document.getElementById("clienteNombre").focus(), 600);
    }
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

  // Attach recalculation for global selects/inputs that aren't part of session lines
  ['ivaRetenido','ivaAplicado','kmDesplazamiento','precioPorKm','costoAlojamiento'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalcularTotales);
  });

  recalcularTotales();
});