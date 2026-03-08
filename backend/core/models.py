"""
core/models.py
==============
Single-app HMIS model layer.
Sections:
  1. User (custom auth)
  2. Patient
  3. Visit  (registration → triage → consultation → discharge)
  4. Triage
  5. Consultation / ConsultationItem
  6. LabOrder / LabResult
  7. RadiologyOrder / RadiologyResult
  8. Prescription / PrescriptionItem
  9. Invoice / InvoiceItem / Payment
 10. DrugInventory
 11. Specialist / ServiceTariff
"""

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils import timezone
import uuid


# ═══════════════════════════════════════════════════════════════════════════════
# 1. USER
# ═══════════════════════════════════════════════════════════════════════════════

class User(AbstractUser):
    class Role(models.TextChoices):
        RECEPTIONIST = "receptionist", "Receptionist"
        NURSE        = "nurse",        "Nurse"
        DOCTOR       = "doctor",       "Doctor"
        PHARMACIST   = "pharmacist",   "Pharmacist"
        LAB_TECH     = "lab",          "Lab Technician"
        RADIOGRAPHER = "radiology",    "Radiographer"
        ADMIN        = "admin",        "Administrator"

    role            = models.CharField(max_length=20, choices=Role.choices, default=Role.RECEPTIONIST)
    phone           = models.CharField(max_length=15, blank=True)
    employee_id     = models.CharField(max_length=20, unique=True, blank=True, null=True)
    department      = models.CharField(max_length=100, blank=True)
    specialization  = models.CharField(max_length=100, blank=True, help_text="For doctors")
    license_number  = models.CharField(max_length=50, blank=True)
    is_available    = models.BooleanField(default=True)

    class Meta:
        ordering = ["first_name", "last_name"]

    def __str__(self):
        return f"{self.get_full_name() or self.username} [{self.get_role_display()}]"

    @property
    def full_name(self):
        return self.get_full_name() or self.username


# ═══════════════════════════════════════════════════════════════════════════════
# 2. PATIENT
# ═══════════════════════════════════════════════════════════════════════════════

