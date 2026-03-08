"""
core/views.py
=============
ViewSets + custom action endpoints for every HMIS resource.
"""

from django.utils import timezone
from django.db.models import Q, Sum
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model

from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer, UserCreateSerializer,
    PatientListSerializer, PatientDetailSerializer,
    SpecialistSerializer, ServiceTariffSerializer,
    VisitListSerializer, VisitCreateSerializer, VisitDetailSerializer,
    TriageSerializer,
    ConsultationSerializer, ConsultationItemSerializer,
    LabOrderSerializer, LabResultSerializer,
    RadiologyOrderSerializer, RadiologyResultSerializer,
    PrescriptionSerializer, PrescriptionItemSerializer,
    DrugInventorySerializer,
    InvoiceSerializer, InvoiceItemSerializer, PaymentSerializer,
)
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

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


# ─── Users ────────────────────────────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    queryset         = User.objects.all().order_by("first_name")
    permission_classes = [IsAuthenticated]
    filter_backends  = [filters.SearchFilter, DjangoFilterBackend]
    search_fields    = ["first_name", "last_name", "username", "employee_id"]
    filterset_fields = ["role", "is_active", "is_available"]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    @action(detail=False, methods=["get"])
    def me(self, request):
        """Return current user profile."""
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=["get"])
    def doctors(self, request):
        """List available doctors."""
        qs = User.objects.filter(role="doctor", is_active=True)
        return Response(UserSerializer(qs, many=True).data)


# ─── Patients ─────────────────────────────────────────────────────────────────

class PatientViewSet(viewsets.ModelViewSet):
    queryset         = Patient.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends  = [filters.SearchFilter, DjangoFilterBackend]
    filterset_fields = ["gender", "county", "is_minor", "sha_verified"]
    search_fields    = [
        "first_name", "middle_name", "last_name",
        "phone", "alt_phone", "id_number",
        "patient_number", "sha_number",
        "guardian_phone", "guardian_name",   # ← search children via guardian
    ]

    def get_serializer_class(self):
        if self.action in ("list", "search"):
            return PatientListSerializer
        return PatientDetailSerializer

    def perform_create(self, serializer):
        serializer.save(registered_by=self.request.user)

    @action(detail=False, methods=["get"])
    def search(self, request):
        """
        Quick search endpoint for receptionist lookup.
        ?q=<phone|id|name|guardian_phone>
        """
        q = request.query_params.get("q", "").strip()
        if not q:
            return Response({"results": [], "message": "Please enter a search term."})

        qs = Patient.objects.filter(
            Q(phone__icontains=q) |
            Q(alt_phone__icontains=q) |
            Q(id_number__icontains=q) |
            Q(patient_number__icontains=q) |
            Q(sha_number__icontains=q) |
            Q(guardian_phone__icontains=q) |
            Q(first_name__icontains=q) |
            Q(middle_name__icontains=q) |
            Q(last_name__icontains=q)
        ).distinct()[:20]

        serializer = PatientListSerializer(qs, many=True)
        return Response({"results": serializer.data, "count": qs.count()})

    @action(detail=True, methods=["get"])
    def visits(self, request, pk=None):
        """All visits for a patient."""
        patient = self.get_object()
        visits  = patient.visits.order_by("-check_in_time")
        return Response(VisitListSerializer(visits, many=True).data)

    @action(detail=True, methods=["get"])
    def invoices(self, request, pk=None):
        """All invoices for a patient."""
        patient  = self.get_object()
        invoices = patient.invoices.order_by("-created_at")
        return Response(InvoiceSerializer(invoices, many=True).data)


# ─── Specialists & Tariffs ────────────────────────────────────────────────────

class SpecialistViewSet(viewsets.ModelViewSet):
    queryset           = Specialist.objects.filter(is_active=True)
    serializer_class   = SpecialistSerializer
    permission_classes = [IsAuthenticated]


class ServiceTariffViewSet(viewsets.ModelViewSet):
    queryset           = ServiceTariff.objects.filter(is_active=True)
    serializer_class   = ServiceTariffSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["category", "sha_covered"]
    search_fields      = ["name", "code"]


# ─── Visits ───────────────────────────────────────────────────────────────────

