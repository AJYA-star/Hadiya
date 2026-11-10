/* Hadiya shared setup - loaded by every page BEFORE its own script.
   Change the live API address in ONE place: PRODUCTION_API below. */

/* The app name. (Pages show it as written in their HTML; the service worker and
   manifest.json also carry it - search for "Hadiya" if you ever rename.) */
const BRAND = { en: 'Hadiya', ar: 'هدية' };
const PRODUCTION_API = 'https://wrapit-backend-salar.onrender.com/api';
const LOCAL_API = 'http://localhost:5000/api';

const API_URL = (['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('prod'))
  ? LOCAL_API
  : PRODUCTION_API;

/* Order statuses - these MUST match the backend (models/order.js) */
const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  in_progress: 'Wrapping',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected'
};

/* What a shop owner may do next from each status (backend enforces the same rules) */
const ORDER_NEXT_STEPS = {
  pending: ['accepted', 'rejected'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'completed'],
  out_for_delivery: ['completed'],
  completed: [],
  cancelled: [],
  rejected: []
};

/* Escape text before putting it in innerHTML (stops injected HTML/scripts) */
function esc(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getToken() {
  try { return localStorage.getItem('token') || ''; } catch (e) { return ''; }
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) { return null; }
}

function logout() {
  const finish = () => {
    try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch (e) {}
    window.location.href = 'index.html';
  };
  // stop alerts for this phone first (so the next person who signs in here does not get them), but never wait long
  Promise.race([disablePushOnThisDevice(), new Promise(r => setTimeout(r, 1500))]).then(finish, finish);
}

/* Only allow redirects to pages on this site (stops open-redirect tricks) */
function safeNext(value) {
  if (!value || /^[a-z]+:/i.test(value) || value.startsWith('//') || value.startsWith('\\')) return null;
  return value;
}

/* fetch wrapper: adds the token, 60s timeout (Render free tier cold starts), readable errors.
   Throws Error with .status when the request fails. Returns parsed JSON. */
async function api(path, options = {}) {
  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(API_URL + path, {
      ...options,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });

    let data = null;
    try { data = await response.json(); } catch (e) { /* not JSON */ }

    if (!response.ok || (data && data.success === false)) {
      const error = new Error((data && data.message) || ('Request failed (' + response.status + ')'));
      error.status = response.status;
      throw error;
    }
    return data || {};
  } catch (error) {
    if (error.name === 'AbortError') {
      const e = new Error('The server is taking too long to respond. It may be waking up - please try again in a moment.');
      e.status = 0;
      throw e;
    }
    if (error instanceof TypeError) {
      const e = new Error('Could not connect to the server. Check your internet connection and try again.');
      e.status = 0;
      throw e;
    }
    throw error;
  }
}

/* ---------------------------------------------------------------------------------
   LANGUAGE (English / Arabic) - shared by every inner page.
   The choice is saved by the home / login / register pages (and by the button in the
   menu) as localStorage "language" = "en" | "ar".  When it is "ar" this file:
     1. turns the page right-to-left and switches to the Arabic font,
     2. translates every visible text, placeholder and message into Arabic.
   To fix or add a translation: edit the AR list below (English text -> Arabic text).
   --------------------------------------------------------------------------------- */
/* date/time format for the chosen language (Western digits, Arabic AM/PM) */
const LOC = (function () { try { return localStorage.getItem('language') === 'ar' ? 'ar-AE-u-nu-latn' : undefined; } catch (e) { return undefined; } })();
function getLang() {
  try { return localStorage.getItem('language') === 'ar' ? 'ar' : 'en'; } catch (e) { return 'en'; }
}
const LANG = getLang();
/* home / login / register run their own language switch, so they opt out with data-own-lang */
const IS_AR = LANG === 'ar' && !document.documentElement.hasAttribute('data-own-lang');
// A shop's name in the visitor's language (the Arabic name is optional; falls back to the main name)
function shopName(s) { return s ? ((IS_AR && s.nameAr) ? s.nameAr : (s.name || '')) : ''; }

