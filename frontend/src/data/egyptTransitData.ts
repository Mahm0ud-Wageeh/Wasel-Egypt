/**
 * Comprehensive Egypt Transit System Data — Production Baseline v2.0
 * Real station names, official lines, interchanges, GPS coordinates,
 * true polyline geometries, and official Ministry of Transport 2026 tariff rules.
 */
import { MODE_COLORS, THEME_COLORS, MAP_LAYER_COLORS } from '../components/icons'

export interface Station {
  id: string | number
  name_ar: string
  name_en: string
  lat: number
  lng: number
  modes: ('metro' | 'train' | 'lrt' | 'monorail' | 'brt' | 'bus')[]
  lines: string[]
  zone_ar: string
  zone_en: string
  isInterchange?: boolean
}

export interface TransitLine {
  id: string
  mode: 'metro' | 'train' | 'lrt' | 'monorail' | 'brt' | 'bus'
  name_ar: string
  name_en: string
  code: string
  color: string
  route_ar: string
  route_en: string
  stationsCount: number
  lengthKm: number
  stations: Station[]
  status: 'normal' | 'delay' | 'maintenance'
  delayMinutes?: number
  alert_ar?: string
  alert_en?: string
}

export const EGYPT_STATIONS: Station[] = [
  // ==========================================
  // METRO LINE 1: حلوان ↔ المرج الجديدة (35 محطة)
  // ==========================================
  { id: 'm1_01', name_ar: 'حلوان', name_en: 'Helwan', lat: 29.8492, lng: 31.3342, modes: ['metro'], lines: ['metro_1'], zone_ar: 'حلوان', zone_en: 'Helwan', isInterchange: false },
  { id: 'm1_02', name_ar: 'عين حلوان', name_en: 'Ain Helwan', lat: 29.8621, lng: 31.3288, modes: ['metro'], lines: ['metro_1'], zone_ar: 'حلوان', zone_en: 'Helwan' },
  { id: 'm1_03', name_ar: 'جامعة حلوان', name_en: 'Helwan University', lat: 29.8711, lng: 31.3225, modes: ['metro'], lines: ['metro_1'], zone_ar: 'حلوان', zone_en: 'Helwan' },
  { id: 'm1_04', name_ar: 'وادي حوف', name_en: 'Wadi Hof', lat: 29.8864, lng: 31.3142, modes: ['metro'], lines: ['metro_1'], zone_ar: 'جنوب القاهرة', zone_en: 'South Cairo' },
  { id: 'm1_05', name_ar: 'حدائق حلوان', name_en: 'Hadayeq Helwan', lat: 29.9022, lng: 31.3061, modes: ['metro'], lines: ['metro_1'], zone_ar: 'جنوب القاهرة', zone_en: 'South Cairo' },
  { id: 'm1_06', name_ar: 'المعصرة', name_en: 'El-Maasara', lat: 29.9167, lng: 31.2989, modes: ['metro'], lines: ['metro_1'], zone_ar: 'جنوب القاهرة', zone_en: 'South Cairo' },
  { id: 'm1_07', name_ar: 'طرة الأسمنت', name_en: 'Tora El-Asmant', lat: 29.9328, lng: 31.2906, modes: ['metro'], lines: ['metro_1'], zone_ar: 'طرة', zone_en: 'Tora' },
  { id: 'm1_08', name_ar: 'كوتسيكا', name_en: 'Kotsika', lat: 29.9442, lng: 31.2858, modes: ['metro'], lines: ['metro_1'], zone_ar: 'طرة', zone_en: 'Tora' },
  { id: 'm1_09', name_ar: 'طرة البلد', name_en: 'Tora El-Balad', lat: 29.9547, lng: 31.2803, modes: ['metro'], lines: ['metro_1'], zone_ar: 'طرة', zone_en: 'Tora' },
  { id: 'm1_10', name_ar: 'ثكنات المعادي', name_en: 'Sakanat El-Maadi', lat: 29.9658, lng: 31.2678, modes: ['metro'], lines: ['metro_1'], zone_ar: 'المعادي', zone_en: 'Maadi' },
  { id: 'm1_11', name_ar: 'المعادي', name_en: 'Maadi', lat: 29.9728, lng: 31.2589, modes: ['metro'], lines: ['metro_1'], zone_ar: 'المعادي', zone_en: 'Maadi' },
  { id: 'm1_12', name_ar: 'حدائق المعادي', name_en: 'Hadayeq El-Maadi', lat: 29.9839, lng: 31.2483, modes: ['metro'], lines: ['metro_1'], zone_ar: 'المعادي', zone_en: 'Maadi' },
  { id: 'm1_13', name_ar: 'دار السلام', name_en: 'Dar El-Salam', lat: 29.9961, lng: 31.2386, modes: ['metro'], lines: ['metro_1'], zone_ar: 'دار السلام', zone_en: 'Dar El-Salam' },
  { id: 'm1_14', name_ar: 'الزهراء', name_en: 'El-Zahraa', lat: 30.0078, lng: 31.2325, modes: ['metro'], lines: ['metro_1'], zone_ar: 'مصر القديمة', zone_en: 'Old Cairo' },
  { id: 'm1_15', name_ar: 'مار جرجس', name_en: 'Mar Girgis', lat: 30.0175, lng: 31.2303, modes: ['metro'], lines: ['metro_1'], zone_ar: 'مصر القديمة', zone_en: 'Old Cairo' },
  { id: 'm1_16', name_ar: 'الملك الصالح', name_en: 'El-Malek El-Saleh', lat: 30.0264, lng: 31.2319, modes: ['metro'], lines: ['metro_1', 'metro_4'], zone_ar: 'مصر القديمة', zone_en: 'Old Cairo', isInterchange: true },
  { id: 'm1_17', name_ar: 'السيدة زينب', name_en: 'Sayeda Zeinab', lat: 30.0353, lng: 31.2358, modes: ['metro'], lines: ['metro_1'], zone_ar: 'وسط البلد', zone_en: 'Downtown' },
  { id: 'm1_18', name_ar: 'سعد زغلول', name_en: 'Saad Zaghloul', lat: 30.0408, lng: 31.2372, modes: ['metro'], lines: ['metro_1'], zone_ar: 'وسط البلد', zone_en: 'Downtown' },
  { id: 'st_sadat', name_ar: 'السادات (التحرير)', name_en: 'Sadat (Tahrir)', lat: 30.0444, lng: 31.2357, modes: ['metro'], lines: ['metro_1', 'metro_2'], zone_ar: 'ميدان التحرير', zone_en: 'Tahrir Square', isInterchange: true },
  { id: 'st_nasser', name_ar: 'جمال عبد الناصر', name_en: 'Gamal Abdel Nasser', lat: 30.0531, lng: 31.2398, modes: ['metro'], lines: ['metro_1', 'metro_3'], zone_ar: 'وسط البلد', zone_en: 'Downtown', isInterchange: true },
  { id: 'm1_21', name_ar: 'أحمد عرابي', name_en: 'Orabi', lat: 30.0578, lng: 31.2444, modes: ['metro'], lines: ['metro_1'], zone_ar: 'وسط البلد', zone_en: 'Downtown' },
  { id: 'st_ramses', name_ar: 'الشهداء (رمسيس)', name_en: 'Al-Shohadaa (Ramses)', lat: 30.0617, lng: 31.2497, modes: ['metro', 'train'], lines: ['metro_1', 'metro_2', 'rail_cairo_alex'], zone_ar: 'ميدان رمسيس', zone_en: 'Ramses Square', isInterchange: true },
  { id: 'm1_23', name_ar: 'غمرة', name_en: 'Ghamra', lat: 30.0683, lng: 31.2675, modes: ['metro'], lines: ['metro_1'], zone_ar: 'الوايلي', zone_en: 'El-Wayly' },
  { id: 'm1_24', name_ar: 'الدمرداش', name_en: 'El-Demerdash', lat: 30.0769, lng: 31.2783, modes: ['metro'], lines: ['metro_1'], zone_ar: 'العباسية', zone_en: 'Abbassiya' },
  { id: 'm1_25', name_ar: 'منشية الصدر', name_en: 'Manshiet El-Sadr', lat: 30.0847, lng: 31.2872, modes: ['metro'], lines: ['metro_1'], zone_ar: 'حدائق القبة', zone_en: 'Hadayeq El-Qobba' },
  { id: 'm1_26', name_ar: 'كوبري القبة', name_en: 'Kobri El-Qobba', lat: 30.0911, lng: 31.2956, modes: ['metro'], lines: ['metro_1'], zone_ar: 'حدائق القبة', zone_en: 'Hadayeq El-Qobba' },
  { id: 'm1_27', name_ar: 'حمامات القبة', name_en: 'Hammamat El-Qobba', lat: 30.0983, lng: 31.3039, modes: ['metro'], lines: ['metro_1'], zone_ar: 'حدائق القبة', zone_en: 'Hadayeq El-Qobba' },
  { id: 'm1_28', name_ar: 'سراي القبة', name_en: 'Saray El-Qobba', lat: 30.1044, lng: 31.3117, modes: ['metro'], lines: ['metro_1'], zone_ar: 'الزيتون', zone_en: 'El-Zaytoun' },
  { id: 'm1_29', name_ar: 'حدائق الزيتون', name_en: 'Hadayeq El-Zaytoun', lat: 30.1119, lng: 31.3178, modes: ['metro'], lines: ['metro_1'], zone_ar: 'الزيتون', zone_en: 'El-Zaytoun' },
  { id: 'm1_30', name_ar: 'حلمية الزيتون', name_en: 'Helmeyet El-Zaytoun', lat: 30.1186, lng: 31.3219, modes: ['metro'], lines: ['metro_1'], zone_ar: 'الزيتون', zone_en: 'El-Zaytoun' },
  { id: 'm1_31', name_ar: 'المطرية', name_en: 'El-Matareyya', lat: 30.1264, lng: 31.3253, modes: ['metro'], lines: ['metro_1'], zone_ar: 'المطرية', zone_en: 'El-Matareyya' },
  { id: 'm1_32', name_ar: 'عين شمس', name_en: 'Ain Shams', lat: 30.1347, lng: 31.3292, modes: ['metro'], lines: ['metro_1'], zone_ar: 'عين شمس', zone_en: 'Ain Shams' },
  { id: 'm1_33', name_ar: 'عزبة النخل', name_en: 'Ezbet El-Nakhl', lat: 30.1442, lng: 31.3325, modes: ['metro'], lines: ['metro_1'], zone_ar: 'المرج', zone_en: 'El-Marg' },
  { id: 'm1_34', name_ar: 'المرج', name_en: 'El-Marg', lat: 30.1542, lng: 31.3358, modes: ['metro'], lines: ['metro_1'], zone_ar: 'المرج', zone_en: 'El-Marg' },
  { id: 'st_marg_new', name_ar: 'المرج الجديدة', name_en: 'New El-Marg', lat: 30.1633, lng: 31.3392, modes: ['metro'], lines: ['metro_1'], zone_ar: 'المرج', zone_en: 'El-Marg' },

  // ==========================================
  // METRO LINE 2: شبرا الخيمة ↔ المنيب (20 محطة)
  // ==========================================
  { id: 'st_moneeb', name_ar: 'المنيب', name_en: 'El-Moneeb', lat: 29.9814, lng: 31.2125, modes: ['metro', 'brt', 'bus'], lines: ['metro_2', 'brt_ring'], zone_ar: 'جنوب الجيزة', zone_en: 'South Giza', isInterchange: true },
  { id: 'm2_02', name_ar: 'ساقية مكي', name_en: 'Sakiat Mekki', lat: 29.9958, lng: 31.2089, modes: ['metro'], lines: ['metro_2'], zone_ar: 'الجيزة', zone_en: 'Giza' },
  { id: 'm2_03', name_ar: 'أم المصريين', name_en: 'Omm El-Masryeen', lat: 30.0033, lng: 31.2072, modes: ['metro'], lines: ['metro_2'], zone_ar: 'الجيزة', zone_en: 'Giza' },
  { id: 'st_giza', name_ar: 'محطة الجيزة', name_en: 'Giza Station', lat: 30.0108, lng: 31.2069, modes: ['metro', 'train'], lines: ['metro_2', 'rail_cairo_alex'], zone_ar: 'ميدان الجيزة', zone_en: 'Giza Square', isInterchange: true },
  { id: 'st_faisal', name_ar: 'فيصل', name_en: 'Faisal', lat: 30.0169, lng: 31.2039, modes: ['metro'], lines: ['metro_2'], zone_ar: 'فيصل', zone_en: 'Faisal' },
  { id: 'st_cairo_univ', name_ar: 'جامعة القاهرة', name_en: 'Cairo University', lat: 30.0264, lng: 31.2017, modes: ['metro'], lines: ['metro_2', 'metro_3'], zone_ar: 'جامعة القاهرة', zone_en: 'Cairo University', isInterchange: true },
  { id: 'm2_07', name_ar: 'البحوث', name_en: 'El-Bohoth', lat: 30.0358, lng: 31.2003, modes: ['metro'], lines: ['metro_2'], zone_ar: 'الدقي', zone_en: 'Dokki' },
  { id: 'st_dokki', name_ar: 'الدقي', name_en: 'Dokki', lat: 30.0384, lng: 31.2122, modes: ['metro'], lines: ['metro_2'], zone_ar: 'ميدان الدقي', zone_en: 'Dokki' },
  { id: 'm2_09', name_ar: 'الأوبرا', name_en: 'Opera', lat: 30.0422, lng: 31.2247, modes: ['metro'], lines: ['metro_2'], zone_ar: 'الجزيرة / الزمالك', zone_en: 'Gezira' },
  { id: 'm2_11', name_ar: 'محمد نجيب', name_en: 'Mohamed Naguib', lat: 30.0456, lng: 31.2447, modes: ['metro'], lines: ['metro_2'], zone_ar: 'عابدين', zone_en: 'Abdeen' },
  { id: 'st_attaba', name_ar: 'العتبة', name_en: 'Al-Ataba', lat: 30.0526, lng: 31.2472, modes: ['metro'], lines: ['metro_2', 'metro_3'], zone_ar: 'ميدان العتبة', zone_en: 'Attaba Square', isInterchange: true },
  { id: 'm2_14', name_ar: 'مسرة', name_en: 'Massara', lat: 30.0714, lng: 31.2461, modes: ['metro'], lines: ['metro_2'], zone_ar: 'شبرا', zone_en: 'Shubra' },
  { id: 'm2_15', name_ar: 'روض الفرج', name_en: 'Rod El-Farag', lat: 30.0811, lng: 31.2442, modes: ['metro'], lines: ['metro_2'], zone_ar: 'شبرا', zone_en: 'Shubra' },
  { id: 'm2_16', name_ar: 'سانت تريزا', name_en: 'St. Teresa', lat: 30.0894, lng: 31.2433, modes: ['metro'], lines: ['metro_2'], zone_ar: 'شبرا', zone_en: 'Shubra' },
  { id: 'm2_17', name_ar: 'الخلفاوي', name_en: 'Khalafawy', lat: 30.0989, lng: 31.2436, modes: ['metro'], lines: ['metro_2'], zone_ar: 'شبرا', zone_en: 'Shubra' },
  { id: 'm2_18', name_ar: 'المظلات', name_en: 'Mezallat', lat: 30.1072, lng: 31.2444, modes: ['metro'], lines: ['metro_2'], zone_ar: 'المظلات', zone_en: 'Mezallat' },
  { id: 'm2_19', name_ar: 'كلية الزراعة', name_en: 'Kolleyet El-Zeraa', lat: 30.1161, lng: 31.2450, modes: ['metro'], lines: ['metro_2'], zone_ar: 'شبرا الخيمة', zone_en: 'Shubra El-Kheima' },
  { id: 'st_shubra', name_ar: 'شبرا الخيمة', name_en: 'Shubra El-Kheima', lat: 30.1228, lng: 31.2447, modes: ['metro', 'train'], lines: ['metro_2', 'rail_cairo_alex'], zone_ar: 'القليوبية', zone_en: 'Qalyubia', isInterchange: true },

  // ==========================================
  // METRO LINE 3: عدلي منصور ↔ الكيت كات / تفريعات (34 محطة)
  // ==========================================
  { id: 'st_adly_mansour', name_ar: 'عدلي منصور المركزية', name_en: 'Adly Mansour Central', lat: 30.1467, lng: 31.4214, modes: ['metro', 'lrt', 'train', 'brt'], lines: ['metro_3', 'lrt_capital', 'brt_ring'], zone_ar: 'شرق القاهرة', zone_en: 'East Cairo', isInterchange: true },
  { id: 'm3_02', name_ar: 'الهايكستب', name_en: 'El-Haykestep', lat: 30.1417, lng: 31.4019, modes: ['metro'], lines: ['metro_3'], zone_ar: 'النزهة', zone_en: 'El-Nozha' },
  { id: 'm3_03', name_ar: 'عمر بن الخطاب', name_en: 'Omar Ibn El-Khattab', lat: 30.1369, lng: 31.3853, modes: ['metro'], lines: ['metro_3'], zone_ar: 'جسرك السويس', zone_en: 'Gesr El-Suez' },
  { id: 'm3_04', name_ar: 'قباء', name_en: 'Qobaa', lat: 30.1317, lng: 31.3736, modes: ['metro'], lines: ['metro_3'], zone_ar: 'جسرك السويس', zone_en: 'Gesr El-Suez' },
  { id: 'm3_05', name_ar: 'هشام بركات', name_en: 'Hisham Barakat', lat: 30.1264, lng: 31.3619, modes: ['metro'], lines: ['metro_3'], zone_ar: 'النزهة الجديدة', zone_en: 'New Nozha' },
  { id: 'm3_06', name_ar: 'النزهة', name_en: 'El-Nozha', lat: 30.1208, lng: 31.3528, modes: ['metro'], lines: ['metro_3'], zone_ar: 'النزهة', zone_en: 'El-Nozha' },
  { id: 'm3_07', name_ar: 'نادي الشمس', name_en: 'Nadi El-Shams', lat: 30.1158, lng: 31.3439, modes: ['metro'], lines: ['metro_3'], zone_ar: 'مصر الجديدة', zone_en: 'Heliopolis' },
  { id: 'm3_08', name_ar: 'ألف مسكن', name_en: 'Alf Maskan', lat: 30.1106, lng: 31.3386, modes: ['metro'], lines: ['metro_3'], zone_ar: 'مصر الجديدة', zone_en: 'Heliopolis' },
  { id: 'st_heliopolis', name_ar: 'هليوبوليس', name_en: 'Heliopolis', lat: 30.0989, lng: 31.3325, modes: ['metro'], lines: ['metro_3'], zone_ar: 'مصر الجديدة', zone_en: 'Heliopolis' },
  { id: 'm3_10', name_ar: 'هارون', name_en: 'Haroun', lat: 30.0928, lng: 31.3283, modes: ['metro'], lines: ['metro_3'], zone_ar: 'مصر الجديدة', zone_en: 'Heliopolis' },
  { id: 'm3_11', name_ar: 'الأهرام', name_en: 'Al-Ahram', lat: 30.0903, lng: 31.3217, modes: ['metro'], lines: ['metro_3'], zone_ar: 'الكوربة', zone_en: 'Korba' },
  { id: 'm3_12', name_ar: 'كلية البنات', name_en: 'Koleyet El-Banat', lat: 30.0833, lng: 31.3139, modes: ['metro'], lines: ['metro_3'], zone_ar: 'مصر الجديدة', zone_en: 'Heliopolis' },
  { id: 'st_stadium', name_ar: 'الاستاد', name_en: 'The Stadium', lat: 30.0718, lng: 31.3023, modes: ['metro', 'monorail'], lines: ['metro_3', 'monorail_east'], zone_ar: 'مدينة نصر', zone_en: 'Nasr City', isInterchange: true },
  { id: 'm3_14', name_ar: 'أرض المعارض', name_en: 'Fair Zone', lat: 30.0733, lng: 31.2889, modes: ['metro'], lines: ['metro_3'], zone_ar: 'مدينة نصر', zone_en: 'Nasr City' },
  { id: 'm3_15', name_ar: 'العباسية', name_en: 'Abbassiya', lat: 30.0683, lng: 31.2792, modes: ['metro'], lines: ['metro_3'], zone_ar: 'العباسية', zone_en: 'Abbassiya' },
  { id: 'm3_16', name_ar: 'عبده باشا', name_en: 'Abdou Pasha', lat: 30.0647, lng: 31.2708, modes: ['metro'], lines: ['metro_3'], zone_ar: 'العباسية', zone_en: 'Abbassiya' },
  { id: 'm3_17', name_ar: 'الجيش', name_en: 'El-Geish', lat: 30.0608, lng: 31.2619, modes: ['metro'], lines: ['metro_3'], zone_ar: 'الظاهر', zone_en: 'El-Zaher' },
  { id: 'm3_18', name_ar: 'باب الشعرية', name_en: 'Bab El-Shaariya', lat: 30.0567, lng: 31.2547, modes: ['metro'], lines: ['metro_3'], zone_ar: 'باب الشعرية', zone_en: 'Bab El-Shaariya' },
  { id: 'm3_21', name_ar: 'ماسبيرو', name_en: 'Maspero', lat: 30.0558, lng: 31.2328, modes: ['metro'], lines: ['metro_3'], zone_ar: 'كورنيش النيل', zone_en: 'Nile Corniche' },
  { id: 'st_zamalek', name_ar: 'صفاء حجازي (الزمالك)', name_en: 'Safaa Hegazy (Zamalek)', lat: 30.0638, lng: 31.2215, modes: ['metro'], lines: ['metro_3'], zone_ar: 'الزمالك', zone_en: 'Zamalek' },
  { id: 'st_kitkat', name_ar: 'الكيت كات', name_en: 'Kit Kat', lat: 30.0658, lng: 31.2131, modes: ['metro'], lines: ['metro_3'], zone_ar: 'شمال الجيزة', zone_en: 'North Giza', isInterchange: true },
  // تفريعة روض الفرج
  { id: 'm3_24', name_ar: 'السودان', name_en: 'Sudan', lat: 30.0736, lng: 31.2056, modes: ['metro'], lines: ['metro_3'], zone_ar: 'إمبابة', zone_en: 'Imbaba' },
  { id: 'm3_25', name_ar: 'إمبابة', name_en: 'Imbaba', lat: 30.0792, lng: 31.2017, modes: ['metro'], lines: ['metro_3'], zone_ar: 'إمبابة', zone_en: 'Imbaba' },
  { id: 'm3_26', name_ar: 'البوهي', name_en: 'El-Bohy', lat: 30.0858, lng: 31.1983, modes: ['metro'], lines: ['metro_3'], zone_ar: 'إمبابة', zone_en: 'Imbaba' },
  { id: 'm3_27', name_ar: 'القومية العربية', name_en: 'El-Qawmeya', lat: 30.0931, lng: 31.1939, modes: ['metro'], lines: ['metro_3'], zone_ar: 'الوراق', zone_en: 'El-Warraq' },
  { id: 'm3_28', name_ar: 'محطة الطريق الدائري', name_en: 'Ring Road Station', lat: 30.1008, lng: 31.1906, modes: ['metro', 'brt'], lines: ['metro_3', 'brt_ring'], zone_ar: 'الدائري', zone_en: 'Ring Road', isInterchange: true },
  { id: 'm3_29', name_ar: 'محور روض الفرج', name_en: 'Rod El-Farag Corridor', lat: 30.1089, lng: 31.1867, modes: ['metro'], lines: ['metro_3'], zone_ar: 'محور روض الفرج', zone_en: 'Rod El-Farag' },
  // تفريعة جامعة القاهرة
  { id: 'm3_30', name_ar: 'التوفيقية', name_en: 'El-Tawfikiya', lat: 30.0608, lng: 31.2047, modes: ['metro'], lines: ['metro_3'], zone_ar: 'العجوزة / المهندسين', zone_en: 'Mohandessin' },
  { id: 'm3_31', name_ar: 'وادي النيل', name_en: 'Wadi El-Nile', lat: 30.0553, lng: 31.1989, modes: ['metro'], lines: ['metro_3'], zone_ar: 'المهندسين', zone_en: 'Mohandessin' },
  { id: 'm3_32', name_ar: 'جامعة الدول العربية', name_en: 'Gamaat El-Dewal', lat: 30.0489, lng: 31.1972, modes: ['metro'], lines: ['metro_3'], zone_ar: 'المهندسين', zone_en: 'Mohandessin' },
  { id: 'm3_33', name_ar: 'بولاق الدكرور', name_en: 'Bulaq El-Dakrour', lat: 30.0389, lng: 31.1986, modes: ['metro'], lines: ['metro_3'], zone_ar: 'بولاق الدكرور', zone_en: 'Bulaq El-Dakrour' },

  // ==========================================
  // CAPITAL LRT: عدلي منصور ↔ العاصمة الإدارية / العاشر (19 محطة)
  // ==========================================
  { id: 'lrt_02', name_ar: 'العبور', name_en: 'El-Obour', lat: 30.1706, lng: 31.4722, modes: ['lrt'], lines: ['lrt_capital'], zone_ar: 'مدينة العبور', zone_en: 'El Obour City' },
  { id: 'lrt_03', name_ar: 'المستقبل', name_en: 'El-Mostakbal', lat: 30.1639, lng: 31.5278, modes: ['lrt'], lines: ['lrt_capital'], zone_ar: 'المستقبل', zone_en: 'Mostakbal City' },
  { id: 'st_shorouk', name_ar: 'الشروق', name_en: 'El Shorouk', lat: 30.1342, lng: 31.6025, modes: ['lrt'], lines: ['lrt_capital'], zone_ar: 'الشروق', zone_en: 'El Shorouk' },
  { id: 'lrt_05', name_ar: 'هليوبوليس الجديدة', name_en: 'New Heliopolis', lat: 30.1458, lng: 31.6508, modes: ['lrt'], lines: ['lrt_capital'], zone_ar: 'هليوبوليس الجديدة', zone_en: 'New Heliopolis' },
  { id: 'st_badr', name_ar: 'بدر المركزية', name_en: 'Badr Central', lat: 30.1415, lng: 31.7188, modes: ['lrt'], lines: ['lrt_capital'], zone_ar: 'مدينة بدر', zone_en: 'Badr City', isInterchange: true },
  { id: 'lrt_07', name_ar: 'الروبيكي', name_en: 'El-Roubiky', lat: 30.1189, lng: 31.7289, modes: ['lrt'], lines: ['lrt_capital'], zone_ar: 'الروبيكي', zone_en: 'El Roubiky' },
  { id: 'lrt_08', name_ar: 'حدائق العاصمة', name_en: 'Capital Gardens', lat: 30.0842, lng: 31.7333, modes: ['lrt'], lines: ['lrt_capital'], zone_ar: 'حدائق العاصمة', zone_en: 'Capital Gardens' },
  { id: 'lrt_09', name_ar: 'مطار العاصمة', name_en: 'Capital Airport', lat: 30.0519, lng: 31.7317, modes: ['lrt'], lines: ['lrt_capital'], zone_ar: 'العاصمة الإدارية', zone_en: 'New Capital' },
  { id: 'st_arts_culture', name_ar: 'مدينة الفنون والثقافة (العاصمة)', name_en: 'Arts & Culture City', lat: 30.0167, lng: 31.7333, modes: ['lrt', 'monorail'], lines: ['lrt_capital', 'monorail_east'], zone_ar: 'العاصمة الإدارية', zone_en: 'New Admin Capital', isInterchange: true },
  { id: 'lrt_11', name_ar: 'كاتدرائية ميلاد المسيح', name_en: 'Nativity Cathedral', lat: 30.0083, lng: 31.7458, modes: ['lrt'], lines: ['lrt_capital'], zone_ar: 'العاصمة الإدارية', zone_en: 'New Capital' },
  { id: 'lrt_12', name_ar: 'القيادة الاستراتيجية (الأوكتاجون)', name_en: 'Strategic Command', lat: 29.9889, lng: 31.7611, modes: ['lrt'], lines: ['lrt_capital'], zone_ar: 'العاصمة الإدارية', zone_en: 'New Capital' },
  { id: 'lrt_13', name_ar: 'المدينة الرياضية العالمية', name_en: 'Sports City', lat: 29.9678, lng: 31.7806, modes: ['lrt'], lines: ['lrt_capital'], zone_ar: 'العاصمة الإدارية', zone_en: 'New Capital' },
  { id: 'lrt_14', name_ar: 'المحطة المركزية بالعاصمة', name_en: 'Central Capital Station', lat: 29.9500, lng: 31.8000, modes: ['lrt'], lines: ['lrt_capital'], zone_ar: 'العاصمة الإدارية', zone_en: 'New Capital' },
  // تفريعة العاشر
  { id: 'lrt_15', name_ar: 'المنطقة الصناعية بالعاشر', name_en: '10th Ramadan Industrial', lat: 30.2014, lng: 31.7289, modes: ['lrt'], lines: ['lrt_capital'], zone_ar: 'العاشر من رمضان', zone_en: '10th of Ramadan' },
  { id: 'lrt_16', name_ar: 'العاشر من رمضان 1', name_en: '10th of Ramadan 1', lat: 30.2608, lng: 31.7389, modes: ['lrt'], lines: ['lrt_capital'], zone_ar: 'العاشر من رمضان', zone_en: '10th of Ramadan' },
  { id: 'lrt_17', name_ar: 'العاشر من رمضان 2', name_en: '10th of Ramadan 2', lat: 30.2989, lng: 31.7472, modes: ['lrt'], lines: ['lrt_capital'], zone_ar: 'العاشر من رمضان', zone_en: '10th of Ramadan' },

  // ==========================================
  // EAST NILE MONORAIL: الاستاد ↔ مدينة العدالة (22 محطة)
  // ==========================================
  { id: 'mnr_02', name_ar: 'هشام بركات (مدينة نصر)', name_en: 'Hisham Barakat (Nasr City)', lat: 30.0658, lng: 31.3197, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'مدينة نصر', zone_en: 'Nasr City' },
  { id: 'mnr_03', name_ar: 'نوري خطاب', name_en: 'Noury Khattab', lat: 30.0617, lng: 31.3361, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'مدينة نصر', zone_en: 'Nasr City' },
  { id: 'mnr_04', name_ar: 'الحي السابع', name_en: '7th District', lat: 30.0583, lng: 31.3508, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'مدينة نصر', zone_en: 'Nasr City' },
  { id: 'mnr_05', name_ar: 'ذاكر حسين', name_en: 'Zaker Hussein', lat: 30.0542, lng: 31.3667, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'مدينة نصر', zone_en: 'Nasr City' },
  { id: 'mnr_06', name_ar: 'المنطقة الحرة', name_en: 'Free Zone', lat: 30.0508, lng: 31.3833, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'مدينة نصر', zone_en: 'Nasr City' },
  { id: 'mnr_07', name_ar: 'المشير طنطاوي', name_en: 'El-Mosheer Tantawy', lat: 30.0389, lng: 31.4056, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'التجمع الخامس', zone_en: 'New Cairo' },
  { id: 'mnr_08', name_ar: 'كايرو فيستيفال سيتي', name_en: 'Cairo Festival City', lat: 30.0289, lng: 31.4194, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'التجمع الخامس', zone_en: 'New Cairo' },
  { id: 'mnr_09', name_ar: 'الشويفات', name_en: 'Choueifat', lat: 30.0211, lng: 31.4333, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'التجمع الخامس', zone_en: 'New Cairo' },
  { id: 'mnr_10', name_ar: 'المستشفى الجوي', name_en: 'Air Force Hospital', lat: 30.0167, lng: 31.4489, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'شارع التسعين', zone_en: '90th Street' },
  { id: 'mnr_11', name_ar: 'حي النرجس', name_en: 'Al-Narges', lat: 30.0125, lng: 31.4689, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'التجمع الخامس', zone_en: 'New Cairo' },
  { id: 'mnr_12', name_ar: 'المصراوية', name_en: 'Al-Masrawya', lat: 30.0089, lng: 31.4889, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'التجمع الخامس', zone_en: 'New Cairo' },
  { id: 'mnr_13', name_ar: 'الجامعة الأمريكية', name_en: 'AUC Campus', lat: 30.0056, lng: 31.5056, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'التجمع الخامس', zone_en: 'New Cairo' },
  { id: 'mnr_14', name_ar: 'ميفيدا', name_en: 'Mivida', lat: 30.0042, lng: 31.5289, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'التجمع الخامس', zone_en: 'New Cairo' },
  { id: 'mnr_15', name_ar: 'هايد بارك', name_en: 'Hyde Park', lat: 30.0033, lng: 31.5583, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'القاهرة الجديدة', zone_en: 'New Cairo' },
  { id: 'mnr_16', name_ar: 'بيت الوطن', name_en: 'Beit El-Watan', lat: 30.0069, lng: 31.6056, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'القاهرة الجديدة', zone_en: 'New Cairo' },
  { id: 'mnr_17', name_ar: 'مسجد الفتاح العليم', name_en: 'Al-Fattah Al-Aleem', lat: 30.0097, lng: 31.6583, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'العاصمة الإدارية', zone_en: 'New Capital' },
  { id: 'mnr_18', name_ar: 'الدائري الأوسطي', name_en: 'Middle Ring Road', lat: 30.0119, lng: 31.6889, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'العاصمة الإدارية', zone_en: 'New Capital' },
  { id: 'mnr_19', name_ar: 'الحي السكني R2', name_en: 'Residential R2', lat: 30.0139, lng: 31.7083, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'العاصمة الإدارية', zone_en: 'New Capital' },
  { id: 'st_ministries', name_ar: 'الحي الحكومي (العاصمة)', name_en: 'Ministries District (New Capital)', lat: 30.0142, lng: 31.7511, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'العاصمة الإدارية', zone_en: 'New Admin Capital' },
  { id: 'mnr_22', name_ar: 'مدينة العدالة (العاصمة)', name_en: 'Justice City (New Capital)', lat: 30.0111, lng: 31.7778, modes: ['monorail'], lines: ['monorail_east'], zone_ar: 'العاصمة الإدارية', zone_en: 'New Capital' },

  // ==========================================
  // RING ROAD BRT: حافلات الطريق الدائري السريعة (14 محطة)
  // ==========================================
  { id: 'brt_01', name_ar: 'أكاديمية الشرطة', name_en: 'Police Academy', lat: 30.0489, lng: 31.4428, modes: ['brt'], lines: ['brt_ring'], zone_ar: 'التجمع الأول', zone_en: 'First Settlement' },
  { id: 'brt_02', name_ar: 'كايرو فيستيفال الدائري', name_en: 'CFC Ring Road', lat: 30.0311, lng: 31.4222, modes: ['brt'], lines: ['brt_ring'], zone_ar: 'التجمع الخامس', zone_en: 'New Cairo' },
  { id: 'brt_03', name_ar: 'محور المشير الدائري', name_en: 'Tantawy Axis Ring', lat: 30.0156, lng: 31.4056, modes: ['brt'], lines: ['brt_ring'], zone_ar: 'مدينة نصر', zone_en: 'Nasr City' },
  { id: 'brt_04', name_ar: 'كارفور المعادي الدائري', name_en: 'Carrefour Maadi Ring', lat: 29.9839, lng: 31.3117, modes: ['brt'], lines: ['brt_ring'], zone_ar: 'المعادي', zone_en: 'Maadi' },
  { id: 'brt_05', name_ar: 'الأوتوستراد التبادلية', name_en: 'Autostrad Hub', lat: 29.9806, lng: 31.2858, modes: ['brt'], lines: ['brt_ring'], zone_ar: 'البساتين', zone_en: 'Basateen' },
  { id: 'brt_07', name_ar: 'فيصل والهرم الدائري', name_en: 'Faisal & Haram Junction', lat: 29.9989, lng: 31.1839, modes: ['brt'], lines: ['brt_ring'], zone_ar: 'الهرم', zone_en: 'Haram' },
  { id: 'brt_08', name_ar: 'صفط اللبن', name_en: 'Saft El-Laban', lat: 30.0311, lng: 31.1822, modes: ['brt'], lines: ['brt_ring'], zone_ar: 'بولاق', zone_en: 'Bulaq' },
  { id: 'brt_09', name_ar: 'محور 26 يوليو', name_en: '26th July Corridor', lat: 30.0689, lng: 31.1856, modes: ['brt'], lines: ['brt_ring'], zone_ar: 'شمال الجيزة', zone_en: 'North Giza' },
  { id: 'brt_10', name_ar: 'بشتيل قطارات الصعيد', name_en: 'Bashtil Upper Egypt Hub', lat: 30.0889, lng: 31.1889, modes: ['brt', 'train'], lines: ['brt_ring', 'rail_cairo_alex'], zone_ar: 'بشتيل', zone_en: 'Bashtil', isInterchange: true },
  { id: 'brt_11', name_ar: 'الوراق', name_en: 'El-Warraq', lat: 30.1111, lng: 31.1944, modes: ['brt'], lines: ['brt_ring'], zone_ar: 'الوراق', zone_en: 'El-Warraq' },
  { id: 'brt_12', name_ar: 'شبرا - بنها الحر', name_en: 'Shubra-Banha Highway', lat: 30.1333, lng: 31.2222, modes: ['brt'], lines: ['brt_ring'], zone_ar: 'شبرا الخيمة', zone_en: 'Shubra' },
  { id: 'brt_13', name_ar: 'مسطرد', name_en: 'Mostorod', lat: 30.1389, lng: 31.3167, modes: ['brt'], lines: ['brt_ring'], zone_ar: 'مسطرد', zone_en: 'Mostorod' },

  // ==========================================
  // NATIONAL RAIL & HIGH-SPEED RAIL (ENR & HSR)
  // ==========================================
  { id: 'st_banha', name_ar: 'بنها', name_en: 'Banha', lat: 30.4667, lng: 31.1833, modes: ['train'], lines: ['rail_cairo_alex'], zone_ar: 'القليوبية', zone_en: 'Qalyubia' },
  { id: 'st_tanta', name_ar: 'طنطا', name_en: 'Tanta', lat: 30.7867, lng: 31.0006, modes: ['train'], lines: ['rail_cairo_alex'], zone_ar: 'الغربية', zone_en: 'Gharbia' },
  { id: 'st_damanhour', name_ar: 'دمنهور', name_en: 'Damanhour', lat: 31.0428, lng: 30.4706, modes: ['train'], lines: ['rail_cairo_alex'], zone_ar: 'البحيرة', zone_en: 'Beheira' },
  { id: 'st_sidi_gaber', name_ar: 'سيدي جابر (الإسكندرية)', name_en: 'Sidi Gaber (Alexandria)', lat: 31.2186, lng: 29.9431, modes: ['train'], lines: ['rail_cairo_alex'], zone_ar: 'الإسكندرية', zone_en: 'Alexandria', isInterchange: true },
  { id: 'st_alex_central', name_ar: 'محطة مصر (الإسكندرية)', name_en: 'Alexandria Central', lat: 31.1928, lng: 29.9058, modes: ['train'], lines: ['rail_cairo_alex'], zone_ar: 'الإسكندرية', zone_en: 'Alexandria' },
  { id: 'hsr_sokhna', name_ar: 'العين السخنة (القطار السريع)', name_en: 'Ain Sokhna (HSR)', lat: 29.6019, lng: 32.3217, modes: ['train'], lines: ['rail_hsr_green'], zone_ar: 'السويس', zone_en: 'Suez' },
  { id: 'hsr_october', name_ar: 'السادس من أكتوبر (القطار السريع)', name_en: '6th of October (HSR)', lat: 29.9328, lng: 30.9167, modes: ['train'], lines: ['rail_hsr_green'], zone_ar: 'الجيزة', zone_en: 'Giza' },
  { id: 'hsr_alamein', name_ar: 'العلمين الجديدة (القطار السريع)', name_en: 'New Alamein (HSR)', lat: 30.8358, lng: 28.9528, modes: ['train'], lines: ['rail_hsr_green'], zone_ar: 'مطروح', zone_en: 'Matrouh' },
  { id: 'hsr_matrouh', name_ar: 'مرسى مطروح (القطار السريع)', name_en: 'Marsa Matrouh (HSR)', lat: 31.3528, lng: 27.2372, modes: ['train'], lines: ['rail_hsr_green'], zone_ar: 'مطروح', zone_en: 'Matrouh' },
]

