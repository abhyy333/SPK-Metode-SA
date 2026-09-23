// scripts/verifyDataset.cjs
const fs = require('fs');

const rawGanjilText = `Agama Islam - A	2	WS	I	Humamurrizqi S.Ag, M.Ag
Agama Islam - B	2	WS	I	Jamaludin, M.Pd.I
Agama Islam - C	2	WS	I	Supriyatna, ST., MT.
Agama Islam - INTER	2	WS	I	Dr. rer. nat. Teti Zubaidah, ST., MT.
Fisika Listrik & Magnet - A	3	WS	I	Dr. Kasnawi Al Hadi, S.Pd, M.Si.
Fisika Listrik & Magnet - B	01.05	WS	I	I Wayan Sudiarta, Ph.D.
Fisika Listrik & Magnet - B	01.05	WS	I	Sudi M. Al Sasongko, ST., MT.
Fisika Listrik & Magnet - C	01.05	WS	I	Abdullah Zainuddin, ST., MT.
Fisika Listrik & Magnet - C	01.05	WS	I	I Gusti Ngurah Yudi Handayana, Ph.D.
Fisika Listrik & Magnet- INTER	3	WS	I	Siti Alaa’ , M.Si
Fisika Mekanika - A	3	WS	I	Dr. Kasnawi Al Hadi, S.Pd, M.Si.
Fisika Mekanika - B	01.05	WS	I	Dr. Drs. Marzuki, M.Si.
Fisika Mekanika - B	01.05	WS	I	Made Sutha Yadnya, ST., MT.
Fisika Mekanika - C	3	WS	I	Dr.Nurul Qomariyah, S.Si, M.Si.
Fisika Mekanika - INTER	3	WS	I	Dr. rer. nat. Teti Zubaidah, ST., MT.
Dasar Integral & Differensial - A	3	WS	I	Bulkis Kanata, ST., MT.
Dasar Integral & Differensial - B	3	WS	I	Sabar Nababan, ST., MT.
Dasar Integral & Differensial - C	3	WS	I	Lalu A. Syamsul Irfan Akbar, ST., M.Eng.
Dasar Integral & Differensial - INTER	3	WS	I	Djul Fikry Budiman, ST., MT.
Kimia Dasar - A	2	WS	I	Paniran, ST., MT.
Kimia Dasar - B	2	WS	I	Abdul Natsir, ST., MT.
Kimia Dasar - C	2	WS	I	I Ketut Perdana Putra, ST., MT.
Kimia Dasar - INTER (1)	2	WS	I	Made Ganesh Dharmayanti, Ph.D
Kimia Dasar - D	2	WS	I	Dr. Ida Ayu Sri Adnyani, ST., M.Erg.
Kimia Dasar - E	2	WS	I	Saprini Hamdiani, Ph.D
Kimia Dasar - F	2	WS	I	Dr. Maria Ulfa
Kimia Dasar - G	2	WS	I	Iwan Sumarlan, S.Si., M.Si.
Kimia Dasar - INTER (2)	1	WS	I	Prof. Hendri Sake Tira, ST, MT, PhD
Kimia Dasar - INTER (2)	1	WS	I	Maulida Septiyana, S.Si., M.Si.
Pancasila - A	2	WS	I	Allan Mustafa Umami, S.H., M.Kn.
Pancasila - B	2	WS	I	Zahratul'ain Taufik, SH., MH.
Pancasila - C	2	WS	I	Ir. Ni Made Seniari, ST., MT.
Pancasila - INTER	2	WS	I	Djul Fikry Budiman, ST., MT.
Dasar Teknologi Informasi - A	2	WS	I	Prof. Dr. Ir. Misbahuddin, ST., MT. IPU
Dasar Teknologi Informasi - B	2	WS	I	M.Rivaldi Harjian
Dasar Teknologi Informasi - C	2	WS	I	Giri Wahyu Wiriasto, ST., MT.
Dasar Teknologi Informasi - INTER	1	WS	I	Heri Wijayanto, ST, MSC, PhD
Dasar Teknologi Informasi - INTER	1	WS	I	Wirarama Wedhaswara, ST, MT, PhD
Rangkaian Logika - A	2	WS	I	A. Sjamsjiar Rachman, ST., MT.
Rangkaian Logika - B	2	WS	I	Budi Darmawan, ST., M.Eng.
Rangkaian Logika - C	2	WS	I	Syafarudin Ch, ST., MT.
Rangkaian Logika - INTER	2	WS	I	Djul Fikry Budiman, ST., MT.
Praktikum Rangkaian Logika (Koordinator)	1	WS	I	Budi Darmawan, ST., M.Eng.
Praktikum Rangkaian Logika	1	WS	I	Syafarudin Ch, ST., MT.
Praktikum Rangkaian Logika	1	WS	I	Djul Fikry Budiman, ST., MT.
Praktikum Rangkaian Logika	1	WS	I	A. Sjamsjiar Rachman, ST., MT.
Praktikum Rangkaian Logika	1	WS	I	Supriono, ST., MT.
Praktikum Rangkaian Logika	1	WS	I	Bulkis Kanata, ST., MT.
Bahasa Inggris - A	2	WS	III	Siti Sumarti, M.Hum.
Bahasa Inggris - B	2	WS	III	Ida Bagus Fery Citarsa, ST., MT.
Bahasa Inggris - C	2	WS	III	Cipta Ramadhani, ST., M.Eng
Bahasa Inggris - INTER	2	WS	III	Ida Bagus Fery Citarsa, ST., MT.
Aljabar Linier - A	3	WS	III	Bulkis Kanata, ST., MT.
Aljabar Linier - B	3	WS	III	Sultan, ST., MT.
Aljabar Linier - C	3	WS	III	Budi Darmawan, ST., M.Eng.
Aljabar Linier - INTER	3	WS	III	Supriono, ST., MT.
Rangkaian Listrik II - A	2	WS	III	Ir. Ni Made Seniari, ST., MT.
Rangkaian Listrik II - B	2	WS	III	Sabar Nababan, ST., MT.
Rangkaian Listrik II - C	2	WS	III	Ir. Agung Budi Muljono, ST., MT., IPU
Rangkaian Listrik II - INTER	2	WS	III	I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.
Dasar Elektronika - A	3	WS	III	Budi Darmawan, ST., M.Eng.
Dasar Elektronika - B	3	WS	III	Paniran, ST., MT.
Dasar Elektronika - C	3	WS	III	Syafarudin Ch, ST., MT.
Dasar Elektronika - INTER	3	WS	III	A. Sjamsjiar Rachman, ST., MT.
Dasar Tenaga Listrik - A	3	WS	III	Ir. Agung Budi Muljono, ST., MT., IPU
Dasar Tenaga Listrik - B	3	WS	III	Supriyatna, ST., MT.
Dasar Tenaga Listrik - C	3	WS	III	Sultan, ST., MT.
Dasar Tenaga Listrik - INTER	3	WS	III	Dr. Ir. I Made Ginarsa, ST., MT., IPU
Pengukuran & Instrumentasi - A	2	WS	III	Abdul Natsir, ST., MT.
Pengukuran & Instrumentasi - B	2	WS	III	Ir. Ni Made Seniari, ST., MT.
Pengukuran & Instrumentasi - C	2	WS	III	Sultan, ST., MT.
Pengukuran & Instrumentasi - INTER	2	WS	III	Giri Wahyu Wiriasto, ST., MT.
Probabilitas dan Statistik	2	WS	III	Dr. Ida Ayu Sri Adnyani, ST., M.Erg.
Praktikum Pengukuran dan Instrumentasi	1	WS	III	Abdul Natsir, ST., MT.
Praktikum Pengukuran dan Instrumentasi	1	WS	III	Ir. Ni Made Seniari, ST., MT.
Praktikum Pengukuran dan Instrumentasi	1	WS	III	Sudi M. Al Sasongko, ST., MT.
Praktikum Pengukuran dan Instrumentasi	1	WS	III	Sultan, ST., MT.
Praktikum Pengukuran dan Instrumentasi	1	WS	III	Dr. Ida Ayu Sri Adnyani, ST., M.Erg.
Praktikum Pengukuran dan Instrumentasi	1	WS	III	Ir. Agung Budi Muljono, ST., MT., IPU
Praktikum Pengukuran dan Instrumentasi	1	WS	III	I Ketut Perdana Putra, ST., MT.
Praktikum Pengukuran dan Instrumentasi	1	WS	III	Giri Wahyu Wiriasto, ST., MT.
Praktikum Pengukuran dan Instrumentasi	1	WS	III	Paniran, ST., MT.
Praktikum Pengukuran dan Instrumentasi	1	WS	III	Cahyo Mustiko O. M., ST., MSc., Ph.D.
Praktikum Pengukuran dan Instrumentasi	1	WS	III	Muhamad Syamsu Iqbal, ST., MT., Ph.D.
Praktikum Rangkaian Listrik	1	WS	III	Ir. Ni Made Seniari, ST., MT.
Praktikum Rangkaian Listrik	1	WS	III	Ir. Agung Budi Muljono, ST., MT., IPU
Praktikum Rangkaian Listrik	1	WS	III	Sabar Nababan, ST., MT.
Praktikum Rangkaian Listrik	1	WS	III	I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.
Praktikum Rangkaian Listrik	1	WS	III	Sudi M. Al Sasongko, ST., MT.
Praktikum Rangkaian Listrik	1	WS	III	Ida Bagus Fery Citarsa, ST., MT.
Praktikum Rangkaian Listrik	1	WS	III	Dr. Ida Ayu Sri Adnyani, ST., M.Erg.
Praktikum Rangkaian Listrik	1	WS	III	Sultan, ST., MT.
Praktikum Rangkaian Listrik	1	WS	III	Abdul Natsir, ST., MT.
Praktikum Rangkaian Listrik	1	WS	III	Supriyatna, ST., MT.
Praktikum Rangkaian Listrik	1	WS	III	Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.
Praktikum Rangkaian Listrik	1	WS	III	Ir. I Made Ari Nrartha, ST., MT.
Lingkungan dan etika Rekayasa	2	WS	IV	Djul Fikry Budiman, ST., MT.
Literasi Abad 21	2	WS	V	Dr. Ida Ayu Sri Adnyani, ST., M.Erg.
Sistem Kontrol - A	3	WS	V	Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.
Sistem Kontrol - B	3	WS	V	Sabar Nababan, ST., MT.
Sistem Kontrol - C	3	WS	V	Ir. I Made Ari Nrartha, ST., MT.
Sistem Kontrol - INTER	3	WS	V	I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.
Sistem Kendali	4	WS	V	Syafarudin Ch, ST., MT.
Analisis Sistem Tenaga I - A	2	WST	V	Ir. I Made Ari Nrartha, ST., MT.
Analisis Sistem Tenaga I - B	2	WST	V	Supriono, ST., MT.
Analisis Sistem Tenaga I - INTER	3	WST	V	Dr.Ir. Rosmaliati, ST., MT.
Transmisi Tenaga Listrik A	2	WST	V	Ir. Agung Budi Muljono, ST., MT., IPU
Transmisi Tenaga Listrik B	2	WST	V	I Ketut Perdana Putra, ST., MT.
Transmisi Tenaga Listrik - INTER	2	WST	V	M.Rivaldi Harjian
Konversi Energi Hidro-Thermal - A	2	WST	V	Abdul Natsir, ST., MT.
Konversi Energi Hidro-Thermal - B	2	WST	V	I Ketut Perdana Putra, ST., MT.
Konversi Energi Hidro-Thermal - INTER	3	WST	V	Ida Bagus Fery Citarsa, ST., MT.
Mesin-Mesin Listrik - A	2	WST	V	Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.
Mesin-Mesin Listrik - B	2	WST	V	Supriyatna, ST., MT.
Mesin-Mesin Listrik - INTER	2	WST	V	Ida Bagus Fery Citarsa, ST., MT.
Elektronika Daya - A	2	WST	V	Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.
Elektronika Daya - B	2	WST	V	Ir. I Made Ari Nrartha, ST., MT.
Elektronika Daya - C	2	WST	V	Dr.Ir. Rosmaliati, ST., MT.
Elektronika Daya - INTER	2	WST	V	I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.
Praktikum Mesin-Mesin Listrik (koordinator)	1	WST	V	Ida Bagus Fery Citarsa, ST., MT.
Praktikum Mesin-Mesin Listrik	1	WST	V	Supriono, ST., MT.
Praktikum Elektronika Daya (koordinator)	1	WST	V	Ir. I Made Ari Nrartha, ST., MT.
Praktikum Elektronika Daya	1	WST	V	Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.
Praktikum Elektronika Daya	1	WST	V	I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.
Praktikum Elektronika Daya	1	WST	V	Ida Bagus Fery Citarsa, ST., MT.
Sistem Elektronika Digital	2	WTE	V	Paniran, ST., MT.
Sistem Instrumentasi dan Elektronika Industri	2	WTE	V	Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.
Sistem Telekomunikasi Digital	2	WTE	V	Made Sutha Yadnya, ST., MT.
Jaringan Telekomunikasi	2	WTE	V	Abdullah Zainuddin, ST., MT.
Rekayasa Trafik	2	WTE	V	Sudi M. Al Sasongko, ST., MT.
Transmisi Dan Perambatan Gelombang	2	WTE	V	Abdullah Zainuddin, ST., MT.
Matematika Diskrit	2	WK	V	Budi Irmawati, Skom, MT, PhD
Basis Data	01.05	WK	V	Lalu A. Syamsul Irfan Akbar, ST., M.Eng.
Basis Data	01.05	WK	V	Wirarama Wedhaswara, ST, MT, PhD
Rekayasa Perangkat Lunak	2	WK	V	Giri Wahyu Wiriasto, ST., MT.
Pemrograman Berorientasi Objek	2	WK	V	Cipta Ramadhani, ST., M.Eng
Sistem Operasi	2	WK	V	Cipta Ramadhani, ST., M.Eng
Praktikum Sistem Mikroprosessor	1	WS	V	Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.
Praktikum Sistem Mikroprosessor	1	WS	V	Supriono, ST., MT.
Praktikum Sistem Kontrol	1	WS	V	Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.
Praktikum Sistem Kontrol	1	WS	V	Ir. I Made Ari Nrartha, ST., MT.
Praktikum Sistem Kontrol	1	WS	V	I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.
Praktikum Sistem Kontrol	1	WS	V	Supriono, ST., MT.
Praktikum Sistem Kontrol	1	WS	V	Paniran, ST., MT.
Praktikum Sistem Kontrol	1	WS	V	Djul Fikry Budiman, ST., MT.
Praktikum Sistem Kontrol	1	WS	V	Dr. Ir. I Made Ginarsa, ST., MT., IPU
Proses Stokastik	2	WS	IV	Muhamad Syamsu Iqbal, ST., MT., Ph.D.
Manajemen Operasi Sistem Tenaga Listrik - A	2	WST	VII	Ir. I Made Ari Nrartha, ST., MT.
Manajemen Operasi Sistem Tenaga Listrik - B	2	WST	VII	Dr. Ir. I Made Ginarsa, ST., MT., IPU
Proteksi Sistem Tenaga Listrik - A	2	WST	VII	Supriyatna, ST., MT.
Proteksi Sistem Tenaga Listrik - B	2	WST	VII	Ir. Agung Budi Muljono, ST., MT., IPU
Kualitas Daya Listrik - A	2	WST	VII	Abdul Natsir, ST., MT.
Kualitas Daya Listrik - B	2	WST	VII	Dr.Ir. Rosmaliati, ST., MT.
Teknik Tegangan Tinggi - A	2	WST	VII	I Ketut Perdana Putra, ST., MT.
Teknik Tegangan Tinggi - B	2	WST	VII	Supriono, ST., MT.
Perancangan Sistem Elektronika	2	WTE	VII	Paniran, ST., MT.
Sistem Elektronika Terintegrasi	2	WTE	VII	A. Sjamsjiar Rachman, ST., MT.
Antena	2	WTE	VII	Cahyo Mustiko O. M., ST., MSc., Ph.D.
Pengukuran Sistem Telekomunikasi	2	WTE	VII	Made Sutha Yadnya, ST., MT.
Keamanan Sistem Informasi	2	WK	VII	Lalu A. Syamsul Irfan Akbar, ST., M.Eng.
Teknologi Cloud Computing	2	WK	VII	Giri Wahyu Wiriasto, ST., MT.
Teknologi IoT	2	WK	VII	Prof. Dr. Ir. Misbahuddin, ST., MT. IPU
Praktikum IoT	1	WK	VII	Lalu A. Syamsul Irfan Akbar, ST., M.Eng.
Praktikum Algoritma dan Struktur Data	1	WK	VII	Cipta Ramadhani, ST., M.Eng
Perancangan Proyek - A	2	WS	VII	Prof. Dr. Ir. Misbahuddin, ST., MT. IPU
Perancangan Proyek - B	2	WS	VII	Muhamad Syamsu Iqbal, ST., MT., Ph.D.
Perancangan Proyek - C	2	WS	VII	Dr. Ida Ayu Sri Adnyani, ST., M.Erg.
Perancangan Proyek - D	2	WS	VII	Dr.Ir. Rosmaliati, ST., MT.
Pra Tugas Akhir - E	2	WS	VII	Sudi M. Al Sasongko, ST., MT.
Pra Tugas Akhir - F	2	WS	VII	Abdullah Zainuddin, ST., MT.
Pra Tugas Akhir - G	2	WS	VII	Made Sutha Yadnya, ST., MT.
Keselamatan Dan Kesehatan Kerja	2	PST	VII	Dr. Ida Ayu Sri Adnyani, ST., M.Erg.
Sistem SCADA	2	PST	VII	Dr. Ir. I Made Ginarsa, ST., MT., IPU
Keandalan SistemTenaga Listrik	2	PST	VII	Supriyatna, ST., MT.
Optoelektronika	2	PE	VII	A. Sjamsjiar Rachman, ST., MT.
Telekomunikasi Gelombang Mikro	2	PT	VII	Cahyo Mustiko O. M., ST., MSc., Ph.D.
Telekomunikasi Bergerak	2	PT	VII	Cahyo Mustiko O. M., ST., MSc., Ph.D.
Telekomunikasi Satelit	2	PT	VII	Made Sutha Yadnya, ST., MT.
Data Engineering	2	PTK	VII	A. Sjamsjiar Rachman, ST., MT.
Keamanan Jaringan Komputer	2	PTK	VII	Lalu A. Syamsul Irfan Akbar, ST., M.Eng.
Proyek Perangkat lunak	2	PTK	VII	Lalu A. Syamsul Irfan Akbar, ST., M.Eng.
AIoT Cerdas	2	WTK	V	A. Sjamsjiar Rachman, ST., MT.
Teknik Kendali Digital	2	PE	VII	Syafarudin Ch, ST., MT.
`;