const AR = {
  /* menu + footer + shared */
  'Browse shops': 'تصفّح المتاجر', 'My orders': 'طلباتي', 'Dashboard': 'لوحة التحكم', 'Shop orders': 'طلبات المتجر',
  'Home': 'الرئيسية', 'Sign out': 'تسجيل الخروج', 'Sign in': 'تسجيل الدخول', 'Create account': 'إنشاء حساب',
  'Logout': 'تسجيل الخروج',
  'Gift wrapping, picked up and delivered back': 'تغليف الهدايا، نستلمها ونوصّلها لك',
  'Loading': 'جارٍ التحميل', 'Cancel': 'إلغاء', 'Send': 'إرسال', 'Save changes': 'حفظ التغييرات',
  'Pending': 'قيد الانتظار', 'Accepted': 'تم القبول', 'Wrapping': 'قيد التغليف', 'Ready': 'جاهز',
  'Out for delivery': 'في الطريق للتوصيل', 'Completed': 'مكتمل', 'Cancelled': 'ملغي', 'Rejected': 'مرفوض',
  'Unknown': 'غير معروف', 'cash': 'نقداً', 'paid': 'مدفوع', 'pending': 'قيد الانتظار', 'failed': 'فشل',
  'Free': 'مجاني',

  'Hadiya': 'هدية',

  /* shops.html */
  'Browse Shops': 'تصفّح المتاجر', 'Wrapping shops': 'متاجر التغليف',
  'on the menu today': 'على القائمة اليوم',
  'Pick a shop, compare services and book in a minute': 'اختر متجراً، وقارن الخدمات، واحجز في دقيقة',
  'Loading shops...': 'جارٍ تحميل المتاجر...', 'Search shops by name or city...': 'ابحث عن متجر بالاسم أو المدينة...',
  'Search shops by name or city': 'ابحث عن متجر بالاسم أو المدينة',
  'No shops found yet. Please check back soon!': 'لا توجد متاجر بعد. تفقّد الصفحة قريباً!',
  'New': 'جديد', 'See shop': 'عرض المتجر', 'No shops match your search': 'لا توجد متاجر تطابق بحثك',

  /* shop-detail.html */
  'Shop Details': 'تفاصيل المتجر', '← Back to shops': 'العودة إلى المتاجر', 'Loading shop...': 'جارٍ تحميل المتجر...',
  'Our services': 'خدماتنا', 'Book this service': 'احجز هذه الخدمة', 'Book': 'احجز',
  'How does the gift get to the shop?': 'كيف تصل الهدية إلى المتجر؟',
  'I will drop it off at the shop': 'سأوصلها بنفسي إلى المتجر', 'Please pick it up from me': 'يرجى استلامها مني',
  'Pickup address': 'عنوان الاستلام', 'How do you get it back?': 'كيف تستلم هديتك بعد التغليف؟',
  'I will collect it from the shop': 'سأستلمها من المتجر', 'Please deliver it to me': 'يرجى توصيلها لي',
  'Delivery address': 'عنوان التوصيل', 'Contact phone': 'رقم الهاتف للتواصل', 'Date and time *': 'التاريخ والوقت *',
  'Notes for the shop (optional)': 'ملاحظات للمتجر (اختياري)', 'Payment': 'الدفع',
  'Cash on pickup / delivery': 'نقداً عند الاستلام / التوصيل', 'Online card payment is coming soon': 'الدفع بالبطاقة عبر الإنترنت قريباً',
  'Service': 'الخدمة', 'Delivery': 'التوصيل', 'Estimated total': 'الإجمالي التقديري', 'Place order': 'تأكيد الطلب',
  'Placing order...': 'جارٍ إرسال الطلب...', 'Building, street, area': 'المبنى، الشارع، المنطقة',
  'Colours, message card, fragile items...': 'الألوان، بطاقة رسالة، أغراض قابلة للكسر...',
  'Shop unavailable': 'المتجر غير متاح', 'Professional wrapping': 'تغليف احترافي',
  'No shop selected. Please go back and choose a shop': 'لم يتم اختيار متجر. يرجى الرجوع واختيار متجر',
  'This shop has not added any services yet': 'لم يضف هذا المتجر أي خدمات بعد',
  'Shop owner accounts cannot place orders. Please use a customer account': 'حسابات أصحاب المتاجر لا يمكنها تقديم طلبات. يرجى استخدام حساب عميل',
  'Delivery (pickup + return)': 'التوصيل (استلام + إرجاع)', 'Calculated by the shop': 'يحدّدها المتجر', '+ delivery': '+ توصيل',
  'Please enter a valid contact phone number': 'يرجى إدخال رقم هاتف صحيح للتواصل',
  'Please enter the full pickup address (building, street, area)': 'يرجى إدخال عنوان الاستلام كاملاً (المبنى، الشارع، المنطقة)',
  'Please enter the full delivery address (building, street, area)': 'يرجى إدخال عنوان التوصيل كاملاً (المبنى، الشارع، المنطقة)',
  'Please choose a date and time': 'يرجى اختيار التاريخ والوقت',
  'Please choose a date and time in the future': 'يرجى اختيار تاريخ ووقت في المستقبل',
  'The date and time must be in the future': 'يجب أن يكون التاريخ والوقت في المستقبل',

  /* my-orders.html */
  'My Orders': 'طلباتي', 'your table': 'طاولتك', 'Follow your gifts from pickup to delivery': 'تابع هداياك من الاستلام حتى التوصيل',
  'Order placed! The shop will confirm it shortly': 'تم إرسال الطلب! سيؤكده المتجر قريباً',
  '🎉 Order placed! The shop will confirm it shortly': '🎉 تم إرسال الطلب! سيؤكده المتجر قريباً',
  'Loading your orders...': 'جارٍ تحميل طلباتك...', 'No orders found yet.': 'لا توجد طلبات بعد.',
  'Time to wrap some gifts!': 'حان وقت تغليف بعض الهدايا!', 'You drop off at the shop': 'ستوصلها أنت إلى المتجر',
  'You collect from the shop': 'ستستلمها أنت من المتجر', 'Unknown Shop': 'متجر غير معروف',
  'Cancel order': 'إلغاء الطلب', 'Cancel this order?': 'هل تريد إلغاء هذا الطلب؟',
  '💬 Chat with the shop': '💬 محادثة مع المتجر', '💬 Chat with customer': '💬 محادثة مع العميل',
  'Please': 'يرجى', 'log in': 'تسجيل الدخول', 'to see your orders': 'لعرض طلباتك', 'again': 'مرة أخرى',
  'Your session has expired. Please': 'انتهت جلستك. يرجى', 'to see this chat': 'لعرض هذه المحادثة',
  'Open the chat on the order below': 'افتح المحادثة في الطلب أدناه',

  /* dashboard */
  'Shop Dashboard': 'لوحة المتجر', 'your shop': 'متجرك', 'Shop dashboard': 'لوحة المتجر', 'Set up your shop': 'جهّز متجرك',
  'Tell customers about your gift wrapping business. You can add your services right after': 'عرّف العملاء بمتجرك لتغليف الهدايا. يمكنك إضافة خدماتك مباشرة بعد ذلك',
  'Shop name': 'اسم المتجر', 'Description': 'الوصف', 'Shop email': 'البريد الإلكتروني للمتجر', 'Street / area': 'الشارع / المنطقة',
  'City': 'المدينة', 'Create shop': 'إنشاء المتجر',
  'Your shop is waiting for approval and is not visible to customers yet': 'متجرك بانتظار الموافقة وغير ظاهر للعملاء بعد',
  'Total Orders': 'إجمالي الطلبات', 'New (Pending)': 'جديدة (قيد الانتظار)', 'Revenue (AED)': 'الإيرادات (درهم)',
  'Shop details': 'تفاصيل المتجر', 'This is what customers see. Change it here any time': 'هذا ما يراه العملاء. يمكنك تغييره هنا في أي وقت',
  'Let the': 'دع', 'Hadiya Assistant': 'مساعد هدية',
  'answer customers first (it is always labelled as automatic, and stops as soon as you write in a chat)': 'يردّ على العملاء أولاً (يُوضَّح دائماً أنه آلي، ويتوقف فور كتابتك في المحادثة)',
  'Your services': 'خدماتك', 'Service name': 'اسم الخدمة', 'Price (AED)': 'السعر (درهم)', 'Description (optional)': 'الوصف (اختياري)',
  'Approvals': 'الموافقات', 'Working hours': 'ساعات العمل', 'Opening hours': 'ساعات العمل',
  'Customers see when you are open. Tick Closed for your days off': 'يرى العملاء متى تكون متاحاً. ضع علامة على «مغلق» في أيام إجازتك',
  'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس', 'Friday': 'الجمعة', 'Saturday': 'السبت', 'Sunday': 'الأحد',
  'Closed': 'مغلق', 'Open now': 'مفتوح الآن', 'Closed now': 'مغلق الآن', 'Save hours': 'حفظ الساعات', 'Copy Monday to all days': 'نسخ ساعات الاثنين لكل الأيام',
  'Saved. Your working hours are updated': 'تم الحفظ. تم تحديث ساعات عملك',
  'Shop name (English)': 'اسم المتجر (بالإنجليزية)', 'Shop name (Arabic, optional)': 'اسم المتجر (بالعربية، اختياري)',
  'Add service': 'إضافة خدمة', 'Orders': 'الطلبات', 'e.g. Premium wrapping': 'مثال: تغليف فاخر',
  'Description (English)': 'الوصف (بالإنجليزية)', 'Description (Arabic, optional)': 'الوصف (بالعربية، اختياري)',
  'Service name (English)': 'اسم الخدمة (بالإنجليزية)', 'Service name (Arabic, optional)': 'اسم الخدمة (بالعربية، اختياري)',
  'Description (English, optional)': 'الوصف (بالإنجليزية، اختياري)', 'Edit': 'تعديل', 'Cancel editing': 'إلغاء التعديل',
  'Accept': 'قبول', 'Reject': 'رفض', 'Start wrapping': 'بدء التغليف', 'Mark ready': 'تحديد كجاهز', 'Complete': 'إكمال',
  'This page is for shop owner accounts. Please register or log in with a shop owner account': 'هذه الصفحة لحسابات أصحاب المتاجر. يرجى التسجيل أو تسجيل الدخول بحساب صاحب متجر',
  'Saved. Your shop details are updated': 'تم الحفظ. تم تحديث تفاصيل متجرك',
  'No services yet. Add your first one below so customers can book you': 'لا توجد خدمات بعد. أضف أول خدمة أدناه ليتمكن العملاء من الحجز عندك',
  'Remove this service?': 'هل تريد حذف هذه الخدمة؟', 'Remove': 'حذف', 'No orders yet!': 'لا توجد طلبات بعد!',
  'Service:': 'الخدمة:', 'Delivery:': 'التوصيل:', 'Total to collect:': 'المبلغ المطلوب تحصيله:', 'Customer:': 'العميل:',
  'Gift to shop:': 'وصول الهدية للمتجر:', 'Return:': 'الإرجاع:', 'Notes:': 'ملاحظات:', 'Payment:': 'الدفع:',
  'Customer drops off': 'العميل يوصلها بنفسه', 'Customer collects': 'العميل يستلمها بنفسه',
  'See the orders': 'عرض الطلبات', 'Are you sure? This cannot be undone': 'هل أنت متأكد؟ لا يمكن التراجع عن هذا',
  'from customers': 'من العملاء', 'new message from customers': 'رسالة جديدة من العملاء', 'new messages from customers': 'رسائل جديدة من العملاء',
  'Starting from': 'تبدأ من',
  '💬 You have': '💬 لديك', 'new message': 'رسالة جديدة', 'new messages': 'رسائل جديدة',

  /* logo and photos */
  'Logo and photos': 'الشعار والصور', 'They appear on your shop card and your shop page. Pictures are shrunk automatically': 'تظهر على بطاقة متجرك وصفحته. يتم تصغير الصور تلقائياً',
  'Logo': 'الشعار', 'Choose logo': 'اختيار الشعار', 'Remove logo': 'حذف الشعار', 'Photos (up to 4)': 'الصور (حتى 4)', 'Add photo': 'إضافة صورة',
  'Saved': 'تم الحفظ', 'Please choose an image file': 'يرجى اختيار ملف صورة', 'You can add up to 4 photos': 'يمكنك إضافة حتى 4 صور',
  'This image is too large. Please choose a smaller one': 'هذه الصورة كبيرة جداً. يرجى اختيار صورة أصغر', 'Could not read this image': 'تعذّرت قراءة هذه الصورة',
  'The logo must be a JPG, PNG or WebP image': 'يجب أن يكون الشعار صورة JPG أو PNG أو WebP', 'The logo image is too large. Please choose a smaller one': 'صورة الشعار كبيرة جداً. يرجى اختيار صورة أصغر',
  'Photos must be JPG, PNG or WebP images': 'يجب أن تكون الصور بصيغة JPG أو PNG أو WebP', 'A photo is too large. Please choose a smaller one': 'إحدى الصور كبيرة جداً. يرجى اختيار صورة أصغر',
  'You can add up to 4 photos': 'يمكنك إضافة حتى 4 صور',

  /* reviews */
  'Reviews': 'التقييمات', 'How was it?': 'كيف كانت تجربتك؟', 'Write a short comment (optional)': 'اكتب تعليقاً قصيراً (اختياري)',
  'Send review': 'إرسال التقييم', 'Your rating': 'تقييمك', 'Thank you for your review': 'شكراً لتقييمك',
  'Please choose a rating from 1 to 5 stars': 'يرجى اختيار تقييم من 1 إلى 5 نجوم',
  'No reviews yet. You can rate a shop after your order is completed': 'لا توجد تقييمات بعد. يمكنك تقييم المتجر بعد اكتمال طلبك',
  'You can only review your own orders': 'يمكنك تقييم طلباتك فقط', 'You can review an order once it is completed': 'يمكنك تقييم الطلب بعد اكتماله',
  'Your comment is too long (max 500 characters)': 'تعليقك طويل جداً (الحد الأقصى 500 حرف)', 'You already reviewed this order': 'لقد قيّمت هذا الطلب مسبقاً',

  /* notifications */
  '🔔 Get an alert on this phone when something new arrives, even when the app is closed.': '🔔 احصل على تنبيه على هذا الهاتف عند وصول أي جديد، حتى عندما يكون التطبيق مغلقاً.',
  'Turn on notifications': 'تفعيل الإشعارات', 'Not now': 'ليس الآن', 'Notifications are on ✓': 'تم تفعيل الإشعارات ✓',
  'Notifications are blocked in this browser. Allow them in the site settings and try again.': 'الإشعارات محظورة في هذا المتصفح. اسمح بها من إعدادات الموقع ثم حاول مجدداً.',
  'Notifications are not set up yet.': 'الإشعارات غير مفعّلة بعد.', 'Could not turn on notifications.': 'تعذّر تفعيل الإشعارات.',
  '🔔 To get alerts on iPhone: tap Share, then "Add to Home Screen", and open Hadiya from your home screen.': '🔔 لتصلك التنبيهات على الآيفون: اضغط مشاركة، ثم «إضافة إلى الشاشة الرئيسية»، وافتح هدية من الشاشة الرئيسية.',
  'This browser cannot receive notifications': 'هذا المتصفح لا يدعم الإشعارات', 'Notifications are not set up yet': 'الإشعارات غير مفعّلة بعد',

  /* shop-orders.html */
  'Shop Orders': 'طلبات المتجر', 'incoming orders': 'الطلبات الواردة', 'Manage shop orders': 'إدارة طلبات المتجر',
  'View customer orders and update their status': 'اعرض طلبات العملاء وحدّث حالتها', 'Refresh orders': 'تحديث الطلبات',
  'Go to login': 'الذهاب لتسجيل الدخول', 'Loading orders...': 'جارٍ تحميل الطلبات...',
  'Browser storage is unavailable. Allow site storage and log in again': 'تخزين المتصفح غير متاح. اسمح بتخزين الموقع ثم سجّل الدخول مجدداً',
  'You are not logged in. Please log in as a shop owner': 'لم تسجّل الدخول. يرجى تسجيل الدخول كصاحب متجر',
  'Your session is missing, expired, or invalid. Please log in again': 'جلستك مفقودة أو منتهية أو غير صالحة. يرجى تسجيل الدخول مجدداً',
  'Access denied. Your account may not have the required owner role or shop access': 'تم رفض الوصول. قد لا يملك حسابك صلاحية صاحب المتجر',
  'The requested API route or order was not found. Check the backend order routes': 'لم يتم العثور على الطلب المطلوب',
  'The backend returned a server error. Check Render runtime logs': 'حدث خطأ في الخادم. حاول مرة أخرى لاحقاً',
  'The backend rejected the request': 'رفض الخادم الطلب',
  'The backend reported an unsuccessful request': 'لم يكتمل الطلب',
  'An unexpected error occurred': 'حدث خطأ غير متوقع', 'No orders found for your shop yet': 'لا توجد طلبات لمتجرك بعد',
  'Customer': 'العميل', 'Unknown Customer': 'عميل غير معروف', 'Phone': 'الهاتف', 'Service Price': 'سعر الخدمة',
  'Delivery Fee': 'رسوم التوصيل', 'Hadiya commission': 'عمولة هدية', 'You earn': 'أرباحك', 'Total Price': 'السعر الإجمالي', 'Current Status': 'الحالة الحالية', 'Placed on': 'تاريخ الطلب',
  'Update status:': 'تحديث الحالة:', 'Update': 'تحديث', 'Orders could not be loaded': 'تعذّر تحميل الطلبات',
  'Please choose a valid status': 'يرجى اختيار حالة صحيحة', 'This order already has that status': 'الطلب بهذه الحالة بالفعل',
  'Order status updated successfully': 'تم تحديث حالة الطلب بنجاح',

  /* chat.html */
  'Order chat': 'محادثة الطلب', '← Back to orders': 'العودة إلى الطلبات', 'Chat': 'محادثة',
  'Write a message...': 'اكتب رسالة...', 'Message': 'رسالة',
  'Please keep your messages about this order. Press Enter to send, Shift+Enter for a new line': 'يرجى أن تتعلق رسائلك بهذا الطلب. اضغط Enter للإرسال، وShift+Enter لسطر جديد',
  '🤖 Hadiya Assistant · automatic reply': '🤖 مساعد هدية · ردّ آلي', 'You': 'أنت', 'Shop': 'المتجر',
  'No messages yet. Say hello! 👋': 'لا توجد رسائل بعد. ابدأ بالتحية! 👋', 'the customer': 'العميل', 'the shop': 'المتجر',
  'The automatic Hadiya Assistant answers customers first. When you write here, it stays quiet for the next 30 minutes. Press Enter to send': 'مساعد هدية الآلي يردّ على العملاء أولاً. عندما تكتب هنا يتوقف عن الرد لمدة 30 دقيقة. اضغط Enter للإرسال',
  'Our automatic assistant may answer first. The shop owner will reply personally when needed. Press Enter to send': 'قد يردّ مساعدنا الآلي أولاً، وسيردّ صاحب المتجر بنفسه عند الحاجة. اضغط Enter للإرسال',
  'This chat is not available. It may belong to a different account': 'هذه المحادثة غير متاحة. قد تكون تابعة لحساب آخر',
  'Your session has expired. Please log in again': 'انتهت جلستك. يرجى تسجيل الدخول مجدداً',
  'No order selected. Open a chat from': 'لم يتم اختيار طلب. افتح المحادثة من', 'your orders': 'طلباتك',
  'Please log in to see this chat': 'يرجى تسجيل الدخول لعرض هذه المحادثة',

  /* messages that come from the server or from connection problems */
  'Could not connect to the server. Check your internet connection and try again': 'تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مجدداً',
  'The server is taking too long to respond. It may be waking up - please try again in a moment': 'الخادم يستغرق وقتاً طويلاً للرد. قد يكون في طور التشغيل، يرجى المحاولة بعد لحظات',
  'Could not connect to the API. Verify backend status and CORS settings': 'تعذّر الاتصال بالخادم. حاول مجدداً بعد قليل',
  'The request timed out after 60 seconds. Render may still be spinning up. Try refreshing': 'انتهت مهلة الطلب. قد يكون الخادم قيد التشغيل، حاول تحديث الصفحة',
  'Invalid credentials': 'بيانات الدخول غير صحيحة', 'User already exists': 'المستخدم موجود بالفعل',
  'An account with this email already exists': 'يوجد حساب بهذا البريد الإلكتروني بالفعل', 'An account with this phone number already exists': 'يوجد حساب بهذا الرقم بالفعل',
  'Not authorized': 'غير مصرّح لك', 'Not authorized. Please login': 'غير مصرّح. يرجى تسجيل الدخول',
  'Not authorized. Invalid or expired token': 'غير مصرّح. الجلسة غير صالحة أو منتهية',
  'Not authorized to view this order': 'غير مصرّح لك بعرض هذا الطلب', 'Not authorized to cancel this order': 'غير مصرّح لك بإلغاء هذا الطلب',
  'Not authorized to update this order': 'غير مصرّح لك بتحديث هذا الطلب', 'Order not found': 'الطلب غير موجود',
  'Shop not found': 'المتجر غير موجود', 'Service not found': 'الخدمة غير موجودة', 'Only pending orders can be cancelled': 'يمكن إلغاء الطلبات قيد الانتظار فقط',
  'Please choose a service': 'يرجى اختيار خدمة', 'Please choose how the gift gets to the shop': 'يرجى اختيار طريقة وصول الهدية إلى المتجر',
  'Please choose how you get the gift back': 'يرجى اختيار طريقة استلام الهدية بعد التغليف',
  'Only cash payment is available right now': 'الدفع نقداً فقط متاح حالياً', 'You cannot order from your own shop': 'لا يمكنك الطلب من متجرك',
  'This service is currently unavailable': 'هذه الخدمة غير متاحة حالياً', 'You already have a shop': 'لديك متجر بالفعل',
  'You do not have a shop yet': 'ليس لديك متجر بعد', 'Service added successfully': 'تمت إضافة الخدمة بنجاح',
  'Service deleted successfully': 'تم حذف الخدمة بنجاح', 'Service updated successfully': 'تم تحديث الخدمة بنجاح',
  'Shop created successfully': 'تم إنشاء المتجر بنجاح', 'Shop updated successfully': 'تم تحديث المتجر بنجاح',
  'You do not have permission to perform this action': 'ليس لديك صلاحية تنفيذ هذا الإجراء',
  'Too many requests, please try again later': 'طلبات كثيرة جداً، يرجى المحاولة لاحقاً',
  'You are sending messages too fast. Please wait a moment': 'ترسل الرسائل بسرعة كبيرة. يرجى الانتظار قليلاً',
  'Please type a message': 'يرجى كتابة رسالة', 'Message is too long (max 1000 characters)': 'الرسالة طويلة جداً (الحد الأقصى 1000 حرف)',
  'You are not part of this chat': 'لست طرفاً في هذه المحادثة', 'A valid shop is required': 'يجب تحديد متجر صحيح',
  'Invalid status': 'حالة غير صحيحة', 'Invalid date/time': 'تاريخ/وقت غير صحيح', 'API route not found': 'المسار غير موجود'
};

