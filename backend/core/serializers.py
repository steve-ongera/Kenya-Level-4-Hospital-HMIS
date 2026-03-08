"""
core/serializers.py
===================
DRF serializers for every model.
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import (
    Patient, Specialist, ServiceTariff,
    Visit, Triage,
    Consultation, ConsultationItem,
    LabOrder, LabResult,
    RadiologyOrder, RadiologyResult,
    Prescription, PrescriptionItem,
    DrugInventory,
    Invoice, InvoiceItem, Payment,
)

User = get_user_model()


# ─── Auth ─────────────────────────────────────────────────────────────────────

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Add user profile data to the login JWT response."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"]      = user.role
        token["full_name"] = user.full_name
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["role"]        = self.user.role
        data["full_name"]   = self.user.full_name
        data["employee_id"] = self.user.employee_id or ""
        data["department"]  = self.user.department
        data["user_id"]     = self.user.id
        return data


# ─── User ─────────────────────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model  = User
        fields = [
            "id", "username", "full_name", "first_name", "last_name",
            "email", "role", "phone", "employee_id", "department",
            "specialization", "license_number", "is_available", "is_active",
        ]
        read_only_fields = ["id"]


class UserCreateSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = [
            "username", "first_name", "last_name", "email",
            "role", "phone", "employee_id", "department",
            "specialization", "license_number", "password", "password2",
        ]

    def validate(self, data):
        if data["password"] != data.pop("password2"):
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return data

    def create(self, validated_data):
        pwd = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(pwd)
        user.save()
        return user


# ─── Patient ──────────────────────────────────────────────────────────────────

class PatientListSerializer(serializers.ModelSerializer):
    """Lightweight – used in search results and tables."""
    full_name      = serializers.ReadOnlyField()
    age            = serializers.ReadOnlyField()
    registered_by_name = serializers.CharField(source="registered_by.full_name", read_only=True)
    total_visits   = serializers.SerializerMethodField()

    class Meta:
        model  = Patient
        fields = [
            "id", "patient_number", "full_name", "first_name", "middle_name", "last_name",
            "age", "date_of_birth", "gender", "phone", "alt_phone",
            "id_number", "id_type", "county",
            "is_minor", "guardian_name", "guardian_phone",
            "sha_number", "sha_verified",
            "blood_group", "allergies",
            "registered_by_name", "created_at", "total_visits",
        ]

    def get_total_visits(self, obj):
        return obj.visits.count()


class PatientDetailSerializer(serializers.ModelSerializer):
    full_name    = serializers.ReadOnlyField()
    age          = serializers.ReadOnlyField()
    total_visits = serializers.SerializerMethodField()
    recent_visits= serializers.SerializerMethodField()

    class Meta:
        model  = Patient
        fields = "__all__"
        read_only_fields = ["id", "patient_number", "created_at", "updated_at"]

    def get_total_visits(self, obj):
        return obj.visits.count()

    def get_recent_visits(self, obj):
        visits = obj.visits.order_by("-check_in_time")[:5]
        return VisitListSerializer(visits, many=True).data


# ─── Specialist / Tariff ──────────────────────────────────────────────────────

class SpecialistSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Specialist
        fields = "__all__"


class ServiceTariffSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ServiceTariff
        fields = "__all__"


# ─── Visit ────────────────────────────────────────────────────────────────────

class VisitListSerializer(serializers.ModelSerializer):
    patient_name     = serializers.CharField(source="patient.full_name",      read_only=True)
    patient_number   = serializers.CharField(source="patient.patient_number", read_only=True)
    specialist_name  = serializers.CharField(source="specialist.name",        read_only=True)
    doctor_name      = serializers.CharField(source="assigned_doctor.full_name", read_only=True)
    status_display   = serializers.CharField(source="get_status_display",     read_only=True)

    class Meta:
        model  = Visit
        fields = [
            "id", "visit_number", "patient", "patient_name", "patient_number",
            "specialist", "specialist_name", "assigned_doctor", "doctor_name",
            "status", "status_display", "visit_type", "payment_method",
            "check_in_time", "triage_time", "consult_start", "discharge_time",
        ]


class VisitCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Visit
        fields = [
            "patient", "visit_type", "specialist", "payment_method",
            "sha_auth_code", "mpesa_ref", "notes",
        ]


class VisitDetailSerializer(serializers.ModelSerializer):
    patient_name     = serializers.CharField(source="patient.full_name",      read_only=True)
    specialist_name  = serializers.CharField(source="specialist.name",        read_only=True)
    doctor_name      = serializers.CharField(source="assigned_doctor.full_name", read_only=True)
    triage_data      = serializers.SerializerMethodField()
    consultation_data= serializers.SerializerMethodField()

    class Meta:
        model  = Visit
        fields = "__all__"

    def get_triage_data(self, obj):
        try:
            return TriageSerializer(obj.triage).data
        except Exception:
            return None

    def get_consultation_data(self, obj):
        try:
            return ConsultationSerializer(obj.consultation).data
        except Exception:
            return None


# ─── Triage ───────────────────────────────────────────────────────────────────

class TriageSerializer(serializers.ModelSerializer):
    bp               = serializers.ReadOnlyField()
    triaged_by_name  = serializers.CharField(source="triaged_by.full_name", read_only=True)

    class Meta:
        model  = Triage
        fields = "__all__"
        read_only_fields = ["id", "bmi", "triaged_at"]


# ─── Consultation ─────────────────────────────────────────────────────────────

class ConsultationItemSerializer(serializers.ModelSerializer):
    tariff_name = serializers.CharField(source="tariff.name", read_only=True)
    total       = serializers.ReadOnlyField()

    class Meta:
        model  = ConsultationItem
        fields = "__all__"


class ConsultationSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.full_name", read_only=True)
    items       = ConsultationItemSerializer(many=True, read_only=True)

    class Meta:
        model  = Consultation
        fields = "__all__"
        read_only_fields = ["id", "started_at", "updated_at"]


# ─── Lab ──────────────────────────────────────────────────────────────────────

class LabResultSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source="performed_by.full_name", read_only=True)

    class Meta:
        model  = LabResult
        fields = "__all__"
        read_only_fields = ["id", "resulted_at"]


class LabOrderSerializer(serializers.ModelSerializer):
    tariff_name       = serializers.CharField(source="tariff.name",            read_only=True)
    tariff_price      = serializers.DecimalField(source="tariff.price", max_digits=10, decimal_places=2, read_only=True)
    ordered_by_name   = serializers.CharField(source="ordered_by.full_name",   read_only=True)
    patient_name      = serializers.CharField(source="visit.patient.full_name", read_only=True)
    patient_number    = serializers.CharField(source="visit.patient.patient_number", read_only=True)
    result            = LabResultSerializer(read_only=True)

    class Meta:
        model  = LabOrder
        fields = "__all__"
        read_only_fields = ["id", "ordered_at"]


# ─── Radiology ────────────────────────────────────────────────────────────────

class RadiologyResultSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source="performed_by.full_name", read_only=True)

    class Meta:
        model  = RadiologyResult
        fields = "__all__"
        read_only_fields = ["id", "resulted_at"]


class RadiologyOrderSerializer(serializers.ModelSerializer):
    tariff_name      = serializers.CharField(source="tariff.name",            read_only=True)
    tariff_price     = serializers.DecimalField(source="tariff.price", max_digits=10, decimal_places=2, read_only=True)
    ordered_by_name  = serializers.CharField(source="ordered_by.full_name",   read_only=True)
    patient_name     = serializers.CharField(source="visit.patient.full_name", read_only=True)
    patient_number   = serializers.CharField(source="visit.patient.patient_number", read_only=True)
    result           = RadiologyResultSerializer(read_only=True)

    class Meta:
        model  = RadiologyOrder
        fields = "__all__"
        read_only_fields = ["id", "ordered_at"]


# ─── Prescription ─────────────────────────────────────────────────────────────

class PrescriptionItemSerializer(serializers.ModelSerializer):
    drug_name   = serializers.CharField(source="drug.name",     read_only=True)
    drug_strength=serializers.CharField(source="drug.strength", read_only=True)
    total       = serializers.ReadOnlyField()

    class Meta:
        model  = PrescriptionItem
        fields = "__all__"


class PrescriptionSerializer(serializers.ModelSerializer):
    prescribed_by_name = serializers.CharField(source="prescribed_by.full_name", read_only=True)
    dispensed_by_name  = serializers.CharField(source="dispensed_by.full_name",  read_only=True)
    patient_name       = serializers.CharField(source="visit.patient.full_name",  read_only=True)
    patient_number     = serializers.CharField(source="visit.patient.patient_number", read_only=True)
    items              = PrescriptionItemSerializer(many=True, read_only=True)

    class Meta:
        model  = Prescription
        fields = "__all__"
        read_only_fields = ["id", "prescribed_at"]


# ─── Drug Inventory ───────────────────────────────────────────────────────────

class DrugInventorySerializer(serializers.ModelSerializer):
    is_low_stock = serializers.ReadOnlyField()
    is_expired   = serializers.ReadOnlyField()

    class Meta:
        model  = DrugInventory
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


# ─── Invoice / Payment ────────────────────────────────────────────────────────

class InvoiceItemSerializer(serializers.ModelSerializer):
    total = serializers.ReadOnlyField()

    class Meta:
        model  = InvoiceItem
        fields = "__all__"


class PaymentSerializer(serializers.ModelSerializer):
    received_by_name = serializers.CharField(source="received_by.full_name", read_only=True)

    class Meta:
        model  = Payment
        fields = "__all__"
        read_only_fields = ["id", "paid_at"]


class InvoiceSerializer(serializers.ModelSerializer):
    patient_name  = serializers.CharField(source="patient.full_name",      read_only=True)
    patient_number= serializers.CharField(source="patient.patient_number", read_only=True)
    visit_number  = serializers.CharField(source="visit.visit_number",     read_only=True)
    balance       = serializers.ReadOnlyField()
    items         = InvoiceItemSerializer(many=True, read_only=True)
    payments      = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model  = Invoice
        fields = "__all__"
        read_only_fields = ["id", "invoice_number", "created_at", "updated_at"]