const rawGenapText = `Dasar Pemrograman - A	3	WS	II	Dr. Ir. Misbahuddin, ST., MT., IPU.
Dasar Pemrograman - B	3	WS	II	Giri Wahyu Wiriasto, ST., MT.
Dasar Pemrograman - C	3	WS	II	Budi Darmawan, ST., M.Eng.
Dasar Pemrograman - D	3	WS	II	Cipta Ramadhani, ST., M.Eng
Dasar Pemrograman - INTER	3	WS	II	Dr. Eng. Budi Irmawati, Skom, MT
Probabilitas dan Statistik - B	2	WS	II	Ir. Agung Budi Muljono, ST., MT., IPU
Probabilitas dan Statistik - A	2	WS	II	Sudi M. Al Sasongko, ST., MT.
Probabilitas dan Statistik - C	2	WS	II	Paniran, ST., MT.
Probabilitas dan Statistik - D	2	WS	II	Dr. Ida Ayu Sri Adnyani, ST., M.Erg.
Probabilitas dan Statistik -INTER	3	WS	II	Muhammad Rivaldi Harjian, ST., MT
Dasar Telekomunikasi - A	3	WS	II	Sudi M. Al Sasongko, ST., MT.
Dasar Telekomunikasi - B	3	WS	II	Djul Fikry  Budiman, ST., MT.
Dasar Telekomunikasi - C	3	WS	II	Ir. Muhamad Syamsu Iqbal, ST., MT., Ph.D.
Dasar Telekomunikasi - D	3	WS	II	Bulkis Kanata, ST., MT.
Dasar Telekomunikasi - INTER	3	WS	II	Cahyo Mustiko O. M., ST., MSc., Ph.D.
Fisika II - A	3	WS	II	Made Sutha Yadnya, ST., MT.
Fisika II - B	3	WS	II	Ir. I Made Ari Nrartha, ST., MT.
Fisika II - C	3	WS	II	Syafarudin Ch, ST., MT.
Fisika II - D	3	WS	II	Ida Bagus Fery Citarsa, ST., MT.
Fisika II - INTER	3	WS	II	Ida Bagus Fery Citarsa, ST., MT.
Kalkulus II - A	3	WS	II	Sabar Nababan, ST., MT.
Kalkulus II - B	3	WS	II	Dr. Ir. I Made Ginarsa, ST., MT., IPU
Kalkulus II - C	3	WS	II	Lalu A. Syamsul Irfan Akbar, ST., M.Eng.
Kalkulus II - D	3	WS	II	I Ketut Perdana Putra, ST., MT.
Kalkulus II - INTER	3	WS	II	Cipta Ramadhani, ST., M.Eng
Rangkaian Listrik I - A	3	WS	II	I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.
Rangkaian Listrik I - B	3	WS	II	Ir. Ni Made Seniari, ST., MT.
Rangkaian Listrik I – C	3	WS	II	Ir. I Made Ari Nrartha, ST., MT.
Rangkaian Listrik I – D	3	WS	II	Sabar Nababan, ST., MT.
Rangkaian Listrik I – INTER	3	WS	II	I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.
Pembangunan Karakter - A	2	WS	II	Ir. Ni Made Seniari, ST., MT.
Pembangunan Karakter - B	2	WS	II	Supriyatna, ST., MT.
Pembangunan Karakter - C	2	WS	II	Dr. Ida Ayu Sri Adnyani, ST., M.Erg.
Pembangunan Karakter - D	2	WS	II	I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.
Pembangunan Karakter - INTER	2	WS	II	Dr. Ir. Rosmaliati, ST., MT.
Sistem Mikroprosesor - A	3	WS	IV	Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.
Sistem Mikroprosesor - B	3	WS	IV	Djul Fikry  Budiman, ST., MT.
Sistem Mikroprosesor - C	3	WS	IV	Budi Darmawan, ST., M.Eng.
Sistem Mikroprosesor - D	3	WS	IV	A. Sjamsjiar Rachman, ST., MT.
Sistem Mikroprosesor -INTER	3	WS	IV	Dr.Eng. I Gde Putu Wirarama Wedashwara Wirawan ST., MT.
Sistem Mikroprosesor -INTER	3	WS	IV	Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.
Sinyal dan Sistem - A	3	WS	IV	Made Sutha Yadnya, ST., MT.
Sinyal dan Sistem - B	3	WS	IV	Syafarudin Ch, ST., MT.
Sinyal dan Sistem - C	3	WS	IV	Budi Darmawan, ST., M.Eng.
Sinyal dan Sistem - D	3	WS	IV	A. Sjamsjiar Rachman, ST., MT.
Sinyal dan Sistem - INTER	3	WS	IV	A. Sjamsjiar Rachman, ST., MT.
Ekonomi Teknik - A	2	WS	IV	Syafarudin Ch, ST., MT.
Ekonomi Teknik - B	2	WS	IV	Sultan, ST., MT.
Ekonomi Teknik - C	2	WS	IV	Ir. I Made Ari Nrartha, ST., MT.
Ekonomi Teknik - C	2	WS	IV	Heri Wijayanto, ST, MT, PhD
Ekonomi Teknik - D	2	WS	IV	Ir. Agung Budi Muljono, ST., MT., IPU
Ekonomi Teknik - INTER	2	WS	IV	Dr. Ir. Rosmaliati, ST., MT.
Matematika Teknik II - A	3	WS	IV	Dr. Ir. I Made Ginarsa, ST., MT., IPU
Matematika Teknik II - B	3	WS	IV	Abdul Natsir, ST., MT.
Matematika Teknik II – C	3	WS	IV	Supriono, ST., MT.
Matematika Teknik II – D	3	WS	IV	I Ketut Perdana Putra, ST., MT.
Matematika Teknik II – INTER	3	WS	IV	Dr. Ir. I Made Ginarsa, ST., MT., IPU
Elektromagnetika - A 	3	WS	IV	Muhammad Rivaldi Harjian, ST., MT
Elektromagnetika - B	3	WS	IV	Ir. Ni Made Seniari, ST., MT.
Elektromagnetika - C	3	WS	IV	Supriono, ST., MT.
Elektromagnetika - D	3	WS	IV	Abdullah Zainuddin, ST., MT.
Elektromagnetika - INTER	3	WS	IV	Dr. rer. nat. Teti Zubaidah, ST., MT.
Metode Numerik - A	2	WS	IV	Abdul Natsir, ST., MT.
Metode Numerik - B	2	WS	IV	Paniran, ST., MT.
Metode Numerik - C	2	WS	IV	Giri Wahyu Wiriasto, ST., MT.
Metode Numerik - D	2	WS	IV	I Ketut Perdana Putra, ST., MT.
Metode Numerik - INTER	2	WS	IV	Ida Bagus Fery Citarsa, ST., MT.
Analisa Sistem Tenaga Listrik  II - A	2	WST	VI	Dr. Ir. Rosmaliati, ST., MT.
Analisa Sistem Tenaga Listrik  II - B	2	WST	VI	Ir. I Made Ari Nrartha, ST., MT.
Konversi Energi Terbarukan - A	2	WST	VI	Ir. Agung Budi Muljono, ST., MT., IPU
Konversi Energi Terbarukan - B	2	WST	VI	Dr. Ir. Rosmaliati, ST., MT.
Sistem Distribusi Modern - A	2	WST	VI	Supriyatna, ST., MT.
Sistem Distribusi Modern - B	2	WST	VI	Abdul Natsir, ST., MT.
Perencanaan Instalasi Listrik - A	3	WST	VI	Sultan, ST., MT.
Perencanaan Instalasi Listrik - B	3	WST	VI	Supriyatna, ST., MT.
Gejala Medan Tinggi	2	PST	VI	Dr. rer. nat. Teti Zubaidah, ST., MT.
Gardu Induk & Pentanahan STL	2	PST	VI	Ir. Agung Budi Muljono, ST., MT., IPU
Pemilihan & Peng. Motor Listrik (PPML)	2	PST	VI	Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.
Distributed Generation (DG)- A	2	PST	VI	Sabar Nababan, ST., MT.
Distributed Generation (DG)- B	2	PST	VI	Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.
Eksplorasi & Utilisasi Energi Geotermal 	2	PST	VI	Dr. rer. nat. Teti Zubaidah, ST., MT.
Perencanaan Energi	2	PST	VI	Dr. Ir. Rosmaliati, ST., MT.
Pengolahan Sinyal Digital - A	3	WE,WT	VI	Bulkis Kanata, ST., MT.
Pengolahan Sinyal Digital - B	3	WE,WT	VI	A. Sjamsjiar Rachman, ST., MT.
Elektronika Analog	2	WE	VI	Paniran, ST., MT.
Programable Logic Control	2	WE,PST	VI	Paniran, ST., MT.
Mekatronika	2	WE	VI	Paniran, ST., MT.
Tek Antarmuka & Sist.Tertanam	3	WE	VI	A. Sjamsjiar Rachman, ST., MT.
Tek Antarmuka & Sist.Tertanam - B	3	WE	VI	Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.
Instrumentasi Geo-Elektromagetika 	2	PE	VI	Paniran, ST., MT.
Trans & Perambatan Gelombang	3	WT	VI	Abdullah Zainuddin, ST., MT.
Elektronika Telekomunikasi	3	WT	VI	Cahyo Mustiko O. M., ST., MSc., Ph.D.
Komdat dan Jaringan Komputer	3	WT,WTK	VI	Lalu A. Syamsul Irfan Akbar, ST., M.Eng.
Deep Neural Network	2	PT	VI	Bulkis Kanata, ST., MT.
Radar dan sensor Jarak jauh	2	PT	VI	Cahyo Mustiko O. M., ST., MSc., Ph.D.
Pengolahan Citra Digital	2	PT,PE	VI	Bulkis Kanata, ST., MT.
Organisasi & Arsitektur Komputer	2	WTK	VI	Cipta Ramadhani, ST., M.Eng
Algoritma & Struktur Data	2	WTK,PE	VI	Cipta Ramadhani, ST., M.Eng
Kecerdasan Artifisial	2	WTK,PE	VI	Dr. Ir. Misbahuddin, ST., MT., IPU.
Pemrograman Web & Mobile	2	WTK	VI	A. Sjamsjiar Rachman, ST., MT.
Telekomunikasi IoT Nirkabel	2	PTK	VI	Dr. Ir. Misbahuddin, ST., MT., IPU.
Teknik Pengembangan Game	2	PTK	VI	Giri Wahyu Wiriasto, ST., MT.
Machine Learning	2	PTK	VI	Lalu A. Syamsul Irfan Akbar, ST., M.Eng.
Technopreneurship - A	2	WS	VIII	Dr. Ida Ayu Sri Adnyani, ST., M.Erg.
Technopreneurship - B	2	WS	VIII	Dr. Ida Ayu Sri Adnyani, ST., M.Erg.
Technopreneurship - B	0	WS	VIII	Sultan, ST., MT.
Technopreneurship - C	2	WS	VIII	Dr. Ida Ayu Sri Adnyani, ST., M.Erg.
Technopreneurship - D	2	WS	VIII	Giri Wahyu Wiriasto, ST., MT.
Lingk. dan Etika Rekayasa - A	2	WS	VIII	Supriyatna, ST., MT.
Lingk. dan Etika Rekayasa - B	2	WS	VIII	Dr. Ida Ayu Sri Adnyani, ST., M.Erg.
Lingk. dan Etika Rekayasa - C	2	WS	VIII	Dr. Ir. Rosmaliati, ST., MT.
Pra Tugas Akhir - A	2	WS	VII	Ir. Muhamad Syamsu Iqbal, ST., MT., Ph.D.
Pra Tugas Akhir - B	2	WS	VII	Dr. Ir. Misbahuddin, ST., MT., IPU.
Kewarganegaraan - A	2	WS	VIII	Ika Yuliana Susilawati, SH., MH. 
Kewarganegaraan - B	2	WS	VIII	Ika Yuliana Susilawati, SH., MH. 
Fisika I	2	WS	I	Syafarudin Ch, ST., MT.
Prak. Rangkaian Logika	1	WS	II	Budi Darmawan, ST., M.Eng.
Prak. Rangkaian Logika	1	WS	II	Paniran, ST., MT.
Prak. Rangkaian Logika	1	WS	II	Syafarudin Ch, ST., MT.
Prak. Rangkaian Logika	1	WS	II	Abdul Natsir, ST., MT.
Prak. Rangkaian Logika	1	WS	II	Supriono, ST., MT.
Prak. Rangkaian Logika	1	WS	II	A. Sjamsjiar Rachman, ST., MT.
Prak. Rangkaian Logika	1	WS	II	Bulkis Kanata, ST., MT.
Prak. Rangkaian Logika	1	WS	II	Made Sutha Yadnya, ST., MT.
Prak. Rangkaian Logika	1	WS	II	Sudi M. Al Sasongko, ST., MT.
Prak. Rangkaian Logika	1	WS	II	Djul Fikry  Budiman, ST., MT.
Prak. Rangkaian Logika	1	WS	II	Dr. Ida Ayu Sri Adnyani, ST., M.Erg.
Prak. Rangkaian Logika	1	WS	II	Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.
Prak. Rangkaian Logika	1	WS	II	Muhammad Rivaldi Harjian, ST., MT
Prak. Dasar Pemrograman	1	WS	II	Lalu A. Syamsul Irfan Akbar, ST., M.Eng.
Prak. Dasar Pemrograman	1	WS	II	Giri Wahyu Wiriasto, ST., MT.
Prak. Dasar Pemrograman	1	WS	II	Dr. Ir. Misbahuddin, ST., MT., IPU.
Prak. Dasar Pemrograman	1	WS	II	A. Sjamsjiar Rachman, ST., MT.
Prak. Dasar Pemrograman	1	WS	II	A. Sjamsjiar Rachman, ST., MT.
Prak. Dasar Pemrograman	1	WS	II	Budi Darmawan, ST., M.Eng.
Prak. Dasar Pemrograman	1	WS	II	Djul Fikry  Budiman, ST., MT.
Prak. Dasar Pemrograman	2	WS	II	Made Sutha Yadnya, ST., MT.
Prak. Rangkaian Listrik	1	WS	IV	Ida Bagus Fery Citarsa, ST., MT.
Prak. Rangkaian Listrik	1	WS	IV	Dr. Ir. I Made Ginarsa, ST., MT., IPU
Prak. Rangkaian Listrik	1	WS	IV	Ir. Ni Made Seniari, ST., MT.
Prak. Rangkaian Listrik	1	WS	IV	Supriyatna, ST., MT.
Prak. Rangkaian Listrik	1	WS	IV	Dr. Ida Ayu Sri Adnyani, ST., M.Erg.
Prak. Rangkaian Listrik	1	WS	IV	Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.
Prak. Rangkaian Listrik	1	WS	IV	Sultan, ST., MT.
Prak. Rangkaian Listrik	1	WS	IV	I Ketut Perdana Putra, ST., MT.
Prak. Rangkaian Listrik	1	WS	IV	Sudi M. Al Sasongko, ST., MT.
Prak. Rangkaian Listrik	1	WS	IV	I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.
Prak. Rangkaian Listrik	1	WS	IV	Abdul Natsir, ST., MT.
Prak. Rangkaian Listrik	1	WS	IV	Ir. I Made Ari Nrartha, ST., MT.
Prak. Rangkaian Listrik	1	WS	IV	Sabar Nababan, ST., MT.
Prak. Rangkaian Listrik	1	WS	IV	Ir. Agung Budi Muljono, ST., MT., IPU
Prak. Dasar Elektronika	1	WS	IV	Budi Darmawan, ST., M.Eng.
Prak. Dasar Elektronika	1	WS	IV	Paniran, ST., MT.
Prak. Dasar Elektronika	1	WS	IV	Syafarudin Ch, ST., MT.
Prak. Dasar Elektronika	1	WS	IV	A. Sjamsjiar Rachman, ST., MT.
Prak. Dasar Elektronika	1	WS	IV	Supriono, ST., MT.
Prak. Dasar Elektronika	1	WS	IV	A. Sjamsjiar Rachman, ST., MT.
Prak. Dasar Elektronika	1	WS	IV	Bulkis Kanata, ST., MT.
Prak. Dasar Elektronika	1	WS	IV	Made Sutha Yadnya, ST., MT.
Prak. Dasar Elektronika	1	WS	IV	Sudi M. Al Sasongko, ST., MT.
Prak. Dasar Elektronika	1	WS	IV	Djul Fikry  Budiman, ST., MT.
Prak. Dasar Elektronika	1	WS	IV	Ir. Ni Made Seniari, ST., MT.
Prak. Dasar Elektronika	1	WS	IV	Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.
Prak. Dasar Elektronika	1	WS	IV	Muhammad Rivaldi Harjian, ST., MT
Prak. Dasar Tenaga Listrik	1	WS	IV	Sabar Nababan, ST., MT.
Prak. Dasar Tenaga Listrik	1	WS	IV	Sultan, ST., MT.
Prak. Dasar Tenaga Listrik	1	WS	IV	Supriono, ST., MT.
Prak. Dasar Tenaga Listrik	1	WS	IV	I Ketut Perdana Putra, ST., MT.
Prak. Dasar Tenaga Listrik	1	WS	IV	Abdul Natsir, ST., MT.
Prak. Dasar Tenaga Listrik	1	WS	IV	Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.
Prak. Dasar Tenaga Listrik	1	WS	IV	Dr. Ida Ayu Sri Adnyani, ST., M.Erg.
Prak. Dasar Tenaga Listrik	1	WS	IV	Ir. Ni Made Seniari, ST., MT.
Prak. Dasar Tenaga Listrik	1	WS	IV	Ida Bagus Fery Citarsa, ST., MT.
Prak. Dasar Tenaga Listrik	1	WS	IV	Dr. Ir. I Made Ginarsa, ST., MT., IPU
Prak. Dasar Tenaga Listrik	1	WS	IV	Ir. Agung Budi Muljono, ST., MT., IPU
Prak. Dasar Tenaga Listrik	1	WS	IV	Ir. I Made Ari Nrartha, ST., MT.
Prak. Dasar Tenaga Listrik	1	WS	IV	Muhammad Rivaldi Harjian, ST., MT
Prak. Dasar Tenaga Listrik	1	WS	IV	Supriyatna, ST., MT.
Prak. Analisis Sistem Tenaga	1	WST	VI	Sultan, ST., MT.
Prak. Analisis Sistem Tenaga	1	WST	VI	Ir. I Made Ari Nrartha, ST., MT.
Prak. Analisis Sistem Tenaga	1	WST	VI	Dr. Ir. I Made Ginarsa, ST., MT., IPU
Prak. Analisis Sistem Tenaga	1	WST	VI	Dr. Ir. Rosmaliati, ST., MT.
Prak. Analisis Sistem Tenaga	1	WST	VI	Ir. Agung Budi Muljono, ST., MT., IPU
Prak. Analisis Sistem Tenaga	1	WST	VI	Supriyatna, ST., MT.
Prak. Analisis Sistem Tenaga	1	WST	VI	Muhammad Rivaldi Harjian, ST., MT
Prak. Transmisi & Distribusi	1	WST	VI	Sultan, ST., MT.
Prak. Transmisi & Distribusi	1	WST	VI	Supriyatna, ST., MT.
Prak. Transmisi & Distribusi	1	WST	VI	Abdul Natsir, ST., MT.
Prak. Transmisi & Distribusi	1	WST	VI	Ir. Agung Budi Muljono, ST., MT., IPU
Prak. Transmisi & Distribusi	1	WST	VI	I Ketut Perdana Putra, ST., MT.
Prak. Transmisi & Distribusi	1	WST	VI	Muhammad Rivaldi Harjian, ST., MT
Prak. Elektronika Lanjut	1	WE	VI	Paniran, ST., MT.
Prak. Elektronika Lanjut	1	WE	VI	Syafarudin Ch, ST., MT.
Prak. Pengolahan Sinyal Digital	1	WE	VI	Budi Darmawan, ST., M.Eng.
Prak. Pengolahan Sinyal Digital	1	WE	VI	I Made Budi Suksmadana, ST., MT.
Prak. Jaringan Telekomunikasi	1	WT	VI	Bulkis Kanata, ST., MT.
Prak. Jaringan Telekomunikasi	1	WT	VI	Made Sutha Yadnya, ST., MT.
Prak. Sistem Telekomunikasi	1	WT	VI	Djul Fikry  Budiman, ST., MT.
Prak. Sistem Telekomunikasi	1	WT	VI	Sudi M. Al Sasongko, ST., MT.
Prak. Sistem Telekomunikasi	1	WT	VI	Cahyo Mustiko O. M., ST., MSc., Ph.D.
Prak. PBO	1	WTK	VI	Dr. Ir. Misbahuddin, ST., MT., IPU.
Prak. PBO	1	WTK	VI	A. Sjamsjiar Rachman, ST., MT.
Prak. PBO	1	WTK	VI	Cipta Ramadhani, ST., M.Eng
Prak. Algoritma & Struktur Data	1	WTK	VI	Lalu A. Syamsul Irfan Akbar, ST., M.Eng.
Prak. Algoritma & Struktur Data	1	WTK	VI	Giri Wahyu Wiriasto, ST., MT.
Prak. Algoritma & Struktur Data	1	WTK	VI	Cipta Ramadhani, ST., M.Eng
Prak. Jaringan Komputer	1	WTK	VI	Lalu A. Syamsul Irfan Akbar, ST., M.Eng.
Prak. Jaringan Komputer	1	WTK	VI	Giri Wahyu Wiriasto, ST., MT.
Prak. Jaringan Komputer	1	WTK	VI	Dr. Ir. Misbahuddin, ST., MT., IPU.
`;

function parseLines(text, period) {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  return lines.map((line, idx) => {
    const parts = line.split('\t');
    return {
      source_row_id: `${period.toLowerCase()}-${idx + 1}`,
      academic_period: period,
      raw_course_name: parts[0] || '',
      source_sks: parts[1] || '',
      source_w: parts[2] || '',
      source_semester: parts[3] || '',
      raw_lecturer_name: parts[4] || '',
      raw_line: line
    };
  });
}

const ganjilRows = parseLines(rawGanjilText, 'GANJIL');
const genapRows = parseLines(rawGenapText, 'GENAP');

console.log('GANJIL count:', ganjilRows.length);
console.log('GENAP count:', genapRows.length);
console.log('TOTAL count:', ganjilRows.length + genapRows.length);

if (ganjilRows.length !== 183 || genapRows.length !== 209 || (ganjilRows.length + genapRows.length) !== 392) {
  console.error('ERROR: Counts do not match expected 183 / 209 / 392');
  process.exit(1);
} else {
  console.log('SUCCESS: Exactly 183 Ganjil, 209 Genap, 392 Total rows!');
}
