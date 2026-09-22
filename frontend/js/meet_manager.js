// Mounir Academy — Central Live Video & Meet Group Manager (v4.0 Google Meet Multi-Teacher Integration)
(function() {
    const STORAGE_KEY = 'monir_group_meet_links';

    // Official Teacher Google Meet Registry (45+ Confirmed Teachers)
    window.TEACHER_MEET_LINKS = {
        "52": "https://meet.google.com/cvf-qbuj-ojn",
        "محمد عاشور": "https://meet.google.com/cvf-qbuj-ojn",
        "51": "https://meet.google.com/wjf-ksyv-qfa",
        "محمد احمد محمود": "https://meet.google.com/wjf-ksyv-qfa",
        "65": "https://meet.google.com/svv-nrcf-fzp",
        "مصطفى محمد علام": "https://meet.google.com/svv-nrcf-fzp",
        "مصطفى علام": "https://meet.google.com/svv-nrcf-fzp",
        "9": "https://meet.google.com/dee-yvud-mdz",
        "احمد حميد": "https://meet.google.com/dee-yvud-mdz",
        "38": "https://meet.google.com/sis-zeuj-pat",
        "عبدالرحمن سعيد": "https://meet.google.com/sis-zeuj-pat",
        "59": "https://meet.google.com/axh-kxzj-ayt",
        "محمود عبد المحسن": "https://meet.google.com/axh-kxzj-ayt",
        "27": "https://meet.google.com/otm-vpcb-ipu",
        "حبيبة عاشور": "https://meet.google.com/otm-vpcb-ipu",
        "2": "https://meet.google.com/cxu-trbc-rmu",
        "أحمد طارق": "https://meet.google.com/cxu-trbc-rmu",
        "احمد طارق": "https://meet.google.com/cxu-trbc-rmu",
        "37": "https://meet.google.com/wwx-iqiq-afv",
        "عبدالرحمن أحمد مختار": "https://meet.google.com/wwx-iqiq-afv",
        "عبدالرحمن مختار": "https://meet.google.com/wwx-iqiq-afv",
        "72": "https://meet.google.com/hjd-tibr-oxp",
        "هند مسعود": "https://meet.google.com/hjd-tibr-oxp",
        "32": "https://meet.google.com/zhs-zpdr-jfe",
        "دعاء محمد": "https://meet.google.com/zhs-zpdr-jfe",
        "62": "https://meet.google.com/iyp-swmh-erq",
        "مصطفى سليمان": "https://meet.google.com/iyp-swmh-erq",
        "12": "https://meet.google.com/qui-yusz-nfn",
        "T012": "https://meet.google.com/qui-yusz-nfn",
        "احمد سيد احمد": "https://meet.google.com/qui-yusz-nfn",
        "أحمد سيد أحمد": "https://meet.google.com/qui-yusz-nfn",
        "احمد السيد": "https://meet.google.com/qui-yusz-nfn",
        "أحمد السيد": "https://meet.google.com/qui-yusz-nfn",
        "احمد سيد": "https://meet.google.com/qui-yusz-nfn",
        "أحمد سيد": "https://meet.google.com/qui-yusz-nfn",
        "46": "https://meet.google.com/kob-ahzi-ntd",
        "عمر امام": "https://meet.google.com/kob-ahzi-ntd",
        "عمر أمام": "https://meet.google.com/kob-ahzi-ntd",
        "55": "https://meet.google.com/cyc-juqz-mze",
        "محمد محمود المزين": "https://meet.google.com/cyc-juqz-mze",
        "35": "https://meet.google.com/bwj-vdnf-rds",
        "ساره احمد": "https://meet.google.com/bwj-vdnf-rds",
        "سارة احمد": "https://meet.google.com/bwj-vdnf-rds",
        "1": "https://meet.google.com/too-pqty-mxb",
        "أبو بكر": "https://meet.google.com/too-pqty-mxb",
        "ابو بكر": "https://meet.google.com/too-pqty-mxb",
        "29": "https://meet.google.com/yvt-tknr-rmj",
        "حنان": "https://meet.google.com/yvt-tknr-rmj",
        "45": "https://meet.google.com/nnx-yjkk-ojm",
        "عمار محمد": "https://meet.google.com/nnx-yjkk-ojm",
        "40": "https://meet.google.com/naw-ykhz-npz",
        "عبدالرحمن وائل": "https://meet.google.com/naw-ykhz-npz",
        "6": "https://meet.jit.si/MounirAcademy_Group_G353",
        "إبراهيم محمد إبراهيم": "https://meet.jit.si/MounirAcademy_Group_G353",
        "ابراهيم محمد ابراهيم": "https://meet.jit.si/MounirAcademy_Group_G353",
        "50": "https://meet.google.com/tng-pffs-mux",
        "فاطمه مدكور": "https://meet.google.com/tng-pffs-mux",
        "فاطمة مدكور": "https://meet.google.com/tng-pffs-mux",
        "33": "https://meet.google.com/jjx-qoxf-dyu",
        "رؤى اسماعيل": "https://meet.google.com/jjx-qoxf-dyu",
        "رؤي": "https://meet.google.com/jjx-qoxf-dyu",
        "58": "https://meet.google.com/qaf-qnsc-zsn",
        "محمود حمادة": "https://meet.google.com/qaf-qnsc-zsn",
        "محمود حماد": "https://meet.google.com/qaf-qnsc-zsn",
        "5": "https://meet.google.com/wvq-kmvm-spa",
        "أسماء علي": "https://meet.google.com/wvq-kmvm-spa",
        "اسماء": "https://meet.google.com/wvq-kmvm-spa",
        "34": "https://meet.google.com/gvy-kqij-biy",
        "روضة": "https://meet.google.com/gvy-kqij-biy",
        "17": "https://meet.google.com/gez-cjzc-rce",
        "امنية سعيد شعبان": "https://meet.google.com/gez-cjzc-rce",
        "أمنية سعيد": "https://meet.google.com/gez-cjzc-rce",
        "49": "https://meet.google.com/rhg-obqw-qdc",
        "عمر فتحي": "https://meet.google.com/rhg-obqw-qdc",
        "54": "https://meet.google.com/rzu-rdff-eah",
        "محمد مبروك الشامي": "https://meet.google.com/rzu-rdff-eah",
        "محمد مبروك": "https://meet.google.com/rzu-rdff-eah",
        "36": "https://meet.google.com/mux-tvsd-sno",
        "عبد الرحيم": "https://meet.google.com/mux-tvsd-sno",
        "عبدالرحيم": "https://meet.google.com/mux-tvsd-sno",
        "28": "https://meet.google.com/hcm-wvvv-gwa",
        "حمزه العدوي": "https://meet.google.com/hcm-wvvv-gwa",
        "61": "https://meet.google.com/dmb-zvkv-jbh",
        "مريم حسن": "https://meet.google.com/dmb-zvkv-jbh",
        "43": "https://meet.google.com/emr-mdch-fzf",
        "علي احمد": "https://meet.google.com/emr-mdch-fzf",
        "39": "https://meet.google.com/fsx-gnjj-aay",
        "عبدالرحمن سلامة": "https://meet.google.com/fsx-gnjj-aay",
        "عبدالرحمن سلامه": "https://meet.google.com/fsx-gnjj-aay",
        "14": "https://meet.google.com/hhn-sbgb-dgx",
        "اسامة محمد": "https://meet.google.com/hhn-sbgb-dgx",
        "أسامة محمد": "https://meet.google.com/hhn-sbgb-dgx",
        "26": "https://meet.google.com/owd-dajv-xzq",
        "حبيبة ابراهيم": "https://meet.google.com/owd-dajv-xzq",
        "76": "https://meet.google.com/cmv-okhf-eoq",
        "يوسف محمد": "https://meet.google.com/cmv-okhf-eoq",
        "4": "https://meet.google.com/sgg-rwjd-hze",
        "أسامة ضلام": "https://meet.google.com/sgg-rwjd-hze",
        "63": "https://meet.google.com/ren-seiz-cti",
        "مصطفى شعبان  سليمان": "https://meet.google.com/ren-seiz-cti",
        "مصطفى شعبان سليمان": "https://meet.google.com/ren-seiz-cti",
        "19": "https://meet.google.com/bqx-wque-omv",
        "ايه عباس": "https://meet.google.com/bqx-wque-omv",
        "اية عباس": "https://meet.google.com/bqx-wque-omv",
        "70": "https://meet.google.com/oym-upeq-byn",
        "نادين": "https://meet.google.com/oym-upeq-byn",
        "23": "https://meet.google.com/cgx-mtfe-sfb",
        "جنة علام": "https://meet.google.com/cgx-mtfe-sfb",
        "جنه علام": "https://meet.google.com/cgx-mtfe-sfb",
        "25": "https://meet.google.com/pfw-zkij-ccs",
        "جهاد مجدي": "https://meet.google.com/pfw-zkij-ccs",
        "18": "https://meet.google.com/ywg-wnpp-zqb",
        "ايمان": "https://meet.google.com/ywg-wnpp-zqb",
        "8": "https://meet.google.com/ogk-gsek-mfg",
        "ابراهيم محمد": "https://meet.google.com/ogk-gsek-mfg",
        "منة محمد": "https://meet.google.com/obo-wttk-cwg",
        "منة الله": "https://meet.google.com/obo-wttk-cwg",
        "69": "https://meet.google.com/obo-wttk-cwg",
        "أحمد السيد": "https://meet.google.com/qui-yusz-nfn",
        "عبد الرحمن مختار": "https://meet.google.com/wwx-iqiq-afv",
        "أسماء": "https://meet.google.com/wvq-kmvm-spa",
        "رؤى": "https://meet.google.com/jjx-qoxf-dyu",
        "امنية سعيد": "https://meet.google.com/gez-cjzc-rce"
};

    // Official Group to Meet Mapping (257 Groups belonging to all configured Teachers)
    const OFFICIAL_GROUP_MEET_LINKS = {
        "G044": "https://meet.google.com/cvf-qbuj-ojn",
        "G140": "https://meet.google.com/cvf-qbuj-ojn",
        "G141": "https://meet.google.com/cvf-qbuj-ojn",
        "G154": "https://meet.google.com/cvf-qbuj-ojn",
        "G161": "https://meet.google.com/cvf-qbuj-ojn",
        "G178": "https://meet.google.com/cvf-qbuj-ojn",
        "G238": "https://meet.google.com/cvf-qbuj-ojn",
        "G256": "https://meet.google.com/cvf-qbuj-ojn",
        "G272": "https://meet.google.com/cvf-qbuj-ojn",
        "G287": "https://meet.google.com/cvf-qbuj-ojn",
        "G331": "https://meet.google.com/cvf-qbuj-ojn",
        "G426": "https://meet.google.com/cvf-qbuj-ojn",
        "G110": "https://meet.google.com/wjf-ksyv-qfa",
        "G173": "https://meet.google.com/wjf-ksyv-qfa",
        "G422": "https://meet.google.com/wjf-ksyv-qfa",
        "G314": "https://meet.google.com/svv-nrcf-fzp",
        "G053": "https://meet.google.com/dee-yvud-mdz",
        "G068": "https://meet.google.com/dee-yvud-mdz",
        "G270": "https://meet.google.com/dee-yvud-mdz",
        "G364": "https://meet.google.com/dee-yvud-mdz",
        "G398": "https://meet.google.com/dee-yvud-mdz",
        "G022": "https://meet.google.com/sis-zeuj-pat",
        "G036": "https://meet.google.com/sis-zeuj-pat",
        "G150": "https://meet.google.com/sis-zeuj-pat",
        "G157": "https://meet.google.com/sis-zeuj-pat",
        "G199": "https://meet.google.com/sis-zeuj-pat",
        "G343": "https://meet.google.com/sis-zeuj-pat",
        "G371": "https://meet.google.com/sis-zeuj-pat",
        "G096": "https://meet.google.com/axh-kxzj-ayt",
        "G106": "https://meet.google.com/axh-kxzj-ayt",
        "G112": "https://meet.google.com/axh-kxzj-ayt",
        "G166": "https://meet.google.com/axh-kxzj-ayt",
        "G277": "https://meet.google.com/axh-kxzj-ayt",
        "G282": "https://meet.google.com/axh-kxzj-ayt",
        "G288": "https://meet.google.com/axh-kxzj-ayt",
        "G356": "https://meet.google.com/axh-kxzj-ayt",
        "G032": "https://meet.google.com/otm-vpcb-ipu",
        "G042": "https://meet.google.com/otm-vpcb-ipu",
        "G091": "https://meet.google.com/otm-vpcb-ipu",
        "G101": "https://meet.google.com/otm-vpcb-ipu",
        "G109": "https://meet.google.com/otm-vpcb-ipu",
        "G137": "https://meet.google.com/otm-vpcb-ipu",
        "G164": "https://meet.google.com/otm-vpcb-ipu",
        "G179": "https://meet.google.com/otm-vpcb-ipu",
        "G193": "https://meet.google.com/otm-vpcb-ipu",
        "G033": "https://meet.google.com/cxu-trbc-rmu",
        "G078": "https://meet.google.com/cxu-trbc-rmu",
        "G244": "https://meet.google.com/cxu-trbc-rmu",
        "G011": "https://meet.google.com/wwx-iqiq-afv",
        "G052": "https://meet.google.com/wwx-iqiq-afv",
        "G132": "https://meet.google.com/wwx-iqiq-afv",
        "G135": "https://meet.google.com/wwx-iqiq-afv",
        "G145": "https://meet.google.com/wwx-iqiq-afv",
        "G162": "https://meet.google.com/wwx-iqiq-afv",
        "G170": "https://meet.google.com/wwx-iqiq-afv",
        "G210": "https://meet.google.com/wwx-iqiq-afv",
        "G316": "https://meet.google.com/wwx-iqiq-afv",
        "G386": "https://meet.google.com/wwx-iqiq-afv",
        "G018": "https://meet.google.com/hjd-tibr-oxp",
        "G108": "https://meet.google.com/hjd-tibr-oxp",
        "G125": "https://meet.google.com/hjd-tibr-oxp",
        "G191": "https://meet.google.com/hjd-tibr-oxp",
        "G198": "https://meet.google.com/hjd-tibr-oxp",
        "G226": "https://meet.google.com/hjd-tibr-oxp",
        "G252": "https://meet.google.com/hjd-tibr-oxp",
        "G275": "https://meet.google.com/hjd-tibr-oxp",
        "G133": "https://meet.google.com/zhs-zpdr-jfe",
        "G172": "https://meet.google.com/zhs-zpdr-jfe",
        "G350": "https://meet.google.com/zhs-zpdr-jfe",
        "G372": "https://meet.google.com/zhs-zpdr-jfe",
        "G306": "https://meet.google.com/iyp-swmh-erq",
        "G190": "https://meet.google.com/qui-yusz-nfn",
        "G307": "https://meet.google.com/qui-yusz-nfn",
        "G311": "https://meet.google.com/qui-yusz-nfn",
        "G346": "https://meet.google.com/qui-yusz-nfn",
        "G347": "https://meet.google.com/qui-yusz-nfn",
        "G360": "https://meet.google.com/qui-yusz-nfn",
        "G008": "https://meet.google.com/kob-ahzi-ntd",
        "G026": "https://meet.google.com/kob-ahzi-ntd",
        "G054": "https://meet.google.com/kob-ahzi-ntd",
        "G055": "https://meet.google.com/kob-ahzi-ntd",
        "G074": "https://meet.google.com/kob-ahzi-ntd",
        "G099": "https://meet.google.com/kob-ahzi-ntd",
        "G105": "https://meet.google.com/kob-ahzi-ntd",
        "G131": "https://meet.google.com/kob-ahzi-ntd",
        "G165": "https://meet.google.com/kob-ahzi-ntd",
        "G185": "https://meet.google.com/kob-ahzi-ntd",
        "G192": "https://meet.google.com/kob-ahzi-ntd",
        "G223": "https://meet.google.com/kob-ahzi-ntd",
        "G291": "https://meet.google.com/kob-ahzi-ntd",
        "G338": "https://meet.google.com/kob-ahzi-ntd",
        "G382": "https://meet.google.com/kob-ahzi-ntd",
        "G420": "https://meet.google.com/kob-ahzi-ntd",
        "G428": "https://meet.google.com/kob-ahzi-ntd",
        "G312": "https://meet.google.com/cyc-juqz-mze",
        "G324": "https://meet.google.com/cyc-juqz-mze",
        "G025": "https://meet.google.com/bwj-vdnf-rds",
        "G121": "https://meet.google.com/bwj-vdnf-rds",
        "G342": "https://meet.google.com/bwj-vdnf-rds",
        "G": "https://meet.google.com/too-pqty-mxb",
        "G015": "https://meet.google.com/too-pqty-mxb",
        "G034": "https://meet.google.com/too-pqty-mxb",
        "G039": "https://meet.google.com/too-pqty-mxb",
        "G041": "https://meet.google.com/too-pqty-mxb",
        "G080": "https://meet.google.com/too-pqty-mxb",
        "G104": "https://meet.google.com/too-pqty-mxb",
        "G167": "https://meet.google.com/too-pqty-mxb",
        "G183": "https://meet.google.com/too-pqty-mxb",
        "G184": "https://meet.google.com/too-pqty-mxb",
        "G219": "https://meet.google.com/too-pqty-mxb",
        "G240": "https://meet.google.com/too-pqty-mxb",
        "G250": "https://meet.google.com/too-pqty-mxb",
        "G284": "https://meet.google.com/too-pqty-mxb",
        "G301": "https://meet.google.com/too-pqty-mxb",
        "G340": "https://meet.google.com/too-pqty-mxb",
        "G406": "https://meet.google.com/too-pqty-mxb",
        "G421": "https://meet.google.com/too-pqty-mxb",
        "G436": "https://meet.google.com/too-pqty-mxb",
        "G144": "https://meet.google.com/yvt-tknr-rmj",
        "G213": "https://meet.google.com/yvt-tknr-rmj",
        "G273": "https://meet.google.com/yvt-tknr-rmj",
        "G296": "https://meet.google.com/yvt-tknr-rmj",
        "G002": "https://meet.google.com/nnx-yjkk-ojm",
        "G059": "https://meet.google.com/nnx-yjkk-ojm",
        "G130": "https://meet.google.com/nnx-yjkk-ojm",
        "G189": "https://meet.google.com/nnx-yjkk-ojm",
        "G232": "https://meet.google.com/naw-ykhz-npz",
        "G332": "https://meet.google.com/naw-ykhz-npz",
        "G410": "https://meet.google.com/naw-ykhz-npz",
        "G419": "https://meet.google.com/naw-ykhz-npz",
        "G435": "https://meet.google.com/naw-ykhz-npz",
        "G310": "https://meet.jit.si/MounirAcademy_Group_G353",
        "G353": "https://meet.jit.si/MounirAcademy_Group_G353",
        "G237": "https://meet.google.com/tng-pffs-mux",
        "G298": "https://meet.google.com/tng-pffs-mux",
        "G335": "https://meet.google.com/tng-pffs-mux",
        "G247": "https://meet.google.com/jjx-qoxf-dyu",
        "G293": "https://meet.google.com/jjx-qoxf-dyu",
        "G430": "https://meet.google.com/jjx-qoxf-dyu",
        "G047": "https://meet.google.com/qaf-qnsc-zsn",
        "G182": "https://meet.google.com/qaf-qnsc-zsn",
        "G211": "https://meet.google.com/qaf-qnsc-zsn",
        "G263": "https://meet.google.com/qaf-qnsc-zsn",
        "G266": "https://meet.google.com/qaf-qnsc-zsn",
        "G423": "https://meet.google.com/qaf-qnsc-zsn",
        "G020": "https://meet.google.com/wvq-kmvm-spa",
        "G118": "https://meet.google.com/wvq-kmvm-spa",
        "G143": "https://meet.google.com/wvq-kmvm-spa",
        "G177": "https://meet.google.com/wvq-kmvm-spa",
        "G416": "https://meet.google.com/wvq-kmvm-spa",
        "G013": "https://meet.google.com/gvy-kqij-biy",
        "G058": "https://meet.google.com/gvy-kqij-biy",
        "G195": "https://meet.google.com/gvy-kqij-biy",
        "G370": "https://meet.google.com/gvy-kqij-biy",
        "G394": "https://meet.google.com/gvy-kqij-biy",
        "G031": "https://meet.google.com/gez-cjzc-rce",
        "G249": "https://meet.google.com/gez-cjzc-rce",
        "G322": "https://meet.google.com/gez-cjzc-rce",
        "G339": "https://meet.google.com/gez-cjzc-rce",
        "G357": "https://meet.google.com/gez-cjzc-rce",
        "G389": "https://meet.google.com/gez-cjzc-rce",
        "G393": "https://meet.google.com/gez-cjzc-rce",
        "G437": "https://meet.google.com/gez-cjzc-rce",
        "G438": "https://meet.google.com/gez-cjzc-rce",
        "G197": "https://meet.google.com/rhg-obqw-qdc",
        "G201": "https://meet.google.com/rhg-obqw-qdc",
        "G225": "https://meet.google.com/rhg-obqw-qdc",
        "G083": "https://meet.google.com/rzu-rdff-eah",
        "G348": "https://meet.google.com/rzu-rdff-eah",
        "G107": "https://meet.google.com/mux-tvsd-sno",
        "G229": "https://meet.google.com/mux-tvsd-sno",
        "G234": "https://meet.google.com/mux-tvsd-sno",
        "G253": "https://meet.google.com/mux-tvsd-sno",
        "G299": "https://meet.google.com/mux-tvsd-sno",
        "G001": "https://meet.google.com/hcm-wvvv-gwa",
        "G071": "https://meet.google.com/hcm-wvvv-gwa",
        "G285": "https://meet.google.com/hcm-wvvv-gwa",
        "G320": "https://meet.google.com/dmb-zvkv-jbh",
        "G365": "https://meet.google.com/dmb-zvkv-jbh",
        "G391": "https://meet.google.com/dmb-zvkv-jbh",
        "G396": "https://meet.google.com/dmb-zvkv-jbh",
        "G375": "https://meet.google.com/emr-mdch-fzf",
        "G379": "https://meet.google.com/emr-mdch-fzf",
        "G413": "https://meet.google.com/emr-mdch-fzf",
        "G425": "https://meet.google.com/emr-mdch-fzf",
        "G102": "https://meet.google.com/fsx-gnjj-aay",
        "G129": "https://meet.google.com/fsx-gnjj-aay",
        "G209": "https://meet.google.com/fsx-gnjj-aay",
        "G230": "https://meet.google.com/fsx-gnjj-aay",
        "G292": "https://meet.google.com/fsx-gnjj-aay",
        "G330": "https://meet.google.com/fsx-gnjj-aay",
        "G046": "https://meet.google.com/hhn-sbgb-dgx",
        "G075": "https://meet.google.com/hhn-sbgb-dgx",
        "G082": "https://meet.google.com/hhn-sbgb-dgx",
        "G122": "https://meet.google.com/hhn-sbgb-dgx",
        "G358": "https://meet.google.com/hhn-sbgb-dgx",
        "G045": "https://meet.google.com/owd-dajv-xzq",
        "G117": "https://meet.google.com/owd-dajv-xzq",
        "G139": "https://meet.google.com/owd-dajv-xzq",
        "G168": "https://meet.google.com/owd-dajv-xzq",
        "G027": "https://meet.google.com/cmv-okhf-eoq",
        "G095": "https://meet.google.com/cmv-okhf-eoq",
        "G200": "https://meet.google.com/cmv-okhf-eoq",
        "G009": "https://meet.google.com/sgg-rwjd-hze",
        "G361": "https://meet.google.com/sgg-rwjd-hze",
        "G381": "https://meet.google.com/sgg-rwjd-hze",
        "G208": "https://meet.google.com/ren-seiz-cti",
        "G309": "https://meet.google.com/ren-seiz-cti",
        "G387": "https://meet.google.com/ren-seiz-cti",
        "G037": "https://meet.google.com/bqx-wque-omv",
        "G040": "https://meet.google.com/bqx-wque-omv",
        "G111": "https://meet.google.com/bqx-wque-omv",
        "G115": "https://meet.google.com/bqx-wque-omv",
        "G160": "https://meet.google.com/bqx-wque-omv",
        "G163": "https://meet.google.com/bqx-wque-omv",
        "G176": "https://meet.google.com/bqx-wque-omv",
        "G280": "https://meet.google.com/bqx-wque-omv",
        "G023": "https://meet.google.com/oym-upeq-byn",
        "G254": "https://meet.google.com/oym-upeq-byn",
        "G305": "https://meet.google.com/oym-upeq-byn",
        "G344": "https://meet.google.com/oym-upeq-byn",
        "G352": "https://meet.google.com/oym-upeq-byn",
        "G373": "https://meet.google.com/oym-upeq-byn",
        "G079": "https://meet.google.com/cgx-mtfe-sfb",
        "G081": "https://meet.google.com/cgx-mtfe-sfb",
        "G087": "https://meet.google.com/cgx-mtfe-sfb",
        "G147": "https://meet.google.com/cgx-mtfe-sfb",
        "G215": "https://meet.google.com/cgx-mtfe-sfb",
        "G390": "https://meet.google.com/cgx-mtfe-sfb",
        "G417": "https://meet.google.com/cgx-mtfe-sfb",
        "G264": "https://meet.google.com/pfw-zkij-ccs",
        "G267": "https://meet.google.com/pfw-zkij-ccs",
        "G359": "https://meet.google.com/pfw-zkij-ccs",
        "G362": "https://meet.google.com/pfw-zkij-ccs",
        "G407": "https://meet.google.com/pfw-zkij-ccs",
        "G409": "https://meet.google.com/pfw-zkij-ccs",
        "G415": "https://meet.google.com/pfw-zkij-ccs",
        "G427": "https://meet.google.com/pfw-zkij-ccs",
        "G439": "https://meet.google.com/pfw-zkij-ccs",
        "G030": "https://meet.google.com/ywg-wnpp-zqb",
        "G038": "https://meet.google.com/ywg-wnpp-zqb",
        "G092": "https://meet.google.com/ywg-wnpp-zqb",
        "G186": "https://meet.google.com/ywg-wnpp-zqb",
        "G222": "https://meet.google.com/ywg-wnpp-zqb",
        "G227": "https://meet.google.com/ywg-wnpp-zqb",
        "G294": "https://meet.google.com/ywg-wnpp-zqb",
        "G395": "https://meet.google.com/ywg-wnpp-zqb",
        "G397": "https://meet.google.com/ywg-wnpp-zqb",
        "G412": "https://meet.google.com/ywg-wnpp-zqb",
        "G113": "https://meet.google.com/ogk-gsek-mfg",
        "G214": "https://meet.google.com/ogk-gsek-mfg",
        "G217": "https://meet.google.com/ogk-gsek-mfg",
        "G328": "https://meet.google.com/obo-wttk-cwg",
        "G336": "https://meet.google.com/obo-wttk-cwg",
        "G337": "https://meet.google.com/obo-wttk-cwg",
        "G400": "https://meet.google.com/obo-wttk-cwg",
        "G405": "https://meet.google.com/obo-wttk-cwg",
        "G-CKPW": "https://meet.google.com/too-pqty-mxb",
        "G-OOH4": "https://meet.google.com/too-pqty-mxb",
        "G-U54Z": "https://meet.google.com/too-pqty-mxb",
        "G260": "https://meet.google.com/too-pqty-mxb",
        "G127": "https://meet.google.com/ogk-gsek-mfg",
        "G069": "https://meet.google.com/sis-zeuj-pat",
        "G097": "https://meet.google.com/sis-zeuj-pat",
        "G158": "https://meet.google.com/sis-zeuj-pat",
        "G441": "https://meet.google.com/sis-zeuj-pat",
        "G442": "https://meet.google.com/sis-zeuj-pat",
        "G440": "https://meet.google.com/cvf-qbuj-ojn",
        "G424": "https://meet.google.com/iyp-swmh-erq"
};

    // Initialize global registry
    window.GROUP_MEET_LINKS = Object.assign(OFFICIAL_GROUP_MEET_LINKS, window.GROUP_MEET_LINKS || {});

    // Get all custom overrides from localStorage
    function getStoredLinks() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch(e) {
            return {};
        }
    }

    function normalizeTeacherName(name) {
        if (!name) return '';
        return String(name)
            .trim()
            .replace(/^(أستاذ|استاذ|أ\.|ا\.|م\.|شيخ|الشيخ)\s*[\/\-]?\s*/gi, '')
            .replace(/عبد\s+/g, 'عبد')
            .replace(/أبو\s+/g, 'ابو')
            .replace(/[إأآا]/g, 'ا')
            .replace(/[ة]/g, 'ه')
            .replace(/[ى]/g, 'ي')
            .replace(/[ًٌٍَُِّْ]/g, '')
            .replace(/\s+/g, ' ')
            .toLowerCase();
    }
    window.normalizeTeacherName = normalizeTeacherName;

    // Standardized Group Live Room generator (Google Meet / Zoom / Jitsi)
    window.getGroupMeetUrl = function(groupId, teacherIdOrName) {
        const cleanGid = groupId ? String(groupId).trim() : '';
        const stored = getStoredLinks();

        // 1. User/Teacher/Admin override in localStorage (ignore invalid or stale Jitsi fallback)
        if (cleanGid && stored[cleanGid]) {
            const stVal = stored[cleanGid].trim();
            if (stVal.startsWith('http') && !stVal.includes('meet.jit.si/MounirAcademy_Group_')) {
                return stVal;
            }
        }

        // 2. Pre-configured official Google Meet rooms by Group ID
        if (cleanGid && window.GROUP_MEET_LINKS && window.GROUP_MEET_LINKS[cleanGid]) {
            return window.GROUP_MEET_LINKS[cleanGid];
        }

        // 3. Match via Teacher ID or Teacher Name if provided
        if (teacherIdOrName) {
            const cleanT = String(teacherIdOrName).trim();
            // Direct match
            if (window.TEACHER_MEET_LINKS && window.TEACHER_MEET_LINKS[cleanT]) {
                return window.TEACHER_MEET_LINKS[cleanT];
            }
            // Normalized name match
            if (window.TEACHER_MEET_LINKS) {
                const normTarget = normalizeTeacherName(cleanT);
                if (normTarget) {
                    for (const [k, url] of Object.entries(window.TEACHER_MEET_LINKS)) {
                        if (normalizeTeacherName(k) === normTarget) {
                            return url;
                        }
                    }
                    // Substring / compound name match (e.g. 'عبدالرحمن أحمد مختار' vs 'عبدالرحمن مختار')
                    if (normTarget.length > 3) {
                        const targetParts = normTarget.split(' ').filter(p => p.length > 2);
                        for (const [k, url] of Object.entries(window.TEACHER_MEET_LINKS)) {
                            const normK = normalizeTeacherName(k);
                            if (!normK || normK.length <= 3) continue;
                            const kParts = normK.split(' ').filter(p => p.length > 2);
                            if (targetParts.length >= 2 && kParts.length >= 2) {
                                if (targetParts[0] === kParts[0] && targetParts[targetParts.length - 1] === kParts[kParts.length - 1]) {
                                    return url;
                                }
                            }
                        }
                    }
                }
            }
        }

        if (!cleanGid || cleanGid === '—' || cleanGid === 'G000' || cleanGid === 'G') {
            return 'https://meet.jit.si/MounirAcademy_GeneralRoom';
        }

        // 4. Default fallback working live interactive video room
        const codeSuffix = cleanGid.toUpperCase().replace(/[^A-Z0-9]/g, '');
        return 'https://meet.jit.si/MounirAcademy_Group_' + codeSuffix;
    };

    // Reset group meet URL to official default
    window.resetGroupMeetUrl = function(groupId, teacherIdOrName) {
        if (!groupId) return;
        const cleanGid = String(groupId).trim();
        try {
            const stored = getStoredLinks();
            delete stored[cleanGid];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        } catch(e) {}
        const defaultUrl = window.getGroupMeetUrl(cleanGid, teacherIdOrName);
        window.dispatchEvent(new CustomEvent('monir-meet-updated', {
            detail: { groupId: cleanGid, url: defaultUrl }
        }));
        return defaultUrl;
    };

    // Update group meet link
    window.setGroupMeetUrl = function(groupId, newUrl) {
        if (!groupId) return false;
        const cleanGid = String(groupId).trim();
        let finalUrl = (newUrl || '').trim();

        if (!finalUrl) {
            finalUrl = window.getGroupMeetUrl(cleanGid);
        } else if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = 'https://' + finalUrl;
        }

        try {
            const stored = getStoredLinks();
            stored[cleanGid] = finalUrl;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
            if (!window.GROUP_MEET_LINKS) window.GROUP_MEET_LINKS = {};
            window.GROUP_MEET_LINKS[cleanGid] = finalUrl;

            // Trigger custom event for real-time reactivity in current tab
            window.dispatchEvent(new CustomEvent('monir-meet-updated', {
                detail: { groupId: cleanGid, url: finalUrl }
            }));

            return finalUrl;
        } catch(e) {
            console.error('[MeetManager] Failed to save link:', e);
            return false;
        }
    };

    // Copy to clipboard helper with button visual feedback
    window.copyMeetLink = function(url, btnElement) {
        if (!url) return;
        navigator.clipboard.writeText(url).then(() => {
            if (btnElement) {
                const originalHtml = btnElement.innerHTML;
                btnElement.innerHTML = '<span>تم النسخ!</span>';
                btnElement.classList.add('bg-emerald-100', 'text-emerald-800');
                setTimeout(() => {
                    btnElement.innerHTML = originalHtml;
                    btnElement.classList.remove('bg-emerald-100', 'text-emerald-800');
                }, 2000);
            } else {
                alert('تم نسخ رابط القاعة بنجاح:\n' + url);
            }
        }).catch(err => {
            prompt('انسخ الرابط يدوياً:', url);
        });
    };

    // Prompt teacher or admin to edit the group meet link
    window.promptEditGroupMeetUrl = function(groupId, currentUrl, callback) {
        const input = prompt('أدخل رابط الحصة الجديد للمجموعة (' + groupId + ')\nيمكنك وضع رابط Google Meet أو Zoom أو أي رابط تختاره:', currentUrl || window.getGroupMeetUrl(groupId));
        if (input !== null) {
            const trimmed = input.trim();
            if (trimmed) {
                const saved = window.setGroupMeetUrl(groupId, trimmed);
                if (saved) {
                    alert('تم حفظ وتحديث رابط الحصة للمجموعة (' + groupId + ') بنجاح!\nسيظهر الرابط الآن فوراً لك ولجميع طلاب المجموعة:\n' + saved);
                    if (typeof callback === 'function') callback(saved);
                }
            }
        }
    };
})();
