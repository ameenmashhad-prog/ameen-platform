/* Amin Platform Modules — كتالوج الوحدات والصلاحيات */
(function(global){
  'use strict';

  const MODULES = [
    { key: 'dashboard', title: { ar: 'لوحة القيادة', en: 'Dashboard', fa: 'داشبورد' }, desc: { ar: 'ملخص يومي وإحصائيات', en: 'Daily summary', fa: 'خلاصه روزانه' }, href: 'portal.html', perms: null, icon: 'home' },
    { key: 'students', title: { ar: 'الطلاب', en: 'Students', fa: 'دانش‌آموزان' }, desc: { ar: 'إدارة بيانات الطلاب', en: 'Student management', fa: 'مدیریت دانش‌آموزان' }, href: 'pages/student.html', perms: ['admin','academic','teacher','counselor','discipline'], icon: 'users' },
    { key: 'finance', title: { ar: 'المالية', en: 'Finance', fa: 'مالی' }, desc: { ar: 'رسوم وأقساط ومدفوعات', en: 'Fees and payments', fa: 'شهریه و پرداخت‌ها' }, href: 'pages/finance-pro.html', perms: ['admin','finance'], icon: 'finance' },
    { key: 'academic', title: { ar: 'الأكاديمي', en: 'Academic', fa: 'آکادمیک' }, desc: { ar: 'درجات ومواد وجداول', en: 'Grades and schedules', fa: 'نمرات و برنامه‌ها' }, href: 'pages/academic-pro.html', perms: ['admin','academic','teacher'], icon: 'academic' },
    { key: 'schedule', title: { ar: 'الجدول', en: 'Schedule', fa: 'برنامه' }, desc: { ar: 'إدارة الجداول الأسبوعية', en: 'Weekly schedules', fa: 'برنامه‌های هفتگی' }, href: 'pages/schedule-management.html', perms: ['admin','academic'], icon: 'calendar' },
    { key: 'homework', title: { ar: 'الواجبات', en: 'Homework', fa: 'تکالیف' }, desc: { ar: 'واجبات وتسليمات', en: 'Homework and submissions', fa: 'تکالیف و تحویلات' }, href: 'pages/student-homeworks.html', perms: ['admin','teacher','student','parent'], icon: 'forms' },
    { key: 'exams', title: { ar: 'الاختبارات', en: 'Exams', fa: 'آزمون‌ها' }, desc: { ar: 'بنك الأسئلة والاختبارات', en: 'Question bank and exams', fa: 'بانک سوالات و آزمون‌ها' }, href: 'pages/teacher-exams.html', perms: ['admin','teacher','student'], icon: 'reports' },
    { key: 'library', title: { ar: 'المكتبة', en: 'Library', fa: 'کتابخانه' }, desc: { ar: 'إعارة وكتب', en: 'Library lending', fa: 'امانت کتابخانه' }, href: 'pages/library.html', perms: ['admin','library'], icon: 'links' },
    { key: 'inventory', title: { ar: 'المخزون', en: 'Inventory', fa: 'انبار' }, desc: { ar: 'مواد ومخزون', en: 'Inventory', fa: 'مواد و انبار' }, href: 'pages/inventory.html', perms: ['admin','inventory'], icon: 'inventory' },
    { key: 'hr', title: { ar: 'الموارد البشرية', en: 'HR', fa: 'منابع انسانی' }, desc: { ar: 'موظفون ورواتب', en: 'Staff and payroll', fa: 'کارکنان و حقوق' }, href: 'pages/hr.html', perms: ['admin','hr'], icon: 'users' },
    { key: 'transport', title: { ar: 'النقل', en: 'Transport', fa: 'حمل و نقل' }, desc: { ar: 'مركبات ومسارات', en: 'Vehicles and routes', fa: 'وسایل و مسیرها' }, href: 'pages/transportation.html', perms: ['admin','transport'], icon: 'transport' },
    { key: 'counseling', title: { ar: 'الإرشاد', en: 'Counseling', fa: 'مشاوره' }, desc: { ar: 'جلسات ومتابعة', en: 'Counseling sessions', fa: 'جلسات مشاوره' }, href: 'pages/counselor.html', perms: ['admin','counselor','psychologist'], icon: 'counseling' },
    { key: 'analytics', title: { ar: 'التحليلات', en: 'Analytics', fa: 'تحلیل‌ها' }, desc: { ar: 'تقارير ومؤشرات', en: 'Reports and KPIs', fa: 'گزارش‌ها و شاخص‌ها' }, href: 'pages/analytics-center.html', perms: ['admin','analytics'], icon: 'reports' },
    { key: 'calendar', title: { ar: 'التقويم', en: 'Calendar', fa: 'تقویم' }, desc: { ar: 'الفعاليات والاختبارات والعطل', en: 'Events, exams and holidays', fa: 'رویدادها، آزمون‌ها و تعطیلات' }, href: 'pages/calendar.html', perms: null, icon: 'calendar' },
    { key: 'notifications', title: { ar: 'الإشعارات', en: 'Notifications', fa: 'اعلان‌ها' }, desc: { ar: 'الإشعارات والتنبيهات العامة', en: 'General notifications', fa: 'اعلان‌ها و هشدارها' }, href: 'pages/notifications.html', perms: null, icon: 'bell' },
    { key: 'alerts', title: { ar: 'التنبيهات الذكية', en: 'Smart Alerts', fa: 'هشدارهای هوشمند' }, desc: { ar: 'تنبيهات مبنية على قواعد', en: 'Rule-based alerts', fa: 'هشدارهای مبتنی بر قواعد' }, href: 'pages/smart-alerts.html', perms: ['admin','academic','finance','discipline','teacher'], icon: 'alert' },
    { key: 'settings', title: { ar: 'الإعدادات', en: 'Settings', fa: 'تنظیمات' }, desc: { ar: 'صلاحيات ونظام', en: 'Permissions and system', fa: 'دسترسی و سیستم' }, href: 'pages/permissions-management.html', perms: ['admin'], icon: 'settings' }
  ];

  const ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>',
    finance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>',
    academic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6l9-4 9 4-9 4-9-4Z"/><path d="M7 10v5c0 2 2 4 5 4s5-2 5-4v-5"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    forms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>',
    reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="5"/><rect x="12" y="8" width="3" height="9"/><rect x="17" y="5" width="3" height="12"/></svg>',
    links: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    inventory: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></svg>',
    transport: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="10" rx="2"/><path d="M6 21v-2M18 21v-2M6 16H3M21 16h-3"/></svg>',
    counseling: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };

  const AminPlatform = {
    modules: MODULES,
    icons: ICONS,
    text: (obj, fallback) => {
      const lang = (window.AminI18n && window.AminI18n.getLang()) || 'ar';
      return (obj && obj[lang]) || (obj && obj.ar) || fallback || '';
    },
    iconHtml: (m) => ICONS[m.icon] || ICONS.home,
    allowedModules: (perms) => {
      if (!perms || perms.includes('admin')) return MODULES;
      return MODULES.filter(m => !m.perms || m.perms.some(p => perms.includes(p)));
    },
    searchModules: (query, list) => {
      const q = String(query || '').trim().toLowerCase();
      if (!q) return list;
      return list.filter(m => {
        const title = AminPlatform.text(m.title, m.key).toLowerCase();
        const desc = AminPlatform.text(m.desc, '').toLowerCase();
        return title.includes(q) || desc.includes(q) || m.key.includes(q);
      });
    }
  };

  global.AminPlatform = AminPlatform;
})(window);