class VisitViewSet(viewsets.ModelViewSet):
    queryset           = Visit.objects.select_related("patient", "specialist", "assigned_doctor").all()
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["status", "visit_type", "payment_method"]
    search_fields      = ["visit_number", "patient__first_name", "patient__last_name", "patient__patient_number"]

    def get_serializer_class(self):
        if self.action == "create":
            return VisitCreateSerializer
        if self.action == "retrieve":
            return VisitDetailSerializer
        return VisitListSerializer

    def perform_create(self, serializer):
        serializer.save(registered_by=self.request.user)

    @action(detail=False, methods=["get"])
    def today(self, request):
        """All visits for today."""
        today = timezone.now().date()
        qs    = self.get_queryset().filter(check_in_time__date=today)
        return Response(VisitListSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def queue(self, request):
        """
        Active queue – patients waiting, in triage, or in consultation.
        Optionally filter by ?status=triage_done
        """
        active_statuses = ["payment_done", "triage_done", "in_consult", "paused"]
        status_filter   = request.query_params.get("status")
        qs = self.get_queryset().filter(
            check_in_time__date=timezone.now().date(),
            status__in=([status_filter] if status_filter else active_statuses),
        )
        return Response(VisitListSerializer(qs, many=True).data)

    @action(detail=True, methods=["patch"])
    def update_status(self, request, pk=None):
        """Change visit status. Body: {status: '...'}"""
        visit      = self.get_object()
        new_status = request.data.get("status")
        if new_status not in dict(Visit.Status.choices):
            return Response({"error": "Invalid status."}, status=400)

        visit.status = new_status
        # Auto-timestamp
        if new_status == "triage_done":
            visit.triage_time  = timezone.now()
        elif new_status == "in_consult":
            visit.consult_start = timezone.now()
        elif new_status == "discharged":
            visit.discharge_time = timezone.now()
        visit.save()
        return Response(VisitDetailSerializer(visit).data)

    @action(detail=True, methods=["patch"])
    def assign_doctor(self, request, pk=None):
        """Assign a doctor to a visit. Body: {doctor_id: ...}"""
        visit     = self.get_object()
        doctor_id = request.data.get("doctor_id")
        try:
            doctor = User.objects.get(id=doctor_id, role="doctor")
        except User.DoesNotExist:
            return Response({"error": "Doctor not found."}, status=404)
        visit.assigned_doctor = doctor
        visit.status          = Visit.Status.IN_CONSULT
        visit.consult_start   = timezone.now()
        visit.save()
        return Response(VisitDetailSerializer(visit).data)


# ─── Triage ───────────────────────────────────────────────────────────────────

class TriageViewSet(viewsets.ModelViewSet):
    queryset           = Triage.objects.select_related("visit__patient").all()
    serializer_class   = TriageSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ["priority"]

    def perform_create(self, serializer):
        triage = serializer.save(triaged_by=self.request.user)
        # Advance visit status
        visit = triage.visit
        visit.status      = Visit.Status.TRIAGE_DONE
        visit.triage_time = timezone.now()
        visit.save()

    @action(detail=False, methods=["get"])
    def pending(self, request):
        """Patients who have paid but not yet triaged."""
        today = timezone.now().date()
        visits = Visit.objects.filter(
            check_in_time__date=today, status="payment_done"
        ).select_related("patient", "specialist")
        return Response(VisitListSerializer(visits, many=True).data)


# ─── Consultation ─────────────────────────────────────────────────────────────

class ConsultationViewSet(viewsets.ModelViewSet):
    queryset           = Consultation.objects.select_related("visit__patient", "doctor").all()
    serializer_class   = ConsultationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ["status", "doctor"]

    def perform_create(self, serializer):
        consultation = serializer.save(doctor=request.user)
        consultation.visit.status = Visit.Status.IN_CONSULT
        consultation.visit.save()

    def perform_create(self, serializer):
        consultation = serializer.save(doctor=self.request.user)
        visit = consultation.visit
        visit.status        = Visit.Status.IN_CONSULT
        visit.consult_start = timezone.now()
        visit.save()

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        """Pause consultation – patient sent to lab or radiology."""
        consultation        = self.get_object()
        reason              = request.data.get("reason", "")
        consultation.status = Consultation.Status.PAUSED
        consultation.doctor_notes += f"\n[PAUSED] {reason}"
        consultation.save()
        consultation.visit.status = Visit.Status.PAUSED
        consultation.visit.save()
        return Response(ConsultationSerializer(consultation).data)

    @action(detail=True, methods=["post"])
    def resume(self, request, pk=None):
        """Resume consultation after lab/radiology results."""
        consultation        = self.get_object()
        consultation.status = Consultation.Status.OPEN
        consultation.save()
        consultation.visit.status = Visit.Status.IN_CONSULT
        consultation.visit.save()
        return Response(ConsultationSerializer(consultation).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Complete consultation, set disposition."""
        consultation             = self.get_object()
        consultation.status      = Consultation.Status.COMPLETED
        consultation.disposition = request.data.get("disposition", "discharge")
        consultation.ended_at    = timezone.now()
        consultation.save()

        visit = consultation.visit
        if consultation.disposition == "admit":
            visit.status = Visit.Status.ADMITTED
        elif consultation.disposition == "refer":
            visit.status = Visit.Status.REFERRED
        else:
            visit.status = Visit.Status.PRESCRIBING
        visit.save()
        return Response(ConsultationSerializer(consultation).data)

    @action(detail=True, methods=["get"])
    def lab_results(self, request, pk=None):
        """Fetch all lab results for this consultation."""
        consultation = self.get_object()
        orders = LabOrder.objects.filter(consultation=consultation).select_related("result")
        return Response(LabOrderSerializer(orders, many=True).data)

    @action(detail=True, methods=["get"])
    def radiology_results(self, request, pk=None):
        """Fetch all radiology results for this consultation."""
        consultation = self.get_object()
        orders = RadiologyOrder.objects.filter(consultation=consultation).select_related("result")
        return Response(RadiologyOrderSerializer(orders, many=True).data)


# ─── Lab ──────────────────────────────────────────────────────────────────────

class LabOrderViewSet(viewsets.ModelViewSet):
    queryset           = LabOrder.objects.select_related("visit__patient", "tariff").all()
    serializer_class   = LabOrderSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["status", "urgency"]
    search_fields      = ["visit__patient__first_name", "visit__patient__last_name",
                          "visit__patient__patient_number", "tariff__name"]

    def perform_create(self, serializer):
        serializer.save(ordered_by=self.request.user)

    @action(detail=False, methods=["get"])
    def pending(self, request):
        """All pending/processing lab orders."""
        qs = self.get_queryset().filter(status__in=["pending", "collected", "processing"])
        return Response(LabOrderSerializer(qs, many=True).data)


class LabResultViewSet(viewsets.ModelViewSet):
    queryset           = LabResult.objects.all()
    serializer_class   = LabResultSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        result = serializer.save(performed_by=self.request.user)
        # Advance order status
        result.order.status = LabOrder.Status.RESULTED
        result.order.save()
        # Resume visit if paused and all orders done
        visit   = result.order.visit
        pending = visit.lab_orders.filter(status__in=["pending","collected","processing"]).exists()
        if not pending and visit.status == Visit.Status.PAUSED:
            visit.status = Visit.Status.IN_CONSULT
            visit.save()


# ─── Radiology ────────────────────────────────────────────────────────────────

class RadiologyOrderViewSet(viewsets.ModelViewSet):
    queryset           = RadiologyOrder.objects.select_related("visit__patient", "tariff").all()
    serializer_class   = RadiologyOrderSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["status"]
    search_fields      = ["visit__patient__first_name", "visit__patient__last_name",
                          "visit__patient__patient_number"]

    def perform_create(self, serializer):
        serializer.save(ordered_by=self.request.user)

    @action(detail=False, methods=["get"])
    def pending(self, request):
        qs = self.get_queryset().filter(status__in=["pending", "scheduled"])
        return Response(RadiologyOrderSerializer(qs, many=True).data)


class RadiologyResultViewSet(viewsets.ModelViewSet):
    queryset           = RadiologyResult.objects.all()
    serializer_class   = RadiologyResultSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        result = serializer.save(performed_by=self.request.user)
        result.order.status = RadiologyOrder.Status.RESULTED
        result.order.save()
        # Same resume logic
        visit   = result.order.visit
        pending = visit.radiology_orders.filter(status__in=["pending","scheduled","performed"]).exists()
        if not pending and visit.status == Visit.Status.PAUSED:
            visit.status = Visit.Status.IN_CONSULT
            visit.save()


# ─── Prescriptions ────────────────────────────────────────────────────────────

class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset           = Prescription.objects.select_related("visit__patient").all()
    serializer_class   = PrescriptionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["status"]
    search_fields      = ["visit__patient__first_name", "visit__patient__last_name",
                          "visit__patient__patient_number", "visit__visit_number"]

    def perform_create(self, serializer):
        serializer.save(prescribed_by=self.request.user)

    @action(detail=False, methods=["get"])
    def pending(self, request):
        """Prescriptions waiting at pharmacy."""
        qs = self.get_queryset().filter(status__in=["pending", "partial"])
        return Response(PrescriptionSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"])
    def dispense(self, request, pk=None):
        """Mark prescription as dispensed."""
        prescription             = self.get_object()
        prescription.status      = Prescription.Status.DISPENSED
        prescription.dispensed_by= request.user
        prescription.dispensed_at= timezone.now()
        prescription.save()
        # Mark all items dispensed
        prescription.items.update(is_dispensed=True)
        # Discharge visit if no more pharmacy items
        visit = prescription.visit
        if not visit.prescriptions.filter(status__in=["pending","partial"]).exists():
            visit.status          = Visit.Status.DISCHARGED
            visit.discharge_time  = timezone.now()
            visit.save()
        return Response(PrescriptionSerializer(prescription).data)


# ─── Drug Inventory ───────────────────────────────────────────────────────────

class DrugInventoryViewSet(viewsets.ModelViewSet):
    queryset           = DrugInventory.objects.filter(is_active=True)
    serializer_class   = DrugInventorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["category", "formulation"]
    search_fields      = ["name", "generic_name", "strength"]

    @action(detail=False, methods=["get"])
    def low_stock(self, request):
        """Drugs at or below reorder level."""
        from django.db.models import F
        qs = self.get_queryset().filter(stock_quantity__lte=F("reorder_level"))
        return Response(DrugInventorySerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def expiring_soon(self, request):
        """Drugs expiring within 90 days."""
        from datetime import date, timedelta
        cutoff = date.today() + timedelta(days=90)
        qs = self.get_queryset().filter(expiry_date__lte=cutoff)
        return Response(DrugInventorySerializer(qs, many=True).data)


# ─── Invoice / Payment ────────────────────────────────────────────────────────

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset           = Invoice.objects.select_related("patient", "visit").all()
    serializer_class   = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["status"]
    search_fields      = ["invoice_number", "patient__first_name", "patient__last_name",
                          "patient__patient_number", "visit__visit_number"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def add_payment(self, request, pk=None):
        """Record a payment against an invoice."""
        invoice = self.get_object()
        serializer = PaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = serializer.save(invoice=invoice, received_by=request.user)

        invoice.amount_paid = (invoice.amount_paid or 0) + payment.amount
        if invoice.amount_paid >= invoice.patient_amount:
            invoice.status = Invoice.Status.PAID
            # Advance visit to payment_done if it was just registered
            if invoice.visit.status == Visit.Status.REGISTERED:
                invoice.visit.status = Visit.Status.PAYMENT_DONE
                invoice.visit.save()
        else:
            invoice.status = Invoice.Status.PARTIAL
        invoice.save()
        return Response(InvoiceSerializer(invoice).data)

    @action(detail=False, methods=["get"])
    def daily_summary(self, request):
        """Revenue summary for today."""
        today = timezone.now().date()
        qs    = Invoice.objects.filter(created_at__date=today)
        total   = qs.aggregate(t=Sum("amount_paid"))["t"] or 0
        count   = qs.count()
        pending = qs.filter(status__in=["pending","partial"]).count()
        return Response({
            "date":           str(today),
            "total_collected": total,
            "invoice_count":   count,
            "pending_count":   pending,
        })


class PaymentViewSet(viewsets.ModelViewSet):
    queryset           = Payment.objects.all()
    serializer_class   = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ["method"]


# ─── Dashboard Stats ──────────────────────────────────────────────────────────

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        return Response({
            "today_visits":     Visit.objects.filter(check_in_time__date=today).count(),
            "waiting_queue":    Visit.objects.filter(check_in_time__date=today, status__in=["payment_done","triage_done"]).count(),
            "in_consultation":  Visit.objects.filter(check_in_time__date=today, status="in_consult").count(),
            "discharged_today": Visit.objects.filter(check_in_time__date=today, status="discharged").count(),
            "total_patients":   Patient.objects.count(),
            "new_patients_today": Patient.objects.filter(created_at__date=today).count(),
            "pending_lab":      LabOrder.objects.filter(status__in=["pending","collected","processing"]).count(),
            "pending_radiology":RadiologyOrder.objects.filter(status__in=["pending","scheduled"]).count(),
            "pending_pharmacy": Prescription.objects.filter(status__in=["pending","partial"]).count(),
            "today_revenue":    Invoice.objects.filter(created_at__date=today).aggregate(t=Sum("amount_paid"))["t"] or 0,
            "low_stock_drugs":  DrugInventory.objects.filter(stock_quantity__lte=50).count(),
        })