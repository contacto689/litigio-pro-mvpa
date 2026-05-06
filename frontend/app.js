// --- CONFIGURACIÓN Y ESTADO GLOBAL ---
const URL_BASE = "http://127.0.0.1:5000";
let casoActual = null;
let rolUsuario = "";
let turnosRealizados = 0;
let intervaloCronometro = null;
let segundosTranscurridos = 0;

// --- REFERENCIAS AL DOM ---
const chatAudiencia = document.getElementById('chat-audiencia');
const btnMicrofono = document.getElementById('btn-microfono');
const inputArgumento = document.getElementById('input-argumento');
const displayCrono = document.getElementById('cronometro');
const seccionPrincipal = document.getElementById('seccion-principal');
const salaAudiencia = document.getElementById('sala-audiencia');
const modalContexto = document.getElementById('modal-contexto');
const loadingOverlay = document.getElementById('loading-overlay');

// --- 1. GESTIÓN DE EXPEDIENTES (TRANSICIÓN PROFESIONAL) ---

document.getElementById('btn-generar').onclick = async () => {
    // Activar pantalla de carga
    loadingOverlay.classList.remove('hidden');
    loadingOverlay.classList.add('flex');
    
    try {
        const res = await fetch(`${URL_BASE}/generar-casos`, { method: 'POST' });
        const casos = await res.json();
        
        const contenedor = document.getElementById('contenedor-casos');
        contenedor.innerHTML = "";

        casos.forEach(caso => {
            const card = document.createElement('div');
            card.className = "bg-[#161d2f] border border-slate-800 p-8 rounded-[32px] hover:border-[#c4a47c]/50 transition-all cursor-pointer group shadow-lg";
            card.innerHTML = `
                <h3 class="font-serif-legal text-2xl text-white italic mb-4 group-hover:text-[#c4a47c] transition-colors">${caso.titulo}</h3>
                <p class="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-6">${caso.descripcion}</p>
                <div class="text-[9px] font-black text-[#c4a47c] uppercase tracking-[0.2em]">Analizar Expediente →</div>
            `;
            card.onclick = () => {
                casoActual = caso;
                document.getElementById('modal-titulo').innerText = caso.titulo;
                document.getElementById('modal-descripcion').innerText = caso.descripcion;
                modalContexto.classList.remove('hidden');
            };
            contenedor.appendChild(card);
        });

    } catch (e) {
        console.error("Error cargando casos:", e);
    } finally {
        // Ocultar carga con suavidad
        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
            loadingOverlay.classList.remove('flex');
        }, 800);
    }
};

function setRol(rol) {
    rolUsuario = rol;
    turnosRealizados = 0; 
    modalContexto.classList.add('hidden');
    seccionPrincipal.classList.add('hidden');
    salaAudiencia.classList.remove('hidden');
    
    // Configurar panel lateral
    document.getElementById('contexto-titulo').innerText = casoActual.titulo;
    document.getElementById('contenido-expediente').innerText = casoActual.descripcion;

    const bienvenida = `La sala está en sesión. Usted comparece como ${rolUsuario}. El tribunal exige el máximo rigor en su argumentación. Comience.`;
    chatAudiencia.innerHTML = `
        <div class="bg-[#c4a47c]/10 border border-[#c4a47c]/20 p-8 rounded-[30px] self-start max-w-[85%] shadow-sm">
            <span class="text-[9px] font-black uppercase text-[#c4a47c] block mb-2 tracking-widest">Tribunal / Juez</span>
            <p class="text-lg text-slate-200 italic font-light">${bienvenida}</p>
        </div>
    `;
    hablar(bienvenida);
    iniciarCronometro();
}

// --- 2. LÓGICA DE DEBATE Y SENTENCIA ---