class Patient(models.Model):
    class Gender(models.TextChoices):
        MALE   = "Male",   "Male"
        FEMALE = "Female", "Female"
        OTHER  = "Other",  "Other"

    class BloodGroup(models.TextChoices):
        A_POS  = "A+",     "A+"
        A_NEG  = "A-",     "A-"
        B_POS  = "B+",     "B+"
        B_NEG  = "B-",     "B-"
        AB_POS = "AB+",    "AB+"
        AB_NEG = "AB-",    "AB-"
        O_POS  = "O+",     "O+"
        O_NEG  = "O-",     "O-"
        UNKNOWN = "Unknown","Unknown"

    # ── Identification ────────────────────────────────────────────────────────
    patient_number  = models.CharField(max_length=20, unique=True, editable=False)
    id_type         = models.CharField(max_length=25, default="National ID",
                        choices=[("National ID","National ID"),("Birth Certificate","Birth Certificate"),
                                 ("Passport","Passport"),("Alien ID","Alien ID")])
    id_number       = models.CharField(max_length=30, blank=True)

    # ── Demographics ──────────────────────────────────────────────────────────
    first_name      = models.CharField(max_length=100)
    middle_name     = models.CharField(max_length=100, blank=True)
    last_name       = models.CharField(max_length=100)
    date_of_birth   = models.DateField()
    gender          = models.CharField(max_length=10, choices=Gender.choices)
    blood_group     = models.CharField(max_length=10, choices=BloodGroup.choices, default=BloodGroup.UNKNOWN)
    nationality     = models.CharField(max_length=50, default="Kenyan")
    occupation      = models.CharField(max_length=100, blank=True)

    # ── Contact ───────────────────────────────────────────────────────────────
    phone           = models.CharField(max_length=15)
    alt_phone       = models.CharField(max_length=15, blank=True)
    email           = models.EmailField(blank=True)
    county          = models.CharField(max_length=100, blank=True)
    sub_county      = models.CharField(max_length=100, blank=True)
    village         = models.CharField(max_length=100, blank=True)

    # ── Paediatric / Guardian ─────────────────────────────────────────────────
    is_minor            = models.BooleanField(default=False)
    guardian_name       = models.CharField(max_length=200, blank=True)
    guardian_phone      = models.CharField(max_length=15, blank=True,
                            help_text="Searchable – used to find child patients")
    guardian_relation   = models.CharField(max_length=50, blank=True)
    guardian_id         = models.CharField(max_length=30, blank=True)

    # ── Insurance ─────────────────────────────────────────────────────────────
    sha_number      = models.CharField(max_length=30, blank=True, verbose_name="SHA Member No.")
    sha_verified    = models.BooleanField(default=False)
    sha_scheme      = models.CharField(max_length=100, blank=True)
    nhif_number     = models.CharField(max_length=20, blank=True, verbose_name="NHIF No. (legacy)")

    # ── Clinical ──────────────────────────────────────────────────────────────
    allergies           = models.TextField(blank=True)
    chronic_conditions  = models.TextField(blank=True)

    # ── Next of Kin ───────────────────────────────────────────────────────────
    nok_name        = models.CharField(max_length=200, blank=True)
    nok_phone       = models.CharField(max_length=15, blank=True)
    nok_relation    = models.CharField(max_length=50, blank=True)

    # ── Meta ──────────────────────────────────────────────────────────────────
    registered_by   = models.ForeignKey(settings.AUTH_USER_MODEL, null=True,
                        on_delete=models.SET_NULL, related_name="registered_patients")
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)
    is_active       = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]
        indexes  = [
            models.Index(fields=["phone"]),
            models.Index(fields=["id_number"]),
            models.Index(fields=["guardian_phone"]),
            models.Index(fields=["sha_number"]),
            models.Index(fields=["patient_number"]),
        ]

    def save(self, *args, **kwargs):
        if not self.patient_number:
            year  = timezone.now().year
            count = Patient.objects.filter(created_at__year=year).count() + 1
            self.patient_number = f"KNH-{year}-{count:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.patient_number})"

    @property
    def full_name(self):
        return " ".join(p for p in [self.first_name, self.middle_name, self.last_name] if p)

    @property
    def age(self):
        from datetime import date
        today = date.today()
        dob   = self.date_of_birth
        years = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        if years < 1:
            months = (today.year - dob.year) * 12 + today.month - dob.month
            return f"{months}mo"
        return f"{years}yrs"


# ═══════════════════════════════════════════════════════════════════════════════
# 3. SPECIALIST / SERVICE TARIFF
# ═══════════════════════════════════════════════════════════════════════════════

class Specialist(models.Model):
    """Specialties offered by the hospital, each with a consultation fee."""
    name            = models.CharField(max_length=100)
    code            = models.CharField(max_length=10, unique=True)
    consultation_fee= models.DecimalField(max_digits=10, decimal_places=2)
    description     = models.TextField(blank=True)
    is_active       = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} (KES {self.consultation_fee})"


class ServiceTariff(models.Model):
    """General price catalogue – labs, radiology, procedures, etc."""
    class Category(models.TextChoices):
        LAB        = "lab",       "Laboratory"
        RADIOLOGY  = "radiology", "Radiology"
        PROCEDURE  = "procedure", "Procedure"
        PHARMACY   = "pharmacy",  "Pharmacy"
        OTHER      = "other",     "Other"

    code        = models.CharField(max_length=20, unique=True)
    name        = models.CharField(max_length=200)
    category    = models.CharField(max_length=20, choices=Category.choices)
    price       = models.DecimalField(max_digits=10, decimal_places=2)
    sha_covered = models.BooleanField(default=False)
    sha_rate    = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active   = models.BooleanField(default=True)

    def __str__(self):
        return f"[{self.code}] {self.name} – KES {self.price}"


# ═══════════════════════════════════════════════════════════════════════════════
# 4. VISIT
# ═══════════════════════════════════════════════════════════════════════════════