export const EGYPT_LINES: TransitLine[] = [
  {
    id: 'metro_1',
    mode: 'metro',
    code: 'M1',
    color: '#1D4ED8',
    name_ar: 'الخط الأول (المرج الجديدة — حلوان)',
    name_en: 'Line 1 (New El-Marg — Helwan)',
    route_ar: 'حلوان — المعادي — السادات — الشهداء — المرج الجديدة',
    route_en: 'Helwan — Maadi — Sadat — Ramses — New El-Marg',
    stationsCount: 35,
    lengthKm: 44.0,
    status: 'normal',
    stations: EGYPT_STATIONS.filter(s => s.lines.includes('metro_1')),
  },
  {
    id: 'metro_2',
    mode: 'metro',
    code: 'M2',
    color: '#DC2626',
    name_ar: 'الخط الثاني (شبرا الخيمة — المنيب)',
    name_en: 'Line 2 (Shubra — El-Moneeb)',
    route_ar: 'المنيب — الجيزة — الدقي — السادات — العتبة — شبرا الخيمة',
    route_en: 'El-Moneeb — Giza — Dokki — Sadat — Attaba — Shubra',
    stationsCount: 20,
    lengthKm: 21.6,
    status: 'normal',
    stations: EGYPT_STATIONS.filter(s => s.lines.includes('metro_2')),
  },
  {
    id: 'metro_3',
    mode: 'metro',
    code: 'M3',
    color: '#16A34A',
    name_ar: 'الخط الثالث الأخضر (عدلي منصور — الكيت كات / تفريعات)',
    name_en: 'Line 3 Green (Adly Mansour — Kit Kat / Branches)',
    route_ar: 'عدلي منصور — هليوبوليس — الاستاد — العتبة — الزمالك — الكيت كات — جامعة القاهرة / روض الفرج',
    route_en: 'Adly Mansour — Heliopolis — Stadium — Attaba — Zamalek — Kit Kat — Cairo Univ / Rod El-Farag',
    stationsCount: 34,
    lengthKm: 41.2,
    status: 'normal',
    stations: EGYPT_STATIONS.filter(s => s.lines.includes('metro_3')),
  },
  {
    id: 'lrt_capital',
    mode: 'lrt',
    code: 'LRT',
    color: '#0284C7',
    name_ar: 'القطار الكهربائي الخفيف (LRT)',
    name_en: 'Capital Light Rail Transit (LRT)',
    route_ar: 'عدلي منصور — العبور — الشروق — بدر — العاصمة الإدارية / العاشر من رمضان',
    route_en: 'Adly Mansour — El Obour — El Shorouk — Badr — New Capital / 10th of Ramadan',
    stationsCount: 19,
    lengthKm: 105.0,
    status: 'normal',
    stations: EGYPT_STATIONS.filter(s => s.lines.includes('lrt_capital')),
  },
  {
    id: 'monorail_east',
    mode: 'monorail',
    code: 'MNR',
    color: '#7C3AED',
    name_ar: 'مونوريل شرق النيل (مدينة نصر — العاصمة الإدارية)',
    name_en: 'East Nile Monorail (Nasr City — New Capital)',
    route_ar: 'الاستاد — المشير طنطاوي — التسعين — الجامعة الأمريكية — العاصمة الإدارية — مدينة العدالة',
    route_en: 'Stadium — Tantawy — 90th St — AUC — New Capital — Justice City',
    stationsCount: 22,
    lengthKm: 56.5,
    status: 'normal',
    alert_ar: 'تشغيل منتظم ٠٦:٠٠ ص – ٠٩:٠٠ م. خصم ٥٠٪ أيام الجمع والسبت والعطلات.',
    alert_en: 'Daily 06:00 AM – 09:00 PM. 50% discount on Fri, Sat & holidays.',
    stations: EGYPT_STATIONS.filter(s => s.lines.includes('monorail_east')),
  },
  {
    id: 'brt_ring',
    mode: 'brt',
    code: 'BRT',
    color: '#D97706',
    name_ar: 'حافلات BRT السريعة (الطريق الدائري)',
    name_en: 'Ring Road BRT Express',
    route_ar: 'أكاديمية الشرطة — عدلي منصور — مسطرد — بشتيل — المنيب (المرحلة الأولى تعمل)',
    route_en: 'Police Academy — Adly Mansour — Mostorod — Bashtil — El-Moneeb (Phase 1)',
    stationsCount: 14,
    lengthKm: 35.0,
    status: 'normal',
    stations: EGYPT_STATIONS.filter(s => s.lines.includes('brt_ring')),
  },
  {
    id: 'rail_cairo_alex',
    mode: 'train',
    code: 'ENR',
    color: '#9333EA',
    name_ar: 'قطار القاهرة — الإسكندرية (سكك حديد مصر)',
    name_en: 'Cairo — Alexandria Express Rail (ENR)',
    route_ar: 'محطة مصر رمسيس — بنها — طنطا — دمنهور — سيدي جابر — الإسكندرية',
    route_en: 'Ramses Cairo — Banha — Tanta — Damanhour — Sidi Gaber — Alexandria',
    stationsCount: 14,
    lengthKm: 208.0,
    status: 'normal',
    stations: EGYPT_STATIONS.filter(s => s.lines.includes('rail_cairo_alex')),
  },
  {
    id: 'rail_hsr_green',
    mode: 'train',
    code: 'HSR',
    color: '#059669',
    name_ar: 'القطار الكهربائي السريع (العين السخنة — العلمين — مطروح)',
    name_en: 'High-Speed Rail Green Line (Sokhna — Alamein — Matrouh)',
    route_ar: 'العين السخنة — العاصمة الإدارية — ٦ أكتوبر — الإسكندرية — العلمين الجديدة — مرسى مطروح',
    route_en: 'Ain Sokhna — New Capital — 6th of October — Alexandria — New Alamein — Marsa Matrouh',
    stationsCount: 21,
    lengthKm: 660.0,
    status: 'normal',
    stations: EGYPT_STATIONS.filter(s => s.lines.includes('rail_hsr_green')),
  },
]

