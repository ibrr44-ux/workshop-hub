// --------------------------------------------------------------
//  إدارة حالة الواجهة والتشغيل
// --------------------------------------------------------------
let currentArea = 'naseem_sulay';
let currentFilter = 'all';
let currentQuery = '';
let savedScrollPosition = 0;

let loadedAreas = {}; // ذاكرة لتتبع الملفات المحملة لكل صناعية
let isDataLoading = false;

// دالة تحميل بيانات الصناعية ديناميكياً باستخدام وسوم السكريبت (لتجنب مشاكل CORS عند فتح الملف محلياً)
function loadAreaData(areaId) {
    if (loadedAreas[areaId]) {
        return Promise.resolve();
    }
    
    isDataLoading = true;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `js/data-${areaId.replace('_', '-')}.min.js`;
        script.async = true;
        
        script.onload = () => {
            // إسناد معرف فريد تلقائي لكل ورشة
            WORKSHOPS_MASTER.forEach((ws, index) => {
                ws.id = index + 1;
            });
            loadedAreas[areaId] = true;
            isDataLoading = false;
            resolve();
        };
        
        script.onerror = (err) => {
            isDataLoading = false;
            console.error("خطأ في تحميل بيانات الورش:", err);
            const container = document.getElementById('resultsList');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-16 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-3xl shadow-md border border-red-100 dark:border-red-950/30">
                        <span class="text-5xl">⚠️</span>
                        <p class="mt-4 font-black text-lg text-red-600 dark:text-red-400">فشل في تحميل بيانات الورش</p>
                        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">يرجى التحقق من الملف وإعادة المحاولة.</p>
                        <button onclick="enterIndustrialArea('${areaId}')" class="mt-5 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-transform">💡 إعادة المحاولة</button>
                    </div>
                `;
            }
            reject(err);
        };
        
        document.body.appendChild(script);
    });
}

// توليد مؤشر التحميل الهيكلي (Skeleton Loader)
function showSkeletonLoader() {
    const container = document.getElementById('resultsList');
    if (!container) return;
    
    container.innerHTML = Array(3).fill(0).map(() => `
        <div class="bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-lg animate-pulse space-y-4">
            <div class="flex justify-between items-start">
                <div class="flex-1 space-y-2">
                    <div class="h-6 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4"></div>
                    <div class="h-4 bg-slate-100 dark:bg-slate-800/60 rounded-md w-1/2"></div>
                </div>
                <div class="h-8 bg-slate-200 dark:bg-slate-800 rounded-full w-16"></div>
            </div>
            <div class="grid grid-cols-2 gap-3 mt-4">
                <div class="space-y-1">
                    <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3"></div>
                    <div class="h-2 bg-slate-100 dark:bg-slate-800 rounded-md w-full"></div>
                </div>
                <div class="space-y-1">
                    <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3"></div>
                    <div class="h-2 bg-slate-100 dark:bg-slate-800 rounded-md w-full"></div>
                </div>
            </div>
            <div class="h-10 bg-slate-100 dark:bg-slate-850 rounded-xl mt-3"></div>
        </div>
    `).join('');
}

// التحقق من فئة النخبة للورشة بطريقة موحدة
function isWorkshopElite(ws) {
    const trust = ws.reputation_vector?.trustworthiness || 0;
    return (ws.confidence_score >= 55 || trust >= 85) && (ws.known_staff && ws.known_staff.length > 0);
}

// قاموس المرادفات المتطور بعد تصحيح وتوحيد الأحرف وحذف الفراغات من المفاتيح
const SYNONYM_MAP = {
  // كهرباء سيارات وفحص
  "تفتفه": "electrical", "نفضه": "electrical", "تقطيع": "electrical", "التماس": "electrical", "كهرباء": "electrical", "كهربائي": "electrical",
  "برمجه": "electrical", "برمجة": "electrical", "كمبيوتر": "electrical", "فحص": "electrical",
  // ميكانيكا محركات
  "كتمه": "engine_mechanical", "خلط": "engine_mechanical", "ميكانيكا": "engine_mechanical", "ميكانيك": "engine_mechanical", "ميكانيكي": "engine_mechanical",
  "مكينه": "engine_mechanical", "مكائن": "engine_mechanical", "محرك": "engine_mechanical", "محركات": "engine_mechanical",
  "طرمبه": "engine_mechanical", "طرمبات": "engine_mechanical", "بخاخ": "engine_mechanical", "بخاخات": "engine_mechanical", "ديزل": "engine_mechanical",
  // ناقل الحركة (قير)
  "نتعه": "transmission", "tnt3": "transmission", "تنتع": "transmission", "يفضي": "transmission", "طقه": "transmission", "قير": "transmission", "جير": "transmission",
  "قيربكس": "transmission",
  // تكييف وتبريد
  "حراره": "cooling_system", "تهريب": "cooling_system", 
  "تكييف": "cooling_system", "فريون": "cooling_system", "مكيف": "cooling_system", "مكيفات": "cooling_system", "تبريد": "cooling_system", "المكيفات": "cooling_system",
  "مروحه": "cooling_system", "مراوح": "cooling_system", "رديتر": "cooling_system", "رديترات": "cooling_system",
  // الفرامل ونظام الكبح
  "فحمات": "brake_system", "هوبات": "brake_system", "خرط": "brake_system", "كبح": "brake_system", "فرامل": "brake_system", "مخرطه": "brake_system", "مخرطة": "brake_system",
  // الميزان ونظام التوجيه والتربيط والسمكرة والدهان
  "قربعه": "steering_system", "دوده": "steering_system", "تربيط": "steering_system", "ميزان": "steering_system", "سمكرة": "steering_system", "دهان": "steering_system", "رش": "steering_system", "بوية": "steering_system",
  "اذرعه": "steering_system", "وزن": "steering_system", "مقص": "steering_system", "مقصات": "steering_system", "عضلات": "steering_system", "ترصيص": "steering_system",
  // السيارات والماركات
  "جمس": "american", "يوكن": "american", "كابرس": "american", "صيني": "chinese", "جيلي": "chinese"
};

function normalize(text) { 
    if (!text) return '';
    return text.toString().toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/[ىئ]/g, 'ي')
        .trim(); 
}

// محرك البحث الذكي بعد حل مشكلة التوحيد (Normalization) للورش والبحث النصي
function smartSearch(query, activeFilter) {
    let filtered = WORKSHOPS_MASTER.filter(ws => ws.area === currentArea && ws.hard_blocked !== true);
    // 1. تطبيق الفلتر العلوي
    if(activeFilter !== 'all'){
        if(activeFilter === 'elite'){
            filtered = filtered.filter(ws => isWorkshopElite(ws));
        } else if(activeFilter === 'electrical'){
            filtered = filtered.filter(ws => ws.normalized_problem_category?.some(cat => ['electrical', 'cooling_system'].includes(cat)));
        } else if(activeFilter === 'mechanical'){
            filtered = filtered.filter(ws => ws.normalized_problem_category?.includes('engine_mechanical'));
        } else if(activeFilter === 'steering'){
            filtered = filtered.filter(ws => ws.normalized_problem_category?.some(cat => ['steering_system', 'brake_system'].includes(cat)));
        } else if(activeFilter === 'transmission'){
            filtered = filtered.filter(ws => ws.normalized_problem_category?.includes('transmission'));
        }
    }
    // 2. تطبيق البحث النصي الذكي
    if(query && query.trim() !== ""){
        const words = query.split(/\s+/).filter(w => w.length >= 2 || /^\d$/.test(w));
        const inferredCats = new Set();
        words.forEach(w => { 
            let norm = normalize(w); 
            if(SYNONYM_MAP[norm]) inferredCats.add(SYNONYM_MAP[norm]); 
        });
        filtered = filtered.filter(ws => {
            let match = false;
            for(let w of words){
                let nw = normalize(w);
                if(normalize(ws.workshop_name).includes(nw) ||
                   ws.known_staff?.some(s => normalize(s).includes(nw)) ||
                   ws.supported_cars?.some(c => normalize(c).includes(nw)) ||
                   ws.problem_keywords?.some(k => normalize(k).includes(nw)) ||
                   ws.service_categories?.some(c => normalize(c).includes(nw)) ||
                   normalize(ws.text_guidance).includes(nw) ||
                   normalize(ws.phone).includes(nw) ||
                   normalize(ws.inferred_strength).includes(nw)){
                    match = true; break;
                }
            }
            let catMatch = inferredCats.size === 0 ? false : ws.normalized_problem_category?.some(c => inferredCats.has(c));
            return match || catMatch;
        });
    }
    return filtered.sort((a,b) => (b.confidence_score||0) - (a.confidence_score||0));
}

// عرض قائمة الصناعيات في شاشة الترحيب ديناميكياً
function renderWelcomeScreen() {
    const grid = document.getElementById('areasGrid');
    if (!grid) return;
    
    grid.innerHTML = INDUSTRIAL_AREAS.map(area => {
        if (area.active) {
            return `
            <button onclick="enterIndustrialArea('${area.id}')" class="card-workshop w-full bg-white/95 dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-md dark:shadow-slate-950/20 text-right transition-all flex items-center justify-between hover:border-slate-800 dark:hover:border-slate-400 group">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xl">📍</span>
                        <span class="font-black text-slate-800 dark:text-slate-100 text-xl group-hover:text-slate-900 dark:group-hover:text-white">${area.name}</span>
                        <span class="text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">نشط الآن</span>
                    </div>
                    <p class="text-sm text-slate-500 dark:text-slate-400">${area.description}</p>
                </div>
                <span class="text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 text-xl transition-transform group-hover:-translate-x-1">←</span>
            </button>`;
        } else {
            return `
            <div class="w-full bg-slate-100/80 dark:bg-slate-900/40 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800/80 shadow-sm text-right flex items-center justify-between opacity-75">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xl">📍</span>
                        <span class="font-black text-slate-600 dark:text-slate-400 text-xl">${area.name}</span>
                        <span class="text-xs font-bold bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full">قريباً</span>
                    </div>
                    <p class="text-sm text-slate-400 dark:text-slate-500">${area.description}</p>
                </div>
                <span class="text-slate-300 dark:text-slate-600 text-xl">🔒</span>
            </div>`;
        }
    }).join('');
}

// عرض الورش في نتائج البحث
function renderResults(data){
    const container = document.getElementById('resultsList');
    const countSpan = document.getElementById('resultsCount');
    if (!container || !countSpan) return;
    
    countSpan.innerHTML = `<span>🔍 ${data.length} ورشة متطابقة</span><span class="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">${data.filter(w=>isWorkshopElite(w)).length} نخبة</span>`;
    if(data.length===0){
        container.innerHTML = `<div class="text-center py-16 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-3xl shadow-md dark:shadow-slate-950/20"><span class="text-5xl">🔎</span><p class="mt-2 font-bold text-base dark:text-slate-200">لا توجد ورش تطابق بحثك</p><p class="text-sm text-gray-500 dark:text-slate-400">جرب كلمات مثل "مخرطة، رديترات، ميزان"</p></div>`;
        return;
    }
    container.innerHTML = data.map(ws => {
        const trust = ws.reputation_vector?.trustworthiness || 0;
        const diag = ws.reputation_vector?.diagnosis_accuracy || 0;
        const isElite = isWorkshopElite(ws);
        const priceBad = ws.failure_patterns?.includes('ارتفاع اسعار') || (ws.reputation_vector?.pricing_fairness !== undefined && ws.reputation_vector.pricing_fairness < 65);
        const areaObj = INDUSTRIAL_AREAS.find(a => a.id === ws.area);
        const defaultLocation = areaObj ? areaObj.name : "صناعية النسيم والسلي";
        return `
        <div class="card-workshop bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-lg dark:shadow-slate-950/20 cursor-pointer transition-all relative" data-wsid="${ws.id}">
            ${isElite ? `<div class="absolute -top-3 right-4 badge-elite text-white text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 elite-pulse"><span>⭐</span> فني نخبة ثقة</div>` : ''}
            <div class="flex justify-between items-start">
                <div class="flex-1"><h2 class="text-xl font-black text-slate-800 dark:text-slate-100">${ws.workshop_name}</h2><p class="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1"><span>📍</span> ${ws.text_guidance || defaultLocation}</p></div>
                <div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-850 px-3 py-1 rounded-full shadow-sm dark:text-slate-200"><span class="text-base font-black">★ ${ws.rating??'?'}</span><span class="text-xs"> (${ws.review_count??0})</span></div>
            </div>
            <div class="grid grid-cols-2 gap-3 mt-4">
                <div><div class="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300"><span>🤝 الأمانة</span><span>${trust}%</span></div><div class="trust-meter mt-1"><div class="trust-fill bg-slate-800 dark:bg-slate-300" style="width:${trust}%"></div></div></div>
                <div><div class="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300"><span>🎯 دقة التشخيص</span><span>${diag}%</span></div><div class="trust-meter mt-1"><div class="trust-fill bg-blue-600 dark:bg-blue-500" style="width:${diag}%"></div></div></div>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl mt-3 border-r-4 border-slate-300 dark:border-slate-800">✨ ${ws.inferred_strength || 'خدمات احترافية'}</p>
            ${priceBad ? '<div class="mt-2 text-xs bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 p-2 rounded-lg font-medium">⚠️ تنبيه بالسعر: سمعة السعر مرتفعة نسبياً</div>' : ''}
            <div class="mt-3 text-left text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 justify-end"><span>تفاصيل واتصال</span> ←</div>
        </div>`;
    }).join('');
    
    // ربط أحداث النقر بالـ ID الرقمي
    document.querySelectorAll('[data-wsid]').forEach(card => {
        const id = parseInt(card.getAttribute('data-wsid'), 10);
        card.onclick = () => showDetails(WORKSHOPS_MASTER.find(w => w.id === id));
    });
}

// شاشة التفاصيل مع مقاومة أخطاء المتجهات
function showDetails(ws){
    if(!ws) return;
    savedScrollPosition = window.scrollY; // حفظ موضع التمرير
    
    const hasPrice = ws.failure_patterns?.includes('ارتفاع اسعار') || (ws.reputation_vector?.pricing_fairness !== undefined && ws.reputation_vector.pricing_fairness < 65);
    const evidenceHtml = ws.evidence?.map(ev => `<div class="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl text-sm italic border-r-2 border-blue-300 dark:border-blue-500 dark:text-slate-300">“ ${ev.text} ”</div>`).join('') || '<div class="text-sm text-gray-400 dark:text-slate-500">لا توجد أدلة نصية مسجلة</div>';
    
    const vector = ws.reputation_vector || {};
    const vectorLabels = {
        technical_skill: '🛠️ مهارة فنية',
        diagnosis_accuracy: '🎯 دقة تشخيص',
        trustworthiness: '🤝 أمانة ووضوح',
        pricing_fairness: '💵 سعر عادل',
        customer_behavior: '⭐ سلوك المعاملة'
    };
    const vectorHtml = Object.entries(vectorLabels).map(([key, label]) => `
        <div class="bg-white dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div class="text-xs text-slate-500 dark:text-slate-400 font-bold">${label}</div>
            <div class="font-black text-base text-slate-800 dark:text-slate-200 mt-0.5">${vector[key] !== undefined ? vector[key] + '%' : 'غير متوفر'}</div>
        </div>
    `).join('');

    const areaObj = INDUSTRIAL_AREAS.find(a => a.id === ws.area);
    const defaultLocation = areaObj ? areaObj.name : "صناعية النسيم والسلي";
    document.getElementById('detailsCard').innerHTML = `
        <div class="relative">
            <span class="text-xs font-black px-2.5 py-1 rounded-md ${ws.vehicle_focus === 'specialized' ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}">${ws.vehicle_focus === 'specialized' ? '🎯 مركز متخصص' : '📌 مركز عام'}</span>
            <h2 class="text-2xl font-black mt-3 text-slate-900 dark:text-white">${ws.workshop_name}</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1"><span>📍</span> ${ws.text_guidance || defaultLocation}</p>
        </div>
        <div class="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3 mt-2">
            <h4 class="text-xs font-bold text-slate-400 dark:text-slate-500">📊 متجهات السمعة الموثقة (من 100):</h4>
            <div class="grid grid-cols-2 gap-2">${vectorHtml}</div>
        </div>
        <div class="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
            <h4 class="font-bold text-sm text-slate-400 dark:text-slate-500">📋 سياق المراجعين الميدانيين:</h4>
            ${evidenceHtml}
        </div>
        ${hasPrice ? '<div class="bg-amber-50 border border-amber-100 dark:border-amber-900/50 rounded-xl p-3 text-sm text-amber-900 dark:text-amber-300 font-medium">💡 <b>نصيحة ذهبية:</b> تشير السمعة إلى تذبذب الأسعار، اطلب تسعيرة واضحة لأجور اليد قبل البدء.</div>' : ''}
        <div class="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
            ${ws.phone ? `<a href="tel:${ws.phone}" class="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-center py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-1 text-base">📞 اتصال بالفني</a>` : ''}
            <a href="https://maps.google.com/?q=${encodeURIComponent(ws.workshop_name + ' الرياض')}" target="_blank" class="flex-1 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white text-center py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-1 text-base">🗺️ خرائط جوجل</a>
            <button onclick="shareWorkshop(${ws.id})" class="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-3.5 rounded-xl font-bold shadow-md transition flex items-center justify-center gap-1 text-base" title="مشاركة">📤 مشاركة</button>
        </div>
    `;
    document.getElementById('searchFilterContainer')?.classList.add('hidden');
    document.getElementById('homeView').classList.add('hidden');
    document.getElementById('detailsView').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// مشاركة بيانات الورشة عبر API المشاركة أو الحافظة
window.shareWorkshop = function(id) {
    const ws = WORKSHOPS_MASTER.find(w => w.id === id);
    if (!ws) return;
    const areaObj = INDUSTRIAL_AREAS.find(a => a.id === ws.area);
    const defaultLocation = areaObj ? areaObj.name : "صناعية النسيم والسلي";
    const shareText = `🔧 *طريق الورشة (منوال الورش)*:\nورشة: *${ws.workshop_name}*\n📍 الموقع: ${ws.text_guidance || defaultLocation}\n📞 اتصال: ${ws.phone || 'غير متوفر'}\n⭐ التقييم: ${ws.rating || 'غير متوفر'} (${ws.review_count || 0} تقييم)\n🎯 التخصص: ${ws.inferred_strength || 'صيانة سيارات'}\n🗺️ موقع الخرائط: https://maps.google.com/?q=${encodeURIComponent(ws.workshop_name + ' الرياض')}`;
    
    if (navigator.share) {
        navigator.share({
            title: ws.workshop_name,
            text: shareText
        }).catch(() => {
            fallbackShare(shareText);
        });
    } else {
        fallbackShare(shareText);
    }
};

function fallbackShare(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert("تم نسخ تفاصيل الورشة بنجاح! يمكنك لصقها وإرسالها لأي شخص.");
    }).catch(() => {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    });
}