/* messages with a changing part (name, number...) */
const AR_PATTERNS = [
  [/^Chat with (.+)$/, (m, n) => 'محادثة مع ' + (n === 'the customer' ? 'العميل' : n === 'the shop' ? 'المتجر' : n)],
  [/^Order #(.*)$/, (m, n) => 'طلب رقم ' + n],
  [/^Shop picks up from: (.*)$/, (m, a) => 'يستلمها المتجر من: ' + a],
  [/^Delivered to: (.*)$/, (m, a) => 'يتم التوصيل إلى: ' + a],
  [/^Pick up from (.*)$/, (m, a) => 'الاستلام من ' + a],
  [/^Deliver to (.*)$/, (m, a) => 'التوصيل إلى ' + a],
  [/^Placed (.*)$/, (m, d) => 'تاريخ الطلب: ' + d],
  [/^Service (AED \d+) \+ delivery (AED \d+)$/, (m, a, b) => 'الخدمة ' + a + ' + التوصيل ' + b],
  [/^\((\d+) reviews?\)$/, (m, n) => '(' + n + ' تقييم)'],
  [/^(\d+) orders? loaded$/, (m, n) => 'تم تحميل ' + n + (n === '1' ? ' طلب' : ' طلبات')],
  [/^(\d+) new$/, (m, n) => n + ' جديدة'],
  [/^💬 You have 1 new message\.?(.*)$/, () => '💬 لديك رسالة جديدة واحدة. افتح المحادثة في الطلب أدناه.'],
  [/^💬 You have (\d+) new messages\.?(.*)$/, (m, n) => '💬 لديك ' + n + ' رسائل جديدة. افتح المحادثات في الطلبات أدناه.'],
  [/^(.+) - Hadiya$/, (m, a) => trText(a) + ' - هدية'],
  [/^(\d+) services?$/, (m, n) => n + ' خدمة'],
  [/^(\d+) reviews?$/, (m, n) => n + ' تقييم'],
  [/^(\d+) shops?$/, (m, n) => n + ' متجر']
];

function trCore(core) {
  const dot = /[.!:]$/.test(core) ? core.slice(-1) : '';
  const bare = dot ? core.slice(0, -1) : core;
  if (Object.prototype.hasOwnProperty.call(AR, core)) return AR[core];
  if (dot && Object.prototype.hasOwnProperty.call(AR, bare)) return AR[bare] + dot;
  for (const [re, fn] of AR_PATTERNS) {
    const m = core.match(re);
    if (m) return fn.apply(null, m);
    const m2 = dot ? bare.match(re) : null;
    if (m2) return fn.apply(null, m2) + dot;
  }
  /* money: "AED 25" -> "25 درهم" */
  if (/\bAED\b/.test(core)) {
    const out = core.replace(/AED\s*(\d+(?:\.\d+)?)/g, '$1 درهم').replace(/\bAED\b/g, 'درهم');
    if (out !== core) return out;
  }
  /* "cash (pending)" etc. */
  const pay = core.match(/^(\w+) \((\w+)\)$/);
  if (pay && (AR[pay[1]] || AR[pay[2]])) return (AR[pay[1]] || pay[1]) + ' (' + (AR[pay[2]] || pay[2]) + ')';
  return null;
}

function trText(raw) {
  if (!IS_AR || typeof raw !== 'string') return raw;
  const lead = raw.match(/^\s*/)[0], tail = raw.match(/\s*$/)[0];
  const core = raw.trim().replace(/\s+/g, ' ');
  if (!core || !/[A-Za-z]/.test(core)) return raw;
  let out = trCore(core);
  if (out === null) {
    /* text that starts with an emoji, e.g. "📥 Delivered to: ..." */
    const m = core.match(/^((?:\p{Extended_Pictographic}\uFE0F?\s*)+)(.*)$/u);
    if (m) { const inner = trCore(m[2]); if (inner !== null) out = m[1] + inner; }
  }
  return out === null ? raw : lead + out + tail;
}

function t(text) { return trText(text); }

function translateNode(root) {
  if (!IS_AR || !root) return;
  if (root.nodeType === 3) { translateTextNode(root); return; }
  if (root.nodeType !== 1) return;
  const skip = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1 };
  if (skip[root.tagName]) return;
  translateAttrs(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null);
  let n;
  while ((n = walker.nextNode())) {
    if (n.nodeType === 3) {
      if (n.parentNode && skip[n.parentNode.tagName]) continue;
      translateTextNode(n);
    } else if (!skip[n.tagName]) {
      translateAttrs(n);
    }
  }
}

