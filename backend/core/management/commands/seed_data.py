"""
core/management/commands/seed_data.py
=========================================
Seeds the HMIS database with realistic ONE-YEAR Kenyan hospital data
covering EVERY model in the system.

Usage
-----
  python manage.py seed_data                             # 12 months, 600 patients
  python manage.py seed_data --months 6                  # 6 months, ~300 patients
  python manage.py seed_data --patients 800              # override patient count
  python manage.py seed_data --flush                     # wipe then re-seed
  python manage.py seed_data --flush --months 12 --patients 600 --summary

Models seeded (in dependency order)
-------------------------------------
  User  DrugInventory  Specialist  ServiceTariff
  Patient  Visit  Triage  Consultation  ConsultationItem
  LabOrder  LabResult  RadiologyOrder  RadiologyResult
  Prescription  PrescriptionItem  Invoice  InvoiceItem  Payment
"""

import random
import string
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core.models import (
    Consultation, ConsultationItem,
    DrugInventory,
    Invoice, InvoiceItem,
    LabOrder, LabResult,
    Patient, Payment,
    Prescription, PrescriptionItem,
    RadiologyOrder, RadiologyResult,
    ServiceTariff, Specialist,
    Triage, Visit,
)

User = get_user_model()


# ══════════════════════════════════════════════════════════════════════════════
#  REFERENCE DATA
# ══════════════════════════════════════════════════════════════════════════════

MALE_NAMES = [
    "James","John","Peter","Paul","David","Samuel","Joseph","Daniel","Michael","George",
    "Patrick","Kevin","Brian","Eric","Kenneth","Francis","Stephen","Charles","Robert","Thomas",
    "Otieno","Mutua","Kamau","Mwangi","Oloo","Waweru","Kimani","Njoroge","Kariuki","Omondi",
    "Hassan","Omar","Abdi","Mohammed","Ali","Ibrahim","Hussein","Yusuf","Ahmed","Bashir",
    "Ochieng","Onyango","Odongo","Owino","Ogola","Juma","Simiyu","Barasa","Wekesa","Wafula",
    "Njuguna","Githinji","Mugo","Ndirangu","Gacheru","Kinyua","Muriuki","Ndung'u","Ngugi","Gakuru",
]

FEMALE_NAMES = [
    "Grace","Wanjiku","Achieng","Fatuma","Mary","Ann","Ruth","Joyce","Esther","Sarah",
    "Catherine","Beatrice","Amina","Njeri","Wambui","Pauline","Mercy","Faith","Hope","Agnes",
    "Auma","Awino","Adhiambo","Atieno","Akoth","Anyango","Awuor","Akinyi","Zainab","Halima",
    "Wairimu","Muthoni","Nyambura","Wangari","Wanjiru","Mumbi","Wachera","Gathoni","Wangui","Wangechi",
    "Nafula","Nekesa","Nanjala","Nasimiyu","Nabwire","Naliaka","Hodan","Farhiya","Asli","Nimco",
    "Purity","Gladys","Linet","Carolyne","Brenda","Cynthia","Diana","Eva","Florence","Hilda",
]

LAST_NAMES = [
    "Kamau","Wanjiku","Odhiambo","Mwangi","Otieno","Mutua","Kimani","Oloo","Kariuki","Njoroge",
    "Waweru","Achieng","Awino","Hassan","Abdi","Yusuf","Bashir","Ochieng","Adhiambo","Ngugi",
    "Muthoni","Githinji","Njuguna","Wairimu","Maina","Mugo","Kibira","Gacheru","Ndirangu","Odongo",
    "Onyango","Ogola","Omondi","Owino","Auma","Awuor","Akello","Adongo","Mohamed","Ibrahim",
    "Farah","Hussein","Jama","Nur","Duale","Wekesa","Barasa","Simiyu","Wafula","Masinde",
    "Njoroge","Muriuki","Kinyua","Mugo","Gakuru","Njenga","Njeru","Mwenda","Kirimi","Mutungi",
    "Otiende","Odera","Opondo","Obara","Khaemba","Imbali","Khisa","Namwamba","Nafula","Naliaka",
]

COUNTIES = [
    "Nairobi","Mombasa","Kisumu","Nakuru","Uasin Gishu","Kiambu","Machakos","Meru","Embu","Nyeri",
    "Kakamega","Kisii","Kericho","Bomet","Nandi","Trans Nzoia","Bungoma","Vihiga","Siaya","Homabay",
    "Migori","Nyamira","Nyandarua","Kirinyaga","Murang'a","Kajiado","Makueni","Kitui","Kwale",
    "Taita Taveta","Kilifi","Lamu","Garissa","Wajir","Mandera","Isiolo","Marsabit","Tharaka-Nithi",
]

OCCUPATIONS = [
    "Teacher","Farmer","Business Person","Civil Servant","Driver","Nurse","Clinical Officer",
    "Engineer","Mechanic","Hawker / Trader","Student","Housewife","Pastor / Clergy",
    "Security Guard","Carpenter","Electrician","Tailor","Cook","Cleaner","Accountant",
    "Lawyer","Social Worker","IT Professional","Banker","Bodaboda Rider","Casual Labourer","Retired",
]

BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-","Unknown"]

ALLERGIES = [
    "None","None","None","None","None","None",
    "Penicillin","Sulphonamides","Aspirin / NSAIDs",
    "Iodine contrast","Latex","Metronidazole","Codeine",
]

CHRONIC_CONDITIONS = [
    "None","None","None","None","None","None",
    "Hypertension","Type 2 Diabetes Mellitus","Hypertension and Diabetes",
    "Asthma","Epilepsy","HIV/AIDS on ART","Pulmonary Tuberculosis (on treatment)",
    "Chronic Kidney Disease","Sickle Cell Disease","Hypothyroidism",
    "Rheumatoid Arthritis","COPD","Coronary Artery Disease",
]

NOK_RELATIONS      = ["Spouse","Father","Mother","Son","Daughter","Sibling","Friend","Colleague"]
GUARDIAN_RELATIONS = ["Mother","Father","Grandmother","Grandfather","Aunt","Uncle","Legal Guardian"]

# ── Staff ─────────────────────────────────────────────────────────────────────
# (first, last, username, role, department, specialization, license_number)
STAFF = [
    ("Sarah",    "Mwangi",   "reception1",  "receptionist", "Outpatient",        "",                         ""),
    ("Grace",    "Kamau",    "reception2",  "receptionist", "Emergency",         "",                         ""),
    ("Daniel",   "Odhiambo", "reception3",  "receptionist", "Outpatient",        "",                         ""),
    ("Wanjiku",  "Njoroge",  "reception4",  "receptionist", "Records",           "",                         ""),
    ("Anne",     "Wambui",   "nurse1",      "nurse",        "Outpatient/Triage", "",                         "RN/12345"),
    ("Joyce",    "Auma",     "nurse2",      "nurse",        "Triage",            "",                         "RN/12346"),
    ("Esther",   "Njeri",    "nurse3",      "nurse",        "Emergency",         "",                         "RN/12347"),
    ("Faith",    "Otieno",   "nurse4",      "nurse",        "Paediatrics",       "",                         "RN/12348"),
    ("Mercy",    "Adhiambo", "nurse5",      "nurse",        "Maternity",         "",                         "RN/12349"),
    ("Purity",   "Wangari",  "nurse6",      "nurse",        "Outpatient/Triage", "",                         "RN/12350"),
    ("James",    "Omondi",   "doctor1",     "doctor",       "General Outpatient","General Practice",         "MBChB/1001"),
    ("Samuel",   "Waweru",   "doctor2",     "doctor",       "Internal Medicine", "Internal Medicine",        "MBChB/1002"),
    ("Fatuma",   "Yusuf",    "doctor3",     "doctor",       "Surgery",           "General Surgery",          "MBChB/1003"),
    ("Beatrice", "Njeri",    "doctor4",     "doctor",       "Obs & Gyn",         "Obstetrics & Gynaecology", "MBChB/1004"),
    ("Kelvin",   "Mutua",    "doctor5",     "doctor",       "Paediatrics",       "Paediatrics",              "MBChB/1005"),
    ("Patrick",  "Oloo",     "doctor6",     "doctor",       "Orthopaedics",      "Orthopaedic Surgery",      "MBChB/1006"),
    ("Amina",    "Bashir",   "doctor7",     "doctor",       "ENT",               "ENT Surgery",              "MBChB/1007"),
    ("Eric",     "Maina",    "doctor8",     "doctor",       "Dermatology",       "Dermatology",              "MBChB/1008"),
    ("Alice",    "Njuguna",  "doctor9",     "doctor",       "Ophthalmology",     "Ophthalmology",            "MBChB/1009"),
    ("Paul",     "Githinji", "doctor10",    "doctor",       "Dental",            "Dentistry",                "BDS/1001"),
    ("David",    "Kimani",   "pharmacy1",   "pharmacist",   "Pharmacy",          "",                         "RPh/3001"),
    ("Rose",     "Wanjiru",  "pharmacy2",   "pharmacist",   "Pharmacy",          "",                         "RPh/3002"),
    ("Victor",   "Otieno",   "pharmacy3",   "pharmacist",   "Pharmacy",          "",                         "RPh/3003"),
    ("Joyce",    "Muthoni",  "lab1",        "lab",          "Laboratory",        "",                         "MLT/4001"),
    ("Peter",    "Githinji", "lab2",        "lab",          "Laboratory",        "",                         "MLT/4002"),
    ("Miriam",   "Achieng",  "lab3",        "lab",          "Laboratory",        "",                         "MLT/4003"),
    ("Collins",  "Onyango",  "lab4",        "lab",          "Laboratory",        "",                         "MLT/4004"),
    ("Peter",    "Ochieng",  "radiology1",  "radiology",    "Radiology",         "",                         "DRT/5001"),
    ("Janet",    "Wanjiku",  "radiology2",  "radiology",    "Radiology",         "",                         "DRT/5002"),
    ("Mark",     "Kamande",  "radiology3",  "radiology",    "Radiology",         "",                         "DRT/5003"),
    ("John",     "Kariuki",  "admin1",      "admin",        "Administration",    "",                         ""),
    ("Mary",     "Njeri",    "admin2",      "admin",        "Finance",           "",                         ""),
    ("Tom",      "Mwangi",   "admin3",      "admin",        "IT & Systems",      "",                         ""),
]

# ── Specialists ───────────────────────────────────────────────────────────────
# (code, name, consultation_fee, description)
SPECIALISTS = [
    ("SP01", "General Consultation",       500,  "Routine outpatient consultation"),
    ("SP02", "Paediatrics",                800,  "Children 0–17 years"),
    ("SP03", "Obstetrics & Gynaecology",  1200,  "Maternal and reproductive health"),
    ("SP04", "Internal Medicine",         1000,  "Adult medicine and chronic disease management"),
    ("SP05", "General Surgery",           1500,  "Elective and emergency surgical conditions"),
    ("SP06", "Orthopaedics",              1300,  "Bone, joint and soft-tissue conditions"),
    ("SP07", "ENT",                        900,  "Ear, Nose and Throat conditions"),
    ("SP08", "Dermatology",                950,  "Skin, hair and nail conditions"),
    ("SP09", "Ophthalmology",              950,  "Eye diseases and vision correction"),
    ("SP10", "Dental / Oral Health",       700,  "Teeth, gums and oral cavity"),
    ("SP11", "Psychiatry / Mental Health",1100,  "Mental illness, substance abuse and counselling"),
    ("SP12", "Physiotherapy",              800,  "Rehabilitation and musculoskeletal therapy"),
]