// إدارة المظهر الليلي والنهاري (Dark / Light Mode)
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        if (themeToggle) themeToggle.innerHTML = '☀️';
    } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        if (themeToggle) themeToggle.innerHTML = '🌙';
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark');
            document.body.classList.toggle('dark', isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeToggle.innerHTML = isDark ? '☀️' : '🌙';
        });
    }
}

function updateUI(){
    const results = smartSearch(currentQuery, currentFilter);
    renderResults(results);
}

// --------------------------------------------------------------
//  دوال التنقل وأزرار التحكم
// --------------------------------------------------------------
window.enterIndustrialArea = async function(areaId) {
    const area = INDUSTRIAL_AREAS.find(a => a.id === areaId);
    if (!area || !area.active) return;
    
    currentArea = areaId;
    
    // إظهار شاشة الدليل فوراً وتصفير الإحصائيات مع إظهار الهيكل العظمي للتحميل
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('directoryScreen').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // تحديث العنوان الفرعي بناءً على الصناعية النشطة
    document.getElementById('activeAreaSub').innerText = area.subtext;
    
    showSkeletonLoader();
    document.getElementById('totalWorkshopsCount').innerText = `تحميل...`;
    document.getElementById('eliteWorkshopsCount').innerText = `تحميل...`;

    try {
        await loadAreaData(areaId);
    } catch (err) {
        return; // يتم معالجة وعرض واجهة الخطأ داخل loadAreaData
    }
    
    // تحديث الإحصائيات الفولية بعد اكتمال التحميل
    const areaWorkshops = WORKSHOPS_MASTER.filter(w => w.area === areaId);
    document.getElementById('totalWorkshopsCount').innerText = `${areaWorkshops.length} ورشة موثقة`;
    document.getElementById('eliteWorkshopsCount').innerText = `${areaWorkshops.filter(w => isWorkshopElite(w)).length} نخبة ثقة`;

    // تصفير مدخلات الفلترة والبحث
    currentFilter = 'all';
    currentQuery = '';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) clearBtn.classList.add('hidden');
    
    // تحديث أزرار الفلترة لتفعيل زر "الكل" افتراضياً
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active', 'bg-slate-900', 'text-white'));
    const allBtn = document.querySelector('[data-filter="all"]');
    if (allBtn) allBtn.classList.add('active', 'bg-slate-900', 'text-white');

    // إظهار شريط البحث والفلاتر
    document.getElementById('searchFilterContainer')?.classList.remove('hidden');

    // تحديث الواجهة
    updateUI();
};