async function enviarArgumento() {
    const texto = inputArgumento.value.trim();
    if (!texto) return;
    inputArgumento.value = "";
    detenerCronometro();

    // Renderizar mensaje usuario
    chatAudiencia.innerHTML += `
        <div class="bg-[#1e293b] border border-slate-700 p-8 rounded-[30px] rounded-br-none self-end max-w-[85%] ml-auto shadow-2xl">
            <span class="text-[9px] font-black uppercase text-slate-500 block mb-2 tracking-widest">${rolUsuario} (Usted)</span>
            <p class="text-lg text-slate-200 font-light">${texto}</p>
        </div>
    `;
    scrollChat();

    try {
        const response = await fetch(`${URL_BASE}/debatir`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                argumento: texto,
                caso: casoActual.descripcion,
                rol: rolUsuario,
                turnos: turnosRealizados
            })
        });

        const data = await response.json();
        actualizarDashboard(data.analisis);

        if (data.finalizar) {
            // EFECTO DRAMÁTICO DE CIERRE
            const msgEspera = "Se han agotado las intervenciones. El Juez entra en proceso de deliberación profunda para dictar sentencia...";
            chatAudiencia.innerHTML += `<div class="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl self-start italic text-slate-500 animate-pulse">${msgEspera}</div>`;
            scrollChat();
            hablar(msgEspera);

            setTimeout(() => {
                const deliberando = document.querySelector('.animate-pulse');
                if(deliberando) deliberando.remove();

                chatAudiencia.innerHTML += `
                    <div class="bg-[#c4a47c]/5 border border-[#c4a47c]/30 p-10 rounded-[40px] my-10 shadow-3xl text-center border-dashed">
                        <span class="text-[10px] font-black text-[#c4a47c] uppercase tracking-[0.5em] block mb-6">Fallo Judicial y Sentencia</span>
                        <p class="font-serif-legal text-2xl text-white italic leading-relaxed mb-8 px-4">${data.sentencia}</p>
                        <button onclick="location.reload()" class="bg-[#c4a47c] text-[#0a0f1a] px-10 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:bg-white transition-all shadow-xl">Finalizar Audiencia</button>
                    </div>
                `;
                hablar("Silencio en la sala. Procedo a dictar sentencia.");
                setTimeout(() => hablar(data.sentencia), 2500);
                scrollChat();
            }, 6000); // 6 segundos de deliberación final
        } else {
            // Respuesta de la contraparte
            chatAudiencia.innerHTML += `
                <div class="bg-white/5 border border-slate-800 p-8 rounded-[30px] rounded-bl-none self-start max-w-[85%] shadow-xl">
                    <span class="text-[9px] font-black uppercase text-[#c4a47c] block mb-2 tracking-widest">Contraparte (IA)</span>
                    <p class="text-lg text-slate-300 leading-relaxed">${data.respuesta_ia}</p>
                </div>
            `;
            hablar(data.respuesta_ia);
            iniciarCronometro();
            scrollChat();
        }

        turnosRealizados++;
    } catch (e) {
        console.error("Error en comunicación:", e);
    }
}

// --- 3. FUNCIONES DE APOYO (DASHBOARD, VOZ, TIEMPO) ---

function actualizarDashboard(analisis) {
    if (!analisis) return;
    const metricsMap = { 
        'legal': analisis.fundamentacion_legal, 
        'logica': analisis.coherencia_logica, 
        'retorica': analisis.persuasion_retorica, 
        'procesal': analisis.tecnica_procesal, 
        'terminos': analisis.uso_terminologia 
    };
    for (let key in metricsMap) {
        const bar = document.getElementById(`bar-${key}`);
        const val = document.getElementById(`val-${key}`);
        if(bar && val) {
            bar.style.width = `${metricsMap[key]}%`;
            val.innerText = `${metricsMap[key]}%`;
        }
    }
    document.getElementById('feedback-sutil').innerText = analisis.feedback_sutil;
}

function toggleContexto() {
    document.getElementById('panel-contexto').classList.toggle('translate-x-full');
}

const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Reconocimiento) {
    const recognition = new Reconocimiento();
    recognition.lang = 'es-ES';
    btnMicrofono.onclick = () => {
        btnMicrofono.classList.add('mic-active');
        recognition.start();
    };
    recognition.onresult = (event) => {
        inputArgumento.value = event.results[0][0].transcript;
        btnMicrofono.classList.remove('mic-active');
        setTimeout(() => { if(inputArgumento.value.trim() !== "") enviarArgumento(); }, 1200);
    };
    recognition.onerror = () => btnMicrofono.classList.remove('mic-active');
}

function iniciarCronometro() {
    detenerCronometro();
    segundosTranscurridos = 0;
    intervaloCronometro = setInterval(() => {
        segundosTranscurridos++;
        const m = Math.floor(segundosTranscurridos / 60).toString().padStart(2, '0');
        const s = (segundosTranscurridos % 60).toString().padStart(2, '0');
        displayCrono.innerText = `${m}:${s}`;
    }, 1000);
}

function detenerCronometro() { if (intervaloCronometro) clearInterval(intervaloCronometro); }

function hablar(texto) {
    window.speechSynthesis.cancel();
    const loc = new SpeechSynthesisUtterance(texto);
    loc.lang = 'es-ES';
    loc.rate = 1.0;
    window.speechSynthesis.speak(loc);
}

function scrollChat() {
    chatAudiencia.scrollTo({ top: chatAudiencia.scrollHeight, behavior: 'smooth' });
}