# ── Tariffs ───────────────────────────────────────────────────────────────────
# (code, name, category, price, sha_covered, sha_rate)
TARIFFS = [
    # Lab
    ("LAB001","Full Blood Count (FBC)",              "lab",       650, True,  520),
    ("LAB002","Urinalysis (routine)",                "lab",       350, True,  280),
    ("LAB003","Malaria RDT",                         "lab",       400, True,  320),
    ("LAB004","Malaria Thick & Thin Films",          "lab",       500, True,  400),
    ("LAB005","Random Blood Sugar (RBS)",            "lab",       250, True,  200),
    ("LAB006","Fasting Blood Sugar (FBS)",           "lab",       300, True,  240),
    ("LAB007","Liver Function Tests (LFTs)",         "lab",      1200, True,  960),
    ("LAB008","Renal Function Tests (RFTs)",         "lab",      1000, True,  800),
    ("LAB009","Thyroid Function Tests (TFTs)",       "lab",      1500, False,   0),
    ("LAB010","Lipid Profile",                       "lab",      1200, True,  960),
    ("LAB011","HbA1c",                               "lab",      1800, True, 1440),
    ("LAB012","Widal Test",                          "lab",       600, True,  480),
    ("LAB013","Blood Culture & Sensitivity",         "lab",      1500, True, 1200),
    ("LAB014","Urine Culture & Sensitivity",         "lab",      1200, True,  960),
    ("LAB015","Sputum AFB x2 (TB screening)",        "lab",       600, True,  480),
    ("LAB016","CD4 Count",                           "lab",      1800, True, 1440),
    ("LAB017","HIV Test (Determine/Unigold)",        "lab",       500, True,  400),
    ("LAB018","Hepatitis B Surface Antigen",         "lab",       700, True,  560),
    ("LAB019","Hepatitis C Antibody",                "lab",       700, True,  560),
    ("LAB020","VDRL / RPR (Syphilis)",               "lab",       400, True,  320),
    ("LAB021","Pregnancy Test (urine βhCG)",         "lab",       250, True,  200),
    ("LAB022","Stool Microscopy & Culture",          "lab",       500, True,  400),
    ("LAB023","ESR",                                 "lab",       300, True,  240),
    ("LAB024","CRP (C-Reactive Protein)",            "lab",       800, True,  640),
    ("LAB025","PT / APTT / INR (Coagulation)",       "lab",       900, True,  720),
    ("LAB026","Serum Electrolytes (Na/K/Cl/HCO3)",  "lab",       800, True,  640),
    ("LAB027","Blood Group & Crossmatch",            "lab",       800, True,  640),
    ("LAB028","Serum Amylase / Lipase",              "lab",       700, True,  560),
    ("LAB029","Uric Acid",                           "lab",       400, True,  320),
    ("LAB030","Serum Calcium & Phosphate",           "lab",       700, True,  560),
    # Radiology
    ("RAD001","Chest X-Ray (PA + Lateral)",          "radiology",1200, True,  960),
    ("RAD002","Abdominal X-Ray (Erect + Supine)",    "radiology",1200, True,  960),
    ("RAD003","Pelvic X-Ray",                        "radiology",1200, True,  960),
    ("RAD004","Cervical Spine X-Ray",                "radiology",1200, True,  960),
    ("RAD005","Lumbar Spine X-Ray",                  "radiology",1200, True,  960),
    ("RAD006","Limb X-Ray (Any)",                    "radiology",1000, True,  800),
    ("RAD007","Skull X-Ray",                         "radiology",1200, True,  960),
    ("RAD008","Abdominal Ultrasound",                "radiology",2000, True, 1600),
    ("RAD009","Obstetric Ultrasound",                "radiology",1800, True, 1440),
    ("RAD010","Pelvic Ultrasound",                   "radiology",1800, True, 1440),
    ("RAD011","Renal & Bladder Ultrasound",          "radiology",2000, True, 1600),
    ("RAD012","Neck / Thyroid Ultrasound",           "radiology",2000, False,   0),
    ("RAD013","Echocardiography",                    "radiology",5000, False,   0),
    ("RAD014","CT Scan — Head",                      "radiology",8000, False,   0),
    ("RAD015","CT Scan — Chest",                     "radiology",8000, False,   0),
    ("RAD016","CT Scan — Abdomen & Pelvis",          "radiology",9000, False,   0),
    ("RAD017","MRI — Brain",                         "radiology",15000,False,   0),
    ("RAD018","MRI — Spine",                         "radiology",15000,False,   0),
    ("RAD019","Doppler Ultrasound",                  "radiology",3000, False,   0),
    ("RAD020","Mammography",                         "radiology",3500, False,   0),
    # Procedures
    ("PRO001","IV Cannulation & IV Fluids",          "procedure",  300, True,  240),
    ("PRO002","IM / IV Injection (per dose)",        "procedure",  150, True,  120),
    ("PRO003","Wound Dressing — Simple",             "procedure",  350, True,  280),
    ("PRO004","Wound Dressing — Complex",            "procedure",  600, True,  480),
    ("PRO005","Suturing — Minor (≤5 stitches)",      "procedure",  800, True,  640),
    ("PRO006","Suturing — Major (>5 stitches)",      "procedure", 1500, True, 1200),
    ("PRO007","Urinary Catheterization",             "procedure",  600, True,  480),
    ("PRO008","Nasogastric Tube Insertion",          "procedure",  500, True,  400),
    ("PRO009","Blood Transfusion (per unit)",        "procedure", 4500, True, 3600),
    ("PRO010","Nebulization",                        "procedure",  300, True,  240),
    ("PRO011","ECG (12-lead)",                       "procedure",  700, True,  560),
    ("PRO012","Incision & Drainage (I&D)",           "procedure", 1200, True,  960),
    ("PRO013","Lumbar Puncture",                     "procedure", 2000, True, 1600),
    ("PRO014","Thoracocentesis / Pleural Tap",       "procedure", 2500, True, 2000),
    ("PRO015","Casting / Splinting",                 "procedure",  900, True,  720),
]