class Visit(models.Model):
    """One hospital encounter. A patient may have many visits."""

    class Status(models.TextChoices):
        REGISTERED   = "registered",   "Registered"        # Just checked in
        PAYMENT_DONE = "payment_done", "Awaiting Triage"   # Consultation fee paid
        TRIAGE_DONE  = "triage_done",  "Awaiting Doctor"   # Vitals recorded
        IN_CONSULT   = "in_consult",   "In Consultation"
        PAUSED       = "paused",       "Paused (Away)"     # Sent to lab/radiology
        PRESCRIBING  = "prescribing",  "Prescribed"
        PHARMACY     = "pharmacy",     "At Pharmacy"
        DISCHARGED   = "discharged",   "Discharged"
        REFERRED     = "referred",     "Referred"
        ADMITTED     = "admitted",     "Admitted"

    class VisitType(models.TextChoices):
        OUTPATIENT = "outpatient", "Outpatient"
        INPATIENT  = "inpatient",  "Inpatient"
        EMERGENCY  = "emergency",  "Emergency"

    visit_number    = models.CharField(max_length=20, unique=True, editable=False)
    patient         = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name="visits")
    visit_type      = models.CharField(max_length=20, choices=VisitType.choices, default=VisitType.OUTPATIENT)
    specialist      = models.ForeignKey(Specialist, null=True, on_delete=models.SET_NULL)
    assigned_doctor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                        on_delete=models.SET_NULL, related_name="doctor_visits")
    status          = models.CharField(max_length=20, choices=Status.choices, default=Status.REGISTERED)

    # SHA / payment
    payment_method  = models.CharField(max_length=20, default="Cash",
                        choices=[("Cash","Cash"),("M-Pesa","M-Pesa"),("SHA","SHA"),("Insurance","Insurance"),("Waiver","Waiver")])
    sha_auth_code   = models.CharField(max_length=50, blank=True)
    mpesa_ref       = models.CharField(max_length=30, blank=True)

    # Timestamps
    check_in_time   = models.DateTimeField(auto_now_add=True)
    triage_time     = models.DateTimeField(null=True, blank=True)
    consult_start   = models.DateTimeField(null=True, blank=True)
    discharge_time  = models.DateTimeField(null=True, blank=True)

    registered_by   = models.ForeignKey(settings.AUTH_USER_MODEL, null=True,
                        on_delete=models.SET_NULL, related_name="registered_visits")
    notes           = models.TextField(blank=True)

    class Meta:
        ordering = ["-check_in_time"]
        indexes  = [models.Index(fields=["status"]), models.Index(fields=["check_in_time"])]

    def save(self, *args, **kwargs):
        if not self.visit_number:
            today = timezone.now()
            count = Visit.objects.filter(check_in_time__date=today.date()).count() + 1
            self.visit_number = f"V{today.strftime('%Y%m%d')}-{count:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.visit_number} – {self.patient.full_name}"


# ═══════════════════════════════════════════════════════════════════════════════
# 5. TRIAGE
# ═══════════════════════════════════════════════════════════════════════════════

class Triage(models.Model):
    class Priority(models.TextChoices):
        IMMEDIATE = "immediate", "Immediate (Red)"
        URGENT    = "urgent",    "Urgent (Orange)"
        NORMAL    = "normal",    "Normal (Green)"
        NON_URGENT= "non_urgent","Non-Urgent (Blue)"

    visit           = models.OneToOneField(Visit, on_delete=models.CASCADE, related_name="triage")
    # Vitals
    temperature     = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, help_text="°C")
    pulse_rate      = models.IntegerField(null=True, blank=True, help_text="bpm")
    respiratory_rate= models.IntegerField(null=True, blank=True, help_text="breaths/min")
    bp_systolic     = models.IntegerField(null=True, blank=True)
    bp_diastolic    = models.IntegerField(null=True, blank=True)
    oxygen_saturation=models.IntegerField(null=True, blank=True, help_text="SpO2 %")
    weight          = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True, help_text="kg")
    height          = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True, help_text="cm")
    bmi             = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    blood_sugar     = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True, help_text="mmol/L")

    # Assessment
    presenting_complaint = models.TextField()
    priority        = models.CharField(max_length=15, choices=Priority.choices, default=Priority.NORMAL)
    triage_notes    = models.TextField(blank=True)

    triaged_by      = models.ForeignKey(settings.AUTH_USER_MODEL, null=True,
                        on_delete=models.SET_NULL, related_name="triaged_visits")
    triaged_at      = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.weight and self.height and self.height > 0:
            h_m = float(self.height) / 100
            self.bmi = round(float(self.weight) / (h_m ** 2), 1)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Triage – {self.visit.visit_number}"

    @property
    def bp(self):
        if self.bp_systolic and self.bp_diastolic:
            return f"{self.bp_systolic}/{self.bp_diastolic}"
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# 6. CONSULTATION
# ═══════════════════════════════════════════════════════════════════════════════