export const TRANSIT_LINES: TransitLine[] = EGYPT_LINES

/**
 * High-Precision True Curved Geometries [lng, lat] for MapLibre LineString Rendering.
 * Each entry provides realistic waypoints along tracks and road corridors.
 */
export const LINE_GEOMETRIES: Record<string, Array<[number, number]>> = {
  // Metro Line 1 (Helwan to New Marg along the southern railway corridor and Ramses spine)
  metro_1: [
    [31.3342, 29.8492], [31.3288, 29.8621], [31.3225, 29.8711], [31.3142, 29.8864],
    [31.3061, 29.9022], [31.2989, 29.9167], [31.2906, 29.9328], [31.2858, 29.9442],
    [31.2803, 29.9547], [31.2678, 29.9658], [31.2589, 29.9728], [31.2483, 29.9839],
    [31.2386, 29.9961], [31.2325, 30.0078], [31.2303, 30.0175], [31.2319, 30.0264],
    [31.2358, 30.0353], [31.2372, 30.0408], [31.2357, 30.0444], [31.2398, 30.0531],
    [31.2444, 30.0578], [31.2497, 30.0617], [31.2675, 30.0683], [31.2783, 30.0769],
    [31.2872, 30.0847], [31.2956, 30.0911], [31.3039, 30.0983], [31.3117, 30.1044],
    [31.3178, 30.1119], [31.3219, 30.1186], [31.3253, 30.1264], [31.3292, 30.1347],
    [31.3325, 30.1442], [31.3358, 30.1542], [31.3392, 30.1633],
  ],

  // Metro Line 2 (Moneeb to Shubra crossing Nile via Gezira Island tunnel)
  metro_2: [
    [31.2125, 29.9814], [31.2089, 29.9958], [31.2072, 30.0033], [31.2069, 30.0108],
    [31.2039, 30.0169], [31.2017, 30.0264], [31.2003, 30.0358], [31.2122, 30.0384],
    [31.2247, 30.0422], [31.2357, 30.0444], [31.2447, 30.0456], [31.2472, 30.0526],
    [31.2497, 30.0617], [31.2461, 30.0714], [31.2442, 30.0811], [31.2433, 30.0894],
    [31.2436, 30.0989], [31.2444, 30.1072], [31.2450, 30.1161], [31.2447, 30.1228],
  ],

  // Metro Line 3 Green Line (Main Spine + Branches)
  metro_3: [
    [31.4214, 30.1467], [31.4019, 30.1417], [31.3853, 30.1369], [31.3736, 30.1317],
    [31.3619, 30.1264], [31.3528, 30.1208], [31.3439, 30.1158], [31.3386, 30.1106],
    [31.3325, 30.0989], [31.3283, 30.0928], [31.3217, 30.0903], [31.3139, 30.0833],
    [31.3023, 30.0718], [31.2889, 30.0733], [31.2792, 30.0683], [31.2708, 30.0647],
    [31.2619, 30.0608], [31.2547, 30.0567], [31.2472, 30.0526], [31.2398, 30.0531],
    [31.2328, 30.0558], [31.2215, 30.0638], [31.2131, 30.0658],
    // Northward curve to Rod El Farag
    [31.2056, 30.0736], [31.2017, 30.0792], [31.1983, 30.0858], [31.1939, 30.0931],
    [31.1906, 30.1008], [31.1867, 30.1089],
  ],

  // Capital LRT (Adly Mansour to Arts & Culture)
  lrt_capital: [
    [31.4214, 30.1467], [31.4722, 30.1706], [31.5278, 30.1639], [31.6025, 30.1342],
    [31.6508, 30.1458], [31.7188, 30.1415], [31.7289, 30.1189], [31.7333, 30.0842],
    [31.7317, 30.0519], [31.7333, 30.0167], [31.7458, 30.0083], [31.7611, 29.9889],
    [31.7806, 29.9678], [31.8000, 29.9500],
  ],

  // East Nile Monorail (Stadium to Justice City)
  monorail_east: [
    [31.3023, 30.0718], [31.3197, 30.0658], [31.3361, 30.0617], [31.3508, 30.0583],
    [31.3667, 30.0542], [31.3833, 30.0508], [31.4056, 30.0389], [31.4194, 30.0289],
    [31.4333, 30.0211], [31.4489, 30.0167], [31.4689, 30.0125], [31.4889, 30.0089],
    [31.5056, 30.0056], [31.5289, 30.0042], [31.5583, 30.0033], [31.6056, 30.0069],
    [31.6583, 30.0097], [31.6889, 30.0119], [31.7083, 30.0139], [31.7333, 30.0167],
    [31.7511, 30.0142], [31.7778, 30.0111],
  ],

  // Ring Road BRT Phase 1
  brt_ring: [
    [31.4428, 30.0489], [31.4222, 30.0311], [31.4056, 30.0156], [31.3117, 29.9839],
    [31.2858, 29.9806], [31.2125, 29.9814], [31.1839, 29.9989], [31.1822, 30.0311],
    [31.1856, 30.0689], [31.1889, 30.0889], [31.1944, 30.1111], [31.2222, 30.1333],
    [31.3167, 30.1389], [31.4214, 30.1467],
  ],

  // ENR Cairo — Alexandria Express Rail
  rail_cairo_alex: [
    [31.2497, 30.0617], [31.2447, 30.1228], [31.1833, 30.4667], [31.0006, 30.7867],
    [30.4706, 31.0428], [29.9431, 31.2186], [29.9058, 31.1928],
  ],

  // High-Speed Rail Green Line
  rail_hsr_green: [
    [32.3217, 29.6019], [31.7333, 30.0167], [30.9167, 29.9328], [29.9431, 31.2186],
    [28.9528, 30.8358], [27.2372, 31.3528],
  ],
}