# ── Drugs ─────────────────────────────────────────────────────────────────────
# (name, generic_name, category, formulation, strength, unit, unit_price, reorder_level, stock_qty)
DRUGS = [
    # Antibiotics
    ("Amoxicillin 250mg/5ml Syrup",           "Amoxicillin",             "antibiotic",   "Syrup",      "250mg/5ml",  "Bottle",   85,  30,  240),
    ("Amoxicillin 500mg Capsules",             "Amoxicillin",             "antibiotic",   "Capsule",    "500mg",      "Capsule",  20, 200,  900),
    ("Co-Amoxiclav 625mg Tablets",             "Amoxicillin-Clavulanate", "antibiotic",   "Tablet",     "625mg",      "Tablet",   65, 100,  420),
    ("Ciprofloxacin 500mg Tablets",            "Ciprofloxacin",           "antibiotic",   "Tablet",     "500mg",      "Tablet",   40, 150,  680),
    ("Metronidazole 400mg Tablets",            "Metronidazole",           "antibiotic",   "Tablet",     "400mg",      "Tablet",   12, 200,  950),
    ("Metronidazole 200mg/5ml Suspension",     "Metronidazole",           "antibiotic",   "Suspension", "200mg/5ml",  "Bottle",   75,  30,  160),
    ("Doxycycline 100mg Capsules",             "Doxycycline",             "antibiotic",   "Capsule",    "100mg",      "Capsule",  25, 100,  480),
    ("Erythromycin 250mg Tablets",             "Erythromycin",            "antibiotic",   "Tablet",     "250mg",      "Tablet",   22, 100,  380),
    ("Azithromycin 500mg Tablets",             "Azithromycin",            "antibiotic",   "Tablet",     "500mg",      "Tablet",   90,  80,  340),
    ("Clindamycin 300mg Capsules",             "Clindamycin",             "antibiotic",   "Capsule",    "300mg",      "Capsule",  55,  80,  290),
    ("Co-trimoxazole 480mg Tablets",           "Cotrimoxazole",           "antibiotic",   "Tablet",     "480mg",      "Tablet",   15, 150,  620),
    ("Ceftriaxone 1g Injection",               "Ceftriaxone",             "antibiotic",   "Injection",  "1g/vial",    "Vial",    280,  50,  200),
    ("Gentamicin 80mg/2ml Injection",          "Gentamicin",              "antibiotic",   "Injection",  "80mg/2ml",   "Vial",    120,  40,  150),
    ("Flucloxacillin 500mg Capsules",          "Flucloxacillin",          "antibiotic",   "Capsule",    "500mg",      "Capsule",  35, 100,  380),
    # Analgesics / NSAIDs
    ("Paracetamol 500mg Tablets",              "Paracetamol",             "analgesic",    "Tablet",     "500mg",      "Tablet",    5, 500, 3500),
    ("Paracetamol 250mg/5ml Syrup",            "Paracetamol",             "analgesic",    "Syrup",      "250mg/5ml",  "Bottle",   55,  80,  550),
    ("Ibuprofen 400mg Tablets",                "Ibuprofen",               "analgesic",    "Tablet",     "400mg",      "Tablet",   18, 200,  850),
    ("Ibuprofen 100mg/5ml Suspension",         "Ibuprofen",               "analgesic",    "Suspension", "100mg/5ml",  "Bottle",   70,  50,  280),
    ("Diclofenac 50mg Tablets",                "Diclofenac",              "analgesic",    "Tablet",     "50mg",       "Tablet",   18, 200,  750),
    ("Diclofenac 75mg/3ml Injection",          "Diclofenac",              "analgesic",    "Injection",  "75mg/3ml",   "Vial",     45,  50,  210),
    ("Tramadol 50mg Capsules",                 "Tramadol",                "analgesic",    "Capsule",    "50mg",       "Capsule",  30,  50,  320),
    ("Morphine 10mg/ml Injection",             "Morphine",                "analgesic",    "Injection",  "10mg/ml",    "Vial",    120,  20,   85),
    ("Codeine Phosphate 30mg Tablets",         "Codeine",                 "analgesic",    "Tablet",     "30mg",       "Tablet",   25,  60,  210),
    # Anti-malarials
    ("Artemether-Lumefantrine 20/120mg",       "Artemether+Lumefantrine", "antimalaria",  "Tablet",     "20/120mg",   "Tablet",   55, 200,  850),
    ("Artesunate 100mg Tablets",               "Artesunate",              "antimalaria",  "Tablet",     "100mg",      "Tablet",   45, 150,  620),
    ("Quinine 300mg Tablets",                  "Quinine",                 "antimalaria",  "Tablet",     "300mg",      "Tablet",   20, 100,  420),
    ("Quinine 300mg/ml Injection",             "Quinine",                 "antimalaria",  "Injection",  "300mg/ml",   "Vial",     95,  40,  180),
    # Anti-diabetics
    ("Metformin 500mg Tablets",                "Metformin",               "antidiabetic", "Tablet",     "500mg",      "Tablet",   15, 200,  950),
    ("Metformin 850mg Tablets",                "Metformin",               "antidiabetic", "Tablet",     "850mg",      "Tablet",   20, 150,  720),
    ("Glibenclamide 5mg Tablets",              "Glibenclamide",           "antidiabetic", "Tablet",     "5mg",        "Tablet",   18, 100,  520),
    ("Insulin Mixtard 30/70 100IU/ml",         "Insulin Mixed",           "antidiabetic", "Injection",  "100IU/ml",   "Vial",    950,  20,  105),
    ("Insulin Actrapid 100IU/ml",              "Insulin Regular",         "antidiabetic", "Injection",  "100IU/ml",   "Vial",    920,  20,  100),
    # Antihypertensives / Cardiac
    ("Amlodipine 5mg Tablets",                 "Amlodipine",              "antihyp",      "Tablet",     "5mg",        "Tablet",   25, 200,  850),
    ("Amlodipine 10mg Tablets",                "Amlodipine",              "antihyp",      "Tablet",     "10mg",       "Tablet",   35, 150,  620),
    ("Enalapril 10mg Tablets",                 "Enalapril",               "antihyp",      "Tablet",     "10mg",       "Tablet",   20, 200,  720),
    ("Lisinopril 10mg Tablets",                "Lisinopril",              "antihyp",      "Tablet",     "10mg",       "Tablet",   22, 200,  640),
    ("Atenolol 50mg Tablets",                  "Atenolol",                "antihyp",      "Tablet",     "50mg",       "Tablet",   18, 150,  520),
    ("Losartan 50mg Tablets",                  "Losartan",                "antihyp",      "Tablet",     "50mg",       "Tablet",   45, 100,  380),
    ("Methyldopa 250mg Tablets",               "Methyldopa",              "antihyp",      "Tablet",     "250mg",      "Tablet",   20, 100,  350),
    ("Atorvastatin 20mg Tablets",              "Atorvastatin",            "antihyp",      "Tablet",     "20mg",       "Tablet",   35, 100,  420),
    ("Furosemide 40mg Tablets",                "Furosemide",              "antihyp",      "Tablet",     "40mg",       "Tablet",   12, 100,  420),
    ("Furosemide 20mg/2ml Injection",          "Furosemide",              "antihyp",      "Injection",  "20mg/2ml",   "Vial",     55,  30,  150),
    ("Spironolactone 25mg Tablets",            "Spironolactone",          "antihyp",      "Tablet",     "25mg",       "Tablet",   20,  80,  280),
    # Supplements & Vitamins
    ("Folic Acid 5mg Tablets",                 "Folic Acid",              "supplement",   "Tablet",     "5mg",        "Tablet",    5, 300, 2100),
    ("Ferrous Sulphate 200mg Tablets",         "Ferrous Sulphate",        "supplement",   "Tablet",     "200mg",      "Tablet",    8, 300, 1600),
    ("Vitamin B Complex Tablets",              "Vitamin B Complex",       "supplement",   "Tablet",     "Standard",   "Tablet",   10, 200,  850),
    ("Vitamin C 500mg Tablets",                "Ascorbic Acid",           "supplement",   "Tablet",     "500mg",      "Tablet",   12, 150,  620),
    ("Zinc Sulphate 20mg Tablets",             "Zinc Sulphate",           "supplement",   "Tablet",     "20mg",       "Tablet",   15, 150,  520),
    ("ORS Sachets (WHO formula)",              "ORS",                     "supplement",   "Sachet",     "Standard",   "Sachet",   15, 200,  850),
    # IV Fluids
    ("Normal Saline 0.9% 500ml",               "Sodium Chloride 0.9%",   "infusion",     "IV Fluid",   "0.9%",       "Bag",      80,  60,  520),
    ("Ringer's Lactate 500ml",                 "Ringer's Lactate",        "infusion",     "IV Fluid",   "Compound",   "Bag",      85,  50,  520),
    ("Dextrose 5% in Water 500ml",             "Dextrose 5%",             "infusion",     "IV Fluid",   "5%",         "Bag",      90,  50,  420),
    ("Dextrose 10% 500ml",                     "Dextrose 10%",            "infusion",     "IV Fluid",   "10%",        "Bag",     100,  30,  310),
    ("Dextrose-Normal Saline 500ml",           "DNS",                     "infusion",     "IV Fluid",   "5%/0.9%",    "Bag",      95,  40,  380),
    # GIT / Respiratory / Other
    ("Omeprazole 20mg Capsules",               "Omeprazole",              "other",        "Capsule",    "20mg",       "Capsule",  20, 200,  850),
    ("Ranitidine 150mg Tablets",               "Ranitidine",              "other",        "Tablet",     "150mg",      "Tablet",   15, 150,  620),
    ("Antacid Suspension",                     "Antacid",                 "other",        "Suspension", "Standard",   "Bottle",   85,  50,  260),
    ("Metoclopramide 10mg Tablets",            "Metoclopramide",          "other",        "Tablet",     "10mg",       "Tablet",   12, 100,  420),
    ("Salbutamol Inhaler 100mcg",              "Salbutamol",              "other",        "Inhaler",    "100mcg",     "Piece",   350,  50,  155),
    ("Salbutamol Nebules 2.5mg/2.5ml",         "Salbutamol",              "other",        "Nebules",    "2.5mg/2.5ml","Piece",    45,  80,  310),
    ("Prednisolone 5mg Tablets",               "Prednisolone",            "other",        "Tablet",     "5mg",        "Tablet",   12, 150,  620),
    ("Hydrocortisone 100mg Injection",         "Hydrocortisone",          "other",        "Injection",  "100mg/2ml",  "Vial",     85,  40,  185),
    ("Loratadine 10mg Tablets",                "Loratadine",              "other",        "Tablet",     "10mg",       "Tablet",   18, 100,  420),
    ("Cetirizine 10mg Tablets",                "Cetirizine",              "other",        "Tablet",     "10mg",       "Tablet",   20, 100,  420),
    ("Albendazole 400mg Tablets",              "Albendazole",             "other",        "Tablet",     "400mg",      "Tablet",   20, 100,  420),
    ("Fluconazole 150mg Capsules",             "Fluconazole",             "other",        "Capsule",    "150mg",      "Capsule",  45,  80,  310),
    ("Acyclovir 200mg Tablets",                "Acyclovir",               "other",        "Tablet",     "200mg",      "Tablet",   35,  80,  310),
    ("Diazepam 5mg Tablets",                   "Diazepam",                "other",        "Tablet",     "5mg",        "Tablet",   20,  50,  210),
    ("Diazepam 10mg/2ml Injection",            "Diazepam",                "other",        "Injection",  "10mg/2ml",   "Vial",     85,  30,  120),
    ("Levothyroxine 50mcg Tablets",            "Levothyroxine",           "other",        "Tablet",     "50mcg",      "Tablet",   30,  80,  310),
    ("Carbamazepine 200mg Tablets",            "Carbamazepine",           "other",        "Tablet",     "200mg",      "Tablet",   25,  80,  280),
    ("Phenobarbitone 60mg Tablets",            "Phenobarbitone",          "other",        "Tablet",     "60mg",       "Tablet",   15,  80,  280),
    ("Adrenaline (Epinephrine) 1mg/ml",        "Epinephrine",             "other",        "Injection",  "1mg/ml",     "Vial",    120,  20,   85),
    ("Warfarin 5mg Tablets",                   "Warfarin",                "antihyp",      "Tablet",     "5mg",        "Tablet",   25,  50,  180),
]

# ── Diagnoses ─────────────────────────────────────────────────────────────────
# (icd10_code, diagnosis_text, specialist_code, [lab_codes], [rad_codes])
DIAGNOSES = [
    ("J06.9","Acute upper respiratory infection",        "SP01",["LAB001","LAB024"],               []),
    ("A09",  "Acute gastroenteritis",                    "SP01",["LAB001","LAB002","LAB022"],       []),
    ("B54",  "Unspecified malaria",                      "SP01",["LAB003","LAB004","LAB001"],       []),
    ("J18.9","Community-acquired pneumonia",             "SP04",["LAB001","LAB013","LAB024"],       ["RAD001"]),
    ("K29.7","Gastritis, unspecified",                   "SP04",["LAB007"],                         ["RAD008"]),
    ("I10",  "Essential hypertension",                   "SP04",["LAB008","LAB010","LAB026"],       ["PRO011"]),
    ("E11.9","Type 2 diabetes mellitus",                 "SP04",["LAB005","LAB011","LAB008"],       []),
    ("J45.9","Asthma, unspecified",                      "SP04",["LAB001"],                         ["RAD001","PRO010"]),
    ("N39.0","Urinary tract infection",                  "SP01",["LAB002","LAB014"],                []),
    ("A01.0","Typhoid fever",                            "SP04",["LAB001","LAB012","LAB013"],       []),
    ("K35.9","Acute appendicitis",                       "SP05",["LAB001","LAB024"],                ["RAD008"]),
    ("O80",  "Normal vaginal delivery",                  "SP03",["LAB001","LAB027","LAB021"],       ["RAD009"]),
    ("Z34.0","Antenatal supervision — 1st pregnancy",    "SP03",["LAB001","LAB021","LAB017","LAB020"],["RAD009"]),
    ("M54.5","Low back pain",                            "SP06",["LAB023"],                         ["RAD005","RAD006"]),
    ("R50.9","Fever of unknown origin",                  "SP01",["LAB001","LAB003","LAB012"],       []),
    ("K80.20","Cholelithiasis without cholecystitis",    "SP05",["LAB007"],                         ["RAD008"]),
    ("G43.9","Migraine, unspecified",                    "SP04",[],                                 ["RAD014"]),
    ("F32.9","Major depressive disorder",                "SP11",[],                                 []),
    ("L03.9","Cellulitis, unspecified",                  "SP01",["LAB001","LAB013"],                []),
    ("S52.0","Fracture of radius / ulna",                "SP06",[],                                 ["RAD006"]),
    ("H66.9","Otitis media",                             "SP07",["LAB001"],                         []),
    ("K21.0","Gastro-oesophageal reflux disease",        "SP04",["LAB007"],                         []),
    ("E03.9","Hypothyroidism, unspecified",              "SP04",["LAB009"],                         ["RAD012"]),
    ("D64.9","Anaemia, unspecified",                     "SP04",["LAB001","LAB007"],                []),
    ("N18.9","Chronic kidney disease",                   "SP04",["LAB008","LAB026","LAB002"],       ["RAD011"]),
    ("A15.0","Pulmonary tuberculosis",                   "SP04",["LAB015","LAB016","LAB001"],       ["RAD001"]),
    ("B20",  "HIV disease",                              "SP04",["LAB017","LAB016","LAB001"],       []),
    ("I50.9","Cardiac failure, unspecified",             "SP04",["LAB001","LAB008"],                ["RAD001","RAD013"]),
    ("N20.0","Renal calculus",                           "SP05",["LAB002","LAB008"],                ["RAD011","RAD008"]),
    ("O14.0","Mild pre-eclampsia",                       "SP03",["LAB008","LAB002","LAB025"],       ["RAD009"]),
    ("J22",  "Acute lower respiratory tract infection",  "SP02",["LAB001","LAB024"],                ["RAD001"]),
    ("K57.30","Diverticulitis of colon",                 "SP05",["LAB001","LAB024"],                ["RAD008","RAD016"]),
    ("I25.10","Ischaemic heart disease",                 "SP04",[],                                 ["RAD013","PRO011"]),
    ("C34.9","Malignant neoplasm of lung",               "SP04",["LAB001"],                         ["RAD001","RAD015"]),
    ("R55",  "Syncope and collapse",                     "SP04",["LAB005","LAB026"],                ["PRO011","RAD014"]),
]

# ── Clinical text pools ───────────────────────────────────────────────────────
COMPLAINTS = [
    "Fever and headache for 3 days",
    "Cough, cold and difficulty breathing",
    "Abdominal pain and vomiting since yesterday",
    "Chest pain — worse on exertion",
    "Joint pain and swelling",
    "High fever with rigors and chills",
    "Diarrhoea and vomiting — multiple episodes today",
    "Painful and frequent urination",
    "Skin rash and generalised itching",
    "Back pain radiating to the right leg",
    "Sore throat and difficulty swallowing — 4 days",
    "Right ear pain with discharge",
    "Eye redness, watering and foreign body sensation",
    "Breathlessness at rest — worsening over 2 days",
    "Palpitations and dizziness on standing",
    "Weight loss, night sweats and chronic cough",
    "Swollen legs and feet — 1 week",
    "Jaundice and dark urine",
    "Lower abdominal pain with vaginal discharge",
    "Child not feeding well — brought by mother",
    "Convulsions at home — brought by relative",
    "Road traffic accident — multiple injuries",
    "Burns to right upper limb",
    "Post-partum haemorrhage",
    "Reduced fetal movements",
    "Diabetic foot ulcer not healing",
    "Hypertensive urgency — referred from dispensary",
    "Routine antenatal visit",
    "Dental pain — toothache for 5 days",
    "Blurred vision — gradual onset",
    "Epigastric pain worse after meals",
    "Generalised body weakness and fatigue",
    "Recurrent headaches for 2 months",
]

