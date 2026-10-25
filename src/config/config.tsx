import { AiFillCode } from "react-icons/ai";
import { BsLightningChargeFill } from "react-icons/bs";
import { FaUsers, FaGitAlt, FaAward, FaGraduationCap, FaClipboardCheck } from "react-icons/fa";
import { TfiStatsUp } from "react-icons/tfi";


export const menuList = [
    { id: 1, name: 'Bosh sahifa', path: '/' },
    { id: 5, name: 'Tasklar', path: '/tasks' },
    { id: 6, name: 'Musobaqa', path: '/contests' },
    { id: 2, name: 'Narxlar', path: '/pricing' },
    { id: 3, name: "Mentor bo'lish", path: '/mentors' },
    { id: 4, name: 'Blog', path: '/blogs' },
]

export const avatarImgDB = [
    { id: 1, img: '/images/logo.png' },
    { id: 2, img: '/images/right.jpg' },
    { id: 3, img: '/images/logo.png' },
];

export const servicesDB = [
    { id: 1, title: 'Haqiqiy loyihalar bilan ishlash', desc: "O'quv maketlari emas, balki ishlab chiqarish (production) muhitiga mos arxitekturalar asosida topshiriqlarni bajaring. GitHub bilan to'liq integratsiya.", icon: <AiFillCode className="text-xl md:text-2xl text-blue-600" />, background: 'bg-blue-50 border border-blue-100' },
    { id: 2, title: 'Tezkor Teskari Aloqa (AI)', desc: "Siz yozgan kod avtomatik tahlil qilinadi va bir necha soniya ichida xatolar, xavfsizlik kamchiliklari hamda optimizatsiya sirlari ko'rsatiladi.", icon: <BsLightningChargeFill className="text-xl md:text-2xl text-amber-500" />, background: 'bg-amber-50 border border-amber-100' },
    { id: 3, title: 'Senior Mentorlar Yordami', desc: "Murakkab algoritmlar va qiyin vaziyatlarda ko'p yillik tajribaga ega mentorlarimiz sizga to'g'ri yo'nalish ko'rsatib, kod-revyu o'tkazishadi.", icon: <FaUsers className="text-xl md:text-2xl text-emerald-600" />, background: 'bg-emerald-50 border border-emerald-100' },
    { id: 4, title: "Karyera o'sishi va Tahlillar", desc: "Batafsil dashboard orqali qaysi texnologiyada kuchli ekanligingiz va qaysi ko'nikmalarni rivojlantirishingiz kerakligini real vaqtda kuzating.", icon: <TfiStatsUp className="text-xl md:text-2xl text-indigo-500" />, background: 'bg-indigo-50 border border-indigo-100' },
    { id: 5, title: "Git Workflows & CI/CD", desc: "Sanoatda ishlatiladigan Pull Request, Code Review va CI/CD jarayonlarini loyihalar davomida amaliy mashq qiling.", icon: <FaGitAlt className="text-xl md:text-2xl text-orange-600" />, background: 'bg-orange-50 border border-orange-100' },
    { id: 6, title: "Sertifikat va Portfoliolar", desc: "Bitirgan har bir muvaffaqiyatli loyihangiz portfoliongizga qo'shiladi va tasdiqlangan maxsus sertifikat bilan taqdirlanasiz.", icon: <FaAward className="text-xl md:text-2xl text-purple-600" />, background: 'bg-purple-50 border border-purple-100' },
];




// FAQ ma'lumotlari
export const faqs = [
    {
        q: "To'lov qanday amalga oshiriladi?",
        a: "Kabinetdagi \"Tarif\" bo'limida tarifni tanlang, ko'rsatilgan kartaga to'lov qiling (Click, Payme yoki bank ilovasi orqali) va chek rasmini yuklang. Chekni @devreadyrobot orqali ham yuborishingiz mumkin. Administrator tasdiqlagach tarif avtomatik faollashadi."
    },
    {
        q: "Free tarifda nimalar bor?",
        a: "Ro'yxatdan o'tgan har bir talaba 10 ta amaliy taskni bepul bajarishi mumkin. Har bir yechimni mentor yoki AI tekshiradi. Limit tugagach, davom etish uchun pullik tarifga o'tasiz."
    },
    {
        q: "Task uchun vaqt qanday belgilanadi?",
        a: "Har bir taskga qiyinlik darajasiga qarab vaqt ajratiladi. \"Boshlash\" tugmasi bosilganda taymer ishga tushadi. Vaqt tugaguncha yechim yuborilmasa, task \"bajarilmagan\" bo'limiga o'tadi — keyin uni qaytadan boshlash mumkin."
    },
    {
        q: "Yechimni kim tekshiradi?",
        a: "Yechimni topshirishda o'z yo'nalishingizdagi mentorlardan birini tanlaysiz — mentor ball va batafsil izoh qoldiradi. GitHub repozitoriyli tasklar uchun tezkor AI tekshiruvini ham tanlash mumkin."
    }
];