window.goToWelcomeScreen = function() {
    document.getElementById('directoryScreen').classList.add('hidden');
    document.getElementById('detailsView').classList.add('hidden');
    document.getElementById('homeView').classList.remove('hidden');
    document.getElementById('welcomeScreen').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'instant' });
};

// --------------------------------------------------------------
//  ربط الأحداث عند تحميل المستند
// --------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // تهيئة مظهر الليل والنهار
    initTheme();

    // عرض شاشة الترحيب والصناعيات
    renderWelcomeScreen();
    
    // أزرار الفلاتر
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active', 'bg-slate-900', 'text-white'));
            btn.classList.add('active', 'bg-slate-900', 'text-white');
            currentFilter = btn.getAttribute('data-filter');
            updateUI();
        });
    });
    
    // البحث الفوري والتفاعلي أثناء الكتابة
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearBtn');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentQuery = e.target.value;
            updateUI();
            if (clearBtn) clearBtn.classList.toggle('hidden', !currentQuery.trim());
        });
    }

    // نموذج البحث لمنع إعادة تحميل الصفحة
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.onsubmit = (e) => {
            e.preventDefault();
            if (searchInput) {
                currentQuery = searchInput.value;
                updateUI();
                if (clearBtn) clearBtn.classList.toggle('hidden', !currentQuery.trim());
            }
        };
    }

    if (clearBtn) {
        clearBtn.onclick = () => {
            if (searchInput) searchInput.value = '';
            currentQuery = '';
            updateUI();
            clearBtn.classList.add('hidden');
        };
    }

    // زر العودة مع استرجاع موضع التمرير
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.onclick = () => {
            document.getElementById('detailsView').classList.add('hidden');
            document.getElementById('searchFilterContainer')?.classList.remove('hidden');
            document.getElementById('homeView').classList.remove('hidden');
            window.scrollTo({ top: savedScrollPosition, behavior: 'instant' });
        };
    }

    // حالة الاتصال بالإنترنت
    window.addEventListener('online', () => document.getElementById('offlineIndicator')?.classList.add('hidden'));
    window.addEventListener('offline', () => document.getElementById('offlineIndicator')?.classList.remove('hidden'));
    if(!navigator.onLine) document.getElementById('offlineIndicator')?.classList.remove('hidden');
    
    // تهيئة البيانات والواجهة المبدئية
    updateUI();
});

// تفعيل ميزات الـ PWA (الـ Manifest والـ Service Worker) فقط عند تشغيل المشروع عبر خادم ويب (http/https) لتجنب أخطاء CORS محلياً
if (window.location.protocol !== 'file:') {
    // حقن رابط الـ Manifest ديناميكياً
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'manifest.json';
    document.head.appendChild(link);

    // تسجيل الـ Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('Service Worker: تم التسجيل بنجاح في النطاق:', reg.scope))
                .catch(err => console.error('Service Worker: فشل التسجيل:', err));
        });
    }
}