PHYSICAL_FINDINGS = [
    "Alert and oriented. No pallor or jaundice. Chest clear bilaterally. CVS: S1 S2 heard, no murmurs. Abdomen: soft, non-tender, no organomegaly.",
    "Febrile 38.8°C. Tachycardic 110 bpm. Mild pallor. Chest: right basal crepitations. Abdomen: mild RIF tenderness.",
    "BP 168/102 mmHg. Alert. Bilateral pitting oedema ++. Chest: clear. CVS: normal. JVP not raised.",
    "Dehydrated. Skin turgor reduced. Dry mucous membranes. Abdomen: generalised mild tenderness. Bowel sounds present.",
    "Respiratory distress. RR 28/min. Dull to percussion right base. Bilateral basal crepitations. SpO2 88% on air.",
    "Jaundiced sclera and skin. Tender hepatomegaly 3 cm BCM. No splenomegaly. No ascites. Abdomen soft.",
    "Fully alert. Well nourished. Vitals stable. CVS normal. Chest: clear. Abdomen: soft, no organomegaly.",
    "Pallor +++. Tachycardia 118 bpm. Hepatosplenomegaly. Mild pedal oedema. Chest clear.",
    "Rebound tenderness and guarding, right iliac fossa. Rovsing's sign positive. Bowel sounds reduced. Temp 38.5°C.",
    "Gravid uterus — fundal height 32 weeks. FHR 144 bpm. Cephalic presentation. No vaginal bleeding. BP 130/85.",
    "Conscious but confused. GCS 13/15. Left-sided weakness. PERLA. BP 185/110.",
    "Audible wheeze. Intercostal recession. Prolonged expiratory phase. SpO2 92% on air.",
]

MANAGEMENT_PLANS = [
    "Initiate antipyretics (paracetamol 1g TDS). Oral hydration. Investigations as below. Review 48 hours.",
    "IV access — normal saline 1L over 6 hours. Broad-spectrum IV antibiotics. Monitor vitals 4-hourly. I&O chart.",
    "Adjust antihypertensive therapy. Low-salt diet counselled. Daily BP monitoring. Cardiac risk screening.",
    "Oral antimalarials (artemether-lumefantrine × 3 days). Rest and adequate fluids. Return if worsening.",
    "Surgical opinion requested urgently. Keep NPO. IV fluids. Urgent FBC and group & crossmatch.",
    "Insulin dose titration. Dietary counselling with clinical nutritionist. HbA1c in 3 months.",
    "Salbutamol nebulisation stat. Prednisolone 40mg OD × 5 days. Salbutamol inhaler PRN. Asthma action plan.",
    "Ferrous sulphate + folic acid. Dietary advice. Repeat FBC in 6 weeks to assess response.",
    "Oral antibiotics for 7 days. Increase fluid intake. MSU MC&S to guide therapy if no improvement.",
    "Physiotherapy referral. NSAIDs × 5 days (with PPI cover). Relative rest. Core-strengthening exercises.",
    "Discharge on prescription as written. Patient educated on adherence. Follow-up 1 month. Return if worsening.",
    "Admit under physician for observation and IV treatment. Specialist review requested.",
]

DOCTOR_NOTES = [
    "Patient counselled. Advised to return if symptoms persist beyond 48 hours.",
    "Follow-up appointment in 2 weeks.",
    "Referred for physiotherapy.",
    "Admitted under Dr. for observation and IV treatment.",
    "Discharge with prescription and written advice sheet.",
    "Patient stable. Review in 1 month.",
    "Results reviewed. Diagnosis confirmed. Management plan as above.",
    "",
]