class Consultation(models.Model):
    class Status(models.TextChoices):
        OPEN     = "open",     "Open"
        PAUSED   = "paused",   "Paused"       # Awaiting lab / radiology
        COMPLETED= "completed","Completed"

    visit       = models.OneToOneField(Visit, on_delete=models.CASCADE, related_name="consultation")
    doctor      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="consultations")
    status      = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN)

    # Clinical findings
    chief_complaint     = models.TextField()
    history_of_illness  = models.TextField(blank=True)
    physical_examination= models.TextField(blank=True)
    diagnosis           = models.TextField(blank=True)
    icd10_code          = models.CharField(max_length=10, blank=True)
    management_plan     = models.TextField(blank=True)
    doctor_notes        = models.TextField(blank=True)

    # Disposition
    disposition         = models.CharField(max_length=30, blank=True,
                            choices=[("discharge","Discharge"),("admit","Admit"),("refer","Refer"),("review","Review")])
    referral_notes      = models.TextField(blank=True)

    started_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)
    ended_at    = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Consult – {self.visit.visit_number} by {self.doctor.full_name}"


class ConsultationItem(models.Model):
    """Procedures / services performed by doctor during consultation (billable)."""
    consultation= models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name="items")
    tariff      = models.ForeignKey(ServiceTariff, on_delete=models.PROTECT)
    description = models.CharField(max_length=200, blank=True)
    quantity    = models.PositiveIntegerField(default=1)
    unit_price  = models.DecimalField(max_digits=10, decimal_places=2)
    created_at  = models.DateTimeField(auto_now_add=True)

    @property
    def total(self):
        return self.quantity * self.unit_price


# ═══════════════════════════════════════════════════════════════════════════════
# 7. LAB ORDER / RESULT
# ═══════════════════════════════════════════════════════════════════════════════

class LabOrder(models.Model):
    class Status(models.TextChoices):
        PENDING     = "pending",    "Pending"
        COLLECTED   = "collected",  "Sample Collected"
        PROCESSING  = "processing", "Processing"
        RESULTED    = "resulted",   "Results Ready"
        VERIFIED    = "verified",   "Verified"

    visit           = models.ForeignKey(Visit, on_delete=models.PROTECT, related_name="lab_orders")
    consultation    = models.ForeignKey(Consultation, null=True, blank=True,
                        on_delete=models.SET_NULL, related_name="lab_orders")
    tariff          = models.ForeignKey(ServiceTariff, on_delete=models.PROTECT)
    status          = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    urgency         = models.CharField(max_length=10, default="routine",
                        choices=[("routine","Routine"),("urgent","Urgent"),("stat","STAT")])
    clinical_notes  = models.TextField(blank=True)
    ordered_by      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                        related_name="lab_orders")
    ordered_at      = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tariff.name} – {self.visit.visit_number}"


class LabResult(models.Model):
    order           = models.OneToOneField(LabOrder, on_delete=models.CASCADE, related_name="result")
    result_text     = models.TextField()
    result_values   = models.JSONField(default=dict, blank=True, help_text="Structured key-value results")
    reference_range = models.TextField(blank=True)
    interpretation  = models.CharField(max_length=20, blank=True,
                        choices=[("normal","Normal"),("abnormal","Abnormal"),("critical","Critical")])
    comments        = models.TextField(blank=True)
    performed_by    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                        related_name="lab_results")
    verified_by     = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                        on_delete=models.SET_NULL, related_name="verified_results")
    resulted_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Result – {self.order}"