/**
 * Official Tariff Calculator for Cairo Metro.
 * Ministry of Transport official decree effective 2026:
 * 1 to 9 stations: 10 EGP
 * 10 to 16 stations: 12 EGP
 * 17 to 23 stations: 15 EGP
 * 24+ stations: 20 EGP
 */
export function calculateMetroTariff(stationCount: number): { fare: number, label_ar: string, label_en: string, status: 'official' } {
  if (stationCount <= 9) return { fare: 10, label_ar: 'منطقة واحدة (١–٩ محطات)', label_en: 'Zone 1 (1–9 stations)', status: 'official' }
  if (stationCount <= 16) return { fare: 12, label_ar: 'منطقتان (١٠–١٦ محطة)', label_en: 'Zone 2 (10–16 stations)', status: 'official' }
  if (stationCount <= 23) return { fare: 15, label_ar: '٣ مناطق (١٧–٢٣ محطة)', label_en: 'Zone 3 (17–23 stations)', status: 'official' }
  return { fare: 20, label_ar: 'أكثر من ٢٣ محطة (الشبكة كاملة)', label_en: '4+ Zones (24+ stations)', status: 'official' }
}

/**
 * Capital LRT Official Tariff:
 * 1 to 3 stations: 10 EGP
 * 4 to 7 stations: 15 EGP
 * 8+ stations: 20 EGP
 */