# ── Lab result text generators ────────────────────────────────────────────────
def _lab_result(test_name):
    """Return (result_text, reference_range, interpretation) for a given test."""
    n = test_name

    if "Full Blood Count" in n:
        wbc = round(random.uniform(3.5, 14.0), 1)
        hb  = round(random.uniform(8.0, 17.5), 1)
        plt = random.randint(80, 450)
        ne  = round(random.uniform(40, 78), 1)
        ly  = round(100 - ne - random.uniform(6, 15), 1)
        text = (
            f"WBC:          {wbc} × 10⁹/L\n"
            f"RBC:          {round(random.uniform(3.2,5.8),2)} × 10¹²/L\n"
            f"Haemoglobin:  {hb} g/dL\n"
            f"Haematocrit:  {round(random.uniform(26,52),1)} %\n"
            f"MCV:          {round(random.uniform(70,100),1)} fL\n"
            f"Platelets:    {plt} × 10⁹/L\n"
            f"Neutrophils:  {ne}%\n"
            f"Lymphocytes:  {ly}%\n"
            f"Monocytes:    {random.randint(2,10)}%\n"
            f"Eosinophils:  {random.randint(0,6)}%"
        )
        ref   = "WBC 4.0–11.0 ×10⁹/L | Hb M:13.5–17.5 F:12.0–15.5 g/dL | Plt 150–400 ×10⁹/L"
        interp= "critical" if (hb < 7 or wbc > 30 or plt < 50) else \
                "abnormal" if (hb < 11 or wbc > 11 or wbc < 4 or plt < 150) else "normal"
        return text, ref, interp

    if "Urinalysis" in n:
        le  = random.choice(["Negative","Negative","Trace","1+","2+"])
        wbc_m = random.randint(0, 25) if le not in ("Negative","Trace") else random.randint(0, 2)
        text = (
            f"Colour:           {random.choice(['Pale yellow','Yellow','Dark yellow','Amber'])}\n"
            f"Clarity:          {random.choice(['Clear','Clear','Slightly turbid','Turbid'])}\n"
            f"pH:               {round(random.uniform(4.5,8.5),1)}\n"
            f"Specific Gravity: 1.{random.randint(5,30):03d}\n"
            f"Protein:          {random.choice(['Negative','Negative','Trace','1+','2+'])}\n"
            f"Glucose:          {random.choice(['Negative','Negative','Negative','1+'])}\n"
            f"Ketones:          {random.choice(['Negative','Trace','Negative'])}\n"
            f"Blood:            {random.choice(['Negative','Negative','Trace','1+'])}\n"
            f"Leukocyte Est.:   {le}\n"
            f"Nitrites:         {random.choice(['Negative','Negative','Negative','Positive'])}\n"
            f"Microscopy:       {wbc_m} WBC/HPF. {'Bacteria present — suggests UTI.' if wbc_m > 5 else '0-2 RBC/HPF. No casts.'}"
        )
        ref   = "pH 4.5–8.0 | Protein: Neg | Glucose: Neg | Blood: Neg"
        interp= "abnormal" if wbc_m > 5 or le in ("1+","2+") else "normal"
        return text, ref, interp

    if "Malaria RDT" in n:
        pos  = random.random() < 0.38
        text = (
            f"P. falciparum Antigen:  {'POSITIVE ✓' if pos else 'Negative'}\n"
            f"P. vivax Antigen:       Negative\n"
            f"Control Line:           Present (Test valid)"
        )
        return text, "Negative", "abnormal" if pos else "normal"

    if "Malaria Thick" in n:
        pos     = random.random() < 0.32
        density = f"+{random.randint(1,4)} ({random.randint(200,5000)} parasites/µL)" if pos else "0"
        text = (
            f"Thick Film: {'P. falciparum trophozoites seen' if pos else 'No parasites seen'}\n"
            f"Thin Film:  {'P. falciparum ring forms' if pos else 'No parasites seen'}\n"
            f"Parasite Density: {density}\n"
            f"Species: {'Plasmodium falciparum' if pos else 'N/A'}"
        )
        return text, "No parasites seen", "abnormal" if pos else "normal"

    if "Random Blood Sugar" in n:
        rbs = round(random.uniform(3.0, 22.0), 1)
        text = f"Random Blood Sugar: {rbs} mmol/L\nMethod: Glucometer\nSample: Capillary blood"
        return text, "3.9–7.8 mmol/L (non-fasting)", \
               "critical" if rbs > 20 else "abnormal" if rbs > 11.1 or rbs < 3.9 else "normal"

    if "Fasting Blood Sugar" in n:
        fbs = round(random.uniform(3.0, 16.0), 1)
        text = (
            f"Fasting Blood Sugar: {fbs} mmol/L\n"
            f"Fasting Duration: {random.randint(8,14)} hours\n"
            f"Method: Spectrophotometry"
        )
        return text, "3.9–5.5 mmol/L (fasting ≥8 hrs)", \
               "critical" if fbs > 15 else "abnormal" if fbs > 5.5 else "normal"

    if "Liver Function" in n:
        alt = random.randint(12, 200); ast = random.randint(10, 180)
        alb = round(random.uniform(25, 50), 1); tp = round(random.uniform(55, 85), 1)
        tbil= random.randint(3, 80)
        text = (
            f"Total Bilirubin:       {tbil} µmol/L\n"
            f"Direct Bilirubin:      {int(tbil*0.3)} µmol/L\n"
            f"Indirect Bilirubin:    {int(tbil*0.7)} µmol/L\n"
            f"ALT (SGPT):            {alt} U/L\n"
            f"AST (SGOT):            {ast} U/L\n"
            f"Alkaline Phosphatase:  {random.randint(40,320)} U/L\n"
            f"GGT:                   {random.randint(10,120)} U/L\n"
            f"Total Protein:         {tp} g/L\n"
            f"Albumin:               {alb} g/L\n"
            f"Globulin:              {round(tp-alb,1)} g/L"
        )
        ref   = "ALT 7–56 U/L | AST 10–40 U/L | Bilirubin 3–17 µmol/L | Albumin 35–50 g/L"
        interp= "critical" if alt > 150 else "abnormal" if alt > 56 or ast > 40 else "normal"
        return text, ref, interp

    if "Renal Function" in n:
        creat = random.randint(50, 350)
        egfr  = max(5, int(90 - (creat - 90) * 0.8))
        text = (
            f"Urea:            {round(random.uniform(2.0,20.0),1)} mmol/L\n"
            f"Creatinine:      {creat} µmol/L\n"
            f"eGFR:            {egfr} ml/min/1.73m²\n"
            f"Sodium (Na+):    {random.randint(128,152)} mmol/L\n"
            f"Potassium (K+):  {round(random.uniform(3.0,6.5),1)} mmol/L\n"
            f"Chloride (Cl-):  {random.randint(95,112)} mmol/L\n"
            f"Bicarbonate:     {random.randint(18,28)} mmol/L"
        )
        ref   = "Creatinine M:62–115 F:53–97 µmol/L | Na 136–145 | K 3.5–5.1 mmol/L"
        interp= "critical" if creat > 300 else "abnormal" if creat > 115 else "normal"
        return text, ref, interp

    if "HbA1c" in n:
        val = round(random.uniform(4.5, 14.0), 1)
        eag = round(val * 1.59 - 2.59, 1)
        text = (
            f"HbA1c:                        {val}%\n"
            f"Estimated Average Glucose:    {eag} mmol/L\n"
            f"Method: HPLC\n"
            f"Interpretation: {'Normal' if val < 5.7 else 'Pre-diabetes' if val < 6.5 else 'Diabetes mellitus'}"
        )
        return text, "Normal <5.7% | Pre-diabetes 5.7–6.4% | Diabetes ≥6.5%", \
               "critical" if val > 12 else "abnormal" if val >= 5.7 else "normal"

    if "HIV" in n:
        pos  = random.random() < 0.08
        text = (
            f"Determine (1st line):    {'Reactive' if pos else 'Non-reactive'}\n"
            f"Unigold (Confirmatory):  {'Reactive' if pos else 'Non-reactive'}\n"
            f"Final Result:            {'HIV POSITIVE' if pos else 'HIV Negative'}\n"
            f"Post-test counselling:   Done"
        )
        return text, "Non-reactive", "abnormal" if pos else "normal"

    if "Lipid" in n:
        tc  = round(random.uniform(3.0, 8.0), 2)
        hdl = round(random.uniform(0.8, 2.2), 2)
        ldl = round(random.uniform(1.5, 5.5), 2)
        tg  = round(random.uniform(0.5, 4.0), 2)
        text = (
            f"Total Cholesterol:  {tc} mmol/L\n"
            f"HDL Cholesterol:    {hdl} mmol/L\n"
            f"LDL Cholesterol:    {ldl} mmol/L\n"
            f"Triglycerides:      {tg} mmol/L\n"
            f"TC/HDL Ratio:       {round(tc/hdl,2)}\n"
            f"Non-HDL Chol:       {round(tc-hdl,2)} mmol/L"
        )
        ref   = "Total Chol <5.2 | LDL <3.4 | HDL M>1.0 F>1.3 | TG <1.7 (mmol/L)"
        interp= "abnormal" if ldl > 3.4 or tc > 5.2 or tg > 1.7 else "normal"
        return text, ref, interp

    if "Thyroid" in n:
        tsh = round(random.uniform(0.1, 10.0), 2)
        t4  = round(random.uniform(60, 180), 1)
        t3  = round(random.uniform(1.0, 3.5), 2)
        text = (
            f"TSH:    {tsh} mIU/L\n"
            f"Free T4: {t4} pmol/L\n"
            f"Free T3: {t3} pmol/L"
        )
        ref   = "TSH 0.4–4.0 mIU/L | Free T4 12–22 pmol/L | Free T3 3.1–6.8 pmol/L"
        interp= "abnormal" if tsh > 4.0 or tsh < 0.4 else "normal"
        return text, ref, interp

    if "CD4" in n:
        cd4 = random.randint(50, 1100)
        text = (
            f"CD4 Absolute Count:   {cd4} cells/µL\n"
            f"CD4 Percentage:       {random.randint(5,40)}%\n"
            f"Method: Flow Cytometry"
        )
        ref   = "Normal >500 cells/µL"
        interp= "critical" if cd4 < 200 else "abnormal" if cd4 < 500 else "normal"
        return text, ref, interp

    if "Widal" in n:
        pos  = random.random() < 0.28
        titer= random.choice(["1:80","1:160","1:320","1:640"]) if pos else "1:20"
        text = (
            f"Salmonella typhi O:  {titer}\n"
            f"Salmonella typhi H:  {titer if pos else '1:20'}\n"
            f"Salmonella paratyphi A: 1:20\n"
            f"Interpretation: {'Significant titre — suggestive of Typhoid' if pos else 'Titre within normal range'}"
        )
        return text, "Significant titre ≥1:160 in endemic areas", "abnormal" if pos else "normal"

    if "Sputum AFB" in n or "AFB" in n:
        grading = random.choice(["Negative","Negative","Negative","Scanty (1–9 AFB/100 fields)","1+ (10–99 AFB/100 fields)"])
        text = (
            f"Sample 1:  {grading}\n"
            f"Sample 2:  {'Negative' if grading == 'Negative' else random.choice(['Negative', grading])}\n"
            f"Method: Ziehl-Neelsen stain"
        )
        ref   = "No AFB seen"
        interp= "abnormal" if "Scanty" in grading or "+" in grading else "normal"
        return text, ref, interp

    if "Pregnancy Test" in n:
        pos  = random.random() < 0.45
        text = f"Urine βhCG: {'POSITIVE ✓' if pos else 'Negative'}\nMethod: Immunochromatographic strip test"
        return text, "Negative (non-pregnant)", "abnormal" if pos else "normal"

    if "Culture & Sensitivity" in n or "Culture" in n:
        organisms = ["No growth after 48 hours", "No growth after 48 hours",
                     "E. coli — sensitive to ciprofloxacin, nitrofurantoin. Resistant to amoxicillin.",
                     "Klebsiella pneumoniae — ESBL producer. Sensitive to meropenem.",
                     "Staphylococcus aureus — MSSA. Sensitive to flucloxacillin, clindamycin.",
                     "Streptococcus pneumoniae — Sensitive to penicillin, amoxicillin."]
        growth = random.choice(organisms)
        text = f"Organism:    {growth}\nColony Count: {random.randint(10,300)}K CFU/ml\nSensitivity:  See above"
        return text, "No growth / Sterile", "abnormal" if "No growth" not in growth else "normal"

    if "ESR" in n:
        esr = random.randint(2, 120)
        text = f"ESR (Westergren):  {esr} mm/hr\nSample: EDTA venous blood"
        return text, "M 0–15 mm/hr | F 0–20 mm/hr | Elderly up to 30 mm/hr", \
               "abnormal" if esr > 30 else "normal"

    if "CRP" in n:
        crp = round(random.uniform(0.5, 180.0), 1)
        text = f"CRP (high sensitivity):  {crp} mg/L\nMethod: Turbidimetry"
        return text, "Normal <10 mg/L | Mild inflammation 10–40 | Significant >40 mg/L", \
               "critical" if crp > 100 else "abnormal" if crp > 10 else "normal"

    if "Coagulation" in n or "PT" in n or "INR" in n:
        pt  = round(random.uniform(10, 30), 1)
        inr = round(pt / 12.5, 2)
        text = (
            f"Prothrombin Time (PT):   {pt} sec\n"
            f"INR:                     {inr}\n"
            f"APTT:                    {random.randint(25,65)} sec\n"
            f"Fibrinogen:              {round(random.uniform(1.5,5.0),1)} g/L"
        )
        return text, "PT 10–14 sec | INR 0.8–1.2 | APTT 25–35 sec", \
               "critical" if inr > 3.0 else "abnormal" if inr > 1.2 else "normal"

    if "Electrolytes" in n:
        na = random.randint(128, 152)
        k  = round(random.uniform(3.0, 6.5), 1)
        text = (
            f"Sodium (Na+):     {na} mmol/L\n"
            f"Potassium (K+):   {k} mmol/L\n"
            f"Chloride (Cl-):   {random.randint(95,112)} mmol/L\n"
            f"Bicarbonate:      {random.randint(18,28)} mmol/L"
        )
        return text, "Na 136–145 | K 3.5–5.1 | Cl 98–107 mmol/L", \
               "critical" if k > 6.0 or k < 2.5 or na < 120 else "abnormal" if k > 5.1 or na < 136 else "normal"

    if "Blood Group" in n or "Crossmatch" in n:
        text = (
            f"Blood Group:   {random.choice(BLOOD_GROUPS)}\n"
            f"Crossmatch:    {random.choice(['Compatible', 'Compatible', 'Incompatible — please repeat sample'])}\n"
            f"Units Requested: {random.randint(1,3)}"
        )
        return text, "N/A", "normal"

    if "Hepatitis B" in n:
        pos  = random.random() < 0.12
        text = f"HBsAg: {'POSITIVE ✓' if pos else 'Negative'}\nMethod: ELISA"
        return text, "Negative", "abnormal" if pos else "normal"

    if "Hepatitis C" in n:
        pos  = random.random() < 0.06
        text = f"Anti-HCV Antibody: {'POSITIVE ✓' if pos else 'Non-reactive'}\nMethod: Rapid immunochromatographic test"
        return text, "Non-reactive", "abnormal" if pos else "normal"

    if "VDRL" in n or "RPR" in n or "Syphilis" in n:
        pos  = random.random() < 0.05
        text = f"VDRL: {'Reactive — titre 1:8' if pos else 'Non-reactive'}\nRPR: {'Reactive' if pos else 'Non-reactive'}"
        return text, "Non-reactive", "abnormal" if pos else "normal"

    if "Stool" in n:
        organism = random.choice([
            "No ova, cysts or trophozoites seen.",
            "No ova, cysts or trophozoites seen.",
            "Ascaris lumbricoides ova detected.",
            "Entamoeba histolytica cysts detected.",
            "Giardia lamblia cysts detected.",
            "Trichuris trichiura ova detected.",
        ])
        text = f"Consistency: {random.choice(['Formed','Loose','Watery'])}\nMicroscopy: {organism}\nOccult Blood: {random.choice(['Negative','Negative','Positive'])}"
        return text, "No ova, cysts or trophozoites. Occult blood negative.", \
               "abnormal" if "detected" in organism else "normal"

    if "Amylase" in n or "Lipase" in n:
        amy = random.randint(20, 800)
        text = f"Serum Amylase: {amy} U/L\nSerum Lipase:  {random.randint(10,600)} U/L"
        return text, "Amylase 30–110 U/L | Lipase 10–140 U/L", \
               "critical" if amy > 600 else "abnormal" if amy > 110 else "normal"

    # Fallback
    result = random.choice(["Within normal limits.","Slightly elevated — correlate clinically.",
                             "Mildly reduced — repeat after treatment.","See separate detailed report."])
    return result, "Refer laboratory reference sheet", \
           random.choice(["normal","normal","normal","abnormal"])


