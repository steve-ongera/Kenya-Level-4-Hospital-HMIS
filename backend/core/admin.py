from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Patient, Specialist, ServiceTariff,
    Visit, Triage, Consultation, ConsultationItem,
    LabOrder, LabResult, RadiologyOrder, RadiologyResult,
    Prescription, PrescriptionItem, DrugInventory,
    Invoice, InvoiceItem, Payment,
)

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ["username", "full_name", "role", "department", "is_active"]
    list_filter   = ["role", "is_active"]
    fieldsets     = BaseUserAdmin.fieldsets + (
        ("HMIS Profile", {"fields": ("role", "phone", "employee_id", "department", "specialization", "license_number", "is_available")}),
    )

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display  = ["patient_number", "full_name", "phone", "gender", "sha_number", "created_at"]
    search_fields = ["first_name", "last_name", "phone", "id_number", "patient_number", "guardian_phone"]
    list_filter   = ["gender", "is_minor", "sha_verified", "county"]

@admin.register(Specialist)
class SpecialistAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "consultation_fee", "is_active"]

@admin.register(ServiceTariff)
class TariffAdmin(admin.ModelAdmin):
    list_display  = ["code", "name", "category", "price", "sha_covered"]
    list_filter   = ["category", "sha_covered"]
    search_fields = ["name", "code"]

@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display  = ["visit_number", "patient", "specialist", "status", "check_in_time"]
    list_filter   = ["status", "visit_type", "payment_method"]
    search_fields = ["visit_number", "patient__first_name", "patient__last_name"]
    date_hierarchy= "check_in_time"

@admin.register(Triage)
class TriageAdmin(admin.ModelAdmin):
    list_display = ["visit", "priority", "temperature", "bp", "triaged_by", "triaged_at"]

@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    list_display = ["visit", "doctor", "status", "diagnosis", "started_at"]

class LabResultInline(admin.StackedInline):
    model = LabResult
    extra = 0

@admin.register(LabOrder)
class LabOrderAdmin(admin.ModelAdmin):
    list_display = ["visit", "tariff", "status", "urgency", "ordered_by", "ordered_at"]
    list_filter  = ["status", "urgency"]
    inlines      = [LabResultInline]

class RadiologyResultInline(admin.StackedInline):
    model = RadiologyResult
    extra = 0

@admin.register(RadiologyOrder)
class RadiologyOrderAdmin(admin.ModelAdmin):
    list_display = ["visit", "tariff", "status", "ordered_by", "ordered_at"]
    inlines      = [RadiologyResultInline]

class PrescriptionItemInline(admin.TabularInline):
    model = PrescriptionItem
    extra = 0

@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ["visit", "status", "prescribed_by", "prescribed_at"]
    list_filter  = ["status"]
    inlines      = [PrescriptionItemInline]

@admin.register(DrugInventory)
class DrugAdmin(admin.ModelAdmin):
    list_display  = ["name", "strength", "formulation", "stock_quantity", "reorder_level", "unit_price", "expiry_date"]
    list_filter   = ["category", "formulation"]
    search_fields = ["name", "generic_name"]

class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0

class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display  = ["invoice_number", "patient", "total_amount", "amount_paid", "status", "created_at"]
    list_filter   = ["status"]
    search_fields = ["invoice_number", "patient__first_name", "patient__last_name"]
    inlines       = [InvoiceItemInline, PaymentInline]
    date_hierarchy= "created_at"