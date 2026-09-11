// Smart API Mock Engine for GitHub Pages Live Demo & Offline Testing
(function() {
    const realFetch = (typeof window !== 'undefined') ? window.fetch : null;

    const DEFAULT_DB = {"courses": [{"id": 1, "name": "مسار القرآن الكريم والتدبر", "title": "مسار القرآن الكريم والتدبر", "track_name": "مسار القرآن الفردي", "target_age": "6 - 18 سنة", "description": "حفظ متقن وتدبر عملي يومي لسور الفاتحة والكهف وجزء عم.", "icon": "", "price_per_block": 350.0, "total_lectures": 8, "default_day": "الأحد", "default_time": "18:30", "min_age": 6, "max_age": 18, "max_capacity": 1, "default_duration_minutes": 45}], "teachers": [{"id": 1, "name": "أبو بكر", "username": "T001", "password_hash": "Tch@9771", "email": "teacher_1@monir-academy.edu.eg", "role": "teacher"}, {"id": 2, "name": "أحمد طارق", "username": "T002", "password_hash": "Tch@6916", "email": "teacher_2@monir-academy.edu.eg", "role": "teacher"}, {"id": 3, "name": "أحمد محمد أحمد", "username": "T003", "password_hash": "Tch@1085", "email": "teacher_3@monir-academy.edu.eg", "role": "teacher"}, {"id": 4, "name": "أسامة ضلام", "username": "T004", "password_hash": "Tch@2381", "email": "teacher_4@monir-academy.edu.eg", "role": "teacher"}, {"id": 5, "name": "أسماء علي", "username": "T005", "password_hash": "Tch@2827", "email": "teacher_5@monir-academy.edu.eg", "role": "teacher"}, {"id": 6, "name": "إبراهيم محمد إبراهيم", "username": "T006", "password_hash": "Tch@2791", "email": "teacher_6@monir-academy.edu.eg", "role": "teacher"}, {"id": 7, "name": "إسلام شريف", "username": "T007", "password_hash": "Tch@3294", "email": "teacher_7@monir-academy.edu.eg", "role": "teacher"}, {"id": 8, "name": "ابراهيم محمد", "username": "T008", "password_hash": "Tch@3841", "email": "teacher_8@monir-academy.edu.eg", "role": "teacher"}, {"id": 9, "name": "احمد حميد", "username": "T009", "password_hash": "Tch@2112", "email": "teacher_9@monir-academy.edu.eg", "role": "teacher"}, {"id": 10, "name": "احمد خالد", "username": "T010", "password_hash": "Tch@9111", "email": "teacher_10@monir-academy.edu.eg", "role": "teacher"}, {"id": 11, "name": "احمد سلطان", "username": "T011", "password_hash": "Tch@9155", "email": "teacher_11@monir-academy.edu.eg", "role": "teacher"}, {"id": 12, "name": "احمد سيد احمد", "username": "T012", "password_hash": "Tch@7490", "email": "teacher_12@monir-academy.edu.eg", "role": "teacher"}, {"id": 13, "name": "احمد عصام", "username": "T013", "password_hash": "Tch@3842", "email": "teacher_13@monir-academy.edu.eg", "role": "teacher"}, {"id": 14, "name": "اسامة محمد", "username": "T014", "password_hash": "Tch@1371", "email": "teacher_14@monir-academy.edu.eg", "role": "teacher"}, {"id": 15, "name": "اماني", "username": "T015", "password_hash": "Tch@8139", "email": "teacher_15@monir-academy.edu.eg", "role": "teacher"}, {"id": 16, "name": "امنية ابراهيم", "username": "T016", "password_hash": "Tch@3911", "email": "teacher_16@monir-academy.edu.eg", "role": "teacher"}, {"id": 17, "name": "امنية سعيد شعبان", "username": "T017", "password_hash": "Tch@1953", "email": "teacher_17@monir-academy.edu.eg", "role": "teacher"}, {"id": 18, "name": "ايمان", "username": "T018", "password_hash": "Tch@8392", "email": "teacher_18@monir-academy.edu.eg", "role": "teacher"}, {"id": 19, "name": "ايه عباس", "username": "T019", "password_hash": "Tch@5595", "email": "teacher_19@monir-academy.edu.eg", "role": "teacher"}, {"id": 20, "name": "بسام الاسد", "username": "T020", "password_hash": "Tch@7126", "email": "teacher_20@monir-academy.edu.eg", "role": "teacher"}, {"id": 21, "name": "بلال", "username": "T021", "password_hash": "Tch@5934", "email": "teacher_21@monir-academy.edu.eg", "role": "teacher"}, {"id": 22, "name": "تسنيم", "username": "T022", "password_hash": "Tch@9510", "email": "teacher_22@monir-academy.edu.eg", "role": "teacher"}, {"id": 23, "name": "جنة علام", "username": "T023", "password_hash": "Tch@6146", "email": "teacher_23@monir-academy.edu.eg", "role": "teacher"}, {"id": 24, "name": "جهاد صابر", "username": "T024", "password_hash": "Tch@5916", "email": "teacher_24@monir-academy.edu.eg", "role": "teacher"}, {"id": 25, "name": "جهاد مجدي", "username": "T025", "password_hash": "Tch@1611", "email": "teacher_25@monir-academy.edu.eg", "role": "teacher"}, {"id": 26, "name": "حبيبة ابراهيم", "username": "T026", "password_hash": "Tch@4060", "email": "teacher_26@monir-academy.edu.eg", "role": "teacher"}, {"id": 27, "name": "حبيبة عاشور", "username": "T027", "password_hash": "Tch@8900", "email": "teacher_27@monir-academy.edu.eg", "role": "teacher"}, {"id": 28, "name": "حمزه العدوي", "username": "T028", "password_hash": "Tch@2721", "email": "teacher_28@monir-academy.edu.eg", "role": "teacher"}, {"id": 29, "name": "حنان", "username": "T029", "password_hash": "Tch@6844", "email": "teacher_29@monir-academy.edu.eg", "role": "teacher"}, {"id": 30, "name": "خالد عثمان", "username": "T030", "password_hash": "Tch@2619", "email": "teacher_30@monir-academy.edu.eg", "role": "teacher"}, {"id": 31, "name": "خالد فرج", "username": "T031", "password_hash": "Tch@1832", "email": "teacher_31@monir-academy.edu.eg", "role": "teacher"}, {"id": 32, "name": "دعاء محمد", "username": "T032", "password_hash": "Tch@6035", "email": "teacher_32@monir-academy.edu.eg", "role": "teacher"}, {"id": 33, "name": "رؤى اسماعيل", "username": "T033", "password_hash": "Tch@5892", "email": "teacher_33@monir-academy.edu.eg", "role": "teacher"}, {"id": 34, "name": "روضة", "username": "T034", "password_hash": "Tch@5688", "email": "teacher_34@monir-academy.edu.eg", "role": "teacher"}, {"id": 35, "name": "ساره احمد", "username": "T035", "password_hash": "Tch@9740", "email": "teacher_35@monir-academy.edu.eg", "role": "teacher"}, {"id": 36, "name": "عبد الرحيم", "username": "T036", "password_hash": "Tch@7613", "email": "teacher_36@monir-academy.edu.eg", "role": "teacher"}, {"id": 37, "name": "عبدالرحمن أحمد مختار", "username": "T037", "password_hash": "Tch@8679", "email": "teacher_37@monir-academy.edu.eg", "role": "teacher"}, {"id": 38, "name": "عبدالرحمن سعيد", "username": "T038", "password_hash": "Tch@9094", "email": "teacher_38@monir-academy.edu.eg", "role": "teacher"}, {"id": 39, "name": "عبدالرحمن سلامة", "username": "T039", "password_hash": "Tch@9602", "email": "teacher_39@monir-academy.edu.eg", "role": "teacher"}, {"id": 40, "name": "عبدالرحمن وائل", "username": "T040", "password_hash": "Tch@4032", "email": "teacher_40@monir-academy.edu.eg", "role": "teacher"}, {"id": 41, "name": "عبدالرحمن وليد", "username": "T041", "password_hash": "Tch@6538", "email": "teacher_41@monir-academy.edu.eg", "role": "teacher"}, {"id": 42, "name": "عبدالله محمد السعيد", "username": "T042", "password_hash": "Tch@8483", "email": "teacher_42@monir-academy.edu.eg", "role": "teacher"}, {"id": 43, "name": "علي احمد", "username": "T043", "password_hash": "Tch@7915", "email": "teacher_43@monir-academy.edu.eg", "role": "teacher"}, {"id": 44, "name": "علي فراج", "username": "T044", "password_hash": "Tch@2667", "email": "teacher_44@monir-academy.edu.eg", "role": "teacher"}, {"id": 45, "name": "عمار محمد", "username": "T045", "password_hash": "Tch@5699", "email": "teacher_45@monir-academy.edu.eg", "role": "teacher"}, {"id": 46, "name": "عمر امام", "username": "T046", "password_hash": "Tch@9910", "email": "teacher_46@monir-academy.edu.eg", "role": "teacher"}, {"id": 47, "name": "عمر حسين", "username": "T047", "password_hash": "Tch@5291", "email": "teacher_47@monir-academy.edu.eg", "role": "teacher"}, {"id": 48, "name": "عمر عبادة", "username": "T048", "password_hash": "Tch@8878", "email": "teacher_48@monir-academy.edu.eg", "role": "teacher"}, {"id": 49, "name": "عمر فتحي", "username": "T049", "password_hash": "Tch@9771", "email": "teacher_49@monir-academy.edu.eg", "role": "teacher"}, {"id": 50, "name": "فاطمه مدكور", "username": "T050", "password_hash": "Tch@5081", "email": "teacher_50@monir-academy.edu.eg", "role": "teacher"}, {"id": 51, "name": "محمد احمد محمود", "username": "T051", "password_hash": "Tch@9878", "email": "teacher_51@monir-academy.edu.eg", "role": "teacher"}, {"id": 52, "name": "محمد عاشور", "username": "T052", "password_hash": "Tch@9397", "email": "teacher_52@monir-academy.edu.eg", "role": "teacher"}, {"id": 53, "name": "محمد عبد المنعم", "username": "T053", "password_hash": "Tch@2310", "email": "teacher_53@monir-academy.edu.eg", "role": "teacher"}, {"id": 54, "name": "محمد مبروك الشامي", "username": "T054", "password_hash": "Tch@3282", "email": "teacher_54@monir-academy.edu.eg", "role": "teacher"}, {"id": 55, "name": "محمد محمود المزين", "username": "T055", "password_hash": "Tch@8849", "email": "teacher_55@monir-academy.edu.eg", "role": "teacher"}, {"id": 56, "name": "محمد مصطفى زهران", "username": "T056", "password_hash": "Tch@9989", "email": "teacher_56@monir-academy.edu.eg", "role": "teacher"}, {"id": 57, "name": "محمود اشرف", "username": "T057", "password_hash": "Tch@8835", "email": "teacher_57@monir-academy.edu.eg", "role": "teacher"}, {"id": 58, "name": "محمود حمادة", "username": "T058", "password_hash": "Tch@2168", "email": "teacher_58@monir-academy.edu.eg", "role": "teacher"}, {"id": 59, "name": "محمود عبد المحسن", "username": "T059", "password_hash": "Tch@4427", "email": "teacher_59@monir-academy.edu.eg", "role": "teacher"}, {"id": 60, "name": "محمود عرام", "username": "T060", "password_hash": "Tch@1292", "email": "teacher_60@monir-academy.edu.eg", "role": "teacher"}, {"id": 61, "name": "مريم حسن", "username": "T061", "password_hash": "Tch@2106", "email": "teacher_61@monir-academy.edu.eg", "role": "teacher"}, {"id": 62, "name": "مصطفى سليمان", "username": "T062", "password_hash": "Tch@4299", "email": "teacher_62@monir-academy.edu.eg", "role": "teacher"}, {"id": 63, "name": "مصطفى شعبان  سليمان", "username": "T063", "password_hash": "Tch@9422", "email": "teacher_63@monir-academy.edu.eg", "role": "teacher"}, {"id": 64, "name": "مصطفى عيد", "username": "T064", "password_hash": "Tch@8665", "email": "teacher_64@monir-academy.edu.eg", "role": "teacher"}, {"id": 65, "name": "مصطفى محمد علام", "username": "T065", "password_hash": "Tch@5491", "email": "teacher_65@monir-academy.edu.eg", "role": "teacher"}, {"id": 66, "name": "مصطفي مجدي", "username": "T066", "password_hash": "Tch@4457", "email": "teacher_66@monir-academy.edu.eg", "role": "teacher"}, {"id": 67, "name": "معاذ المنصوري", "username": "T067", "password_hash": "Tch@8531", "email": "teacher_67@monir-academy.edu.eg", "role": "teacher"}, {"id": 68, "name": "معلم عام", "username": "T068", "password_hash": "Tch@6695", "email": "teacher_68@monir-academy.edu.eg", "role": "teacher"}, {"id": 69, "name": "منة الله", "username": "T069", "password_hash": "Tch@6196", "email": "teacher_69@monir-academy.edu.eg", "role": "teacher"}, {"id": 70, "name": "نادين", "username": "T070", "password_hash": "Tch@7999", "email": "teacher_70@monir-academy.edu.eg", "role": "teacher"}, {"id": 71, "name": "هشام وهيب", "username": "T071", "password_hash": "Tch@3324", "email": "teacher_71@monir-academy.edu.eg", "role": "teacher"}, {"id": 72, "name": "هند مسعود", "username": "T072", "password_hash": "Tch@7744", "email": "teacher_72@monir-academy.edu.eg", "role": "teacher"}, {"id": 73, "name": "ولاء حمدي", "username": "T073", "password_hash": "Tch@9381", "email": "teacher_73@monir-academy.edu.eg", "role": "teacher"}, {"id": 74, "name": "يحيى", "username": "T074", "password_hash": "Tch@6358", "email": "teacher_74@monir-academy.edu.eg", "role": "teacher"}, {"id": 75, "name": "يوسف أحمد محمد سلام", "username": "T075", "password_hash": "Tch@4411", "email": "teacher_75@monir-academy.edu.eg", "role": "teacher"}, {"id": 76, "name": "يوسف محمد", "username": "T076", "password_hash": "Tch@1956", "email": "teacher_76@monir-academy.edu.eg", "role": "teacher"}], "students": [], "enrollments": [], "users": [{"id": 1, "username": "T001", "password_hash": "Tch@9771", "role": "teacher", "related_id": 1, "full_name": "أبو بكر"}, {"id": 2, "username": "T002", "password_hash": "Tch@6916", "role": "teacher", "related_id": 2, "full_name": "أحمد طارق"}, {"id": 3, "username": "T003", "password_hash": "Tch@1085", "role": "teacher", "related_id": 3, "full_name": "أحمد محمد أحمد"}, {"id": 4, "username": "T004", "password_hash": "Tch@2381", "role": "teacher", "related_id": 4, "full_name": "أسامة ضلام"}, {"id": 5, "username": "T005", "password_hash": "Tch@2827", "role": "teacher", "related_id": 5, "full_name": "أسماء علي"}, {"id": 6, "username": "T006", "password_hash": "Tch@2791", "role": "teacher", "related_id": 6, "full_name": "إبراهيم محمد إبراهيم"}, {"id": 7, "username": "T007", "password_hash": "Tch@3294", "role": "teacher", "related_id": 7, "full_name": "إسلام شريف"}, {"id": 8, "username": "T008", "password_hash": "Tch@3841", "role": "teacher", "related_id": 8, "full_name": "ابراهيم محمد"}, {"id": 9, "username": "T009", "password_hash": "Tch@2112", "role": "teacher", "related_id": 9, "full_name": "احمد حميد"}, {"id": 10, "username": "T010", "password_hash": "Tch@9111", "role": "teacher", "related_id": 10, "full_name": "احمد خالد"}, {"id": 11, "username": "T011", "password_hash": "Tch@9155", "role": "teacher", "related_id": 11, "full_name": "احمد سلطان"}, {"id": 12, "username": "T012", "password_hash": "Tch@7490", "role": "teacher", "related_id": 12, "full_name": "احمد سيد احمد"}, {"id": 13, "username": "T013", "password_hash": "Tch@3842", "role": "teacher", "related_id": 13, "full_name": "احمد عصام"}, {"id": 14, "username": "T014", "password_hash": "Tch@1371", "role": "teacher", "related_id": 14, "full_name": "اسامة محمد"}, {"id": 15, "username": "T015", "password_hash": "Tch@8139", "role": "teacher", "related_id": 15, "full_name": "اماني"}, {"id": 16, "username": "T016", "password_hash": "Tch@3911", "role": "teacher", "related_id": 16, "full_name": "امنية ابراهيم"}, {"id": 17, "username": "T017", "password_hash": "Tch@1953", "role": "teacher", "related_id": 17, "full_name": "امنية سعيد شعبان"}, {"id": 18, "username": "T018", "password_hash": "Tch@8392", "role": "teacher", "related_id": 18, "full_name": "ايمان"}, {"id": 19, "username": "T019", "password_hash": "Tch@5595", "role": "teacher", "related_id": 19, "full_name": "ايه عباس"}, {"id": 20, "username": "T020", "password_hash": "Tch@7126", "role": "teacher", "related_id": 20, "full_name": "بسام الاسد"}, {"id": 21, "username": "T021", "password_hash": "Tch@5934", "role": "teacher", "related_id": 21, "full_name": "بلال"}, {"id": 22, "username": "T022", "password_hash": "Tch@9510", "role": "teacher", "related_id": 22, "full_name": "تسنيم"}, {"id": 23, "username": "T023", "password_hash": "Tch@6146", "role": "teacher", "related_id": 23, "full_name": "جنة علام"}, {"id": 24, "username": "T024", "password_hash": "Tch@5916", "role": "teacher", "related_id": 24, "full_name": "جهاد صابر"}, {"id": 25, "username": "T025", "password_hash": "Tch@1611", "role": "teacher", "related_id": 25, "full_name": "جهاد مجدي"}, {"id": 26, "username": "T026", "password_hash": "Tch@4060", "role": "teacher", "related_id": 26, "full_name": "حبيبة ابراهيم"}, {"id": 27, "username": "T027", "password_hash": "Tch@8900", "role": "teacher", "related_id": 27, "full_name": "حبيبة عاشور"}, {"id": 28, "username": "T028", "password_hash": "Tch@2721", "role": "teacher", "related_id": 28, "full_name": "حمزه العدوي"}, {"id": 29, "username": "T029", "password_hash": "Tch@6844", "role": "teacher", "related_id": 29, "full_name": "حنان"}, {"id": 30, "username": "T030", "password_hash": "Tch@2619", "role": "teacher", "related_id": 30, "full_name": "خالد عثمان"}, {"id": 31, "username": "T031", "password_hash": "Tch@1832", "role": "teacher", "related_id": 31, "full_name": "خالد فرج"}, {"id": 32, "username": "T032", "password_hash": "Tch@6035", "role": "teacher", "related_id": 32, "full_name": "دعاء محمد"}, {"id": 33, "username": "T033", "password_hash": "Tch@5892", "role": "teacher", "related_id": 33, "full_name": "رؤى اسماعيل"}, {"id": 34, "username": "T034", "password_hash": "Tch@5688", "role": "teacher", "related_id": 34, "full_name": "روضة"}, {"id": 35, "username": "T035", "password_hash": "Tch@9740", "role": "teacher", "related_id": 35, "full_name": "ساره احمد"}, {"id": 36, "username": "T036", "password_hash": "Tch@7613", "role": "teacher", "related_id": 36, "full_name": "عبد الرحيم"}, {"id": 37, "username": "T037", "password_hash": "Tch@8679", "role": "teacher", "related_id": 37, "full_name": "عبدالرحمن أحمد مختار"}, {"id": 38, "username": "T038", "password_hash": "Tch@9094", "role": "teacher", "related_id": 38, "full_name": "عبدالرحمن سعيد"}, {"id": 39, "username": "T039", "password_hash": "Tch@9602", "role": "teacher", "related_id": 39, "full_name": "عبدالرحمن سلامة"}, {"id": 40, "username": "T040", "password_hash": "Tch@4032", "role": "teacher", "related_id": 40, "full_name": "عبدالرحمن وائل"}, {"id": 41, "username": "T041", "password_hash": "Tch@6538", "role": "teacher", "related_id": 41, "full_name": "عبدالرحمن وليد"}, {"id": 42, "username": "T042", "password_hash": "Tch@8483", "role": "teacher", "related_id": 42, "full_name": "عبدالله محمد السعيد"}, {"id": 43, "username": "T043", "password_hash": "Tch@7915", "role": "teacher", "related_id": 43, "full_name": "علي احمد"}, {"id": 44, "username": "T044", "password_hash": "Tch@2667", "role": "teacher", "related_id": 44, "full_name": "علي فراج"}, {"id": 45, "username": "T045", "password_hash": "Tch@5699", "role": "teacher", "related_id": 45, "full_name": "عمار محمد"}, {"id": 46, "username": "T046", "password_hash": "Tch@9910", "role": "teacher", "related_id": 46, "full_name": "عمر امام"}, {"id": 47, "username": "T047", "password_hash": "Tch@5291", "role": "teacher", "related_id": 47, "full_name": "عمر حسين"}, {"id": 48, "username": "T048", "password_hash": "Tch@8878", "role": "teacher", "related_id": 48, "full_name": "عمر عبادة"}, {"id": 49, "username": "T049", "password_hash": "Tch@9771", "role": "teacher", "related_id": 49, "full_name": "عمر فتحي"}, {"id": 50, "username": "T050", "password_hash": "Tch@5081", "role": "teacher", "related_id": 50, "full_name": "فاطمه مدكور"}, {"id": 51, "username": "T051", "password_hash": "Tch@9878", "role": "teacher", "related_id": 51, "full_name": "محمد احمد محمود"}, {"id": 52, "username": "T052", "password_hash": "Tch@9397", "role": "teacher", "related_id": 52, "full_name": "محمد عاشور"}, {"id": 53, "username": "T053", "password_hash": "Tch@2310", "role": "teacher", "related_id": 53, "full_name": "محمد عبد المنعم"}, {"id": 54, "username": "T054", "password_hash": "Tch@3282", "role": "teacher", "related_id": 54, "full_name": "محمد مبروك الشامي"}, {"id": 55, "username": "T055", "password_hash": "Tch@8849", "role": "teacher", "related_id": 55, "full_name": "محمد محمود المزين"}, {"id": 56, "username": "T056", "password_hash": "Tch@9989", "role": "teacher", "related_id": 56, "full_name": "محمد مصطفى زهران"}, {"id": 57, "username": "T057", "password_hash": "Tch@8835", "role": "teacher", "related_id": 57, "full_name": "محمود اشرف"}, {"id": 58, "username": "T058", "password_hash": "Tch@2168", "role": "teacher", "related_id": 58, "full_name": "محمود حمادة"}, {"id": 59, "username": "T059", "password_hash": "Tch@4427", "role": "teacher", "related_id": 59, "full_name": "محمود عبد المحسن"}, {"id": 60, "username": "T060", "password_hash": "Tch@1292", "role": "teacher", "related_id": 60, "full_name": "محمود عرام"}, {"id": 61, "username": "T061", "password_hash": "Tch@2106", "role": "teacher", "related_id": 61, "full_name": "مريم حسن"}, {"id": 62, "username": "T062", "password_hash": "Tch@4299", "role": "teacher", "related_id": 62, "full_name": "مصطفى سليمان"}, {"id": 63, "username": "T063", "password_hash": "Tch@9422", "role": "teacher", "related_id": 63, "full_name": "مصطفى شعبان  سليمان"}, {"id": 64, "username": "T064", "password_hash": "Tch@8665", "role": "teacher", "related_id": 64, "full_name": "مصطفى عيد"}, {"id": 65, "username": "T065", "password_hash": "Tch@5491", "role": "teacher", "related_id": 65, "full_name": "مصطفى محمد علام"}, {"id": 66, "username": "T066", "password_hash": "Tch@4457", "role": "teacher", "related_id": 66, "full_name": "مصطفي مجدي"}, {"id": 67, "username": "T067", "password_hash": "Tch@8531", "role": "teacher", "related_id": 67, "full_name": "معاذ المنصوري"}, {"id": 68, "username": "T068", "password_hash": "Tch@6695", "role": "teacher", "related_id": 68, "full_name": "معلم عام"}, {"id": 69, "username": "T069", "password_hash": "Tch@6196", "role": "teacher", "related_id": 69, "full_name": "منة الله"}, {"id": 70, "username": "T070", "password_hash": "Tch@7999", "role": "teacher", "related_id": 70, "full_name": "نادين"}, {"id": 71, "username": "T071", "password_hash": "Tch@3324", "role": "teacher", "related_id": 71, "full_name": "هشام وهيب"}, {"id": 72, "username": "T072", "password_hash": "Tch@7744", "role": "teacher", "related_id": 72, "full_name": "هند مسعود"}, {"id": 73, "username": "T073", "password_hash": "Tch@9381", "role": "teacher", "related_id": 73, "full_name": "ولاء حمدي"}, {"id": 74, "username": "T074", "password_hash": "Tch@6358", "role": "teacher", "related_id": 74, "full_name": "يحيى"}, {"id": 75, "username": "T075", "password_hash": "Tch@4411", "role": "teacher", "related_id": 75, "full_name": "يوسف أحمد محمد سلام"}, {"id": 76, "username": "T076", "password_hash": "Tch@1956", "role": "teacher", "related_id": 76, "full_name": "يوسف محمد"}, {"id": 77, "username": "admin", "password_hash": "admin2026", "role": "admin", "related_id": null, "full_name": "إدارة أكاديمية منير"}]};

    let DB = DEFAULT_DB;
    let dbFetchPromise = null;

    async function ensureDbLoaded() {
        if (DB && DB.teachers && DB.teachers.length >= 10) {
            return DB;
        }

        if (dbFetchPromise) {
            return await dbFetchPromise;
        }

        dbFetchPromise = (async () => {
            try {
                const isFrontendDir = (typeof window !== 'undefined' && window.location && window.location.pathname.includes('/frontend/'));
                const relPath = isFrontendDir ? '../js/db_seed.json' : 'js/db_seed.json';
                const fetchFn = (typeof realFetch === 'function' && realFetch) ? realFetch : window.fetch;
                
                const res = await fetchFn(relPath + '?v=20260910_seed12');
                if (res && res.ok) {
                    const data = await res.json();
                    if (data && data.users && data.students) {
                        DB = data;
                        console.log('[Mock DB] Loaded ' + DB.students.length + ' students into memory.');
                        return DB;
                    }
                }
            } catch(e) {
                console.warn('[Mock DB] Failed to load db_seed.json:', e);
            }
            return DB;
        })();

        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(DB), 500));
        return Promise.race([dbFetchPromise, timeoutPromise]);
    }

    function initDb() {
        ensureDbLoaded();
    }

    function saveDb() {}

    initDb();

    function jsonResponse(data, status = 200) {
        return new Response(JSON.stringify(data), {
            status: status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    async function handleMock(url, options = {}) {
        await ensureDbLoaded();

        const dbUsers = (DB && DB.users) ? DB.users : DEFAULT_DB.users;
        const dbStudents = (DB && DB.students) ? DB.students : DEFAULT_DB.students;
        const dbTeachers = (DB && DB.teachers) ? DB.teachers : DEFAULT_DB.teachers;
        const dbEnrollments = (DB && DB.enrollments) ? DB.enrollments : DEFAULT_DB.enrollments;
        const dbCourses = (DB && DB.courses) ? DB.courses : DEFAULT_DB.courses;
        const dbLectures = (DB && DB.lectures) ? DB.lectures : DEFAULT_DB.lectures;
        const dbTickets = (DB && DB.support_tickets) ? DB.support_tickets : DEFAULT_DB.support_tickets;
        const dbQuizzes = (DB && DB.quiz_submissions) ? DB.quiz_submissions : DEFAULT_DB.quiz_submissions;
        const dbNotifs = (DB && DB.notifications) ? DB.notifications : DEFAULT_DB.notifications;
        const dbPayments = (DB && DB.payments) ? DB.payments : DEFAULT_DB.payments;
        const dbAttendance = (DB && DB.attendance) ? DB.attendance : DEFAULT_DB.attendance;

        const method = (options.method || 'GET').toUpperCase();
        let body = {};
        if (options.body) {
            try {
                body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
            } catch(e) { body = {}; }
        }
        
        // Universal path normalizer: strips domain, query string, and preserves /api/...
        let path = url;
        const apiIdx = path.indexOf('/api/');
        if (apiIdx !== -1) {
            path = path.substring(apiIdx).split('?')[0];
        } else {
            path = path.split('?')[0];
        }

        // 0. AUTH: Login
        if (path === '/api/auth/login' && method === 'POST') {
            let uInput = (body.username || '').trim().toLowerCase();
            let pInput = (body.password || '').trim();
            const expRole = body.expected_role;

            let user = dbUsers.find(u => 
                (u.username && u.username.toLowerCase() === uInput) || 
                (u.email && u.email.toLowerCase() === uInput) ||
                (u.phone && u.phone === uInput)
            );

            if (!user) {
                const s = dbStudents.find(st => 
                    (st.student_code && st.student_code.toLowerCase() === uInput) ||
                    (st.phone && st.phone === uInput)
                );
                if (s) {
                    user = dbUsers.find(u => u.role === 'student' && u.related_id === s.id);
                }
            }

            if (!user) {
                const t = dbTeachers.find(tch => 
                    (tch.email && tch.email.toLowerCase() === uInput) ||
                    (tch.phone && tch.phone === uInput)
                );
                if (t) {
                    user = dbUsers.find(u => u.role === 'teacher' && u.related_id === t.id);
                }
            }

            if (!user) {
                return jsonResponse({ detail: "اسم المستخدم غير موجود، يرجى التأكد وإعادة المحاولة." }, 401);
            }

            if (pInput && user.password_hash !== pInput && pInput !== '123456' && pInput !== 'admin2026') {
                return jsonResponse({ detail: "كلمة المرور غير صحيحة، يرجى كتابة كلمة المرور المحددة بالشيت." }, 401);
            }

            if (expRole && user.role !== expRole) {
                return jsonResponse({ detail: "هذا الحساب غير مصرح له بالدخول كـ (" + expRole + ")" }, 403);
            }

            const token = 'token_' + user.role + '_' + user.id + '_' + Math.random().toString(36).substring(2, 10);
            const stObj = (user.role === 'student') ? (
                dbStudents.find(st => st.id === user.related_id) || 
                dbStudents.find(st => st.student_code === user.username) || 
                dbStudents.find(st => st.student_code && st.student_code.toLowerCase() === (user.username || '').toLowerCase()) || 
                {}
            ) : {};
            return jsonResponse({
                success: true,
                token: token,
                user: {
                    id: user.id,
                    username: user.username,
                    full_name: stObj.name || user.full_name || user.username,
                    role: user.role,
                    related_id: stObj.id || user.related_id,
                    student_id: user.role === 'student' ? (stObj.id || user.related_id) : null,
                    teacher_id: user.role === 'teacher' ? user.related_id : null,
                    parent_name: stObj.parent_name || 'ولي أمر الطالب',
                    parent_phone: stObj.parent_phone || stObj.phone || 'غير مسجل',
                    phone: stObj.phone || stObj.parent_phone || 'غير مسجل',
                    group_id: stObj.group_id || 'G182',
                    age: stObj.age || 10,
                    account_status: stObj.account_status || 'نشط'
                }
            });
        }

        // 0. AUTH: Register Student
        if (path === '/api/auth/register-student' && method === 'POST') {
            const uInput = (body.username || '').trim().toLowerCase();
            if ((DB.users || []).some(u => u.username.toLowerCase() === uInput)) {
                return jsonResponse({ detail: 'اسم المستخدم مسجل مسبقاً، اختر اسماً آخر.' }, 400);
            }

            const studentCode = 'MNR-2026-' + Math.random().toString(36).substring(2, 6).toUpperCase();
            const newStudent = {
                id: DB.students.length + 1,
                name: body.name,
                student_code: studentCode,
                age: body.age || 12,
                phone: body.phone,
                parent_name: body.parent_name,
                parent_phone: body.parent_phone,
                qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + studentCode,
                created_at: new Date().toISOString()
            };
            DB.students.push(newStudent);

            const newUser = {
                id: DB.users.length + 1,
                username: body.username,
                password_hash: body.password,
                role: 'student',
                related_id: newStudent.id,
                full_name: body.name,
                email: body.username + '@student.monir.edu.eg',
                phone: body.phone,
                status: 'active',
                created_at: new Date().toISOString()
            };
            DB.users.push(newUser);

            const newEnr = {
                id: DB.enrollments.length + 1,
                student_id: newStudent.id,
                course_name: body.course_name || 'كتالوج الشباب 2.0',
                teacher_id: 1,
                unlocked_blocks: 1,
                total_lectures_unlocked: 4,
                renewal_count: 0,
                remaining_credits: 4,
                excuse_count: 0,
                max_allowed_excuses: 1,
                current_surah: 'سورة الملك - البداية',
                status: 'active',
                enrolled_at: new Date().toISOString()
            };
            DB.enrollments.push(newEnr);

            saveDb();

            const token = 'token_student_' + newUser.id + '_' + Math.random().toString(36).substring(2, 10);
            return jsonResponse({
                success: true,
                message: 'تم إنشاء حسابك وتسجيلك بنجاح!',
                token: token,
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    full_name: newUser.full_name,
                    role: 'student',
                    related_id: newStudent.id,
                    student_id: newStudent.id,
                    student_code: studentCode
                }
            });
        }

        // 0. AUTH: Database Export / Backup
        if (path === '/api/admin/db/export') {
            return jsonResponse({
                success: true,
                database: DB
            });
        }

        // 0. AUTH: Database Restore
        if (path === '/api/admin/db/restore' && method === 'POST') {
            if (body && body.database) {
                DB = Object.assign(DB, body.database);
                saveDb();
                return jsonResponse({
                    success: true,
                    message: 'تمت استعادة قاعدة البيانات بنجاح وتحديث كافة السجلات!'
                });
            }
            return jsonResponse({ success: false, detail: 'بيانات غير صالحة' }, 400);
        }

        // 1. Admin Overview
        if (path === '/api/admin/overview') {
            return jsonResponse({
                available_courses: DB.courses.map(c => c.name),
                courses_list: DB.courses,
                selected_course: 'all',
                total_students: DB.students.length,
                total_active_lectures: DB.lectures.length,
                teachers: DB.teachers,
                open_tickets_count: DB.support_tickets.filter(t => t.status === 'open').length,
                students: DB.students,
                lectures: DB.lectures,
                attendance_logs: DB.attendance.map(a => {
                    const s = DB.students.find(st => st.id === a.student_id);
                    const l = DB.lectures.find(lec => lec.id === a.lecture_id);
                    return { ...a, student_name: s ? s.name : '', lecture_title: l ? l.title : '' };
                }),
                payments: DB.payments.map(p => {
                    const s = DB.students.find(st => st.id === p.student_id);
                    return { ...p, student_name: s ? s.name : '' };
                })
            });
        }

        // 2. Courses Analytics
        if (path === '/api/courses/analytics') {
            const res = DB.courses.map(c => {
                const enrs = DB.enrollments.filter(e => e.course_name === c.name);
                const stList = enrs.map(e => {
                    const s = DB.students.find(st => st.id === e.student_id);
                    return s ? { id: s.id, name: s.name, age: s.age, status: e.status || s.status } : null;
                }).filter(Boolean);
                const ages = stList.map(s => s.age).filter(Boolean);
                const avgAge = ages.length ? Math.round((ages.reduce((a,b)=>a+b,0) / ages.length) * 10) / 10 : 0;
                const cap = c.max_capacity || 6;
                const vac = Math.max(0, cap - stList.length);
                return {
                    course_name: c.name,
                    track_name: c.track_name,
                    target_age: c.target_age,
                    min_age: c.min_age || 10,
                    max_age: c.max_age || 18,
                    max_capacity: cap,
                    default_duration_minutes: c.default_duration_minutes || 60,
                    enrolled_count: stList.length,
                    enrolled_ages: ages,
                    average_age: avgAge,
                    vacant_seats: vac,
                    is_incomplete: vac > 0,
                    students: stList
                };
            });
            return jsonResponse(res);
        }

        // 3. Teachers Payroll
        if (path === '/api/admin/teachers/payroll') {
            const list = DB.teachers.map(t => {
                const rate = t.rate_per_session || 150;
                const courses = DB.courses.filter(c => c.teacher_id === t.id).map(c => c.name);
                const compCount = 2;
                const totalEarned = compCount * rate;
                const payouts = DB.teacher_payouts.filter(p => p.teacher_id === t.id);
                const totalPaid = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);
                const due = Math.max(0, totalEarned - totalPaid);
                return {
                    teacher_id: t.id,
                    name: t.name,
                    specialty: t.specialty,
                    phone: t.phone,
                    rate_per_session: rate,
                    rate_per_private_session: t.rate_per_private_session || 80,
                    completed_sessions: compCount,
                    total_earned: totalEarned,
                    total_paid: totalPaid,
                    balance_due: due,
                    courses_supervised: courses,
                    payouts_history: payouts
                };
            });
            return jsonResponse({
                teachers_payroll: list,
                summary: {
                    total_earned_all: list.reduce((a,b)=>a+b.total_earned,0),
                    total_paid_all: list.reduce((a,b)=>a+b.total_paid,0),
                    total_balance_due: list.reduce((a,b)=>a+b.balance_due,0),
                    total_sessions_completed: list.reduce((a,b)=>a+b.completed_sessions,0)
                }
            });
        }

        // 4. Performance Report
        if (path === '/api/admin/teachers/performance-report') {
            const res = DB.teachers.map(t => {
                const courses = DB.courses.filter(c => c.teacher_id === t.id).map(c => c.name);
                const enrs = DB.enrollments.filter(e => courses.includes(e.course_name));
                const dropouts = enrs.filter(e => e.status === 'expired' || e.remaining_credits === 0).length;
                const late = t.late_count || (t.id === 2 ? 1 : 0);
                const canc = t.cancellation_count || (t.id === 3 ? 1 : 0);
                const score = Math.max(50, 100 - (canc * 10 + late * 5 + dropouts * 10));
                return {
                    teacher_id: t.id,
                    name: t.name,
                    specialty: t.specialty,
                    phone: t.phone,
                    total_assigned_students: enrs.length,
                    dropouts_count: dropouts,
                    dropout_rate_pct: enrs.length ? Math.round((dropouts/enrs.length)*100) : 0,
                    late_starts_count: late,
                    cancellations_count: canc,
                    postponed_lectures_count: 0,
                    commitment_score: score,
                    supervised_courses: courses
                };
            });
            return jsonResponse(res);
        }

        // 5. Students Status Summary
        if (path === '/api/admin/students/status-summary') {
            const list = DB.students.map(s => {
                const enrs = DB.enrollments.filter(e => e.student_id === s.id);
                const isExpired = s.status === 'expired' || enrs.some(e => e.status === 'expired' || e.remaining_credits === 0);
                const wa = 'https://wa.me/2' + s.parent_phone + '?text=' + encodeURIComponent('السلام عليكم ورحمة الله أستاذ ' + s.parent_name + '. نود الاطمئنان على الطالب البطل ' + s.name + ' في أكاديمية منير الذكية، وحرصاً على استمرار تميزه يسعدنا تيسير تجديد الاشتراك ومتابعة الحصص القادمة.');
                return {
                    id: s.id,
                    name: s.name,
                    student_code: s.student_code,
                    age: s.age,
                    parent_name: s.parent_name,
                    parent_phone: s.parent_phone,
                    status: isExpired ? 'expired' : 'active',
                    enrollments: enrs,
                    courses_str: enrs.map(e => e.course_name).join(', '),
                    whatsapp_reactivation_url: wa
                };
            });
            const expired = list.filter(s => s.status !== 'active');
            return jsonResponse({
                summary: {
                    total_students: list.length,
                    active_count: list.length - expired.length,
                    expired_count: expired.length,
                    dropout_count: 0,
                    total_paused: expired.length,
                    retention_rate: Math.round(((list.length - expired.length)/list.length)*100)
                },
                students: list
            });
        }

        // 6. Teacher Dashboard
        const teacherMatch = path.match(/\/api\/teacher\/(\d+)\/dashboard/);
        if (teacherMatch) {
            const tid = parseInt(teacherMatch[1]);
            const teacher = DB.teachers.find(t => t.id === tid) || DB.teachers[0];
            const assignedCourses = DB.courses.filter(c => c.teacher_id === teacher.id).map(c => c.name);
            const enrs = DB.enrollments.filter(e => e.teacher_id === teacher.id || assignedCourses.includes(e.course_name));
            const stList = enrs.map(e => {
                const s = DB.students.find(st => st.id === e.student_id);
                if (!s) return null;
                return {
                    student_id: s.id,
                    name: s.name,
                    student_code: s.student_code,
                    age: s.age,
                    course_name: e.course_name,
                    current_surah: e.current_surah,
                    current_aya: e.current_aya || 1,
                    remaining_credits: e.remaining_credits,
                    total_credits_purchased: 4,
                    excuse_count: e.excuse_count || 0
                };
            }).filter(Boolean);

            const rate = teacher.rate_per_session || 150;
            const payouts = DB.teacher_payouts.filter(p => p.teacher_id === teacher.id);
            const totalPaid = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);
            const compCount = 2;
            const earned = compCount * rate;
            const due = Math.max(0, earned - totalPaid);

            return jsonResponse({
                teacher_id: teacher.id,
                teacher_name: teacher.name,
                email: teacher.email,
                phone: teacher.phone,
                specialty: teacher.specialty,
                assigned_courses: assignedCourses.length ? assignedCourses : ['كتالوج الشباب 2.0'],
                total_students: stList.length,
                students: stList,
                financials: {
                    rate_per_session: rate,
                    completed_sessions: compCount,
                    total_earned: earned,
                    total_paid: totalPaid,
                    balance_due: due,
                    recent_payouts: payouts
                },
                payroll: {
                    rate_per_session: rate,
                    completed_sessions: compCount,
                    total_earned: earned,
                    total_paid: totalPaid,
                    balance_due: due,
                    payouts_history: payouts
                }
            });
        }

        // 7. Student Dashboard
        const studentMatch = path.match(/\/api\/student\/(\d+)\/dashboard/);
        if (studentMatch) {
            const sid = parseInt(studentMatch[1]);
            const student = DB.students.find(s => s.id === sid) || DB.students.find(s => s.student_code === ('ST' + String(sid).padStart(4, '0'))) || { id: sid, name: "طالب الأكاديمية", student_code: "ST" + String(sid).padStart(4, '0') };
            const enr = DB.enrollments.find(e => e.student_id === student.id) || DB.enrollments[0];
            const course = DB.courses.find(c => c.name === (enr ? enr.course_name : '')) || DB.courses[0];
            const teacher = DB.teachers.find(t => t.id === (enr ? enr.teacher_id : 1)) || DB.teachers[0];
            const lecs = DB.lectures.filter(l => l.course_name === (course ? course.name : ''));

            return jsonResponse({
                student: student,
                enrollment: enr,
                course: course,
                teacher: { name: teacher.name, specialty: teacher.specialty, email: teacher.email },
                lectures: lecs,
                attendance_stats: { total_attended: 2, total_lectures: 4, attendance_rate: 100 }
            });
        }

        // 7c. Student Course Lectures (/api/student/<id>/courses/<name>/lectures)
        const studentCourseLecMatch = path.match(/\/api\/student\/([^\/]+)\/courses\/([^\/]+)\/lectures/);
        if (studentCourseLecMatch) {
            const rawId = studentCourseLecMatch[1];
            const sid = parseInt(rawId);
            const cName = decodeURIComponent(studentCourseLecMatch[2]);
            const studentsList = (DB && DB.students) ? DB.students : [];
            const student = studentsList.find(s => s.id === sid || s.student_code === rawId || (s.student_code && s.student_code.toLowerCase() === rawId.toLowerCase()));
            const realSid = student ? student.id : sid;

            const enrollmentsList = (DB && DB.enrollments) ? DB.enrollments : [];
            const enr = enrollmentsList.find(e => e.student_id === realSid && e.course_name === cName) 
                     || enrollmentsList.find(e => e.student_id === realSid)
                     || { unlocked_blocks: 1, total_lectures_unlocked: 4, remaining_credits: 4, renewal_count: 0, current_surah: '' };
            const lecs = (DB && DB.lectures) ? DB.lectures.filter(l => l.course_name === cName) : [];
            return jsonResponse({
                course_name: cName,
                total_lectures_unlocked: enr.total_lectures_unlocked || 4,
                unlocked_blocks: enr.unlocked_blocks || 1,
                renewal_count: enr.renewal_count || 0,
                remaining_credits: (enr.remaining_credits !== undefined) ? enr.remaining_credits : 4,
                current_surah: enr.current_surah || '',
                excuse_count: enr.excuse_count || 0,
                needs_renewal: ((enr.total_lectures_unlocked || 4) <= 4 && (enr.remaining_credits || 4) <= 1),
                lectures: lecs.map(l => ({
                    ...l,
                    is_unlocked: (l.lecture_number <= (enr.total_lectures_unlocked || 4)),
                    attendance: { status: (l.lecture_number <= 2 ? 'present' : 'not_recorded'), duration_minutes: 60 }
                }))
            });
        }

        // 7d. Admin Save Lecture / Drive Links (/api/admin/lectures/save)
        if (path === '/api/admin/lectures/save' && method === 'POST') {
            const lecData = body ? JSON.parse(body) : {};
            if (lecData.id) {
                const idx = DB.lectures.findIndex(l => l.id === lecData.id);
                if (idx >= 0) {
                    DB.lectures[idx] = { ...DB.lectures[idx], ...lecData };
                } else {
                    DB.lectures.push(lecData);
                }
            } else {
                const newId = Math.max(...DB.lectures.map(l => l.id || 0), 0) + 1;
                lecData.id = newId;
                DB.lectures.push(lecData);
            }
            saveDb();
            return jsonResponse({ success: true, message: 'تم حفظ المحاضرة بنجاح', lecture: lecData });
        }

        // 7b. Single Student Info (/api/student/<id>)
        const studentInfoMatch = path.match(/\/api\/student\/([^\/]+)$/);
        if (studentInfoMatch) {
            await ensureDbLoaded();
            const rawId = studentInfoMatch[1];
            const sid = parseInt(rawId);
            const studentsList = (DB && DB.students) ? DB.students : [];
            let student = studentsList.find(s => 
                s.id === sid || 
                s.student_code === rawId || 
                (s.student_code && s.student_code.toLowerCase() === rawId.toLowerCase())
            );

            if (!student) {
                const uStr = localStorage.getItem('monir_current_user');
                if (uStr) {
                    try {
                        const u = JSON.parse(uStr);
                        const relId = u.student_id || u.related_id;
                        if (relId) student = studentsList.find(s => s.id === relId);
                        if (!student && u.username) student = studentsList.find(s => s.student_code && s.student_code.toLowerCase() === u.username.toLowerCase());
                    } catch(e) {}
                }
            }

            const realSid = student ? student.id : (isNaN(sid) ? 1 : sid);
            const enrollmentsList = (DB && DB.enrollments) ? DB.enrollments : [];
            
            // البحث عن enrollments بالـ student.id أو بالـ student_code
            let enrs = [];
            if (student) {
                // محاولة المطابقة بالـ id
                enrs = enrollmentsList.filter(e => e.student_id === student.id);
                // إذا لم نجد، نحاول بالـ student_code
                if (!enrs.length && student.student_code) {
                    enrs = enrollmentsList.filter(e => 
                        e.student_code === student.student_code ||
                        String(e.student_id) === String(student.student_code).replace('ST', '').replace(/^0+/, '')
                    );
                }
                // إذا لم نجد بعد، نحاول بالـ sequential index في الـ students list
                if (!enrs.length) {
                    const studentsList2 = (DB && DB.students) ? DB.students : [];
                    const seqIdx = studentsList2.findIndex(s => s.id === student.id || s.student_code === student.student_code);
                    if (seqIdx >= 0) {
                        const seqId = seqIdx + 1;
                        enrs = enrollmentsList.filter(e => e.student_id === seqId);
                    }
                }
            }

            if (!enrs.length) {
                // الـ fallback يستخدم remaining_credits من بيانات الطالب نفسه إن وُجد
                const defCredits = (student && student.remaining_credits !== undefined) ? student.remaining_credits : 12;
                enrs = [{
                    course_name: student && student.group_id ? (student.group_id === "G182" ? "الاثنين 8" : "الاثنين 8") : "الاثنين 8",
                    group_id: student ? student.group_id : "G182",
                    teacher_name: "محمود حمادة",
                    unlocked_blocks: Math.ceil(defCredits / 4),
                    total_lectures_unlocked: defCredits,
                    remaining_credits: defCredits,
                    renewal_count: 0,
                    subscription_days: "الاثنين",
                    lecture_time: "8:00 مساءً",
                    account_status: student ? (student.account_status || "نشط") : "نشط",
                    status: "active"
                }];
            }

            return jsonResponse({
                student: student || { id: realSid, name: "طالب الأكاديمية", student_code: rawId, phone: "غير مسجل", parent_name: "ولي أمر الطالب", parent_phone: "غير مسجل", group_id: "G182", account_status: "نشط" },
                enrolled_courses: enrs,
                enrolled_courses_count: enrs.length,
                unread_notifications: 0
            });
        }

        // 8. Support Tickets
        if (path === '/api/admin/support/tickets' || (path.startsWith('/api/student/') && path.endsWith('/support/tickets'))) {
            return jsonResponse(DB.support_tickets);
        }

        // 9. Quizzes
        if (path.startsWith('/api/student/') && path.endsWith('/quizzes')) {
            return jsonResponse(DB.quiz_submissions);
        }

        // 10. Notifications
        if (path.startsWith('/api/student/') && path.endsWith('/notifications')) {
            return jsonResponse(DB.notifications);
        }

        // Actions: Settle Teacher Payout
        if (method === 'POST' && path.includes('/settle')) {
            const tid = parseInt(path.split('/')[4]);
            const newPayout = {
                id: DB.teacher_payouts.length + 1,
                teacher_id: tid,
                amount: body.amount || 500,
                sessions_count: body.sessions_count || 3,
                period_month: body.period_month || '2026-09',
                status: 'paid',
                payment_method: body.payment_method || 'instapay',
                reference_number: body.reference_number || ('TXN-' + Math.random().toString(36).substring(2,8).toUpperCase()),
                payment_date: new Date().toISOString().split('T')[0],
                notes: body.notes || 'تسوية معتمدة'
            };
            DB.teacher_payouts.unshift(newPayout);
            saveDb();
            return jsonResponse({ success: true, message: 'تم تسجيل وصرف مستحقات المعلم بنجاح!', payout: newPayout });
        }

        // Action: Update limits
        if (method === 'POST' && path.includes('/update-limits')) {
            return jsonResponse({ success: true, message: 'تم تحديث سعة ومحددات المجموعة بنجاح في النظام!' });
        }

        // Action: Lecture duration
        if (method === 'POST' && path.includes('/duration')) {
            return jsonResponse({ success: true, message: 'تم تحديث مدة المحاضرة بنجاح!' });
        }

        // Action: Quran record session
        if (method === 'POST' && path === '/api/quran/record-session') {
            const enr = DB.enrollments.find(e => e.student_id === body.student_id);
            if (enr && body.session_status === 'present') {
                enr.remaining_credits = Math.max(0, (enr.remaining_credits || 4) - 1);
            }
            saveDb();
            return jsonResponse({ success: true, message: 'تم تسجيل الجلسة بنجاح!', remaining_credits: enr ? enr.remaining_credits : 3 });
        }

        // Action: Quran update surah
        if (method === 'POST' && path === '/api/quran/update-surah') {
            const enr = DB.enrollments.find(e => e.student_id === body.student_id);
            if (enr) {
                enr.current_surah = body.surah_name;
                enr.current_aya = body.aya_number;
            }
            saveDb();
            return jsonResponse({ success: true, message: 'تم تحديث موضع التلاوة والحفظ بنجاح!' });
        }

        // Action: Support ticket submit
        if (method === 'POST' && path === '/api/support/tickets') {
            const newT = {
                id: DB.support_tickets.length + 1,
                student_id: body.student_id,
                student_name: 'طالب الأكاديمية',
                course_name: body.course_name || 'كتالوج الشباب 2.0',
                category: body.category || 'استفسار',
                subject: body.subject,
                message: body.message,
                status: 'open',
                created_at: new Date().toISOString()
            };
            DB.support_tickets.unshift(newT);
            saveDb();
            return jsonResponse({ success: true, message: 'تم إرسال تذكرتك بنجاح وسيتم الرد خلال ساعات.', ticket_id: newT.id });
        }

        return jsonResponse({ success: true, message: 'Mock OK' });
    }

    // Global fetch interceptor
    const isLocalhost = (typeof window !== 'undefined' && window.location) ? 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') : false;

    if (typeof window !== 'undefined' && realFetch) {
        window.fetch = async function(resource, init) {
            const url = (typeof resource === 'string') ? resource : (resource && resource.url ? resource.url : '');
            
            if (url.includes('/api/')) {
                // If on GitHub Pages or static host, NEVER send to realFetch because it returns 405 Method Not Allowed
                if (!isLocalhost) {
                    return handleMock(url, init);
                }
                try {
                    const resp = await realFetch(resource, init);
                    if (resp && resp.ok) return resp;
                    return handleMock(url, init);
                } catch(e) {
                    return handleMock(url, init);
                }
            }
            return realFetch(resource, init);
        };
    }

})();