# ── Radiology result pools ─────────────────────────────────────────────────────
RAD_RESULTS = {
    "Chest X-Ray (PA + Lateral)": [
        ("Lungs clear bilaterally. No consolidation, effusion or pneumothorax. Cardiac silhouette normal (CTR 0.47). Costophrenic angles sharp. Bony thorax intact.",
         "Normal chest X-ray. No acute cardiopulmonary disease."),
        ("Right lower lobe consolidation with air bronchograms. No pleural effusion. Cardiac size normal.",
         "Right lower lobe pneumonia. Clinical and microbiological correlation recommended."),
        ("Bilateral hilar lymphadenopathy. Miliary shadowing throughout both lung fields. No effusion.",
         "Features consistent with miliary pulmonary tuberculosis. Urgent sputum AFB and culture."),
        ("Cardiomegaly (CTR 0.62). Bilateral perihilar haze. Bilateral pleural effusions.",
         "Pulmonary oedema with cardiomegaly. Cardiac failure likely. Echo recommended."),
        ("Hyperinflated lung fields. Flattened hemidiaphragms. Increased AP diameter.",
         "Features of chronic obstructive pulmonary disease (COPD). Correlate clinically."),
    ],
    "Abdominal Ultrasound": [
        ("Liver: normal (13 cm), normal echotexture. Gallbladder: multiple calculi, largest 1.4 cm, acoustic shadowing. CBD 4 mm normal. Spleen normal. Kidneys normal. No free fluid.",
         "Cholelithiasis. No acute cholecystitis. CBD not dilated."),
        ("Liver: enlarged (17 cm), coarse echotexture, nodular surface. Spleen: 16 cm. Moderate ascites. Portal vein 16 mm.",
         "Liver cirrhosis with portal hypertension and ascites. Consider CT/MRI for HCC surveillance."),
        ("Normal abdominal ultrasound. Liver, gallbladder, spleen, pancreas and kidneys are sonographically normal. No free fluid.",
         "Normal abdominal ultrasound."),
        ("Right kidney: mild hydronephrosis grade 2. 7 mm calculus at pelvi-ureteric junction. Left kidney normal. Bladder normal.",
         "Right renal calculus at PUJ with mild hydronephrosis. Urology referral recommended."),
    ],
    "Obstetric Ultrasound": [
        ("Single intrauterine pregnancy. BPD 76mm, HC 276mm, AC 248mm, FL 52mm — 30+1 weeks. FHR 152 bpm. AFI 16 cm. Cephalic presentation. Placenta anterior.",
         "Intrauterine pregnancy 30+1 weeks. Single live fetus. Normal obstetric scan."),
        ("Twin pregnancy — DCDA. Twin A: cephalic, FHR 144 bpm, 28 wks. Twin B: transverse, FHR 138 bpm, 27+5 wks. No TTTS.",
         "Dichorionic diamniotic twin pregnancy, both viable ~28 weeks."),
        ("CRL 58 mm — 12+2 weeks. Single live embryo. FHR 168 bpm. NT 1.6 mm (normal). No gross anomaly.",
         "Intrauterine pregnancy 12+2 weeks. Normal first-trimester scan."),
        ("20-week anatomy scan. Normal fetal brain, spine, abdominal organs and limbs. Lips intact. Placenta lateral, no praevia. Cervical length 38 mm.",
         "Normal 20-week fetal anatomy scan. No structural anomaly detected."),
    ],
    "Renal & Bladder Ultrasound": [
        ("Both kidneys normal size and echotexture. No calculi or hydronephrosis. Bladder: wall 3 mm, no calculi. Residual urine 15 ml.",
         "Normal renal and bladder ultrasound."),
        ("Right kidney: multiple hyperechoic calculi, largest 9 mm. No hydronephrosis. Left kidney normal.",
         "Right nephrolithiasis without hydronephrosis. Urology review recommended."),
    ],
    "CT Scan — Head": [
        ("No intracranial haemorrhage. No space-occupying lesion. Grey-white differentiation maintained. No midline shift. Ventricles normal.",
         "Normal CT brain. No acute intracranial pathology."),
        ("Hyperdense lesion right basal ganglia 3.2 × 2.8 cm — intracerebral haemorrhage. Peri-haematomal oedema. Midline shift 4 mm left.",
         "Right basal ganglia intracerebral haemorrhage with mild midline shift. Neurosurgery review."),
        ("Ill-defined hypodense area left MCA territory. Loss of grey-white differentiation. Subacute infarction. No haemorrhagic transformation.",
         "Left MCA territory infarction (subacute). Neurology review and MRI recommended."),
    ],
    "Limb X-Ray (Any)": [
        ("Distal radius fracture — Colles type. Dorsal displacement and angulation of distal fragment. Ulnar styloid intact.",
         "Colles fracture distal radius. Orthopaedic referral for manipulation and cast."),
        ("Transverse mid-shaft tibia fracture. Mild displacement. Fibula intact. No articular involvement.",
         "Mid-shaft tibial fracture. Orthopaedic review for management."),
        ("No fracture or dislocation identified. Normal alignment. Soft tissue swelling laterally over the ankle.",
         "No bony injury. Soft tissue swelling — likely ligament sprain."),
    ],
    "Lumbar Spine X-Ray": [
        ("L4-L5 and L5-S1 disc space narrowing. Marginal osteophytes. No fracture or spondylolisthesis.",
         "Degenerative disc disease L4-L5, L5-S1. Correlate clinically."),
        ("Normal lumbar spine alignment. No fracture. No significant disc space narrowing. Bone density adequate.",
         "Normal lumbar spine X-ray."),
    ],
    "Echocardiography": [
        ("LV: mildly dilated, EF 42%. Mild mitral regurgitation. Grade 2 diastolic dysfunction. No pericardial effusion.",
         "Dilated cardiomyopathy with mildly reduced EF 42%. Mild MR. Cardiology review."),
        ("LV: normal size and function, EF 62%. No valvular disease. No pericardial effusion. Diastolic function normal.",
         "Normal echocardiogram. EF 62%."),
    ],
}

def _rad_result(tariff_name):
    """Return (findings, impression) for a radiology order."""
    pool = RAD_RESULTS.get(tariff_name)
    if pool:
        return random.choice(pool)
    return (
        "Examination performed. No acute abnormality detected on current views.",
        "Normal study. No acute finding.",
    )


# ══════════════════════════════════════════════════════════════════════════════
#  UTILITY HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _phone():
    prefix = random.choice(["0712","0722","0733","0700","0710","0720","0723",
                             "0743","0745","0756","0769","0790","0701","0711"])
    return prefix + "".join(random.choices(string.digits, k=6))

def _id_number():
    return "".join(random.choices(string.digits, k=8))

def _sha_number():
    return f"SHA-{random.randint(100000,999999)}-{random.randint(10,99)}" \
           if random.random() < 0.65 else ""

def _rnd_date(start, end):
    delta = max(0, (end - start).days)
    return start + timedelta(days=random.randint(0, delta))

def _aware_dt(d, h_min=7, h_max=20):
    naive = datetime(d.year, d.month, d.day,
                     random.randint(h_min, h_max),
                     random.randint(0, 59),
                     random.randint(0, 59))
    return timezone.make_aware(naive)

def _weighted(choices, weights):
    r, cum = random.uniform(0, sum(weights)), 0
    for c, w in zip(choices, weights):
        cum += w
        if r <= cum:
            return c
    return choices[-1]

def _mpesa():
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=10))


# ══════════════════════════════════════════════════════════════════════════════
#  THE MANAGEMENT COMMAND
# ══════════════════════════════════════════════════════════════════════════════

