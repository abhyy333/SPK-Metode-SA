import { Lecturer, Student, DayOfWeek, TimePreference } from '../types';

export interface RawStudent {
  no: number;
  nim: string;
  name: string;
}

export interface RawLecturer {
  no: number;
  code: string;
  name: string;
  nip?: string;
  expertise?: string;
}

export const RAW_STUDENTS: RawStudent[] = [
  { no: 1, nim: 'F1B018009', name: 'ARI SATRIA' },
  { no: 2, nim: 'F1B019068', name: 'I NYOMAN DIMAS BAYU SEMARA PUTRA' },
  { no: 3, nim: 'F1B019098', name: 'Muhammad Novrizal' },
  { no: 4, nim: 'F1B020118', name: 'Rahmat Ardinan Aziz' },
  { no: 5, nim: 'F1B021030', name: 'Angga Pratama Hadinata' },
  { no: 6, nim: 'F1B021039', name: 'ERLANI' },
  { no: 7, nim: 'F1B021054', name: 'Iswa Eldiranata' },
  { no: 8, nim: 'F1B021073', name: 'MUHAMMAD ARYA HERMAYANTO SAPUTRA' },
  { no: 9, nim: 'F1B021076', name: 'MUHAMMAD FAUZAN AL-FARISI ZA' },
  { no: 10, nim: 'F1B021078', name: 'MUHAMMAD ISRON AL FARIZI' },
  { no: 11, nim: 'F1B021105', name: 'ALDI ANASRULLAH' },
  { no: 12, nim: 'F1B021125', name: 'Lalu Lazuardi Pandu Paranata' },
  { no: 13, nim: 'F1B021128', name: 'M. Rafif Akhdan' },
  { no: 14, nim: 'F1B021152', name: 'WAHYU DINATA' },
  { no: 15, nim: 'F1B021153', name: 'WANDY FEBRIANSYAH' },
  { no: 16, nim: 'F1B022030', name: 'AFIF FACHROZY' },
  { no: 17, nim: 'F1B022049', name: 'FAUZAN ZULFIKAR' },
  { no: 18, nim: 'F1B022076', name: 'MUH. SALSABILA FAHLEFI' },
  { no: 19, nim: 'F1B022081', name: 'MUHAMMAD MAULA' },
  { no: 20, nim: 'F1B02310001', name: 'ALI IMRON' },
  { no: 21, nim: 'F1B02310002', name: 'AMMAR FAISHAL NURJAMIL' },
  { no: 22, nim: 'F1B02310003', name: 'ANISA HUSNA' },
  { no: 23, nim: 'F1B02310004', name: 'ARGA SALINDRI THESSA PANGESTI' },
  { no: 24, nim: 'F1B02310005', name: 'DEWA KOMANG WIRA ADNYANA' },
  { no: 25, nim: 'F1B02310006', name: 'ELI ERYANI' },
  { no: 26, nim: 'F1B02310007', name: 'FAHRIZAL ALI MUKTI' },
  { no: 27, nim: 'F1B02310008', name: 'GITA JUNIARTI' },
  { no: 28, nim: 'F1B02310010', name: 'I WAYAN SUDIARTA' },
  { no: 29, nim: 'F1B02310012', name: 'ILHAM RIDWANDI' },
  { no: 30, nim: 'F1B02310013', name: 'KUKUH TEGAR DEWANTO' },
  { no: 31, nim: 'F1B02310014', name: 'MUCHAMMAD TOHA FIKI ALIAKBAR' },
  { no: 32, nim: 'F1B02310015', name: 'MUHAMMAD YAZID ZIDAN' },
  { no: 33, nim: 'F1B02310016', name: 'NI PUTU DEVIANI NARESWARI' },
  { no: 34, nim: 'F1B02310019', name: 'PRADITIA MAHARSAH' },
  { no: 35, nim: 'F1B02310020', name: 'QOLBUN SALAM' },
  { no: 36, nim: 'F1B02310021', name: 'RAMDHANI' },
  { no: 37, nim: 'F1B02310022', name: 'RENALDI' },
  { no: 38, nim: 'F1B02310023', name: 'REZA ADITIA' },
  { no: 39, nim: 'F1B02310024', name: 'RIFKI AMANDA PUTRA' },
  { no: 40, nim: 'F1B02310025', name: 'RIZKY SURYADINATA' },
  { no: 41, nim: 'F1B02310026', name: 'ROIHAN HIDAYAT' },
  { no: 42, nim: 'F1B02310027', name: 'TRI GUNADI' },
  { no: 43, nim: 'F1B02310028', name: 'TRIYAS ANDRINI' },
  { no: 44, nim: 'F1B02310029', name: 'WINDI WIJAYA' },
  { no: 45, nim: 'F1B02310031', name: 'ADRIAN KELVIN RAMADHAN' },
  { no: 46, nim: 'F1B02310032', name: 'AHMAD FIRDI HARDIAN' },
  { no: 47, nim: 'F1B02310033', name: 'AHMAD RAKHE' },
  { no: 48, nim: 'F1B118002', name: 'DANI ANWAR MUSADDAT' },
  { no: 49, nim: 'F1B02310034', name: 'AHMAD RIDWAN' },
  { no: 50, nim: 'F1B02310036', name: 'ANDRI SAHRUL GUNAWAN PUTRA' },
  { no: 51, nim: 'F1B02310037', name: 'ARBIATUN' },
  { no: 52, nim: 'F1B02310038', name: 'ARIEL APRIANSYAH' },
  { no: 53, nim: 'F1B02310039', name: 'ARIF RAHMAN' },
  { no: 54, nim: 'F1B02310040', name: 'ARYA RAMADI NOVA PRATAMA' },
  { no: 55, nim: 'F1B02310041', name: 'ATIQAH ELVINA' },
  { no: 56, nim: 'F1B02310042', name: 'AULIATUN REHANUN' },
  { no: 57, nim: 'F1B02310043', name: 'AURA SALSABILA HAYATINA' },
  { no: 58, nim: 'F1B02310045', name: 'CAHAYA MAHARANI' },
  { no: 59, nim: 'F1B02310046', name: 'CARLIN PRAMUDITYA IRAWAN' },
  { no: 60, nim: 'F1B02310048', name: 'CHELSEA SYASQIA DARMAWAN' },
  { no: 61, nim: 'F1B02310049', name: 'DAFFA IRFANSYAH EVRANO' },
  { no: 62, nim: 'F1B02310050', name: 'DEWA RAM SATYAWIBAWAN' },
  { no: 63, nim: 'F1B02310051', name: 'DIDAN ARYA GIRINDRA MAULANA' },
  { no: 64, nim: 'F1B02310052', name: 'DIMAS AGRI SANTOSO' },
  { no: 65, nim: 'F1B02310053', name: 'EHZA JUMIATI' },
  { no: 66, nim: 'F1B02310054', name: 'GEDE YUDHA WINDHU PRADANA' },
  { no: 67, nim: 'F1B02310055', name: 'GUARNEAN BINTANG AULIA' },
  { no: 68, nim: 'F1B02310056', name: 'HAIDAR HAMDI' },
  { no: 69, nim: 'F1B02310057', name: 'HARRY FEBRIAN' },
  { no: 70, nim: 'F1B02310058', name: 'HURNIAWAN CANDRA PRATAMA' },
  { no: 71, nim: 'F1B02310059', name: 'HUSNUL HADIATMAN' },
  { no: 72, nim: 'F1B118023', name: 'JEFRI HAWARI' },
  { no: 73, nim: 'F1B02310060', name: 'I KOMANG HANDIKA PUTRA WIPARSA' },
  { no: 74, nim: 'F1B02310061', name: 'IMAN DWI RIZKI' },
  { no: 75, nim: 'F1B02310062', name: 'INTAN RIZKIANI' },
  { no: 76, nim: 'F1B02310063', name: 'KHAERUL UMAR' },
  { no: 77, nim: 'F1B02310064', name: 'KRISNA WAHYU ILAHI' },
  { no: 78, nim: 'F1B02310065', name: 'LALU BAYU SUKMA AJI' },
  { no: 79, nim: 'F1B02310066', name: 'LALU RAFLI HAIDAR RAHMAN' },
  { no: 80, nim: 'F1B02310067', name: 'LALU SAMI ALIF ABIDTULLAH' },
  { no: 81, nim: 'F1B02310069', name: 'LALU YUDI DARMAWAN' },
  { no: 82, nim: 'F1B02310070', name: 'LALU ZAVA YUANDITRA' },
  { no: 83, nim: 'F1B02310071', name: 'LEGA VITA AYU PUTRI KURNIAWATI' },
  { no: 84, nim: 'F1B02310072', name: 'LIDIYA FITRIANI' },
  { no: 85, nim: 'F1B02310073', name: 'M. B. HABIBIE' },
  { no: 86, nim: 'F1B02310074', name: 'MADE ALEXIO AGASTYA RAY' },
  { no: 87, nim: 'F1B02310075', name: 'MIZAN ARYA SAPUTRA' },
  { no: 88, nim: 'F1B02310076', name: 'MOHAMAD RIZKI PRATAMA' },
  { no: 89, nim: 'F1B02310077', name: 'MUHAMMAD AMIN HANDANI' },
  { no: 90, nim: 'F1B02310078', name: 'MUHAMMAD BAHTIAR FIRMANSYAH' },
  { no: 91, nim: 'F1B02310080', name: 'MUHAMMAD IRWAN EFENDI' },
  { no: 92, nim: 'F1B02310081', name: 'MUHAMMAD ISHAL HANIF' },
  { no: 93, nim: 'F1B02310082', name: 'MUHAMMAD NURULY AL ANWAR SALAM' },
  { no: 94, nim: 'F1B02310083', name: 'MUHAMMAD ROFIF ALFIAN' },
  { no: 95, nim: 'F1B02310084', name: 'NAUFAL FARWA KHANIF' },
  { no: 96, nim: 'F1B118035', name: 'MUHAMMAD FEBRIAN ULMAYADI PRATAMA' },
  { no: 97, nim: 'F1B02310085', name: 'NI KADEK MEINANDRA PUTRI' },
  { no: 98, nim: 'F1B02310086', name: 'PRABOWO' },
  { no: 99, nim: 'F1B02310087', name: 'RIEFQI ABDULLAH' },
  { no: 100, nim: 'F1B02310088', name: 'SEPTIAN ALFARIZI' },
  { no: 101, nim: 'F1B02310089', name: 'SERIN SAHIDIA RAMADANI' },
  { no: 102, nim: 'F1B02310090', name: 'SITI RAHMANIAH AGUSTINA' },
  { no: 103, nim: 'F1B02310092', name: 'UANG AINI' },
  { no: 104, nim: 'F1B02310093', name: 'WARID FERDIANSYAH BADRI' },
  { no: 105, nim: 'F1B02310094', name: 'ZIDAN M.JIBRAN HAFIDZI' },
  { no: 106, nim: 'F1B02310095', name: 'ZIRKAL WIRAGUNA' },
  { no: 107, nim: 'F1B02310096', name: 'ABDUL HABIR AL MAJDI' },
  { no: 108, nim: 'F1B02310097', name: 'ADHEL EKA RAMDHANI' },
  { no: 109, nim: 'F1B02310098', name: 'AHMAD DANI SARKAWI' },
  { no: 110, nim: 'F1B02310099', name: 'AHMAD FAIZ HIFZILLAH' },
  { no: 111, nim: 'F1B02310100', name: 'AHMAD ZULFIKAR' },
  { no: 112, nim: 'F1B02310101', name: 'AKHMAD RIDHO TRAVELTA' },
  { no: 113, nim: 'F1B02310102', name: 'ALGI PARI RAMDONI' },
  { no: 114, nim: 'F1B02310103', name: 'AMIN NOFRIL' },
  { no: 115, nim: 'F1B02310104', name: 'ARIADI' },
  { no: 116, nim: 'F1B02310105', name: 'AZMI ZIDANIL NAUFAL' },
  { no: 117, nim: 'F1B02310106', name: 'BAIQ MARLINDA KARUNIA DWI ANANTA' },
  { no: 118, nim: 'F1B02310107', name: 'DIMAS WICAKSONO' },
  { no: 119, nim: 'F1B02310108', name: 'FAUZI THORIQ MAULANA' },
  { no: 120, nim: 'F1B02310109', name: 'FAUZIAH LATIFAH' },
  { no: 121, nim: 'F1B02310111', name: 'FIKAR ALIFPATIO LAGALIGO PARIS' },
  { no: 122, nim: 'F1B02310112', name: 'GINANG ABDANI RAMDHAN' },
  { no: 123, nim: 'F1B02310113', name: 'HAMIYANDA HILMAN' },
  { no: 124, nim: 'F1B02310114', name: 'HENDRA OKTOBIAN AN FASA' },
  { no: 125, nim: 'F1B02310115', name: 'I KADEK ADI SETIAWAN' },
  { no: 126, nim: 'F1B02310116', name: 'I WAYAN PUTRA SANTANA' },
  { no: 127, nim: 'F1B02310117', name: 'IDA BAGUS KRISHNA WILDIARTHA' },
  { no: 128, nim: 'F1B02310118', name: 'ISRO HARDIANSAH' },
  { no: 129, nim: 'F1B02310119', name: 'JOE TARA APRILLIANDY' },
  { no: 130, nim: 'F1B02310120', name: 'LALU SULTAN RIFQI ADRIAN SAKTI' },
  { no: 131, nim: 'F1B02310121', name: 'M. RIYADISSOLIHIN PAJRI' },
  { no: 132, nim: 'F1B02310122', name: 'MADE OCTA EDUARSA' },
  { no: 133, nim: 'F1B02310123', name: 'MUH. ABDURROZAK' },
  { no: 134, nim: 'F1B02310124', name: 'MUHAMMAD ABIMAYU TANTOWI' },
  { no: 135, nim: 'F1B02310125', name: 'MUHAMMAD ALDI' },
  { no: 136, nim: 'F1B02310126', name: 'MUHAMMAD AMRI AL JABBAR' },
  { no: 137, nim: 'F1B02310127', name: 'MUHAMMAD ASKAR REFANZA' },
  { no: 138, nim: 'F1B02310128', name: 'MUHAMMAD DANU' },
  { no: 139, nim: 'F1B02310129', name: 'MUHAMMAD FAIZAL' },
  { no: 140, nim: 'F1B02310130', name: 'MUHAMMAD FARRAS EL FAYYEDH HAKIM' },
  { no: 141, nim: 'F1B02310131', name: 'MUHAMMAD FEBRI SYATRIA UTAMA' },
  { no: 142, nim: 'F1B02310132', name: 'MUHAMMAD KELVIN AULIA EKA PUTRA' },
  { no: 143, nim: 'F1B02310133', name: 'MUHAMMAD RIZKY RAMADHANI SIREGAR' },
  { no: 144, nim: 'F1B02310134', name: 'MUHAMMAD SOFIAN AZHARI' },
  { no: 145, nim: 'F1B02310135', name: 'MUHAMMAD SYIRAJUDDIN' },
  { no: 146, nim: 'F1B02310136', name: 'MUHAMMAD ZIDAN FIRDAUS' },
  { no: 147, nim: 'F1B02310137', name: 'MUHAMMAD ZOLA FEBRIAN SAURI' },
  { no: 148, nim: 'F1B02310138', name: 'NABIEL ZAHIDDIN' },
  { no: 149, nim: 'F1B02310139', name: 'RAHMAD HIDAYAT' },
  { no: 150, nim: 'F1B02310140', name: 'ROLAN JUNIARLI' },
  { no: 151, nim: 'F1B02310141', name: 'RYAN RIZKY DHARMA NUSA' },
  { no: 152, nim: 'F1B02310142', name: 'SAHRUL ILHAM' },
  { no: 153, nim: 'F1B02310143', name: 'SHOFWAN MUSHODDAG' },
  { no: 154, nim: 'F1B02310144', name: 'SYAHRIL MUBARAK' },
  { no: 155, nim: 'F1B02310145', name: 'TAUFIK AKBAR' },
  { no: 156, nim: 'F1B02310146', name: 'WAHYU IMAM JIBRAN' },
  { no: 157, nim: 'F1B02310148', name: 'ZAKIA RIZKA HARMINA' },
  { no: 158, nim: 'F1B02310149', name: 'ZIAD PARAWANSA' },
  { no: 159, nim: 'F1B02310150', name: 'EVA LESTARI' },
  { no: 160, nim: 'F1B02310151', name: 'FATMAWATI' },
  { no: 161, nim: 'F1B02310152', name: 'JAGAD FATHAWARI' },
  { no: 162, nim: 'F1B02310153', name: 'LALU WIRA BAKTI' },
  { no: 163, nim: 'F1B02310154', name: 'M FAIZAL BUJANA' },
  { no: 164, nim: 'F1B02310156', name: 'RANDI SETYADI' },
  { no: 165, nim: 'F1B02310157', name: 'MUHAJIR RAIHURRIJAL' },
];