function translateTextNode(node) {
  if (node.parentElement && node.parentElement.closest('[data-notr]')) return;   /* chat messages etc. are never translated */
  const next = trText(node.nodeValue);
  if (next !== node.nodeValue) node.nodeValue = next;
}

function translateAttrs(el) {
  ['placeholder', 'aria-label', 'title', 'alt'].forEach(a => {
    if (el.hasAttribute && el.hasAttribute(a)) {
      const v = el.getAttribute(a), nv = trText(v);
      if (nv !== v) el.setAttribute(a, nv);
    }
  });
}

function setLanguage(lang) {
  try { localStorage.setItem('language', lang === 'ar' ? 'ar' : 'en'); } catch (e) {}
  location.reload();
}

/* Right-to-left + Arabic font, as early as possible (before the page paints) */
if (IS_AR) {
  document.documentElement.lang = 'ar';
  document.documentElement.dir = 'rtl';
  const tag = () => document.body && document.body.classList.add('arabic');
  if (document.body) tag(); else document.addEventListener('DOMContentLoaded', tag);

  /* alert() / confirm() pop-ups */
  const _alert = window.alert.bind(window), _confirm = window.confirm.bind(window);
  window.alert = (m) => _alert(trText(String(m)));
  window.confirm = (m) => _confirm(trText(String(m)));

  const start = () => {
    translateNode(document.documentElement);
    new MutationObserver(list => {
      list.forEach(r => {
        if (r.type === 'characterData') translateTextNode(r.target);
        else if (r.type === 'attributes') translateAttrs(r.target);
        else r.addedNodes.forEach(translateNode);
      });
    }).observe(document.documentElement, {
      childList: true, characterData: true, subtree: true,
      attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title']
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
}

/* Fills <nav id="siteNav"> with the right links for whoever is signed in.
   Pass the file name of the current page so its link is highlighted. */
function renderNav(current) {
  const nav = document.getElementById('siteNav');
  if (!nav) return;
  const user = getUser();
  const loggedIn = !!getToken();
  const isOwner = loggedIn && user && (user.role === 'shop_owner' || user.role === 'admin');
  const links = [];
  if (isOwner) {
    links.push(['shop-owner-dashboard.html', 'Dashboard']);
    links.push(['shop-orders.html', 'Shop orders']);
    if (user.role === 'admin') links.push(['admin.html', 'Approvals']);
  } else {
    links.push(['shops.html', 'Browse shops']);
    links.push(['my-orders.html', 'My orders']);
  }
  const ordersHref = isOwner ? 'shop-owner-dashboard.html' : 'my-orders.html';
  let html = links.map(([href, text]) =>
    '<a href="' + href + '"' + (href === current ? ' class="active"' : '') + (href === ordersHref ? ' data-orders-link' : '') + '>' + text +
    (href === ordersHref ? '<span class="nav-badge" hidden></span>' : '') + '</a>').join('');
  html += '<a href="index.html">Home</a>';
  html += '<button type="button" class="lang-btn" id="navLang">' + (IS_AR ? 'English' : 'العربية') + '</button>';
  if (loggedIn) {
    html += '<button type="button" class="link" id="navSignOut">Sign out</button>';
  } else {
    html += '<a href="login.html">Sign in</a><a href="register.html" class="cta">Create account</a>';
  }
  nav.innerHTML = html;
  const langBtn = document.getElementById('navLang');
  if (langBtn) langBtn.addEventListener('click', () => setLanguage(IS_AR ? 'en' : 'ar'));
  const out = document.getElementById('navSignOut');
  if (out) out.addEventListener('click', logout);
  if (loggedIn) { startUnreadWatch(); renderPushBar(); }
}

/* ---- Phone notifications ----
   A small bar offers "Turn on notifications" once per person. Everything here is optional:
   if the browser cannot do it, or the server has no keys yet, nothing is shown. */
const PUSH_SUPPORTED = ('serviceWorker' in navigator) && typeof window.PushManager !== 'undefined' && typeof window.Notification !== 'undefined';
let pushKeyCache = null;

function base64UrlToBytes(text) {
  const pad = '='.repeat((4 - (text.length % 4)) % 4);
  const raw = atob((text + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, ch => ch.charCodeAt(0));
}

async function pushServerKey() {
  if (pushKeyCache === null) {
    try { const d = await api('/push/key'); pushKeyCache = d.enabled ? d.publicKey : ''; } catch (e) { return ''; }
  }
  return pushKeyCache;
}

async function registerPushOnServer(sub) {
  await api('/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON(), lang: getLang() } });
}

/* Called from a button tap (browsers require that to show the permission question) */
async function enablePush() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked in this browser. Allow them in the site settings and try again.');
  const key = await pushServerKey();
  if (!key) throw new Error('Notifications are not set up yet.');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) });
  await registerPushOnServer(sub);
}

/* Already allowed earlier: quietly make sure this phone is registered for the signed-in person (once per visit) */
async function syncPush() {
  try {
    if (sessionStorage.getItem('pushSynced')) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) { await registerPushOnServer(sub); sessionStorage.setItem('pushSynced', '1'); }
    else {
      const key = await pushServerKey();
      if (!key) return;
      await registerPushOnServer(await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) }));
      sessionStorage.setItem('pushSynced', '1');
    }
  } catch (e) { /* optional feature: stay quiet */ }
}