# ═══════════════════════════════════════════════════════════════════════════════
# 8. RADIOLOGY ORDER / RESULT
# ═══════════════════════════════════════════════════════════════════════════════

class RadiologyOrder(models.Model):
    class Status(models.TextChoices):
        PENDING   = "pending",  "Pending"
        SCHEDULED = "scheduled","Scheduled"
        PERFORMED = "performed","Performed"
        RESULTED  = "resulted", "Results Ready"

    visit           = models.ForeignKey(Visit, on_delete=models.PROTECT, related_name="radiology_orders")
    consultation    = models.ForeignKey(Consultation, null=True, blank=True,
                        on_delete=models.SET_NULL, related_name="radiology_orders")
    tariff          = models.ForeignKey(ServiceTariff, on_delete=models.PROTECT)
    status          = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    clinical_info   = models.TextField(blank=True)
    ordered_by      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                        related_name="radiology_orders")
    ordered_at      = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tariff.name} – {self.visit.visit_number}"


class RadiologyResult(models.Model):
    order           = models.OneToOneField(RadiologyOrder, on_delete=models.CASCADE, related_name="result")
    findings        = models.TextField()
    impression      = models.TextField()
    image_url       = models.URLField(blank=True)
    performed_by    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                        related_name="radiology_results")
    resulted_at     = models.DateTimeField(auto_now_add=True)


# ═══════════════════════════════════════════════════════════════════════════════
# 9. PRESCRIPTION
# ═══════════════════════════════════════════════════════════════════════════════

class Prescription(models.Model):
    class Status(models.TextChoices):
        PENDING   = "pending",   "Pending Dispensing"
        PARTIAL   = "partial",   "Partially Dispensed"
        DISPENSED = "dispensed", "Fully Dispensed"
        CANCELLED = "cancelled", "Cancelled"

    visit           = models.ForeignKey(Visit, on_delete=models.PROTECT, related_name="prescriptions")
    consultation    = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name="prescriptions")
    status          = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    notes           = models.TextField(blank=True)
    prescribed_by   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                        related_name="prescriptions")
    prescribed_at   = models.DateTimeField(auto_now_add=True)
    dispensed_by    = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                        on_delete=models.SET_NULL, related_name="dispensed_prescriptions")
    dispensed_at    = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Rx – {self.visit.visit_number}"


class PrescriptionItem(models.Model):
    prescription    = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name="items")
    drug            = models.ForeignKey("DrugInventory", on_delete=models.PROTECT)
    dose            = models.CharField(max_length=50,  help_text="e.g. 500mg")
    frequency       = models.CharField(max_length=50,  help_text="e.g. TID (3x/day)")
    duration        = models.CharField(max_length=50,  help_text="e.g. 7 days")
    quantity        = models.PositiveIntegerField()
    instructions    = models.TextField(blank=True,     help_text="e.g. Take after meals")
    is_dispensed    = models.BooleanField(default=False)
    unit_price      = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    @property
    def total(self):
        return self.quantity * self.unit_price


# ═══════════════════════════════════════════════════════════════════════════════
# 10. DRUG INVENTORY
# ═══════════════════════════════════════════════════════════════════════════════