export const RAW_LECTURERS: RawLecturer[] = [
  { no: 1, code: 'SNR', name: 'Ir. Ni Made Seniari, ST., MT.', nip: '197005121997022001', expertise: 'Sistem Tenaga Listrik & Transmisi' },
  { no: 2, code: 'SPY', name: 'Supriyatna, ST., MT.', nip: '197208151999031002', expertise: 'Sistem Kendali & Otomasi' },
  { no: 3, code: 'WIR', name: 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.', nip: '196803201994121001', expertise: 'Teknik Tenaga Listrik & Konversi Energi' },
  { no: 4, code: 'SYA', name: 'Syafarudin Ch, ST., MT.', nip: '197110051998021001', expertise: 'Sistem Digital & Mikroprosesor' },
  { no: 5, code: 'SUL', name: 'Sultan, ST., MT.', nip: '197304122000031001', expertise: 'Rangkaian Listrik & Mesin Listrik' },
  { no: 6, code: 'SAS', name: 'Sudi M. Al Sasongko, ST., MT.', nip: '196907181995121002', expertise: 'Medan Elektromagnetik & Saluran Transmisi' },
  { no: 7, code: 'MIS', name: 'Prof. Dr. Ir. Misbahuddin, ST., MT. IPU', nip: '196509141991031003', expertise: 'Jaringan Komputer & Telekomunikasi' },
  { no: 8, code: 'NW', name: 'I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.', nip: '197602282002121002', expertise: 'Elektronika Daya & Kendali Motor' },
  { no: 9, code: 'SCAH', name: 'Cahyo Mustiko O. M., ST., MSc., Ph.D.', nip: '197811102005011003', expertise: 'Antena & Perambatan Gelombang' },
  { no: 10, code: 'SRI', name: 'Dr. Ida Ayu Sri Adnyani, ST., M.Erg.', nip: '197406252001122001', expertise: 'Ergonomi & Sistem Kendali' },
  { no: 11, code: 'IFC', name: 'Ida Bagus Fery Citarsa, ST., MT.', nip: '198105032006041002', expertise: 'Mikroelektronika & Sistem Tertanam' },
  { no: 12, code: 'AB', name: 'Ir. Agung Budi Muljono, ST., MT., IPU', nip: '196708221993031002', expertise: 'Sistem Proteksi Tenaga Listrik' },
  { no: 13, code: 'MAB', name: 'Abdul Natsir, ST., MT.', nip: '197503142003121001', expertise: 'Elektronika Terapan & Pengukuran' },
  { no: 14, code: 'NABZ', name: 'Abdullah Zainuddin, ST., MT.', nip: '197709192005011002', expertise: 'Fisika Listrik & Material Teknik' },
  { no: 15, code: 'ROS', name: 'Dr. Ir. Rosmaliati, ST., MT.', nip: '197012011997032001', expertise: 'Teknik Tenaga Listrik & Analisis Rangkaian' },
  { no: 16, code: 'ASR', name: 'A. Sjamsjiar Rachman, ST., MT.', nip: '196604151992031002', expertise: 'Sistem Telekomunikasi & Jaringan' },
  { no: 17, code: 'MSI', name: 'Muhamad Syamsu Iqbal, ST., MT., Ph.D.', nip: '197908122006041001', expertise: 'Pemrosesan Sinyal & Telekomunikasi' },
  { no: 18, code: 'MS', name: 'Made Sutha Yadnya, ST., MT.', nip: '197411202002121003', expertise: 'Sistem Kendali Cerdas & Robotika' },
  { no: 19, code: 'YUKI', name: 'Bulkis Kanata, ST., MT.', nip: '197805162005012002', expertise: 'Sistem Digital & Arsitektur Komputer' },
  { no: 20, code: 'ZUT', name: 'Dr. rer. nat. Teti Zubaidah, ST., MT.', nip: '197203181998022001', expertise: 'Geomagnetisme & Medan Elektromagnetik' },
  { no: 21, code: 'IKP', name: 'I Ketut Perdana Putra, ST., MT.', nip: '198307042008121003', expertise: 'Elektronika Dasar & Instrumentasi' },
  { no: 22, code: 'ARI', name: 'Ir. I Made Ari Nrartha, ST., MT.', nip: '196901151995121001', expertise: 'Operasi Sistem Tenaga & Keandalan' },
  { no: 23, code: 'GIN', name: 'Dr. Ir. I Made Ginarsa, ST., MT., IPU', nip: '196805101994031004', expertise: 'Stabilitas Sistem Tenaga & Energi Terbarukan' },
  { no: 24, code: 'PAN', name: 'Paniran, ST., MT.', nip: '197608292003121002', expertise: 'Rangkaian Listrik & Instalasi Listrik' },
  { no: 25, code: 'RIO', name: 'Supriono, ST., MT.', nip: '198004122008011011', expertise: 'Keamanan Siber & Jaringan Nirkabel' },
  { no: 26, code: 'SBR', name: 'Sabar Nababan, ST., MT.', nip: '197803152006041004', expertise: 'Telekomunikasi Bergerak & Propagasi' },
  { no: 27, code: 'DFB', name: 'Djul Fikry Budiman, ST., MT.', nip: '198209212009121003', expertise: 'Jaringan Komputer & IoT' },
  { no: 28, code: 'IRF', name: 'Lalu A. Syamsul Irfan Akbar, ST., M.Eng.', nip: '198402142010121004', expertise: 'Kecerdasan Buatan & Pemelajaran Mesin' },
  { no: 29, code: 'GW', name: 'Giri Wahyu Wiriastro, ST., MT.', nip: '198007202008121002', expertise: 'Sistem Instrumentasi & Otomasi Industri' },
  { no: 30, code: 'AMI', name: 'Suthami Ariessaputra, ST., M. Eng', nip: '198604182014041001', expertise: 'Pengolahan Sinyal Digital' },
  { no: 31, code: 'BD', name: 'Budi Darmawan, ST., M.Eng', nip: '198511222012121002', expertise: 'Sistem Komputasi & Jaringan' },
  { no: 32, code: 'NCRD', name: 'Cipta Ramadhani, ST., M.Eng', nip: '198701052015041003', expertise: 'Arsitektur Jaringan & Komputasi Awan' },
  { no: 33, code: 'MR', name: 'M. Rivaldi Harjian, ST., MT.', nip: '199003122019031012', expertise: 'Elektronika & Sistem Kendali' },
  { no: 34, code: 'HHST', name: 'Prof. Hendri Sake Tira, ST, MT, PhD', nip: '197108191997021001', expertise: 'Termodinamika & Konversi Energi' },
  { no: 35, code: 'HW', name: 'Heri Wijayanto, ST, MSC, PhD', nip: '197906102005011004', expertise: 'Pengolahan Citra & Visi Komputer' },
  { no: 36, code: 'IWW', name: 'Wirarama Wedhaswara, ST, MT, PhD', nip: '198205152008121001', expertise: 'Rekayasa Perangkat Lunak & Sistem Terdistribusi' },
  { no: 37, code: 'KAS', name: 'Dr. Kasnawi Al Hadi, S.Pd, M.Si.', nip: '197302142000121001', expertise: 'Matematika Teknik & Analisis Numerik' },
  { no: 38, code: 'MAR', name: 'Dr. Drs. Marzuki, M.Si.', nip: '196501101991031002', expertise: 'Matematika & Kalkulus' },
  { no: 39, code: 'GNY', name: 'I Gusti Ngurah Yudi Handayana, Ph.D.', nip: '198109152006041002', expertise: 'Fisika Komputasi & Nanoteknologi' },
  { no: 40, code: 'NQM', name: 'Dr.Nurul Qomariyah, S.Si, M.Si.', nip: '198212102008122002', expertise: 'Statistika Terapan & Probabilitas' },
  { no: 41, code: 'SAL', name: 'Siti Alaa’ , M.Si', nip: '198504032010122003', expertise: 'Kimia Terapan & Material' },
  { no: 42, code: 'IWS', name: 'I Wayan Sudiarta, Ph.D.', nip: '197506182001121002', expertise: 'Fisika Modern & Sensor Optik' },
  { no: 43, code: 'HUM', name: 'Humamurrizqi S.Ag, M.Ag', nip: '198001012008011015', expertise: 'Pendidikan Agama Islam' },
  { no: 44, code: 'JAM', name: 'Jamaludin, M.Pd.I', nip: '198305102010011020', expertise: 'Pendidikan Agama & Etika' },
  { no: 45, code: 'AMU', name: 'Allan Mustafa Umami, S.H., M.Kn.', nip: '198807122018031001', expertise: 'Hukum & Etika Profesi' },
  { no: 46, code: 'ZAH', name: 'Zahratul\'ain Taufik, SH., MH.', nip: '198610052014042002', expertise: 'Pancasila & Kewarganegaraan' },
  { no: 47, code: 'MGD', name: 'Made Ganesh Dharmayanti, Ph.D', nip: '198008202005012003', expertise: 'Bahasa Inggris Teknik & Komunikasi Ilmiah' },
  { no: 48, code: 'SHI', name: 'Saprini Hamdiani, Ph.D', nip: '197803122003122001', expertise: 'Kimia Dasar & Lingkungan' },
  { no: 49, code: 'MUA', name: 'Dr. Maria Ulfa', nip: '197705142002122002', expertise: 'Kewirausahaan & Manajemen Proyek' },
  { no: 50, code: 'ISN', name: 'Iwan Sumarlan, S.Si., M.Si.', nip: '198204152008121004', expertise: 'Fisika Terapan & Instrumentasi' },
  { no: 51, code: 'MSA', name: 'Maulida Septiyana, S.Si., M.Si.', nip: '198909182019032014', expertise: 'Kalkulus & Matematika Diskrit' },
  { no: 52, code: 'SUM', name: 'Maulida Septiyana, S.Si., M.Si.', nip: '198909182019032015', expertise: 'Probabilitas & Statistika Teknik' },
  { no: 53, code: 'SSM', name: 'Siti Sumarti, M.Hum.', nip: '197508212005012001', expertise: 'Bahasa Inggris Teknik & Humaniora' },
  { no: 54, code: 'BIW', name: 'Budi Irmawati, Skom, MT, PhD', nip: '197602182003122001', expertise: 'Ilmu Komputer & Sistem Informasi' },
  { no: 55, code: 'IYS', name: 'Ika Yuliana Susilawati, SH., MH.', nip: '198407152010122002', expertise: 'Kewarganegaraan & Hukum' },
  { no: 56, code: 'MBS', name: 'I Made Budi Suksmadana, ST., MT.', nip: '197411252000031001', expertise: 'Sistem Elektronika & Pengolahan Sinyal' },
];

/**
 * Parsing rule for Student NIM:
 * Format standard: F1B0YY... -> 20YY
 * Non-standard (e.g. F1B118002): -> 2018 with warning
 * Semester formula: ((2026 - cohortYear) * 2) + 1 for Academic Year 2026/2027 Ganjil
 */
export function parseStudentNim(
  nim: string,
  academicYearStart: number = 2026
): {
  cohortYear: number;
  currentSemester: number;
  status: 'active' | 'historical';
  dataWarning?: boolean;
  warningReason?: string;
} {
  const cleanNim = (nim || '').trim();

  // 1. Standard format F1B0YY...
  const stdMatch = cleanNim.match(/^F1B0(\d{2})/i);
  if (stdMatch) {
    const yr = parseInt(stdMatch[1], 10);
    const cohortYear = 2000 + yr;
    const currentSemester = Math.max(1, ((academicYearStart - cohortYear) * 2) + 1);
    const status = currentSemester <= 8 ? 'active' : 'historical';
    return {
      cohortYear,
      currentSemester,
      status,
    };
  }

  // 2. Format with F1B1... (like F1B118002, F1B118023, F1B118035)
  const nonStdMatch = cleanNim.match(/^F1B([1-9])(\d{2})/i);
  if (nonStdMatch) {
    const yr = parseInt(nonStdMatch[2], 10);
    const cohortYear = 2000 + yr;
    const currentSemester = Math.max(1, ((academicYearStart - cohortYear) * 2) + 1);
    return {
      cohortYear,
      currentSemester,
      status: currentSemester <= 8 ? 'active' : 'historical',
      dataWarning: true,
      warningReason: `Format NIM tidak standar (Awalan ${cleanNim.substring(0, 4)} bukan F1B0). Perlu verifikasi admin.`,
    };
  }

  // Fallback
  return {
    cohortYear: 2023,
    currentSemester: 7,
    status: 'active',
    dataWarning: true,
    warningReason: 'Format NIM tidak dikenali, perlu verifikasi admin.',
  };
}

// Generate INITIAL_STUDENTS with exact data and parsing
export const INITIAL_STUDENTS: Student[] = RAW_STUDENTS.map((item, index) => {
  const parsed = parseStudentNim(item.nim, 2026);
  // For Angkatan 2023 (Semester 7), assign to cls-7a if classId is desired, or keep as cls-7a for the active demo
  const isCohort2023 = parsed.cohortYear === 2023;
  const classId = isCohort2023 ? 'cls-7a' : null;

  return {
    id: `std-${item.nim.toLowerCase()}`,
    nim: item.nim,
    name: item.name,
    cohortYear: parsed.cohortYear,
    currentSemester: parsed.currentSemester,
    status: parsed.status,
    classId: classId,
    dataWarning: parsed.dataWarning,
    warningReason: parsed.warningReason,
  };
});

// Default available days for lecturers
const DAYS_FULL: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
const DAYS_MON_THU: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis'];
const DAYS_TUE_FRI: DayOfWeek[] = ['Selasa', 'Rabu', 'Kamis', 'Jumat'];
const DAYS_MON_WED_FRI: DayOfWeek[] = ['Senin', 'Rabu', 'Jumat'];

// Generate INITIAL_LECTURERS with codes, days, time preferences and warnings
export const INITIAL_LECTURERS: Lecturer[] = RAW_LECTURERS.map((raw, idx) => {
  const codeLower = raw.code.toLowerCase();
  const id = `lec-${codeLower}${raw.code === 'MSA' && idx === 50 ? '-1' : raw.code === 'SUM' ? '-2' : ''}`;

  // Time preference distribution
  const prefs: TimePreference[] = ['Pagi', 'Pagi', 'Siang', 'Fleksibel', 'Sore'];
  const pref = prefs[idx % prefs.length];

  // Available days variation
  let availableDays: DayOfWeek[] = DAYS_FULL;
  if (idx % 4 === 1) availableDays = DAYS_MON_THU;
  if (idx % 4 === 2) availableDays = DAYS_TUE_FRI;
  if (idx % 4 === 3) availableDays = DAYS_MON_WED_FRI;

  // Specific check for #51 & #52 (Maulida Septiyana with duplicate name, different codes)
  let dataWarning: boolean | undefined = undefined;
  let warningReason: string | undefined = undefined;

  if (raw.name === 'Maulida Septiyana, S.Si., M.Si.') {
    dataWarning = true;
    warningReason = 'Nama dosen sama dengan record lain, tetapi kode dosen berbeda (' + raw.code + '). Perlu verifikasi admin.';
  }

  return {
    id,
    code: raw.code,
    nip: raw.nip || `19800${idx < 9 ? '0' : ''}${idx + 1}200501100${idx + 1}`,
    name: raw.name,
    expertise: raw.expertise || 'Teknik Elektro',
    availableDays,
    timePreference: pref,
    isActive: true,
    dataWarning,
    warningReason,
  };
});