async function disablePushOnThisDevice() {
  try {
    if (!PUSH_SUPPORTED || !getToken()) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    if (!sub) return;
    try { await api('/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }); } catch (e) {}
    await sub.unsubscribe();
    try { sessionStorage.removeItem('pushSynced'); } catch (e) {}
  } catch (e) { /* ignore */ }
}

function pushBarDismissed() { try { return localStorage.getItem('pushDismissed') === '1'; } catch (e) { return false; } }

async function renderPushBar() {
  if (!getToken() || document.getElementById('pushBar')) return;
  const header = document.querySelector('header.topbar');
  if (!header) return;

  let message = null, withButton = false;
  if (PUSH_SUPPORTED) {
    if (Notification.permission === 'granted') { syncPush(); return; }
    if (Notification.permission === 'denied' || pushBarDismissed()) return;
    if (!(await pushServerKey())) return;
    message = '🔔 Get an alert on this phone when something new arrives, even when the app is closed.';
    withButton = true;
  } else {
    // iPhone / iPad only allow notifications for apps added to the home screen
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const installed = (window.navigator.standalone === true) || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    if (!ios || installed || pushBarDismissed()) return;
    message = '🔔 To get alerts on iPhone: tap Share, then "Add to Home Screen", and open Hadiya from your home screen.';
  }

  const bar = document.createElement('div');
  bar.id = 'pushBar';
  bar.className = 'notice push-bar';
  const text = document.createElement('span');
  text.textContent = message;
  bar.appendChild(text);
  const actions = document.createElement('span');
  actions.className = 'push-actions';
  if (withButton) {
    const on = document.createElement('button');
    on.type = 'button'; on.className = 'btn btn-sm'; on.textContent = 'Turn on notifications';
    on.addEventListener('click', async () => {
      on.disabled = true;
      try {
        await enablePush();
        bar.className = 'notice ok push-bar';
        text.textContent = 'Notifications are on ✓';
        actions.remove();
        setTimeout(() => bar.remove(), 3500);
      } catch (e) {
        text.textContent = e.message || 'Could not turn on notifications.';
        on.disabled = false;
      }
    });
    actions.appendChild(on);
  }
  const later = document.createElement('button');
  later.type = 'button'; later.className = 'btn btn-sm btn-outline'; later.textContent = 'Not now';
  later.addEventListener('click', () => { try { localStorage.setItem('pushDismissed', '1'); } catch (e) {} bar.remove(); });
  actions.appendChild(later);
  bar.appendChild(actions);
  header.insertAdjacentElement('afterend', bar);
}

/* ---- Unread chat messages ----
   Shows a number on the orders link in the menu, "(2)" in the browser tab title, and a
   "2 new" pill on every element that has data-chat="<orderId>". Checks every 20 seconds. */
const unreadState = { total: 0, orders: {} };
let unreadTimer = null;
let baseTitle = null;

function applyUnread() {
  if (baseTitle === null) baseTitle = document.title;
  document.title = (unreadState.total > 0 ? '(' + unreadState.total + ') ' : '') + trText(baseTitle);

  document.querySelectorAll('#siteNav .nav-badge').forEach(badge => {
    badge.textContent = unreadState.total;
    badge.hidden = unreadState.total === 0;
  });

  document.querySelectorAll('[data-chat]').forEach(el => {
    const count = unreadState.orders[el.dataset.chat] || 0;
    let pill = el.querySelector('.unread-pill');
    if (count > 0) {
      if (!pill) {
        pill = document.createElement('span');
        pill.className = 'unread-pill';
        el.appendChild(pill);
      }
      pill.textContent = count + ' new';
    } else if (pill) {
      pill.remove();
    }
  });

  document.dispatchEvent(new CustomEvent('unread-updated', { detail: unreadState }));
}

async function refreshUnread() {
  try {
    const data = await api('/orders/unread');
    unreadState.total = Number(data.total) || 0;
    unreadState.orders = data.orders || {};
    applyUnread();
  } catch (e) {
    if (e.status === 401 && unreadTimer) { clearInterval(unreadTimer); unreadTimer = null; }
    /* any other error: stay quiet, the next check tries again */
  }
}

function startUnreadWatch() {
  if (unreadTimer) return;
  baseTitle = document.title;
  refreshUnread();
  unreadTimer = setInterval(() => { if (!document.hidden) refreshUnread(); }, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshUnread(); });
}

/* Register the service worker on every page that loads this file */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