class DrugInventory(models.Model):
    class Category(models.TextChoices):
        ANTIBIOTIC   = "antibiotic",   "Antibiotic"
        ANALGESIC    = "analgesic",    "Analgesic / NSAID"
        ANTIMALARIA  = "antimalaria",  "Anti-malarial"
        ANTIDIABETIC = "antidiabetic", "Anti-diabetic"
        ANTIHYP      = "antihyp",      "Antihypertensive"
        SUPPLEMENT   = "supplement",   "Supplement / Vitamin"
        INFUSION     = "infusion",     "IV Fluids / Infusion"
        OTHER        = "other",        "Other"

    name            = models.CharField(max_length=200)
    generic_name    = models.CharField(max_length=200, blank=True)
    category        = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    formulation     = models.CharField(max_length=50, help_text="e.g. Tablet, Syrup, Injection")
    strength        = models.CharField(max_length=50, help_text="e.g. 500mg, 250mg/5ml")
    unit            = models.CharField(max_length=20, help_text="e.g. Tablet, Vial, Bottle")
    stock_quantity  = models.PositiveIntegerField(default=0)
    reorder_level   = models.PositiveIntegerField(default=50)
    unit_price      = models.DecimalField(max_digits=10, decimal_places=2)
    expiry_date     = models.DateField(null=True, blank=True)
    batch_number    = models.CharField(max_length=50, blank=True)
    supplier        = models.CharField(max_length=200, blank=True)
    is_active       = models.BooleanField(default=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Drug Inventory"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} {self.strength} ({self.formulation})"

    @property
    def is_low_stock(self):
        return self.stock_quantity <= self.reorder_level

    @property
    def is_expired(self):
        from datetime import date
        return self.expiry_date and self.expiry_date < date.today()


# ═══════════════════════════════════════════════════════════════════════════════
# 11. INVOICE / PAYMENT
# ═══════════════════════════════════════════════════════════════════════════════

class Invoice(models.Model):
    class Status(models.TextChoices):
        DRAFT     = "draft",     "Draft"
        PENDING   = "pending",   "Pending Payment"
        PARTIAL   = "partial",   "Partially Paid"
        PAID      = "paid",      "Fully Paid"
        CANCELLED = "cancelled", "Cancelled"
        WAIVED    = "waived",    "Waived"

    invoice_number  = models.CharField(max_length=20, unique=True, editable=False)
    visit           = models.ForeignKey(Visit, on_delete=models.PROTECT, related_name="invoices")
    patient         = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name="invoices")
    status          = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    total_amount    = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sha_amount      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    patient_amount  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_paid     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes           = models.TextField(blank=True)
    created_by      = models.ForeignKey(settings.AUTH_USER_MODEL, null=True,
                        on_delete=models.SET_NULL, related_name="created_invoices")
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    # eTIMS
    etims_cu_serial = models.CharField(max_length=50, blank=True)
    etims_receipt_no= models.CharField(max_length=50, blank=True)
    etims_signed_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            today = timezone.now()
            count = Invoice.objects.filter(created_at__date=today.date()).count() + 1
            self.invoice_number = f"INV{today.strftime('%Y%m%d')}-{count:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.invoice_number} – KES {self.total_amount}"

    @property
    def balance(self):
        return self.patient_amount - self.amount_paid


class InvoiceItem(models.Model):
    invoice         = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    description     = models.CharField(max_length=200)
    category        = models.CharField(max_length=30)
    quantity        = models.PositiveIntegerField(default=1)
    unit_price      = models.DecimalField(max_digits=10, decimal_places=2)
    sha_covered     = models.BooleanField(default=False)
    sha_rate        = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    @property
    def total(self):
        return self.quantity * self.unit_price


class Payment(models.Model):
    class Method(models.TextChoices):
        CASH      = "Cash",      "Cash"
        MPESA     = "M-Pesa",    "M-Pesa"
        SHA       = "SHA",       "SHA"
        INSURANCE = "Insurance", "Insurance"
        BANK      = "Bank",      "Bank Transfer"
        WAIVER    = "Waiver",    "Waiver"

    invoice         = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="payments")
    amount          = models.DecimalField(max_digits=12, decimal_places=2)
    method          = models.CharField(max_length=15, choices=Method.choices)
    reference       = models.CharField(max_length=50, blank=True, help_text="M-Pesa ref, bank ref, etc.")
    received_by     = models.ForeignKey(settings.AUTH_USER_MODEL, null=True,
                        on_delete=models.SET_NULL, related_name="received_payments")
    paid_at         = models.DateTimeField(auto_now_add=True)
    notes           = models.TextField(blank=True)

    def __str__(self):
        return f"{self.method} KES {self.amount} – {self.invoice.invoice_number}"