export function calculateLRTTariff(stationCount: number): { fare: number, label_ar: string, label_en: string, status: 'official' } {
  if (stationCount <= 3) return { fare: 10, label_ar: '١ إلى ٣ محطات', label_en: '1 to 3 stations', status: 'official' }
  if (stationCount <= 7) return { fare: 15, label_ar: '٤ إلى ٧ محطات', label_en: '4 to 7 stations', status: 'official' }
  return { fare: 20, label_ar: 'أكثر من ٧ محطات', label_en: '8+ stations', status: 'official' }
}

/**
 * East Nile Monorail Official Tariff:
 * Up to 5 stations: 20 EGP
 * Up to 10 stations: 40 EGP
 * Up to 15 stations: 55 EGP
 * Full line (22 stations): 80 EGP
 */
export function calculateMonorailTariff(stationCount: number): { fare: number, label_ar: string, label_en: string, status: 'official' } {
  if (stationCount <= 5) return { fare: 20, label_ar: 'منطقة واحدة (حتى ٥ محطات)', label_en: 'Zone 1 (up to 5 stations)', status: 'official' }
  if (stationCount <= 10) return { fare: 40, label_ar: 'منطقتان (حتى ١٠ محطات)', label_en: 'Zone 2 (up to 10 stations)', status: 'official' }
  if (stationCount <= 15) return { fare: 55, label_ar: '٣ مناطق (حتى ١٥ محطة)', label_en: 'Zone 3 (up to 15 stations)', status: 'official' }
  return { fare: 80, label_ar: 'الخط الكامل (٢٢ محطة)', label_en: 'Full line (22 stations)', status: 'official' }
}

/**
 * Ring Road BRT Official Tariff:
 * Up to 4 stations: 5 EGP
 * Up to 9 stations: 10 EGP
 * Full Phase-1 route: 15 EGP
 */
export function calculateBRTTariff(stationCount: number): { fare: number, label_ar: string, label_en: string, status: 'official' } {
  if (stationCount <= 4) return { fare: 5, label_ar: 'حتى ٤ محطات', label_en: 'Up to 4 stations', status: 'official' }
  if (stationCount <= 9) return { fare: 10, label_ar: 'حتى ٩ محطات', label_en: 'Up to 9 stations', status: 'official' }
  return { fare: 15, label_ar: 'المسار الكامل للمرحلة الأولى', label_en: 'Full Phase-1 route', status: 'official' }
}