// Mentors
export const pathways = [
    {
        id: 1,
        icon: <FaGraduationCap className="text-3xl text-blue-600" />,
        title: "Devready Bitiruvchilari",
        subtitle: "Platformamiz ichki tizimi",
        desc: "Platformamizda real loyihalarni muvaffaqiyatli yakunlab, yuqori natija (rating) ko'rsatgan talabalarni to'g'ridan-to'g'ri mentorlik guruhiga taklif qilamiz.",
        badge: "Avtomatik Saralash",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
        btnText: "Natijalarni tekshirish",
        actionClass: "bg-blue-600 text-white hover:bg-blue-700",
        path: "https://t.me/devreadyadmin"
    },
    {
        id: 2,
        icon: <FaClipboardCheck className="text-3xl text-amber-600" />,
        title: "Tashqi Tajribali Dasturchilar",
        subtitle: "Test va Intervyu tizimi",
        desc: "Agar platformamizda o'qimagan bo'lsangiz ham, kuchli tajribaga ega bo'lsangiz, maxsus test va texnik intervyudan (Live Coding) o'tib jamoaga qo'shilishingiz mumkin.",
        badge: "Saralash Bosqichi",
        badgeColor: "bg-amber-50 text-brand border-amber-100",
        btnText: "Ekspertizadan o'tish",
        actionClass: "border border-gray-300 text-gray-700 hover:bg-gray-50",
        path: "https://t.me/devreadyadmin"
    }
];

export const steps = [
    { id: "01", title: "Ariza topshirish", desc: "Profilingiz yoki rezyumeingizni yuborasiz." },
    { id: "02", title: "Saralash (Test/Natija)", desc: "Platformadagi natijangiz tekshiriladi yoki testdan o'tasiz." },
    { id: "03", title: "Texnik suhbat", desc: "Senior mentorlarimiz bilan qisqa intervyu bo'lib o'tadi." },
    { id: "04", title: "Mentorlikni boshlash", desc: "Sizga guruh va real topshiriqlar biriktiriladi." },
];

// Blogs
export const categories = ["Barchasi", "Frontend", "Backend", "Texnologiya", "AI"];

export const blogData = [
    {
        id: 1,
        title: "Sun'iy intellekt davrida Junior dasturchilar nima qilishi kerak?",
        desc: "AI keng rivojlanayotgan bir paytda, yangi boshlovchi dasturchilar bozorda raqobatbardosh bo'lib qolishlari uchun qaysi ko'nikmalarga ko'proq e'tibor qaratishlari kerakligi haqida batafsil.",
        category: "Texnologiya",
        date: "Iyun 8, 2026",
        readTime: "5 daqiqa",
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
        isFeatured: true
    },
    {
        id: 2,
        title: "Clean Code (Toza kod) yozishning 5 ta oltin qoidasi",
        desc: "Kodingiz nafaqat ishlashi, balki boshqalar tomonidan ham oson o'qilishi kerak. Ushbu maqolada industry-standard qoidalarini ko'rib chiqamiz.",
        category: "Dasturlash",
        date: "Iyun 5, 2026",
        readTime: "7 daqiqa",
        image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80",
        isFeatured: false
    },
    {
        id: 3,
        title: "ITda birinchi ishni topish: Rezyume va Portfolio sirlari",
        desc: "Hech qayerda tajribangiz yo'qmi? Kuyunmang, to'g'ri shakllantirilgan GitHub portfolio sizga eshiklarni osonroq ochib bera oladi.",
        category: "Karyera",
        date: "May 28, 2026",
        readTime: "4 daqiqa",
        image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80",
        isFeatured: false
    },
    {
        id: 4,
        title: "Nega sizga qattiq algoritmlar emas, amaliy loyihalar kerak?",
        desc: "Algoritmlar fikrlashni rivojlantiradi, lekin kompaniyalar sizdan tayyor mahsulot yarata olishni talab qiladi. Muvozanatni qanday topamiz?",
        category: "Motivatsiya",
        date: "May 20, 2026",
        readTime: "6 daqiqa",
        image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
        isFeatured: false
    }
];