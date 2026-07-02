/* Amin I18n — نظام الترجمة الأساسي */
(function(global){
  'use strict';

  const DICT = {
    ar: {
      login: 'تسجيل الدخول',
      username: 'اسم المستخدم أو البريد الإلكتروني',
      password: 'كلمة المرور',
      rememberMe: 'تذكرني',
      forgotPassword: 'نسيت كلمة المرور؟',
      submit: 'دخول إلى النظام',
      registerParent: 'تسجيل ولي أمر/طالب',
      registerTeacher: 'تسجيل معلم',
      portal: 'البوابة الموحدة',
      dashboard: 'لوحة القيادة',
      students: 'الطلاب',
      grades: 'الدرجات',
      attendance: 'الحضور',
      homeworks: 'الواجبات',
      exams: 'الاختبارات',
      behavior: 'السلوك',
      achievements: 'الإنجازات',
      calendar: 'التقويم',
      notifications: 'الإشعارات',
      logout: 'تسجيل الخروج',
      close: 'إغلاق',
      details: 'التفاصيل',
      show: 'عرض',
      noData: 'لا توجد بيانات لعرضها',
      loading: 'جاري التحميل...',
      error: 'خطأ',
      retry: 'إعادة المحاولة',
      checkConnection: 'تحقق من الاتصال',
      morning: 'صباحاً',
      evening: 'مساءً',
      gregory: 'ميلادي',
      islamic: 'هجري',
      persian: 'شمسي'
    },
    en: {
      login: 'Login',
      username: 'Username or email',
      password: 'Password',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot password?',
      submit: 'Sign in',
      registerParent: 'Register parent/student',
      registerTeacher: 'Register teacher',
      portal: 'Unified Portal',
      dashboard: 'Dashboard',
      students: 'Students',
      grades: 'Grades',
      attendance: 'Attendance',
      homeworks: 'Homework',
      exams: 'Exams',
      behavior: 'Behavior',
      achievements: 'Achievements',
      calendar: 'Calendar',
      notifications: 'Notifications',
      logout: 'Logout',
      close: 'Close',
      details: 'Details',
      show: 'Show',
      noData: 'No data available',
      loading: 'Loading...',
      error: 'Error',
      retry: 'Retry',
      checkConnection: 'Check connection',
      morning: 'AM',
      evening: 'PM',
      gregory: 'Gregorian',
      islamic: 'Hijri',
      persian: 'Persian'
    },
    fa: {
      login: 'ورود',
      username: 'نام کاربری یا ایمیل',
      password: 'رمز عبور',
      rememberMe: 'مرا به خاطر بسپار',
      forgotPassword: 'رمز عبور را فراموش کردید؟',
      submit: 'ورود به سیستم',
      registerParent: 'ثبت نام والد/دانش‌آموز',
      registerTeacher: 'ثبت نام معلم',
      portal: 'پورتال یکپارچه',
      dashboard: 'داشبورد',
      students: 'دانش‌آموزان',
      grades: 'نمرات',
      attendance: 'حضور و غیاب',
      homeworks: 'تکالیف',
      exams: 'آزمون‌ها',
      behavior: 'رفتار',
      achievements: 'دستاوردها',
      calendar: 'تقویم',
      notifications: 'اعلان‌ها',
      logout: 'خروج',
      close: 'بستن',
      details: 'جزئیات',
      show: 'نمایش',
      noData: 'داده‌ای برای نمایش وجود ندارد',
      loading: 'در حال بارگذاری...',
      error: 'خطا',
      retry: 'تلاش مجدد',
      checkConnection: 'اتصال را بررسی کنید',
      morning: 'ق.ظ',
      evening: 'ب.ظ',
      gregory: 'میلادی',
      islamic: 'قمری',
      persian: 'شمسی'
    }
  };

  const RTL_LANGS = new Set(['ar','fa']);

  let currentLang = localStorage.getItem('amin-lang') || (window.AMIN_CONFIG && window.AMIN_CONFIG.defaultLang) || 'ar';

  const AminI18n = {
    getLang: () => currentLang,
    setLang: (lang) => {
      if (!DICT[lang]) lang = 'ar';
      currentLang = lang;
      localStorage.setItem('amin-lang', lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
      AminI18n.translatePage();
    },
    t: (key, fallback) => (DICT[currentLang] && DICT[currentLang][key]) || fallback || key,
    translatePage: () => {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (key) el.textContent = AminI18n.t(key, el.textContent);
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        if (key) el.placeholder = AminI18n.t(key, el.placeholder);
      });
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    AminI18n.setLang(currentLang);
  });

  global.AminI18n = AminI18n;
})(window);