class Command(BaseCommand):
    help = "Seed the HMIS database with 1 year of realistic Kenyan hospital data."

    def add_arguments(self, parser):
        parser.add_argument("--months",   type=int, default=12,
                            help="Months of history (default: 12)")
        parser.add_argument("--patients", type=int, default=0,
                            help="Number of patients (0 = auto: 50 × months)")
        parser.add_argument("--flush",    action="store_true",
                            help="Delete all existing data first")
        parser.add_argument("--summary",  action="store_true",
                            help="Print record counts when done")

    # ─────────────────────────────────────────────────────────────────────────
    def handle(self, *args, **opts):
        months    = opts["months"]
        n_patients= opts["patients"] or max(150, 50 * months)
        end_date  = date.today()
        start_date= end_date - timedelta(days=30 * months)

        self.stdout.write(self.style.WARNING(
            f"\n{'═'*60}\n"
            f"  🏥  HMIS Seed Data\n"
            f"  Period  : {start_date} → {end_date}  ({months} months)\n"
            f"  Patients: ~{n_patients}\n"
            f"  Flush   : {opts['flush']}\n"
            f"{'═'*60}\n"
        ))

        if opts["flush"]:
            self._flush()

        with transaction.atomic():
            staff       = self._seed_users()
            drugs       = self._seed_drugs()
            specialists = self._seed_specialists()
            tariffs     = self._seed_tariffs()
            patients    = self._seed_patients(n_patients, staff, start_date, end_date)
            self._seed_clinical(patients, staff, specialists, tariffs, drugs, start_date, end_date)

        if opts["summary"]:
            self._summary()

        self.stdout.write(self.style.SUCCESS(f"\n{'═'*60}\n  ✅  Done!\n{'═'*60}\n"))

    # ─────────────────────────────────────────────────────────────────────────
    def _flush(self):
        self.stdout.write("  🗑️  Flushing … ", ending="")
        for model in [Payment, InvoiceItem, Invoice,
                      PrescriptionItem, Prescription,
                      RadiologyResult, RadiologyOrder,
                      LabResult, LabOrder,
                      ConsultationItem, Consultation,
                      Triage, Visit, Patient,
                      ServiceTariff, Specialist, DrugInventory]:
            model.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        self.stdout.write(self.style.SUCCESS("done\n"))

    # ── 1. Users ──────────────────────────────────────────────────────────────
    def _seed_users(self):
        self.stdout.write("  👤  Users … ", ending="")
        created = []
        for i, (fn, ln, uname, role, dept, spec, lic) in enumerate(STAFF):
            u, new = User.objects.get_or_create(
                username=uname,
                defaults=dict(
                    first_name    =fn, last_name=ln,
                    email         =f"{uname}@hospital.co.ke",
                    role          =role,
                    department    =dept,
                    specialization=spec,
                    license_number=lic,
                    phone         =_phone(),
                    employee_id   =f"EMP{1000+i:04d}",
                    is_active     =True,
                    is_available  =True,
                ),
            )
            if new:
                u.set_password("1234"); u.save()
            created.append(u)

        if not User.objects.filter(username="admin").exists():
            su = User.objects.create_superuser(
                username="admin", password="admin123",
                email="admin@hospital.co.ke",
                first_name="System", last_name="Administrator",
                role="admin",
            )
            created.append(su)

        self.stdout.write(self.style.SUCCESS(f"{len(created)} users\n"))
        return created

    # ── 2. Drugs ──────────────────────────────────────────────────────────────
    def _seed_drugs(self):
        self.stdout.write("  💊  Drugs … ", ending="")
        today     = date.today()
        suppliers = ["KEMSA","Medisel Kenya Ltd","AAR Healthcare","Haltons Ltd",
                     "Regal Pharmaceuticals","Elys Chemical Industries","Beta Healthcare"]
        created = []
        for name, generic, cat, form, strength, unit, price, reorder, stock in DRUGS:
            d, _ = DrugInventory.objects.get_or_create(
                name=name,
                defaults=dict(
                    generic_name  =generic,
                    category      =cat,
                    formulation   =form,
                    strength      =strength,
                    unit          =unit,
                    stock_quantity=max(0, stock + random.randint(-30, 80)),
                    reorder_level =reorder,
                    unit_price    =Decimal(str(price + random.randint(-1, 4))),
                    expiry_date   =today + timedelta(days=random.randint(-60, 1095)),
                    batch_number  =f"BN{random.randint(10000,99999)}",
                    supplier      =random.choice(suppliers),
                    is_active     =True,
                ),
            )
            created.append(d)
        self.stdout.write(self.style.SUCCESS(f"{len(created)} drugs\n"))
        return created

    # ── 3. Specialists ────────────────────────────────────────────────────────
    def _seed_specialists(self):
        self.stdout.write("  🏥  Specialists … ", ending="")
        created = []
        for code, name, fee, desc in SPECIALISTS:
            s, _ = Specialist.objects.get_or_create(
                code=code,
                defaults=dict(name=name, consultation_fee=Decimal(str(fee)),
                              description=desc, is_active=True),
            )
            created.append(s)
        self.stdout.write(self.style.SUCCESS(f"{len(created)} specialists\n"))
        return created

    # ── 4. Tariffs ────────────────────────────────────────────────────────────
    def _seed_tariffs(self):
        self.stdout.write("  🏷️   Tariffs … ", ending="")
        created = []
        for code, name, cat, price, sha_cov, sha_rate in TARIFFS:
            t, _ = ServiceTariff.objects.get_or_create(
                code=code,
                defaults=dict(
                    name       =name,
                    category   =cat,
                    price      =Decimal(str(price)),
                    sha_covered=sha_cov,
                    sha_rate   =Decimal(str(sha_rate)),
                    is_active  =True,
                ),
            )
            created.append(t)
        self.stdout.write(self.style.SUCCESS(f"{len(created)} tariffs\n"))
        return created

    # ── 5. Patients ───────────────────────────────────────────────────────────
    def _seed_patients(self, count, staff, start_date, end_date):
        self.stdout.write(f"  🧑  Patients ({count}) … ", ending="")
        recvs = [u for u in staff if u.role == "receptionist"] or staff[:1]
        rows  = []

        # Determine starting sequence per year to avoid collisions
        from django.db.models import Max
        year = date.today().year
        last = Patient.objects.filter(
            patient_number__startswith=f"KNH-{year}-"
        ).aggregate(m=Max("patient_number"))["m"]
        if last:
            try:
                seq_start = int(last.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq_start = Patient.objects.filter(created_at__year=year).count() + 1
        else:
            seq_start = 1

        for i in range(count):
            gender  = _weighted(["Male","Female"], [46, 54])
            age_yrs = random.choices(
                range(91),
                weights=[
                    *[8]*5, *[4]*10, *[5]*50, *[3]*20, *[4]*6
                ], k=1
            )[0]
            dob      = date.today() - timedelta(days=age_yrs*365 + random.randint(0, 364))
            is_minor = age_yrs < 18
            sha      = _sha_number()
            reg_d    = _rnd_date(start_date, end_date)

            rows.append(Patient(
                patient_number=f"KNH-{year}-{seq_start + i:05d}",  # ← pre-assigned, unique
                first_name  =random.choice(MALE_NAMES if gender == "Male" else FEMALE_NAMES),
                middle_name =random.choice(MALE_NAMES + FEMALE_NAMES) if random.random() < 0.55 else "",
                last_name   =random.choice(LAST_NAMES),
                date_of_birth=dob,
                gender      =gender,
                blood_group =random.choice(BLOOD_GROUPS),
                nationality =_weighted(["Kenyan","Ugandan","Tanzanian","Other"], [95, 2, 2, 1]),
                id_type     ="National ID" if not is_minor else _weighted(
                    ["National ID","Birth Certificate","Passport"],[10,80,10]),
                id_number   =_id_number() if not is_minor else "",
                phone       =_phone(),
                alt_phone   =_phone() if random.random() < 0.28 else "",
                email       =f"patient{random.randint(100,9999)}@gmail.com" if random.random() < 0.2 else "",
                county      =random.choice(COUNTIES),
                sub_county  =random.choice(["Central","East","West","North","South"]) + " Sub-County",
                village     =random.choice(LAST_NAMES) + " Village",
                occupation  =random.choice(OCCUPATIONS),
                is_minor    =is_minor,
                guardian_name   =f"{random.choice(FEMALE_NAMES)} {random.choice(LAST_NAMES)}" if is_minor else "",
                guardian_phone  =_phone() if is_minor else "",
                guardian_relation=random.choice(GUARDIAN_RELATIONS) if is_minor else "",
                guardian_id     =_id_number() if is_minor else "",
                sha_number  =sha,
                sha_verified=bool(sha),
                sha_scheme  =_weighted(["Primary Care","Enhanced",""], [50, 15, 35]) if sha else "",
                nhif_number =f"NHIF{random.randint(100000,999999)}" if random.random() < 0.18 else "",
                allergies           =random.choice(ALLERGIES),
                chronic_conditions  =random.choice(CHRONIC_CONDITIONS),
                nok_name    =f"{random.choice(MALE_NAMES)} {random.choice(LAST_NAMES)}",
                nok_phone   =_phone(),
                nok_relation=random.choice(NOK_RELATIONS),
                registered_by=random.choice(recvs),
                created_at  =timezone.make_aware(datetime(reg_d.year, reg_d.month, reg_d.day, 8, 0, 0)),
            ))

        Patient.objects.bulk_create(rows, batch_size=200)
        patients = list(Patient.objects.order_by("created_at"))
        self.stdout.write(self.style.SUCCESS(f"{len(patients)} patients\n"))
        return patients

    

    # ── 6–15. All clinical data ────────────────────────────────────────────────
    def _seed_clinical(self, patients, staff, specialists, tariffs, drugs, start_date, end_date):
        self.stdout.write("  🔄  Clinical data …\n")

        # Role buckets
        recvs  = [u for u in staff if u.role == "receptionist"] or staff[:1]
        nurses = [u for u in staff if u.role == "nurse"]        or staff[:1]
        docs   = [u for u in staff if u.role == "doctor"]       or staff[:1]
        labs   = [u for u in staff if u.role == "lab"]          or staff[:1]
        rads   = [u for u in staff if u.role == "radiology"]    or staff[:1]
        pharms = [u for u in staff if u.role == "pharmacist"]   or staff[:1]

        # Index tariffs by code for O(1) lookup
        t_by_code = {t.code: t for t in tariffs}
        lab_ts    = [t for t in tariffs if t.category == "lab"]
        rad_ts    = [t for t in tariffs if t.category == "radiology"]
        proc_ts   = [t for t in tariffs if t.category == "procedure"]
        spec_map  = {s.code: s for s in specialists}

        # Build diagnosis lookup by specialist code
        diag_by_spec = {}
        for row in DIAGNOSES:
            diag_by_spec.setdefault(row[2], []).append(row)

        total = len(patients)
        cv = ct = cc = cci = cl = cr = crx = ci = 0   # counters

        for pidx, patient in enumerate(patients):
            if pidx % 100 == 0:
                self.stdout.write(f"      [{pidx+1}/{total}] …")

            # Patients with chronic illness attend more often
            has_chronic = patient.chronic_conditions not in ("None", "")
            n_visits = _weighted(
                [1, 2, 3, 4, 5, 6, 7, 8],
                [10, 18, 22, 20, 13, 8, 5, 4] if has_chronic else
                [16, 22, 22, 17, 11, 6, 4, 2]
            )

            for _ in range(n_visits):
                vdate    = _rnd_date(start_date, end_date)
                checkin  = _aware_dt(vdate, 7, 11)
                spec_obj = random.choice(specialists)
                doctor   = random.choice(docs)
                recv     = random.choice(recvs)
                nurse    = random.choice(nurses)
                lab_t    = random.choice(labs)
                rad_t    = random.choice(rads)
                pharm    = random.choice(pharms)

                pay_method = _weighted(
                    ["Cash","M-Pesa","SHA","Insurance","Waiver"],
                    [33,     28,      26,   10,          3],
                )
                if pay_method == "SHA" and not patient.sha_number:
                    pay_method = "Cash"

                mpesa_ref = _mpesa() if pay_method == "M-Pesa" else ""
                sha_auth  = f"SHA{random.randint(100000,999999)}" if pay_method == "SHA" else ""

                vtype  = _weighted(["outpatient","emergency","inpatient"], [78, 17, 5])
                status = _weighted(
                    ["discharged","discharged","admitted","referred","prescribing"],
                    [50,          30,           7,          5,         8],
                )
                if pay_method == "Waiver":
                    status = "discharged"

                t_triage   = checkin + timedelta(minutes=random.randint(5, 45))
                t_consult  = checkin + timedelta(minutes=random.randint(55, 130))
                t_discharge= checkin + timedelta(minutes=random.randint(140, 420))

                # ── Visit ──────────────────────────────────────────────────
                visit = Visit(
                    patient        =patient,
                    visit_type     =vtype,
                    specialist     =spec_obj,
                    assigned_doctor=doctor,
                    status         =status,
                    payment_method =pay_method,
                    sha_auth_code  =sha_auth,
                    mpesa_ref      =mpesa_ref,
                    check_in_time  =checkin,
                    triage_time    =t_triage,
                    consult_start  =t_consult,
                    discharge_time =t_discharge if status == "discharged" else None,
                    registered_by  =recv,
                )
                visit.save(); cv += 1

                # ── Triage ──────────────────────────────────────────────────
                wt  = round(random.uniform(12.0 if patient.is_minor else 40.0, 120.0), 1)
                ht  = round(random.uniform(85.0 if patient.is_minor else 140.0, 198.0), 1)
                bmi = round(wt / (ht / 100) ** 2, 1)
                priority = _weighted(["normal","urgent","immediate","non_urgent"], [63, 21, 5, 11])

                Triage.objects.create(
                    visit              =visit,
                    temperature        =round(random.uniform(35.2, 40.8), 1),
                    pulse_rate         =random.randint(50, 135),
                    respiratory_rate   =random.randint(12, 32),
                    bp_systolic        =random.randint(85, 185),
                    bp_diastolic       =random.randint(50, 115),
                    oxygen_saturation  =random.randint(85, 100),
                    weight             =wt,
                    height             =ht,
                    bmi                =bmi,
                    blood_sugar        =round(random.uniform(3.2, 18.0), 1) if random.random() < 0.55 else None,
                    presenting_complaint=random.choice(COMPLAINTS),
                    priority           =priority,
                    triage_notes       =_weighted([
                        "Stable on presentation. Vitals within acceptable range.",
                        "Patient in pain — priority escalated.",
                        "Brought in by relative. History from guardian.",
                        "Referred from dispensary with referral letter.",
                        "High fever. Antipyretic given in triage.",
                        "",
                    ], [15, 12, 10, 10, 10, 43]),
                    triaged_by=nurse,
                )
                ct += 1

                # ── Diagnosis aligned to specialist ────────────────────────
                pool = diag_by_spec.get(spec_obj.code, DIAGNOSES)
                icd, diag, _, rec_labs, rec_rads = random.choice(pool)

                # ── Consultation ────────────────────────────────────────────
                c_status = "completed" if status in ("discharged","admitted","referred","prescribing") else "open"

                consult = Consultation.objects.create(
                    visit               =visit,
                    doctor              =doctor,
                    status              =c_status,
                    chief_complaint     =random.choice(COMPLAINTS),
                    history_of_illness  =(
                        f"Patient presents with {diag.lower()}. "
                        f"Onset {random.randint(1,21)} days ago. "
                        f"{'No significant PMH.' if patient.chronic_conditions in ('None','') else f'Background: {patient.chronic_conditions}.'}"
                    ),
                    physical_examination=random.choice(PHYSICAL_FINDINGS),
                    diagnosis           =diag,
                    icd10_code          =icd,
                    management_plan     =random.choice(MANAGEMENT_PLANS),
                    doctor_notes        =random.choice(DOCTOR_NOTES),
                    disposition         =_weighted(["discharge","admit","refer","review"], [64, 10, 8, 18]),
                    started_at          =t_consult,
                    ended_at            =t_discharge if c_status == "completed" else None,
                )
                cc += 1

                # ── Consultation Items (billable procedures) ─────────────────
                if proc_ts and random.random() < 0.58:
                    for proc in random.sample(proc_ts, min(_weighted([1,2,3],[55,30,15]), len(proc_ts))):
                        ConsultationItem.objects.create(
                            consultation=consult,
                            tariff      =proc,
                            description =proc.name,
                            quantity    =1,
                            unit_price  =proc.price,
                        )
                        cci += 1

                # ── Lab Orders & Results ────────────────────────────────────
                visit_lab_orders = []
                ordered = set()

                # Diagnosis-recommended labs (80% chance each)
                for code in rec_labs:
                    if code in t_by_code and random.random() < 0.80:
                        ordered.add(code)
                # Extra random labs (55% chance, 1-3 tests)
                if lab_ts and random.random() < 0.55:
                    for t in random.sample(lab_ts, min(random.randint(1,3), len(lab_ts))):
                        ordered.add(t.code)

                for code in ordered:
                    tariff_obj = t_by_code.get(code)
                    if not tariff_obj:
                        continue
                    urg = _weighted(["routine","urgent","stat"], [68, 24, 8])
                    if priority == "immediate":
                        urg = "stat"

                    lo = LabOrder.objects.create(
                        visit         =visit,
                        consultation  =consult,
                        tariff        =tariff_obj,
                        status        ="resulted",
                        urgency       =urg,
                        clinical_notes=f"Investigate {diag}.",
                        ordered_by    =doctor,
                    )
                    result_text, ref_range, interp = _lab_result(tariff_obj.name)
                    LabResult.objects.create(
                        order          =lo,
                        result_text    =result_text,
                        reference_range=ref_range,
                        interpretation =interp,
                        comments       ="Correlate clinically." if interp != "normal" else "",
                        performed_by   =lab_t,
                    )
                    visit_lab_orders.append(lo)
                    cl += 1

                # ── Radiology Orders & Results ──────────────────────────────
                visit_rad_orders = []
                rad_ordered = set()

                # Diagnosis-recommended radiology (72% chance each)
                for code in rec_rads:
                    if code in t_by_code and random.random() < 0.72:
                        rad_ordered.add(code)
                # Extra random radiology (22% chance)
                if rad_ts and random.random() < 0.22:
                    rad_ordered.add(random.choice(rad_ts).code)

                for code in rad_ordered:
                    tariff_obj = t_by_code.get(code)
                    if not tariff_obj:
                        continue
                    ro = RadiologyOrder.objects.create(
                        visit        =visit,
                        consultation =consult,
                        tariff       =tariff_obj,
                        status       ="resulted",
                        clinical_info=f"Query {diag}. Please report.",
                        ordered_by   =doctor,
                    )
                    findings, impression = _rad_result(tariff_obj.name)
                    RadiologyResult.objects.create(
                        order       =ro,
                        findings    =findings,
                        impression  =impression,
                        performed_by=rad_t,
                    )
                    visit_rad_orders.append(ro)
                    cr += 1

                # ── Prescription & Items ────────────────────────────────────
                rx_cost = Decimal("0")
                prescription = None

                if drugs and status in ("discharged","prescribing","admitted"):
                    n_drugs = _weighted([1,2,3,4,5], [18,28,28,18,8])
                    sel     = random.sample(drugs, min(n_drugs, len(drugs)))
                    rx_st   = "dispensed" if status == "discharged" else "pending"

                    prescription = Prescription.objects.create(
                        visit        =visit,
                        consultation =consult,
                        status       =rx_st,
                        notes        =_weighted([
                            "Take all medicines as directed. Complete the full course.",
                            "Take with food to reduce stomach upset.",
                            "Take on empty stomach (30 min before meals).",
                            "Avoid alcohol while on this medication.",
                            "",
                        ], [30, 22, 15, 15, 18]),
                        prescribed_by=doctor,
                        dispensed_by =pharm if rx_st == "dispensed" else None,
                        dispensed_at =t_discharge - timedelta(minutes=30) if rx_st == "dispensed" else None,
                    )
                    crx += 1

                    freqs    = ["OD – Once daily","BD – Twice daily","TID – Three times daily",
                                "QID – Four times daily","Stat dose","PRN – As needed"]
                    durations= ["3 days","5 days","7 days","10 days","14 days","1 month","3 months"]

                    for drug in sel:
                        qty = _weighted([7,10,14,21,28,30],[15,20,25,20,15,5])
                        PrescriptionItem.objects.create(
                            prescription=prescription,
                            drug        =drug,
                            dose        =drug.strength,
                            frequency   =random.choice(freqs),
                            duration    =random.choice(durations),
                            quantity    =qty,
                            instructions=_weighted([
                                "Take after meals","Take before meals",
                                "Take with a full glass of water","Take at bedtime","",
                            ],[25,15,20,15,25]),
                            is_dispensed=rx_st == "dispensed",
                            unit_price  =drug.unit_price,
                        )
                        rx_cost += drug.unit_price * qty

                # ── Invoice ────────────────────────────────────────────────
                # Build line items
                lines = []
                grand = Decimal("0")

                def _add(desc, cat, qty, price, sha_cov, sha_r):
                    nonlocal grand
                    lines.append(dict(description=desc, category=cat,
                                      quantity=qty, unit_price=price,
                                      sha_covered=sha_cov, sha_rate=sha_r))
                    grand += price * qty

                # Consultation fee
                _add(f"{spec_obj.name} — Consultation", "consultation", 1,
                     spec_obj.consultation_fee,
                     patient.sha_verified,
                     spec_obj.consultation_fee * Decimal("0.8") if patient.sha_verified else Decimal("0"))

                # Lab fees
                for lo in visit_lab_orders:
                    _add(lo.tariff.name, "lab", 1, lo.tariff.price,
                         lo.tariff.sha_covered, lo.tariff.sha_rate)

                # Radiology fees
                for ro in visit_rad_orders:
                    _add(ro.tariff.name, "radiology", 1, ro.tariff.price,
                         ro.tariff.sha_covered, ro.tariff.sha_rate)

                # Procedure fees from ConsultationItems
                for ci_obj in ConsultationItem.objects.filter(consultation=consult):
                    _add(ci_obj.tariff.name, "procedure",
                         ci_obj.quantity, ci_obj.unit_price,
                         ci_obj.tariff.sha_covered, ci_obj.tariff.sha_rate)

                # Pharmacy
                if rx_cost > 0:
                    _add(f"Pharmacy — {len(sel)} item(s)", "pharmacy",
                         1, rx_cost, False, Decimal("0"))

                sha_total = sum(Decimal(str(l["sha_rate"])) for l in lines if l["sha_covered"])
                pat_total = grand - sha_total

                # Payment status logic
                inv_status = _weighted(
                    ["paid","paid","partial","pending","waived"],
                    [45,   20,    18,       14,      3],
                )
                if pay_method == "Waiver":
                    inv_status = "waived"
                elif pay_method == "SHA" and patient.sha_verified:
                    inv_status = _weighted(["paid","partial"], [75, 25])

                amount_paid = (
                    pat_total if inv_status in ("paid","waived")
                    else round(pat_total * Decimal(str(round(random.uniform(0.2, 0.8), 2))), 2)
                    if inv_status == "partial" else Decimal("0")
                )

                invoice = Invoice(
                    visit         =visit,
                    patient       =patient,
                    status        =inv_status,
                    total_amount  =grand,
                    sha_amount    =sha_total,
                    patient_amount=pat_total,
                    amount_paid   =amount_paid,
                    notes         =f"Payment: {pay_method}",
                    created_by    =recv,
                )
                invoice.save(); ci += 1

                for l in lines:
                    InvoiceItem.objects.create(invoice=invoice, **l)

                # Payment record
                if amount_paid > 0:
                    Payment.objects.create(
                        invoice    =invoice,
                        amount     =amount_paid,
                        method     =pay_method,
                        reference  =mpesa_ref or sha_auth or f"RCPT-{random.randint(1000,9999)}",
                        received_by=recv,
                        paid_at    =checkin + timedelta(minutes=random.randint(2, 20)),
                        notes      =f"Received at reception — {pay_method}",
                    )

        self.stdout.write(self.style.SUCCESS(
            f"\n      Visits:{cv}  Triage:{ct}  Consult:{cc}  ProcItems:{cci}\n"
            f"      LabOrders:{cl}  RadOrders:{cr}  Prescriptions:{crx}  Invoices:{ci}\n"
        ))

    # ── Summary ───────────────────────────────────────────────────────────────
    def _summary(self):
        from django.db.models import Sum
        W = 32
        sep = "═" * 60
        self.stdout.write(f"\n{sep}")
        self.stdout.write(self.style.HTTP_INFO("  📊  DATABASE SUMMARY"))
        self.stdout.write(sep)

        rows = [
            ("Users",                User.objects.count()),
            ("  Doctors",            User.objects.filter(role="doctor").count()),
            ("  Nurses",             User.objects.filter(role="nurse").count()),
            ("  Receptionists",      User.objects.filter(role="receptionist").count()),
            ("  Pharmacists",        User.objects.filter(role="pharmacist").count()),
            ("  Lab Technicians",    User.objects.filter(role="lab").count()),
            ("  Radiographers",      User.objects.filter(role="radiology").count()),
            ("Drug Inventory",       DrugInventory.objects.count()),
            ("  Low-stock items",    DrugInventory.objects.filter(stock_quantity__lte=50).count()),
            ("  Expired",            sum(1 for d in DrugInventory.objects.all() if d.is_expired)),
            ("Specialists",          Specialist.objects.count()),
            ("Service Tariffs",      ServiceTariff.objects.count()),
            ("── Patients",          Patient.objects.count()),
            ("  Paediatric",         Patient.objects.filter(is_minor=True).count()),
            ("  SHA insured",        Patient.objects.filter(sha_verified=True).count()),
            ("  With allergies",     Patient.objects.exclude(allergies__in=["None",""]).count()),
            ("  With chronic cond.", Patient.objects.exclude(chronic_conditions__in=["None",""]).count()),
            ("── Visits",            Visit.objects.count()),
            ("  Outpatient",         Visit.objects.filter(visit_type="outpatient").count()),
            ("  Emergency",          Visit.objects.filter(visit_type="emergency").count()),
            ("  Inpatient",          Visit.objects.filter(visit_type="inpatient").count()),
            ("  Discharged",         Visit.objects.filter(status="discharged").count()),
            ("  Admitted",           Visit.objects.filter(status="admitted").count()),
            ("  Referred",           Visit.objects.filter(status="referred").count()),
            ("── Clinical",          ""),
            ("Triage Records",       Triage.objects.count()),
            ("  Immediate (red)",    Triage.objects.filter(priority="immediate").count()),
            ("  Urgent (orange)",    Triage.objects.filter(priority="urgent").count()),
            ("Consultations",        Consultation.objects.count()),
            ("  Completed",          Consultation.objects.filter(status="completed").count()),
            ("Consultation Items",   ConsultationItem.objects.count()),
            ("Lab Orders",           LabOrder.objects.count()),
            ("Lab Results",          LabResult.objects.count()),
            ("  Abnormal results",   LabResult.objects.filter(interpretation="abnormal").count()),
            ("  Critical results",   LabResult.objects.filter(interpretation="critical").count()),
            ("Radiology Orders",     RadiologyOrder.objects.count()),
            ("Radiology Results",    RadiologyResult.objects.count()),
            ("Prescriptions",        Prescription.objects.count()),
            ("  Dispensed",          Prescription.objects.filter(status="dispensed").count()),
            ("  Pending",            Prescription.objects.filter(status="pending").count()),
            ("Prescription Items",   PrescriptionItem.objects.count()),
            ("── Billing",           ""),
            ("Invoices",             Invoice.objects.count()),
            ("  Paid",               Invoice.objects.filter(status="paid").count()),
            ("  Partial",            Invoice.objects.filter(status="partial").count()),
            ("  Pending",            Invoice.objects.filter(status="pending").count()),
            ("  Waived",             Invoice.objects.filter(status="waived").count()),
            ("Invoice Items",        InvoiceItem.objects.count()),
            ("Payments",             Payment.objects.count()),
        ]
        for label, val in rows:
            if val == "":
                self.stdout.write("")
            else:
                self.stdout.write(f"  {label:<{W}} {val:>8,}")

        # Revenue breakdown
        total_rev = Payment.objects.aggregate(t=Sum("amount"))["t"] or 0
        sha_rev   = Invoice.objects.aggregate(t=Sum("sha_amount"))["t"] or 0
        cash_rev  = Payment.objects.filter(method="Cash").aggregate(t=Sum("amount"))["t"] or 0
        mpesa_rev = Payment.objects.filter(method="M-Pesa").aggregate(t=Sum("amount"))["t"] or 0
        sha_pmt   = Payment.objects.filter(method="SHA").aggregate(t=Sum("amount"))["t"] or 0

        outstanding_qs = Invoice.objects.filter(status__in=["pending","partial"])
        outstanding    = (outstanding_qs.aggregate(t=Sum("patient_amount"))["t"] or 0) - \
                         (outstanding_qs.aggregate(t=Sum("amount_paid"))["t"] or 0)

        self.stdout.write(f"\n{'─'*60}")
        self.stdout.write(f"  {'Total Revenue Collected':<{W}} KES {total_rev:>12,.2f}")
        self.stdout.write(f"  {'  Cash':<{W}} KES {cash_rev:>12,.2f}")
        self.stdout.write(f"  {'  M-Pesa':<{W}} KES {mpesa_rev:>12,.2f}")
        self.stdout.write(f"  {'  SHA Payments':<{W}} KES {sha_pmt:>12,.2f}")
        self.stdout.write(f"  {'  SHA Covered (invoice)':<{W}} KES {sha_rev:>12,.2f}")
        self.stdout.write(f"  {'Outstanding Balance':<{W}} KES {outstanding:>12,.2f}")
        self.stdout.write(sep + "\n")